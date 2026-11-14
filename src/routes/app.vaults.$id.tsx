import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ROASTER_NAV, ADMIN_NAV } from "@/components/shell";
import { ModulePage } from "@/components/module-page";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/app/vaults/$id")({
  head: ({ params }) =>
    seo(
      `Vault ${params.id} — Roadmap / Planned`,
      "Vault design preview only. Not deployed or operational; no live deposits, withdrawals or yields.",
    ),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <ModulePage path="/app/vaults/$id" />
    </AppShell>
  );
}
