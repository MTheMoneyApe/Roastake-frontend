// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { createContext, useContext } from "react";
import type { WalletHubContextValue } from "./types";

export const WalletHubContext = createContext<WalletHubContextValue | null>(null);

export function useWalletHub(): WalletHubContextValue {
  const ctx = useContext(WalletHubContext);
  if (!ctx) {
    throw new Error("useWalletHub must be used within WalletInfrastructureProvider.");
  }
  return ctx;
}
