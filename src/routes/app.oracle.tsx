import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { OraclePage } from "@/components/coffee/oracle";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/app/oracle")({
  head: () =>
    seo(
      "Coffee Oracle",
      "Read-only NEAR Testnet Oracle telemetry for ARABICA-MONTHLY-IMF/USD and GESHA-DEMO/USD.",
    ),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <OraclePage />
    </AppShell>
  );
}
