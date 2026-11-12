// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { formatFixedPoint, parseUnsignedBigInt } from "@/lib/oracle/format";
import {
  BPS_SCALE,
  PERPS_CONTRACT_ID,
  PRICE_SCALE,
  SIZE_SCALE,
  USDC_TO_USD_E8_SCALE,
  USD_SCALE,
} from "./config";
import type { LpSnapshotView, MarketView, StoredPositionSide } from "./types";

const DECIMAL_INPUT_REGEX = /^\d+(?:\.\d*)?$|^\.\d+$/;
const SIGNED_INT_REGEX = /^-?\d+$/;

export function parseSignedBigInt(value: string | bigint | null | undefined): bigint | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") return value;
  const trimmed = value.trim();
  if (!SIGNED_INT_REGEX.test(trimmed)) return null;
  return BigInt(trimmed);
}

/**
 * Parse a decimal string (`"0.10"`, `"10.50"`, `"2"`) strictly using string splitting
 * and BigInt multiplication — never IEEE-754 floating point.
 */
export function parseDecimalToFixedBigInt(input: string, decimals: number): bigint | null {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed || !DECIMAL_INPUT_REGEX.test(trimmed)) {
    return null;
  }
  const [rawInt = "0", rawFrac = ""] = trimmed.split(".");
  if (rawFrac.length > decimals) {
    return null;
  }
  const intDigits = rawInt.length > 0 ? rawInt : "0";
  const fracDigits = rawFrac.padEnd(decimals, "0");
  return BigInt(intDigits) * 10n ** BigInt(decimals) + BigInt(fracDigits || "0");
}

/** Format signed fixed-point integer string or BigInt (handles negative values safely). */
export function formatSignedFixedPoint(
  rawValue: string | bigint,
  decimals: number,
  options?: { trimTrailingZeros?: boolean; groupThousands?: boolean; maxFractionDigits?: number; showPlus?: boolean },
): string {
  const signed = parseSignedBigInt(rawValue);
  if (signed === null) return "Unavailable";
  const isNeg = signed < 0n;
  const absVal = isNeg ? -signed : signed;
  const formatted = formatFixedPoint(absVal, decimals, options);
  if (formatted === "Unavailable") return "Unavailable";
  if (isNeg) return `-${formatted}`;
  if (options?.showPlus && signed > 0n) return `+${formatted}`;
  return formatted;
}

export function formatUsdE8(rawE8: string | bigint, options?: { showPlus?: boolean; decimalsShown?: number }): string {
  const val = formatSignedFixedPoint(rawE8, 8, {
    trimTrailingZeros: false,
    groupThousands: true,
    maxFractionDigits: options?.decimalsShown ?? 6,
    showPlus: options?.showPlus,
  });
  if (val === "Unavailable") return "Unavailable";
  if (val.startsWith("-")) return `-$${val.slice(1)}`;
  if (val.startsWith("+")) return `+$${val.slice(1)}`;
  return `$${val}`;
}

export function formatUsdcUnits(rawUnits: string | bigint): string {
  const formatted = formatFixedPoint(rawUnits, 6, {
    trimTrailingZeros: false,
    groupThousands: true,
    maxFractionDigits: 6,
  });
  return formatted === "Unavailable" ? "Unavailable" : `${formatted} USDC`;
}

export function formatSizeKgE8(rawSizeE8: string | bigint): string {
  const formatted = formatFixedPoint(rawSizeE8, 8, {
    trimTrailingZeros: true,
    groupThousands: true,
    maxFractionDigits: 8,
  });
  return formatted === "Unavailable" ? "Unavailable" : `${formatted} kg`;
}

export function usdcUnitsToUsdE8(units: bigint, scaleToUsdE8 = USDC_TO_USD_E8_SCALE): bigint {
  return units * scaleToUsdE8;
}

export function splitUsdE8ToUsdcUnits(
  usdE8: bigint,
  scaleToUsdE8 = USDC_TO_USD_E8_SCALE,
): { wholeUnits: bigint; transferableE8: bigint; residueE8: bigint } {
  if (usdE8 <= 0n || scaleToUsdE8 <= 0n) {
    return { wholeUnits: 0n, transferableE8: 0n, residueE8: 0n };
  }
  const wholeUnits = usdE8 / scaleToUsdE8;
  const transferableE8 = wholeUnits * scaleToUsdE8;
  const residueE8 = usdE8 % scaleToUsdE8;
  return { wholeUnits, transferableE8, residueE8 };
}

