// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { TESTNET_EXPLORER_TX_BASE } from "@/lib/oracle/config";
import type { MarketView, PerpsProtocolSnapshot } from "./types";

export const PERPS_CONTRACT_ID = "perps-v1.roastake-dev-mta.testnet" as const;
export const CIRCLE_TESTNET_USDC_ID =
  "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af" as const;
export const CIRCLE_TESTNET_USDC_ASSET_URI =
  `nep141:${CIRCLE_TESTNET_USDC_ID}` as const;
export const PERPS_OPERATOR_ACCOUNT_ID = "roastake-dev-mta.testnet" as const;

export const MARKET_ARABICA_PERPS_ID = "COFFEE-ARABICA-TESTNET/USD" as const;
export const MARKET_ARABICA_URL_SLUG = "COFFEE-ARABICA-TESTNET-USD" as const;

export const MARKET_ROBUSTA_PERPS_ID = "COFFEE-ROBUSTA-TESTNET/USD" as const;
export const MARKET_ROBUSTA_LOGICAL_ID = "COFFEE-ROBUSTA" as const;
export const MARKET_ROBUSTA_URL_SLUG = MARKET_ROBUSTA_LOGICAL_ID;
export const MARKET_ROBUSTA_PREVIEW_ID = MARKET_ROBUSTA_LOGICAL_ID;

export const MARKET_GESHA_PERPS_ID = "COFFEE-GESHA-TESTNET/USD" as const;
export const MARKET_GESHA_LOGICAL_ID = "COFFEE-GESHA" as const;
export const MARKET_GESHA_URL_SLUG = MARKET_GESHA_LOGICAL_ID;
export const MARKET_GESHA_PREVIEW_ID = MARKET_GESHA_LOGICAL_ID;

export const OPERATIONAL_PERPS_MARKET_IDS = [
  MARKET_ARABICA_PERPS_ID,
  MARKET_ROBUSTA_PERPS_ID,
  MARKET_GESHA_PERPS_ID,
] as const;

export type OperationalPerpsMarketId = (typeof OPERATIONAL_PERPS_MARKET_IDS)[number];

export const PRICE_SCALE = 100_000_000n; // 10^8 USD/kg
export const SIZE_SCALE = 100_000_000n; // 10^8 kg
export const USD_SCALE = 100_000_000n; // 10^8 internal USD
export const USDC_SCALE = 1_000_000n; // 10^6 Circle USDC decimals
export const USDC_TO_USD_E8_SCALE = 100n; // 10^8 / 10^6
export const BPS_SCALE = 10_000n;
export const FUNDING_SCALE = 1_000_000_000_000n; // 10^12
export const LP_SHARE_SCALE = 100_000_000n; // 10^8
export const MINIMUM_LP_SEED_SHARES_E8 = 10_000n;

export const PERPS_ACCOUNT_STORAGE_DEPOSIT_YOCTO = "50000000000000000000000" as const; // 0.05 NEAR
export const PERPS_ACCOUNT_STORAGE_DEPOSIT_NEAR = "0.05" as const;
export const CIRCLE_STORAGE_DEPOSIT_YOCTO = "1250000000000000000000" as const; // 0.00125 NEAR

export const GAS_30_TGAS = "30000000000000" as const;
export const GAS_50_TGAS = "50000000000000" as const;
export const GAS_100_TGAS = "100000000000000" as const;
export const GAS_120_TGAS = "120000000000000" as const;
export const ONE_YOCTO_NEAR = "1" as const;
export const ZERO_YOCTO_NEAR = "0" as const;

export const PERPS_POLL_INTERVAL_MS = 30_000;
export const PERPS_RPC_TIMEOUT_MS = 10_000;
export const PERPS_TX_VERIFY_TIMEOUT_MS = 35_000;

export const TESTNET_NON_MONETARY_NOTICE =
  "Circle Native Testnet USDC (no monetary value): official 6-decimal NEAR Testnet USDC; 1 USDC = 1 USD parity is accounting-only.";

export interface ThreeMarketCatalogEntry {
  urlSlug: string;
  logicalId: string;
  marketId: string;
  displayName: string;
  variety: string;
  unit: string;
  status: "configured_testnet" | "preview";
  badges: readonly ("SYNTHETIC ORACLE" | "PREVIEW" | "ROADMAP")[];
  description: string;
  oracleNote: string;
  settlementTokenSymbol: "USDC";
}

