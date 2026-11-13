import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { initNetworkBalances, seed } from "./seed";
import type { DemoState, Role } from "./types";
import {
  liqPrice,
  lotAccounting,
  markPrice,
  positionPnl,
  priceOf,
  productLineTotal,
  redemptionQuote,
  roastQuote,
  SPOT,
} from "./calc";
import { productSelectionError, productSelectionLabel } from "./product-options";

const KEY = "roastake-demo-v1";
const fresh = () => {
  const s = seed();
  s.networkBalances = initNetworkBalances(s);
  return s;
};
const SERVER = fresh();
let state: DemoState = SERVER;
const listeners = new Set<() => void>();
let hydrated = false;

export function hydrateDemo() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed.version === SERVER.version) {
        state = parsed;
        listeners.forEach((l) => l());
      }
    }
  } catch {
    /* ignore corrupt demo state */
  }
}

function commit(next: DemoState) {
  state = next;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* The demo remains usable when browser storage is unavailable. */
    }
  }
  listeners.forEach((l) => l());
}

export function useDemo<T = DemoState>(sel?: (s: DemoState) => T): T {
  const s = useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => state,
    () => SERVER,
  );
  return sel ? sel(s) : (s as unknown as T);
}
export const getDemo = () => state;

export class DemoError extends Error {}
const fail = (m: string): never => {
  throw new DemoError(m);
};
const today = () => new Date().toISOString().slice(0, 10);
let counter = 0;
const uid = (p: string) =>
  `${p}-${Date.now().toString(36).slice(-4).toUpperCase()}${(counter++ % 100).toString().padStart(2, "0")}`;

/** Run a simulated action. Validates, mutates a clone, records an auditable demo tx and toasts. */
export function act(
  module: string,
  action: string,
  fn: (d: DemoState) => string | void,
  opts: { silent?: boolean } = {},
) {
  const d: DemoState = structuredClone(state);
  try {
    const detail = fn(d) || "";
    d.txs.unshift({
      id: uid("TX"),
      date: new Date().toISOString(),
      module,
      action,
      detail,
      actor: d.role,
    });
    commit(d);
    if (!opts.silent) toast.success(`${action} · simulated`, { description: detail });
    return true;
  } catch (e) {
    toast.error(e instanceof DemoError ? e.message : "Something went wrong in the simulation");
    return false;
  }
}

const num = (v: number, label = "amount") => {
  if (!Number.isFinite(v) || v <= 0) fail(`Invalid ${label}: enter a positive number`);
  return v;
};
const debit = (d: DemoState, asset: string, amt: number) => {
  if ((d.balances[asset] ?? 0) + 1e-9 < amt) fail(`Insufficient ${asset} balance`);
  d.balances[asset] = +((d.balances[asset] ?? 0) - amt).toFixed(6);
  const nb = (d.networkBalances[asset] ??= { [d.network]: 0 });
  let left = amt;
  for (const k of [d.network, ...Object.keys(nb)]) {
    const take = Math.min(nb[k] ?? 0, left);
    nb[k] = +((nb[k] ?? 0) - take).toFixed(6);
    left -= take;
    if (left <= 1e-9) break;
  }
};
const credit = (d: DemoState, asset: string, amt: number) => {
  d.balances[asset] = +((d.balances[asset] ?? 0) + amt).toFixed(6);
  const nb = (d.networkBalances[asset] ??= {});
  nb[d.network] = +((nb[d.network] ?? 0) + amt).toFixed(6);
};
const notify = (d: DemoState, text: string) =>
  d.notifications.unshift({ id: uid("N"), text, date: today(), read: false });
const ledger = (
  d: DemoState,
  category: string,
  desc: string,
  amount: number,
  bucket = "Operating",
) =>
  d.ledger.unshift({
    id: uid("L"),
    date: new Date().toISOString(),
    category,
    desc,
    amount: +amount.toFixed(2),
    bucket,
  });

