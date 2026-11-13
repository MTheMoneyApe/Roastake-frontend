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
  Globe,
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

export type NavBadge = { label: string; variant: MaturityVariant; title?: string };
export type NavItem = { to: string; label: string; icon: typeof Coffee; badge?: NavBadge };
export type NavGroup = {
  label: string;
  description?: string;
  groupBadge?: NavBadge;
  items: NavItem[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
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
    label: SCOPE_LABELS.live,
    description: SCOPE_DESCRIPTIONS.live,
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
    label: SCOPE_LABELS.demo,
    description: SCOPE_DESCRIPTIONS.demo,
    groupBadge: { label: "DEMO", variant: "demo" },
    items: [
      { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/market", label: "Marketplace", icon: ShoppingBag },
      { to: "/roasters", label: "Roaster Profiles", icon: Store },
      { to: "/orders", label: "Orders", icon: Truck },
      { to: "/app/assets", label: "Asset Explorer", icon: Wheat },
      { to: "/app/coffee-passport", label: "Coffee Passport", icon: BookOpen },
      { to: "/app/roast", label: "Roasting Lab", icon: Flame },
      { to: "/app/redeem", label: "Redeem", icon: Package },
      { to: "/app/markets", label: "Spot Markets", icon: Gauge },
      { to: "/app/positions", label: "Positions", icon: Layers },
      { to: "/app/market-analytics", label: "Market Analytics", icon: PieChart },
      { to: "/app/activity", label: "Activity", icon: RefreshCw },
      { to: "/app/multichain", label: "Multi-chain Overview", icon: Globe },
      { to: "/app/docs", label: "Prototype Documentation", icon: BookOpen },
    ],
  },
  {
    label: SCOPE_LABELS.planned,
    description: SCOPE_DESCRIPTIONS.planned,
    groupBadge: { label: "PLANNED", variant: "preview" },
    collapsible: true,
    defaultCollapsed: true,
    items: [
      { to: "/roadmap", label: "Ecosystem Roadmap", icon: BookOpen },
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
  },
];

// Public header, mobile drawer and footer share exactly the same destinations and status groups.
export const PUBLIC_NAV: NavGroup[] = APP_NAV.map((group) => ({
  ...group,
  items: group.items.filter((item) =>
    [
      "/app/perps",
      "/app/swap",
      "/app/oracle",
      "/market",
      "/roasters",
      "/app/assets",
      "/app/coffee-passport",
      "/orders",
      "/app/dashboard",
      "/roadmap",
      "/app/vaults",
      "/app/governance",
      "/app/ventures",
      "/subscriptions",
      "/wholesale",
      "/discovery-boxes",
    ].includes(item.to),
  ),
}));

export type RouteScope = keyof typeof SCOPE_LABELS;
export function getRouteScope(pathname: string): RouteScope {
  const path = pathname.replace(/\/+$/, "") || "/";
  // Longest match keeps specific nested destinations unambiguous.
  const groups = [...APP_NAV].reverse();
  for (const group of groups) {
    if (group.items.some(({ to }) => path === to || path.startsWith(`${to}/`))) {
      return group.label === SCOPE_LABELS.live
        ? "live"
        : group.label === SCOPE_LABELS.planned
          ? "planned"
          : "demo";
    }
  }
  // The dynamic roaster/admin sections all render generic planned ModulePage previews.
  if (path === "/roaster" || path.startsWith("/roaster/") || path.startsWith("/admin/"))
    return "planned";
  return "demo";
}

export function getRouteScopeDescription(pathname: string): string {
  if (/^\/app\/perps(?:\/|$)/.test(pathname))
    return "NEAR Testnet execution · operator-controlled synthetic prices. The separate OutLayer read-only oracle does not power Perps. Test tokens have no monetary value.";
  if (/^\/app\/swap(?:\/|$)/.test(pathname))
    return "RHEA Mini Swap · real NEAR Testnet transactions using non-monetary test tokens. Coffee names and lot backing are illustrative; no Mainnet trading or verified physical coffee backing.";
  if (/^\/app\/oracle(?:\/|$)/.test(pathname))
    return "OutLayer Oracle · separate read-only NEAR Testnet integration. It does not power Perps; reading observations does not execute trades or verify physical coffee backing.";
  if (/^\/app\/wallet(?:\/|$)/.test(pathname))
    return "Test-network wallet connections only. NEAR Testnet is the primary execution network; EVM testnets, Solana Devnet and Hyperliquid Testnet are separate wallet contexts. Demo balances are illustrative.";
  return SCOPE_DESCRIPTIONS[getRouteScope(pathname)];
}
