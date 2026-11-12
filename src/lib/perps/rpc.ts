// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { z } from "zod";
import { TESTNET_RPC_ENDPOINTS, assertTestnetAccountId, assertTestnetRpcUrl } from "@/lib/oracle/config";
import {
  CallFunctionResultSchema,
  OracleRpcError,
  decodeRpcCallResult,
  encodeJsonArgsBase64,
  postJsonRpc,
  validateEndpointList,
  type FetchLike,
} from "@/lib/oracle/rpc";
import { U128StringSchema } from "@/lib/oracle/types";
import {
  CIRCLE_TESTNET_USDC_ID,
  MARKET_ARABICA_PERPS_ID,
  MARKET_GESHA_PERPS_ID,
  MARKET_ROBUSTA_PERPS_ID,
  PERPS_CONTRACT_ID,
  PERPS_RPC_TIMEOUT_MS,
} from "./config";
import {
  FtMetadataSchema,
  LpSnapshotViewSchema,
  NullableCollateralTokenViewSchema,
  NullableMarketViewSchema,
  NullablePerpsAccountViewSchema,
  NullablePositionHealthViewSchema,
  NullableStorageBalanceViewSchema,
  PerpsAccountingSnapshotViewSchema,
  PositionListSchema,
  type PerpsProtocolSnapshot,
  type PerpsTraderSnapshot,
  type PositionWithHealth,
} from "./types";

const IMPLICIT_HEX_64_REGEX = /^[0-9a-f]{64}$/;

const PerpsBlockResultSchema = z.object({
  header: z.object({
    hash: z.string().min(1),
    height: z.number().int().nonnegative().optional(),
    timestamp: z.number().nonnegative().optional(),
    timestamp_nanosec: z.string().regex(/^\d+$/).optional(),
  }),
});

const ViewAccountResultSchema = z.object({
  amount: U128StringSchema,
  locked: U128StringSchema.optional(),
  storage_usage: z.number().int().nonnegative().optional(),
  block_hash: z.string().optional(),
  block_height: z.number().int().nonnegative().optional(),
});

const NearExecutionOutcomeSchema = z.object({
  status: z.unknown(),
  logs: z.array(z.string()).default([]),
  receipt_ids: z.array(z.string()).optional(),
  executor_id: z.string().optional(),
});

const NearReceiptOutcomeSchema = z.object({
  id: z.string(),
  outcome: NearExecutionOutcomeSchema,
});

const ExperimentalTxStatusResultSchema = z.object({
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
      outcome: NearExecutionOutcomeSchema.optional(),
    })
    .optional(),
  receipts_outcome: z.array(NearReceiptOutcomeSchema).default([]),
});

export function validatePerpsTargetContractId(rawContractId: string): string {
  const trimmed = rawContractId.trim().toLowerCase();
  if (trimmed === CIRCLE_TESTNET_USDC_ID) {
    return trimmed;
  }
  try {
    return assertTestnetAccountId(rawContractId, "Perps/Token Contract ID");
  } catch (err) {
    throw new OracleRpcError(
      err instanceof Error ? err.message : `Invalid Testnet contract ID: "${rawContractId}".`,
      "POLICY_ERROR",
      undefined,
      { cause: err },
    );
  }
}

export function validatePerpsTraderAccountId(rawAccountId: string): string {
  const trimmed = rawAccountId.trim().toLowerCase();
  if (trimmed.endsWith(".near")) {
    throw new OracleRpcError(
      `Testnet-only policy violation: Account ID "${rawAccountId}" targets Mainnet (.near).`,
      "POLICY_ERROR",
    );
  }
  if (trimmed.endsWith(".testnet")) {
    return trimmed;
  }
  if (IMPLICIT_HEX_64_REGEX.test(trimmed)) {
    return trimmed;
  }
  throw new OracleRpcError(
    `Testnet-only policy violation: Trader Account ID "${rawAccountId}" is not a valid NEAR Testnet account.`,
    "POLICY_ERROR",
  );
}

function extractBlockTimestampSec(header: z.output<typeof PerpsBlockResultSchema>["header"]): number {
  if (header.timestamp_nanosec) {
    return Number(BigInt(header.timestamp_nanosec) / 1_000_000_000n);
  }
  if (typeof header.timestamp === "number" && Number.isFinite(header.timestamp)) {
    return Math.floor(header.timestamp / 1_000_000_000);
  }
  return Math.floor(Date.now() / 1000);
}

