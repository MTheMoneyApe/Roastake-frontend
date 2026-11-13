import { describe, expect, it } from "vitest";
import {
  APP_NAV,
  PUBLIC_NAV,
  ROADMAP_NAV,
  SCOPE_LABELS,
  getRouteScope,
  getRouteScopeDescription,
} from "@/lib/navigation";
import { getRouter } from "@/router";

const routeSources = import.meta.glob("../routes/*.tsx", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

describe("Implementation-status navigation", () => {
  it.each([
    { name: "app", groups: APP_NAV },
    { name: "public/footer", groups: [{ label: "Public", items: PUBLIC_NAV }] },
    { name: "roadmap", groups: [ROADMAP_NAV] },
  ])(
    "has unique destinations and labels with real route-tree matches in $name navigation",
    ({ groups }) => {
      const items = groups.flatMap((group) => group.items);
      expect(new Set(items.map(({ to }) => to)).size).toBe(items.length);
      expect(new Set(items.map(({ label }) => label.toLowerCase())).size).toBe(items.length);
      const router = getRouter();
      for (const { to } of items) {
        expect(to).not.toMatch(/[#?$]/);
        const leaf = router.matchRoutes(to, {}).at(-1);
        expect(leaf, to).toBeDefined();
        expect(leaf?.id, to).not.toBe("__root__");
      }
    },
  );

  it("classifies every generic ModulePage surface as planned, including nested and portal routes", () => {
    const router = getRouter();
    const modulePaths = Object.values(routeSources).flatMap((source) =>
      [...source.matchAll(/<ModulePage\s+path="([^"]+)"/g)].map((match) => match[1]),
    );
    expect(modulePaths.length).toBeGreaterThan(20);
    for (const path of modulePaths) {
      const example = path
        .replace(/\$section/g, "dashboard")
        .replace(/\$id/g, "illustrative-preview");
      expect(getRouteScope(example), path).toBe("planned");
      expect(router.matchRoutes(example, {}).at(-1)?.id, path).not.toBe("__root__");
    }
  });

  it("classifies the mixed positions page by its live Testnet feature and distinguishes local demo data", () => {
    const positions = APP_NAV[0].items.find(({ to }) => to === "/app/positions");
    expect(positions).toBeDefined();
    expect(positions?.badge?.title).toMatch(/live NEAR Testnet positions/i);
    expect(positions?.badge?.title).toMatch(/local demo positions/i);
    expect(APP_NAV[2].items.some(({ to }) => to === "/app/positions")).toBe(false);
    expect(getRouteScope("/app/positions")).toBe("live");
    expect(getRouteScopeDescription("/app/positions")).toMatch(
      /operator-controlled synthetic prices/,
    );
    expect(getRouteScopeDescription("/app/positions")).toMatch(
      /local demo positions.*not on-chain/i,
    );
    expect(getRouteScopeDescription("/app/positions")).toMatch(/no monetary value/);
  });

  it.each([
    "admin.$section.tsx",
    "app.vaults.$id.tsx",
    "app.governance.proposals.$id.tsx",
    "app.ventures.$id.tsx",
  ])("describes %s metadata as a planned preview rather than an operational demo", (file) => {
    const source = routeSources[`../routes/${file}`];
    expect(source).toMatch(/Roadmap \/ Planned/);
    expect(source).not.toMatch(/seo\("(?:Id|Section)"|simulated demo module/);
  });

  it("keeps all key planned product names in the roadmap rather than the live or demo groups", () => {
    const planned = ROADMAP_NAV;
    expect(planned.items.map(({ to }) => to)).toEqual(
      expect.arrayContaining([
        "/app/vaults",
        "/app/governance",
        "/app/ventures",
        "/subscriptions",
        "/wholesale",
        "/discovery-boxes",
        "/app/tokenization",
        "/app/portfolio",
      ]),
    );
    for (const { to } of planned.items) expect(getRouteScope(to)).toBe("planned");
    const appPaths = APP_NAV.flatMap(({ items }) => items.map(({ to }) => to));
    expect(appPaths.filter((to) => getRouteScope(to) === "planned")).toEqual(["/roadmap"]);
    for (const { to } of planned.items) expect(appPaths).not.toContain(to);
  });

  it("keeps the app concise and documentation outside the demo workspace", () => {
    expect(APP_NAV.map(({ label }) => label)).toEqual([
      "Markets / Testnet",
      "Coffee Experience / Demo",
      "Workspace",
      "Roadmap",
      "Documentation",
    ]);
    expect(APP_NAV[0].items).toHaveLength(5);
    expect(APP_NAV[1].items).toHaveLength(5);
    expect(APP_NAV[2]).toMatchObject({ collapsible: true, defaultCollapsed: true });
    expect(APP_NAV[2].items.map(({ to, label }) => ({ to, label }))).toEqual([
      { to: "/app/dashboard", label: "Dashboard" },
      { to: "/app/markets", label: "Markets" },
      { to: "/roasters", label: "Roaster Profiles" },
      { to: "/cart", label: "Coffee Cart" },
      { to: "/app/activity", label: "Orders & Activity" },
    ]);
    expect(APP_NAV.at(-1)).toMatchObject({
      standalone: true,
      items: [{ to: "/app/docs", label: "Documentation" }],
    });
    expect(getRouteScope("/app/docs")).toBe("docs");
    expect(getRouteScope("/app/docs/implementation/")).toBe("docs");
    expect(getRouteScopeDescription("/app/docs")).toMatch(/Product documentation/);
    expect(Object.values(SCOPE_LABELS)).toEqual([
      "Live on NEAR Testnet",
      "Demo / Illustrative",
      "Roadmap / Planned",
    ]);
  });

  it("uses one Launch App destination in a stable order", () => {
    expect(PUBLIC_NAV.map(({ to, label }) => ({ to, label }))).toEqual([
      { to: "/app/perps", label: "Launch App" },
    ]);
  });

  it.each([
    "/market",
    "/market/coffee",
    "/roasters",
    "/roasters/illustrative-profile",
    "/orders",
    "/cart",
    "/checkout",
    "/app/assets/demo-lot",
    "/app/coffee-passport",
    "/app/dashboard",
  ])("labels %s as illustrative rather than live commerce", (path) =>
    expect(getRouteScope(path)).toBe("demo"),
  );

  it("does not label legacy browser markets as live Testnet execution", () => {
    for (const path of ["/app/perps/COL-G", "/app/perps/unknown-market/"]) {
      expect(getRouteScope(path)).toBe("demo");
      expect(getRouteScopeDescription(path)).toMatch(/browser-only simulated market/);
      expect(getRouteScopeDescription(path)).toMatch(/not NEAR Testnet execution/);
    }
    expect(getRouteScopeDescription("/app/activity")).toMatch(
      /receipts.*distinct from browser-only simulated/,
    );
  });

  it("distinguishes operator-controlled Perps, non-monetary RHEA and the separate read-only OutLayer source", () => {
    expect(getRouteScopeDescription("/app/perps/COFFEE-ARABICA-TESTNET-USD")).toMatch(
      /operator-controlled synthetic prices/,
    );
    expect(getRouteScopeDescription("/app/perps/COFFEE-ARABICA-TESTNET-USD")).toMatch(
      /OutLayer.*does not power Perps/,
    );
    expect(getRouteScopeDescription("/app/swap")).toMatch(
      /real NEAR Testnet transactions using non-monetary test tokens/,
    );
    expect(getRouteScopeDescription("/app/oracle")).toMatch(
      /separate read-only NEAR Testnet integration/,
    );
    expect(getRouteScopeDescription("/app/oracle")).toMatch(/does not power Perps/);
    for (const path of [
      "/app/perps/COFFEE-ARABICA-TESTNET-USD",
      "/app/swap",
      "/app/oracle",
      "/app/wallet",
      "/app/activity",
    ])
      expect(getRouteScope(path)).toBe("live");
  });
});
