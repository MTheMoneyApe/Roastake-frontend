import { Link } from "@tanstack/react-router";
import type { Product } from "@/lib/demo/types";
import { useDemo } from "@/lib/demo/store";
import { cn } from "@/lib/utils";

const tint: Record<string, string> = { Colombia: "bg-copper/25", Ethiopia: "bg-brass/30", Kenya: "bg-loss/20", Brazil: "bg-sage/40" };

export function ProductImage({ p, className }: { p: Product; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-md bg-parchment", className)}>
      <div className="h-full w-full bg-muted" aria-hidden="true" />
      <div className={cn("absolute inset-0 mix-blend-multiply", tint[p.country])} aria-hidden="true" />
      <span className="absolute bottom-4 left-4 max-w-[calc(100%-2rem)] rounded-md bg-card/95 px-3 py-2 font-display text-sm leading-tight text-foreground">{p.origin}</span>
    </div>
  );
}

export function ProductCard({ p }: { p: Product }) {
  const roaster = useDemo((s) => s.roasters.find((r) => r.id === p.roasterId));
  return (
    <Link to="/market/$id" params={{ id: p.id }} className="brand-surface group block min-w-0 p-3 transition-shadow hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
      <ProductImage p={p} className="aspect-square transition-transform group-hover:scale-[1.01]" />
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-copper">{p.country} · {p.process}</p>
          <p className="font-display text-lg leading-snug">{p.name}</p>
          <p className="text-xs text-muted-foreground">{roaster?.name}</p>
        </div>
        <p className="num shrink-0 whitespace-nowrap text-sm">€{p.price.toFixed(2)}</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{p.notes.join(" · ")}</p>
      {p.stock === 0 && <p className="mt-1 text-xs font-medium text-loss">Sold out</p>}
      {p.stock > 0 && p.stock < 20 && <p className="mt-1 text-xs font-medium text-copper">Only {p.stock} left</p>}
    </Link>
  );
}
