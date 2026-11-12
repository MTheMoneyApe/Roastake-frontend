import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { PositionsPage } from "@/components/trading";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/app/positions")({
  head: () => seo("Positions", "Live NEAR Testnet perpetual positions on perps-v1.roastake-dev-mta.testnet (Circle Testnet USDC, synthetic oracle) and isolated local demo positions."),
  component: Page,
});

function Page() {
  return <AppShell><PositionsPage /></AppShell>;
}
