// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Info, ShieldAlert, XCircle } from "lucide-react";
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
import { Empty, KV, MaturityBadge, Panel, Pill } from "@/components/kit";
import { parseUnsignedBigInt } from "@/lib/oracle/format";
import {
  GAS_50_TGAS,
  MARKET_ARABICA_URL_SLUG,
  PERPS_CONTRACT_ID,
  ZERO_YOCTO_NEAR,
  getMarketFromProtocolSnapshot,
} from "@/lib/perps/config";
import {
  formatBpsAsPercent,
  formatSignedFixedPoint,
  formatSizeKgE8,
  formatUsdE8,
} from "@/lib/perps/math";
import { useRefreshPerpsQueries } from "@/lib/perps/queries";
import { executeNearPerpsTx } from "@/lib/perps/tx";
import type {
  NearUserTxRecord,
  PerpsProtocolSnapshot,
  PerpsTraderSnapshot,
  PositionWithHealth,
} from "@/lib/perps/types";
import { useWalletHub } from "@/lib/wallet/context";

export function LivePositionsPanel({
  protocol,
  trader,
  traderLoading,
  onTxUpdate,
}: {
  protocol: PerpsProtocolSnapshot | undefined;
  trader: PerpsTraderSnapshot | undefined;
  traderLoading: boolean;
  onTxUpdate?: (record: NearUserTxRecord) => void;
}) {
  const { near, openHub, sendNearTransaction } = useWalletHub();
  const refreshAll = useRefreshPerpsQueries(near.accountId);
  const headingId = useId();
  const [closingTarget, setClosingTarget] = useState<PositionWithHealth | null>(null);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const isConnected = near.status === "connected" && Boolean(near.accountId) && !near.unsupportedNetwork;
  const positions = trader?.positions ?? [];
  const defaultMarket = protocol?.arabicaMarket;
  const pausedGlobal = Boolean(protocol?.pausedGlobal);
  const anyPositionMarketEmergency = positions.some(
    (item) => getMarketFromProtocolSnapshot(protocol, item.record.market_id)?.mode === "Emergency",
  );
  const anyMarketReduceOnly =
    positions.length > 0
      ? positions.some(
          (item) =>
            getMarketFromProtocolSnapshot(protocol, item.record.market_id)?.mode === "ReduceOnly",
        )
      : defaultMarket?.mode === "ReduceOnly";
  const summaryMarket =
    (positions[0]
      ? getMarketFromProtocolSnapshot(protocol, positions[0].record.market_id)
      : null) ?? defaultMarket;
  const closingTargetMarket = closingTarget
    ? getMarketFromProtocolSnapshot(protocol, closingTarget.record.market_id) ?? defaultMarket
    : defaultMarket;

  const handleConfirmClose = async () => {
    if (!closingTarget || !near.accountId || submittingId !== null) return;
    const item = closingTarget;
    setClosingTarget(null);
    setSubmittingId(item.record.id);
    try {
      const record = await executeNearPerpsTx({
        actionLabel: `Close ${item.record.side} #${item.record.id}`,
        flow: "close_position",
        marketId: item.record.market_id,
        token: "USDC",
        amountDisplay: formatSizeKgE8(item.record.size_e8),
        signerId: near.accountId,
        request: {
          receiverId: PERPS_CONTRACT_ID,
          actions: [
            {
              type: "FunctionCall",
              params: {
                methodName: "close_position",
                args: {
                  position_id: item.record.id,
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
      onTxUpdate?.(record);

      if (record.phase === "successful") {
        toast.success(`Position #${item.record.id} closed on NEAR Testnet`, {
          description: record.detail,
        });
      } else if (record.phase === "unknown_verification_required") {
        toast.warning("Close verification pending", { description: record.detail });
      } else {
        toast.error(`Failed to close position #${item.record.id}`, { description: record.detail });
      }
      await refreshAll();
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <Panel
      title={
        <span id={headingId} className="flex flex-wrap items-center gap-2">
          <span>Live Open Perpetual Positions</span>
          <MaturityBadge variant="testnet">NEAR TESTNET</MaturityBadge>
        </span>
      }
      actions={
        <div className="flex items-center gap-2 text-xs">
          {anyMarketReduceOnly && (
            <Pill tone="warn">ReduceOnly · Close Allowed</Pill>
          )}
          <span className="font-mono text-muted-foreground">
            Open: {positions.length}
          </span>
        </div>
      }
    >
      {!isConnected ? (
        <Empty
          text="Connect a NEAR Testnet wallet to load live Perpetuals positions from perps-v1.roastake-dev-mta.testnet."
          action={
            <Button type="button" size="sm" onClick={() => openHub("near")}>
              Connect NEAR Testnet
            </Button>
          }
        />
      ) : traderLoading && !trader ? (
        <p className="text-xs text-muted-foreground">
          Querying <code className="font-mono">get_positions_by_owner</code> on NEAR Testnet RPC...
        </p>
      ) : positions.length === 0 ? (
        <Empty
          text={`No open Perpetuals positions for ${near.accountId} on NEAR Testnet.`}
          action={
            <Link
              to="/app/perps/$market"
              params={{ market: MARKET_ARABICA_URL_SLUG }}
              className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium hover:bg-muted"
            >
              Open Arabica / USD Terminal
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {anyPositionMarketEmergency && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              <AlertTitle className="text-xs">Market In Emergency Mode</AlertTitle>
              <AlertDescription className="text-xs">
                Emergency settlement freezes market prices. Standard <code className="font-mono">close_position</code>{" "}
                is disabled; use emergency settlement procedures when enabled.
              </AlertDescription>
            </Alert>
          )}

          <div
            role="region"
            aria-labelledby={headingId}
            tabIndex={0}
            className="overflow-x-auto rounded-md border"
          >
            <table className="w-full min-w-[780px] border-collapse text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">ID / Side</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Size</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Entry / Ref</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Locked Margin</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">uPnL / Funding</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Equity / Margin Ratio</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Indicative Liq</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {positions.map((item) => {
                  const { record, health } = item;
                  const positionMarket =
                    getMarketFromProtocolSnapshot(protocol, record.market_id) ?? defaultMarket;
                  const positionEmergency = positionMarket?.mode === "Emergency";
                  const mmBps = positionMarket?.risk.maintenance_margin_bps ?? 800;
                  const canClose =
                    !pausedGlobal &&
                    !positionEmergency &&
                    !record.locked &&
                    !trader?.account?.pending_action_lock &&
                    submittingId !== record.id;

                  const ratioBelowMm =
                    health !== null && health.margin_ratio_bps < mmBps;

                  return (
                    <tr key={record.id} className="align-top">
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[11px] text-muted-foreground">
                            #{record.id}
                          </span>
                          <Pill tone={record.side === "Long" ? "gain" : "loss"}>
                            {record.side}
                          </Pill>
                          <Pill
                            tone={
                              record.locked
                                ? "warn"
                                : health?.liquidatable_at_reference
                                  ? "loss"
                                  : "info"
                            }
                          >
                            {record.locked
                              ? "Locked"
                              : health?.liquidatable_at_reference
                                ? "Liquidatable"
                                : "Open"}
                          </Pill>
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                          {record.market_id} · Fee {formatBpsAsPercent(positionMarket?.risk.trade_fee_bps ?? 10)}
                        </div>
                      </td>
                      <td className="num px-3 py-2.5 text-right font-medium">
                        <div>{formatSizeKgE8(record.size_e8)}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatUsdE8(record.notional_e8)}
                        </div>
                      </td>
                      <td className="num px-3 py-2.5 text-right">
                        <div>{formatUsdE8(record.entry_price_e8)}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {health ? `Ref ${formatUsdE8(health.reference_price_e8)}` : "Ref unavailable"}
                        </div>
                      </td>
                      <td className="num px-3 py-2.5 text-right font-medium">
                        {formatUsdE8(record.locked_margin_e8)}
                      </td>
                      <td className="num px-3 py-2.5 text-right">
                        {health ? (
                          <>
                            <div
                              className={
                                health.unrealized_pnl_e8.startsWith("-")
                                  ? "text-[var(--loss)]"
                                  : health.unrealized_pnl_e8 === "0"
                                    ? "text-foreground"
                                    : "text-[var(--gain)]"
                              }
                            >
                              {formatUsdE8(health.unrealized_pnl_e8, { showPlus: true })}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Fund{" "}
                              {formatSignedFixedPoint(health.funding_net_e8, 8, {
                                showPlus: true,
                                maxFractionDigits: 6,
                              })}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Health N/A</span>
                        )}
                      </td>
                      <td className="num px-3 py-2.5 text-right">
                        {health ? (
                          <>
                            <div className="font-medium">{formatUsdE8(health.equity_e8)}</div>
                            <div
                              className={`text-[11px] ${
                                health.liquidatable_at_reference || ratioBelowMm
                                  ? "font-semibold text-[var(--loss)]"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {formatBpsAsPercent(health.margin_ratio_bps)} (MM{" "}
                              {formatBpsAsPercent(mmBps)})
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="num px-3 py-2.5 text-right">
                        {health?.indicative_liquidation_price_e8 &&
                        (parseUnsignedBigInt(health.indicative_liquidation_price_e8) ?? 0n) > 0n ? (
                          <div>
                            <span>{formatUsdE8(health.indicative_liquidation_price_e8)}</span>
                            <div className="text-[10px] text-muted-foreground">Indicative</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Indicative N/A</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant={health?.liquidatable_at_reference ? "destructive" : "outline"}
                          disabled={!canClose}
                          onClick={() => setClosingTarget(item)}
                        >
                          <XCircle className="mr-1 size-3.5" aria-hidden="true" />
                          Close
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>
              Indicative liquidation price reflects entry margin plus accrued funding and{" "}
              {summaryMarket ? formatBpsAsPercent(summaryMarket.risk.maintenance_margin_bps) : "8.00%"} MM; actual on-chain
              liquidation eligibility evaluates MTM equity against maintenance margin at the active
              oracle price.
            </span>
          </p>
        </div>
      )}

      <Dialog open={Boolean(closingTarget)} onOpenChange={(open) => !open && setClosingTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm Close Position #{closingTarget?.record.id} ({closingTarget?.record.side})
            </DialogTitle>
            <DialogDescription>
              Calls <code className="font-mono">close_position</code> on{" "}
              <code className="font-mono">{PERPS_CONTRACT_ID}</code> to settle PnL, funding, and
              close fee into your Free Collateral balance.
            </DialogDescription>
          </DialogHeader>
          {closingTarget && (
            <div className="space-y-3 text-xs">
              <KV
                rows={[
                  ["Contract", PERPS_CONTRACT_ID],
                  ["Market", closingTarget.record.market_id],
                  ["Side / Size", `${closingTarget.record.side} · ${formatSizeKgE8(closingTarget.record.size_e8)}`],
                  ["Entry Price", formatUsdE8(closingTarget.record.entry_price_e8)],
                  [
                    "Reference Price",
                    closingTarget.health
                      ? formatUsdE8(closingTarget.health.reference_price_e8)
                      : "Evaluated at on-chain close execution",
                  ],
                  [
                    "Estimated Equity",
                    closingTarget.health ? formatUsdE8(closingTarget.health.equity_e8) : "Computed on-chain",
                  ],
                  ["Gas / Deposit", "50 TGas · 0 NEAR"],
                ]}
              />
              {closingTargetMarket?.mode === "ReduceOnly" && (
                <p className="flex items-start gap-1.5 rounded border border-[var(--warn)]/40 bg-[var(--warn-soft)]/25 px-2.5 py-2 text-[11px]">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[var(--warn)]" aria-hidden="true" />
                  <span>
                    Market is currently in ReduceOnly mode: closing existing positions remains
                    enabled on-chain.
                  </span>
                </p>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setClosingTarget(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmClose}>
              Confirm & Sign Close (#{closingTarget?.record.id})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