export const THREE_MARKET_CATALOG: readonly ThreeMarketCatalogEntry[] = [
  {
    urlSlug: MARKET_ARABICA_URL_SLUG,
    logicalId: "COFFEE-ARABICA",
    marketId: MARKET_ARABICA_PERPS_ID,
    displayName: "Arabica / USD",
    variety: "Coffea arabica",
    unit: "USD/kg",
    status: "configured_testnet",
    badges: ["SYNTHETIC ORACLE"],
    description:
      "Configured as the primary coffee perpetual market for NEAR Testnet. Registration is confirmed only when the contract registry returns COFFEE-ARABICA-TESTNET/USD.",
    oracleNote:
      "Uses TESTNET_SANDBOX_FEED when registered and configured: an operator-controlled synthetic Testnet price, not a decentralized spot index or independent exchange feed.",
    settlementTokenSymbol: "USDC",
  },
  {
    urlSlug: MARKET_ROBUSTA_URL_SLUG,
    logicalId: MARKET_ROBUSTA_LOGICAL_ID,
    marketId: MARKET_ROBUSTA_PERPS_ID,
    displayName: "Robusta / USD",
    variety: "Coffea canephora",
    unit: "USD/kg",
    status: "configured_testnet",
    badges: ["SYNTHETIC ORACLE"],
    description:
      "Configured as an independent Robusta perpetual market for NEAR Testnet. Registration is confirmed only by the contract registry.",
    oracleNote:
      "Intended to use an independent TESTNET_SANDBOX_FEED sequence: synthetic Testnet demonstration values, not real-world commercial Robusta quotes.",
    settlementTokenSymbol: "USDC",
  },
  {
    urlSlug: MARKET_GESHA_URL_SLUG,
    logicalId: MARKET_GESHA_LOGICAL_ID,
    marketId: MARKET_GESHA_PERPS_ID,
    displayName: "Gesha / USD",
    variety: "Specialty Gesha",
    unit: "USD/kg",
    status: "configured_testnet",
    badges: ["SYNTHETIC ORACLE"],
    description:
      "Configured as an independent Gesha perpetual market for NEAR Testnet. Registration is confirmed only by the contract registry.",
    oracleNote:
      "Intended to use an independent TESTNET_SANDBOX_FEED sequence: synthetic Testnet demonstration values, not real-world commercial Gesha auction prices or benchmarks.",
    settlementTokenSymbol: "USDC",
  },
] as const;

export function resolveThreeMarketEntry(param: string): ThreeMarketCatalogEntry | null {
  let normalized = param.trim();
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Keep trimmed value when param contains incomplete percent escapes.
  }
  const upper = normalized.toUpperCase();
  if (
    upper === MARKET_ARABICA_PERPS_ID ||
    upper === MARKET_ARABICA_URL_SLUG ||
    upper === "COFFEE-ARABICA" ||
    upper === "COFFEE-ARABICA-TESTNET" ||
    upper === "ARABICA" ||
    upper === "ARABICA-USD"
  ) {
    return THREE_MARKET_CATALOG[0];
  }
  if (
    upper === MARKET_ROBUSTA_LOGICAL_ID ||
    upper === MARKET_ROBUSTA_PERPS_ID ||
    upper === "COFFEE-ROBUSTA-TESTNET-USD" ||
    upper === "COFFEE-ROBUSTA-TESTNET" ||
    upper === "ROBUSTA" ||
    upper === "ROBUSTA-USD"
  ) {
    return THREE_MARKET_CATALOG[1];
  }
  if (
    upper === MARKET_GESHA_LOGICAL_ID ||
    upper === MARKET_GESHA_PERPS_ID ||
    upper === "COFFEE-GESHA-TESTNET-USD" ||
    upper === "COFFEE-GESHA-TESTNET" ||
    upper === "GESHA" ||
    upper === "GESHA-USD"
  ) {
    return THREE_MARKET_CATALOG[2];
  }
  return null;
}

export interface VerifiedCycleProofTx {
  phase: string;
  action: string;
  summary: string;
  txHash: string;
  explorerUrl: string;
}

/**
 * Immutable historical Testnet verification records from the M04.6-G Hybrid Cycle
 * (Admin/LP roastake-dev-mta.testnet via NEAR CLI + Trader majorblog5570.testnet via Meteor Wallet).
 * Shown strictly as verifiable reference proof and NEVER treated as current user balances.
 */
