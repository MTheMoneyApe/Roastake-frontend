// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { z } from "zod";
import { TESTNET_RPC_ENDPOINTS, assertTestnetRpcUrl } from "@/lib/oracle/config";
import { formatFixedPoint, parseUnsignedBigInt } from "@/lib/oracle/format";
import {
  OracleRpcError,
  postJsonRpc,
  validateEndpointList,
  type FetchLike,
} from "@/lib/oracle/rpc";
import {
  MARKET_ARABICA_PERPS_ID,
  PERPS_CONTRACT_ID,
  PERPS_RPC_TIMEOUT_MS,
  getExplorerTxUrl,
} from "./config";
import { validatePerpsTargetContractId, validatePerpsTraderAccountId } from "./rpc";
import type {
  PerpsMarketHistorySnapshot,
  VerifiedHistoryTxPointer,
  VerifiedOracleObservation,
  VerifiedTradeMarker,
} from "./market-history-types";

const SIGNED_INT_REGEX = /^-?\d+$/;
const UNSIGNED_INT_REGEX = /^\d+$/;

const BlockHeaderTimestampSchema = z.object({
  header: z.object({
    hash: z.string().min(1),
    height: z.number().int().nonnegative().optional(),
    timestamp: z.number().nonnegative().optional(),
    timestamp_nanosec: z.string().regex(UNSIGNED_INT_REGEX).optional(),
  }),
});

const TxHistoryExecutionOutcomeSchema = z.object({
  status: z.unknown(),
  logs: z.array(z.string()).default([]),
  receipt_ids: z.array(z.string()).optional(),
  executor_id: z.string().optional(),
});

const TxHistoryReceiptOutcomeSchema = z.object({
  id: z.string().min(1),
  block_hash: z.string().min(1).optional(),
  outcome: TxHistoryExecutionOutcomeSchema,
});

export const TxHistoryStatusResultSchema = z.object({
  final_execution_status: z.string().optional(),
  status: z.unknown(),
  transaction: z
    .object({
      hash: z.string().optional(),
      signer_id: z.string().optional(),
      receiver_id: z.string().optional(),
    })
    .optional(),
  transaction_outcome: z
    .object({
      id: z.string().optional(),
      block_hash: z.string().min(1).optional(),
      outcome: TxHistoryExecutionOutcomeSchema.optional(),
    })
    .optional(),
  receipts_outcome: z.array(TxHistoryReceiptOutcomeSchema).default([]),
});

export type TxHistoryStatusResult = z.output<typeof TxHistoryStatusResultSchema>;

const OracleSandboxTickDataSchema = z
  .object({
    market_id: z.string().min(1),
    price_e8: z.union([z.string().regex(UNSIGNED_INT_REGEX), z.number().int().positive()]),
    observed_at_sec: z.number().int().positive(),
    sequence: z.number().int().nonnegative(),
    publisher: z.string().min(1).optional(),
    data_class: z.string().min(1).optional(),
    classification: z.string().min(1).optional(),
  })
  .refine((d) => Boolean(d.data_class ?? d.classification), {
    message: "oracle_sandbox_tick must include data_class or classification",
  });

const PositionOpenedDataSchema = z.object({
  market_id: z.string().min(1),
  position_id: z.number().int().nonnegative(),
  owner: z.string().min(1),
  side: z.enum(["Long", "Short"]),
  size_e8: z.union([z.string().regex(UNSIGNED_INT_REGEX), z.number().int().nonnegative()]),
  notional_e8: z.union([z.string().regex(UNSIGNED_INT_REGEX), z.number().int().nonnegative()]),
  exec_price_e8: z.union([z.string().regex(UNSIGNED_INT_REGEX), z.number().int().positive()]),
  margin_e8: z.union([z.string().regex(UNSIGNED_INT_REGEX), z.number().int().nonnegative()]),
  fee_e8: z.union([z.string().regex(UNSIGNED_INT_REGEX), z.number().int().nonnegative()]),
});

const PositionClosedDataSchema = z.object({
  market_id: z.string().min(1),
  position_id: z.number().int().nonnegative(),
  owner: z.string().min(1).optional(),
  exec_price_e8: z.union([z.string().regex(UNSIGNED_INT_REGEX), z.number().int().positive()]),
  realized_pnl_e8: z.union([z.string().regex(SIGNED_INT_REGEX), z.number().int()]),
  funding_settled_e8: z.union([z.string().regex(SIGNED_INT_REGEX), z.number().int()]),
  fee_e8: z.union([z.string().regex(UNSIGNED_INT_REGEX), z.number().int().nonnegative()]),
  payout_e8: z.union([z.string().regex(UNSIGNED_INT_REGEX), z.number().int().nonnegative()]),
  bad_debt_e8: z.union([z.string().regex(UNSIGNED_INT_REGEX), z.number().int().nonnegative()]),
  emergency: z.boolean().optional(),
});

