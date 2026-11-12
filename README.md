# ROASTAKE Frontend — NEAR Testnet Coffee Perpetuals Terminal

This repository (`MTheMoneyApe/Roastake-frontend`) is the **companion web frontend** for **ROASTAKE**, a commodity-finance platform built on **NEAR Protocol** starting with coffee perpetuals on NEAR Testnet.

> [!IMPORTANT]
> **Hackathon MVP Scope & Transparency (`Testnet Only`)**
> - **Primary Submission & Smart Contracts Repository:** https://github.com/MTheMoneyApe/Roastake (branch `hackathon-submission`)
> - **Track Alignment:** `defi` (*Unstoppable DeFi*, eligible Testnet-only under `Q-010` and `Q-011` of [`HACKATHON.md`](https://nearhackathon.com/HACKATHON.md)). Cross-chain NEAR Intents, Chain Signatures, and Mainnet settlement are **not** implemented or claimed.
> - **Live Testnet Markets (`3` Active):** `COFFEE-ARABICA-TESTNET/USD` (`$10.00/kg`, `M04.6-G`), `COFFEE-ROBUSTA-TESTNET/USD` (logical slug `COFFEE-ROBUSTA`, `$5.00/kg`, `M04.14`), and `COFFEE-GESHA-TESTNET/USD` (logical slug `COFFEE-GESHA`, `$25.00/kg`, `M04.15`) trading against [`perps-v1.roastake-dev-mta.testnet`](https://explorer.testnet.near.org/accounts/perps-v1.roastake-dev-mta.testnet) using Circle Native Testnet USDC (`no monetary value`) and independent per-market `TESTNET_SANDBOX_FEED` channels.
> - **Preview / Demo Separation:** Historical Spot Marketplace / DeFi / ecosystem pages remain clearly badged `DEMO` / `PREVIEW` prototypes. `roastake-oracle-v1.testnet` (OutLayer IMF monthly benchmark) is an independent read-only view (`ARABICA-MONTHLY-IMF/USD` live, `GESHA-DEMO/USD` unset `null`) and does **not** price live Perps execution today.

---

## 1. What This Interface Does

- **Three-Market Coffee Hub (`/app/perps`):** Presents all three live NEAR Testnet markets — `COFFEE-ARABICA-TESTNET/USD` (`$10.00/kg`), `COFFEE-ROBUSTA-TESTNET/USD` (`COFFEE-ROBUSTA`, `$5.00/kg`), and `COFFEE-GESHA-TESTNET/USD` (`COFFEE-GESHA`, `$25.00/kg`) with independent finalized RPC telemetry — alongside shared LP Vault capacity and `Solvency Invariant OK`.
- **Live Perpetual Terminals (`/app/perps/COFFEE-ARABICA-TESTNET-USD`, `/app/perps/COFFEE-ROBUSTA`, & `/app/perps/COFFEE-GESHA`):**
  - Pure `BigInt` (`10^8` / `10^6`) order math (`src/lib/perps/math.ts`) parameterized per active market (`arabica`, `robusta`, & `gesha`, including fractional `0.04 kg` preset on Gesha `$25.00/kg`) checking live `5x` max leverage, `20%` IM, `8%` MM, `10 bps` fee, `75%` LP utilization cap, and `300s` oracle freshness (`500 bps` circuit breaker).
  - Pre-flight Circle NEP-145 (`0.00125 NEAR`) & Perps (`0.05 NEAR`) storage checks, pre-sign confirmation modals, and non-retrying 8-state `EXPERIMENTAL_tx_status` receipt verification (`src/lib/perps/tx.ts`).
  - Role-gated, market-aware `TestnetOperatorControls`: visible strictly when connected as `roastake-dev-mta.testnet` and targeting the active route's on-chain `marketId`, hidden for regular trader wallets (`majorblog5570.testnet`).
  - **Verified On-Chain Oracle Chart & Multi-Market Indexer Client (`src/components/perps/market-chart.tsx`, `src/lib/perps/market-history-api.ts`, TradingView Lightweight Charts™ `5.3.0` Apache-2.0):** Connects per active market to the read-only local persistent indexer API (`VITE_PERPS_HISTORY_API_URL`, default `http://127.0.0.1:8787`, `/v1/perps/arabica/*`, `/v1/perps/robusta/*`, & `/v1/perps/gesha/*`, `5s` non-overlapping polling, market-scoped sequence deduplication) when running (`INDEXER CONNECTED` or `INDEXER DEGRADED`, explicit `PARTIAL COVERAGE` vs `CONTIGUOUS COVERAGE`, `FINALIZED BLOCK`, `INDEXER LAG`), falling back cleanly to verified RPC / contract snapshot / verified milestone seeds (`EXPERIMENTAL_tx_status` + `block` evidence for Arabica `M04.6-G`, verified seed ticks & executions for Gesha `M04.15`, and conservative contract snapshot fallback for Robusta without fabricating history) when offline. Explicitly marks `REFERENCE PRICE`, `ON-CHAIN ORACLE OBSERVATIONS`, `SYNTHETIC TESTNET DATA`, and `STALE (>300s)`, keeps TradingView attribution visible (`attributionLogo: true` + `tradingview.com` link), restricts candlesticks strictly to verified `ORACLE SAMPLE OHLC` intervals (`>= 6` non-empty buckets with multi-sample ticks), and preserves honest `Volume unavailable` reporting when close events omit executed size.
- **NEAR-First Wallet Hub (`/app/wallet`):** Powered by `@hot-labs/near-connect` `0.12.0` (Meteor Wallet / HOT Connect selector) locked fail-closed to `testnet` (rejecting `.near` Mainnet destinations and unapproved RPC hosts). Secondary EVM/Solana connections are identity-only (no fake bridging).
- **Isolated OutLayer Oracle Monitor (`/app/oracle`) & Activity Proof (`/app/activity`):** Reads historical `ARABICA-MONTHLY-IMF/USD` from `roastake-oracle-v1.testnet` cleanly separately from Perps, and lists verified Explorer transactions (`M04.6-G`, `M04.14`, & `M04.15`, `TxStatusPanel`).

---

## 2. Prerequisites & Setup

- **Node.js `>= 20.15.0`** and **`npm`** (or `bun`, matching `bun.lock` / `package.json`).
- **Optional `.env`:** Copy `.env.example` if configuring `VITE_WALLETCONNECT_PROJECT_ID` or overriding public local indexer URL `VITE_PERPS_HISTORY_API_URL=http://127.0.0.1:8787`. **Never put `FASTNEAR_API_KEY`, private keys, or secrets in any `VITE_*` variable; none are required to inspect or run NEAR Testnet Perps.**

```bash
git clone https://github.com/MTheMoneyApe/Roastake-frontend.git Roastake-Frontend
cd Roastake-Frontend
git checkout hackathon-submission
npm install
```

---

## 3. Verified Commands (Development, Testing & Production Build)

| Task | Command | Verified Result |
| --- | --- | --- |
| **Start Dev Server** | `npm run dev` | Serves app locally at `http://127.0.0.1:3000` (HTTP `200` verified across Perps, Positions, Activity, Wallet, Oracle routes) |
| **Run Test Suite** | `npm run test` *(Vitest `--run`)* | Vitest `v4.1.11`: **`15 passed (15)` files, `114 passed (114)` tests** (three-market math, RPC guards, isolated indexer HTTP client/partial-vs-contiguous coverage/fallback, verified market history & chart tests, UI flows, responsive shell, SSR) |
| **TypeScript Check** | `./node_modules/.bin/tsc --noEmit` *(or `bunx tsc --noEmit`)* | Exit `0` (`0` errors) |
| **ESLint Check** | `./node_modules/.bin/eslint src/lib/perps src/components/perps ... --rule "prettier/prettier: off"` | Exit `0` (`0` logic/TS errors on Perps/Oracle/Wallet modules; full repo `npm run lint` hits Windows CRLF `prettier/prettier` noise in starter files) |
| **Production Build** | `npm run build` | Vite + Nitro build passes cleanly (outputs `.output/`) |

---

## 4. Key Routes

| Route | Content & Maturity |
| --- | --- |
| `/` | Landing & product introduction (`PublicShell`) |
| `/app/perps` | Three-Market Coffee Hub (Arabica, Robusta & Gesha live Testnet + Judges Walkthrough) |
| `/app/perps/COFFEE-ARABICA-TESTNET-USD` | Live NEAR Testnet Arabica Terminal (`COFFEE-ARABICA-TESTNET/USD` on `perps-v1.roastake-dev-mta.testnet`) |
| `/app/perps/COFFEE-ROBUSTA` | Live NEAR Testnet Robusta Terminal (`COFFEE-ROBUSTA-TESTNET/USD` on `perps-v1.roastake-dev-mta.testnet`) |
| `/app/perps/COFFEE-GESHA` | Live NEAR Testnet Gesha Terminal (`COFFEE-GESHA-TESTNET/USD` on `perps-v1.roastake-dev-mta.testnet`) |
| `/app/positions` | Live NEAR Testnet open positions monitor across all active markets (`get_positions_by_owner` / `get_position_health`) + isolated simulated demo positions below |
| `/app/activity` | `TxStatusPanel` session receipts + `M04.6-G` / `M04.14` / `M04.15` Explorer links + isolated simulated demo activity |
| `/app/wallet` | Multichain Wallet Hub (NEAR Testnet primary via `@hot-labs/near-connect` / Meteor) |
| `/app/oracle` | Read-only `roastake-oracle-v1.testnet` IMF monthly benchmark monitor (`OutLayer` separate workstream) |

---

## 5. How to Verify Contract State & Live Testnet Evidence (`M04.6-G`, `M04.14` & `M04.15`)

Judges can verify live on-chain state **without Testnet funds or wallet signatures**:

1. **Contract & Solvency Check (Post-M04.15 Final State):** Query `https://rpc.testnet.fastnear.com` for `perps-v1.roastake-dev-mta.testnet` (`code_hash`: `GFVwdDtzy4BfxB4zXBhoX3ANfAaFLAyo7EuHAjq8mUsG`, Circle USDC: `3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af`). Call `verify_solvency_invariant()` -> `true`, `list_markets()` -> `["COFFEE-ARABICA-TESTNET/USD", "COFFEE-ROBUSTA-TESTNET/USD", "COFFEE-GESHA-TESTNET/USD"]`, `get_accounting_snapshot()` -> `tracked_collateral_e8 = "250400"` (`368 + 0 + 0 + 10032 + 80000 + 160000`), matching Circle `ft_balance_of` = `"2504"` (`0.002504 USDC`).
2. **Arabica M04.6-G Hybrid Cycle Proof (`COFFEE-ARABICA-TESTNET/USD`, `Admin CLI` + `Meteor majorblog5570.testnet`):**
   - **Oracle Tick #3 (`roastake-dev-mta.testnet`):** [`8KGqwWiHmFs2TQpDWWPEe8jRHWuBrfpjbe2EDBt47men`](https://explorer.testnet.near.org/transactions/8KGqwWiHmFs2TQpDWWPEe8jRHWuBrfpjbe2EDBt47men)
   - **LP Seed `2.000000 USDC` (`roastake-dev-mta.testnet`):** [`4b5cqULXF984ouYTUc5REX2vJbVKE3iYuTxAU1eZASd2`](https://explorer.testnet.near.org/transactions/4b5cqULXF984ouYTUc5REX2vJbVKE3iYuTxAU1eZASd2)
   - **Oracle Tick #4 (`roastake-dev-mta.testnet`):** [`BNzMzWmVUBpz8nvMNnHvJjajYsnMuDqbVTr7iyQqVqUZ`](https://explorer.testnet.near.org/transactions/BNzMzWmVUBpz8nvMNnHvJjajYsnMuDqbVTr7iyQqVqUZ)
   - **Open LONG #2 (`0.10 kg` @ `$10/kg`, `$1.00` notional, `$0.25` margin, `majorblog5570.testnet` Meteor):** [`CNgQkfrRpMrU8ywgzFaBdniPfivRDsgEnXcfoFX6gWAp`](https://explorer.testnet.near.org/transactions/CNgQkfrRpMrU8ywgzFaBdniPfivRDsgEnXcfoFX6gWAp)
   - **Oracle Tick #5 (`roastake-dev-mta.testnet`):** [`Jz7uJnm213s2qLNyBsnkwDPpkNYcuH255wFxPrFeemR`](https://explorer.testnet.near.org/transactions/Jz7uJnm213s2qLNyBsnkwDPpkNYcuH255wFxPrFeemR)
   - **Close Position #2 (`majorblog5570.testnet` Meteor):** [`2QWybbu1rwxC9in5y8cxAzXzH7PR1bbH6x5WKDJHREnC`](https://explorer.testnet.near.org/transactions/2QWybbu1rwxC9in5y8cxAzXzH7PR1bbH6x5WKDJHREnC)
   - **Trader Withdraw `0.997981 USDC` (`majorblog5570.testnet` Meteor):** [`DCAfqd5CSi2fk7ezsvo9J657yvX8M7NGEAqS6qvhZmFc`](https://explorer.testnet.near.org/transactions/DCAfqd5CSi2fk7ezsvo9J657yvX8M7NGEAqS6qvhZmFc)
   - **Admin Redeemable LP Withdraw `2.001417 USDC` (`roastake-dev-mta.testnet`, `10,000` seed shares retained):** [`2PJWPxDTP4zt8H5EfiaMd3Tu34aM21k4x7FjUpcR6nVP`](https://explorer.testnet.near.org/transactions/2PJWPxDTP4zt8H5EfiaMd3Tu34aM21k4x7FjUpcR6nVP)
3. **Robusta M04.14 Independent Multi-Market Proof (`COFFEE-ROBUSTA-TESTNET/USD`, `Admin CLI` + `Meteor majorblog5570.testnet`):**
   - **Register Robusta Market (`roastake-dev-mta.testnet`):** [`6yY3GdDY1fkTZcVXpizTv2r1eDsTLs8sHzsMV6rALaf6`](https://explorer.testnet.near.org/transactions/6yY3GdDY1fkTZcVXpizTv2r1eDsTLs8sHzsMV6rALaf6)
   - **Robusta Oracle Tick #1 (`$5.00/kg`, seq `1`):** [`99425WCWbxpGdbhZCUUfnCvPeyJurrmaYJacCneYPVj4`](https://explorer.testnet.near.org/transactions/99425WCWbxpGdbhZCUUfnCvPeyJurrmaYJacCneYPVj4)
   - **LP Seed `2.000000 USDC` (`199,680,511` shares minted):** [`Bjztjs2Knj1PTCZnq62aUK148iM5muusjK7bq5M1LZ1`](https://explorer.testnet.near.org/transactions/Bjztjs2Knj1PTCZnq62aUK148iM5muusjK7bq5M1LZ1)
   - **Robusta Oracle Tick #2 (`$5.00/kg`, seq `2`):** [`3VMnYs7AzyzUbVcdy4VH6QJAhWNyyqPf9rNUxF5xhvcH`](https://explorer.testnet.near.org/transactions/3VMnYs7AzyzUbVcdy4VH6QJAhWNyyqPf9rNUxF5xhvcH)
   - **Trader Collateral Deposit (`0.500000 USDC`, `majorblog5570.testnet` Meteor):** [`9MuxVRqtrhPsTXgNmiFdxeEdtQkK1KBWGvkvsGAUWfxm`](https://explorer.testnet.near.org/transactions/9MuxVRqtrhPsTXgNmiFdxeEdtQkK1KBWGvkvsGAUWfxm)
   - **Open LONG #3 (`0.20 kg` @ `$5.00/kg`, `$1.00` notional, `$0.25` margin, `majorblog5570.testnet` Meteor):** [`Dmd9uY1YmjVwR1mdBnzVQysjUjh8K6xNJi8mrHv9VJXw`](https://explorer.testnet.near.org/transactions/Dmd9uY1YmjVwR1mdBnzVQysjUjh8K6xNJi8mrHv9VJXw)
   - **Robusta Oracle Tick #3 (`$5.00/kg`, seq `3`):** [`2W1ZYFXrhHxH2DJgiS16cM2KMa3uWPysiKh9thQz2WNR`](https://explorer.testnet.near.org/transactions/2W1ZYFXrhHxH2DJgiS16cM2KMa3uWPysiKh9thQz2WNR)
   - **Close Position #3 (`majorblog5570.testnet` Meteor, PnL `$0`, fee `$0.001`, funding `-2666 e8`):** [`ACKxYjULWt5AunYdLpJWmi9bCKgB69SmrDoCruBiHJnP`](https://explorer.testnet.near.org/transactions/ACKxYjULWt5AunYdLpJWmi9bCKgB69SmrDoCruBiHJnP)
   - **Trader Withdraw `0.497974 USDC` (`majorblog5570.testnet` Meteor):** [`8S6CVXMp7TeyE9MqYSbAZxME4xcDUhWhcZcb4M8puXuz`](https://explorer.testnet.near.org/transactions/8S6CVXMp7TeyE9MqYSbAZxME4xcDUhWhcZcb4M8puXuz)
   - **Admin Redeemable LP Withdraw `2.001426 USDC` (`199,680,511` shares burned, `10,000` seed shares retained):** [`2DQ39iN2zg5iPZATt2ipvCNT2H6sjWodsiSR5Z6sQd6d`](https://explorer.testnet.near.org/transactions/2DQ39iN2zg5iPZATt2ipvCNT2H6sjWodsiSR5Z6sQd6d)
4. **Gesha M04.15 Independent Multi-Market Proof (`COFFEE-GESHA-TESTNET/USD`, `Admin CLI` + `Meteor majorblog5570.testnet`):**
   - **Register Gesha Market (`roastake-dev-mta.testnet`):** [`AAEy7eWTAyitTLpdg8Zew9F11a3wFd49zZDYXXFeWjjc`](https://explorer.testnet.near.org/transactions/AAEy7eWTAyitTLpdg8Zew9F11a3wFd49zZDYXXFeWjjc)
   - **Gesha Oracle Tick #1 (`$25.00/kg`, seq `1`):** [`8qz9deZxMYge5tXx19zSr9kkpNq7wSMd7Gh246yVHinb`](https://explorer.testnet.near.org/transactions/8qz9deZxMYge5tXx19zSr9kkpNq7wSMd7Gh246yVHinb)
   - **LP Seed `2.000000 USDC` (`199,521,149` shares minted):** [`FgfBypxTMvdM8k7DqEfZny5QhgkCMumwLvJtY6SC7KhU`](https://explorer.testnet.near.org/transactions/FgfBypxTMvdM8k7DqEfZny5QhgkCMumwLvJtY6SC7KhU)
   - **Gesha Oracle Tick #2 (`$25.00/kg`, seq `2`):** [`8jnhk3YuR24hZYAZk9hDj5qVjo1Va943VdBoGzrzp1FD`](https://explorer.testnet.near.org/transactions/8jnhk3YuR24hZYAZk9hDj5qVjo1Va943VdBoGzrzp1FD)
   - **Trader Collateral Deposit `0.500000 USDC` (`majorblog5570.testnet` Meteor):** verified on-chain at block `#277199273` (`Circle USDC 995955 -> 495955`, Perps `free_collateral_e8 29 -> 50000029`)
   - **Gesha Oracle Tick #3 (`$25.00/kg`, seq `3`):** [`7KizejXJqqVVPExRBgmrPMM5RkQ6Sr4NkRuA6QyGtQEW`](https://explorer.testnet.near.org/transactions/7KizejXJqqVVPExRBgmrPMM5RkQ6Sr4NkRuA6QyGtQEW)
   - **Open LONG #4 (`0.04 kg` @ `$25.00/kg`, `$1.00` notional, `$0.25` margin, `majorblog5570.testnet` Meteor):** [`A2cKFvi6YiL15EUjJXGejFbcuviEPmp8JRLCK5LmPwgh`](https://explorer.testnet.near.org/transactions/A2cKFvi6YiL15EUjJXGejFbcuviEPmp8JRLCK5LmPwgh)
   - **Gesha Oracle Tick #4 (`$25.00/kg`, seq `4`):** [`9CFB5JAUB94i2gr6oBgQhNfeP513bLvoKuZfsyuhY6ik`](https://explorer.testnet.near.org/transactions/9CFB5JAUB94i2gr6oBgQhNfeP513bLvoKuZfsyuhY6ik)
   - **Close Position #4 (`majorblog5570.testnet` Meteor, PnL `$0`, fee `$0.001`, funding `-2041 e8`):** [`JxF78YRwXUYwZwR6ZFo8QXXHxCv9sLD63yBTh3qNgKv`](https://explorer.testnet.near.org/transactions/JxF78YRwXUYwZwR6ZFo8QXXHxCv9sLD63yBTh3qNgKv)
   - **Trader Withdraw `0.497979 USDC` (`majorblog5570.testnet` Meteor, `settled`):** [`EmG7y5zqRJMcpVUhcj1d8kGS12dNwWmEpABqa5bM6WW2`](https://explorer.testnet.near.org/transactions/EmG7y5zqRJMcpVUhcj1d8kGS12dNwWmEpABqa5bM6WW2)
   - **Admin Redeemable LP Withdraw `2.001420 USDC` (`199,521,149` shares burned, `10,000` seed shares retained):** [`3ueUEtCNsLY4HG542HwYtgdvN3CHu74xsfpg6YKDRPD3`](https://explorer.testnet.near.org/transactions/3ueUEtCNsLY4HG542HwYtgdvN3CHu74xsfpg6YKDRPD3)
5. **Wallet-Gated Actions:** Depositing Testnet USDC, opening new positions (requires fresh `<= 300s` operator tick on the chosen market), closing open positions, and withdrawing require connecting a NEAR Testnet wallet holding Testnet NEAR + Testnet USDC from `https://faucet.circle.com/`.

---

## 6. Hackathon Timeline & Template / Baseline Disclosure

- **Backend Repository:** https://github.com/MTheMoneyApe/Roastake (public submission branch `hackathon-submission`; initial commit `0d130ff` on `2026-11-09`).
- **This Repository (`pixel-perfect-replica`):** Initial commit `4c3b15c` (`2026-11-02 13:30:43 +0000`) started from a **TanStack Start / Vite / Lovable React starter template** (`shadcn/ui`, Tailwind CSS, and simulated coffee demo modules `src/lib/demo/*`, `src/components/coffee/*`).
- **All NEAR Testnet infrastructure** (`src/lib/wallet/*`, `src/components/wallet/*`), OutLayer Oracle read-only dashboard (`src/lib/oracle/*`), multi-market Perpetuals terminals (`src/lib/perps/*`, `src/components/perps/*`, including indexer API client & chart modules `market-chart*.tsx` / `market-history*.ts`), and tests (`96/96`) were created inside the hackathon window (`2026-10-19`–`2026-11-14`).

---

## 7. Known Limitations

- **Synthetic Price Feeds:** All three live markets — `COFFEE-ARABICA-TESTNET/USD` (`$10.00/kg`), `COFFEE-ROBUSTA-TESTNET/USD` (`$5.00/kg`), and `COFFEE-GESHA-TESTNET/USD` (`$25.00/kg`) — use independent operator-controlled `TESTNET_SANDBOX_FEED` sequences (`300s` stale guard), not live spot market quotes.
- **Testnet Only & Unaudited:** No Mainnet deployments, no real-value collateral, and no third-party security audit yet.
- **Preview Modules:** Non-Perps ecosystem portals (Spot Marketplace, Procurement, Tokenization, Treasury) remain UI previews/demos only, and `GESHA-DEMO/USD` on `roastake-oracle-v1.testnet` remains unset (`null`).

---

## 8. Licensing & Provenance

**Copyright © 2026 @MTheMoneyApe. All rights reserved.** *(solely for the original ROASTAKE frontend modules identified in `LICENSES.md`)*  
**Licensor:** `@MTheMoneyApe`

- **Not an Open Source Release:** The original ROASTAKE NEAR Oracle, Perpetuals Terminal, NEAR-First Wallet Hub, and corresponding test/documentation modules authored by `@MTheMoneyApe` are available **exclusively for evaluation** under **[`LICENSE`](./LICENSE)** (**ROASTAKE EVALUATION-ONLY PROPRIETARY LICENSE v1.0**, `SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only`).
- **Commercial Restrictions:** Any commercial reuse, production deployment, hosted operation, or integration into another product requires a separate written agreement signed by **@MTheMoneyApe**.
- **Third-Party Components & Excluded Provenance:** UI primitives (`shadcn/ui`), `@hot-labs/near-connect`, TanStack, React, Tailwind CSS, Lucide icons, and transitive dependencies (including ConsenSys `@metamask/sdk*` notice terms and `MPL-2.0`/`CC-BY-4.0` components) remain under their respective licenses documented in **[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)**. Base template scaffolds (`4c3b15c`), unmodified bot-committed demo views, and C2PA AI-generated media assets whose provenance is unresolved are explicitly excluded from `@MTheMoneyApe` ownership in **[`LICENSES.md`](./LICENSES.md)**.
