import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Flame, Landmark, Layers, Package } from "lucide-react";
import hero from "@/assets/hero-coffee.jpg";
import farm from "@/assets/origin-farm.jpg";
import roastery from "@/assets/roastery.jpg";
import { Button } from "@/components/ui/button";
import { PublicShell, Section } from "@/components/shell";
import { DemoBadge, Illustrative } from "@/components/kit";
import { ProductCard } from "@/components/commerce";
import { useDemo } from "@/lib/demo/store";
import { compact, markPrice, usd } from "@/lib/demo/calc";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => seo("Specialty Coffee × Decentralized Finance", "Shop independent specialty roasters and explore a simulated coffee-backed DeFi ecosystem. Roast. Stake. Repeat."),
  component: Home,
});

function Home() {
  const s = useDemo();
  const kg = s.lots.reduce((a, l) => a + l.supply, 0);
  const tvl = s.vaults.reduce((a, v) => a + v.tvl, 0);
  const vol = s.perpMarkets.reduce((a, m) => a + m.vol, 0);
  return (
    <PublicShell>
      <section className="relative isolate overflow-hidden">
        <img src={hero} alt="Roasted and green coffee beans with sage leaves" width={1600} height={1008} className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="bg-hero-fade absolute inset-0 -z-10" />
        <Section className="flex min-h-[78vh] flex-col justify-end pb-16 pt-32 text-cream">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-brass">Specialty Coffee × Decentralized Finance</p>
          <h1 className="max-w-4xl text-5xl font-medium leading-[1.02] md:text-7xl">Roast. Stake.<br /><em className="text-brass">Repeat.</em></h1>
          <p className="mt-6 max-w-xl text-lg text-cream/85">A global marketplace for independent roasters, and a protocol where every kilo of traceable coffee can become an on-chain asset — shown here as a fully simulated prototype.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild className="bg-cream text-forest hover:bg-parchment"><Link to="/market">Explore Market <ArrowRight /></Link></Button>
            <Button size="lg" variant="outline" asChild className="border-cream/50 bg-transparent text-cream hover:bg-cream/10 hover:text-cream"><Link to="/app/dashboard">Explore DeFi</Link></Button>
          </div>
        </Section>
      </section>

      <div className="border-b bg-forest text-mint">
        <Section className="grid grid-cols-2 gap-6 py-8 md:grid-cols-5">
          {[["Roasters", s.roasters.filter((r) => r.status === "Approved").length], ["Origins", new Set(s.products.map((p) => p.country)).size], ["Tokenized kg", compact(kg)], ["Demo TVL", "$" + compact(tvl)], ["24h volume", "$" + compact(vol)]].map(([l, v]) => (
            <div key={l as string}><p className="num text-3xl text-cream">{v}</p><p className="text-xs uppercase tracking-wider opacity-70">{l}</p></div>
          ))}
          <Illustrative className="col-span-full text-mint/60" />
        </Section>
      </div>

      <Section className="py-20">
        <div className="mb-8 flex items-end justify-between"><div><p className="font-mono text-xs uppercase tracking-widest text-copper">This week's cupping table</p><h2 className="mt-2 text-4xl">Featured coffees</h2></div><Link to="/market" className="text-sm underline-offset-4 hover:underline">All coffees →</Link></div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{s.products.filter((p) => p.featured).map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </Section>

      <section className="bg-secondary/60 py-20">
        <Section className="grid items-center gap-12 md:grid-cols-2">
          <img src={farm} alt="Coffee farm in the Colombian highlands" loading="lazy" width={1200} height={912} className="aspect-[4/3] w-full rounded-lg object-cover" />
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-copper">Origins</p>
            <h2 className="mt-2 text-4xl">Every lot has a name, a farm and a passport.</h2>
            <p className="mt-4 text-muted-foreground">From Huila to Yirgacheffe, each coffee is traced to its producer. Tokenized lots carry a Coffee Passport with custody, grading and audit history.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {["Colombia", "Ethiopia", "Kenya", "Brazil"].map((c) => <Link key={c} to="/market" search={{ country: c }} className="rounded-md border bg-card p-4 hover:border-forest"><p className="font-display text-lg">{c}</p><p className="text-xs text-muted-foreground">{s.products.filter((p) => p.country === c).length} coffees</p></Link>)}
            </div>
          </div>
        </Section>
      </section>

      <Section className="py-20">
        <h2 className="text-4xl">Featured roasters</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {s.roasters.filter((r) => r.status === "Approved").slice(0, 3).map((r) => (
            <Link key={r.id} to="/roasters/$id" params={{ id: r.id }} className="group rounded-lg border bg-card p-6 transition-shadow hover:shadow-soft">
              <p className="text-xs uppercase tracking-wider text-copper">{r.city}, {r.country}</p>
              <p className="mt-2 font-display text-2xl">{r.name}</p>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{r.story}</p>
            </Link>
          ))}
        </div>
      </Section>

      <section className="dark bg-background py-20 text-foreground">
        <Section>
          <div className="flex flex-wrap items-center gap-3"><h2 className="text-4xl">How the protocol works</h2><DemoBadge>SIMULATED</DemoBadge></div>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {[[Layers, "Tokenize", "1 GCT = 1 kg of an identified green lot held by a custodian."], [Flame, "Roast", "Burn GCT, mint RCT from real roasted mass — loss and fee shown separately."], [Landmark, "Stake & lend", "Deposit into vaults for sGCT/sRCT receipts or borrow against isolated lots."], [Package, "Redeem", "Burn RCT for a physical bag delivered to your door."]].map(([I, t, d], i) => {
              const Icon = I as typeof Layers;
              return <div key={i} className="rounded-lg border bg-card p-5"><Icon className="size-5 text-brass" /><p className="mt-4 font-display text-xl">{t as string}</p><p className="mt-1 text-sm text-muted-foreground">{d as string}</p></div>;
            })}
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border bg-card p-5">
              <p className="mb-3 text-sm font-semibold">Featured vaults</p>
              {s.vaults.slice(0, 4).map((v) => <Link key={v.id} to="/app/vaults/$id" params={{ id: v.id }} className="flex justify-between border-b py-2.5 text-sm last:border-0 hover:text-primary"><span>{v.name}</span><span className="num text-gain">{v.apy}% APY*</span></Link>)}
              <Illustrative className="mt-3" />
            </div>
            <div className="rounded-lg border bg-card p-5">
              <p className="mb-3 text-sm font-semibold">Coffee financial markets</p>
              {s.perpMarkets.slice(0, 4).map((m) => <Link key={m.id} to="/app/perps/$market" params={{ market: m.id }} className="flex justify-between border-b py-2.5 text-sm last:border-0 hover:text-primary"><span>{m.name}</span><span className="num">{usd(markPrice(s, m.id), 3)}/kg</span></Link>)}
              <Illustrative className="mt-3" />
            </div>
          </div>
        </Section>
      </section>

      <Section className="grid gap-6 py-20 md:grid-cols-2">
        <div className="rounded-lg bg-espresso p-8 text-cream">
          <p className="font-mono text-xs uppercase tracking-widest text-brass">Coffee Ventures</p>
          <h3 className="mt-2 text-3xl">Back the supply chain.</h3>
          <p className="mt-3 text-sm text-cream/80">Explore illustrative deals with cooperatives, roasters and AgriTech startups. Not an offer to invest.</p>
          <Button asChild className="mt-6 bg-brass text-charcoal hover:bg-brass/90"><Link to="/app/ventures">Browse ventures</Link></Button>
        </div>
        <div className="relative overflow-hidden rounded-lg p-8 text-cream">
          <img src={roastery} alt="" loading="lazy" width={1200} height={912} className="absolute inset-0 -z-10 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-forest/80" />
          <p className="font-mono text-xs uppercase tracking-widest text-brass">For roasters</p>
          <h3 className="mt-2 text-3xl">Sell globally. Tokenize your lots.</h3>
          <p className="mt-3 text-sm text-cream/80">Storefront, inventory, payouts and lot tokenization in one portal.</p>
          <Button asChild className="mt-6 bg-cream text-forest hover:bg-parchment"><Link to="/roaster/dashboard">Open roaster portal</Link></Button>
        </div>
      </Section>
    </PublicShell>
  );
}
