// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { TESTNET_RPC_ENDPOINTS } from "@/lib/oracle/config";
import type {
  NearDiscoveredWallet,
  NearSignedTxOutcome,
  NearTransactionRequest,
} from "./types";

const CIRCLE_USDC_IMPLICIT_TESTNET =
  "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af";

export interface NearConnectedIdentity {
  accountId: string;
  publicKey?: string | null;
  providerId: string;
  providerName: string;
  networkId: "testnet" | "mainnet" | string;
}

export interface NearConnectorListeners {
  onSignIn: (identity: NearConnectedIdentity) => void;
  onSignOut: () => void;
  onWalletsChanged: (wallets: NearDiscoveredWallet[]) => void;
}

export interface NearAdapterPort {
  initialize: (listeners: NearConnectorListeners) => Promise<{
    wallets: NearDiscoveredWallet[];
    existing: NearConnectedIdentity | null;
  }>;
  connect: (walletId?: string) => Promise<NearConnectedIdentity>;
  disconnect: () => Promise<void>;
  signAndSendTransaction?: (request: NearTransactionRequest) => Promise<NearSignedTxOutcome>;
  dispose: () => void;
}

export function isValidNearTestnetAccountId(accountId: string | null | undefined): boolean {
  if (typeof accountId !== "string") return false;
  const trimmed = accountId.trim().toLowerCase();
  if (!trimmed) return false;
  return trimmed.endsWith(".testnet");
}

export function isValidNearTestnetReceiverId(receiverId: string | null | undefined): boolean {
  if (typeof receiverId !== "string") return false;
  const trimmed = receiverId.trim().toLowerCase();
  if (!trimmed || trimmed.endsWith(".near")) return false;
  return trimmed.endsWith(".testnet") || trimmed === CIRCLE_USDC_IMPLICIT_TESTNET;
}

export function extractNearTxHash(outcome: unknown): string | null {
  if (!outcome || typeof outcome !== "object") return null;
  const rec = outcome as Record<string, unknown>;
  const tx = rec.transaction;
  if (tx && typeof tx === "object") {
    const hash = (tx as Record<string, unknown>).hash;
    if (typeof hash === "string" && hash.trim().length > 0) return hash.trim();
  }
  const txOutcome = rec.transaction_outcome;
  if (txOutcome && typeof txOutcome === "object") {
    const id = (txOutcome as Record<string, unknown>).id;
    if (typeof id === "string" && id.trim().length > 0) return id.trim();
  }
  if (typeof rec.hash === "string" && rec.hash.trim().length > 0) return rec.hash.trim();
  if (typeof rec.txHash === "string" && rec.txHash.trim().length > 0) return rec.txHash.trim();
  return null;
}

function mapNearManifestWallets(
  wallets: readonly {
    manifest?: {
      id?: string;
      name?: string;
      icon?: string;
      description?: string;
      features?: { testnet?: boolean };
    };
  }[],
): NearDiscoveredWallet[] {
  return wallets
    .map((w) => ({
      id: w.manifest?.id ?? "unknown-near-wallet",
      name: w.manifest?.name ?? w.manifest?.id ?? "NEAR Wallet",
      icon: w.manifest?.icon,
      description: w.manifest?.description,
      supportsTestnet: Boolean(w.manifest?.features?.testnet),
    }))
    .filter((w, i, arr) => arr.findIndex((x) => x.id === w.id) === i);
}

/**
 * Browser-only HOT Connect adapter (`@hot-labs/near-connect`) strictly locked to `testnet`.
 * Never imported or instantiated during SSR and never requests on-chain access-key `signIn` transactions.
 */
