// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { useId, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Ban,
  ChevronDown,
  Flame,
  Info,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  KV,
  MaturityBadge,
  PageHeader,
  Panel,
  Pill,
  Progress,
  Stat,
  Stats,
} from "@/components/kit";
import { formatAgeDuration, formatFixedPoint, parseUnsignedBigInt } from "@/lib/oracle/format";
import {
  GAS_50_TGAS,
  MARKET_ARABICA_PERPS_ID,
  MARKET_ARABICA_URL_SLUG,
  MARKET_GESHA_PERPS_ID,
  MARKET_ROBUSTA_PERPS_ID,
  MINIMUM_LP_SEED_SHARES_E8,
  PERPS_CONTRACT_ID,
  TESTNET_NON_MONETARY_NOTICE,
  THREE_MARKET_CATALOG,
  ZERO_YOCTO_NEAR,
  getMarketFromProtocolSnapshot,
  type ThreeMarketCatalogEntry,
} from "@/lib/perps/config";
import {
  buildAndValidateOrderPreview,
  computeReservedLiquidityE8,
  computeUtilizationBps,
  evaluatePerpsOracleStatus,
  formatBpsAsPercent,
  formatLeverageX100,
  formatSignedFixedPoint,
  formatSizeKgE8,
  formatUsdE8,
  parseSignedBigInt,
  type PerpsOracleStatus,
} from "@/lib/perps/math";
import {
  usePerpsProtocolSnapshot,
  usePerpsTraderSnapshot,
  useRefreshPerpsQueries,
} from "@/lib/perps/queries";
import { executeNearPerpsTx } from "@/lib/perps/tx";
import type {
  NearUserTxRecord,
  PerpsProtocolSnapshot,
  PerpsTraderSnapshot,
  StoredPositionSide,
} from "@/lib/perps/types";
import { useWalletHub } from "@/lib/wallet/context";
import { JudgesWalkthrough } from "./judges-walkthrough";
import { PerpsMarginPanel } from "./margin-panel";
import { PerpsMarketChart } from "./market-chart";
import { TestnetOperatorControls } from "./operator-controls";
import { LivePositionsPanel } from "./positions-panel";
import { TxStatusPanel } from "./tx-status-panel";

function SyntheticOracleBanner({
  oracleStatus,
  marketId = MARKET_ARABICA_PERPS_ID,
  logicalId,
}: {
  oracleStatus: PerpsOracleStatus;
  marketId?: string;
  logicalId?: string;
}) {
  return (
    <Alert className="border-[var(--warn)]/50 bg-[var(--warn-soft)]/25">
      <Flame className="h-4 w-4 text-[var(--warn)]" aria-hidden="true" />
      <AlertTitle className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span>Synthetic execution prices</span>
        <MaturityBadge variant="testnet">TESTNET · SYNTHETIC</MaturityBadge>
      </AlertTitle>
      <AlertDescription className="mt-1 space-y-1 text-xs text-muted-foreground">
        <p>
          {marketId} uses an operator-controlled test price on NEAR Testnet. It is not a live coffee
          quotation or an independent exchange feed. OutLayer is a separate read-only benchmark and
          does not provide this Perpetuals price. Testnet USDC has no monetary value.
        </p>
        <p className="text-foreground/90">{oracleStatus.detail}</p>
      </AlertDescription>
    </Alert>
  );
}

