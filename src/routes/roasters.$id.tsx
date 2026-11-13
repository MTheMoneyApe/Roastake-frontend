import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell, Section } from "@/components/shell";
import { ProductCard } from "@/components/commerce";
import { DemoBadge, Empty, KV } from "@/components/kit";
import { CoffeePhoto } from "@/components/coffee-photo";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/lib/demo/store";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/roasters/$id")({
  head: () =>
    seo(
      "Demo roaster profile",
      "Illustrative story, catalogue and service regions, not a verified roaster storefront.",
    ),
  component: RoasterProfile,
});

function RoasterProfile() {
  const { id } = Route.useParams();
  const s = useDemo();
  const r = s.roasters.find((x) => x.id === id);
  if (!r)
    return (
      <PublicShell>
        <Section className="py-20">
          <Empty
            text="Roaster not found."
            action={
              <Button asChild variant="outline">
                <Link to="/roasters">All roasters</Link>
              </Button>
            }
          />
        </Section>
      </PublicShell>
    );
  const items = s.products.filter((p) => p.roasterId === r.id && p.status === "Live");
  return (
    <PublicShell>
      <div className="brand-hero relative isolate">
        <div className="absolute inset-0 -z-10 h-full w-full bg-muted" aria-hidden="true" />
        <div className="absolute inset-0 -z-10 bg-hero" />
        <Section className="grid items-center gap-8 py-12 text-hero-foreground md:grid-cols-2">
          <div>
            <DemoBadge>DEMO PROFILE · NOT VETTED</DemoBadge>
            <p className="mt-4 text-xs uppercase tracking-widest text-hero-highlight">
              Illustrative location · {r.city}, {r.country}
            </p>
            <h1 className="brand-page-title mt-2">{r.name}</h1>
            <p className="mt-4 max-w-xl text-hero-muted">{r.story}</p>
            <p className="mt-4 text-sm text-hero-muted">
              Description, profile status and ratings are demo data. This is not a connected
              merchant; no verified physical coffee backing, custody, shipment or real-world
              redemption.
            </p>
          </div>
          <CoffeePhoto
            photo="roasting"
            priority
            sizes="(min-width: 1440px) 592px, (min-width: 768px) 45vw, 100vw"
            className="[&_figcaption]:text-hero-muted"
          />
        </Section>
      </div>
      <Section className="grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <h2 className="brand-section-title">Demo catalogue</h2>
          {items.length ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          ) : (
            <Empty text="No sample listings available." />
          )}
        </div>
        <aside className="brand-surface min-w-0 self-start p-5">
          <KV
            rows={[
              ["Sample founded year", r.founded],
              ["Rating", "Illustrative demo rating · not customer reviews"],
              ["Demo service regions", r.zones.join(", ")],
              ["Sample profile status", `${r.status} (demo, not vetted)`],
            ]}
          />
        </aside>
      </Section>
    </PublicShell>
  );
}