export async function fetchFreshFinalizedBlockTimestampSec(
  opts: Pick<PerpsRpcFetchOptions, "endpoints" | "fetchFn" | "timeoutMs"> = {},
): Promise<{ blockHash: string; blockHeight?: number; blockTimestampSec: number }> {
  const endpoints = validateEndpointList(opts.endpoints ?? TESTNET_RPC_ENDPOINTS);
  const fetchFn = opts.fetchFn ?? fetch;
  const timeoutMs = opts.timeoutMs ?? PERPS_RPC_TIMEOUT_MS;
  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      return await fetchFinalizedBlockWithTimestamp({ endpoint, fetchFn, timeoutMs });
    } catch (err) {
      if (err instanceof OracleRpcError && err.code === "POLICY_ERROR") throw err;
      lastError = err;
    }
  }
  if (lastError instanceof OracleRpcError) throw lastError;
  throw new OracleRpcError("Failed to query finalized NEAR Testnet block timestamp.", "NETWORK");
}

async function fetchFinalizedBlockWithTimestamp(opts: {
  endpoint: string;
  fetchFn: FetchLike;
  timeoutMs: number;
}): Promise<{ blockHash: string; blockHeight?: number; blockTimestampSec: number }> {
  const result = await postJsonRpc({
    endpoint: opts.endpoint,
    method: "block",
    params: { finality: "final" },
    resultSchema: PerpsBlockResultSchema,
    fetchFn: opts.fetchFn,
    timeoutMs: opts.timeoutMs,
    label: "block",
    requestId: "roastake-perps-readonly",
  });
  return {
    blockHash: result.header.hash,
    blockHeight: result.header.height,
    blockTimestampSec: extractBlockTimestampSec(result.header),
  };
}

async function callPerpsViewSingleEndpoint<S extends z.ZodTypeAny>(opts: {
  endpoint: string;
  contractId: string;
  methodName: string;
  args: unknown;
  schema: S;
  fetchFn: FetchLike;
  timeoutMs: number;
  blockId?: string;
}): Promise<z.output<S>> {
  const endpoint = assertTestnetRpcUrl(opts.endpoint);
  const contractId = validatePerpsTargetContractId(opts.contractId);
  const argsBase64 = encodeJsonArgsBase64(opts.args ?? {});
  const blockTarget = opts.blockId ? { block_id: opts.blockId } : { finality: "final" as const };

  const rpcResult = await postJsonRpc({
    endpoint,
    method: "query",
    params: {
      request_type: "call_function",
      ...blockTarget,
      account_id: contractId,
      method_name: opts.methodName,
      args_base64: argsBase64,
    },
    resultSchema: CallFunctionResultSchema,
    fetchFn: opts.fetchFn,
    timeoutMs: opts.timeoutMs,
    label: `${contractId}::${opts.methodName}`,
    requestId: "roastake-perps-readonly",
  });

  if (rpcResult.error) {
    throw new OracleRpcError(
      `Contract view error in ${contractId}::${opts.methodName}: ${rpcResult.error}`,
      "RPC_ERROR",
      endpoint,
    );
  }

  if (opts.blockId && rpcResult.block_hash && rpcResult.block_hash !== opts.blockId) {
    throw new OracleRpcError(
      `NEAR RPC returned block_hash "${rpcResult.block_hash}" instead of pinned "${opts.blockId}" on ${opts.methodName}.`,
      "INVALID_RESPONSE",
      endpoint,
    );
  }

  return decodeRpcCallResult(rpcResult.result, opts.schema, `${contractId}::${opts.methodName}`);
}

export interface PerpsRpcFetchOptions {
  perpsContractId?: string;
  collateralTokenId?: string;
  endpoints?: readonly string[];
  fetchFn?: FetchLike;
  timeoutMs?: number;
}

