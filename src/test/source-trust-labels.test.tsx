// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OracleOverviewCard, OraclePage } from "@/components/coffee/oracle";
import { PerpsLiveMarketView, ThreeMarketPerpsIndex } from "@/components/perps/live-perps";
import { PerpsMarketChart } from "@/components/perps/market-chart";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DegenModeProvider } from "@/hooks/useDegenMode";
import { MARKET_GESHA_DEMO, MARKET_IMF_ARABICA } from "@/lib/oracle/config";
import { MARKET_ARABICA_PERPS_ID, PERPS_CONTRACT_ID } from "@/lib/perps/config";

const mocks = vi.hoisted(() => ({
  oracle: vi.fn(),
  protocol: vi.fn(),
  history: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
vi.mock("@/components/shell", () => ({ useHydrated: () => true }));
vi.mock("@/lib/oracle/queries", () => ({ useOracleSnapshot: mocks.oracle }));
vi.mock("@/lib/perps/queries", () => ({
  usePerpsProtocolSnapshot: mocks.protocol,
  usePerpsTraderSnapshot: () => ({ data: undefined, isLoading: false }),
  usePerpsMarketHistory: mocks.history,
  useRefreshPerpsQueries: () => vi.fn(),
}));
vi.mock("@/lib/wallet/context", () => ({
  useWalletHub: () => ({
    near: { status: "disconnected", accountId: null, unsupportedNetwork: false },
    openHub: vi.fn(),
    sendNearTransaction: vi.fn(),
  }),
}));
vi.mock("@/components/perps/judges-walkthrough", () => ({ JudgesWalkthrough: () => null }));
vi.mock("@/components/perps/margin-panel", () => ({ PerpsMarginPanel: () => null }));
vi.mock("@/components/perps/operator-controls", () => ({ TestnetOperatorControls: () => null }));
vi.mock("@/components/perps/positions-panel", () => ({ LivePositionsPanel: () => null }));
vi.mock("@/components/perps/tx-status-panel", () => ({ TxStatusPanel: () => null }));

const nowSec = 1_794_350_050;
const market = {
  market_id: MARKET_ARABICA_PERPS_ID,
  unit: "USD/kg",
  mode: "Normal" as const,
  paused_for_insolvency: false,
  feed_classification: "TESTNET_SANDBOX_FEED",
  is_synthetic_testnet_sandbox: true,
  sandbox_operator: "operator.testnet",
  sandbox_min_price_e8: "100000000",
  sandbox_max_price_e8: "10000000000",
  sandbox_sequence: 2,
  long_oi_e8: "0",
  short_oi_e8: "0",
  long_size_e8: "0",
  short_size_e8: "0",
  open_positions: 0,
  cum_funding_index_e12: "0",
  last_funding_sec: nowSec,
  last_valid_price_e8: "1000000000",
  last_valid_observed_sec: nowSec - 50,
  frozen_settlement_price_e8: null,
  frozen_funding_index_e12: null,
  risk: {
    max_leverage: 5,
    initial_margin_bps: 2000,
    maintenance_margin_bps: 800,
    trade_fee_bps: 10,
    liq_keeper_fee_bps: 50,
    liq_insurance_fee_bps: 50,
    max_utilization_bps: 7500,
    matched_gap_buffer_bps: 2500,
    max_hourly_funding_rate_e12: "500000000",
    max_pnl_bps: 10000,
  },
  oracle_policy: {
    allow_testnet_sandbox: true,
    max_execution_age_sec: 300,
    emergency_close_age_sec: 3600,
    max_jump_bps: 500,
    max_clock_drift_sec: 60,
  },
  exec_spread_bps: 0,
};

function protocolSnapshot() {
  return {
    network: "testnet",
    contractId: PERPS_CONTRACT_ID,
    markets: [MARKET_ARABICA_PERPS_ID],
    arabicaMarket: market,
    blockTimestampSec: nowSec,
    blockHash: "finalized-block",
    rpcEndpoint: "https://rpc.testnet.near.org",
    pausedGlobal: false,
    solvencyInvariant: true,
    accounting: { total_open_positions: 0, insurance_fund_e8: "0" },
    lpSnapshot: {
      reserved_liquidity_e8: "0",
      lp_mtm_equity_e8: "100000000000",
      lp_locked_seed_shares: "10000",
      lp_vault_realized_equity_e8: "100000000000",
      lp_available_liquidity_e8: "100000000000",
      net_bounded_trader_claim_e8: "0",
      total_unrealized_bad_debt_e8: "0",
    },
  };
}

function oracleSnapshot(dataClass = "PUBLIC_BENCHMARK_MONTHLY", source = "imf-pcps-pcoffotm") {
  return {
    fetchedAtMs: nowSec * 1000,
    marketStates: {
      [MARKET_IMF_ARABICA]: {
        config: { max_price_age_sec: 7_776_000 },
        observation: {
          price: "738863238",
          decimals: 8,
          unit: "USD/kg",
          data_class: dataClass,
          source,
          observed_at_sec: nowSec - 100,
          stored_at_sec: nowSec - 50,
        },
      },
      [MARKET_GESHA_DEMO]: {
        config: { worker_mode: "fixture", max_price_age_sec: 3600 },
        observation: null,
      },
    },
    solvencyInvariant: true,
    accounting: {
      invariant_holds: true,
      pending_request_count: 0,
      open_request_slots: 0,
      max_open_requests: 10,
    },
    nextNonce: 3,
  };
}

function renderUi(ui: ReactNode) {
  return render(<DegenModeProvider><TooltipProvider>{ui}</TooltipProvider></DegenModeProvider>);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(nowSec * 1000);
  mocks.oracle.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  });
  mocks.protocol.mockReturnValue({ data: undefined, isLoading: false, refetch: vi.fn() });
  mocks.history.mockReturnValue({
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("source-trust disclosures", () => {
  it("labels the Perps introduction as synthetic and non-monetary before RPC data is available", () => {
    renderUi(<ThreeMarketPerpsIndex />);
    const intro = screen.getByText(/Three coffee perpetual markets on NEAR Testnet/ );
    expect(intro).toHaveTextContent(/execution prices are synthetic test references/i);
    expect(intro).toHaveTextContent(/not live coffee quotations/i);
    expect(screen.getByText(/Testnet USDC has no monetary value/i)).toBeInTheDocument();
  });

  it("keeps source and collateral warnings beside the terminal price and order form", () => {
    mocks.protocol.mockReturnValue({
      data: protocolSnapshot(),
      isLoading: false,
      refetch: vi.fn(),
    });
    renderUi(<PerpsLiveMarketView />);
    const priceCard = screen.getByText("Synthetic Index Price").closest(".brand-surface");
    expect(priceCard).toHaveTextContent(/operator-controlled/i);
    expect(priceCard).toHaveTextContent(/not live coffee quotes/i);
    const orderPanel = screen.getByText("Open Position Order").closest("section");
    expect(orderPanel).not.toBeNull();
    expect(
      within(orderPanel!).getByText(/operator-controlled synthetic testnet references/i),
    ).toHaveTextContent(/testnet usdc has no monetary value/i);
    expect(
      screen.getByRole("button", { name: /Connect NEAR Testnet Wallet to Trade/i }),
    ).toBeEnabled();
  });

  it.each(["loading", "error"])("keeps the chart provenance visible in its %s state", (state) => {
    mocks.history.mockReturnValue({
      data: undefined,
      isLoading: state === "loading",
      isError: state === "error",
      refetch: vi.fn(),
    });
    renderUi(<PerpsMarketChart market={market} blockTimestampSec={nowSec} />);
    const disclosure = screen.getByText(/operator-controlled synthetic testnet references/i);
    expect(disclosure).toHaveTextContent(/not live coffee quotes/i);
    expect(disclosure).toHaveTextContent(/testnet usdc has no monetary value/i);
    expect(disclosure).toHaveTextContent(/receipt verification does not verify market prices/i);
  });

  it("shows the observation's actual class and source instead of inferring IMF provenance from the market ID", () => {
    mocks.oracle.mockReturnValue({
      data: oracleSnapshot("SYNTHETIC_DEMO", "fixture-source"),
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderUi(<OracleOverviewCard />);
    expect(screen.getByText("fixture-source")).toBeInTheDocument();
    expect(screen.queryByText(/fixture-source \(IMF PCPS\)/)).not.toBeInTheDocument();
    expect(screen.queryByText("Monthly Public Benchmark")).not.toBeInTheDocument();
    expect(screen.getByText("SYNTHETIC_DEMO")).toBeInTheDocument();
    expect(screen.getAllByText(/fresh within policy/i)).toHaveLength(1);
    expect(screen.getByText(/not live coffee quotes/i)).toBeInTheDocument();
    expect(screen.getByText(/independent from perps/i)).toBeInTheDocument();
    expect(screen.getAllByText(/UTC/).length).toBeGreaterThan(0);
  });

  it("shows stale benchmark status and never replaces the observation clock with the query time", () => {
    const snapshot = oracleSnapshot();
    snapshot.marketStates[MARKET_IMF_ARABICA].config.max_price_age_sec = 60;
    mocks.oracle.mockReturnValue({
      data: snapshot,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderUi(<OracleOverviewCard />);
    expect(screen.getByText("Stale")).toBeInTheDocument();
    expect(screen.getByText(/exceeds contract max age/i)).toBeInTheDocument();
    const times = [...document.querySelectorAll("time")].map((element) => element.dateTime);
    expect(times).toContain(new Date((nowSec - 100) * 1000).toISOString());
    expect(times).not.toContain(new Date(nowSec * 1000).toISOString());
  });

  it("never treats a synthetic fixture's zero timestamp as a fresh market clock", () => {
    const snapshot = oracleSnapshot("SYNTHETIC_DEMO", "fixture-source");
    snapshot.marketStates[MARKET_IMF_ARABICA].observation.observed_at_sec = 0;
    mocks.oracle.mockReturnValue({
      data: snapshot,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderUi(<OracleOverviewCard />);
    expect(screen.getByText("Synthetic clock (0)")).toBeInTheDocument();
    expect(screen.getByText("0 (synthetic fixture)")).toBeInTheDocument();
    expect(screen.queryByText("Fresh within policy")).not.toBeInTheDocument();
  });

  it("keeps source-unavailable status explicit on RPC failure without displaying a fallback price", () => {
    mocks.oracle.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("RPC unavailable"),
      refetch: vi.fn(),
    });
    renderUi(<OracleOverviewCard />);
    expect(screen.getByText("NEAR Testnet RPC unavailable")).toBeInTheDocument();
    expect(screen.getByText(/No fallback or simulated price is displayed/i)).toBeInTheDocument();
    expect(screen.queryByText(/\$7\.38863238/)).not.toBeInTheDocument();
  });

  it("introduces OutLayer as a separate read-only view even while data is unavailable", () => {
    renderUi(<OraclePage />);
    const intro = screen.getByText(/A read-only view of coffee data stored on NEAR Testnet/i);
    expect(intro).toHaveTextContent(/OutLayer/);
    expect(intro).toHaveTextContent(/independent from perps/i);
    expect(screen.getByText(/OutLayer is used for a separate read-only data workflow/i)).toBeInTheDocument();
    expect(intro).not.toHaveTextContent(/^Live /);
  });
});
