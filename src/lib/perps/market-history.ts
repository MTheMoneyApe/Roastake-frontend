// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import type {
  CandlestickData,
  LineData,
  SeriesMarker,
  Time,
  UTCTimestamp,
} from "lightweight-charts";
import {
  MARKET_ARABICA_PERPS_ID,
  MARKET_GESHA_PERPS_ID,
  MARKET_ROBUSTA_PERPS_ID,
  PERPS_CONTRACT_ID,
  PERPS_OPERATOR_ACCOUNT_ID,
} from "./config";
import { fetchArabicaHistoryFromIndexer, fetchMarketHistoryFromIndexer } from "./market-history-api";
import { fetchVerifiedHistoryFromRpc } from "./market-history-rpc";
import type {
  CandleIntervalSummary,
  MarketChartTimeframe,
  MarketHistoryStatus,
  OracleSampleCandle,
  PerpsMarketHistoryProvider,
  PerpsMarketHistoryQueryParams,
  PerpsMarketHistorySnapshot,
  TimeframeAvailability,
  VerifiedHistoryTxPointer,
  VerifiedOracleObservation,
  VerifiedTradeMarker,
} from "./market-history-types";

/**
 * Verified M04.6-G / NEAR Testnet transaction locators for COFFEE-ARABICA-TESTNET/USD.
 * Only immutable transaction hashes + signers live here; zero static prices or timestamps exist.
 */
export const ARABICA_VERIFIED_HISTORY_SEEDS: readonly VerifiedHistoryTxPointer[] = [
  {
    txHash: "CGZGrXzCWVPegc8uS3i5LpBqgfMJuUbgeUFRxvnrS4Re",
    senderAccountId: PERPS_OPERATOR_ACCOUNT_ID,
    role: "oracle_tick",
    label: "Oracle #1",
  },
  {
    txHash: "GPjS1YZS9vgKGJJhwbe4hnou3MuearryCEXiVgCGtmU",
    senderAccountId: PERPS_OPERATOR_ACCOUNT_ID,
    role: "oracle_tick",
    label: "Oracle #2",
  },
  {
    txHash: "8KGqwWiHmFs2TQpDWWPEe8jRHWuBrfpjbe2EDBt47men",
    senderAccountId: PERPS_OPERATOR_ACCOUNT_ID,
    role: "oracle_tick",
    label: "Oracle #3",
  },
  {
    txHash: "BNzMzWmVUBpz8nvMNnHvJjajYsnMuDqbVTr7iyQqVqUZ",
    senderAccountId: PERPS_OPERATOR_ACCOUNT_ID,
    role: "oracle_tick",
    label: "Oracle #4",
  },
  {
    txHash: "CNgQkfrRpMrU8ywgzFaBdniPfivRDsgEnXcfoFX6gWAp",
    senderAccountId: "majorblog5570.testnet",
    role: "position_open",
    label: "LONG OPEN #2",
  },
  {
    txHash: "Jz7uJnm213s2qLNyBsnkwDPpkNYcuH255wFxPrFeemR",
    senderAccountId: PERPS_OPERATOR_ACCOUNT_ID,
    role: "oracle_tick",
    label: "Oracle #5",
  },
  {
    txHash: "2QWybbu1rwxC9in5y8cxAzXzH7PR1bbH6x5WKDJHREnC",
    senderAccountId: "majorblog5570.testnet",
    role: "position_close",
    label: "CLOSE #2",
  },
] as const;

/**
 * Verified NEAR Testnet transaction locators for COFFEE-ROBUSTA-TESTNET/USD.
 * Only immutable finalized transaction hashes + signers live here; zero static prices or timestamps exist.
 */
export const ROBUSTA_VERIFIED_HISTORY_SEEDS: readonly VerifiedHistoryTxPointer[] = [
  {
    txHash: "99425WCWbxpGdbhZCUUfnCvPeyJurrmaYJacCneYPVj4",
    senderAccountId: PERPS_OPERATOR_ACCOUNT_ID,
    role: "oracle_tick",
    label: "Robusta Oracle #1",
  },
] as const;

/**
 * Verified NEAR Testnet transaction locators for COFFEE-GESHA-TESTNET/USD.
 * Only immutable finalized transaction hashes + signers live here; zero static prices or timestamps exist.
 */
