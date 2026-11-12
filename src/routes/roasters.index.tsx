import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell, Section } from "@/components/shell";
import { useDemo } from "@/lib/demo/store";
import { PageHeader } from "@/components/kit";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/roasters/")({
  head: () => seo("Roaster Directory", "Independent specialty roasters from around the world."),
  component: () => {
    const s = useDemo();
    return (
      <PublicShell>
        <Section className="py-12">
          <PageHeader title="Roasters" subtitle="An international directory of independent roasters (demo profiles)." />
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {s.roasters.filter((r) => r.status === "Approved").map((r) => (
              <Link key={r.id} to="/roasters/$id" params={{ id: r.id }} className="brand-surface group min-w-0 overflow-hidden transition-shadow hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <div className="aspect-[16/9] w-full bg-muted" aria-hidden="true" />
                <div className="p-5">
                  <p className="text-xs uppercase tracking-wider text-copper">{r.city}, {r.country} · est. {r.founded}</p>
                  <p className="mt-1 font-display text-2xl">{r.name}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.story}</p>
                  <p className="mt-3 text-xs text-muted-foreground">{s.products.filter((p) => p.roasterId === r.id).length} coffees · ★ {r.rating}</p>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      </PublicShell>
    );
  },
});
