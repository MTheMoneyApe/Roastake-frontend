// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { ORACLE_CONTRACT_ID, PRIMARY_TESTNET_RPC_URL } from "@/lib/oracle/config";
import type { EvmTestnetId, WalletNetworkInfo } from "./types";

export const NEAR_TESTNET_INFO: WalletNetworkInfo = {
  id: "near-testnet",
  ecosystem: "near",
  name: "NEAR Testnet",
  shortName: "NEAR Testnet",
  environment: "testnet",
  rpcUrl: PRIMARY_TESTNET_RPC_URL,
  explorerUrl: "https://explorer.testnet.near.org",
  isPrimaryProtocolNetwork: true,
  isExternalVenue: false,
  deployedContractsNote: `Live Testnet contracts: perps-v1.roastake-dev-mta.testnet (Perpetuals · Arabica Synthetic + Circle USDC) & ${ORACLE_CONTRACT_ID} (IMF/Gesha Oracle).`,
  roastakeStatus: "primary_execution_deployed_oracle",
};

export const ETHEREUM_SEPOLIA_INFO: WalletNetworkInfo = {
  id: "ethereum-sepolia",
  ecosystem: "evm",
  name: "Ethereum Sepolia",
  shortName: "Sepolia",
  environment: "testnet",
  chainId: 11155111,
  explorerUrl: "https://sepolia.etherscan.io",
  isPrimaryProtocolNetwork: false,
  isExternalVenue: false,
  deployedContractsNote: "Connected wallet identity only · No ROASTAKE contracts deployed.",
  roastakeStatus: "identity_only_no_contracts",
};

export const BASE_SEPOLIA_INFO: WalletNetworkInfo = {
  id: "base-sepolia",
  ecosystem: "evm",
  name: "Base Sepolia",
  shortName: "Base Sepolia",
  environment: "testnet",
  chainId: 84532,
  explorerUrl: "https://sepolia.basescan.org",
  isPrimaryProtocolNetwork: false,
  isExternalVenue: false,
  deployedContractsNote: "Connected wallet identity only · No ROASTAKE contracts deployed.",
  roastakeStatus: "identity_only_no_contracts",
};

export const ARBITRUM_SEPOLIA_INFO: WalletNetworkInfo = {
  id: "arbitrum-sepolia",
  ecosystem: "evm",
  name: "Arbitrum Sepolia",
  shortName: "Arbitrum Sepolia",
  environment: "testnet",
  chainId: 421614,
  explorerUrl: "https://sepolia.arbiscan.io",
  isPrimaryProtocolNetwork: false,
  isExternalVenue: false,
  deployedContractsNote: "Connected wallet identity only · No ROASTAKE contracts deployed.",
  roastakeStatus: "identity_only_no_contracts",
};

export const HYPEREVM_TESTNET_RPC_URL = "https://rpc.hyperliquid-testnet.xyz/evm";
export const HYPEREVM_TESTNET_CHAIN_ID = 998 as const;

export const HYPEREVM_TESTNET_INFO: WalletNetworkInfo = {
  id: "hyperevm-testnet",
  ecosystem: "evm",
  name: "HyperEVM Testnet",
  shortName: "HyperEVM Testnet",
  environment: "testnet",
  chainId: HYPEREVM_TESTNET_CHAIN_ID,
  rpcUrl: HYPEREVM_TESTNET_RPC_URL,
  isPrimaryProtocolNetwork: false,
  isExternalVenue: false,
  deployedContractsNote:
    "EVM chain 998 identity only · Separate from Hyperliquid Core API · No ROASTAKE contracts deployed.",
  roastakeStatus: "identity_only_no_contracts",
};

export const SUPPORTED_EVM_TESTNETS: readonly WalletNetworkInfo[] = [
  ETHEREUM_SEPOLIA_INFO,
  BASE_SEPOLIA_INFO,
  ARBITRUM_SEPOLIA_INFO,
  HYPEREVM_TESTNET_INFO,
] as const;

