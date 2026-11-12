import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/app/docs")({
  head: () =>
    seo(
      "Documentation",
      "ROASTAKE project documentation, source repositories, Testnet deployment status and prototype limitations.",
    ),
  component: Page,
});

const RESOURCES = [
  {
    title: "Protocol & smart contracts",
    description:
      "Rust/NEAR contracts, shared math, oracle adapter and deployment notes. The backend repository is the source of truth for on-chain implementation.",
    href: "https://github.com/MTheMoneyApe/Roastake",
    action: "Open backend repository",
  },
  {
    title: "Frontend application",
    description:
      "TanStack Start application, wallet integrations, Testnet RPC clients, UI routes and local prototype modules.",
    href: "https://github.com/MTheMoneyApe/Roastake-frontend",
    action: "Open frontend repository",
  },
  {
    title: "Backend README",
    description: "Architecture, build instructions, deployed contracts and current implementation scope.",
    href: "https://github.com/MTheMoneyApe/Roastake/blob/hackathon-submission/README.md",
    action: "Read backend README",
  },
  {
    title: "Frontend README",
    description: "Frontend setup, routes, test commands, integration notes and known limitations.",
    href: "https://github.com/MTheMoneyApe/Roastake-frontend/blob/hackathon-submission/README.md",
    action: "Read frontend README",
  },
];

const MODULES = [
  {
    name: "Perpetuals",
    status: "NEAR Testnet",
    detail:
      "Three registered markets: Arabica, Robusta and Gesha. Contract interactions are on-chain, but prices are operator-controlled synthetic Testnet values.",
    to: "/app/perps",
  },
  {
    name: "Coffee Mini Swap",
    status: "NEAR Testnet",
    detail:
      "NEP-141 swaps against RHEA Testnet pools. Uses non-monetary Testnet tokens and depends on available pool liquidity.",
    to: "/app/swap",
  },
  {
    name: "Coffee Oracle",
    status: "Read-only Testnet",
    detail:
      "Separate Oracle contract telemetry for an IMF monthly Arabica benchmark and a synthetic Gesha fixture. This feed does not power Perpetuals.",
    to: "/app/oracle",
  },
  {
    name: "Marketplace & coffee provenance",
    status: "Simulated prototype",
    detail:
      "Products, roasters, orders, custody, tokenized inventory and redemption records are sample/local demo data. No physical backing or shipment is verified.",
    to: "/market",
  },
  {
    name: "Vaults, lending, governance & portals",
    status: "Roadmap preview",
    detail:
      "These screens are previews, not deployed protocol services. Demo roles are local UI state, not authentication or authorization.",
    to: "/app/dashboard",
  },
];

function Page() {
  return (
    <AppShell>
      <div className="space-y-8">
        <section className="space-y-3">
          <p className="brand-eyebrow">
            Resources · source of truth
          </p>
          <h1 className="brand-page-title">
            ROASTAKE Documentation
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            This page links to the maintained source repositories and distinguishes deployed
            Testnet integrations from local simulations and roadmap previews. Read the repository
            READMEs for implementation details; this page is a navigation index, not an audit or
            security certification.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {RESOURCES.map((resource) => (
            <article key={resource.title} className="brand-surface min-w-0 p-5">
              <h2 className="font-display text-xl font-semibold">{resource.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{resource.description}</p>
              <a
                className="mt-4 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                href={resource.href}
                target="_blank"
                rel="noreferrer"
              >
                {resource.action} ↗
              </a>
            </article>
          ))}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="brand-section-title">Implementation status</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              All chain integrations below are NEAR Testnet only. Testnet tokens have no monetary
              value and no Mainnet deployment is available.
            </p>
          </div>
          <div className="brand-surface divide-y">
            {MODULES.map((item) => (
              <div
                key={item.name}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{item.detail}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="rounded-full border px-2.5 py-1 text-[11px] font-medium">
                    {item.status}
                  </span>
                  <Link
                    to={item.to}
                    className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-brass/40 bg-brass/5 p-5">
          <h2 className="font-display text-xl font-semibold">Important limitations</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Perpetuals price inputs are synthetic and operator-controlled, not commercial coffee prices or independent market oracles.</li>
            <li>The separate Oracle page is read-only and does not supply the Perpetuals execution feed.</li>
            <li>Marketplace orders, coffee inventory, custody, yields and most portfolio balances are simulated in the browser.</li>
            <li>No physical coffee backing, custody verification, redemption shipment, Mainnet deployment or independent security audit certification is claimed.</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/app/perps" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Perpetuals <span aria-hidden="true">→</span>
            </Link>
            <Link to="/app/multichain" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Network deployment matrix <span aria-hidden="true">→</span>
            </Link>
            <Link to="/app/risk-center" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Risk disclosures <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
