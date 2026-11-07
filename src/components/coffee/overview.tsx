import { Link } from '@tanstack/react-router';
import { ArrowRight, BookOpen, Coffee, Flame, Package, Repeat, ShoppingBag, Wheat } from 'lucide-react';
import { useDemo } from '@/lib/demo/store';
import { coffeeActivity, coffeeOverview, fmt, portfolio, usd } from '@/lib/demo/calc';
import { DemoBadge, Empty, PageHeader, Pill, Stat, Stats } from '@/components/kit';
import { Button } from '@/components/ui/button';
import farm from '@/assets/origin-farm.jpg';
import { LotList } from './lots';

export function BackDashboard() { return <Button asChild variant="ghost" size="sm"><Link to="/app/dashboard"><ArrowRight className="rotate-180"/>Dashboard</Link></Button>; }
export function ActivityList({ limit, category = 'All' }: { limit?: number; category?: string }) {
  const s = useDemo(); const rows = coffeeActivity(s).filter((r) => category === 'All' || r.category === category).slice(0, limit);
  return <div className="divide-y">{rows.length ? rows.map((r) => <article key={r.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto]">
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{r.action}</p><Pill>{r.status}</Pill><DemoBadge/></div><p className="mt-1 break-words text-xs text-muted-foreground">{r.detail}</p><time dateTime={r.date} className="mt-1 block font-mono text-[10px] text-muted-foreground">{r.date.length > 10 ? `${r.date.slice(0, 10)} · ${r.date.slice(11, 19)} UTC` : `${r.date} · seed record (date only)`}</time></div><p className="num text-xs sm:text-right">{r.quantity}</p>
  </article>) : <Empty text="No simulated activity yet. Explore a lot or simulate a swap to start." action={<Button asChild variant="outline"><Link to="/app/assets">Explore coffee assets</Link></Button>}/>}</div>;
}
const actions = [
  { to: '/app/assets', title: 'View Coffee Assets', detail: 'Discover lot-specific GCT & RCT', icon: Wheat },
  { to: '/app/coffee-passport', title: 'View Coffee Passport', detail: 'Inspect origin & custody records', icon: BookOpen },
  { to: '/market', title: 'Explore Marketplace', detail: 'Coffee from independent roasters', icon: ShoppingBag },
  { to: '/app/swap', title: 'Swap', detail: 'Simulate a token exchange', icon: Repeat },
  { to: '/app/redeem', title: 'Redeem Coffee', detail: 'Reserve roasted coffee in the demo', icon: Package },
] as const;
export function Dashboard() {
  const s = useDemo(); const c = coffeeOverview(s); const p = portfolio(s);
  return <div className="space-y-9">
    <PageHeader title="Your coffee, at a glance" subtitle={`Welcome, ${s.account} · ${s.role} view · Not connected to a real wallet.`} actions={<DemoBadge>Demo Mode · No real transactions</DemoBadge>}/>
    <Stats><Stat label="Total portfolio value" value={usd(p.total)} sub="Simulated balance · all demo holdings"/><Stat label="GCT balance" value={fmt(c.gct, 2)} sub="Green coffee tokens · wallet"/><Stat label="RCT balance" value={fmt(c.rct, 2)} sub="Roasted coffee tokens · wallet"/><Stat label="Coffee represented" value={`${fmt(c.representedKg, 2)} kg`} sub={`${fmt(c.walletKg)} wallet + ${fmt(c.depositedKg + c.collateralKg)} deposited / collateral`}/></Stats>
    <section className="grid gap-6 border-y py-6 md:grid-cols-[1fr_240px]">
      <div><p className="font-mono text-xs uppercase text-copper">From origin to ownership</p><h2 className="mt-2 text-2xl">Start with the coffee.</h2><p className="mt-2 max-w-xl text-sm text-muted-foreground">Lot-specific tokens represent recorded kilograms, not verified custody. Green and roasted coffee remain separate; roast loss is accounted for.</p><div className="mt-5 flex flex-wrap gap-3"><Button asChild><Link to="/app/assets">Discover lots <ArrowRight/></Link></Button><Button asChild variant="outline"><Link to="/app/roast"><Flame/>Roasting Lab</Link></Button></div></div>
      <img src={farm} width={1200} height={912} alt="Coffee-growing landscape used in the ROASTAKE prototype" className="hidden aspect-[4/3] w-full rounded-md object-cover md:block"/>
    </section>
    <section><h2 className="mb-4 text-xl">Quick actions</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{actions.map((a) => <Button key={a.to} asChild variant="outline" className="h-auto justify-start p-4"><Link to={a.to}><a.icon className="size-5 shrink-0 text-copper"/><span className="min-w-0 whitespace-normal text-left"><span className="block text-xs font-semibold">{a.title}</span><span className="mt-1 block text-[10px] font-normal text-muted-foreground">{a.detail}</span></span></Link></Button>)}</div></section>
    <section><div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-2xl">Coffee-backed assets</h2><p className="mt-1 text-xs text-muted-foreground">Simulated custody data · 1 token represents 1 kg of its identified lot.</p></div><Button asChild variant="ghost" size="sm"><Link to="/app/assets">All lots <ArrowRight/></Link></Button></div><LotList compact/></section>
    <div className="grid gap-8 xl:grid-cols-[1.35fr_1fr]">
      <section><div className="flex items-center justify-between"><h2 className="text-2xl">Recent activity</h2><Button asChild size="sm" variant="ghost"><Link to="/app/activity">View all <ArrowRight/></Link></Button></div><ActivityList limit={5}/></section>
      <section className="border-t pt-5 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0"><div className="flex flex-wrap items-center gap-2"><Coffee className="size-4 text-sage"/><h2 className="text-2xl">Protocol snapshot</h2><DemoBadge/></div><dl className="mt-4 divide-y text-sm">{[['Total demo token supply', `${fmt(c.supply)} tokens`], ['Physical coffee recorded', `${fmt(c.physical)} kg`], ['Available physical quantity', `${fmt(c.available)} kg`], ['Encumbered physical quantity', `${fmt(c.encumbered)} kg`], ['Redemption reserves', `${fmt(c.reserved)} kg`], ['Demo lots', s.lots.length], ['Recent recorded fees', usd(c.recentFees)]].map(([k,v]) => <div key={k} className="flex flex-wrap justify-between gap-2 py-3"><dt className="text-muted-foreground">{k}</dt><dd className="num text-xs">{v}</dd></div>)}</dl><p className="mt-3 text-xs text-muted-foreground">Fees: latest five explicit fee entries, including seed aggregates. Physical categories are disjoint; token supply is not additional coffee. Not live or audited. No real yields.</p></section>
    </div>
  </div>;
}
