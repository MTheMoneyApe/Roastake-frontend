// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { describe, expect, it } from "vitest";
import {
  CIRCLE_USDC_ID,
  COFFEE_ASSETS,
  COFFEE_DECIMALS,
  RHEA_EXCHANGE_ID,
  RHEA_POOL_FEE_UNITS,
  USDC_DECIMALS,
  buildFtTransferCallArgs,
  buildSwapMessage,
  buildSwapRoute,
  getCoffeeAsset,
  getCoffeeAssetByTokenId,
} from "@/lib/coffee-assets/config";
import {
  SWAP_GATE_MESSAGES,
  clampSlippage,
  computeSwapMath,
  evaluateSwapGate,
  formatTokenAmount,
  formatUsdc,
  parseTokenAmount,
  quoteDivergencePct,
  type SwapGateInput,
} from "@/lib/coffee-assets/math";
import { isTestnetContractId } from "@/lib/coffee-assets/rpc";

const ARABICA = getCoffeeAsset("rARABICA");
if (!ARABICA) throw new Error("rARABICA must be configured");

// Pool 2947 as it stood when the M04.18 smoke swap executed:
// 0.10 rARABICA / 1.00 USDC, fee 30 units (0.30%).
const ARABICA_RESERVES = { reserveIn: 1_000_000n, reserveOut: 10_000_000n };

describe("M04.18 coffee asset configuration", () => {
  it("declares exactly the three approved tokens with 8 decimals and distinct pools", () => {
    expect(COFFEE_ASSETS.map((asset) => asset.symbol)).toEqual(["rARABICA", "rROBUSTA", "rGESHA"]);
    expect(COFFEE_ASSETS.map((asset) => asset.tokenId)).toEqual([
      "arabica.roastake-dev-mta.testnet",
      "robusta.roastake-dev-mta.testnet",
      "gesha.roastake-dev-mta.testnet",
    ]);
    expect(new Set(COFFEE_ASSETS.map((asset) => asset.poolId)).size).toBe(3);
    expect(COFFEE_ASSETS.map((asset) => asset.poolId)).toEqual([2947, 2949, 2950]);
    expect(COFFEE_DECIMALS).toBe(8);
    expect(USDC_DECIMALS).toBe(6);
    expect(RHEA_POOL_FEE_UNITS).toBe(30);
    expect(RHEA_EXCHANGE_ID).toBe("ref-finance-101.testnet");
  });

  it("keeps the seed ratios the pools were actually funded with", () => {
    expect(ARABICA.seedKg).toBeCloseTo(0.1, 8);
    expect(ARABICA.seedUsdc).toBe(1);
    expect(getCoffeeAsset("rROBUSTA")?.seedKg).toBeCloseTo(0.2, 8);
    expect(getCoffeeAsset("rGESHA")?.seedKg).toBeCloseTo(0.04, 8);
    for (const asset of COFFEE_ASSETS) expect(asset.seedUsdc).toBe(1);
  });

  it("maps both swap directions onto the same pool and resolves tokens by id", () => {
    const usdcToCoffee = buildSwapRoute(ARABICA, "usdc-to-coffee");
    expect(usdcToCoffee.tokenIn).toBe(CIRCLE_USDC_ID);
    expect(usdcToCoffee.tokenOut).toBe(ARABICA.tokenId);
    expect(usdcToCoffee.decimalsIn).toBe(6);
    expect(usdcToCoffee.decimalsOut).toBe(8);

    const coffeeToUsdc = buildSwapRoute(ARABICA, "coffee-to-usdc");
    expect(coffeeToUsdc.tokenIn).toBe(ARABICA.tokenId);
    expect(coffeeToUsdc.tokenOut).toBe(CIRCLE_USDC_ID);
    expect(coffeeToUsdc.poolId).toBe(usdcToCoffee.poolId);

    expect(getCoffeeAssetByTokenId("gesha.roastake-dev-mta.testnet")?.symbol).toBe("rGESHA");
    expect(getCoffeeAsset("rLIBERICA")).toBeNull();
  });

  it("builds the Ref Finance v1 swap message the exchange actually accepts", () => {
    const message = buildSwapMessage({
      pool_id: 2947,
      token_in: CIRCLE_USDC_ID,
      token_out: ARABICA.tokenId,
      amount_in: "50000",
      min_amount_out: "470080",
    });
    expect(message).toEqual({
      force: 0,
      actions: [
        {
          pool_id: 2947,
          token_in: CIRCLE_USDC_ID,
          token_out: ARABICA.tokenId,
          amount_in: "50000",
          min_amount_out: "470080",
        },
      ],
    });

    const args = buildFtTransferCallArgs(50_000n, message);
    expect(args.receiver_id).toBe("ref-finance-101.testnet");
    expect(args.amount).toBe("50000");
    const roundTripped = JSON.parse(args.msg) as typeof message;
    expect(roundTripped.actions[0].min_amount_out).toBe("470080");
    expect(roundTripped.force).toBe(0);
  });
});

