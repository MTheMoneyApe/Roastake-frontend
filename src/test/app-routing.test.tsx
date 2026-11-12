import { createMemoryHistory } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { ADMIN_NAV, APP_NAV, ROASTER_NAV } from "@/components/shell";
import { getRouter } from "@/router";

function collectRoutes(groups: typeof APP_NAV) {
  return groups.flatMap((group) => group.items.map((item) => item.to));
}

describe("M04.6 navigation and application routing", () => {
  it("preserves the exact NEAR-first APP_NAV group hierarchy and ordering", () => {
    expect(APP_NAV.map((group) => group.label)).toEqual([
      "Overview",
      "Trade",
      "Portfolio",
      "Coffee",
      "Labs & Preview",
      "Protocol",
    ]);

    const flatPaths = collectRoutes(APP_NAV);
    expect(flatPaths.indexOf("/app/perps")).toBeLessThan(flatPaths.indexOf("/app/wallet"));
    expect(flatPaths.indexOf("/app/wallet")).toBeLessThan(flatPaths.indexOf("/market"));
    expect(flatPaths.indexOf("/app/assets")).toBeLessThan(flatPaths.indexOf("/app/vaults"));
    expect(flatPaths.indexOf("/app/vaults")).toBeLessThan(flatPaths.indexOf("/app/governance"));
    expect(flatPaths.indexOf("/app/governance")).toBeLessThan(flatPaths.indexOf("/app/oracle"));

    // Secondary operational portals are removed from main APP_NAV sidebar.
    expect(flatPaths).not.toContain("/admin");
    expect(flatPaths).not.toContain("/roaster/dashboard");
  });

  it("resolves every navigation route across main nav, portals, and core app/coffee routes", () => {
    const router = getRouter();
    const expectedPaths = Array.from(
      new Set([
        ...collectRoutes(APP_NAV),
        ...collectRoutes(ROASTER_NAV),
        ...collectRoutes(ADMIN_NAV),
        "/app",
        "/roaster",
        "/roaster/dashboard",
        "/admin",
        "/market",
        "/orders",
        "/app/perps/COL-G",
        "/app/multichain",
      ]),
    );

    for (const path of expectedPaths) {
      const matched = router.matchRoutes(path, {});
      const leaf = matched.at(-1);
      expect(leaf, `Expected route match for ${path}`).toBeDefined();
      expect(leaf?.id, `Expected non-root route for ${path}`).not.toBe("__root__");
    }
  });

  it("redirects /app to /app/dashboard and /roaster to /roaster/dashboard", async () => {
    const appRouter = getRouter();
    appRouter.update({
      ...appRouter.options,
      history: createMemoryHistory({ initialEntries: ["/app"] }),
    });
    await appRouter.load();
    expect(appRouter.state.location.pathname).toBe("/app/dashboard");

    const roasterRouter = getRouter();
    roasterRouter.update({
      ...roasterRouter.options,
      history: createMemoryHistory({ initialEntries: ["/roaster"] }),
    });
    await roasterRouter.load();
    expect(roasterRouter.state.location.pathname).toBe("/roaster/dashboard");
  });
});