const Nep297EnvelopeSchema = z.object({
  standard: z.string().optional(),
  version: z.string().optional(),
  event: z.string().min(1),
  data: z.unknown(),
});

/**
 * Convert an e8 fixed-point USD price strictly to a positive finite number for chart rendering.
 * Never swallows invalid, zero, negative, or non-numeric values.
 */
export function priceE8ToChartValue(rawPriceE8: string | number | bigint): number {
  const input = typeof rawPriceE8 === "number" ? String(Math.trunc(rawPriceE8)) : rawPriceE8;
  const parsed = parseUnsignedBigInt(input);
  if (parsed === null || parsed <= 0n) {
    throw new Error(`Invalid positive e8 price value: "${String(rawPriceE8)}"`);
  }
  const decimal = formatFixedPoint(parsed, 8, {
    trimTrailingZeros: false,
    groupThousands: false,
  });
  const numeric = Number(decimal);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error(`Non-finite chart price conversion for "${String(rawPriceE8)}"`);
  }
  return numeric;
}

export function extractStrictBlockTimestampSec(
  header: z.output<typeof BlockHeaderTimestampSchema>["header"],
): number {
  if (header.timestamp_nanosec) {
    const sec = Number(BigInt(header.timestamp_nanosec) / 1_000_000_000n);
    if (Number.isSafeInteger(sec) && sec > 0) return sec;
  }
  if (
    typeof header.timestamp === "number" &&
    Number.isFinite(header.timestamp) &&
    header.timestamp > 0
  ) {
    return Math.floor(header.timestamp / 1_000_000_000);
  }
  throw new Error(`Block "${header.hash}" does not carry a valid nanosecond timestamp.`);
}

export function isOutcomeSuccess(status: unknown): boolean {
  if (!status || typeof status !== "object") return false;
  const rec = status as Record<string, unknown>;
  if ("Failure" in rec) return false;
  return "SuccessValue" in rec || "SuccessReceiptId" in rec;
}

export interface ParsedTxHistoryResult {
  observations: VerifiedOracleObservation[];
  tradeMarkers: VerifiedTradeMarker[];
  rejectedCount: number;
}

/**
 * Verify and extract oracle ticks and position open/close events from a structured NEAR
 * `EXPERIMENTAL_tx_status` outcome. Rejects non-FINAL executions, receipt failures, non-matching
 * executor contracts, cross-market events, and malformed fixed-point/timestamp fields.
 */
