// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { z } from "zod";
import type { FetchLike } from "@/lib/oracle/rpc";
import {
  MARKET_ARABICA_PERPS_ID,
  MARKET_GESHA_PERPS_ID,
  MARKET_ROBUSTA_PERPS_ID,
  OPERATIONAL_PERPS_MARKET_IDS,
  PERPS_CONTRACT_ID,
  getExplorerTxUrl,
} from "./config";
import {
  normalizeAndAnchorTradeMarkers,
  normalizeAndSortObservations,
  priceE8ToChartValue,
} from "./market-history-rpc";
import type {
  CandleIntervalSummary,
  IndexerCoverageMetadata,
  IntradayMarketChartTimeframe,
  MarketHistoryConnectionState,
  MarketVolumeSummary,
  PerpsMarketHistorySnapshot,
  VerifiedOracleObservation,
  VerifiedTradeMarker,
} from "./market-history-types";

export const DEFAULT_PERPS_HISTORY_API_URL = "http://127.0.0.1:8787" as const;
export const PERPS_HISTORY_API_TIMEOUT_MS = 3_500;
export const PERPS_HISTORY_POLL_INTERVAL_MS = 5_000;

const UnsignedIntStringSchema = z.string().regex(/^\d+$/);

const IndexerObservationRecordSchema = z.object({
  eventId: z.string().min(1),
  network: z.literal("testnet"),
  contractId: z.string().min(1),
  marketId: z.string().min(1),
  eventType: z.literal("oracle_sandbox_tick"),
  blockHeight: z.number().int().nonnegative(),
  blockHash: z.string().min(1),
  blockTimestamp: z.number().int().positive(),
  receiptId: z.string().min(1),
  transactionHash: z.string().nullable().optional(),
  data: z.object({
    market_id: z.string().min(1),
    publisher: z.string().min(1),
    sequence: z.number().int().nonnegative(),
    price_e8: UnsignedIntStringSchema,
    observed_at_sec: z.number().int().positive(),
    data_class: z.string().min(1),
  }),
});

const IndexerExecutionRecordSchema = z.object({
  eventId: z.string().min(1),
  network: z.literal("testnet"),
  contractId: z.string().min(1),
  marketId: z.string().min(1),
  eventType: z.enum(["position_opened", "position_closed", "position_liquidated"]),
  blockHeight: z.number().int().nonnegative(),
  blockHash: z.string().min(1),
  blockTimestamp: z.number().int().positive(),
  receiptId: z.string().min(1),
  transactionHash: z.string().nullable().optional(),
  data: z.record(z.string(), z.unknown()),
});

const OracleSampleCandleSchema = z.object({
  time: z.number().int().positive(),
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  sampleCount: z.number().int().positive(),
});

const CandleIntervalSummarySchema = z.object({
  seriesClassification: z.literal("ORACLE SAMPLE OHLC"),
  timeframe: z.enum(["1m", "5m", "15m", "1H", "4H", "1D"]),
  available: z.boolean(),
  reason: z.string().nullable(),
  totalObservations: z.number().int().nonnegative(),
  bucketCount: z.number().int().nonnegative(),
  multiSampleBuckets: z.number().int().nonnegative(),
  coverageRatio: z.number().nonnegative().optional(),
  candles: z.array(OracleSampleCandleSchema),
});

const VolumeSummarySchema = z.object({
  available: z.boolean(),
  status: z.enum(["unavailable", "verified"]),
  timeframe: z.string().min(1),
  reason: z.string().nullable(),
  baseVolumeKg: z.string().nullable(),
  notionalVolumeUsd: z.string().nullable(),
  executionCount: z.number().int().nonnegative(),
  openedExecutions: z.number().int().nonnegative(),
  closedExecutions: z.number().int().nonnegative(),
  liquidatedExecutions: z.number().int().nonnegative().default(0),
  verifiedOpenedBaseKg: z.string().nullable(),
  verifiedOpenedNotionalUsd: z.string().nullable(),
  excludedNonVolumeEvents: z.number().int().nonnegative(),
  source: z.string().min(1),
});

