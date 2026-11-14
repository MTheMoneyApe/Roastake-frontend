// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useWallets, type UiWallet } from "@wallet-standard/react";
import {
  useAccount,
  useConnect,
  useConnectors,
  useDisconnect,
  useSwitchChain,
  WagmiProvider,
  type Config,
} from "wagmi";
import {
  abbreviateAddress,
  getEvmNetworkInfo,
  getWalletConnectProjectId,
  getWalletErrorMessage,
  HYPEREVM_TESTNET_INFO,
  HYPERLIQUID_CORE_TESTNET_INFO,
  isSupportedEvmChainId,
  NEAR_TESTNET_INFO,
  SOLANA_DEVNET_INFO,
  SUPPORTED_EVM_TESTNETS,
} from "./config";
import { fetchHyperliquidTestnetSummary, isValidEvmAddress } from "./hyperliquid";
import {
  createHotNearConnectorAdapter,
  isValidNearTestnetAccountId,
  type NearAdapterPort,
} from "./near";
import {
  connectSolanaUiWallet,
  disconnectSolanaUiWallet,
  isSolanaWallet,
  mapSolanaDiscoveredWallets,
  validateSolanaDevnetAccount,
} from "./solana";
import type {
  ConnectedWalletAccount,
  EvmSessionState,
  EvmTestnetId,
  HyperliquidSessionState,
  NearSessionState,
  NearSignedTxOutcome,
  NearTransactionRequest,
  SolanaSessionState,
  WalletEcosystem,
  WalletHubContextValue,
} from "./types";
import { WalletHubContext } from "./context";
import { createRoastakeClientWagmiConfigWithWalletConnect, getRoastakeWagmiConfig } from "./wagmi";

export interface WalletInfrastructureProviderProps {
  children: ReactNode;
  wagmiConfig?: Config;
  nearAdapterFactory?: () => NearAdapterPort;
  hyperliquidFetcher?: typeof fetch;
}

const INITIAL_NEAR_STATE: NearSessionState = {
  status: "disconnected",
  accountId: null,
  publicKey: null,
  providerId: null,
  providerName: null,
  networkId: "testnet",
  unsupportedNetwork: false,
  error: null,
  availableWallets: [],
};

const INITIAL_SOLANA_STATE: SolanaSessionState = {
  status: "disconnected",
  address: null,
  providerName: null,
  cluster: "devnet",
  unsupportedCluster: false,
  canDisconnectViaProvider: false,
  error: null,
  availableWallets: [],
};

const INITIAL_HYPERLIQUID_STATE: HyperliquidSessionState = {
  status: "disconnected",
  associatedEvmAddress: null,
  venueUrl: HYPERLIQUID_CORE_TESTNET_INFO.rpcUrl ?? "https://api.hyperliquid-testnet.xyz",
  network: "testnet",
  summary: null,
  isLoadingSummary: false,
  error: null,
};