export function createHotNearConnectorAdapter(): NearAdapterPort {
  let connector: import("@hot-labs/near-connect").NearConnector | null = null;
  let cleanupFns: (() => void)[] = [];

  async function ensureConnector() {
    if (typeof window === "undefined") {
      throw new Error("NEAR wallet connection requires a browser environment.");
    }
    if (connector) return connector;
    const { NearConnector } = await import("@hot-labs/near-connect");
    connector = new NearConnector({
      network: "testnet",
      providers: {
        testnet: [...TESTNET_RPC_ENDPOINTS],
      },
      features: {
        testnet: true,
      },
      autoConnect: true,
      footerBranding: {
        heading: "ROASTAKE · NEAR Testnet",
        link: "https://wallet.near.org",
        linkText: "Get a NEAR Testnet wallet",
      },
    });
    return connector;
  }

  return {
    async initialize(listeners) {
      const instance = await ensureConnector();

      const handleSignIn = (payload: {
        wallet?: { manifest?: { id?: string; name?: string } };
        accounts?: { accountId: string; publicKey?: string }[];
      }) => {
        const account = payload.accounts?.[0];
        if (!account?.accountId) return;
        listeners.onSignIn({
          accountId: account.accountId,
          publicKey: account.publicKey ?? null,
          providerId: payload.wallet?.manifest?.id ?? "near-wallet",
          providerName: payload.wallet?.manifest?.name ?? "NEAR Wallet",
          networkId: instance.network,
        });
      };

      const handleSignOut = () => {
        listeners.onSignOut();
      };

      const handleWalletsChanged = () => {
        listeners.onWalletsChanged(mapNearManifestWallets(instance.availableWallets));
      };

      instance.on("wallet:signIn", handleSignIn);
      instance.on("wallet:signOut", handleSignOut);
      instance.on("selector:walletsChanged", handleWalletsChanged);
      instance.on("selector:manifestUpdated", handleWalletsChanged);

      cleanupFns = [
        () => instance.off("wallet:signIn", handleSignIn),
        () => instance.off("wallet:signOut", handleSignOut),
        () => instance.off("selector:walletsChanged", handleWalletsChanged),
        () => instance.off("selector:manifestUpdated", handleWalletsChanged),
      ];

      await instance.whenManifestLoaded.catch(() => undefined);
      const wallets = mapNearManifestWallets(instance.availableWallets);

      let existing: NearConnectedIdentity | null = null;
      try {
        const connected = await instance.getConnectedWallet();
        const account = connected.accounts?.[0];
        if (account?.accountId) {
          existing = {
            accountId: account.accountId,
            publicKey: account.publicKey ?? null,
            providerId: connected.wallet.manifest.id,
            providerName: connected.wallet.manifest.name,
            networkId: instance.network,
          };
        }
      } catch {
        // No existing NEAR session restored; keep disconnected cleanly.
        existing = null;
      }

      return { wallets, existing };
    },

    async connect(walletId) {
      const instance = await ensureConnector();
      // Never pass `addFunctionCallKey`: identity connection must not prompt an on-chain tx.
      const wallet = await instance.connect(walletId ? { walletId } : {});
      const accounts = await wallet.getAccounts({ network: "testnet" });
      const first = accounts?.[0];
      if (!first?.accountId) {
        throw new Error("NEAR wallet did not return a Testnet account ID.");
      }
      return {
        accountId: first.accountId,
        publicKey: first.publicKey ?? null,
        providerId: wallet.manifest.id,
        providerName: wallet.manifest.name,
        networkId: instance.network,
      };
    },

    async disconnect() {
      if (!connector) return;
      await connector.disconnect();
    },

    async signAndSendTransaction(request) {
      const instance = await ensureConnector();
      if (instance.network !== "testnet") {
        throw new Error(
          `Testnet-only policy violation: active NEAR connector network is "${instance.network}".`,
        );
      }
      if (!isValidNearTestnetReceiverId(request.receiverId)) {
        throw new Error(
          `Testnet-only policy violation: target contract "${request.receiverId}" is not an allowed NEAR Testnet receiver.`,
        );
      }
      if (!request.actions.length) {
        throw new Error("Transaction request must include at least one FunctionCall action.");
      }

      const { wallet, accounts } = await instance.getConnectedWallet();
      const connectedAccount = accounts?.[0];
      if (!connectedAccount?.accountId) {
        throw new Error("No NEAR Testnet wallet account connected for signing.");
      }
      if (!isValidNearTestnetAccountId(connectedAccount.accountId)) {
        throw new Error(
          `Connected NEAR account "${connectedAccount.accountId}" is not a valid NEAR Testnet (.testnet) account.`,
        );
      }
      if (request.signerId && request.signerId !== connectedAccount.accountId) {
        throw new Error(
          `Wallet account changed (${connectedAccount.accountId} vs expected ${request.signerId}). Please confirm your active account.`,
        );
      }

      const rawOutcome = await wallet.signAndSendTransaction({
        network: "testnet",
        signerId: connectedAccount.accountId,
        receiverId: request.receiverId,
        actions: request.actions,
      });

      const transactionHash = extractNearTxHash(rawOutcome);
      if (!transactionHash) {
        throw new Error(
          "NEAR wallet returned an outcome without a transaction hash; check NEAR Explorer before retrying.",
        );
      }

      return {
        transactionHash,
        signerId: connectedAccount.accountId,
        receiverId: request.receiverId,
        rawOutcome,
      };
    },

    dispose() {
      for (const fn of cleanupFns) fn();
      cleanupFns = [];
      connector?.removeAllListeners();
    },
  };
}
