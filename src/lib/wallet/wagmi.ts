// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import {
  createConfig,
  createStorage,
  http,
  injected,
  type Config,
  type CreateConnectorFn,
} from "wagmi";
import { arbitrumSepolia, baseSepolia, hyperliquidEvmTestnet, sepolia } from "wagmi/chains";
import { HYPEREVM_TESTNET_RPC_URL } from "./config";

/**
 * SSR-safe Web Storage wrapper immune to Node 26 environments lacking `--localstorage-file`.
 */
function getSafeBrowserStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const ls = window.localStorage;
    if (
      ls &&
      typeof ls.getItem === "function" &&
      typeof ls.setItem === "function" &&
      typeof ls.removeItem === "function"
    ) {
      return ls;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export const ROASTAKE_EVM_CHAINS = [
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  hyperliquidEvmTestnet,
] as const;

export function createRoastakeWagmiConfig(extraConnectors?: readonly CreateConnectorFn[]): Config {
  return createConfig({
    chains: ROASTAKE_EVM_CHAINS,
    connectors: [injected(), ...(extraConnectors ?? [])],
    transports: {
      [sepolia.id]: http(),
      [baseSepolia.id]: http(),
      [arbitrumSepolia.id]: http(),
      [hyperliquidEvmTestnet.id]: http(HYPEREVM_TESTNET_RPC_URL),
    },
    ssr: true,
    storage: createStorage({
      storage: getSafeBrowserStorage(),
      key: "roastake-wallet-wagmi",
    }),
  });
}

let cachedSsrOrBaseConfig: Config | null = null;

export function getRoastakeWagmiConfig(): Config {
  if (!cachedSsrOrBaseConfig) {
    cachedSsrOrBaseConfig = createRoastakeWagmiConfig();
  }
  return cachedSsrOrBaseConfig;
}

/**
 * Lazily load WalletConnect connector ONLY in browser environments when the public
 * `VITE_WALLETCONNECT_PROJECT_ID` is explicitly configured (avoids SSR polyfill bloat).
 */
export async function createRoastakeClientWagmiConfigWithWalletConnect(
  projectId: string,
): Promise<Config> {
  const { walletConnect } = await import("wagmi/connectors");
  const wcConnector = walletConnect({
    projectId,
    showQrModal: true,
    metadata: {
      name: "ROASTAKE",
      description: "Specialty Coffee × Decentralized Finance (NEAR-First Testnet MVP)",
      url: typeof window !== "undefined" ? window.location.origin : "https://roastake.testnet",
      icons: [],
    },
  });
  return createRoastakeWagmiConfig([wcConnector]);
}
