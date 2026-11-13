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
  it("explains the thesis in one H1 and ordered sections without skipping heading levels", () => {
    render(<LandingPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName(
      "ROASTAKE / REAL COFFEE. NEW FINANCIAL POSSIBILITIES.",
    );
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Coffee is more than a commodity.",
      "One economy. Three connected layers.",
      "What you can explore today.",
      "Coffee + DeFi + Venture Capital.",
      "Understand today. Shape what comes next.",
      "Real coffee. Clear boundaries. A new financial direction.",
    ]);
    const headings = screen.getAllByRole("heading");
    headings
      .slice(1)
      .forEach((h, i) =>
        expect(Number(h.tagName.slice(1))).toBeLessThanOrEqual(
          Number(headings[i].tagName.slice(1)) + 1,
        ),
      );
  });

  it("keeps explicit working CTA routes at the hero and closing", () => {
    render(<LandingPage />);
    const markets = screen.getAllByRole("link", { name: "Launch App" });
    expect(markets).toHaveLength(2);
    markets.forEach((link) => expect(link).toHaveAttribute("href", "/app/perps"));
    const docs = screen.getAllByRole("link", { name: "Open the documentation" });
    expect(docs).toHaveLength(1);
    docs.forEach((link) => expect(link).toHaveAttribute("href", "/app/docs"));
    const links = screen.getAllByRole("link");
    for (const to of [
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
    ])
      expect(links.some((link) => link.getAttribute("href") === to)).toBe(true);
    links.forEach((link) => {
      expect(link).toHaveAccessibleName();
      expect(link.getAttribute("href")).not.toMatch(/^(?:javascript:|$)/i);
    });
    expect(readFileSync("src/routes/index.tsx", "utf8")).toContain(
      'href: "https://roastake.vercel.app/"',
    );
  });

  it("groups live Testnet products, illustrative demos and planned services with canonical labels", () => {
    const { container } = render(<LandingPage />);
    expect(screen.getAllByText("Live on NEAR Testnet")).toHaveLength(4);
    expect(screen.getByText("Demo / Illustrative")).toBeInTheDocument();
    expect(screen.getAllByText("Roadmap / Planned")).toHaveLength(2);
    const perps = screen.getByRole("link", { name: "Coffee Perpetuals" }).closest("article")!;
    expect(perps).toHaveTextContent(/operator.controlled synthetic Testnet/i);
    expect(perps).toHaveTextContent(/not live coffee exchange quotations/);
    expect(perps).not.toHaveTextContent(/no monetary value/);
    const swap = screen.getByRole("link", { name: "RHEA Mini Swap" }).closest("article")!;
    expect(swap).toHaveTextContent(/Actual NEAR Testnet swaps/);
    expect(swap).toHaveTextContent(/not physical coffee transactions/);
    const oracle = screen.getByRole("link", { name: "OutLayer Oracle" }).closest("article")!;
    expect(oracle).toHaveTextContent(/read.only/);
    expect(oracle).toHaveTextContent(/Does not power Perps/);
    expect(oracle).toHaveTextContent(/or verify coffee, custody or backing/);
    expect(container).toHaveTextContent(/Browser.only examples. No verified inventory/);
    expect(container).not.toHaveTextContent(/Testnet today. Physical integrations are future work/);
    expect(container).not.toHaveTextContent(/NEAR Testnet prototype · Perps uses/);
    expect(container.querySelector("#coffee-capital")).toHaveTextContent(
      /No live investment product/,
    );
  });

  it("keeps physical backing and mass-loss semantics proposed, with a nuanced risk thesis", () => {
    const { container } = render(<LandingPage />);
    const assets = screen
      .getByRole("heading", { name: "Coffee Asset Economy" })
      .closest("article")!;
    expect(assets).toHaveTextContent(/GCT/);
    expect(assets).toHaveTextContent(/RCT/);
    expect(assets).toHaveTextContent(/1 token = 1 kg is a proposed accounting model/);
    expect(assets).toHaveTextContent(
      /not a currently backed, custodied, physically verified or redeemable asset/,
    );
    expect(assets).toHaveTextContent(/Roasting loses mass/);
    expect(assets).toHaveTextContent(/not 1:1/);
    expect(assets).toHaveTextContent(/Yield, loss and fees/);
    expect(container).toHaveTextContent(
      /not crisis.proof, a guaranteed hedge or an uncorrelated asset/,
    );
    expect(container).toHaveTextContent(/Prices can fall/);
  });

  it.each(["en", "es"])(
    "has complete %s narrative, valid CTA destinations and localized photo descriptions",
    (language) => {
      if (language === "es") localStorage.setItem(LANDING_LANGUAGE_KEY, "es");
      const { container } = render(
        <LandingLanguageProvider>
          <LandingPage />
        </LandingLanguageProvider>,
      );
      expect(container.querySelector(".landing")).toHaveAttribute("lang", language);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        language === "es" ? "CAFÉ REAL. NUEVAS POSIBILIDADES FINANCIERAS." : "REAL COFFEE. NEW FINANCIAL POSSIBILITIES.",
      );
      const cta = language === "es" ? "Iniciar app" : "Launch App";
      screen
        .getAllByRole("link", { name: cta })
        .forEach((link) => expect(link).toHaveAttribute("href", "/app/perps"));
      expect(container.querySelectorAll("h2")).toHaveLength(6);
      expect(container).toHaveTextContent(language === "es" ? "La capa financiera para la economía global del café." : "The financial layer for the global coffee economy.");
      expect(container.querySelector("#ecosystem-layers ol")?.children).toHaveLength(3);
      expect(container.querySelector("#coffee-capital")).toHaveTextContent(
        language === "es"
          ? /No se ofrece un producto de inversión activo/
          : /No live investment product/,
      );
      const images = Array.from(container.querySelectorAll("img"));
      expect(images).toHaveLength(2);
      expect(images[0]).toHaveAttribute("loading", "eager");
      expect(images[0]).toHaveAttribute("fetchpriority", "high");
      expect(images[1]).toHaveAttribute("loading", "lazy");
      images.forEach((img) => {
        expect(img.getAttribute("src")).toMatch(/^\/images\/.+\.webp$/);
        expect(img).toHaveAttribute("srcset");
        expect(img).toHaveAttribute("sizes");
        expect(Number(img.getAttribute("width"))).toBeGreaterThan(0);
        expect(Number(img.getAttribute("height"))).toBeGreaterThan(0);
        expect(img).toHaveAccessibleName();
      });
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
