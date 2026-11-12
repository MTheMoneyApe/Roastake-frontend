// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { ExternalLink, RefreshCw } from "lucide-react";
import { MaturityBadge, Pill } from "@/components/kit";
import { Button } from "@/components/ui/button";
import {
  MARKET_CHART_TIMEFRAMES,
  type MarketChartTimeframe,
  type MarketHistoryStatus,
  type PerpsMarketHistorySnapshot,
  type TimeframeAvailability,
} from "@/lib/perps/market-history-types";
import { formatAgeDurationCompact, formatObservationUtc } from "@/lib/perps/market-history";
import { formatUsdE8 } from "@/lib/perps/math";
import { cn } from "@/lib/utils";

export interface ArabicaMarketChartToolbarProps {
  status: MarketHistoryStatus;
  snapshot: PerpsMarketHistorySnapshot | null | undefined;
  effectiveAgeSec: number | null;
  effectiveIsStale: boolean;
  maxAgeSec: number;
  timeframe: MarketChartTimeframe;
  onTimeframeChange: (tf: MarketChartTimeframe) => void;
  timeframeAvailability: TimeframeAvailability;
  isFetching: boolean;
  onRefresh: () => void;
}

export function ArabicaMarketChartToolbar({
  status,
  snapshot,
  effectiveAgeSec,
  effectiveIsStale,
  maxAgeSec,
  timeframe,
  onTimeframeChange,
  timeframeAvailability,
  isFetching,
  onRefresh,
}: ArabicaMarketChartToolbarProps) {
  const latest = snapshot?.latestObservation ?? null;
  const observationCount = snapshot?.observations.length ?? 0;
  const markerCount = snapshot?.tradeMarkers.length ?? 0;
  const connState = snapshot?.historyConnectionState ?? "fallback_m0412_rpc";
  const coverage = snapshot?.coverage ?? null;
  const volume = snapshot?.volume ?? null;
  const hasContiguousCoverage = Boolean(
    coverage && coverage.coverageComplete && (coverage.coverageGaps?.length ?? 0) === 0,
  );

  return (
    <div className="space-y-3">
      {/* Provenance, indexer connection, explicit partial vs contiguous coverage, lag & freshness pills */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {snapshot ? (
            connState === "indexer_connected" ? (
              <MaturityBadge variant="real">INDEXER CONNECTED</MaturityBadge>
            ) : connState === "indexer_degraded" ? (
              <MaturityBadge variant="demo">INDEXER DEGRADED</MaturityBadge>
            ) : (
              <MaturityBadge variant="preview">INITIAL EVIDENCE (M04.12)</MaturityBadge>
            )
          ) : null}

          {hasContiguousCoverage ? (
            <MaturityBadge variant="real">CONTIGUOUS COVERAGE</MaturityBadge>
          ) : (
            <MaturityBadge variant="demo">PARTIAL COVERAGE</MaturityBadge>
          )}
          <MaturityBadge variant="testnet">FINALIZED BLOCK</MaturityBadge>
          {coverage ? (
            <Pill tone={(coverage.lagBlocks ?? 0) <= 5 ? "gain" : "warn"}>
              INDEXER LAG: {coverage.lagBlocks ?? "—"} BLK
            </Pill>
          ) : (
            <MaturityBadge variant="preview">INDEXER LAG</MaturityBadge>
          )}
          <MaturityBadge variant="testnet">REFERENCE PRICE</MaturityBadge>
          <MaturityBadge variant="testnet">ON-CHAIN ORACLE OBSERVATIONS</MaturityBadge>
          <MaturityBadge variant="demo">SYNTHETIC TESTNET DATA</MaturityBadge>

          {status === "stale" || effectiveIsStale ? (
            <Pill tone="warn">STALE ({formatAgeDurationCompact(effectiveAgeSec)})</Pill>
          ) : status === "success" ? (
            <Pill tone="gain">VERIFIED ({observationCount} TICKS)</Pill>
          ) : status === "error" ? (
            <Pill tone="loss">RPC / INDEXER UNAVAILABLE</Pill>
          ) : status === "empty" ? (
            <Pill tone="muted">NO TICKS</Pill>
          ) : (
            <Pill tone="info">VERIFYING...</Pill>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isFetching}
          className="h-7 gap-1.5 px-2.5 text-xs"
        >
          <RefreshCw className={cn("size-3", isFetching && "animate-spin")} aria-hidden="true" />
          <span>{isFetching ? "Verifying..." : "Verify Ticks"}</span>
        </Button>
      </div>

      {/* Latest verified observation telemetry + persistent coverage strip */}
      <div className="grid gap-2 rounded-md border bg-muted/35 px-3 py-2.5 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Latest Reference Price
          </span>
          <div className="num mt-0.5 font-medium text-foreground">
            {latest ? `${formatUsdE8(latest.priceE8)}/kg` : "—"}
          </div>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Verified Oracle Sequence
          </span>
          <div className="num mt-0.5 font-medium text-foreground">
            {latest
              ? `Oracle #${latest.sequence} · ${observationCount} ticks · ${markerCount} markers`
              : "—"}
          </div>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Age vs {maxAgeSec}s Policy
          </span>
          <div
            className={cn(
              "num mt-0.5 font-medium",
              effectiveIsStale ? "text-loss" : "text-foreground",
            )}
          >
            {latest
              ? `${formatAgeDurationCompact(effectiveAgeSec)} (${formatObservationUtc(latest.timestampSec)})`
              : "—"}
          </div>
        </div>
        <div className="min-w-0">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {coverage ? "Finalized Block & Indexer Lag" : "Latest Oracle Receipt"}
          </span>
          <div className="mt-0.5 break-words">
            {coverage && coverage.indexedThroughHeight !== null ? (
              <div className="num flex flex-wrap items-baseline gap-x-1.5 font-mono text-foreground">
                <span>
                  #{coverage.indexedThroughHeight}
                  {coverage.lastFinalizedHeight !== null
                    ? ` / #${coverage.lastFinalizedHeight}`
                    : ""}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  lag {coverage.lagBlocks ?? 0} blk ({coverage.blocksProcessed} blk)
                </span>
              </div>
            ) : latest ? (
              <a
                href={latest.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-foreground underline decoration-dotted underline-offset-4 hover:text-primary"
              >
                <span>{latest.txHash.slice(0, 10)}...</span>
                <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Timeframe selector + strict anti-fabrication series / volume disclosures */}
      <div className="flex flex-col gap-2 @lg:flex-row @lg:items-center @lg:justify-between">
        <div
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Oracle chart timeframe filter"
        >
          {MARKET_CHART_TIMEFRAMES.map((tf) => {
            const active = timeframe === tf;
            const candleReady =
              tf !== "ALL" && snapshot?.candleAvailability?.[tf]?.available === true;
            return (
              <button
                key={tf}
                type="button"
                aria-pressed={active}
                onClick={() => onTimeframeChange(tf)}
                className={cn(
                  "min-h-[28px] rounded border px-2.5 py-1 font-mono text-[11px] font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : candleReady
                      ? "border-gain/50 bg-gain/10 text-foreground hover:bg-gain/20"
                      : "border-border bg-background/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {tf}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span>
            Series:{" "}
            <strong className="font-medium text-foreground">
              {timeframeAvailability.canRenderCandles ? "ORACLE SAMPLE OHLC" : "LineSeries"}
            </strong>{" "}
            (
            {timeframeAvailability.canRenderCandles
              ? `${timeframeAvailability.candles.length} non-empty buckets`
              : "Candlestick history requires more verified observations"}
            )
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {volume?.available
              ? `Volume: ${volume.baseVolumeKg ?? "0"} kg (${volume.notionalVolumeUsd ?? "0"} USD)`
              : "Volume unavailable — insufficient verified executions"}
          </span>
        </div>
      </div>
    </div>
  );
}
