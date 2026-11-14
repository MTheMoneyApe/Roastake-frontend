# Final frontend source review

Reviewed the assigned PR #2 working tree on 2026-11-13, starting from commit `ec35d4f175ad69c80df08d5d748e0c554cce5a75`, including the focused corrections below. This is source/unit-test evidence, not a deployed-build or browser attestation. Other workers were active; only the expressly assigned source/test files and this report were changed. No commit, publication, backend, contract, business-calculation or deployment changes were made by this reviewer.

## Proven defects corrected

1. **Positions maturity classification contradicted its real feature.** `/app/positions` renders `LivePositionsPanel` and a separately identified browser-demo section, but was under Demo Workspace with a generic demo scope notice. It now sits immediately after Perpetuals in Markets / Testnet with a `TESTNET + DEMO` badge; its route-specific notice explicitly distinguishes non-monetary Testnet positions from local, not-on-chain demo positions. The positions component and transaction code are untouched. Reproduction before correction: the new positions navigation regression failed because no positions item existed in the Testnet group.
2. **Four planned dynamic routes exposed placeholder or misleading metadata.** `/admin/roasters`, `/app/vaults/gct-single`, `/app/governance/proposals/CIP-12`, and `/app/ventures/kochere-coop` previously produced `Section` or `Id` titles and “simulated demo module” descriptions. Their metadata now includes the actual route parameter, feature name and `Roadmap / Planned`, explicitly describing a non-operational preview. Four new metadata regressions failed before correction and pass after it.
3. **The volume chart had no matching category field.** `MarketAnalyticsPage` generated `{ m, vol }`, whereas shared `Bars` consumes `XAxis dataKey="d"`. Changed only the label key to `{ d: m.id, vol: ... }`; rounding and numeric values are identical. A component-level regression consuming the actual analytics page and mocked Recharts props failed before correction, then passed.
4. **CSS reduced-motion rules did not control JavaScript chart animation.** Shared Recharts Area/Bar/Pie components inherited client entrance animation (installed Recharts defaults: Area/Pie 1500 ms, Bar 400 ms). Set `isAnimationActive={false}` on those three presentation primitives, avoiding entrance motion for all preferences and keeping SSR/client behavior stable without introducing a new hook or dependency. A component regression failed on undefined animation props before correction and passes with all three explicitly false.
5. **Perps connection banner promised an unverified named provider.** Replaced “Connect Meteor or HOT Connect” with “Connect a supported NEAR Testnet wallet”. This does not change connector availability. The wallet reviewer was notified of the equivalent README wording and owns its update.

## Complete file-router inventory

There are **50 file-router leaf declarations**, plus `src/routes/__root.tsx` (document/providers/error/not-found boundary, not a standalone URL). `src/routes/README.md` is documentation, not a route. Index routes accept the router's trailing-slash normalization. The list below includes every real route file; dynamic examples are concrete paths, not unexpanded `$` placeholders.

