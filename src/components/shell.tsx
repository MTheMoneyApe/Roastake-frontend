import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  ChartCandlestick,
  Coffee,
  Coins,
  Flame,
  Gauge,
  Globe,
  Landmark,
  Layers,
  LayoutDashboard,
  Menu,
  Package,
  PieChart,
  RefreshCw,
  Repeat,
  Scale,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Sprout,
  Store,
  Truck,
  Users,
  Vote,
  Wallet,
  Wheat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { demo, useDemo } from "@/lib/demo/store";
import type { Role } from "@/lib/demo/types";
import { cn } from "@/lib/utils";
import { WalletHubHeaderButton } from "@/components/wallet/wallet-hub";
import { SimulatedDemoNetworkSelect } from "@/components/wallet/wallet-pages";
import { DemoBadge, MaturityBadge, type MaturityVariant } from "./kit";

type NavBadge = { label: string; variant: MaturityVariant; title?: string };
type Item = { to: string; label: string; icon: typeof Coffee; badge?: NavBadge };
type Group = {
  label: string;
  groupBadge?: NavBadge;
  items: Item[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
};

export const APP_NAV: Group[] = [
  {
    label: "Overview",
    items: [{ to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Trade",
    items: [
      {
        to: "/app/perps",
        label: "Perpetuals",
        icon: ChartCandlestick,
        badge: {
          label: "TESTNET",
          variant: "testnet",
          title:
            "Three registered NEAR Testnet markets (Arabica, Robusta & Gesha) on perps-v1.roastake-dev-mta.testnet; operator-controlled synthetic prices.",
        },
      },
      { to: "/app/markets", label: "Spot Markets", icon: Gauge },
      { to: "/app/positions", label: "Positions", icon: Layers },
      { to: "/app/market-analytics", label: "Market Analytics", icon: PieChart },
    ],
  },
  {
    label: "Portfolio",
    items: [
      {
        to: "/app/wallet",
        label: "Wallet",
        icon: Wallet,
        badge: {
          label: "TESTNET",
          variant: "testnet",
          title:
            "Genuine wallet connections restricted to NEAR Testnet, EVM testnets, Solana Devnet and Hyperliquid Testnet; no Mainnet execution.",
        },
      },
      { to: "/app/activity", label: "Activity", icon: RefreshCw },
    ],
  },
  {
    label: "Coffee",
    items: [
      {
        to: "/market",
        label: "Marketplace",
        icon: ShoppingBag,
        badge: { label: "DEMO", variant: "demo", title: "Simulated coffee marketplace" },
      },
      { to: "/orders", label: "Orders", icon: Truck },
      { to: "/app/assets", label: "Asset Explorer", icon: Wheat },
      { to: "/app/coffee-passport", label: "Coffee Passport", icon: BookOpen },
      { to: "/app/roast", label: "Roasting Lab", icon: Flame },
      { to: "/app/redeem", label: "Redeem", icon: Package },
      { to: "/app/swap", label: "Swap", icon: Repeat },
    ],
  },
  {
    label: "Labs & Preview",
    groupBadge: {
      label: "PREVIEW",
      variant: "preview",
      title: "Planned modules - not yet deployed",
    },
    collapsible: true,
    defaultCollapsed: true,
    items: [
      { to: "/app/vaults", label: "Vaults", icon: Landmark },
      { to: "/app/staking", label: "Staking", icon: Coins },
      { to: "/app/farming", label: "Farming", icon: Sprout },
      { to: "/app/lending", label: "Lending", icon: Scale },
      { to: "/app/borrowing", label: "Borrowing", icon: Wallet },
      { to: "/app/governance", label: "Governance", icon: Vote },
      { to: "/app/treasury", label: "Treasury", icon: Building2 },
      { to: "/app/ventures", label: "Coffee Ventures", icon: Briefcase },
      {
        to: "/app/risk-center",
        label: "Risk Center",
        icon: ShieldAlert,
        badge: { label: "PREVIEW", variant: "preview" },
      },
    ],
  },
  {
    label: "Protocol",
    items: [
      {
        to: "/app/oracle",
        label: "Coffee Oracle",
        icon: Activity,
        badge: {
          label: "TESTNET",
          variant: "testnet",
          title: "Live NEAR Testnet read-only oracle",
        },
      },
      { to: "/app/multichain", label: "Multi-chain", icon: Globe },
      { to: "/app/docs", label: "Documentation", icon: BookOpen },
    ],
  },
];

export const ROASTER_NAV: Group[] = [
  {
    label: "Roaster Portal",
    groupBadge: {
      label: "PREVIEW",
      variant: "preview",
      title:
        "Preview screens only; no real roaster onboarding, inventory, storefront or payments are connected.",
    },
    items: [
      ["dashboard", "Overview", LayoutDashboard],
      ["products", "Products", Coffee],
      ["inventory", "Inventory", Package],
      ["orders", "Orders", Truck],
      ["customers", "Customers", Users],
      ["payments", "Payments", Wallet],
      ["lots", "Coffee Lots", Wheat],
      ["tokenization", "Tokenization", Layers],
      ["roasting", "Roasting", Flame],
      ["analytics", "Analytics", PieChart],
      ["settings", "Settings", Settings],
    ].map(([k, l, i]) => ({ to: `/roaster/${k}`, label: l as string, icon: i as typeof Coffee })),
  },
  {
    label: "Back",
    items: [
      { to: "/app/dashboard", label: "Protocol app", icon: LayoutDashboard },
      { to: "/market", label: "Marketplace", icon: ShoppingBag },
    ],
  },
];

export const ADMIN_SECTIONS: [string, string][] = [
  ["roasters", "Roaster approvals"],
  ["products", "Product moderation"],
  ["lots", "Coffee lots"],
  ["custody", "Custody & reserves"],
  ["tokenization", "Mint / burn approvals"],
  ["vaults", "Vault config"],
  ["risk", "Risk parameters"],
  ["markets", "Perps markets"],
  ["oracles", "Oracle monitor"],
  ["treasury", "Treasury"],
  ["governance", "Governance"],
  ["redemptions", "Redemption queue"],
  ["fees", "Fee configuration"],
  ["analytics", "Analytics"],
];
export const ADMIN_NAV: Group[] = [
  {
    label: "Admin",
    groupBadge: {
      label: "DEMO",
      variant: "demo",
      title:
        "Local demonstration UI only; no production admin authorization or operational controls are connected.",
    },
    items: [
      { to: "/admin", label: "Overview", icon: LayoutDashboard },
      ...ADMIN_SECTIONS.map(([k, l]) => ({ to: `/admin/${k}`, label: l, icon: Settings })),
    ],
  },
  {
    label: "Back",
    items: [{ to: "/app/dashboard", label: "Protocol app", icon: LayoutDashboard }],
  },
];

export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

function Logo({ compact = false, onNav }: { compact?: boolean; onNav?: () => void }) {
  return (
    <Link
      to="/"
      onClick={onNav}
      aria-label="ROASTAKE home"
      className="inline-flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brass text-charcoal">
        <Coffee className="size-4" aria-hidden="true" />
      </span>
      <span
        className={cn(
          "font-display text-lg font-semibold tracking-tight",
          compact && "hidden sm:inline",
        )}
      >
        ROASTAKE
      </span>
    </Link>
  );
}

export function NetworkSelect() {
  return <SimulatedDemoNetworkSelect className="w-[158px]" />;
}

function Notifications() {
  const s = useDemo();
  const unread = s.notifications.filter((n) => !n.read).length;
  return (
    <Popover onOpenChange={(o) => !o && unread && demo.readAll()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-copper" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-2.5 text-sm font-semibold">
          Notifications <DemoBadge className="ml-1" />
        </div>
        <ul className="max-h-80 overflow-y-auto">
          {s.notifications.length === 0 && (
            <li className="p-4 text-sm text-muted-foreground">No notifications</li>
          )}
          {s.notifications.slice(0, 12).map((n) => (
            <li
              key={n.id}
              className={cn(
                "border-b px-4 py-2.5 text-sm last:border-0",
                !n.read && "bg-accent/40",
              )}
            >
              <p>{n.text}</p>
              <p className="text-xs text-muted-foreground">{n.date}</p>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function WalletButton() {
  return <WalletHubHeaderButton />;
}

function Profile() {
  const s = useDemo();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          aria-label="Open profile and demo role menu"
        >
          <span className="grid size-7 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
            {s.account[0]}
            {s.account.split(" ")[1]?.[0]}
          </span>
          <span className="hidden text-xs lg:inline">{s.role}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{s.account}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Demo role view
        </DropdownMenuLabel>
        {(["User", "Roaster", "Treasury Manager", "Admin"] as Role[]).map((r) => (
          <DropdownMenuItem key={r} onClick={() => demo.setRole(r)}>
            {r === s.role ? "● " : ""}
            {r}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/app/wallet">Multichain Wallet &amp; Demo</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/orders">My orders</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/app/activity">Activity</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Portals (Preview)
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/roaster/$section" params={{ section: "dashboard" }}>
            <Store className="mr-2 size-3.5" aria-hidden="true" />
            Roaster Portal
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/admin">
            <Settings className="mr-2 size-3.5" aria-hidden="true" />
            Admin Console
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => demo.reset()} className="text-loss">
          Reset demo data
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Controls() {
  return (
    <div className="flex items-center gap-1.5">
      <Link
        to="/app/multichain"
        className="hidden items-center gap-1.5 rounded-full border border-primary/20 bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground transition-colors hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring 2xl:inline-flex"
        title="NEAR Testnet is ROASTAKE's primary execution network. Perpetuals, Oracle and RHEA Testnet swap integrations are deployed; prices and coffee inventory remain synthetic or simulated."
      >
        <Sparkles className="size-3" aria-hidden="true" />
        <span>NEAR Testnet · Primary Network</span>
      </Link>
      <Notifications />
      <WalletButton />
      <Profile />
    </div>
  );
}

function NavList({
  groups,
  onNav,
  showPortals = false,
}: {
  groups: Group[];
  onNav?: () => void;
  showPortals?: boolean;
}) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navId = useId();
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(groups.filter((g) => g.collapsible && g.defaultCollapsed).map((g) => g.label)),
  );
  useEffect(() => {
    const activeGroup = groups.find(
      (g) => g.collapsible && g.items.some((i) => path === i.to || path.startsWith(i.to + "/")),
    );
    if (activeGroup) {
      setCollapsed((prev) => {
        if (!prev.has(activeGroup.label)) return prev;
        const next = new Set(prev);
        next.delete(activeGroup.label);
        return next;
      });
    }
  }, [groups, path]);
  const toggle = (label: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  return (
    <nav aria-label="Protocol sections" className="space-y-5">
      {groups.map((g, groupIndex) => {
        const isCollapsed = g.collapsible && collapsed.has(g.label);
        return (
          <div key={g.label}>
            <div className="mb-1.5 flex items-center justify-between gap-2 px-3">
              {g.collapsible ? (
                <button
                  type="button"
                  onClick={() => toggle(g.label)}
                  aria-expanded={!isCollapsed}
                  aria-controls={`${navId}-group-${groupIndex}`}
                  className="flex min-h-8 items-center gap-1 rounded-sm text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                >
                  <span>{g.label}</span>
                  <span aria-hidden="true">{isCollapsed ? "+" : "−"}</span>
                </button>
              ) : (
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/60">
                  {g.label}
                </p>
              )}
              {g.groupBadge && (
                <MaturityBadge
                  variant={g.groupBadge.variant}
                  title={g.groupBadge.title}
                  className="border-sidebar-primary/40 bg-sidebar-accent text-[9px] text-sidebar-foreground"
                >
                  {g.groupBadge.label}
                </MaturityBadge>
              )}
            </div>
            <ul
              id={`${navId}-group-${groupIndex}`}
              hidden={Boolean(isCollapsed)}
              className="space-y-0.5"
            >
              {g.items.map((i) => {
                const active = path === i.to || (i.to !== "/admin" && path.startsWith(i.to + "/"));
                return (
                  <li key={i.to}>
                    <Link
                      to={i.to}
                      onClick={onNav}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-9 items-center justify-between gap-2 rounded-md border-l-2 border-transparent px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-inset",
                        active
                          ? "border-sidebar-primary bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <i.icon
                          className={cn("size-4 shrink-0", active && "text-sidebar-primary")}
                          aria-hidden="true"
                        />
                        <span className="truncate">{i.label}</span>
                      </span>
                      {i.badge && (
                        <MaturityBadge
                          variant={i.badge.variant}
                          className="border-sidebar-primary/40 bg-sidebar-accent text-[9px] text-sidebar-foreground"
                          aria-label={i.badge.title}
                        >
                          {i.badge.label}
                        </MaturityBadge>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {showPortals && (
        <div className="border-t border-sidebar-border pt-4">
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/60">
            Portals (Preview)
          </p>
          <ul className="space-y-0.5">
            <li>
              <Link
                to="/roaster/$section"
                params={{ section: "dashboard" }}
                onClick={onNav}
                className="flex min-h-9 items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              >
                <Store className="size-4 shrink-0" aria-hidden="true" />
                <span>Roaster Portal</span>
              </Link>
            </li>
            <li>
              <Link
                to="/admin"
                onClick={onNav}
                className="flex min-h-9 items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              >
                <Settings className="size-4 shrink-0" aria-hidden="true" />
                <span>Admin Console</span>
              </Link>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}

const MOBILE_TRADE_PATHS = new Set([
  "/app/perps",
  "/app/markets",
  "/app/positions",
  "/app/market-analytics",
]);
const MOBILE_COFFEE_PATHS = new Set([
  "/market",
  "/orders",
  "/app/assets",
  "/app/coffee-passport",
  "/app/roast",
  "/app/redeem",
  "/app/swap",
]);
const MOBILE_PORTFOLIO_PATHS = new Set(["/app/wallet", "/app/activity"]);

export function AppShell({
  children,
  nav = APP_NAV,
  dark = false,
  home = "/app/dashboard",
}: {
  children: ReactNode;
  nav?: Group[];
  dark?: boolean;
  home?: string;
}) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (r) => r.location.pathname });
  const menuTrigger = useRef<HTMLButtonElement | null>(null);
  const isMainAppNav = nav === APP_NAV;
  const currentPage = nav
    .flatMap((group) => group.items)
    .find((item) => path === item.to || (item.to !== "/admin" && path.startsWith(item.to + "/")));
  const workspaceLabel = isMainAppNav ? "Protocol App" : nav[0].label;

  const mobileItems = isMainAppNav
    ? [
        {
          to: "/app/dashboard",
          label: "Overview",
          icon: LayoutDashboard,
          active: path === "/app/dashboard",
        },
        {
          to: "/app/perps",
          label: "Trade",
          icon: ChartCandlestick,
          active: path.startsWith("/app/perps") || MOBILE_TRADE_PATHS.has(path),
        },
        {
          to: "/app/assets",
          label: "Coffee",
          icon: Coffee,
          active:
            path.startsWith("/app/assets") ||
            path.startsWith("/market") ||
            MOBILE_COFFEE_PATHS.has(path),
        },
        {
          to: "/app/wallet",
          label: "Portfolio",
          icon: Wallet,
          active: MOBILE_PORTFOLIO_PATHS.has(path),
        },
      ]
    : nav[0].items.slice(0, 4).map((item) => ({
        to: item.to,
        label: item.label,
        icon: item.icon,
        active: path === item.to || (item.to !== "/admin" && path.startsWith(item.to + "/")),
      }));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className={cn(dark && "dark", "min-h-screen min-w-0 bg-background text-foreground")}>
        <a href="#main-content" className="brand-skip-link">
          Skip to content
        </a>
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar [--ring:var(--sidebar-ring)] lg:flex">
          <div className="flex min-h-16 items-center border-b border-sidebar-border px-5 text-sidebar-foreground">
            <Logo />
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-6">
            <NavList groups={nav} />
          </div>
        </aside>
        <SheetContent
          side="left"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            menuTrigger.current?.focus();
          }}
          className={cn(
            dark && "dark",
            "w-72 max-w-[calc(100vw-1.5rem)] overflow-y-auto border-sidebar-border bg-sidebar p-3 text-sidebar-foreground [--ring:var(--sidebar-ring)] lg:hidden",
          )}
        >
          <SheetTitle className="sr-only">Protocol sections</SheetTitle>
          <SheetDescription className="sr-only">
            Navigate the protocol, coffee marketplace and preview portals.
          </SheetDescription>
          <div className="mb-5 flex min-h-10 items-center pr-8">
            <Logo onNav={() => setOpen(false)} />
          </div>
          <NavList groups={nav} showPortals={isMainAppNav} onNav={() => setOpen(false)} />
        </SheetContent>
        <div className="min-w-0 lg:pl-64">
          <header className="brand-header sticky top-0 z-20 backdrop-blur">
            <div className="brand-container flex min-h-16 min-w-0 items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <SheetTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-9 shrink-0 lg:hidden"
                    aria-label="Open menu"
                    onClick={(event) => {
                      menuTrigger.current = event.currentTarget;
                    }}
                  >
                    <Menu aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <span className="lg:hidden">
                  <Logo compact />
                </span>
                <nav
                  aria-label="Current workspace"
                  className="hidden min-w-0 items-center gap-2 text-sm lg:flex"
                >
                  <Link
                    to={home}
                    className="shrink-0 rounded-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {workspaceLabel}
                  </Link>
                  {currentPage && currentPage.to !== home && (
                    <>
                      <span className="text-muted-foreground" aria-hidden="true">
                        /
                      </span>
                      <span className="truncate text-muted-foreground">{currentPage.label}</span>
                    </>
                  )}
                  <Link
                    to="/market"
                    className="ml-2 hidden shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring xl:inline-flex"
                  >
                    <ShoppingBag className="size-3.5" aria-hidden="true" />
                    Marketplace
                  </Link>
                </nav>
              </div>
              <div className="shrink-0 [&_button[aria-haspopup='menu']]:px-1.5 sm:[&_button[aria-haspopup='menu']]:px-3 [&_button[aria-label='Notifications']]:hidden sm:[&_button[aria-label='Notifications']]:inline-flex">
                <Controls />
              </div>
            </div>
          </header>
          <main
            id="main-content"
            tabIndex={-1}
            className="brand-page min-w-0 pb-[calc(6rem+env(safe-area-inset-bottom))] focus-visible:outline-none lg:pb-10"
          >
            {children}
          </main>
        </div>
        <nav
          aria-label="Quick sections"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          {mobileItems.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              aria-current={i.active ? "page" : undefined}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 border-t-2 border-transparent px-1 py-2 text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                i.active
                  ? "border-primary font-semibold text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <i.icon className="size-5" aria-hidden="true" />
              <span className="truncate">{i.label}</span>
            </Link>
          ))}
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              aria-label="More sections"
              onClick={(event) => {
                menuTrigger.current = event.currentTarget;
              }}
              className="h-auto min-h-14 flex-col gap-0.5 rounded-none border-t-2 border-transparent py-2 text-[10px] text-muted-foreground"
            >
              <Menu className="size-5" aria-hidden="true" />
              <span>More</span>
            </Button>
          </SheetTrigger>
        </nav>
      </div>
    </Sheet>
  );
}

const PUBLIC_LINKS = [
  ["/market", "Market"],
  ["/roasters", "Roasters"],
  ["/app/assets", "Coffee Assets"],
  ["/app/coffee-passport", "Passport"],
  ["/app/perps", "Perpetuals · Testnet"],
  ["/app/dashboard", "Protocol App"],
] as const;
export function PublicShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const cart = useDemo((s) => s.cart.reduce((a, c) => a + c.qty, 0));
  const h = useHydrated();
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="min-h-screen min-w-0 bg-background text-foreground">
        <a href="#main-content" className="brand-skip-link">
          Skip to content
        </a>
        <div className="demo-stripe border-b border-brass/30 px-4 py-1.5 text-center text-[10px] font-medium leading-relaxed tracking-wide text-espresso sm:text-[11px]">
          ROASTAKE Testnet prototype · marketplace, coffee inventory, demo balances & yields are
          simulated; Perps and RHEA swaps use NEAR Testnet transactions.
        </div>
        <header className="brand-header sticky top-0 z-30 backdrop-blur">
          <div className="brand-container flex min-h-16 min-w-0 items-center justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 items-center gap-6">
              <Logo compact />
              <nav aria-label="Main navigation" className="hidden items-center gap-4 xl:flex">
                {PUBLIC_LINKS.map(([to, label]) => {
                  const active = path === to || path.startsWith(to + "/");
                  return (
                    <Link
                      key={to}
                      to={to}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "whitespace-nowrap rounded-sm py-2 text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active ? "font-medium text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex min-w-0 items-center gap-0.5 sm:gap-1.5">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/cart" aria-label="Coffee cart" className="gap-2">
                  <ShoppingBag />
                  {h && cart > 0 && (
                    <span className="num rounded-full bg-copper px-1.5 text-[11px] text-cream">
                      {cart}
                    </span>
                  )}
                </Link>
              </Button>
              <div className="hidden sm:block">
                <Notifications />
              </div>
              <WalletButton />
              <Profile />
              <SheetTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 xl:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu aria-hidden="true" />
                </Button>
              </SheetTrigger>
            </div>
          </div>
        </header>
        <SheetContent
          side="right"
          className="w-80 max-w-[calc(100vw-1.5rem)] overflow-y-auto xl:hidden"
        >
          <SheetTitle className="sr-only">ROASTAKE navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Explore coffee, trading and the protocol app.
          </SheetDescription>
          <div className="mb-8 pr-8">
            <Logo onNav={() => setOpen(false)} />
          </div>
          <nav aria-label="Main navigation" className="space-y-1">
            {[...PUBLIC_LINKS, ["/orders", "Orders"] as const].map(([to, label]) => {
              const active = path === to || path.startsWith(to + "/");
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-accent font-semibold text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
        <main id="main-content" tabIndex={-1} className="min-w-0 focus-visible:outline-none">
          {children}
        </main>
        <footer className="mt-20 bg-forest text-mint">
          <div className="brand-container grid gap-8 py-14 md:grid-cols-4">
            <div>
              <Logo />
              <p className="mt-2 text-sm opacity-80">Roast. Stake. Repeat.</p>
              <p className="mt-4 text-xs opacity-60">
                A Testnet prototype: Perps and RHEA swaps can submit real NEAR Testnet transactions
                using non-monetary test tokens. Marketplace orders, inventory, coffee custody, demo
                balances and yields are simulated; no verified physical backing, real shipments or
                Mainnet deployment.
              </p>
            </div>
            {[
              [
                "Shop",
                [
                  ["/market", "Marketplace"],
                  ["/roasters", "Roasters"],
                  ["/discovery-boxes", "Discovery boxes"],
                  ["/subscriptions", "Subscriptions"],
                  ["/wholesale", "Wholesale"],
                ],
              ],
              [
                "Protocol",
                [
                  ["/app/assets", "Coffee assets"],
                  ["/app/vaults", "Vaults"],
                  ["/app/perps", "Perpetuals"],
                  ["/app/governance", "Governance"],
                  ["/app/ventures", "Ventures"],
                ],
              ],
              [
                "Resources",
                [
                  ["/app/docs", "Documentation"],
                  ["/app/risk-center", "Risk disclosures"],
                  ["/roaster/dashboard", "Roaster portal (preview)"],
                  ["/admin", "Admin console (preview)"],
                ],
              ],
            ].map(([t, ls]) => (
              <div key={t as string}>
                <p className="mb-3 text-xs uppercase tracking-wider text-brass">{t as string}</p>
                <ul className="space-y-1.5 text-sm">
                  {(ls as string[][]).map(([to, l]) => (
                    <li key={to}>
                      <Link to={to} className="opacity-80 hover:opacity-100">
                        {l}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </footer>
      </div>
    </Sheet>
  );
}

export const Section = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("brand-container", className)}>{children}</div>
);
