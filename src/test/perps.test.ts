// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeJsonArgsBase64 } from "@/lib/oracle/rpc";
import {
  CIRCLE_TESTNET_USDC_ID,
  GAS_50_TGAS,
  MARKET_ARABICA_PERPS_ID,
  MARKET_ARABICA_URL_SLUG,
  MARKET_GESHA_LOGICAL_ID,
  MARKET_GESHA_PERPS_ID,
  MARKET_ROBUSTA_LOGICAL_ID,
  MARKET_ROBUSTA_PERPS_ID,
  PERPS_CONTRACT_ID,
  ZERO_YOCTO_NEAR,
  resolveThreeMarketEntry,
} from "@/lib/perps/config";
import {
  buildAndValidateOrderPreview,
  buildLpDepositArgs,
  buildTraderCollateralDepositArgs,
  computeEffectiveLeverageX100,
  computeExecPriceE8,
  computeIndicativeLiquidationPriceE8,
  computeInitialMarginE8,
  computeMaintenanceMarginE8,
  computeNotionalCeilE8,
  computeNotionalFloorE8,
  computeReservedLiquidityE8,
  computeTradeFeeE8,
  computeUtilizationBps,
  evaluatePerpsOracleStatus,
  parseDecimalToFixedBigInt,
  splitUsdE8ToUsdcUnits,
  usdcUnitsToUsdE8,
} from "@/lib/perps/math";
import {
  fetchPerpsProtocolSnapshot,
  fetchPerpsTraderSnapshot,
  validatePerpsTargetContractId,
  verifyNearTransactionFinality,
} from "@/lib/perps/rpc";
import {
  clearPerpsTxHistory,
  executeNearPerpsTx,
  reverifyTrackedNearTx,
} from "@/lib/perps/tx";
import type { LpSnapshotView, MarketView } from "@/lib/perps/types";

function encodeRpcResultBytes(value: unknown): number[] {
  return Array.from(new TextEncoder().encode(JSON.stringify(value)));
}

function makeMarketView(overrides: Partial<MarketView> = {}): MarketView {
  return {
    market_id: MARKET_ARABICA_PERPS_ID,
    unit: "USD/kg",
    mode: "Normal",
    paused_for_insolvency: false,
    feed_classification: "TESTNET_SANDBOX_FEED",
    is_synthetic_testnet_sandbox: true,
    sandbox_operator: "roastake-dev-mta.testnet",
    sandbox_min_price_e8: "100000000",
    sandbox_max_price_e8: "10000000000",
    sandbox_sequence: 2,
    long_oi_e8: "0",
    short_oi_e8: "0",
    long_size_e8: "0",
    short_size_e8: "0",
    open_positions: 0,
    cum_funding_index_e12: "0",
    last_funding_sec: 1_794_350_000,
    last_valid_price_e8: "1000000000", // $10.00/kg
    last_valid_observed_sec: 1_794_350_000,
    frozen_settlement_price_e8: null,
    frozen_funding_index_e12: null,
    risk: {
      max_leverage: 4,
      initial_margin_bps: 2500,
      maintenance_margin_bps: 1250,
      trade_fee_bps: 10,
      liq_keeper_fee_bps: 50,
      liq_insurance_fee_bps: 50,
      max_utilization_bps: 7500,
      matched_gap_buffer_bps: 1000,
      max_hourly_funding_rate_e12: "10000000000",
      max_pnl_bps: 10000,
    },
    oracle_policy: {
      allow_testnet_sandbox: true,
      max_execution_age_sec: 300,
      emergency_close_age_sec: 3600,
      max_jump_bps: 2000,
      max_clock_drift_sec: 30,
    },
    exec_spread_bps: 0,
    ...overrides,
  };
}

function makeLpSnapshot(overrides: Partial<LpSnapshotView> = {}): LpSnapshotView {
  return {
    lp_vault_realized_equity_e8: "1000000000", // $10.00
    lp_mtm_equity_e8: "1000000000",
    reserved_liquidity_e8: "0",
    lp_available_liquidity_e8: "1000000000",
    net_bounded_trader_claim_e8: "0",
    total_unrealized_bad_debt_e8: "0",
    lp_total_shares: "1000000000",
    lp_locked_seed_shares: "10000",
    withdrawals_locked_for_emergency: false,
    ...overrides,
  };
}

