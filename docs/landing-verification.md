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
- Five public links remain one semantic responsive tree. The Android/Brave follow-up below removes profile/role/demo controls from the application header too. Existing routes preserved.
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

## Android/Brave application-header correction

The user’s physical Android/Brave capture exposed a gap in the earlier landing-focused emulation: the application header still had a demo avatar dropdown on `/app/perps`. It was not the public landing navigation. Reproduced on the existing Preview at 390×844 by activating `Open profile and demo role menu`: the 224×394px overlay started at y=52 and covered the Testnet notice and Perps content.

Removed the `Profile` component and its role/reset/link dropdown from the shared application header entirely, not hidden behind another button or moved elsewhere. Also removed the header’s simulated notifications popover so it cannot create another demo overlay. Real wallet hub, theme control, accessible navigation drawer, all routes, demo store and Perps logic are unchanged. Public ES/EN content is unchanged; existing internal pages retain their English language boundary.

Post-publication viewport inspection also found the long live-contract badge expanding the 320px page to 370px. The badge now wraps within its available width; wallet UI coverage asserts its wrapping classes. No contract identifier or wallet logic changed.

Regression coverage renders `/app/perps` with 320/390/430/1440px viewport values, asserts no profile/role/notification trigger or header command menu, preserves wallet/theme controls, opens the navigation drawer, confirms the Perps link, and checks Escape/focus restoration. These are jsdom structural/interaction checks, not CSS viewport proof. Before the fix, 5 shell assertions failed; after it, all 30 shell tests passed.

Current correction checks on Reason Cloud:

- `bun x tsc --noEmit`: PASS.
- `bun run test`: PASS, 220 tests / 25 files.
- `bun run build`: PASS; existing bundling/externalization/Nitro warnings remain.
- `bun x eslint src/components/shell.tsx src/components/trading.tsx src/test/shell-design.test.tsx src/test/wallet-ui.test.tsx`: PASS, 0 errors / 4 existing Fast Refresh warnings.
- `git diff --check`: PASS.
- Rendered post-publication checks and screenshots are recorded in the PR follow-up; physical Android/Brave retesting is not claimed.

## Limits

Chrome viewport emulation, not every physical device or browser engine. No connected-wallet signing or Testnet transaction E2E, screen-reader audit, measured performance benchmark, or exhaustive internal route/state matrix. Synthetic touch gesture dispatch did not establish a touch result, so no physical-touch pass is claimed. Native buttons/links and keyboard behavior were exercised. Desktop/mobile/theme QA omissions in an earlier pass were due to time/scope, not user instruction.

Prior PR work and historical evidence remain in `docs/global-theme-verification.html`, `docs/visual-consistency-review.html` and earlier commits/discussion; the sections above record the earlier landing increment, not the final audit below.

## Final whole-product audit — 2026-11-13

### Scope and evidence boundaries

- Same PR #2, same `reason/unify-roastake-frontend-69e09c76` branch, base `hackathon-submission`, OPEN / DRAFT. No production promotion, alias/domain/settings changes, backend, contracts or shared financial math changes. The working head initially had different commit ancestry from the requested historical `04ebe18c8e0e357aa95c864bb6804d4d815d66cd`, but an empty content diff; published history was preserved.
- [Source route inventory and remaining source findings](final-source-review.md): all 50 file-router patterns, including 11 roaster and 14 admin sections. [Wallet provider audit and safe manual steps](wallet-final-audit.md).
- Chrome on Reason Cloud, not Marco's phone. Automated navigation followed real visible anchors: 89 desktop destinations, then 88 mobile destinations in both themes (176 samples). The mobile crawl omitted a cart destination that was inaccessible from the old mobile header; this audit fixes it. These crawls tested load completion, headings, bounds, image failures and unwanted header demo controls; they were not screenshots or manual acceptance of every page/state.
- Landing and Perps were measured at 320/360/390/430, 768/820/844 landscape, 1024/1280 and 1440/1920. No page-level horizontal overflow or measured clipped heading/paragraph was observed in those samples. This is representative responsive coverage, not every route × size × theme × language combination.
- Real CDP touch-start/touch-end opened Perps navigation at 320px; real Escape closed it and restored focus to Open menu. Header had no Demo Explorer, role selector or demo popovers; the broader route crawls found none either. No physical Android/Brave or screen-reader run is claimed.
- Explicit additional direct-route checks: planned vault, proposal and venture IDs loaded with planned disclosures and preserved deep links. The post-publication observations below distinguish new code from the earlier deployed crawl.

