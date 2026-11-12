import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_NAV, AppShell, PublicShell, ROASTER_NAV } from "@/components/shell";

const location = vi.hoisted(() => ({ pathname: "/app/assets" }));

vi.mock("@tanstack/react-router", () => ({
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
        event.preventDefault();
        onClick?.(event);
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
});
afterEach(cleanup);

describe("Shared brand shells", () => {
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
    expect(within(quickNav).getByRole("link", { name: "Trade" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(quickNav.className).toContain("safe-area-inset-bottom");
    const disclosure = screen.getByRole("button", { name: "Labs & Preview" });
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
    const expectedLinks = within(desktopNav)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
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
    ).toEqual([...expectedLinks, "/orders"]);
    expect(within(drawerNav).getByRole("link", { name: "Market" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    fireEvent.click(within(drawerNav).getByRole("link", { name: "Coffee Assets" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("opens the selected preview group without changing its hierarchy", () => {
    location.pathname = "/app/vaults";
    render(
      <AppShell>
        <h1>Vaults</h1>
      </AppShell>,
    );
    expect(screen.getByRole("button", { name: "Labs & Preview" })).toHaveAttribute(
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
