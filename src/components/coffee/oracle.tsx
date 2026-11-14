// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ChevronDown,
  ExternalLink,
  FlaskConical,
  Landmark,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, Panel, Pill, Stat, Stats } from "@/components/kit";
import { useHydrated } from "@/components/shell";
import {
  HISTORICAL_PROOF_RECORD,
  IMF_ATTRIBUTION_TEXT,
  MARKET_GESHA_DEMO,
  MARKET_IMF_ARABICA,
  NEAR_TESTNET_NETWORK_ID,
  ORACLE_CONTRACT_ID,
  OUTLAYER_CONTRACT_ID,
  TESTNET_EXPLORER_TX_BASE,
} from "@/lib/oracle/config";
import {
  classifyDataClass,
  evaluateFreshness,
  formatAgeDuration,
  formatIntegerCount,
  formatUsdPerKg,
  formatUtcTimestamp,
  formatYoctoNear,
  inferMonthlyPeriodLabel,
  toIsoUtc,
} from "@/lib/oracle/format";
import { useOracleSnapshot } from "@/lib/oracle/queries";
import {
  MARKET_ARABICA_PERPS_ID,
  MARKET_ARABICA_URL_SLUG,
  PERPS_CONTRACT_ID,
} from "@/lib/perps/config";
import { evaluatePerpsOracleStatus, formatUsdE8 } from "@/lib/perps/math";
import { usePerpsProtocolSnapshot } from "@/lib/perps/queries";
import type {
  AccountingSnapshot,
  MarketConfig,
  OracleDashboardSnapshot,
  PriceObservation,
} from "@/lib/oracle/types";
import { cn } from "@/lib/utils";

function useClientEpochSec(fallbackMs?: number): number | null {
  const hydrated = useHydrated();
  const [nowSec, setNowSec] = useState<number | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    const sync = () => setNowSec(Math.floor(Date.now() / 1000));
    sync();
    const timer = setInterval(sync, 30_000);
    return () => clearInterval(timer);
  }, [hydrated]);

  if (!hydrated) return null;
  if (nowSec !== null) return nowSec;
  return fallbackMs ? Math.floor(fallbackMs / 1000) : null;
}

function FreshnessBadge({
  observation,
  config,
  nowSec,
}: {
  observation: PriceObservation | null;
  config: MarketConfig | null;
  nowSec: number | null;
}) {
  if (!observation) {
    return <Pill tone="muted">No observation</Pill>;
  }
  if (observation.observed_at_sec === 0 && observation.data_class === "SYNTHETIC_DEMO") {
    return <Pill tone="warn">Synthetic clock (0)</Pill>;
  }
  if (nowSec === null) {
    return <Pill tone="info">Timestamp recorded</Pill>;
  }
  const freshness = evaluateFreshness(observation, config, nowSec);
  const tone =
    freshness.status === "STALE"
      ? "loss"
      : freshness.status === "FRESH"
        ? "gain"
        : freshness.status === "FUTURE_DRIFT"
          ? "warn"
          : "muted";
  return (
    <Pill tone={tone}>
      {freshness.isStale
        ? "Stale"
        : freshness.status === "FRESH"
          ? "Fresh within policy"
          : freshness.label}
    </Pill>
  );
}