export async function fetchPerpsProtocolSnapshot(
  opts: PerpsRpcFetchOptions = {},
): Promise<PerpsProtocolSnapshot> {
  const contractId = validatePerpsTargetContractId(opts.perpsContractId ?? PERPS_CONTRACT_ID);
  const collateralTokenId = validatePerpsTargetContractId(
    opts.collateralTokenId ?? CIRCLE_TESTNET_USDC_ID,
  );
  const endpoints = validateEndpointList(opts.endpoints ?? TESTNET_RPC_ENDPOINTS);
  const fetchFn = opts.fetchFn ?? fetch;
  const timeoutMs = opts.timeoutMs ?? PERPS_RPC_TIMEOUT_MS;

  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      const block = await fetchFinalizedBlockWithTimestamp({ endpoint, fetchFn, timeoutMs });
      const view = <S extends z.ZodTypeAny>(
        targetContract: string,
        methodName: string,
        schema: S,
        args: unknown = {},
      ) =>
        callPerpsViewSingleEndpoint({
          endpoint,
          contractId: targetContract,
          methodName,
          args,
          schema,
          fetchFn,
          timeoutMs,
          blockId: block.blockHash,
        });

      const [
        admin,
        treasury,
        pausedGlobal,
        markets,
        arabicaMarket,
        robustaMarket,
        geshaMarket,
        collateralConfig,
        lpSnapshot,
        accounting,
        solvencyInvariant,
        circleMetadata,
        contractUsdcBalanceUnits,
        contractCircleStorage,
      ] = await Promise.all([
        view(contractId, "get_admin", z.string()),
        view(contractId, "get_treasury", z.string()),
        view(contractId, "is_paused_global", z.boolean()),
        view(contractId, "list_markets", z.array(z.string())),
        view(contractId, "get_market", NullableMarketViewSchema, {
          market_id: MARKET_ARABICA_PERPS_ID,
        }),
        view(contractId, "get_market", NullableMarketViewSchema, {
          market_id: MARKET_ROBUSTA_PERPS_ID,
        }),
        view(contractId, "get_market", NullableMarketViewSchema, {
          market_id: MARKET_GESHA_PERPS_ID,
        }),
        view(contractId, "get_collateral_token", NullableCollateralTokenViewSchema, {
          token_id: collateralTokenId,
        }),
        view(contractId, "get_lp_snapshot", LpSnapshotViewSchema),
        view(contractId, "get_accounting_snapshot", PerpsAccountingSnapshotViewSchema),
        view(contractId, "verify_solvency_invariant", z.boolean()),
        view(collateralTokenId, "ft_metadata", FtMetadataSchema),
        view(collateralTokenId, "ft_balance_of", U128StringSchema, { account_id: contractId }),
        view(collateralTokenId, "storage_balance_of", NullableStorageBalanceViewSchema, {
          account_id: contractId,
        }),
      ]);

      return {
        network: "testnet",
        contractId,
        collateralTokenId,
        rpcEndpoint: endpoint,
        blockHash: block.blockHash,
        blockHeight: block.blockHeight,
        blockTimestampSec: block.blockTimestampSec,
        fetchedAtMs: Date.now(),
        admin,
        treasury,
        pausedGlobal,
        markets,
        arabicaMarket,
        robustaMarket,
        geshaMarket,
        marketStates: {
          [MARKET_ARABICA_PERPS_ID]: arabicaMarket,
          [MARKET_ROBUSTA_PERPS_ID]: robustaMarket,
          [MARKET_GESHA_PERPS_ID]: geshaMarket,
        },
        collateralConfig,
        circleMetadata,
        contractUsdcBalanceUnits,
        contractCircleStorage,
        lpSnapshot,
        accounting,
        solvencyInvariant,
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
    "Failed to fetch live Perpetuals state from NEAR Testnet RPC endpoints.",
    "NETWORK",
  );
}

