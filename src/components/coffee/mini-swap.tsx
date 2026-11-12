// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.
//
// M04.18 — Live Coffee Mini Swap against the RHEA (Ref Finance) Testnet AMM.
// Quotes, reserves, balances and finality all come from NEAR Testnet RPC.
// The wallet signs a real ft_transfer_call; nothing here is a simulation.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWalletHub } from "@/lib/wallet/context";
import { useHydrated } from "@/components/shell";
import {
  BACKING_CLASSIFICATION,
  CIRCLE_USDC_ID,
  COFFEE_ASSETS,
  COFFEE_STORAGE_DEPOSIT_YOCTO,
  GAS_STORAGE,
  GAS_SWAP,
  ONE_YOCTO_NEAR,
  QUOTE_MAX_AGE_MS,
  RHEA_EXCHANGE_ID,
  RHEA_POOL_FEE_PCT,
  buildFtTransferCallArgs,
  buildSwapMessage,
  buildSwapRoute,
  explorerTxUrl,
  getCoffeeAsset,
  type CoffeeAsset,
  type SwapDirection,
} from "@/lib/coffee-assets/config";
import {
  SWAP_GATE_MESSAGES,
  computeSwapMath,
  evaluateSwapGate,
  formatTokenAmount,
  formatUsdc,
  parseTokenAmount,
  quoteDivergencePct,
} from "@/lib/coffee-assets/math";
import {
  fetchFtBalance,
  fetchOnChainQuote,
  fetchPoolSnapshot,
  fetchStorageBalance,
  verifySwapFinality,
  type PoolSnapshot,
  type SwapFinalityResult,
} from "@/lib/coffee-assets/rpc";

const QUOTE_DEBOUNCE_MS = 350;

type QuoteState = {
  amountOut: bigint;
  localAmountOut: bigint;
  amountIn: bigint;
  fetchedAt: number;
  diverges: boolean;
};

type TxState =
  | { phase: "idle" }
  | { phase: "signing" }
  | { phase: "verifying"; txHash: string }
  | { phase: "done"; txHash: string; result: SwapFinalityResult }
  | { phase: "error"; message: string; txHash?: string };

