// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { isAddress } from "@solana/kit";
import { StandardConnect, StandardDisconnect } from "@wallet-standard/features";
import { getWalletFeature, type UiWallet, type UiWalletAccount } from "@wallet-standard/react";
import type { SolanaDiscoveredWallet } from "./types";

export const SOLANA_DEVNET_CHAIN = "solana:devnet" as const;

export function isSolanaWallet(wallet: Pick<UiWallet, "chains">): boolean {
  return wallet.chains.some((c) => c.startsWith("solana:"));
}

export function walletSupportsSolanaDevnet(chains: readonly string[]): {
  valid: boolean;
  reason?: string;
} {
  const solChains = chains.filter((c) => c.startsWith("solana:"));
  if (solChains.length === 0) {
    return { valid: false, reason: "Wallet does not declare any Solana chain support." };
  }
  if (solChains.includes(SOLANA_DEVNET_CHAIN)) {
    return { valid: true };
  }
  return {
    valid: false,
    reason: `Wallet declares ${solChains.join(", ")} without ${SOLANA_DEVNET_CHAIN}. Switch your Solana wallet cluster to Devnet.`,
  };
}

export function validateSolanaDevnetAccount(
  account: Pick<UiWalletAccount, "address" | "chains">,
  walletChains: readonly string[],
): {
  validAddress: boolean;
  supportsDevnet: boolean;
  reason?: string;
} {
  const validAddress = isAddress(account.address);
  const candidateChains = account.chains.length > 0 ? account.chains : walletChains;
  const clusterCheck = walletSupportsSolanaDevnet(candidateChains);
  return {
    validAddress,
    supportsDevnet: clusterCheck.valid,
    reason: !validAddress
      ? "Solana wallet returned an invalid base58 public key."
      : clusterCheck.reason,
  };
}

export function mapSolanaDiscoveredWallets(wallets: readonly UiWallet[]): SolanaDiscoveredWallet[] {
  return wallets.filter(isSolanaWallet).map((w) => ({
    name: w.name,
    icon: w.icon,
    chains: w.chains,
    supportsDevnet: walletSupportsSolanaDevnet(w.chains).valid,
    supportsDisconnect: w.features.includes(StandardDisconnect),
  }));
}

export async function connectSolanaUiWallet(wallet: UiWallet): Promise<{
  account: UiWalletAccount;
  providerName: string;
  supportsDevnet: boolean;
  unsupportedReason?: string;
  canDisconnectViaProvider: boolean;
}> {
  if (!wallet.features.includes(StandardConnect)) {
    throw new Error(`${wallet.name} does not implement Wallet Standard connect.`);
  }

  const connectFeature = getWalletFeature(wallet, StandardConnect) as {
    connect: (input?: { silent?: boolean }) => Promise<{ accounts: readonly UiWalletAccount[] }>;
  };

  const result = await connectFeature.connect();
  const account = result.accounts[0] ?? wallet.accounts[0];
  if (!account) {
    throw new Error(`${wallet.name} returned no authorized Solana account.`);
  }

  const check = validateSolanaDevnetAccount(account, wallet.chains);
  if (!check.validAddress) {
    throw new Error(check.reason ?? "Invalid Solana address returned by wallet.");
  }

  return {
    account,
    providerName: wallet.name,
    supportsDevnet: check.supportsDevnet,
    unsupportedReason: check.reason,
    canDisconnectViaProvider: wallet.features.includes(StandardDisconnect),
  };
}

export async function disconnectSolanaUiWallet(wallet: UiWallet | undefined): Promise<void> {
  if (!wallet || !wallet.features.includes(StandardDisconnect)) {
    return;
  }
  const disconnectFeature = getWalletFeature(wallet, StandardDisconnect) as {
    disconnect: () => Promise<void>;
  };
  await disconnectFeature.disconnect();
}
