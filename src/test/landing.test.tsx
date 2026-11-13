import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LandingPage } from "@/components/landing-page";
import { PublicShell } from "@/components/shell";
import { ThemeProvider, THEME_STORAGE_KEY } from "@/components/theme-provider";

vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { pathname: string } }) => unknown;
  }) => select({ location: { pathname: "/" } }),
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

const sectionTitles = [
  "An essential commodity. A complex global market.",
  "From the ground to a global market.",
  "One economy. Three connected layers.",
  "Explore the ecosystem.",
  "Built around coffee. Not the other way around.",
  "A foundation, then the full value chain.",
  "The future of coffee is more than a cup.",
];

const destinations = [
  "/app/perps",
  "/app/swap",
  "/app/oracle",
  "/market",
  "/app/assets",
  "/app/coffee-passport",
  "/app/roast",
  "/app/redeem",
  "/roadmap",
  "/app/docs",
];

beforeEach(() => {
  localStorage.removeItem(THEME_STORAGE_KEY);
  document.documentElement.classList.remove("dark");
  document.documentElement.dataset.theme = "light";
  document.documentElement.style.colorScheme = "light";
});
afterEach(() => {
  cleanup();
  localStorage.removeItem(THEME_STORAGE_KEY);
  document.documentElement.classList.remove("dark");
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.removeProperty("color-scheme");
  vi.restoreAllMocks();
});

