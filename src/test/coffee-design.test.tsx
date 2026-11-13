import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentType, HTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductCard } from "@/components/commerce";
import { LotList } from "@/components/coffee/lots";
import { getDemo } from "@/lib/demo/store";
import { Route as HomeRoute } from "@/routes/index";
import { Route as MarketRoute } from "@/routes/market.index";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({ options, useSearch: () => ({}) }),
  Link: ({
    to,
    params,
    search: _search,
    children,
    ...props
  }: {
    to: string;
    params?: Record<string, string>;
    search?: object;
    children?: ReactNode;
  }) => (
    <a href={to.replace(/\$(\w+)/g, (_, key: string) => params?.[key] ?? key)} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/shell", () => ({
  PublicShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  Section: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
}));

const Home = HomeRoute.options.component as ComponentType;
const Market = MarketRoute.options.component as ComponentType;

afterEach(cleanup);

describe("shared coffee presentation and accessible controls", () => {
  it("gives marketplace search and every filter/sort control an accessible name", () => {
    render(<Market />);

    const search = screen.getByRole("textbox", { name: "Search coffee, origin or flavour" });
    expect(screen.getByRole("combobox", { name: "Sort coffees" })).toBeInTheDocument();
    for (const name of [
      "Countries",
      "Roasters",
      "Processes",
      "Varieties",
      "Roasts",
      "Formats",
      "Prices",
      "Availability",
    ]) {
      expect(screen.getByRole("combobox", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("brand-page-title");

    fireEvent.change(search, { target: { value: "no-coffee-matches-this" } });
    expect(screen.getByText("No coffees match these filters.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(search).toHaveValue("");
    expect(screen.queryByText("No coffees match these filters.")).not.toBeInTheDocument();
  });

  it("uses a shared, keyboard-focusable product surface without losing EUR prices", () => {
    const product = getDemo().products[0];
    render(<ProductCard p={product} />);
    const card = screen.getByRole("link");
    expect(card).toHaveClass("brand-surface", "focus-visible:ring-2", "min-w-0");
    expect(within(card).getByText(product.name)).toBeInTheDocument();
    expect(within(card).getByText(`€${product.price.toFixed(2)}`)).toBeInTheDocument();
    expect(card).toHaveAttribute("href", `/market/${product.id}`);
  });

  it("keeps physical quantities separate from token supply in wrapping lot cards", () => {
    const { container } = render(<LotList />);
    const cards = screen.getAllByRole("article");
    expect(cards.length).toBe(getDemo().lots.length);
    for (const card of cards) {
      expect(card).toHaveClass("brand-surface", "min-w-0");
      expect(within(card).getByText(/ILLUSTRATIVE LOT · NOT VERIFIED/)).toBeInTheDocument();
      expect(
        within(card).getByRole("link", { name: getDemo().lots[cards.indexOf(card)].name }),
      ).toHaveClass("focus-visible:ring-2");
      for (const label of [
        "Token supply",
        "Illustrative physical quantity",
        "Encumbered",
        "Redemption reserves",
      ]) {
        expect(within(card).getByText(label).tagName).toBe("DT");
      }
    }
    expect(container.querySelectorAll("dl")).toHaveLength(cards.length);
    expect(screen.getAllByText(/custody not verified/)).toHaveLength(cards.length);
  });

  it("retains the public hero and Testnet/demo boundaries without forcing a dark section", () => {
    const { container } = render(<Home />);
    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Coffee is more than a commodity. It’s a global market.",
    });
    expect(container.querySelector(".dark")).toBeNull();
    expect(heading.closest("section")).toHaveClass("brand-hero", "landing-hero");
    expect(container.querySelector('img[fetchpriority="high"]')).toHaveAttribute(
      "loading",
      "eager",
    );
    expect(
      screen.getByText(/No physical backing, independent certification or real redemption/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Test USDC has no monetary value/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Independent and separate from Perpetuals: it is not its execution-price feed/,
      ),
    ).toBeInTheDocument();
  });
});
