import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
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
  Users,
  Wallet,
  Wheat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useDemo } from "@/lib/demo/store";
import { cn } from "@/lib/utils";
import { WalletHubHeaderButton } from "@/components/wallet/wallet-hub";
import { SimulatedDemoNetworkSelect } from "@/components/wallet/wallet-pages";
import { MaturityBadge } from "./kit";
import { ThemeToggle } from "@/components/theme-provider";
import { LandingLanguageProvider, useLandingLanguage } from "@/components/landing-language";

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
      ["orders", "Orders", Package],
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

export function WalletButton() {
  return (
    <div className="max-[400px]:[&_button]:size-10 max-[400px]:[&_button]:p-0 max-[400px]:[&_button>span.font-mono]:hidden">
      <WalletHubHeaderButton />
    </div>
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
      <WalletButton />
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
  home = "/",
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
  const workspaceLabel = nav === APP_NAV ? "ROASTAKE" : nav[0].label;

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
              <div className="shrink-0">
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

/**
 * All non-landing public routes use the same application shell and sidebar as Perps.
 * Keep this compatibility export so existing route modules inherit the shared layout.
 */
export function PublicShell({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

/** The Coffee Economy landing is the only route with its own editorial shell. */
export function LandingShell({ children }: { children: ReactNode }) {
  return (
    <LandingLanguageProvider>
      <LandingShellContent>{children}</LandingShellContent>
    </LandingLanguageProvider>
  );
}

function LandingShellContent({ children }: { children: ReactNode }) {
  const { language, setLanguage } = useLandingLanguage();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const es = language === "es";
  const cart = useDemo((s) => s.cart.reduce((a, c) => a + c.qty, 0));
  const h = useHydrated();
  return (
    <div lang={language} className="min-h-screen min-w-0 bg-background text-foreground">
      <a href="#main-content" className="brand-skip-link">
        {es ? "Saltar al contenido" : "Skip to content"}
      </a>
      <header className="brand-header sticky top-0 z-30 backdrop-blur">
        <div className="brand-container flex min-h-16 min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 py-2 sm:flex-nowrap sm:gap-4 sm:py-0">
          <Logo compact />
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <select
              aria-label="Language / Idioma"
              value={language}
              onChange={(event) => setLanguage(event.target.value === "es" ? "es" : "en")}
              className="min-h-11 rounded-md border border-border bg-background px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <option value="en" lang="en">
                EN
              </option>
              <option value="es" lang="es">
                ES
              </option>
            </select>
            <ThemeToggle />
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Button variant="ghost" size="icon" asChild>
                <Link
                  to="/cart"
                  aria-label={es ? "Carrito de café" : "Coffee cart"}
                  className="relative min-h-11 min-w-11 gap-1"
                >
                  <ShoppingBag />
                  {h && cart > 0 && (
                    <span className="num rounded-full bg-highlight px-1.5 text-[11px] text-highlight-foreground">
                      {cart}
                    </span>
                  )}
                </Link>
              </Button>
              <div className="hidden sm:block">
                <WalletButton />
              </div>
            </div>
          </div>
        </div>
      </header>
      <main
        lang={path === "/" ? language : "en"}
        id="main-content"
        tabIndex={-1}
        className="min-w-0 focus-visible:outline-none"
      >
        {path !== "/" && (
          <div lang="en">
            <ScopeNotice publicPage />
          </div>
        )}
        {children}
      </main>
      <footer className="mt-20 bg-feature text-feature-foreground">
        <div className="brand-container grid gap-8 py-14 md:grid-cols-2">
          <div>
            <Logo />
            <p className="mt-2 text-sm text-feature-muted">
              {es
                ? "La infraestructura financiera para la economía real del café."
                : "The financial infrastructure for the real coffee economy."}
            </p>
            <p className="mt-4 text-xs leading-relaxed text-feature-muted">
              {es
                ? "Solo NEAR Testnet. Tokens sin valor monetario, precios sintéticos y demos ilustrativas. El oráculo OutLayer es independiente y no alimenta Perps. Sin respaldo físico verificado, envíos reales ni productos de inversión activos."
                : "NEAR Testnet only. Non-monetary test tokens, synthetic prices and illustrative demos. The separate read-only OutLayer oracle does not power Perps. No verified physical backing, real shipments or live investment products."}
            </p>
          </div>
          <nav aria-label={es ? "Explorar" : "Explore"}>
            <p className="mb-3 text-xs uppercase tracking-wider text-feature-highlight">
              {es ? "Explorar" : "Explore"}
            </p>
            <ul className="space-y-1.5 text-sm">
              {PUBLIC_NAV.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="inline-flex min-h-11 items-center rounded-sm text-feature-muted hover:text-feature-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {es ? "Iniciar app" : label}
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
