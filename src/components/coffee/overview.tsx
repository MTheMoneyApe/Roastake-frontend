import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BookOpen,
  ChartCandlestick,
  Coffee,
  Flame,
  Package,
  Repeat,
  ShoppingBag,
  Sparkles,
  Wallet,
  Wheat,
} from "lucide-react";
import { useDemo } from "@/lib/demo/store";
import { coffeeActivity, coffeeOverview, fmt, portfolio, usd } from "@/lib/demo/calc";
import { DemoBadge, Empty, MaturityBadge, PageHeader, Pill, Stat, Stats } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { MARKET_IMF_ARABICA, ORACLE_CONTRACT_ID } from "@/lib/oracle/config";
import { formatFixedPoint, formatUsdPerKg } from "@/lib/oracle/format";
import { useOracleSnapshot } from "@/lib/oracle/queries";
import { MARKET_ARABICA_URL_SLUG, PERPS_CONTRACT_ID } from "@/lib/perps/config";
import { evaluatePerpsOracleStatus, formatUsdE8 } from "@/lib/perps/math";
import { usePerpsProtocolSnapshot, usePerpsTraderSnapshot } from "@/lib/perps/queries";
import { abbreviateAddress } from "@/lib/wallet/config";
import { useWalletHub } from "@/lib/wallet/context";
import { SimulatedDemoNetworkSelect } from "@/components/wallet/wallet-pages";
import { LotList } from "./lots";
import { OracleOverviewCard } from "./oracle";

export function BackDashboard() {
  return (
    <Button asChild variant="ghost" size="sm">
      <Link to="/app/dashboard">
        <ArrowRight className="rotate-180" aria-hidden="true" />
        Dashboard
      </Link>
    </Button>
  );
}

