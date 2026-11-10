import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { SpotMarketsPage } from "@/components/trading";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/app/markets")({
  head: () => seo("Spot markets", "Demo reference prices for green and roasted coffee tokens."),
  component: Page,
});

function Page() {
  return <AppShell><SpotMarketsPage /></AppShell>;
}
