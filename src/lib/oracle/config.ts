export const NEAR_TESTNET_NETWORK_ID = "testnet" as const;

export const PRIMARY_TESTNET_RPC_URL = "https://rpc.testnet.near.org";
export const FALLBACK_TESTNET_RPC_URL = "https://rpc.testnet.fastnear.com";

export const APPROVED_TESTNET_RPC_HOSTS = new Set<string>([
  "rpc.testnet.near.org",
  "rpc.testnet.fastnear.com",
]);

export const TESTNET_RPC_ENDPOINTS = [PRIMARY_TESTNET_RPC_URL, FALLBACK_TESTNET_RPC_URL] as const;

export const ORACLE_CONTRACT_ID = "roastake-oracle-v1.testnet";
export const ORACLE_REQUESTER_ID = "roastake-dev-mta.testnet";
export const OUTLAYER_CONTRACT_ID = "outlayer.testnet";

export const MARKET_IMF_ARABICA = "ARABICA-MONTHLY-IMF/USD";
export const MARKET_GESHA_DEMO = "GESHA-DEMO/USD";

export const ORACLE_POLL_INTERVAL_MS = 60_000;
export const ORACLE_RPC_TIMEOUT_MS = 10_000;
export const IMF_MAX_AGE_DEFAULT_SEC = 7_776_000; // 90 days

export const IMF_ATTRIBUTION_TEXT =
  "Source: International Monetary Fund (IMF), Primary Commodity Price System (PCPS), PCOFFOTM — ICO Other Mild Arabicas New York cash monthly average.";

export const TESTNET_EXPLORER_TX_BASE = "https://explorer.testnet.near.org/transactions/";

/**
 * Verifiable historical metadata from the first completed live Testnet execution (Gate D).
 * This is strictly static provenance for the Execution Proof panel and is NEVER used as a fallback
 * for current on-chain prices or future execution cost guarantees.
 */
export const HISTORICAL_PROOF_RECORD = {
  requestId: "17925",
  requestTxHash: "58bW5j54R52UYZcXWUjHHQJjev368jj2ZNTKBpwZgCod",
  requestExplorerUrl: `${TESTNET_EXPLORER_TX_BASE}58bW5j54R52UYZcXWUjHHQJjev368jj2ZNTKBpwZgCod`,
  deployTxHash: "CBdkQcVR2Liocfx9sUTCpv9cHbcMmSmvDWCoZsB479P",
  deployExplorerUrl: `${TESTNET_EXPLORER_TX_BASE}CBdkQcVR2Liocfx9sUTCpv9cHbcMmSmvDWCoZsB479P`,
  contractAccount: ORACLE_CONTRACT_ID,
  signerAccount: ORACLE_REQUESTER_ID,
  outlayerContract: OUTLAYER_CONTRACT_ID,
  workerUrl:
    "https://test.fastfs.io/roastake-dev-mta.testnet/outlayer.testnet/855bc554762aa9b367ac2b3c62a219c250410f3715256e822f8c24e23df100f1.wasm",
  workerSha256: "855bc554762aa9b367ac2b3c62a219c250410f3715256e822f8c24e23df100f1",
  market: MARKET_IMF_ARABICA,
  source: "imf-pcps-pcoffotm",
  dataClass: "PUBLIC_BENCHMARK_MONTHLY",
  observedPeriod: "2026-M10",
  observedAtSec: 1793491199,
  storedAtSec: 1794349463,
  recordedPriceRaw: "738863238",
  decimals: 8,
  unit: "USD/kg",
  executionDurationMs: 814,
  compileDurationMs: 953,
  instructions: "458435",
  executionChargeNear: "0.0011767",
  refundNear: "0.0488233",
  attachedDepositNear: "0.05",
} as const;

export function assertTestnetAccountId(accountId: string, label = "Account ID"): string {
  const trimmed = accountId.trim();
  if (!trimmed || !trimmed.endsWith(".testnet") || trimmed.endsWith(".near")) {
    throw new Error(
      `Testnet-only policy violation: ${label} "${accountId}" is not a NEAR Testnet (.testnet) account.`,
    );
  }
  return trimmed;
}

export function assertTestnetRpcUrl(rpcUrl: string): string {
  const trimmed = rpcUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid NEAR Testnet RPC URL: "${rpcUrl}".`);
  }

  const host = parsed.hostname.toLowerCase();
  if (parsed.protocol !== "https:") {
    throw new Error(`Testnet-only policy violation: RPC URL "${rpcUrl}" must use HTTPS.`);
  }
  if (parsed.username !== "" || parsed.password !== "") {
    throw new Error(
      `Testnet-only policy violation: RPC URL "${rpcUrl}" must not embed credentials.`,
    );
  }
  if (parsed.port !== "") {
    throw new Error(
      `Testnet-only policy violation: RPC URL "${rpcUrl}" must not specify a custom port.`,
    );
  }

  // Also reject explicit default port syntax (e.g. `:443`) stripped during WHATWG URL normalization.
  const authority = trimmed.slice("https://".length).split(/[/?#]/)[0]?.toLowerCase() ?? "";
  if (authority !== host) {
    throw new Error(
      `Testnet-only policy violation: RPC URL "${rpcUrl}" contains unexpected authority metadata.`,
    );
  }

  if (parsed.pathname !== "/" || parsed.search !== "" || parsed.hash !== "") {
    throw new Error(
      `Testnet-only policy violation: RPC URL "${rpcUrl}" must target the root JSON-RPC endpoint.`,
    );
  }

  if (host.includes("mainnet") || !APPROVED_TESTNET_RPC_HOSTS.has(host)) {
    throw new Error(
      `Testnet-only policy violation: RPC host "${parsed.hostname}" is not in the approved NEAR Testnet allowlist.`,
    );
  }

  return trimmed;
}
