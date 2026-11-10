import { z } from "zod";
import {
  assertTestnetAccountId,
  assertTestnetRpcUrl,
  ORACLE_CONTRACT_ID,
  ORACLE_RPC_TIMEOUT_MS,
  TESTNET_RPC_ENDPOINTS,
} from "./config";
import {
  AccountingSnapshotSchema,
  MarketListSchema,
  NextNonceSchema,
  NullableMarketConfigSchema,
  NullablePriceObservationSchema,
  type MarketConfig,
  type MarketOracleState,
  type OracleDashboardSnapshot,
  type PriceObservation,
  VerifySolvencySchema,
} from "./types";

export class OracleRpcError extends Error {
  readonly code: "NETWORK" | "TIMEOUT" | "RPC_ERROR" | "INVALID_RESPONSE" | "POLICY_ERROR";
  readonly endpoint?: string;

  constructor(
    message: string,
    code: OracleRpcError["code"],
    endpoint?: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "OracleRpcError";
    this.code = code;
    this.endpoint = endpoint;
  }
}

export type FetchLike = typeof fetch;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

/** Encode JSON arguments safely to Base64 across SSR (Node) and browser without `Buffer`. */
export function encodeJsonArgsBase64(args: unknown = {}): string {
  const json = JSON.stringify(args ?? {});
  const bytes = textEncoder.encode(json);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** Decode NEAR JSON-RPC `result.result` UTF-8 byte array and validate against a strict schema. */
export function decodeRpcCallResult<S extends z.ZodTypeAny>(
  rawBytes: unknown,
  schema: S,
  method: string,
): z.output<S> {
  if (!Array.isArray(rawBytes)) {
    throw new OracleRpcError(
      `Invalid NEAR RPC response for "${method}": expected byte array in result.result.`,
      "INVALID_RESPONSE",
    );
  }

  const uint8 = new Uint8Array(rawBytes.length);
  for (let i = 0; i < rawBytes.length; i += 1) {
    const val = rawBytes[i];
    if (typeof val !== "number" || !Number.isInteger(val) || val < 0 || val > 255) {
      throw new OracleRpcError(
        `Invalid NEAR RPC byte value at index ${i} for "${method}".`,
        "INVALID_RESPONSE",
      );
    }
    uint8[i] = val;
  }

  let utf8Text: string;
  try {
    utf8Text = textDecoder.decode(uint8);
  } catch (err) {
    throw new OracleRpcError(
      `Malformed UTF-8 bytes returned by "${method}".`,
      "INVALID_RESPONSE",
      undefined,
      { cause: err },
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(utf8Text);
  } catch (err) {
    throw new OracleRpcError(
      `Malformed JSON returned by "${method}": ${utf8Text.slice(0, 120)}`,
      "INVALID_RESPONSE",
      undefined,
      { cause: err },
    );
  }

  const checked = schema.safeParse(parsedJson);
  if (!checked.success) {
    throw new OracleRpcError(
      `Schema mismatch in "${method}" response: ${checked.error.issues[0]?.message ?? "invalid shape"}`,
      "INVALID_RESPONSE",
    );
  }

  return checked.data;
}

const RpcErrorSchema = z.object({
  message: z.string().optional(),
  data: z.unknown().optional(),
});

const RpcEnvelopeSchema = z.object({
  jsonrpc: z.string().optional(),
  id: z.union([z.string(), z.number()]).optional(),
  error: RpcErrorSchema.optional(),
  result: z.unknown().optional(),
});

const FinalizedBlockResultSchema = z.object({
  header: z.object({
    hash: z.string().min(1),
    height: z.number().int().nonnegative().optional(),
  }),
});

const CallFunctionResultSchema = z.object({
  result: z.unknown().optional(),
  error: z.string().optional(),
  block_hash: z.string().optional(),
  block_height: z.number().int().nonnegative().optional(),
});

function validateContractIdOrThrowPolicy(rawContractId: string): string {
  try {
    return assertTestnetAccountId(rawContractId, "Contract ID");
  } catch (err) {
    throw new OracleRpcError(
      err instanceof Error ? err.message : `Invalid Testnet contract ID: "${rawContractId}".`,
      "POLICY_ERROR",
      undefined,
      { cause: err },
    );
  }
}

function validateEndpointList(endpoints: readonly string[]): string[] {
  if (!endpoints.length) {
    throw new OracleRpcError("No NEAR Testnet RPC endpoints configured.", "POLICY_ERROR");
  }
  return endpoints.map((raw) => {
    try {
      return assertTestnetRpcUrl(raw);
    } catch (err) {
      throw new OracleRpcError(
        err instanceof Error ? err.message : `Invalid NEAR Testnet RPC URL: "${raw}".`,
        "POLICY_ERROR",
        raw,
        { cause: err },
      );
    }
  });
}

async function postJsonRpc<S extends z.ZodTypeAny>(opts: {
  endpoint: string;
  method: string;
  params: unknown;
  resultSchema: S;
  fetchFn: FetchLike;
  timeoutMs: number;
  label: string;
}): Promise<z.output<S>> {
  const endpoint = assertTestnetRpcUrl(opts.endpoint);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  // Invoke standalone (not as `opts.fetchFn(...)`) so native browser `window.fetch`
  // does not receive `opts` as `this` and throw WebIDL `Illegal invocation`.
  const runFetch = opts.fetchFn;

  let response: Response;
  try {
    response = await runFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "roastake-oracle-readonly",
        method: opts.method,
        params: opts.params,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    throw new OracleRpcError(
      isAbort
        ? `NEAR Testnet RPC timed out after ${opts.timeoutMs} ms (${endpoint}).`
        : `Failed to reach NEAR Testnet RPC (${endpoint}).`,
      isAbort ? "TIMEOUT" : "NETWORK",
      endpoint,
      { cause: err },
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new OracleRpcError(
      `NEAR Testnet RPC HTTP ${response.status} from ${endpoint}.`,
      "RPC_ERROR",
      endpoint,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    throw new OracleRpcError(
      `Invalid JSON payload from NEAR Testnet RPC (${endpoint}).`,
      "INVALID_RESPONSE",
      endpoint,
      { cause: err },
    );
  }

  const envelope = RpcEnvelopeSchema.safeParse(body);
  if (!envelope.success) {
    throw new OracleRpcError(
      `Unexpected JSON-RPC envelope from ${endpoint}.`,
      "INVALID_RESPONSE",
      endpoint,
    );
  }

  if (envelope.data.error) {
    throw new OracleRpcError(
      `NEAR RPC error on ${opts.label}: ${envelope.data.error.message ?? "Unknown RPC error"}`,
      "RPC_ERROR",
      endpoint,
    );
  }

  const parsedResult = opts.resultSchema.safeParse(envelope.data.result);
  if (!parsedResult.success) {
    throw new OracleRpcError(
      `Unexpected ${opts.label} response shape from ${endpoint}.`,
      "INVALID_RESPONSE",
      endpoint,
    );
  }

  return parsedResult.data;
}

async function fetchFinalizedBlock(opts: {
  endpoint: string;
  fetchFn: FetchLike;
  timeoutMs: number;
}): Promise<{ blockHash: string; blockHeight?: number }> {
  const result = await postJsonRpc({
    endpoint: opts.endpoint,
    method: "block",
    params: { finality: "final" },
    resultSchema: FinalizedBlockResultSchema,
    fetchFn: opts.fetchFn,
    timeoutMs: opts.timeoutMs,
    label: "block",
  });
  return {
    blockHash: result.header.hash,
    blockHeight: result.header.height,
  };
}

async function callSingleEndpoint<S extends z.ZodTypeAny>(opts: {
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
  const contractId = validateContractIdOrThrowPolicy(opts.contractId);
  const argsBase64 = encodeJsonArgsBase64(opts.args);
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
    label: opts.methodName,
  });

  if (rpcResult.error) {
    throw new OracleRpcError(
      `Contract view error in ${opts.methodName}: ${rpcResult.error}`,
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

  return decodeRpcCallResult(rpcResult.result, opts.schema, opts.methodName);
}

export interface CallViewOptions<S extends z.ZodTypeAny> {
  contractId?: string;
  methodName: string;
  args?: unknown;
  schema: S;
  endpoints?: readonly string[];
  fetchFn?: FetchLike;
  timeoutMs?: number;
  blockId?: string;
}

export async function callContractView<S extends z.ZodTypeAny>(
  opts: CallViewOptions<S>,
): Promise<{ data: z.output<S>; endpoint: string }> {
  const contractId = validateContractIdOrThrowPolicy(opts.contractId ?? ORACLE_CONTRACT_ID);
  const endpoints = validateEndpointList(opts.endpoints ?? TESTNET_RPC_ENDPOINTS);
  const fetchFn = opts.fetchFn ?? fetch;
  const timeoutMs = opts.timeoutMs ?? ORACLE_RPC_TIMEOUT_MS;

  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      const data = await callSingleEndpoint({
        endpoint,
        contractId,
        methodName: opts.methodName,
        args: opts.args ?? {},
        schema: opts.schema,
        fetchFn,
        timeoutMs,
        blockId: opts.blockId,
      });
      return { data, endpoint };
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
  throw new OracleRpcError("All configured NEAR Testnet RPC endpoints failed.", "NETWORK");
}

async function fetchSnapshotFromEndpoint(opts: {
  endpoint: string;
  contractId: string;
  fetchFn: FetchLike;
  timeoutMs: number;
  nowMs?: number;
}): Promise<OracleDashboardSnapshot> {
  const { blockHash, blockHeight } = await fetchFinalizedBlock({
    endpoint: opts.endpoint,
    fetchFn: opts.fetchFn,
    timeoutMs: opts.timeoutMs,
  });

  const call = <S extends z.ZodTypeAny>(methodName: string, args: unknown, schema: S) =>
    callSingleEndpoint({
      endpoint: opts.endpoint,
      contractId: opts.contractId,
      methodName,
      args,
      schema,
      fetchFn: opts.fetchFn,
      timeoutMs: opts.timeoutMs,
      blockId: blockHash,
    });

  const [markets, solvencyInvariant, accounting, nextNonce] = await Promise.all([
    call("list_markets", {}, MarketListSchema),
    call("verify_solvency_invariant", {}, VerifySolvencySchema),
    call("get_accounting_snapshot", {}, AccountingSnapshotSchema),
    call("get_next_nonce", {}, NextNonceSchema),
  ]);

  const marketPairs = await Promise.all(
    markets.map(async (symbol): Promise<[string, MarketOracleState]> => {
      const [config, observation] = await Promise.all([
        call("get_market_config", { market: symbol }, NullableMarketConfigSchema),
        call("get_price", { market: symbol }, NullablePriceObservationSchema),
      ]);
      const state: MarketOracleState = {
        symbol,
        config: config as MarketConfig | null,
        observation: observation as PriceObservation | null,
      };
      return [symbol, state];
    }),
  );

  return {
    network: "testnet",
    contractId: opts.contractId,
    rpcEndpoint: opts.endpoint,
    blockHash,
    blockHeight,
    fetchedAtMs: opts.nowMs ?? Date.now(),
    markets,
    marketStates: Object.fromEntries(marketPairs),
    solvencyInvariant,
    accounting,
    nextNonce,
  };
}

/**
 * Fetch an atomic, single-endpoint, finalized-block-pinned oracle snapshot.
 * If any RPC or view step fails on one endpoint, the entire snapshot restarts cleanly
 * on the next approved endpoint without mixing cross-endpoint or cross-block reads.
 */
export async function fetchOracleSnapshot(opts?: {
  contractId?: string;
  endpoints?: readonly string[];
  fetchFn?: FetchLike;
  timeoutMs?: number;
  nowMs?: number;
}): Promise<OracleDashboardSnapshot> {
  const contractId = validateContractIdOrThrowPolicy(opts?.contractId ?? ORACLE_CONTRACT_ID);
  const endpoints = validateEndpointList(opts?.endpoints ?? TESTNET_RPC_ENDPOINTS);
  const fetchFn = opts?.fetchFn ?? fetch;
  const timeoutMs = opts?.timeoutMs ?? ORACLE_RPC_TIMEOUT_MS;

  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      return await fetchSnapshotFromEndpoint({
        endpoint,
        contractId,
        fetchFn,
        timeoutMs,
        nowMs: opts?.nowMs,
      });
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
  throw new OracleRpcError("All configured NEAR Testnet RPC endpoints failed.", "NETWORK");
}