```text
src/routes/index.tsx                              -> /
src/routes/roadmap.tsx                            -> /roadmap
src/routes/market.index.tsx                       -> /market
src/routes/market.$id.tsx                         -> /market/huila-paraiso
src/routes/cart.tsx                               -> /cart
src/routes/checkout.tsx                           -> /checkout
src/routes/orders.tsx                             -> /orders
src/routes/roasters.index.tsx                     -> /roasters
src/routes/roasters.$id.tsx                       -> /roasters/altura
src/routes/subscriptions.tsx                      -> /subscriptions
src/routes/wholesale.tsx                          -> /wholesale
src/routes/discovery-boxes.tsx                    -> /discovery-boxes
src/routes/app.index.tsx                         -> /app (redirects /app/dashboard)
src/routes/app.dashboard.tsx                     -> /app/dashboard
src/routes/app.docs.tsx                          -> /app/docs
src/routes/app.activity.tsx                      -> /app/activity
src/routes/app.assets.index.tsx                  -> /app/assets
src/routes/app.assets.$id.tsx                    -> /app/assets/GCT-COL-HUI-25A
src/routes/app.coffee-passport.tsx               -> /app/coffee-passport
src/routes/app.roast.tsx                         -> /app/roast
src/routes/app.redeem.tsx                        -> /app/redeem
src/routes/app.swap.tsx                          -> /app/swap
src/routes/app.oracle.tsx                        -> /app/oracle
src/routes/app.wallet.tsx                        -> /app/wallet
src/routes/app.perps.index.tsx                   -> /app/perps
src/routes/app.perps.$market.tsx                 -> /app/perps/COFFEE-ARABICA-TESTNET-USD
src/routes/app.positions.tsx                     -> /app/positions
src/routes/app.markets.tsx                       -> /app/markets
src/routes/app.market-analytics.tsx              -> /app/market-analytics
src/routes/app.multichain.tsx                    -> /app/multichain
src/routes/app.borrowing.tsx                     -> /app/borrowing
src/routes/app.lending.tsx                       -> /app/lending
src/routes/app.farming.tsx                       -> /app/farming
src/routes/app.staking.tsx                       -> /app/staking
src/routes/app.portfolio.tsx                     -> /app/portfolio
src/routes/app.tokenization.tsx                  -> /app/tokenization
src/routes/app.treasury.tsx                      -> /app/treasury
src/routes/app.risk-center.tsx                   -> /app/risk-center
src/routes/app.vaults.index.tsx                  -> /app/vaults
src/routes/app.vaults.$id.tsx                    -> /app/vaults/gct-single
src/routes/app.governance.index.tsx              -> /app/governance
src/routes/app.governance.proposals.index.tsx    -> /app/governance/proposals
src/routes/app.governance.proposals.$id.tsx      -> /app/governance/proposals/CIP-12
src/routes/app.ventures.index.tsx                -> /app/ventures
src/routes/app.ventures.apply.tsx                -> /app/ventures/apply
src/routes/app.ventures.$id.tsx                  -> /app/ventures/kochere-coop
src/routes/roaster.index.tsx                     -> /roaster (redirects /roaster/dashboard)
src/routes/roaster.$section.tsx                  -> /roaster/dashboard
src/routes/admin.index.tsx                       -> /admin
src/routes/admin.$section.tsx                    -> /admin/roasters
```

Additional representative dynamic URLs:

- Perpetuals: `/app/perps/COFFEE-ROBUSTA`, `/app/perps/COFFEE-GESHA`; `/app/perps/COL-G` remains an existing legacy/demo deep link. The contract ID uses a slash but the current Arabica URL correctly uses `COFFEE-ARABICA-TESTNET-USD`.
- Marketplace: `/market/yirgacheffe-kochere`, `/market/nordic-capsules` (capsule-size options), `/market/mogiana-espresso` (ground), `/market/tolima-decaf` (seeded out of stock).
- Assets: `/app/assets/RCT-COL-HUI-25A`; passport selection `/app/coffee-passport?lot=RCT-COL-HUI-25A`; simulations `/app/roast?lot=GCT-COL-HUI-25A`, `/app/redeem?lot=RCT-COL-HUI-25A`.
- Profile: `/roasters/fern-copper`.
- Planned detail examples above are still generic `ModulePage` previews, not working vault, governance or investment products. Arbitrary one-segment dynamic parameters currently resolve to those previews; no entity validation was added or implied.

### Every roaster sidebar section

All are served by `src/routes/roaster.$section.tsx`, use `ROASTER_NAV` from `src/components/shell.tsx`, and remain clearly planned:

```text
/roaster/dashboard      Overview
/roaster/products       Products
/roaster/inventory      Inventory
/roaster/orders         Orders
/roaster/customers      Customers
/roaster/payments       Payments
/roaster/lots           Coffee Lots
/roaster/tokenization   Tokenization
/roaster/roasting       Roasting
/roaster/analytics      Analytics
/roaster/settings       Settings
```

Back links resolve to `/app/dashboard` and `/market`.

### Every admin sidebar section

