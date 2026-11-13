import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/shell";
import { LandingPage } from "@/components/landing-page";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    seo(
      "ROASTAKE | The Real Coffee Economy",
      "A new financial layer for the real coffee economy. Explore NEAR Testnet markets and the vision connecting physical coffee, digital assets and decentralized finance.",
    ),
  component: Home,
});

function Home() {
  return (
    <PublicShell>
      <LandingPage />
    </PublicShell>
  );
}