export async function parseVerifiedHistoryFromTxOutcome(params: {
  txHash: string;
  txResult: TxHistoryStatusResult;
  expectedContractId?: string;
  expectedMarketId?: string;
  resolveBlockTimestampSec?: (blockHash: string) => Promise<number>;
}): Promise<ParsedTxHistoryResult> {
  const expectedContractId = validatePerpsTargetContractId(
    params.expectedContractId ?? PERPS_CONTRACT_ID,
  );
  const expectedMarketId = params.expectedMarketId ?? MARKET_ARABICA_PERPS_ID;
  const parsedOutcome = TxHistoryStatusResultSchema.parse(params.txResult);

  if (parsedOutcome.final_execution_status !== "FINAL") {
    return { observations: [], tradeMarkers: [], rejectedCount: 1 };
  }
  if (!isOutcomeSuccess(parsedOutcome.status)) {
    return { observations: [], tradeMarkers: [], rejectedCount: 1 };
  }
  if (parsedOutcome.receipts_outcome.some((r) => !isOutcomeSuccess(r.outcome.status))) {
    return { observations: [], tradeMarkers: [], rejectedCount: 1 };
  }

  const signerId = parsedOutcome.transaction?.signer_id ?? "unknown";
  const txHash = (parsedOutcome.transaction?.hash ?? params.txHash).trim();
  const explorerUrl = getExplorerTxUrl(txHash);
  const observations: VerifiedOracleObservation[] = [];
  const tradeMarkers: VerifiedTradeMarker[] = [];
  let rejectedCount = 0;

  for (const receipt of parsedOutcome.receipts_outcome) {
    if (receipt.outcome.executor_id !== expectedContractId) {
      continue;
    }

    const blockHash = receipt.block_hash ?? parsedOutcome.transaction_outcome?.block_hash ?? null;

    for (const log of receipt.outcome.logs) {
      if (!log.startsWith("EVENT_JSON:")) continue;
      let rawJson: unknown;
      try {
        rawJson = JSON.parse(log.slice("EVENT_JSON:".length));
      } catch {
        rejectedCount += 1;
        continue;
      }

      const envelope = Nep297EnvelopeSchema.safeParse(rawJson);
      if (!envelope.success) {
        rejectedCount += 1;
        continue;
      }

      const { event, data } = envelope.data;
      const entries = Array.isArray(data) ? data : [data];

      if (event === "oracle_sandbox_tick") {
        for (const entry of entries) {
          const tick = OracleSandboxTickDataSchema.safeParse(entry);
          if (!tick.success) {
            rejectedCount += 1;
            continue;
          }
          if (tick.data.market_id !== expectedMarketId) {
            rejectedCount += 1;
            continue;
          }
          try {
            const priceE8 = String(tick.data.price_e8);
            const priceUsd = priceE8ToChartValue(priceE8);
            observations.push({
              kind: "oracle_sandbox_tick",
              marketId: tick.data.market_id,
              sequence: tick.data.sequence,
              priceE8,
              priceUsd,
              timestampSec: tick.data.observed_at_sec,
              classification: tick.data.data_class ?? tick.data.classification ?? "",
              signerId: tick.data.publisher ?? signerId,
              executorId: expectedContractId,
              txHash,
              receiptId: receipt.id,
              receiptBlockHash: blockHash,
              explorerUrl,
            });
          } catch {
            rejectedCount += 1;
          }
        }
        continue;
      }

      if (event === "position_opened" || event === "position_closed") {
        let timestampSec: number | null = null;
        if (blockHash && params.resolveBlockTimestampSec) {
          try {
            const resolved = await params.resolveBlockTimestampSec(blockHash);
            if (Number.isSafeInteger(resolved) && resolved > 0) {
              timestampSec = resolved;
            }
          } catch {
            timestampSec = null;
          }
        }
        if (timestampSec === null) {
          rejectedCount += entries.length || 1;
          continue;
        }

        if (event === "position_opened") {
          for (const entry of entries) {
            const opened = PositionOpenedDataSchema.safeParse(entry);
            if (!opened.success) {
              rejectedCount += 1;
              continue;
            }
            if (opened.data.market_id !== expectedMarketId) {
              rejectedCount += 1;
              continue;
            }
            try {
              const execPriceE8 = String(opened.data.exec_price_e8);
              const execPriceUsd = priceE8ToChartValue(execPriceE8);
              tradeMarkers.push({
                kind: opened.data.side === "Long" ? "LONG_OPEN" : "SHORT_OPEN",
                marketId: opened.data.market_id,
                positionId: opened.data.position_id,
                side: opened.data.side,
                owner: opened.data.owner,
                execPriceE8,
                execPriceUsd,
                sizeE8: String(opened.data.size_e8),
                notionalE8: String(opened.data.notional_e8),
                marginE8: String(opened.data.margin_e8),
                feeE8: String(opened.data.fee_e8),
                realizedPnlE8: null,
                fundingSettledE8: null,
                payoutE8: null,
                emergency: null,
                timestampSec,
                anchorTimeSec: null,
                anchorSequence: null,
                signerId,
                executorId: expectedContractId,
                txHash,
                receiptId: receipt.id,
                receiptBlockHash: blockHash,
                explorerUrl,
              });
            } catch {
              rejectedCount += 1;
            }
          }
          continue;
        }

        for (const entry of entries) {
          const closed = PositionClosedDataSchema.safeParse(entry);
          if (!closed.success) {
            rejectedCount += 1;
            continue;
          }
          if (closed.data.market_id !== expectedMarketId) {
            rejectedCount += 1;
            continue;
          }
          try {
            const execPriceE8 = String(closed.data.exec_price_e8);
            const execPriceUsd = priceE8ToChartValue(execPriceE8);
            tradeMarkers.push({
              kind: "CLOSE",
              marketId: closed.data.market_id,
              positionId: closed.data.position_id,
              side: null,
              owner: closed.data.owner ?? signerId,
              execPriceE8,
              execPriceUsd,
              sizeE8: null,
              notionalE8: null,
              marginE8: null,
              feeE8: String(closed.data.fee_e8),
              realizedPnlE8: String(closed.data.realized_pnl_e8),
              fundingSettledE8: String(closed.data.funding_settled_e8),
              payoutE8: String(closed.data.payout_e8),
              emergency: closed.data.emergency ?? false,
              timestampSec,
              anchorTimeSec: null,
              anchorSequence: null,
              signerId,
              executorId: expectedContractId,
              txHash,
              receiptId: receipt.id,
              receiptBlockHash: blockHash,
              explorerUrl,
            });
          } catch {
            rejectedCount += 1;
          }
        }
      }
    }
  }

  return { observations, tradeMarkers, rejectedCount };
}

