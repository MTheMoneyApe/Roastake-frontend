import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  ArabicaLiveMarketView,
  PerpsLiveMarketView,
  PreviewCoffeeMarketView,
  ThreeMarketPerpsIndex,
} from "@/components/perps/live-perps";
import { LivePositionsPanel } from "@/components/perps/positions-panel";
import { demo, useDemo } from "@/lib/demo/store";
import { candles, fmt, indexPrice, liqPrice, MARGIN_ASSETS, markPrice, positionPnl, priceOf, SPOT, usd, compact } from "@/lib/demo/calc";
import type { PerpOrder, PerpPosition } from "@/lib/demo/types";
import { MARKET_IMF_ARABICA, ORACLE_CONTRACT_ID } from "@/lib/oracle/config";
import { classifyDataClass, evaluateFreshness, formatUsdPerKg } from "@/lib/oracle/format";
import { useOracleSnapshot } from "@/lib/oracle/queries";
import { PERPS_CONTRACT_ID, resolveThreeMarketEntry } from "@/lib/perps/config";
import { usePerpsProtocolSnapshot, usePerpsTraderSnapshot } from "@/lib/perps/queries";
import { abbreviateAddress } from "@/lib/wallet/config";
import { useWalletHub } from "@/lib/wallet/context";
import { Bars, Candles, ConfirmButton, DataTable, DemoBadge, Donut, Empty, KV, MaturityBadge, PageHeader, Panel, Pill, Stat, Stats, statusTone } from "./kit";

const NOTE = "Synthetic index prices generated in your browser. No real orders, margin or settlement.";

function PerpsNearExecutionBanner() {
  const { hydrated, near, connectedAccounts, openHub } = useWalletHub();
  const nearConnected = hydrated && near.status === "connected" && Boolean(near.accountId) && !near.unsupportedNetwork;
  const nonNearConnected = hydrated
    ? connectedAccounts.filter((acc) => acc.ecosystem !== "near")
    : [];

  return (
    <section
      aria-label="NEAR Perpetuals execution context"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gain/40 bg-forest/20 px-4 py-3 text-xs"
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="gain">Primary Execution Network: NEAR Testnet</Pill>
          <MaturityBadge variant="testnet">LIVE CONTRACT · {PERPS_CONTRACT_ID}</MaturityBadge>
        </div>
        <p className="text-muted-foreground">
          {nearConnected && near.accountId ? (
            <>
              NEAR Testnet wallet{" "}
              <span className="font-mono text-foreground">{abbreviateAddress(near.accountId)}</span>{" "}
              connected for live Perpetuals execution on{" "}
              <span className="font-mono text-foreground">{PERPS_CONTRACT_ID}</span>.
            </>
          ) : nonNearConnected.length > 0 ? (
            <>
              Connected external/secondary account (
              <span className="font-mono text-foreground">
                {nonNearConnected.map((a) => `${a.ecosystemLabel}: ${a.abbreviatedAddress}`).join(", ")}
              </span>
              ) is for identity only — ROASTAKE Perpetuals executes on{" "}
              <strong className="text-foreground">NEAR Testnet</strong> (
              <span className="font-mono">{PERPS_CONTRACT_ID}</span>). Connect a NEAR Testnet
              wallet to trade.
            </>
          ) : (
            <>
              NEAR Testnet (<span className="font-mono">{PERPS_CONTRACT_ID}</span>) is the active
              execution network for ROASTAKE Perpetuals. Connect Meteor or HOT Connect to deposit
              Circle Testnet USDC and trade.
            </>
          )}
        </p>
      </div>

      {!nearConnected && (
        <Button type="button" size="sm" onClick={() => openHub("near")} className="min-h-8 shrink-0 gap-1.5 text-xs">
          <Sparkles className="size-3.5" aria-hidden="true" />
          <span>Connect NEAR Wallet</span>
        </Button>
      )}
    </section>
  );
}

