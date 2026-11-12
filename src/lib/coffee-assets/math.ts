// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.
//
// Pure swap math for the M04.18 Coffee Mini Swap.
// The AMM formula mirrors Ref Finance's simple-pool x * y = k with the fee
// taken from the input amount, so the numbers here can be checked against
// `get_return` on ref-finance-101.testnet.

export const BASIS_POINTS = 10_000n;

export interface SwapMathInput {
  /** Pool reserve of the input token, base units. */
  readonly reserveIn: bigint;
  /** Pool reserve of the output token, base units. */
  readonly reserveOut: bigint;
  /** Amount being sold, base units. */
  readonly amountIn: bigint;
  /** Pool fee in basis points (30 = 0.30%). */
  readonly feeBps: number;
  /** Slippage tolerance in percent (1 = 1%). */
  readonly slippagePct: number;
}

export interface SwapMathResult {
  readonly amountOut: bigint;
  readonly minAmountOut: bigint;
  readonly feeAmountIn: bigint;
  /** Price impact of the trade on the pool, excluding the pool fee. */
  readonly priceImpactPct: number;
  /** Average execution price, output units per input unit. */
  readonly executionPrice: number;
  /** Marginal pool price before the trade, output units per input unit. */
  readonly spotPrice: number;
}

export function computeSwapMath(input: SwapMathInput): SwapMathResult | null {
  const { reserveIn, reserveOut, amountIn } = input;
  if (reserveIn <= 0n || reserveOut <= 0n || amountIn <= 0n) return null;
  if (!Number.isFinite(input.feeBps) || input.feeBps < 0 || input.feeBps >= 10_000) return null;

  const feeBps = BigInt(Math.trunc(input.feeBps));
  const amountInWithFee = amountIn * (BASIS_POINTS - feeBps);
  const numerator = reserveOut * amountInWithFee;
  const denominator = reserveIn * BASIS_POINTS + amountInWithFee;
  const amountOut = numerator / denominator;
  if (amountOut <= 0n) return null;

  const slippage = clampSlippage(input.slippagePct);
  const minAmountOut = (amountOut * BigInt(Math.round((100 - slippage) * 100))) / 10_000n;

  const feeAmountIn = (amountIn * feeBps) / BASIS_POINTS;
  const spotPrice = Number(reserveOut) / Number(reserveIn);
  const executionPrice = Number(amountOut) / Number(amountIn);
  const priceImpactPct = (Number(amountIn) / (Number(reserveIn) + Number(amountIn))) * 100;

  return { amountOut, minAmountOut, feeAmountIn, priceImpactPct, executionPrice, spotPrice };
}

export function clampSlippage(slippagePct: number): number {
  if (!Number.isFinite(slippagePct)) return 0;
  return Math.min(Math.max(slippagePct, 0), 100);
}

/**
 * Parses a human decimal string into base units without floating point error.
 * Returns null for empty, negative, malformed or over-precise input.
 */
