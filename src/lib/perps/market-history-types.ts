// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

export const MARKET_CHART_TIMEFRAMES = ["ALL", "1m", "5m", "15m", "1H", "4H", "1D"] as const;

export type MarketChartTimeframe = (typeof MARKET_CHART_TIMEFRAMES)[number];

export type IntradayMarketChartTimeframe = Exclude<MarketChartTimeframe, "ALL">;

export type VerifiedHistoryTxRole = "oracle_tick" | "position_open" | "position_close";

/**
 * Immutable Testnet transaction locator (txHash + signer + expected role).
 * Intentionally carries NO pre-recorded prices, sequences, or timestamps: every plotted value
 * MUST be fetched and cryptographically verified via live NEAR Testnet RPC receipts.
 */
export interface VerifiedHistoryTxPointer {
  txHash: string;
  senderAccountId: string;
  role: VerifiedHistoryTxRole;
  label?: string;
}

export interface VerifiedOracleObservation {
  kind: "oracle_sandbox_tick";
  marketId: string;
  sequence: number;
  priceE8: string;
  priceUsd: number;
  timestampSec: number;
  classification: string;
  signerId: string;
  executorId: string;
  txHash: string;
  receiptId: string;
  receiptBlockHash: string | null;
  explorerUrl: string;
}

export type VerifiedTradeMarkerKind = "LONG_OPEN" | "SHORT_OPEN" | "CLOSE";

export interface VerifiedTradeMarker {
  kind: VerifiedTradeMarkerKind;
  marketId: string;
  positionId: number;
  side: "Long" | "Short" | null;
  owner: string;
  execPriceE8: string;
  execPriceUsd: number;
  sizeE8: string | null;
  notionalE8: string | null;
  marginE8: string | null;
  feeE8: string;
  realizedPnlE8: string | null;
  fundingSettledE8: string | null;
  payoutE8: string | null;
  emergency: boolean | null;
  timestampSec: number;
  /**
   * Nearest active verified oracle observation timestamp used for chart bar anchoring
   * without fabricating intermediate synthetic price ticks.
   */
  anchorTimeSec: number | null;
  anchorSequence: number | null;
  signerId: string;
  executorId: string;
  txHash: string;
  receiptId: string;
  receiptBlockHash: string | null;
  explorerUrl: string;
}

export type MarketHistoryStatus = "loading" | "success" | "empty" | "stale" | "error";

export type MarketHistoryConnectionState =
  "indexer_connected" | "indexer_degraded" | "fallback_m0412_rpc";

export interface OracleSampleCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  sampleCount: number;
}

export interface CandleIntervalSummary {
  seriesClassification: "ORACLE SAMPLE OHLC";
  timeframe: IntradayMarketChartTimeframe;
  available: boolean;
  reason: string | null;
  totalObservations: number;
  bucketCount: number;
  multiSampleBuckets: number;
  coverageRatio?: number;
  candles: readonly OracleSampleCandle[];
}

export interface MarketVolumeSummary {
  available: boolean;
  status: "unavailable" | "verified";
  timeframe: string;
  reason: string | null;
  baseVolumeKg: string | null;
  notionalVolumeUsd: string | null;
  executionCount: number;
  openedExecutions: number;
  closedExecutions: number;
  liquidatedExecutions: number;
  verifiedOpenedBaseKg: string | null;
  verifiedOpenedNotionalUsd: string | null;
  excludedNonVolumeEvents: number;
  source: string;
}

export interface CoverageSegmentSummary {
  kind: string;
  source: string;
  startHeight: number;
  endHeight: number;
  blockCount?: number;
  txCount?: number;
  contiguousBlockScan: boolean;
}

export interface CoverageGapSummary {
  kind: string;
  fromHeight: number;
  toHeight: number;
  missingBlocks: number;
  reason: string;
}

export interface IndexerCoverageMetadata {
  coverageStartHeight: number | null;
  indexedThroughHeight: number | null;
  indexedThroughHash: string | null;
  lastFinalizedHeight: number | null;
  lagBlocks: number | null;
  status?: "healthy" | "degraded" | null;
  providerStatus: string | null;
  lastErrorCode?: string | null;
  lastErrorAt?: string | null;
  lastSuccessfulBlockAt?: string | null;
  gapDetected: boolean;
  backfillCompleted: boolean;
  backfillBlockRange: { minHeight: number; maxHeight: number } | null;
  seedBackfillRange?: {
    minHeight: number;
    maxHeight: number;
    txCount?: number;
    contiguousBlockScan?: boolean;
  } | null;
  forwardScanRange?: {
    startHeight: number;
    endHeight: number;
    blockCount: number;
  } | null;
  coverageSegments?: readonly CoverageSegmentSummary[];
  coverageGaps?: readonly CoverageGapSummary[];
  coverageComplete: boolean;
  totalGapBlocks?: number;
  totalScannedBlocks?: number;
  blocksProcessed: number;
}

export interface TimeframeAvailability {
  timeframe: MarketChartTimeframe;
  canRenderLine: boolean;
  canRenderCandles: boolean;
  observationCount: number;
  candles: readonly OracleSampleCandle[];
  reason: string | null;
}

export interface PerpsMarketHistorySnapshot {
  network: "testnet";
  contractId: string;
  marketId: string;
  rpcEndpoint: string;
  referenceNowSec: number;
  maxAgeSec: number;
  fetchedAtMs: number;
  sourceMode: "verified_testnet_tx_receipts" | "persistent_indexer";
  historyConnectionState?: MarketHistoryConnectionState;
  fallbackReason?: string | null;
  coverage?: IndexerCoverageMetadata | null;
  candleAvailability?: Partial<Record<IntradayMarketChartTimeframe, CandleIntervalSummary>> | null;
  volume?: MarketVolumeSummary | null;
  observations: readonly VerifiedOracleObservation[];
  tradeMarkers: readonly VerifiedTradeMarker[];
  latestObservation: VerifiedOracleObservation | null;
  latestAgeSec: number | null;
  isStale: boolean;
  rejectedCount: number;
}

export interface PerpsMarketHistoryQueryParams {
  contractId?: string;
  marketId?: string;
  maxAgeSec?: number;
  referenceNowSec?: number | null;
  txPointers?: readonly VerifiedHistoryTxPointer[];
  apiBaseUrl?: string;
}

/**
 * Abstraction boundary separating persistence/transport from chart UI components.
 */
export interface PerpsMarketHistoryProvider {
  readonly kind: "rpc_verified_receipts" | "persistent_indexer";
  fetchMarketHistory(params?: PerpsMarketHistoryQueryParams): Promise<PerpsMarketHistorySnapshot>;
}
