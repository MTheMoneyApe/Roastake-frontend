import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OracleOverviewCard, OraclePage } from "@/components/coffee/oracle";
import { MARKET_GESHA_DEMO, MARKET_IMF_ARABICA } from "@/lib/oracle/config";
import type { OracleDashboardSnapshot } from "@/lib/oracle/types";

const mockFetchOracleSnapshot = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/oracle/rpc", async () => {
  const actual = await vi.importActual<typeof import("@/lib/oracle/rpc")>("@/lib/oracle/rpc");
  return {
    ...actual,
    fetchOracleSnapshot: (...args: unknown[]) => mockFetchOracleSnapshot(...args),
  };
});

function buildSnapshot(overrides?: Partial<OracleDashboardSnapshot>): OracleDashboardSnapshot {
  return {
    network: "testnet",
    contractId: "roastake-oracle-v1.testnet",
    rpcEndpoint: "https://rpc.testnet.near.org",
    blockHash: "Hh4LMV9VvgHbBks3pQD2EUppCNnBmQX5bLfiGDQvrV9p",
    blockHeight: 277134163,
    fetchedAtMs: 1794349500_000,
    markets: [MARKET_GESHA_DEMO, MARKET_IMF_ARABICA],
    marketStates: {
      [MARKET_GESHA_DEMO]: {
        symbol: MARKET_GESHA_DEMO,
        config: {
          symbol: MARKET_GESHA_DEMO,
          description: "Specialty Gesha Coffee Price Index (Testnet Demonstration Fixture)",
          decimals: 8,
          unit: "USD/kg",
          min_price: "100000000",
          max_price: "50000000000",
          max_price_age_sec: 3600,
          max_divergence_bps: 2000,
          wasm_url:
            "https://test.fastfs.io/roastake-dev-mta.testnet/outlayer.testnet/855bc554762aa9b367ac2b3c62a219c250410f3715256e822f8c24e23df100f1.wasm",
          wasm_sha256: "855bc554762aa9b367ac2b3c62a219c250410f3715256e822f8c24e23df100f1",
          build_target: "wasm32-wasip2",
          active: true,
          worker_mode: "fixture",
          secrets_ref: null,
          min_source_count: 1,
          allow_synthetic: true,
          max_source_spread_bps: 0,
        },
        observation: null,
      },
      [MARKET_IMF_ARABICA]: {
        symbol: MARKET_IMF_ARABICA,
        config: {
          symbol: MARKET_IMF_ARABICA,
          description:
            "Source: International Monetary Fund (IMF), Primary Commodity Price System (PCPS), PCOFFOTM — ICO Other Mild Arabicas New York cash monthly average.",
          decimals: 8,
          unit: "USD/kg",
          min_price: "100000000",
          max_price: "50000000000",
          max_price_age_sec: 7_776_000,
          max_divergence_bps: 2000,
          wasm_url:
            "https://test.fastfs.io/roastake-dev-mta.testnet/outlayer.testnet/855bc554762aa9b367ac2b3c62a219c250410f3715256e822f8c24e23df100f1.wasm",
          wasm_sha256: "855bc554762aa9b367ac2b3c62a219c250410f3715256e822f8c24e23df100f1",
          build_target: "wasm32-wasip2",
          active: true,
          worker_mode: "public_benchmark",
          secrets_ref: null,
          min_source_count: 1,
          allow_synthetic: false,
          max_source_spread_bps: 0,
        },
        observation: {
          market: MARKET_IMF_ARABICA,
          price: "738863238",
          decimals: 8,
          unit: "USD/kg",
          source: "imf-pcps-pcoffotm",
          source_count: 1,
          observed_at_sec: 1793491199,
          stored_at_sec: 1794349463,
          nonce: 1,
          data_class: "PUBLIC_BENCHMARK_MONTHLY",
        },
      },
    },
    solvencyInvariant: true,
    nextNonce: 2,
    accounting: {
      account_balance: "9996862881573592100000000",
      storage_usage_bytes: 398827,
      storage_locked_balance: "3988270000000000000000000",
      spendable_balance: "6008592881573592100000000",
      minimum_operating_reserve: "10000000000000000000000",
      refund_reserve_balance: "0",
      insurance_reserve_balance: "0",
      insurance_in_flight_liability: "0",
      insurance_return_pending_liability: "0",
      insurance_unresolved_liability: "0",
      insurance_enabled: false,
      total_refund_liability: "0",
      in_flight_liability: "0",
      disputed_liability: "0",
      backed_refund_liability: "0",
      required_backing: "10000000000000000000000",
      encumbered_backing_floor: "10000000000000000000000",
      unallocated_surplus: "5998592881573592100000000",
      invariant_holds: true,
      pending_request_count: 0,
      unreconciled_failure_count: 0,
      active_refund_credit_count: 0,
      active_claim_count: 0,
      open_request_slots: 0,
      max_open_requests: 100,
      active_insurance_compensation_count: 0,
      max_active_insurance_compensations: 32,
      market_count: 2,
      authorized_requester_count: 1,
      next_claim_id: 1,
      next_compensation_id: 1,
    },
    ...overrides,
  };
}

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mockFetchOracleSnapshot.mockReset();
  vi.useRealTimers();
});

