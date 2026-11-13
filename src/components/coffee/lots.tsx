import { Link } from "@tanstack/react-router";
import { LotJourney } from "@/components/coffee/lot-journey";
import { useId, useState } from "react";
import { BookOpen, ArrowRight, Wheat, Coffee } from "lucide-react";
import { useDemo } from "@/lib/demo/store";
import { fmt, lotAccounting } from "@/lib/demo/calc";
import type { CoffeeLot } from "@/lib/demo/types";
import { DemoBadge, Empty, KV, PageHeader, Pill } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LotSelect({
  value,
  onChange,
  lots,
  label = "Coffee lot",
}: {
  value: string;
  onChange: (v: string) => void;
  lots: CoffeeLot[];
  label?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} aria-label={label} className="w-full">
          <SelectValue placeholder="Select a lot" />
        </SelectTrigger>
        <SelectContent>
          {lots.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              {l.id} · {l.origin}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
export function LotList({
  compact = false,
  query = "",
  kind = "All",
}: {
  compact?: boolean;
  query?: string;
  kind?: string;
}) {
  const s = useDemo();
  const lots = s.lots.filter(
    (l) =>
      (kind === "All" || l.kind === kind) &&
      `${l.id} ${l.origin} ${l.country} ${l.producer}`.toLowerCase().includes(query.toLowerCase()),
  );
  if (!lots.length)
    return <Empty text="No coffee lots match. Clear the search or choose all classifications." />;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {lots.map((l) => (
        <article key={l.id} className="brand-surface min-w-0 p-4">
          <DemoBadge>ILLUSTRATIVE LOT · NOT VERIFIED</DemoBadge>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 text-xs text-copper">
              {l.kind === "GCT" ? (
                <Wheat className="size-4 shrink-0" aria-hidden="true" />
              ) : (
                <Coffee className="size-4 shrink-0" aria-hidden="true" />
              )}
              {l.country} · {l.origin}
            </div>
            <Pill tone={l.paused ? "warn" : "info"}>
              {l.paused ? "Paused" : l.kind === "GCT" ? "Green · GCT" : "Roasted · RCT"}
            </Pill>
          </div>
          <Link
            to="/app/assets/$id"
            params={{ id: l.id }}
            className="mt-2 block rounded-sm font-display text-xl hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {l.name}
          </Link>
          <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{l.id}</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            {[
              ["Token supply", `${fmt(l.supply)} tokens`],
              ["Illustrative physical quantity", `${fmt(l.physicalKg)} kg`],
              ["Encumbered", `${fmt(l.encumbered)} kg`],
              ["Redemption reserves", `${fmt(l.reservedRedemption)} kg`],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="num mt-1 break-words">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 border-t pt-3 text-xs">
            <p>{l.grade}</p>
            <p className="mt-1 text-muted-foreground">
              {l.custodian} · {l.warehouse}
            </p>
            <p className="mt-1 text-muted-foreground">
              Traceability:{" "}
              {l.certificates.length ? "demo documents recorded" : "documents missing"} · custody
              not verified
            </p>
            {!compact && (
              <p className="mt-2">
                {fmt(lotAccounting(l).available)} kg demo available ·{" "}
                {fmt(lotAccounting(l).unissued)} kg unissued
              </p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/app/assets/$id" params={{ id: l.id }}>
                Inspect lot <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/coffee-passport" search={{ lot: l.id }}>
                <BookOpen />
                Passport
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
export function AssetExplorer() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("All");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Coffee assets"
        subtitle="Illustrative lot-specific token records. No verified physical coffee backing, custody, shipment or real-world redemption; all inventory fields are demo examples."
        crumbs={[{ label: "Dashboard", to: "/app/dashboard" }, { label: "Coffee assets" }]}
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          aria-label="Search lots"
          placeholder="Search origin, producer or lot…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger aria-label="Classification" className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["All", "GCT", "RCT"].map((k) => (
              <SelectItem key={k} value={k}>
                {k === "All"
                  ? "All coffee"
                  : k === "GCT"
                    ? "Green coffee · GCT"
                    : "Roasted coffee · RCT"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        1 GCT = 1 recorded kg green coffee. 1 RCT = 1 recorded kg roasted coffee. Demo token supply
        is an accounting claim in the simulation, not additional physical mass or verified backing.
      </p>
      <LotList query={q} kind={kind} />
    </div>
  );
}
export function LotDetail({ id, passport = false }: { id: string; passport?: boolean }) {
  const s = useDemo();
  const l = s.lots.find((l) => l.id === id);
  if (!l)
    return (
      <Empty
        text="This lot is unavailable. Choose another coffee asset."
        action={
          <Button asChild>
            <Link to="/app/assets">View coffee assets</Link>
          </Button>
        }
      />
    );
  const a = lotAccounting(l);
  const parent = s.lots.find((x) => x.id === l.parentLot);
  const child = s.lots.find((x) => x.parentLot === l.id);
  const products = s.products.filter((p) => p.lotId === l.id);
  return (
    <div className="space-y-7">
      <PageHeader
        title={passport ? "Coffee Passport" : l.name}
        subtitle={`${l.id} · ${l.origin}, ${l.country}`}
        crumbs={[
          { label: "Dashboard", to: "/app/dashboard" },
          { label: "Coffee assets", to: "/app/assets" },
          { label: passport ? "Passport" : "Lot details" },
        ]}
        actions={<Pill>{l.kind === "GCT" ? "Green coffee · GCT" : "Roasted coffee · RCT"}</Pill>}
      />
      <div
        role="note"
        aria-label="Coffee passport demonstration data"
        className="rounded-lg border border-brass/40 bg-brass/5 p-4"
      >
        <DemoBadge>DEMO FIXTURE · NOT VERIFIED</DemoBadge>
        <p className="mt-2 text-sm text-muted-foreground">
          Every field on this passport — producer, farm, harvest, grades, quantities, custodian,
          warehouse and history — is illustrative sample data. ROASTAKE is not connected to producer
          identity checks, warehouse systems, custody attestations or verified certificates. Nothing
          here proves that physical coffee exists or is held for these tokens.
        </p>
      </div>
      <LotJourney lot={l} state={s} />
      <div className="grid gap-8 md:grid-cols-2">
        <section className="min-w-0">
          <h2 className="brand-section-title mb-3">Illustrative origin records</h2>
          <KV
            rows={[
              ["Lot", l.id],
              ["Producer", l.producer],
              ["Farm / station", l.farm],
              ["Origin", `${l.origin}, ${l.country}`],
              ["Harvest", l.harvest],
              ["Variety", l.variety],
              ["Processing", l.process],
              ["Altitude", l.altitude],
              ["Quality grade", l.grade],
              [
                "Traceability status",
                l.certificates.length ? "Demo records present · not verified" : "Documents missing",
              ],
            ]}
          />
        </section>
        <section className="min-w-0">
          <h2 className="brand-section-title mb-3">Simulated token and inventory ledger</h2>
          <KV
            rows={[
              ["Token unit", `1 ${l.kind} = 1 recorded kg of this lot`],
              ["Token supply", `${fmt(l.supply)} tokens`],
              ["Illustrative physical quantity", `${fmt(l.physicalKg)} kg`],
              ["Demo available quantity", `${fmt(a.available)} kg`],
              ["Encumbered", `${fmt(l.encumbered)} kg`],
              ["Redemption reserves", `${fmt(l.reservedRedemption)} kg`],
              ["Unissued physical", `${fmt(a.unissued)} kg`],
              ["Record shortfall", `${fmt(a.shortfall)} kg`],
              ["Your wallet", `${fmt(s.balances[l.id] ?? 0)} tokens`],
              ["Demo custodian", l.custodian],
              ["Demo warehouse", l.warehouse],
            ]}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Available = physical − encumbered − reserved. Unissued = physical − reserved − supply.
            These overlap conceptually and must not be added. Encumbrances restrict use; they are
            not extra coffee. Redemption reserves represent already-burned tokens and reduce
            physical availability, not token supply. These are browser-only examples, not audited
            warehouse records or real redeemable balances.
          </p>
        </section>
      </div>
      <section className="border-t pt-5">
        <h2 className="brand-section-title">Coffee lineage</h2>
        {l.kind === "GCT" ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Recorded roast yield:{" "}
            {l.roastYield == null ? "not recorded" : `${fmt(l.roastYield * 100)}%`}. Output and net
            tokens are lower than input after roast loss and fees.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Roasted mass is recorded separately from the remaining green lot.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {[parent, child]
            .filter((x): x is CoffeeLot => !!x)
            .map((x) => (
              <Button key={x.id} asChild variant="outline" size="sm">
                <Link to="/app/assets/$id" params={{ id: x.id }}>
                  {x.kind} · {x.origin}
                  <ArrowRight />
                </Link>
              </Button>
            ))}
        </div>
      </section>
      <section className="border-t pt-5">
        <h2 className="brand-section-title mb-3">Recorded documents</h2>
        {l.certificates.length ? (
          <ul className="space-y-2 text-sm">
            {l.certificates.map((c) => (
              <li key={c} className="flex flex-wrap items-center gap-2">
                <BookOpen className="size-4 text-sage" />
                {c}
                <DemoBadge>DEMO DOCUMENT · NOT VERIFIED</DemoBadge>
                <span className="text-xs text-muted-foreground">
                  Source: seeded demo record · reference name only · no file supplied
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            <DemoBadge>MISSING</DemoBadge> No documents supplied for this demo record.
          </p>
        )}
      </section>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/app/coffee-passport" search={{ lot: l.id }}>
            Coffee Passport
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/app/swap">Open separate RHEA Testnet swap</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={l.kind === "GCT" ? "/app/roast" : "/app/redeem"} search={{ lot: l.id }}>
            {l.kind === "GCT" ? "Simulate roasting" : "Simulate redemption"}
          </Link>
        </Button>
        {products.map((p) => (
          <Button key={p.id} asChild variant="outline">
            <Link to="/market/$id" params={{ id: p.id }}>
              Shop {p.name}
            </Link>
          </Button>
        ))}
      </div>
      <section className="border-t pt-5">
        <h2 className="brand-section-title mb-3">Lot history</h2>
        {s.events
          .filter((e) => e.lotId === l.id)
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((e) => (
            <div key={e.id} className="border-b py-3 text-sm">
              <p>
                {e.type === "Audit" ? "Simulated record" : e.type} · {fmt(e.qty)} tokens{" "}
                <DemoBadge />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {e.date} · {e.note}
              </p>
            </div>
          ))}
      </section>
    </div>
  );
}
