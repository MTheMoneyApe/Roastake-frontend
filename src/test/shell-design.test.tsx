import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_NAV, AppShell, LandingShell, PublicShell, ROASTER_NAV } from "@/components/shell";
import { ThemeProvider, THEME_STORAGE_KEY } from "@/components/theme-provider";
import { APP_NAV, PUBLIC_NAV, ROADMAP_NAV } from "@/lib/navigation";
import { ModulePage } from "@/components/module-page";
import { RoadmapPage } from "@/routes/roadmap";

const location = vi.hoisted(() => ({ pathname: "/app/assets" }));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
  useParams: () => ({}),
  useRouterState: ({ select }: { select: (state: { location: typeof location }) => unknown }) =>
    select({ location }),
  Link: ({
    to,
    params,
    children,
    onClick,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string;
    params?: Record<string, string>;
    children?: ReactNode;
  }) => (
    <a
      {...props}
      href={Object.entries(params ?? {}).reduce(
        (path, [key, value]) => path.replace(`$${key}`, value),
        to,
      )}
      onClick={(event) => {
        // Like TanStack Link, run the caller's handler before preventing SPA navigation.
        onClick?.(event);
        event.preventDefault();
      }}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/components/wallet/wallet-hub", () => ({
  WalletHubHeaderButton: () => <button type="button">Connect Wallet</button>,
}));
vi.mock("@/components/wallet/wallet-pages", () => ({
  SimulatedDemoNetworkSelect: () => <select aria-label="Demo network" />,
}));

beforeEach(() => {
  location.pathname = "/app/assets";
  window.localStorage.removeItem(THEME_STORAGE_KEY);
  window.localStorage.removeItem("roastake-degen-mode");
  window.localStorage.removeItem("roastake-public-language");
  delete document.body.dataset.degen;
  document.documentElement.classList.remove("dark");
  document.documentElement.dataset.theme = "light";
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete document.body.dataset.degen;
});

