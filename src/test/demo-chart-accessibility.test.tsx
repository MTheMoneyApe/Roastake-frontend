import type { PropsWithChildren } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AreaMini, Bars, Donut } from "@/components/kit";
import { MarketAnalyticsPage } from "@/components/trading";

const charts = vi.hoisted(() => ({
  barData: [] as Record<string, unknown>[],
  axisKey: "",
}));

vi.mock("recharts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("recharts")>()),
  ResponsiveContainer: ({ children }: PropsWithChildren) => <div>{children}</div>,
  AreaChart: ({ children }: PropsWithChildren) => <svg>{children}</svg>,
  BarChart: ({ children, data }: PropsWithChildren<{ data: Record<string, unknown>[] }>) => {
    charts.barData = data;
    return <svg>{children}</svg>;
  },
  PieChart: ({ children }: PropsWithChildren) => <svg>{children}</svg>,
  Area: ({ isAnimationActive }: { isAnimationActive?: boolean }) => (
    <g data-testid="area" data-animation={String(isAnimationActive)} />
  ),
  Bar: ({ isAnimationActive }: { isAnimationActive?: boolean }) => (
    <g data-testid="bar" data-animation={String(isAnimationActive)} />
  ),
  Pie: ({ isAnimationActive }: { isAnimationActive?: boolean }) => (
    <g data-testid="pie" data-animation={String(isAnimationActive)} />
  ),
  XAxis: ({ dataKey }: { dataKey: string }) => {
    charts.axisKey = dataKey;
    return null;
  },
  YAxis: () => null,
  Tooltip: () => null,
}));

afterEach(cleanup);

describe("illustrative chart accessibility", () => {
  it("renders static area, bar and pie charts without JS entrance motion", () => {
    render(
      <>
        <AreaMini data={[{ d: "Day 1", v: 12 }]} />
        <Bars data={[{ d: "Arabica", vol: 12 }]} keys={[{ k: "vol", c: "var(--chart-1)" }]} />
        <Donut data={[{ name: "Arabica", value: 12 }]} />
      </>,
    );
    for (const kind of ["area", "bar", "pie"]) {
      expect(screen.getByTestId(kind)).toHaveAttribute("data-animation", "false");
    }
  });

  it("provides market labels using the exact category key consumed by the volume axis", () => {
    render(<MarketAnalyticsPage />);
    expect(charts.barData.length).toBeGreaterThan(0);
    expect(charts.barData.every((row) => typeof row[charts.axisKey] === "string")).toBe(true);
    expect(new Set(charts.barData.map((row) => row[charts.axisKey])).size).toBe(
      charts.barData.length,
    );
    expect(charts.barData.every((row) => typeof row.vol === "number")).toBe(true);
  });
});