describe("M04.18 swap math matches the live pool", () => {
  it("reproduces the on-chain get_return quote for 0.05 USDC into pool 2947", () => {
    const math = computeSwapMath({
      ...ARABICA_RESERVES,
      amountIn: 50_000n,
      feeBps: 30,
      slippagePct: 1,
    });
    expect(math).not.toBeNull();
    // ref-finance-101 get_return returned exactly 474829 base units (0.00474829 kg).
    expect(math?.amountOut).toBe(474_829n);
    // 1% slippage floor: floor(474829 * 0.99).
    expect(math?.minAmountOut).toBe(470_080n);
    // 0.30% pool fee, charged on the input side.
    expect(math?.feeAmountIn).toBe(150n);
    expect(math?.priceImpactPct).toBeCloseTo(4.7619, 3);
    expect(math?.spotPrice).toBeCloseTo(10, 8);
  });

  it("charges more slippage for larger trades and floors the minimum at 0% tolerance", () => {
    const small = computeSwapMath({
      ...ARABICA_RESERVES,
      amountIn: 10_000n,
      feeBps: 30,
      slippagePct: 0,
    });
    const large = computeSwapMath({
      ...ARABICA_RESERVES,
      amountIn: 200_000n,
      feeBps: 30,
      slippagePct: 0,
    });
    expect(small).not.toBeNull();
    expect(large).not.toBeNull();
    expect(large!.priceImpactPct).toBeGreaterThan(small!.priceImpactPct);
    expect(small!.minAmountOut).toBe(small!.amountOut);
    expect(large!.amountOut).toBeLessThan(small!.amountOut * 20n);
  });

  it("refuses impossible inputs instead of inventing a quote", () => {
    expect(
      computeSwapMath({ ...ARABICA_RESERVES, amountIn: 0n, feeBps: 30, slippagePct: 1 }),
    ).toBeNull();
    expect(
      computeSwapMath({ reserveIn: 0n, reserveOut: 10n, amountIn: 1n, feeBps: 30, slippagePct: 1 }),
    ).toBeNull();
    expect(
      computeSwapMath({ ...ARABICA_RESERVES, amountIn: 1n, feeBps: 10_000, slippagePct: 1 }),
    ).toBeNull();
  });

  it("parses and formats token amounts without floating point drift", () => {
    expect(parseTokenAmount("0.05", 6)).toBe(50_000n);
    expect(parseTokenAmount("0.00474829", 8)).toBe(474_829n);
    expect(parseTokenAmount("1", 8)).toBe(100_000_000n);
    expect(parseTokenAmount(".5", 6)).toBe(500_000n);
    expect(parseTokenAmount("", 6)).toBeNull();
    expect(parseTokenAmount("0", 6)).toBeNull();
    expect(parseTokenAmount("-1", 6)).toBeNull();
    expect(parseTokenAmount("1.1234567", 6)).toBeNull();
    expect(parseTokenAmount("abc", 6)).toBeNull();

    expect(formatTokenAmount(474_829n, 8, 8)).toBe("0.00474829");
    expect(formatTokenAmount(15_403_562n, 6, 6)).toBe("15.403562");
    expect(formatTokenAmount(1_000_000_000n, 8, 6)).toBe("10");
    expect(formatUsdc(1_100_000n)).toBe("1.1");
  });

  it("reports divergence between local math and the exchange quote", () => {
    expect(quoteDivergencePct(474_829n, 474_829n)).toBe(0);
    expect(quoteDivergencePct(100n, 99n)).toBeCloseTo(1.0101, 3);
    expect(quoteDivergencePct(10n, 0n)).toBe(100);
    expect(clampSlippage(-5)).toBe(0);
    expect(clampSlippage(150)).toBe(100);
    expect(clampSlippage(Number.NaN)).toBe(0);
  });
});

