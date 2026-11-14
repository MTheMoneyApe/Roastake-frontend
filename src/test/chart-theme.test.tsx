// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PerpsMarketChart } from "@/components/perps/market-chart";

const chartMocks = vi.hoisted(() => {
  const setData = vi.fn();
  const applySeriesOptions = vi.fn();
  const applyChartOptions = vi.fn();
  const fitContent = vi.fn();
  const remove = vi.fn();
  const setMarkers = vi.fn();
  const addSeries = vi.fn(() => ({ setData, applyOptions: applySeriesOptions }));
  const createChart = vi.fn(() => ({
    addSeries,
    applyOptions: applyChartOptions,
    timeScale: () => ({ fitContent }),
    subscribeCrosshairMove: vi.fn(),
    remove,
  }));
  const createSeriesMarkers = vi.fn(() => ({ setMarkers, detach: vi.fn() }));
  return {
    createChart,
    addSeries,
    setData,
    createSeriesMarkers,
    applyChartOptions,
    applySeriesOptions,
    fitContent,
    remove,
    setMarkers,
    history: vi.fn(),
  };
});

vi.mock("@/lib/perps/queries", () => ({ usePerpsMarketHistory: chartMocks.history }));
vi.mock("@/components/perps/market-chart-toolbar", () => ({
  ArabicaMarketChartToolbar: ({
    onTimeframeChange,
  }: {
    onTimeframeChange: (value: "1m") => void;
  }) => <button onClick={() => onTimeframeChange("1m")}>Show one-minute candles</button>,
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
  document.documentElement.classList.remove("dark");
  vi.restoreAllMocks();
});

describe("market chart shared theme", () => {
  it.each(["Line", "Candlestick"])(
    "updates %s colors in place on root theme changes without resetting data or viewport",
    async (seriesType) => {
      const day = {
        "--card": [250, 248, 239, 255],
        "--foreground": [40, 48, 43, 255],
        "--border": [214, 212, 197, 255],
        "--gain": [20, 115, 65, 255],
        "--loss": [166, 46, 33, 255],
        "--warning-foreground": [111, 68, 23, 255],
      };
      const night = {
        "--card": [30, 37, 33, 255],
        "--foreground": [235, 236, 230, 255],
        "--border": [58, 68, 61, 255],
        "--gain": [115, 190, 142, 255],
        "--loss": [230, 118, 97, 255],
        "--warning-foreground": [211, 183, 129, 255],
      };
      const colors = new Map(
        [...Object.values(day), ...Object.values(night)].map((channels) => [
          `rgb(${channels.slice(0, 3).join(", ")})`,
          channels,
        ]),
      );
      vi.spyOn(window, "getComputedStyle").mockImplementation(
        () =>
          ({
            getPropertyValue: (token: keyof typeof day) => {
              const theme = document.documentElement.classList.contains("dark") ? night : day;
              return token in theme ? `rgb(${theme[token].slice(0, 3).join(", ")})` : "";
            },
          }) as unknown as CSSStyleDeclaration,
      );
      const context = {
        fillStyle: "",
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        getImageData: () => ({ data: colors.get(context.fillStyle) }),
      };
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
        context as unknown as CanvasRenderingContext2D,
      );
      setHistory({
        data: {
          observations: [observation],
          latestObservation: observation,
          tradeMarkers: ["LONG_OPEN", "SHORT_OPEN", "CLOSE"].map((kind, index) => ({
            kind,
            positionId: index + 1,
            timestampSec: observation.timestampSec,
            anchorTimeSec: observation.timestampSec,
            anchorSequence: 1,
            txHash: `verified-${kind}`,
            explorerUrl: `https://example.com/${kind}`,
            execPriceE8: "500000000",
            feeE8: "0",
          })),
          referenceNowSec: observation.timestampSec,
          latestAgeSec: 0,
          isStale: false,
          candleAvailability: {
            "1m": {
              available: true,
              candles: [
                {
                  time: observation.timestampSec,
                  open: 5,
                  high: 6,
                  low: 4,
                  close: 5.5,
                  sampleCount: 2,
                },
              ],
            },
          },
        },
      });
      const view = render(<PerpsMarketChart market={null} />);
      await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalledOnce());
      const initialChartCount = seriesType === "Candlestick" ? 2 : 1;
      if (seriesType === "Candlestick") {
        fireEvent.click(screen.getByRole("button", { name: "Show one-minute candles" }));
        await waitFor(() =>
          expect(chartMocks.createChart).toHaveBeenCalledTimes(initialChartCount),
        );
      }
      expect(chartMocks.addSeries).toHaveBeenLastCalledWith(seriesType, expect.anything());
      expect(chartMocks.setData).toHaveBeenCalledTimes(initialChartCount);
      expect(chartMocks.fitContent).toHaveBeenCalledTimes(initialChartCount);

      await act(async () => {
        document.documentElement.classList.add("dark");
      });
      await waitFor(() =>
        expect(chartMocks.applyChartOptions).toHaveBeenCalledWith(
          expect.objectContaining({
            layout: {
              background: { type: "solid", color: "rgba(30, 37, 33, 1)" },
              textColor: "rgba(235, 236, 230, 1)",
            },
            grid: {
              vertLines: { color: "rgba(58, 68, 61, 1)" },
              horzLines: { color: "rgba(58, 68, 61, 1)" },
            },
            rightPriceScale: { borderColor: "rgba(58, 68, 61, 1)" },
            timeScale: { borderColor: "rgba(58, 68, 61, 1)" },
          }),
        ),
      );
      expect(chartMocks.applySeriesOptions).toHaveBeenLastCalledWith(
        seriesType === "Line"
          ? { color: "rgba(115, 190, 142, 1)" }
          : {
              upColor: "rgba(115, 190, 142, 1)",
              downColor: "rgba(230, 118, 97, 1)",
              wickUpColor: "rgba(115, 190, 142, 1)",
              wickDownColor: "rgba(230, 118, 97, 1)",
            },
      );
      expect(chartMocks.setMarkers).toHaveBeenLastCalledWith([
        expect.objectContaining({ color: "rgba(115, 190, 142, 1)", text: "LONG OPEN #1" }),
        expect.objectContaining({ color: "rgba(230, 118, 97, 1)", text: "SHORT OPEN #2" }),
        expect.objectContaining({ color: "rgba(211, 183, 129, 1)", text: "CLOSE #3" }),
      ]);
      await act(async () => {
        document.documentElement.classList.remove("dark");
      });
      await waitFor(() =>
        expect(chartMocks.applySeriesOptions).toHaveBeenLastCalledWith(
          seriesType === "Line"
            ? { color: "rgba(20, 115, 65, 1)" }
            : {
                upColor: "rgba(20, 115, 65, 1)",
                downColor: "rgba(166, 46, 33, 1)",
                wickUpColor: "rgba(20, 115, 65, 1)",
                wickDownColor: "rgba(166, 46, 33, 1)",
              },
        ),
      );
      expect(chartMocks.createChart).toHaveBeenCalledTimes(initialChartCount);
      expect(chartMocks.setData).toHaveBeenCalledTimes(initialChartCount);
      expect(chartMocks.fitContent).toHaveBeenCalledTimes(initialChartCount);
      expect(chartMocks.remove).toHaveBeenCalledTimes(initialChartCount - 1);
      view.unmount();
      chartMocks.applyChartOptions.mockClear();
      await act(async () => {
        document.documentElement.classList.add("dark");
      });
      expect(chartMocks.applyChartOptions).not.toHaveBeenCalled();
    },
  );
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
