import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell, Section } from "@/components/shell";
import { useDemo } from "@/lib/demo/store";
import { DemoBadge, PageHeader } from "@/components/kit";
import { CoffeePhoto } from "@/components/coffee-photo";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/roasters/")({
  head: () =>
    seo(
      "Demo Roaster Directory",
      "Illustrative roaster profiles, not verified merchants or actual storefronts.",
    ),
  component: RoasterDirectory,
});

function RoasterDirectory() {
  const s = useDemo();
  return (
    <PublicShell>
      <Section className="py-12">
        <PageHeader
          title="Roasters"
          subtitle="Illustrative profiles, descriptions and statuses — not verified merchants, actual locations or storefronts. No physical coffee backing, custody, shipment or real-world redemption is verified."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {s.roasters
            .filter((r) => r.status === "Approved")
            .map((r, i) => (
              <Link
                key={r.id}
                to="/roasters/$id"
                params={{ id: r.id }}
                className="brand-surface group min-w-0 overflow-hidden transition-shadow hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <CoffeePhoto
                  photo={(["roasting", "beans", "cherries"] as const)[i % 3]}
                  className="p-3 pb-0"
                />
                <div className="p-5">
                  <DemoBadge>DEMO PROFILE</DemoBadge>
                  <p className="mt-3 text-xs uppercase tracking-wider text-copper">
                    {r.city}, {r.country} · sample est. {r.founded}
                  </p>
                  <p className="mt-1 font-display text-2xl">{r.name}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.story}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {s.products.filter((p) => p.roasterId === r.id).length} sample coffees ·
                    Illustrative demo rating
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Sample profile status: {r.status} (demo, not vetted)
                  </p>
                </div>
              </Link>
            ))}
        </div>
      </Section>
    </PublicShell>
  );
}
