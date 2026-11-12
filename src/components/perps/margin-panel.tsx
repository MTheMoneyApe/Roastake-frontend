// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { useId, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Coins, Lock, ShieldCheck, Wallet } from "lucide-react";
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
import { formatFixedPoint, formatYoctoNear, parseUnsignedBigInt } from "@/lib/oracle/format";
import {
  CIRCLE_STORAGE_DEPOSIT_YOCTO,
  CIRCLE_TESTNET_USDC_ID,
  GAS_100_TGAS,
  GAS_30_TGAS,
  ONE_YOCTO_NEAR,
  PERPS_ACCOUNT_STORAGE_DEPOSIT_NEAR,
  PERPS_ACCOUNT_STORAGE_DEPOSIT_YOCTO,
  PERPS_CONTRACT_ID,
  TESTNET_NON_MONETARY_NOTICE,
  ZERO_YOCTO_NEAR,
} from "@/lib/perps/config";
import {
  buildTraderCollateralDepositArgs,
  formatUsdE8,
  formatUsdcUnits,
  parseDecimalToFixedBigInt,
} from "@/lib/perps/math";
import { useRefreshPerpsQueries } from "@/lib/perps/queries";
import { executeNearPerpsTx } from "@/lib/perps/tx";
import type {
  NearUserTxRecord,
  PerpsProtocolSnapshot,
  PerpsTraderSnapshot,
} from "@/lib/perps/types";
import type { NearTransactionRequest } from "@/lib/wallet/types";
import { useWalletHub } from "@/lib/wallet/context";

interface PendingMarginAction {
  title: string;
  summary: string;
  actionLabel: string;
  flow:
    | "register_circle_storage"
    | "register_account"
    | "trader_collateral_deposit"
    | "withdraw_collateral";
  amountDisplay: string;
  tokenSymbol: string;
  request: NearTransactionRequest;
  technicalRows: [string, string][];
}

