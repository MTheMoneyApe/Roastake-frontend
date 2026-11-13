import { useState } from "react";
import { Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

/** Editorial subjects, deliberately not SKU/farm/merchant identity mappings. */
export const COFFEE_PHOTOS = {
  beans: { alt: "A handful of roasted coffee beans above an open sack", subject: "Roasted beans" },
  cherries: { alt: "Red coffee cherries ripening among green leaves", subject: "Coffee cherries" },
  harvest: {
    alt: "A coffee grower holding a bucket of harvested cherries",
    subject: "Coffee harvest",
  },
  roasting: {
    alt: "Roasted coffee beans moving inside a roasting machine",
    subject: "Roasting process",
  },
  green: { alt: "Unroasted green coffee beans in an open white sack", subject: "Green coffee" },
} as const;

export type CoffeePhotoId = keyof typeof COFFEE_PHOTOS;

export function CoffeePhoto({
  photo,
  className,
  priority = false,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  caption = true,
}: {
  photo: CoffeePhotoId;
  className?: string;
  priority?: boolean;
  sizes?: string;
  /** Only omit when an adjacent visible caption already identifies the illustration. */
  caption?: boolean;
}) {
  // Key the inner component so an error on one subject doesn't hide the next subject.
  return (
    <Photo
      key={photo}
      photo={photo}
      className={className}
      priority={priority}
      sizes={sizes}
      caption={caption}
    />
  );
}

function Photo({
  photo,
  className,
  priority,
  sizes,
  caption,
}: Required<Pick<Parameters<typeof CoffeePhoto>[0], "photo" | "priority" | "sizes" | "caption">> & {
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const metadata = COFFEE_PHOTOS[photo];
  return (
    <figure className={cn("min-w-0", className)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-secondary">
        {failed ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 border border-border p-4 text-center text-muted-foreground"
            role="img"
            aria-label={`${metadata.subject} illustration; photograph unavailable`}
          >
            <Coffee className="size-12 text-highlight" aria-hidden="true" />
            <span className="font-display text-lg">{metadata.subject}</span>
            <span className="text-xs">Editorial illustration · photograph unavailable</span>
          </div>
        ) : (
          <img
            src={`/images/coffee-${photo}-960.webp`}
            srcSet={[480, 960, 1600]
              .map((width) => `/images/coffee-${photo}-${width}.webp ${width}w`)
              .join(", ")}
            sizes={sizes}
            width={1600}
            height={1200}
            alt={metadata.alt}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      {caption && (
        <figcaption className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Illustrative photography · not the actual lot/roaster
        </figcaption>
      )}
    </figure>
  );
}