function TickButton() {
  return <Button size="sm" variant="outline" onClick={() => demo.tick(1)}>Advance simulated clock</Button>;
}

function useImfReferenceSummary() {
  const query = useOracleSnapshot(ORACLE_CONTRACT_ID);
  const market = query.data?.marketStates[MARKET_IMF_ARABICA];
  const obs = market?.observation ?? null;
  const config = market?.config ?? null;
  const priceText = obs ? formatUsdPerKg(obs.price, obs.decimals, obs.unit) : null;
  const freshness = query.data
    ? evaluateFreshness(obs, config, Math.floor(query.data.fetchedAtMs / 1000))
    : null;
  const dataClass = obs ? classifyDataClass(obs.data_class) : null;

  return {
    isLoading: query.isPending,
    isError: query.isError,
    priceText,
    freshness,
    dataClass,
    periodAtSec: obs?.observed_at_sec ?? null,
  };
}

function PerpsPriceSourceStrip() {
  const ref = useImfReferenceSummary();

  return (
    <section
      aria-label="Perpetual price source and freshness"
      className="grid gap-3 rounded-lg border border-border bg-card/60 p-4 text-xs md:grid-cols-2"
    >
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-foreground">Chart &amp; Order Ticket Feed</span>
          <MaturityBadge variant="demo">DEMO · IN-BROWSER SYNTHETIC</MaturityBadge>
        </div>
        <p className="text-muted-foreground">
          Mark, index, funding and candlestick history are simulated locally in your browser via deterministic step ticks — not live orderbook or ICE Coffee C futures pricing.
        </p>
      </div>

      <div className="space-y-1.5 md:border-l md:border-border/70 md:pl-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">On-Chain Benchmark Reference</span>
            <MaturityBadge variant="testnet">TESTNET · RO</MaturityBadge>
          </div>
          <Link to="/app/oracle" className="text-[11px] font-medium text-primary hover:underline">
            Inspect Oracle &rarr;
          </Link>
        </div>
        <p className="text-muted-foreground">
          {ref.priceText ? (
            <>
              <span className="font-mono text-foreground">{MARKET_IMF_ARABICA}</span>:{" "}
              <span className="num font-medium text-foreground">{ref.priceText}</span> ·{" "}
              <span>{ref.freshness?.label ?? "Recorded"}</span> ·{" "}
              <span>{ref.dataClass?.shortLabel ?? "Monthly benchmark"}</span> (historical monthly benchmark, not used to mark synthetic perp positions).
            </>
          ) : ref.isError ? (
            <>NEAR Testnet RPC unavailable right now. Historical monthly IMF benchmark can be inspected on the Coffee Oracle page.</>
          ) : (
            <>Loading read-only NEAR Testnet IMF benchmark from {ORACLE_CONTRACT_ID}&hellip;</>
          )}
        </p>
      </div>
    </section>
  );
}