describe("Shared brand shells", () => {
  it("keeps cart and checkout reachable from the shared mobile app sidebar", async () => {
    window.innerWidth = 320;
    render(
      <PublicShell>
        <h1>Marketplace</h1>
      </PublicShell>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const drawer = await screen.findByRole("dialog", { name: "Protocol sections" });
    fireEvent.click(within(drawer).getByRole("button", { name: /Demo Workspace/ }));
    expect(within(drawer).getByRole("link", { name: "Coffee Cart" })).toHaveAttribute("href", "/cart");
    expect(within(drawer).getByRole("link", { name: "Checkout" })).toHaveAttribute("href", "/checkout");
  });
  it.each([
    {
      label: "public",
      shell: (
        <LandingShell>
          <h1>Marketplace</h1>
        </LandingShell>
      ),
    },
    {
      label: "protocol",
      shell: (
        <AppShell>
          <h1>Protocol</h1>
        </AppShell>
      ),
    },
    {
      label: "admin",
      shell: (
        <AppShell nav={ADMIN_NAV} home="/admin">
          <h1>Admin</h1>
        </AppShell>
      ),
    },
    {
      label: "roaster",
      shell: (
        <AppShell nav={ROASTER_NAV} home="/roaster/dashboard">
          <h1>Roaster</h1>
        </AppShell>
      ),
    },
  ])("exposes one consistent header theme control in the $label shell", ({ shell }) => {
    const { container } = render(<ThemeProvider>{shell}</ThemeProvider>);
    const header = container.querySelector("header")!;
    const toggle = within(header).getByRole("button", { name: "Night mode" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).not.toHaveClass("hidden");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement).toHaveClass("dark");
    expect(container.querySelector(".dark")).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("defaults the protocol app to the public light palette and shared content geometry", () => {
    const { container } = render(
      <AppShell>
        <h1>Coffee assets</h1>
      </AppShell>,
    );
    expect(container.querySelector(".dark")).not.toBeInTheDocument();
    expect(container.querySelector("header")).toHaveClass("brand-header");
    expect(screen.getByRole("main")).toHaveClass("brand-page", "min-w-0");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute(
      "href",
      "#main-content",
    );
    for (const logo of screen.getAllByRole("link", { name: "ROASTAKE home" })) {
      expect(logo).toHaveAttribute("href", "/");
    }
    expect(screen.queryByRole("button", { name: "Notifications" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect Wallet" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open profile and demo role menu" }),
    ).not.toBeInTheDocument();
  });

  it.each([320, 390, 430, 1440])(
    "keeps demo role tools out of the Perps header and mobile drawer at %ipx",
    async (width) => {
      vi.stubGlobal("innerWidth", width);
      location.pathname = "/app/perps";
      try {
        const { container } = render(
          <AppShell>
            <h1>Coffee Index Perpetuals</h1>
          </AppShell>,
        );
        const header = container.querySelector("header")!;
        expect(within(header).getByRole("button", { name: "Connect Wallet" })).toBeInTheDocument();
        expect(within(header).getByRole("button", { name: "Night mode" })).toBeInTheDocument();
        expect(
          within(header).queryByRole("button", { name: /profile|role|notification/i }),
        ).toBeNull();
        expect(header.querySelector('[aria-haspopup="menu"]')).toBeNull();
        expect(header).not.toHaveTextContent(/Demo Explorer|Demo role view|Reset demo data/);
        fireEvent.click(within(header).getByRole("button", { name: "Open menu" }));
        const drawer = await screen.findByRole("dialog", { name: "Protocol sections" });
        expect(drawer).not.toHaveTextContent(/Demo Explorer|Demo role view|Reset demo data/);
        expect(within(drawer).getByRole("link", { name: /^Perpetuals/ })).toHaveAttribute(
          "href",
          "/app/perps",
        );
        fireEvent.keyDown(drawer, { key: "Escape", code: "Escape" });
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(within(header).getByRole("button", { name: "Open menu" })).toHaveFocus();
        expect(screen.getByRole("heading", { name: "Coffee Index Perpetuals" })).toBeVisible();
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );

  it.each([
    {
      nav: ROASTER_NAV,
      home: "/roaster/dashboard",
      path: "/roaster/products",
      label: "Roaster Portal",
    },
    { nav: ADMIN_NAV, home: "/admin", path: "/admin/lots", label: "Admin" },
  ])(
    "keeps $label in the same light shell with its own workspace link",
    ({ nav, home, path, label }) => {
      location.pathname = path;
      const { container } = render(
        <AppShell nav={nav} home={home}>
          <h1>Portal</h1>
        </AppShell>,
      );
      expect(container.querySelector(".dark")).not.toBeInTheDocument();
      const workspace = screen.getByRole("navigation", { name: "Current workspace" });
      expect(within(workspace).getByRole("link", { name: label })).toHaveAttribute("href", home);
      for (const logo of screen.getAllByRole("link", { name: "ROASTAKE home" })) {
        expect(logo).toHaveAttribute("href", home);
      }
    },
  );

  it("marks nested routes current and keeps the compact demo workspace operable", () => {
    location.pathname = "/app/perps/COL-G";
    render(
      <AppShell>
        <h1>Trading</h1>
      </AppShell>,
    );
    const sidebar = screen.getByRole("navigation", { name: "Protocol sections" });
    expect(within(sidebar).getByRole("link", { name: /Perpetuals/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(sidebar).queryByRole("link", { name: "Vaults" })).not.toBeInTheDocument();
    const disclosure = screen.getByRole("button", { name: "Demo Workspace" });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    const target = document.getElementById(disclosure.getAttribute("aria-controls")!);
    expect(target).toHaveAttribute("hidden");
    fireEvent.click(disclosure);
    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(target).not.toHaveAttribute("hidden");
  });

  it("uses an accessible app drawer and returns keyboard focus to the opening control", async () => {
    render(
      <AppShell>
        <h1>Coffee assets</h1>
      </AppShell>,
    );
    const trigger = screen.getByRole("button", { name: "Open menu" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const drawer = await screen.findByRole("dialog", { name: "Protocol sections" });
    expect(drawer).toHaveAccessibleDescription(
      "Navigate the protocol, coffee marketplace and preview portals.",
    );
    expect(within(drawer).getByRole("link", { name: "ROASTAKE home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(within(drawer).getByRole("link", { name: "Coffee Assets" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    fireEvent.keyDown(drawer, { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it.each([320, 390, 430, 639, 640, 1440])(
    "keeps the wallet connection control visible at %ipx",
    (width) => {
      vi.stubGlobal("innerWidth", width);
      location.pathname = "/";
      render(
        <LandingShell>
          <h1>Home</h1>
        </LandingShell>,
      );
      const header = screen.getByRole("banner");
      const wallet = within(header).getByRole("button", { name: "Connect Wallet" });
      expect(wallet).toBeInTheDocument();
      expect(wallet.closest(".hidden")).toBeNull();
      expect(within(header).getByRole("combobox", { name: "Language / Idioma" })).toBeInTheDocument();
      expect(within(header).getByRole("button", { name: "Night mode" })).toBeInTheDocument();
    },
  );

  it("keeps existing English page content correctly marked when public chrome is Spanish", () => {
    location.pathname = "/market";
    render(
      <LandingShell>
        <h1>Marketplace</h1>
      </LandingShell>,
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Language / Idioma" }), {
      target: { value: "es" },
    });
    expect(screen.getByRole("main")).toHaveAttribute("lang", "en");
    expect(screen.getByRole("navigation", { name: "Explorar" })).toHaveTextContent("Iniciar app");
    window.localStorage.removeItem("roastake-public-language");
  });

  it("audits footer destinations against the same public status groups", () => {
    render(
      <LandingShell>
        <h1>Home</h1>
      </LandingShell>,
    );
    const footer = screen.getByRole("contentinfo");
    expect(
      within(footer)
        .getAllByRole("link")
        .filter((link) => link.getAttribute("aria-label") !== "ROASTAKE home")
        .map((link) => link.getAttribute("href")),
    ).toEqual(PUBLIC_NAV.map(({ to }) => to));
    expect(within(footer).getByText(/NEAR Testnet prototype/)).toBeInTheDocument();
    expect(within(footer).getByText(/does not represent verified inventory, custody, physical backing/)).toBeInTheDocument();
  });
  it("shows a persistent Spanish Degen switch only on Perpetuals routes", async () => {
    location.pathname = "/app/perps/COFFEE-ARABICA-TESTNET-USD";
    window.localStorage.setItem("roastake-public-language", "es");
    render(
      <AppShell>
        <h1>Perpetual market</h1>
      </AppShell>,
    );

    const toggle = screen.getByRole("switch", { name: "Modo Degen" });
    expect(toggle).toHaveTextContent("Estándar");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);

    await waitFor(() => expect(toggle).toHaveTextContent("DEGEN ACTIVO ☕📈"));
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await waitFor(() => expect(document.body).toHaveAttribute("data-degen", "true"));
    expect(window.localStorage.getItem("roastake-degen-mode")).toBe("true");
  });

  it("keeps the Degen switch off non-Perpetuals app routes", () => {
    location.pathname = "/app/assets";
    render(
      <AppShell>
        <h1>Assets</h1>
      </AppShell>,
    );
    expect(screen.queryByRole("switch", { name: "Degen Mode" })).not.toBeInTheDocument();
  });


  it.each([
    { path: "/app/perps/COL-G", scope: "demo", text: /Legacy browser-only simulated market/ },
    {
      path: "/app/perps/COFFEE-ARABICA-TESTNET-USD",
      scope: "live",
      text: /operator-controlled synthetic prices/,
    },
    {
      path: "/app/swap",
      scope: "live",
      text: /real NEAR Testnet transactions using non-monetary test tokens/,
    },
    { path: "/app/oracle", scope: "live", text: /does not power Perps/ },
    { path: "/app/assets/demo-lot", scope: "demo", text: /browser-only illustrations/ },
    { path: "/app/docs", scope: "docs", text: /Product documentation/ },
    {
      path: "/app/governance/proposals/preview",
      scope: "planned",
      text: /not deployed or operational/,
    },
  ])("discloses implementation status on the $path route surface", ({ path, scope, text }) => {
    location.pathname = path;
    render(
      <AppShell>
        <h1>Route content preserved</h1>
      </AppShell>,
    );
    const notice = screen.getByRole("complementary", { name: "Implementation status" });
    expect(notice).toHaveAttribute("data-scope", scope);
    expect(within(notice).getByText(text)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Route content preserved" })).toBeInTheDocument();
  });

  it("labels public generic module surfaces as roadmap previews and keeps the module content reachable", () => {
    location.pathname = "/subscriptions";
    render(
      <PublicShell>
        <ModulePage path="/subscriptions" />
      </PublicShell>,
    );
    expect(screen.getByRole("complementary", { name: "Implementation status" })).toHaveAttribute(
      "data-scope",
      "planned",
    );
    expect(screen.getByRole("heading", { name: "Subscriptions" })).toBeInTheDocument();
    expect(screen.getByText("ROADMAP / PLANNED")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore the roadmap" })).toHaveAttribute(
      "href",
      "/roadmap",
    );
    expect(
      screen.getByText(/No live smart contracts, deposits, yields, votes or transactions/),
    ).toBeInTheDocument();
  });

  it("keeps every planned preview reachable from the roadmap", () => {
    render(<RoadmapPage />);
    for (const { to, label } of ROADMAP_NAV.items) {
      expect(
        screen.getByRole("link", {
          name: `${label} Planned · open the non-operational design preview`,
        }),
      ).toHaveAttribute("href", to);
    }
    expect(screen.getByText(/design previews, not deployed capabilities or delivery commitments/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Live on NEAR Testnet" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Demo / Illustrative" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Documentation" })).not.toBeInTheDocument();
  });

  it("keeps planned detail routes accessible without exposing planned peers in the sidebar", () => {
    location.pathname = "/app/governance/proposals/illustrative-preview";
    render(
      <AppShell>
        <h1>Proposal preview</h1>
      </AppShell>,
    );
    const sidebar = screen.getByRole("navigation", { name: "Protocol sections" });
    for (const { label } of ROADMAP_NAV.items)
      expect(within(sidebar).queryByRole("link", { name: label })).not.toBeInTheDocument();
    expect(within(sidebar).getByRole("link", { name: "Roadmap" })).toHaveAttribute(
      "href",
      "/roadmap",
    );
    expect(within(sidebar).getByRole("link", { name: "Documentation" })).toHaveAttribute(
      "href",
      "/app/docs",
    );
  }, 15000);

  it("opens the workspace for its own deep links and shares the same app IA in the mobile drawer", async () => {
    location.pathname = "/app/activity";
    render(
      <AppShell>
        <h1>Activity</h1>
      </AppShell>,
    );
    expect(screen.getByRole("button", { name: "Demo Workspace" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    const sidebar = screen.getByRole("navigation", { name: "Protocol sections" });
    expect(within(sidebar).getByRole("link", { name: /^Activity/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const expected = APP_NAV.filter((group) => group.label !== "Coffee Experience / Demo").flatMap(({ items }) => items.map(({ to }) => to));
    expect(
      within(sidebar)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(expected);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const drawer = await screen.findByRole("dialog", { name: "Protocol sections" });
    expect(
      within(drawer)
        .getAllByRole("link")
        .filter((link) => link.getAttribute("aria-label") !== "ROASTAKE home")
        .map((link) => link.getAttribute("href")),
    ).toEqual(expected);
    const demoToggle = within(drawer).getByRole("button", { name: /Coffee Experience \/ Demo/ });
    expect(demoToggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(demoToggle);
    expect(within(drawer).getByRole("link", { name: "Marketplace" })).toHaveAttribute("href", "/market");
  });
});