export const GESHA_VERIFIED_HISTORY_SEEDS: readonly VerifiedHistoryTxPointer[] = [
  {
    txHash: "8qz9deZxMYge5tXx19zSr9kkpNq7wSMd7Gh246yVHinb",
    senderAccountId: PERPS_OPERATOR_ACCOUNT_ID,
    role: "oracle_tick",
    label: "Gesha Oracle #1",
  },
  {
    txHash: "8jnhk3YuR24hZYAZk9hDj5qVjo1Va943VdBoGzrzp1FD",
    senderAccountId: PERPS_OPERATOR_ACCOUNT_ID,
    role: "oracle_tick",
    label: "Gesha Oracle #2",
  },
  {
    txHash: "7KizejXJqqVVPExRBgmrPMM5RkQ6Sr4NkRuA6QyGtQEW",
    senderAccountId: PERPS_OPERATOR_ACCOUNT_ID,
    role: "oracle_tick",
    label: "Gesha Oracle #3",
  },
  {
    txHash: "A2cKFvi6YiL15EUjJXGejFbcuviEPmp8JRLCK5LmPwgh",
    senderAccountId: "majorblog5570.testnet",
    role: "position_open",
    label: "LONG OPEN #4",
  },
  {
    txHash: "9CFB5JAUB94i2gr6oBgQhNfeP513bLvoKuZfsyuhY6ik",
    senderAccountId: PERPS_OPERATOR_ACCOUNT_ID,
    role: "oracle_tick",
    label: "Gesha Oracle #4",
  },
  {
    txHash: "JxF78YRwXUYwZwR6ZFo8QXXHxCv9sLD63yBTh3qNgKv",
    senderAccountId: "majorblog5570.testnet",
    role: "position_close",
    label: "CLOSE #4",
  },
] as const;

const HISTORY_SEEDS_BY_MARKET: Readonly<Record<string, readonly VerifiedHistoryTxPointer[]>> = {
  [MARKET_ARABICA_PERPS_ID]: ARABICA_VERIFIED_HISTORY_SEEDS,
  [MARKET_ROBUSTA_PERPS_ID]: ROBUSTA_VERIFIED_HISTORY_SEEDS,
  [MARKET_GESHA_PERPS_ID]: GESHA_VERIFIED_HISTORY_SEEDS,
};

export function getVerifiedHistorySeedsForMarket(
  marketId: string,
): readonly VerifiedHistoryTxPointer[] {
  return HISTORY_SEEDS_BY_MARKET[marketId] ?? [];
}

export const TIMEFRAME_BUCKET_SECONDS: Readonly<
  Record<Exclude<MarketChartTimeframe, "ALL">, number>
> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1H": 3600,
  "4H": 14_400,
  "1D": 86_400,
};

export async function fetchMarketVerifiedHistory(
  params: PerpsMarketHistoryQueryParams = {},
): Promise<PerpsMarketHistorySnapshot> {
  const targetMarketId = params.marketId ?? MARKET_ARABICA_PERPS_ID;
  const txPointers = params.txPointers ?? getVerifiedHistorySeedsForMarket(targetMarketId);
  const rpcSnap = await fetchVerifiedHistoryFromRpc({
    txPointers,
    contractId: params.contractId ?? PERPS_CONTRACT_ID,
    marketId: targetMarketId,
    maxAgeSec: params.maxAgeSec ?? 300,
    referenceNowSec: params.referenceNowSec,
  });
  return {
    ...rpcSnap,
    historyConnectionState: "fallback_m0412_rpc",
    fallbackReason: null,
    coverage: null,
    candleAvailability: null,
    volume: null,
  };
}

export async function fetchArabicaVerifiedHistory(
  params: PerpsMarketHistoryQueryParams = {},
): Promise<PerpsMarketHistorySnapshot> {
  return fetchMarketVerifiedHistory({
    ...params,
    marketId: params.marketId ?? MARKET_ARABICA_PERPS_ID,
  });
}

