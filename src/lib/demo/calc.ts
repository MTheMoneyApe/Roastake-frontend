import type { CoffeeLot, DemoState, PerpPosition } from "./types";

export const SPOT: Record<string, number> = { USDC: 1, USDT: 1, ETH: 3200, BTC: 68000, SOL: 150, HYPE: 28, COFFEE: 0.42 };
export const MARGIN_ASSETS = ["USDC", "USDT", "ETH", "BTC", "HYPE", "SOL"];

export function priceOf(s: DemoState, asset: string): number {
  if (SPOT[asset] != null) return SPOT[asset];
  const lot = s.lots.find((l) => l.id === asset);
  if (lot) return +(lot.price * (1 + 0.03 * Math.sin(s.tick * 0.9 + lot.price))).toFixed(4);
  return 0;
}

/** Deterministic pseudo-random in [0,1). */
export function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export function markPrice(s: DemoState, marketId: string): number {
  const m = s.perpMarkets.find((p) => p.id === marketId);
  if (!m) return 0;
  const i = s.perpMarkets.indexOf(m);
  return +(m.base * (1 + 0.045 * Math.sin(s.tick * 0.8 + i) + 0.012 * Math.cos(s.tick * 2.1 + i * 3))).toFixed(4);
}
export const indexPrice = (s: DemoState, id: string) => +(markPrice(s, id) * 0.9993).toFixed(4);

export function candles(base: number, seedNum: number, n = 60) {
  const out: { t: number; o: number; h: number; l: number; c: number; v: number }[] = [];
  let p = base * 0.92;
  for (let i = 0; i < n; i++) {
    const r = rand(seedNum * 100 + i);
    const o = p;
    const c = +(o * (1 + (r - 0.48) * 0.04)).toFixed(4);
    const h = Math.max(o, c) * (1 + rand(seedNum + i * 7) * 0.012);
    const l = Math.min(o, c) * (1 - rand(seedNum + i * 13) * 0.012);
    out.push({ t: i, o, h, l, c, v: Math.round(20000 + rand(i + seedNum) * 80000) });
    p = c;
  }
  const scale = base / out[out.length - 1].c;
  return out.map((k) => ({ ...k, o: k.o * scale, h: k.h * scale, l: k.l * scale, c: k.c * scale }));
}

export function series(base: number, seedNum: number, n = 30, drift = 0.002) {
  let v = base * (1 - drift * n * 0.5);
  return Array.from({ length: n }, (_, i) => {
    v = v * (1 + drift + (rand(seedNum + i) - 0.5) * 0.03);
    return { d: `D${i + 1}`, v: +v.toFixed(2) };
  });
}

export function positionPnl(s: DemoState, p: PerpPosition) {
  const mark = markPrice(s, p.market);
  const dir = p.side === "Long" ? 1 : -1;
  return +((mark - p.entry) * p.size * dir).toFixed(2);
}
export function liqPrice(p: PerpPosition) {
  const mm = 0.05; // maintenance margin ratio
  const notional = p.entry * p.size;
  const buffer = (p.margin - notional * mm) / p.size;
  return +(p.side === "Long" ? p.entry - buffer : p.entry + buffer).toFixed(4);
}

export function healthFactor(s: DemoState, marketId: string) {
  const m = s.markets.find((x) => x.id === marketId);
  const loan = s.loans.find((x) => x.marketId === marketId);
  if (!m || !loan || loan.debt <= 0) return Infinity;
  return (loan.collateral * priceOf(s, m.collateral) * m.lt) / loan.debt;
}
export function lendLiqPrice(s: DemoState, marketId: string) {
  const m = s.markets.find((x) => x.id === marketId);
  const loan = s.loans.find((x) => x.marketId === marketId);
  if (!m || !loan || loan.collateral <= 0 || loan.debt <= 0) return 0;
  return loan.debt / (loan.collateral * m.lt);
}

export function portfolio(s: DemoState) {
  const wallet = Object.entries(s.balances).reduce((a, [k, v]) => a + v * priceOf(s, k), 0);
  const vaults = s.vaultPositions.reduce((a, p) => {
    const v = s.vaults.find((x) => x.id === p.vaultId);
    return a + (v ? (p.shares + p.rewards) * priceOf(s, v.asset) : 0);
  }, 0);
  const staking = s.stakes.reduce((a, p) => a + (p.amount + p.rewards) * priceOf(s, p.asset), 0);
  const lp = s.lpPositions.reduce((a, p) => a + p.lp * 2 + p.rewards * SPOT.COFFEE, 0);
  const collateral = s.loans.reduce((a, l) => { const m = s.markets.find((m) => m.id === l.marketId); return a + (m ? l.collateral * priceOf(s, m.collateral) : 0); }, 0);
  const debt = s.loans.reduce((a, l) => a + l.debt, 0);
  const perps = s.perpPositions.reduce((a, p) => a + p.margin + positionPnl(s, p), 0);
  const total = wallet + vaults + staking + lp + collateral - debt + perps;
  return { wallet, vaults, staking, lp, collateral, debt, perps, total };
}

export function treasurySummary(s: DemoState) {
  const revenue = s.ledger.filter((l) => l.category === "Revenue").reduce((a, l) => a + l.amount, 0);
  const expenses = s.ledger.filter((l) => l.category === "Expense").reduce((a, l) => a + l.amount, 0);
  const transfers = s.ledger.filter((l) => l.category === "Transfer").reduce((a, l) => a + l.amount, 0);
  const gross = revenue / 0.82; // illustrative: 18% of gross fees paid to LPs / roasters
  return { revenue, expenses, transfers, gross, net: revenue + expenses + transfers };
}

