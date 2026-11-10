import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { PerpMarketPage } from "@/components/trading";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/app/perps/$market")({
  head: () => seo("Perpetual market", "Simulated order ticket, chart and positions for a coffee index perpetual."),
  component: Page,
});

function Page() {
  const { market } = Route.useParams(); return <AppShell><PerpMarketPage id={market} /></AppShell>;
}
