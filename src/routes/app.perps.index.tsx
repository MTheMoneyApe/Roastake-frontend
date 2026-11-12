import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { PerpsIndex } from "@/components/trading";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/app/perps/")({
  head: () => seo("Perpetuals", "NEAR Testnet Perpetuals contract explorer for configured Arabica, Robusta & Gesha markets. Registration is verified from the on-chain registry; prices use operator-controlled synthetic TESTNET_SANDBOX_FEED data (no Mainnet)."),
  component: Page,
});

function Page() {
  return <AppShell><PerpsIndex /></AppShell>;
}
