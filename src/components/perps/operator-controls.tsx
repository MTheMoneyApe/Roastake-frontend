// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { useId, useMemo, useState } from "react";
import { AlertTriangle, Coins, Flame, ShieldCheck, Vault, WalletCards } from "lucide-react";
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
import { KV, MaturityBadge, Panel, Pill } from "@/components/kit";
import { formatFixedPoint, parseUnsignedBigInt } from "@/lib/oracle/format";
import {
  CIRCLE_TESTNET_USDC_ID,
  GAS_100_TGAS,
  GAS_50_TGAS,
  MARKET_ARABICA_PERPS_ID,
  MARKET_GESHA_PERPS_ID,
  MARKET_ROBUSTA_PERPS_ID,
  ONE_YOCTO_NEAR,
  PERPS_CONTRACT_ID,
  TESTNET_NON_MONETARY_NOTICE,
  ZERO_YOCTO_NEAR,
  getMarketFromProtocolSnapshot,
  isAuthorizedOperatorAdmin,
} from "@/lib/perps/config";
import {
  buildLpDepositArgs,
  evaluatePerpsOracleStatus,
  formatUsdE8,
  formatUsdcUnits,
  parseDecimalToFixedBigInt,
} from "@/lib/perps/math";
import { useRefreshPerpsQueries } from "@/lib/perps/queries";
import { fetchFreshFinalizedBlockTimestampSec } from "@/lib/perps/rpc";
import { executeNearPerpsTx } from "@/lib/perps/tx";
import type {
  NearUserTxRecord,
  PerpsProtocolSnapshot,
  PerpsTraderSnapshot,
} from "@/lib/perps/types";
import type { NearTransactionRequest } from "@/lib/wallet/types";
import { useWalletHub } from "@/lib/wallet/context";

const DEFAULT_SANDBOX_ARABICA_PRICE_E8 = "1000000000"; // $10.00/kg
const DEFAULT_LP_SEED_INPUT = "2.000000";

interface PendingOperatorAction {
  title: string;
  summary: string;
  actionLabel: string;
  flow: "push_sandbox_oracle_price" | "lp_deposit" | "withdraw_lp";
  tokenSymbol: string;
  amountDisplay: string;
  request: NearTransactionRequest;
  technicalRows: [string, string][];
}