export function parseTokenAmount(value: string, decimals: number): bigint | null {
  const raw = value.trim();
  if (raw === "" || !/^\d*(\.\d*)?$/.test(raw)) return null;
  const [wholePart, fracPart = ""] = raw.split(".");
  if (wholePart === "" && fracPart === "") return null;
  if (fracPart.length > decimals) return null;
  const whole = wholePart === "" ? "0" : wholePart;
  const padded = fracPart.padEnd(decimals, "0");
  try {
    const parsed = BigInt(`${whole}${padded}`);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

/** Formats base units for display, trimming trailing zeros. */
export function formatTokenAmount(base: bigint, decimals: number, maxFractionDigits = 6): string {
  const negative = base < 0n;
  const abs = negative ? -base : base;
  const divisor = 10n ** BigInt(decimals);
  const whole = abs / divisor;
  const frac = abs % divisor;
  const fracStr = frac
    .toString()
    .padStart(decimals, "0")
    .slice(0, maxFractionDigits)
    .replace(/0+$/, "");
  const wholeStr = whole.toLocaleString("en-US");
  const sign = negative ? "-" : "";
  return fracStr.length > 0 ? `${sign}${wholeStr}.${fracStr}` : `${sign}${wholeStr}`;
}

/** Display helper for USD values with 6-decimal USDC base units. */
export function formatUsdc(base: bigint): string {
  return formatTokenAmount(base, 6, 6);
}

/** Difference between a fresh on-chain quote and locally computed math, in percent. */
export function quoteDivergencePct(computed: bigint, onChain: bigint): number {
  if (onChain <= 0n) return 100;
  const diff = computed > onChain ? computed - onChain : onChain - computed;
  return (Number(diff) / Number(onChain)) * 100;
}

export type SwapGateReason =
  | "wallet_disconnected"
  | "network_not_testnet"
  | "pool_missing"
  | "pool_empty"
  | "amount_invalid"
  | "amount_exceeds_balance"
  | "slippage_invalid"
  | "quote_stale"
  | "quote_unavailable"
  | "route_unsupported"
  | "insufficient_output_liquidity";

export interface SwapGateInput {
  readonly walletConnected: boolean;
  readonly networkId: string;
  readonly poolExists: boolean;
  readonly poolLoading: boolean;
  readonly reserveIn: bigint;
  readonly reserveOut: bigint;
  readonly amountIn: bigint | null;
  readonly balanceIn: bigint;
  readonly slippagePct: number;
  readonly quoteAgeMs: number | null;
  readonly quoteAvailable: boolean;
  readonly amountOut: bigint;
  readonly routeSupported: boolean;
}

export const SWAP_GATE_MESSAGES: Record<SwapGateReason, string> = {
  wallet_disconnected: "Connect a NEAR Testnet wallet to swap.",
  network_not_testnet: "Wrong network. This Mini Swap is NEAR Testnet only.",
  pool_missing: "The RHEA pool for this asset does not exist.",
  pool_empty: "The RHEA pool has no liquidity, so no swap is possible.",
  amount_invalid: "Enter an amount greater than zero.",
  amount_exceeds_balance: "Amount exceeds your Testnet balance for the input token.",
  slippage_invalid: "Slippage tolerance must be between 0% and 10%.",
  quote_stale: "The on-chain quote is stale. Refreshing before you sign.",
  quote_unavailable: "No on-chain quote is available right now.",
  route_unsupported: "This route is not one of the three supported coffee pools.",
  insufficient_output_liquidity: "Pool liquidity cannot fill this amount. Reduce the size.",
};

/** Evaluates every condition that must hold before a swap may be signed. */
export function evaluateSwapGate(input: SwapGateInput): SwapGateReason[] {
  const reasons: SwapGateReason[] = [];
  if (!input.routeSupported) reasons.push("route_unsupported");
  if (!input.walletConnected) reasons.push("wallet_disconnected");
  if (input.networkId !== "testnet") reasons.push("network_not_testnet");
  // Do not report a missing/empty pool while its first on-chain snapshot is still loading.
  if (!input.poolLoading) {
    if (!input.poolExists) reasons.push("pool_missing");
    else if (input.reserveIn <= 0n || input.reserveOut <= 0n) reasons.push("pool_empty");
  }
  if (input.amountIn === null || input.amountIn <= 0n) reasons.push("amount_invalid");
  if (input.amountIn !== null && input.amountIn > input.balanceIn)
    reasons.push("amount_exceeds_balance");
  if (!(input.slippagePct >= 0 && input.slippagePct <= 10)) reasons.push("slippage_invalid");
  if (!input.quoteAvailable) reasons.push("quote_unavailable");
  if (input.quoteAgeMs === null || input.quoteAgeMs > 20_000) reasons.push("quote_stale");
  if (input.quoteAvailable && input.amountOut <= 0n) reasons.push("insufficient_output_liquidity");
  return reasons;
}