`/admin` is the overview; every section below is served by `src/routes/admin.$section.tsx` using `ADMIN_SECTIONS`/`ADMIN_NAV` from the shell. These are planned previews, not protected production management interfaces:

```text
/admin/roasters       Roaster approvals
/admin/products       Product moderation
/admin/lots           Coffee lots
/admin/custody        Custody & reserves
/admin/tokenization   Mint / burn approvals
/admin/vaults         Vault config
/admin/risk           Risk parameters
/admin/markets        Perps markets
/admin/oracles        Oracle monitor
/admin/treasury       Treasury
/admin/governance     Governance
/admin/redemptions    Redemption queue
/admin/fees           Fee configuration
/admin/analytics      Analytics
```

Back link resolves to `/app/dashboard`. No route or section was deleted.

## Links, source truth and metadata

- A static scan of non-test TSX found **57 literal internal `to`/`href` destinations, zero unmatched file-router targets**. The scan excludes data-driven link props, which are covered separately by the navigation router tests. It proves destination existence, not interactive completion or entity validity.
- Navigation tests match APP/PUBLIC/ROADMAP destinations against the actual router. App-routing tests also match all admin and roaster destinations and verify the `/app` and `/roaster` redirects. The landing anchor `#why-coffee` has a matching section ID. Dynamic market, asset and roaster links use seeded IDs and router params, not hardcoded nonexistent pages.
- Landing source in both languages distinguishes operator-controlled synthetic Perps prices, real non-monetary RHEA test-token transactions, and the independent read-only OutLayer integration. The separate oracle is not claimed to price Perps. Physical backing/custody/redemption/inventory is explicitly unverified; 1 token = 1 kg is conceptual accounting, with roasting loss and fees separate. The resilience thesis includes risk and does not promise a hedge, uncorrelated performance or appreciation.
- Existing `seo()` supplies title, description, Open Graph title/description/type and a Twitter card. Only the landing declares a canonical URL (`https://roastake.vercel.app/`). No localized URL/hreflang implementation or social preview image is present. This is a metadata coverage gap, not a new functionality gate or reason to change deployment configuration.
- Some static planned route descriptions still use “simulated demo module” although their visible shell and `ModulePage` correctly say `Roadmap / Planned`. Only the four specifically authorized placeholder dynamic heads were changed in this pass. Marketplace/profile/lot detail heads are generic rather than entity-specific, and some do not themselves say illustrative; visible scope notices do. Search-result-specific trust wording remains a limited source-SEO gap.
- Documentation external GitHub URLs were inspected as source strings; remote availability, branch freshness, redirects and external link contents were not fetched by this reviewer.

## Language and accessibility boundaries

- The document defaults to `lang="en"`. Landing content and public shell/header/footer switch between English and Spanish via the existing local preference. `PublicShell` explicitly marks the **main content English on every non-landing public route**, so Spanish public chrome does not mislabel English marketplace, roadmap, cart or profile content. AppShell/internal transactional pages stay English. This is a bilingual editorial landing/public-chrome feature, not app-wide translation.
- Canonical maturity badges retained in English inside Spanish landing content have explicit `lang="en"` boundaries. Photo alt copy on the landing is localized and the photos have adjacent translated editorial captions. Generic coffee component captions/error fallbacks are English on English internal pages. Global wallet dialog and some chrome names remain English under Spanish chrome; complete bilingual wallet/error-state localization was not claimed or tested.
- Source protections include skip links to focusable `main`, named navigation regions, `aria-current` active links, disclosure buttons with `aria-expanded`/`aria-controls`, a titled/described mobile Sheet with focus restoration, native field labels or aria labels for the reviewed selectors, and decorative icons hidden from assistive technology.
- The scoped shell tests passed keyboard drawer/focus/active-state assertions. This does not replace real-browser keyboard behavior, screen-reader testing, color-contrast measurement, text zoom or physical mobile-device testing.
- Static chart entrance motion is fixed. Recharts bar volume information still lacks a separately exposed numeric table/keyboard data summary; fixing category labels is not a claim that the chart is fully screen-reader accessible. The funding table contains other data, not the volume values. This is a remaining accessibility enhancement outside the narrowly assigned fixes.