export function ceilDivBigInt(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new Error("Zero denominator in ceilDivBigInt");
  }
  if (numerator <= 0n) return 0n;
  return (numerator + denominator - 1n) / denominator;
}

export function computeExecPriceE8(
  indexPriceE8: bigint,
  isBuy: boolean,
  execSpreadBps: number,
): bigint {
  if (indexPriceE8 <= 0n) return 0n;
  if (execSpreadBps <= 0) return indexPriceE8;
  const spread = BigInt(execSpreadBps);
  if (isBuy) {
    return ceilDivBigInt(indexPriceE8 * (BPS_SCALE + spread), BPS_SCALE);
  }
  return (indexPriceE8 * (BPS_SCALE - spread)) / BPS_SCALE;
}

export function computeNotionalFloorE8(priceE8: bigint, sizeE8: bigint): bigint {
  if (priceE8 <= 0n || sizeE8 <= 0n) return 0n;
  return (priceE8 * sizeE8) / PRICE_SCALE;
}

export function computeNotionalCeilE8(priceE8: bigint, sizeE8: bigint): bigint {
  if (priceE8 <= 0n || sizeE8 <= 0n) return 0n;
  return ceilDivBigInt(priceE8 * sizeE8, PRICE_SCALE);
}

export function computeInitialMarginE8(notionalCeilE8: bigint, imBps: number): bigint {
  return ceilDivBigInt(notionalCeilE8 * BigInt(imBps), BPS_SCALE);
}

export function computeMaintenanceMarginE8(notionalCeilE8: bigint, mmBps: number): bigint {
  return ceilDivBigInt(notionalCeilE8 * BigInt(mmBps), BPS_SCALE);
}

export function computeTradeFeeE8(notionalCeilE8: bigint, tradeFeeBps: number): bigint {
  if (tradeFeeBps <= 0 || notionalCeilE8 <= 0n) return 0n;
  return ceilDivBigInt(notionalCeilE8 * BigInt(tradeFeeBps), BPS_SCALE);
}

export function computeReservedLiquidityE8(
  longOiE8: bigint,
  shortOiE8: bigint,
  matchedGapBufferBps: number,
): bigint {
  const skewOi = longOiE8 >= shortOiE8 ? longOiE8 - shortOiE8 : shortOiE8 - longOiE8;
  const matchedSide = longOiE8 <= shortOiE8 ? longOiE8 : shortOiE8;
  const matchedReserve = ceilDivBigInt(matchedSide * 2n * BigInt(matchedGapBufferBps), BPS_SCALE);
  return skewOi + matchedReserve;
}

export function computeUtilizationBps(reservedE8: bigint, lpMtmEquityE8: bigint): bigint {
  if (reservedE8 <= 0n) return 0n;
  if (lpMtmEquityE8 <= 0n) return 10_001n;
  return ceilDivBigInt(reservedE8 * BPS_SCALE, lpMtmEquityE8);
}

/** Format `bps` cleanly as percentage string without JS float precision noise (`5000` -> `"50.00%"`). */
export function formatBpsAsPercent(bps: number | bigint): string {
  const v = typeof bps === "bigint" ? bps : BigInt(Math.max(0, Math.trunc(bps)));
  const whole = v / 100n;
  const rem = (v % 100n).toString().padStart(2, "0");
  return `${whole}.${rem}%`;
}

/**
 * Compute leverage scaled x100 (`400n` => `"4.00x"`). Returns null when collateral is zero.
 */
export function computeEffectiveLeverageX100(notionalE8: bigint, collateralE8: bigint): bigint | null {
  if (notionalE8 <= 0n || collateralE8 <= 0n) return null;
  return (notionalE8 * 100n) / collateralE8;
}

export function formatLeverageX100(levX100: bigint | null): string {
  if (levX100 === null) return "—";
  const whole = levX100 / 100n;
  const frac = (levX100 % 100n).toString().padStart(2, "0");
  return `${whole}.${frac}x`;
}

/**
 * Pure mirror of `compute_indicative_liquidation_price_e8` from `roastake_shared::perps`.
 * Strictly indicative only — actual on-chain liquidation checks exact equity vs maintenance margin.
 */