export async function fetchPerpsTraderSnapshot(
  rawAccountId: string,
  opts: PerpsRpcFetchOptions = {},
): Promise<PerpsTraderSnapshot> {
  const accountId = validatePerpsTraderAccountId(rawAccountId);
  const contractId = validatePerpsTargetContractId(opts.perpsContractId ?? PERPS_CONTRACT_ID);
  const collateralTokenId = validatePerpsTargetContractId(
    opts.collateralTokenId ?? CIRCLE_TESTNET_USDC_ID,
  );
  const endpoints = validateEndpointList(opts.endpoints ?? TESTNET_RPC_ENDPOINTS);
  const fetchFn = opts.fetchFn ?? fetch;
  const timeoutMs = opts.timeoutMs ?? PERPS_RPC_TIMEOUT_MS;

  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      const block = await fetchFinalizedBlockWithTimestamp({ endpoint, fetchFn, timeoutMs });
      const view = <S extends z.ZodTypeAny>(
        targetContract: string,
        methodName: string,
        schema: S,
        args: unknown = {},
      ) =>
        callPerpsViewSingleEndpoint({
          endpoint,
          contractId: targetContract,
          methodName,
          args,
          schema,
          fetchFn,
          timeoutMs,
          blockId: block.blockHash,
        });

      const viewAccountPromise = postJsonRpc({
        endpoint,
        method: "query",
        params: {
          request_type: "view_account",
          block_id: block.blockHash,
          account_id: accountId,
        },
        resultSchema: ViewAccountResultSchema,
        fetchFn,
        timeoutMs,
        label: `view_account(${accountId})`,
        requestId: "roastake-perps-readonly",
      })
        .then((res) => res.amount)
        .catch(() => null);

      const [
        nearBalanceYocto,
        circleUsdcBalanceUnits,
        circleStorage,
        isRegistered,
        perpsStorage,
        account,
        rawPositions,
      ] = await Promise.all([
        viewAccountPromise,
        view(collateralTokenId, "ft_balance_of", U128StringSchema, { account_id: accountId }),
        view(collateralTokenId, "storage_balance_of", NullableStorageBalanceViewSchema, {
          account_id: accountId,
        }),
        view(contractId, "is_account_registered", z.boolean(), { account_id: accountId }),
        view(contractId, "storage_balance_of", NullableStorageBalanceViewSchema, {
          account_id: accountId,
        }),
        view(contractId, "get_account", NullablePerpsAccountViewSchema, {
          account_id: accountId,
        }),
        view(contractId, "get_positions_by_owner", PositionListSchema, { owner: accountId }),
      ]);

      const healthSettled = await Promise.allSettled(
        rawPositions.map((pos) =>
          view(contractId, "get_position_health", NullablePositionHealthViewSchema, {
            position_id: pos.id,
          }),
        ),
      );

      const positions: PositionWithHealth[] = rawPositions.map((record, index) => {
        const res = healthSettled[index];
        return {
          record,
          health: res?.status === "fulfilled" ? res.value : null,
        };
      });

      return {
        accountId,
        rpcEndpoint: endpoint,
        blockHash: block.blockHash,
        blockHeight: block.blockHeight,
        fetchedAtMs: Date.now(),
        nearBalanceYocto,
        circleUsdcBalanceUnits,
        circleStorage,
        isRegistered,
        perpsStorage,
        account,
        positions,
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
    `Failed to load trader state for "${accountId}" from NEAR Testnet RPC.`,
    "NETWORK",
  );
}

export type NearTxExpectedFlow =
  | "register_circle_storage"
  | "register_account"
  | "trader_collateral_deposit"
  | "withdraw_collateral"
  | "open_position"
  | "close_position"
  | "push_sandbox_oracle_price"
  | "lp_deposit"
  | "withdraw_lp";

export interface ParsedNep297Event {
  standard?: string;
  version?: string;
  event?: string;
  data?: unknown;
  executorId?: string;
}

export interface NearTxVerificationResult {
  verdict: "successful" | "failed" | "unknown_verification_required";
  endpoint?: string;
  detail: string;
  events: ParsedNep297Event[];
}

function decodeBase64Utf8(b64: string): string | null {
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      bytes[i] = bin.charCodeAt(i);
    }
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return null;
  }
}

function extractFailureMessage(statusObj: unknown): string | null {
  if (!statusObj || typeof statusObj !== "object") return null;
  const rec = statusObj as Record<string, unknown>;
  if (!("Failure" in rec)) return null;
  try {
    const serialized = JSON.stringify(rec.Failure);
    return mapKnownPerpsContractError(serialized);
  } catch {
    return "NEAR transaction or receipt failed on-chain.";
  }
}

