// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { getWallets } from "@wallet-standard/app";
import { StandardConnect, StandardDisconnect, StandardEvents } from "@wallet-standard/features";
import { createElement, type ReactNode } from "react";
import { custom } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createConfig, createStorage, noopStorage, type Config } from "wagmi";
import { mainnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import {
  abbreviateAddress,
  ALL_WALLET_NETWORKS,
  HYPERLIQUID_TESTNET_API_URL,
  isSupportedEvmChainId,
  NEAR_TESTNET_INFO,
} from "@/lib/wallet/config";
import { useWalletHub } from "@/lib/wallet/context";
import {
  assertHyperliquidTestnetUrl,
  fetchHyperliquidTestnetSummary,
} from "@/lib/wallet/hyperliquid";
import { isValidNearTestnetAccountId, type NearAdapterPort } from "@/lib/wallet/near";
import { WalletInfrastructureProvider } from "@/lib/wallet/provider";
import { ROASTAKE_EVM_CHAINS } from "@/lib/wallet/wagmi";
import { demo, getDemo } from "@/lib/demo/store";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const EVM_TEST_ADDR = "0x1111111111111111111111111111111111111111" as const;
const SOLANA_VALID_ADDR = "11111111111111111111111111111111";

const unregisterFns: (() => void)[] = [];

function registerMockSolanaWallet(opts: {
  name: string;
  chains: `${string}:${string}`[];
  address?: string;
  connectReject?: Error;
  supportsDisconnect?: boolean;
}) {
  let connectedAccounts: {
    address: string;
    publicKey: Uint8Array;
    chains: `${string}:${string}`[];
    features: `${string}:${string}`[];
  }[] = [];

  const changeListeners = new Set<(props: Record<string, unknown>) => void>();

  const features: Record<string, unknown> = {
    [StandardConnect]: {
      version: "1.0.0",
      connect: vi.fn(async () => {
        if (opts.connectReject) throw opts.connectReject;
        const addr = opts.address ?? SOLANA_VALID_ADDR;
        connectedAccounts = [
          {
            address: addr,
            publicKey: new Uint8Array(32).fill(1),
            chains: opts.chains,
            features: ["solana:signTransaction"],
          },
        ];
        changeListeners.forEach((cb) => cb({ accounts: connectedAccounts }));
        return { accounts: connectedAccounts };
      }),
    },
    [StandardEvents]: {
      version: "1.0.0",
      on: (_event: string, listener: (props: Record<string, unknown>) => void) => {
        changeListeners.add(listener);
        return () => changeListeners.delete(listener);
      },
    },
  };

  if (opts.supportsDisconnect !== false) {
    features[StandardDisconnect] = {
      version: "1.0.0",
      disconnect: vi.fn(async () => {
        connectedAccounts = [];
        changeListeners.forEach((cb) => cb({ accounts: [] }));
      }),
    };
  }

  const wallet = {
    version: "1.0.0" as const,
    name: opts.name,
    icon: "data:image/svg+xml,<svg/>" as const,
    chains: opts.chains,
    features,
    get accounts() {
      return connectedAccounts;
    },
  };

  const unregister = getWallets().register(wallet as never);
  unregisterFns.push(unregister);
  return { wallet, unregister };
}

function createMockNearFactory(opts?: {
  connectError?: Error;
  accountId?: string;
  networkId?: "testnet" | "mainnet";
  existingAccountId?: string;
}) {
  const dispose = vi.fn();
  const disconnect = vi.fn(async () => {});
  const connect = vi.fn(async () => {
    if (opts?.connectError) throw opts.connectError;
    return {
      accountId: opts?.accountId ?? "roastake-user.testnet",
      publicKey: "ed25519:DPqUmmsjDj1VPE1LVw9nX2oa61wmLt8foHBbgAXtVDRT",
      providerId: "hot-wallet",
      providerName: "HOT Wallet",
      networkId: opts?.networkId ?? "testnet",
    };
  });

  const factory = (): NearAdapterPort => ({
    initialize: async () => ({
      wallets: [
        { id: "hot-wallet", name: "HOT Wallet", supportsTestnet: true },
        { id: "meteor-wallet", name: "Meteor Wallet", supportsTestnet: true },
      ],
      existing: opts?.existingAccountId
        ? {
            accountId: opts.existingAccountId,
            providerId: "hot-wallet",
            providerName: "HOT Wallet",
            networkId: "testnet",
          }
        : null,
    }),
    connect,
    disconnect,
    dispose,
  });

  return { factory, connect, disconnect, dispose };
}

function createOfflineEip1193Connector(opts?: {
  initialChainId?: number;
  initialConnected?: boolean;
  connectError?: Error;
  switchChainError?: Error;
}) {
  let chainId = opts?.initialChainId ?? 11155111;
  let connected = Boolean(opts?.initialConnected);
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const emit = (event: string, ...args: unknown[]) => {
    listeners.get(event)?.forEach((fn) => fn(...args));
  };
  const provider = {
    async request({ method, params }: { method: string; params?: unknown[] }) {
      switch (method) {
        case "eth_chainId":
          return `0x${chainId.toString(16)}`;
        case "eth_accounts":
          return connected ? [EVM_TEST_ADDR] : [];
        case "eth_requestAccounts":
          if (opts?.connectError) throw opts.connectError;
          connected = true;
          emit("accountsChanged", [EVM_TEST_ADDR]);
          return [EVM_TEST_ADDR];
        case "wallet_switchEthereumChain": {
          if (opts?.switchChainError) throw opts.switchChainError;
          const nextHex = (params?.[0] as { chainId?: string } | undefined)?.chainId;
          if (nextHex) {
            chainId = Number(nextHex);
            emit("chainChanged", `0x${chainId.toString(16)}`);
          }
          return null;
        }
        case "wallet_revokePermissions":
          connected = false;
          emit("accountsChanged", []);
          return null;
        default:
          return null;
      }
    },
    on(event: string, cb: (...args: unknown[]) => void) {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(cb);
    },
    removeListener(event: string, cb: (...args: unknown[]) => void) {
      listeners.get(event)?.delete(cb);
    },
  };

  return injected({
    shimDisconnect: false,
    target: () => ({ id: "mock", name: "Mock Injected", provider: provider as never }),
  });
}

function createTestWagmiConfig(opts?: {
  switchChainError?: Error;
  connectError?: Error;
  includeMainnetForNegativeTest?: boolean;
  initialChainId?: number;
  initialConnected?: boolean;
}): Config {
  const offlineTransport = custom({ request: async () => null });
  return createConfig({
    chains: opts?.includeMainnetForNegativeTest
      ? ([...ROASTAKE_EVM_CHAINS, mainnet] as const)
      : ROASTAKE_EVM_CHAINS,
    connectors: [
      createOfflineEip1193Connector({
        initialChainId: opts?.initialChainId ?? 11155111,
        initialConnected: opts?.initialConnected,
        connectError: opts?.connectError,
        switchChainError: opts?.switchChainError,
      }),
    ],
    transports: {
      11155111: offlineTransport,
      84532: offlineTransport,
      421614: offlineTransport,
      998: offlineTransport,
      1: offlineTransport,
    },
    storage: createStorage({ storage: noopStorage }),
  }) as Config;
}

function createWrapper(props: {
  wagmiConfig?: Config;
  nearAdapterFactory?: () => NearAdapterPort;
  hyperliquidFetcher?: typeof fetch;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(WalletInfrastructureProvider, {
        wagmiConfig: props.wagmiConfig,
        nearAdapterFactory: props.nearAdapterFactory,
        hyperliquidFetcher: props.hyperliquidFetcher,
        children,
      }),
    );
  };
}

