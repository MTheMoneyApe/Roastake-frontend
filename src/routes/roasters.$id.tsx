import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell, Section } from "@/components/shell";
import { ProductCard } from "@/components/commerce";
import { Empty, KV } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/lib/demo/store";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/roasters/$id")({
  head: () => seo("Roaster storefront", "Brand story, catalogue and shipping zones of an independent roaster."),
  component: () => {
    const { id } = Route.useParams();
    const s = useDemo();
    const r = s.roasters.find((x) => x.id === id);
    if (!r) return <PublicShell><Section className="py-20"><Empty text="Roaster not found." action={<Button asChild variant="outline"><Link to="/roasters">All roasters</Link></Button>} /></Section></PublicShell>;
    const items = s.products.filter((p) => p.roasterId === r.id && p.status === "Live");
    return (
      <PublicShell>
        <div className="relative isolate">
          <div className="absolute inset-0 -z-10 h-full w-full bg-muted" aria-hidden="true" />
          <div className="absolute inset-0 -z-10 bg-forest/80" />
          <Section className="py-20 text-cream"><p className="text-xs uppercase tracking-widest text-brass">{r.city}, {r.country}</p><h1 className="brand-page-title mt-2">{r.name}</h1><p className="mt-4 max-w-xl text-cream/85">{r.story}</p></Section>
        </div>
        <Section className="grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0"><h2 className="brand-section-title">Catalogue</h2>{items.length ? <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div> : <Empty text="No live products yet." />}</div>
          <aside className="brand-surface min-w-0 self-start p-5"><KV rows={[["Founded", r.founded], ["Rating", `★ ${r.rating || "—"}`], ["Ships to", r.zones.join(", ")], ["Status", r.status]]} /></aside>
        </Section>
      </PublicShell>
    );
  },
});
