// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { RefreshCw } from "lucide-react";
import { MaturityBadge, Pill } from "@/components/kit";
import { Button } from "@/components/ui/button";
import {
  MARKET_CHART_TIMEFRAMES,
  type MarketChartTimeframe,
  type MarketHistoryStatus,
  type PerpsMarketHistorySnapshot,
  type TimeframeAvailability,
} from "@/lib/perps/market-history-types";
import { formatAgeDurationCompact } from "@/lib/perps/market-history";
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
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {snapshot && (
            connState === "indexer_connected" ? (
              <MaturityBadge variant="real">INDEXER CONNECTED</MaturityBadge>
            ) : connState === "indexer_degraded" ? (
              <MaturityBadge variant="demo">INDEXER DEGRADED</MaturityBadge>
            ) : (
              <MaturityBadge variant="preview">VERIFIED RECEIPT FALLBACK</MaturityBadge>
            )
          )}
          {coverage && (
            <MaturityBadge variant={hasContiguousCoverage ? "real" : "demo"}>
              {hasContiguousCoverage ? "FULL COVERAGE" : "PARTIAL COVERAGE"}
            </MaturityBadge>
          )}
          <MaturityBadge variant="testnet">TESTNET · SYNTHETIC</MaturityBadge>
          {status === "stale" || effectiveIsStale ? (
            <Pill tone="warn">STALE · {formatAgeDurationCompact(effectiveAgeSec)}</Pill>
          ) : status === "success" ? (
            <Pill tone="gain">VERIFIED · {observationCount} TICKS</Pill>
          ) : status === "error" ? (
            <Pill tone="loss">RPC / INDEXER UNAVAILABLE</Pill>
          ) : status === "empty" ? (
            <Pill tone="muted">NO VERIFIED HISTORY</Pill>
          ) : (
            <Pill tone="info">VERIFYING</Pill>
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
          <span>{isFetching ? "Checking…" : "Refresh"}</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/35 px-3 py-2 text-xs sm:grid-cols-4">
        <div>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Latest verified price</span>
          <div className="num font-medium text-foreground">{latest ? `${formatUsdE8(latest.priceE8)}/kg` : "—"}</div>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Sequence · samples</span>
          <div className="num font-medium text-foreground">{latest ? `#${latest.sequence} · ${observationCount} ticks · ${markerCount} trades` : "—"}</div>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Age · policy</span>
          <div className={cn("num font-medium", effectiveIsStale ? "text-loss" : "text-foreground")}>
            {latest ? `${formatAgeDurationCompact(effectiveAgeSec)} · ${maxAgeSec}s max` : "—"}
          </div>
        </div>
        <div className="min-w-0">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Finalized block</span>
          <div className="num truncate font-medium text-foreground">
            {coverage?.indexedThroughHeight !== null && coverage?.indexedThroughHeight !== undefined
              ? `#${coverage.indexedThroughHeight} · lag ${coverage.lagBlocks ?? "—"} blk`
              : latest ? `Receipt ${latest.txHash.slice(0, 9)}…` : "—"}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Oracle chart timeframe filter">
          {MARKET_CHART_TIMEFRAMES.map((tf) => {
            const active = timeframe === tf;
            const candleReady = tf !== "ALL" && snapshot?.candleAvailability?.[tf]?.available === true;
            return (
              <button
                key={tf}
                type="button"
                aria-pressed={active}
                onClick={() => onTimeframeChange(tf)}
                className={cn(
                  "min-h-[28px] rounded border px-2.5 py-1 font-mono text-[11px] font-medium transition-colors",
                  active ? "border-primary bg-primary text-primary-foreground" : candleReady
                    ? "border-gain/50 bg-gain/10 text-foreground hover:bg-gain/20"
                    : "border-border bg-background/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {tf}
              </button>
            );
          })}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {timeframeAvailability.canRenderCandles
            ? `ORACLE SAMPLE OHLC · ${timeframeAvailability.candles.length} intervals`
            : "LINE · verified ticks only"}{" "}
          · {volume?.available ? `Volume ${volume.baseVolumeKg ?? "0"} kg` : "Volume n/a"}
        </div>
      </div>

      {coverage && (
        <details className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
          <summary className="cursor-pointer font-medium text-muted-foreground">Indexer coverage details</summary>
          <div className="mt-2 grid gap-1 sm:grid-cols-2">
            <span>Last finalized: {coverage.lastFinalizedHeight ?? "—"}</span>
            <span>Indexed through: {coverage.indexedThroughHeight ?? "—"}</span>
            <span>Lag: {coverage.lagBlocks ?? "—"} blocks</span>
            <span>Blocks processed: {coverage.blocksProcessed}</span>
          </div>
        </details>
      )}
      {!coverage && latest && (
        <p className="text-[11px] text-muted-foreground">
          Historical points use finalized, receipt-verified Testnet transactions. OHLC and volume remain disabled until enough verified samples exist.
        </p>
      )}
    </div>
  );
}