/**
 * Deduplicate (by txHash & sequence), enforce chronological ascending sort, and maintain
 * strictly ascending timestamps required by Lightweight Charts `LineSeries`.
 */
export function normalizeAndSortObservations(
  rawObservations: readonly VerifiedOracleObservation[],
): VerifiedOracleObservation[] {
  const sorted = [...rawObservations].sort(
    (a, b) =>
      a.timestampSec - b.timestampSec ||
      a.sequence - b.sequence ||
      a.txHash.localeCompare(b.txHash),
  );
  const seenHashes = new Set<string>();
  const seenSequences = new Set<number>();
  const deduped: VerifiedOracleObservation[] = [];

  for (const obs of sorted) {
    if (seenHashes.has(obs.txHash) || seenSequences.has(obs.sequence)) {
      continue;
    }
    seenHashes.add(obs.txHash);
    seenSequences.add(obs.sequence);

    const prev = deduped[deduped.length - 1];
    if (prev && prev.timestampSec === obs.timestampSec) {
      // Lightweight Charts rejects equal duplicate timestamps on LineSeries; keep the higher sequence tick.
      deduped[deduped.length - 1] = obs;
      continue;
    }
    deduped.push(obs);
  }
  return deduped;
}

/**
 * Deduplicate and anchor trade markers deterministically onto the latest active verified oracle
 * observation (`obs.timestampSec <= marker.timestampSec`) so markers sit on true execution context
 * without inventing synthetic price bars.
 */
