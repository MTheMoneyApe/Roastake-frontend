import { Link } from "@tanstack/react-router";
import type { Product } from "@/lib/demo/types";
import { useDemo } from "@/lib/demo/store";
import { cn } from "@/lib/utils";
import { CoffeePhoto } from "@/components/coffee-photo";
import { productSizeLabel, startingProductPack } from "@/lib/demo/product-options";

const CARD_PHOTOS = ["beans", "cherries", "green"] as const;

export function ProductImage({
  p,
  className,
  detail = false,
  caption = true,
}: {
  p: Product;
  className?: string;
  detail?: boolean;
  caption?: boolean;
}) {
  const index =
    [...p.id].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % CARD_PHOTOS.length;
  return (
    <CoffeePhoto
      photo={detail ? (p.format === "Capsules" ? "roasting" : "beans") : CARD_PHOTOS[index]}
      className={cn("rounded-md", className)}
      priority={detail}
      sizes={
        detail
          ? "(min-width: 768px) 50vw, 100vw"
          : "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
      }
      caption={caption}
    />
  );
}

export function ProductCard({ p }: { p: Product }) {
  const s = useDemo();
  const roaster = s.roasters.find((r) => r.id === p.roasterId);
  const pack = startingProductPack(s, p);
  return (
    <Link
      to="/market/$id"
      params={{ id: p.id }}
      className="brand-surface group block min-w-0 p-3 transition-shadow hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <ProductImage p={p} className="transition-transform group-hover:scale-[1.01]" />
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-copper">
            {p.country} · {p.process}
          </p>
          <p className="font-display text-lg leading-snug">{p.name}</p>
          <p className="text-xs text-muted-foreground">{roaster?.name}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="num whitespace-nowrap text-sm">€{pack.price.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">per {productSizeLabel(p, pack.size)}</p>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{p.notes.join(" · ")}</p>
      <p className="mt-2 text-xs text-muted-foreground">{p.format} · demo EUR price</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {p.stock > 0 ? `Sample inventory: ${p.stock} packs` : "No sample inventory"}
      </p>
    </Link>
  );
}
