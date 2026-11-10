import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { PerpsIndex } from "@/components/trading";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/app/perps/")({
  head: () => seo("Perpetuals", "Simulated coffee price index perpetuals on ROASTAKE — demo only, no real orders."),
  component: Page,
});

function Page() {
  return <AppShell><PerpsIndex /></AppShell>;
}