export function normalizeAndAnchorTradeMarkers(
  rawMarkers: readonly VerifiedTradeMarker[],
  observations: readonly VerifiedOracleObservation[],
): VerifiedTradeMarker[] {
  const sorted = [...rawMarkers].sort(
    (a, b) =>
      a.timestampSec - b.timestampSec ||
      a.positionId - b.positionId ||
      a.kind.localeCompare(b.kind),
  );
  const seenKeys = new Set<string>();
  const deduped: VerifiedTradeMarker[] = [];

  for (const marker of sorted) {
    const key = `${marker.kind}:${marker.positionId}:${marker.txHash}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    let anchor: VerifiedOracleObservation | null = null;
    for (const obs of observations) {
      if (obs.timestampSec <= marker.timestampSec) {
        anchor = obs;
      } else {
        break;
      }
    }
    if (!anchor && observations.length > 0) {
      anchor = observations[0];
    }

    deduped.push({
      ...marker,
      anchorTimeSec: anchor?.timestampSec ?? null,
      anchorSequence: anchor?.sequence ?? null,
    });
  }

  return deduped;
}

export async function fetchVerifiedHistoryFromRpc(params: {
  txPointers: readonly VerifiedHistoryTxPointer[];
  contractId?: string;
  marketId?: string;
  maxAgeSec?: number;
  referenceNowSec?: number | null;
  endpoints?: readonly string[];
  fetchFn?: FetchLike;
  timeoutMs?: number;
}): Promise<PerpsMarketHistorySnapshot> {
  const endpoints = validateEndpointList(params.endpoints ?? TESTNET_RPC_ENDPOINTS);
  const contractId = validatePerpsTargetContractId(params.contractId ?? PERPS_CONTRACT_ID);
  const marketId = params.marketId ?? MARKET_ARABICA_PERPS_ID;
  const maxAgeSec = params.maxAgeSec ?? 300;
  const fetchFn = params.fetchFn ?? fetch;
  const timeoutMs = params.timeoutMs ?? PERPS_RPC_TIMEOUT_MS;

  const validatedPointers = params.txPointers.map((ptr) => ({
    txHash: ptr.txHash.trim(),
    senderAccountId: validatePerpsTraderAccountId(ptr.senderAccountId),
    role: ptr.role,
    label: ptr.label,
  }));

  let lastError: unknown;

  for (const rawEndpoint of endpoints) {
    const endpoint = assertTestnetRpcUrl(rawEndpoint);
    const blockTimestampCache = new Map<string, Promise<number>>();

    const resolveBlockTimestampSec = (blockHash: string): Promise<number> => {
      const existing = blockTimestampCache.get(blockHash);
      if (existing) return existing;
      const promise = postJsonRpc({
        endpoint,
        method: "block",
        params: { block_id: blockHash },
        resultSchema: BlockHeaderTimestampSchema,
        fetchFn,
        timeoutMs,
        label: `block(${blockHash.slice(0, 8)})`,
        requestId: "roastake-perps-history",
      }).then((res) => extractStrictBlockTimestampSec(res.header));
      blockTimestampCache.set(blockHash, promise);
      return promise;
    };

    try {
      const referenceNowSec =
        typeof params.referenceNowSec === "number" && Number.isFinite(params.referenceNowSec)
          ? Math.floor(params.referenceNowSec)
          : await postJsonRpc({
              endpoint,
              method: "block",
              params: { finality: "final" },
              resultSchema: BlockHeaderTimestampSchema,
              fetchFn,
              timeoutMs,
              label: "block(final)",
              requestId: "roastake-perps-history",
            }).then((res) => extractStrictBlockTimestampSec(res.header));

      const rawObservations: VerifiedOracleObservation[] = [];
      const rawMarkers: VerifiedTradeMarker[] = [];
      let rejectedCount = 0;
      let transportFailures = 0;
      let firstTransportError: unknown = null;

      const settled = await Promise.allSettled(
        validatedPointers.map(async (ptr) => {
          const txResult = await postJsonRpc({
            endpoint,
            method: "EXPERIMENTAL_tx_status",
            params: {
              tx_hash: ptr.txHash,
              sender_account_id: ptr.senderAccountId,
              wait_until: "FINAL",
            },
            resultSchema: TxHistoryStatusResultSchema,
            fetchFn,
            timeoutMs,
            label: `tx_history(${ptr.txHash.slice(0, 8)})`,
            requestId: "roastake-perps-history",
          });
          return parseVerifiedHistoryFromTxOutcome({
            txHash: ptr.txHash,
            txResult,
            expectedContractId: contractId,
            expectedMarketId: marketId,
            resolveBlockTimestampSec,
          });
        }),
      );

      for (const item of settled) {
        if (item.status === "fulfilled") {
          rawObservations.push(...item.value.observations);
          rawMarkers.push(...item.value.tradeMarkers);
          rejectedCount += item.value.rejectedCount;
        } else {
          if (item.reason instanceof OracleRpcError && item.reason.code === "POLICY_ERROR") {
            throw item.reason;
          }
          transportFailures += 1;
          firstTransportError ??= item.reason;
        }
      }

      if (validatedPointers.length > 0 && transportFailures === validatedPointers.length) {
        throw firstTransportError instanceof Error
          ? firstTransportError
          : new OracleRpcError("All history RPC requests failed.", "NETWORK");
      }

      const observations = normalizeAndSortObservations(rawObservations);
      const tradeMarkers = normalizeAndAnchorTradeMarkers(rawMarkers, observations);
      const latestObservation =
        observations.length > 0 ? observations[observations.length - 1] : null;
      const latestAgeSec = latestObservation
        ? Math.max(0, referenceNowSec - latestObservation.timestampSec)
        : null;
      const isStale = latestAgeSec !== null && latestAgeSec > maxAgeSec;

      return {
        network: "testnet",
        contractId,
        marketId,
        rpcEndpoint: endpoint,
        referenceNowSec,
        maxAgeSec,
        fetchedAtMs: Date.now(),
        sourceMode: "verified_testnet_tx_receipts",
        observations,
        tradeMarkers,
        latestObservation,
        latestAgeSec,
        isStale,
        rejectedCount,
      };
    } catch (err) {
      if (err instanceof OracleRpcError && err.code === "POLICY_ERROR") {
        throw err;
      }
      lastError = err;
    }
  }

  if (lastError instanceof OracleRpcError) {
    throw lastError;
  }
  throw new OracleRpcError(
    `Historical oracle data unavailable from NEAR Testnet RPC endpoints.`,
    "NETWORK",
  );
}
