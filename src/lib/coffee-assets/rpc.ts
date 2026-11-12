// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.
//
// Live NEAR Testnet reads for the M04.18 Coffee Mini Swap.
// Every number surfaced by the component comes from these calls; there is no
// cached price, reserve or balance anywhere in this module.

import { z } from "zod";
import {
  TESTNET_RPC_ENDPOINTS,
  ORACLE_RPC_TIMEOUT_MS,
  assertTestnetRpcUrl,
} from "@/lib/oracle/config";
import {
  CallFunctionResultSchema,
  OracleRpcError,
  encodeJsonArgsBase64,
  postJsonRpc,
  type FetchLike,
} from "@/lib/oracle/rpc";
import { RHEA_EXCHANGE_ID } from "./config";

const RPC_TIMEOUT_MS = ORACLE_RPC_TIMEOUT_MS;

const ImplicitAccountSchema = z.string().regex(/^[0-9a-f]{64}$/);
const NamedTestnetSchema = z.string().regex(/^[a-z0-9._-]+\.testnet$/);

/** Circle USDC on Testnet is a 64-hex implicit account, not a named `.testnet` account. */
export function isTestnetContractId(raw: string): boolean {
  return NamedTestnetSchema.safeParse(raw).success || ImplicitAccountSchema.safeParse(raw).success;
}

function assertTestnetContractId(raw: string): string {
  const trimmed = raw.trim();
  if (!isTestnetContractId(trimmed)) {
    throw new OracleRpcError(
      `Testnet-only policy violation: contract ID "${raw}" is not a NEAR Testnet account.`,
      "POLICY_ERROR",
    );
  }
  return trimmed;
}

async function callView<S extends z.ZodTypeAny>(opts: {
  contractId: string;
  methodName: string;
  args?: unknown;
  schema: S;
  endpoints?: readonly string[];
  fetchFn?: FetchLike;
  timeoutMs?: number;
}): Promise<z.output<S>> {
  const contractId = assertTestnetContractId(opts.contractId);
  const endpoints = (opts.endpoints ?? TESTNET_RPC_ENDPOINTS).map((url) =>
    assertTestnetRpcUrl(url),
  );
  const fetchFn = opts.fetchFn ?? fetch;

  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      const rpcResult = await postJsonRpc({
        endpoint,
        method: "query",
        params: {
          request_type: "call_function",
          finality: "final",
          account_id: contractId,
          method_name: opts.methodName,
          args_base64: encodeJsonArgsBase64(opts.args ?? {}),
        },
        resultSchema: CallFunctionResultSchema,
        fetchFn,
        timeoutMs: opts.timeoutMs ?? RPC_TIMEOUT_MS,
        label: `${contractId}::${opts.methodName}`,
        requestId: "roastake-coffee-readonly",
      });

      if (rpcResult.error) {
        throw new OracleRpcError(
          `Contract view error in ${contractId}::${opts.methodName}: ${rpcResult.error}`,
          "RPC_ERROR",
          endpoint,
        );
      }
      return decodeCallResult(rpcResult.result, opts.schema, opts.methodName);
    } catch (err) {
      if (err instanceof OracleRpcError && err.code === "POLICY_ERROR") throw err;
      lastError = err;
    }
  }
  if (lastError instanceof OracleRpcError) throw lastError;
  throw new OracleRpcError("All configured NEAR Testnet RPC endpoints failed.", "NETWORK");
}

function decodeCallResult<S extends z.ZodTypeAny>(
  raw: unknown,
  schema: S,
  methodName: string,
): z.output<S> {
  if (!Array.isArray(raw)) {
    throw new OracleRpcError(`Empty result bytes from ${methodName}.`, "INVALID_RESPONSE");
  }
  const binary = Uint8Array.from(raw as number[]);
  const text = new TextDecoder("utf-8", { fatal: false }).decode(binary);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new OracleRpcError(`Non-JSON result from ${methodName}.`, "INVALID_RESPONSE");
  }
  const validated = schema.safeParse(parsed);
  if (!validated.success) {
    throw new OracleRpcError(`Unexpected payload from ${methodName}.`, "INVALID_RESPONSE");
  }
  return validated.data;
}

const PoolSchema = z.object({
  pool_kind: z.string(),
  token_account_ids: z.array(z.string()),
  amounts: z.array(z.string()),
  total_fee: z.number(),
  shares_total_supply: z.string(),
});