describe("M04.18 swap gating", () => {
  const valid: SwapGateInput = {
    walletConnected: true,
    networkId: "testnet",
    poolExists: true,
    poolLoading: false,
    reserveIn: 1_000_000n,
    reserveOut: 10_000_000n,
    amountIn: 50_000n,
    balanceIn: 15_403_562n,
    slippagePct: 1,
    quoteAgeMs: 1_000,
    quoteAvailable: true,
    amountOut: 474_829n,
    routeSupported: true,
  };

  it("opens only when every live condition holds", () => {
    expect(evaluateSwapGate(valid)).toEqual([]);
  });

  it("blocks disconnected wallets and wrong networks", () => {
    expect(evaluateSwapGate({ ...valid, walletConnected: false })).toContain("wallet_disconnected");
    expect(evaluateSwapGate({ ...valid, networkId: "mainnet" })).toContain("network_not_testnet");
  });

  it("blocks empty pools, bad amounts, and stale quotes", () => {
    expect(evaluateSwapGate({ ...valid, poolExists: false })).toContain("pool_missing");
    expect(evaluateSwapGate({ ...valid, reserveOut: 0n })).toContain("pool_empty");
    expect(evaluateSwapGate({ ...valid, amountIn: null })).toContain("amount_invalid");
    expect(evaluateSwapGate({ ...valid, amountIn: 0n })).toContain("amount_invalid");
    expect(evaluateSwapGate({ ...valid, amountIn: 99_999_999n })).toContain(
      "amount_exceeds_balance",
    );
    expect(evaluateSwapGate({ ...valid, quoteAgeMs: 21_000 })).toContain("quote_stale");
    expect(evaluateSwapGate({ ...valid, quoteAvailable: false })).toContain("quote_unavailable");
    expect(evaluateSwapGate({ ...valid, amountOut: 0n })).toContain(
      "insufficient_output_liquidity",
    );
    expect(evaluateSwapGate({ ...valid, slippagePct: 25 })).toContain("slippage_invalid");
    expect(evaluateSwapGate({ ...valid, routeSupported: false })).toContain("route_unsupported");
  });

  it("has an operator-readable message for every reason", () => {
    expect(SWAP_GATE_MESSAGES.wallet_disconnected).toMatch(/wallet/i);
    expect(SWAP_GATE_MESSAGES.pool_empty).toMatch(/liquidity/i);
    expect(SWAP_GATE_MESSAGES.quote_stale).toMatch(/stale/i);
  });
});

describe("M04.18 Testnet contract policy", () => {
  it("accepts named testnet accounts and 64-hex implicit accounts (Circle USDC)", () => {
    expect(isTestnetContractId("ref-finance-101.testnet")).toBe(true);
    expect(isTestnetContractId("arabica.roastake-dev-mta.testnet")).toBe(true);
    expect(isTestnetContractId(CIRCLE_USDC_ID)).toBe(true);
  });

  it("rejects mainnet and malformed contract ids", () => {
    expect(isTestnetContractId("ref-finance-101.near")).toBe(false);
    expect(isTestnetContractId("wNEAR.near")).toBe(false);
    expect(isTestnetContractId("")).toBe(false);
    expect(isTestnetContractId("Z".repeat(64))).toBe(false);
  });
});
