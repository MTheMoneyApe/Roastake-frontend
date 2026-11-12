# Third-Party Software, Frameworks, Assets & Notices (`Roastake-Frontend`)

Prepared for [`MTheMoneyApe/pixel-perfect-replica`](https://github.com/MTheMoneyApe/pixel-perfect-replica). Original NEAR/Oracle/Perps/Wallet modules identified in Section 1 of [`LICENSES.md`](./LICENSES.md) carry `Copyright © 2026 @MTheMoneyApe. All rights reserved.` under the **ROASTAKE EVALUATION-ONLY PROPRIETARY LICENSE v1.0**. All third-party frameworks, libraries, templates, icons, fonts, and media assets listed below remain under their respective upstream authors' ownership and license terms.

---

## 1. Direct NPM Dependencies (`package.json`)

| Ecosystem / Package | Version | Upstream License | Role |
| --- | --- | --- | --- |
| **NEAR Wallet Connect:** `@hot-labs/near-connect` | `0.12.0` | `MIT` | Primary NEAR Testnet wallet selector (Meteor Wallet / HOT Connect) |
| **TanStack Stack:** `@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/router-plugin`, `@tanstack/react-query` | `1.168.60`, `1.170.41`, `1.168.42`, `5.101.4` | `MIT` | File-based SSR router, build codegen (`src/routeTree.gen.ts`), query cache |
| **React:** `react`, `react-dom` | `19.2.8` | `MIT` | UI rendering runtime |
| **Vite & Styling:** `vite`, `@vitejs/plugin-react`, `vite-tsconfig-paths`, `tailwindcss`, `@tailwindcss/vite`, `tw-animate-css`, `nitro` | `8.1.5`, `5.2.0`, `6.1.1`, `4.3.3`, `3.0.260603-beta` (`nitro`), etc. | `MIT` | Build tooling, styling, and Nitro SSR adapter |
| **Lovable TanStack Config:** `@lovable.dev/vite-tanstack-config` | `2.26.5` | `MIT` | Vite/TanStack starter plugin configuration (`vite.config.ts`) |
| **Radix UI & `shadcn/ui` Stack:** `@radix-ui/react-*` (`26` packages), `cmdk`, `vaul`, `input-otp`, `embla-carousel-react`, `react-day-picker`, `react-resizable-panels`, `recharts`, `sonner`, `clsx`, `tailwind-merge`, `date-fns`, `react-hook-form`, `@hookform/resolvers`, `zod` | See `package.json` / `bun.lock` | `MIT` | Accessible UI primitives (`src/components/ui/*`), charts, forms, validation |
| **Financial Charting (`lightweight-charts` + transitive `fancy-canvas`)** | `5.3.0` / `2.1.0` | `Apache-2.0` (`lightweight-charts`) / `MIT` (`fancy-canvas`) | Verified on-chain oracle tick & trade marker visualization (`src/components/perps/market-chart.tsx`). See TradingView attribution notice below. |
| **`class-variance-authority`** | `0.7.1` | `Apache-2.0` | Class-variant styling utility used by `shadcn/ui` primitives |
| **Icons (`lucide-react`)** | `0.575.0` | `ISC` | Icon components used across the UI |
| **Optional Secondary Multichain Libraries:** `wagmi` (`2.19.5`), `viem` (`2.47.0`), `@solana/kit` (`8.6.0`), `@solana/react` (`8.6.0`), `@solana/wallet-standard-features` (`1.5.0`), `@wallet-standard/{app,features,react}` (`1.1.1`/`1.0.3`) | See above | `MIT` (`wagmi`/`viem`/`@solana/kit`/`react`), `Apache-2.0` (`wallet-standard*` & `@solana/wallet-standard-features`) | Secondary identity-only Devnet/Testnet EVM & Solana wallet connectors |
| **Testing & Tooling:** `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `eslint`, `@eslint/js`, `prettier`, `typescript-eslint`, `globals`, `@types/*`, `typescript` (`5.9.3`) | See `package.json` | `MIT` (`Apache-2.0` for `typescript`) | Test runner, DOM testing, linting, typechecking |

---

## 2. Notable Transitive Dependencies Requiring Explicit Notice

Across the resolved `node_modules` tree (`1,019` inspected package manifests), most transitive packages are `MIT` (`813`), `Apache-2.0` (`75`), `ISC` (`71`), `BSD-3-Clause` (`18`), `BSD-2-Clause` (`11`), `0BSD` (`9`), `Unlicense` (`1`), `BlueOak-1.0.0` (`2`: `minimatch`, `lru-cache`), and `Python-2.0` (`1`: `argparse`). **The following non-permissive or special-notice packages exist in the transitive dependency tree:**

1. **`@metamask/sdk` (`0.33.1`), `@metamask/sdk-communication-layer` (`0.33.1`), `@metamask/sdk-install-modal-web` (`0.32.1`), `@metamask/eth-json-rpc-provider` (`1.0.1`)** *(pulled transitively via `wagmi` / `@reown/appkit` connectors)*:
   - `package.json` omits a standard SPDX `license` field; included `LICENSE` files carry **ConsenSys Software Inc. custom restrictive/source-available terms (`Copyright ConsenSys Software Inc. 2022. All rights reserved.`)** prohibiting unauthorized distribution, modification, derivative works, or commercial extraction outside ConsenSys's granted SDK scope.
2. **TradingView Lightweight Charts™ Attribution & Notices (`lightweight-charts@5.3.0`):**
   - **Copyright / License:** `Copyright 2023 TradingView, Inc.` — **Apache License, Version 2.0** (`node_modules/lightweight-charts/LICENSE`).
   - **Embedded Component Notice (`node_modules/lightweight-charts/README.md`):** *"This software incorporates several parts of tslib (https://github.com/Microsoft/tslib, (c) Microsoft Corporation) that are covered by BSD Zero Clause License."*
   - **Mandatory Attribution Compliance:** Per TradingView's Apache-2.0 attribution terms, `ArabicaMarketChart` keeps `attributionLogo: true` enabled on `createChart(...)` AND displays a clickable link to `https://www.tradingview.com/` directly inside the chart interface (`src/components/perps/market-chart.tsx`). Transitive dependency `fancy-canvas@2.1.0` is licensed separately under the **MIT License**.
3. **File-Level Copyleft / Attribution Packages:**
   - `MPL-2.0` (`8` transitive package entries: `@ethereumjs/rlp@4.0.1`, `@ethereumjs/tx@4.2.0`, `@ethereumjs/util@8.1.0`, `lightningcss` `1.32.0`/`1.33.0`, `lightningcss-win32-x64-msvc` `1.32.0`/`1.33.0`, `webextension-polyfill@0.10.0`) — Mozilla Public License 2.0 obligations apply to modifications of those upstream MPL-2.0 files.
   - `CC-BY-4.0` (`1` transitive package: `caniuse-lite@1.0.30001806`) — Attribution requirement applies upstream.

---

## 3. UI Templates, Generated Files, External Fonts & Media Assets

- **Template Scaffold (`commit 4c3b15c`, `Lovable <noreply@lovable.dev>`):** Starter configuration (`tanstack_start_ts_current-ad4cfae1bcd1`), `src/components/ui/*.tsx` (`shadcn/ui` MIT primitives), `src/hooks/use-mobile.tsx`, `src/lib/utils.ts`, and `src/routeTree.gen.ts` (autogenerated by `@tanstack/router-plugin`, MIT).
- **External Google Fonts Stylesheet (`src/routes/__root.tsx`):** Loads `"DM Sans"`, `"Fraunces"`, and `"IBM Plex Mono"` directly from `https://fonts.googleapis.com` / `https://fonts.gstatic.com` at runtime (no font files bundled in this repository; subject to Google Fonts API terms and respective upstream font family licenses).
- **Media Assets in Repo (`UNRESOLVED — DO NOT CLAIM OWNERSHIP`):**
  - `src/assets/coffee-bag.jpg`, `src/assets/hero-coffee.jpg`, `src/assets/origin-farm.jpg`, `src/assets/roastery.jpg`: Binary files committed in `a615298` (`gpt-engineer-app[bot]`) containing embedded **C2PA** metadata (`OpenAI`, `trainedAlgorithmicMedia`, `trufo.ai` / `SSL.com`).
  - `public/favicon.ico`: Committed in `4c3b15c` (`Lovable`) without embedded authorship or license metadata.
- **External Network Protocols:** Queries `https://rpc.testnet.fastnear.com`, `https://rpc.testnet.near.org`, optional read-only local indexer API `http://127.0.0.1:8787` (`Roastake/services/perps-indexer`, zero browser credentials or direct FastNear NEAR Data calls), NEAR Testnet Explorer (`explorer.testnet.near.org`), `perps-v1.roastake-dev-mta.testnet`, `roastake-oracle-v1.testnet`, and Circle Native Testnet USDC (`3e2210e1...afcb8af`).
