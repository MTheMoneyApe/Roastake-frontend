import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { CoffeePhoto, COFFEE_PHOTOS } from "@/components/coffee-photo";
import { LotJourney } from "@/components/coffee/lot-journey";
import { LotDetail } from "@/components/coffee/lots";
import { seed } from "@/lib/demo/seed";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
vi.mock("@/lib/demo/store", () => ({ useDemo: () => seed() }));
afterEach(cleanup);

describe("local editorial photo library", () => {
  it("reserves the crop, exposes alt and responsive local sources, and defaults below-fold images to lazy", () => {
    const { container } = render(<CoffeePhoto photo="cherries" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("alt", COFFEE_PHOTOS.cherries.alt);
    expect(img).toHaveAttribute("width", "1600");
    expect(img).toHaveAttribute("height", "1200");
    expect(img.parentElement).toHaveClass("aspect-[4/3]");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).not.toHaveAttribute("fetchpriority");
    expect(img.getAttribute("srcset")).toContain("480w");
    expect(img.getAttribute("srcset")).not.toContain("https:");
    expect(container.querySelector("figcaption")).toHaveTextContent(
      "Illustrative photography · not the actual lot/roaster",
    );
  });
  it("only explicitly prioritizes a hero, removes broken slots, and recovers for a new photo", () => {
    const { container, rerender } = render(<CoffeePhoto photo="beans" priority />);
    expect(screen.getByRole("img")).toHaveAttribute("fetchpriority", "high");
    expect(screen.getByRole("img")).toHaveAttribute("loading", "eager");
    fireEvent.error(screen.getByRole("img"));
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("img", { name: /photograph unavailable/ })).toBeInTheDocument();
    expect(screen.getByText(/Illustrative photography/)).toBeInTheDocument();
    rerender(<CoffeePhoto photo="green" />);
    expect(container.querySelector("img")).toHaveAttribute("src", "/images/coffee-green-960.webp");
  });
  it("ships real WebP bytes for every responsive variant with credits", () => {
    const credits = readFileSync("docs/image-credits.md", "utf8");
    for (const photo of Object.keys(COFFEE_PHOTOS)) {
      expect(credits).toContain(`coffee-${photo}-`);
      for (const width of [480, 960, 1600]) {
        const path = `public/images/coffee-${photo}-${width}.webp`;
        const bytes = readFileSync(path);
        expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
        expect(bytes.toString("ascii", 8, 12)).toBe("WEBP");
        expect(statSync(path).size).toBeLessThan(700_000);
      }
    }
  });
});

describe("honest demo lot journey", () => {
  it("uses existing records without inventing shipment, geography or roast events", () => {
    const state = seed();
    render(<LotJourney lot={state.lots[2]} state={state} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText(/Nyeri \/ Kenya/)).toBeInTheDocument();
    expect(screen.getByText(/No exact farm coordinates/)).toBeInTheDocument();
    expect(
      screen.getByText(/No transport route, handover dates or carrier evidence/),
    ).toBeInTheDocument();
    expect(screen.getByText(/2026-10-26.*60.000 kg green → 51.000 kg roasted/)).toBeInTheDocument();
    expect(
      screen.getAllByText("Illustrative photography · not the actual lot/roaster"),
    ).toHaveLength(4);
  });
  it("leaves missing roast evidence missing", () => {
    const state = seed();
    state.roastRecords = [];
    state.conversions = [];
    render(<LotJourney lot={state.lots[3]} state={state} />);
    expect(screen.getByText(/No roast event is recorded/)).toBeInTheDocument();
    expect(screen.getByText(/DATED ROAST EVIDENCE MISSING/)).toBeInTheDocument();
  });
  it("labels document references, supply and reserves without fake certificate downloads", () => {
    const { container } = render(<LotDetail id="RCT-COL-HUI-25A" passport />);
    expect(screen.getByText(/DEMO DOCUMENT · NOT VERIFIED/)).toBeInTheDocument();
    expect(screen.getByText(/Source: seeded demo record.*no file supplied/)).toBeInTheDocument();
    expect(
      screen.getByText(/Redemption reserves represent already-burned tokens/),
    ).toBeInTheDocument();
    expect(screen.getByText(/not audited warehouse records/)).toBeInTheDocument();
    expect(container.querySelector("a[download]")).toBeNull();
  });
});