export function PerpsIndex() {
  const s = useDemo();
  const [showLegacyDemo, setShowLegacyDemo] = useState(false);

  return (
    <div className="space-y-6">
      <PerpsNearExecutionBanner />
      <ThreeMarketPerpsIndex />

      <Panel
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span>Legacy Simulated Orderbook Markets</span>
            <DemoBadge>OFF-CHAIN DEMO SANDBOX · ISOLATED</DemoBadge>
          </span>
        }
        actions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowLegacyDemo((v) => !v)}
          >
            {showLegacyDemo ? "Hide Simulated Sandbox" : `Show Simulated Markets (${s.perpMarkets.length})`}
          </Button>
        }
      >
        {!showLegacyDemo ? (
          <p className="text-xs text-muted-foreground">
            Isolated local browser simulation markets (`DemoState`) kept separate from real NEAR
            Testnet Circle USDC collateral and `perps-v1.roastake-dev-mta.testnet`. Expand to
            inspect prototype charts.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <TickButton />
            </div>
            <DataTable
              rowKey={(m) => m.id}
              rows={s.perpMarkets}
              cols={[
                {
                  key: "m",
                  label: "Market (Demo)",
                  render: (m) => (
                    <Link to="/app/perps/$market" params={{ market: m.id }} className="font-medium hover:underline">
                      {m.id}
                      <span className="ml-2 text-xs text-muted-foreground">{m.name}</span>
                    </Link>
                  ),
                },
                { key: "p", label: "Mark (Demo)", align: "right", render: (m) => <span className="num">{fmt(markPrice(s, m.id), 3)}</span> },
                { key: "f", label: "Funding / 8h (Demo)", align: "right", render: (m) => <span className={m.funding >= 0 ? "num text-gain" : "num text-loss"}>{(m.funding * 100).toFixed(3)}%</span> },
                { key: "oi", label: "Simulated OI", align: "right", render: (m) => <span className="num">{compact(m.oi)}</span> },
                { key: "s", label: "Mode", align: "right", render: (m) => (m.paused ? <Pill tone="loss">Paused (demo)</Pill> : <MaturityBadge variant="demo">Demo</MaturityBadge>) },
              ]}
            />
          </div>
        )}
      </Panel>
    </div>
  );
}

export function PerpMarketPage({ id }: { id: string }) {
  const threeMarket = resolveThreeMarketEntry(id);
  if (threeMarket?.status === "configured_testnet") {
    return (
      <div className="space-y-6">
        <PerpsNearExecutionBanner />
        <PerpsLiveMarketView marketEntry={threeMarket} />
      </div>
    );
  }
  if (threeMarket?.status === "preview") {
    return <PreviewCoffeeMarketView entry={threeMarket} />;
  }

  return <LegacySimulatedPerpMarketPage id={id} />;
}