describe("ROASTAKE editorial landing page", () => {
  it("has the requested single English H1 and ordered, meaningful section outline", () => {
    render(<LandingPage />);
    const headings = screen.getAllByRole("heading");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(headings[0]).toHaveAccessibleName(
      "Coffee is more than a commodity. It’s a global market.",
    );
    expect(headings[0].tagName).toBe("H1");
    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent?.replace(/\s+/g, " ").trim()),
    ).toEqual(sectionTitles);
    for (let index = 1; index < headings.length; index += 1) {
      const previousLevel = Number(headings[index - 1].tagName.slice(1));
      const currentLevel = Number(headings[index].tagName.slice(1));
      expect(currentLevel, headings[index].textContent ?? "heading").toBeLessThanOrEqual(
        previousLevel + 1,
      );
    }
  });

  it("repeats both explicit navigation CTAs at the introduction and closing", () => {
    render(<LandingPage />);
    for (const [label, href] of [
      ["Explore the ecosystem", "/app/perps"],
      ["Read the documentation", "/app/docs"],
    ]) {
      const links = screen.getAllByRole("link", { name: label });
      expect(links).toHaveLength(2);
      for (const link of links) {
        expect(link).toHaveAttribute("href", href);
        expect(link).not.toHaveAttribute("aria-disabled", "true");
      }
    }
  });

  it("presents Grow, Verify, Tokenize, Trade and Redeem as five ordered process steps", () => {
    render(<LandingPage />);
    const grow = screen.getByRole("heading", { name: "Grow" });
    const process = grow.closest("ol");
    expect(process).not.toBeNull();
    const steps = within(process!).getAllByRole("listitem");
    expect(steps).toHaveLength(5);
    expect(steps.map((step) => within(step).getByRole("heading").textContent)).toEqual([
      "Grow",
      "Verify",
      "Tokenize",
      "Trade",
      "Redeem",
    ]);
  });

  it("links every ecosystem destination to an existing route instead of placeholder actions", () => {
    render(<LandingPage />);
    const links = screen.getAllByRole("link");
    for (const destination of destinations) {
      const matches = links.filter((link) => link.getAttribute("href") === destination);
      expect(matches.length, destination).toBeGreaterThan(0);
      for (const link of matches) expect(link).toHaveAccessibleName();
    }
    for (const link of links) {
      const href = link.getAttribute("href");
      expect(href).not.toBeNull();
      expect(href).not.toMatch(/^(?:javascript:|$)/i);
      if (href?.startsWith("#")) {
        expect(document.getElementById(href.slice(1))).not.toBeNull();
      }
      expect(link).not.toHaveAttribute("aria-disabled", "true");
    }
  });

  it("states the synthetic, operator-controlled and non-monetary Perps limitations", () => {
    render(<LandingPage />);
    const perps = screen.getByRole("link", { name: /Coffee Perpetuals/i }).closest("article");
    expect(perps).not.toBeNull();
    expect(perps).toHaveTextContent(/Testnet/i);
    expect(perps).toHaveTextContent(/operator.controlled/i);
    expect(perps).toHaveTextContent(/synthetic/i);
    expect(perps).toHaveTextContent(/no monetary value/i);
    expect(perps).toHaveTextContent(/not live coffee/i);
  });

  it("keeps the read-only OutLayer Oracle independent from Perps", () => {
    render(<LandingPage />);
    const oracle = screen.getByRole("link", { name: /OutLayer Oracle/i }).closest("article");
    expect(oracle).not.toBeNull();
    expect(oracle).toHaveTextContent(/read.only/i);
    expect(oracle).toHaveTextContent(/independent|separate/i);
    expect(oracle).toHaveTextContent(/Perps|Perpetuals/i);
    expect(oracle).toHaveTextContent(
      /does not (?:power|supply|feed|provide)[^.]*Perps|not [^.]*execution.price/i,
    );
  });

  it("labels marketplace, provenance and redemption as illustrative rather than live physical commerce", () => {
    const { container } = render(<LandingPage />);
    expect(container).toHaveTextContent(/marketplace/i);
    expect(container).toHaveTextContent(/provenance|passport/i);
    expect(container).toHaveTextContent(/redemption|redeem/i);
    expect(container).toHaveTextContent(/illustrative|simulated/i);
    expect(container).toHaveTextContent(
      /no (?:verified )?physical (?:coffee )?(?:backing|custody)|not verified physical coffee/i,
    );
    expect(container).toHaveTextContent(
      /no (?:real |live )?(?:coffee )?(?:orders|checkout|shipments)|not (?:a )?live (?:commerce|shop)|not live physical commerce/i,
    );
  });

  it("keeps the one-kilogram and roasting ratios explicitly proposed, not live backing or conversion", () => {
    render(<LandingPage />);
    const protocol = screen
      .getByRole("heading", { name: "Coffee Asset Protocol" })
      .closest("article");
    expect(protocol).not.toBeNull();
    expect(protocol).toHaveTextContent(/1\s*token\s*=\s*1\s*kg/i);
    expect(protocol).toHaveTextContent(/1\s*:\s*0\.9/);
    expect(protocol).toHaveTextContent(/proposed/i);
    expect(protocol).toHaveTextContent(
      /not [^.]*verified[^.]*currently redeemable|not [^.]*live backing/i,
    );
    expect(protocol).toHaveTextContent(
      /not [^.]*operating physical process|not [^.]*live conversion/i,
    );
  });

  it("uses a priority local hero photo with dimensions and lazy-loads below-fold photography", () => {
    const { container } = render(<LandingPage />);
    const images = Array.from(container.querySelectorAll("img"));
    expect(images.length).toBeGreaterThan(1);
    const [hero, ...belowFold] = images;
    expect(hero).toHaveAttribute("loading", "eager");
    expect(hero).toHaveAttribute("fetchpriority", "high");
    for (const image of images) {
      expect(image.getAttribute("src")).toMatch(/^\/images\/.+\.(?:webp|avif|png|jpe?g)$/);
      expect(Number(image.getAttribute("width"))).toBeGreaterThan(0);
      expect(Number(image.getAttribute("height"))).toBeGreaterThan(0);
      expect(image).toHaveAccessibleName();
    }
    for (const image of belowFold) {
      expect(image).toHaveAttribute("loading", "lazy");
      expect(image).not.toHaveAttribute("fetchpriority", "high");
    }
  });

  it("retains the current English document default without introducing a locale selector", () => {
    const { container } = render(<LandingPage />);
    expect(readFileSync("src/routes/__root.tsx", "utf8")).toMatch(/<html\s+lang="en"/);
    expect(container.querySelector('[lang]:not([lang="en"])')).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /language|locale/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /change language|select language|locale/i }),
    ).not.toBeInTheDocument();
  });

  it("uses the existing public-shell theme control and preserves its choice after a reload-like remount", () => {
    const page = (
      <ThemeProvider>
        <PublicShell>
          <LandingPage />
        </PublicShell>
      </ThemeProvider>
    );
    const first = render(page);
    expect(screen.getAllByRole("main")).toHaveLength(1);
    const toggle = screen.getByRole("button", { name: "Night mode" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    first.unmount();
    document.documentElement.classList.remove("dark");
    document.documentElement.dataset.theme = "light";
    render(page);
    expect(document.documentElement).toHaveClass("dark");
    expect(screen.getByRole("button", { name: "Night mode" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName(
      "Coffee is more than a commodity. It’s a global market.",
    );
  });
});