export function mapKnownPerpsContractError(rawMessage: string): string {
  const lower = rawMessage.toLowerCase();
  if (rawMessage.includes("ERR_ORACLE_STALE")) {
    return "Oracle tick is stale (>300s policy). Operator must publish a fresh synthetic tick before opening positions.";
  }
  if (rawMessage.includes("ERR_NO_ORACLE_PRICE")) {
    return "No valid on-chain oracle price available yet.";
  }
  if (rawMessage.includes("ERR_ACCOUNT_NOT_REGISTERED")) {
    return "Trader account is not registered on the Perpetuals contract yet (0.05 NEAR registration required).";
  }
  if (rawMessage.includes("ERR_INSUFFICIENT_FREE_COLLATERAL")) {
    return "Insufficient free margin in your Perpetuals account to cover margin + trade fee.";
  }
  if (rawMessage.includes("ERR_INSUFFICIENT_MARGIN")) {
    return "Collateral below required Initial Margin for this notional size.";
  }
  if (rawMessage.includes("ERR_UTILIZATION_EXCEEDED") || rawMessage.includes("ERR_INSUFFICIENT_LP")) {
    return "Insufficient LP Vault available liquidity / utilization cap exceeded for this trade size.";
  }
  if (rawMessage.includes("ERR_PROTOCOL_PAUSED")) {
    return "Perpetuals protocol is currently paused globally by admin.";
  }
  if (rawMessage.includes("ERR_MARKET_MODE_BLOCKED") || rawMessage.includes("ERR_MARKET_PAUSED")) {
    return "Market mode currently blocks new position openings.";
  }
  if (rawMessage.includes("ERR_PENDING_WITHDRAWAL") || rawMessage.includes("ERR_ACCOUNT_LOCKED")) {
    return "Account has a pending async withdrawal/lock on-chain; wait for finality before submitting another action.";
  }
  if (rawMessage.includes("ERR_ZERO_WITHDRAWAL")) {
    return "Withdrawable token amount converts to 0 USDC units (sub-micro-unit USD residue < $0.000001 cannot transfer on NEP-141).";
  }
  if (rawMessage.includes("ERR_SLIPPAGE") || rawMessage.includes("ERR_PRICE_LIMIT")) {
    return "Execution price moved past your price limit tolerance.";
  }
  if (lower.includes("account") && lower.includes("does not exist")) {
    return "Target NEAR account or Circle USDC storage registration does not exist on-chain.";
  }
  return rawMessage.length > 260 ? `${rawMessage.slice(0, 260)}...` : rawMessage;
}

function parseNep297EventsFromReceipts(
  receipts: readonly z.output<typeof NearReceiptOutcomeSchema>[],
): ParsedNep297Event[] {
  const events: ParsedNep297Event[] = [];
  for (const receipt of receipts) {
    for (const log of receipt.outcome.logs) {
      if (!log.startsWith("EVENT_JSON:")) continue;
      try {
        const parsed = JSON.parse(log.slice("EVENT_JSON:".length)) as ParsedNep297Event;
        events.push({ ...parsed, executorId: receipt.outcome.executor_id });
      } catch {
        // Ignore malformed log line.
      }
    }
  }
  return events;
}

