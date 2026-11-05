import { createFileRoute } from "@tanstack/react-router";
import { PublicShell, Section } from "@/components/shell";
import { ModulePage } from "@/components/module-page";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/discovery-boxes")({
  head: () => seo("Discovery Boxes", "ROASTAKE Discovery Boxes — simulated demo module."),
  component: Page,
});

function Page() {
  return <PublicShell><Section className="py-12"><ModulePage path="/discovery-boxes" /></Section></PublicShell>;
}