export const SUPPORTED_EVM_CHAIN_IDS = new Set<number>([11155111, 84532, 421614, 998]);

export const SOLANA_DEVNET_RPC_URL = "https://api.devnet.solana.com";

export const SOLANA_DEVNET_INFO: WalletNetworkInfo = {
  id: "solana-devnet",
  ecosystem: "solana",
  name: "Solana Devnet",
  shortName: "Solana Devnet",
  environment: "devnet",
  rpcUrl: SOLANA_DEVNET_RPC_URL,
  explorerUrl: "https://explorer.solana.com/?cluster=devnet",
  isPrimaryProtocolNetwork: false,
  isExternalVenue: false,
  deployedContractsNote: "Connected Solana Devnet identity only · No ROASTAKE contracts deployed.",
  roastakeStatus: "identity_only_no_contracts",
};

export const HYPERLIQUID_TESTNET_API_URL = "https://api.hyperliquid-testnet.xyz";

export const HYPERLIQUID_CORE_TESTNET_INFO: WalletNetworkInfo = {
  id: "hyperliquid-testnet-core",
  ecosystem: "hyperliquid",
  name: "Hyperliquid Testnet Core",
  shortName: "Hyperliquid Core",
  environment: "testnet",
  rpcUrl: HYPERLIQUID_TESTNET_API_URL,
  isPrimaryProtocolNetwork: false,
  isExternalVenue: true,
  deployedContractsNote:
    "External trading venue (L1 Core API, distinct from HyperEVM 998) · Read-only account check only · Trading/agents disabled.",
  roastakeStatus: "external_venue_readonly_only",
};

// Priority order enforced across all multichain selectors:
// 1. NEAR  2. Ethereum  3. Base  4. Arbitrum  5. Solana  6. HyperEVM  7. Hyperliquid
export const ALL_WALLET_NETWORKS: readonly WalletNetworkInfo[] = [
  NEAR_TESTNET_INFO,
  ETHEREUM_SEPOLIA_INFO,
  BASE_SEPOLIA_INFO,
  ARBITRUM_SEPOLIA_INFO,
  SOLANA_DEVNET_INFO,
  HYPEREVM_TESTNET_INFO,
  HYPERLIQUID_CORE_TESTNET_INFO,
] as const;

export function isSupportedEvmChainId(chainId: number | null | undefined): chainId is EvmTestnetId {
  return typeof chainId === "number" && SUPPORTED_EVM_CHAIN_IDS.has(chainId);
}

export function getEvmNetworkInfo(chainId: number | null | undefined): WalletNetworkInfo | null {
  if (typeof chainId !== "number") return null;
  return SUPPORTED_EVM_TESTNETS.find((net) => net.chainId === chainId) ?? null;
}

export function abbreviateAddress(address: string, head = 6, tail = 4): string {
  const trimmed = address.trim();
  if (!trimmed) return "";
  if (trimmed.endsWith(".testnet")) {
    if (trimmed.length <= 22) return trimmed;
    return `${trimmed.slice(0, 10)}...${trimmed.slice(-8)}`;
  }
  if (trimmed.length <= head + tail + 3) return trimmed;
  return `${trimmed.slice(0, head)}...${trimmed.slice(-tail)}`;
}

/**
 * Safely read optional WalletConnect public project ID without failing SSR or test runtimes.
 * Never invents or falls back to a hardcoded ID.
 */
export function getWalletConnectProjectId(): string | null {
  try {
    const raw = import.meta.env?.VITE_WALLETCONNECT_PROJECT_ID;
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

export function getWalletErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const msg = err.message.trim();
    if (/user rejected|user denied|rejected the request|cancelled|canceled/i.test(msg)) {
      return "Connection or network request rejected by user.";
    }
    return msg || fallback;
  }
  return fallback;
}
