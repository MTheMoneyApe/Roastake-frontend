// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import type { MarketConfig, PriceObservation } from "./types";

const DIGITS_ONLY = /^\d+$/;
const DEFAULT_CLOCK_DRIFT_SEC = 60;

export type FreshnessStatus =
  "FRESH" | "STALE" | "NO_OBSERVATION" | "SYNTHETIC_FIXTURE" | "FUTURE_DRIFT";

export interface FreshnessEvaluation {
  status: FreshnessStatus;
  label: string;
  detail: string;
  ageSec: number | null;
  maxAgeSec: number | null;
  isStale: boolean;
}

export interface DataClassMeta {
  code: string;
  label: string;
  shortLabel: string;
  badgeTone: "info" | "warn" | "gain" | "loss";
  summary: string;
  isSynthetic: boolean;
  isHistoricalMonthly: boolean;
}

export function parseUnsignedBigInt(value: string | bigint): bigint | null {
  if (typeof value === "bigint") {
    return value >= 0n ? value : null;
  }
  const trimmed = value.trim();
  if (!DIGITS_ONLY.test(trimmed)) {
    return null;
  }
  return BigInt(trimmed);
}

/**
 * Format an unsigned fixed-point integer string (`rawInt` scaled by `10^decimals`)
 * strictly using `BigInt` integer arithmetic — never IEEE-754 floating-point numbers.
 */
export function formatFixedPoint(
  rawInt: string | bigint,
  decimals: number,
  options?: { trimTrailingZeros?: boolean; groupThousands?: boolean; maxFractionDigits?: number },
): string {
  const value = parseUnsignedBigInt(rawInt);
  if (value === null || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    return "Unavailable";
  }

  const groupThousands = options?.groupThousands ?? true;
  const maxFrac = options?.maxFractionDigits ?? decimals;

  if (decimals === 0) {
    const intStr = value.toString();
    return groupThousands ? addThousandsGrouping(intStr) : intStr;
  }

  const base = 10n ** BigInt(decimals);
  const intPart = value / base;
  const remPart = value % base;

  const intFormatted = groupThousands
    ? addThousandsGrouping(intPart.toString())
    : intPart.toString();
  let fracStr = remPart.toString().padStart(decimals, "0");

  if (maxFrac < decimals) {
    fracStr = fracStr.slice(0, Math.max(0, maxFrac));
  }

  if (options?.trimTrailingZeros) {
    fracStr = fracStr.replace(/0+$/, "");
  }

  return fracStr.length > 0 ? `${intFormatted}.${fracStr}` : intFormatted;
}

function addThousandsGrouping(intDigits: string): string {
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Format an 8-decimal contract coffee index price as `$X.XXXXXXXX USD/kg`. */
export function formatUsdPerKg(rawInt: string | bigint, decimals = 8, unit = "USD/kg"): string {
  const formatted = formatFixedPoint(rawInt, decimals, {
    trimTrailingZeros: false,
    groupThousands: true,
  });
  if (formatted === "Unavailable") {
    return "Unavailable";
  }
  return `$${formatted} ${unit}`;
}

/**
 * Format yoctoNEAR (`10^24` base units) strictly via `BigInt` string slicing.
 * Never converts yoctoNEAR to a floating-point `Number`.
 */
export function formatYoctoNear(
  rawYocto: string | bigint,
  options?: { maxDecimals?: number; minDecimals?: number },
): string {
  const value = parseUnsignedBigInt(rawYocto);
  if (value === null) {
    return "Unavailable";
  }

  const maxDecimals = options?.maxDecimals ?? 8;
  const minDecimals = options?.minDecimals ?? 4;

  const full = formatFixedPoint(value, 24, {
    trimTrailingZeros: false,
    groupThousands: true,
    maxFractionDigits: maxDecimals,
  });

  if (full === "Unavailable") {
    return full;
  }

  const [intPart, rawFrac = ""] = full.split(".");
  let frac = rawFrac.replace(/0+$/, "");
  if (frac.length < minDecimals) {
    frac = frac.padEnd(Math.min(minDecimals, maxDecimals), "0");
  }

  return frac.length > 0 ? `${intPart}.${frac} NEAR` : `${intPart} NEAR`;
}

export function formatIntegerCount(value: number | bigint | string): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "Unavailable";
    return addThousandsGrouping(Math.trunc(value).toString());
  }
  const parsed = parseUnsignedBigInt(value);
  return parsed === null ? "Unavailable" : addThousandsGrouping(parsed.toString());
}

