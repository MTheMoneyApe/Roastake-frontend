import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ROASTER_NAV, ADMIN_NAV } from "@/components/shell";
import { ModulePage } from "@/components/module-page";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/roaster/$section")({
  head: ({params}) => seo(`Roaster ${params.section.replace(/-/g,' ')}`, `ROASTAKE roaster ${params.section.replace(/-/g,' ')} tools are coming soon. No real services are available.`),
  component: Page,
});

function Page() {
  return <AppShell nav={ROASTER_NAV} dark={false} home="/roaster/dashboard"><ModulePage path="/roaster/$section" /></AppShell>;
}
