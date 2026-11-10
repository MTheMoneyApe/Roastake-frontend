import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { MarketAnalyticsPage } from "@/components/trading";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/app/market-analytics")({
  head: () => seo("Market analytics", "Open interest, volume and funding computed from simulated demo markets."),
  component: Page,
});

function Page() {
  return <AppShell><MarketAnalyticsPage /></AppShell>;
}
