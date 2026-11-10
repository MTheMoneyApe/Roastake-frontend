import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity, Bell, BookOpen, Briefcase, Building2, ChartCandlestick, Coffee, Coins, Flame, Gauge, Globe, Landmark, Layers, LayoutDashboard, Menu, Package,
  PieChart, RefreshCw, Repeat, Scale, Settings, ShieldAlert, ShoppingBag, Sprout, Store, Truck, Users, Vote, Wallet, Wheat, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { demo, useDemo } from "@/lib/demo/store";
import { fmt, portfolio, usd } from "@/lib/demo/calc";
import type { Role } from "@/lib/demo/types";
import { cn } from "@/lib/utils";
import { DemoBadge } from "./kit";

type Item = { to: string; label: string; icon: typeof Coffee };
type Group = { label: string; items: Item[] };

export const APP_NAV: Group[] = [
  { label: "Overview", items: [{ to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard }, { to: "/app/activity", label: "Activity", icon: RefreshCw }] },
  { label: "Commerce", items: [{ to: "/market", label: "Marketplace", icon: ShoppingBag }, { to: "/orders", label: "Orders", icon: Truck }, { to: "/roaster/dashboard", label: "Roaster Portal", icon: Store }] },
  { label: "Coffee Assets", items: [{ to: "/app/assets", label: "Asset Explorer", icon: Wheat }, { to: "/app/coffee-passport", label: "Coffee Passport", icon: BookOpen }, { to: "/app/roast", label: "Roasting Lab", icon: Flame }, { to: "/app/redeem", label: "Redeem", icon: Package }, { to: "/app/swap", label: "Swap", icon: Repeat }] },
  { label: "DeFi", items: [{ to: "/app/vaults", label: "Vaults", icon: Landmark }, { to: "/app/staking", label: "Staking", icon: Coins }, { to: "/app/farming", label: "Farming", icon: Sprout }, { to: "/app/lending", label: "Lending", icon: Scale }, { to: "/app/borrowing", label: "Borrowing", icon: Wallet }] },
  { label: "Trading", items: [{ to: "/app/markets", label: "Spot Markets", icon: Gauge }, { to: "/app/perps", label: "Perpetuals", icon: ChartCandlestick }, { to: "/app/positions", label: "Positions", icon: Layers }, { to: "/app/market-analytics", label: "Analytics", icon: PieChart }] },
  { label: "Ecosystem", items: [{ to: "/app/governance", label: "Governance", icon: Vote }, { to: "/app/treasury", label: "Treasury", icon: Building2 }, { to: "/app/ventures", label: "Coffee Ventures", icon: Briefcase }] },
  { label: "Tools", items: [{ to: "/app/oracle", label: "Coffee Oracle", icon: Activity }, { to: "/app/multichain", label: "Multi-chain", icon: Globe }, { to: "/app/wallet", label: "Wallet", icon: Wallet }, { to: "/app/risk-center", label: "Risk Center", icon: ShieldAlert }, { to: "/app/docs", label: "Docs", icon: BookOpen }, { to: "/admin", label: "Admin Console", icon: Settings }] },
];

export const ROASTER_NAV: Group[] = [{ label: "Roaster Portal", items: [
  ["dashboard", "Overview", LayoutDashboard], ["products", "Products", Coffee], ["inventory", "Inventory", Package], ["orders", "Orders", Truck], ["customers", "Customers", Users], ["payments", "Payments", Wallet],
  ["lots", "Coffee Lots", Wheat], ["tokenization", "Tokenization", Layers], ["roasting", "Roasting", Flame], ["analytics", "Analytics", PieChart], ["settings", "Settings", Settings],
].map(([k, l, i]) => ({ to: `/roaster/${k}`, label: l as string, icon: i as typeof Coffee })) }, { label: "Back", items: [{ to: "/app/dashboard", label: "Protocol app", icon: LayoutDashboard }, { to: "/market", label: "Marketplace", icon: ShoppingBag }] }];

export const ADMIN_SECTIONS: [string, string][] = [["roasters", "Roaster approvals"], ["products", "Product moderation"], ["lots", "Coffee lots"], ["custody", "Custody & reserves"], ["tokenization", "Mint / burn approvals"], ["vaults", "Vault config"], ["risk", "Risk parameters"], ["markets", "Perps markets"], ["oracles", "Oracle monitor"], ["treasury", "Treasury"], ["governance", "Governance"], ["redemptions", "Redemption queue"], ["fees", "Fee configuration"], ["analytics", "Analytics"]];
export const ADMIN_NAV: Group[] = [{ label: "Admin", items: [{ to: "/admin", label: "Overview", icon: LayoutDashboard }, ...ADMIN_SECTIONS.map(([k, l]) => ({ to: `/admin/${k}`, label: l, icon: Settings }))] }, { label: "Back", items: [{ to: "/app/dashboard", label: "Protocol app", icon: LayoutDashboard }] }];