beforeEach(() => {
  if (typeof localStorage !== "undefined" && typeof localStorage.removeItem === "function") {
    demo.reset();
  }
});

afterEach(() => {
  cleanup();
  while (unregisterFns.length > 0) {
    unregisterFns.pop()?.();
  }
});

describe("Wallet network policy & pure adapters", () => {
  it("validates Testnet configs, address abbreviation, and Hyperliquid Core endpoint policy", () => {
    expect(NEAR_TESTNET_INFO.isPrimaryProtocolNetwork).toBe(true);
    expect(isValidNearTestnetAccountId("roastake-oracle-v1.testnet")).toBe(true);
    expect(isValidNearTestnetAccountId("user.near")).toBe(false);

    expect(isSupportedEvmChainId(11155111)).toBe(true);
    expect(isSupportedEvmChainId(84532)).toBe(true);
    expect(isSupportedEvmChainId(421614)).toBe(true);
    expect(isSupportedEvmChainId(998)).toBe(true);
    expect(isSupportedEvmChainId(1)).toBe(false);

    expect(abbreviateAddress(EVM_TEST_ADDR)).toBe("0x1111...1111");
    expect(assertHyperliquidTestnetUrl(HYPERLIQUID_TESTNET_API_URL)).toBe(
      "https://api.hyperliquid-testnet.xyz/info",
    );
    expect(() => assertHyperliquidTestnetUrl("https://api.hyperliquid.xyz")).toThrow(
      /Testnet-only/,
    );
  });

  it("queries read-only Hyperliquid Testnet Core /info endpoint cleanly with zero signing", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe("https://api.hyperliquid-testnet.xyz/info");
      const body = JSON.parse(String(init?.body ?? "{}"));
      expect(["clearinghouseState", "spotClearinghouseState"]).toContain(body.type);
      expect(body.user).toBe(EVM_TEST_ADDR);

      if (body.type === "clearinghouseState") {
        return new Response(
          JSON.stringify({
            marginSummary: { accountValue: "62.809826", totalMarginUsed: "12.50" },
            withdrawable: "50.309826",
            assetPositions: [{ position: { coin: "ETH" } }],
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ balances: [{ coin: "USDC" }, { coin: "HYPE" }] }), {
        status: 200,
      });
    });

    const summary = await fetchHyperliquidTestnetSummary(EVM_TEST_ADDR, {
      fetchFn: fetchMock,
      nowMs: 1794356000000,
    });
    expect(summary.accountValueUsd).toBe("62.809826");
    expect(summary.withdrawableUsd).toBe("50.309826");
    expect(summary.totalMarginUsedUsd).toBe("12.50");
    expect(summary.openPositionCount).toBe(1);
    expect(summary.spotBalanceCount).toBe(2);
  });
});

