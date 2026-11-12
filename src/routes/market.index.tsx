import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { PublicShell, Section } from "@/components/shell";
import { ProductCard } from "@/components/commerce";
import { Empty, PageHeader } from "@/components/kit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemo } from "@/lib/demo/store";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/market/")({
  validateSearch: z.object({ country: z.string().optional() }),
  head: () => seo("Coffee Marketplace", "Search specialty coffees by origin, roaster, variety, process, roast and flavour."),
  component: Market,
});

const ALL = "all";
function Market() {
  const s = useDemo();
  const search = Route.useSearch();
  const [q, setQ] = useState("");
  const [f, setF] = useState<Record<string, string>>({ country: search.country ?? ALL, roasterId: ALL, process: ALL, roast: ALL, format: ALL, variety: ALL, avail: ALL, price: ALL });
  const [sort, setSort] = useState("featured");
  const opts = (k: keyof (typeof s.products)[number]) => [...new Set(s.products.map((p) => String(p[k])))];
  const list = useMemo(() => {
    let r = s.products.filter((p) => p.status === "Live");
    if (q) r = r.filter((p) => [p.name, p.origin, p.country, p.variety, ...p.notes].join(" ").toLowerCase().includes(q.toLowerCase()));
    for (const k of ["country", "roasterId", "process", "roast", "format", "variety"] as const) if (f[k] !== ALL) r = r.filter((p) => p[k] === f[k]);
    if (f.avail === "in") r = r.filter((p) => p.stock > 0);
    if (f.price !== ALL) { const [a, b] = f.price.split("-").map(Number); r = r.filter((p) => p.price >= a && p.price <= b); }
    if (sort === "price-asc") r = [...r].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") r = [...r].sort((a, b) => b.price - a.price);
    if (sort === "featured") r = [...r].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    return r;
  }, [s.products, q, f, sort]);
  const Sel = ({ k, label, items, names }: { k: string; label: string; items: string[]; names?: Record<string, string> }) => (
    <Select value={f[k]} onValueChange={(v) => setF({ ...f, [k]: v })}>
      <SelectTrigger className="h-9 w-full text-xs" aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value={ALL}>All {label.toLowerCase()}</SelectItem>{items.map((i) => <SelectItem key={i} value={i}>{names?.[i] ?? i}</SelectItem>)}</SelectContent>
    </Select>
  );
  return (
    <PublicShell>
      <Section className="py-12">
        <p className="brand-eyebrow mb-2">Marketplace · demo inventory</p>
        <PageHeader title="Coffee from independent roasters" subtitle="Illustrative coffee listings and EUR prices. No real coffee orders or payments." />
        <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Input aria-label="Search coffee, origin or flavour" placeholder="Search coffee, origin, flavour…" value={q} onChange={(e) => setQ(e.target.value)} className="sm:col-span-2" />
          <Sel k="country" label="Countries" items={opts("country")} />
          <Sel k="roasterId" label="Roasters" items={s.roasters.map((r) => r.id)} names={Object.fromEntries(s.roasters.map((r) => [r.id, r.name]))} />
          <Sel k="process" label="Processes" items={opts("process")} />
          <Sel k="variety" label="Varieties" items={opts("variety")} />
          <Sel k="roast" label="Roasts" items={opts("roast")} />
          <Sel k="format" label="Formats" items={opts("format")} />
          <Sel k="price" label="Prices" items={["0-14", "14-19", "19-99"]} names={{ "0-14": "Under €14", "14-19": "€14–19", "19-99": "€19+" }} />
          <Sel k="avail" label="Availability" items={["in"]} names={{ in: "In stock only" }} />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span role="status" aria-live="polite">{list.length} coffees</span>
          <Select value={sort} onValueChange={setSort}><SelectTrigger aria-label="Sort coffees" className="h-9 w-44 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="featured">Featured</SelectItem><SelectItem value="price-asc">Price: low to high</SelectItem><SelectItem value="price-desc">Price: high to low</SelectItem></SelectContent></Select>
        </div>
        {list.length === 0 ? <Empty text="No coffees match these filters." action={<Button variant="outline" size="sm" onClick={() => { setQ(""); setF(Object.fromEntries(Object.keys(f).map((k) => [k, ALL]))); }}>Clear filters</Button>} /> : (
          <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        )}
      </Section>
    </PublicShell>
  );
}