export async function verifyNearTransactionFinality(params: {
  txHash: string;
  senderAccountId: string;
  expectedFlow: NearTxExpectedFlow;
  endpoints?: readonly string[];
  fetchFn?: FetchLike;
  timeoutMs?: number;
}): Promise<NearTxVerificationResult> {
  const txHash = params.txHash.trim();
  if (!txHash) {
    return {
      verdict: "unknown_verification_required",
      detail: "Missing NEAR transaction hash; check wallet activity and NEAR Explorer manually.",
      events: [],
    };
  }
  const senderAccountId = validatePerpsTraderAccountId(params.senderAccountId);
  const endpoints = validateEndpointList(params.endpoints ?? TESTNET_RPC_ENDPOINTS);
  const fetchFn = params.fetchFn ?? fetch;
  const timeoutMs = params.timeoutMs ?? PERPS_RPC_TIMEOUT_MS;

  for (const endpoint of endpoints) {
    try {
      const txResult = await postJsonRpc({
        endpoint,
        method: "EXPERIMENTAL_tx_status",
        params: {
          tx_hash: txHash,
          sender_account_id: senderAccountId,
          wait_until: "FINAL",
        },
        resultSchema: ExperimentalTxStatusResultSchema,
        fetchFn,
        timeoutMs,
        label: `tx_status(${txHash.slice(0, 8)})`,
        requestId: "roastake-perps-tx-verify",
      });

      const events = parseNep297EventsFromReceipts(txResult.receipts_outcome);
      const topFailure = extractFailureMessage(txResult.status);
      if (topFailure) {
        return {
          verdict: "failed",
          endpoint,
          detail: `Transaction failed on-chain: ${topFailure}`,
          events,
        };
      }

      const failedReceiptMessages = txResult.receipts_outcome
        .map((r) => ({ id: r.id, executor: r.outcome.executor_id, msg: extractFailureMessage(r.outcome.status) }))
        .filter((x): x is { id: string; executor: string | undefined; msg: string } => x.msg !== null);

      // For `withdraw_collateral` and `withdraw_lp`, Circle `ft_transfer` may fail in receipt 2
      // while `on_withdraw_transfer` rolls back cleanly with `status: "restored"`.
      if (
        params.expectedFlow === "withdraw_collateral" ||
        params.expectedFlow === "withdraw_lp"
      ) {
        const settledEvent = events.find((e) => {
          if (e.event !== "collateral_withdrawn") return false;
          const d = e.data as { status?: string } | undefined;
          return d?.status === "settled";
        });
        const restoredEvent = events.find((e) => {
          if (e.event !== "collateral_withdrawn") return false;
          const d = e.data as { status?: string } | undefined;
          return d?.status === "restored";
        });
        if (restoredEvent) {
          return {
            verdict: "failed",
            endpoint,
            detail:
              "Withdrawal async ft_transfer failed (verify wallet Circle USDC storage registration); balance was restored by on_withdraw_transfer callback.",
            events,
          };
        }
        if (failedReceiptMessages.length > 0 && !settledEvent) {
          return {
            verdict: "failed",
            endpoint,
            detail: `Withdrawal failed on receipt (${failedReceiptMessages[0].msg}).`,
            events,
          };
        }
        if (settledEvent) {
          return {
            verdict: "successful",
            endpoint,
            detail:
              params.expectedFlow === "withdraw_lp"
                ? "LP share redemption settled on NEAR Testnet via async ft_transfer and callback."
                : "Withdrawal settled on NEAR Testnet via async ft_transfer and callback.",
            events,
          };
        }
      }

      if (
        params.expectedFlow === "trader_collateral_deposit" ||
        params.expectedFlow === "lp_deposit"
      ) {
        const successValueB64 =
          txResult.status && typeof txResult.status === "object"
            ? (txResult.status as { SuccessValue?: unknown }).SuccessValue
            : undefined;
        if (typeof successValueB64 === "string" && successValueB64.length > 0) {
          const decoded = decodeBase64Utf8(successValueB64);
          if (decoded) {
            try {
              const jsonVal = JSON.parse(decoded);
              if (jsonVal === "0" || jsonVal === 0) {
                const causeHint = failedReceiptMessages[0]?.msg
                  ? ` Cause: ${failedReceiptMessages[0].msg}`
                  : "";
                return {
                  verdict: "failed",
                  endpoint,
                  detail: `Deposit rejected by Perpetuals contract and refunded in ft_resolve_transfer ("0" USDC kept).${causeHint}`,
                  events,
                };
              }
            } catch {
              // Non-JSON SuccessValue ignored.
            }
          }
        }
        const expectedEventName =
          params.expectedFlow === "lp_deposit" ? "lp_deposited" : "collateral_deposited";
        const depositedEvent = events.find((e) => e.event === expectedEventName);
        if (failedReceiptMessages.length > 0 && !depositedEvent) {
          return {
            verdict: "failed",
            endpoint,
            detail: `Deposit receipt failed (${failedReceiptMessages[0].msg}); ft_resolve_transfer refunded USDC.`,
            events,
          };
        }
        if (depositedEvent) {
          return {
            verdict: "successful",
            endpoint,
            detail:
              params.expectedFlow === "lp_deposit"
                ? "LP seed deposit verified on Perpetuals contract."
                : "Circle USDC collateral deposit verified on Perpetuals contract.",
            events,
          };
        }
      }

      if (params.expectedFlow === "push_sandbox_oracle_price") {
        const tickEvent = events.find((e) => e.event === "oracle_sandbox_tick");
        if (failedReceiptMessages.length === 0 && tickEvent) {
          return {
            verdict: "successful",
            endpoint,
            detail: "Synthetic sandbox oracle price refreshed on-chain.",
            events,
          };
        }
      }

      if (failedReceiptMessages.length > 0) {
        return {
          verdict: "failed",
          endpoint,
          detail: `Execution receipt failed: ${failedReceiptMessages[0].msg}`,
          events,
        };
      }

      return {
        verdict: "successful",
        endpoint,
        detail: "Transaction finalized on NEAR Testnet RPC with all receipts succeeding.",
        events,
      };
    } catch {
      // Try fallback Testnet RPC endpoint before returning manual verification state.
    }
  }

  return {
    verdict: "unknown_verification_required",
    detail:
      "Unable to confirm finality from NEAR Testnet RPC within timeout. Do NOT auto-retry blindly — verify the hash on NEAR Explorer or click Verify on RPC.",
    events: [],
  };
}