const U128StringSchema = z.union([z.string(), z.number()]).transform((value) => String(value));

const StorageBalanceSchema = z.object({ total: z.string(), available: z.string() }).nullable();

export interface PoolSnapshot {
  readonly poolId: number;
  readonly exists: boolean;
  readonly tokenIds: readonly string[];
  readonly amounts: readonly bigint[];
  readonly totalFeeUnits: number;
  readonly sharesTotalSupply: bigint;
}

export async function fetchPoolSnapshot(
  poolId: number,
  opts: { endpoints?: readonly string[]; fetchFn?: FetchLike } = {},
): Promise<PoolSnapshot> {
  try {
    const pool = await callView({
      contractId: RHEA_EXCHANGE_ID,
      methodName: "get_pool",
      args: { pool_id: poolId },
      schema: PoolSchema,
      endpoints: opts.endpoints,
      fetchFn: opts.fetchFn,
    });
    return {
      poolId,
      exists: true,
      tokenIds: pool.token_account_ids,
      amounts: pool.amounts.map((amount) => BigInt(amount)),
      totalFeeUnits: pool.total_fee,
      sharesTotalSupply: BigInt(pool.shares_total_supply),
    };
  } catch {
    return {
      poolId,
      exists: false,
      tokenIds: [],
      amounts: [],
      totalFeeUnits: 0,
      sharesTotalSupply: 0n,
    };
  }
}

/** On-chain AMM quote straight from the exchange (`get_return`). */
export async function fetchOnChainQuote(opts: {
  poolId: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  endpoints?: readonly string[];
  fetchFn?: FetchLike;
}): Promise<bigint | null> {
  try {
    const value = await callView({
      contractId: RHEA_EXCHANGE_ID,
      methodName: "get_return",
      args: {
        pool_id: opts.poolId,
        token_in: opts.tokenIn,
        amount_in: opts.amountIn.toString(),
        token_out: opts.tokenOut,
      },
      schema: U128StringSchema,
      endpoints: opts.endpoints,
      fetchFn: opts.fetchFn,
    });
    return BigInt(value);
  } catch {
    return null;
  }
}

export async function fetchFtBalance(opts: {
  tokenId: string;
  accountId: string;
  endpoints?: readonly string[];
  fetchFn?: FetchLike;
}): Promise<bigint> {
  try {
    const value = await callView({
      contractId: opts.tokenId,
      methodName: "ft_balance_of",
      args: { account_id: opts.accountId },
      schema: U128StringSchema,
      endpoints: opts.endpoints,
      fetchFn: opts.fetchFn,
    });
    return BigInt(value);
  } catch {
    return 0n;
  }
}

export interface FtMetadata {
  readonly decimals: number;
  readonly symbol: string;
  readonly name: string;
}

export async function fetchFtMetadata(
  tokenId: string,
  opts: { endpoints?: readonly string[]; fetchFn?: FetchLike } = {},
): Promise<FtMetadata | null> {
  try {
    return await callView({
      contractId: tokenId,
      methodName: "ft_metadata",
      args: {},
      schema: z.object({
        decimals: z.number().int().min(0).max(24),
        symbol: z.string(),
        name: z.string(),
      }),
      endpoints: opts.endpoints,
      fetchFn: opts.fetchFn,
    });
  } catch {
    return null;
  }
}

/** NEP-145 storage balance; null means the account is not registered on the token. */
export async function fetchStorageBalance(opts: {
  tokenId: string;
  accountId: string;
  endpoints?: readonly string[];
  fetchFn?: FetchLike;
}): Promise<bigint | null> {
  try {
    const balance = await callView({
      contractId: opts.tokenId,
      methodName: "storage_balance_of",
      args: { account_id: opts.accountId },
      schema: StorageBalanceSchema,
      endpoints: opts.endpoints,
      fetchFn: opts.fetchFn,
    });
    return balance ? BigInt(balance.total) : null;
  } catch {
    return null;
  }
}

/** Exchange-internal deposit for an account, used to show where funds sit. */
export async function fetchExchangeDeposit(opts: {
  accountId: string;
  tokenId: string;
  endpoints?: readonly string[];
  fetchFn?: FetchLike;
}): Promise<bigint> {
  try {
    const value = await callView({
      contractId: RHEA_EXCHANGE_ID,
      methodName: "get_deposit",
      args: { account_id: opts.accountId, token_id: opts.tokenId },
      schema: U128StringSchema,
      endpoints: opts.endpoints,
      fetchFn: opts.fetchFn,
    });
    return BigInt(value);
  } catch {
    return 0n;
  }
}

