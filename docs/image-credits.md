# Illustrative coffee photography

All photography is editorial illustration, **not the actual product, farm, lot, merchant, warehouse or roaster**. No image proves coffee backing, custody, shipment, quality, identity or redemption. Images are deliberately shared between sample listings; they are not SKU-specific product shoots. Each use carries the visible caption “Illustrative photography · not the actual lot/roaster”.

## License verification and selection

On 2026-11-13, each selected **individual Unsplash photo page** was opened in Chrome. Each displayed **“Download free”** and **“Free to use under the Unsplash License”**. None was Unsplash+, Getty or iStock content. Related premium ads were ignored. The main photo URL was read from the corresponding page's image metadata, then downloaded from `images.unsplash.com`; there are no external runtime image requests.

[Unsplash License](https://unsplash.com/license): free commercial and non-commercial use, without permission or required attribution; attribution is appreciated and supplied below. Unsplash's prohibition on compiling a competing image service and selling unmodified images still applies. No endorsement, identity or merchant relationship is implied.

### Roasted beans — Blake Wisz
- Photo: [Handful of roasted coffee beans over a bag](https://unsplash.com/photos/handful-of-roasted-coffee-beans-over-a-bag-otY4pYop4S4).
- Page confirmation: Blake Wisz; “Free to use under the Unsplash License”.
- Source asset: `https://images.unsplash.com/photo-1774801935463-15275f0bcc8f`.
- Local assets: `public/images/coffee-beans-{480,960,1600}.webp`.
- Uses: sample catalog/recommendation cards, product detail and editorial roaster cards; never presented as a named roaster's packaging.
- Inspected downloaded crop: hand, roasted beans and sack texture; no legible third-party roaster name/logo.

### Coffee cherries — Cédrina Laberge
- Photo: [Coffee cherries ripen on the coffee plant](https://unsplash.com/photos/coffee-cherries-ripen-on-the-coffee-plant-Sd5DeuU-OZE).
- Page confirmation: Cédrina Laberge; “Free to use under the Unsplash License”.
- Source asset: `https://images.unsplash.com/photo-1750967613671-297f1b63038d`.
- Local assets: `public/images/coffee-cherries-{480,960,1600}.webp`.
- Uses: editorial catalog/roaster cards and illustrative Passport processing stage. The page's Colombia context is not attributed to any sample lot.
- Inspected crop: cherries/leaves only; no branding.

### Harvest — Candes J
- Photo: [Farmer holding bucket of ripe coffee cherries](https://unsplash.com/photos/farmer-holding-bucket-of-ripe-coffee-cherries-we5u09a0AxA).
- Page confirmation: Candes J; “Free to use under the Unsplash License”.
- Source asset: `https://images.unsplash.com/photo-1772228616071-aa344913b93e`.
- Local assets: `public/images/coffee-harvest-{480,960,1600}.webp`.
- Uses: home origins section and illustrative Passport harvest stage. The person is not identified as a sample producer; the photo's Colombia location is not evidence for a lot.
- Inspected crop: hands, shirt and cherry-filled bucket; no legible branding.

### Roasting — Ichsan Chairul
- Photo: [Coffee beans tumbling in a roasting machine](https://unsplash.com/photos/coffee-beans-tumbling-in-a-roasting-machine-G4iBY_MUmtk).
- Page confirmation: Ichsan Chairul; “Free to use under the Unsplash License”.
- Source asset: `https://images.unsplash.com/photo-1773118360569-920edd94c56d`.
- Local assets: `public/images/coffee-roasting-{480,960,1600}.webp`.
- Uses: home hero, generic roaster directory/profile editorial media, product detail and Passport roasting stage.
- The photographer describes a real location, Umbra Coffee in Makassar. **This is not the location or equipment of any ROASTAKE sample roaster.** Selected crop is only beans and metal machinery, with no visible roaster identity/logo.

### Green coffee — wisnu dwi wibowo
- Photo: [A white bag filled with green coffee beans](https://unsplash.com/photos/a-white-bag-filled-with-green-coffee-beans-KFHP3Ee9zwg).
- Page confirmation: wisnu dwi wibowo; “Free to use under the Unsplash License”.
- Source asset: `https://images.unsplash.com/photo-1703646617698-d61b240cd2f8`.
- Local assets: `public/images/coffee-green-{480,960,1600}.webp`.
- Uses: editorial catalog variation and Passport custody stage, not a warehouse record.
- Inspected crop: plain white sack and green beans; no branding.

## Asset delivery

15 WebP files, five subjects × widths 480 / 960 / 1600. Every crop is 4:3 (heights 360 / 720 / 1200), requested directly from the verified CDN URL with `fm=webp&w=WIDTH&h=HEIGHT&fit=crop&q=68`. No Python/image dependency or runtime image package is part of the project; `package.json` and `bun.lock` are unchanged. A temporary Pillow environment was created before the user's subsequent no-image-dependencies instruction, then abandoned; shipped WebPs were downloaded directly, not generated with it.

`CoffeePhoto` reserves aspect ratio and dimensions, supplies local `srcSet`/`sizes`, descriptive alt text, lazy loading by default, and an icon/text illustration when loading fails (the broken `<img>` is removed). Explicit `priority` uses eager/high fetch priority only on the actual home/product/roaster hero. No text is overlaid on photographs, preserving theme-aware text contrast.

Rejected candidate: [JIWON KANG's machinery close-up](https://unsplash.com/photos/coffee-roasting-machine-close-up-c6t0CMiwXLI) confirmed the free license but included background sacks/packaging; the cleaner beans-only machine crop above was selected instead. Other unused candidates were not used or claimed verified.

## Required modern-web-guidance run

The task's exact first command succeeded:

```bash
npx -y modern-web-guidance@latest search "responsive optimized product photography and decorative editorial images in React, lazy loading, LCP image priority, image accessibility and responsive image layouts" --skill-version 2026_09_04-7de96777
```

Returned: `optimize-image-priority`, `html`, `deliver-optimized-decorative-images`, `performance`, `resolution-optimized-pseudo-elements`, `lazy-load-video-and-audio`, `shaped-cutouts`, `responsive-design`, `form-factor-adaptation`, `css-layout`.

Retrieved and read in full: `optimize-image-priority`, `deliver-optimized-decorative-images`, `responsive-design`; a second accessibility search returned `accessibility` and related guides; retrieved and read `accessibility` in full. Applied: one explicit hero priority per page, no high+lazy combination, native discoverable `<img>`, responsive WebP variants, reserved aspect ratio, descriptive alt, visible native captions, semantic timeline and stable accessible fallback. No CSS image-set needed because these are HTML editorial images, not backgrounds.

CLI warned requested skill version `2026_09_04-7de96777` was older than `2026_11_09-5bcc021b`; the user-specified version flag was retained, with no skill/project update. Experimental EnvHttpProxyAgent notices were emitted. Unsplash `web_fetch` returned HTTP 401 once; successful verification used the browser, not retries or premium related images.
