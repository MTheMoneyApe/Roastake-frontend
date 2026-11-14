import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ROASTER_NAV, ADMIN_NAV } from "@/components/shell";
import { ModulePage } from "@/components/module-page";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/app/ventures/$id")({
  head: ({ params }) =>
    seo(
      `Venture ${params.id} — Roadmap / Planned`,
      "Venture design preview only. Not deployed or operational; no live investments, fundraising or promised returns.",
    ),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <ModulePage path="/app/ventures/$id" />
    </AppShell>
  );
}
