import { createMemoryHistory } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { ADMIN_NAV, APP_NAV, ROASTER_NAV } from "@/components/shell";
import { getRouter } from "@/router";
import { ROADMAP_NAV } from "@/lib/navigation";

function collectRoutes(groups: typeof APP_NAV) {
  return groups.flatMap((group) => group.items.map((item) => item.to));
}

describe("M04.6 navigation and application routing", () => {
  it("prioritizes testnet markets, coffee demos and workspace before roadmap and docs", () => {
    expect(APP_NAV.map((group) => group.label)).toEqual([
      "Markets / Testnet",
      "Coffee Experience / Demo",
      "Demo Workspace",
      "Roadmap",
      "Documentation",
    ]);
    const flatPaths = collectRoutes(APP_NAV);
    expect(flatPaths.indexOf("/app/wallet")).toBeLessThan(flatPaths.indexOf("/market"));
    expect(flatPaths.indexOf("/app/assets")).toBeLessThan(flatPaths.indexOf("/roadmap"));
    expect(flatPaths.indexOf("/roadmap")).toBeLessThan(flatPaths.indexOf("/app/docs"));
    for (const { to } of ROADMAP_NAV.items) expect(flatPaths).not.toContain(to);
    expect(ROADMAP_NAV.items.map(({ to }) => to)).toEqual(
      expect.arrayContaining(["/admin", "/roaster/dashboard"]),
    );
  });

  it("resolves every navigation route across main nav, portals, and core app/coffee routes", () => {
    const router = getRouter();
    const expectedPaths = Array.from(
      new Set([
        ...collectRoutes(APP_NAV),
        ...collectRoutes([ROADMAP_NAV]),
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
