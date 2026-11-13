import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_NAV, AppShell, PublicShell, ROASTER_NAV } from "@/components/shell";
import { ThemeProvider, THEME_STORAGE_KEY } from "@/components/theme-provider";
import { PUBLIC_NAV, SCOPE_LABELS } from "@/lib/navigation";
import { ModulePage } from "@/components/module-page";

const location = vi.hoisted(() => ({ pathname: "/app/assets" }));

vi.mock("@tanstack/react-router", () => ({
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
  document.documentElement.classList.remove("dark");
  document.documentElement.dataset.theme = "light";
});
afterEach(cleanup);

describe("Shared brand shells", () => {
  it.each([
    {
      label: "public",
      shell: (
        <PublicShell>
          <h1>Marketplace</h1>
        </PublicShell>
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
      expect(logo).toHaveAttribute("href", "/app/dashboard");
    }
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect Wallet" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open profile and demo role menu" }),
    ).toBeInTheDocument();
  });

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

  it("marks nested routes and their mobile section current, while keeping preview disclosure operable", () => {
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
    const quickNav = screen.getByRole("navigation", { name: "Quick sections" });
    expect(within(quickNav).getByRole("link", { name: "Testnet" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(quickNav.className).toContain("safe-area-inset-bottom");
    const disclosure = screen.getByRole("button", { name: "Roadmap / Planned" });
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
      "/app/dashboard",
    );
    expect(within(drawer).getByRole("link", { name: "Asset Explorer" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    fireEvent.keyDown(drawer, { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("shares selected public links with a labelled drawer, closes on selection, and restores focus", async () => {
    location.pathname = "/market/coffee";
    const { container } = render(
      <PublicShell>
        <h1>Marketplace</h1>
      </PublicShell>,
    );
    expect(container.querySelector("header")).toHaveClass("brand-header");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    for (const logo of screen.getAllByRole("link", { name: "ROASTAKE home" })) {
      expect(logo).toHaveAttribute("href", "/");
    }
    const desktopNav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(desktopNav).toHaveClass("xl:flex");
    for (const label of Object.values(SCOPE_LABELS)) {
      expect(within(desktopNav).getByRole("button", { name: label })).toBeInTheDocument();
    }
    const expectedLinks = PUBLIC_NAV.flatMap((group) => group.items.map((item) => item.to));
    const trigger = screen.getByRole("button", { name: "Open navigation menu" });
    trigger.focus();
    fireEvent.click(trigger);
    const drawer = await screen.findByRole("dialog", { name: "ROASTAKE navigation" });
    expect(drawer).toHaveAccessibleDescription("Explore coffee, trading and the protocol app.");
    const drawerNav = within(drawer).getByRole("navigation", { name: "Main navigation" });
    expect(
      within(drawerNav)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(expectedLinks);
    expect(within(drawerNav).getByRole("link", { name: "Marketplace" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    fireEvent.click(within(drawerNav).getByRole("link", { name: "Asset Explorer" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("opens the public desktop status dropdown and keeps its links scoped to the selected group", async () => {
    render(
      <PublicShell>
        <h1>Home</h1>
      </PublicShell>,
    );
    const desktop = screen.getByRole("navigation", { name: "Main navigation" });
    fireEvent.keyDown(within(desktop).getByRole("button", { name: SCOPE_LABELS.live }), {
      key: "Enter",
    });
    const menu = await screen.findByRole("menu");
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((link) => link.getAttribute("href")),
    ).toEqual(PUBLIC_NAV[0].items.map((item) => item.to));
    expect(within(menu).getByRole("menuitem", { name: "RHEA Mini Swap" })).toHaveAttribute(
      "href",
      "/app/swap",
    );
    expect(within(menu).queryByText("Vaults")).not.toBeInTheDocument();
    fireEvent.click(within(menu).getByRole("menuitem", { name: "OutLayer Oracle" }));
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("audits footer destinations against the same public status groups", () => {
    render(
      <PublicShell>
        <h1>Home</h1>
      </PublicShell>,
    );
    const footer = screen.getByRole("contentinfo");
    for (const label of Object.values(SCOPE_LABELS))
      expect(within(footer).getByText(label)).toBeInTheDocument();
    expect(
      within(footer)
        .getAllByRole("link")
        .filter((link) => link.getAttribute("aria-label") !== "ROASTAKE home")
        .map((link) => link.getAttribute("href")),
    ).toEqual(PUBLIC_NAV.flatMap((group) => group.items.map((item) => item.to)));
    expect(within(footer).getByText(/OutLayer oracle does not power Perps/)).toBeInTheDocument();
  });

  it.each([
    { path: "/app/perps/COL-G", scope: "live", text: /operator-controlled synthetic prices/ },
    {
      path: "/app/swap",
      scope: "live",
      text: /real NEAR Testnet transactions using non-monetary test tokens/,
    },
    { path: "/app/oracle", scope: "live", text: /does not power Perps/ },
    { path: "/app/assets/demo-lot", scope: "demo", text: /browser-only illustrations/ },
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

  it("marks only the deepest planned destination current in the sidebar", () => {
    location.pathname = "/app/governance/proposals/illustrative-preview";
    render(
      <AppShell>
        <h1>Proposal preview</h1>
      </AppShell>,
    );
    const sidebar = screen.getByRole("navigation", { name: "Protocol sections" });
    expect(within(sidebar).getByRole("link", { name: "Governance Proposals" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(sidebar).getByRole("link", { name: "Governance" })).not.toHaveAttribute(
      "aria-current",
    );
    const quick = screen.getByRole("navigation", { name: "Quick sections" });
    expect(within(quick).getByRole("link", { name: "Roadmap" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("opens the selected preview group without changing its hierarchy", () => {
    location.pathname = "/app/vaults";
    render(
      <AppShell>
        <h1>Vaults</h1>
      </AppShell>,
    );
    expect(screen.getByRole("button", { name: "Roadmap / Planned" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    const sidebar = screen.getByRole("navigation", { name: "Protocol sections" });
    expect(within(sidebar).getByRole("link", { name: "Vaults" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