export function PerpsMarginPanel({
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

  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [depositInput, setDepositInput] = useState("");
  const [withdrawInput, setWithdrawInput] = useState("");
  const [depositTouched, setDepositTouched] = useState(false);
  const [withdrawTouched, setWithdrawTouched] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingMarginAction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const depositInputId = useId();
  const depositErrorId = useId();
  const withdrawInputId = useId();
  const withdrawErrorId = useId();

  const isConnected = near.status === "connected" && Boolean(near.accountId);
  const isValidTestnet = isConnected && !near.unsupportedNetwork;
  const walletUsdcUnits = parseUnsignedBigInt(trader?.circleUsdcBalanceUnits ?? "0") ?? 0n;
  const freeUsdE8 = parseUnsignedBigInt(trader?.account?.free_collateral_e8 ?? "0") ?? 0n;
  const withdrawableUsdcUnits =
    parseUnsignedBigInt(trader?.account?.withdrawable_token_units_at_scale_100 ?? "0") ?? 0n;
  const residueE8 = parseUnsignedBigInt(trader?.account?.sub_micro_unit_residue_e8 ?? "0") ?? 0n;
  const isRegistered = Boolean(trader?.isRegistered);
  const isLocked = Boolean(
    trader?.account?.pending_action_lock || trader?.account?.has_pending_withdrawal,
  );
  const pausedGlobal = Boolean(protocol?.pausedGlobal);
  const hasCircleStorage = Boolean(trader?.circleStorage);

  const depositValidationError = useMemo(() => {
    if (!depositTouched && depositInput.trim() === "") return null;
    if (depositInput.trim() === "") return "Enter a USDC deposit amount.";
    const parsed = parseDecimalToFixedBigInt(depositInput, 6);
    if (parsed === null) {
      return "Enter a valid positive USDC amount with up to 6 decimal places.";
    }
    if (parsed <= 0n) {
      return "Deposit amount must be greater than 0.000000 USDC.";
    }
    if (parsed > walletUsdcUnits) {
      return `Exceeds wallet Circle USDC balance (${formatUsdcUnits(walletUsdcUnits)}).`;
    }
    return null;
  }, [depositInput, depositTouched, walletUsdcUnits]);

  const withdrawValidationError = useMemo(() => {
    if (!withdrawTouched && withdrawInput.trim() === "") return null;
    if (withdrawInput.trim() === "") return "Enter a USDC withdrawal amount.";
    const parsed = parseDecimalToFixedBigInt(withdrawInput, 6);
    if (parsed === null) {
      return "Enter a valid positive USDC amount with up to 6 decimal places.";
    }
    if (parsed <= 0n) {
      return "Withdrawal converts to 0 micro-units; enter at least 0.000001 USDC.";
    }
    if (parsed > withdrawableUsdcUnits) {
      return `Exceeds withdrawable free collateral (${formatUsdcUnits(withdrawableUsdcUnits)}).`;
    }
    return null;
  }, [withdrawInput, withdrawTouched, withdrawableUsdcUnits]);

  const handlePrepareRegisterCircle = () => {
    if (!near.accountId || isSubmitting) return;
    setPendingAction({
      title: "Register Circle USDC NEP-145 Storage",
      summary: `Deposits 0.00125 NEAR storage on Circle Native Testnet USDC (${CIRCLE_TESTNET_USDC_ID.slice(0, 12)}...) so ${near.accountId} can hold and receive USDC.`,
      actionLabel: "Register Circle Storage",
      flow: "register_circle_storage",
      amountDisplay: "0.00125 NEAR",
      tokenSymbol: "NEAR",
      request: {
        receiverId: CIRCLE_TESTNET_USDC_ID,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "storage_deposit",
              args: { account_id: near.accountId, registration_only: true },
              gas: GAS_30_TGAS,
              deposit: CIRCLE_STORAGE_DEPOSIT_YOCTO,
            },
          },
        ],
      },
      technicalRows: [
        ["Token Contract", CIRCLE_TESTNET_USDC_ID],
        ["Method", "storage_deposit"],
        ["Account ID", near.accountId],
        ["registration_only", "true"],
        ["Attached Deposit", `0.00125 NEAR (${CIRCLE_STORAGE_DEPOSIT_YOCTO} yocto)`],
        ["Gas Budget", "30 TGas"],
      ],
    });
  };

  const handlePrepareRegister = () => {
    if (!near.accountId || isSubmitting) return;
    setPendingAction({
      title: "Register Trader Account on Perpetuals Contract",
      summary: `Deposits ${PERPS_ACCOUNT_STORAGE_DEPOSIT_NEAR} NEAR storage to register ${near.accountId} on ${PERPS_CONTRACT_ID}.`,
      actionLabel: "Register Trader Account",
      flow: "register_account",
      amountDisplay: `${PERPS_ACCOUNT_STORAGE_DEPOSIT_NEAR} NEAR`,
      tokenSymbol: "NEAR",
      request: {
        receiverId: PERPS_CONTRACT_ID,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "register_account",
              args: { account_id: near.accountId },
              gas: GAS_30_TGAS,
              deposit: PERPS_ACCOUNT_STORAGE_DEPOSIT_YOCTO,
            },
          },
        ],
      },
      technicalRows: [
        ["Target Contract", PERPS_CONTRACT_ID],
        ["Method", "register_account"],
        ["Account ID", near.accountId],
        ["Attached Deposit", `${PERPS_ACCOUNT_STORAGE_DEPOSIT_NEAR} NEAR (${PERPS_ACCOUNT_STORAGE_DEPOSIT_YOCTO} yocto)`],
        ["Gas Budget", "30 TGas"],
      ],
    });
  };

  const handlePrepareDeposit = () => {
    setDepositTouched(true);
    if (!near.accountId || isSubmitting) return;
    const units = parseDecimalToFixedBigInt(depositInput, 6);
    if (
      units === null ||
      units <= 0n ||
      units > walletUsdcUnits ||
      !isRegistered ||
      pausedGlobal ||
      isLocked
    ) {
      return;
    }
    const formattedAmount = formatUsdcUnits(units);
    const args = buildTraderCollateralDepositArgs(units, PERPS_CONTRACT_ID);
    setPendingAction({
      title: "Confirm Circle Testnet USDC Collateral Deposit",
      summary: `Transfer ${formattedAmount} from your NEAR wallet into isolated trader free margin via NEP-141 ft_transfer_call.`,
      actionLabel: "Deposit USDC Collateral",
      flow: "trader_collateral_deposit",
      amountDisplay: formattedAmount,
      tokenSymbol: "USDC",
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
        ["Token Contract", CIRCLE_TESTNET_USDC_ID],
        ["Method", "ft_transfer_call"],
        ["Perps Receiver", PERPS_CONTRACT_ID],
        ["Raw Units (6 dec)", units.toString()],
        ["Memo Payload", args.msg],
        ["Attached Deposit", "1 yoctoNEAR"],
        ["Gas Budget", "100 TGas"],
      ],
    });
  };

  const handlePrepareWithdraw = () => {
    setWithdrawTouched(true);
    if (!near.accountId || isSubmitting) return;
    const units = parseDecimalToFixedBigInt(withdrawInput, 6);
    if (
      units === null ||
      units <= 0n ||
      units > withdrawableUsdcUnits ||
      !isRegistered ||
      pausedGlobal ||
      isLocked
    ) {
      return;
    }
    const formattedAmount = formatUsdcUnits(units);
    setPendingAction({
      title: "Confirm Circle Testnet USDC Collateral Withdrawal",
      summary: `Withdraw ${formattedAmount} back to ${near.accountId} via async Circle ft_transfer and on_withdraw_transfer callback.`,
      actionLabel: "Withdraw USDC Collateral",
      flow: "withdraw_collateral",
      amountDisplay: formattedAmount,
      tokenSymbol: "USDC",
      request: {
        receiverId: PERPS_CONTRACT_ID,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "withdraw_collateral",
              args: {
                token_id: CIRCLE_TESTNET_USDC_ID,
                amount_token_units: units.toString(),
              },
              gas: GAS_100_TGAS,
              deposit: ZERO_YOCTO_NEAR,
            },
          },
        ],
      },
      technicalRows: [
        ["Contract", PERPS_CONTRACT_ID],
        ["Method", "withdraw_collateral"],
        ["Token ID", CIRCLE_TESTNET_USDC_ID],
        ["Raw Units (6 dec)", units.toString()],
        ["Attached Deposit", "0 NEAR"],
        ["Gas Budget", "100 TGas (async callback)"],
      ],
    });
  };

  const handleConfirmPendingAction = async () => {
    if (!pendingAction || !near.accountId || isSubmitting) return;
    const actionToRun = pendingAction;
    setPendingAction(null);
    setIsSubmitting(true);
    try {
      const record = await executeNearPerpsTx({
        actionLabel: actionToRun.actionLabel,
        flow: actionToRun.flow,
        token: actionToRun.tokenSymbol,
        amountDisplay: actionToRun.amountDisplay,
        signerId: near.accountId,
        request: actionToRun.request,
        sendTransaction: sendNearTransaction,
        onPhaseChange: onTxUpdate,
      });
      onTxUpdate?.(record);

      if (record.phase === "successful") {
        toast.success(`${actionToRun.actionLabel} verified on NEAR Testnet`, {
          description: record.detail,
        });
        if (actionToRun.flow === "trader_collateral_deposit") {
          setDepositInput("");
          setDepositTouched(false);
        } else if (actionToRun.flow === "withdraw_collateral") {
          setWithdrawInput("");
          setWithdrawTouched(false);
        }
        await refreshAll();
      } else if (record.phase === "unknown_verification_required") {
        toast.warning("Transaction verification pending", { description: record.detail });
      } else {
        toast.error(`${actionToRun.actionLabel} not finalized`, { description: record.detail });
        await refreshAll();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Panel
      title={
        <span className="flex flex-wrap items-center gap-2">
          <span>Trader Collateral & Account</span>
          <MaturityBadge variant="testnet">CIRCLE TESTNET USDC</MaturityBadge>
        </span>
      }
    >
      {!isConnected ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Connect your NEAR Testnet wallet to read live Circle USDC balances, check account
            storage registration, and manage isolated Perpetuals margin.
          </p>
          <Button type="button" onClick={() => openHub("near")} className="w-full">
            <Wallet className="mr-2 size-4" aria-hidden="true" />
            Connect NEAR Testnet Wallet
          </Button>
          <p className="text-[11px] text-muted-foreground">{TESTNET_NON_MONETARY_NOTICE}</p>
        </div>
      ) : !isValidTestnet ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle className="text-xs">NEAR Testnet Required</AlertTitle>
          <AlertDescription className="space-y-2 text-xs">
            <p>
              Connected account <code className="font-mono">{near.accountId}</code> is not on NEAR
              Testnet. Switch to a <code className="font-mono">.testnet</code> wallet before signing.
            </p>
            <Button type="button" size="sm" variant="outline" onClick={() => openHub("near")}>
              Open Wallet Hub
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          <KV
            rows={[
              [
                "NEAR Wallet",
                <span key="acc" className="font-mono text-xs">{near.accountId}</span>,
              ],
              [
                "NEAR Balance",
                traderLoading
                  ? "Loading..."
                  : trader?.nearBalanceYocto
                    ? `${formatYoctoNear(trader.nearBalanceYocto)} NEAR`
                    : "0 / Unfunded",
              ],
              [
                "Wallet Circle USDC",
                traderLoading
                  ? "Loading..."
                  : <span key="usdc" className="num font-medium">{formatUsdcUnits(walletUsdcUnits)}</span>,
              ],
              [
                "Circle NEP-145 Storage",
                hasCircleStorage ? (
                  <Pill tone="gain">Registered</Pill>
                ) : (
                  <Pill tone="warn">Not registered</Pill>
                ),
              ],
              [
                "Perps Registration",
                isRegistered ? (
                  <Pill tone="gain">Registered (0.05 NEAR)</Pill>
                ) : (
                  <Pill tone="warn">Action Required</Pill>
                ),
              ],
              [
                "Free Contract Margin",
                <span key="free" className="num font-semibold">
                  {formatUsdE8(freeUsdE8)} ({formatUsdcUnits(withdrawableUsdcUnits)} withdrawable)
                </span>,
              ],
            ]}
          />

          {residueE8 > 0n && (
            <p className="rounded border bg-muted/40 px-2.5 py-1.5 text-[11px] text-muted-foreground">
              Sub-micro-unit residue:{" "}
              <span className="num font-mono">{formatUsdE8(residueE8)}</span>. Values below
              $0.000001 remain internal e8 USD accounting because Circle USDC transfers 6-decimal
              integer units.
            </p>
          )}

          {Boolean(trader) && !hasCircleStorage && (
            <Alert className="border-[var(--warn)]/50 bg-[var(--warn-soft)]/25">
              <ShieldCheck className="h-4 w-4 text-[var(--warn)]" aria-hidden="true" />
              <AlertTitle className="text-xs font-semibold">
                Register Circle USDC Storage First (0.00125 NEAR)
              </AlertTitle>
              <AlertDescription className="mt-1 space-y-2 text-xs">
                <p>
                  <code className="font-mono">{CIRCLE_TESTNET_USDC_ID.slice(0, 14)}...</code>{" "}
                  requires <strong>0.00125 NEAR</strong> NEP-145 storage before{" "}
                  <code className="font-mono">{near.accountId}</code> can receive or withdraw
                  Circle Testnet USDC.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={handlePrepareRegisterCircle}
                  className="w-full"
                >
                  Register Circle USDC Storage (0.00125 NEAR)
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!isRegistered && (
            <Alert className="border-[var(--warn)]/50 bg-[var(--warn-soft)]/25">
              <ShieldCheck className="h-4 w-4 text-[var(--warn)]" aria-hidden="true" />
              <AlertTitle className="text-xs font-semibold">
                Register Trader Storage First
              </AlertTitle>
              <AlertDescription className="mt-1 space-y-2 text-xs">
                <p>
                  <code className="font-mono">{PERPS_CONTRACT_ID}</code> requires{" "}
                  <strong>{PERPS_ACCOUNT_STORAGE_DEPOSIT_NEAR} NEAR</strong> storage before
                  accepting Circle USDC collateral via{" "}
                  <code className="font-mono">ft_transfer_call</code>.
                </p>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSubmitting || isLocked}
                  onClick={handlePrepareRegister}
                  className="w-full"
                >
                  Register Account ({PERPS_ACCOUNT_STORAGE_DEPOSIT_NEAR} NEAR)
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isLocked && (
            <Alert variant="destructive">
              <Lock className="h-4 w-4" aria-hidden="true" />
              <AlertTitle className="text-xs">Account Action Lock Active</AlertTitle>
              <AlertDescription className="text-xs">
                An async withdrawal or settlement lock is active on-chain. Wait for finality and
                refresh before submitting collateral changes.
              </AlertDescription>
            </Alert>
          )}

          {pausedGlobal && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle className="text-xs">Protocol Globally Paused</AlertTitle>
              <AlertDescription className="text-xs">
                Admin emergency global pause is active; collateral transfers are temporarily
                disabled.
              </AlertDescription>
            </Alert>
          )}

          <div
            role="tablist"
            aria-label="Collateral actions"
            className="grid grid-cols-2 gap-1 rounded-md border p-1 text-xs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "deposit"}
              onClick={() => setTab("deposit")}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded px-2.5 py-1.5 font-medium transition ${
                tab === "deposit"
                  ? "bg-primary text-primary-foreground underline underline-offset-4"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowDownToLine className="size-3.5" aria-hidden="true" />
              Deposit USDC
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "withdraw"}
              onClick={() => setTab("withdraw")}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded px-2.5 py-1.5 font-medium transition ${
                tab === "withdraw"
                  ? "bg-primary text-primary-foreground underline underline-offset-4"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowUpFromLine className="size-3.5" aria-hidden="true" />
              Withdraw USDC
            </button>
          </div>

          {tab === "deposit" ? (
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <label htmlFor={depositInputId} className="font-medium">
                    Deposit Amount (Circle Testnet USDC)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setDepositTouched(true);
                      setDepositInput(
                        formatFixedPoint(walletUsdcUnits, 6, {
                          trimTrailingZeros: true,
                          groupThousands: false,
                          maxFractionDigits: 6,
                        }),
                      );
                    }}
                    disabled={walletUsdcUnits <= 0n}
                    className="cursor-pointer font-mono text-[11px] text-primary hover:underline disabled:opacity-50"
                  >
                    Max: {formatUsdcUnits(walletUsdcUnits)}
                  </button>
                </div>
                <Input
                  id={depositInputId}
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 5.00"
                  value={depositInput}
                  onChange={(e) => setDepositInput(e.target.value)}
                  onBlur={() => setDepositTouched(true)}
                  aria-invalid={Boolean(depositValidationError)}
                  aria-describedby={depositValidationError ? depositErrorId : undefined}
                />
                {depositValidationError && (
                  <p id={depositErrorId} className="mt-1 text-xs text-[var(--loss)]" role="alert">
                    {depositValidationError}
                  </p>
                )}
              </div>

              {walletUsdcUnits === 0n && (
                <p className="text-[11px] text-muted-foreground">
                  Wallet holds 0 Circle Testnet USDC. Request Testnet USDC for{" "}
                  <code className="font-mono">NEAR Testnet</code> from Circle&apos;s official
                  faucet (no monetary value).
                </p>
              )}

              <Button
                type="button"
                className="w-full"
                disabled={
                  !isRegistered ||
                  isLocked ||
                  pausedGlobal ||
                  isSubmitting ||
                  walletUsdcUnits <= 0n ||
                  Boolean(depositValidationError) ||
                  depositInput.trim() === ""
                }
                onClick={handlePrepareDeposit}
              >
                <Coins className="mr-2 size-4" aria-hidden="true" />
                Review Trader Collateral Deposit
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {!hasCircleStorage && (
                <Alert className="border-[var(--warn)]/50 bg-[var(--warn-soft)]/25">
                  <AlertTriangle className="h-4 w-4 text-[var(--warn)]" aria-hidden="true" />
                  <AlertTitle className="text-xs font-semibold">
                    Circle USDC Storage Missing
                  </AlertTitle>
                  <AlertDescription className="text-[11px]">
                    Your account has no storage record on{" "}
                    <code className="font-mono">{CIRCLE_TESTNET_USDC_ID.slice(0, 12)}...</code>.
                    If you initiate a withdrawal, <code className="font-mono">ft_transfer</code>{" "}
                    will fail and <code className="font-mono">on_withdraw_transfer</code> will
                    safely restore your free collateral.
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <label htmlFor={withdrawInputId} className="font-medium">
                    Withdraw Amount (USDC)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setWithdrawTouched(true);
                      setWithdrawInput(
                        formatFixedPoint(withdrawableUsdcUnits, 6, {
                          trimTrailingZeros: true,
                          groupThousands: false,
                          maxFractionDigits: 6,
                        }),
                      );
                    }}
                    disabled={withdrawableUsdcUnits <= 0n}
                    className="cursor-pointer font-mono text-[11px] text-primary hover:underline disabled:opacity-50"
                  >
                    Max: {formatUsdcUnits(withdrawableUsdcUnits)}
                  </button>
                </div>
                <Input
                  id={withdrawInputId}
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 2.50"
                  value={withdrawInput}
                  onChange={(e) => setWithdrawInput(e.target.value)}
                  onBlur={() => setWithdrawTouched(true)}
                  aria-invalid={Boolean(withdrawValidationError)}
                  aria-describedby={withdrawValidationError ? withdrawErrorId : undefined}
                />
                {withdrawValidationError && (
                  <p id={withdrawErrorId} className="mt-1 text-xs text-[var(--loss)]" role="alert">
                    {withdrawValidationError}
                  </p>
                )}
              </div>

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={
                  !isRegistered ||
                  isLocked ||
                  pausedGlobal ||
                  isSubmitting ||
                  withdrawableUsdcUnits <= 0n ||
                  Boolean(withdrawValidationError) ||
                  withdrawInput.trim() === ""
                }
                onClick={handlePrepareWithdraw}
              >
                Review USDC Withdrawal
              </Button>
            </div>
          )}

          <div className="space-y-1 border-t pt-3 text-[11px] text-muted-foreground">
            <p className="flex items-start gap-1.5">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[var(--gain)]" aria-hidden="true" />
              <span>
                Deposits enforce <code className="font-mono">{"{\"action\":\"trader_collateral\"}"}</code>.
                General UI LP vault deposit/withdraw controls are disabled to preserve the
                operator-seeded pool model.
              </span>
            </p>
            <p>{TESTNET_NON_MONETARY_NOTICE}</p>
          </div>
        </div>
      )}

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingAction?.title}</DialogTitle>
            <DialogDescription>{pendingAction?.summary}</DialogDescription>
          </DialogHeader>
          {pendingAction && (
            <div className="space-y-3 text-xs">
              <KV rows={pendingAction.technicalRows} />
              <p className="rounded border bg-muted/40 px-2.5 py-2 text-[11px] text-muted-foreground">
                {TESTNET_NON_MONETARY_NOTICE} Your NEAR Testnet wallet will open next to request
                explicit cryptographic approval.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setPendingAction(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmPendingAction}>
              Confirm & Sign in Wallet ({pendingAction?.amountDisplay})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