describe("Coffee Oracle UI integration", () => {
  it("renders live IMF observation, Gesha 'No observation yet', disclosures, and proof panel", async () => {
    vi.setSystemTime(new Date(1794349500_000));
    mockFetchOracleSnapshot.mockResolvedValue(buildSnapshot());

    renderWithQuery(<OraclePage />);

    await waitFor(() => {
      expect(screen.getAllByText("$7.38863238 USD/kg").length).toBeGreaterThan(0);
    });

    expect(screen.getByText("No observation yet")).toBeInTheDocument();
    expect(screen.getAllByText("2026-10-31 23:59:59 UTC").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2026-11-10 22:24:23 UTC").length).toBeGreaterThan(0);
    expect(screen.getByText("6.00859288 NEAR")).toBeInTheDocument();
    expect(screen.getByText("Verified (true)")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Source: International Monetary Fund \(IMF\), Primary Commodity Price System/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("#17925")).toBeInTheDocument();
    expect(screen.getByText(/58bW5j54R52UYZcXWUjHHQJjev368jj2ZNTKBpwZgCod/)).toBeInTheDocument();
    expect(screen.getByText(/Hh4LMV9VvgHbBks3pQD2EUppCNnBmQX5bLfiGDQvrV9p/)).toBeInTheDocument();
    expect(screen.getByText(/#277,134,163/)).toBeInTheDocument();
  });

  it("shows 'Unavailable (no stored observation)' when IMF market has no stored observation (L-4)", async () => {
    vi.setSystemTime(new Date(1794349500_000));
    const snap = buildSnapshot();
    snap.marketStates[MARKET_IMF_ARABICA]!.observation = null;
    mockFetchOracleSnapshot.mockResolvedValue(snap);

    renderWithQuery(<OracleOverviewCard />);

    await waitFor(() => {
      expect(screen.getByText("Unavailable (no stored observation)")).toBeInTheDocument();
    });
    expect(screen.queryByText(/imf-pcps-pcoffotm \(IMF PCPS\)/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("No observation yet")).toHaveLength(2);
  });

  it("allows inspecting the Gesha synthetic fixture separately and shows synthetic warning", async () => {
    vi.setSystemTime(new Date(1794349500_000));
    const snap = buildSnapshot();
    snap.marketStates[MARKET_GESHA_DEMO]!.observation = {
      market: MARKET_GESHA_DEMO,
      price: "1850000000",
      decimals: 8,
      unit: "USD/kg",
      source: "roastake-fixture",
      source_count: 1,
      observed_at_sec: 0,
      stored_at_sec: 1794349400,
      nonce: 2,
      data_class: "SYNTHETIC_DEMO",
    };
    mockFetchOracleSnapshot.mockResolvedValue(snap);

    renderWithQuery(<OraclePage />);
    await waitFor(() => expect(screen.getByText("$18.50000000 USD/kg")).toBeInTheDocument());

    const inspectButtons = screen.getAllByRole("button", { name: /^Inspect$/i });
    fireEvent.click(inspectButtons[0]);

    expect(screen.getByText(/Oracle overview · GESHA-DEMO\/USD/i)).toBeInTheDocument();
  });

  it("supports manual refresh on desktop and mobile dashboard card without demo contamination", async () => {
    vi.setSystemTime(new Date(1794349500_000));
    mockFetchOracleSnapshot.mockResolvedValue(buildSnapshot());

    renderWithQuery(<OracleOverviewCard />);
    await waitFor(() => {
      expect(screen.getByText("$7.38863238 USD/kg")).toBeInTheDocument();
    });

    expect(mockFetchOracleSnapshot).toHaveBeenCalledTimes(1);
    const refreshBtn = screen.getByRole("button", {
      name: /Refresh NEAR Testnet oracle data/i,
    });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(mockFetchOracleSnapshot).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByText(/separate from simulated demo portfolio/i)).toBeInTheDocument();
  });

  it("explicitly marks stale observations when age exceeds 90 days", async () => {
    vi.setSystemTime(new Date((1793491199 + 7_776_500) * 1000));
    mockFetchOracleSnapshot.mockResolvedValue(buildSnapshot());

    renderWithQuery(<OraclePage />);

    await waitFor(() => {
      expect(screen.getByText("Stale observation")).toBeInTheDocument();
    });
    expect(screen.getAllByText(/exceeds contract max age/i).length).toBeGreaterThan(0);
  });

  it("renders explicit RPC error alert and never displays fake fallback prices on failure", async () => {
    mockFetchOracleSnapshot.mockRejectedValue(new Error("RPC unreachable (503)"));

    renderWithQuery(<OracleOverviewCard />);

    await waitFor(
      () => {
        expect(screen.getByText("NEAR Testnet RPC unavailable")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(screen.queryByText(/7\.38863238/)).not.toBeInTheDocument();
    expect(screen.getByText(/No fallback or simulated price is displayed/i)).toBeInTheDocument();
  });

  it("uses responsive grid and wrap containers suitable for mobile and desktop viewports", async () => {
    vi.setSystemTime(new Date(1794349500_000));
    mockFetchOracleSnapshot.mockResolvedValue(buildSnapshot());

    const { container } = renderWithQuery(<OraclePage />);
    await waitFor(() => {
      expect(screen.getAllByText("$7.38863238 USD/kg").length).toBeGreaterThan(0);
    });

    const marketGrid = container.querySelector('section[aria-label="Registered Oracle Markets"]');
    expect(marketGrid?.className).toContain("grid");
    expect(marketGrid?.className).toContain("md:grid-cols-2");

    const cards = container.querySelectorAll("article");
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(cards[0]?.className).toContain("@container");
  });
});
