// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { useEffect, useMemo, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, ISeriesMarkersPluginApi, Time } from "lightweight-charts";
import { AlertTriangle, ExternalLink, Info, LineChart, Loader2, RefreshCw } from "lucide-react";
import { Panel, Pill } from "@/components/kit";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MARKET_ARABICA_PERPS_ID, PERPS_CONTRACT_ID } from "@/lib/perps/config";
import {
  buildChartCandleData,
  buildChartDataFingerprint,
  buildChartLineData,
  buildChartSeriesMarkers,
  deriveMarketHistoryStatus,
  evaluateTimeframeAvailability,
  formatAgeDurationCompact,
  formatObservationUtc,
} from "@/lib/perps/market-history";
import type {
  MarketChartTimeframe,
  VerifiedOracleObservation,
  VerifiedTradeMarker,
} from "@/lib/perps/market-history-types";
import { formatSignedFixedPoint, formatSizeKgE8, formatUsdE8 } from "@/lib/perps/math";
import { usePerpsMarketHistory } from "@/lib/perps/queries";
import type { MarketView } from "@/lib/perps/types";
import { ArabicaMarketChartToolbar } from "./market-chart-toolbar";

export interface PerpsMarketChartProps {
  market: MarketView | null | undefined;
  marketId?: string;
  blockTimestampSec?: number | null;
}

export type ArabicaMarketChartProps = PerpsMarketChartProps;