function WalletHubInner({
  children,
  nearAdapterFactory,
  hyperliquidFetcher,
  hasWalletConnectProjectId,
}: {
  children: ReactNode;
  nearAdapterFactory?: () => NearAdapterPort;
  hyperliquidFetcher?: typeof fetch;
  hasWalletConnectProjectId: boolean;
}) {
  const [hydrated, setHydrated] = useState(false);
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [selectedEcosystem, setSelectedEcosystem] = useState<WalletEcosystem>("near");

  // ---------- NEAR Testnet Adapter (Primary Protocol Execution Network) ----------
  const [near, setNear] = useState<NearSessionState>(INITIAL_NEAR_STATE);
  const nearRef = useRef<NearSessionState>(INITIAL_NEAR_STATE);
  nearRef.current = near;
  const nearAdapterRef = useRef<NearAdapterPort | null>(null);
  const nearSessionRevision = useRef(0);
  const acceptNearSignIn = useRef(true);

  useEffect(() => {
    setHydrated(true);
    let mounted = true;
    const adapter = nearAdapterFactory ? nearAdapterFactory() : createHotNearConnectorAdapter();
    nearAdapterRef.current = adapter;
    acceptNearSignIn.current = true;
    const initializationRevision = ++nearSessionRevision.current;

    adapter
      .initialize({
        onSignIn: (identity) => {
          if (!mounted || !acceptNearSignIn.current) return;
          ++nearSessionRevision.current;
          setSelectedEcosystem("near");
          const isTestnet =
            identity.networkId === "testnet" && isValidNearTestnetAccountId(identity.accountId);
          setNear((prev) => ({
            ...prev,
            status: "connected",
            accountId: identity.accountId,
            publicKey: identity.publicKey ?? null,
            providerId: identity.providerId,
            providerName: identity.providerName,
            networkId: identity.networkId,
            unsupportedNetwork: !isTestnet,
            error: !isTestnet
              ? `Connected account "${identity.accountId}" is not on NEAR Testnet. Disconnect and switch to a .testnet wallet.`
              : null,
          }));
        },
        onSignOut: () => {
          if (!mounted) return;
          ++nearSessionRevision.current;
          acceptNearSignIn.current = false;
          setNear((prev) => ({
            ...INITIAL_NEAR_STATE,
            availableWallets: prev.availableWallets,
          }));
        },
        onWalletsChanged: (wallets) => {
          if (!mounted) return;
          setNear((prev) => ({ ...prev, availableWallets: wallets }));
        },
      })
      .then(({ wallets, existing }) => {
        if (!mounted) return;
        setNear((prev) => {
          if (!existing || nearSessionRevision.current !== initializationRevision) {
            return { ...prev, availableWallets: wallets };
          }
          const isTestnet =
            existing.networkId === "testnet" && isValidNearTestnetAccountId(existing.accountId);
          return {
            ...prev,
            availableWallets: wallets,
            status: "connected",
            accountId: existing.accountId,
            publicKey: existing.publicKey ?? null,
            providerId: existing.providerId,
            providerName: existing.providerName,
            networkId: existing.networkId,
            unsupportedNetwork: !isTestnet,
            error: !isTestnet
              ? `Restored account "${existing.accountId}" is not valid for NEAR Testnet.`
              : null,
          };
        });
      })
      .catch((err) => {
        if (!mounted || nearSessionRevision.current !== initializationRevision) return;
        setNear((prev) => ({
          ...prev,
          status: "error",
          error: getWalletErrorMessage(
            err,
            "NEAR wallet connector could not initialize. Retry connecting.",
          ),
        }));
      });

    return () => {
      mounted = false;
      acceptNearSignIn.current = false;
      adapter.dispose();
      nearAdapterRef.current = null;
    };
  }, [nearAdapterFactory]);

  const connectNear = useCallback(async (walletId?: string) => {
    const adapter = nearAdapterRef.current;
    if (!adapter) {
      setNear((prev) => ({
        ...prev,
        status: "error",
        error: "NEAR wallet connector is still initializing in this browser.",
      }));
      return;
    }

    const revision = ++nearSessionRevision.current;
    acceptNearSignIn.current = true;
    setNear((prev) => ({ ...prev, status: "connecting", error: null }));
    try {
      const identity = await adapter.connect(walletId);
      // An emitted sign-in already sets identity; stale promises must never overwrite it.
      if (nearAdapterRef.current !== adapter || nearSessionRevision.current !== revision) return;
      const isTestnet =
        identity.networkId === "testnet" && isValidNearTestnetAccountId(identity.accountId);
      setNear((prev) => ({
        ...prev,
        status: "connected",
        accountId: identity.accountId,
        publicKey: identity.publicKey ?? null,
        providerId: identity.providerId,
        providerName: identity.providerName,
        networkId: identity.networkId,
        unsupportedNetwork: !isTestnet,
        error: !isTestnet
          ? `Connected NEAR account "${identity.accountId}" is not on NEAR Testnet.`
          : null,
      }));
      setSelectedEcosystem("near");
    } catch (err) {
      if (nearAdapterRef.current !== adapter || nearSessionRevision.current !== revision) return;
      setNear((prev) => ({
        ...prev,
        status: prev.accountId ? "connected" : "error",
        error: getWalletErrorMessage(err, "Failed to connect NEAR Testnet wallet."),
      }));
    }
  }, []);

  const disconnectNear = useCallback(async () => {
    const adapter = nearAdapterRef.current;
    const revision = ++nearSessionRevision.current;
    acceptNearSignIn.current = false;
    try {
      await adapter?.disconnect();
    } catch (err) {
      if (nearAdapterRef.current !== adapter || nearSessionRevision.current !== revision) return;
      acceptNearSignIn.current = true;
      setNear((prev) => ({
        ...prev,
        error: getWalletErrorMessage(err, "Failed to disconnect NEAR wallet cleanly."),
      }));
      return;
    }
    if (nearAdapterRef.current !== adapter || nearSessionRevision.current !== revision) return;
    setNear((prev) => ({
      ...INITIAL_NEAR_STATE,
      availableWallets: prev.availableWallets,
    }));
  }, []);

  const sendNearTransaction = useCallback(
    async (request: NearTransactionRequest): Promise<NearSignedTxOutcome> => {
      const snapshot = nearRef.current;
      if (snapshot.status !== "connected" || !snapshot.accountId) {
        throw new Error("Connect a NEAR Testnet wallet before signing a transaction.");
      }
      if (snapshot.unsupportedNetwork || !isValidNearTestnetAccountId(snapshot.accountId)) {
        throw new Error(
          `Connected NEAR account "${snapshot.accountId}" is not valid for NEAR Testnet.`,
        );
      }
      const adapter = nearAdapterRef.current;
      if (!adapter?.signAndSendTransaction) {
        throw new Error(
          "Active NEAR wallet adapter does not support transaction signing in this session.",
        );
      }
      const expectedSigner = request.signerId ?? snapshot.accountId;
      try {
        const outcome = await adapter.signAndSendTransaction({
          ...request,
          signerId: expectedSigner,
        });
        if (
          nearRef.current.status !== "connected" ||
          nearRef.current.accountId !== expectedSigner
        ) {
          throw new Error(
            "NEAR wallet session disconnected or switched accounts during transaction signing.",
          );
        }
        return outcome;
      } catch (err) {
        if (nearRef.current.status !== "connected") {
          throw new Error(
            "NEAR wallet disconnected while waiting for signature. Reconnect and verify status on NEAR Explorer before retrying.",
            { cause: err },
          );
        }
        throw err;
      }
    },
    [],
  );

  // ---------- EVM Adapter (Wagmi + Viem Testnets + HyperEVM Chain 998) ----------
  const evmAccount = useAccount();
  const evmConnectorsRaw = useConnectors();
  const { connectAsync: connectEvmAsync } = useConnect();
  const { disconnectAsync: disconnectEvmAsync } = useDisconnect();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const [evmActionState, setEvmActionState] = useState<{
    isConnecting: boolean;
    error: string | null;
  }>({ isConnecting: false, error: null });

  const evm: EvmSessionState = useMemo(() => {
    const connectors = evmConnectorsRaw.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      isWalletConnect: c.type === "walletConnect" || c.id === "walletConnect",
      available: true,
    }));

    if (!hydrated) {
      return {
        status: "disconnected",
        address: null,
        connectorId: null,
        connectorName: null,
        chainId: null,
        chainName: null,
        unsupportedChain: false,
        isSwitchingChain: false,
        error: null,
        connectors,
      };
    }

    if (evmActionState.isConnecting || evmAccount.isConnecting || evmAccount.isReconnecting) {
      return {
        status: "connecting",
        address: evmAccount.address ?? null,
        connectorId: evmAccount.connector?.id ?? null,
        connectorName: evmAccount.connector?.name ?? null,
        chainId: evmAccount.chainId ?? null,
        chainName: getEvmNetworkInfo(evmAccount.chainId)?.name ?? null,
        unsupportedChain: false,
        isSwitchingChain,
        error: evmActionState.error,
        connectors,
      };
    }

    if (evmAccount.isConnected && evmAccount.address) {
      const chainId = evmAccount.chainId ?? null;
      const chainInfo = getEvmNetworkInfo(chainId);
      const unsupportedChain = !isSupportedEvmChainId(chainId);
      return {
        status: "connected",
        address: evmAccount.address,
        connectorId: evmAccount.connector?.id ?? null,
        connectorName: evmAccount.connector?.name ?? "EVM Wallet",
        chainId,
        chainName: chainInfo?.name ?? (chainId ? `Unsupported Chain #${chainId}` : "Unknown Chain"),
        unsupportedChain,
        isSwitchingChain,
        error: evmActionState.error,
        connectors,
      };
    }

    return {
      status: evmActionState.error ? "error" : "disconnected",
      address: null,
      connectorId: null,
      connectorName: null,
      chainId: null,
      chainName: null,
      unsupportedChain: false,
      isSwitchingChain,
      error: evmActionState.error,
      connectors,
    };
  }, [
    evmAccount.address,
    evmAccount.chainId,
    evmAccount.connector?.id,
    evmAccount.connector?.name,
    evmAccount.isConnected,
    evmAccount.isConnecting,
    evmAccount.isReconnecting,
    evmActionState.error,
    evmActionState.isConnecting,
    evmConnectorsRaw,
    hydrated,
    isSwitchingChain,
  ]);

  const connectEvm = useCallback(
    async (connectorId?: string) => {
      const target =
        (connectorId ? evmConnectorsRaw.find((c) => c.id === connectorId) : evmConnectorsRaw[0]) ??
        null;
      if (!target) {
        setEvmActionState({
          isConnecting: false,
          error:
            "No EVM connector available. Install a browser wallet or configure VITE_WALLETCONNECT_PROJECT_ID.",
        });
        return;
      }

      setEvmActionState({ isConnecting: true, error: null });
      try {
        await connectEvmAsync({ connector: target });
        setEvmActionState({ isConnecting: false, error: null });
      } catch (err) {
        setEvmActionState({
          isConnecting: false,
          error: getWalletErrorMessage(err, "Failed to connect EVM wallet."),
        });
      }
    },
    [connectEvmAsync, evmConnectorsRaw],
  );

  const disconnectEvm = useCallback(async () => {
    setEvmActionState({ isConnecting: false, error: null });
    try {
      await disconnectEvmAsync();
    } catch (err) {
      setEvmActionState({
        isConnecting: false,
        error: getWalletErrorMessage(err, "Failed to disconnect EVM wallet cleanly."),
      });
    }
  }, [disconnectEvmAsync]);

  const switchEvmChain = useCallback(
    async (chainId: EvmTestnetId) => {
      if (!isSupportedEvmChainId(chainId)) {
        setEvmActionState((prev) => ({
          ...prev,
          error: `Chain ID ${chainId} is not an approved ROASTAKE EVM testnet.`,
        }));
        return;
      }
      setEvmActionState((prev) => ({ ...prev, error: null }));
      try {
        await switchChainAsync({ chainId });
      } catch (err) {
        setEvmActionState((prev) => ({
          ...prev,
          error: getWalletErrorMessage(err, `Failed to switch EVM network to chain ${chainId}.`),
        }));
      }
    },
    [switchChainAsync],
  );

  // ---------- Solana Adapter (Solana Kit + Wallet Standard Devnet) ----------
  const registeredUiWallets = useWallets();
  const solanaUiWallets = useMemo(
    () => (hydrated ? registeredUiWallets.filter(isSolanaWallet) : []),
    [hydrated, registeredUiWallets],
  );
  const discoveredSolanaWallets = useMemo(
    () => mapSolanaDiscoveredWallets(solanaUiWallets),
    [solanaUiWallets],
  );
  const [solanaState, setSolanaState] = useState<Omit<SolanaSessionState, "availableWallets">>({
    status: INITIAL_SOLANA_STATE.status,
    address: INITIAL_SOLANA_STATE.address,
    providerName: INITIAL_SOLANA_STATE.providerName,
    cluster: INITIAL_SOLANA_STATE.cluster,
    unsupportedCluster: INITIAL_SOLANA_STATE.unsupportedCluster,
    canDisconnectViaProvider: INITIAL_SOLANA_STATE.canDisconnectViaProvider,
    error: INITIAL_SOLANA_STATE.error,
  });

  // Synchronize with external Wallet Standard unregister/account change events cleanly.
  useEffect(() => {
    if (!solanaState.providerName || solanaState.status !== "connected") return;
    const activeWallet: UiWallet | undefined = solanaUiWallets.find(
      (w) => w.name === solanaState.providerName,
    );
    if (!activeWallet) {
      setSolanaState({
        status: "disconnected",
        address: null,
        providerName: null,
        cluster: "devnet",
        unsupportedCluster: false,
        canDisconnectViaProvider: false,
        error: "Solana wallet provider disconnected or became unavailable.",
      });
      return;
    }

    if (activeWallet.accounts.length === 0) {
      setSolanaState({
        status: "disconnected",
        address: null,
        providerName: null,
        cluster: "devnet",
        unsupportedCluster: false,
        canDisconnectViaProvider: false,
        error: null,
      });
      return;
    }

    const matchingAccount =
      activeWallet.accounts.find((a) => a.address === solanaState.address) ??
      activeWallet.accounts[0];
    if (matchingAccount && matchingAccount.address !== solanaState.address) {
      const check = validateSolanaDevnetAccount(matchingAccount, activeWallet.chains);
      setSolanaState({
        status: check.validAddress ? "connected" : "error",
        address: check.validAddress ? matchingAccount.address : null,
        providerName: activeWallet.name,
        cluster: check.supportsDevnet ? "devnet" : "unsupported",
        unsupportedCluster: !check.supportsDevnet,
        canDisconnectViaProvider: solanaState.canDisconnectViaProvider,
        error: !check.validAddress || !check.supportsDevnet ? (check.reason ?? null) : null,
      });
    }
  }, [
    solanaState.address,
    solanaState.canDisconnectViaProvider,
    solanaState.providerName,
    solanaState.status,
    solanaUiWallets,
  ]);

  const connectSolana = useCallback(
    async (walletName?: string) => {
      const target =
        (walletName ? solanaUiWallets.find((w) => w.name === walletName) : solanaUiWallets[0]) ??
        null;

      if (!target) {
        setSolanaState((prev) => ({
          ...prev,
          status: "error",
          error:
            "No Wallet Standard Solana wallet detected in this browser. Install Phantom, Solflare, or another Wallet Standard extension.",
        }));
        return;
      }

      setSolanaState((prev) => ({ ...prev, status: "connecting", error: null }));
      try {
        const res = await connectSolanaUiWallet(target);
        setSolanaState({
          status: "connected",
          address: res.account.address,
          providerName: res.providerName,
          cluster: res.supportsDevnet ? "devnet" : "unsupported",
          unsupportedCluster: !res.supportsDevnet,
          canDisconnectViaProvider: res.canDisconnectViaProvider,
          error: res.supportsDevnet
            ? null
            : (res.unsupportedReason ?? "Unsupported Solana cluster."),
        });
      } catch (err) {
        setSolanaState((prev) => ({
          ...prev,
          status: prev.address ? "connected" : "error",
          error: getWalletErrorMessage(err, "Failed to connect Solana Devnet wallet."),
        }));
      }
    },
    [solanaUiWallets],
  );

  const disconnectSolana = useCallback(async () => {
    const target = solanaState.providerName
      ? solanaUiWallets.find((w) => w.name === solanaState.providerName)
      : undefined;
    try {
      await disconnectSolanaUiWallet(target);
    } catch (err) {
      setSolanaState((prev) => ({
        ...prev,
        error: getWalletErrorMessage(err, "Failed to disconnect Solana wallet."),
      }));
      return;
    }
    setSolanaState({
      status: "disconnected",
      address: null,
      providerName: null,
      cluster: "devnet",
      unsupportedCluster: false,
      canDisconnectViaProvider: false,
      error: null,
    });
  }, [solanaState.providerName, solanaUiWallets]);

  const solana: SolanaSessionState = useMemo(
    () => ({
      ...solanaState,
      availableWallets: discoveredSolanaWallets,
    }),
    [discoveredSolanaWallets, solanaState],
  );

  // ---------- Hyperliquid Testnet Core Adapter (Distinct External Trading Venue) ----------
  const [hyperliquid, setHyperliquid] =
    useState<HyperliquidSessionState>(INITIAL_HYPERLIQUID_STATE);

  // Clear stale Hyperliquid association if EVM disconnects or switches accounts.
  useEffect(() => {
    if (!hyperliquid.associatedEvmAddress) return;
    if (
      evm.status !== "connected" ||
      !evm.address ||
      evm.address.toLowerCase() !== hyperliquid.associatedEvmAddress.toLowerCase()
    ) {
      setHyperliquid(INITIAL_HYPERLIQUID_STATE);
    }
  }, [evm.address, evm.status, hyperliquid.associatedEvmAddress]);

  const refreshHyperliquidSummaryForAddress = useCallback(
    async (address: `0x${string}`) => {
      setHyperliquid((prev) => ({ ...prev, isLoadingSummary: true, error: null }));
      try {
        const summary = await fetchHyperliquidTestnetSummary(address, {
          fetchFn: hyperliquidFetcher,
        });
        setHyperliquid((prev) =>
          prev.associatedEvmAddress?.toLowerCase() === address.toLowerCase()
            ? { ...prev, status: "connected", summary, isLoadingSummary: false, error: null }
            : prev,
        );
      } catch (err) {
        setHyperliquid((prev) => ({
          ...prev,
          isLoadingSummary: false,
          error: getWalletErrorMessage(err, "Failed to inspect Hyperliquid Testnet Core account."),
        }));
      }
    },
    [hyperliquidFetcher],
  );

  const connectHyperliquid = useCallback(async () => {
    if (evm.status !== "connected" || !evm.address || !isValidEvmAddress(evm.address)) {
      setHyperliquid((prev) => ({
        ...prev,
        status: "error",
        error:
          "Connect an EVM wallet first. Hyperliquid Testnet Core uses an EVM 0x account identity without trading or API agent signatures.",
      }));
      return;
    }

    const associated = evm.address;
    setHyperliquid({
      status: "connected",
      associatedEvmAddress: associated,
      venueUrl: HYPERLIQUID_CORE_TESTNET_INFO.rpcUrl ?? "https://api.hyperliquid-testnet.xyz",
      network: "testnet",
      summary: null,
      isLoadingSummary: true,
      error: null,
    });
    await refreshHyperliquidSummaryForAddress(associated);
  }, [evm.address, evm.status, refreshHyperliquidSummaryForAddress]);

  const disconnectHyperliquid = useCallback(() => {
    setHyperliquid(INITIAL_HYPERLIQUID_STATE);
  }, []);

  const refreshHyperliquidSummary = useCallback(async () => {
    if (!hyperliquid.associatedEvmAddress) return;
    await refreshHyperliquidSummaryForAddress(hyperliquid.associatedEvmAddress);
  }, [hyperliquid.associatedEvmAddress, refreshHyperliquidSummaryForAddress]);

  // ---------- Unified Multi-Wallet Inventory (NEAR Testnet ALWAYS First) ----------
  const connectedAccounts: ConnectedWalletAccount[] = useMemo(() => {
    const accounts: ConnectedWalletAccount[] = [];

    if (near.status === "connected" && near.accountId) {
      accounts.push({
        id: `near:${near.accountId}`,
        ecosystem: "near",
        ecosystemLabel: "NEAR Testnet",
        providerName: near.providerName ?? "HOT Connect (NEAR)",
        address: near.accountId,
        abbreviatedAddress: abbreviateAddress(near.accountId),
        activeNetworkId: NEAR_TESTNET_INFO.id,
        activeNetworkName:
          near.networkId === "testnet"
            ? NEAR_TESTNET_INFO.name
            : `NEAR (${near.networkId} · unsupported)`,
        status: near.status,
        isPrimaryProtocolNetwork: true,
        isExternalVenue: false,
        unsupportedNetwork: near.unsupportedNetwork,
        unsupportedReason: near.error ?? undefined,
        deploymentNote: NEAR_TESTNET_INFO.deployedContractsNote,
      });
    }

    if (evm.status === "connected" && evm.address) {
      const chainInfo = getEvmNetworkInfo(evm.chainId);
      const isHyperEvm = evm.chainId === HYPEREVM_TESTNET_INFO.chainId;
      accounts.push({
        id: `evm:${evm.address}`,
        ecosystem: "evm",
        ecosystemLabel: isHyperEvm ? "HyperEVM Testnet (EVM 998)" : "EVM Testnets",
        providerName: evm.connectorName ?? "Injected EVM Wallet",
        address: evm.address,
        abbreviatedAddress: abbreviateAddress(evm.address),
        activeNetworkId: chainInfo?.id ?? `evm-chain-${evm.chainId ?? "unknown"}`,
        activeNetworkName: evm.chainName ?? "Unknown EVM Chain",
        status: evm.status,
        isPrimaryProtocolNetwork: false,
        isExternalVenue: false,
        unsupportedNetwork: evm.unsupportedChain,
        unsupportedReason: evm.unsupportedChain
          ? "Active chain is not an approved ROASTAKE EVM testnet. Approve a network switch explicitly."
          : undefined,
        deploymentNote:
          chainInfo?.deployedContractsNote ??
          "Unsupported EVM chain · No ROASTAKE contracts deployed.",
      });
    }

    if (solana.status === "connected" && solana.address) {
      accounts.push({
        id: `solana:${solana.address}`,
        ecosystem: "solana",
        ecosystemLabel: "Solana Devnet",
        providerName: solana.providerName ?? "Wallet Standard (Solana)",
        address: solana.address,
        abbreviatedAddress: abbreviateAddress(solana.address),
        activeNetworkId: SOLANA_DEVNET_INFO.id,
        activeNetworkName: solana.unsupportedCluster
          ? "Solana (Devnet not declared)"
          : SOLANA_DEVNET_INFO.name,
        status: solana.status,
        isPrimaryProtocolNetwork: false,
        isExternalVenue: false,
        unsupportedNetwork: solana.unsupportedCluster,
        unsupportedReason: solana.unsupportedCluster ? (solana.error ?? undefined) : undefined,
        deploymentNote: SOLANA_DEVNET_INFO.deployedContractsNote,
      });
    }

    if (hyperliquid.status === "connected" && hyperliquid.associatedEvmAddress) {
      accounts.push({
        id: `hyperliquid:${hyperliquid.associatedEvmAddress}`,
        ecosystem: "hyperliquid",
        ecosystemLabel: "Hyperliquid Testnet Core",
        providerName: `${evm.connectorName ?? "EVM Identity"} · Read-Only API`,
        address: hyperliquid.associatedEvmAddress,
        abbreviatedAddress: abbreviateAddress(hyperliquid.associatedEvmAddress),
        activeNetworkId: HYPERLIQUID_CORE_TESTNET_INFO.id,
        activeNetworkName: HYPERLIQUID_CORE_TESTNET_INFO.name,
        status: hyperliquid.status,
        isPrimaryProtocolNetwork: false,
        isExternalVenue: true,
        unsupportedNetwork: false,
        deploymentNote: HYPERLIQUID_CORE_TESTNET_INFO.deployedContractsNote,
      });
    }

    return accounts;
  }, [evm, hyperliquid, near, solana]);

  const disconnectAccount = useCallback(
    async (ecosystem: WalletEcosystem) => {
      if (ecosystem === "near") {
        await disconnectNear();
      } else if (ecosystem === "evm") {
        await disconnectEvm();
      } else if (ecosystem === "solana") {
        await disconnectSolana();
      } else {
        disconnectHyperliquid();
      }
    },
    [disconnectEvm, disconnectHyperliquid, disconnectNear, disconnectSolana],
  );

  const clearError = useCallback((ecosystem?: WalletEcosystem) => {
    if (!ecosystem || ecosystem === "near") {
      setNear((prev) => ({ ...prev, error: null }));
    }
    if (!ecosystem || ecosystem === "evm") {
      setEvmActionState((prev) => ({ ...prev, error: null }));
    }
    if (!ecosystem || ecosystem === "solana") {
      setSolanaState((prev) => ({ ...prev, error: null }));
    }
    if (!ecosystem || ecosystem === "hyperliquid") {
      setHyperliquid((prev) => ({ ...prev, error: null }));
    }
  }, []);

  const openHub = useCallback((focusEcosystem?: WalletEcosystem) => {
    if (focusEcosystem) {
      setSelectedEcosystem(focusEcosystem);
    }
    setIsHubOpen(true);
  }, []);

  const closeHub = useCallback(() => {
    setIsHubOpen(false);
  }, []);

  const value: WalletHubContextValue = useMemo(
    () => ({
      hydrated,
      primaryProtocolNetwork: NEAR_TESTNET_INFO,
      selectedEcosystem,
      setSelectedEcosystem,
      isHubOpen,
      openHub,
      closeHub,
      near,
      evm,
      solana,
      hyperliquid,
      connectedAccounts,
      supportedEvmChains: SUPPORTED_EVM_TESTNETS,
      hasWalletConnectProjectId,
      connectNear,
      disconnectNear,
      sendNearTransaction,
      connectEvm,
      disconnectEvm,
      switchEvmChain,
      connectSolana,
      disconnectSolana,
      connectHyperliquid,
      disconnectHyperliquid,
      refreshHyperliquidSummary,
      disconnectAccount,
      clearError,
    }),
    [
      clearError,
      closeHub,
      connectEvm,
      connectHyperliquid,
      connectNear,
      connectSolana,
      connectedAccounts,
      disconnectAccount,
      disconnectEvm,
      disconnectHyperliquid,
      disconnectNear,
      disconnectSolana,
      evm,
      hasWalletConnectProjectId,
      hydrated,
      hyperliquid,
      isHubOpen,
      near,
      openHub,
      refreshHyperliquidSummary,
      selectedEcosystem,
      sendNearTransaction,
      solana,
      switchEvmChain,
    ],
  );

  return <WalletHubContext.Provider value={value}>{children}</WalletHubContext.Provider>;
}

