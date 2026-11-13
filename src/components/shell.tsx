import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  Coffee,
  Flame,
  Layers,
  LayoutDashboard,
  Menu,
  Package,
  PieChart,
  Settings,
  ShoppingBag,
  Sparkles,
  Truck,
  Users,
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
import { DemoBadge, MaturityBadge } from "./kit";
import { ThemeToggle } from "@/components/theme-provider";

import {
  APP_NAV,
  PUBLIC_NAV,
  SCOPE_LABELS,
  SCOPE_DESCRIPTIONS,
  getRouteScope,
  getRouteScopeDescription,
  type NavGroup as Group,
} from "@/lib/navigation";
export { APP_NAV } from "@/lib/navigation";

export const ROASTER_NAV: Group[] = [
  {
    label: "Roaster Portal",
    description: SCOPE_DESCRIPTIONS.planned,
    groupBadge: {
      label: "PLANNED",
      variant: "preview",
      title: SCOPE_DESCRIPTIONS.planned,
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
    description: SCOPE_DESCRIPTIONS.planned,
    groupBadge: {
      label: "PLANNED",
      variant: "preview",
      title: SCOPE_DESCRIPTIONS.planned,
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

function Logo({
  to = "/",
  compact = false,
  onNav,
}: {
  to?: string;
  compact?: boolean;
  onNav?: () => void;
}) {
  return (
    <Link
      to={to}
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
  return (
    <div className="max-[400px]:[&_button]:size-10 max-[400px]:[&_button]:p-0 max-[400px]:[&_button>span.font-mono]:hidden">
      <WalletHubHeaderButton />
    </div>
  );
}

function Profile() {
  const s = useDemo();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 px-1.5 sm:px-3"
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
        <DropdownMenuItem asChild>
          <Link to="/roadmap">Roadmap / Planned portals</Link>
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
      <span
        className="hidden items-center gap-1.5 rounded-full border border-primary/20 bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground 2xl:inline-flex"
        title="NEAR Testnet execution with non-monetary test tokens. Perps prices are operator-controlled and synthetic; OutLayer is separate and read-only."
      >
        <Sparkles className="size-3" aria-hidden="true" />
        <span>NEAR Testnet · Test tokens only</span>
      </span>
      <ThemeToggle />
      <Notifications />
      <WalletButton />
      <Profile />
    </div>
  );
}

function NavList({ groups, onNav }: { groups: Group[]; onNav?: () => void }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navId = useId();
  const activeTo = groups
    .flatMap((group) => group.items)
    .filter((item) => path === item.to || (item.to !== "/admin" && path.startsWith(item.to + "/")))
    .sort((a, b) => b.to.length - a.to.length)[0]?.to;
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
            {!g.standalone && (
              <div className="mb-1.5 flex items-center justify-between gap-2 px-3">
                {g.collapsible ? (
                  <button
                    type="button"
                    onClick={() => toggle(g.label)}
                    aria-expanded={!isCollapsed}
                    aria-controls={`${navId}-group-${groupIndex}`}
                    className="flex min-h-8 items-center gap-1 rounded-sm text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  >
                    <span>{g.label}</span>
                    <span aria-hidden="true">{isCollapsed ? "+" : "−"}</span>
                  </button>
                ) : (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground">
                    {g.label}
                  </p>
                )}
                {g.groupBadge && (
                  <MaturityBadge
                    variant={g.groupBadge.variant}
                    title={g.groupBadge.title}
                    className="border-sidebar-primary/40 bg-sidebar-accent text-[9px] text-sidebar-accent-foreground"
                  >
                    {g.groupBadge.label}
                  </MaturityBadge>
                )}
              </div>
            )}
            {g.description && !isCollapsed && (
              <p className="mb-2 px-3 text-[11px] leading-relaxed text-sidebar-foreground/80">
                {g.description}
              </p>
            )}
            <ul
              id={`${navId}-group-${groupIndex}`}
              hidden={Boolean(isCollapsed)}
              className="space-y-0.5"
            >
              {g.items.map((i) => {
                const active = activeTo === i.to;
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
                          className="border-sidebar-primary/40 bg-sidebar-accent text-[9px] text-sidebar-accent-foreground"
                          title={i.badge.title}
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
    </nav>
  );
}

export function AppShell({
  children,
  nav = APP_NAV,
  home = "/app/dashboard",
}: {
  children: ReactNode;
  nav?: Group[];
  home?: string;
}) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (r) => r.location.pathname });
  const menuTrigger = useRef<HTMLButtonElement | null>(null);
  const currentPage = nav
    .flatMap((group) => group.items)
    .filter((item) => path === item.to || (item.to !== "/admin" && path.startsWith(item.to + "/")))
    .sort((a, b) => b.to.length - a.to.length)[0];
  const workspaceLabel = nav === APP_NAV ? "Protocol App" : nav[0].label;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="min-h-screen min-w-0 bg-background text-foreground">
        <a href="#main-content" className="brand-skip-link">
          Skip to content
        </a>
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar [--ring:var(--sidebar-ring)] lg:flex">
          <div className="flex min-h-16 items-center border-b border-sidebar-border px-5 text-sidebar-foreground">
            <Logo to={home} />
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
          className="w-72 max-w-[calc(100vw-1.5rem)] overflow-y-auto border-sidebar-border bg-sidebar p-3 text-sidebar-foreground [--ring:var(--sidebar-ring)] lg:hidden"
        >
          <SheetTitle className="sr-only">Protocol sections</SheetTitle>
          <SheetDescription className="sr-only">
            Navigate the protocol, coffee marketplace and preview portals.
          </SheetDescription>
          <div className="mb-5 flex min-h-10 items-center pr-8">
            <Logo to={home} onNav={() => setOpen(false)} />
          </div>
          <NavList groups={nav} onNav={() => setOpen(false)} />
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
                  <Logo to={home} compact />
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
            className="brand-page min-w-0 pb-10 focus-visible:outline-none"
          >
            <ScopeNotice />
            {children}
          </main>
        </div>
      </div>
    </Sheet>
  );
}

function ScopeNotice({ publicPage = false }: { publicPage?: boolean }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const scope = getRouteScope(path);
  return (
    <aside
      aria-label="Implementation status"
      data-scope={scope}
      className={cn(
        "mb-6 rounded-xl border bg-muted/50 px-4 py-3 text-sm",
        publicPage && "brand-container mt-6",
      )}
    >
      <p className="font-semibold">{scope === "docs" ? "Documentation" : SCOPE_LABELS[scope]}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {getRouteScopeDescription(path)}
      </p>
    </aside>
  );
}

function PublicNavigation() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const id = useId();
  const nav = useRef<HTMLElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [wide, setWide] = useState(false);
  const [open, setOpen] = useState(false);
  // Hydrate the same hidden fallback that the server rendered before enhancing it.
  const [nativePopover, setNativePopover] = useState(false);
  useEffect(() => {
    setNativePopover("showPopover" in HTMLElement.prototype);
  }, []);

  useEffect(() => {
    const menu = list.current;
    const row = nav.current?.parentElement;
    if (!menu || !row) return;
    let lastWidth = 0;
    let inline = false;
    const measure = () => {
      const rowStyle = getComputedStyle(row);
      const width =
        row.clientWidth -
        (parseFloat(rowStyle.paddingLeft) || 0) -
        (parseFloat(rowStyle.paddingRight) || 0);
      if (!width || (!inline && width <= lastWidth)) return;
      lastWidth = width;
      const wasOpen = nativePopover && menu.matches(":popover-open");
      const wasHidden = menu.hidden;
      // A hidden fallback has zero width; measure the actual links, then restore it.
      menu.hidden = false;
      menu.removeAttribute("popover");
      menu.style.cssText =
        "display:flex;position:static;flex-direction:row;column-gap:0.25rem;width:max-content;max-width:none;max-height:none;padding:0;border:0";
      const gap = parseFloat(rowStyle.columnGap) || 0;
      const siblings = Array.from(row.children).filter((child) => child !== nav.current);
      const occupied = siblings.reduce(
        (sum, child) => sum + child.getBoundingClientRect().width,
        0,
      );
      inline = menu.scrollWidth + occupied + gap * siblings.length <= width;
      menu.style.cssText = "";
      menu.hidden = wasHidden;
      if (!inline) {
        menu.setAttribute("popover", "auto");
        if (wasOpen) menu.showPopover();
      } else {
        setOpen(false);
      }
      setWide(inline);
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(row);
    observer?.observe(menu);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [nativePopover]);

  const close = () => {
    if (!wide && nativePopover) list.current?.hidePopover();
    setOpen(false);
  };

  return (
    <nav ref={nav} aria-label="Main navigation" className="shrink-0">
      <Button
        ref={trigger}
        type="button"
        variant="ghost"
        className={wide ? "hidden" : "gap-2"}
        popoverTarget={id}
        aria-controls={id}
        aria-expanded={open}
        onClick={() => {
          if (!nativePopover) setOpen((value) => !value);
        }}
      >
        <Menu className="size-4" aria-hidden="true" />
        <span>Menu</span>
      </Button>
      <ul
        ref={list}
        id={id}
        popover={wide ? undefined : "auto"}
        hidden={!wide && !nativePopover && !open}
        onToggle={(event) => setOpen(event.newState === "open")}
        onKeyDown={(event) => {
          if (!nativePopover && event.key === "Escape") {
            close();
            trigger.current?.focus();
          }
        }}
        className={cn(
          "text-foreground",
          wide
            ? "flex items-center gap-1"
            : "fixed inset-auto right-4 top-32 m-0 max-h-[calc(100dvh-9rem)] w-72 max-w-[calc(100dvw-2rem)] space-y-1 overflow-y-auto rounded-xl border bg-card p-2 shadow-lg",
        )}
      >
        {PUBLIC_NAV.map(({ to, label }) => {
          const active = path === to || (to !== "/" && path.startsWith(to + "/"));
          return (
            <li key={to}>
              <Link
                to={to}
                onClick={close}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center whitespace-nowrap rounded-md border-b-2 border-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring forced-colors:focus-visible:outline",
                  active
                    ? "border-primary bg-accent font-semibold text-accent-foreground forced-colors:border-[Highlight]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  const cart = useDemo((s) => s.cart.reduce((a, c) => a + c.qty, 0));
  const h = useHydrated();
  return (
    <div className="min-h-screen min-w-0 bg-background text-foreground">
      <a href="#main-content" className="brand-skip-link">
        Skip to content
      </a>
      <div className="border-b border-warning-foreground/30 bg-warning px-4 py-1.5 text-center text-[10px] font-medium leading-relaxed tracking-wide text-warning-foreground sm:text-[11px]">
        NEAR Testnet prototype · Perps prices are operator-controlled and synthetic; RHEA uses
        non-monetary test tokens. Marketplace, coffee backing, balances &amp; yields are
        illustrative.
      </div>
      <header className="brand-header sticky top-0 z-30 backdrop-blur">
        <div className="brand-container flex min-h-16 min-w-0 items-center justify-between gap-2 sm:gap-4">
          <Logo compact />
          <PublicNavigation />
          <div className="flex min-w-0 items-center gap-0.5 sm:gap-1.5">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/cart" aria-label="Coffee cart" className="gap-2">
                <ShoppingBag />
                {h && cart > 0 && (
                  <span className="num rounded-full bg-highlight px-1.5 text-[11px] text-highlight-foreground">
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
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="min-w-0 focus-visible:outline-none">
        <ScopeNotice publicPage />
        {children}
      </main>
      <footer className="mt-20 bg-feature text-feature-foreground">
        <div className="brand-container grid gap-8 py-14 md:grid-cols-2">
          <div>
            <Logo />
            <p className="mt-2 text-sm text-feature-muted">Roast. Stake. Repeat.</p>
            <p className="mt-4 text-xs text-feature-muted">
              A Testnet prototype: Perps and RHEA swaps can submit real NEAR Testnet transactions
              using non-monetary test tokens. Perps prices are operator-controlled and synthetic;
              the separate read-only OutLayer oracle does not power Perps. Marketplace orders,
              inventory, coffee custody, demo balances and yields are simulated; no verified
              physical backing, real shipments or Mainnet deployment.
            </p>
          </div>
          <nav aria-label="Explore">
            <p className="mb-3 text-xs uppercase tracking-wider text-feature-highlight">Explore</p>
            <ul className="space-y-1.5 text-sm">
              {PUBLIC_NAV.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="rounded-sm text-feature-muted hover:text-feature-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export const Section = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("brand-container", className)}>{children}</div>
);