### Proven findings and fixes

1. **High — `/app/swap`: double submission before re-render.** Two rapid sign clicks could invoke the signer twice. A failing regression reproduced two calls before the fix. A synchronous in-flight lock now protects submission and controls stay disabled during signing/finality verification. Tests cover loading, empty pool, missing quote, invalid amount, insufficient balance, pending, mocked verified success and rejection without a manufactured explorer link. These are controlled mocks, not a real signed transaction.
2. **High — shared wallet lifecycle:** delayed restoration/connect events could reintroduce an identity after disconnect. Four regression tests cover delayed restores/connections/events and initialization failure. Generation invalidation and event guards prevent stale identity resurrection; initialization failure is now visible. No external wallet signing was performed.
3. **Medium — public coffee/cart mobile flow:** cart navigation was hidden below 640px even after adding a demo item. The accessible cart action is now visible on mobile with a localized label and touch-sized target; main navigation remains the same five destinations. Regression failed before and passes after the fix.
4. **Medium — maturity classification:** legacy `/app/perps/COL-G` and unknown market IDs were labeled live. They now disclose browser-only demo; configured Testnet markets remain live and preview catalog entries remain planned. Positions are grouped with Markets with an explicit Testnet + Demo badge; Activity states that chain receipts and browser-only demo logs are mixed, not all live.
5. **Medium — documentation truth and links:** docs now use the shared exact maturity labels, planned-module Open goes to Roadmap rather than Dashboard, OutLayer explicitly does not verify coffee, and GCT/RCT accounting is proposed with roasting mass loss. Regression tests assert these distinctions.
6. **Medium — provider copy:** a selector package from HOT Labs is not HOT wallet Testnet support. Perps, Wallet Hub, walkthrough, operator instructions and README no longer promise it. The real Testnet manifest lists Meteor, Intear, Ledger, Nightly, Wallet Connect, Unity, Ethereum Wallets and NEAR CLI; the actual adapter filters HOT because its manifest lacks Testnet support. Support listings are source/manifest observations, not successful provider E2E tests.
7. **Low — chart/accessibility and metadata:** volume chart category uses the real `d` field, not nonexistent `m`; shared decorative chart animation is disabled, with regression coverage. Dynamic admin/vault/proposal/venture document heads now have meaningful planned titles instead of `Id`/`Section`. No data values or financial formulas changed.
8. **Medium — Perps disclosure contrast:** two small light-theme paragraphs measured about 4.05:1 before the change. Their foreground was strengthened without changing global theme tokens. Post-publication measurement is recorded below; no blanket contrast certification is claimed.

### Remaining findings / blocked verification

