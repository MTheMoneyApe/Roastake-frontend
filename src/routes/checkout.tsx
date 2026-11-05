import { createFileRoute } from "@tanstack/react-router";
import { PublicShell, Section } from "@/components/shell";
import { ModulePage } from "@/components/module-page";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/checkout")({
  head: () => seo("Checkout", "ROASTAKE Checkout — simulated demo module."),
  component: Page,
});

function Page() {
  return <PublicShell><Section className="py-12"><ModulePage path="/checkout" /></Section></PublicShell>;
}