export function computeIndicativeLiquidationPriceE8(
  side: StoredPositionSide,
  sizeE8: bigint,
  entryPriceE8: bigint,
  lockedMarginE8: bigint,
  fundingNetE8: bigint,
  mmBps: number,
): bigint | null {
  if (sizeE8 <= 0n || entryPriceE8 <= 0n || mmBps <= 0 || BigInt(mmBps) >= BPS_SCALE) {
    return null;
  }
  const effectiveMargin = lockedMarginE8 + fundingNetE8;
  const absMargin = effectiveMargin >= 0n ? effectiveMargin : -effectiveMargin;
  const marginPerKg = (absMargin * SIZE_SCALE) / sizeE8;
  const mm = BigInt(mmBps);

  if (side === "Long") {
    if (effectiveMargin >= 0n) {
      if (entryPriceE8 <= marginPerKg) return 0n;
      return ceilDivBigInt((entryPriceE8 - marginPerKg) * BPS_SCALE, BPS_SCALE - mm);
    }
    return ceilDivBigInt((entryPriceE8 + marginPerKg) * BPS_SCALE, BPS_SCALE - mm);
  }

  if (effectiveMargin >= 0n) {
    return ((entryPriceE8 + marginPerKg) * BPS_SCALE) / (BPS_SCALE + mm);
  }
  if (entryPriceE8 <= marginPerKg) return 0n;
  return ((entryPriceE8 - marginPerKg) * BPS_SCALE) / (BPS_SCALE + mm);
}

export interface PerpsOracleStatus {
  status: "FRESH" | "STALE" | "NO_PRICE" | "FUTURE_DRIFT" | "EMERGENCY";
  isValidForOpen: boolean;
  isStale: boolean;
  ageSec: number | null;
  maxAgeSec: number;
  priceE8: bigint | null;
  observedAtSec: number | null;
  sequence: number | null;
  detail: string;
}

export function evaluatePerpsOracleStatus(
  market: MarketView | null | undefined,
  nowSec: number | null,
): PerpsOracleStatus {
  if (!market) {
    return {
      status: "NO_PRICE",
      isValidForOpen: false,
      isStale: false,
      ageSec: null,
      maxAgeSec: 300,
      priceE8: null,
      observedAtSec: null,
      sequence: null,
      detail: "Market metadata unavailable from NEAR Testnet RPC.",
    };
  }

  const maxAgeSec = market.oracle_policy.max_execution_age_sec;
  const maxDriftSec = market.oracle_policy.max_clock_drift_sec;
  const priceE8 = market.last_valid_price_e8 ? parseUnsignedBigInt(market.last_valid_price_e8) : null;
  const obsSec = market.last_valid_observed_sec ?? null;
  const sequence = market.sandbox_sequence ?? null;

  if (market.mode === "Emergency") {
    return {
      status: "EMERGENCY",
      isValidForOpen: false,
      isStale: true,
      ageSec: obsSec && nowSec ? Math.max(0, nowSec - obsSec) : null,
      maxAgeSec,
      priceE8,
      observedAtSec: obsSec,
      sequence,
      detail: "Market is in Emergency settlement mode. Opening new positions is permanently disabled.",
    };
  }

  if (priceE8 === null || priceE8 <= 0n || obsSec === null || obsSec <= 0) {
    return {
      status: "NO_PRICE",
      isValidForOpen: false,
      isStale: false,
      ageSec: null,
      maxAgeSec,
      priceE8: null,
      observedAtSec: obsSec,
      sequence,
      detail: "No synthetic Testnet tick published yet on-chain.",
    };
  }

  if (nowSec === null) {
    return {
      status: "FRESH",
      isValidForOpen: true,
      isStale: false,
      ageSec: null,
      maxAgeSec,
      priceE8,
      observedAtSec: obsSec,
      sequence,
      detail: "On-chain reference tick loaded.",
    };
  }

  if (obsSec > nowSec + maxDriftSec) {
    return {
      status: "FUTURE_DRIFT",
      isValidForOpen: false,
      isStale: true,
      ageSec: obsSec - nowSec,
      maxAgeSec,
      priceE8,
      observedAtSec: obsSec,
      sequence,
      detail: `Oracle timestamp exceeds ${maxDriftSec}s clock-drift guard.`,
    };
  }

  const ageSec = Math.max(0, nowSec - obsSec);
  const isStale = ageSec > maxAgeSec;
  return {
    status: isStale ? "STALE" : "FRESH",
    isValidForOpen: !isStale && market.mode === "Normal" && !market.paused_for_insolvency,
    isStale,
    ageSec,
    maxAgeSec,
    priceE8,
    observedAtSec: obsSec,
    sequence,
    detail: isStale
      ? `STALE: latest synthetic tick is ${ageSec}s old (exceeds ${maxAgeSec}s policy limit). Operator tick renewal required before new opens; existing positions can still close.`
      : `Valid synthetic tick (${ageSec}s old · within ${maxAgeSec}s execution policy).`,
  };
}