export function ActivityList({ limit, category = "All" }: { limit?: number; category?: string }) {
  const s = useDemo();
  const rows = coffeeActivity(s)
    .filter((r) => category === "All" || r.category === category)
    .slice(0, limit);
  return (
    <div className="divide-y">
      {rows.length ? (
        rows.map((r) => (
          <article key={r.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{r.action}</p>
                <Pill>{r.status}</Pill>
                <DemoBadge />
              </div>
              <p className="mt-1 break-words text-xs text-muted-foreground">{r.detail}</p>
              <time
                dateTime={r.date}
                className="mt-1 block font-mono text-[10px] text-muted-foreground"
              >
                {r.date.length > 10
                  ? `${r.date.slice(0, 10)} · ${r.date.slice(11, 19)} UTC`
                  : `${r.date} · seed record (date only)`}
              </time>
            </div>
            <p className="num text-xs sm:text-right">{r.quantity}</p>
          </article>
        ))
      ) : (
        <Empty
          text="No simulated activity yet. Explore a lot or simulate a swap to start."
          action={
            <Button asChild variant="outline">
              <Link to="/app/assets">Explore coffee assets</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}

const COFFEE_ACTIONS = [
  {
    to: "/app/assets",
    title: "Asset Explorer",
    detail: "Inspect lot-specific GCT & RCT",
    icon: Wheat,
  },
  {
    to: "/app/coffee-passport",
    title: "Coffee Passport",
    detail: "Origin & custody provenance",
    icon: BookOpen,
  },
  {
    to: "/market",
    title: "Marketplace",
    detail: "Coffee from independent roasters",
    icon: ShoppingBag,
  },
  {
    to: "/app/roast",
    title: "Roasting Lab",
    detail: "Simulate green-to-roasted yield",
    icon: Flame,
  },
  { to: "/app/redeem", title: "Redeem", detail: "Reserve roasted coffee in demo", icon: Package },
  { to: "/app/swap", title: "Swap", detail: "Simulate coffee token exchange", icon: Repeat },
] as const;

export function Dashboard() {
  const s = useDemo();
  const c = coffeeOverview(s);
  const p = portfolio(s);
  const { hydrated, near, connectedAccounts, openHub } = useWalletHub();
  const oracleQuery = useOracleSnapshot(ORACLE_CONTRACT_ID);
  const perpsQuery = usePerpsProtocolSnapshot();
  const nearConnected =
    hydrated && near.status === "connected" && Boolean(near.accountId) && !near.unsupportedNetwork;
  const traderQuery = usePerpsTraderSnapshot(nearConnected ? near.accountId : null);

  const imfObs = oracleQuery.data?.marketStates[MARKET_IMF_ARABICA]?.observation ?? null;
  const perpsProtocol = perpsQuery.data;
  const perpsOracleStatus = evaluatePerpsOracleStatus(
    perpsProtocol?.arabicaMarket,
    perpsProtocol?.blockTimestampSec ?? null,
  );

  const oracleStatusLabel = oracleQuery.isError
    ? "RPC unavailable"
    : imfObs
      ? `Read-only · ${formatUsdPerKg(imfObs.price, imfObs.decimals, imfObs.unit)}`
      : oracleQuery.isPending
        ? "Checking NEAR Testnet…"
        : "Read-only active (no obs)";

  return (
    <div className="space-y-9">
      {/* A. Product Overview */}
      <section aria-labelledby="product-overview-heading" className="space-y-4">
        <PageHeader
          title="ROASTAKE Protocol"
          demo={false}
          subtitle="NEAR Testnet Perpetuals explorer, separate read-only Oracle telemetry via OutLayer, and a simulated coffee marketplace and provenance prototype."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild className="gap-1.5">
                <Link to="/app/perps/$market" params={{ market: MARKET_ARABICA_URL_SLUG }}>
                  <ChartCandlestick className="size-4" aria-hidden="true" />
                  <span>View Arabica / USD Market (Testnet)</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-1.5">
                <Link to="/app/perps">
                  <span>3-Market Hub</span>
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => openHub("near")}
                className="gap-1.5"
              >
                <Wallet className="size-4 text-gain" aria-hidden="true" />
                <span>
                  {nearConnected && near.accountId
                    ? abbreviateAddress(near.accountId)
                    : "Open Wallet Hub"}
                </span>
              </Button>
            </div>
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gain/40 bg-forest/20 px-4 py-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <MaturityBadge variant="testnet">NEAR TESTNET · PERPS CONTRACT</MaturityBadge>
            <MaturityBadge variant="testnet">ORACLE · READ-ONLY</MaturityBadge>
            <MaturityBadge variant="demo">COFFEE DEFI · DEMO PROTOTYPE</MaturityBadge>
          </div>
          <p className="text-muted-foreground">
            Active view: <strong className="text-foreground">{s.role}</strong> ·{" "}
            {hydrated && connectedAccounts.length > 0
              ? `${connectedAccounts.length} real wallet ${connectedAccounts.length === 1 ? "session" : "sessions"} connected`
              : "No real wallets connected yet"}
          </p>
        </div>
      </section>

      {/* B. Trading Overview (NEAR Testnet Perpetuals; registry read from chain) */}
      <section
        aria-labelledby="trading-overview-heading"
        className="rounded-lg border border-gain/40 bg-card p-5 shadow-soft"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid size-7 place-items-center rounded-full bg-forest text-mint">
                <ChartCandlestick className="size-4" aria-hidden="true" />
              </span>
              <h2 id="trading-overview-heading" className="font-display text-xl font-semibold">
                ROASTAKE Perpetuals
              </h2>
              <Pill tone="muted">NEAR Testnet Contract: {PERPS_CONTRACT_ID}</Pill>
              <MaturityBadge variant="testnet">CIRCLE TESTNET USDC</MaturityBadge>
            </div>
            <p className="max-w-2xl text-xs text-muted-foreground">
              Market registration and current oracle state are read from finalized NEAR Testnet RPC
              responses. The contract is configured for 6-decimal Circle Native Testnet USDC
              (non-monetary) and operator-controlled TESTNET_SANDBOX_FEED prices. Any displayed
              Testnet price is synthetic, not a commercial coffee quote. The separate read-only
              OutLayer Oracle exposes an IMF monthly benchmark and a Gesha fixture; it does not
              power Perps. Marketplace inventory, provenance and demo balances remain simulated.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/app/perps/$market" params={{ market: MARKET_ARABICA_URL_SLUG }}>
                <span>Open Arabica / USD Market</span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to="/app/oracle">
                <Activity className="size-3.5" aria-hidden="true" />
                <span>Oracle Telemetry</span>
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border bg-background/40 p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Arabica Testnet Feed
            </p>
            <p className="mt-1 font-medium text-sm text-gain num">
              {perpsOracleStatus.priceE8
                ? `${formatUsdE8(perpsOracleStatus.priceE8)}/kg`
                : perpsQuery.isPending
                  ? "Querying RPC…"
                  : "RPC Unavailable"}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {perpsOracleStatus.status} · TESTNET_SANDBOX_FEED (synthetic Testnet feed).
            </p>
          </div>
          <div className="rounded-md border bg-background/40 p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              LP Vault &amp; Solvency
            </p>
            <p className="mt-1 font-medium text-sm num">
              {perpsProtocol ? formatUsdE8(perpsProtocol.lpSnapshot.lp_mtm_equity_e8) : "Querying…"}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {perpsProtocol
                ? `${perpsProtocol.solvencyInvariant ? "Solvency PASS" : "Alert"} · ${perpsProtocol.accounting.total_open_positions} open positions`
                : "Peer-to-Pool Vault on NEAR Testnet."}
            </p>
          </div>
          <div className="rounded-md border bg-background/40 p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Coffee Oracle
            </p>
            <p className="mt-1 font-medium text-sm text-gain">{oracleStatusLabel}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Historical IMF monthly benchmark — separate from Perps synthetic feed.
            </p>
          </div>
          <div className="rounded-md border bg-background/40 p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              NEAR Testnet Trader
            </p>
            <p className="mt-1 font-medium text-sm">
              {nearConnected && near.accountId ? (
                <span className="font-mono text-gain">{near.accountId}</span>
              ) : (
                "Connect NEAR Wallet"
              )}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground num">
              {nearConnected && traderQuery.data
                ? `${formatFixedPoint(traderQuery.data.circleUsdcBalanceUnits, 6, { maxFractionDigits: 4 })} USDC · Free margin ${traderQuery.data.account ? formatUsdE8(traderQuery.data.account.free_collateral_e8) : "Unregistered"}`
                : "HOT Connect ready on NEAR Testnet (zero txs signed on connect)."}
            </p>
          </div>
        </div>
      </section>

      {/* C. Coffee Oracle (Real Read-Only Testnet Telemetry) */}
      <OracleOverviewCard />

      {/* D. Demo Portfolio (Strictly Isolated Simulated Holdings) */}
      <section
        aria-labelledby="demo-portfolio-heading"
        className="space-y-4 rounded-lg border border-brass/35 bg-card/60 p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="demo-portfolio-heading" className="font-display text-xl font-semibold">
                Demo Portfolio
              </h2>
              <DemoBadge>SIMULATED · LOCAL BROWSER DATA</DemoBadge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Offline prototype balances stored in browser{" "}
              <span className="font-mono">localStorage</span> for{" "}
              <strong className="text-foreground">{s.account}</strong>. Never mixed with real wallet
              balances or NEAR Testnet oracle accounting.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SimulatedDemoNetworkSelect className="w-[158px]" />
            <Button asChild size="sm" variant="outline">
              <Link to="/app/wallet">Manage Demo &amp; Real Wallets</Link>
            </Button>
          </div>
        </div>

        <Stats>
          <Stat
            label="Simulated portfolio value"
            value={usd(p.total)}
            sub="Demo balance · all holdings"
          />
          <Stat label="GCT balance" value={fmt(c.gct, 2)} sub="Simulated green coffee tokens" />
          <Stat label="RCT balance" value={fmt(c.rct, 2)} sub="Simulated roasted coffee tokens" />
          <Stat
            label="Coffee represented"
            value={`${fmt(c.representedKg, 2)} kg`}
            sub={`${fmt(c.walletKg)} demo wallet + ${fmt(c.depositedKg + c.collateralKg)} simulated vaults`}
          />
        </Stats>
      </section>

      {/* E. Coffee Ecosystem */}
      <section aria-labelledby="coffee-ecosystem-heading" className="space-y-6">
        <div className="grid gap-6 border-y py-6 md:grid-cols-[1fr_240px]">
          <div>
            <p className="font-mono text-xs uppercase text-copper">Coffee DeFi &amp; Provenance</p>
            <h2 id="coffee-ecosystem-heading" className="mt-2 text-2xl">
              From origin to ownership.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Lot-specific tokens model recorded kilograms. Green and roasted coffee stay separate.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/app/assets">
                  Discover lots <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/app/roast">
                  <Flame className="size-4" aria-hidden="true" />
                  Roasting Lab
                </Link>
              </Button>
            </div>
          </div>
          <div
            className="hidden aspect-[4/3] w-full rounded-md bg-muted md:block"
            aria-hidden="true"
          />
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-medium">Coffee ecosystem shortcuts</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {COFFEE_ACTIONS.map((a) => (
              <Button key={a.to} asChild variant="outline" className="h-auto justify-start p-3.5">
                <Link to={a.to}>
                  <a.icon className="size-5 shrink-0 text-copper" aria-hidden="true" />
                  <span className="min-w-0 whitespace-normal text-left">
                    <span className="block text-xs font-semibold">{a.title}</span>
                    <span className="mt-1 block text-[10px] font-normal text-muted-foreground">
                      {a.detail}
                    </span>
                  </span>
                </Link>
              </Button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-medium">Coffee-backed assets</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Simulated custody records · 1 token represents 1 kg of its identified lot.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/assets">
                All lots <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <LotList compact />
        </div>
      </section>

      {/* F. Protocol Activity & Simulated Snapshot */}
      <section
        aria-labelledby="protocol-activity-heading"
        className="grid gap-8 xl:grid-cols-[1.35fr_1fr]"
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="protocol-activity-heading" className="text-2xl">
                Recent activity
              </h2>
              <DemoBadge>SIMULATED</DemoBadge>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link to="/app/activity">
                View all <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <ActivityList limit={5} />
        </div>
        <div className="border-t pt-5 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
          <h2 className="text-lg font-medium">Simulated Coffee Snapshot</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Demo token supply {fmt(c.supply)} · Physical {fmt(c.physical)} kg · Available{" "}
            {fmt(c.available)} kg · Encumbered {fmt(c.encumbered)} kg · Reserves {fmt(c.reserved)}{" "}
            kg · Lots {s.lots.length} · Fees {usd(c.recentFees)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Simulated demo data only — no real yields.
          </p>
        </div>
      </section>
    </div>
  );
}
