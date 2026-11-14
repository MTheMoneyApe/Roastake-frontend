import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { PerpMarketPage } from "@/components/trading";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/app/perps/$market")({
  head: () =>
    seo(
      "Perpetual market",
      "NEAR Testnet coffee perpetual terminal using operator-controlled synthetic Testnet references (TESTNET_SANDBOX_FEED), not live coffee quotes. Circle Testnet USDC has no monetary value; no Mainnet.",
    ),
  component: Page,
});

function Page() {
  const { market } = Route.useParams();
  return (
    <AppShell>
      <PerpMarketPage id={market} />
    </AppShell>
  );
}