export const demo = {
  reset() {
    if (typeof window !== "undefined" && typeof localStorage?.removeItem === "function") {
      try {
        localStorage.removeItem(KEY);
      } catch {
        // Ignore storage errors in restricted or experimental test runtimes
      }
    }
    commit(fresh());
    toast.success("Demo data reset", {
      description: "All simulated balances and history restored to seed.",
    });
  },
  setRole: (r: Role) =>
    act("Session", "Switch role", (d) => {
      d.role = r;
      return `Viewing as ${r}`;
    }),
  setAccount: (a: string) =>
    act("Wallet", "Switch demo account", (d) => {
      d.account = a;
      return a;
    }),
  setNetwork: (n: string) =>
    act("Network", "Switch network", (d) => {
      d.network = n;
      return d.networks.find((x) => x.id === n)?.name;
    }),
  readAll: () =>
    act(
      "Notifications",
      "Mark read",
      (d) => {
        d.notifications.forEach((n) => (n.read = true));
      },
      { silent: true },
    ),

  // ---------- Commerce ----------
  addToCart: (productId: string, qty: number, size: number, grind: string) =>
    act("Marketplace", "Added to cart", (d) => {
      const p = d.products.find((x) => x.id === productId) ?? fail("Product not found");
      const invalid = productSelectionError(p, { qty, size, grind });
      if (invalid) fail(invalid);
      if (
        d.cart.filter((c) => c.productId === productId).reduce((a, c) => a + c.qty, 0) + qty >
        p.stock
      )
        fail("Quantity exceeds demo stock");
      const ex = d.cart.find(
        (c) => c.productId === productId && c.size === size && c.grind === grind,
      );
      if (ex) ex.qty += qty;
      else d.cart.push({ productId, qty, size, grind });
      return `${qty} × ${p.name} · ${productSelectionLabel(p, { size, grind })}`;
    }),
  setCartQty: (i: number, qty: number) =>
    act(
      "Marketplace",
      "Cart updated",
      (d) => {
        const c = d.cart[i] ?? fail("Cart item not found");
        if (!Number.isInteger(qty) || qty < 0) fail("Enter a whole number of packs");
        if (qty === 0) {
          d.cart.splice(i, 1);
          return;
        }
        const p = d.products.find((p) => p.id === c.productId) ?? fail("Product not found");
        const invalid = productSelectionError(p, { ...c, qty });
        if (invalid) fail(invalid);
        const others = d.cart
          .filter((item, index) => index !== i && item.productId === c.productId)
          .reduce((a, item) => a + item.qty, 0);
        if (qty + others > p.stock) fail("Quantity exceeds demo stock");
        c.qty = qty;
      },
      { silent: true },
    ),
  checkout(method: string, discount: number, shipping: Record<string, string>) {
    return act("Marketplace", "Order placed", (d) => {
      if (!d.cart.length) fail("Your cart is empty");
      if (!shipping.name || !shipping.address) fail("Enter a name and shipping address");
      if (!Number.isFinite(discount) || discount < 0 || discount > 1) fail("Invalid discount");
      if (method !== "Card")
        fail("Only simulated card checkout is available; no currency conversion is connected");
      const groups: Record<string, typeof d.cart> = {};
      for (const c of d.cart) {
        const p = d.products.find((x) => x.id === c.productId) ?? fail("Product not found");
        const invalid = productSelectionError(p, c);
        if (invalid) fail(invalid);
        const requested = d.cart
          .filter((item) => item.productId === c.productId)
          .reduce((a, item) => a + item.qty, 0);
        if (p.stock < requested) fail(`Not enough stock for ${p.name}`);
        (groups[p.roasterId] ??= []).push(c);
      }
      let grand = 0;
      const ids: string[] = [];
      for (const [roasterId, items] of Object.entries(groups)) {
        const sub = items.reduce((a, c) => a + lineTotal(d, c), 0);
        const total = +(sub * (1 - discount) + 6).toFixed(2);
        grand += total;
        const id = uid("ORD");
        ids.push(id);
        items.forEach((c) => {
          const p = d.products.find((p) => p.id === c.productId);
          if (p) p.stock -= c.qty;
        });
        d.orders.unshift({
          id,
          date: new Date().toISOString(),
          items,
          roasterId,
          total,
          method: `${method} (simulated)`,
          status: "Paid",
          customer: d.account,
          tracking: "Not shipped · demo",
        });
      }
      const merchandise = grand - ids.length * 6;
      ledger(
        d,
        "Revenue",
        `Marketplace commission ${ids.join(", ")} (EUR; not converted to USDC)`,
        merchandise * (d.fees["Marketplace commission %"] / 100),
        "Marketplace EUR",
      );
      d.cart = [];
      notify(d, `Order${ids.length > 1 ? "s" : ""} ${ids.join(", ")} confirmed (simulated)`);
      return `${ids.length} shipment(s) · €${grand.toFixed(2)} via ${method} (simulated)`;
    });
  },
  advanceOrder: (id: string) =>
    act("Roaster", "Order advanced", (d) => {
      const o = d.orders.find((x) => x.id === id) ?? fail("Order not found");
      const flow = ["Paid", "Roasting", "Shipped", "Delivered"] as const;
      const i = flow.indexOf(o.status as (typeof flow)[number]);
      if (i < 0 || i === 3) fail("Order already completed");
      o.status = flow[i + 1];
      return `${id} → ${o.status}`;
    }),
  subscribe: (productId: string, every: string) =>
    act("Subscriptions", "Subscription created", (d) => {
      d.subscriptions.unshift({ id: uid("SUB"), productId, every, next: today(), active: true });
      return `${d.products.find((p) => p.id === productId)?.name} every ${every}`;
    }),
  toggleSub: (id: string) =>
    act("Subscriptions", "Subscription toggled", (d) => {
      const s = d.subscriptions.find((x) => x.id === id)!;
      s.active = !s.active;
      return `${id} ${s.active ? "resumed" : "paused"}`;
    }),
  wholesaleQuote: (productId: string, kg: number) =>
    act("Wholesale", "Quote requested", (d) => {
      num(kg, "quantity");
      if (kg < 5) fail("Wholesale minimum is 5 kg");
      notify(d, `Wholesale quote for ${kg} kg requested`);
      return `${kg} kg · ${d.products.find((p) => p.id === productId)?.name}`;
    }),

  // ---------- Roaster ----------
  upsertProduct: (p: DemoState["products"][number]) =>
    act("Roaster", "Product saved", (d) => {
      if (!p.name.trim()) fail("Product name is required");
      if (p.price <= 0) fail("Price must be positive");
      const i = d.products.findIndex((x) => x.id === p.id);
      if (i >= 0) d.products[i] = p;
      else d.products.unshift(p);
      return p.name;
    }),
  setStock: (id: string, stock: number) =>
    act("Roaster", "Inventory updated", (d) => {
      if (stock < 0 || !Number.isFinite(stock)) fail("Invalid stock");
      const p = d.products.find((x) => x.id === id)!;
      p.stock = Math.round(stock);
      return `${p.name}: ${p.stock} units`;
    }),
  registerLot: (roasterId: string, name: string, kind: "GCT" | "RCT", kg: number) =>
    act("Roaster", "Tokenization request submitted", (d) => {
      num(kg, "quantity");
      if (!name.trim()) fail("Lot name is required");
      d.tokenizationRequests.unshift({
        id: uid("TKN"),
        roasterId,
        lotName: name,
        kind,
        kg,
        status: "Submitted",
        date: today(),
      });
      return `${name} · ${kg} kg ${kind}`;
    }),
  logRoast: (lot: string, greenKg: number, roastedKg: number, profile: string) =>
    act("Roaster", "Roast logged", (d) => {
      num(greenKg);
      num(roastedKg);
      if (roastedKg > greenKg) fail("Roasted mass cannot exceed green input");
      d.roastRecords.unshift({ id: uid("RR"), date: today(), lot, greenKg, roastedKg, profile });
      return `${lot}: ${greenKg} → ${roastedKg} kg`;
    }),

  // ---------- Admin ----------
  setRoasterStatus: (id: string, status: DemoState["roasters"][number]["status"]) =>
    act("Admin", `Roaster ${status.toLowerCase()}`, (d) => {
      d.roasters.find((r) => r.id === id)!.status = status;
      return id;
    }),
  setProductStatus: (id: string, status: DemoState["products"][number]["status"]) =>
    act("Admin", `Product ${status.toLowerCase()}`, (d) => {
      d.products.find((r) => r.id === id)!.status = status;
      return id;
    }),
  reviewTokenization: (id: string, approve: boolean) =>
    act("Admin", approve ? "Tokenization approved" : "Tokenization rejected", (d) => {
      const r = d.tokenizationRequests.find((x) => x.id === id)!;
      if (r.status === "Approved" || r.status === "Rejected") fail("Request already finalised");
      r.status = approve ? "Approved" : "Rejected";
      if (approve) {
        const roaster = d.roasters.find((x) => x.id === r.roasterId);
        const lotId = `${r.kind}-NEW-${id.slice(-4)}`;
        d.lots.push({
          id: lotId,
          kind: r.kind,
          name: r.lotName,
          origin: "Pending",
          country: "—",
          farm: "—",
          producer: roaster?.name ?? "—",
          variety: "—",
          process: "—",
          harvest: "2026",
          grade: "Pending grading",
          altitude: "—",
          physicalKg: r.kg,
          supply: r.kg,
          encumbered: 0,
          reservedRedemption: 0,
          custodian: "Demo Custody AG (simulated)",
          warehouse: "Intake bay",
          certificates: [],
          price: r.kind === "GCT" ? 8 : 16,
          roasterId: r.roasterId,
          roastYield: r.kind === "GCT" ? 0.84 : undefined,
        });
        d.events.unshift({
          id: uid("EV"),
          lotId,
          type: "Mint",
          qty: r.kg,
          date: today(),
          note: `Minted from ${id} after custody check (simulated)`,
        });
        ledger(
          d,
          "Revenue",
          `Tokenization fee ${id}`,
          r.kg * 8 * (d.fees["Tokenization fee %"] / 100),
        );
      }
      return `${id} · ${r.lotName}`;
    }),
  togglePause: (kind: "lot" | "vault" | "market" | "perp", id: string) =>
    act("Admin", "Pause toggled", (d) => {
      const list =
        kind === "lot"
          ? d.lots
          : kind === "vault"
            ? d.vaults
            : kind === "market"
              ? d.markets
              : d.perpMarkets;
      const x = (list as { id: string; paused?: boolean }[]).find((y) => y.id === id)!;
      x.paused = !x.paused;
      return `${id} ${x.paused ? "paused" : "resumed"}`;
    }),
  setParam: (
    kind: "vaultCap" | "vaultApy" | "cf" | "lt" | "fee" | "roastFee",
    id: string,
    v: number,
  ) =>
    act("Admin", "Parameter updated", (d) => {
      if (!Number.isFinite(v) || v < 0) fail("Invalid parameter");
      if (kind === "vaultCap") d.vaults.find((x) => x.id === id)!.capacity = v;
      if (kind === "vaultApy") d.vaults.find((x) => x.id === id)!.apy = v;
      if (kind === "cf") {
        const m = d.markets.find((x) => x.id === id)!;
        if (v >= m.lt) fail("Collateral factor must be below liquidation threshold");
        m.cf = v;
      }
      if (kind === "lt") {
        const m = d.markets.find((x) => x.id === id)!;
        if (v <= m.cf || v >= 1) fail("Threshold must be above collateral factor and below 1");
        m.lt = v;
      }
      if (kind === "fee") d.fees[id] = v;
      if (kind === "roastFee") {
        if (v > 20) fail("Fee cap is 20%");
        d.roastFeePct = v;
      }
      return `${id} = ${v}`;
    }),

  // ---------- RWA ----------
  mint: (lotId: string, qty: number) =>
    act("Assets", "Mint", (d) => {
      num(qty);
      const l = d.lots.find((x) => x.id === lotId) ?? fail("Lot not found");
      if (l.paused) fail("This lot is paused");
      if (qty > lotAccounting(l).unissued)
        fail(`Cannot mint beyond recorded demo reserve (${lotAccounting(l).unissued} kg headroom)`);
      l.supply += qty;
      credit(d, lotId, qty);
      d.events.unshift({
        id: uid("EV"),
        lotId,
        type: "Mint",
        qty,
        date: new Date().toISOString(),
        note: "Mint against recorded demo reserve; custody not verified",
      });
      return `${qty} ${lotId}`;
    }),
  burn: (lotId: string, qty: number) =>
    act("Assets", "Burn", (d) => {
      num(qty);
      debit(d, lotId, qty);
      const l = d.lots.find((x) => x.id === lotId) ?? fail("Lot not found");
      if (l.paused || qty > l.supply) fail("Lot paused or quantity exceeds supply");
      l.supply -= qty;
      d.events.unshift({
        id: uid("EV"),
        lotId,
        type: "Burn",
        qty,
        date: today(),
        note: "Burn (simulated)",
      });
      return `${qty} ${lotId}`;
    }),
  transfer: (lotId: string, qty: number, to: string) =>
    act("Assets", "Transfer", (d) => {
      num(qty);
      if (!/^0x[0-9a-fA-F]{4,}$/.test(to)) fail("Enter a demo address starting with 0x");
      if (d.lots.find((l) => l.id === lotId)?.paused) fail("Market paused by admin");
      debit(d, lotId, qty);
      d.events.unshift({
        id: uid("EV"),
        lotId,
        type: "Transfer",
        qty,
        date: today(),
        note: `To ${to.slice(0, 10)}… (simulated)`,
      });
      return `${qty} ${lotId} → ${to.slice(0, 10)}…`;
    }),
  reconcile: (lotId: string) =>
    act("Custody", "Reserve reconciled", (d) => {
      const l = d.lots.find((x) => x.id === lotId)!;
      const ok = lotAccounting(l).shortfall === 0;
      d.events.unshift({
        id: uid("EV"),
        lotId,
        type: "Reconcile",
        qty: 0,
        date: today(),
        note: `Physical ${l.physicalKg} kg vs supply ${l.supply} — ${ok ? "covered" : "SHORTFALL"} (demo)`,
      });
      return `${lotId}: ${ok ? "no shortfall in demo records; custody not verified" : "shortfall in demo records"}`;
    }),

  roast: (gctLot: string, kg: number, _yieldPct?: number) =>
    act("Roasting Lab", "Conversion complete", (d) => {
      num(kg);
      const g =
        d.lots.find((x) => x.id === gctLot && x.kind === "GCT") ?? fail("Select a green lot");
      if (g.paused) fail("This lot is paused");
      let r = d.lots.find((x) => x.kind === "RCT" && x.parentLot === gctLot);
      if (r?.paused) fail("The roasted output lot is paused");
      if (kg < 5) fail("Minimum batch is 5 kg");
      if (kg > lotAccounting(g).available || kg > g.supply - g.encumbered)
        fail("Batch exceeds unencumbered coffee or token supply");
      const quote =
        roastQuote(g, kg, d.roastFeePct) ?? fail("This lot has no valid recorded roast yield");
      if (d.roastFeePct < 0 || d.roastFeePct > 100 || !Number.isFinite(d.roastFeePct))
        fail("Invalid roasting fee");
      debit(d, gctLot, kg);
      const { outputKg: output, lossKg: loss, feeKg: fee, netKg: net } = quote;
      g.supply = +(g.supply - kg).toFixed(3);
      g.physicalKg = +(g.physicalKg - kg).toFixed(3);
      if (!r) {
        r = {
          ...g,
          id: gctLot.replace("GCT", "RCT"),
          kind: "RCT",
          name: g.name.replace("Green", "Roasted"),
          physicalKg: 0,
          supply: 0,
          encumbered: 0,
          reservedRedemption: 0,
          parentLot: gctLot,
          grade: "Roast batch",
          price: +(g.price * 1.95).toFixed(2),
          roastYield: undefined,
          certificates: ["Roast log (demo)"],
        };
        d.lots.push(r);
      }
      r.physicalKg = +(r.physicalKg + output).toFixed(3);
      r.supply = +(r.supply + output).toFixed(3); // net to user + fee to treasury; never above roasted mass
      credit(d, r.id, net);
      const id = uid("CNV");
      d.conversions.unshift({
        id,
        date: new Date().toISOString(),
        gctLot,
        rctLot: r.id,
        inputKg: kg,
        outputKg: output,
        lossKg: loss,
        feeKg: fee,
        netKg: net,
      });
      d.events.unshift(
        {
          id: uid("EV"),
          lotId: gctLot,
          type: "Burn",
          qty: kg,
          date: new Date().toISOString(),
          note: `${id} roast input (simulated)`,
        },
        {
          id: uid("EV"),
          lotId: r.id,
          type: "Mint",
          qty: output,
          date: new Date().toISOString(),
          note: `${id}: ${net} to user, ${fee} allocated as protocol fee (simulated)`,
        },
      );
      ledger(d, "Revenue", `Roast fee ${id}: ${fee} kg ${r.id}`, fee * r.price);
      return `${kg} kg GCT → ${net} kg RCT (fee ${fee} kg, loss ${loss} kg)`;
    }),

  redeem: (
    lotId: string,
    qty: number,
    pack: number,
    grind: string,
    country: string,
    address: string,
  ) =>
    act("Redemption", "Redemption requested", (d) => {
      num(qty);
      if (qty < 1) fail("Minimum redemption is 1 kg");
      if (!address.trim()) fail("Enter a delivery address");
      const l =
        d.lots.find((x) => x.id === lotId && x.kind === "RCT") ?? fail("Select a roasted lot");
      if (l.paused) fail("This lot is paused");
      if (
        ![250, 500, 1000].includes(pack) ||
        Math.abs((qty * 1000) / pack - Math.round((qty * 1000) / pack)) > 1e-6
      )
        fail("Quantity must fill whole packs");
      if (!country.trim()) fail("Select a delivery country");
      const avail = Math.min(lotAccounting(l).available, l.supply - l.encumbered);
      if (qty > avail) fail(`Only ${avail.toFixed(1)} kg physically available for redemption`);
      const fees = redemptionQuote(d, qty).total;
      if (!Number.isFinite(fees) || fees < 0 || redemptionQuote(d, qty).processing < 0)
        fail("Invalid redemption processing fee");
      debit(d, "USDC", fees);
      debit(d, lotId, qty);
      l.supply -= qty;
      l.reservedRedemption += qty;
      const id = uid("RDM");
      d.redemptions.unshift({
        id,
        date: new Date().toISOString(),
        lotId,
        qty,
        pack,
        grind,
        country,
        address,
        fees,
        status: "Requested",
      });
      d.events.unshift({
        id: uid("EV"),
        lotId,
        type: "Burn",
        qty,
        date: new Date().toISOString(),
        note: `${id} redemption burn (simulated)`,
      });
      ledger(d, "Revenue", `Redemption processing fee ${id}`, redemptionQuote(d, qty).processing);
      return `${qty} kg ${lotId} · fees ${fees.toFixed(2)} USDC`;
    }),
  advanceRedemption: (id: string) =>
    act("Redemption", "Redemption advanced", (d) => {
      const r = d.redemptions.find((x) => x.id === id) ?? fail("Redemption not found");
      const flow = ["Requested", "Processing", "Prepared", "Shipped", "Delivered"] as const;
      const i = flow.indexOf(r.status);
      if (i < 0 || i === 4) fail("Already delivered or invalid status");
      r.status = flow[i + 1];
      if (r.status === "Delivered") {
        const l = d.lots.find((x) => x.id === r.lotId) ?? fail("Lot not found");
        if (l.reservedRedemption < r.qty || l.physicalKg < r.qty)
          fail("Insufficient recorded redemption reserve");
        l.reservedRedemption = +(l.reservedRedemption - r.qty).toFixed(3);
        l.physicalKg = +(l.physicalKg - r.qty).toFixed(3);
      }
      return `${id} → ${r.status}`;
    }),

  // ---------- DeFi ----------
  vaultDeposit: (vaultId: string, amt: number) =>
    act("Vaults", "Deposit", (d) => {
      num(amt);
      const v = d.vaults.find((x) => x.id === vaultId)!;
      if (v.paused) fail("Vault paused by admin");
      if (v.tvl + amt * priceOf(d, v.asset) > v.capacity) fail("Deposit exceeds vault capacity");
      debit(d, v.asset, amt);
      v.tvl += amt * priceOf(d, v.asset);
      const p = d.vaultPositions.find((x) => x.vaultId === vaultId);
      if (p) {
        p.shares += amt;
        p.deposited += amt;
      } else d.vaultPositions.push({ vaultId, shares: amt, deposited: amt, rewards: 0 });
      return `${amt} ${v.asset} → ${amt} ${v.share}`;
    }),
  vaultWithdraw: (vaultId: string, amt: number) =>
    act("Vaults", "Withdraw", (d) => {
      num(amt);
      const v = d.vaults.find((x) => x.id === vaultId)!;
      const p = d.vaultPositions.find((x) => x.vaultId === vaultId);
      if (!p || p.shares < amt) fail(`Insufficient ${v.share} shares`);
      p!.shares -= amt;
      p!.deposited = Math.max(0, p!.deposited - amt);
      v.tvl -= amt * priceOf(d, v.asset);
      credit(d, v.asset, amt);
      if (p!.shares <= 0 && p!.rewards <= 0)
        d.vaultPositions = d.vaultPositions.filter((x) => x !== p);
      return `${amt} ${v.share} → ${amt} ${v.asset}`;
    }),
  vaultClaim: (vaultId: string) =>
    act("Vaults", "Rewards claimed", (d) => {
      const v = d.vaults.find((x) => x.id === vaultId)!;
      const p = d.vaultPositions.find((x) => x.vaultId === vaultId);
      if (!p || p.rewards <= 0) fail("No rewards to claim");
      credit(d, v.asset, p!.rewards);
      const r = p!.rewards;
      p!.rewards = 0;
      return `${r.toFixed(2)} ${v.asset} (illustrative)`;
    }),
  harvest: () =>
    act("Vaults", "Harvest", (d) => {
      let tot = 0;
      d.vaultPositions.forEach((p) => {
        const v = d.vaults.find((x) => x.id === p.vaultId)!;
        const r = +((p.shares * (v.apy / 100)) / 52).toFixed(4);
        p.rewards += r;
        tot += r;
      });
      d.stakes.forEach((s) => (s.rewards += +((s.amount * (s.apr / 100)) / 52).toFixed(4)));
      d.lpPositions.forEach((l) => (l.rewards += +(l.lp * 0.004).toFixed(4)));
      return `Accrued one simulated week of rewards (${tot.toFixed(2)} vault units)`;
    }),
  stake: (amount: number, lockDays: number) =>
    act("Staking", "Staked", (d) => {
      num(amount);
      debit(d, "COFFEE", amount);
      const apr = { 0: 3, 30: 5, 90: 8, 180: 12, 365: 16 }[lockDays] ?? 3;
      d.stakes.push({
        id: uid("STK"),
        asset: "COFFEE",
        amount,
        lockDays,
        apr,
        start: today(),
        rewards: 0,
      });
      return `${amount} COFFEE · ${lockDays}d lock`;
    }),
  unstake: (id: string, force = false) =>
    act("Staking", "Unstaked", (d) => {
      const s = d.stakes.find((x) => x.id === id)!;
      const elapsed = (Date.now() - new Date(s.start).getTime()) / 864e5;
      if (elapsed < s.lockDays && !force)
        fail(
          `Locked for ${Math.ceil(s.lockDays - elapsed)} more days — use early exit (10% penalty)`,
        );
      const back = elapsed < s.lockDays ? s.amount * 0.9 : s.amount;
      credit(d, "COFFEE", back + s.rewards);
      d.stakes = d.stakes.filter((x) => x.id !== id);
      return `${back.toFixed(2)} COFFEE + ${s.rewards.toFixed(2)} rewards`;
    }),
  claimStake: (id: string) =>
    act("Staking", "Rewards claimed", (d) => {
      const s = d.stakes.find((x) => x.id === id)!;
      if (s.rewards <= 0) fail("No rewards");
      credit(d, "COFFEE", s.rewards);
      const r = s.rewards;
      s.rewards = 0;
      return `${r.toFixed(2)} COFFEE`;
    }),
  addLiquidity: (poolId: string, usdc: number) =>
    act("Farming", "Liquidity added", (d) => {
      num(usdc);
      const p = d.pools.find((x) => x.id === poolId)!;
      const other = usdc / priceOf(d, p.pair[0]);
      debit(d, "USDC", usdc);
      debit(d, p.pair[0], other);
      p.tvl += usdc * 2;
      const lp = d.lpPositions.find((x) => x.poolId === poolId);
      if (lp) lp.lp += usdc;
      else d.lpPositions.push({ poolId, lp: usdc, rewards: 0 });
      return `${usdc} USDC + ${other.toFixed(3)} ${p.pair[0]}`;
    }),
  removeLiquidity: (poolId: string) =>
    act("Farming", "Liquidity removed", (d) => {
      const p = d.pools.find((x) => x.id === poolId)!;
      const lp = d.lpPositions.find((x) => x.poolId === poolId) ?? fail("No LP position");
      credit(d, "USDC", lp.lp);
      credit(d, p.pair[0], lp.lp / priceOf(d, p.pair[0]));
      credit(d, "COFFEE", lp.rewards);
      p.tvl -= lp.lp * 2;
      d.lpPositions = d.lpPositions.filter((x) => x !== lp);
      return `${p.pair.join("/")} position closed`;
    }),
  claimLp: (poolId: string) =>
    act("Farming", "Rewards claimed", (d) => {
      const lp = d.lpPositions.find((x) => x.poolId === poolId)!;
      if (lp.rewards <= 0) fail("No rewards");
      credit(d, "COFFEE", lp.rewards);
      const r = lp.rewards;
      lp.rewards = 0;
      return `${r.toFixed(2)} COFFEE`;
    }),

  swap: (from: string, to: string, amt: number, slippage: number) =>
    act("Swap", "Swap executed", (d) => {
      num(amt);
      if (from === to) fail("Choose two different assets");
      if (!Number.isFinite(slippage) || slippage < 0 || slippage > 100)
        fail("Invalid slippage tolerance");
      if (priceOf(d, from) <= 0 || priceOf(d, to) <= 0) fail("Unknown asset");
      const outputLot = d.lots.find((l) => l.id === to);
      if (d.lots.some((l) => (l.id === from || l.id === to) && l.paused))
        fail("This lot is paused");
      const q = swapQuote(d, from, to, amt);
      if (!Number.isFinite(q.out) || !Number.isFinite(q.feeUsd) || q.feeUsd < 0)
        fail("Invalid swap fee or liquidity quote");
      if (q.impact > slippage)
        fail(`Price impact ${q.impact.toFixed(2)}% exceeds slippage tolerance ${slippage}%`);
      if (q.out <= 0) fail("Unavailable liquidity for this route");
      if (outputLot) {
        const heldElsewhere =
          d.vaultPositions.reduce(
            (a, p) =>
              a +
              (d.vaults.find((v) => v.id === p.vaultId)?.asset === to ? p.shares + p.rewards : 0),
            0,
          ) +
          d.loans.reduce(
            (a, p) =>
              a +
              (d.markets.find((m) => m.id === p.marketId)?.collateral === to ? p.collateral : 0),
            0,
          );
        const protocolFees = d.conversions
          .filter((c) => c.rctLot === to)
          .reduce((sum, c) => sum + c.feeKg, 0);
        if (
          q.out >
          outputLot.supply -
            outputLot.encumbered -
            (d.balances[to] ?? 0) -
            heldElsewhere -
            protocolFees
        )
          fail("Insufficient unallocated demo token inventory");
      }
      debit(d, from, amt);
      credit(d, to, q.out);
      ledger(d, "Revenue", `Swap fee ${from}→${to}`, q.feeUsd);
      return `${amt} ${from} → ${q.out.toFixed(4)} ${to} · protocol fee ${q.feeUsd.toFixed(2)} USDC equivalent`;
    }),

  lend: (marketId: string, op: "supply" | "withdraw" | "borrow" | "repay", amt: number) =>
    act(
      "Lending",
      {
        supply: "Collateral supplied",
        withdraw: "Collateral withdrawn",
        borrow: "Borrowed",
        repay: "Repaid",
      }[op],
      (d) => {
        num(amt);
        const m = d.markets.find((x) => x.id === marketId)!;
        if (m.paused && (op === "supply" || op === "borrow")) fail("Market paused by admin");
        let loan = d.loans.find((x) => x.marketId === marketId);
        if (!loan) {
          loan = { marketId, collateral: 0, debt: 0 };
          d.loans.push(loan);
        }
        const px = priceOf(d, m.collateral);
        if (op === "supply") {
          debit(d, m.collateral, amt);
          loan.collateral += amt;
          m.supplied += amt;
        }
        if (op === "withdraw") {
          if (amt > loan.collateral) fail("Exceeds supplied collateral");
          const after = loan.collateral - amt;
          if (loan.debt > 0 && after * px * m.cf < loan.debt)
            fail("Withdrawal would exceed max LTV");
          loan.collateral = after;
          m.supplied -= amt;
          credit(d, m.collateral, amt);
        }
        if (op === "borrow") {
          const liquidity = m.supplied * px * 4 - m.borrowed;
          if (amt > liquidity) fail("Unavailable liquidity in this isolated market");
          if (loan.debt + amt > loan.collateral * px * m.cf)
            fail(
              `Exceeds borrow limit (${(loan.collateral * px * m.cf - loan.debt).toFixed(2)} ${m.borrowAsset} max)`,
            );
          loan.debt += amt;
          m.borrowed += amt;
          credit(d, m.borrowAsset, amt);
        }
        if (op === "repay") {
          const r = Math.min(amt, loan.debt);
          debit(d, m.borrowAsset, r);
          loan.debt -= r;
          m.borrowed -= r;
          ledger(
            d,
            "Revenue",
            `Lending reserve ${marketId}`,
            r * 0.0068 * (d.fees["Lending reserve factor %"] / 10),
          );
        }
        return `${amt} ${op === "borrow" || op === "repay" ? m.borrowAsset : m.collateral}`;
      },
    ),
  liquidationScenario: (marketId: string) =>
    act("Lending", "Liquidation scenario", (d) => {
      const m = d.markets.find((x) => x.id === marketId)!;
      const loan = d.loans.find((x) => x.marketId === marketId);
      if (!loan || loan.debt <= 0) fail("No open debt to liquidate");
      const px = priceOf(d, m.collateral) * 0.6; // simulated 40% crash
      const hf = (loan!.collateral * px * m.lt) / loan!.debt;
      if (hf >= 1)
        fail(`Even after a 40% simulated drop health factor is ${hf.toFixed(2)} — position safe`);
      const seize = Math.min(loan!.collateral, (loan!.debt * 0.5 * 1.08) / px);
      loan!.collateral -= seize;
      loan!.debt *= 0.5;
      m.supplied -= seize;
      notify(d, `Simulated liquidation in ${marketId}`);
      return `${seize.toFixed(2)} ${m.collateral} seized, debt halved (simulation)`;
    }),

  // ---------- Perps ----------
  perpOrder: (o: {
    market: string;
    side: "Long" | "Short";
    type: "Market" | "Limit";
    size: number;
    leverage: number;
    marginAsset: string;
    mode: "Isolated" | "Cross";
    limit?: number;
  }) =>
    act("Perps", o.type === "Market" ? `Open ${o.side}` : "Limit order placed", (d) => {
      num(o.size, "size");
      const m = d.perpMarkets.find((x) => x.id === o.market)!;
      if (m.paused) fail("Market paused by admin");
      if (o.leverage < 1 || o.leverage > 20) fail("Leverage must be 1–20×");
      const price = o.type === "Market" ? markPrice(d, o.market) : num(o.limit ?? 0, "limit price");
      const marginUsd = (price * o.size) / o.leverage;
      const fee = price * o.size * (d.fees["Perps taker fee %"] / 100);
      const assetAmt = (marginUsd + fee) / (SPOT[o.marginAsset] ?? 1);
      if ((d.balances[o.marginAsset] ?? 0) < assetAmt)
        fail(`Insufficient ${o.marginAsset} margin (needs ${assetAmt.toFixed(4)})`);
      debit(d, o.marginAsset, assetAmt);
      ledger(d, "Revenue", `Perps fee ${o.market}`, fee);
      const id = uid("PO");
      if (o.type === "Limit") {
        d.perpOrders.unshift({
          id,
          market: o.market,
          side: o.side,
          type: "Limit",
          size: o.size,
          price,
          status: "Open",
          date: today(),
          leverage: o.leverage,
          marginAsset: o.marginAsset,
          marginAmt: +(marginUsd / (SPOT[o.marginAsset] ?? 1)).toFixed(8),
          mode: o.mode,
        });
        return `${o.side} ${o.size} ${o.market} @ ${price}`;
      }
      d.perpPositions.push({
        id: uid("POS"),
        market: o.market,
        side: o.side,
        size: o.size,
        entry: price,
        leverage: o.leverage,
        margin: +marginUsd.toFixed(2),
        marginAsset: o.marginAsset,
        mode: o.mode,
        opened: today(),
      });
      d.perpOrders.unshift({
        id,
        market: o.market,
        side: o.side,
        type: "Market",
        size: o.size,
        price,
        status: "Filled",
        date: today(),
      });
      m.oi += price * o.size;
      return `${o.side} ${o.size} ${o.market} @ ${price.toFixed(3)} · ${o.leverage}×`;
    }),
  cancelOrder: (id: string) =>
    act("Perps", "Order cancelled", (d) => {
      const o = d.perpOrders.find((x) => x.id === id)!;
      if (o.status !== "Open") fail("Order not open");
      o.status = "Cancelled";
      const asset = o.marginAsset ?? "USDC";
      const amt = o.marginAmt ?? (o.price * o.size) / (o.leverage ?? 5) / (SPOT[asset] ?? 1);
      credit(d, asset, amt);
      return `${id} · ${amt.toFixed(4)} ${asset} margin returned (fee not refunded)`;
    }),
  closePosition: (id: string) =>
    act("Perps", "Position closed", (d) => {
      const p = d.perpPositions.find((x) => x.id === id)!;
      const pnl = positionPnl(d, p);
      credit(d, "USDC", Math.max(0, p.margin + pnl));
      d.perpPositions = d.perpPositions.filter((x) => x.id !== id);
      d.perpOrders.unshift({
        id: uid("PO"),
        market: p.market,
        side: p.side === "Long" ? "Short" : "Long",
        type: "Market",
        size: p.size,
        price: markPrice(d, p.market),
        status: "Closed",
        pnl,
        date: today(),
      });
      return `${p.market} realized PnL ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} USDC (simulated)`;
    }),
  adjustMargin: (id: string, delta: number) =>
    act("Perps", delta > 0 ? "Margin added" : "Margin removed", (d) => {
      const p = d.perpPositions.find((x) => x.id === id)!;
      if (delta > 0) debit(d, "USDC", delta);
      else {
        if (p.margin + delta < (p.entry * p.size) / 20) fail("Would exceed max leverage");
        credit(d, "USDC", -delta);
      }
      p.margin = +(p.margin + delta).toFixed(2);
      p.leverage = +((p.entry * p.size) / p.margin).toFixed(2);
      return `${id} margin ${p.margin.toFixed(2)} USDC`;
    }),
  setLeverage: (id: string, lev: number) =>
    act("Perps", "Leverage changed", (d) => {
      const p = d.perpPositions.find((x) => x.id === id)!;
      if (lev < 1 || lev > 20) fail("Leverage must be 1–20×");
      const newMargin = (p.entry * p.size) / lev;
      const delta = newMargin - p.margin;
      if (delta > 0) debit(d, "USDC", delta);
      else credit(d, "USDC", -delta);
      p.margin = +newMargin.toFixed(2);
      p.leverage = lev;
      return `${id} → ${lev}×`;
    }),
  tick: (steps: number) =>
    act("Market sim", "Market moved", (d) => {
      d.tick += steps;
      const liq: string[] = [];
      d.perpPositions = d.perpPositions.filter((p) => {
        const mk = markPrice(d, p.market),
          lp = liqPrice(p);
        const hit = p.side === "Long" ? mk <= lp : mk >= lp;
        if (hit) {
          liq.push(p.id);
          d.perpOrders.unshift({
            id: uid("PO"),
            market: p.market,
            side: p.side,
            type: "Market",
            size: p.size,
            price: mk,
            status: "Liquidated",
            pnl: -p.margin,
            date: today(),
          });
        }
        return !hit;
      });
      d.perpOrders
        .filter((o) => o.status === "Open")
        .forEach((o) => {
          const mk = markPrice(d, o.market);
          if ((o.side === "Long" && mk <= o.price) || (o.side === "Short" && mk >= o.price)) {
            o.status = "Filled";
            d.perpPositions.push({
              id: uid("POS"),
              market: o.market,
              side: o.side,
              size: o.size,
              entry: o.price,
              leverage: o.leverage ?? 5,
              margin: +((o.price * o.size) / (o.leverage ?? 5)).toFixed(2),
              marginAsset: o.marginAsset ?? "USDC",
              mode: o.mode ?? "Isolated",
              opened: today(),
            });
            const pm = d.perpMarkets.find((x) => x.id === o.market);
            if (pm) pm.oi += o.price * o.size;
          }
        });
      if (liq.length) notify(d, `Positions liquidated in simulation: ${liq.join(", ")}`);
      return `Simulated clock +${steps}${liq.length ? ` · ${liq.length} liquidation(s)` : ""}`;
    }),

  // ---------- Governance ----------
  vote: (id: string, choice: "For" | "Against" | "Abstain") =>
    act("Governance", "Vote cast", (d) => {
      const p = d.proposals.find((x) => x.id === id)!;
      if (p.status !== "Active") fail("Voting is closed");
      if (d.myVotes[id]) fail("You already voted on this proposal");
      if (d.delegate !== "self") fail(`Voting power delegated to ${d.delegate}`);
      const power = votingPower(d);
      if (power <= 0) fail("No voting power — stake or hold COFFEE");
      if (choice === "For") p.forV += power;
      else if (choice === "Against") p.againstV += power;
      else p.abstainV += power;
      d.myVotes[id] = choice;
      return `${choice} on ${id} with ${power.toLocaleString()} votes`;
    }),
  delegateTo: (to: string) =>
    act("Governance", "Delegation updated", (d) => {
      d.delegate = to || "self";
      return `Delegated to ${d.delegate}`;
    }),
  propose: (title: string, category: string, body: string) =>
    act("Governance", "Proposal created", (d) => {
      if (title.trim().length < 8) fail("Title must be at least 8 characters");
      if (votingPower(d) < 1000) fail("Need 1,000 COFFEE voting power to propose");
      const id = `CIP-${13 + d.proposals.filter((p) => p.id.startsWith("CIP")).length - 4}`;
      d.proposals.unshift({
        id,
        title,
        author: d.account,
        category,
        status: "Active",
        forV: 0,
        againstV: 0,
        abstainV: 0,
        quorum: 8_000_000,
        ends: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
        body,
        comments: [],
      });
      return `${id}: ${title}`;
    }),
  comment: (id: string, text: string) =>
    act(
      "Governance",
      "Comment posted",
      (d) => {
        if (!text.trim()) fail("Comment is empty");
        d.proposals.find((p) => p.id === id)!.comments.push({ who: d.account, text });
      },
      { silent: true },
    ),

  // ---------- Treasury ----------
  treasuryTransfer: (bucket: string, amount: number, desc: string) =>
    act("Treasury", "Ledger transfer", (d) => {
      num(amount);
      if (d.role !== "Treasury Manager" && d.role !== "Admin")
        fail("Switch to Treasury Manager or Admin role to move treasury funds");
      ledger(d, "Transfer", desc || `Allocation to ${bucket}`, -amount, bucket);
      return `${amount.toLocaleString()} USDC → ${bucket} (ledger only)`;
    }),
  setPolicy: (policy: Record<string, number>) =>
    act("Treasury", "Allocation policy updated", (d) => {
      const sum = Object.values(policy).reduce((a, b) => a + b, 0);
      if (Math.round(sum) !== 100) fail(`Allocations must total 100% (currently ${sum}%)`);
      d.allocationPolicy = policy;
    }),

  // ---------- Ventures ----------
  invest: (id: string, amt: number) =>
    act("Ventures", "Demo allocation", (d) => {
      num(amt);
      const v = d.ventures.find((x) => x.id === id)!;
      if (amt < 100) fail("Minimum demo allocation is 100 USDC");
      if (v.raised + amt > v.target) fail("Exceeds remaining funding target");
      if (v.stage === "Funded" || v.stage === "Monitoring") fail("Round closed");
      debit(d, "USDC", amt);
      v.raised += amt;
      d.investments.push({ ventureId: id, amount: amt, date: today() });
      return `${amt} USDC → ${v.name} (illustrative, not an investment)`;
    }),
  applyVenture: (name: string, category: string, ask: number) =>
    act("Ventures", "Application submitted", (d) => {
      if (!name.trim()) fail("Company name required");
      num(ask, "funding ask");
      d.applications.unshift({
        id: uid("APP"),
        name,
        category,
        ask,
        stage: "Submitted",
        date: today(),
      });
      return name;
    }),
  advanceApplication: (id: string) =>
    act("Ventures", "Application advanced", (d) => {
      const a = d.applications.find((x) => x.id === id)!;
      const f = ["Submitted", "Screening", "Committee"] as const;
      const i = f.indexOf(a.stage);
      if (i === 2) fail("Already at committee");
      a.stage = f[i + 1];
      return `${id} → ${a.stage}`;
    }),

  // ---------- Multichain ----------
  bridge: (asset: string, amount: number, from: string, to: string) =>
    act("Multichain", "Bridge transfer", (d) => {
      num(amount);
      if (from === to) fail("Choose different networks");
      const net = d.networks.find((n) => n.id === to)!;
      if (net.status === "Paused") fail(`${net.name} is paused`);
      const nb = d.networkBalances[asset] ?? {};
      if ((nb[from] ?? 0) < amount) fail(`Insufficient ${asset} on ${from}`);
      nb[from] -= amount;
      nb[to] = (nb[to] ?? 0) + amount;
      d.bridgeTransfers.unshift({
        id: uid("BR"),
        asset,
        amount,
        from,
        to,
        date: today(),
        status: "Completed (simulated)",
      });
      return `${amount} ${asset} ${from} → ${to} · canonical supply unchanged`;
    }),
};

export const lineTotal = productLineTotal;
export function votingPower(d: DemoState) {
  return Math.round(
    (d.balances.COFFEE ?? 0) + d.stakes.reduce((a, s) => a + s.amount * (1 + s.lockDays / 365), 0),
  );
}
export function swapQuote(d: DemoState, from: string, to: string, amt: number) {
  const pf = priceOf(d, from),
    pt = priceOf(d, to);
  const usdIn = amt * pf;
  const liquidity =
    d.pools.find((p) => p.pair.includes(from) || p.pair.includes(to))?.tvl ?? 800_000;
  const impact = (usdIn / liquidity) * 100;
  const feeUsd = usdIn * (d.fees["Swap fee %"] / 100);
  const out = pt > 0 ? ((usdIn - feeUsd) * (1 - impact / 100)) / pt : 0;
  return {
    rate: pf / (pt || 1),
    out,
    impact,
    feeUsd,
    liquidity,
    route:
      from.startsWith("GCT") ||
      from.startsWith("RCT") ||
      to.startsWith("GCT") ||
      to.startsWith("RCT")
        ? [from, "USDC", to].filter((x, i, a) => a.indexOf(x) === i)
        : [from, to],
  };
}
