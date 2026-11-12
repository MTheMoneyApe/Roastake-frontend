import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { PerpsIndex } from "@/components/trading";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/app/perps/")({
  head: () => seo("Perpetuals", "NEAR Testnet coffee perpetuals on perps-v1.roastake-dev-mta.testnet: Arabica, Robusta & Gesha Testnet markets live on independent synthetic TESTNET_SANDBOX_FEED channels (no Mainnet)."),
  component: Page,
});

function Page() {
  return <AppShell><PerpsIndex /></AppShell>;
}
