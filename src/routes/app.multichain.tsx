import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { MultichainOverviewPage } from "@/components/wallet/wallet-pages";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/app/multichain")({
  head: () =>
    seo(
      "Multichain",
      "ROASTAKE NEAR-first protocol execution topology and secondary testnet wallet support.",
    ),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <MultichainOverviewPage />
    </AppShell>
  );
}
