import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PublicShell, Section } from "@/components/shell";
import { ProductImage, ProductCard } from "@/components/commerce";
import { DemoBadge, Empty, KV } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { demo, lineTotal, useDemo } from "@/lib/demo/store";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/market/$id")({
  head: () => seo("Coffee details", "Origin, producer, tasting notes, brewing guide and roast date for this specialty coffee."),
  component: ProductPage,
});

const GRINDS = ["Whole bean", "Espresso", "Filter", "French press"];
function ProductPage() {
  const { id } = Route.useParams();
  const s = useDemo();
  const p = s.products.find((x) => x.id === id);
  const [size, setSize] = useState(p?.sizes[0] ?? 250);
  const [grind, setGrind] = useState("Whole bean");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  if (!p) return <PublicShell><Section className="py-20"><Empty text="This coffee doesn't exist or was removed." action={<Button asChild variant="outline"><Link to="/market">Back to market</Link></Button>} /></Section></PublicShell>;
  const roaster = s.roasters.find((r) => r.id === p.roasterId);
  if (!roaster) return <PublicShell><Section className="py-20"><Empty text="This demo roaster is unavailable."/></Section></PublicShell>;
  const price = lineTotal(s, { productId: p.id, qty: 1, size });
  return (
    <PublicShell>
      <Section className="py-10">
        <nav className="mb-6 text-xs text-muted-foreground"><Link to="/market">Market</Link> / {p.country} / <span className="text-foreground">{p.name}</span></nav>
        <div className="grid gap-10 md:grid-cols-2">
          <ProductImage p={p} className="aspect-square" />
          <div>
            <p className="text-xs uppercase tracking-wider text-copper">{p.origin}, {p.country}</p>
            <h1 className="mt-1 text-4xl md:text-5xl">{p.name}</h1>
            <Link to="/roasters/$id" params={{ id: roaster.id }} className="mt-2 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline">Roasted by {roaster.name}</Link>
            <div className="mt-4 flex flex-wrap gap-2">{p.notes.map((n) => <span key={n} className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">{n}</span>)}</div>
            <p className="num mt-6 text-3xl">€{price.toFixed(2)}</p>
            <div className="mt-6 space-y-4">
              <div><p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Size</p><div className="flex gap-2">{p.sizes.map((z) => <Button key={z} size="sm" variant={z === size ? "default" : "outline"} onClick={() => setSize(z)}>{p.format === "Capsules" ? `${z} caps` : z >= 1000 ? `${z / 1000} kg` : `${z} g`}</Button>)}</div></div>
              {p.format !== "Capsules" && <div><p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Grind</p><div className="flex flex-wrap gap-2">{GRINDS.map((g) => <Button key={g} size="sm" variant={g === grind ? "default" : "outline"} onClick={() => setGrind(g)}>{g}</Button>)}</div></div>}
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-md border"><Button variant="ghost" size="sm" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease">−</Button><span className="num w-8 text-center">{qty}</span><Button variant="ghost" size="sm" onClick={() => setQty(qty + 1)} aria-label="Increase">+</Button></div>
                <Button size="lg" className="flex-1" disabled={p.stock === 0 || p.status !== 'Live'} onClick={() => {if(demo.addToCart(p.id, qty, size, grind))setAdded(true);}}>{p.stock === 0 ? "Sold out" : "Add to cart"}</Button>
              </div>
              <p className="text-xs text-muted-foreground">{p.stock} in stock (demo) · ships from {roaster.city} · <DemoBadge>No real charge</DemoBadge></p>
              {added && <div role="status" className="flex flex-wrap items-center gap-3 border-t pt-4"><p className="text-sm">Coffee added to your demo cart.</p><Button asChild variant="outline"><Link to="/cart">View cart</Link></Button></div>}
              {p.lotId && <Button asChild variant="outline"><Link to="/app/coffee-passport" search={{lot:p.lotId}}>Inspect Coffee Passport</Link></Button>}
            </div>
          </div>
        </div>
        <Tabs defaultValue="origin" className="mt-14">
          <TabsList><TabsTrigger value="origin">Origin</TabsTrigger><TabsTrigger value="brew">Brewing guide</TabsTrigger><TabsTrigger value="seller">Seller</TabsTrigger></TabsList>
          <TabsContent value="origin" className="max-w-2xl"><KV rows={[["Farm", p.farm], ["Producer", p.producer], ["Altitude", p.altitude], ["Variety", p.variety], ["Process", p.process], ["Harvest", p.harvest], ["Roast date", p.roastDate], ["Roast profile", p.roast], ["Tokenized lot", p.lotId ? <Link className="underline" to="/app/assets/$id" params={{ id: p.lotId }}>{p.lotId}</Link> : "—"]]} /></TabsContent>
          <TabsContent value="brew" className="max-w-2xl"><KV rows={[["Pour-over", "15 g · 250 g water · 94 °C · 3:00"], ["Espresso", "18 g in · 40 g out · 28 s"], ["AeroPress", "14 g · 220 g · 1:45 steep"], ["Rest after roast", "7–21 days"]]} /></TabsContent>
          <TabsContent value="seller" className="max-w-2xl"><p className="text-sm text-muted-foreground">{roaster.story}</p><p className="mt-2 text-sm">Ships to: {roaster.zones.join(", ")}</p></TabsContent>
        </Tabs>
        <h2 className="mt-16 text-3xl">More from {roaster.name}</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{s.products.filter((x) => x.roasterId === roaster.id && x.id !== p.id).slice(0, 4).map((x) => <ProductCard key={x.id} p={x} />)}</div>
      </Section>
    </PublicShell>
  );
}
