import { createFileRoute } from "@tanstack/react-router";
import { LandingShell } from "@/components/shell";
import { LandingPage } from "@/components/landing-page";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    ...seo(
      "The Financial Layer for the Global Coffee Economy",
      "Coffee first. Explore ROASTAKE’s NEAR Testnet markets, illustrative coffee assets and roadmap for connecting the real coffee economy to decentralized finance.",
    ),
    links: [{ rel: "canonical", href: "https://roastake.vercel.app/" }],
  }),
  component: Home,
});

function Home() {
  return (
    <LandingShell>
      <LandingPage />
    </LandingShell>
  );
}