export const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) : "∞");
export const usd = (n: number, d = 2) => `$${fmt(n, d)}`;
export const compact = (n: number) => Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
export const short = (id: string) => id.replace(/-25[A-C]$/, "");

/** Physical categories are disjoint; supply is a claim, never additional mass. */
export function lotAccounting(l: CoffeeLot) {
  const available = Math.max(0, l.physicalKg - l.encumbered - l.reservedRedemption);
  const unissued = Math.max(0, l.physicalKg - l.reservedRedemption - l.supply);
  const shortfall = Math.max(0, l.supply + l.reservedRedemption - l.physicalKg);
  return { available, unissued, shortfall, ratio: l.supply > 0 ? (l.physicalKg - l.reservedRedemption) / l.supply : 0 };
}

export function roastQuote(l: CoffeeLot, inputKg: number, feePct: number) {
  const yieldRatio = l.roastYield;
  if (l.kind !== "GCT" || yieldRatio == null || !Number.isFinite(yieldRatio) || yieldRatio <= 0 || yieldRatio > 1) return null;
  const outputKg = +(inputKg * yieldRatio).toFixed(3);
  const lossKg = +(inputKg - outputKg).toFixed(3);
  const feeKg = +(outputKg * feePct / 100).toFixed(3);
  return { inputKg, outputKg, lossKg, feeKg, netKg: +(outputKg - feeKg).toFixed(3), yieldRatio };
}

export function redemptionQuote(s: DemoState, qty: number) {
  const processing = s.fees["Redemption processing (USDC)"] ?? 0;
  const packing = 2.5 * qty;
  const shipping = 6;
  return { processing, packing, shipping, total: +(processing + packing + shipping).toFixed(2) };
}

export function coffeeOverview(s: DemoState) {
  const held = (kind: "GCT" | "RCT") => s.lots.filter((l) => l.kind === kind).reduce((a, l) => a + (s.balances[l.id] ?? 0), 0);
  const gct = held("GCT"), rct = held("RCT");
  const depositedKg = s.vaultPositions.reduce((a, p) => { const v = s.vaults.find((v) => v.id === p.vaultId); return a + (v && s.lots.some((l) => l.id === v.asset) ? p.shares + p.rewards : 0); }, 0);
  const collateralKg = s.loans.reduce((a, p) => { const m = s.markets.find((m) => m.id === p.marketId); return a + (m && s.lots.some((l) => l.id === m.collateral) ? p.collateral : 0); }, 0);
  const totals = s.lots.reduce((a, l) => ({ supply: a.supply + l.supply, physical: a.physical + l.physicalKg, encumbered: a.encumbered + l.encumbered, reserved: a.reserved + l.reservedRedemption, available: a.available + lotAccounting(l).available }), { supply: 0, physical: 0, encumbered: 0, reserved: 0, available: 0 });
  const fees = s.ledger.filter((l) => l.category === "Revenue" && /fee|commission|reserve factor|lending reserve/i.test(l.desc)).sort((a, b) => b.date.localeCompare(a.date));
  return { gct, rct, walletKg: gct + rct, depositedKg, collateralKg, representedKg: gct + rct + depositedKg + collateralKg, ...totals, fees, recentFees: fees.slice(0, 5).reduce((a, l) => a + l.amount, 0) };
}

export interface CoffeeActivity { id: string; date: string; action: string; detail: string; quantity: string; status: string; category: string }
export function coffeeActivity(s: DemoState): CoffeeActivity[] {
  const rows: CoffeeActivity[] = [
    ...s.events.map((e) => ({ id: e.id, date: e.date, action: e.type === "Audit" ? "Custody record" : e.type, detail: `${e.lotId} · ${e.note}`, quantity: e.qty ? `${fmt(e.qty, 3)} tokens` : "—", status: "Recorded", category: "Assets" })),
    ...s.conversions.map((c) => ({ id: c.id, date: c.date, action: "Roasting conversion", detail: `${c.gctLot} → ${c.rctLot} · loss ${fmt(c.lossKg, 3)} kg · fee ${fmt(c.feeKg, 3)} kg`, quantity: `${fmt(c.inputKg, 3)} → ${fmt(c.netKg, 3)} kg net`, status: "Completed", category: "Roasting" })),
    ...s.redemptions.map((r) => ({ id: r.id, date: r.date, action: "Coffee redemption", detail: `${r.lotId} · ${fmt(r.fees)} USDC service total`, quantity: `${fmt(r.qty, 3)} kg`, status: r.status, category: "Redemption" })),
    ...s.orders.filter((o) => o.customer === s.account).map((o) => ({ id: o.id, date: o.date, action: "Marketplace purchase", detail: `${o.id} · ${o.method}`, quantity: `€${fmt(o.total)}`, status: o.status, category: "Marketplace" })),
    ...coffeeOverview(s).fees.map((f) => ({ id: f.id, date: f.date, action: "Protocol fee", detail: f.desc, quantity: usd(f.amount), status: "Recorded", category: "Fees" })),
    ...s.txs.filter((t) => !["Assets", "Roasting Lab", "Redemption", "Notifications", "Session", "Network"].includes(t.module) && !(t.module === "Marketplace" && /Order/.test(t.action))).map((t) => ({ id: t.id, date: t.date, action: t.action, detail: t.detail, quantity: "See details", status: "Completed", category: t.module })),
  ];
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}
