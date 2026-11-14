import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { AppShell, Section } from "@/components/shell";
import { MaturityBadge, PageHeader } from "@/components/kit";
import { APP_NAV, ROADMAP_NAV, SCOPE_DESCRIPTIONS, SCOPE_LABELS } from "@/lib/navigation";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/roadmap")({
  head: () =>
    seo(
      "Ecosystem Roadmap",
      "Planned ROASTAKE modules, clearly separated from live NEAR Testnet integrations and illustrative demos.",
    ),
  component: Page,
});

export function RoadmapPage() {
  const planned = ROADMAP_NAV;
  return (
    <Section className="space-y-10 py-8 sm:py-12">
      <PageHeader
        title="Ecosystem Roadmap"
        subtitle="A map of the product vision, not a list of deployed capabilities or a promise of delivery dates."
        demo={false}
        actions={<MaturityBadge variant="preview">{SCOPE_LABELS.planned}</MaturityBadge>}
      />
      <section aria-labelledby="planned-modules" className="space-y-5">
        <div>
          <h2 id="planned-modules" className="font-display text-2xl font-semibold">
            Three phases, one coffee economy
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            The roadmap is organized around the product's core progression. The modules below are
            design previews, not deployed capabilities or delivery commitments.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              title: "Coffee Markets",
              description: "Market access, wholesale discovery and risk infrastructure.",
              paths: ["/app/risk-center", "/app/portfolio", "/subscriptions", "/wholesale", "/discovery-boxes"],
            },
            {
              title: "Coffee Assets",
              description: "Proposed representation, vaults and asset-financing mechanics.",
              paths: ["/app/tokenization", "/app/vaults", "/app/staking", "/app/farming", "/app/lending", "/app/borrowing"],
            },
            {
              title: "Coffee Capital",
              description: "Governance, treasury, ventures and ecosystem operations.",
              paths: ["/app/governance", "/app/governance/proposals", "/app/treasury", "/app/ventures", "/app/ventures/apply", "/roaster/dashboard", "/admin"],
            },
          ].map((phase) => (
            <article key={phase.title} className="rounded-xl border bg-card p-5">
              <h3 className="font-display text-xl font-semibold">{phase.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{phase.description}</p>
              <ul className="mt-4 space-y-2 border-t pt-4">
                {phase.paths.map((path) => {
                  const item = planned.items.find((candidate) => candidate.to === path);
                  return item ? (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        aria-label={`${item.label} Planned · open the non-operational design preview`}
                        className="text-sm text-primary underline underline-offset-4 hover:no-underline"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ) : null;
                })}
              </ul>
            </article>
          ))}
        </div>
      </section>
      <section
        aria-labelledby="available-today"
        className="rounded-2xl border bg-muted/40 p-5 sm:p-7"
      >
        <h2 id="available-today" className="font-display text-2xl font-semibold">
          What you can explore today
        </h2>
        <div className="mt-5 grid gap-7 md:grid-cols-2">
          {APP_NAV.slice(0, 2).map((group, index) => (
            <div key={group.label}>
              <h3 className="font-semibold">
                {index === 0 ? SCOPE_LABELS.live : SCOPE_LABELS.demo}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {index === 0 ? SCOPE_DESCRIPTIONS.live : SCOPE_DESCRIPTIONS.demo}
              </p>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm">
                {group.items.map(({ to, label }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="text-primary underline underline-offset-4 hover:no-underline"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </Section>
  );
}

function Page() {
  return (
    <AppShell>
      <RoadmapPage />
    </AppShell>
  );
}