const TxStatusSchema = z.object({
  final_execution_status: z.string(),
  transaction_outcome: z.object({ block_hash: z.string().optional() }).passthrough().optional(),
  receipts_outcome: z.array(
    z
      .object({
        id: z.string(),
        outcome: z
          .object({
            logs: z.array(z.string()).default([]),
            status: z.union([
              z.object({ Failure: z.unknown() }).passthrough(),
              z.object({ SuccessValue: z.string().optional() }).passthrough(),
              z.string(),
            ]),
          })
          .passthrough(),
      })
      .passthrough(),
  ),
});

export type SwapFinalityVerdict =
  "final_success" | "final_failure" | "included_not_final" | "unknown";

export interface SwapFinalityResult {
  readonly verdict: SwapFinalityVerdict;
  readonly finalExecutionStatus: string;
  readonly receiptsChecked: number;
  readonly failedReceipts: number;
  readonly failureDetail: string | null;
  readonly swappedLogs: readonly string[];
  readonly transferLogs: readonly string[];
}

function receiptFailed(status: unknown): { failed: boolean; detail: string | null } {
  if (status && typeof status === "object" && "Failure" in (status as Record<string, unknown>)) {
    return {
      failed: true,
      detail: JSON.stringify((status as Record<string, unknown>).Failure).slice(0, 400),
    };
  }
  return { failed: false, detail: null };
}

/**
 * Polls EXPERIMENTAL_tx_status until the transaction is FINAL, then reports
 * whether every receipt succeeded and what the NEP-297 / swap logs said.
 */
export async function verifySwapFinality(opts: {
  txHash: string;
  signerId: string;
  endpoints?: readonly string[];
  fetchFn?: FetchLike;
  timeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<SwapFinalityResult> {
  const endpoints = (opts.endpoints ?? TESTNET_RPC_ENDPOINTS).map((url) =>
    assertTestnetRpcUrl(url),
  );
  const fetchFn = opts.fetchFn ?? fetch;
  const deadline = Date.now() + (opts.timeoutMs ?? 60_000);
  const pollIntervalMs = opts.pollIntervalMs ?? 2_500;

  let lastResult: SwapFinalityResult = {
    verdict: "unknown",
    finalExecutionStatus: "UNKNOWN",
    receiptsChecked: 0,
    failedReceipts: 0,
    failureDetail: null,
    swappedLogs: [],
    transferLogs: [],
  };

  while (Date.now() < deadline) {
    for (const endpoint of endpoints) {
      try {
        const status = await postJsonRpc({
          endpoint,
          method: "EXPERIMENTAL_tx_status",
          params: { tx_hash: opts.txHash, sender_account_id: opts.signerId, wait_until: "FINAL" },
          resultSchema: TxStatusSchema,
          fetchFn,
          timeoutMs: RPC_TIMEOUT_MS,
          label: `EXPERIMENTAL_tx_status(${opts.txHash})`,
          requestId: "roastake-coffee-tx-status",
        });

        let failedReceipts = 0;
        let failureDetail: string | null = null;
        const swappedLogs: string[] = [];
        const transferLogs: string[] = [];
        for (const receipt of status.receipts_outcome) {
          const failure = receiptFailed(receipt.outcome.status);
          if (failure.failed) {
            failedReceipts += 1;
            failureDetail = failure.detail;
          }
          for (const log of receipt.outcome.logs) {
            if (log.startsWith("Swapped ")) swappedLogs.push(log);
            if (log.includes('"standard":"nep141"') && log.includes("ft_transfer"))
              transferLogs.push(log);
          }
        }

        const finalStatus = status.final_execution_status.toUpperCase();
        const isFinal = finalStatus === "FINAL";
        lastResult = {
          verdict: !isFinal
            ? "included_not_final"
            : failedReceipts > 0
              ? "final_failure"
              : "final_success",
          finalExecutionStatus: finalStatus,
          receiptsChecked: status.receipts_outcome.length,
          failedReceipts,
          failureDetail,
          swappedLogs,
          transferLogs,
        };
        if (isFinal) return lastResult;
      } catch {
        // Try the next endpoint, then wait and poll again.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return lastResult;
}