export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-full bg-brass text-charcoal"><Coffee className="size-4" /></span>
      <span className="font-display text-lg font-semibold tracking-tight">ROASTAKE</span>
    </Link>
  );
}

export function NetworkSelect() {
  const s = useDemo();
  return (
    <Select value={s.network} onValueChange={demo.setNetwork}>
      <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Demo network"><Globe className="size-3.5" /><SelectValue /></SelectTrigger>
      <SelectContent>{s.networks.map((n) => <SelectItem key={n.id} value={n.id}>{n.name}{n.status !== "Operational" ? ` · ${n.status}` : ""}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function Notifications() {
  const s = useDemo();
  const unread = s.notifications.filter((n) => !n.read).length;
  return (
    <Popover onOpenChange={(o) => !o && unread && demo.readAll()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative"><Bell />{unread > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-copper" />}</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-2.5 text-sm font-semibold">Notifications <DemoBadge className="ml-1" /></div>
        <ul className="max-h-80 overflow-y-auto">
          {s.notifications.length === 0 && <li className="p-4 text-sm text-muted-foreground">No notifications</li>}
          {s.notifications.slice(0, 12).map((n) => <li key={n.id} className={cn("border-b px-4 py-2.5 text-sm last:border-0", !n.read && "bg-accent/40")}><p>{n.text}</p><p className="text-xs text-muted-foreground">{n.date}</p></li>)}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

const ACCOUNTS = ["Demo Explorer", "Demo Whale", "Demo Roaster Ops"];
export function WalletButton() {
  const s = useDemo();
  const [open, setOpen] = useState(false);
  const h = useHydrated();
  const p = portfolio(s);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-2"><Wallet /><span className="num hidden sm:inline">{h ? usd(p.total, 0) : "—"}</span></Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2">Demo Wallet <DemoBadge>NOT A REAL WALLET</DemoBadge></DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">No real wallet is connected. Balances below are simulated and stored only in this browser.</p>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="mb-1 text-xs text-muted-foreground">Demo account</p>
              <Select value={s.account} onValueChange={demo.setAccount}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ACCOUNTS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
            <div><p className="mb-1 text-xs text-muted-foreground">Network</p><NetworkSelect /></div>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-md border">
            {Object.entries(s.balances).filter(([, v]) => v > 0).map(([k, v]) => <div key={k} className="flex justify-between border-b px-3 py-2 text-sm last:border-0"><span>{k}</span><span className="num">{fmt(v, 4)}</span></div>)}
          </div>
          <div className="flex justify-between gap-2">
            <Button variant="outline" asChild><Link to="/app/wallet" onClick={() => setOpen(false)}>Open wallet page</Link></Button>
            <Button variant="destructive" onClick={() => { demo.reset(); setOpen(false); }}>Reset demo data</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Profile() {
  const s = useDemo();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="gap-2"><span className="grid size-7 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">{s.account[0]}{s.account.split(" ")[1]?.[0]}</span><span className="hidden text-xs lg:inline">{s.role}</span></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{s.account}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Demo role view</DropdownMenuLabel>
        {(["User", "Roaster", "Treasury Manager", "Admin"] as Role[]).map((r) => <DropdownMenuItem key={r} onClick={() => demo.setRole(r)}>{r === s.role ? "● " : ""}{r}</DropdownMenuItem>)}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/orders">My orders</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/app/activity">Activity</Link></DropdownMenuItem>
        <DropdownMenuItem onClick={() => demo.reset()} className="text-loss">Reset demo data</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Controls() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="hidden md:inline"><DemoBadge>DEMO MODE</DemoBadge></span>
      <span className="hidden md:block"><NetworkSelect /></span>
      <Notifications />
      <WalletButton />
      <Profile />
    </div>
  );
}

function NavList({ groups, onNav }: { groups: Group[]; onNav?: () => void }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <nav className="space-y-5">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/60">{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map((i) => {
              const active = path === i.to || (i.to !== "/admin" && path.startsWith(i.to + "/"));
              return <li key={i.to}><Link to={i.to} onClick={onNav} className={cn("flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors", active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60")}><i.icon className={cn("size-4", active && "text-sidebar-primary")} />{i.label}</Link></li>;
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ children, nav = APP_NAV, dark = true, home = "/app/dashboard" }: { children: ReactNode; nav?: Group[]; dark?: boolean; home?: string }) {
  const [open, setOpen] = useState(false);
  const mobile: Item[] = [nav[0].items[0], ...(nav === APP_NAV ? [{ to: "/app/assets", label: "Coffee", icon: Wheat }, { to: "/app/swap", label: "Swap", icon: Repeat }, { to: "/app/redeem", label: "Redeem", icon: Package }] : nav[0].items.slice(1, 4))];
  return (
    <div className={cn(dark && "dark", "min-h-screen bg-background text-foreground")}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-14 items-center px-4 text-sidebar-foreground"><Logo to={home} /></div>
        <div className="flex-1 overflow-y-auto px-2 pb-6"><NavList groups={nav} /></div>
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-charcoal/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-sidebar p-3 text-sidebar-foreground">
            <div className="mb-4 flex items-center justify-between"><Logo to={home} /><Button size="icon" variant="ghost" aria-label="Close menu" onClick={() => setOpen(false)}><X /></Button></div>
            <NavList groups={nav} onNav={() => setOpen(false)} />
          </div>
        </div>
      )}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b bg-background/85 px-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu /></Button>
            <span className="lg:hidden"><Logo to={home} /></span>
          </div>
          <Controls />
        </header>
        <main className="mx-auto max-w-[1400px] px-3 py-6 pb-24 md:px-6 lg:pb-10">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card lg:hidden">
        {mobile.map((i) => <Link key={i.to} to={i.to} className="flex flex-col items-center gap-0.5 py-2 text-[10px] text-muted-foreground" activeProps={{ className: "text-primary" }}><i.icon className="size-5" />{i.label}</Link>)}
        <Button variant="ghost" onClick={() => setOpen(true)} className="h-auto flex-col gap-0.5 rounded-none py-2 text-[10px] text-muted-foreground"><Menu className="size-5" />More</Button>
      </nav>
    </div>
  );
}

const PUBLIC_LINKS = [["/market", "Market"], ["/roasters", "Roasters"], ["/app/assets", "Coffee Assets"], ["/app/coffee-passport", "Passport"], ["/app/dashboard", "Demo App"]] as const;
export function PublicShell({ children }: { children: ReactNode }) {
  const cart = useDemo((s) => s.cart.reduce((a, c) => a + c.qty, 0));
  const h = useHydrated();
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <div className="demo-stripe border-b border-brass/30 py-1 text-center text-[11px] font-medium uppercase tracking-wider text-espresso">Demo prototype · all products, payments, tokens and yields are simulated</div>
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden items-center gap-6 lg:flex">{PUBLIC_LINKS.map(([to, l]) => <Link key={to} to={to} className="text-sm text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>{l}</Link>)}</nav>
          </div>
          <div className="flex min-w-0 items-center gap-0.5 sm:gap-1.5">
            <Button variant="ghost" size="sm" asChild><Link to="/cart" aria-label="Coffee cart" className="gap-2"><ShoppingBag />{h && cart > 0 && <span className="num rounded-full bg-copper px-1.5 text-[11px] text-cream">{cart}</span>}</Link></Button>
            <div className="hidden sm:block"><Notifications /></div>
            <WalletButton />
            <Profile />
            <Button size="icon" variant="ghost" className="lg:hidden" aria-label="Menu" onClick={() => setOpen(!open)}><Menu /></Button>
          </div>
        </div>
        {open && <nav className="flex flex-col gap-1 border-t px-4 py-3 lg:hidden">{[...PUBLIC_LINKS, ["/orders", "Orders"] as const].map(([to, l]) => <Link key={to} to={to} onClick={() => setOpen(false)} className="py-1.5 text-sm">{l}</Link>)}</nav>}
      </header>
      <main>{children}</main>
      <footer className="mt-20 bg-forest text-mint">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-4">
          <div><p className="font-display text-2xl text-cream">ROASTAKE</p><p className="mt-2 text-sm opacity-80">Roast. Stake. Repeat.</p><p className="mt-4 text-xs opacity-60">Interactive prototype. No real funds, tokens, coffee inventory, yields, contracts or shipments.</p></div>
          {[["Shop", [["/market", "Marketplace"], ["/roasters", "Roasters"], ["/discovery-boxes", "Discovery boxes"], ["/subscriptions", "Subscriptions"], ["/wholesale", "Wholesale"]]], ["Protocol", [["/app/assets", "Coffee assets"], ["/app/vaults", "Vaults"], ["/app/perps", "Perpetuals"], ["/app/governance", "Governance"], ["/app/ventures", "Ventures"]]], ["Resources", [["/app/docs", "Documentation"], ["/app/risk-center", "Risk disclosures"], ["/roaster/dashboard", "Roaster portal"], ["/admin", "Admin console"]]]].map(([t, ls]) => (
            <div key={t as string}><p className="mb-3 text-xs uppercase tracking-wider text-brass">{t as string}</p><ul className="space-y-1.5 text-sm">{(ls as string[][]).map(([to, l]) => <li key={to}><Link to={to} className="opacity-80 hover:opacity-100">{l}</Link></li>)}</ul></div>
          ))}
        </div>
      </footer>
    </div>
  );
}

export const Section = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cn("mx-auto max-w-7xl px-4", className)}>{children}</div>;