- **High operational limitation — `/app/perps`:** an actual read returned three registered markets, all STALE (about 203455 seconds old against the 300-second policy during the sample). New opens were blocked correctly. Reproduce by opening Perps and inspecting market feed age/status. Restoring the operator feed is outside this frontend-only task; no operator, oracle or backend mutation was attempted. Synthetic operator prices are not physical-coffee spot prices, and OutLayer does not supply them.
- **High unverified E2E — `/app/wallet`, `/app/swap`, `/app/perps`:** no environment-controlled funded Testnet signer was established. Real Meteor redirects/popups, reconnect persistence, network/account switches, signing, finality/refunds and explorer verification remain manual. No user wallet, real money or Mainnet was used. Mocked success is not chain evidence.
- **Medium resilience — wallet manifest failure:** upstream adapter initialization may swallow a manifest fetch failure and yield no available providers. Network/error recovery needs a browser run with controlled provider/network failure. See the wallet report; do not interpret an empty provider list as proof that a wallet is unsupported.
- **Medium recovery — disconnect after broadcast:** a broadcast transaction can outlive the UI session and its returned hash may be lost. Before retrying, inspect the controlled Testnet account's explorer history to avoid an accidental duplicate. End-to-end recovery is not established by the stale-connection tests.
- **Medium accessibility — external NEAR wallet selector:** on `/app/wallet`, open Connect NEAR Wallet and press Escape. The chooser closes and connecting state clears, but focus ends on the document body rather than returning to the trigger. Observed in the updated Preview at 390px; not fixed in this pass. Restore focus in the adapter/trigger after cancellation and retest keyboard order. The app navigation drawer does restore focus correctly; do not generalize that pass to this external chooser.
- **Low copy — `/app/swap` disconnected/no amount:** the live UI can show both “No on-chain quote is available” and a stale-quote instruction when there is no quote yet. No unsafe action is enabled; reduce this redundant error copy in a UI-only follow-up without weakening the quote gate.
- **Medium localization — internal feature pages:** EN/ES exists for public navigation, landing and disclosure surfaces, but most deep app/demo/roadmap feature bodies are English. Switching ES does not constitute complete Spanish localization; these pages remain a documented coverage/product gap rather than being presented as fully translated.
- **Low polish — planned pages:** repeated planned notices can be visually verbose, but accurately preserve route maturity and deep links. No deletion or hiding of functionality was used as a fix.
- **Low performance — representative landing:** unthrottled/cached lab navigation observed FCP about 532ms, response start 2ms, DOMContentLoaded 493ms and load 614ms. Later LCP/CLS samples were contaminated by viewport resizing and are not valid Core Web Vitals. No field data or Lighthouse score is claimed. 960px coffee WebP variants were about 139–140KB each; encoded wallet/index bundles were about 228KB/131KB in this sample. The wallet dependency remains a notable on-demand cost; no dependency or wholesale redesign was introduced.
- **Pre-existing lint debt:** global ESLint still fails on 600 formatting errors / 14 warnings; historical requested-head baseline had 708 errors / 14 warnings. All changed/new TypeScript files pass scoped ESLint with zero errors and six Fast Refresh warnings. No rule was suppressed and no unrelated repository-wide reformat was performed.
- Every route's possible empty/error/loading/interactive state, every responsive/language cross-product, Safari/Firefox, physical touch and screen readers were **not** exhaustively exercised. The test suite and the sampled browser audit are complementary, not an exhaustive certification. Source and visible-UI checks do not prove physical inventory, backing, custody, certification, shipment, redemption, yield or monetary value.

### Integrated checks on the final code increment