export function TestnetOperatorControls({
  protocol,
  trader,
  marketId = MARKET_ARABICA_PERPS_ID,
  onTxUpdate,
}: {
  protocol: PerpsProtocolSnapshot | undefined;
  trader: PerpsTraderSnapshot | undefined;
  marketId?: string;
  onTxUpdate?: (record: NearUserTxRecord) => void;
}) {
  const { near, sendNearTransaction } = useWalletHub();
  const refreshAll = useRefreshPerpsQueries(near.accountId);

  const [lpAmountInput, setLpAmountInput] = useState(DEFAULT_LP_SEED_INPUT);
  const [lpTouched, setLpTouched] = useState(false);
  const [lpSharesInput, setLpSharesInput] = useState("");
  const [lpSharesTouched, setLpSharesTouched] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingOperatorAction | null>(null);
  const [preparingOracle, setPreparingOracle] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const lpInputId = useId();
  const lpErrorId = useId();
  const lpSharesId = useId();
  const lpSharesErrorId = useId();

  const authorized = isAuthorizedOperatorAdmin({
    nearStatus: near.status,
    unsupportedNetwork: near.unsupportedNetwork,
    connectedAccountId: near.accountId,
    contractAdmin: protocol?.admin,
  });

  const walletUsdcUnits = parseUnsignedBigInt(trader?.circleUsdcBalanceUnits ?? "0") ?? 0n;
  const redeemableShares = parseUnsignedBigInt(trader?.account?.lp_shares ?? "0") ?? 0n;
  const lockedSeedShares = protocol?.lpSnapshot.lp_locked_seed_shares ?? "10000";
  const isLocked = Boolean(
    trader?.account?.pending_action_lock || trader?.account?.has_pending_withdrawal,
  );
  const pausedGlobal = Boolean(protocol?.pausedGlobal);
  const market = getMarketFromProtocolSnapshot(protocol, marketId);
  const oracleStatus = evaluatePerpsOracleStatus(market, protocol?.blockTimestampSec ?? null);
  const fallbackOraclePriceE8 =
    marketId === MARKET_ROBUSTA_PERPS_ID
      ? "500000000"
      : marketId === MARKET_GESHA_PERPS_ID
        ? "2500000000"
        : DEFAULT_SANDBOX_ARABICA_PRICE_E8;

  const lpDepositError = useMemo(() => {
    if (!lpTouched && lpAmountInput.trim() === "") return null;
    if (lpAmountInput.trim() === "") return "Enter an LP seed USDC amount.";
    const parsed = parseDecimalToFixedBigInt(lpAmountInput, 6);
    if (parsed === null || parsed <= 0n) {
      return "Enter a valid positive USDC amount (up to 6 decimals).";
    }
    if (parsed > walletUsdcUnits) {
      return `Exceeds operator Circle USDC balance (${formatUsdcUnits(walletUsdcUnits)}).`;
    }
    return null;
  }, [lpAmountInput, lpTouched, walletUsdcUnits]);

  const lpWithdrawError = useMemo(() => {
    if (!lpSharesTouched && lpSharesInput.trim() === "") return null;
    if (lpSharesInput.trim() === "") return "Enter redeemable LP shares (u128 integer) to burn.";
    const parsed = parseUnsignedBigInt(lpSharesInput);
    if (parsed === null || parsed <= 0n) {
      return "Shares must be a positive integer.";
    }
    if (parsed > redeemableShares) {
      return `Exceeds your redeemable LP shares (${redeemableShares.toString()}). Locked seed shares (${lockedSeedShares}) cannot be burned.`;
    }
    return null;
  }, [lockedSeedShares, lpSharesInput, lpSharesTouched, redeemableShares]);

  // Strict security requirement: never render administrative controls for non-operator wallets.
  if (!authorized || !protocol || !near.accountId) {
    return null;
  }
  const operatorAccountId = near.accountId;

  const handlePrepareOracleRefresh = async () => {
    if (!market || preparingOracle || submitting) return;
    setPreparingOracle(true);
    try {
      const freshBlock = await fetchFreshFinalizedBlockTimestampSec().catch(() => ({
        blockHash: protocol.blockHash,
        blockTimestampSec: protocol.blockTimestampSec,
      }));
      const prevObsSec = market.last_valid_observed_sec ?? 0;
      const observedAtSec = Math.max(freshBlock.blockTimestampSec, prevObsSec);
      const nextSequence = (market.sandbox_sequence ?? 0) + 1;
      const priceE8 = market.last_valid_price_e8 ?? fallbackOraclePriceE8;

      setPendingAction({
        title: `Refresh Synthetic Oracle Tick (${marketId})`,
        summary: `Publishes ${formatUsdE8(priceE8)}/kg (TESTNET_SANDBOX_FEED) sequence #${nextSequence} for ${marketId} from admin operator ${near.accountId}.`,
        actionLabel: "Refresh Synthetic Oracle",
        flow: "push_sandbox_oracle_price",
        tokenSymbol: "ORACLE",
        amountDisplay: `${formatUsdE8(priceE8)}/kg · seq #${nextSequence}`,
        request: {
          receiverId: PERPS_CONTRACT_ID,
          actions: [
            {
              type: "FunctionCall",
              params: {
                methodName: "push_sandbox_oracle_price",
                args: {
                  market_id: marketId,
                  price_e8: priceE8,
                  observed_at_sec: observedAtSec,
                  sequence: nextSequence,
                },
                gas: GAS_50_TGAS,
                deposit: ZERO_YOCTO_NEAR,
              },
            },
          ],
        },
        technicalRows: [
          ["Operator Account", operatorAccountId],
          ["Network", "NEAR Testnet"],
          ["Contract", PERPS_CONTRACT_ID],
          ["Method", "push_sandbox_oracle_price"],
          ["Market", marketId],
          ["Classification", "TESTNET_SANDBOX_FEED"],
          ["Price (USD e8)", `${priceE8} (${formatUsdE8(priceE8)}/kg)`],
          ["Sequence", `#${market.sandbox_sequence ?? 0} → #${nextSequence}`],
          [
            "Observed Timestamp (finalized block)",
            `${observedAtSec} (block ${freshBlock.blockHash.slice(0, 8)}...)`,
          ],
        ],
      });
    } finally {
      setPreparingOracle(false);
    }
  };

  const handlePrepareLpSeed = () => {
    setLpTouched(true);
    const units = parseDecimalToFixedBigInt(lpAmountInput, 6);
    if (
      units === null ||
      units <= 0n ||
      units > walletUsdcUnits ||
      pausedGlobal ||
      isLocked ||
      submitting
    ) {
      return;
    }
    const args = buildLpDepositArgs(units, PERPS_CONTRACT_ID);
    const formatted = formatUsdcUnits(units);
    setPendingAction({
      title: "Confirm Admin LP Vault Seed Deposit",
      summary: `Transfers ${formatted} from ${operatorAccountId} to ${PERPS_CONTRACT_ID} LP Vault via Circle USDC ft_transfer_call.`,
      actionLabel: "Seed LP Vault",
      flow: "lp_deposit",
      tokenSymbol: "USDC",
      amountDisplay: formatted,
      request: {
        receiverId: CIRCLE_TESTNET_USDC_ID,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "ft_transfer_call",
              args,
              gas: GAS_100_TGAS,
              deposit: ONE_YOCTO_NEAR,
            },
          },
        ],
      },
      technicalRows: [
        ["Operator Account", operatorAccountId],
        ["Network", "NEAR Testnet"],
        ["Token Contract", CIRCLE_TESTNET_USDC_ID],
        ["Receiver Contract", PERPS_CONTRACT_ID],
        ["Method", "ft_transfer_call"],
        ["Amount", `${formatted} (${units.toString()} units)`],
        ["Memo", args.msg],
        ["Attached Deposit", "1 yoctoNEAR"],
        ["Gas Budget", "100 TGas"],
      ],
    });
  };

  const handlePrepareLpWithdraw = () => {
    setLpSharesTouched(true);
    const shares = parseUnsignedBigInt(lpSharesInput);
    if (
      shares === null ||
      shares <= 0n ||
      shares > redeemableShares ||
      pausedGlobal ||
      isLocked ||
      submitting
    ) {
      return;
    }
    setPendingAction({
      title: "Confirm Admin Redeemable LP Share Withdrawal",
      summary: `Burns ${shares.toString()} redeemable LP shares via withdraw_lp while keeping ${lockedSeedShares} locked seed shares untouched.`,
      actionLabel: "Withdraw LP Shares",
      flow: "withdraw_lp",
      tokenSymbol: "USDC",
      amountDisplay: `${shares.toString()} LP shares`,
      request: {
        receiverId: PERPS_CONTRACT_ID,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "withdraw_lp",
              args: {
                token_id: CIRCLE_TESTNET_USDC_ID,
                shares_to_burn: shares.toString(),
                min_assets_out_e8: null,
              },
              gas: GAS_100_TGAS,
              deposit: ZERO_YOCTO_NEAR,
            },
          },
        ],
      },
      technicalRows: [
        ["Operator Account", operatorAccountId],
        ["Network", "NEAR Testnet"],
        ["Contract", PERPS_CONTRACT_ID],
        ["Method", "withdraw_lp"],
        ["Collateral Token", CIRCLE_TESTNET_USDC_ID],
        ["Shares To Burn", shares.toString()],
        ["Locked Seed Shares Retained", lockedSeedShares],
        ["Gas / Deposit", "100 TGas · 0 NEAR"],
      ],
    });
  };

  const handleConfirmPendingAction = async () => {
    if (!pendingAction || submitting) return;
    const action = pendingAction;
    setPendingAction(null);
    setSubmitting(true);
    try {
      const record = await executeNearPerpsTx({
        actionLabel: action.actionLabel,
        flow: action.flow,
        marketId,
        token: action.tokenSymbol,
        amountDisplay: action.amountDisplay,
        signerId: operatorAccountId,
        request: action.request,
        sendTransaction: sendNearTransaction,
        onPhaseChange: onTxUpdate,
      });
      onTxUpdate?.(record);

      if (record.phase === "successful") {
        toast.success(`${action.actionLabel} finalized on NEAR Testnet`, {
          description: record.detail,
        });
        if (action.flow === "withdraw_lp") {
          setLpSharesInput("");
          setLpSharesTouched(false);
        }
        await refreshAll();
      } else if (record.phase === "unknown_verification_required") {
        toast.warning("Operator transaction verification pending", { description: record.detail });
      } else {
        toast.error(`${action.actionLabel} not finalized`, { description: record.detail });
        await refreshAll();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Panel
      className="border-amber-500/40"
      title={
        <span className="flex flex-wrap items-center gap-2">
          <ShieldCheck className="size-4 text-amber-500" aria-hidden="true" />
          <span>Testnet Operator Controls</span>
          <MaturityBadge variant="testnet">ADMIN · {near.accountId}</MaturityBadge>
        </span>
      }
    >
      <div className="space-y-5 text-xs">
        <Alert className="border-amber-500/40 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
          <AlertTitle className="text-xs font-semibold">
            Restricted Admin Controls (Visible Only to {protocol.admin})
          </AlertTitle>
          <AlertDescription className="text-[11px] text-muted-foreground">
            Connected wallet matches live <code className="font-mono">get_admin()</code> on{" "}
            <code className="font-mono">{PERPS_CONTRACT_ID}</code>. Every action prompts explicit a
            supported NEAR Testnet wallet signature without private keys in the frontend.
          </AlertDescription>
        </Alert>

        {/* A. Refresh Synthetic Oracle */}
        <div className="space-y-2.5 rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-semibold">
              <Flame className="size-3.5 text-[var(--warn)]" aria-hidden="true" />
              <span>
                A. Refresh Synthetic Oracle (
                <code className="font-mono">push_sandbox_oracle_price</code>)
              </span>
            </span>
            <Pill tone={oracleStatus.isValidForOpen ? "gain" : "warn"}>
              {oracleStatus.status} ({oracleStatus.ageSec ?? 0}s / {oracleStatus.maxAgeSec}s max)
            </Pill>
          </div>
          <KV
            rows={[
              ["Target Market", marketId],
              [
                "Current Price / Seq",
                `${oracleStatus.priceE8 ? formatUsdE8(oracleStatus.priceE8) : formatUsdE8(fallbackOraclePriceE8)}/kg · seq #${market?.sandbox_sequence ?? 0}`,
              ],
              [
                "Next Update Target",
                `${formatUsdE8(fallbackOraclePriceE8)}/kg · seq #${(market?.sandbox_sequence ?? 0) + 1}`,
              ],
              ["Classification", "TESTNET_SANDBOX_FEED (finalized block timestamp)"],
            ]}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!market || market.mode === "Emergency" || preparingOracle || submitting}
            onClick={() => void handlePrepareOracleRefresh()}
            className="w-full"
          >
            {preparingOracle
              ? "Querying finalized block..."
              : `Review Oracle Refresh (${formatUsdE8(market?.last_valid_price_e8 ?? fallbackOraclePriceE8)}/kg · seq #${(market?.sandbox_sequence ?? 0) + 1})`}
          </Button>
        </div>

        {/* B. Seed LP */}
        <div className="space-y-2.5 rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-semibold">
              <Vault className="size-3.5 text-primary" aria-hidden="true" />
              <span>
                B. Seed LP Vault (<code className="font-mono">{`{"action":"lp_deposit"}`}</code>)
              </span>
            </span>
            <span className="num text-[11px] text-muted-foreground">
              Wallet: {formatUsdcUnits(walletUsdcUnits)}
            </span>
          </div>
          <div>
            <label htmlFor={lpInputId} className="mb-1 block text-xs font-medium">
              LP Seed Amount (Circle Testnet USDC)
            </label>
            <Input
              id={lpInputId}
              type="text"
              inputMode="decimal"
              value={lpAmountInput}
              onChange={(e) => setLpAmountInput(e.target.value)}
              onBlur={() => setLpTouched(true)}
              aria-invalid={Boolean(lpDepositError)}
              aria-describedby={lpDepositError ? lpErrorId : undefined}
              placeholder="2.000000"
            />
            {lpDepositError && (
              <p id={lpErrorId} role="alert" className="mt-1 text-xs text-[var(--loss)]">
                {lpDepositError}
              </p>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            disabled={
              pausedGlobal ||
              isLocked ||
              submitting ||
              walletUsdcUnits <= 0n ||
              Boolean(lpDepositError) ||
              lpAmountInput.trim() === ""
            }
            onClick={handlePrepareLpSeed}
            className="w-full"
          >
            <Coins className="mr-1.5 size-3.5" aria-hidden="true" />
            Review LP Seed Deposit
          </Button>
        </div>

        {/* C. Withdraw LP */}
        <div className="space-y-2.5 rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-semibold">
              <WalletCards className="size-3.5 text-primary" aria-hidden="true" />
              <span>
                C. Withdraw Redeemable LP Shares (<code className="font-mono">withdraw_lp</code>)
              </span>
            </span>
            <button
              type="button"
              disabled={redeemableShares <= 0n}
              onClick={() => {
                setLpSharesTouched(true);
                setLpSharesInput(redeemableShares.toString());
              }}
              className="cursor-pointer font-mono text-[11px] text-primary hover:underline disabled:opacity-50"
            >
              Max: {formatFixedPoint(redeemableShares, 0, { groupThousands: true })} shares
            </button>
          </div>
          <KV
            rows={[
              ["Operator Redeemable Shares", redeemableShares.toString()],
              ["Locked Seed Shares (Protected)", lockedSeedShares],
            ]}
          />
          <div>
            <label htmlFor={lpSharesId} className="mb-1 block text-xs font-medium">
              Shares to Burn (integer u128)
            </label>
            <Input
              id={lpSharesId}
              type="text"
              inputMode="numeric"
              value={lpSharesInput}
              onChange={(e) => setLpSharesInput(e.target.value)}
              onBlur={() => setLpSharesTouched(true)}
              aria-invalid={Boolean(lpWithdrawError)}
              aria-describedby={lpWithdrawError ? lpSharesErrorId : undefined}
              placeholder={redeemableShares > 0n ? redeemableShares.toString() : "0"}
            />
            {lpWithdrawError && (
              <p id={lpSharesErrorId} role="alert" className="mt-1 text-xs text-[var(--loss)]">
                {lpWithdrawError}
              </p>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={
              pausedGlobal ||
              isLocked ||
              submitting ||
              redeemableShares <= 0n ||
              Boolean(lpWithdrawError) ||
              lpSharesInput.trim() === ""
            }
            onClick={handlePrepareLpWithdraw}
            className="w-full"
          >
            Review LP Share Withdrawal
          </Button>
        </div>
      </div>

      <Dialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => !open && setPendingAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingAction?.title}</DialogTitle>
            <DialogDescription>{pendingAction?.summary}</DialogDescription>
          </DialogHeader>
          {pendingAction && (
            <div className="space-y-3 text-xs">
              <KV rows={pendingAction.technicalRows} />
              <p className="rounded border bg-muted/40 px-2.5 py-2 text-[11px] text-muted-foreground">
                {TESTNET_NON_MONETARY_NOTICE} Approve explicitly in your supported NEAR Testnet
                wallet.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setPendingAction(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleConfirmPendingAction()}>
              Confirm & Sign in Wallet ({pendingAction?.amountDisplay})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
