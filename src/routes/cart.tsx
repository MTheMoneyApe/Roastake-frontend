import { createFileRoute } from "@tanstack/react-router";
import { PublicShell, Section } from "@/components/shell";
import { CartPage } from "@/components/coffee/checkout";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/cart")({
  head: () => seo("Coffee Cart", "Review specialty coffees, pack quantities and EUR totals in your simulated ROASTAKE cart."),
  component: Page,
});

function Page() {
  return <PublicShell><Section className="py-12"><CartPage /></Section></PublicShell>;
}
