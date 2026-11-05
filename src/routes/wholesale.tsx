import { createFileRoute } from "@tanstack/react-router";
import { PublicShell, Section } from "@/components/shell";
import { ModulePage } from "@/components/module-page";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/wholesale")({
  head: () => seo("Wholesale", "ROASTAKE Wholesale — simulated demo module."),
  component: Page,
});

function Page() {
  return <PublicShell><Section className="py-12"><ModulePage path="/wholesale" /></Section></PublicShell>;
}
