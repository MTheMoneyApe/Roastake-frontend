import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { CoffeeMiniSwap } from "@/components/coffee/mini-swap";
import { seo } from "@/lib/seo";
import { z } from "zod";

export const Route = createFileRoute("/app/swap")({
  validateSearch: z.object({ lot: z.string().optional() }),
  head: () => seo("Swap", "Swap coffee tokens on live RHEA Testnet pools."),
  component: Page,
});
function Page() {
  return (
    <AppShell>
      <CoffeeMiniSwap />
    </AppShell>
  );
}
