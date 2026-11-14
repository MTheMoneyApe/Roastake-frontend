import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentType, HTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, demo, getDemo } from "@/lib/demo/store";
import { cartSummary } from "@/lib/demo/calc";
import { CartPage, CheckoutPage, OrdersPage } from "@/components/coffee/checkout";
import { ProductCard } from "@/components/commerce";
import { Route as ProductRoute } from "@/routes/market.$id";

const route = vi.hoisted(() => ({ id: "huila-paraiso" }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({ options, useParams: () => route }),
  useNavigate: () => vi.fn(),
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

const ProductPage = ProductRoute.options.component as ComponentType;
beforeEach(() => {
  demo.reset();
  route.id = "huila-paraiso";
});
afterEach(cleanup);

describe("format-aware cart validation", () => {
  it.each([
    ["mogiana-espresso", 250, "Whole bean"],
    ["nordic-capsules", 10, "Whole bean"],
    ["nordic-capsules", 10, "Filter"],
    ["huila-paraiso", 250, "Arbitrary grind"],
    ["huila-paraiso", 10, "Whole bean"],
  ])("rejects an incompatible selection for %s atomically", (id, size, grind) => {
    const before = structuredClone(getDemo());
    expect(demo.addToCart(id, 1, size, grind)).toBe(false);
    expect(getDemo()).toEqual(before);
  });

  it("preserves grind-to-order for beans, and accepts ground and capsule packs", () => {
    expect(demo.addToCart("huila-paraiso", 1, 250, "Filter")).toBe(true);
    expect(demo.addToCart("mogiana-espresso", 1, 500, "Espresso")).toBe(true);
    expect(demo.addToCart("nordic-capsules", 2, 30, "")).toBe(true);
    expect(cartSummary(getDemo())).toEqual({
      subtotal: 94,
      shipping: 18,
      shipments: 3,
      total: 112,
    });
    const balances = structuredClone(getDemo().balances);
    expect(demo.checkout("Card", 0, { name: "Fictional person", address: "Sample address" })).toBe(
      true,
    );
    expect(
      getDemo()
        .orders.slice(0, 3)
        .reduce((sum, order) => sum + order.total, 0),
    ).toBe(112);
    expect(getDemo().balances).toEqual(balances);
  });

  it("rejects stale persisted formats on quantity changes and checkout", () => {
    act(
      "Test",
      "Legacy cart",
      (state) => {
        state.cart = [{ productId: "nordic-capsules", qty: 1, size: 10, grind: "Whole bean" }];
      },
      { silent: true },
    );
    const before = structuredClone(getDemo());
    expect(demo.setCartQty(0, 2)).toBe(false);
    expect(demo.checkout("Card", 0, { name: "Demo", address: "Demo" })).toBe(false);
    expect(getDemo()).toEqual(before);
    expect(demo.setCartQty(0, 0)).toBe(true);
  });
});

describe("product options and merchandising", () => {
  it("resets size, quantity, grind and added status when navigating bean → capsule → bean", () => {
    const view = render(<ProductPage />);
    fireEvent.click(screen.getByRole("button", { name: "1 kg" }));
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to demo cart" }));
    expect(getDemo().cart[0]).toMatchObject({ size: 1000, qty: 2, grind: "Filter" });
    expect(screen.getByText("€57.60")).toBeInTheDocument();
    expect(screen.getByText("€115.20")).toBeInTheDocument();
    route.id = "nordic-capsules";
    view.rerender(<ProductPage />);
    expect(screen.queryByRole("button", { name: "Whole bean" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Filter" })).not.toBeInTheDocument();
    expect(screen.queryByText("Coffee added to your demo cart.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10 capsules" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText(/Per 10 capsules pack/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add to demo cart" }));
    expect(getDemo().cart[1]).toMatchObject({ size: 10, qty: 1, grind: "" });
    route.id = "huila-paraiso";
    view.rerender(<ProductPage />);
    expect(screen.getByRole("button", { name: "250 g" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Whole bean" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByText("Coffee added to your demo cart.")).not.toBeInTheDocument();
  });

  it("never offers Whole bean for a Ground product", () => {
    route.id = "mogiana-espresso";
    render(<ProductPage />);
    expect(screen.queryByRole("button", { name: "Whole bean" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Espresso" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Add to demo cart" }));
    expect(getDemo().cart[0]).toMatchObject({ productId: "mogiana-espresso", grind: "Espresso" });
  });

  it("uses capsule-machine guidance without gram-based recipes", () => {
    route.id = "nordic-capsules";
    render(<ProductPage />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Brewing guide" }), {
      button: 0,
      ctrlKey: false,
    });
    expect(screen.getByText(/Use a compatible capsule machine/)).toBeInTheDocument();
    expect(screen.queryByText(/15 g|250 g water|18 g in/)).not.toBeInTheDocument();
  });

  it("blocks stale cart checkout in the UI while leaving removal available", () => {
    act(
      "Test",
      "Legacy cart",
      (state) => {
        state.cart = [{ productId: "mogiana-espresso", qty: 1, size: 250, grind: "Whole bean" }];
      },
      { silent: true },
    );
    const view = render(<CartPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a grind available for this format");
    expect(screen.getByRole("button", { name: "Demo checkout" })).toBeDisabled();
    view.rerender(<CheckoutPage />);
    expect(screen.getByRole("button", { name: "Place simulated order" })).toBeDisabled();
    view.rerender(<CartPage />);
    fireEvent.click(screen.getByRole("button", { name: "Remove Mogiana Espresso" }));
    expect(screen.getByText("Your demo cart is empty.")).toBeInTheDocument();
  });

  it("shows the actual offered pack price rather than treating all prices as 250 g", () => {
    const product = { ...getDemo().products[0], sizes: [1000] };
    render(<ProductCard p={product} />);
    expect(screen.getByText("€57.60")).toBeInTheDocument();
    expect(screen.getByText(/1 kg/)).toBeInTheDocument();
  });

  it("keeps capsule labels, EUR totals and local simulation disclosure consistent", () => {
    demo.addToCart("nordic-capsules", 2, 30, "");
    const view = render(<CartPage />);
    const article = screen.getByRole("article");
    expect(within(article).getByText(/30 capsules/)).toBeInTheDocument();
    expect(within(article).queryByText(/Whole bean|\b30 g\b|Filter/)).not.toBeInTheDocument();
    expect(within(article).getByText("€54.00")).toBeInTheDocument();
    expect(screen.getByText("€60.00")).toBeInTheDocument();
    view.rerender(<CheckoutPage />);
    expect(screen.getByText(/30 capsules/)).toBeInTheDocument();
    expect(screen.getByText(/stored only in this browser/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Place simulated order" }));
    view.rerender(<OrdersPage />);
    expect(screen.getByText(/30 capsules/)).toBeInTheDocument();
    expect(screen.getByText("€60.00")).toBeInTheDocument();
  });
});