function LegacySimulatedPerpMarketPage({ id }: { id: string }) {
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
  const estLiq =
    price > 0 && n > 0 && marginUsd > 0
      ? liqPrice({
          id: "preview",
          market: id,
          side,
          size: n,
          entry: price,
          leverage: lev,
          margin: marginUsd,
          marginAsset: asset,
          mode: "Isolated",
          opened: "",
        })
      : 0;
  const k = candles(m.base, s.perpMarkets.indexOf(m) + 1 + s.tick);
  const submit = () => demo.perpOrder({ market: id, side, type, size: n, leverage: lev, marginAsset: asset, mode: "Isolated", limit: type === "Limit" ? price : undefined });
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${m.id} perpetual`}
        subtitle={`${m.name} · ${NOTE}`}
        crumbs={[{ label: "Trade" }, { label: "Perpetuals", to: "/app/perps" }]}
        actions={<TickButton />}
      />
      <PerpsNearExecutionBanner />
      <PerpsPriceSourceStrip />
      <Stats>
        <Stat label="Simulated Mark (Demo)" value={fmt(mark, 3)} sub="Browser step price" />
        <Stat label="Simulated Index (Demo)" value={fmt(indexPrice(s, id), 3)} sub="Synthetic benchmark" />
        <Stat label="Simulated Funding / 8h" value={`${(m.funding * 100).toFixed(3)}%`} tone={m.funding >= 0 ? "gain" : "loss"} sub="Simulated rate" />
        <Stat label="Simulated Open Interest" value={usd(m.oi, 0)} sub="Demo state only" />
      </Stats>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel
          title="Price Chart (Simulated Demo)"
          actions={<MaturityBadge variant="demo">DEMO</MaturityBadge>}
        >
          <Candles data={k} />
        </Panel>
        <Panel title="Order ticket (Simulated)" actions={<MaturityBadge variant="demo">DEMO</MaturityBadge>}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">{(["Long", "Short"] as const).map((x) => <Button key={x} variant={side === x ? "default" : "outline"} onClick={() => setSide(x)}>{x}</Button>)}</div>
            <div className="grid grid-cols-2 gap-2">{(["Market", "Limit"] as const).map((x) => <Button key={x} size="sm" variant={type === x ? "secondary" : "ghost"} onClick={() => setType(x)}>{x}</Button>)}</div>
            <div><Label htmlFor="sz">Size (index units)</Label><Input id="sz" className="num" inputMode="decimal" value={size} onChange={(e) => setSize(e.target.value)} /></div>
            {type === "Limit" && <div><Label htmlFor="lp">Limit price</Label><Input id="lp" className="num" inputMode="decimal" placeholder={fmt(mark, 3)} value={limit} onChange={(e) => setLimit(e.target.value)} /></div>}
            <div><Label>Leverage: {lev}×</Label><Slider className="mt-2" min={1} max={20} step={1} value={[lev]} onValueChange={(v) => setLev(v[0])} aria-label="Leverage" /></div>
            <div><Label>Margin asset (demo balance)</Label>
              <Select value={asset} onValueChange={setAsset}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MARGIN_ASSETS.map((a) => <SelectItem key={a} value={a}>{a} · bal {fmt(s.balances[a] ?? 0, 2)}</SelectItem>)}</SelectContent></Select></div>
            <KV rows={[
              ["Notional (Demo)", usd(price * n)],
              ["Margin required", `${usd(marginUsd)} ≈ ${fmt(marginUsd / (SPOT[asset] ?? 1), 4)} ${asset}`],
              ["Taker fee (Demo)", usd(fee)],
              ["Funding / 8h (Demo)", `${m.funding >= 0 ? "+" : ""}${(m.funding * 100).toFixed(3)}%`],
              ["Est. liquidation (Demo)", estLiq > 0 && Number.isFinite(estLiq) ? fmt(estLiq, 3) : "—"],
            ]} />
            <Button className="w-full" disabled={!n || !price || m.paused} onClick={submit}>{m.paused ? "Market paused (demo)" : `Simulate ${type.toLowerCase()} ${side.toLowerCase()}`}</Button>
            <p className="text-[11px] text-muted-foreground">Limit orders lock simulated margin and the demo fee locally. Cancelling returns simulated margin in the same asset; the demo fee is kept. No wallet signature or on-chain transaction occurs.</p>
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
      <Panel title="Open positions (Simulated)" bodyClass="p-0" actions={<MaturityBadge variant="demo">DEMO</MaturityBadge>}>
        <DataTable<PerpPosition> rowKey={(p) => p.id} rows={pos} empty="No open simulated positions. Open one from a perpetual market." cols={[
          { key: "m", label: "Market", render: (p) => <span>{p.market} <Pill tone={p.side === "Long" ? "gain" : "loss"}>{p.side} {p.leverage}×</Pill></span> },
          { key: "sz", label: "Size", align: "right", render: (p) => <span className="num">{fmt(p.size, 2)}</span> },
          { key: "e", label: "Entry / Mark", align: "right", render: (p) => <span className="num">{fmt(p.entry, 3)} / {fmt(markPrice(s, p.market), 3)}</span> },
          { key: "mg", label: "Margin", align: "right", render: (p) => <span className="num">{usd(p.margin)}</span> },
          { key: "l", label: "Liq.", align: "right", render: (p) => <span className="num text-copper">{fmt(liqPrice(p), 3)}</span> },
          { key: "pnl", label: "PnL", align: "right", render: (p) => { const v = positionPnl(s, p); return <span className={v >= 0 ? "num text-gain" : "num text-loss"}>{v >= 0 ? "+" : ""}{usd(v)}</span>; } },
          { key: "a", label: "", align: "right", render: (p) => <ConfirmButton size="sm" variant="outline" label="Close" title={`Close ${p.market} ${p.side}`} body={`Simulated close at mark. Estimated PnL ${usd(positionPnl(s, p))}, credited in USDC.`} onConfirm={() => demo.closePosition(p.id)} /> },
        ]} />
      </Panel>
      <Panel title="Order history (Simulated)" bodyClass="p-0" actions={<MaturityBadge variant="demo">DEMO</MaturityBadge>}>
        <DataTable<PerpOrder> rowKey={(o) => o.id} rows={orders.slice(0, 20)} empty="No simulated orders yet." cols={[
          { key: "d", label: "Date", render: (o) => <span className="num text-xs">{o.date}</span> },
          { key: "m", label: "Order", render: (o) => `${o.type} ${o.side} ${o.market}${o.leverage ? ` · ${o.leverage}×` : ""}` },
          { key: "sz", label: "Size @ price", align: "right", render: (o) => <span className="num">{fmt(o.size, 2)} @ {fmt(o.price, 3)}</span> },
          { key: "st", label: "Status", align: "right", render: (o) => <Pill tone={statusTone(o.status)}>{o.status}</Pill> },
          { key: "a", label: "", align: "right", render: (o) => o.status === "Open" ? <Button size="sm" variant="ghost" onClick={() => demo.cancelOrder(o.id)}>Cancel</Button> : o.pnl != null ? <span className="num text-xs">{usd(o.pnl)}</span> : null },
        ]} />
      </Panel>
      <Panel
        title="Transaction history (NEAR Testnet)"
        actions={<MaturityBadge variant="testnet">ON-CHAIN PENDING</MaturityBadge>}
      >
        <Empty
          text="This legacy demo market has no on-chain transactions. Live NEAR Testnet Perpetuals are available separately in the three-market hub using perps-v1.roastake-dev-mta.testnet. Simulated fills above remain local to this browser."
          action={
            <Button size="sm" variant="outline" asChild>
              <Link to="/app/wallet">Inspect Wallet Hub</Link>
            </Button>
          }
        />
      </Panel>
    </>
  );
}

export function PositionsPage() {
  const s = useDemo();
  const { near } = useWalletHub();
  const { data: protocol } = usePerpsProtocolSnapshot();
  const { data: trader, isLoading: traderLoading } = usePerpsTraderSnapshot(
    near.status === "connected" && !near.unsupportedNetwork ? near.accountId : null,
  );
  const pnl = s.perpPositions.reduce((a, p) => a + positionPnl(s, p), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        demo={false}
        title="Positions"
        subtitle={`Live NEAR Testnet Perpetuals positions (${PERPS_CONTRACT_ID}) above; isolated simulated local positions below.`}
        crumbs={[{ label: "Trade" }]}
        actions={
          <Button size="sm" asChild>
            <Link to="/app/perps">Markets Hub</Link>
          </Button>
        }
      />

      <LivePositionsPanel
        protocol={protocol}
        trader={trader}
        traderLoading={traderLoading}
      />

      <Panel
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span>Simulated Local Perpetual Positions</span>
            <DemoBadge>DEMO ONLY · ISOLATED FROM TESTNET USDC</DemoBadge>
          </span>
        }
        actions={<TickButton />}
      >
        <div className="space-y-4">
          <Stats cols={3}>
            <Stat label="Simulated open positions" value={s.perpPositions.length} />
            <Stat label="Simulated margin locked" value={usd(s.perpPositions.reduce((a, p) => a + p.margin, 0))} />
            <Stat label="Simulated unrealized PnL" value={usd(pnl)} tone={pnl >= 0 ? "gain" : "loss"} sub={NOTE} />
          </Stats>
          <PositionsTables />
        </div>
      </Panel>
    </div>
  );
}

export function SpotMarketsPage() {
  const s = useDemo();
  const tokens = s.lots.map((l) => l.id);
  return (
    <div className="space-y-6">
      <PageHeader title="Spot markets" subtitle="Demo reference prices for coffee tokens. Trade them through the simulated swap." crumbs={[{ label: "Trade" }]} actions={<Button size="sm" asChild><Link to="/app/swap">Open swap</Link></Button>} />
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
      <PageHeader title="Market analytics" subtitle="Computed from simulated demo markets only. Not market data." crumbs={[{ label: "Trade" }]} />
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