- `bun install --frozen-lockfile`: PASS, no lockfile/dependency changes.
- `bun x tsc --noEmit`: PASS.
- `bun run test`: PASS, **240 tests / 27 files**. The first full integration run failed two stale shell expectations (legacy market scope and Activity's new status badge); assertions were corrected to the intended explicit scope and accessible name. The subsequent complete run passed; failures were not skipped.
- `bun run build`: PASS; existing bundler/externalization warnings remain.
- ESLint on all changed **and new** `.ts`/`.tsx` files: PASS, **0 errors / 6 warnings**. `bun run lint`: FAIL, **600 errors / 14 warnings**, pre-existing formatting debt as described above.
- `git diff --check`: PASS.

### Safe manual Testnet transaction check for Marco

1. Use a separate disposable wallet that Marco controls; choose an actually listed Testnet-capable provider (for example Meteor), never a user Mainnet wallet or a seed/key shared in chat. Fund only with faucet/non-monetary Testnet assets. HOT is not currently in the tested real Testnet manifest.
2. Verify the UI says NEAR Testnet and the expected disposable `.testnet` account. Test rejection, account switch, disconnect/reconnect, provider cancel and refresh before any signing. A UI account label alone is not proof of network correctness.
3. On RHEA, wait for verified pool, balance, registration and fresh quote; inspect every wallet action, receiver, token, amount and storage/deposit request. If any network/account/action is unexpected, reject. Submit only a minimal non-monetary Testnet amount once; confirm signing → verification → finality.
4. Open the **actual returned** transaction on a NEAR Testnet explorer. Compare signer/receiver/actions, final success/failure and balance changes. Record hash, timestamp, provider and UI outcome; never fabricate a link/hash. If disconnected or uncertain after submission, inspect the account's explorer history before retrying.
5. Perps opens require a fresh operator feed; the observed stale state is a reason to stop, not bypass the gate. No production/commodity trade, real-coffee delivery or financial return is established by a Testnet transaction.

### Manual QA required on physical Android/Brave

- Open only the existing QA Preview, test both portrait and landscape with the real browser address bar and keyboard; 320/360/390/430 emulation is not the handset itself.
- Visit `/app/perps`, then other internal routes: no Demo Explorer/role selector/popover in the header. Open/close the drawer by touch, close with Back/Escape where available, verify focus and scroll recovery.
- Test EN/ES public labels and light/dark, narrow header cart/count, dropdowns and touch targets; zoom text and confirm no clipped or covered content.
- Add a **simulated** marketplace item, visit cart/checkout, then passport, roast and redeem demos. Confirm all receipts/toasts remain explicitly simulated and no shipment/payment claim appears.
- With the separate disposable Testnet wallet only, check Brave shields, popup/deep-link return, provider cancel, refresh/reconnect and the safe transaction checklist above. Do not disable security controls globally or use real funds.

### Final automatic Preview / rendered follow-up

- Verified published code SHA `6f6f273cab6080870043ac85f09291b37a1d9ccf`: GitHub Vercel check **success**, deployment bot **Ready**, and same sole QA alias. Inspector UI required login, so the authenticated GitHub deployment check/bot and rendered content were used instead; no sign-in or settings change was attempted.
- New-code identity was observed independently in the rendered dynamic vault title (“Roadmap / Planned”), Positions' Testnet + Demo grouping, real-provider copy, visible mobile cart and computed improved Perps paragraph foreground. The final documentation-only commit does not change app behavior; its SHA/automatic Preview status are reported on PR #2.
- Latest Preview 320px light/dark Perps screenshots: clean header, no role selector/Demo Explorer/popovers. Repeated actual touch-start/touch-end opened the drawer; Escape closed it, zero dialogs remained, and focus returned to **Open menu**. No page-level overflow observed.
- Both changed Perps paragraphs measured **7.40:1** foreground/background contrast in light theme, compositing ancestor backgrounds and alpha with a canvas before luminance calculation. This checks these paragraphs only, not every color pair.
- Landing ES/dark at 320px: actual selector value `es`, Spanish heading/disclosures, no page overflow; visible localized cart action measured **44×44px**. Desktop landing screenshot captured at 1920px in light theme.
- Marketplace item → cart → checkout → simulated order completed through real visible UI using prefilled fictional details. Browser-only order appeared in `/orders`, cart cleared, toast “Order placed · simulated”; no payment or shipment.
- Passport loaded complete demo disclaimers/definitions; roasting 5kg showed 4.2kg output, 0.8kg loss, 0.084kg fee, 4.116 net tokens and an explicit simulated completion. Redeeming 1kg with a fictional address created a browser-only request, changed simulated balance/USDC and explicitly reported **no shipment**. No financial formulas were modified to obtain this result.
- Wallet selector visibly listed Meteor, Intear, Ledger, Nightly, Ethereum Wallets and NEAR CLI. No HOT option was shown. Opening and cancelling submitted no signed transaction. Selector focus-return limitation is recorded above.
- RHEA read a real pool (2947), reserves and fee while disconnected. No-quote/amount/wallet gates remained closed. Success/failure/pending/empty-pool paths are regression-test mocks, not signed browser E2E evidence.
- Seven representative updated-code screenshots (Perps 320px light/dark, landing 1920px light, landing ES/dark 320px, wallet selector 390px, RHEA 390px, redemption 1920px) are published in the PR audit evidence and companion HTML report.
- Canonical (unchanged): https://roastake.vercel.app/
- Sole QA Preview: https://roastake-git-reason-unify-roastake-frontend-69e09c76-astrym.vercel.app/
- Final status remains **OPEN / DRAFT**. This is an evidence-backed frontend audit with explicit gaps, not certification for production or a claim that all requested state/device combinations passed.