## Static performance review

- The single shared `<img>` implementation has local WebP sources, 480/960/1600-width `srcSet`, declared dimensions plus a 4:3 layout box, async decoding and lazy loading by default. The landing hero explicitly requests eager/high priority and supplies a constrained `sizes` expression. The secondary landing photo remains lazy. Broken-image fallback is implemented; photo/passport tests pass.
- All 15 variants total approximately 2.5 MiB on disk. Largest single files: cherries-1600 **486,418 bytes**, roasting-1600 **477,150 bytes**. The hero harvest variants are **50,032 / 139,474 / 288,488 bytes** for 480/960/1600. Responsive markup prevents blindly loading all variants; actual browser DPR selection, network transfer and LCP are not measured here. No new image conversion or asset request was made.
- The root imports `WalletHubDialog` and `WalletInfrastructureProvider`; shared shell imports wallet controls, and the provider imports Wagmi plus wallet-standard integrations. This makes wallet infrastructure a landing startup-cost risk, even though NEAR connector and WalletConnect paths use dynamic imports and route chunks exist. Existing unrebuilt `.output/public/assets` contained wallet-hub **796,747 bytes**, main index **404,431 bytes**, plus vendor chunks. Those are observations of an existing output directory, **not a measurement of the final integrated build, a compressed transfer budget or proof that every listed chunk loads initially**. Parent owns the final build and browser network/performance checks; broad lazy-provider refactoring was not attempted.
- Google fonts use preconnect and `display=swap`, but the stylesheet remains an external render-critical dependency. Source inspection cannot establish cache behavior or the impact under constrained connections.
- Landing CSS has explicit reduced-motion rules; shared CSS disables the common spin/pulse/enter/exit animation utility classes. The separate lightweight-charts implementation tears down its observers/chart instance and uses dynamic library import; no chart-library changes were made here.

## Reproducible validation and exact gaps

Passed before edits: `npm test -- src/test/navigation.test.ts src/test/app-routing.test.tsx src/test/landing.test.tsx src/test/coffee-photo-passport.test.tsx src/test/source-trust-labels.test.tsx` — **5 files, 45 tests**.

Expected failures reproduced after adding regressions, before fixes:

- `npm test -- src/test/navigation.test.ts` — **5 new failures / 18 existing passes** (positions classification, four dynamic metadata placeholders).
- `npm test -- src/test/demo-chart-accessibility.test.tsx` — **2 failures** (missing explicit static animation props, missing volume category key).

Passed after fixes: `npm test -- src/test/navigation.test.ts src/test/app-routing.test.tsx src/test/demo-chart-accessibility.test.tsx src/test/shell-design.test.tsx src/test/design-system.test.tsx src/test/chart-theme.test.tsx` — **6 files, 69 tests**. `git diff --check` passed. Targeted tests mock Recharts rendering to inspect the props/data actually supplied by the shared components and analytics page; they do not prove browser drawing or physical-device rendering.

After the provider-banner wording correction, `npm test -- src/test/perps-ui.test.tsx src/test/source-trust-labels.test.tsx` also passed — **2 files, 19 tests**; this run emitted a non-failing React `act(...)` warning in the existing wallet/preview walkthrough test. Final `git diff --check` passed.

Repository-wide typecheck, full tests, build and browser evidence are deliberately left to the coordinating Session once all workers finish. This reviewer did not start a server or use a browser; screenshots, exact final chunk transfer, keyboard popover behavior on Safari/Brave, signed-wallet transactions and deployed-preview behavior remain outside this source review.

Operational observation relayed by the parent: its browser saw Perps synthetic prices marked STALE (approximately 203,455 seconds old versus the 300-second threshold). This is **parent-provided browser evidence**, not a new check performed here. It prevents claiming a current successful trade-price path; no operator/backend tick was triggered, no stale-price guard was weakened, and no deployment or contract settings were changed.
