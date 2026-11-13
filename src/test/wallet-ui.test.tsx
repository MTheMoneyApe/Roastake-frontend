// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { custom, getAddress } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createConfig, createStorage, noopStorage } from "wagmi";
import { injected } from "wagmi/connectors";
import { PerpsIndex } from "@/components/trading";
import { CopyAddressButton } from "@/components/wallet/copy-address-button";
import {
  WalletHubDialog,
  WalletHubHeaderButton,
  WalletHubPanels,
} from "@/components/wallet/wallet-hub";
import { WalletOverviewPage } from "@/components/wallet/wallet-pages";
import { demo } from "@/lib/demo/store";
import type { NearAdapterPort } from "@/lib/wallet/near";
import { WalletInfrastructureProvider } from "@/lib/wallet/provider";
import { ROASTAKE_EVM_CHAINS } from "@/lib/wallet/wagmi";

vi.mock("@/lib/oracle/rpc", () => ({
  fetchOracleSnapshot: vi.fn(async () => null),
}));

vi.mock("@/lib/perps/rpc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/perps/rpc")>();
  return {
    ...actual,
    fetchPerpsProtocolSnapshot: vi.fn(async () => ({
      network: "testnet",
      contractId: "perps-v1.roastake-dev-mta.testnet",
      collateralTokenId: "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af",
      rpcEndpoint: "https://rpc.testnet.fastnear.com",
      blockHash: "block-mock-hash",
      blockHeight: 210_000_000,
      blockTimestampSec: 1_794_350_000,
      fetchedAtMs: 1_794_350_000_000,
      admin: "roastake-dev-mta.testnet",
      treasury: "roastake-dev-mta.testnet",
      pausedGlobal: false,
      markets: ["COFFEE-ARABICA-TESTNET/USD"],
      arabicaMarket: null,
      collateralConfig: null,
      circleMetadata: null,
      contractUsdcBalanceUnits: "2001302",
      contractCircleStorage: null,
      lpSnapshot: {
        lp_vault_realized_equity_e8: "200130200",
        lp_mtm_equity_e8: "200130200",
        reserved_liquidity_e8: "0",
        lp_available_liquidity_e8: "200130200",
        net_bounded_trader_claim_e8: "0",
        total_unrealized_bad_debt_e8: "0",
        lp_total_shares: "10000",
        lp_locked_seed_shares: "10000",
        withdrawals_locked_for_emergency: false,
      },
      accounting: {
        total_trader_free_collateral_e8: "0",
        total_trader_locked_margin_e8: "0",
        total_in_flight_withdrawals_e8: "0",
        lp_vault_realized_equity_e8: "200130200",
        insurance_fund_e8: "0",
        protocol_fees_e8: "0",
        tracked_collateral_e8: "200130200",
        lp_total_shares: "10000",
        total_open_positions: 0,
        solvency_ok: true,
        paused_global: false,
      },
      solvencyInvariant: true,
    })),
    fetchPerpsTraderSnapshot: vi.fn(async () => null),
  };
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    className,
    onClick,
  }: {
    to: string;
    children: ReactNode;
    className?: string;
    onClick?: () => void;
  }) => (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  ),
}));

const EVM_TEST_ADDR = getAddress("0xAbCd123400000000000000000000000000009999");

function makeNearFactory(initialAccountId?: string): () => NearAdapterPort {
  return () => ({
    initialize: async () => ({
      wallets: [{ id: "hot-wallet", name: "HOT Wallet", supportsTestnet: true }],
      existing: initialAccountId
        ? {
            accountId: initialAccountId,
            providerId: "hot-wallet",
            providerName: "HOT Wallet",
            networkId: "testnet",
          }
        : null,
    }),
    connect: async () => ({
      accountId: "demo-roaster.testnet",
      providerId: "hot-wallet",
      providerName: "HOT Wallet",
      networkId: "testnet",
    }),
    disconnect: async () => {},
    dispose: () => {},
  });
}

