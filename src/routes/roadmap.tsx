import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { PublicShell, Section } from "@/components/shell";
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
            {SCOPE_LABELS.planned}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {SCOPE_DESCRIPTIONS.planned} Every generic module and operational portal preview belongs
            here, including detail and application screens.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {planned.items.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start justify-between gap-3">
                <Icon className="size-5 text-primary" aria-hidden="true" />
                <ArrowUpRight
                  className="size-4 text-muted-foreground group-hover:text-primary"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-4 font-semibold">{label}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Planned · open the non-operational design preview
              </p>
            </Link>
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
    <PublicShell>
      <RoadmapPage />
    </PublicShell>
  );
}