const IndexerHistoryResponseSchema = z.object({
  network: z.literal("testnet"),
  contractId: z.literal(PERPS_CONTRACT_ID),
  marketId: z.enum(OPERATIONAL_PERPS_MARKET_IDS),
  sourceMode: z.literal("persistent_indexer"),
  provider: z.object({
    name: z.string().min(1),
    finality: z.literal("FINAL"),
    status: z.enum(["healthy", "degraded"]).optional(),
    providerStatus: z.string().min(1),
    lastFinalizedHeight: z.number().int().nullable(),
    indexedThroughHeight: z.number().int().nullable(),
    lagBlocks: z.number().int().nullable(),
    lastIndexedAt: z.string().nullable(),
    lastSuccessfulBlockAt: z.string().nullable().optional(),
    lastErrorCode: z.string().nullable().optional(),
    lastErrorAt: z.string().nullable().optional(),
  }),
  coverage: z.object({
    coverageStartHeight: z.number().int().nullable(),
    indexedThroughHeight: z.number().int().nullable(),
    indexedThroughHash: z.string().nullable(),
    backfillCompleted: z.boolean(),
    backfillBlockRange: z
      .object({
        minHeight: z.number().int().nonnegative(),
        maxHeight: z.number().int().nonnegative(),
      })
      .nullable(),
    seedBackfillRange: z
      .object({
        minHeight: z.number().int().nonnegative(),
        maxHeight: z.number().int().nonnegative(),
        txCount: z.number().int().nonnegative().optional(),
        contiguousBlockScan: z.boolean().optional(),
      })
      .nullable()
      .optional(),
    forwardScanRange: z
      .object({
        startHeight: z.number().int().nonnegative(),
        endHeight: z.number().int().nonnegative(),
        blockCount: z.number().int().nonnegative(),
      })
      .nullable()
      .optional(),
    coverageSegments: z
      .array(
        z.object({
          kind: z.string(),
          source: z.string(),
          startHeight: z.number().int().nonnegative(),
          endHeight: z.number().int().nonnegative(),
          blockCount: z.number().int().nonnegative().optional(),
          txCount: z.number().int().nonnegative().optional(),
          contiguousBlockScan: z.boolean(),
        }),
      )
      .optional(),
    coverageGaps: z
      .array(
        z.object({
          kind: z.string(),
          fromHeight: z.number().int().nonnegative(),
          toHeight: z.number().int().nonnegative(),
          missingBlocks: z.number().int().nonnegative(),
          reason: z.string(),
        }),
      )
      .optional(),
    coverageComplete: z.boolean().optional(),
    totalGapBlocks: z.number().int().nonnegative().optional(),
    totalScannedBlocks: z.number().int().nonnegative().optional(),
    blocksProcessed: z.number().int().nonnegative(),
    gapDetected: z.boolean(),
  }),
  observations: z.array(IndexerObservationRecordSchema),
  executions: z.array(IndexerExecutionRecordSchema),
  referenceNowSec: z.number().int().positive(),
  maxAgeSec: z.number().int().positive(),
  stale: z.boolean(),
  candleAvailability: z.record(z.string(), CandleIntervalSummarySchema).optional(),
  volume: VolumeSummarySchema.nullable().optional(),
  rejectedCount: z.number().int().nonnegative().default(0),
});

/**
 * Validate configured Perps history indexer URL cleanly:
 * permits local loopback HTTP dev URL or HTTPS production API, blocking URL query credentials
 * and unapproved schemes.
 */
