// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { useSyncExternalStore } from "react";
import { TESTNET_RPC_ENDPOINTS } from "@/lib/oracle/config";
import type { FetchLike } from "@/lib/oracle/rpc";
import type { NearSignedTxOutcome, NearTransactionRequest } from "@/lib/wallet/types";
import { PERPS_CONTRACT_ID, PERPS_TX_VERIFY_TIMEOUT_MS, getExplorerTxUrl } from "./config";
import {
  mapKnownPerpsContractError,
  verifyNearTransactionFinality,
  type NearTxExpectedFlow,
} from "./rpc";
import type { NearTxLifecyclePhase, NearUserTxRecord } from "./types";

const STORAGE_KEY = "roastake-perps-tx-history-v1";
const MAX_HISTORY_RECORDS = 40;

const SERVER_RECORDS: readonly NearUserTxRecord[] = [];
let txRecords: NearUserTxRecord[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((cb) => cb());
}

function persistRecords() {
  if (typeof window === "undefined") return;
  try {
    if (typeof localStorage?.setItem === "function") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(txRecords));
    }
  } catch {
    // Keep session history in memory if browser storage is restricted.
  }
}

export function hydratePerpsTxHistory() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    if (typeof localStorage?.getItem !== "function") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      txRecords = parsed.slice(0, MAX_HISTORY_RECORDS) as NearUserTxRecord[];
      notify();
    }
  } catch {
    // Ignore malformed local session logs cleanly.
  }
}

export function usePerpsTxHistory(): readonly NearUserTxRecord[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => txRecords,
    () => SERVER_RECORDS,
  );
}

export function clearPerpsTxHistory() {
  txRecords = [];
  if (typeof window !== "undefined") {
    try {
      if (typeof localStorage?.removeItem === "function") {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage failures.
    }
  }
  notify();
}

function upsertTxRecord(record: NearUserTxRecord) {
  const existingIndex = txRecords.findIndex((r) => r.id === record.id);
  if (existingIndex >= 0) {
    txRecords = txRecords.map((r, i) => (i === existingIndex ? record : r));
  } else {
    txRecords = [record, ...txRecords].slice(0, MAX_HISTORY_RECORDS);
  }
  persistRecords();
  notify();
}

export function classifyWalletErrorPhase(err: unknown): {
  phase: Extract<NearTxLifecyclePhase, "failed" | "expired" | "unknown_verification_required">;
  message: string;
} {
  const raw = err instanceof Error ? err.message : String(err ?? "Wallet signing failed.");
  const lower = raw.toLowerCase();
  if (lower.includes("expired") || lower.includes("timed out") || lower.includes("timeout")) {
    return {
      phase: "expired",
      message: "Wallet signing request timed out or expired before broadcast. You can safely review parameters and try again.",
    };
  }
  if (
    lower.includes("without returning a transaction hash") ||
    lower.includes("without a transaction hash") ||
    lower.includes("disconnected while waiting") ||
    lower.includes("switched accounts") ||
    lower.includes("unknown_verification_required")
  ) {
    return {
      phase: "unknown_verification_required",
      message: `${raw} Verify your account on NEAR Explorer before retrying.`,
    };
  }
  if (
    lower.includes("rejected") ||
    lower.includes("denied") ||
    lower.includes("cancelled") ||
    lower.includes("canceled")
  ) {
    return {
      phase: "failed",
      message: "Signature cancelled in wallet before broadcast.",
    };
  }
  return {
    phase: "failed",
    message: mapKnownPerpsContractError(raw),
  };
}

export interface ExecuteNearPerpsTxInput {
  actionLabel: string;
  flow: NearTxExpectedFlow;
  marketId?: string;
  token?: string;
  amountDisplay: string;
  signerId: string;
  request: NearTransactionRequest;
  sendTransaction: (request: NearTransactionRequest) => Promise<NearSignedTxOutcome>;
  endpoints?: readonly string[];
  fetchFn?: FetchLike;
  onPhaseChange?: (record: NearUserTxRecord) => void;
}

export async function executeNearPerpsTx(
  input: ExecuteNearPerpsTxInput,
): Promise<NearUserTxRecord> {
  const id = `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const emit = (patch: Partial<NearUserTxRecord>): NearUserTxRecord => {
    const prev = txRecords.find((r) => r.id === id);
    const next: NearUserTxRecord = {
      id,
      action: input.actionLabel,
      marketId: input.marketId,
      token: input.token,
      amountDisplay: input.amountDisplay,
      signerId: input.signerId,
      receiverId: input.request.receiverId || PERPS_CONTRACT_ID,
      phase: "awaiting_wallet",
      detail: "Waiting for wallet prompt confirmation...",
      timestampIso: new Date().toISOString(),
      ...prev,
      ...patch,
    };
    upsertTxRecord(next);
    input.onPhaseChange?.(next);
    return next;
  };

  emit({
    phase: "awaiting_wallet",
    detail: "Preparing Testnet FunctionCall payload for wallet confirmation...",
  });

  let outcome: NearSignedTxOutcome;
  try {
    emit({
      phase: "signing",
      detail: `Review and approve transaction in your NEAR Testnet wallet (${input.signerId}).`,
    });
    outcome = await input.sendTransaction({
      ...input.request,
      signerId: input.signerId,
    });
  } catch (err) {
    const classified = classifyWalletErrorPhase(err);
    return emit({
      phase: classified.phase,
      detail: classified.message,
    });
  }

  const explorerUrl = getExplorerTxUrl(outcome.transactionHash);
  emit({
    phase: "processing",
    txHash: outcome.transactionHash,
    explorerUrl,
    detail: `Broadcast submitted (${outcome.transactionHash.slice(0, 10)}...). Waiting for execution receipts...`,
  });

  emit({
    phase: "finalizing",
    txHash: outcome.transactionHash,
    explorerUrl,
    detail: "Checking FINAL block finality and async receipts via EXPERIMENTAL_tx_status...",
  });

  const verified = await verifyNearTransactionFinality({
    txHash: outcome.transactionHash,
    senderAccountId: input.signerId,
    expectedFlow: input.flow,
    endpoints: input.endpoints ?? TESTNET_RPC_ENDPOINTS,
    fetchFn: input.fetchFn,
    timeoutMs: PERPS_TX_VERIFY_TIMEOUT_MS,
  });

  return emit({
    phase: verified.verdict,
    txHash: outcome.transactionHash,
    explorerUrl,
    detail: verified.detail,
  });
}

export async function reverifyTrackedNearTx(params: {
  record: NearUserTxRecord;
  flow: NearTxExpectedFlow;
  endpoints?: readonly string[];
  fetchFn?: FetchLike;
}): Promise<NearUserTxRecord> {
  if (!params.record.txHash) {
    return params.record;
  }
  const checking: NearUserTxRecord = {
    ...params.record,
    phase: "finalizing",
    detail: "Re-checking NEAR Testnet RPC EXPERIMENTAL_tx_status...",
  };
  upsertTxRecord(checking);

  const verified = await verifyNearTransactionFinality({
    txHash: params.record.txHash,
    senderAccountId: params.record.signerId,
    expectedFlow: params.flow,
    endpoints: params.endpoints ?? TESTNET_RPC_ENDPOINTS,
    fetchFn: params.fetchFn,
    timeoutMs: PERPS_TX_VERIFY_TIMEOUT_MS,
  });

  const next: NearUserTxRecord = {
    ...params.record,
    phase: verified.verdict,
    detail: verified.detail,
  };
  upsertTxRecord(next);
  return next;
}