export interface OrderPreviewResult {
  valid: boolean;
  blockingReason: string | null;
  sizeE8: bigint;
  collateralE8: bigint;
  indexPriceE8: bigint;
  execPriceE8: bigint;
  notionalFloorE8: bigint;
  notionalCeilE8: bigint;
  requiredInitialMarginE8: bigint;
  estimatedFeeE8: bigint;
  totalFreeCollateralNeededE8: bigint;
  effectiveLeverageX100: bigint | null;
  postOpenUtilizationBps: bigint | null;
  lpMtmEquityE8: bigint;
  indicativeLiqPriceE8: bigint | null;
}

export function buildAndValidateOrderPreview(params: {
  market: MarketView | null;
  lpSnapshot: LpSnapshotView | null;
  oracleStatus: PerpsOracleStatus;
  pausedGlobal: boolean;
  isNearConnected: boolean;
  unsupportedNearNetwork: boolean;
  isAccountRegistered: boolean;
  accountActionLocked: boolean;
  freeCollateralE8: bigint;
  side: StoredPositionSide;
  sizeInput: string;
  marginUsdcInput: string;
}): OrderPreviewResult {
  const zeroResult = (blockingReason: string | null): OrderPreviewResult => ({
    valid: false,
    blockingReason,
    sizeE8: 0n,
    collateralE8: 0n,
    indexPriceE8: params.oracleStatus.priceE8 ?? 0n,
    execPriceE8: 0n,
    notionalFloorE8: 0n,
    notionalCeilE8: 0n,
    requiredInitialMarginE8: 0n,
    estimatedFeeE8: 0n,
    totalFreeCollateralNeededE8: 0n,
    effectiveLeverageX100: null,
    postOpenUtilizationBps: null,
    lpMtmEquityE8: parseSignedBigInt(params.lpSnapshot?.lp_mtm_equity_e8) ?? 0n,
    indicativeLiqPriceE8: null,
  });

  const market = params.market;
  const lpMtmEquityE8 = parseSignedBigInt(params.lpSnapshot?.lp_mtm_equity_e8) ?? 0n;
  const parsedSizeE8 = parseDecimalToFixedBigInt(params.sizeInput, 8);
  const parsedMarginUnits = parseDecimalToFixedBigInt(params.marginUsdcInput, 6);
  const sizeE8 = parsedSizeE8 ?? 0n;
  const marginUnits = parsedMarginUnits ?? 0n;
  const collateralE8 = usdcUnitsToUsdE8(marginUnits);
  const indexPriceE8 = params.oracleStatus.priceE8 ?? 0n;

  if (!market || indexPriceE8 <= 0n) {
    return zeroResult("Arabica market price unavailable from NEAR Testnet RPC.");
  }

  const execPriceE8 = computeExecPriceE8(indexPriceE8, params.side === "Long", market.exec_spread_bps);
  const notionalFloorE8 = computeNotionalFloorE8(execPriceE8, sizeE8);
  const notionalCeilE8 = computeNotionalCeilE8(execPriceE8, sizeE8);
  const requiredInitialMarginE8 = computeInitialMarginE8(
    notionalCeilE8,
    market.risk.initial_margin_bps,
  );
  const estimatedFeeE8 = computeTradeFeeE8(notionalCeilE8, market.risk.trade_fee_bps);
  const totalFreeCollateralNeededE8 = collateralE8 + estimatedFeeE8;
  const effectiveLeverageX100 = computeEffectiveLeverageX100(notionalFloorE8, collateralE8);

  const longOi = parseUnsignedBigInt(market.long_oi_e8) ?? 0n;
  const shortOi = parseUnsignedBigInt(market.short_oi_e8) ?? 0n;
  const reservedBeforeMarket = computeReservedLiquidityE8(
    longOi,
    shortOi,
    market.risk.matched_gap_buffer_bps,
  );
  const newLongOi = params.side === "Long" ? longOi + notionalFloorE8 : longOi;
  const newShortOi = params.side === "Short" ? shortOi + notionalFloorE8 : shortOi;
  const reservedAfterMarket = computeReservedLiquidityE8(
    newLongOi,
    newShortOi,
    market.risk.matched_gap_buffer_bps,
  );
  const currentTotalReserved = parseUnsignedBigInt(params.lpSnapshot?.reserved_liquidity_e8 ?? "0") ?? 0n;
  const totalReservedAfter =
    currentTotalReserved >= reservedBeforeMarket
      ? currentTotalReserved - reservedBeforeMarket + reservedAfterMarket
      : reservedAfterMarket;
  const postOpenUtilizationBps = computeUtilizationBps(totalReservedAfter, lpMtmEquityE8);
  const indicativeLiqPriceE8 = computeIndicativeLiquidationPriceE8(
    params.side,
    sizeE8,
    execPriceE8,
    collateralE8,
    0n,
    market.risk.maintenance_margin_bps,
  );

  let blockingReason: string | null = null;
  if (!params.isNearConnected) {
    blockingReason = "Connect a NEAR Testnet wallet to prepare an order.";
  } else if (params.unsupportedNearNetwork) {
    blockingReason = "Connected NEAR wallet is not on Testnet (.testnet required).";
  } else if (!params.isAccountRegistered) {
    blockingReason = `Register trader account on ${PERPS_CONTRACT_ID} first (0.05 NEAR).`;
  } else if (params.accountActionLocked) {
    blockingReason = "Account has a pending async action lock on-chain.";
  } else if (params.pausedGlobal) {
    blockingReason = "Protocol is currently paused on-chain.";
  } else if (market.paused_for_insolvency || market.mode !== "Normal") {
    blockingReason = `Market mode is ${market.mode}; new position openings are disabled.`;
  } else if (!params.oracleStatus.isValidForOpen) {
    blockingReason = params.oracleStatus.detail;
  } else if (params.sizeInput.trim().length > 0 && parsedSizeE8 === null) {
    blockingReason = "Invalid coffee size: enter a positive decimal with at most 8 decimal places (kg).";
  } else if (sizeE8 <= 0n) {
    blockingReason = "Enter a positive coffee contract size in kg (up to 8 decimals).";
  } else if (params.marginUsdcInput.trim().length > 0 && parsedMarginUnits === null) {
    blockingReason = "Invalid USDC margin: enter a positive decimal with at most 6 decimal places.";
  } else if (collateralE8 <= 0n) {
    blockingReason = "Enter positive USDC margin collateral (up to 6 decimals).";
  } else if (collateralE8 < requiredInitialMarginE8) {
    blockingReason = `Insufficient margin: requires at least ${formatUsdE8(requiredInitialMarginE8)} (${formatBpsAsPercent(market.risk.initial_margin_bps)} IM, max ${market.risk.max_leverage}x).`;
  } else if (effectiveLeverageX100 !== null && effectiveLeverageX100 > BigInt(market.risk.max_leverage) * 100n) {
    blockingReason = `Effective leverage ${formatLeverageX100(effectiveLeverageX100)} exceeds ${market.risk.max_leverage}.00x limit.`;
  } else if (totalFreeCollateralNeededE8 > params.freeCollateralE8) {
    blockingReason = `Insufficient free margin in contract: need ${formatUsdE8(totalFreeCollateralNeededE8)} (margin + fee), available ${formatUsdE8(params.freeCollateralE8)}.`;
  } else if (lpMtmEquityE8 <= 0n) {
    blockingReason = "LP Vault has zero MTM liquidity; new positions cannot be opened until LP capital is seeded.";
  } else if (
    postOpenUtilizationBps > BigInt(market.risk.max_utilization_bps) &&
    reservedAfterMarket > reservedBeforeMarket
  ) {
    blockingReason = `Insufficient LP capacity: post-trade utilization ${formatBpsAsPercent(postOpenUtilizationBps)} exceeds ${formatBpsAsPercent(market.risk.max_utilization_bps)} cap.`;
  }

  return {
    valid: blockingReason === null,
    blockingReason,
    sizeE8,
    collateralE8,
    indexPriceE8,
    execPriceE8,
    notionalFloorE8,
    notionalCeilE8,
    requiredInitialMarginE8,
    estimatedFeeE8,
    totalFreeCollateralNeededE8,
    effectiveLeverageX100,
    postOpenUtilizationBps,
    lpMtmEquityE8,
    indicativeLiqPriceE8,
  };
}

export function buildTraderCollateralDepositArgs(
  unitsBase: bigint,
  receiverId: string = PERPS_CONTRACT_ID,
) {
  return {
    receiver_id: receiverId,
    amount: unitsBase.toString(),
    memo: null,
    msg: JSON.stringify({ action: "trader_collateral" }),
  };
}

export function buildLpDepositArgs(
  unitsBase: bigint,
  receiverId: string = PERPS_CONTRACT_ID,
) {
  return {
    receiver_id: receiverId,
    amount: unitsBase.toString(),
    memo: null,
    msg: JSON.stringify({ action: "lp_deposit" }),
  };
}
