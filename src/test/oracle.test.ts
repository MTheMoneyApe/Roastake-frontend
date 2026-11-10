import { describe, expect, it, vi } from "vitest";
import {
  assertTestnetAccountId,
  assertTestnetRpcUrl,
  FALLBACK_TESTNET_RPC_URL,
  MARKET_GESHA_DEMO,
  MARKET_IMF_ARABICA,
  ORACLE_CONTRACT_ID,
  PRIMARY_TESTNET_RPC_URL,
} from "@/lib/oracle/config";
import {
  classifyDataClass,
  evaluateFreshness,
  formatAgeDuration,
  formatFixedPoint,
  formatUsdPerKg,
  formatUtcTimestamp,
  formatYoctoNear,
  inferMonthlyPeriodLabel,
} from "@/lib/oracle/format";
import {
  callContractView,
  decodeRpcCallResult,
  encodeJsonArgsBase64,
  fetchOracleSnapshot,
  OracleRpcError,
} from "@/lib/oracle/rpc";
import {
  AccountingSnapshotSchema,
  MarketConfigSchema,
  MarketListSchema,
  PriceObservationSchema,
  U128StringSchema,
  type MarketConfig,
  type PriceObservation,
} from "@/lib/oracle/types";

const encoder = new TextEncoder();