export function toIsoUtc(epochSec: number): string | null {
  if (!Number.isFinite(epochSec) || epochSec <= 0) {
    return null;
  }
  const d = new Date(epochSec * 1000);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toISOString();
}

export function formatUtcTimestamp(epochSec: number): string {
  if (!Number.isFinite(epochSec) || epochSec < 0) {
    return "Invalid timestamp";
  }
  if (epochSec === 0) {
    return "0 (no market observation clock)";
  }
  const d = new Date(epochSec * 1000);
  if (Number.isNaN(d.getTime())) {
    return "Invalid timestamp";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`
  );
}

/**
 * Derive an IMF monthly calendar label (`YYYY-Mmm`) only when `observedAtSec` corresponds to
 * the exact final UTC second (`23:59:59Z`) of its UTC calendar month.
 */
export function inferMonthlyPeriodLabel(observedAtSec: number): string | null {
  if (!Number.isFinite(observedAtSec) || observedAtSec <= 0) {
    return null;
  }
  const nextSec = new Date((observedAtSec + 1) * 1000);
  if (
    nextSec.getUTCDate() === 1 &&
    nextSec.getUTCHours() === 0 &&
    nextSec.getUTCMinutes() === 0 &&
    nextSec.getUTCSeconds() === 0
  ) {
    const prev = new Date(observedAtSec * 1000);
    const yr = prev.getUTCFullYear();
    const mo = String(prev.getUTCMonth() + 1).padStart(2, "0");
    return `${yr}-M${mo}`;
  }
  return null;
}

/**
 * Format an integer second duration using `Intl.DurationFormat` when supported by the runtime,
 * falling back cleanly to explicit `days / hr / min / sec` labels on older JS runtimes.
 */
export function formatAgeDuration(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec < 0) {
    return "Unavailable";
  }
  const s = Math.floor(totalSec);
  if (s === 0) {
    return "0 sec";
  }
  const days = Math.floor(s / 86_400);
  const hours = Math.floor((s % 86_400) / 3_600);
  const minutes = Math.floor((s % 3_600) / 60);
  const seconds = s % 60;

  const durationParts: Record<string, number> = {};
  if (days > 0) durationParts.days = days;
  if (hours > 0) durationParts.hours = hours;
  if (days === 0 && minutes > 0) durationParts.minutes = minutes;
  if (days === 0 && hours === 0 && minutes === 0) durationParts.seconds = seconds;

  const intlAny = Intl as unknown as {
    DurationFormat?: new (
      locale: string,
      opts: { style: string },
    ) => { format: (d: Record<string, number>) => string };
  };
  if (typeof intlAny.DurationFormat === "function") {
    try {
      return new intlAny.DurationFormat("en", { style: "short" }).format(durationParts);
    } catch {
      // Fallback cleanly below if host ICU rejects any combination
    }
  }

  const segments: string[] = [];
  if (days > 0) segments.push(`${days} ${days === 1 ? "day" : "days"}`);
  if (hours > 0) segments.push(`${hours} hr`);
  if (days === 0 && minutes > 0) segments.push(`${minutes} min`);
  if (segments.length === 0) segments.push(`${seconds} sec`);
  return segments.join(", ");
}

/**
 * Compute market staleness strictly against `MarketConfig.max_price_age_sec` using the on-chain
 * observation timestamp (`observed_at_sec`), never substituting `stored_at_sec` or RPC poll time.
 */
export function evaluateFreshness(
  observation: PriceObservation | null,
  config: MarketConfig | null,
  nowSec: number,
): FreshnessEvaluation {
  const maxAgeSec = config?.max_price_age_sec ?? null;

  if (!observation) {
    return {
      status: "NO_OBSERVATION",
      label: "No observation yet",
      detail: "Contract holds no price observation for this market.",
      ageSec: null,
      maxAgeSec,
      isStale: false,
    };
  }

  if (observation.observed_at_sec === 0 && observation.data_class === "SYNTHETIC_DEMO") {
    return {
      status: "SYNTHETIC_FIXTURE",
      label: "Synthetic fixture (no market clock)",
      detail: "Demo fixture sets observed_at_sec = 0; never treat as a live market timestamp.",
      ageSec: null,
      maxAgeSec,
      isStale: false,
    };
  }

  if (observation.observed_at_sec > nowSec + DEFAULT_CLOCK_DRIFT_SEC) {
    return {
      status: "FUTURE_DRIFT",
      label: "Timestamp ahead of local clock",
      detail: `Observed at ${formatUtcTimestamp(observation.observed_at_sec)} (> 60s ahead of local clock).`,
      ageSec: 0,
      maxAgeSec,
      isStale: false,
    };
  }

  const ageSec = Math.max(0, nowSec - observation.observed_at_sec);
  if (maxAgeSec !== null && ageSec > maxAgeSec) {
    return {
      status: "STALE",
      label: "Stale beyond policy window",
      detail: `Observation age (${formatAgeDuration(ageSec)}) exceeds contract max age of ${formatAgeDuration(maxAgeSec)}.`,
      ageSec,
      maxAgeSec,
      isStale: true,
    };
  }

  return {
    status: "FRESH",
    label:
      maxAgeSec !== null
        ? `Fresh within ${formatAgeDuration(maxAgeSec)} window`
        : "Timestamp recorded",
    detail:
      maxAgeSec !== null
        ? `Observation age (${formatAgeDuration(ageSec)}) is within the configured ${formatAgeDuration(maxAgeSec)} limit.`
        : `Observation age: ${formatAgeDuration(ageSec)}.`,
    ageSec,
    maxAgeSec,
    isStale: false,
  };
}

export function classifyDataClass(dataClass: string | null | undefined): DataClassMeta {
  switch (dataClass) {
    case "PUBLIC_BENCHMARK_MONTHLY":
      return {
        code: dataClass,
        label: "Historical Monthly Public Benchmark",
        shortLabel: "Monthly Public Benchmark",
        badgeTone: "info",
        summary:
          "Official monthly IMF PCPS benchmark series (PCOFFOTM). Not spot pricing, not ICE Coffee C futures, and not real-time quotes.",
        isSynthetic: false,
        isHistoricalMonthly: true,
      };
    case "SYNTHETIC_DEMO":
      return {
        code: dataClass,
        label: "Synthetic Demo Fixture",
        shortLabel: "Synthetic Demo",
        badgeTone: "warn",
        summary:
          "Deterministic demonstration fixture for pipeline testing only. Carries no monetary or market value.",
        isSynthetic: true,
        isHistoricalMonthly: false,
      };
    case "LIVE_VERIFIED":
      return {
        code: dataClass,
        label: "Single-Source Live Feed",
        shortLabel: "Live Verified",
        badgeTone: "gain",
        summary: "Live feed validated under on-chain contract bounds.",
        isSynthetic: false,
        isHistoricalMonthly: false,
      };
    case "LIVE_AGGREGATED":
      return {
        code: dataClass,
        label: "Multi-Source Aggregated Feed",
        shortLabel: "Live Aggregated",
        badgeTone: "gain",
        summary: "Aggregated multi-source index validated under on-chain contract bounds.",
        isSynthetic: false,
        isHistoricalMonthly: false,
      };
    default:
      return {
        code: dataClass || "UNKNOWN",
        label: dataClass ? `Unclassified (${dataClass})` : "No Data Classification",
        shortLabel: "Unclassified",
        badgeTone: "loss",
        summary: "Market observation classification missing or unrecognized.",
        isSynthetic: false,
        isHistoricalMonthly: false,
      };
  }
}
