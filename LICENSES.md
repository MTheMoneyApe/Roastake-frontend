# ROASTAKE Frontend Repository — Licensing & Provenance Inventory (`MTheMoneyApe/pixel-perfect-replica`)

**Copyright © 2026 @MTheMoneyApe. All rights reserved.** *(solely for the original ROASTAKE modules authored for and owned by `@MTheMoneyApe` listed in Section 1 below)*  
**Licensor (Identified Original Frontend Modules):** `@MTheMoneyApe`

> [!IMPORTANT]
> **This repository is NOT an Open Source release and is NOT wholly owned by `@MTheMoneyApe`.**
> - Only the **47 newly authored NEAR Testnet Oracle, Perpetuals Terminal, Market Charting & Indexer Client, NEAR Wallet Hub, and corresponding test/documentation files** expressly listed in **Section 1** are licensed under [`LICENSE`](./LICENSE) (**ROASTAKE EVALUATION-ONLY PROPRIETARY LICENSE v1.0**, `SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only`).
> - UI primitives (`shadcn/ui`), charting (`lightweight-charts`, `Apache-2.0`), build plugins, router codegen, and npm dependencies retain their respective upstream Open Source or vendor licenses (see [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)).
> - **Template scaffolding (`4c3b15c`), Lovable/bot-committed demo UI/marketplace files, and embedded C2PA AI image assets whose exclusive human copyright assignment cannot be established from the repository are explicitly marked `UNRESOLVED — DO NOT CLAIM OWNERSHIP`.**

---

## 1. Original ROASTAKE Modules Governed by `ROASTAKE EVALUATION-ONLY PROPRIETARY LICENSE v1.0`

**Header Applied:** `SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only` + `Copyright © 2026 @MTheMoneyApe. All rights reserved.`

| Scope | Files (`47` TypeScript / TSX Files + Repo Notices) | Provenance Verification |
| --- | --- | --- |
| **NEAR Testnet Oracle Read Client & UI (`9` files)** | `src/lib/oracle/{config,format,queries,rpc,types}.ts`, `src/components/coffee/oracle.tsx`, `src/routes/app.oracle.tsx`, `src/test/{oracle.test.ts,oracle-ui.test.tsx}` | Authored in commit `e14cc9b` (`MTheMoneyApe`) + local M04.8 work; never present in `4c3b15c` template or `gpt-engineer-app[bot]` commits. |
| **NEAR Perpetuals Terminal, Market History & Chart UI (`18` files)** | `src/lib/perps/{config,market-history,market-history-api,market-history-rpc,market-history-types,math,queries,rpc,tx,types}.ts`, `src/components/perps/{judges-walkthrough,live-perps,margin-panel,market-chart,market-chart-toolbar,operator-controls,positions-panel,tx-status-panel}.tsx` | Newly created untracked M04.6–M04.15 modules integrating `perps-v1.roastake-dev-mta.testnet`, Circle Testnet USDC, three active coffee markets (`Arabica`, `Robusta`, `Gesha`), and verified indexer/RPC charting. |
| **NEAR-First Wallet Infrastructure & Hub (`11` files)** | `src/lib/wallet/{config,context,hyperliquid,near,provider,solana,types,wagmi}.ts`, `src/components/wallet/{copy-address-button,wallet-hub,wallet-pages}.tsx` | Newly created untracked M04.6/M04.8 wallet selector (`@hot-labs/near-connect` + Testnet identity guards). |
| **Original Integration & Guard Tests (`9` files)** | `src/test/{m046-ux.test.tsx,market-chart.test.ts,market-chart-api.test.ts,market-chart-ui.test.tsx,perps.test.ts,perps-ui.test.tsx,wallet.test.ts,wallet-ssr.test.tsx,wallet-ui.test.tsx}` | Newly created untracked M04.6–M04.15 test suites (`114` total tests across `15` Vitest files in the latest recorded release verification, including tracker suites). |
| **Repository Documentation & Config Example** | `README.md`, `LICENSE`, `LICENSES.md`, `THIRD_PARTY_NOTICES.md`, `.env.example` *(non-code env template)* | Authored by/for `@MTheMoneyApe` to document M04.9/M04.10 scope cleanly. |

---

## 2. Third-Party Components & Auto-Generated Artifacts (Excluded from `@MTheMoneyApe` Ownership)

| Category | Exact Paths | Upstream License / Owner |
| --- | --- | --- |
| **`shadcn/ui` Component Primitives & Utilities** | `src/components/ui/*.tsx` (`46` files), `src/hooks/use-mobile.tsx`, `src/lib/utils.ts` | **MIT License** (`shadcn/ui`, built atop Radix UI MIT, Lucide ISC, class-variance-authority Apache-2.0). |
| **Auto-Generated Router Artifact** | `src/routeTree.gen.ts` | Generated build artifact by `@tanstack/router-plugin` (**MIT License**). |
| **Installed Package Tree (`node_modules/` & `bun.lock`)** | `node_modules/**`, `bun.lock` | Respective upstream licenses (`MIT`, `Apache-2.0` including `lightweight-charts@5.3.0` + `fancy-canvas@2.1.0` MIT, `ISC`, `BSD-*`, `MPL-2.0`, `CC-BY-4.0`, and **ConsenSys non-MIT SDK license** on transitive `@metamask/sdk*`). See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md). |