function makeWagmiConfig(defaultConnected = false) {
  let chainId = 11155111;
  let connected = defaultConnected;
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const provider = {
    async request({ method, params }: { method: string; params?: unknown[] }) {
      switch (method) {
        case "eth_chainId":
          return `0x${chainId.toString(16)}`;
        case "eth_accounts":
          return connected ? [EVM_TEST_ADDR] : [];
        case "eth_requestAccounts":
          connected = true;
          listeners.get("accountsChanged")?.forEach((fn) => fn([EVM_TEST_ADDR]));
          return [EVM_TEST_ADDR];
        case "wallet_switchEthereumChain": {
          const nextHex = (params?.[0] as { chainId?: string } | undefined)?.chainId;
          if (nextHex) {
            chainId = Number(nextHex);
            listeners.get("chainChanged")?.forEach((fn) => fn(`0x${chainId.toString(16)}`));
          }
          return null;
        }
        case "wallet_revokePermissions":
          connected = false;
          listeners.get("accountsChanged")?.forEach((fn) => fn([]));
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
  const offlineTransport = custom({ request: async () => null });

  return createConfig({
    chains: ROASTAKE_EVM_CHAINS,
    connectors: [
      injected({
        shimDisconnect: false,
        target: () => ({ id: "mock", name: "Mock Injected", provider: provider as never }),
      }),
    ],
    transports: {
      11155111: offlineTransport,
      84532: offlineTransport,
      421614: offlineTransport,
      998: offlineTransport,
    },
    storage: createStorage({ storage: noopStorage }),
  });
}

function renderWithWalletProviders(
  ui: ReactNode,
  opts?: {
    nearInitialAccount?: string;
    evmConnected?: boolean;
    nearAdapterFactory?: () => NearAdapterPort;
  },
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <WalletInfrastructureProvider
        wagmiConfig={makeWagmiConfig(Boolean(opts?.evmConnected))}
        nearAdapterFactory={opts?.nearAdapterFactory ?? makeNearFactory(opts?.nearInitialAccount)}
      >
        {ui}
      </WalletInfrastructureProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  if (typeof localStorage !== "undefined" && typeof localStorage.removeItem === "function") {
    demo.reset();
  }
});

afterEach(() => {
  cleanup();
});

describe("Wallet Hub UI, Perps NEAR-First Gating & Demo Isolation", () => {
  it.each(["selector", "direct Meteor"])(
    "releases modal pointer/focus locks before %s handoff and restores errors",
    async (entry) => {
      let modalAtConnect = true;
      let pointerAtConnect = "";
      let selected = false;
      const factory = (): NearAdapterPort => ({
        initialize: async () => ({
          wallets: [{ id: "meteor-wallet", name: "Meteor Wallet", supportsTestnet: true }],
          existing: null,
        }),
        connect: async () => {
          modalAtConnect = Boolean(document.querySelector('[role="dialog"]'));
          pointerAtConnect = document.body.style.pointerEvents;
          // Model the SDK's body-level portal, outside Radix DialogContent.
          return new Promise((_, reject) => {
            const option = document.createElement("button");
            option.textContent = "External Meteor option";
            option.onclick = () => {
              selected = true;
              option.remove();
              reject(new Error("User rejected"));
            };
            document.body.append(option);
          });
        },
        disconnect: async () => {},
        dispose: () => {},
      });
      renderWithWalletProviders(
        <>
          <WalletHubHeaderButton />
          <WalletHubDialog />
        </>,
        { nearAdapterFactory: factory },
      );
      fireEvent.click(screen.getByRole("button", { name: /Open multichain wallet hub/i }));
      const launch = await screen.findByRole("button", {
        name: entry === "selector" ? "Connect NEAR Wallet" : "Meteor Wallet",
      });
      fireEvent.click(launch);
      const external = await screen.findByRole("button", { name: "External Meteor option" });
      expect(modalAtConnect).toBe(false);
      expect(pointerAtConnect).not.toBe("none");
      // Touch produces a compatibility click; real hit-testing is checked in Chrome too.
      if (entry === "direct Meteor") {
        fireEvent.touchStart(external);
        fireEvent.touchEnd(external);
      }
      fireEvent.click(external);
      expect(selected).toBe(true);
      expect(await screen.findByRole("dialog")).toBeVisible();
      expect(
        await screen.findByText("Connection or network request rejected by user."),
      ).toBeVisible();
    },
  );
  it("opens unified Wallet Hub from header without exposing simulated demo dollars as wallet balance", async () => {
    renderWithWalletProviders(
      <>
        <WalletHubHeaderButton />
        <WalletHubDialog />
      </>,
    );

    const trigger = screen.getByRole("button", { name: /Open multichain wallet hub/i });
    expect(trigger).toHaveTextContent("Connect Wallet");
    expect(trigger).not.toHaveTextContent("$101,132");

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText("ROASTAKE Multichain Wallet Hub")).toBeInTheDocument();
    });
    expect(screen.getByText("ROASTAKE EXECUTION NETWORK")).toBeInTheDocument();
    expect(screen.getByText("PRIMARY")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Connect NEAR Wallet/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/demo-roaster\.testnet/i).length).toBeGreaterThan(0);
    });
  });

  it("shows secondary tabs and clearly distinguishes HyperEVM Chain 998 from Hyperliquid Testnet Core", async () => {
    renderWithWalletProviders(<WalletHubPanels />, { evmConnected: true });

    await waitFor(() => {
      expect(screen.getByText(EVM_TEST_ADDR)).toBeInTheDocument();
    });

    expect(screen.getByText(/HyperEVM Testnet \(998\)/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Hyperliquid Core/i }));

    expect(screen.getByText(/separate from HyperEVM \(Chain ID 998\)/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Zero order signing or API\/agent wallet creation/i),
    ).toBeInTheDocument();
  });

  it("gates Perpetuals context toward NEAR Testnet even when an EVM wallet is active", async () => {
    renderWithWalletProviders(<PerpsIndex />, { evmConnected: true });

    await waitFor(() => {
      expect(screen.getByText(/ROASTAKE Perpetuals executes on/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Connect NEAR Wallet/i })).toBeInTheDocument();
    expect(screen.getByText(/LIVE CONTRACT · perps-v1\.roastake-dev-mta\.testnet/i)).toHaveClass(
      "max-w-full",
      "whitespace-normal",
      "[overflow-wrap:anywhere]",
    );
  });

  it("renders dedicated /app/wallet page with clear separation between real wallet hub and simulated demo wallet", async () => {
    renderWithWalletProviders(<WalletOverviewPage />, {
      nearInitialAccount: "roastake-oracle-v1.testnet",
    });

    await waitFor(() => {
      expect(screen.getAllByText("roastake-oracle-v1.testnet").length).toBeGreaterThan(0);
    });
    expect(
      screen.getByText(/Simulated Demo Wallet \(Browser LocalStorage Prototype\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/NOT REAL WALLET BALANCES/i)).toBeInTheDocument();
  });

  it("copies addresses via CopyAddressButton while keeping the button focusable/enabled and announcing status outside button", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<CopyAddressButton value="demo-roaster.testnet" label="Copy NEAR address" />);

    const btn = screen.getByRole("button", { name: "Copy NEAR address" });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("demo-roaster.testnet");
      expect(screen.getByRole("status")).toHaveTextContent("Copied");
    });
    expect(btn).not.toBeDisabled();
  });
});
