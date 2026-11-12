// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CIRCLE_TESTNET_USDC_ID,
  MARKET_ARABICA_PERPS_ID,
  PERPS_CONTRACT_ID,
  PERPS_POLL_INTERVAL_MS,
} from "./config";
import * as marketHistory from "./market-history";
import { PERPS_HISTORY_POLL_INTERVAL_MS } from "./market-history-api";
import type { PerpsMarketHistorySnapshot } from "./market-history-types";
import { fetchPerpsProtocolSnapshot, fetchPerpsTraderSnapshot } from "./rpc";
import type { PerpsProtocolSnapshot, PerpsTraderSnapshot } from "./types";

export const perpsProtocolQueryKey = [
  "roastake",
  "perps",
  "testnet",
  PERPS_CONTRACT_ID,
  CIRCLE_TESTNET_USDC_ID,
] as const;

export function perpsMarketHistoryQueryKeyFor(marketId: string = MARKET_ARABICA_PERPS_ID) {
  return [
    "roastake",
    "perps",
    "testnet",
    PERPS_CONTRACT_ID,
    marketId,
    "verified-history",
  ] as const;
}

export const perpsMarketHistoryQueryKey = perpsMarketHistoryQueryKeyFor(MARKET_ARABICA_PERPS_ID);

export function perpsTraderQueryKey(accountId: string | null | undefined) {
  return [
    "roastake",
    "perps",
    "testnet",
    PERPS_CONTRACT_ID,
    "trader",
    accountId ?? "none",
  ] as const;
}

export function usePerpsProtocolSnapshot(options?: {
  enabled?: boolean;
  refetchIntervalMs?: number;
}) {
  return useQuery<PerpsProtocolSnapshot, Error>({
    queryKey: perpsProtocolQueryKey,
    queryFn: () => fetchPerpsProtocolSnapshot(),
    enabled: options?.enabled ?? true,
    staleTime: 10_000,
    refetchInterval: options?.refetchIntervalMs ?? PERPS_POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export function usePerpsTraderSnapshot(
  accountId: string | null | undefined,
  options?: {
    enabled?: boolean;
    refetchIntervalMs?: number;
  },
) {
  const validAccount =
    typeof accountId === "string" && accountId.trim().length > 0 ? accountId.trim() : null;
  return useQuery<PerpsTraderSnapshot, Error>({
    queryKey: perpsTraderQueryKey(validAccount),
    queryFn: () => {
      if (!validAccount) {
        throw new Error("NEAR Testnet account required for trader snapshot.");
      }
      return fetchPerpsTraderSnapshot(validAccount);
    },
    enabled: Boolean(validAccount) && (options?.enabled ?? true),
    staleTime: 8_000,
    refetchInterval: options?.refetchIntervalMs ?? PERPS_POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export function usePerpsMarketHistory(options?: {
  marketId?: string;
  enabled?: boolean;
  maxAgeSec?: number;
  referenceNowSec?: number | null;
  refetchIntervalMs?: number | false;
}) {
  const targetMarketId = options?.marketId ?? MARKET_ARABICA_PERPS_ID;
  return useQuery<PerpsMarketHistorySnapshot, Error>({
    queryKey: perpsMarketHistoryQueryKeyFor(targetMarketId),
    queryFn: () =>
      targetMarketId === MARKET_ARABICA_PERPS_ID
        ? marketHistory.fetchArabicaHistoryWithFallback({
            marketId: targetMarketId,
            maxAgeSec: options?.maxAgeSec,
            referenceNowSec: options?.referenceNowSec,
          })
        : marketHistory.fetchMarketHistoryWithFallback({
            marketId: targetMarketId,
            maxAgeSec: options?.maxAgeSec,
            referenceNowSec: options?.referenceNowSec,
          }),
    enabled: options?.enabled ?? true,
    staleTime: 4_000,
    refetchInterval: options?.refetchIntervalMs ?? PERPS_HISTORY_POLL_INTERVAL_MS,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useRefreshPerpsQueries(accountId?: string | null) {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: perpsProtocolQueryKey }),
      queryClient.invalidateQueries({
        queryKey: ["roastake", "perps", "testnet", PERPS_CONTRACT_ID],
      }),
      accountId
        ? queryClient.invalidateQueries({ queryKey: perpsTraderQueryKey(accountId) })
        : Promise.resolve(),
    ]);
  }, [accountId, queryClient]);
}