function SafeKV({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="divide-y text-sm">
      {rows.map(([k, v]) => (
        <div
          key={k}
          className="flex flex-col gap-1 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
        >
          <dt className="shrink-0 text-muted-foreground">{k}</dt>
          <dd className="min-w-0 break-words sm:text-right">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function TimestampDisplay({
  epochSec,
  emptyText = "—",
}: {
  epochSec: number | null | undefined;
  emptyText?: string;
}) {
  if (epochSec === null || epochSec === undefined) {
    return <span className="num text-xs text-muted-foreground">{emptyText}</span>;
  }
  if (epochSec === 0) {
    return <span className="num text-xs text-muted-foreground">0 (synthetic fixture)</span>;
  }
  const iso = toIsoUtc(epochSec);
  return (
    <time dateTime={iso ?? undefined} className="num text-xs">
      {formatUtcTimestamp(epochSec)}
    </time>
  );
}

/**
 * Self-contained read-only NEAR Testnet Oracle card for the main dashboard.
 * Completely independent from `useDemo()` simulated balances, lots, and positions.
 */
export function OracleOverviewCard({ contractId = ORACLE_CONTRACT_ID }: { contractId?: string }) {
  const query = useOracleSnapshot(contractId);
  const snapshot = query.data;
  const nowSec = useClientEpochSec(snapshot?.fetchedAtMs);

  const imfState = snapshot?.marketStates[MARKET_IMF_ARABICA];
  const geshaState = snapshot?.marketStates[MARKET_GESHA_DEMO];
  const imfClass = classifyDataClass(imfState?.observation?.data_class);
  const geshaClass = classifyDataClass(geshaState?.observation?.data_class);
  const imfFreshness =
    imfState && nowSec !== null
      ? evaluateFreshness(imfState.observation, imfState.config, nowSec)
      : null;

  return (
    <article
      aria-labelledby="dashboard-oracle-heading"
      className="@container rounded-lg border border-border bg-card shadow-soft"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-forest text-mint">
            <Activity className="size-4" aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="dashboard-oracle-heading" className="font-display text-lg font-semibold">
                Coffee Oracle
              </h2>
              <Pill tone="gain">NEAR Testnet · Read-only</Pill>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">{contractId}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9 gap-1.5"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            aria-label="Refresh NEAR Testnet oracle data"
          >
            <RefreshCw
              className={cn("size-3.5", query.isFetching && "animate-spin")}
              aria-hidden="true"
            />
            <span>{query.isFetching ? "Refreshing…" : "Refresh"}</span>
          </Button>
          <Button asChild variant="default" size="sm" className="min-h-9 gap-1.5">
            <Link to="/app/oracle">
              <span>Inspect oracle</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="space-y-4 p-4 sm:p-5">
        <p className="text-xs text-muted-foreground">
          OutLayer read-only contract observations, independent from Perps and its execution feed.
          Historical benchmarks and synthetic fixtures are not live coffee quotes; inspect the
          recorded data class, source and observation time below. Refreshing RPC is not a new market
          observation.
        </p>
        {query.isPending && (
          <div
            className="grid gap-3 @lg:grid-cols-2"
            aria-label="Loading NEAR Testnet oracle telemetry"
          >
            <Skeleton className="h-32 w-full rounded-md" />
            <Skeleton className="h-32 w-full rounded-md" />
          </div>
        )}

        {query.isError && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" aria-hidden="true" />
            <AlertTitle>NEAR Testnet RPC unavailable</AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="text-xs">{query.error.message}</p>
              <p className="text-xs text-muted-foreground">
                Current stored observations cannot be verified without RPC connectivity. No fallback
                or simulated price is displayed.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {snapshot && (
          <>
            <div className="grid gap-3 @lg:grid-cols-2">
              {/* Historical Monthly IMF Benchmark */}
              <div className="flex flex-col justify-between rounded-md border bg-background/50 p-3.5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {MARKET_IMF_ARABICA}
                    </span>
                    <Pill tone={imfClass.badgeTone}>
                      {imfState?.observation ? imfClass.shortLabel : "No stored observation"}
                    </Pill>
                  </div>

                  {imfState?.observation ? (
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="num text-2xl font-semibold tracking-tight text-foreground">
                        {formatUsdPerKg(
                          imfState.observation.price,
                          imfState.observation.decimals,
                          imfState.observation.unit,
                        )}
                      </p>
                      <FreshnessBadge
                        observation={imfState.observation}
                        config={imfState.config}
                        nowSec={nowSec}
                      />
                    </div>
                  ) : (
                    <p className="py-1 text-sm text-muted-foreground">No observation yet</p>
                  )}

                  {imfFreshness?.isStale && (
                    <p className="text-xs font-medium text-loss" role="alert">
                      {imfFreshness.detail}
                    </p>
                  )}
                </div>

                <dl className="mt-3 space-y-1 border-t pt-2.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Source</dt>
                    <dd className="num text-right">
                      {imfState?.observation?.source ?? "Unavailable (no stored observation)"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Data class</dt>
                    <dd className="num text-right">
                      {imfState?.observation?.data_class ?? "Unavailable"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Observed</dt>
                    <dd className="text-right">
                      <TimestampDisplay epochSec={imfState?.observation?.observed_at_sec} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Stored on-chain</dt>
                    <dd className="text-right">
                      <TimestampDisplay epochSec={imfState?.observation?.stored_at_sec} />
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Gesha Synthetic Demo Fixture */}
              <div className="flex flex-col justify-between rounded-md border border-brass/35 bg-background/50 p-3.5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {MARKET_GESHA_DEMO}
                    </span>
                    <Pill tone={geshaClass.badgeTone}>
                      {geshaState?.observation ? geshaClass.label : "No stored observation"}
                    </Pill>
                  </div>

                  {geshaState?.observation ? (
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="num text-2xl font-semibold tracking-tight text-foreground">
                        {formatUsdPerKg(
                          geshaState.observation.price,
                          geshaState.observation.decimals,
                          geshaState.observation.unit,
                        )}
                      </p>
                      <Pill tone="warn">Not a market quote</Pill>
                      <FreshnessBadge
                        observation={geshaState.observation}
                        config={geshaState.config}
                        nowSec={nowSec}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        No observation yet
                      </p>
                      <Pill tone="muted">No auto-trigger</Pill>
                    </div>
                  )}
                </div>

                <dl className="mt-3 space-y-1 border-t pt-2.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Worker mode</dt>
                    <dd className="num">{geshaState?.config?.worker_mode ?? "Unavailable"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Data class</dt>
                    <dd className="num">
                      {geshaState?.observation?.data_class ?? "Unavailable (untriggered)"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Source</dt>
                    <dd className="num text-right">
                      {geshaState?.observation?.source ?? "Unavailable"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Observed</dt>
                    <dd className="text-right">
                      <TimestampDisplay epochSec={geshaState?.observation?.observed_at_sec} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Stored on-chain</dt>
                    <dd className="text-right">
                      <TimestampDisplay epochSec={geshaState?.observation?.stored_at_sec} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Policy window</dt>
                    <dd className="num">
                      {geshaState?.config
                        ? formatAgeDuration(geshaState.config.max_price_age_sec)
                        : "Unavailable"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  {snapshot.solvencyInvariant && snapshot.accounting.invariant_holds ? (
                    <CheckCircle2 className="size-3.5 text-gain" aria-hidden="true" />
                  ) : (
                    <XCircle className="size-3.5 text-loss" aria-hidden="true" />
                  )}
                  <span>
                    Contract solvency:{" "}
                    <strong className="text-foreground">
                      {snapshot.solvencyInvariant ? "Verified" : "Failed"}
                    </strong>
                  </span>
                </span>
                <span className="num">
                  Pending: {snapshot.accounting.pending_request_count} · Slots:{" "}
                  {snapshot.accounting.open_request_slots}/{snapshot.accounting.max_open_requests}
                </span>
                <span className="num">Nonce: {snapshot.nextNonce}</span>
              </div>

              <p className="text-[11px]">
                Historical IMF monthly benchmark · not spot/ICE futures · separate from simulated
                demo portfolio
              </p>
            </footer>
          </>
        )}
      </div>
    </article>
  );
}


function TechnicalDisclosure({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <details className="group overflow-hidden rounded-lg border border-border bg-card shadow-soft">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 space-y-0.5">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          <span className="block text-xs font-normal text-muted-foreground">{description}</span>
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="space-y-4 border-t px-4 py-4 sm:px-5">{children}</div>
    </details>
  );
}

function MarketSummaryCard({
  symbol,
  config,
  observation,
  selected,
  onSelect,
  nowSec,
}: {
  symbol: string;
  config: MarketConfig | null;
  observation: PriceObservation | null;
  selected: boolean;
  onSelect: () => void;
  nowSec: number | null;
}) {
  const cls = classifyDataClass(observation?.data_class);
  const freshness = evaluateFreshness(
    observation,
    config,
    nowSec ?? Math.floor(observation?.stored_at_sec ?? 0),
  );
  const periodLabel = observation ? inferMonthlyPeriodLabel(observation.observed_at_sec) : null;

  return (
    <article
      className={cn(
        "@container flex flex-col justify-between rounded-lg border bg-card p-4 transition-colors",
        selected ? "border-primary ring-1 ring-primary/40" : "border-border",
      )}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <h2 className="font-mono text-sm font-semibold text-foreground">{symbol}</h2>
            <p className="text-xs text-muted-foreground">
              {symbol === MARKET_IMF_ARABICA
                ? "Historical monthly public benchmark"
                : symbol === MARKET_GESHA_DEMO
                  ? "Synthetic pipeline demo · not a market price"
                  : "Stored oracle market reading"}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Pill tone={cls.badgeTone}>{cls.shortLabel}</Pill>
              <FreshnessBadge observation={observation} config={config} nowSec={nowSec} />
            </div>
          </div>

          <Button
            type="button"
            variant={selected ? "default" : "outline"}
            size="sm"
            className="min-h-9"
            aria-pressed={selected}
            onClick={onSelect}
          >
            {selected ? "Inspecting" : "Inspect"}
          </Button>
        </div>

        <div className="rounded-md border bg-background/50 p-3">
          {observation ? (
            <>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {symbol === MARKET_IMF_ARABICA
                  ? "Recorded historical benchmark"
                  : symbol === MARKET_GESHA_DEMO
                    ? "Synthetic demo value"
                    : "Recorded on-chain value"}
              </p>
              <p className="num mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {formatUsdPerKg(observation.price, observation.decimals, observation.unit)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {symbol === MARKET_IMF_ARABICA ? "Source: International Monetary Fund (IMF)" : "Isolated Testnet fixture"}
                {periodLabel ? ` · Reference period: ${periodLabel}` : ""}
              </p>
              <details className="mt-3 border-t pt-2 text-xs">
                <summary className="cursor-pointer font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Technical reading
                </summary>
                <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5">
                  <dt className="text-muted-foreground">Raw on-chain integer</dt>
                  <dd className="num break-all text-right">{observation.price}</dd>
                  <dt className="text-muted-foreground">Decimal places</dt>
                  <dd className="num text-right">{observation.decimals}</dd>
                  <dt className="text-muted-foreground">Data class</dt>
                  <dd className="break-all text-right font-mono">{observation.data_class}</dd>
                  <dt className="text-muted-foreground">Source identifier</dt>
                  <dd className="break-all text-right font-mono">{observation.source}</dd>
                  <dt className="text-muted-foreground">Source count</dt>
                  <dd className="num text-right">{observation.source_count}</dd>
                </dl>
              </details>
            </>
          ) : (
            <div className="py-2">
              <p className="text-sm font-medium text-foreground">No reading is stored yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                No price is available for this market. Refreshing the page will not create a new reading.
              </p>
            </div>
          )}
        </div>

        {nowSec !== null && freshness.isStale && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" aria-hidden="true" />
            <AlertTitle>Reading is older than the allowed limit</AlertTitle>
            <AlertDescription className="text-xs">{freshness.detail}</AlertDescription>
          </Alert>
        )}
      </div>

      <dl className="mt-4 space-y-1.5 border-t pt-3 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Source observation time (UTC)</dt>
          <dd className="text-right">
            <TimestampDisplay epochSec={observation?.observed_at_sec} />
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Recorded on NEAR (UTC)</dt>
          <dd className="text-right">
            <TimestampDisplay epochSec={observation?.stored_at_sec} />
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Maximum accepted age</dt>
          <dd className="num text-right">
            {config ? formatAgeDuration(config.max_price_age_sec) : "—"}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-[11px] text-muted-foreground">
        The source observation time describes the reading. The NEAR timestamp shows when that reading was recorded on-chain.
      </p>
    </article>
  );
}

function ProtocolHealthPanel({
  snapshot,
  accounting,
}: {
  snapshot: OracleDashboardSnapshot;
  accounting: AccountingSnapshot;
}) {
  const solvencyOk = snapshot.solvencyInvariant && accounting.invariant_holds;

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <ShieldCheck
            className={cn("size-4", solvencyOk ? "text-gain" : "text-loss")}
            aria-hidden="true"
          />
          <span>Protocol health (on-chain contract accounting)</span>
        </span>
      }
      actions={
        <Pill tone={solvencyOk ? "gain" : "loss"}>
          {solvencyOk ? "Solvency invariant holds" : "Solvency violation"}
        </Pill>
      }
    >
      <div className="space-y-4">
        <Stats cols={4}>
          <Stat
            label="Solvency invariant"
            value={solvencyOk ? "Verified (true)" : "Failed (false)"}
            tone={solvencyOk ? "gain" : "loss"}
            sub={`Required backing: ${formatYoctoNear(accounting.required_backing)}`}
          />
          <Stat
            label="Spendable balance"
            value={formatYoctoNear(accounting.spendable_balance)}
            sub={`Account: ${formatYoctoNear(accounting.account_balance)}`}
          />
          <Stat
            label="Open request slots"
            value={`${accounting.open_request_slots} / ${accounting.max_open_requests}`}
            sub={`Pending: ${accounting.pending_request_count} · Unreconciled: ${accounting.unreconciled_failure_count}`}
          />
          <Stat
            label="Markets registered"
            value={accounting.market_count}
            sub={`Next nonce: ${snapshot.nextNonce} · Requesters: ${accounting.authorized_requester_count}`}
          />
        </Stats>

        <div className="grid gap-4 md:grid-cols-2">
          <SafeKV
            rows={[
              [
                "Storage locked",
                <span key="sl" className="num text-xs">
                  {formatYoctoNear(accounting.storage_locked_balance)} (
                  {formatIntegerCount(accounting.storage_usage_bytes)} B)
                </span>,
              ],
              [
                "Minimum operating reserve",
                <span key="mor" className="num text-xs">
                  {formatYoctoNear(accounting.minimum_operating_reserve)}
                </span>,
              ],
              [
                "Refund reserve balance",
                <span key="rrb" className="num text-xs">
                  {formatYoctoNear(accounting.refund_reserve_balance)}
                </span>,
              ],
              [
                "Unallocated surplus",
                <span key="us" className="num text-xs">
                  {formatYoctoNear(accounting.unallocated_surplus)}
                </span>,
              ],
              [
                "Encumbered backing floor",
                <span key="ebf" className="num text-xs">
                  {formatYoctoNear(accounting.encumbered_backing_floor)}
                </span>,
              ],
            ]}
          />
          <SafeKV
            rows={[
              [
                "Total refund liability",
                <span key="trl" className="num text-xs">
                  {formatYoctoNear(accounting.total_refund_liability)}
                </span>,
              ],
              [
                "Backed refund liability",
                <span key="brl" className="num text-xs">
                  {formatYoctoNear(accounting.backed_refund_liability)}
                </span>,
              ],
              [
                "In-flight / disputed liability",
                <span key="idl" className="num text-xs">
                  {formatYoctoNear(accounting.in_flight_liability)} /{" "}
                  {formatYoctoNear(accounting.disputed_liability)}
                </span>,
              ],
              [
                "Active claims / credits",
                <span key="acc" className="num text-xs">
                  {accounting.active_claim_count} claims · {accounting.active_refund_credit_count}{" "}
                  credits
                </span>,
              ],
              [
                "Insurance reserve",
                <span key="ir" className="num text-xs">
                  {formatYoctoNear(accounting.insurance_reserve_balance)} (
                  {accounting.insurance_enabled ? "Enabled" : "Disabled"})
                </span>,
              ],
            ]}
          />
        </div>

        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <strong className="text-foreground">Scope boundary:</strong> This check verifies NEAR
          contract reserve accounting invariants only (
          <span className="font-mono">verify_solvency_invariant</span>). It does not perform or
          claim independent cryptographic verification of OutLayer TEE hardware attestation quotes.
        </p>
      </div>
    </Panel>
  );
}

export function OraclePage({ contractId = ORACLE_CONTRACT_ID }: { contractId?: string }) {
  const query = useOracleSnapshot(contractId);
  const perpsQuery = usePerpsProtocolSnapshot();
  const snapshot = query.data;
  const nowSec = useClientEpochSec(snapshot?.fetchedAtMs);
  const [selectedMarket, setSelectedMarket] = useState<string>(MARKET_IMF_ARABICA);

  const availableMarkets = snapshot?.markets.length
    ? snapshot.markets
    : [MARKET_IMF_ARABICA, MARKET_GESHA_DEMO];
  const activeSymbol = availableMarkets.includes(selectedMarket)
    ? selectedMarket
    : availableMarkets[0];
  const activeState = snapshot?.marketStates[activeSymbol];
  const activeConfig = activeState?.config ?? null;
  const activeObs = activeState?.observation ?? null;
  const activeClass = classifyDataClass(activeObs?.data_class);
  const activeFreshness =
    snapshot && nowSec !== null
      ? evaluateFreshness(activeObs, activeConfig, nowSec)
      : evaluateFreshness(
          activeObs,
          activeConfig,
          snapshot ? Math.floor(snapshot.fetchedAtMs / 1000) : 0,
        );
  const activePeriod = activeObs ? inferMonthlyPeriodLabel(activeObs.observed_at_sec) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coffee Oracle"
        demo={false}
        crumbs={[{ label: "Dashboard", to: "/app/dashboard" }, { label: "Coffee Oracle" }]}
        subtitle="A read-only view of coffee data stored on NEAR Testnet. It shows a historical public benchmark and a separate synthetic test feed — not live coffee prices."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="gain">Network: {NEAR_TESTNET_NETWORK_ID}</Pill>
            {snapshot && <Pill tone="info">RPC: {new URL(snapshot.rpcEndpoint).hostname}</Pill>}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-9 gap-1.5"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
              aria-label="Refresh stored oracle data from NEAR Testnet"
            >
              <RefreshCw
                className={cn("size-3.5", query.isFetching && "animate-spin")}
                aria-hidden="true"
              />
              <span>{query.isFetching ? "Refreshing…" : "Refresh data"}</span>
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:p-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.95fr)]">
        <div className="space-y-2">
          <h2 className="font-display text-base font-semibold text-foreground">What is an oracle?</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            An oracle brings information from outside a blockchain onto it, so smart contracts can use that information.
            This page reads records already stored on NEAR Testnet; it does not provide a live coffee quotation.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            OutLayer is used for a separate read-only data workflow. It does not provide the Perpetuals test price.
          </p>
        </div>
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">How to read the status</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <Pill tone="gain">Fresh</Pill>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                The saved reading is within that market’s allowed age. It is still historical or synthetic data, not necessarily live.
              </p>
            </div>
            <div className="rounded-md border p-3">
              <Pill tone="warn">Stale</Pill>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                The reading is older than allowed. Do not treat it as a current or usable price.
              </p>
            </div>
            <div className="rounded-md border p-3">
              <Pill tone="muted">No observation</Pill>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                No reading has been stored for that market yet. Refreshing does not generate one.
              </p>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            “Connected” only means NEAR Testnet answered. It does not mean every market reading is fresh.
            “Observed” is the source reading time; “Recorded on NEAR” is when it was saved on-chain.
          </p>
        </div>
      </section>

      {/* Explicit Testnet-only and data classification disclosure bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brass/40 bg-card/70 px-4 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <FlaskConical className="size-4 shrink-0 text-brass" aria-hidden="true" />
          <span>
            <strong className="text-foreground">Testnet demo · read-only:</strong> Checks records already stored in{" "}
            <span className="font-mono text-foreground">{contractId}</span> every 60 seconds. Refreshing reads the
            saved record again; it does not create a new observation, submit a transaction or use simulated
            balances from other ROASTAKE demo modules.
          </span>
        </div>
        {snapshot && (
          <span className="num flex items-center gap-1.5 text-muted-foreground">
            <Clock className="size-3.5" aria-hidden="true" />
            Last queried: <TimestampDisplay epochSec={Math.floor(snapshot.fetchedAtMs / 1000)} />
          </span>
        )}
      </div>

      {query.isPending && (
        <div className="space-y-4" aria-label="Loading read-only oracle contract data">
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-56 w-full rounded-lg" />
            <Skeleton className="h-56 w-full rounded-lg" />
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      )}

      {query.isError && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertTitle>Unable to query NEAR Testnet Oracle contract</AlertTitle>
          <AlertDescription className="space-y-2">
            <p className="text-xs">{query.error.message}</p>
            <p className="text-xs text-muted-foreground">
              Verify network connectivity to {NEAR_TESTNET_NETWORK_ID} RPC endpoints and click{" "}
              <strong>Refresh RPC</strong>. Cached fallback demo values are intentionally disabled
              on errors.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {snapshot && (
        <>
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold text-foreground">Coffee data readings</h2>
            <p className="text-sm text-muted-foreground">
              These cards show different kinds of data. The Arabica record is a historical IMF monthly benchmark;
              Gesha is an isolated synthetic demo fixture. Neither is a live coffee-market quote.
            </p>
          </div>
          {/* Distinct cards separating IMF Benchmark vs Gesha Synthetic Fixture */}
          <section aria-label="Registered Oracle Markets" className="grid gap-4 md:grid-cols-2">
            {snapshot.markets.map((symbol) => (
              <MarketSummaryCard
                key={symbol}
                symbol={symbol}
                config={snapshot.marketStates[symbol]?.config ?? null}
                observation={snapshot.marketStates[symbol]?.observation ?? null}
                selected={symbol === activeSymbol}
                onSelect={() => setSelectedMarket(symbol)}
                nowSec={nowSec}
              />
            ))}
          </section>

          <Panel
            title={
              <span className="flex flex-wrap items-center gap-2">
                <span>Separate Perpetuals test feed</span>
                <Pill tone="warn">Synthetic · separate from OutLayer</Pill>
              </span>
            }
            actions={
              <Link
                to="/app/perps/$market"
                params={{ market: MARKET_ARABICA_URL_SLUG }}
                className="text-xs font-medium text-primary hover:underline"
              >
                Open Arabica Terminal →
              </Link>
            }
          >
            {(() => {
              const p = perpsQuery.data;
              const status = evaluatePerpsOracleStatus(
                p?.arabicaMarket,
                p?.blockTimestampSec ?? null,
              );
              return (
                <div className="space-y-3 text-xs">
                  <p className="text-muted-foreground">
                    Perpetuals uses a different, operator-controlled test price. It does not use the IMF historical
                    benchmark or OutLayer observations. This value is synthetic and is not a real
                    coffee quotation. Testnet USDC has no monetary value.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded border p-3">
                      <div className="text-[11px] text-muted-foreground">
                        Synthetic test price
                      </div>
                      <div className="num mt-1 text-base font-semibold">
                        {status.priceE8 ? `${formatUsdE8(status.priceE8)}/kg` : "Unavailable"}
                      </div>
                    </div>
                    <div className="rounded border p-3">
                      <div className="text-[11px] text-muted-foreground">
                        Freshness check · limit {status.maxAgeSec}s
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 font-semibold">
                        <Pill
                          tone={
                            status.isValidForOpen
                              ? "gain"
                              : status.status === "STALE"
                                ? "warn"
                                : "loss"
                          }
                        >
                          {status.status}
                        </Pill>
                        {status.ageSec !== null && (
                          <span className="num text-muted-foreground">({status.ageSec}s old)</span>
                        )}
                      </div>
                    </div>
                    <div className="rounded border p-3">
                      <div className="text-[11px] text-muted-foreground">Feed update</div>
                      <div className="num mt-1 text-base font-semibold">
                        {status.sequence !== null ? `#${status.sequence}` : "—"}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {status.status === "STALE"
                      ? "This saved test price is older than its configured limit. It is stale and must not be treated as a usable current price."
                      : status.isValidForOpen
                        ? "This test price is within its configured age limit, but it remains synthetic and is not a real coffee quotation."
                        : "A currently usable test price is not available. This feed remains synthetic and separate from OutLayer."}
                  </p>
                  <TechnicalDisclosure
                    title="Feed identifiers & policy"
                    description="Contract addresses and execution-feed rules for technical reviewers."
                  >
                    <dl className="grid gap-2 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">Perpetuals contract</dt>
                        <dd className="break-all font-mono">{PERPS_CONTRACT_ID}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Market identifier</dt>
                        <dd className="break-all font-mono">{MARKET_ARABICA_PERPS_ID}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Feed classification</dt>
                        <dd className="font-mono">TESTNET_SANDBOX_FEED</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Maximum accepted age</dt>
                        <dd className="num">{status.maxAgeSec} seconds</dd>
                      </div>
                    </dl>
                  </TechnicalDisclosure>
                </div>
              );
            })()}
          </Panel>

          <TechnicalDisclosure
            title="On-chain record & market configuration"
            description="Block, contract, source timestamps, market limits and worker details."
          >
            <div className="grid gap-6 lg:grid-cols-2">
            {/* Oracle overview */}
            <Panel
              title={
                <span className="flex items-center gap-2">
                  <Activity className="size-4 text-sage" aria-hidden="true" />
                  <span>Oracle overview · {activeSymbol}</span>
                </span>
              }
              actions={<Pill tone={activeClass.badgeTone}>{activeClass.label}</Pill>}
            >
              <SafeKV
                rows={[
                  [
                    "Testnet connection",
                    <span key="conn" className="num text-xs text-gain">
                      Connected ({snapshot.network} · {new URL(snapshot.rpcEndpoint).hostname})
                    </span>,
                  ],
                  [
                    "Pinned finalized block",
                    <span key="blk" className="font-mono text-[11px]">
                      <span className="break-all">{snapshot.blockHash}</span>
                      {snapshot.blockHeight !== undefined ? (
                        <span className="ml-1 inline-block whitespace-nowrap text-muted-foreground">
                          (#{formatIntegerCount(snapshot.blockHeight)})
                        </span>
                      ) : null}
                    </span>,
                  ],
                  [
                    "Contract address",
                    <span key="ctr" className="font-mono text-xs break-all">
                      {snapshot.contractId}
                    </span>,
                  ],
                  [
                    "OutLayer account",
                    <span key="out" className="font-mono text-xs break-all">
                      {OUTLAYER_CONTRACT_ID}
                    </span>,
                  ],
                  [
                    "Selected market",
                    <span key="mkt" className="font-mono text-xs font-semibold">
                      {activeSymbol}
                    </span>,
                  ],
                  [
                    "Last on-chain price",
                    activeObs ? (
                      <span key="prc" className="num font-semibold text-foreground">
                        {formatUsdPerKg(activeObs.price, activeObs.decimals, activeObs.unit)}
                      </span>
                    ) : (
                      <span key="prc" className="text-xs text-muted-foreground">
                        No observation yet
                      </span>
                    ),
                  ],
                  [
                    "Unit",
                    <span key="unt" className="num text-xs">
                      {activeObs?.unit ?? activeConfig?.unit ?? "USD/kg"}
                    </span>,
                  ],
                  [
                    "Data classification",
                    <span key="cls" className="font-mono text-xs">
                      {activeObs?.data_class ?? activeClass.code}
                    </span>,
                  ],
                  [
                    "Source",
                    <span key="src" className="font-mono text-xs">
                      {activeObs?.source ?? "Unavailable (no stored observation)"}
                    </span>,
                  ],
                  [
                    "Source count",
                    <span key="cnt" className="num text-xs">
                      {activeObs ? activeObs.source_count : "Unavailable (no stored observation)"}
                    </span>,
                  ],
                  [
                    "Observed date / time",
                    <span key="obs" className="text-xs">
                      <TimestampDisplay
                        epochSec={activeObs?.observed_at_sec}
                        emptyText="No observation yet"
                      />
                      {activePeriod ? (
                        <span className="num ml-1.5 text-muted-foreground">({activePeriod})</span>
                      ) : null}
                    </span>,
                  ],
                  [
                    "Stored on-chain time",
                    <TimestampDisplay
                      key="sto"
                      epochSec={activeObs?.stored_at_sec}
                      emptyText="No observation yet"
                    />,
                  ],
                  [
                    "Data age & freshness",
                    <span
                      key="frsh"
                      className="flex flex-wrap items-center justify-end gap-2 text-xs"
                    >
                      {activeFreshness.ageSec !== null && (
                        <span className="num text-muted-foreground">
                          {formatAgeDuration(activeFreshness.ageSec)}
                        </span>
                      )}
                      <FreshnessBadge
                        observation={activeObs}
                        config={activeConfig}
                        nowSec={nowSec}
                      />
                    </span>,
                  ],
                ]}
              />
            </Panel>

            {/* Market configuration */}
            <Panel
              title={
                <span className="flex items-center gap-2">
                  <Landmark className="size-4 text-brass" aria-hidden="true" />
                  <span>Market configuration · {activeSymbol}</span>
                </span>
              }
              actions={
                activeConfig ? (
                  <Pill tone={activeConfig.active ? "gain" : "loss"}>
                    {activeConfig.active ? "Active" : "Inactive"}
                  </Pill>
                ) : (
                  <Pill tone="muted">Unavailable</Pill>
                )
              }
            >
              {activeConfig ? (
                <SafeKV
                  rows={[
                    [
                      "Decimals / Unit",
                      <span key="du" className="num text-xs">
                        {activeConfig.decimals} decimals · {activeConfig.unit}
                      </span>,
                    ],
                    [
                      "Permitted price bounds",
                      <span key="pb" className="num text-xs">
                        {formatUsdPerKg(activeConfig.min_price, activeConfig.decimals, "")} to{" "}
                        {formatUsdPerKg(
                          activeConfig.max_price,
                          activeConfig.decimals,
                          activeConfig.unit,
                        )}
                      </span>,
                    ],
                    [
                      "Max price age policy",
                      <span key="ma" className="num text-xs">
                        {formatIntegerCount(activeConfig.max_price_age_sec)} s (
                        {formatAgeDuration(activeConfig.max_price_age_sec)})
                      </span>,
                    ],
                    [
                      "Max divergence / spread",
                      <span key="div" className="num text-xs">
                        {activeConfig.max_divergence_bps} bps · spread{" "}
                        {activeConfig.max_source_spread_bps} bps
                      </span>,
                    ],
                    [
                      "Worker mode",
                      <span key="wm" className="font-mono text-xs">
                        {activeConfig.worker_mode}
                      </span>,
                    ],
                    [
                      "Synthetic permitted",
                      <span key="syn" className="num text-xs">
                        {activeConfig.allow_synthetic ? "true (demo fixture only)" : "false"}
                      </span>,
                    ],
                    [
                      "WASI target",
                      <span key="bt" className="font-mono text-xs">
                        {activeConfig.build_target}
                      </span>,
                    ],
                    [
                      "Pinned Worker SHA-256",
                      <span key="sha" className="font-mono text-[11px] break-all">
                        {activeConfig.wasm_sha256}
                      </span>,
                    ],
                    [
                      "FastFS Worker URL",
                      <span key="url" className="font-mono text-[11px] break-all">
                        {activeConfig.wasm_url}
                      </span>,
                    ],
                  ]}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Market configuration unavailable for {activeSymbol}.
                </p>
              )}
            </Panel>
          </div>
          </TechnicalDisclosure>

          <TechnicalDisclosure
            title="Contract reserve accounting"
            description="This checks the contract’s reserve-accounting invariant only; it is not a full security audit or an independent TEE attestation check."
          >
            <ProtocolHealthPanel snapshot={snapshot} accounting={snapshot.accounting} />
          </TechnicalDisclosure>

          <TechnicalDisclosure
            title="Historical execution proof & data methodology"
            description="Static OutLayer execution evidence, source attribution, licensing and benchmark limitations."
          >
            <div className="grid gap-6 lg:grid-cols-2">

            <Panel
              title="Execution proof (historical first Testnet run)"
              actions={
                <Pill tone="muted">
                  Historical record · Request #{HISTORICAL_PROOF_RECORD.requestId}
                </Pill>
              }
            >
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Recorded audit metrics from the first live IMF execution on{" "}
                  <time dateTime={toIsoUtc(HISTORICAL_PROOF_RECORD.storedAtSec) ?? undefined}>
                    {formatUtcTimestamp(HISTORICAL_PROOF_RECORD.storedAtSec)}
                  </time>
                  . This is a static historical record, not live telemetry and not a guarantee of
                  future OutLayer execution costs.
                </p>
                <SafeKV
                  rows={[
                    [
                      "OutLayer Request ID",
                      <span key="rid" className="num text-xs font-semibold">
                        #{HISTORICAL_PROOF_RECORD.requestId}
                      </span>,
                    ],
                    [
                      "Executed Market / Class",
                      <span key="mc" className="font-mono text-xs">
                        {HISTORICAL_PROOF_RECORD.market} · {HISTORICAL_PROOF_RECORD.dataClass}
                      </span>,
                    ],
                    [
                      "Execution / Compile time",
                      <span key="dur" className="num text-xs">
                        {HISTORICAL_PROOF_RECORD.executionDurationMs} ms ·{" "}
                        {HISTORICAL_PROOF_RECORD.compileDurationMs} ms compile
                      </span>,
                    ],
                    [
                      "WASI instructions metered",
                      <span key="ins" className="num text-xs">
                        {formatIntegerCount(HISTORICAL_PROOF_RECORD.instructions)}
                      </span>,
                    ],
                    [
                      "Charge / Refund (Testnet)",
                      <span key="cr" className="num text-xs">
                        {HISTORICAL_PROOF_RECORD.executionChargeNear} NEAR / refunded{" "}
                        {HISTORICAL_PROOF_RECORD.refundNear} NEAR
                      </span>,
                    ],
                    [
                      "Worker SHA-256",
                      <span key="wsha" className="font-mono text-[11px] break-all">
                        {HISTORICAL_PROOF_RECORD.workerSha256}
                      </span>,
                    ],
                    [
                      "Request transaction",
                      <a
                        key="rtx"
                        href={`${TESTNET_EXPLORER_TX_BASE}${HISTORICAL_PROOF_RECORD.requestTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-6 items-center gap-1 font-mono text-xs text-primary underline underline-offset-2 hover:opacity-80"
                      >
                        <span className="break-all">{HISTORICAL_PROOF_RECORD.requestTxHash}</span>
                        <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                        <span className="sr-only">(opens NEAR Testnet Explorer in new tab)</span>
                      </a>,
                    ],
                    [
                      "Deployment transaction",
                      <a
                        key="dtx"
                        href={HISTORICAL_PROOF_RECORD.deployExplorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-6 items-center gap-1 font-mono text-xs text-primary underline underline-offset-2 hover:opacity-80"
                      >
                        <span className="break-all">{HISTORICAL_PROOF_RECORD.deployTxHash}</span>
                        <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                        <span className="sr-only">(opens NEAR Testnet Explorer in new tab)</span>
                      </a>,
                    ],
                  ]}
                />
              </div>
            </Panel>

            {/* Provenance and IMF Disclosures */}
            <Panel title="Provenance, licensing & methodology disclosures">
              <div className="space-y-3 text-xs">
                <blockquote className="rounded-md border-l-2 border-sage bg-muted/40 px-3 py-2 font-medium text-foreground">
                  {IMF_ATTRIBUTION_TEXT}
                </blockquote>
                <ul className="list-disc space-y-1.5 pl-4 text-muted-foreground">
                  <li>
                    <strong className="text-foreground">Historical monthly benchmark:</strong> IMF
                    PCPS <span className="font-mono">PCOFFOTM</span> reflects historical monthly
                    cash averages with an upstream publication lag (~1–2 months), validated against
                    a 90-day (<span className="num">7,776,000 s</span>) freshness policy.
                  </li>
                  <li>
                    <strong className="text-foreground">Not live coffee futures or spot:</strong> Do
                    not interpret this benchmark as live ICE Coffee C futures (
                    <span className="font-mono">KC=F</span>), intraday spot quotes, or real-time
                    market pricing.
                  </li>
                  <li>
                    <strong className="text-foreground">Single-source & non-endorsed:</strong>{" "}
                    Reported by one public publisher (
                    <span className="font-mono">imf-pcps-pcoffotm</span>), not a multi-source
                    aggregated index; public display does not imply IMF endorsement and remains
                    subject to IMF/ICO upstream redistribution terms.
                  </li>
                  <li>
                    <strong className="text-foreground">Synthetic fixture isolation:</strong>{" "}
                    <span className="font-mono">{MARKET_GESHA_DEMO}</span> uses{" "}
                    <span className="font-mono">SYNTHETIC_DEMO</span> strictly for pipeline demos
                    and is never mixed with real market benchmarks or simulated portfolio holdings.
                  </li>
                  <li>
                    <strong className="text-foreground">Testnet-only hackathon MVP:</strong> All
                    contracts run strictly on NEAR Testnet with zero real monetary value and without
                    independent cryptographic verification of TEE hardware attestation quotes.
                  </li>
                </ul>
              </div>
            </Panel>
          </div>
          </TechnicalDisclosure>
        </>
      )}
    </div>
  );
}
