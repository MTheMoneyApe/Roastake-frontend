# Wallet / Perps / RHEA / OutLayer final QA

## Scope and safety

Audited the current PR2 working tree on Reason Cloud. No secret was read, wallet controlled, message signed, transaction sent, access key added, or OutLayer job triggered. This is source inspection and mocked integration coverage, not proof of a live wallet round trip or deployed identity. No financial math, contract, backend, or shell behavior was changed.

## Real NEAR provider support

The application uses `@hot-labs/near-connect` 0.12.0, initialized browser-only with `network: "testnet"`, `features: { testnet: true }`, and no `addFunctionCallKey`. Providers are discovered at runtime; they are not a fixed application-maintained list.

The SDK's primary public manifest was retrieved during this audit:
https://raw.githubusercontent.com/hot-dao/near-selector/refs/heads/main/repository/manifest.json

The retrieved manifest advertises Testnet for Meteor Wallet, Intear Wallet, Ledger, Nightly Wallet, Wallet Connect, Unity Wallet, Ethereum Wallets, and NEAR CLI. These are manifest declarations, **not successful connection checks**. Browser/platform requirements can further constrain practical availability. The SDK also has a fallback manifest, which was not retrieved; future or fallback lists may differ.

In that primary manifest, HOT Wallet, MyNearWallet, OKX, Trezu, and Hana do not advertise `testnet: true`; NEAR Mobile explicitly advertises `testnet: false`. The SDK filters these out on Testnet. Do not present the HOT/Meteor fixture names in existing unit tests as evidence that HOT is currently supported in the real Testnet selector. `createHotNearConnectorAdapter` names the connector technology, not guaranteed HOT Wallet availability.

The application additionally requires named `.testnet` signer identities. Implicit NEAR account identities (including identities supplied by Ethereum-style adapters) are intentionally not accepted by the current UI policy, even when a connector advertises Testnet. Circle's configured implicit USDC contract is separately allowed as a receiver. Provider appearance alone does not prove its returned account is eligible for ROASTAKE signing.

## Proven and repaired lifecycle issues

1. A deferred connection promise and late `onSignIn` event could repopulate a connected identity after explicit disconnect. A regression test first failed with `connected` instead of `disconnected`. Session revision checks now discard stale connection/restore completions, suppress late sign-in after disconnect, and still permit a fresh explicit reconnect. Cleanup also invalidates outstanding operations.
2. A rejected adapter initialization was swallowed, leaving no actionable error. A regression test first failed because `near.error` remained null. The provider now exposes the rejected initialization error through the existing wallet error state. A late bootstrap result cannot overwrite a newer session.

Changes are confined to the NEAR lifecycle section of `src/lib/wallet/provider.tsx`, wallet regression tests, and this note. Existing network policy remains unchanged.

## Inspected transaction boundaries

- Wallet Hub connection is separate from demo-store balances and simulated network state. EVM chains are explicit supported testnets; an unsupported chain is shown rather than switched silently. Hyperliquid Core is read-only `/info`, separate from HyperEVM 998. Solana uses Wallet Standard Devnet identities.
- NEAR transaction forwarding checks connected status, named Testnet identity, and signer consistency. The real adapter checks connector Testnet, receiver policy, nonempty actions, active wallet account, and presence of a returned transaction hash. An account change/disconnect while signing is treated as an error rather than claimed success.
- Perps calls are review-gated; mocked tests cover registration, collateral deposit/withdrawal, stale-oracle/LP/mode gates, three market payloads, and operator identity gating. Receipt verification tests cover refunds, withdrawal callbacks, and unknown timeout outcomes without automatic resubmission.
- RHEA mini swap reads pool/token state, blocks missing-wallet and insufficient-balance cases, requires review, then separately displays signing, verifying, final result, or error state. Output token storage registration may be a separate transaction. No swap was performed during this audit.
- OutLayer Oracle screens read stored observations and disclose benchmark/synthetic provenance. They do not request wallet signing or auto-trigger a TEE job, and do not establish independent hardware-attestation verification. Perps execution prices are separate from the OutLayer benchmark view.

## Validation evidence

Targeted command:

```bash
npm test -- src/test/wallet.test.ts src/test/wallet-ui.test.tsx src/test/wallet-ssr.test.tsx src/test/perps.test.ts src/test/perps-ui.test.tsx src/test/coffee-mini-swap-ui.test.tsx src/test/oracle.test.ts src/test/oracle-ui.test.tsx
```

Original baseline: **passed**, 8 files / 55 tests. New reproduction command `npm test -- src/test/wallet.test.ts`: **failed before repair**, 2 new lifecycle assertions. After repair, wallet tests: **passed**, 12 tests (four added cases: stale connection/reconnect, stale restore, rejection/wrong network, initialization error). Final full targeted rerun: **passed**, 8 files / 59 tests. Targeted ESLint for the changed provider and wallet tests and `git diff --check`: **passed**. Repository-wide build/typecheck/full suite belong to the owning Session.