describe("ROASTAKE Perpetuals math, policy & RPC lifecycle (M04.6)", () => {
  beforeEach(() => {
    clearPerpsTxHistory();
  });

  it("performs exact BigInt 6-dec Circle USDC <-> 8-dec USD conversions and preserves sub-micro-unit residue", () => {
    expect(parseDecimalToFixedBigInt("0.10", 8)).toBe(10_000_000n);
    expect(parseDecimalToFixedBigInt("8.000000", 6)).toBe(8_000_000n);
    expect(parseDecimalToFixedBigInt("1.1234567", 6)).toBeNull();
    expect(parseDecimalToFixedBigInt("-5", 6)).toBeNull();

    expect(usdcUnitsToUsdE8(7_997_997n)).toBe(799_799_700n);
    // 799,799,745 internal e8 -> 7,997,997 transferable USDC units + 45 e8 residue
    const split = splitUsdE8ToUsdcUnits(799_799_745n);
    expect(split.wholeUnits).toBe(7_997_997n);
    expect(split.transferableE8).toBe(799_799_700n);
    expect(split.residueE8).toBe(45n);

    // Sub-$0.000001 balance converts to 0 transferable units
    const dustSplit = splitUsdE8ToUsdcUnits(99n);
    expect(dustSplit.wholeUnits).toBe(0n);
    expect(dustSplit.residueE8).toBe(99n);
  });

  it("mirrors on-chain M04.5C-C trade math ($10/kg, 0.10 kg Long @ 4x margin $0.25) and indicative liq", () => {
    const execPrice = computeExecPriceE8(1_000_000_000n, true, 0);
    const size = 10_000_000n;
    const notionalFloor = computeNotionalFloorE8(execPrice, size);
    const notionalCeil = computeNotionalCeilE8(execPrice, size);
    expect(execPrice).toBe(1_000_000_000n);
    expect(notionalFloor).toBe(100_000_000n); // $1.00
    expect(notionalCeil).toBe(100_000_000n);
    expect(computeInitialMarginE8(notionalCeil, 2500)).toBe(25_000_000n); // $0.25
    expect(computeMaintenanceMarginE8(notionalCeil, 1250)).toBe(12_500_000n); // $0.125
    expect(computeTradeFeeE8(notionalCeil, 10)).toBe(100_000n); // $0.001000
    expect(computeEffectiveLeverageX100(notionalFloor, 25_000_000n)).toBe(400n); // 4.00x
    expect(computeReservedLiquidityE8(200_000_000n, 100_000_000n, 1000)).toBe(120_000_000n);
    expect(computeUtilizationBps(120_000_000n, 200_000_000n)).toBe(6000n);

    const longLiq = computeIndicativeLiquidationPriceE8("Long", size, execPrice, 25_000_000n, 0n, 1250);
    const shortLiq = computeIndicativeLiquidationPriceE8("Short", size, execPrice, 25_000_000n, 0n, 1250);
    expect(longLiq).not.toBeNull();
    expect(longLiq!).toBeLessThan(execPrice);
    expect(shortLiq).not.toBeNull();
    expect(shortLiq!).toBeGreaterThan(execPrice);

    const depositArgs = buildTraderCollateralDepositArgs(8_000_000n);
    expect(depositArgs.receiver_id).toBe(PERPS_CONTRACT_ID);
    expect(depositArgs.amount).toBe("8000000");
    expect(depositArgs.msg).toBe('{"action":"trader_collateral"}');

    const lpArgs = buildLpDepositArgs(2_000_000n);
    expect(lpArgs.receiver_id).toBe(PERPS_CONTRACT_ID);
    expect(lpArgs.amount).toBe("2000000");
    expect(lpArgs.msg).toBe('{"action":"lp_deposit"}');
  });

  it("evaluates oracle freshness (>300s stale) and order validation gates accurately", () => {
    const freshMarket = makeMarketView({ last_valid_observed_sec: 1_794_350_000 });
    const fresh = evaluatePerpsOracleStatus(freshMarket, 1_794_350_100);
    expect(fresh.status).toBe("FRESH");
    expect(fresh.isValidForOpen).toBe(true);

    const stale = evaluatePerpsOracleStatus(freshMarket, 1_794_350_301);
    expect(stale.status).toBe("STALE");
    expect(stale.isStale).toBe(true);
    expect(stale.isValidForOpen).toBe(false);

    // Valid open preview ($10/kg, 0.10 kg, $0.25 margin)
    const validOrder = buildAndValidateOrderPreview({
      market: freshMarket,
      lpSnapshot: makeLpSnapshot(),
      oracleStatus: fresh,
      pausedGlobal: false,
      isNearConnected: true,
      unsupportedNearNetwork: false,
      isAccountRegistered: true,
      accountActionLocked: false,
      freeCollateralE8: 100_000_000n,
      side: "Long",
      sizeInput: "0.10",
      marginUsdcInput: "0.25",
    });
    expect(validOrder.valid).toBe(true);
    expect(validOrder.totalFreeCollateralNeededE8).toBe(25_100_000n); // $0.251

    // Stale oracle blocks new open cleanly
    const blockedStale = buildAndValidateOrderPreview({
      market: freshMarket,
      lpSnapshot: makeLpSnapshot(),
      oracleStatus: stale,
      pausedGlobal: false,
      isNearConnected: true,
      unsupportedNearNetwork: false,
      isAccountRegistered: true,
      accountActionLocked: false,
      freeCollateralE8: 100_000_000n,
      side: "Long",
      sizeInput: "0.10",
      marginUsdcInput: "0.25",
    });
    expect(blockedStale.valid).toBe(false);
    expect(blockedStale.blockingReason).toMatch(/STALE/i);

    // Zero LP liquidity blocks new open cleanly
    const blockedLpZero = buildAndValidateOrderPreview({
      market: freshMarket,
      lpSnapshot: makeLpSnapshot({ lp_mtm_equity_e8: "0", lp_available_liquidity_e8: "0" }),
      oracleStatus: fresh,
      pausedGlobal: false,
      isNearConnected: true,
      unsupportedNearNetwork: false,
      isAccountRegistered: true,
      accountActionLocked: false,
      freeCollateralE8: 100_000_000n,
      side: "Long",
      sizeInput: "0.10",
      marginUsdcInput: "0.25",
    });
    expect(blockedLpZero.valid).toBe(false);
    expect(blockedLpZero.blockingReason).toMatch(/LP Vault has zero MTM liquidity/i);

    // Utilization > 75% blocks open cleanly
    const blockedCap = buildAndValidateOrderPreview({
      market: freshMarket,
      lpSnapshot: makeLpSnapshot({ lp_mtm_equity_e8: "100000000", reserved_liquidity_e8: "75000000" }),
      oracleStatus: fresh,
      pausedGlobal: false,
      isNearConnected: true,
      unsupportedNearNetwork: false,
      isAccountRegistered: true,
      accountActionLocked: false,
      freeCollateralE8: 100_000_000n,
      side: "Long",
      sizeInput: "0.10",
      marginUsdcInput: "0.25",
    });
    expect(blockedCap.valid).toBe(false);
    expect(blockedCap.blockingReason).toMatch(/Insufficient LP capacity/i);
  });

  it("maps Three-Market slugs bidirectionally and enforces NEAR Testnet contract allowlist", () => {
    expect(resolveThreeMarketEntry(MARKET_ARABICA_URL_SLUG)?.marketId).toBe(MARKET_ARABICA_PERPS_ID);
    expect(resolveThreeMarketEntry(encodeURIComponent(MARKET_ARABICA_PERPS_ID))?.status).toBe("configured_testnet");
    expect(resolveThreeMarketEntry(MARKET_ROBUSTA_LOGICAL_ID)?.marketId).toBe(MARKET_ROBUSTA_PERPS_ID);
    expect(resolveThreeMarketEntry(MARKET_ROBUSTA_LOGICAL_ID)?.status).toBe("configured_testnet");
    expect(resolveThreeMarketEntry(encodeURIComponent(MARKET_ROBUSTA_PERPS_ID))?.status).toBe("configured_testnet");
    expect(resolveThreeMarketEntry(MARKET_GESHA_LOGICAL_ID)?.marketId).toBe(MARKET_GESHA_PERPS_ID);
    expect(resolveThreeMarketEntry(MARKET_GESHA_LOGICAL_ID)?.status).toBe("configured_testnet");
    expect(resolveThreeMarketEntry(encodeURIComponent(MARKET_GESHA_PERPS_ID))?.status).toBe("configured_testnet");
    expect(resolveThreeMarketEntry("NON_EXISTENT")).toBeNull();

    expect(validatePerpsTargetContractId(PERPS_CONTRACT_ID)).toBe(PERPS_CONTRACT_ID);
    expect(validatePerpsTargetContractId(CIRCLE_TESTNET_USDC_ID)).toBe(CIRCLE_TESTNET_USDC_ID);
    expect(() => validatePerpsTargetContractId("app.nearcrowd.near")).toThrow(/Testnet-only policy/i);
  });

  it("fetches protocol & trader state pinned to one block, falling back across RPCs on failure", async () => {
    let calls = 0;
    const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls += 1;
      const url = String(input);
      // Force failure on fastnear primary so fallback endpoint succeeds seamlessly
      if (url.includes("fastnear.com")) {
        return new Response("down", { status: 503 });
      }
      const req = JSON.parse(String(init?.body ?? "{}")) as {
        method: string;
        params: Record<string, unknown>;
      };
      if (req.method === "block") {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: "1",
            result: {
              header: {
                hash: "pinned-final-hash",
                height: 222_333_444,
                timestamp_nanosec: "1794350000000000000",
              },
            },
          }),
        );
      }
      if (req.params.request_type === "view_account") {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: "1",
            result: { amount: "15000000000000000000000000" },
          }),
        );
      }

      const method = String(req.params.method_name);
      const responses: Record<string, unknown> = {
        get_admin: "roastake-dev-mta.testnet",
        get_treasury: "roastake-dev-mta.testnet",
        is_paused_global: false,
        list_markets: [MARKET_ARABICA_PERPS_ID],
        get_market: makeMarketView(),
        get_collateral_token: {
          token_id: CIRCLE_TESTNET_USDC_ID,
          symbol: "USDC",
          decimals: 6,
          scale_to_usd_e8: "100",
          active: true,
          metadata_verified_on_chain: true,
          tracked_balance_units: "100",
          non_monetary_testnet_disclosure: "Circle Testnet USDC",
        },
        get_lp_snapshot: makeLpSnapshot(),
        get_accounting_snapshot: {
          total_trader_free_collateral_e8: "0",
          total_trader_locked_margin_e8: "0",
          total_in_flight_withdrawals_e8: "0",
          lp_vault_realized_equity_e8: "1000000000",
          insurance_fund_e8: "0",
          protocol_fees_e8: "0",
          tracked_collateral_e8: "1000000000",
          lp_total_shares: "1000000000",
          total_open_positions: 0,
          solvency_ok: true,
          paused_global: false,
        },
        verify_solvency_invariant: true,
        ft_metadata: { spec: "ft-1.0.0", name: "USD Coin", symbol: "USDC", decimals: 6 },
        ft_balance_of: "5000000",
        storage_balance_of: { total: "50000000000000000000000", available: "0" },
        is_account_registered: true,
        get_account: {
          account_id: "trader.testnet",
          registered: true,
          storage_paid_yocto: "50000000000000000000000",
          free_collateral_e8: "200000000",
          withdrawable_token_units_at_scale_100: "2000000",
          sub_micro_unit_residue_e8: "0",
          lp_shares: "0",
          pending_action_lock: false,
          has_pending_withdrawal: false,
        },
        get_positions_by_owner: [
          {
            id: 7,
            owner: "trader.testnet",
            market_id: MARKET_ARABICA_PERPS_ID,
            side: "Long",
            size_e8: "10000000",
            notional_e8: "100000000",
            entry_price_e8: "1000000000",
            locked_margin_e8: "25000000",
            entry_funding_index_e12: "0",
            opened_at_sec: 1_794_349_990,
            locked: false,
          },
        ],
        get_position_health: {
          position: {
            id: 7,
            owner: "trader.testnet",
            market_id: MARKET_ARABICA_PERPS_ID,
            side: "Long",
            size_e8: "10000000",
            notional_e8: "100000000",
            entry_price_e8: "1000000000",
            locked_margin_e8: "25000000",
            entry_funding_index_e12: "0",
            opened_at_sec: 1_794_349_990,
            locked: false,
          },
          reference_price_e8: "1000000000",
          unrealized_pnl_e8: "0",
          capped_pnl_e8: "0",
          funding_net_e8: "0",
          equity_e8: "25000000",
          maintenance_margin_e8: "12500000",
          margin_ratio_bps: 2500,
          liquidatable_at_reference: false,
          indicative_liquidation_price_e8: "857142858",
        },
      };

      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          result: {
            block_hash: "pinned-final-hash",
            result: encodeRpcResultBytes(responses[method]),
          },
        }),
      );
    });

    const proto = await fetchPerpsProtocolSnapshot({ fetchFn: mockFetch as typeof fetch });
    expect(calls).toBeGreaterThan(1);
    expect(proto.rpcEndpoint).toBe("https://rpc.testnet.near.org");
    expect(proto.blockHash).toBe("pinned-final-hash");
    expect(proto.blockTimestampSec).toBe(1_794_350_000);
    expect(proto.arabicaMarket?.last_valid_price_e8).toBe("1000000000");

    const trader = await fetchPerpsTraderSnapshot("trader.testnet", { fetchFn: mockFetch as typeof fetch });
    expect(trader.nearBalanceYocto).toBe("15000000000000000000000000");
    expect(trader.circleUsdcBalanceUnits).toBe("5000000");
    expect(trader.positions).toHaveLength(1);
    expect(trader.positions[0].health?.margin_ratio_bps).toBe(2500);
  });

  it("verifies ft_transfer_call refunds ('0'), withdraw_collateral settled vs restored callbacks, and timeout unknown state without retrying", async () => {
    // Case 1: ft_transfer_call refunded "0" despite top-level SuccessValue
    const refundedDepositFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          result: {
            status: { SuccessValue: encodeJsonArgsBase64("0") },
            receipts_outcome: [],
          },
        }),
      ),
    );
    const depositRefund = await verifyNearTransactionFinality({
      txHash: "TxRefund1",
      senderAccountId: "trader.testnet",
      expectedFlow: "trader_collateral_deposit",
      fetchFn: refundedDepositFetch as typeof fetch,
    });
    expect(depositRefund.verdict).toBe("failed");
    expect(depositRefund.detail).toMatch(/refunded in ft_resolve_transfer/i);

    // Case 2: withdraw_collateral rolled back in callback ("status": "restored")
    const restoredWithdrawFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          result: {
            status: { SuccessValue: "" },
            receipts_outcome: [
              {
                id: "r1",
                outcome: {
                  status: { Failure: { ActionError: { kind: "AccountDoesNotExist" } } },
                  logs: [],
                  executor_id: CIRCLE_TESTNET_USDC_ID,
                },
              },
              {
                id: "r2",
                outcome: {
                  status: { SuccessValue: "" },
                  logs: [
                    `EVENT_JSON:${JSON.stringify({
                      standard: "roastake_perpetuals",
                      version: "1.0.0",
                      event: "collateral_withdrawn",
                      data: { status: "restored" },
                    })}`,
                  ],
                  executor_id: PERPS_CONTRACT_ID,
                },
              },
            ],
          },
        }),
      ),
    );
    const withdrawRollback = await verifyNearTransactionFinality({
      txHash: "TxRollback2",
      senderAccountId: "trader.testnet",
      expectedFlow: "withdraw_collateral",
      fetchFn: restoredWithdrawFetch as typeof fetch,
    });
    expect(withdrawRollback.verdict).toBe("failed");
    expect(withdrawRollback.detail).toMatch(/restored by on_withdraw_transfer callback/i);

    // Case 3: executeNearPerpsTx full lifecycle + timeout -> unknown_verification_required -> manual verify recovers
    const phases: string[] = [];
    const sendTx = vi.fn(async () => ({
      transactionHash: "TxAmbiguous3",
      signerId: "trader.testnet",
      receiverId: PERPS_CONTRACT_ID,
      rawOutcome: {},
    }));
    const downFetch = vi.fn(async () => new Response("timeout", { status: 504 }));

    const ambiguous = await executeNearPerpsTx({
      actionLabel: "Open Long 0.10 kg",
      flow: "open_position",
      marketId: MARKET_ARABICA_PERPS_ID,
      amountDisplay: "0.10 kg",
      signerId: "trader.testnet",
      request: {
        receiverId: PERPS_CONTRACT_ID,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "open_position",
              args: {},
              gas: GAS_50_TGAS,
              deposit: ZERO_YOCTO_NEAR,
            },
          },
        ],
      },
      sendTransaction: sendTx,
      fetchFn: downFetch as typeof fetch,
      onPhaseChange: (rec) => phases.push(rec.phase),
    });

    // Wallet sign called ONCE only — zero auto-retries!
    expect(sendTx).toHaveBeenCalledTimes(1);
    expect(phases).toEqual([
      "awaiting_wallet",
      "signing",
      "processing",
      "finalizing",
      "unknown_verification_required",
    ]);
    expect(ambiguous.phase).toBe("unknown_verification_required");

    // Manual verify later succeeds when RPC comes back
    const recoveredFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          result: {
            status: { SuccessValue: encodeJsonArgsBase64(1) },
            receipts_outcome: [
              {
                id: "rcpt1",
                outcome: {
                  status: { SuccessValue: "" },
                  logs: [
                    `EVENT_JSON:${JSON.stringify({
                      standard: "roastake_perpetuals",
                      version: "1.0.0",
                      event: "position_opened",
                      data: { position_id: 1 },
                    })}`,
                  ],
                },
              },
            ],
          },
        }),
      ),
    );
    const recovered = await reverifyTrackedNearTx({
      record: ambiguous,
      flow: "open_position",
      fetchFn: recoveredFetch as typeof fetch,
    });
    expect(recovered.phase).toBe("successful");

    // Wallet rejection & expired flows
    const rejected = await executeNearPerpsTx({
      actionLabel: "Open Long",
      flow: "open_position",
      amountDisplay: "0.10 kg",
      signerId: "trader.testnet",
      request: { receiverId: PERPS_CONTRACT_ID, actions: [] },
      sendTransaction: async () => {
        throw new Error("User rejected the request.");
      },
    });
    expect(rejected.phase).toBe("failed");

    const expired = await executeNearPerpsTx({
      actionLabel: "Open Long",
      flow: "open_position",
      amountDisplay: "0.10 kg",
      signerId: "trader.testnet",
      request: { receiverId: PERPS_CONTRACT_ID, actions: [] },
      sendTransaction: async () => {
        throw new Error("Signing session expired due to timeout.");
      },
    });
    expect(expired.phase).toBe("expired");

    // Verify oracle tick and lp_deposit / withdraw_lp RPC verification flows
    const tickFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          result: {
            status: { SuccessValue: "" },
            receipts_outcome: [
              {
                id: "r-tick",
                outcome: {
                  status: { SuccessValue: "" },
                  logs: [
                    `EVENT_JSON:${JSON.stringify({
                      standard: "roastake_perpetuals",
                      version: "1.0.0",
                      event: "oracle_sandbox_tick",
                      data: { sequence: 3 },
                    })}`,
                  ],
                },
              },
            ],
          },
        }),
      ),
    );
    const tickRes = await verifyNearTransactionFinality({
      txHash: "TxTick3",
      senderAccountId: "roastake-dev-mta.testnet",
      expectedFlow: "push_sandbox_oracle_price",
      fetchFn: tickFetch as typeof fetch,
    });
    expect(tickRes.verdict).toBe("successful");

    const lpSettledFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          result: {
            status: { SuccessValue: "" },
            receipts_outcome: [
              {
                id: "r-lpw",
                outcome: {
                  status: { SuccessValue: "" },
                  logs: [
                    `EVENT_JSON:${JSON.stringify({
                      standard: "roastake_perpetuals",
                      version: "1.0.0",
                      event: "collateral_withdrawn",
                      data: { status: "settled" },
                    })}`,
                  ],
                },
              },
            ],
          },
        }),
      ),
    );
    const lpWithdrawRes = await verifyNearTransactionFinality({
      txHash: "TxLpWithdraw1",
      senderAccountId: "roastake-dev-mta.testnet",
      expectedFlow: "withdraw_lp",
      fetchFn: lpSettledFetch as typeof fetch,
    });
    expect(lpWithdrawRes.verdict).toBe("successful");
    expect(lpWithdrawRes.detail).toMatch(/LP share redemption settled/i);
  });
});