---

## 3. Mixed-Provenance Files (Shared Baseline + Original M04.6/M04.8 Edits)

These files originated in `4c3b15c` (`Lovable`) or `gpt-engineer-app[bot]` commits and subsequently received original `@MTheMoneyApe` NEAR/Perps/Oracle integrations (`e14cc9b` or local M04.6/M04.8 changes). **No proprietary header is stamped on these shared files:** `@MTheMoneyApe`'s rights are limited strictly to its original incremental modifications, while the pre-existing template/bot layers remain excluded / `UNRESOLVED`:

The M04.35 release-integration commit (`d450192`) also modified five files in this mixed-provenance group: `src/components/kit.tsx`, `src/components/module-page.tsx`, `src/components/trading.tsx`, `src/lib/demo/store.ts`, and `src/routes/__root.tsx`. Those files remain governed by this Section 3 classification: the release edits do not create a claim of ownership over the entire shared files or their earlier template/bot layers.

- `package.json`
- `src/routes/__root.tsx`, `src/routes/app.activity.tsx`, `src/routes/app.multichain.tsx`, `src/routes/app.perps.$market.tsx`, `src/routes/app.perps.index.tsx`, `src/routes/app.positions.tsx`, `src/routes/app.wallet.tsx`
- `src/components/coffee/overview.tsx`, `src/components/kit.tsx`, `src/components/module-page.tsx`, `src/components/shell.tsx`, `src/components/trading.tsx`
- `src/lib/demo/store.ts`
- `src/test/app-routing.test.tsx`

---

## 4. `UNRESOLVED — DO NOT CLAIM OWNERSHIP` (Excluded / Provenance Not Established)

Per licensing audit rules, files whose upstream license text, human authorship assignment, or asset generation rights could not be independently proven inside the repository are **excluded from `@MTheMoneyApe` proprietary ownership claims**:

| Subcategory | Exact Paths | Provenance Observation (`git log` & Binary Inspection) |
| --- | --- | --- |
| **Lovable TanStack Start Starter Scaffold (`4c3b15c`, no embedded root `LICENSE`)** | `.gitignore`, `.lovable/project.json`, `.prettierignore`, `.prettierrc`, `AGENTS.md`, `bunfig.toml`, `components.json`, `eslint.config.js`, `public/robots.txt`, `src/lib/{error-capture,error-page,lovable-error-reporting}.ts`, `src/router.tsx`, `src/routes/README.md`, `src/server.ts`, `src/start.ts`, `src/test/setup.ts`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts` | Committed in `4c3b15c` (`template: tanstack_start_ts_current-ad4cfae1bcd1`, author `Lovable <noreply@lovable.dev>`) with **no root `LICENSE` file**. Build plugin `@lovable.dev/vite-tanstack-config` is `MIT`; remaining template glue lacks embedded per-file copyright/license headers -> **`UNRESOLVED — DO NOT CLAIM OWNERSHIP`**. |
| **Lovable / `gpt-engineer-app[bot]` Unmodified Demo UI, Store & Routes (`a615298`..`d174402`)** | `.lovable/north-star/north-star.md`, `roadmap.md`, `src/lib/seo.ts`, `src/lib/demo/{calc,seed,types}.ts`, `src/components/coffee/{checkout,lots,simulations}.tsx`, `src/components/commerce.tsx`, `src/styles.css`, `src/test/coffee-demo.test.ts`, plus unmodified demo marketplace/portal `src/routes/*.tsx` (`index.tsx`, `admin*`, `app.{assets*,borrowing,coffee-passport,dashboard,docs,farming,governance*,index,lending,market-analytics,markets,portfolio,redeem,risk-center,roast,staking,swap,tokenization,treasury,vaults*,ventures*}`, `cart.tsx`, `checkout.tsx`, `discovery-boxes.tsx`, `market*`, `orders.tsx`, `roaster*`, `subscriptions.tsx`, `wholesale.tsx`) | Git commits authored under `gpt-engineer-app[bot]` without an upstream license declaration or written IP assignment document stored in the repo -> **`UNRESOLVED — DO NOT CLAIM OWNERSHIP`**. |
| **AI-Generated Image Assets with C2PA Provenance (`a615298`)** | `src/assets/coffee-bag.jpg`, `src/assets/hero-coffee.jpg`, `src/assets/origin-farm.jpg`, `src/assets/roastery.jpg` | Binary header inspection detects **C2PA** assertions (`OpenAI`, `http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia`, `trufo.ai` / `SSL.com C2PA`). Human copyrightability and commercial rights depend on external platform terms -> **`UNRESOLVED — DO NOT CLAIM OWNERSHIP`**. |
| **Undocumented Icon Asset (`4c3b15c`)** | `public/favicon.ico` | PNG-in-ICO binary (`20,373` bytes) from `4c3b15c` with no creator metadata -> **`UNRESOLVED — DO NOT CLAIM OWNERSHIP`**. |

---

## 5. Commercial Licensing Inquiries

Commercial use of any **Section 1** original `@MTheMoneyApe` materials requires a separate written agreement signed by **@MTheMoneyApe**. Rights to **Section 2** and **Section 4** materials must be obtained directly from their respective upstream owners or generators.
