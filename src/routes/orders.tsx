import { createFileRoute } from "@tanstack/react-router";
import { PublicShell, Section } from "@/components/shell";
import { OrdersPage } from "@/components/coffee/checkout";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/orders")({
  head: () => seo("Demo Coffee Orders", "Review your simulated marketplace purchases and local fulfillment status."),
  component: Page,
});

function Page() {
  return <PublicShell><Section className="py-12"><OrdersPage /></Section></PublicShell>;
}