export function resolvePerpsHistoryApiUrl(explicitUrl?: string): string {
  const envUrl =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    typeof import.meta.env.VITE_PERPS_HISTORY_API_URL === "string"
      ? import.meta.env.VITE_PERPS_HISTORY_API_URL
      : undefined;

  const raw = (explicitUrl ?? envUrl ?? DEFAULT_PERPS_HISTORY_API_URL).trim();
  const parsed = new URL(raw);
  const host = parsed.hostname.toLowerCase();
  const isLoopback = host === "127.0.0.1" || host === "localhost";

  if (parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new Error("History API URL must not embed credentials, query parameters, or fragments.");
  }
  if (parsed.protocol === "http:" && !isLoopback) {
    throw new Error(`Insecure non-loopback HTTP history API URL rejected: "${raw}"`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Unsupported history API protocol "${parsed.protocol}".`);
  }
  return parsed.origin;
}

function mapExecutionToTradeMarker(
  raw: z.output<typeof IndexerExecutionRecordSchema>,
  targetMarketId: string,
): VerifiedTradeMarker | null {
  if (raw.contractId !== PERPS_CONTRACT_ID || raw.marketId !== targetMarketId) {
    return null;
  }
  const d = raw.data;
  const txHash = raw.transactionHash ?? raw.receiptId;
  const explorerUrl = getExplorerTxUrl(txHash);

  if (raw.eventType === "position_opened") {
    const posId = Number(d.position_id);
    const execPriceE8 = String(d.exec_price_e8 ?? "");
    const side = d.side === "Short" ? "Short" : d.side === "Long" ? "Long" : null;
    if (!Number.isSafeInteger(posId) || !side || !execPriceE8) return null;
    return {
      kind: side === "Long" ? "LONG_OPEN" : "SHORT_OPEN",
      marketId: raw.marketId,
      positionId: posId,
      side,
      owner: String(d.owner ?? "unknown"),
      execPriceE8,
      execPriceUsd: priceE8ToChartValue(execPriceE8),
      sizeE8: typeof d.size_e8 === "string" ? d.size_e8 : null,
      notionalE8: typeof d.notional_e8 === "string" ? d.notional_e8 : null,
      marginE8: typeof d.margin_e8 === "string" ? d.margin_e8 : null,
      feeE8: typeof d.fee_e8 === "string" ? d.fee_e8 : "0",
      realizedPnlE8: null,
      fundingSettledE8: null,
      payoutE8: null,
      emergency: null,
      timestampSec: raw.blockTimestamp,
      anchorTimeSec: null,
      anchorSequence: null,
      signerId: String(d.owner ?? "unknown"),
      executorId: raw.contractId,
      txHash,
      receiptId: raw.receiptId,
      receiptBlockHash: raw.blockHash,
      explorerUrl,
    };
  }

  if (raw.eventType === "position_closed") {
    const posId = Number(d.position_id);
    const execPriceE8 = String(d.exec_price_e8 ?? "");
    if (!Number.isSafeInteger(posId) || !execPriceE8) return null;
    return {
      kind: "CLOSE",
      marketId: raw.marketId,
      positionId: posId,
      side: null,
      owner: String(d.owner ?? "unknown"),
      execPriceE8,
      execPriceUsd: priceE8ToChartValue(execPriceE8),
      sizeE8: null,
      notionalE8: null,
      marginE8: null,
      feeE8: typeof d.fee_e8 === "string" ? d.fee_e8 : "0",
      realizedPnlE8: typeof d.realized_pnl_e8 === "string" ? d.realized_pnl_e8 : null,
      fundingSettledE8: typeof d.funding_settled_e8 === "string" ? d.funding_settled_e8 : null,
      payoutE8: typeof d.payout_e8 === "string" ? d.payout_e8 : null,
      emergency: typeof d.emergency === "boolean" ? d.emergency : false,
      timestampSec: raw.blockTimestamp,
      anchorTimeSec: null,
      anchorSequence: null,
      signerId: String(d.owner ?? "unknown"),
      executorId: raw.contractId,
      txHash,
      receiptId: raw.receiptId,
      receiptBlockHash: raw.blockHash,
      explorerUrl,
    };
  }

  if (raw.eventType === "position_liquidated") {
    const posId = Number(d.position_id);
    const markPriceE8 = String(d.mark_price_e8 ?? "");
    if (!Number.isSafeInteger(posId) || !markPriceE8) return null;
    return {
      kind: "CLOSE",
      marketId: raw.marketId,
      positionId: posId,
      side: null,
      owner: String(d.owner ?? "unknown"),
      execPriceE8: markPriceE8,
      execPriceUsd: priceE8ToChartValue(markPriceE8),
      sizeE8: null,
      notionalE8: null,
      marginE8: null,
      feeE8: typeof d.close_fee_e8 === "string" ? d.close_fee_e8 : "0",
      realizedPnlE8: null,
      fundingSettledE8: null,
      payoutE8: typeof d.trader_refund_e8 === "string" ? d.trader_refund_e8 : null,
      emergency: false,
      timestampSec: raw.blockTimestamp,
      anchorTimeSec: null,
      anchorSequence: null,
      signerId: String(d.keeper ?? d.owner ?? "unknown"),
      executorId: raw.contractId,
      txHash,
      receiptId: raw.receiptId,
      receiptBlockHash: raw.blockHash,
      explorerUrl,
    };
  }

  return null;
}

const INDEXER_HISTORY_PATH_BY_MARKET: Readonly<Record<string, string>> = {
  [MARKET_ARABICA_PERPS_ID]: "/v1/perps/arabica/history?timeframe=ALL",
  [MARKET_ROBUSTA_PERPS_ID]: "/v1/perps/robusta/history?timeframe=ALL",
  [MARKET_GESHA_PERPS_ID]: "/v1/perps/gesha/history?timeframe=ALL",
};

export function resolveIndexerHistoryEndpointPath(marketId: string): string {
  const endpointPath = INDEXER_HISTORY_PATH_BY_MARKET[marketId];
  if (!endpointPath) {
    throw new Error(`Unsupported Perps market ID "${marketId}" for indexer history.`);
  }
  return endpointPath;
}

/**
 * Fetch verified market history, OHLC availability, and volume diagnostics from the read-only
 * persistent NEAR Testnet indexer HTTP API for any operational coffee market.
 */
export async function fetchMarketHistoryFromIndexer(
  opts: {
    marketId?: string;
    baseUrl?: string;
    fetchFn?: FetchLike;
    timeoutMs?: number;
    maxAgeSec?: number;
    referenceNowSec?: number | null;
  } = {},
): Promise<PerpsMarketHistorySnapshot> {
  const targetMarketId = opts.marketId ?? MARKET_ARABICA_PERPS_ID;
  const endpointPath = resolveIndexerHistoryEndpointPath(targetMarketId);
  const apiOrigin = resolvePerpsHistoryApiUrl(opts.baseUrl);
  const fetchFn = opts.fetchFn ?? fetch;
  const timeoutMs = opts.timeoutMs ?? PERPS_HISTORY_API_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchFn(`${apiOrigin}${endpointPath}`, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Persistent indexer HTTP ${response.status}`);
  }

  const rawJson = await response.json();
  const payload = IndexerHistoryResponseSchema.parse(rawJson);
  if (payload.marketId !== targetMarketId) {
    throw new Error(
      `Cross-market indexer mismatch: requested ${targetMarketId}, got ${payload.marketId}.`,
    );
  }

  const rawObservations: VerifiedOracleObservation[] = [];
  for (const item of payload.observations) {
    if (item.contractId !== PERPS_CONTRACT_ID || item.marketId !== targetMarketId) {
      continue;
    }
    const txHash = item.transactionHash ?? item.receiptId;
    rawObservations.push({
      kind: "oracle_sandbox_tick",
      marketId: item.marketId,
      sequence: item.data.sequence,
      priceE8: item.data.price_e8,
      priceUsd: priceE8ToChartValue(item.data.price_e8),
      timestampSec: item.data.observed_at_sec,
      classification: item.data.data_class,
      signerId: item.data.publisher,
      executorId: item.contractId,
      txHash,
      receiptId: item.receiptId,
      receiptBlockHash: item.blockHash,
      explorerUrl: getExplorerTxUrl(txHash),
    });
  }

  const observations = normalizeAndSortObservations(rawObservations);
  const rawMarkers = payload.executions
    .map((item) => mapExecutionToTradeMarker(item, targetMarketId))
    .filter((m): m is VerifiedTradeMarker => m !== null);
  const tradeMarkers = normalizeAndAnchorTradeMarkers(rawMarkers, observations);

  const latestObservation = observations.length > 0 ? observations[observations.length - 1] : null;
  const maxAgeSec = opts.maxAgeSec ?? payload.maxAgeSec;
  const effectiveNowSec =
    typeof opts.referenceNowSec === "number" && Number.isFinite(opts.referenceNowSec)
      ? Math.floor(opts.referenceNowSec)
      : payload.referenceNowSec;
  const latestAgeSec = latestObservation
    ? Math.max(0, effectiveNowSec - latestObservation.timestampSec)
    : null;
  const isStale = latestAgeSec !== null && latestAgeSec > maxAgeSec;

  const coverageGaps = payload.coverage.coverageGaps ?? [];
  const coverageComplete =
    payload.coverage.coverageComplete ??
    (!payload.coverage.gapDetected && coverageGaps.length === 0);

  const isDegraded =
    payload.provider.providerStatus === "degraded" ||
    payload.provider.providerStatus === "halted_historical_gap" ||
    Boolean(payload.provider.lastErrorCode);

  const connectionState: MarketHistoryConnectionState = isDegraded
    ? "indexer_degraded"
    : "indexer_connected";

  const coverage: IndexerCoverageMetadata = {
    coverageStartHeight: payload.coverage.coverageStartHeight,
    indexedThroughHeight: payload.coverage.indexedThroughHeight,
    indexedThroughHash: payload.coverage.indexedThroughHash,
    lastFinalizedHeight: payload.provider.lastFinalizedHeight,
    lagBlocks: payload.provider.lagBlocks,
    status: payload.provider.status ?? (coverageComplete && !isDegraded ? "healthy" : "degraded"),
    providerStatus: payload.provider.providerStatus,
    lastErrorCode: payload.provider.lastErrorCode ?? null,
    lastErrorAt: payload.provider.lastErrorAt ?? null,
    lastSuccessfulBlockAt: payload.provider.lastSuccessfulBlockAt ?? payload.provider.lastIndexedAt,
    gapDetected: payload.coverage.gapDetected || coverageGaps.length > 0,
    backfillCompleted: payload.coverage.backfillCompleted,
    backfillBlockRange: payload.coverage.backfillBlockRange,
    seedBackfillRange: payload.coverage.seedBackfillRange ?? null,
    forwardScanRange: payload.coverage.forwardScanRange ?? null,
    coverageSegments: payload.coverage.coverageSegments ?? [],
    coverageGaps,
    coverageComplete,
    totalGapBlocks:
      payload.coverage.totalGapBlocks ?? coverageGaps.reduce((acc, g) => acc + g.missingBlocks, 0),
    totalScannedBlocks: payload.coverage.totalScannedBlocks ?? payload.coverage.blocksProcessed,
    blocksProcessed: payload.coverage.blocksProcessed,
  };

  const candleAvailability = payload.candleAvailability
    ? (payload.candleAvailability as Partial<
        Record<IntradayMarketChartTimeframe, CandleIntervalSummary>
      >)
    : null;

  const volume: MarketVolumeSummary | null = payload.volume ?? null;

  return {
    network: "testnet",
    contractId: payload.contractId,
    marketId: payload.marketId,
    rpcEndpoint: apiOrigin,
    referenceNowSec: effectiveNowSec,
    maxAgeSec,
    fetchedAtMs: Date.now(),
    sourceMode: "persistent_indexer",
    historyConnectionState: connectionState,
    fallbackReason: null,
    coverage,
    candleAvailability,
    volume,
    observations,
    tradeMarkers,
    latestObservation,
    latestAgeSec,
    isStale,
    rejectedCount: payload.rejectedCount,
  };
}

export async function fetchArabicaHistoryFromIndexer(
  opts: {
    baseUrl?: string;
    fetchFn?: FetchLike;
    timeoutMs?: number;
    maxAgeSec?: number;
    referenceNowSec?: number | null;
  } = {},
): Promise<PerpsMarketHistorySnapshot> {
  return fetchMarketHistoryFromIndexer({
    ...opts,
    marketId: MARKET_ARABICA_PERPS_ID,
  });
}
