import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { WalletOverviewPage } from "@/components/wallet/wallet-pages";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/app/wallet")({
  head: () =>
    seo(
      "Multichain Wallet",
      "NEAR-first multichain wallet connections for NEAR Testnet, EVM testnets, Solana Devnet, and Hyperliquid Testnet Core.",
    ),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <WalletOverviewPage />
    </AppShell>
  );
}