describe("Multichain WalletInfrastructureProvider", () => {
  it("prioritizes NEAR Testnet, supports connect/disconnect, and cleans up listeners", async () => {
    const nearMock = createMockNearFactory();
    const wagmiConfig = createTestWagmiConfig();
    const { result, unmount } = renderHook(() => useWalletHub(), {
      wrapper: createWrapper({ wagmiConfig, nearAdapterFactory: nearMock.factory }),
    });

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.primaryProtocolNetwork.id).toBe("near-testnet");
    expect(result.current.selectedEcosystem).toBe("near");
    expect(result.current.near.availableWallets.map((w) => w.id)).toEqual([
      "hot-wallet",
      "meteor-wallet",
    ]);

    await act(async () => {
      await result.current.connectNear("hot-wallet");
    });

    expect(result.current.near.status).toBe("connected");
    expect(result.current.near.accountId).toBe("roastake-user.testnet");
    expect(result.current.connectedAccounts[0]?.ecosystem).toBe("near");
    expect(result.current.connectedAccounts[0]?.isPrimaryProtocolNetwork).toBe(true);

    await act(async () => {
      await result.current.disconnectNear();
    });

    expect(nearMock.disconnect).toHaveBeenCalledTimes(1);
    expect(result.current.near.status).toBe("disconnected");
    expect(result.current.connectedAccounts).toHaveLength(0);

    unmount();
    expect(nearMock.dispose).toHaveBeenCalledTimes(1);
  });

  it("handles EVM connect/disconnect, HyperEVM 998 detection, unsupported chain warning, and chain-switch rejection", async () => {
    const nearMock = createMockNearFactory();
    const wagmiConfig = createTestWagmiConfig({
      switchChainError: new Error("User rejected the request."),
      includeMainnetForNegativeTest: true,
    });

    const { result } = renderHook(() => useWalletHub(), {
      wrapper: createWrapper({ wagmiConfig, nearAdapterFactory: nearMock.factory }),
    });

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(async () => {
      await result.current.connectEvm();
    });

    await waitFor(() => expect(result.current.evm.status).toBe("connected"));
    expect(result.current.evm.address).toBe(EVM_TEST_ADDR);
    expect(result.current.evm.chainId).toBe(11155111);
    expect(result.current.evm.unsupportedChain).toBe(false);

    // Selecting EVM secondary wallet never demotes NEAR Testnet as primary execution network
    act(() => result.current.setSelectedEcosystem("evm"));
    expect(result.current.primaryProtocolNetwork.id).toBe("near-testnet");

    // Attempt switch rejected by wallet -> error preserved safely without crash
    await act(async () => {
      await result.current.switchEvmChain(998);
    });
    expect(result.current.evm.error).toMatch(/rejected by user/i);

    await act(async () => {
      await result.current.disconnectEvm();
    });
    await waitFor(() => expect(result.current.evm.status).toBe("disconnected"));
  });

  it("flags unsupported EVM mainnet chain cleanly without silently switching", async () => {
    const nearMock = createMockNearFactory();
    const wagmiConfig = createTestWagmiConfig({
      includeMainnetForNegativeTest: true,
      initialChainId: 1,
      initialConnected: true,
    });

    const { result } = renderHook(() => useWalletHub(), {
      wrapper: createWrapper({ wagmiConfig, nearAdapterFactory: nearMock.factory }),
    });

    await waitFor(() => expect(result.current.evm.status).toBe("connected"));
    expect(result.current.evm.chainId).toBe(1);
    expect(result.current.evm.unsupportedChain).toBe(true);
    expect(result.current.connectedAccounts[0]?.unsupportedNetwork).toBe(true);
  });

  it("connects Solana Devnet via Wallet Standard, detects unsupported clusters, and isolates multiple concurrent wallets", async () => {
    registerMockSolanaWallet({
      name: "Phantom Devnet Mock",
      chains: ["solana:devnet"],
      address: SOLANA_VALID_ADDR,
    });
    registerMockSolanaWallet({
      name: "Mainnet Only Mock",
      chains: ["solana:mainnet"],
      address: SOLANA_VALID_ADDR,
    });

    const nearMock = createMockNearFactory();
    const wagmiConfig = createTestWagmiConfig();
    const hlFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            marginSummary: { accountValue: "10.0", totalMarginUsed: "0.0" },
            withdrawable: "10.0",
            assetPositions: [],
          }),
          { status: 200 },
        ),
    );

    const { result } = renderHook(() => useWalletHub(), {
      wrapper: createWrapper({
        wagmiConfig,
        nearAdapterFactory: nearMock.factory,
        hyperliquidFetcher: hlFetch,
      }),
    });

    await waitFor(() => expect(result.current.solana.availableWallets.length).toBe(2));

    // Connect NEAR, EVM, Solana Devnet, AND Hyperliquid Core simultaneously
    await act(async () => {
      await result.current.connectNear("hot-wallet");
      await result.current.connectEvm();
      await result.current.connectSolana("Phantom Devnet Mock");
    });

    await waitFor(() => expect(result.current.evm.status).toBe("connected"));
    await act(async () => {
      await result.current.connectHyperliquid();
    });

    expect(result.current.connectedAccounts.map((a) => a.ecosystem)).toEqual([
      "near",
      "evm",
      "solana",
      "hyperliquid",
    ]);
    expect(result.current.solana.unsupportedCluster).toBe(false);
    expect(result.current.hyperliquid.summary?.accountValueUsd).toBe("10.0");

    // Disconnecting Solana alone leaves NEAR, EVM, and Hyperliquid intact
    await act(async () => {
      await result.current.disconnectAccount("solana");
    });
    expect(result.current.connectedAccounts.map((a) => a.ecosystem)).toEqual([
      "near",
      "evm",
      "hyperliquid",
    ]);

    // Disconnecting EVM clears dependent Hyperliquid venue association cleanly (no stale address)
    await act(async () => {
      await result.current.disconnectAccount("evm");
    });
    await waitFor(() => expect(result.current.evm.status).toBe("disconnected"));
    expect(result.current.hyperliquid.status).toBe("disconnected");
    expect(result.current.hyperliquid.associatedEvmAddress).toBeNull();
    expect(result.current.connectedAccounts.map((a) => a.ecosystem)).toEqual(["near"]);

    // Connecting a mainnet-only Solana wallet surfaces unsupportedCluster warning cleanly
    await act(async () => {
      await result.current.connectSolana("Mainnet Only Mock");
    });
    expect(result.current.solana.unsupportedCluster).toBe(true);
    expect(result.current.solana.error).toMatch(/solana:devnet/i);
  });

  it("keeps simulated DemoState.network completely isolated from real wallet infrastructure", async () => {
    const nearMock = createMockNearFactory();
    const wagmiConfig = createTestWagmiConfig();
    const { result } = renderHook(() => useWalletHub(), {
      wrapper: createWrapper({ wagmiConfig, nearAdapterFactory: nearMock.factory }),
    });

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(getDemo().network).toBe("base");
    act(() => {
      demo.setNetwork("arbitrum");
    });
    expect(getDemo().network).toBe("arbitrum");
    expect(result.current.primaryProtocolNetwork.id).toBe("near-testnet");
    expect(result.current.connectedAccounts).toHaveLength(0);
  });

  it("enforces exact multichain priority order (NEAR -> Ethereum -> Base -> Arbitrum -> Solana -> HyperEVM -> Hyperliquid) and routes sendNearTransaction", async () => {
    expect(ALL_WALLET_NETWORKS.map((n) => n.id)).toEqual([
      "near-testnet",
      "ethereum-sepolia",
      "base-sepolia",
      "arbitrum-sepolia",
      "solana-devnet",
      "hyperevm-testnet",
      "hyperliquid-testnet-core",
    ]);

    const signSpy = vi.fn(async () => ({
      transactionHash: "MockTxHash123",
      signerId: "demo-roaster.testnet",
      receiverId: "perps-v1.roastake-dev-mta.testnet",
      rawOutcome: {},
    }));
    const nearMock = createMockNearFactory();
    const wrappedFactory = (): NearAdapterPort => {
      const base = nearMock.factory();
      return { ...base, signAndSendTransaction: signSpy };
    };
    const wagmiConfig = createTestWagmiConfig();
    const { result } = renderHook(() => useWalletHub(), {
      wrapper: createWrapper({ wagmiConfig, nearAdapterFactory: wrappedFactory }),
    });

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await expect(
      result.current.sendNearTransaction({
        receiverId: "perps-v1.roastake-dev-mta.testnet",
        actions: [
          {
            type: "FunctionCall",
            params: { methodName: "register_account", args: {}, gas: "30000000000000", deposit: "50000000000000000000000" },
          },
        ],
      }),
    ).rejects.toThrow(/Connect a NEAR Testnet wallet/i);

    await act(async () => {
      await result.current.connectNear("hot-wallet");
    });

    const outcome = await result.current.sendNearTransaction({
      receiverId: "perps-v1.roastake-dev-mta.testnet",
      actions: [
        {
          type: "FunctionCall",
          params: { methodName: "register_account", args: {}, gas: "30000000000000", deposit: "50000000000000000000000" },
        },
      ],
    });
    expect(outcome.transactionHash).toBe("MockTxHash123");
    expect(signSpy).toHaveBeenCalledTimes(1);
  });
});
