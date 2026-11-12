// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { useQuery } from "@tanstack/react-query";
import { ORACLE_CONTRACT_ID, ORACLE_POLL_INTERVAL_MS } from "./config";
import { fetchOracleSnapshot } from "./rpc";
import type { OracleDashboardSnapshot } from "./types";

export const oracleSnapshotQueryKey = (contractId = ORACLE_CONTRACT_ID) =>
  ["roastake", "oracle", "testnet", contractId] as const;

/**
 * Subscribe to the read-only NEAR Testnet Oracle contract state.
 * SSR-safe (TanStack Start fetches on client mount by default unless prefetched) and
 * never returns fabricated prices when NEAR RPC requests fail.
 */
export function useOracleSnapshot(contractId = ORACLE_CONTRACT_ID) {
  return useQuery<OracleDashboardSnapshot, Error>({
    queryKey: oracleSnapshotQueryKey(contractId),
    queryFn: () => fetchOracleSnapshot({ contractId }),
    refetchInterval: ORACLE_POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    retry: 1,
  });
}
