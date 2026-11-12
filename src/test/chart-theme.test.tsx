// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PerpsMarketChart } from "@/components/perps/market-chart";

const chartMocks = vi.hoisted(() => {
  const setData = vi.fn();
  const addSeries = vi.fn(() => ({ setData }));
  const createChart = vi.fn(() => ({
    addSeries,
    timeScale: () => ({ fitContent: vi.fn() }),
    subscribeCrosshairMove: vi.fn(),
    remove: vi.fn(),
  }));
  const createSeriesMarkers = vi.fn(() => ({ setMarkers: vi.fn(), detach: vi.fn() }));
  return { createChart, addSeries, setData, createSeriesMarkers, history: vi.fn() };
});

vi.mock("@/lib/perps/queries", () => ({ usePerpsMarketHistory: chartMocks.history }));
vi.mock("@/components/perps/market-chart-toolbar", () => ({
  ArabicaMarketChartToolbar: () => null,
}));
vi.mock("lightweight-charts", () => ({
  createChart: chartMocks.createChart,
  createSeriesMarkers: chartMocks.createSeriesMarkers,
  ColorType: { Solid: "solid" },
  CrosshairMode: { Normal: 0 },
  LineSeries: "Line",
  CandlestickSeries: "Candlestick",
}));

const observation = {
  kind: "oracle_sandbox_tick",
  marketId: "COFFEE-ARABICA-TESTNET/USD",
  sequence: 1,
  priceE8: "500000000",
  priceUsd: 5,
  timestampSec: 1_794_350_000,
  classification: "verified",
  txHash: "verified-oracle-tx",
  explorerUrl: "https://testnet.nearblocks.io/txns/verified-oracle-tx",
};

function setHistory(overrides: Record<string, unknown> = {}) {
  chartMocks.history.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setHistory();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("market chart shared theme", () => {
  it("keeps loading status readable on the shared card surface", () => {
    setHistory({ isLoading: true });
    render(<PerpsMarketChart market={null} />);

    expect(screen.getByRole("status")).toHaveClass("bg-card", "text-foreground");
    expect(screen.getByText(/Verifying finalized receipts/)).toHaveClass("text-muted-foreground");
  });

  it("keeps error meaning and retry on the shared card surface", () => {
    setHistory({ isError: true, error: new Error("Verification failed") });
    render(<PerpsMarketChart market={null} />);

    expect(screen.getByRole("alert")).toHaveClass("bg-card", "text-foreground", "border-loss/50");
    expect(screen.getByText("Verification failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry verification" })).toBeInTheDocument();
  });

  it("uses shared foreground tokens for empty history", () => {
    render(<PerpsMarketChart market={null} />);

    expect(
      screen.getByText("No verified historical observations available yet.").parentElement,
    ).toHaveClass("bg-card", "text-foreground");
  });

  it("resolves inherited CSS colors to sRGB for the chart without altering oracle data", async () => {
    const theme = {
      "--card": ["oklch(0.98 0.01 90)", [250, 248, 239, 255]],
      "--foreground": ["oklch(0.3 0.02 150)", [40, 48, 43, 255]],
      "--border": ["oklch(0.87 0.02 90)", [214, 212, 197, 255]],
      "--gain": ["oklch(0.5 0.12 155)", [20, 115, 65, 255]],
      "--loss": ["oklch(0.5 0.16 30)", [166, 46, 33, 255]],
      "--chart-1": ["oklch(0.55 0.08 145)", [90, 125, 83, 255]],
      "--brass": ["oklch(0.73 0.08 80)", [191, 164, 111, 255]],
      "--warning-foreground": ["oklch(0.43 0.08 65)", [111, 68, 23, 255]],
    } as const;
    const colors = Object.values(theme);
    const context = {
      fillStyle: "",
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      getImageData: vi.fn(() => ({
        data: colors.find(([value]) => value === context.fillStyle)?.[1] ?? [0, 0, 0, 255],
      })),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );
    const snapshot = {
      observations: [observation],
      tradeMarkers: ["LONG_OPEN", "SHORT_OPEN", "CLOSE"].map((kind, index) => ({
        kind,
        positionId: index + 1,
        timestampSec: observation.timestampSec,
        anchorTimeSec: observation.timestampSec,
        anchorSequence: 1,
        txHash: `verified-${kind}`,
        explorerUrl: `https://testnet.nearblocks.io/txns/verified-${kind}`,
        execPriceE8: "500000000",
        feeE8: "0",
      })),
      referenceNowSec: observation.timestampSec,
      latestObservation: observation,
      latestAgeSec: 0,
      isStale: false,
    };
    setHistory({ data: snapshot });
    const view = render(<PerpsMarketChart market={null} />);
    const host = screen.getByTestId("arabica-lightweight-chart");
    Object.entries(theme).forEach(([token, [value]]) => host.style.setProperty(token, value));

    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalledOnce());
    expect(chartMocks.createChart).toHaveBeenCalledWith(
      host,
      expect.objectContaining({
        layout: expect.objectContaining({
          background: { type: "solid", color: "rgba(250, 248, 239, 1)" },
          textColor: "rgba(40, 48, 43, 1)",
        }),
        grid: {
          vertLines: { color: "rgba(214, 212, 197, 1)" },
          horzLines: { color: "rgba(214, 212, 197, 1)" },
        },
        rightPriceScale: expect.objectContaining({ borderColor: "rgba(214, 212, 197, 1)" }),
        timeScale: expect.objectContaining({ borderColor: "rgba(214, 212, 197, 1)" }),
      }),
    );
    expect(chartMocks.addSeries).toHaveBeenCalledWith(
      "Line",
      expect.objectContaining({ color: "rgba(20, 115, 65, 1)" }),
    );
    expect(chartMocks.setData).toHaveBeenCalledWith([{ time: observation.timestampSec, value: 5 }]);
    expect(chartMocks.createSeriesMarkers).toHaveBeenCalledWith(
      expect.anything(),
      [
        expect.objectContaining({
          time: observation.timestampSec,
          shape: "arrowUp",
          text: "LONG OPEN #1",
          color: "rgba(20, 115, 65, 1)",
        }),
        expect.objectContaining({
          time: observation.timestampSec,
          shape: "arrowDown",
          text: "SHORT OPEN #2",
          color: "rgba(166, 46, 33, 1)",
        }),
        expect.objectContaining({
          time: observation.timestampSec,
          shape: "circle",
          text: "CLOSE #3",
          color: "rgba(111, 68, 23, 1)",
        }),
      ],
      { autoScale: true },
    );

    setHistory({ data: { ...snapshot, observations: [{ ...observation }] } });
    view.rerender(<PerpsMarketChart market={null} />);
    expect(chartMocks.createChart).toHaveBeenCalledOnce();
  });
});
