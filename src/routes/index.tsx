import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicShell, Section } from "@/components/shell";
import { DemoBadge } from "@/components/kit";
import { ProductCard } from "@/components/commerce";
import { useDemo } from "@/lib/demo/store";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => seo("ROASTAKE | NEAR Testnet Coffee Markets", "Explore NEAR Testnet coffee perpetuals, RHEA swaps and a separate read-only OutLayer Oracle. Marketplace and coffee provenance pages are illustrative demos."),
  component: Home,
});

function Home() {
  const s = useDemo();
  return (
    <PublicShell>
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 h-full w-full bg-muted" aria-hidden="true" />
        <div className="bg-hero-fade absolute inset-0 -z-10" />
        <Section className="flex min-h-[78vh] flex-col justify-end pb-16 pt-32 text-cream">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-brass">Specialty Coffee × Decentralized Finance</p>
          <h1 className="max-w-4xl text-5xl font-medium leading-[1.02] md:text-7xl">ROASTAKE</h1>
          <p className="mt-6 max-w-2xl text-lg text-cream/85">NEAR Testnet coffee perpetuals and RHEA swaps, with a separate read-only OutLayer Oracle. The coffee marketplace, lot inventory and provenance screens are illustrative demos — not verified physical coffee or live commerce.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild className="bg-cream text-forest hover:bg-parchment"><Link to="/app/perps">Explore Perpetuals <ArrowRight /></Link></Button>
            <Button size="lg" variant="outline" asChild className="border-cream/50 bg-transparent text-cream hover:bg-cream/10 hover:text-cream"><Link to="/app/dashboard">Protocol overview</Link></Button>
          </div>
        </Section>
      </section>

      <div className="border-b bg-forest text-mint">
        <Section className="grid gap-6 py-8 md:grid-cols-3">
          <article className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-widest text-brass">NEAR TESTNET · PERPS</p>
            <h2 className="font-display text-2xl text-cream">Three configured markets</h2>
            <p className="text-sm text-mint/75">Arabica, Robusta and Gesha on the NEAR Testnet Perpetuals contract. Prices are operator-controlled synthetic references; Testnet USDC has no monetary value.</p>
            <Link to="/app/perps" className="inline-flex items-center gap-1 text-sm text-cream underline-offset-4 hover:underline">Open Perpetuals <ArrowRight className="size-3.5" /></Link>
          </article>
          <article className="space-y-2 md:border-x md:border-mint/15 md:px-6">
            <p className="font-mono text-[11px] uppercase tracking-widest text-brass">RHEA · NEAR TESTNET</p>
            <h2 className="font-display text-2xl text-cream">On-chain token swaps</h2>
            <p className="text-sm text-mint/75">NEP-141 swaps against RHEA Testnet pools. These are real Testnet transactions using non-monetary tokens, without verified physical coffee backing.</p>
            <Link to="/app/swap" className="inline-flex items-center gap-1 text-sm text-cream underline-offset-4 hover:underline">Open Mini Swap <ArrowRight className="size-3.5" /></Link>
          </article>
          <article className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-widest text-brass">OUTLAYER · READ ONLY</p>
            <h2 className="font-display text-2xl text-cream">Separate Oracle telemetry</h2>
            <p className="text-sm text-mint/75">A read-only NEAR Testnet Oracle view for historical benchmark and demonstration data. It does not supply prices to Perps.</p>
            <Link to="/app/oracle" className="inline-flex items-center gap-1 text-sm text-cream underline-offset-4 hover:underline">Inspect Oracle <ArrowRight className="size-3.5" /></Link>
          </article>
        </Section>
      </div>

      <Section className="py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-xs uppercase tracking-widest text-copper">Demo catalog</p><DemoBadge>SIMULATED</DemoBadge></div><h2 className="mt-2 text-4xl">Sample coffee listings</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Product names, roaster profiles, descriptions, stock and EUR prices are illustrative. This is not a live shop and does not accept real coffee orders.</p></div><Link to="/market" className="text-sm underline-offset-4 hover:underline">Browse demo catalog →</Link></div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{s.products.filter((p) => p.featured).map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </Section>

      <section className="bg-secondary/60 py-20">
        <Section className="grid items-center gap-12 md:grid-cols-2">
          <div className="aspect-[4/3] w-full rounded-lg bg-muted" aria-hidden="true" />
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-copper">Origins</p>
            <div className="flex flex-wrap items-center gap-2"><h2 className="mt-2 text-4xl">Illustrative coffee records.</h2><DemoBadge>NOT VERIFIED</DemoBadge></div>
            <p className="mt-4 text-muted-foreground">Explore example origins and lot metadata. Producer, farm, grading and custody details are sample data, not verified identities, certificates, physical inventory or provenance.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {["Colombia", "Ethiopia", "Kenya", "Brazil"].map((c) => <Link key={c} to="/market" search={{ country: c }} className="rounded-md border bg-card p-4 hover:border-forest"><p className="font-display text-lg">{c}</p><p className="text-xs text-muted-foreground">{s.products.filter((p) => p.country === c).length} coffees</p></Link>)}
            </div>
          </div>
        </Section>
      </section>

      <Section className="py-20">
        <div className="flex flex-wrap items-center gap-3"><h2 className="text-4xl">Sample roaster profiles</h2><DemoBadge>DEMO PROFILES</DemoBadge></div><p className="mt-2 text-sm text-muted-foreground">These profiles are illustrative and do not represent connected merchants or active storefronts.</p>
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
          <div className="mb-8">
            <h2 className="text-4xl">What works today — and what is still a demo</h2>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">The interface intentionally separates deployed Testnet interactions from local prototype screens. No Mainnet deployment, real-money trading or third-party security certification is claimed.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-lg border border-gain/35 bg-card p-6">
              <div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-2xl">NEAR Testnet integrations</h3><span className="rounded-full border border-gain/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gain">Testnet</span></div>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li><strong className="text-foreground">Perpetuals:</strong> on-chain contract interactions across three configured coffee markets; price inputs are synthetic and operator-controlled.</li>
                <li><strong className="text-foreground">Mini Swap:</strong> NEP-141 swaps through RHEA Testnet pools, subject to available liquidity.</li>
                <li><strong className="text-foreground">Oracle:</strong> separate read-only OutLayer telemetry; it does not power Perps execution.</li>
              </ul>
              <div className="mt-5 flex flex-wrap gap-4 text-sm"><Link to="/app/perps" className="underline-offset-4 hover:underline">Perpetuals</Link><Link to="/app/swap" className="underline-offset-4 hover:underline">RHEA Swap</Link><Link to="/app/oracle" className="underline-offset-4 hover:underline">Oracle</Link></div>
            </article>
            <article className="rounded-lg border bg-card p-6">
              <div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-2xl">Local prototype & roadmap</h3><DemoBadge>SIMULATED / PREVIEW</DemoBadge></div>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li><strong className="text-foreground">Marketplace, orders and roaster profiles:</strong> sample catalog and local demo state; no real checkout, merchant payouts or inventory.</li>
                <li><strong className="text-foreground">Coffee lots, Passport and Redeem:</strong> illustrative records and simulated actions; no verified physical custody or shipment.</li>
                <li><strong className="text-foreground">Vaults, staking, lending, governance, Admin and Roaster Portal:</strong> roadmap or UI previews, not deployed protocol services.</li>
              </ul>
              <div className="mt-5 flex flex-wrap gap-4 text-sm"><Link to="/app/docs" className="underline-offset-4 hover:underline">Implementation status</Link><Link to="/app/risk-center" className="underline-offset-4 hover:underline">Risk disclosures</Link></div>
            </article>
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
          <div className="absolute inset-0 -z-10 h-full w-full bg-muted" aria-hidden="true" />
          <div className="absolute inset-0 -z-10 bg-forest/80" />
          <p className="font-mono text-xs uppercase tracking-widest text-brass">For roasters</p>
          <h3 className="mt-2 text-3xl">Roaster portal preview.</h3>
          <p className="mt-3 text-sm text-cream/80">The current portal is a UI preview only. It does not onboard roasters, manage real inventory, process orders or issue payouts.</p>
          <Button asChild className="mt-6 bg-cream text-forest hover:bg-parchment"><Link to="/roaster/$section" params={{ section: "dashboard" }}>Explore preview</Link></Button>
        </div>
      </Section>
    </PublicShell>
  );
}
