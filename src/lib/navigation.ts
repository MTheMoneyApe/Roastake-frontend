import {
  Activity,
  BookOpen,
  Briefcase,
  Building2,
  ChartCandlestick,
  Coffee,
  Coins,
  Flame,
  Gauge,
  Landmark,
  Layers,
  LayoutDashboard,
  Package,
  PieChart,
  RefreshCw,
  Repeat,
  Scale,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Sprout,
  Store,
  Truck,
  Users,
  Vote,
  Wallet,
  Wheat,
} from "lucide-react";
import type { MaturityVariant } from "@/components/kit";
import { resolveThreeMarketEntry } from "@/lib/perps/config";

export type NavBadge = { label: string; variant: MaturityVariant; title?: string };
export type NavItem = { to: string; label: string; icon: typeof Coffee; badge?: NavBadge };
export type NavGroup = {
  label: string;
  description?: string;
  groupBadge?: NavBadge;
  items: NavItem[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  standalone?: boolean;
};

export const SCOPE_LABELS = {
  live: "Live on NEAR Testnet",
  demo: "Demo / Illustrative",
  planned: "Roadmap / Planned",
} as const;

export const SCOPE_DESCRIPTIONS = {
  live: "Perps uses operator-controlled synthetic prices. RHEA Mini Swap submits real, non-monetary test-token transactions. OutLayer is a separate read-only oracle; it does not power Perps.",
  demo: "Marketplace, lots, passport, profiles, orders, balances and yields are browser-only illustrations. No verified coffee custody, physical backing, real payments or shipments.",
  planned:
    "Design previews only: not deployed or operational. No live contracts, deposits, yields, governance votes or transactions are available in these modules.",
} as const;

export const APP_NAV: NavGroup[] = [
  {
    label: "Markets / Testnet",
    description: SCOPE_LABELS.live,
    groupBadge: { label: "TESTNET", variant: "testnet" },
    items: [
      {
        to: "/app/perps",
        label: "Perpetuals",
        icon: ChartCandlestick,
        badge: {
          label: "SYNTHETIC",
          variant: "testnet",
          title:
            "NEAR Testnet execution with operator-controlled synthetic prices, not the OutLayer oracle.",
        },
      },
      {
        to: "/app/positions",
        label: "Positions",
        icon: Layers,
        badge: {
          label: "TESTNET + DEMO",
          variant: "testnet",
          title:
            "Live NEAR Testnet positions and separate local demo positions; demo balances are not connected-wallet value.",
        },
      },
      {
        to: "/app/swap",
        label: "RHEA Mini Swap",
        icon: Repeat,
        badge: {
          label: "TEST TOKENS",
          variant: "testnet",
          title: "Real NEAR Testnet transactions using non-monetary test tokens.",
        },
      },
      {
        to: "/app/oracle",
        label: "OutLayer Oracle",
        icon: Activity,
        badge: {
          label: "READ ONLY",
          variant: "testnet",
          title: "Separate read-only OutLayer integration; does not power Perps.",
        },
      },
      {
        to: "/app/wallet",
        label: "Wallet Hub",
        icon: Wallet,
        badge: {
          label: "TESTNETS",
          variant: "testnet",
          title:
            "Wallet connections are restricted to supported test networks; not all wallet networks are NEAR.",
        },
      },
    ],
  },
  {
    label: "Coffee Experience / Demo",
    description: SCOPE_LABELS.demo,
    groupBadge: { label: "DEMO", variant: "demo" },
    items: [
      { to: "/market", label: "Marketplace", icon: ShoppingBag },
      { to: "/app/assets", label: "Coffee Assets", icon: Wheat },
      { to: "/app/coffee-passport", label: "Coffee Passport", icon: BookOpen },
      { to: "/app/roast", label: "Roasting Lab", icon: Flame },
      { to: "/app/redeem", label: "Redeem", icon: Package },
    ],
  },
  {
    label: "Workspace",
    description: SCOPE_LABELS.demo,
    collapsible: true,
    defaultCollapsed: true,
    items: [
      { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/app/markets", label: "Markets", icon: Gauge },
      { to: "/roasters", label: "Roaster Profiles", icon: Store },
      { to: "/cart", label: "Coffee Cart", icon: ShoppingBag },
      {
        to: "/app/activity",
        label: "Orders & Activity",
        icon: RefreshCw,
        badge: {
          label: "TESTNET + DEMO",
          variant: "testnet",
          title: "NEAR Testnet transaction receipts and separate browser-only demo logs. Demo orders remain local to this browser.",
        },
      },
    ],
  },
  {
    label: "Roadmap",
    standalone: true,
    items: [{ to: "/roadmap", label: "Roadmap", icon: BookOpen }],
  },
  {
    label: "Documentation",
    standalone: true,
    items: [{ to: "/app/docs", label: "Documentation", icon: BookOpen }],
  },
];

// Planned previews remain reachable through the roadmap, not as peers of working features.
// This registry also keeps nested route classification independent of navigation visibility.
export const ROADMAP_NAV: NavGroup = {
  label: SCOPE_LABELS.planned,
  description: SCOPE_DESCRIPTIONS.planned,
  items: [
    { to: "/app/vaults", label: "Vaults", icon: Landmark },
    { to: "/app/staking", label: "Staking", icon: Coins },
    { to: "/app/farming", label: "Farming", icon: Sprout },
    { to: "/app/lending", label: "Lending", icon: Scale },
    { to: "/app/borrowing", label: "Borrowing", icon: Wallet },
    { to: "/app/governance", label: "Governance", icon: Vote },
    { to: "/app/governance/proposals", label: "Governance Proposals", icon: Vote },
    { to: "/app/treasury", label: "Treasury", icon: Building2 },
    { to: "/app/ventures", label: "Ventures", icon: Briefcase },
    { to: "/app/ventures/apply", label: "Venture Applications", icon: Briefcase },
    { to: "/app/portfolio", label: "Portfolio Module", icon: PieChart },
    { to: "/app/tokenization", label: "Tokenization", icon: Layers },
    { to: "/app/risk-center", label: "Risk Center", icon: ShieldAlert },
    { to: "/subscriptions", label: "Subscriptions", icon: Repeat },
    { to: "/wholesale", label: "Wholesale", icon: Truck },
    { to: "/discovery-boxes", label: "Discovery Boxes", icon: Coffee },
    { to: "/roaster/dashboard", label: "Roaster Portal", icon: Users },
    { to: "/admin", label: "Admin Console", icon: Settings },
  ],
};

// One concise information architecture for the public header and footer at every size.
export const PUBLIC_NAV: NavItem[] = [
  // One public entry point opens the application; destinations live in its shared sidebar.
  { to: "/app/perps", label: "Launch App", icon: ChartCandlestick },
];

export const DOCUMENTATION_DESCRIPTION =
  "Product documentation and implementation notes. Read the scope of each feature: live NEAR Testnet integrations, browser-only demonstrations and non-operational roadmap previews.";

export type RouteScope = keyof typeof SCOPE_LABELS | "docs";
export function getRouteScope(pathname: string): RouteScope {
  const path = pathname.replace(/\/+$/, "") || "/";
  const matches = (to: string) => path === to || path.startsWith(`${to}/`);
  if (matches("/app/docs")) return "docs";
  if (path.startsWith("/app/perps/")) {
    const entry = resolveThreeMarketEntry(path.slice("/app/perps/".length));
    return entry?.status === "configured_testnet"
      ? "live"
      : entry?.status === "preview"
        ? "planned"
        : "demo";
  }
  if (matches("/app/activity")) return "live";
  if (matches("/roadmap") || ROADMAP_NAV.items.some(({ to }) => matches(to))) return "planned";
  if (APP_NAV[0].items.some(({ to }) => matches(to))) return "live";
  // The dynamic roaster/admin sections all render generic planned ModulePage previews.
  if (path === "/roaster" || path.startsWith("/roaster/") || path.startsWith("/admin/"))
    return "planned";
  return "demo";
}

export function getRouteScopeDescription(pathname: string): string {
  if (/^\/app\/perps(?:\/|$)/.test(pathname)) {
    const scope = getRouteScope(pathname);
    if (scope === "demo")
      return "Legacy browser-only simulated market, not NEAR Testnet execution. No real orders, margin, settlement or connected-wallet value. The separate OutLayer oracle does not power this demo.";
    if (scope === "planned") return SCOPE_DESCRIPTIONS.planned;
    return "NEAR Testnet execution · operator-controlled synthetic prices. The separate OutLayer read-only oracle does not power Perps. Test tokens have no monetary value.";
  }
  if (/^\/app\/activity(?:\/|$)/.test(pathname))
    return "NEAR Testnet session transaction receipts and separately labeled historical proof are distinct from browser-only simulated coffee logs. Test tokens have no monetary value; demo events are not transactions or physical shipments.";
  if (/^\/app\/positions(?:\/|$)/.test(pathname))
    return "Live NEAR Testnet positions use operator-controlled synthetic prices and non-monetary test USDC. Separate local demo positions are browser-only and not on-chain or connected-wallet value. Test tokens have no monetary value.";
  if (/^\/app\/swap(?:\/|$)/.test(pathname))
    return "RHEA Mini Swap · real NEAR Testnet transactions using non-monetary test tokens. Coffee names and lot backing are illustrative; no Mainnet trading or verified physical coffee backing.";
  if (/^\/app\/oracle(?:\/|$)/.test(pathname))
    return "OutLayer Oracle · separate read-only NEAR Testnet integration. It does not power Perps; reading observations does not execute trades or verify physical coffee backing.";
  if (/^\/app\/wallet(?:\/|$)/.test(pathname))
    return "Test-network wallet connections only. NEAR Testnet is the primary execution network; EVM testnets, Solana Devnet and Hyperliquid Testnet are separate wallet contexts. Demo balances are illustrative.";
  const scope = getRouteScope(pathname);
  return scope === "docs" ? DOCUMENTATION_DESCRIPTION : SCOPE_DESCRIPTIONS[scope];
}
