# Revised ROASTAKE landing — verification

## Scope

Existing PR #2 only, branch `reason/unify-roastake-frontend-69e09c76`, base `hackathon-submission`. Keep OPEN / DRAFT. No production deploy/promotion, aliases, domains, Vercel configuration, dependencies, contracts, backend, financial math or transaction changes.

Canonical public URL: https://roastake.vercel.app/
Single QA alias (unchanged): https://roastake-git-reason-unify-roastake-frontend-69e09c76-astrym.vercel.app/

Production was not updated by this work. Only the normal branch Preview build runs.

## Implementation

- Hero: financial layer for the global coffee economy; precise Testnet and documentation CTAs.
- Narrative: real coffee/risk thesis → three connected layers → products by maturity → coffee/DeFi/venture capital roadmap → roadmap/docs.
- Truth boundaries: synthetic operator-controlled Perps prices; non-monetary RHEA Testnet swaps; independent read-only OutLayer, not Perps pricing or physical verification. Demo assets/commerce and future investment services are not live physical or investment products. Proposed kilogram convention and non-1:1 roasting with separate yield/loss/fees.
- Complete new narrative in EN/ES, persisted public language selector, translated public header/footer, localized editorial photo descriptions. Existing English route content keeps `lang=en` when public navigation is Spanish.
- Five public links remain one semantic responsive tree. Profile/role/demo controls remain in the application, not the public header. Existing routes preserved.
- Local licensed WebP photos retain responsive srcsets, explicit dimensions, eager/high-priority hero and lazy below-fold imagery. Existing logo, fonts, palette and theme preserved; reduced-motion and visible-focus rules retained.

## Guidance

Prescribed pinned modern-web-guidance search ran before frontend edits. Retrieved navbar, accessibility, size-aware-styling, responsive-design and optimize-image-priority. The first image-performance ID did not exist; searched and retrieved the applicable optimize-image-priority guide instead. CLI warned that the requested pinned skill version is old. No new dependency or experimental API invented. Temporary guidance file removed before commit.

## Automated checks on Reason Cloud

- `bun install --frozen-lockfile`: PASS; 957 packages checked, no lockfile changes.
- `bun x tsc --noEmit`: PASS.
- `bun run test`: PASS, 216 tests / 25 files.
- `bun run build`: PASS. Existing wallet externalization, large-chunk and Nitro configuration warnings remain.
- Scoped ESLint for all eight changed TS/TSX implementation/test files: PASS, 0 errors / 5 Fast Refresh warnings, no disabled rules.
- `bun run lint`: FAIL; existing repository-wide formatting debt outside this focused change. Not a repository-wide lint-clean claim.
- `git diff --check`: PASS.

Tests cover section/heading order, both languages, language preference persistence and blocked storage, CTA/canonical destinations, three canonical maturity labels, physical backing and mass-loss caveats, local image behavior, theme independence, mobile hydration at 320/390px, menu selection/Escape and laptop intrinsic-width measurement.

## Rendered checks on the existing automatic Vercel Preview

40 combinations: 320×780, 360×800, 390×844, 430×932, 768×1024, 820×1180, 844×390 landscape, 1024×768, 1280×900 and 1440×1000; each in EN/ES and light/dark. All rendered the expected localized landing with loaded images and without document overflow or out-of-bounds measured headings, copy, cards, photos and header controls. Representative screenshots were inspected; this is not 40 separately inspected screenshots.

- Found/reproduced and fixed mobile popover overlap with its trigger; menu now starts 8px below it and is viewport-height constrained.
- Found/reproduced and fixed 1024px English header overflow caused by measuring shrunken action widths; account for intrinsic scroll widths and prevent action shrink. Added regression.
- At 320px, native popover exposes exactly five links, 44px targets, correct expanded state; Escape closes and returns focus.
- At 390px, Enter opens; choosing the current story route closes and resets expanded state.
- Hero primary CTA actually rendered `/app/perps` with the Coffee Index Perpetuals heading; secondary rendered `/app/docs` with ROASTAKE Documentation. Both had no mobile horizontal overflow.
- `/market` rendered its real heading, a usable translated public header and no mobile horizontal overflow. Existing internal pages remain English, not translated by the landing selector.
- Preference persisted after a full Preview reload.

## Limits

Chrome viewport emulation, not every physical device or browser engine. No connected-wallet signing or Testnet transaction E2E, screen-reader audit, measured performance benchmark, or exhaustive internal route/state matrix. Synthetic touch gesture dispatch did not establish a touch result, so no physical-touch pass is claimed. Native buttons/links and keyboard behavior were exercised. Desktop/mobile/theme QA omissions in an earlier pass were due to time/scope, not user instruction.

Prior PR work and historical evidence remain in `docs/global-theme-verification.html`, `docs/visual-consistency-review.html` and earlier commits/discussion; this document records this landing increment rather than reasserting historical checks.
