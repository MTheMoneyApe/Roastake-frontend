import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LandingPage } from "@/components/landing-page";
import {
  LandingLanguageProvider,
  LANDING_LANGUAGE_KEY,
  useLandingLanguage,
} from "@/components/landing-language";
import { LandingShell } from "@/components/shell";
import { ThemeProvider, THEME_STORAGE_KEY } from "@/components/theme-provider";

vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { pathname: string } }) => unknown;
  }) => select({ location: { pathname: "/" } }),
  Link: ({
    to,
    children,
    onClick,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; children?: ReactNode }) => (
    <a
      {...props}
      href={to}
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

function LanguageHarness() {
  const { language, setLanguage } = useLandingLanguage();
  return (
    <>
      <button onClick={() => setLanguage(language === "en" ? "es" : "en")}>Switch language</button>
      <LandingPage />
    </>
  );
}
const page = (
  <ThemeProvider>
    <LandingShell>
      <LandingPage />
    </LandingShell>
  </ThemeProvider>
);
beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  document.documentElement.classList.remove("dark");
});

describe("ROASTAKE bilingual editorial landing", () => {
  it("presents the product pitch in the requested section order", () => {
    const { container } = render(<LandingPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName(
      "ROASTAKE / REAL COFFEE. NEW FINANCIAL POSSIBILITIES.",
    );
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Coffee prices move. Producers and roasters carry the risk.",
      "Market tools and a coffee-asset journey.",
      "From harvest to a clearer price agreement.",
      "Infrastructure for a connected coffee economy.",
      "Coffee + DeFi + Venture Capital.",
      "Understand today. Shape what comes next.",
    ]);
    const sectionOrder = ["why-coffee", "live-on-near", "harvest-workflow", "built-on-near"];
    const positions = sectionOrder.map((id) =>
      Array.from(container.querySelectorAll("section")).findIndex((section) => section.id === id),
    );
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(container.querySelector(".landing-hero-foot a")).toHaveAttribute("href", "#why-coffee");
    const headings = screen.getAllByRole("heading");
    headings.slice(1).forEach((heading, index) => {
      expect(Number(heading.tagName.slice(1))).toBeLessThanOrEqual(
        Number(headings[index].tagName.slice(1)) + 1,
      );
    });
  });

  it("connects both hero calls to action and preserves the product routes", () => {
    render(<LandingPage />);
    expect(screen.getByRole("link", { name: "Explore Testnet Markets" })).toHaveAttribute(
      "href",
      "/app/perps",
    );
    expect(screen.getByRole("link", { name: "Browse Coffee Lots" })).toHaveAttribute(
      "href",
      "/market",
    );
    expect(screen.getByRole("link", { name: "Open the documentation" })).toHaveAttribute(
      "href",
      "/app/docs",
    );
    const links = screen.getAllByRole("link");
    for (const route of [
      "/app/perps",
      "/market",
      "/app/coffee-passport",
      "/app/roast",
      "/app/redeem",
      "/app/swap",
      "/app/oracle",
      "/roadmap",
      "/app/docs",
    ]) {
      expect(links.some((link) => link.getAttribute("href") === route)).toBe(true);
    }
    expect(document.querySelector(".landing-closing")).not.toBeInTheDocument();
    links.forEach((link) => {
      expect(link).toHaveAccessibleName();
      expect(link.getAttribute("href")).not.toMatch(/^(?:javascript:|$)/i);
    });
    expect(readFileSync("src/routes/index.tsx", "utf8")).toContain(
      'href: "https://roastake.vercel.app/"',
    );
  });

  it("separates on-chain Perps from the illustrative RWA journey", () => {
    const { container } = render(<LandingPage />);
    const live = container.querySelector("#live-on-near");
    expect(live).toBeInTheDocument();
    const perps = screen.getByRole("heading", { name: "Coffee Perpetuals" }).closest("article")!;
    expect(perps).toHaveTextContent(/operator-controlled synthetic prices/);
    expect(within(perps).getByRole("link", { name: "Explore Perpetuals" })).toHaveAttribute(
      "href",
      "/app/perps",
    );
    const rwa = screen.getByRole("heading", { name: "The coffee-asset lifecycle" }).closest("article")!;
    expect(rwa).toHaveTextContent(/RWA PRODUCT FLOW · ILLUSTRATIVE/);
    for (const route of [
      "/app/coffee-passport",
      "/app/perps",
      "/market",
      "/app/roast",
      "/app/redeem",
    ]) {
      expect(within(rwa).getAllByRole("link").some((link) => link.getAttribute("href") === route)).toBe(
        true,
      );
    }
    expect(screen.getByRole("link", { name: /RHEA Mini Swap/ })).toHaveAttribute(
      "href",
      "/app/swap",
    );
    expect(screen.getByRole("link", { name: /OutLayer Oracle/ })).toHaveAttribute(
      "href",
      "/app/oracle",
    );
    expect(container.querySelectorAll(".landing-rwa-step")).toHaveLength(4);
    expect(container).not.toHaveTextContent(/Editorial photography · not evidence/);
  });

  it("shows the four-stage RWA lifecycle, Q1 pilot target and three NEAR architecture pillars", () => {
    const { container } = render(<LandingPage />);
    const steps = container.querySelectorAll(".landing-rwa-step");
    expect(steps).toHaveLength(4);
    expect(steps[0]).toHaveTextContent("Mint & Passport");
    expect(steps[1]).toHaveTextContent("Hedge / Trade");
    expect(steps[2]).toHaveTextContent("−15% weight");
    expect(steps[3]).toHaveTextContent("Physical Redeem");
    expect(container.querySelector("#harvest-workflow")).toHaveTextContent("Pilot target · Q1 2027");
    expect(container.querySelectorAll(".landing-forward-steps > li")).toHaveLength(4);
    expect(container.querySelectorAll(".landing-built-card")).toHaveLength(3);
    expect(container.querySelector("#built-on-near")).toHaveTextContent("NEAR Testnet Settlement");
    expect(container.querySelector("#built-on-near")).toHaveTextContent(
      "NEAR-first Wallet Hub",
    );
    expect(container.querySelector("#built-on-near")).toHaveTextContent("Low Transaction Costs");
    expect(container.querySelector("#built-on-near")).not.toHaveTextContent(/Account Abstraction|Chain Signatures/i);
  });

  it.each(["en", "es"])(
    "renders the complete %s pitch with localized calls to action and image text",
    (language) => {
      if (language === "es") localStorage.setItem(LANDING_LANGUAGE_KEY, "es");
      const { container } = render(
        <LandingLanguageProvider>
          <LandingPage />
        </LandingLanguageProvider>,
      );
      expect(container.querySelector(".landing")).toHaveAttribute("lang", language);
      const expected = language === "es"
        ? {
            headline: "CAFÉ REAL. NUEVAS POSIBILIDADES FINANCIERAS.",
            primary: "Explorar mercados Testnet",
            secondary: "Explorar lotes de café",
            badge: "PROTOTIPO NEAR TESTNET · PRECIOS SIMULADOS",
            problem: "El precio del café cambia.",
            pilot: "Objetivo del piloto · Q1 2027",
            built: "CONSTRUIDO SOBRE NEAR",
          }
        : {
            headline: "REAL COFFEE. NEW FINANCIAL POSSIBILITIES.",
            primary: "Explore Testnet Markets",
            secondary: "Browse Coffee Lots",
            badge: "NEAR TESTNET PROTOTYPE · SIMULATED PRICING",
            problem: "Coffee prices move.",
            pilot: "Pilot target · Q1 2027",
            built: "BUILT ON NEAR",
          };
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(expected.headline);
      expect(screen.getByRole("link", { name: expected.primary })).toHaveAttribute(
        "href",
        "/app/perps",
      );
      expect(screen.getByRole("link", { name: expected.secondary })).toHaveAttribute(
        "href",
        "/market",
      );
      expect(container).toHaveTextContent(expected.badge);
      expect(container.querySelector("#why-coffee")).toHaveTextContent(expected.problem);
      expect(container.querySelectorAll(".landing-rwa-step h4")[0]).toHaveTextContent(
        language === "es" ? "Tokenización y pasaporte" : "Mint & Passport",
      );
      expect(container.querySelectorAll(".landing-rwa-step h4")[1]).toHaveTextContent(
        language === "es" ? "Cobertura / Trading" : "Hedge / Trade",
      );
      expect(container.querySelectorAll(".landing-rwa-step h4")[2]).toHaveTextContent(
        language === "es" ? "Tueste · −15% de peso" : "Roast · −15% weight",
      );
      expect(container.querySelectorAll(".landing-rwa-step h4")[3]).toHaveTextContent(
        language === "es" ? "Canje físico" : "Physical Redeem",
      );
      expect(container).toHaveTextContent("/app/coffee-passport");
      expect(container).toHaveTextContent("/app/perps");
      expect(container).toHaveTextContent("/market");
      expect(container).toHaveTextContent("/app/roast");
      expect(container).toHaveTextContent("/app/redeem");
      expect(container.querySelector("#harvest-workflow")).toHaveTextContent(expected.pilot);
      expect(container.querySelector("#built-on-near")).toHaveTextContent(expected.built);
      expect(container.querySelectorAll("h2")).toHaveLength(6);
      const images = Array.from(container.querySelectorAll("img"));
      expect(images).toHaveLength(1);
      expect(images[0]).toHaveAttribute("loading", "eager");
      expect(images[0]).toHaveAttribute("fetchpriority", "high");
      expect(images[0]).toHaveAttribute("srcset");
      expect(images[0]).toHaveAttribute("sizes");
      expect(Number(images[0].getAttribute("width"))).toBeGreaterThan(0);
      expect(Number(images[0].getAttribute("height"))).toBeGreaterThan(0);
      expect(images[0]).toHaveAccessibleName();
      expect(images[0].alt).toContain(language === "es" ? "caficultor" : "grower");
    },
  );

  it("switches the public header, footer and landing together and remembers ES after remount", () => {
    const first = render(page);
    const select = screen.getByRole("combobox", { name: "Language / Idioma" });
    fireEvent.change(select, { target: { value: "es" } });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("CAFÉ REAL. NUEVAS POSIBILIDADES FINANCIERAS.");
    expect(screen.getByRole("navigation", { name: "Explorar" })).toHaveTextContent("Iniciar app");
    expect(localStorage.getItem(LANDING_LANGUAGE_KEY)).toBe("es");
    const header = document.querySelector("header")!;
    expect(header).not.toHaveTextContent(/Demo Explorer/);
    expect(
      within(header).queryByRole("button", { name: /User|Roaster|Admin/ }),
    ).not.toBeInTheDocument();
    first.unmount();
    render(page);
    expect(screen.getByRole("combobox", { name: "Language / Idioma" })).toHaveValue("es");
    fireEvent.change(screen.getByRole("combobox", { name: "Language / Idioma" }), {
      target: { value: "en" },
    });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("REAL COFFEE. NEW FINANCIAL POSSIBILITIES.");
  });

  it("defaults safely for invalid or blocked storage and does not read preferences during SSR", () => {
    localStorage.setItem(LANDING_LANGUAGE_KEY, "fr");
    const first = render(
      <LandingLanguageProvider>
        <LanguageHarness />
      </LandingLanguageProvider>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("REAL COFFEE. NEW FINANCIAL POSSIBILITIES.");
    first.unmount();
    const read = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    renderToString(
      <LandingLanguageProvider>
        <LandingPage />
      </LandingLanguageProvider>,
    );
    expect(read).not.toHaveBeenCalled();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(
      <LandingLanguageProvider>
        <LanguageHarness />
      </LandingLanguageProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Switch language" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("CAFÉ REAL. NUEVAS POSIBILIDADES FINANCIERAS.");
  });

  it("preserves the shared theme while language changes", () => {
    render(page);
    const toggle = screen.getByRole("button", { name: "Night mode" });
    fireEvent.click(toggle);
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    fireEvent.change(screen.getByRole("combobox", { name: "Language / Idioma" }), {
      target: { value: "es" },
    });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });
});