export function CoffeeMiniSwap() {
  const hydrated = useHydrated();
  const { near, sendNearTransaction, openHub } = useWalletHub();

  const [symbol, setSymbol] = useState<string>(COFFEE_ASSETS[0].symbol);
  const [direction, setDirection] = useState<SwapDirection>("usdc-to-coffee");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("1");
  const [pool, setPool] = useState<PoolSnapshot | null>(null);
  const [poolLoading, setPoolLoading] = useState(true);
  const [poolReadError, setPoolReadError] = useState<string | null>(null);
  const [walletReadLoading, setWalletReadLoading] = useState(false);
  const [walletReadError, setWalletReadError] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteState | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [balanceIn, setBalanceIn] = useState<bigint>(0n);
  const [balanceOut, setBalanceOut] = useState<bigint>(0n);
  const [outputRegistered, setOutputRegistered] = useState<boolean | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [tx, setTx] = useState<TxState>({ phase: "idle" });
  const [refreshKey, setRefreshKey] = useState(0);

  const asset = useMemo(() => getCoffeeAsset(symbol) ?? COFFEE_ASSETS[0], [symbol]);
  const route = useMemo(() => buildSwapRoute(asset, direction), [asset, direction]);
  const accountId = near.accountId;

  // Pool reserves (live). A failed RPC read is unknown, never an empty-pool verdict.
  useEffect(() => {
    let cancelled = false;
    setPoolLoading(true);
    setPool(null);
    setPoolReadError(null);
    fetchPoolSnapshot(asset.poolId)
      .then((snapshot) => {
        if (!cancelled) setPool(snapshot);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPool(null);
          setPoolReadError(error instanceof Error ? error.message : "Could not read the RHEA pool from Testnet.");
        }
      })
      .finally(() => {
        if (!cancelled) setPoolLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [asset.poolId, refreshKey]);

  // Wallet reads fail closed. A failed read is not a zero balance or missing registration.
  useEffect(() => {
    let cancelled = false;
    if (!accountId) {
      setBalanceIn(0n);
      setBalanceOut(0n);
      setOutputRegistered(null);
      setWalletReadLoading(false);
      setWalletReadError(null);
      return;
    }
    setWalletReadLoading(true);
    setWalletReadError(null);
    setOutputRegistered(null);
    Promise.all([
      fetchFtBalance({ tokenId: route.tokenIn, accountId }),
      fetchFtBalance({ tokenId: route.tokenOut, accountId }),
      fetchStorageBalance({ tokenId: route.tokenOut, accountId }),
    ])
      .then(([input, output, storage]) => {
        if (cancelled) return;
        setBalanceIn(input);
        setBalanceOut(output);
        setOutputRegistered(storage !== null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setBalanceIn(0n);
        setBalanceOut(0n);
        setOutputRegistered(null);
        setWalletReadError(error instanceof Error ? error.message : "Could not read wallet token state from Testnet.");
      })
      .finally(() => {
        if (!cancelled) setWalletReadLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, route.tokenIn, route.tokenOut, refreshKey]);

  const parsedAmount = useMemo(
    () => parseTokenAmount(amount, route.decimalsIn),
    [amount, route.decimalsIn],
  );

  // Debounced on-chain quote + local AMM math for cross-checking.
  const quoteRequestId = useRef(0);
  useEffect(() => {
    setQuote(null);
    setQuoteError(null);
    setReviewing(false);
    if (parsedAmount === null || poolLoading || poolReadError || !pool?.exists) return;

    const reserves = pool && pool.exists ? pool.amounts : [];
    const indexIn = pool ? pool.tokenIds.indexOf(route.tokenIn) : -1;
    const indexOut = pool ? pool.tokenIds.indexOf(route.tokenOut) : -1;
    const reserveIn = indexIn >= 0 && indexOut >= 0 ? reserves[indexIn] : 0n;
    const reserveOut = indexIn >= 0 && indexOut >= 0 ? reserves[indexOut] : 0n;

    const local = computeSwapMath({
      reserveIn,
      reserveOut,
      amountIn: parsedAmount,
      feeBps: 30,
      slippagePct: Number(slippage) || 0,
    });

    const requestId = ++quoteRequestId.current;
    const timer = setTimeout(() => {
      fetchOnChainQuote({
        poolId: route.poolId,
        tokenIn: route.tokenIn,
        tokenOut: route.tokenOut,
        amountIn: parsedAmount,
      }).then((onChain) => {
        if (quoteRequestId.current !== requestId) return;
        if (onChain === null) {
          setQuoteError("The exchange did not return a quote for this amount.");
          return;
        }
        const localOut = local?.amountOut ?? 0n;
        setQuote({
          amountOut: onChain,
          localAmountOut: localOut,
          amountIn: parsedAmount,
          fetchedAt: Date.now(),
          diverges: localOut > 0n && quoteDivergencePct(localOut, onChain) > 0.5,
        });
      });
    }, QUOTE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [parsedAmount, pool, poolLoading, poolReadError, route.poolId, route.tokenIn, route.tokenOut, slippage]);

  // A quote becomes stale on its own; re-render so the gate closes.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!quote) return;
    const timer = setInterval(() => forceTick((n) => n + 1), 1_000);
    return () => clearInterval(timer);
  }, [quote]);

  const quoteAgeMs = quote ? Date.now() - quote.fetchedAt : null;
  const slippagePct = Number(slippage);
  const math = useMemo(() => {
    if (!pool || !pool.exists || parsedAmount === null) return null;
    const indexIn = pool.tokenIds.indexOf(route.tokenIn);
    const indexOut = pool.tokenIds.indexOf(route.tokenOut);
    if (indexIn < 0 || indexOut < 0) return null;
    return computeSwapMath({
      reserveIn: pool.amounts[indexIn],
      reserveOut: pool.amounts[indexOut],
      amountIn: parsedAmount,
      feeBps: pool.totalFeeUnits,
      slippagePct,
    });
  }, [pool, parsedAmount, route.tokenIn, route.tokenOut, slippagePct]);

  const minAmountOut = useMemo(() => {
    if (!quote) return 0n;
    const basis = BigInt(Math.round((100 - Math.min(Math.max(slippagePct, 0), 100)) * 100));
    return (quote.amountOut * basis) / 10_000n;
  }, [quote, slippagePct]);

  const liveReserves = useMemo(() => {
    if (!pool || !pool.exists) return { reserveIn: 0n, reserveOut: 0n };
    const indexIn = pool.tokenIds.indexOf(route.tokenIn);
    const indexOut = pool.tokenIds.indexOf(route.tokenOut);
    if (indexIn < 0 || indexOut < 0) return { reserveIn: 0n, reserveOut: 0n };
    return { reserveIn: pool.amounts[indexIn], reserveOut: pool.amounts[indexOut] };
  }, [pool, route.tokenIn, route.tokenOut]);

  const gateReasons = evaluateSwapGate({
    walletConnected: Boolean(accountId),
    networkId: near.networkId,
    poolExists: Boolean(pool?.exists),
    poolLoading: poolLoading || Boolean(poolReadError),
    reserveIn: liveReserves.reserveIn,
    reserveOut: liveReserves.reserveOut,
    amountIn: parsedAmount,
    balanceIn: walletReadLoading || walletReadError ? (parsedAmount ?? 0n) : balanceIn,
    slippagePct: Number.isFinite(slippagePct) ? slippagePct : -1,
    quoteAgeMs,
    quoteAvailable: quote !== null,
    amountOut: quote?.amountOut ?? 0n,
    routeSupported: Boolean(asset),
  });

  const blocked =
    gateReasons.length > 0 ||
    poolLoading ||
    Boolean(poolReadError) ||
    walletReadLoading ||
    Boolean(walletReadError);
  const needsRegistration =
    accountId !== null && !walletReadLoading && !walletReadError && outputRegistered === false;

  const refresh = useCallback(() => {
    setQuote(null);
    setRefreshKey((key) => key + 1);
  }, []);

  const runSwap = useCallback(async () => {
    if (!accountId || !quote || blocked) return;
    setTx({ phase: "signing" });
    try {
      if (outputRegistered === false) {
        await sendNearTransaction({
          receiverId: route.tokenOut,
          signerId: accountId,
          actions: [
            {
              type: "FunctionCall",
              params: {
                methodName: "storage_deposit",
                args: { account_id: accountId, registration_only: true },
                gas: GAS_STORAGE,
                deposit: COFFEE_STORAGE_DEPOSIT_YOCTO,
              },
            },
          ],
        });
      }

      const message = buildSwapMessage({
        pool_id: route.poolId,
        token_in: route.tokenIn,
        token_out: route.tokenOut,
        amount_in: quote.amountIn.toString(),
        min_amount_out: minAmountOut.toString(),
      });

      const outcome = await sendNearTransaction({
        receiverId: route.tokenIn,
        signerId: accountId,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "ft_transfer_call",
              args: buildFtTransferCallArgs(quote.amountIn, message),
              gas: GAS_SWAP,
              deposit: ONE_YOCTO_NEAR,
            },
          },
        ],
      });

      setTx({ phase: "verifying", txHash: outcome.transactionHash });
      const result = await verifySwapFinality({
        txHash: outcome.transactionHash,
        signerId: accountId,
      });
      setTx({ phase: "done", txHash: outcome.transactionHash, result });
      setReviewing(false);
      setAmount("");
      refresh();
    } catch (err) {
      setTx({
        phase: "error",
        message: err instanceof Error ? err.message : "Wallet rejected or the transaction failed.",
      });
    }
  }, [
    accountId,
    blocked,
    minAmountOut,
    outputRegistered,
    quote,
    refresh,
    route.poolId,
    route.tokenIn,
    route.tokenOut,
    sendNearTransaction,
  ]);

  const inputSymbol = direction === "usdc-to-coffee" ? "USDC" : asset.symbol;
  const outputSymbol = direction === "usdc-to-coffee" ? asset.symbol : "USDC";
  const formatIn = (value: bigint) => formatTokenAmount(value, route.decimalsIn, 6);
  const formatOut = (value: bigint) => formatTokenAmount(value, route.decimalsOut, 6);

  const poolReserves = useMemo(() => {
    if (!pool || !pool.exists) return null;
    const coffeeIndex = pool.tokenIds.indexOf(asset.tokenId);
    const usdcIndex = pool.tokenIds.indexOf(CIRCLE_USDC_ID);
    if (coffeeIndex < 0 || usdcIndex < 0) return null;
    return {
      coffee: pool.amounts[coffeeIndex],
      usdc: pool.amounts[usdcIndex],
    };
  }, [pool, asset.tokenId]);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl">Live Mini Swap · RHEA Testnet</h2>
          <p className="text-sm text-muted-foreground">
            Real NEP-141 swaps on RHEA pools (NEAR Testnet). Prices, reserves, fees and finality
            read from chain.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,460px)_1fr]">
        <form
          className="space-y-4 rounded-lg border bg-card p-5"
          onSubmit={(event) => {
            event.preventDefault();
            setReviewing(true);
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="mini-swap-asset">Coffee asset</Label>
              <Select value={symbol} onValueChange={(value) => setSymbol(value)}>
                <SelectTrigger id="mini-swap-asset" aria-label="Coffee asset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COFFEE_ASSETS.map((candidate) => (
                    <SelectItem key={candidate.symbol} value={candidate.symbol}>
                      {candidate.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mini-swap-slippage">Slippage (%)</Label>
              <Input
                id="mini-swap-slippage"
                type="number"
                inputMode="decimal"
                min="0"
                max="10"
                step="0.1"
                value={slippage}
                onChange={(event) => setSlippage(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mini-swap-amount">Amount ({inputSymbol})</Label>
            <div className="flex gap-2">
              <Input
                id="mini-swap-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setTx({ phase: "idle" });
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setAmount(formatTokenAmount(balanceIn, route.decimalsIn, route.decimalsIn))
                }
                disabled={balanceIn <= 0n}
              >
                Max
              </Button>
            </div>
            <p className="num flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wallet className="size-3" />
              {accountId
                ? `Wallet: ${formatIn(balanceIn)} ${inputSymbol}`
                : "Connect your wallet to view your balance."}
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Reverse direction"
              onClick={() => {
                setDirection((current) =>
                  current === "usdc-to-coffee" ? "coffee-to-usdc" : "usdc-to-coffee",
                );
                setAmount("");
                setReviewing(false);
              }}
            >
              <ArrowDownUp />
            </Button>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">You receive (on-chain quote)</span>
              <span className="num font-medium">
                {quote ? `${formatOut(quote.amountOut)} ${outputSymbol}` : "—"}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Wallet balance</span>
              <span className="num">
                {accountId
                  ? `${formatOut(balanceOut)} ${outputSymbol}`
                  : "Connect your wallet to view your balance."}
              </span>
            </div>
          </div>

          {needsRegistration && (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              Your account is not registered on {asset.symbol}. Confirming will first send a NEP-145
              storage deposit (0.00125 NEAR), then the swap.
            </p>
          )}

          {quote && quote.diverges && (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              Local AMM math and the exchange quote differ by more than 0.5%. The signed minimum
              comes from the on-chain quote.
            </p>
          )}

          {poolReadError && (
            <p role="alert" className="text-xs text-loss">
              RHEA pool state could not be verified from NEAR Testnet RPC. Swaps are disabled; refresh
              to retry. This is not evidence that the pool is empty or missing.
            </p>
          )}
          {walletReadLoading && (
            <p className="text-xs text-muted-foreground">
              Verifying Testnet token balances and storage registration…
            </p>
          )}
          {walletReadError && (
            <p role="alert" className="text-xs text-loss">
              Wallet token state could not be verified from NEAR Testnet RPC. Swaps are disabled;
              no zero balance or missing registration is assumed.
            </p>
          )}
          {quoteError && <p className="text-xs text-loss">{quoteError}</p>}

          {!blocked && !reviewing && (
            <Button type="submit" className="w-full">
              Review transaction
            </Button>
          )}

          {!blocked && reviewing && (
            <div className="space-y-3 rounded-md border border-brass/50 bg-brass/10 p-3">
              <p className="font-mono text-[11px] uppercase tracking-wider text-warning-foreground">
                Review before signing
              </p>
              <dl className="space-y-1 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Contract</dt>
                  <dd className="num break-all text-right">{route.tokenIn}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Method</dt>
                  <dd className="num">ft_transfer_call → {RHEA_EXCHANGE_ID}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Pool</dt>
                  <dd className="num">{route.poolId}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Amount in</dt>
                  <dd className="num">
                    {formatIn(quote?.amountIn ?? 0n)} {inputSymbol}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Minimum out</dt>
                  <dd className="num">
                    {formatOut(minAmountOut)} {outputSymbol}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Attached deposit</dt>
                  <dd className="num">1 yoctoNEAR</dd>
                </div>
              </dl>
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="flex-1"
                  onClick={() => void runSwap()}
                  disabled={!hydrated}
                >
                  {tx.phase === "signing" ? <Loader2 className="animate-spin" /> : null}
                  Sign &amp; send swap
                </Button>
                <Button type="button" variant="outline" onClick={() => setReviewing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {blocked && (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {gateReasons.map((reason) => (
                <li key={reason} className="flex items-start gap-1.5">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                  {SWAP_GATE_MESSAGES[reason]}
                </li>
              ))}
            </ul>
          )}

          {!accountId && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => openHub("near")}
            >
              <Wallet /> Connect NEAR Testnet wallet
            </Button>
          )}
        </form>

        <div className="space-y-5">
          <div className="rounded-lg border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Live RHEA pool · {asset.symbol} / USDC
              </h3>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={refresh}
                aria-label="Refresh live pool data"
              >
                <RefreshCw className={poolLoading ? "animate-spin" : undefined} />
              </Button>
            </div>
            <dl className="divide-y text-sm">
              <Row label="Pool id" value={asset.poolId.toString()} />
              <Row
                label="Reserves"
                value={
                  poolReserves
                    ? `${formatTokenAmount(poolReserves.coffee, 8, 8)} ${asset.symbol} / ${formatUsdc(poolReserves.usdc)} USDC`
                    : poolLoading
                      ? "Loading…"
                      : poolReadError
                        ? "Unverified (RPC error)"
                        : "Unavailable"
                }
              />
              <Row label="Pool fee" value={`${RHEA_POOL_FEE_PCT.toFixed(2)}%`} />
              <Row
                label="Reference price"
                value={`$${asset.referenceUsdPerKg.toFixed(2)} / kg (synthetic Testnet reference)`}
              />
              <Row label="Price impact" value={math ? `${math.priceImpactPct.toFixed(3)}%` : "—"} />
              <Row
                label="Minimum received"
                value={quote ? `${formatOut(minAmountOut)} ${outputSymbol}` : "—"}
              />
              <Row
                label="Quote age"
                value={
                  quoteAgeMs === null
                    ? "—"
                    : `${(quoteAgeMs / 1000).toFixed(1)} s / ${QUOTE_MAX_AGE_MS / 1000} s`
                }
              />
              <Row
                label="Route"
                value={`${inputSymbol} → ${outputSymbol} · pool ${route.poolId}`}
              />
            </dl>
            <p className="mt-3 text-xs font-medium text-foreground">
              Backing classification:{" "}
              <span className="font-semibold">{BACKING_CLASSIFICATION}</span>. Tokens are not backed
              by verified physical inventory and physical redemption is disabled.
            </p>
          </div>

          {tx.phase !== "idle" && (
            <div className="rounded-lg border bg-card p-5 text-sm" role="status" aria-live="polite">
              <h3 className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Transaction
              </h3>
              {tx.phase === "signing" && (
                <p className="flex items-center gap-2">
                  <Loader2 className="animate-spin" /> Waiting for the wallet to sign…
                </p>
              )}
              {tx.phase === "verifying" && (
                <p className="flex items-center gap-2">
                  <Loader2 className="animate-spin" /> Verifying finality for {shortHash(tx.txHash)}
                  …
                </p>
              )}
              {tx.phase === "error" && <p className="text-loss">{tx.message}</p>}
              {tx.phase === "done" && (
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    {tx.result.verdict === "final_success" ? (
                      <CheckCircle2 className="text-gain" />
                    ) : (
                      <AlertTriangle className="text-loss" />
                    )}
                    {tx.result.verdict === "final_success"
                      ? "FINAL · every receipt succeeded"
                      : tx.result.verdict === "final_failure"
                        ? "FINAL · a receipt failed"
                        : "Included, not yet final"}
                  </p>
                  <p className="num break-all text-xs text-muted-foreground">{tx.txHash}</p>
                  {tx.result.swappedLogs.length > 0 && (
                    <p className="num text-xs text-muted-foreground">
                      {tx.result.swappedLogs.join(" · ")}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Receipts checked: {tx.result.receiptsChecked} · failed:{" "}
                    {tx.result.failedReceipts}
                  </p>
                  <a
                    className="inline-flex items-center gap-1 text-xs underline"
                    href={explorerTxUrl(tx.txHash)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open on NEAR Explorer <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
              {(tx.phase === "done" || tx.phase === "error") && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={refresh}
                >
                  Refresh balances
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="num break-all text-right">{value}</dd>
    </div>
  );
}

function shortHash(hash: string): string {
  return hash.length > 12 ? `${hash.slice(0, 8)}…${hash.slice(-4)}` : hash;
}

export type { CoffeeAsset };
