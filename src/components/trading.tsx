import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { demo, useDemo } from "@/lib/demo/store";
import { candles, fmt, indexPrice, liqPrice, MARGIN_ASSETS, markPrice, positionPnl, priceOf, SPOT, usd, compact } from "@/lib/demo/calc";
import type { PerpOrder, PerpPosition } from "@/lib/demo/types";
import { Bars, Candles, ConfirmButton, DataTable, Donut, Empty, KV, PageHeader, Panel, Pill, Stat, Stats, statusTone } from "./kit";

const NOTE = "Synthetic index prices generated in your browser. No real orders, margin or settlement.";

function TickButton() {
  return <Button size="sm" variant="outline" onClick={() => demo.tick(1)}>Advance simulated clock</Button>;
}

export function PerpsIndex() {
  const s = useDemo();
  return (
    <div className="space-y-6">
      <PageHeader title="Perpetuals" subtitle={NOTE} crumbs={[{ label: "Trading" }]} actions={<TickButton />} />
      <Stats>
        <Stat label="Markets" value={s.perpMarkets.length} sub="Coffee price indices (synthetic)" />
        <Stat label="Open interest" value={usd(s.perpMarkets.reduce((a, m) => a + m.oi, 0), 0)} sub="Simulated" />
        <Stat label="Your positions" value={s.perpPositions.length} />
        <Stat label="Open orders" value={s.perpOrders.filter((o) => o.status === "Open").length} />
      </Stats>
      <Panel title="Markets" bodyClass="p-0">
        <DataTable rowKey={(m) => m.id} rows={s.perpMarkets} cols={[
          { key: "m", label: "Market", render: (m) => <Link to="/app/perps/$market" params={{ market: m.id }} className="font-medium hover:underline">{m.id}<span className="ml-2 text-xs text-muted-foreground">{m.name}</span></Link> },
          { key: "p", label: "Mark", align: "right", render: (m) => <span className="num">{fmt(markPrice(s, m.id), 3)}</span> },
          { key: "f", label: "Funding / 8h", align: "right", render: (m) => <span className={m.funding >= 0 ? "num text-gain" : "num text-loss"}>{(m.funding * 100).toFixed(3)}%</span> },
          { key: "oi", label: "OI", align: "right", render: (m) => <span className="num">{compact(m.oi)}</span> },
          { key: "s", label: "Status", align: "right", render: (m) => <Pill tone={m.paused ? "loss" : "gain"}>{m.paused ? "Paused" : "Live (demo)"}</Pill> },
        ]} />
      </Panel>
    </div>
  );
}