export const VERIFIED_TESTNET_CYCLE_PROOF: readonly VerifiedCycleProofTx[] = [
  {
    phase: "M04.6-G · Oracle #3",
    action: "Synthetic Price Tick (seq 3)",
    summary: "$10.00/kg TESTNET_SANDBOX_FEED update on COFFEE-ARABICA-TESTNET/USD (admin CLI)",
    txHash: "8KGqwWiHmFs2TQpDWWPEe8jRHWuBrfpjbe2EDBt47men",
    explorerUrl: `${TESTNET_EXPLORER_TX_BASE}8KGqwWiHmFs2TQpDWWPEe8jRHWuBrfpjbe2EDBt47men`,
  },
  {
    phase: "M04.6-G · LP Seed",
    action: "LP Deposit (2.00 USDC)",
    summary: "ft_transfer_call 2000000 USDC -> 199,840,127 shares minted (10,000 seed locked)",
    txHash: "4b5cqULXF984ouYTUc5REX2vJbVKE3iYuTxAU1eZASd2",
    explorerUrl: `${TESTNET_EXPLORER_TX_BASE}4b5cqULXF984ouYTUc5REX2vJbVKE3iYuTxAU1eZASd2`,
  },
  {
    phase: "M04.6-G · Oracle #4",
    action: "Synthetic Price Tick (seq 4)",
    summary: "$10.00/kg feed renewal (<300s age) prior to Meteor position open",
    txHash: "BNzMzWmVUBpz8nvMNnHvJjajYsnMuDqbVTr7iyQqVqUZ",
    explorerUrl: `${TESTNET_EXPLORER_TX_BASE}BNzMzWmVUBpz8nvMNnHvJjajYsnMuDqbVTr7iyQqVqUZ`,
  },
  {
    phase: "M04.6-G · Open LONG #2",
    action: "Open Long #2 (0.10 kg @ $10.00)",
    summary: "majorblog5570.testnet (Meteor): $1.00 notional, $0.25 margin (4x), $0.001 fee",
    txHash: "CNgQkfrRpMrU8ywgzFaBdniPfivRDsgEnXcfoFX6gWAp",
    explorerUrl: `${TESTNET_EXPLORER_TX_BASE}CNgQkfrRpMrU8ywgzFaBdniPfivRDsgEnXcfoFX6gWAp`,
  },
  {
    phase: "M04.6-G · Oracle #5",
    action: "Synthetic Price Tick (seq 5)",
    summary: "$10.00/kg feed renewal (<300s age) prior to Meteor position close",
    txHash: "Jz7uJnm213s2qLNyBsnkwDPpkNYcuH255wFxPrFeemR",
    explorerUrl: `${TESTNET_EXPLORER_TX_BASE}Jz7uJnm213s2qLNyBsnkwDPpkNYcuH255wFxPrFeemR`,
  },
  {
    phase: "M04.6-G · Close #2",
    action: "Close Long #2",
    summary: "majorblog5570.testnet (Meteor): closed @ $10.00/kg · PnL $0 · Funding -$1805 e8 · Fee $0.001",
    txHash: "2QWybbu1rwxC9in5y8cxAzXzH7PR1bbH6x5WKDJHREnC",
    explorerUrl: `${TESTNET_EXPLORER_TX_BASE}2QWybbu1rwxC9in5y8cxAzXzH7PR1bbH6x5WKDJHREnC`,
  },
  {
    phase: "M04.6-G · Withdraw Trader",
    action: "Withdraw Trader Collateral",
    summary: "majorblog5570.testnet (Meteor): 0.997981 USDC returned via async settled callback",
    txHash: "DCAfqd5CSi2fk7ezsvo9J657yvX8M7NGEAqS6qvhZmFc",
    explorerUrl: `${TESTNET_EXPLORER_TX_BASE}DCAfqd5CSi2fk7ezsvo9J657yvX8M7NGEAqS6qvhZmFc`,
  },
  {
    phase: "M04.6-G · Withdraw LP",
    action: "Withdraw Redeemable LP Shares",
    summary: "199,840,127 shares burned -> 2.001417 USDC returned (10,000 seed shares preserved)",
    txHash: "2PJWPxDTP4zt8H5EfiaMd3Tu34aM21k4x7FjUpcR6nVP",
    explorerUrl: `${TESTNET_EXPLORER_TX_BASE}2PJWPxDTP4zt8H5EfiaMd3Tu34aM21k4x7FjUpcR6nVP`,
  },
] as const;

export function getExplorerTxUrl(txHash: string): string {
  return `${TESTNET_EXPLORER_TX_BASE}${encodeURIComponent(txHash)}`;
}

export function getMarketFromProtocolSnapshot(
  protocol: PerpsProtocolSnapshot | null | undefined,
  marketId: string,
): MarketView | null {
  if (!protocol) return null;
  if (protocol.marketStates && Object.prototype.hasOwnProperty.call(protocol.marketStates, marketId)) {
    return protocol.marketStates[marketId] ?? null;
  }
  if (marketId === MARKET_ARABICA_PERPS_ID) {
    return protocol.arabicaMarket ?? null;
  }
  if (marketId === MARKET_ROBUSTA_PERPS_ID) {
    return protocol.robustaMarket ?? null;
  }
  if (marketId === MARKET_GESHA_PERPS_ID) {
    return protocol.geshaMarket ?? null;
  }
  return null;
}

export function isAuthorizedOperatorAdmin(params: {
  nearStatus: string;
  unsupportedNetwork: boolean;
  connectedAccountId: string | null | undefined;
  contractAdmin: string | null | undefined;
}): boolean {
  if (params.nearStatus !== "connected" || params.unsupportedNetwork) return false;
  const acc = params.connectedAccountId?.trim().toLowerCase();
  const admin = params.contractAdmin?.trim().toLowerCase();
  if (!acc || !admin) return false;
  return acc === PERPS_OPERATOR_ACCOUNT_ID && acc === admin;
}