/**
 * Primary multi-market history resolver: prefers local persistent NEAR Testnet indexer HTTP API (`127.0.0.1:8787`),
 * seamlessly falling back to client-side verified RPC receipt proof when the indexer is offline.
 * Never fabricates synthetic observations if both indexer and RPC fail.
 */
export async function fetchMarketHistoryWithFallback(
  params: PerpsMarketHistoryQueryParams = {},
): Promise<PerpsMarketHistorySnapshot> {
  const targetMarketId = params.marketId ?? MARKET_ARABICA_PERPS_ID;
  try {
    if (targetMarketId === MARKET_ARABICA_PERPS_ID) {
      return await fetchArabicaHistoryFromIndexer({
        baseUrl: params.apiBaseUrl,
        maxAgeSec: params.maxAgeSec,
        referenceNowSec: params.referenceNowSec,
      });
    }
    return await fetchMarketHistoryFromIndexer({
      marketId: targetMarketId,
      baseUrl: params.apiBaseUrl,
      maxAgeSec: params.maxAgeSec,
      referenceNowSec: params.referenceNowSec,
    });
  } catch (indexerErr) {
    const fallbackSnap = await fetchMarketVerifiedHistory({
      ...params,
      marketId: targetMarketId,
    });
    const reason =
      indexerErr instanceof Error && indexerErr.message
        ? indexerErr.message
        : "Local persistent indexer unreachable";
    return {
      ...fallbackSnap,
      historyConnectionState: "fallback_m0412_rpc",
      fallbackReason: `${reason} — displaying verified M04.12 initial historical receipts (${targetMarketId}).`,
    };
  }
}

export async function fetchArabicaHistoryWithFallback(
  params: PerpsMarketHistoryQueryParams = {},
): Promise<PerpsMarketHistorySnapshot> {
  return fetchMarketHistoryWithFallback({
    ...params,
    marketId: params.marketId ?? MARKET_ARABICA_PERPS_ID,
  });
}

export const persistentIndexerMarketHistoryProvider: PerpsMarketHistoryProvider = {
  kind: "persistent_indexer",
  fetchMarketHistory: fetchMarketHistoryWithFallback,
};

export const rpcVerifiedMarketHistoryProvider: PerpsMarketHistoryProvider = {
  kind: "rpc_verified_receipts",
  fetchMarketHistory: fetchMarketVerifiedHistory,
};

/**
 * Evaluate whether a requested chart timeframe has enough real verified ticks for bucketed intervals.
 * Strictly forbids fabricating empty buckets, synthetic candles, or interpolated prices.
 */
export function evaluateTimeframeAvailability(
  observations: readonly VerifiedOracleObservation[],
  timeframe: MarketChartTimeframe,
  backendSummary?: CandleIntervalSummary | null,
): TimeframeAvailability {
  const count = observations.length;
  if (count === 0) {
    return {
      timeframe,
      canRenderLine: false,
      canRenderCandles: false,
      observationCount: 0,
      candles: [],
      reason: "No verified historical observations available yet.",
    };
  }

  if (timeframe === "ALL") {
    return {
      timeframe,
      canRenderLine: true,
      canRenderCandles: false,
      observationCount: count,
      candles: [],
      reason:
        count < 24
          ? "Candlestick history requires more verified observations across continuous intervals."
          : null,
    };
  }

  if (backendSummary) {
    return {
      timeframe,
      canRenderLine: false,
      canRenderCandles: backendSummary.available && backendSummary.candles.length > 0,
      observationCount: count,
      candles: backendSummary.available ? backendSummary.candles : [],
      reason: backendSummary.reason,
    };
  }

  const bucketSec = TIMEFRAME_BUCKET_SECONDS[timeframe];
  const buckets = new Map<number, number>();
  for (const obs of observations) {
    const bucket = Math.floor(obs.timestampSec / bucketSec) * bucketSec;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }

  const minMultiTickBuckets = Array.from(buckets.values()).filter((n) => n >= 2).length;
  const canFormRealCandles = buckets.size >= 6 && minMultiTickBuckets >= 3;

  return {
    timeframe,
    canRenderLine: false,
    canRenderCandles: false,
    observationCount: count,
    candles: [],
    reason: canFormRealCandles
      ? null
      : `Insufficient verified observations for ${timeframe} intervals (${count} sparse ticks across ${buckets.size} bucket${buckets.size === 1 ? "" : "s"}). Switch to ALL to view raw verified ticks — zero synthetic candles or gap fills generated.`,
  };
}

