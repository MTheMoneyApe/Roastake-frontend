// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

export type WalletEcosystem = "near" | "evm" | "solana" | "hyperliquid";

export type WalletConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export type EvmTestnetId = 11155111 | 84532 | 421614 | 998;

export interface WalletNetworkInfo {
  id: string;
  ecosystem: WalletEcosystem;
  name: string;
  shortName: string;
  environment: "testnet" | "devnet";
  chainId?: number;
  rpcUrl?: string;
  explorerUrl?: string;
  isPrimaryProtocolNetwork: boolean;
  isExternalVenue: boolean;
  deployedContractsNote: string;
  roastakeStatus:
    | "primary_execution_deployed_oracle"
    | "identity_only_no_contracts"
    | "external_venue_readonly_only";
}

export interface NearDiscoveredWallet {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  supportsTestnet: boolean;
}

export interface NearSessionState {
  status: WalletConnectionStatus;
  accountId: string | null;
  publicKey?: string | null;
  providerId: string | null;
  providerName: string | null;
  networkId: "testnet" | "mainnet" | string;
  unsupportedNetwork: boolean;
  error: string | null;
  availableWallets: NearDiscoveredWallet[];
}

export interface EvmConnectorOption {
  id: string;
  name: string;
  type: string;
  isWalletConnect: boolean;
  available: boolean;
}

export interface EvmSessionState {
  status: WalletConnectionStatus;
  address: `0x${string}` | null;
  connectorId: string | null;
  connectorName: string | null;
  chainId: number | null;
  chainName: string | null;
  unsupportedChain: boolean;
  isSwitchingChain: boolean;
  error: string | null;
  connectors: EvmConnectorOption[];
}

export interface SolanaDiscoveredWallet {
  name: string;
  icon?: string;
  chains: readonly string[];
  supportsDevnet: boolean;
  supportsDisconnect: boolean;
}

export interface SolanaSessionState {
  status: WalletConnectionStatus;
  address: string | null;
  providerName: string | null;
  cluster: "devnet" | "unsupported";
  unsupportedCluster: boolean;
  canDisconnectViaProvider: boolean;
  error: string | null;
  availableWallets: SolanaDiscoveredWallet[];
}

export interface HyperliquidAccountSummary {
  accountValueUsd: string;
  withdrawableUsd: string;
  totalMarginUsedUsd: string;
  openPositionCount: number;
  spotBalanceCount: number;
  fetchedAtMs: number;
}

export interface HyperliquidSessionState {
  status: WalletConnectionStatus;
  associatedEvmAddress: `0x${string}` | null;
  venueUrl: string;
  network: "testnet";
  summary: HyperliquidAccountSummary | null;
  isLoadingSummary: boolean;
  error: string | null;
}

export interface ConnectedWalletAccount {
  id: string;
  ecosystem: WalletEcosystem;
  ecosystemLabel: string;
  providerName: string;
  address: string;
  abbreviatedAddress: string;
  activeNetworkId: string;
  activeNetworkName: string;
  status: WalletConnectionStatus;
  isPrimaryProtocolNetwork: boolean;
  isExternalVenue: boolean;
  unsupportedNetwork: boolean;
  unsupportedReason?: string;
  deploymentNote: string;
}

export interface NearFunctionCallActionInput {
  type: "FunctionCall";
  params: {
    methodName: string;
    args: Record<string, unknown>;
    gas: string;
    deposit: string;
  };
}

export interface NearTransactionRequest {
  receiverId: string;
  actions: NearFunctionCallActionInput[];
  signerId?: string;
}

export interface NearSignedTxOutcome {
  transactionHash: string;
  signerId: string;
  receiverId: string;
  rawOutcome: unknown;
}

export interface WalletHubContextValue {
  hydrated: boolean;
  primaryProtocolNetwork: WalletNetworkInfo;
  selectedEcosystem: WalletEcosystem;
  setSelectedEcosystem: (ecosystem: WalletEcosystem) => void;
  isHubOpen: boolean;
  openHub: (focusEcosystem?: WalletEcosystem) => void;
  closeHub: () => void;
  near: NearSessionState;
  evm: EvmSessionState;
  solana: SolanaSessionState;
  hyperliquid: HyperliquidSessionState;
  connectedAccounts: ConnectedWalletAccount[];
  supportedEvmChains: readonly WalletNetworkInfo[];
  hasWalletConnectProjectId: boolean;
  connectNear: (walletId?: string) => Promise<void>;
  disconnectNear: () => Promise<void>;
  sendNearTransaction: (request: NearTransactionRequest) => Promise<NearSignedTxOutcome>;
  connectEvm: (connectorId?: string) => Promise<void>;
  disconnectEvm: () => Promise<void>;
  switchEvmChain: (chainId: EvmTestnetId) => Promise<void>;
  connectSolana: (walletName?: string) => Promise<void>;
  disconnectSolana: () => Promise<void>;
  connectHyperliquid: () => Promise<void>;
  disconnectHyperliquid: () => void;
  refreshHyperliquidSummary: () => Promise<void>;
  disconnectAccount: (ecosystem: WalletEcosystem) => Promise<void>;
  clearError: (ecosystem?: WalletEcosystem) => void;
}
