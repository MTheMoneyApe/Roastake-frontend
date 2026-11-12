// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { useId, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Loader2, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MaturityBadge, Panel, Pill } from "@/components/kit";
import { VERIFIED_TESTNET_CYCLE_PROOF } from "@/lib/perps/config";
import type { NearTxExpectedFlow } from "@/lib/perps/rpc";
import { reverifyTrackedNearTx, usePerpsTxHistory } from "@/lib/perps/tx";
import type { NearTxLifecyclePhase, NearUserTxRecord } from "@/lib/perps/types";

function phaseBadge(phase: NearTxLifecyclePhase) {
  switch (phase) {
    case "awaiting_wallet":
      return <Pill tone="info">Awaiting Wallet</Pill>;
    case "signing":
      return <Pill tone="info">Signing</Pill>;
    case "processing":
      return <Pill tone="info">Processing</Pill>;
    case "finalizing":
      return <Pill tone="warn">Finalizing</Pill>;
    case "successful":
      return <Pill tone="gain">Finalized</Pill>;
    case "failed":
      return <Pill tone="loss">Failed</Pill>;
    case "expired":
      return <Pill tone="warn">Expired</Pill>;
    case "unknown_verification_required":
      return <Pill tone="warn">Verify on RPC</Pill>;
    default:
      return <Pill tone="muted">Idle</Pill>;
  }
}

function inferFlowFromAction(action: string): NearTxExpectedFlow {
  const lower = action.toLowerCase();
  if (lower.includes("oracle")) return "push_sandbox_oracle_price";
  if (lower.includes("circle storage")) return "register_circle_storage";
  if (lower.includes("seed lp") || lower.includes("lp deposit")) return "lp_deposit";
  if (lower.includes("withdraw lp")) return "withdraw_lp";
  if (lower.includes("register")) return "register_account";
  if (lower.includes("deposit")) return "trader_collateral_deposit";
  if (lower.includes("withdraw")) return "withdraw_collateral";
  if (lower.includes("close")) return "close_position";
  return "open_position";
}