export function PerpMarketPage({ id }: { id: string }) {
  const s = useDemo();
  const m = s.perpMarkets.find((x) => x.id === id);
  const [side, setSide] = useState<"Long" | "Short">("Long");
  const [type, setType] = useState<"Market" | "Limit">("Market");
  const [size, setSize] = useState("100");
  const [limit, setLimit] = useState("");
  const [lev, setLev] = useState(3);
  const [asset, setAsset] = useState("USDC");
  if (!m) return <Empty text="This market does not exist in the demo." action={<Button asChild><Link to="/app/perps">All markets</Link></Button>} />;
  const mark = markPrice(s, id);
  const n = parseFloat(size) || 0;
  const price = type === "Market" ? mark : parseFloat(limit) || 0;
  const marginUsd = (price * n) / lev;
  const fee = price * n * (s.fees["Perps taker fee %"] / 100);
  const k = candles(m.base, s.perpMarkets.indexOf(m) + 1 + s.tick);
  const submit = () => demo.perpOrder({ market: id, side, type, size: n, leverage: lev, marginAsset: asset, mode: "Isolated", limit: type === "Limit" ? price : undefined });
  return (
    <div className="space-y-6">
      <PageHeader title={`${m.id} perpetual`} subtitle={`${m.name} · ${NOTE}`} crumbs={[{ label: "Perpetuals", to: "/app/perps" }]} actions={<TickButton />} />
      <Stats>
        <Stat label="Mark" value={fmt(mark, 3)} /><Stat label="Index" value={fmt(indexPrice(s, id), 3)} />
        <Stat label="Funding / 8h" value={`${(m.funding * 100).toFixed(3)}%`} tone={m.funding >= 0 ? "gain" : "loss"} />
        <Stat label="Open interest" value={usd(m.oi, 0)} />
      </Stats>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel title="Price (synthetic)"><Candles data={k} /></Panel>
        <Panel title="Order ticket">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">{(["Long", "Short"] as const).map((x) => <Button key={x} variant={side === x ? "default" : "outline"} onClick={() => setSide(x)}>{x}</Button>)}</div>
            <div className="grid grid-cols-2 gap-2">{(["Market", "Limit"] as const).map((x) => <Button key={x} size="sm" variant={type === x ? "secondary" : "ghost"} onClick={() => setType(x)}>{x}</Button>)}</div>
            <div><Label htmlFor="sz">Size (index units)</Label><Input id="sz" className="num" inputMode="decimal" value={size} onChange={(e) => setSize(e.target.value)} /></div>
            {type === "Limit" && <div><Label htmlFor="lp">Limit price</Label><Input id="lp" className="num" inputMode="decimal" placeholder={fmt(mark, 3)} value={limit} onChange={(e) => setLimit(e.target.value)} /></div>}
            <div><Label>Leverage: {lev}×</Label><Slider className="mt-2" min={1} max={20} step={1} value={[lev]} onValueChange={(v) => setLev(v[0])} aria-label="Leverage" /></div>
            <div><Label>Margin asset</Label>
              <Select value={asset} onValueChange={setAsset}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MARGIN_ASSETS.map((a) => <SelectItem key={a} value={a}>{a} · bal {fmt(s.balances[a] ?? 0, 2)}</SelectItem>)}</SelectContent></Select></div>
            <KV rows={[["Notional", usd(price * n)], ["Margin", `${usd(marginUsd)} ≈ ${fmt(marginUsd / (SPOT[asset] ?? 1), 4)} ${asset}`], ["Taker fee", usd(fee)]]} />
            <Button className="w-full" disabled={!n || !price || m.paused} onClick={submit}>{m.paused ? "Market paused" : `Simulate ${type.toLowerCase()} ${side.toLowerCase()}`}</Button>
            <p className="text-[11px] text-muted-foreground">Limit orders lock margin and the fee now. Cancelling returns the margin in the same asset; the fee is kept.</p>
          </div>
        </Panel>
      </div>
      <PositionsTables filter={id} />
    </div>
  );
}

export function PositionsTables({ filter }: { filter?: string }) {
  const s = useDemo();
  const pos = s.perpPositions.filter((p) => !filter || p.market === filter);
  const orders = s.perpOrders.filter((o) => !filter || o.market === filter);
  return (
    <>
      <Panel title="Open positions" bodyClass="p-0">
        <DataTable<PerpPosition> rowKey={(p) => p.id} rows={pos} empty="No open positions. Open one from a perpetual market." cols={[
          { key: "m", label: "Market", render: (p) => <span>{p.market} <Pill tone={p.side === "Long" ? "gain" : "loss"}>{p.side} {p.leverage}×</Pill></span> },
          { key: "sz", label: "Size", align: "right", render: (p) => <span className="num">{fmt(p.size, 2)}</span> },
          { key: "e", label: "Entry / Mark", align: "right", render: (p) => <span className="num">{fmt(p.entry, 3)} / {fmt(markPrice(s, p.market), 3)}</span> },
          { key: "mg", label: "Margin", align: "right", render: (p) => <span className="num">{usd(p.margin)}</span> },
          { key: "l", label: "Liq.", align: "right", render: (p) => <span className="num text-copper">{fmt(liqPrice(p), 3)}</span> },
          { key: "pnl", label: "PnL", align: "right", render: (p) => { const v = positionPnl(s, p); return <span className={v >= 0 ? "num text-gain" : "num text-loss"}>{v >= 0 ? "+" : ""}{usd(v)}</span>; } },
          { key: "a", label: "", align: "right", render: (p) => <ConfirmButton size="sm" variant="outline" label="Close" title={`Close ${p.market} ${p.side}`} body={`Simulated close at mark. Estimated PnL ${usd(positionPnl(s, p))}, credited in USDC.`} onConfirm={() => demo.closePosition(p.id)} /> },
        ]} />
      </Panel>
      <Panel title="Order history" bodyClass="p-0">
        <DataTable<PerpOrder> rowKey={(o) => o.id} rows={orders.slice(0, 20)} empty="No orders yet." cols={[
          { key: "d", label: "Date", render: (o) => <span className="num text-xs">{o.date}</span> },
          { key: "m", label: "Order", render: (o) => `${o.type} ${o.side} ${o.market}${o.leverage ? ` · ${o.leverage}×` : ""}` },
          { key: "sz", label: "Size @ price", align: "right", render: (o) => <span className="num">{fmt(o.size, 2)} @ {fmt(o.price, 3)}</span> },
          { key: "st", label: "Status", align: "right", render: (o) => <Pill tone={statusTone(o.status)}>{o.status}</Pill> },
          { key: "a", label: "", align: "right", render: (o) => o.status === "Open" ? <Button size="sm" variant="ghost" onClick={() => demo.cancelOrder(o.id)}>Cancel</Button> : o.pnl != null ? <span className="num text-xs">{usd(o.pnl)}</span> : null },
        ]} />
      </Panel>
    </>
  );
}