export function buildChartCandleData(
  candles: readonly OracleSampleCandle[],
): CandlestickData<Time>[] {
  return candles.map((c) => ({
    time: c.time as UTCTimestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));
}

export function buildChartDataFingerprint(params: {
  timeframe: MarketChartTimeframe;
  observations: readonly VerifiedOracleObservation[];
  tradeMarkers: readonly VerifiedTradeMarker[];
  canRenderCandles: boolean;
  candles: readonly OracleSampleCandle[];
}): string {
  const obsSig = params.observations
    .map((o) => `${o.sequence}@${o.timestampSec}:${o.priceE8}`)
    .join("|");
  const markerSig = params.tradeMarkers
    .map((m) => `${m.kind}#${m.positionId}@${m.anchorTimeSec ?? "x"}`)
    .join("|");
  const candleSig = params.canRenderCandles
    ? params.candles.map((c) => `${c.time}:${c.open}-${c.close}`).join("|")
    : "";
  return `${params.timeframe}::${params.canRenderCandles ? "candles" : "line"}::${obsSig}::${markerSig}::${candleSig}`;
}

export function buildChartLineData(
  observations: readonly VerifiedOracleObservation[],
): LineData<Time>[] {
  return observations.map((obs) => ({
    time: obs.timestampSec as UTCTimestamp,
    value: obs.priceUsd,
  }));
}

export function buildChartSeriesMarkers(
  tradeMarkers: readonly VerifiedTradeMarker[],
): SeriesMarker<Time>[] {
  const mapped: Array<SeriesMarker<Time> & { _sortSec: number }> = [];

  for (const marker of tradeMarkers) {
    const anchorSec = marker.anchorTimeSec;
    if (anchorSec === null || anchorSec <= 0) continue;

    if (marker.kind === "LONG_OPEN") {
      mapped.push({
        time: anchorSec as UTCTimestamp,
        position: "belowBar",
        shape: "arrowUp",
        color: "#34d399",
        text: `LONG OPEN #${marker.positionId}`,
        size: 1.2,
        id: `open-${marker.positionId}-${marker.txHash.slice(0, 6)}`,
        _sortSec: anchorSec,
      });
    } else if (marker.kind === "SHORT_OPEN") {
      mapped.push({
        time: anchorSec as UTCTimestamp,
        position: "aboveBar",
        shape: "arrowDown",
        color: "#f87171",
        text: `SHORT OPEN #${marker.positionId}`,
        size: 1.2,
        id: `open-${marker.positionId}-${marker.txHash.slice(0, 6)}`,
        _sortSec: anchorSec,
      });
    } else {
      mapped.push({
        time: anchorSec as UTCTimestamp,
        position: "aboveBar",
        shape: "circle",
        color: "#f59e0b",
        text: `CLOSE #${marker.positionId}`,
        size: 1.1,
        id: `close-${marker.positionId}-${marker.txHash.slice(0, 6)}`,
        _sortSec: anchorSec,
      });
    }
  }

  mapped.sort((a, b) => a._sortSec - b._sortSec);
  return mapped.map(({ _sortSec: _ignored, ...rest }) => rest);
}

export function formatObservationUtc(timestampSec: number): string {
  const iso = new Date(timestampSec * 1000).toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
}

export function formatAgeDurationCompact(ageSec: number | null): string {
  if (ageSec === null || !Number.isFinite(ageSec) || ageSec < 0) return "—";
  if (ageSec < 60) return `${ageSec}s`;
  const mins = Math.floor(ageSec / 60);
  if (mins < 60) return `${mins}m ${ageSec % 60}s`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}

export function deriveMarketHistoryStatus(params: {
  isLoading: boolean;
  isError: boolean;
  snapshot: PerpsMarketHistorySnapshot | null | undefined;
}): MarketHistoryStatus {
  if (params.isLoading) return "loading";
  if (params.isError) return "error";
  if (!params.snapshot || params.snapshot.observations.length === 0) return "empty";
  if (params.snapshot.isStale) return "stale";
  return "success";
}
