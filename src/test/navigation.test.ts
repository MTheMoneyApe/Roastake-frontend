import { describe, expect, it } from "vitest";
import {
  APP_NAV,
  PUBLIC_NAV,
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
    { name: "public/footer", groups: PUBLIC_NAV },
  ])(
    "has unique destinations and labels with real route-tree matches in $name navigation",
    ({ groups }) => {
      const items = groups.flatMap((group) => group.items);
      expect(new Set(items.map(({ to }) => to)).size).toBe(items.length);
      expect(new Set(items.map(({ label }) => label.toLowerCase())).size).toBe(items.length);
      expect(groups.map(({ label }) => label)).toEqual(Object.values(SCOPE_LABELS));
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

  it("keeps all key planned product names in the roadmap rather than the live or demo groups", () => {
    const planned = APP_NAV.find(({ label }) => label === SCOPE_LABELS.planned)!;
    expect(planned.items.map(({ to }) => to)).toEqual(
      expect.arrayContaining([
        "/roadmap",
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
    for (const group of APP_NAV.slice(0, 2)) {
      for (const { to } of group.items) expect(getRouteScope(to)).not.toBe("planned");
    }
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

  it("distinguishes operator-controlled Perps, non-monetary RHEA and the separate read-only OutLayer source", () => {
    expect(getRouteScopeDescription("/app/perps/COL-G")).toMatch(
      /operator-controlled synthetic prices/,
    );
    expect(getRouteScopeDescription("/app/perps/COL-G")).toMatch(/OutLayer.*does not power Perps/);
    expect(getRouteScopeDescription("/app/swap")).toMatch(
      /real NEAR Testnet transactions using non-monetary test tokens/,
    );
    expect(getRouteScopeDescription("/app/oracle")).toMatch(
      /separate read-only NEAR Testnet integration/,
    );
    expect(getRouteScopeDescription("/app/oracle")).toMatch(/does not power Perps/);
    for (const path of ["/app/perps/COL-G", "/app/swap", "/app/oracle", "/app/wallet"])
      expect(getRouteScope(path)).toBe("live");
  });
});
