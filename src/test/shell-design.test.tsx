import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_NAV, AppShell, PublicShell, ROASTER_NAV } from "@/components/shell";
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
  document.documentElement.classList.remove("dark");
  document.documentElement.dataset.theme = "light";
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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
      "/app/dashboard",
    );
    expect(within(drawer).getByRole("link", { name: "Coffee Assets" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    fireEvent.keyDown(drawer, { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("uses ordinary links in one concise public navigation and closes on selection", () => {
    location.pathname = "/app/assets/demo-lot";
    render(
      <PublicShell>
        <h1>Coffee assets</h1>
      </PublicShell>,
    );
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    const trigger = within(nav).getByRole("button", { name: "Menu" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(trigger.getAttribute("aria-controls")!)).toHaveAttribute(
      "hidden",
    );
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(PUBLIC_NAV.map(({ to }) => to));
    expect(within(nav).getByRole("link", { name: "Coffee Assets demo" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Coffee Economy" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(within(nav).queryByRole("menuitem")).not.toBeInTheDocument();
    fireEvent.click(within(nav).getByRole("link", { name: "Documentation" }));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    fireEvent.keyDown(within(nav).getByRole("link", { name: "Documentation" }), { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("reuses exactly the same public link tree when the header no longer fits", () => {
    let width = 1600;
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => width);
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(650);
    location.pathname = "/";
    render(
      <PublicShell>
        <h1>Home</h1>
      </PublicShell>,
    );
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    const originalList = nav.querySelector("ul");
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(PUBLIC_NAV.map(({ label }) => label));
    expect(within(nav).getByRole("link", { name: "Coffee Economy" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    width = 400;
    fireEvent(window, new Event("resize"));
    fireEvent.click(within(nav).getByRole("button", { name: "Menu" }));
    expect(nav.querySelector("ul")).toBe(originalList);
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(PUBLIC_NAV.map(({ to }) => to));
    expect(screen.getAllByRole("navigation", { name: "Main navigation" })).toHaveLength(1);
  });

  it.each([320, 390])(
    "hydrates a %ipx public header with a visible trigger and measurable native-popover links",
    async (width) => {
      location.pathname = "/";
      vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(width);
      // Hidden server markup has no intrinsic width, just as in a real browser.
      vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (
        this: HTMLElement,
      ) {
        return this.hasAttribute("hidden") ? 0 : 650;
      });
      const view = (
        <PublicShell>
          <h1>Home</h1>
        </PublicShell>
      );
      const host = document.createElement("div");
      host.innerHTML = renderToString(view);
      document.body.append(host);
      const nativeDescriptor = Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        "showPopover",
      );
      Object.defineProperty(HTMLElement.prototype, "showPopover", {
        configurable: true,
        value: vi.fn(),
      });
      const matches = HTMLElement.prototype.matches;
      vi.spyOn(HTMLElement.prototype, "matches").mockImplementation(function (
        this: HTMLElement,
        selector,
      ) {
        return selector === ":popover-open" ? false : matches.call(this, selector);
      });
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      let root: ReturnType<typeof hydrateRoot> | undefined;
      try {
        await act(async () => {
          root = hydrateRoot(host, view);
        });
        const nav = within(host).getByRole("navigation", { name: "Main navigation" });
        const trigger = within(nav).getByRole("button", { name: "Menu" });
        expect(trigger).not.toHaveClass("hidden");
        expect(trigger).toHaveAttribute("aria-expanded", "false");
        const list = document.getElementById(trigger.getAttribute("aria-controls")!)!;
        expect(list).toHaveAttribute("popover", "auto");
        expect(list).not.toHaveAttribute("hidden");
        expect(
          within(nav)
            .getAllByRole("link")
            .map((link) => link.getAttribute("href")),
        ).toEqual(PUBLIC_NAV.map(({ to }) => to));
        expect(errors).not.toHaveBeenCalled();
      } finally {
        await act(async () => {
          root?.unmount();
        });
        host.remove();
        if (nativeDescriptor)
          Object.defineProperty(HTMLElement.prototype, "showPopover", nativeDescriptor);
        else Reflect.deleteProperty(HTMLElement.prototype, "showPopover");
      }
    },
  );

  it("audits footer destinations against the same public status groups", () => {
    render(
      <PublicShell>
        <h1>Home</h1>
      </PublicShell>,
    );
    const footer = screen.getByRole("contentinfo");
    expect(
      within(footer)
        .getAllByRole("link")
        .filter((link) => link.getAttribute("aria-label") !== "ROASTAKE home")
        .map((link) => link.getAttribute("href")),
    ).toEqual(PUBLIC_NAV.map(({ to }) => to));
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
    expect(screen.getByText(/not deployed or operational/)).toBeInTheDocument();
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
  });

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
    expect(within(sidebar).getByRole("link", { name: "Activity" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const expected = APP_NAV.flatMap(({ items }) => items.map(({ to }) => to));
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
  });
});