function resolveChartTheme(container: HTMLElement) {
  const styles = getComputedStyle(container);
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D context unavailable");

  const resolveColor = (token: string) => {
    // Lightweight Charts parses RGB, not CSS variables or OKLCH. Let the browser
    // render the inherited token into an sRGB pixel before passing it to the chart.
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = styles.getPropertyValue(token).trim();
    context.fillRect(0, 0, 1, 1);
    const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
    return `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;
  };

  return {
    background: resolveColor("--card"),
    foreground: resolveColor("--foreground"),
    border: resolveColor("--border"),
    gain: resolveColor("--gain"),
    loss: resolveColor("--loss"),
    line: resolveColor("--gain"),
    close: resolveColor("--warning-foreground"),
  };
}

function TradeMarkerCard({ marker }: { marker: VerifiedTradeMarker }) {
  const isOpen = marker.kind === "LONG_OPEN" || marker.kind === "SHORT_OPEN";
  const badgeTone =
    marker.kind === "LONG_OPEN" ? "gain" : marker.kind === "SHORT_OPEN" ? "loss" : "warn";
  const heading =
    marker.kind === "LONG_OPEN"
      ? `LONG OPEN #${marker.positionId}`
      : marker.kind === "SHORT_OPEN"
        ? `SHORT OPEN #${marker.positionId}`
        : `CLOSE #${marker.positionId}`;

  return (
    <div className="rounded-md border bg-muted/30 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Pill tone={badgeTone}>{heading}</Pill>
          <span className="num font-medium text-foreground">
            @ {formatUsdE8(marker.execPriceE8)}/kg
          </span>
        </div>
        <a
          href={marker.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono text-[11px] text-primary underline decoration-dotted underline-offset-4"
        >
          <span>{marker.txHash.slice(0, 10)}...</span>
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </div>

      <div className="mt-2 grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
        <div>
          Time:{" "}
          <span className="num text-foreground">{formatObservationUtc(marker.timestampSec)}</span>
        </div>
        <div>
          Anchored Tick:{" "}
          <span className="num text-foreground">
            {marker.anchorSequence !== null ? `Oracle #${marker.anchorSequence}` : "Unanchored"}
          </span>
        </div>
        {isOpen ? (
          <>
            <div>
              Size / Margin:{" "}
              <span className="num text-foreground">
                {marker.sizeE8 ? formatSizeKgE8(marker.sizeE8) : "—"} ·{" "}
                {marker.marginE8 ? formatUsdE8(marker.marginE8, { decimalsShown: 2 }) : "—"}
              </span>
            </div>
            <div>
              Notional / Fee:{" "}
              <span className="num text-foreground">
                {marker.notionalE8 ? formatUsdE8(marker.notionalE8, { decimalsShown: 2 }) : "—"} ·{" "}
                {formatUsdE8(marker.feeE8, { decimalsShown: 4 })}
              </span>
            </div>
          </>
        ) : (
          <>
            <div>
              Realized PnL / Funding:{" "}
              <span className="num text-foreground">
                {marker.realizedPnlE8
                  ? formatUsdE8(marker.realizedPnlE8, { decimalsShown: 4 })
                  : "—"}{" "}
                ·{" "}
                {marker.fundingSettledE8
                  ? `${formatSignedFixedPoint(marker.fundingSettledE8, 8, { maxFractionDigits: 8 })} e8`
                  : "—"}
              </span>
            </div>
            <div>
              Payout / Fee:{" "}
              <span className="num text-foreground">
                {marker.payoutE8 ? formatUsdE8(marker.payoutE8, { decimalsShown: 6 }) : "—"} ·{" "}
                {formatUsdE8(marker.feeE8, { decimalsShown: 4 })}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function PerpsMarketChart({ market, marketId, blockTimestampSec }: PerpsMarketChartProps) {
  const targetMarketId = marketId ?? market?.market_id ?? MARKET_ARABICA_PERPS_ID;
  const maxAgeSec = market?.oracle_policy.max_execution_age_sec ?? 300;
  const [timeframe, setTimeframe] = useState<MarketChartTimeframe>("ALL");
  const [showAllTicks, setShowAllTicks] = useState(false);
  const [hoveredTimeSec, setHoveredTimeSec] = useState<number | null>(null);
  const [canvasUnavailable, setCanvasUnavailable] = useState(false);

  const chartHostRef = useRef<HTMLDivElement | null>(null);

  const {
    data: snapshot,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = usePerpsMarketHistory({
    marketId: targetMarketId,
    maxAgeSec,
    referenceNowSec: blockTimestampSec ?? null,
  });

  const effectiveNowSec = blockTimestampSec ?? snapshot?.referenceNowSec ?? null;
  const latestObservation = snapshot?.latestObservation ?? null;
  const effectiveAgeSec =
    latestObservation && effectiveNowSec !== null
      ? Math.max(0, effectiveNowSec - latestObservation.timestampSec)
      : (snapshot?.latestAgeSec ?? null);
  const effectiveIsStale = effectiveAgeSec !== null && effectiveAgeSec > maxAgeSec;

  const effectiveSnapshot = useMemo(
    () =>
      snapshot
        ? {
            ...snapshot,
            latestAgeSec: effectiveAgeSec,
            isStale: effectiveIsStale,
          }
        : snapshot,
    [effectiveAgeSec, effectiveIsStale, snapshot],
  );

  const status = deriveMarketHistoryStatus({
    isLoading,
    isError,
    snapshot: effectiveSnapshot,
  });

  const observations = useMemo(() => snapshot?.observations ?? [], [snapshot]);
  const tradeMarkers = useMemo(() => snapshot?.tradeMarkers ?? [], [snapshot]);

  const timeframeAvailability = useMemo(
    () =>
      evaluateTimeframeAvailability(
        observations,
        timeframe,
        timeframe === "ALL" ? null : (snapshot?.candleAvailability?.[timeframe] ?? null),
      ),
    [observations, snapshot, timeframe],
  );

  const lineData = useMemo(() => buildChartLineData(observations), [observations]);
  const candleData = useMemo(
    () => buildChartCandleData(timeframeAvailability.candles),
    [timeframeAvailability.candles],
  );
  const chartMarkers = useMemo(() => buildChartSeriesMarkers(tradeMarkers), [tradeMarkers]);

  const dataFingerprint = useMemo(
    () =>
      buildChartDataFingerprint({
        timeframe,
        observations,
        tradeMarkers,
        canRenderCandles: timeframeAvailability.canRenderCandles,
        candles: timeframeAvailability.candles,
      }),
    [
      observations,
      timeframe,
      timeframeAvailability.canRenderCandles,
      timeframeAvailability.candles,
      tradeMarkers,
    ],
  );

  const activeObservation: VerifiedOracleObservation | null = useMemo(() => {
    if (observations.length === 0) return null;
    if (hoveredTimeSec !== null) {
      const exact = observations.find((obs) => obs.timestampSec === hoveredTimeSec);
      if (exact) return exact;
    }
    return observations[observations.length - 1];
  }, [hoveredTimeSec, observations]);

  const shouldMountChart =
    (status === "success" || status === "stale") &&
    (timeframeAvailability.canRenderLine || timeframeAvailability.canRenderCandles) &&
    observations.length > 0;

  useEffect(() => {
    const container = chartHostRef.current;
    if (!shouldMountChart || !container) {
      return undefined;
    }

    const chartContainer = container;
    let cancelled = false;
    let chart: IChartApi | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let themeObserver: MutationObserver | null = null;
    let markersApi: ISeriesMarkersPluginApi<Time> | null = null;

    async function mountChart() {
      try {
        const lwc = await import("lightweight-charts");
        if (cancelled || !chartHostRef.current) return;
        const theme = resolveChartTheme(chartHostRef.current);

        const instance = lwc.createChart(chartHostRef.current, {
          autoSize: true,
          layout: {
            attributionLogo: true,
            background: { type: lwc.ColorType.Solid, color: theme.background },
            textColor: theme.foreground,
            fontFamily: "IBM Plex Mono, ui-monospace, monospace",
            fontSize: 11,
          },
          grid: {
            vertLines: { color: theme.border },
            horzLines: { color: theme.border },
          },
          rightPriceScale: {
            borderColor: theme.border,
            scaleMargins: { top: 0.22, bottom: 0.22 },
          },
          timeScale: {
            timeVisible: true,
            secondsVisible: true,
            borderColor: theme.border,
            rightOffset: 1,
            barSpacing: 48,
            fixLeftEdge: true,
            fixRightEdge: true,
          },
          crosshair: {
            mode: lwc.CrosshairMode.Normal,
          },
          localization: {
            priceFormatter: (price: number) => `$${price.toFixed(4)}`,
          },
        });

        chart = instance;
        let mainSeries: ISeriesApi<"Line" | "Candlestick", Time>;
        if (timeframeAvailability.canRenderCandles && candleData.length > 0) {
          const candlesSeries = instance.addSeries(lwc.CandlestickSeries, {
            upColor: theme.gain,
            downColor: theme.loss,
            borderVisible: false,
            wickUpColor: theme.gain,
            wickDownColor: theme.loss,
            title: "ORACLE SAMPLE OHLC",
          });
          candlesSeries.setData(candleData);
          mainSeries = candlesSeries;
        } else {
          const lineSeries = instance.addSeries(lwc.LineSeries, {
            color: theme.line,
            lineWidth: 2,
            pointMarkersVisible: true,
            pointMarkersRadius: 4,
            priceLineVisible: true,
            lastValueVisible: true,
            title: "Oracle Ref",
          });
          lineSeries.setData(lineData);
          mainSeries = lineSeries;
        }

        const themedMarkers = (colors: ReturnType<typeof resolveChartTheme>) =>
          chartMarkers.map((marker) => ({
            ...marker,
            color:
              marker.shape === "arrowUp"
                ? colors.gain
                : marker.shape === "arrowDown"
                  ? colors.loss
                  : colors.close,
          }));
        if (chartMarkers.length > 0) {
          markersApi = lwc.createSeriesMarkers(mainSeries, themedMarkers(theme), {
            autoScale: true,
          });
        }
        // Theme changes only repaint the existing chart; keep data, crosshair and viewport intact.
        themeObserver = new MutationObserver(() => {
          if (cancelled) return;
          const colors = resolveChartTheme(chartContainer);
          instance.applyOptions({
            layout: {
              background: { type: lwc.ColorType.Solid, color: colors.background },
              textColor: colors.foreground,
            },
            grid: {
              vertLines: { color: colors.border },
              horzLines: { color: colors.border },
            },
            rightPriceScale: { borderColor: colors.border },
            timeScale: { borderColor: colors.border },
          });
          mainSeries.applyOptions(
            timeframeAvailability.canRenderCandles && candleData.length > 0
              ? {
                  upColor: colors.gain,
                  downColor: colors.loss,
                  wickUpColor: colors.gain,
                  wickDownColor: colors.loss,
                }
              : { color: colors.line },
          );
          markersApi?.setMarkers(themedMarkers(colors));
        });
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class", "style"],
        });
        instance.timeScale().fitContent();

        instance.subscribeCrosshairMove((param) => {
          if (cancelled) return;
          if (typeof param.time === "number") {
            setHoveredTimeSec(param.time);
          } else {
            setHoveredTimeSec(null);
          }
        });

        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver((entries) => {
            const rect = entries[0]?.contentRect;
            if (!rect || rect.width <= 0 || rect.height <= 0 || !chart) return;
            chart.timeScale().fitContent();
          });
          resizeObserver.observe(chartHostRef.current);
        }
        setCanvasUnavailable(false);
      } catch {
        if (!cancelled) {
          setCanvasUnavailable(true);
        }
      }
    }

    void mountChart();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
      try {
        markersApi?.setMarkers([]);
        markersApi?.detach();
      } catch {
        // Ignore cleanup noise if already removed.
      }
      try {
        chart?.remove();
      } catch {
        // Ignore cleanup noise if already removed.
      }
      chart = null;
      markersApi = null;
    };
    // Key strictly on `dataFingerprint` so unchanged 5-second poll snapshots never recreate or jitter the chart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataFingerprint, shouldMountChart]);

  return (
    <Panel
      className="@container"
      title={
        <span className="flex flex-wrap items-center gap-2">
          <LineChart className="size-4 text-primary" aria-hidden="true" />
          <span>Verified On-Chain Oracle Chart · {targetMarketId}</span>
        </span>
      }
      actions={
        <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
          {PERPS_CONTRACT_ID}
        </span>
      }
    >
      <div className="space-y-4">
        <ArabicaMarketChartToolbar
          status={status}
          snapshot={effectiveSnapshot}
          effectiveAgeSec={effectiveAgeSec}
          effectiveIsStale={effectiveIsStale}
          maxAgeSec={maxAgeSec}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          timeframeAvailability={timeframeAvailability}
          isFetching={isFetching}
          onRefresh={() => void refetch()}
        />

        {/* Indexer provider degradation OR explicit partial historical coverage transparency */}
        {snapshot?.historyConnectionState === "indexer_degraded" && (
          <Alert className="border-[var(--warn)]/60 bg-[var(--warn-soft)]/20">
            <AlertTriangle className="h-4 w-4 text-[var(--warn)]" aria-hidden="true" />
            <AlertTitle className="text-xs font-semibold">
              Persistent indexer degraded ({snapshot.coverage?.providerStatus ?? "degraded"}
              {snapshot.coverage?.lastErrorCode ? ` · ${snapshot.coverage.lastErrorCode}` : ""})
            </AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground">
              {snapshot.coverage?.providerStatus === "halted_historical_gap"
                ? "Sequential forward scan halted at an unverified finalized block without skipping heights. Previously stored verified ticks remain intact below."
                : "Upstream NEAR Data polling encountered temporary rate-limit/provider errors and is backing off with Retry-After + jitter without losing persisted records."}
            </AlertDescription>
          </Alert>
        )}

        {snapshot?.sourceMode === "persistent_indexer" &&
          snapshot.coverage &&
          (!snapshot.coverage.coverageComplete ||
            (snapshot.coverage.coverageGaps?.length ?? 0) > 0) && (
            <Alert className="border-[var(--warn)]/50 bg-[var(--warn-soft)]/15">
              <Info className="h-4 w-4 text-[var(--warn)]" aria-hidden="true" />
              <AlertTitle className="text-xs font-semibold">
                Historical coverage is partial. Some finalized blocks have not been indexed.
              </AlertTitle>
              <AlertDescription className="space-y-1 text-xs text-muted-foreground">
                <div>
                  {snapshot.coverage.seedBackfillRange ? (
                    <>
                      M04.6-G seed backfill (tx-by-hash):{" "}
                      <code className="font-mono text-foreground">
                        #{snapshot.coverage.seedBackfillRange.minHeight}..#
                        {snapshot.coverage.seedBackfillRange.maxHeight}
                      </code>
                      .{" "}
                    </>
                  ) : null}
                  {snapshot.coverage.forwardScanRange ? (
                    <>
                      Contiguous forward scan:{" "}
                      <code className="font-mono text-foreground">
                        #{snapshot.coverage.forwardScanRange.startHeight}..#
                        {snapshot.coverage.forwardScanRange.endHeight}
                      </code>{" "}
                      ({snapshot.coverage.forwardScanRange.blockCount} blk).
                    </>
                  ) : null}
                </div>
                {snapshot.coverage.coverageGaps && snapshot.coverage.coverageGaps.length > 0 && (
                  <div className="font-mono text-[11px] text-foreground">
                    Open gap
                    {snapshot.coverage.coverageGaps.length > 1 ? "s" : ""}:{" "}
                    {snapshot.coverage.coverageGaps
                      .map((g) => `#${g.fromHeight}..#${g.toHeight} (${g.missingBlocks} blk)`)
                      .join(" · ")}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

        {snapshot?.historyConnectionState === "fallback_m0412_rpc" && snapshot.fallbackReason && (
          <Alert className="border-border bg-muted/35">
            <Info className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <AlertTitle className="text-xs font-semibold">
              Local persistent indexer offline — M04.12 verified RPC fallback active
            </AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground">
              {snapshot.fallbackReason} Start{" "}
              <code className="font-mono">node services/perps-indexer/src/indexer.mjs</code> in the
              backend repository for continuous finalized-block persistence.
            </AlertDescription>
          </Alert>
        )}

        {/* Stale policy disclosure banner (explicitly required when >300s) */}
        {status === "stale" && (
          <Alert className="border-[var(--warn)]/60 bg-[var(--warn-soft)]/25">
            <AlertTriangle className="h-4 w-4 text-[var(--warn)]" aria-hidden="true" />
            <AlertTitle className="text-xs font-semibold">
              Last verified oracle observation is stale.
            </AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground">
              Last on-chain synthetic tick (
              <code className="font-mono">Oracle #{latestObservation?.sequence ?? "?"}</code>) is{" "}
              <span className="num font-medium text-foreground">
                {formatAgeDurationCompact(effectiveAgeSec)}
              </span>{" "}
              old, exceeding the <span className="num">{maxAgeSec}s</span> opening policy window on{" "}
              <code className="font-mono">{PERPS_CONTRACT_ID}</code>. Plotted history remains
              strictly truthful without synthetic gap-filling.
            </AlertDescription>
          </Alert>
        )}

        {/* Chart Viewport Container */}
        {status === "loading" ? (
          <div
            role="status"
            className="flex h-[300px] flex-col items-center justify-center gap-2 rounded-md border bg-card px-4 text-center text-sm text-foreground"
          >
            <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
            <p>Loading verified on-chain observations...</p>
            <p className="text-xs text-muted-foreground">
              Verifying finalized receipts via NEAR Testnet JSON-RPC (zero local fallback data).
            </p>
          </div>
        ) : status === "error" ? (
          <div
            role="alert"
            className="flex h-[300px] flex-col items-center justify-center gap-3 rounded-md border border-loss/50 bg-card px-4 text-center text-sm text-foreground"
          >
            <AlertTriangle className="size-6 text-loss" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                Historical oracle data unavailable. Retry verification.
              </p>
              <p className="max-w-md text-xs text-muted-foreground">
                {error?.message ?? "Unable to confirm NEAR Testnet transaction receipts."}
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
              <RefreshCw className="mr-1.5 size-3.5" aria-hidden="true" />
              Retry verification
            </Button>
          </div>
        ) : status === "empty" ? (
          <div className="flex h-[300px] flex-col items-center justify-center gap-2 rounded-md border bg-card px-4 text-center text-sm text-foreground">
            <Info className="size-5 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">No verified historical observations available yet.</p>
            <p className="max-w-md text-xs text-muted-foreground">
              No finalized <code className="font-mono">oracle_sandbox_tick</code> events were
              confirmed for <code className="font-mono">{targetMarketId}</code>.
            </p>
          </div>
        ) : !timeframeAvailability.canRenderLine && !timeframeAvailability.canRenderCandles ? (
          <div className="flex h-[300px] flex-col items-center justify-center gap-3 rounded-md border bg-card px-6 text-center text-sm text-foreground">
            <Info className="size-5 text-brass" aria-hidden="true" />
            <div className="max-w-lg space-y-1.5">
              <p className="font-medium text-foreground">
                {timeframe} interval unavailable without fabricating history
              </p>
              <p className="text-xs text-muted-foreground">{timeframeAvailability.reason}</p>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={() => setTimeframe("ALL")}>
              Return to ALL verified ticks
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-border bg-card">
            {/* Crosshair / Selected Tick Readout HUD */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 font-mono text-[11px] text-foreground">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-foreground">{targetMarketId}</span>
                {activeObservation && (
                  <>
                    <span className="text-gain">{formatUsdE8(activeObservation.priceE8)}/kg</span>
                    <span className="text-muted-foreground">
                      Oracle #{activeObservation.sequence}
                    </span>
                    <span className="text-muted-foreground">
                      {formatObservationUtc(activeObservation.timestampSec)}
                    </span>
                  </>
                )}
              </div>
              {activeObservation && (
                <a
                  href={activeObservation.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground"
                >
                  <span>tx {activeObservation.txHash.slice(0, 8)}...</span>
                  <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              )}
            </div>

            {/* Lightweight Charts Mount Node */}
            <div
              ref={chartHostRef}
              data-testid="arabica-lightweight-chart"
              className="relative h-[300px] w-full sm:h-[340px]"
            >
              {canvasUnavailable && (
                <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
                  Canvas 2D context unavailable in this environment; verified observation ledger
                  below remains active.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verified Position Execution Markers */}
        {tradeMarkers.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-foreground">
                Verified On-Chain Trade Markers ({tradeMarkers.length})
              </span>
              <span className="text-[11px] text-muted-foreground">
                Anchored to active Oracle tick during execution — exact block timestamps preserved
              </span>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {tradeMarkers.map((marker) => (
                <TradeMarkerCard
                  key={`${marker.kind}-${marker.positionId}-${marker.txHash}`}
                  marker={marker}
                />
              ))}
            </div>
          </div>
        )}

        {/* Expandable Verified Oracle Ticks Ledger + Honest Methodology & TradingView Attribution */}
        <div className="space-y-2 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-foreground">
              Honest Historical Methodology & Indexer-Ready Boundary
            </p>
            {observations.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAllTicks((prev) => !prev)}
                className="font-mono text-[11px] text-primary underline decoration-dotted underline-offset-4"
              >
                {showAllTicks
                  ? "Hide verified ticks"
                  : `Inspect ${observations.length} verified ticks`}
              </button>
            )}
          </div>
          <p>
            {snapshot?.sourceMode === "persistent_indexer" && snapshot.coverage ? (
              <>
                Served from local persistent finalized-block indexer (
                {snapshot.coverage.coverageComplete ? "contiguous coverage" : "partial coverage"};{" "}
                {snapshot.coverage.blocksProcessed} finalized blocks scanned
                {snapshot.coverage.forwardScanRange
                  ? `, forward #${snapshot.coverage.forwardScanRange.startHeight}..#${snapshot.coverage.forwardScanRange.endHeight}`
                  : ""}
                {snapshot.coverage.backfillBlockRange
                  ? `, M04.6-G seed #${snapshot.coverage.backfillBlockRange.minHeight}..#${snapshot.coverage.backfillBlockRange.maxHeight}`
                  : ""}
                ) — bounded sequential catch-up polling FastNear finalized blocks, not real-time
                streaming.{" "}
              </>
            ) : (
              <>
                Every plotted point comes exclusively from FINAL{" "}
                <code className="font-mono">EVENT_JSON</code> receipts on{" "}
                <code className="font-mono">{PERPS_CONTRACT_ID}</code> verified client-side via NEAR
                Testnet RPC.{" "}
              </>
            )}
            {timeframeAvailability.canRenderCandles
              ? `${timeframe} candlesticks strictly aggregate ORACLE SAMPLE OHLC (non-trading) buckets without empty interval fill. `
              : "Candlestick OHLC bars are disabled until >=6 non-empty intervals with multi-sample ticks exist. "}
            {snapshot?.volume?.reason
              ? snapshot.volume.reason
              : "Volume histograms stay disabled when close/liquidation events omit executed size_e8."}
          </p>

          {showAllTicks && observations.length > 0 && (
            <div className="overflow-x-auto pt-1">
              <table className="w-full min-w-[520px] text-left font-mono text-[11px]">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-1.5 pr-3 font-medium">Seq</th>
                    <th className="py-1.5 pr-3 font-medium">Price</th>
                    <th className="py-1.5 pr-3 font-medium">Observed UTC</th>
                    <th className="py-1.5 pr-3 font-medium">Classification</th>
                    <th className="py-1.5 font-medium">Tx Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {observations.map((obs) => (
                    <tr key={obs.txHash} className="text-foreground">
                      <td className="py-1.5 pr-3">#{obs.sequence}</td>
                      <td className="py-1.5 pr-3">{formatUsdE8(obs.priceE8)}/kg</td>
                      <td className="py-1.5 pr-3">{formatObservationUtc(obs.timestampSec)}</td>
                      <td className="py-1.5 pr-3">{obs.classification}</td>
                      <td className="py-1.5">
                        <a
                          href={obs.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary underline decoration-dotted underline-offset-4"
                        >
                          <span>{obs.txHash.slice(0, 12)}...</span>
                          <ExternalLink className="size-3" aria-hidden="true" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mandatory TradingView Attribution Notice */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-[11px] text-muted-foreground">
            <span>
              Charting powered by{" "}
              <a
                href="https://www.tradingview.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              >
                TradingView
              </a>{" "}
              Lightweight Charts™ (Apache-2.0 License).
            </span>
            <span className="font-mono">
              Source: {snapshot?.sourceMode ?? "verified_testnet_tx_receipts"}
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export const ArabicaMarketChart = PerpsMarketChart;
