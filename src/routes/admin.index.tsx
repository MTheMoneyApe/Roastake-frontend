import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ROASTER_NAV, ADMIN_NAV } from "@/components/shell";
import { ModulePage } from "@/components/module-page";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/admin")({
  head: () => seo("Admin", "ROASTAKE Admin — simulated demo module."),
  component: Page,
});

function Page() {
  return <AppShell nav={ADMIN_NAV} home="/admin"><ModulePage path="/admin" /></AppShell>;
}
