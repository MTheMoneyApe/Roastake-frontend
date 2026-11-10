import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { PositionsPage } from "@/components/trading";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/app/positions")({
  head: () => seo("Positions", "Your simulated perpetual positions, margin and PnL on ROASTAKE."),
  component: Page,
});

function Page() {
  return <AppShell><PositionsPage /></AppShell>;
}
