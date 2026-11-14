import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ROASTER_NAV, ADMIN_NAV } from "@/components/shell";
import { ModulePage } from "@/components/module-page";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/admin/$section")({
  head: ({ params }) =>
    seo(
      `Admin ${params.section.replace(/-/g, " ")} — Roadmap / Planned`,
      "Admin design preview only. Not deployed or operational; no live approvals, configuration changes or transactions.",
    ),
  component: Page,
});

function Page() {
  return (
    <AppShell nav={ADMIN_NAV} home="/admin">
      <ModulePage path="/admin/$section" />
    </AppShell>
  );
}
