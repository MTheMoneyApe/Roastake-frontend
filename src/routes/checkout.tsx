import { createFileRoute } from "@tanstack/react-router";
import { PublicShell, Section } from "@/components/shell";
import { CheckoutPage } from "@/components/coffee/checkout";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/checkout")({
  head: () => seo("Demo Checkout", "Place a simulated coffee order with fictional delivery details. No real payment or shipment."),
  component: Page,
});

function Page() {
  return <PublicShell><Section className="py-12"><CheckoutPage /></Section></PublicShell>;
}