function ActiveTxAlert({
  record,
  onVerify,
  verifyingId,
}: {
  record: NearUserTxRecord;
  onVerify: (record: NearUserTxRecord) => void;
  verifyingId: string | null;
}) {
  const isPending =
    record.phase === "awaiting_wallet" ||
    record.phase === "signing" ||
    record.phase === "processing" ||
    record.phase === "finalizing";

  const isSuccess = record.phase === "successful";
  const isAmbiguous = record.phase === "unknown_verification_required";

  return (
    <Alert
      variant={record.phase === "failed" ? "destructive" : "default"}
      className={
        isSuccess
          ? "border-[var(--gain)]/40 bg-[var(--gain-soft)]/25"
          : isAmbiguous || record.phase === "expired"
            ? "border-[var(--warn)]/50 bg-[var(--warn-soft)]/25"
            : undefined
      }
      aria-live="polite"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : isSuccess ? (
        <CheckCircle2 className="h-4 w-4 text-[var(--gain)]" aria-hidden="true" />
      ) : isAmbiguous ? (
        <ShieldAlert className="h-4 w-4 text-[var(--warn)]" aria-hidden="true" />
      ) : record.phase === "expired" ? (
        <Clock className="h-4 w-4 text-[var(--warn)]" aria-hidden="true" />
      ) : (
        <XCircle className="h-4 w-4" aria-hidden="true" />
      )}
      <AlertTitle className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span>{record.action}</span>
        {phaseBadge(record.phase)}
        <span className="font-mono text-[11px] font-normal text-muted-foreground">
          {record.amountDisplay}
        </span>
      </AlertTitle>
      <AlertDescription className="mt-1 space-y-2 text-xs">
        <p>{record.detail}</p>
        {isAmbiguous && (
          <p className="flex items-start gap-1.5 text-[var(--warn)] font-medium">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>
              No automatic retry was performed to avoid duplicate orders or deposits. Inspect NEAR
              Explorer or click Verify on RPC below.
            </span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {record.txHash && (
            <a
              href={record.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded border bg-background/80 px-2 py-1 font-mono text-[11px] hover:bg-muted"
            >
              <span>TX {record.txHash.slice(0, 10)}...</span>
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          )}
          {record.txHash && (isAmbiguous || record.phase === "finalizing") && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={verifyingId === record.id}
              onClick={() => onVerify(record)}
              className="h-7 px-2.5 text-[11px]"
            >
              <RefreshCw
                className={`mr-1 size-3 ${verifyingId === record.id ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Verify on RPC
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function TxStatusPanel({
  activeTx,
  onAfterVerify,
}: {
  activeTx?: NearUserTxRecord | null;
  onAfterVerify?: () => void;
}) {
  const history = usePerpsTxHistory();
  const [tab, setTab] = useState<"session" | "proof">("session");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const regionLabelId = useId();

  const latestRecord = activeTx ?? history[0] ?? null;

  const handleManualVerify = async (record: NearUserTxRecord) => {
    if (verifyingId) return;
    setVerifyingId(record.id);
    try {
      await reverifyTrackedNearTx({
        record,
        flow: inferFlowFromAction(record.action),
      });
      onAfterVerify?.();
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <Panel
      title={
        <span id={regionLabelId} className="flex flex-wrap items-center gap-2">
          <span>On-Chain Transaction Lifecycle & Proof</span>
          <MaturityBadge variant="testnet">NEAR TESTNET RPC</MaturityBadge>
        </span>
      }
      actions={
        <div role="tablist" aria-label="Transaction views" className="flex items-center gap-1 rounded-md border p-0.5 text-xs">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "session"}
            onClick={() => setTab("session")}
            className={`cursor-pointer rounded px-2.5 py-1 font-medium transition ${
              tab === "session"
                ? "bg-primary text-primary-foreground underline underline-offset-4"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Session ({history.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "proof"}
            onClick={() => setTab("proof")}
            className={`cursor-pointer rounded px-2.5 py-1 font-medium transition ${
              tab === "proof"
                ? "bg-primary text-primary-foreground underline underline-offset-4"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            M04.6-G Proof ({VERIFIED_TESTNET_CYCLE_PROOF.length})
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {latestRecord && (
          <ActiveTxAlert
            record={latestRecord}
            onVerify={handleManualVerify}
            verifyingId={verifyingId}
          />
        )}

        {tab === "session" ? (
          history.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No wallet-signed NEAR Testnet transactions in this browser session yet. Every action
              prompts a review modal first, verifies finality via{" "}
              <code className="font-mono">EXPERIMENTAL_tx_status</code>, and links directly to NEAR
              Explorer.
            </p>
          ) : (
            <div
              role="region"
              aria-labelledby={regionLabelId}
              tabIndex={0}
              className="overflow-x-auto rounded-md border"
            >
              <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Action</th>
                    <th scope="col" className="px-3 py-2 font-medium">Amount / Target</th>
                    <th scope="col" className="px-3 py-2 font-medium">Status</th>
                    <th scope="col" className="px-3 py-2 font-medium">Detail</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Explorer / Verify</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.map((rec) => (
                    <tr key={rec.id} className="align-top">
                      <td className="px-3 py-2 font-medium">
                        <div>{rec.action}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {new Date(rec.timestampIso).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px]">{rec.amountDisplay}</td>
                      <td className="px-3 py-2">{phaseBadge(rec.phase)}</td>
                      <td className="max-w-[260px] px-3 py-2 text-[11px] text-muted-foreground">
                        {rec.detail}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {rec.txHash ? (
                            <a
                              href={rec.explorerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
                            >
                              {rec.txHash.slice(0, 8)}...
                              <ExternalLink className="size-3" aria-hidden="true" />
                            </a>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Not broadcast</span>
                          )}
                          {rec.txHash && rec.phase === "unknown_verification_required" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={verifyingId === rec.id}
                              onClick={() => handleManualVerify(rec)}
                              className="h-6 px-2 text-[10px]"
                            >
                              Verify
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Pill tone="info">Historical Reference Only · Not Current User Balance</Pill>
              <span>
                Auditable M04.6-G hybrid Admin (CLI) + Trader (Meteor) lifecycle executed on{" "}
                <code className="font-mono">perps-v1.roastake-dev-mta.testnet</code>.
              </span>
            </div>
            <div
              role="region"
              aria-labelledby={regionLabelId}
              tabIndex={0}
              className="overflow-x-auto rounded-md border"
            >
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Phase</th>
                    <th scope="col" className="px-3 py-2 font-medium">Action</th>
                    <th scope="col" className="px-3 py-2 font-medium">Verified Summary</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">NEAR Explorer</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {VERIFIED_TESTNET_CYCLE_PROOF.map((item) => (
                    <tr key={item.txHash}>
                      <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                        {item.phase}
                      </td>
                      <td className="px-3 py-2 font-medium">{item.action}</td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground">{item.summary}</td>
                      <td className="px-3 py-2 text-right">
                        <a
                          href={item.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
                        >
                          {item.txHash.slice(0, 10)}...
                          <ExternalLink className="size-3" aria-hidden="true" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
