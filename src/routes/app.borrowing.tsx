import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ROASTER_NAV, ADMIN_NAV } from "@/components/shell";
import { ModulePage } from "@/components/module-page";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/app/borrowing")({
  head: () => seo("Borrowing", "ROASTAKE Borrowing — simulated demo module."),
  component: Page,
});

function Page() {
  return <AppShell><ModulePage path="/app/borrowing" /></AppShell>;
}
