// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { z } from "zod";
import { HYPERLIQUID_TESTNET_API_URL } from "./config";
import type { HyperliquidAccountSummary } from "./types";

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const DEFAULT_TIMEOUT_MS = 8_000;

const ClearinghouseStateSchema = z.object({
  marginSummary: z
    .object({
      accountValue: z.string(),
      totalMarginUsed: z.string(),
    })
    .optional(),
  crossMarginSummary: z
    .object({
      accountValue: z.string(),
      totalMarginUsed: z.string(),
    })
    .optional(),
  withdrawable: z.string().optional(),
  assetPositions: z.array(z.unknown()).optional(),
});

const SpotClearinghouseStateSchema = z.object({
  balances: z.array(z.unknown()).optional(),
});

export function isValidEvmAddress(address: string | null | undefined): address is `0x${string}` {
  return typeof address === "string" && EVM_ADDRESS_REGEX.test(address.trim());
}

export function assertHyperliquidTestnetUrl(baseUrl: string): string {
  const parsed = new URL(baseUrl);
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname.toLowerCase() !== "api.hyperliquid-testnet.xyz"
  ) {
    throw new Error(
      `Testnet-only policy violation: "${baseUrl}" is not the official Hyperliquid Testnet Core API.`,
    );
  }
  return `${parsed.origin}/info`;
}

async function postHyperliquidInfo(
  payload: Record<string, unknown>,
  fetchFn: typeof fetch,
  timeoutMs: number,
  endpointUrl: string,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const runFetch = fetchFn;

  try {
    const response = await runFetch(endpointUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Hyperliquid Testnet API HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Safely query read-only Hyperliquid Testnet Core state (`/info`) for an associated EVM address.
 * Never requests trading permissions, agent approval, or transaction signatures.
 */
export async function fetchHyperliquidTestnetSummary(
  address: string,
  opts?: { fetchFn?: typeof fetch; timeoutMs?: number; baseUrl?: string; nowMs?: number },
): Promise<HyperliquidAccountSummary> {
  if (!isValidEvmAddress(address)) {
    throw new Error("A valid connected EVM 0x address is required for Hyperliquid Core lookup.");
  }

  const infoUrl = assertHyperliquidTestnetUrl(opts?.baseUrl ?? HYPERLIQUID_TESTNET_API_URL);
  const fetchFn = opts?.fetchFn ?? globalThis.fetch;
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const [perpRaw, spotRaw] = await Promise.all([
    postHyperliquidInfo({ type: "clearinghouseState", user: address }, fetchFn, timeoutMs, infoUrl),
    postHyperliquidInfo(
      { type: "spotClearinghouseState", user: address },
      fetchFn,
      timeoutMs,
      infoUrl,
    ).catch(() => null),
  ]);

  const parsedPerp = ClearinghouseStateSchema.safeParse(perpRaw);
  if (!parsedPerp.success) {
    throw new Error("Unexpected response schema from Hyperliquid Testnet Core API.");
  }

  const parsedSpot = spotRaw ? SpotClearinghouseStateSchema.safeParse(spotRaw) : null;
  const marginSummary = parsedPerp.data.marginSummary ?? parsedPerp.data.crossMarginSummary;

  return {
    accountValueUsd: marginSummary?.accountValue ?? "0.0",
    withdrawableUsd: parsedPerp.data.withdrawable ?? "0.0",
    totalMarginUsedUsd: marginSummary?.totalMarginUsed ?? "0.0",
    openPositionCount: parsedPerp.data.assetPositions?.length ?? 0,
    spotBalanceCount: parsedSpot?.success ? (parsedSpot.data.balances?.length ?? 0) : 0,
    fetchedAtMs: opts?.nowMs ?? Date.now(),
  };
}
