import { productLineTotal } from "./calc";
import type { CartItem, DemoState, Product } from "./types";

const GROUND_GRINDS = ["Espresso", "Filter", "French press"];

/** Bean listings can be ground to order; pre-ground listings cannot become whole beans. */
export function productGrinds(product: Product): string[] {
  if (product.format === "Capsules") return [];
  return product.format === "Ground" ? GROUND_GRINDS : ["Whole bean", ...GROUND_GRINDS];
}

export function productSizes(product: Product): number[] {
  return [...new Set(product.sizes)]
    .filter((size) => Number.isInteger(size) && size > 0)
    .sort((a, b) => a - b);
}

export function defaultProductSelection(product: Product) {
  // Empty grind is the canonical no-grind value for capsule packs in the local store.
  return { size: productSizes(product)[0] ?? 0, grind: productGrinds(product)[0] ?? "", qty: 1 };
}

export function productSizeLabel(product: Product, size: number): string {
  if (product.format === "Capsules") return `${size} capsules`;
  return size >= 1000 ? `${size / 1000} kg` : `${size} g`;
}

export function productSelectionLabel(
  product: Product,
  item: Pick<CartItem, "size" | "grind">,
): string {
  const pack = productSizeLabel(product, item.size);
  if (product.format === "Capsules") return pack;
  return `${pack} · ${item.grind === "Whole bean" ? "Whole bean" : `Ground · ${item.grind}`}`;
}

/** UI and atomic store mutations enforce the same supported-format boundary. */
export function productSelectionError(
  product: Product,
  item: Pick<CartItem, "qty" | "size" | "grind">,
): string | null {
  if (product.status !== "Live") return "This demo listing is unavailable.";
  if (product.stock <= 0) return "No sample inventory is available.";
  if (!Number.isInteger(item.qty) || item.qty <= 0)
    return "Choose a positive whole number of packs.";
  if (!productSizes(product).includes(item.size)) return "Choose an available pack size.";
  if (
    product.format === "Capsules" ? item.grind !== "" : !productGrinds(product).includes(item.grind)
  ) {
    return product.format === "Capsules"
      ? "Capsules do not have a grind option."
      : "Choose a grind available for this format.";
  }
  if (item.qty > product.stock) return "Quantity exceeds sample inventory.";
  return null;
}

export function cartSelectionError(state: DemoState): string | null {
  for (const item of state.cart) {
    const product = state.products.find((product) => product.id === item.productId);
    if (!product) return "A coffee in your cart is unavailable. Remove it before checkout.";
    const invalid = productSelectionError(product, item);
    if (invalid) return `${product.name}: ${invalid} Remove this item or choose new options.`;
    const packs = state.cart
      .filter((line) => line.productId === product.id)
      .reduce((total, line) => total + line.qty, 0);
    if (packs > product.stock)
      return `${product.name}: quantity exceeds sample inventory. Reduce the quantity before checkout.`;
  }
  return null;
}

/** Price an offered pack through the existing business formula, including its 1 kg discount. */
export function startingProductPack(state: DemoState, product: Product) {
  const size = productSizes(product)[0] ?? 0;
  return {
    size,
    price: productLineTotal(
      { ...state, products: [product] },
      { productId: product.id, qty: 1, size },
    ),
  };
}
