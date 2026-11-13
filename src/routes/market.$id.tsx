import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PublicShell, Section } from "@/components/shell";
import { ProductImage, ProductCard } from "@/components/commerce";
import { DemoBadge, Empty, KV } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { demo, lineTotal, useDemo } from "@/lib/demo/store";
import { seo } from "@/lib/seo";
import {
  defaultProductSelection,
  productGrinds,
  productSelectionError,
  productSizeLabel,
  productSizes,
} from "@/lib/demo/product-options";

export const Route = createFileRoute("/market/$id")({
  head: () =>
    seo(
      "Coffee details",
      "Origin, producer, tasting notes, brewing guide and roast date for this specialty coffee.",
    ),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  // TanStack can reuse a route component between product IDs. Remount local options on navigation.
  return <ProductDetails key={id} id={id} />;
}

function ProductDetails({ id }: { id: string }) {
  const s = useDemo();
  const p = s.products.find((x) => x.id === id);
  const initial = p ? defaultProductSelection(p) : { size: 0, grind: "", qty: 1 };
  const [size, setSize] = useState(initial.size);
  const [grind, setGrind] = useState(initial.grind);
  const [qty, setQty] = useState(initial.qty);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  if (!p)
    return (
      <PublicShell>
        <Section className="py-20">
          <Empty
            text="This coffee doesn't exist or was removed."
            action={
              <Button asChild variant="outline">
                <Link to="/market">Back to market</Link>
              </Button>
            }
          />
        </Section>
      </PublicShell>
    );
  const roaster = s.roasters.find((r) => r.id === p.roasterId);
  if (!roaster)
    return (
      <PublicShell>
        <Section className="py-20">
          <Empty text="This demo roaster is unavailable." />
        </Section>
      </PublicShell>
    );
  const price = lineTotal(s, { productId: p.id, qty: 1, size });
  const linePrice = lineTotal(s, { productId: p.id, qty, size });
  const remaining = Math.max(
    0,
    p.stock -
      s.cart.filter((item) => item.productId === p.id).reduce((sum, item) => sum + item.qty, 0),
  );
  const invalid =
    productSelectionError(p, { qty, size, grind }) ??
    (qty > remaining ? "Quantity exceeds remaining sample inventory in your demo cart." : null);
  const clearFeedback = () => {
    setAdded(false);
    setError("");
  };
  const addToCart = () => {
    setAdded(false);
    setError("");
    if (invalid) {
      setError(invalid);
      return;
    }
    if (demo.addToCart(p.id, qty, size, grind)) setAdded(true);
    else setError("Could not add this selection. Check the sample inventory and options.");
  };
  return (
    <PublicShell>
      <Section className="py-10">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
          <Link to="/market">Market</Link> / {p.country} /{" "}
          <span className="text-foreground">{p.name}</span>
        </nav>
        <div className="grid gap-10 md:grid-cols-2">
          <ProductImage p={p} detail className="self-start" />
          <div className="min-w-0">
            <p className="brand-eyebrow">
              {p.origin}, {p.country}
            </p>
            <h1 className="brand-page-title mt-1">{p.name}</h1>
            <Link
              to="/roasters/$id"
              params={{ id: roaster.id }}
              className="mt-2 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Roasted by {roaster.name}
            </Link>
            <div className="mt-4 flex flex-wrap gap-2">
              {p.notes.map((n) => (
                <span
                  key={n}
                  className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground"
                >
                  {n}
                </span>
              ))}
            </div>
            <p className="num mt-6 text-3xl">€{price.toFixed(2)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Per {productSizeLabel(p, size)} pack · {p.format}
              {p.format !== "Capsules" && size >= 1000 ? " · 10% size discount included" : ""}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Local demo listing and illustrative EUR prices. No real order, payment or delivery.
            </p>
            <div className="mt-6 space-y-4">
              <fieldset>
                <legend className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Pack size
                </legend>
                <div className="flex flex-wrap gap-2">
                  {productSizes(p).map((z) => (
                    <Button
                      key={z}
                      size="sm"
                      aria-pressed={z === size}
                      variant={z === size ? "default" : "outline"}
                      onClick={() => {
                        setSize(z);
                        clearFeedback();
                      }}
                    >
                      {productSizeLabel(p, z)}
                    </Button>
                  ))}
                </div>
              </fieldset>
              {p.format !== "Capsules" && (
                <fieldset>
                  <legend className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                    {p.format === "Ground" ? "Ground for" : "Preparation"}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {productGrinds(p).map((g) => (
                      <Button
                        key={g}
                        size="sm"
                        aria-pressed={g === grind}
                        variant={g === grind ? "default" : "outline"}
                        onClick={() => {
                          setGrind(g);
                          clearFeedback();
                        }}
                      >
                        {g}
                      </Button>
                    ))}
                  </div>
                  {p.format === "Whole bean" && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Keep whole beans or choose a grind-to-order preparation.
                    </p>
                  )}
                </fieldset>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className="flex items-center rounded-md border"
                  role="group"
                  aria-label="Pack quantity"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={qty <= 1}
                    onClick={() => {
                      setQty(Math.max(1, qty - 1));
                      clearFeedback();
                    }}
                    aria-label="Decrease quantity"
                  >
                    −
                  </Button>
                  <span className="num w-8 text-center" aria-live="polite">
                    {qty}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={qty >= remaining}
                    onClick={() => {
                      setQty(qty + 1);
                      clearFeedback();
                    }}
                    aria-label="Increase quantity"
                  >
                    +
                  </Button>
                </div>
                <Button
                  size="lg"
                  className="min-w-36 flex-1"
                  disabled={!!invalid}
                  onClick={addToCart}
                >
                  {p.stock === 0 ? "No sample inventory" : "Add to demo cart"}
                </Button>
              </div>
              <p className="text-sm">
                Selection total: <span className="num">€{linePrice.toFixed(2)}</span>{" "}
                <span className="text-xs text-muted-foreground">
                  for {qty} pack{qty === 1 ? "" : "s"} · shipping at demo checkout
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Sample inventory: {p.stock} packs · {remaining} not in your cart · example roaster:{" "}
                {roaster.city} · <DemoBadge>No real charge</DemoBadge>
              </p>
              {(error || (!added && invalid)) && (
                <p role="alert" className="text-sm text-loss">
                  {error || invalid}
                </p>
              )}
              {added && (
                <div role="status" className="flex flex-wrap items-center gap-3 border-t pt-4">
                  <p className="text-sm">Coffee added to your demo cart.</p>
                  <Button asChild variant="outline">
                    <Link to="/cart">View cart</Link>
                  </Button>
                </div>
              )}
              {p.lotId && (
                <Button asChild variant="outline">
                  <Link to="/app/coffee-passport" search={{ lot: p.lotId }}>
                    Inspect Coffee Passport
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
        <Tabs defaultValue="origin" className="mt-14">
          <TabsList>
            <TabsTrigger value="origin">Origin</TabsTrigger>
            <TabsTrigger value="brew">Brewing guide</TabsTrigger>
            <TabsTrigger value="seller">Seller</TabsTrigger>
          </TabsList>
          <TabsContent value="origin" className="max-w-2xl">
            <KV
              rows={[
                ["Farm", p.farm],
                ["Producer", p.producer],
                ["Altitude", p.altitude],
                ["Variety", p.variety],
                ["Process", p.process],
                ["Harvest", p.harvest],
                ["Roast date", p.roastDate],
                ["Roast profile", p.roast],
                [
                  "Tokenized lot",
                  p.lotId ? (
                    <Link className="underline" to="/app/assets/$id" params={{ id: p.lotId }}>
                      {p.lotId}
                    </Link>
                  ) : (
                    "—"
                  ),
                ],
              ]}
            />
          </TabsContent>
          <TabsContent value="brew" className="max-w-2xl">
            <KV
              rows={
                p.format === "Capsules"
                  ? [
                      [
                        "Preparation",
                        "Use a compatible capsule machine and follow its instructions.",
                      ],
                      ["Pack", productSizeLabel(p, size)],
                      [
                        "Compatibility",
                        "Illustrative listing; machine compatibility is not verified.",
                      ],
                    ]
                  : [
                      ["Pour-over", "15 g · 250 g water · 94 °C · 3:00"],
                      ["Espresso", "18 g in · 40 g out · 28 s"],
                      ["AeroPress", "14 g · 220 g · 1:45 steep"],
                      ["Rest after roast", "7–21 days"],
                    ]
              }
            />
          </TabsContent>
          <TabsContent value="seller" className="max-w-2xl">
            <p className="text-sm text-muted-foreground">{roaster.story}</p>
            <p className="mt-2 text-sm">
              Example shipping zones (demo): {roaster.zones.join(", ")}
            </p>
          </TabsContent>
        </Tabs>
        <h2 className="brand-section-title mt-16">More sample coffees from {roaster.name}</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {s.products
            .filter((x) => x.roasterId === roaster.id && x.id !== p.id && x.status === "Live")
            .slice(0, 4)
            .map((x) => (
              <ProductCard key={x.id} p={x} />
            ))}
        </div>
      </Section>
    </PublicShell>
  );
}