function rpcBytesResponse(payload: unknown, blockHash?: string) {
  const bytes = Array.from(encoder.encode(JSON.stringify(payload)));
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id: "roastake-oracle-readonly",
      result: {
        result: bytes,
        logs: [],
        ...(blockHash ? { block_hash: blockHash } : {}),
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function rpcBlockResponse(hash: string, height: number) {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id: "roastake-oracle-readonly",
      result: { header: { hash, height } },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

const sampleImfConfig: MarketConfig = {
  symbol: MARKET_IMF_ARABICA,
  description:
    "Source: International Monetary Fund (IMF), Primary Commodity Price System (PCPS), PCOFFOTM",
  decimals: 8,
  unit: "USD/kg",
  min_price: "100000000",
  max_price: "50000000000",
  max_price_age_sec: 7_776_000,
  max_divergence_bps: 2000,
  wasm_url:
    "https://test.fastfs.io/roastake-dev-mta.testnet/outlayer.testnet/855bc554762aa9b367ac2b3c62a219c250410f3715256e822f8c24e23df100f1.wasm",
  wasm_sha256: "855bc554762aa9b367ac2b3c62a219c250410f3715256e822f8c24e23df100f1",
  build_target: "wasm32-wasip2",
  active: true,
  worker_mode: "public_benchmark",
  secrets_ref: null,
  min_source_count: 1,
  allow_synthetic: false,
  max_source_spread_bps: 0,
};

const sampleImfObs: PriceObservation = {
  market: MARKET_IMF_ARABICA,
  price: "738863238",
  decimals: 8,
  unit: "USD/kg",
  source: "imf-pcps-pcoffotm",
  source_count: 1,
  observed_at_sec: 1793491199,
  stored_at_sec: 1794349463,
  nonce: 1,
  data_class: "PUBLIC_BENCHMARK_MONTHLY",
};

const sampleGeshaConfig: MarketConfig = {
  ...sampleImfConfig,
  symbol: MARKET_GESHA_DEMO,
  description: "Specialty Gesha Coffee Price Index (Testnet Demonstration Fixture)",
  max_price_age_sec: 3600,
  worker_mode: "fixture",
  allow_synthetic: true,
};

const sampleAccounting = {
  account_balance: "9996862881573592100000000",
  storage_usage_bytes: 398827,
  storage_locked_balance: "3988270000000000000000000",
  spendable_balance: "6008592881573592100000000",
  minimum_operating_reserve: "10000000000000000000000",
  refund_reserve_balance: "0",
  insurance_reserve_balance: "0",
  insurance_in_flight_liability: "0",
  insurance_return_pending_liability: "0",
  insurance_unresolved_liability: "0",
  insurance_enabled: false,
  total_refund_liability: "0",
  in_flight_liability: "0",
  disputed_liability: "0",
  backed_refund_liability: "0",
  required_backing: "10000000000000000000000",
  encumbered_backing_floor: "10000000000000000000000",
  unallocated_surplus: "5998592881573592100000000",
  invariant_holds: true,
  pending_request_count: 0,
  unreconciled_failure_count: 0,
  active_refund_credit_count: 0,
  active_claim_count: 0,
  open_request_slots: 0,
  max_open_requests: 100,
  active_insurance_compensation_count: 0,
  max_active_insurance_compensations: 32,
  market_count: 2,
  authorized_requester_count: 1,
  next_claim_id: 1,
  next_compensation_id: 1,
};

describe("Testnet-only policy guards (L-1)", () => {
  it("accepts approved testnet accounts and exact allowlisted HTTPS RPC hosts only", () => {
    expect(assertTestnetAccountId(ORACLE_CONTRACT_ID)).toBe(ORACLE_CONTRACT_ID);
    expect(() => assertTestnetAccountId("roastake.near")).toThrow(/Testnet-only/);
    expect(() => assertTestnetAccountId("outlayer.near")).toThrow(/Testnet-only/);

    expect(assertTestnetRpcUrl(PRIMARY_TESTNET_RPC_URL)).toBe(PRIMARY_TESTNET_RPC_URL);
    expect(assertTestnetRpcUrl(FALLBACK_TESTNET_RPC_URL)).toBe(FALLBACK_TESTNET_RPC_URL);

    // Negative policy tests (substring spoofing, mainnet, HTTP, custom ports, credentials, paths)
    expect(() => assertTestnetRpcUrl("https://testnet.example.com")).toThrow(/Testnet-only/);
    expect(() => assertTestnetRpcUrl("https://rpc.mainnet.near.org")).toThrow(/Testnet-only/);
    expect(() => assertTestnetRpcUrl("http://rpc.testnet.near.org")).toThrow(/Testnet-only/);
    expect(() => assertTestnetRpcUrl("http://rpc.testnet.fastnear.com")).toThrow(/Testnet-only/);
    expect(() => assertTestnetRpcUrl("https://rpc.testnet.near.org:8443")).toThrow(/Testnet-only/);
    expect(() => assertTestnetRpcUrl("https://rpc.testnet.near.org:443")).toThrow(/Testnet-only/);
    expect(() => assertTestnetRpcUrl("https://user:pass@rpc.testnet.near.org")).toThrow(
      /Testnet-only/,
    );
    expect(() => assertTestnetRpcUrl("https://token@rpc.testnet.fastnear.com")).toThrow(
      /Testnet-only/,
    );
    expect(() => assertTestnetRpcUrl("https://rpc.testnet.near.org/custom")).toThrow(
      /Testnet-only/,
    );
  });
});

describe("Strict NEAR U128 JSON schemas & BigInt precision (L-2)", () => {
  it("accepts valid decimal U128 strings and rejects numbers, negatives, decimals, and empty strings", () => {
    expect(U128StringSchema.safeParse("0").success).toBe(true);
    expect(U128StringSchema.safeParse("738863238").success).toBe(true);
    const maxU128 = "340282366920938463463374607431768211455";
    expect(U128StringSchema.safeParse(maxU128).success).toBe(true);
    expect(formatFixedPoint(maxU128, 8)).toBe("3,402,823,669,209,384,634,633,746,074,317.68211455");

    expect(U128StringSchema.safeParse("-1").success).toBe(false);
    expect(U128StringSchema.safeParse("7.38").success).toBe(false);
    expect(U128StringSchema.safeParse("").success).toBe(false);
    expect(U128StringSchema.safeParse(" 100").success).toBe(false);
    expect(U128StringSchema.safeParse(738863238).success).toBe(false);

    expect(PriceObservationSchema.safeParse({ ...sampleImfObs, price: 738863238 }).success).toBe(
      false,
    );
    expect(MarketConfigSchema.safeParse({ ...sampleImfConfig, min_price: 100000000 }).success).toBe(
      false,
    );
    expect(
      AccountingSnapshotSchema.safeParse({ ...sampleAccounting, account_balance: 12345 }).success,
    ).toBe(false);
  });
});

describe("BigInt fixed-point & yoctoNEAR formatting", () => {
  it("formats 8-decimal prices without floating-point precision loss", () => {
    expect(formatUsdPerKg("738863238", 8, "USD/kg")).toBe("$7.38863238 USD/kg");
    expect(formatUsdPerKg("1850000000", 8, "USD/kg")).toBe("$18.50000000 USD/kg");
    // Beyond JS Number.MAX_SAFE_INTEGER (9,007,199,254,740,991)
    expect(formatFixedPoint("900719925474099312345678", 8)).toBe("9,007,199,254,740,993.12345678");
    expect(formatFixedPoint("invalid", 8)).toBe("Unavailable");
  });

  it("formats yoctoNEAR U128 values accurately via BigInt", () => {
    expect(formatYoctoNear("9996862881573592100000000")).toBe("9.99686288 NEAR");
    expect(formatYoctoNear("6008592881573592100000000")).toBe("6.00859288 NEAR");
    expect(formatYoctoNear("10000000000000000000000")).toBe("0.0100 NEAR");
    expect(formatYoctoNear("1176700000000000000000")).toBe("0.0011767 NEAR");
    expect(formatYoctoNear("0")).toBe("0.0000 NEAR");
    expect(formatYoctoNear("-5")).toBe("Unavailable");
  });
});

describe("Data classifications & timestamp freshness", () => {
  it("distinguishes PUBLIC_BENCHMARK_MONTHLY and SYNTHETIC_DEMO honestly", () => {
    const imfCls = classifyDataClass("PUBLIC_BENCHMARK_MONTHLY");
    expect(imfCls.isHistoricalMonthly).toBe(true);
    expect(imfCls.isSynthetic).toBe(false);
    expect(imfCls.summary).toMatch(/Not spot pricing/i);

    const synthCls = classifyDataClass("SYNTHETIC_DEMO");
    expect(synthCls.isSynthetic).toBe(true);
    expect(synthCls.isHistoricalMonthly).toBe(false);
    expect(synthCls.label).toBe("Synthetic Demo Fixture");
  });

  it("formats durations cleanly and omits zero-valued units including legacy fallback (L-4)", () => {
    expect(formatAgeDuration(7_776_000)).toBe("90 days");
    expect(formatAgeDuration(86_400)).toBe("1 day");
    expect(formatAgeDuration(93_600)).toBe("1 day, 2 hr");
    expect(formatAgeDuration(3_600)).toBe("1 hr");
    expect(formatAgeDuration(3_660)).toBe("1 hr, 1 min");
    expect(formatAgeDuration(0)).toBe("0 sec");

    const intlObj = Intl as unknown as { DurationFormat?: unknown };
    const prevDurationFormat = intlObj.DurationFormat;
    intlObj.DurationFormat = undefined;
    try {
      expect(formatAgeDuration(7_776_000)).toBe("90 days");
      expect(formatAgeDuration(86_400)).toBe("1 day");
      expect(formatAgeDuration(93_600)).toBe("1 day, 2 hr");
      expect(formatAgeDuration(3_600)).toBe("1 hr");
      expect(formatAgeDuration(3_660)).toBe("1 hr, 1 min");
      expect(formatAgeDuration(0)).toBe("0 sec");
    } finally {
      intlObj.DurationFormat = prevDurationFormat;
    }
  });

  it("formats UTC timestamps, derives IMF periods, and evaluates staleness against max_price_age_sec", () => {
    expect(formatUtcTimestamp(1793491199)).toBe("2026-10-31 23:59:59 UTC");
    expect(inferMonthlyPeriodLabel(1793491199)).toBe("2026-M10");
    expect(inferMonthlyPeriodLabel(1793491200)).toBeNull();
    expect(formatAgeDuration(7_776_000)).toMatch(/90/);

    const fresh = evaluateFreshness(sampleImfObs, sampleImfConfig, 1794349463);
    expect(fresh.status).toBe("FRESH");
    expect(fresh.isStale).toBe(false);

    const stale = evaluateFreshness(sampleImfObs, sampleImfConfig, 1793491199 + 7_776_001);
    expect(stale.status).toBe("STALE");
    expect(stale.isStale).toBe(true);

    const empty = evaluateFreshness(null, sampleGeshaConfig, 1794349463);
    expect(empty.status).toBe("NO_OBSERVATION");

    const syntheticZero = evaluateFreshness(
      {
        ...sampleImfObs,
        market: MARKET_GESHA_DEMO,
        price: "1850000000",
        source: "roastake-fixture",
        observed_at_sec: 0,
        data_class: "SYNTHETIC_DEMO",
      },
      sampleGeshaConfig,
      1794349463,
    );
    expect(syntheticZero.status).toBe("SYNTHETIC_FIXTURE");
  });
});

describe("NEAR JSON-RPC Base64 encoding, decoding & view queries", () => {
  it("encodes arguments and decodes UTF-8 byte arrays safely", () => {
    expect(encodeJsonArgsBase64({})).toBe("e30=");
    expect(encodeJsonArgsBase64({ market: MARKET_IMF_ARABICA })).toBe(
      "eyJtYXJrZXQiOiJBUkFCSUNBLU1PTlRITFktSU1GL1VTRCJ9",
    );

    const decoded = decodeRpcCallResult(
      Array.from(encoder.encode('["GESHA-DEMO/USD","ARABICA-MONTHLY-IMF/USD"]')),
      MarketListSchema,
      "list_markets",
    );
    expect(decoded).toEqual(["GESHA-DEMO/USD", "ARABICA-MONTHLY-IMF/USD"]);

    expect(() => decodeRpcCallResult("bad", MarketListSchema, "list_markets")).toThrow(
      OracleRpcError,
    );
    expect(() =>
      decodeRpcCallResult(
        Array.from(encoder.encode('{"unexpected":true}')),
        MarketListSchema,
        "list_markets",
      ),
    ).toThrow(/Schema mismatch/);
  });

  it("pins one finalized block across all view calls on primary with no fallback traffic (L-3)", async () => {
    const PRIMARY_HASH = "Hh4LMV9VvgHbBks3pQD2EUppCNnBmQX5bLfiGDQvrV9p";
    const recordedCalls: { url: string; method: string; viewMethod?: string; blockId?: unknown }[] =
      [];

    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const target = String(url);
      const body = JSON.parse(String(init?.body ?? "{}"));
      expect(target).toBe(PRIMARY_TESTNET_RPC_URL);

      if (body.method === "block") {
        expect(body.params).toEqual({ finality: "final" });
        recordedCalls.push({ url: target, method: body.method });
        return rpcBlockResponse(PRIMARY_HASH, 277134163);
      }

      expect(body.method).toBe("query");
      expect(body.params.request_type).toBe("call_function");
      expect(body.params.finality).toBeUndefined();
      expect(body.params.block_id).toBe(PRIMARY_HASH);

      const method = body.params.method_name as string;
      recordedCalls.push({
        url: target,
        method: body.method,
        viewMethod: method,
        blockId: body.params.block_id,
      });

      if (method === "list_markets") {
        return rpcBytesResponse([MARKET_GESHA_DEMO, MARKET_IMF_ARABICA], PRIMARY_HASH);
      }
      if (method === "verify_solvency_invariant") {
        return rpcBytesResponse(true, PRIMARY_HASH);
      }
      if (method === "get_accounting_snapshot") {
        return rpcBytesResponse(sampleAccounting, PRIMARY_HASH);
      }
      if (method === "get_next_nonce") {
        return rpcBytesResponse(2, PRIMARY_HASH);
      }
      if (method === "get_market_config") {
        const args = JSON.parse(atob(body.params.args_base64));
        return rpcBytesResponse(
          args.market === MARKET_IMF_ARABICA ? sampleImfConfig : sampleGeshaConfig,
          PRIMARY_HASH,
        );
      }
      if (method === "get_price") {
        const args = JSON.parse(atob(body.params.args_base64));
        return rpcBytesResponse(
          args.market === MARKET_IMF_ARABICA ? sampleImfObs : null,
          PRIMARY_HASH,
        );
      }
      throw new Error(`Unexpected method ${method}`);
    });

    const snapshot = await fetchOracleSnapshot({ fetchFn: fetchMock, nowMs: 1794350000000 });
    expect(snapshot.rpcEndpoint).toBe(PRIMARY_TESTNET_RPC_URL);
    expect(snapshot.blockHash).toBe(PRIMARY_HASH);
    expect(snapshot.blockHeight).toBe(277134163);
    expect(snapshot.markets).toEqual([MARKET_GESHA_DEMO, MARKET_IMF_ARABICA]);
    expect(snapshot.marketStates[MARKET_IMF_ARABICA]?.observation?.price).toBe("738863238");
    expect(snapshot.marketStates[MARKET_GESHA_DEMO]?.observation).toBeNull();
    expect(snapshot.solvencyInvariant).toBe(true);
    expect(snapshot.nextNonce).toBe(2);

    const viewCalls = recordedCalls.filter((c) => c.method === "query");
    expect(viewCalls).toHaveLength(8);
    expect(
      viewCalls.every((c) => c.url === PRIMARY_TESTNET_RPC_URL && c.blockId === PRIMARY_HASH),
    ).toBe(true);
  });

  it("restarts entire snapshot on fallback without mixing primary/fallback results when primary fails mid-snapshot (L-3)", async () => {
    const PRIMARY_HASH = "PrimaryBlockHash111111111111111111111111111";
    const FALLBACK_HASH = "BuNx2uBL7fAL4dMoHHJrGWvrnz3asDLieTRysLZ1NiB5";
    const fallbackCalls: { method: string; viewMethod?: string; blockId?: unknown }[] = [];

    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const target = String(url);
      const body = JSON.parse(String(init?.body ?? "{}"));

      if (target === PRIMARY_TESTNET_RPC_URL) {
        if (body.method === "block") {
          return rpcBlockResponse(PRIMARY_HASH, 100);
        }
        const method = body.params?.method_name;
        if (method === "list_markets") {
          // Primary returns partial view result that MUST be discarded on mid-snapshot failure
          return rpcBytesResponse([MARKET_IMF_ARABICA], PRIMARY_HASH);
        }
        if (method === "verify_solvency_invariant") {
          return new Response("primary upstream failure", { status: 503 });
        }
        return rpcBytesResponse(method === "get_next_nonce" ? 1 : sampleAccounting, PRIMARY_HASH);
      }

      if (target === FALLBACK_TESTNET_RPC_URL) {
        if (body.method === "block") {
          fallbackCalls.push({ method: "block" });
          return rpcBlockResponse(FALLBACK_HASH, 277134168);
        }
        const method = body.params?.method_name as string;
        fallbackCalls.push({ method: "query", viewMethod: method, blockId: body.params.block_id });
        expect(body.params.block_id).toBe(FALLBACK_HASH);

        if (method === "list_markets") {
          return rpcBytesResponse([MARKET_GESHA_DEMO, MARKET_IMF_ARABICA], FALLBACK_HASH);
        }
        if (method === "verify_solvency_invariant") {
          return rpcBytesResponse(true, FALLBACK_HASH);
        }
        if (method === "get_accounting_snapshot") {
          return rpcBytesResponse(sampleAccounting, FALLBACK_HASH);
        }
        if (method === "get_next_nonce") {
          return rpcBytesResponse(2, FALLBACK_HASH);
        }
        if (method === "get_market_config") {
          const args = JSON.parse(atob(body.params.args_base64));
          return rpcBytesResponse(
            args.market === MARKET_IMF_ARABICA ? sampleImfConfig : sampleGeshaConfig,
            FALLBACK_HASH,
          );
        }
        if (method === "get_price") {
          const args = JSON.parse(atob(body.params.args_base64));
          return rpcBytesResponse(
            args.market === MARKET_IMF_ARABICA ? sampleImfObs : null,
            FALLBACK_HASH,
          );
        }
      }
      throw new Error(`Unexpected request to ${target}`);
    });

    const snapshot = await fetchOracleSnapshot({ fetchFn: fetchMock, nowMs: 1794350000000 });
    expect(snapshot.rpcEndpoint).toBe(FALLBACK_TESTNET_RPC_URL);
    expect(snapshot.blockHash).toBe(FALLBACK_HASH);
    expect(snapshot.blockHeight).toBe(277134168);
    // Proves primary's single-market list_markets response was NOT mixed with fallback
    expect(snapshot.markets).toEqual([MARKET_GESHA_DEMO, MARKET_IMF_ARABICA]);
    expect(fallbackCalls.filter((c) => c.method === "block")).toHaveLength(1);
    const fallbackViews = fallbackCalls.filter((c) => c.method === "query");
    expect(fallbackViews).toHaveLength(8);
    expect(fallbackViews.every((c) => c.blockId === FALLBACK_HASH)).toBe(true);
  });

  it("rejects unapproved endpoints upfront before issuing any RPC request (L-1 / L-3)", async () => {
    const fetchMock = vi.fn();
    await expect(
      fetchOracleSnapshot({
        endpoints: [PRIMARY_TESTNET_RPC_URL, "https://testnet.example.com"],
        fetchFn: fetchMock,
      }),
    ).rejects.toThrow(/Testnet-only policy violation/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects snapshot responses whose view block_hash contradicts the pinned block_id (L-3)", async () => {
    const PINNED = "Hh4LMV9VvgHbBks3pQD2EUppCNnBmQX5bLfiGDQvrV9p";
    const DRIFTED = "DriftedBlockHash999999999999999999999999999";

    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (body.method === "block") {
        return rpcBlockResponse(PINNED, 100);
      }
      return rpcBytesResponse([MARKET_GESHA_DEMO, MARKET_IMF_ARABICA], DRIFTED);
    });

    await expect(
      fetchOracleSnapshot({
        endpoints: [PRIMARY_TESTNET_RPC_URL],
        fetchFn: fetchMock,
      }),
    ).rejects.toThrow(/instead of pinned/);
  });

  it("fails cleanly without fabricated fallback data when all RPC endpoints error or timeout", async () => {
    const failFetch = vi.fn(async () => {
      throw new Error("network down");
    });

    await expect(
      callContractView({
        methodName: "list_markets",
        schema: MarketListSchema,
        fetchFn: failFetch,
      }),
    ).rejects.toThrow(OracleRpcError);
  });

  it("invokes fetchFn standalone without binding options as `this` (WebIDL Window.fetch safety)", async () => {
    function webIdlStrictFetch(this: unknown): Promise<Response> {
      if (this !== undefined && this !== globalThis) {
        throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
      }
      return Promise.resolve(rpcBytesResponse([MARKET_GESHA_DEMO, MARKET_IMF_ARABICA]));
    }

    const res = await callContractView({
      methodName: "list_markets",
      schema: MarketListSchema,
      fetchFn: webIdlStrictFetch as unknown as typeof fetch,
    });
    expect(res.data).toEqual([MARKET_GESHA_DEMO, MARKET_IMF_ARABICA]);
  });
});