function LpVaultTelemetryPanel({ protocol }: { protocol: PerpsProtocolSnapshot }) {
  const lp = protocol.lpSnapshot;
  const maxUtilBps = protocol.arabicaMarket?.risk.max_utilization_bps ?? 7500;
  const reservedE8 = parseUnsignedBigInt(lp.reserved_liquidity_e8) ?? 0n;
  const mtmEquityE8 = parseSignedBigInt(lp.lp_mtm_equity_e8) ?? 0n;
  const utilBps = computeUtilizationBps(reservedE8, mtmEquityE8);
  const utilPercent = Number(utilBps) / 100;
  const seedShares = parseUnsignedBigInt(lp.lp_locked_seed_shares) ?? 0n;

  return (
    <Panel
      title={
        <span className="flex flex-wrap items-center gap-2">
          <span>LP Vault & Pool Capacity (Read-Only Telemetry)</span>
          <MaturityBadge variant="testnet">PEER-TO-POOL</MaturityBadge>
        </span>
      }
      actions={
        <Pill tone={protocol.solvencyInvariant ? "gain" : "loss"}>
          {protocol.solvencyInvariant ? "Solvency Invariant OK" : "Solvency Check Failed"}
        </Pill>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">LP Pool Utilization vs Safety Cap</span>
            <span className="num font-medium">
              {formatBpsAsPercent(utilBps)} / {formatBpsAsPercent(maxUtilBps)} cap
            </span>
          </div>
          <Progress value={Math.min(100, Number.isFinite(utilPercent) ? utilPercent : 0)} />
        </div>

        <KV
          rows={[
            ["LP Realized Equity", formatUsdE8(lp.lp_vault_realized_equity_e8)],
            ["LP MTM Equity", formatUsdE8(lp.lp_mtm_equity_e8)],
            ["Reserved OI Buffer", formatUsdE8(lp.reserved_liquidity_e8)],
            ["LP Available Liquidity", formatUsdE8(lp.lp_available_liquidity_e8)],
            [
              "Net Bounded Trader Claim",
              formatSignedFixedPoint(lp.net_bounded_trader_claim_e8, 8, { showPlus: true }),
            ],
            ["Total Unrealized Bad Debt", formatUsdE8(lp.total_unrealized_bad_debt_e8)],
            [
              "Locked Seed Shares",
              `${lp.lp_locked_seed_shares} / ${MINIMUM_LP_SEED_SHARES_E8.toString()} minimum seed`,
            ],
            ["Insurance Fund", formatUsdE8(protocol.accounting.insurance_fund_e8)],
          ]}
        />

        <p className="text-[11px] text-muted-foreground">
          {seedShares > 0n
            ? "The first LP deposit permanently locks 10,000 minimum seed shares to protect vault share math against inflation attacks. "
            : ""}
          General LP deposit/withdraw buttons are intentionally disabled for regular traders in the
          hackathon MVP.
        </p>
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
          These are NEAR Testnet contract-accounting values, not real-world liquidity or coffee
          backing. “Solvency Invariant OK” confirms the contract reserve-accounting check only; it
          is not a full security audit or independent verification of market data.
        </p>
      </div>
    </Panel>
  );
}

function LiveMarketOpenOrderForm({
  marketEntry,
  market,
  protocol,
  trader,
  oracleStatus,
  onTxUpdate,
}: {
  marketEntry: ThreeMarketCatalogEntry;
  market: PerpsProtocolSnapshot["arabicaMarket"];
  protocol: PerpsProtocolSnapshot;
  trader: PerpsTraderSnapshot | undefined;
  oracleStatus: PerpsOracleStatus;
  onTxUpdate: (record: NearUserTxRecord) => void;
}) {
  const { near, openHub, sendNearTransaction } = useWalletHub();
  const refreshAll = useRefreshPerpsQueries(near.accountId);

  const defaultPresetSize =
    marketEntry.marketId === MARKET_GESHA_PERPS_ID
      ? "0.04"
      : marketEntry.marketId === MARKET_ROBUSTA_PERPS_ID
        ? "0.20"
        : "0.10";
  const [side, setSide] = useState<StoredPositionSide>("Long");
  const [sizeInput, setSizeInput] = useState(defaultPresetSize);
  const [marginInput, setMarginInput] = useState("0.25");
  const [touched, setTouched] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const sizeId = useId();
  const marginId = useId();
  const errorId = useId();

  const freeCollateralE8 = parseUnsignedBigInt(trader?.account?.free_collateral_e8 ?? "0") ?? 0n;
  const isNearConnected = near.status === "connected" && Boolean(near.accountId);

  const preview = useMemo(
    () =>
      buildAndValidateOrderPreview({
        market,
        lpSnapshot: protocol.lpSnapshot,
        oracleStatus,
        pausedGlobal: protocol.pausedGlobal,
        isNearConnected,
        unsupportedNearNetwork: near.unsupportedNetwork,
        isAccountRegistered: Boolean(trader?.isRegistered),
        accountActionLocked: Boolean(
          trader?.account?.pending_action_lock || trader?.account?.has_pending_withdrawal,
        ),
        freeCollateralE8,
        side,
        sizeInput,
        marginUsdcInput: marginInput,
      }),
    [
      freeCollateralE8,
      isNearConnected,
      marginInput,
      market,
      near.unsupportedNetwork,
      oracleStatus,
      protocol.lpSnapshot,
      protocol.pausedGlobal,
      side,
      sizeInput,
      trader?.account?.has_pending_withdrawal,
      trader?.account?.pending_action_lock,
      trader?.isRegistered,
    ],
  );

  const handleConfirmSubmit = async () => {
    if (!preview.valid || !near.accountId || submitting) return;
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const record = await executeNearPerpsTx({
        actionLabel: `Open ${side} ${formatSizeKgE8(preview.sizeE8)}`,
        flow: "open_position",
        marketId: marketEntry.marketId,
        token: "USDC",
        amountDisplay: `${formatSizeKgE8(preview.sizeE8)} (${formatUsdE8(preview.collateralE8)} margin)`,
        signerId: near.accountId,
        request: {
          receiverId: PERPS_CONTRACT_ID,
          actions: [
            {
              type: "FunctionCall",
              params: {
                methodName: "open_position",
                args: {
                  market_id: marketEntry.marketId,
                  side,
                  size_e8: preview.sizeE8.toString(),
                  collateral_e8: preview.collateralE8.toString(),
                  price_limit_e8: null,
                },
                gas: GAS_50_TGAS,
                deposit: ZERO_YOCTO_NEAR,
              },
            },
          ],
        },
        sendTransaction: sendNearTransaction,
        onPhaseChange: onTxUpdate,
      });
      onTxUpdate(record);

      if (record.phase === "successful") {
        toast.success(`Opened ${side} position on ${marketEntry.marketId}`, {
          description: record.detail,
        });
      } else if (record.phase === "unknown_verification_required") {
        toast.warning("Open order verification required", { description: record.detail });
      } else {
        toast.error("Open position did not finalize", { description: record.detail });
      }
      await refreshAll();
    } finally {
      setSubmitting(false);
    }
  };

  const lpExhaustedOrStale =
    !oracleStatus.isValidForOpen ||
    (parseSignedBigInt(protocol.lpSnapshot.lp_mtm_equity_e8) ?? 0n) <= 0n;

  return (
    <Panel
      title={
        <span className="flex flex-wrap items-center gap-2">
          <span>Open Position Order</span>
          <MaturityBadge variant="testnet">REAL CONTRACT CALL</MaturityBadge>
        </span>
      }
      actions={
        <span className="font-mono text-[11px] text-muted-foreground">
          {market ? `Max ${market.risk.max_leverage}x` : "RPC required"}
        </span>
      }
    >
      <div className="space-y-4">
        <p className="rounded border bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground">
          Orders use operator-controlled synthetic Testnet references, not live coffee quotes.
          Testnet USDC has no monetary value.
        </p>
        <div
          role="tablist"
          aria-label="Order direction"
          className="grid grid-cols-2 gap-1 rounded-md border p-1"
        >
          {(["Long", "Short"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={side === option}
              onClick={() => setSide(option)}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition ${
                side === option
                  ? option === "Long"
                    ? "bg-gain/15 text-gain underline underline-offset-4"
                    : "bg-loss/15 text-loss underline underline-offset-4"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option === "Long" ? (
                <TrendingUp className="size-3.5" aria-hidden="true" />
              ) : (
                <TrendingDown className="size-3.5" aria-hidden="true" />
              )}
              {option}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={sizeId} className="mb-1 block text-xs font-medium">
              Contract Size (kg {marketEntry.displayName.split(" /")[0]})
            </label>
            <Input
              id={sizeId}
              type="text"
              inputMode="decimal"
              value={sizeInput}
              onChange={(e) => setSizeInput(e.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={touched && preview.sizeE8 <= 0n}
              aria-describedby={!preview.valid && preview.blockingReason ? errorId : undefined}
              placeholder={defaultPresetSize}
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <label htmlFor={marginId} className="font-medium">
                Isolated Margin (USDC)
              </label>
              <button
                type="button"
                onClick={() => {
                  setTouched(true);
                  setSizeInput(defaultPresetSize);
                  setMarginInput("0.25");
                }}
                className="cursor-pointer font-mono text-[11px] text-primary hover:underline"
              >
                {defaultPresetSize} kg / $0.25
              </button>
            </div>
            <Input
              id={marginId}
              type="text"
              inputMode="decimal"
              value={marginInput}
              onChange={(e) => setMarginInput(e.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={touched && preview.collateralE8 <= 0n}
              aria-describedby={!preview.valid && preview.blockingReason ? errorId : undefined}
              placeholder="0.25"
            />
          </div>
        </div>

        <KV
          rows={[
            [
              "Index Reference Price",
              preview.indexPriceE8 > 0n ? formatUsdE8(preview.indexPriceE8) : "Unavailable",
            ],
            [
              `Estimated Exec Price (${market?.exec_spread_bps ?? 0} bps spread)`,
              preview.execPriceE8 > 0n ? formatUsdE8(preview.execPriceE8) : "—",
            ],
            ["Notional Exposure", formatUsdE8(preview.notionalFloorE8)],
            [
              market
                ? `Required Initial Margin (${formatBpsAsPercent(market.risk.initial_margin_bps)})`
                : "Required Initial Margin (RPC required)",
              market ? formatUsdE8(preview.requiredInitialMarginE8) : "Unavailable",
            ],
            [
              market
                ? `Estimated Open Fee (${formatBpsAsPercent(market.risk.trade_fee_bps)})`
                : "Estimated Open Fee",
              market ? formatUsdE8(preview.estimatedFeeE8) : "Unavailable",
            ],
            [
              "Total Free Margin Required",
              <span key="tot" className="num font-semibold">
                {formatUsdE8(preview.totalFreeCollateralNeededE8)}
              </span>,
            ],
            ["Effective Leverage", formatLeverageX100(preview.effectiveLeverageX100)],
            [
              "Post-Open LP Utilization",
              preview.postOpenUtilizationBps !== null
                ? `${formatBpsAsPercent(preview.postOpenUtilizationBps)} / ${formatBpsAsPercent(market?.risk.max_utilization_bps ?? 7500)} cap`
                : "—",
            ],
            [
              "Indicative Liquidation Price",
              preview.indicativeLiqPriceE8 && preview.indicativeLiqPriceE8 > 0n
                ? `${formatUsdE8(preview.indicativeLiqPriceE8)} (estimate only)`
                : "—",
            ],
          ]}
        />

        {preview.blockingReason && (
          <Alert
            id={errorId}
            variant={lpExhaustedOrStale ? "destructive" : "default"}
            className="text-xs"
            role="alert"
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle className="text-xs font-semibold">
              {lpExhaustedOrStale ? "Open Orders Blocked" : "Order Pre-Check"}
            </AlertTitle>
            <AlertDescription className="text-xs">{preview.blockingReason}</AlertDescription>
          </Alert>
        )}

        {!isNearConnected ? (
          <Button type="button" className="w-full" onClick={() => openHub("near")}>
            Connect NEAR Testnet Wallet to Trade
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full"
            disabled={!preview.valid || submitting}
            onClick={() => {
              setTouched(true);
              if (preview.valid) setConfirmOpen(true);
            }}
          >
            Review Open {side} Position
          </Button>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm Open {side} Position ({formatSizeKgE8(preview.sizeE8)})
            </DialogTitle>
            <DialogDescription>
              Calls <code className="font-mono">open_position</code> on{" "}
              <code className="font-mono">{PERPS_CONTRACT_ID}</code> for{" "}
              <code className="font-mono">{marketEntry.marketId}</code>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <KV
              rows={[
                ["Market ID", marketEntry.marketId],
                ["Logical Market Slug", marketEntry.logicalId],
                ["Side", side],
                ["Size (e8)", `${preview.sizeE8.toString()} (${formatSizeKgE8(preview.sizeE8)})`],
                [
                  "Collateral (e8)",
                  `${preview.collateralE8.toString()} (${formatUsdE8(preview.collateralE8)})`,
                ],
                ["Estimated Fee", formatUsdE8(preview.estimatedFeeE8)],
                ["Est. Exec Price", formatUsdE8(preview.execPriceE8)],
                ["Gas / Deposit", "50 TGas · 0 NEAR"],
              ]}
            />
            <p className="rounded border bg-muted/40 px-2.5 py-2 text-[11px] text-muted-foreground">
              {TESTNET_NON_MONETARY_NOTICE} Settlement prices derive from{" "}
              <code className="font-mono">TESTNET_SANDBOX_FEED</code> on{" "}
              <code className="font-mono">{marketEntry.marketId}</code>. These are
              operator-controlled synthetic Testnet references, not live coffee quotes.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmSubmit}>
              Confirm & Sign Open {side}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

export function ThreeMarketPerpsIndex() {
  const { near } = useWalletHub();
  const { data: protocol, isLoading, error, refetch: refetchProtocol } = usePerpsProtocolSnapshot();
  const { data: trader } = usePerpsTraderSnapshot(
    near.status === "connected" && !near.unsupportedNetwork ? near.accountId : null,
  );
  const refreshAll = useRefreshPerpsQueries(near.accountId);
  const [latestTx, setLatestTx] = useState<NearUserTxRecord | null>(null);

  const getRegisteredMarket = (marketId: string) =>
    protocol?.markets.includes(marketId) ? getMarketFromProtocolSnapshot(protocol, marketId) : null;

  const arabicaOracleStatus = evaluatePerpsOracleStatus(
    getRegisteredMarket(MARKET_ARABICA_PERPS_ID),
    protocol?.blockTimestampSec ?? null,
  );
  const robustaOracleStatus = evaluatePerpsOracleStatus(
    getRegisteredMarket(MARKET_ROBUSTA_PERPS_ID),
    protocol?.blockTimestampSec ?? null,
  );
  const geshaOracleStatus = evaluatePerpsOracleStatus(
    getRegisteredMarket(MARKET_GESHA_PERPS_ID),
    protocol?.blockTimestampSec ?? null,
  );

  const marketCatalogStates = THREE_MARKET_CATALOG.map((entry) => {
    const m = getRegisteredMarket(entry.marketId);
    // The finalized registry is authoritative; the static catalog is configuration only.
    const isRegistered = Boolean(protocol && m);
    return {
      entry,
      market: m,
      oracleStatus: evaluatePerpsOracleStatus(m, protocol?.blockTimestampSec ?? null),
      isRegistered,
      registryLabel: isRegistered
        ? "REGISTERED ON-CHAIN"
        : protocol
          ? "NOT REGISTERED"
          : error
            ? "UNVERIFIED"
            : "CHECKING RPC",
      registryVariant: isRegistered
        ? ("real" as const)
        : protocol
          ? ("preview" as const)
          : error
            ? ("demo" as const)
            : ("testnet" as const),
    };
  });
  const registeredMarketCount = marketCatalogStates.filter((state) => state.isRegistered).length;
  const freshMarketCount = marketCatalogStates.filter(
    (state) => state.isRegistered && state.oracleStatus.isValidForOpen,
  ).length;
  const staleMarketCount = marketCatalogStates.filter(
    (state) => state.isRegistered && state.oracleStatus.status === "STALE",
  ).length;
  const unavailableMarketCount = Math.max(0, registeredMarketCount - freshMarketCount - staleMarketCount);
  const feedGateLabel = !protocol
    ? error
      ? "Unverified"
      : "Checking"
    : protocol.pausedGlobal
      ? "Paused by contract"
      : registeredMarketCount === 0
        ? "No markets registered"
        : freshMarketCount === 0
          ? "No fresh feed available"
          : "Freshness gate available";
  const feedGateDescription = !protocol
    ? "A finalized Testnet read is required before this status can be confirmed."
    : protocol.pausedGlobal
      ? "The contract-wide pause is active. Market-level checks also apply."
      : registeredMarketCount === 0
        ? "No market registration is confirmed by the contract registry."
        : freshMarketCount === 0
          ? "No registered market has a fresh synthetic tick. New opens that require a valid feed are blocked; existing positions can still be closed."
          : `${freshMarketCount} market(s) have a feed within the age policy. Account, liquidity and risk checks still apply before an order can open.`;

  const arabicaLongOi = parseUnsignedBigInt(protocol?.arabicaMarket?.long_oi_e8 ?? "0") ?? 0n;
  const arabicaShortOi = parseUnsignedBigInt(protocol?.arabicaMarket?.short_oi_e8 ?? "0") ?? 0n;
  const reservedE8 = protocol
    ? (parseUnsignedBigInt(protocol.lpSnapshot.reserved_liquidity_e8) ?? 0n)
    : computeReservedLiquidityE8(arabicaLongOi, arabicaShortOi, 1000);
  const lpMtmE8 = protocol ? (parseSignedBigInt(protocol.lpSnapshot.lp_mtm_equity_e8) ?? 0n) : 0n;
  const utilBps = protocol ? computeUtilizationBps(reservedE8, lpMtmE8) : 0n;

  return (
    <div className="space-y-6">
      <PageHeader
        demo={false}
        title="Coffee Index Perpetuals"
        subtitle="Three coffee perpetual markets on NEAR Testnet. Registration is checked on-chain; execution prices are synthetic test references, not live coffee quotations."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <MaturityBadge variant={protocol ? "testnet" : error ? "demo" : "preview"}>
              {protocol
                ? "CONTRACT STATE READ"
                : error
                  ? "RPC UNAVAILABLE"
                  : "CHECKING RPC"}
            </MaturityBadge>
            <Button type="button" size="sm" variant="outline" onClick={() => void refreshAll()}>
              <RefreshCw className="mr-1.5 size-3.5" aria-hidden="true" />
              Refresh RPC
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle className="text-xs font-semibold">NEAR Testnet RPC Unavailable</AlertTitle>
          <AlertDescription className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span>
              {error.message} Current contract balances and synthetic references are unavailable.
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void refetchProtocol()}
            >
              Retry RPC
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <section aria-label="NEAR Testnet execution status" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0 rounded-lg border bg-card p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">Execution contract</p>
            <Pill tone={protocol ? "gain" : error ? "loss" : "muted"}>
              {protocol ? "Responding" : error ? "Unavailable" : "Checking"}
            </Pill>
          </div>
          <p className="mt-2 break-all font-mono text-xs font-semibold text-foreground">
            {protocol?.contractId ?? PERPS_CONTRACT_ID}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Finalized NEAR Testnet contract state
          </p>
        </div>
        <div className="min-w-0 rounded-lg border bg-card p-3.5">
          <p className="text-xs font-medium text-muted-foreground">Markets registered</p>
          <p className="num mt-2 text-2xl font-semibold">
            {protocol ? `${registeredMarketCount}/3` : "—"}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {protocol ? "Confirmed by the on-chain registry" : "Awaiting finalized registry read"}
          </p>
        </div>
        <div className="min-w-0 rounded-lg border bg-card p-3.5">
          <p className="text-xs font-medium text-muted-foreground">Price-feed freshness</p>
          <p className="num mt-2 text-2xl font-semibold">
            {protocol
              ? registeredMarketCount > 0
                ? `${freshMarketCount}/${registeredMarketCount} fresh`
                : "No registered markets"
              : "—"}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {protocol
              ? `${staleMarketCount} stale · ${unavailableMarketCount} unavailable${staleMarketCount > 0 ? " · operator renewal required" : ""}`
              : "Feed state not yet verified"}
          </p>
        </div>
        <div className="min-w-0 rounded-lg border bg-card p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">New-position feed gate</p>
            <Pill tone={!protocol || registeredMarketCount === 0 ? "muted" : protocol.pausedGlobal || freshMarketCount === 0 ? "warn" : "gain"}>
              {feedGateLabel}
            </Pill>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {feedGateDescription}
          </p>
        </div>
      </section>

      <Stats cols={3}>
        <Stat
          label="Synthetic test prices · USD/kg"
          value={
            isLoading
              ? "Loading..."
              : arabicaOracleStatus.priceE8 ||
                  robustaOracleStatus.priceE8 ||
                  geshaOracleStatus.priceE8
                ? [arabicaOracleStatus, robustaOracleStatus, geshaOracleStatus]
                    .map((st) => (st.priceE8 ? formatUsdE8(st.priceE8, { decimalsShown: 2 }) : "—"))
                    .join(" / ")
                : "Unavailable"
          }
          sub={
            arabicaOracleStatus.priceE8 || robustaOracleStatus.priceE8 || geshaOracleStatus.priceE8
              ? `Arabica (${arabicaOracleStatus.status}) · Robusta (${robustaOracleStatus.status}) · Gesha (${geshaOracleStatus.status})`
              : "Check Testnet RPC"
          }
        />
        <Stat
          label="LP contract accounting"
          value={
            protocol ? (
              protocol.solvencyInvariant ? (
                <span className="text-[var(--gain)]">Reserve check PASS</span>
              ) : (
                <span className="text-[var(--loss)]">Alert</span>
              )
            ) : (
              "Unavailable"
            )
          }
          sub={
            protocol
              ? `${formatUsdE8(protocol.lpSnapshot.lp_mtm_equity_e8)} MTM · ${formatBpsAsPercent(utilBps)} utilization · ${protocol.accounting.total_open_positions} open · accounting check only`
              : "Peer-to-Pool Vault"
          }
        />
        <Stat
          label="Available Contract Margin"
          value={
            near.status === "connected" && !near.unsupportedNetwork
              ? trader?.account
                ? formatUsdE8(trader.account.free_collateral_e8)
                : trader?.isRegistered
                  ? "$0.000000"
                  : "Not Registered"
              : "Wallet Disconnected"
          }
          sub={
            near.status === "connected" && trader
              ? `Wallet balance: ${formatFixedPoint(trader.circleUsdcBalanceUnits, 6, { maxFractionDigits: 4 })} USDC`
              : "Connect NEAR Testnet"
          }
        />
      </Stats>

      <div className="flex items-start gap-2 rounded-lg border bg-muted/35 px-3.5 py-3 text-xs">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Wallet balance is not contract margin.</strong>{" "}
          Wallet USDC is held by your NEAR address. Available contract margin is USDC already
          deposited into the Perpetuals contract and available for trading. Having USDC in your
          wallet does not mean it has been deposited as collateral.
        </p>
      </div>

      <SyntheticOracleBanner oracleStatus={arabicaOracleStatus} />

      <section aria-labelledby="three-markets-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="three-markets-heading" className="text-sm font-semibold">
            {protocol
              ? `Coffee markets · ${registeredMarketCount}/3 registered on-chain`
              : isLoading
                ? "Coffee markets · checking Testnet registry"
                : "Coffee markets · registry unverified"}
          </h2>
          {protocol && (
            <span className="font-mono text-[11px] text-muted-foreground">
              Finalized block {protocol.blockHash.slice(0, 10)}... ·{" "}
              {protocol.rpcEndpoint.replace("https://", "")}
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Registration means the market exists in the contract registry. It does not mean its price
          feed is current or that new positions can open.
        </p>

        <div className="grid gap-4 lg:grid-cols-3">
          {marketCatalogStates.map(
            ({
              entry,
              market: m,
              oracleStatus: entryOracleStatus,
              isRegistered,
              registryLabel,
              registryVariant,
            }) => {
              return (
                <Panel
                  key={entry.urlSlug}
                  className={isRegistered ? "border-primary/40" : undefined}
                  title={
                    <div className="flex min-w-0 flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-base font-semibold">{entry.displayName}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {entry.marketId}
                          </div>
                        </div>
                        <MaturityBadge variant={registryVariant}>
                          {isRegistered ? "REGISTERED ON-CHAIN" : registryLabel}
                        </MaturityBadge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <MaturityBadge variant="testnet">SYNTHETIC PRICE</MaturityBadge>
                        <Pill
                          tone={
                            entryOracleStatus.isValidForOpen
                              ? "gain"
                              : entryOracleStatus.status === "STALE"
                                ? "warn"
                                : "muted"
                          }
                        >
                          {entryOracleStatus.status}
                        </Pill>
                      </div>
                    </div>
                  }
                >
                  <div className="flex h-full flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        {entry.variety} perpetual market on NEAR Testnet. Its price is an
                        operator-controlled demonstration value, not a real-world coffee quotation.
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-md border bg-muted/25 p-3">
                          <p className="text-[11px] font-medium text-muted-foreground">
                            Synthetic test price
                          </p>
                          <p className="num mt-1 text-2xl font-semibold">
                            {entryOracleStatus.priceE8
                              ? formatUsdE8(entryOracleStatus.priceE8)
                              : "Unavailable"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">USD per kg · test reference only</p>
                        </div>
                        <div className="rounded-md border bg-muted/25 p-3">
                          <p className="text-[11px] font-medium text-muted-foreground">Feed age</p>
                          <p className="num mt-1 text-lg font-semibold">
                            {entryOracleStatus.ageSec !== null
                              ? formatAgeDuration(entryOracleStatus.ageSec)
                              : "Unavailable"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Maximum allowed: {formatAgeDuration(entryOracleStatus.maxAgeSec)}
                          </p>
                        </div>
                      </div>
                      {entryOracleStatus.status === "STALE" && isRegistered && (
                        <p className="text-xs font-medium text-[var(--warn)]">
                          Feed is too old for new opens. Existing positions can still be closed.
                        </p>
                      )}
                      <div className="rounded-md border px-3 py-2.5">
                        <p className="text-[11px] text-muted-foreground">Open interest · Long / Short</p>
                        <p className="num mt-1 text-sm font-semibold">
                          {m
                            ? `${formatUsdE8(m.long_oi_e8, { decimalsShown: 2 })} / ${formatUsdE8(m.short_oi_e8, { decimalsShown: 2 })}`
                            : "Not available until registration is verified"}
                        </p>
                      </div>
                      <details className="group rounded-md border">
                        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                          <span>Market rules & data source</span>
                          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                        </summary>
                        <div className="space-y-2 border-t px-3 py-3">
                          <KV
                            rows={[
                              [
                                "Maximum leverage / initial / maintenance margin",
                                m
                                  ? `${m.risk.max_leverage}x · ${formatBpsAsPercent(m.risk.initial_margin_bps)} · ${formatBpsAsPercent(m.risk.maintenance_margin_bps)}`
                                  : "Unavailable",
                              ],
                              ["Collateral token", "Circle Native Testnet USDC (6 decimals)"],
                              ["Feed classification", "TESTNET_SANDBOX_FEED · synthetic"],
                              ["Market registration", isRegistered ? "Confirmed by finalized contract registry" : "Not yet confirmed"],
                            ]}
                          />
                          <p className="text-[11px] leading-relaxed text-muted-foreground">{entry.oracleNote}</p>
                        </div>
                      </details>
                    </div>
                    <Link
                      to="/app/perps/$market"
                      params={{ market: entry.urlSlug }}
                      className={`inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium transition ${
                        isRegistered
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border bg-background hover:bg-muted"
                      }`}
                    >
                      <span>
                        {isRegistered
                          ? `Open ${entry.displayName} (Testnet)`
                          : protocol
                            ? `Inspect ${entry.displayName} (Not Registered)`
                            : `Inspect ${entry.displayName} (Unverified)`}
                      </span>
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </Panel>
              );
            },
          )}
        </div>
      </section>

      {protocol && (
        <details className="group overflow-hidden rounded-lg border bg-card">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Advanced protocol telemetry & configuration</span>
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                LP accounting, utilization, collateral contract, operator and treasury addresses.
              </span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="grid gap-4 border-t p-4 lg:grid-cols-2">

          <LpVaultTelemetryPanel protocol={protocol} />
          <Panel
            title={
              <span className="flex flex-wrap items-center gap-2">
                <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                <span>Protocol Configuration & Testnet Disclosures</span>
              </span>
            }
          >
            <div className="space-y-3">
              <KV
                rows={[
                  [
                    "Perpetuals Contract",
                    <span key="pc" className="font-mono text-xs">
                      {protocol.contractId}
                    </span>,
                  ],
                  [
                    "Collateral Token",
                    <span key="ct" className="font-mono text-xs">
                      {protocol.collateralTokenId.slice(0, 14)}... (USDC)
                    </span>,
                  ],
                  [
                    "Tracked USDC Vault",
                    formatFixedPoint(protocol.contractUsdcBalanceUnits, 6, {
                      maxFractionDigits: 6,
                    }) + " USDC",
                  ],
                  [
                    "Admin / Operator",
                    <span key="ad" className="font-mono text-xs">
                      {protocol.admin}
                    </span>,
                  ],
                  [
                    "Treasury",
                    <span key="tr" className="font-mono text-xs">
                      {protocol.treasury}
                    </span>,
                  ],
                  ["Registered Markets", protocol.markets.join(", ")],
                ]}
              />
              <p className="text-[11px] text-muted-foreground">{TESTNET_NON_MONETARY_NOTICE}</p>
            </div>
          </Panel>
        
          </div>
        </details>
      )}

      <details className="group overflow-hidden rounded-lg border bg-card">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Hackathon demo walkthrough · 11 verifiable steps</span>
            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
              A guided technical inspection of wallet, markets, oracle guards and on-chain flows.
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t p-4">
          <JudgesWalkthrough protocol={protocol} defaultExpanded={true} />
        </div>
      </details>

      <details className="group overflow-hidden rounded-lg border bg-card">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block text-sm font-semibold">On-chain transaction lifecycle & proof</span>
            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
              Wallet-signed Testnet actions, finality checks and Explorer receipts for this session.
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t p-4">
          <TxStatusPanel activeTx={latestTx} onAfterVerify={() => void refreshAll()} />
        </div>
      </details>
    </div>
  );
}

export function PerpsLiveMarketView({
  marketEntry = THREE_MARKET_CATALOG[0],
}: {
  marketEntry?: ThreeMarketCatalogEntry;
}) {
  const { near } = useWalletHub();
  const {
    data: protocol,
    isLoading: protocolLoading,
    error: protocolError,
    refetch: refetchProtocol,
  } = usePerpsProtocolSnapshot();
  const isNearValid = near.status === "connected" && !near.unsupportedNetwork;
  const { data: trader, isLoading: traderLoading } = usePerpsTraderSnapshot(
    isNearValid ? near.accountId : null,
  );
  const refreshAll = useRefreshPerpsQueries(near.accountId);
  const [latestTx, setLatestTx] = useState<NearUserTxRecord | null>(null);

  const marketSnapshot = protocol?.markets.includes(marketEntry.marketId)
    ? getMarketFromProtocolSnapshot(protocol, marketEntry.marketId)
    : null;
  const isRegistered = Boolean(protocol && marketSnapshot);
  const market = isRegistered ? marketSnapshot : null;
  const registryLabel = isRegistered
    ? "REGISTERED ON-CHAIN"
    : protocol
      ? "NOT REGISTERED"
      : protocolError
        ? "UNVERIFIED"
        : "CHECKING RPC";
  const registryVariant = isRegistered
    ? ("real" as const)
    : protocol
      ? ("preview" as const)
      : protocolError
        ? ("demo" as const)
        : ("testnet" as const);
  const oracleStatus = evaluatePerpsOracleStatus(market, protocol?.blockTimestampSec ?? null);

  return (
    <div className="space-y-6">
      <PageHeader
        demo={false}
        crumbs={[{ label: "Perpetuals", to: "/app/perps" }, { label: marketEntry.marketId }]}
        title={marketEntry.displayName}
        subtitle={`${marketEntry.marketId}${
          marketEntry.logicalId !== marketEntry.marketId
            ? ` (logical ID ${marketEntry.logicalId})`
            : ""
        } · NEAR Testnet Perpetuals Terminal. Operator-controlled synthetic Testnet references, not live coffee quotes. Testnet USDC has no monetary value.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <MaturityBadge variant={registryVariant}>{registryLabel}</MaturityBadge>
            <MaturityBadge variant="testnet">SYNTHETIC ORACLE</MaturityBadge>
            <Button type="button" size="sm" variant="outline" onClick={() => void refreshAll()}>
              <RefreshCw className="mr-1.5 size-3.5" aria-hidden="true" />
              Refresh RPC
            </Button>
          </div>
        }
      />

      {protocolError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle className="text-xs font-semibold">
            Failed to Load {marketEntry.displayName} Market State from NEAR Testnet RPC
          </AlertTitle>
          <AlertDescription className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span>{protocolError.message}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void refetchProtocol()}
            >
              Retry RPC
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <SyntheticOracleBanner
        oracleStatus={oracleStatus}
        marketId={marketEntry.marketId}
        logicalId={marketEntry.logicalId}
      />

      <Stats cols={4}>
        <Stat
          label="Synthetic Index Price"
          value={
            protocolLoading
              ? "Loading..."
              : oracleStatus.priceE8
                ? `${formatUsdE8(oracleStatus.priceE8)}/kg`
                : "Unavailable"
          }
          sub={
            <>
              <span className="block">
                Operator-controlled synthetic Testnet reference · not live coffee quotes.
              </span>
              <span className="block">Testnet USDC has no monetary value.</span>
              <span className="block">
                {oracleStatus.observedAtSec
                  ? `Seq #${oracleStatus.sequence ?? 0} · Age ${oracleStatus.ageSec ?? 0}s / ${oracleStatus.maxAgeSec}s`
                  : "No tick recorded"}
              </span>
            </>
          }
        />
        <Stat
          label="Market Mode & Policy"
          value={market ? market.mode : "Loading..."}
          sub={
            market
              ? `Spread ${market.exec_spread_bps} bps · Fee ${market.risk.trade_fee_bps} bps · ${market.risk.max_leverage}x max`
              : "NEAR Testnet"
          }
        />
        <Stat
          label="Open Interest (Long / Short)"
          value={
            market
              ? `${formatUsdE8(market.long_oi_e8, { decimalsShown: 2 })} / ${formatUsdE8(market.short_oi_e8, { decimalsShown: 2 })}`
              : "—"
          }
          sub={
            market
              ? `${market.open_positions} open positions · Funding idx ${market.cum_funding_index_e12}`
              : "Loading OI"
          }
        />
        <Stat
          label="LP Available Liquidity"
          value={protocol ? formatUsdE8(protocol.lpSnapshot.lp_available_liquidity_e8) : "—"}
          sub={
            protocol
              ? `MTM Equity ${formatUsdE8(protocol.lpSnapshot.lp_mtm_equity_e8)}`
              : "Peer-to-Pool"
          }
        />
      </Stats>

      <PerpsMarketChart
        market={market}
        marketId={marketEntry.marketId}
        blockTimestampSec={protocol?.blockTimestampSec ?? null}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <LivePositionsPanel
            protocol={protocol}
            trader={trader}
            traderLoading={traderLoading}
            onTxUpdate={setLatestTx}
          />

          {protocol && <LpVaultTelemetryPanel protocol={protocol} />}

          <TxStatusPanel activeTx={latestTx} onAfterVerify={() => void refreshAll()} />
        </div>

        <div className="space-y-6 lg:col-span-5">
          {protocol && market ? (
            <LiveMarketOpenOrderForm
              marketEntry={marketEntry}
              market={market}
              protocol={protocol}
              trader={trader}
              oracleStatus={oracleStatus}
              onTxUpdate={setLatestTx}
            />
          ) : protocol && !market ? (
            <Panel title="Open Position Order">
              <p className="text-xs text-muted-foreground">
                Market <code className="font-mono">{marketEntry.marketId}</code> is not registered
                on <code className="font-mono">{PERPS_CONTRACT_ID}</code>; order placement is
                disabled until on-chain registration is verified. Prices use operator-controlled
                synthetic Testnet references, not live coffee quotes. Testnet USDC has no monetary
                value.
              </p>
            </Panel>
          ) : (
            <Panel title="Open Position Order">
              <p className="text-xs text-muted-foreground">
                Waiting for finalized market parameters from NEAR Testnet RPC. Prices use
                operator-controlled synthetic Testnet references, not live coffee quotes. Testnet
                USDC has no monetary value.
              </p>
            </Panel>
          )}

          <PerpsMarginPanel
            protocol={protocol}
            trader={trader}
            traderLoading={traderLoading}
            onTxUpdate={setLatestTx}
          />

          <TestnetOperatorControls
            protocol={protocol}
            trader={trader}
            marketId={marketEntry.marketId}
            onTxUpdate={setLatestTx}
          />
        </div>
      </div>

      {market && (
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Activity className="size-4 text-primary" aria-hidden="true" />
              <span>
                On-Chain Risk Parameters (<code className="font-mono">{marketEntry.marketId}</code>)
              </span>
            </span>
          }
        >
          <KV
            rows={[
              ["Market ID", market.market_id],
              ["Max Leverage", `${market.risk.max_leverage}x`],
              ["Initial Margin (IM)", formatBpsAsPercent(market.risk.initial_margin_bps)],
              ["Maintenance Margin (MM)", formatBpsAsPercent(market.risk.maintenance_margin_bps)],
              ["Trade Fee", formatBpsAsPercent(market.risk.trade_fee_bps)],
              ["Execution Spread", formatBpsAsPercent(market.exec_spread_bps)],
              ["Max Pool Utilization", formatBpsAsPercent(market.risk.max_utilization_bps)],
              ["Matched Gap Buffer", formatBpsAsPercent(market.risk.matched_gap_buffer_bps)],
              [
                "Liquidation Keeper / Insurance Fee",
                `${formatBpsAsPercent(market.risk.liq_keeper_fee_bps)} / ${formatBpsAsPercent(market.risk.liq_insurance_fee_bps)}`,
              ],
              ["Max Execution Oracle Age", `${market.oracle_policy.max_execution_age_sec}s`],
              ["Oracle Feed Classification", market.feed_classification],
            ]}
          />
        </Panel>
      )}
    </div>
  );
}

export function ArabicaLiveMarketView() {
  return <PerpsLiveMarketView marketEntry={THREE_MARKET_CATALOG[0]} />;
}

export function PreviewCoffeeMarketView({ entry }: { entry: ThreeMarketCatalogEntry }) {
  return (
    <div className="space-y-6">
      <PageHeader
        demo={false}
        crumbs={[{ label: "Perpetuals", to: "/app/perps" }, { label: entry.marketId }]}
        title={entry.displayName}
        subtitle={`${entry.marketId} (${entry.variety}) · Roadmap Preview Market`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <MaturityBadge variant="preview">PREVIEW</MaturityBadge>
            <MaturityBadge variant="demo">ROADMAP</MaturityBadge>
          </div>
        }
      />

      <Alert className="border-[var(--warn)]/40 bg-[var(--warn-soft)]/20">
        <Info className="h-4 w-4" aria-hidden="true" />
        <AlertTitle className="text-xs font-semibold">
          Preview Market Only — Not Deployed on {PERPS_CONTRACT_ID}
        </AlertTitle>
        <AlertDescription className="mt-1 text-xs text-muted-foreground">
          {entry.description} {entry.oracleNote} No fake bid/ask prices, funding rates, or open
          interest metrics are synthesized here.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-12">
        <Panel className="lg:col-span-7" title="Planned Market Specifications & Roadmap">
          <div className="space-y-4">
            <KV
              rows={[
                ["Market Identifier", entry.marketId],
                ["Botanical Variety", entry.variety],
                ["Quote Unit", entry.unit],
                ["Settlement Collateral", "Circle Native USDC (NEP-141, 6 decimals)"],
                ["Current Contract Status", "Not registered on perps-v1.roastake-dev-mta.testnet"],
                ["Target Oracle Architecture", "Gate 4 multi-source OutLayer TEE index feed"],
                [
                  "Order Execution",
                  <Pill key="dis" tone="muted">
                    Disabled in Preview
                  </Pill>,
                ],
              ]}
            />
            <div className="pt-2">
              <Link
                to="/app/perps/$market"
                params={{ market: MARKET_ARABICA_URL_SLUG }}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Switch to Live Arabica / USD Testnet Market
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Panel>

        <Panel className="lg:col-span-5" title="Order Entry (Disabled)">
          <div className="space-y-3 opacity-75">
            <div className="rounded-md border border-dashed p-4 text-center space-y-2">
              <Ban className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
              <p className="text-xs font-medium">Trading Disabled for {entry.displayName}</p>
              <p className="text-[11px] text-muted-foreground">
                This market is part of Roastake&apos;s multi-origin coffee expansion roadmap and has
                no active price feed or pool allocation on NEAR Testnet.
              </p>
            </div>
            <Button type="button" disabled className="w-full">
              Order Placement Unavailable in Preview
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