export function PositionsPage() {
  const s = useDemo();
  const pnl = s.perpPositions.reduce((a, p) => a + positionPnl(s, p), 0);
  return (
    <div className="space-y-6">
      <PageHeader title="Positions" subtitle={NOTE} crumbs={[{ label: "Trading" }]} actions={<><TickButton /><Button size="sm" asChild><Link to="/app/perps">Markets</Link></Button></>} />
      <Stats cols={3}>
        <Stat label="Open positions" value={s.perpPositions.length} />
        <Stat label="Margin locked" value={usd(s.perpPositions.reduce((a, p) => a + p.margin, 0))} />
        <Stat label="Unrealized PnL" value={usd(pnl)} tone={pnl >= 0 ? "gain" : "loss"} sub="Simulated, not guaranteed" />
      </Stats>
      <PositionsTables />
    </div>
  );
}

export function SpotMarketsPage() {
  const s = useDemo();
  const tokens = s.lots.map((l) => l.id);
  return (
    <div className="space-y-6">
      <PageHeader title="Spot markets" subtitle="Demo reference prices for coffee tokens. Trade them through the simulated swap." crumbs={[{ label: "Trading" }]} actions={<Button size="sm" asChild><Link to="/app/swap">Open swap</Link></Button>} />
      <Panel title="Coffee tokens" bodyClass="p-0">
        <DataTable rowKey={(t) => t} rows={tokens} cols={[
          { key: "t", label: "Token", render: (t) => <Link to="/app/assets/$id" params={{ id: t }} className="font-medium hover:underline">{t}</Link> },
          { key: "p", label: "Demo price", align: "right", render: (t) => <span className="num">{usd(priceOf(s, t), 3)}</span> },
          { key: "b", label: "Your balance", align: "right", render: (t) => <span className="num">{fmt(s.balances[t] ?? 0, 3)}</span> },
          { key: "a", label: "", align: "right", render: () => <Button size="sm" variant="outline" asChild><Link to="/app/swap">Swap</Link></Button> },
        ]} />
      </Panel>
    </div>
  );
}

export function MarketAnalyticsPage() {
  const s = useDemo();
  const oi = s.perpMarkets.map((m) => ({ name: m.id, value: Math.round(m.oi) }));
  const vol = s.perpMarkets.map((m) => ({ m: m.id, vol: Math.round(m.vol / 1000) }));
  return (
    <div className="space-y-6">
      <PageHeader title="Market analytics" subtitle="Computed from simulated demo markets only. Not market data." crumbs={[{ label: "Trading" }]} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Open interest share">{oi.length ? <Donut data={oi} /> : <Empty text="No markets" />}</Panel>
        <Panel title="Simulated 24h volume (k USD)"><Bars data={vol} keys={[{ k: "vol", c: "var(--chart-1)" }]} /></Panel>
      </div>
      <Panel title="Funding (8h)" bodyClass="p-0">
        <DataTable rowKey={(m) => m.id} rows={s.perpMarkets} cols={[
          { key: "m", label: "Market", render: (m) => m.name },
          { key: "f", label: "Funding", align: "right", render: (m) => <span className="num">{(m.funding * 100).toFixed(3)}%</span> },
          { key: "mk", label: "Mark", align: "right", render: (m) => <span className="num">{fmt(markPrice(s, m.id), 3)}</span> },
        ]} />
      </Panel>
    </div>
  );
}