An existing React `act(...)` warning was observed in the Perps Judges Walkthrough test; it did not fail the targeted baseline. No screenshot was captured for the synthetic startup-error state; its error-state behavior is unit-tested, not browser visually verified here.

## Exact remaining gaps

- No real provider popup/redirect/mobile-return/hardware connection, rejection, account-switch event, persistence/restore, network switch, or disconnect was exercised. Current provider declarations are not end-to-end compatibility certification.
- The adapter itself tolerates failed manifest loading and failed existing-session lookup. Therefore the new provider-level initialization-error handler does **not** guarantee that every offline/manifest failure becomes an error banner; an empty provider list can still represent either unavailable discovery or no available providers.
- No live sign/send, wallet rejection during signing, chain receipt, token storage registration, Perps position, RHEA swap/refund, or transaction explorer link was exercised against Testnet. Transaction status coverage uses mocks. Do not call the system live-transaction verified on this evidence.
- If disconnect/account change occurs after broadcast but before wallet completion, the provider deliberately rejects the returned result; downstream UI may lack the known hash. Verify account activity in Testnet Explorer before retrying; no retry was attempted here.
- Live RPC availability, actual balances, contract deployments, current pool liquidity, external manifest freshness/fallback parity, and deployed frontend SHA are outside these mocked checks.
- No OutLayer job or TEE attestation was executed or independently verified.

## Wallet selector incident — inert provider cards

Reproduced on the existing PR Preview: header Wallet Hub → Connect NEAR Wallet → Meteor card. The selector is the real `@hot-labs/near-connect` 0.12.0 DOM, not an image or placeholder. Its `NearWalletsPopup` registers a click handler on `.connect-item[data-type="meteor-wallet"]` and appends the popup outside Radix DialogContent.

Before repair, `getComputedStyle(document.body).pointerEvents` and Meteor card pointer events were `none`. Hit-testing the card center (604, 112 in the desktop capture) returned the underlying Radix description, not Meteor. Touch could not select it. The parent modal's pointer lock/focus trap remained active. The standalone `/app/wallet` flow had `auto` pointer events and a Meteor hit; a real mouse click dismissed the chooser and created the provider sandbox iframe. No wallet was authenticated and no transaction was requested.

Repair: WalletHubDialog synchronously unmounts the Radix modal before invoking the NEAR selector or direct discovered-provider connection; it restores the hub after completion/cancellation so account/error state stays visible. No global CSS override, dependency, provider, network, header/profile, contract or financial logic changes. The standalone WalletHubPanels path is preserved.

Two regression cases (generic selector and direct Meteor handoff) failed before repair because Radix was still mounted. After repair, all 20 wallet/UI/SSR tests pass, including modal removal, pointer-lock release, click/touch-event compatibility activation and visible rejection after returning to the hub. Real browser click/touch hit-testing is separate evidence, not inferred from jsdom. TypeScript, build, scoped ESLint and diff check pass. Browser post-publication evidence and deployment identity are recorded in the PR follow-up; authenticated provider round-trip and physical Android/Brave remain unverified.

## Safe manual checks for Marco (no transaction required)

1. Use a dedicated named `.testnet` account and only non-monetary Testnet assets. Open Wallet Hub in the intended desktop and mobile browser. Confirm Testnet and demo-balance separation before connecting.
2. Select a provider actually offered by the live Testnet selector (Meteor or Intear are practical web candidates in the retrieved manifest). Cancel once and verify an understandable rejection with no connected identity; retry identity connection. Stop if asked to add a key or approve a transaction merely to connect.
3. Confirm the exact named account and Testnet label. Refresh once to check restore; disconnect and refresh again to check it stays disconnected. If a popup/redirect is pending, cancel it and verify no stale connected badge appears. Check one deliberate account change, then disconnect again. Never share seed phrases or private keys.
4. Visit Perps while disconnected and with only an EVM identity: NEAR remains required. With a named NEAR Testnet identity, inspect registration, collateral, freshness, and risk notices. Open a transaction review only; inspect target/method/amount, then cancel **before Confirm & Sign**. Keep operator controls unused.
5. Visit the RHEA swap route, inspect live pool/quote/error states, and open review only when eligible. Verify Testnet token identities, slippage and any storage-registration disclosure; cancel before signing. On an unavailable RPC, expect an error, not fabricated balances or prices.
6. Visit Oracle with the wallet disconnected. Refresh read-only observations, inspect stale/unavailable states and monthly/synthetic disclosures. Confirm that no wallet popup or OutLayer trigger occurs.
7. For pending/success/error receipt QA, use the automated fixtures first. A later human-owned live Testnet transaction pass is a separate check: record provider/version, frontend build, account, network, receiver, method, displayed amount, transaction hash, and final receipt. Do not infer success from the wallet popup closing; inspect finality and refunds. On unknown status, inspect Explorer before any retry.