/**
 * Root multichain wallet provider wrapping Wagmi (EVM), HOT Connect (NEAR Testnet),
 * Wallet Standard (Solana Devnet), and read-only Hyperliquid Testnet Core venue association.
 */
export function WalletInfrastructureProvider({
  children,
  wagmiConfig,
  nearAdapterFactory,
  hyperliquidFetcher,
}: WalletInfrastructureProviderProps) {
  const projectId = getWalletConnectProjectId();
  const [clientWagmiConfig, setClientWagmiConfig] = useState<Config>(
    () => wagmiConfig ?? getRoastakeWagmiConfig(),
  );

  useEffect(() => {
    if (wagmiConfig) {
      setClientWagmiConfig(wagmiConfig);
      return;
    }
    if (!projectId || typeof window === "undefined") {
      return;
    }
    let cancelled = false;
    createRoastakeClientWagmiConfigWithWalletConnect(projectId)
      .then((nextConfig) => {
        if (!cancelled) setClientWagmiConfig(nextConfig);
      })
      .catch(() => {
        // Keep browser-injected EVM wallets working if dynamic WalletConnect init fails.
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, wagmiConfig]);

  return (
    <WagmiProvider config={clientWagmiConfig} reconnectOnMount={true}>
      <WalletHubInner
        nearAdapterFactory={nearAdapterFactory}
        hyperliquidFetcher={hyperliquidFetcher}
        hasWalletConnectProjectId={Boolean(projectId)}
      >
        {children}
      </WalletHubInner>
    </WagmiProvider>
  );
}
