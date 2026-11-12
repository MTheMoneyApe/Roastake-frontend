// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.
//
// M04.18 — Coffee Assets on NEAR Testnet.
// Real, on-chain configuration for the three NEP-141 coffee tokens and their
// RHEA (Ref Finance) USDC pools. Every value below was verified against NEAR
// Testnet RPC and is also re-read live at runtime; nothing here is a quote.

export const NEAR_TESTNET = "testnet" as const;

/** RHEA (formerly Ref Finance) AMM exchange on NEAR Testnet. */
export const RHEA_EXCHANGE_ID = "ref-finance-101.testnet" as const;

/** Official Circle native NEAR Testnet USDC (NEP-141, 6 decimals). */
export const CIRCLE_USDC_ID =
  "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af" as const;

export const USDC_DECIMALS = 6 as const;
export const COFFEE_DECIMALS = 8 as const;

/** Ref Finance "simple pool" fee units: 1 unit = 0.01%, so 30 = 0.30%. */
export const RHEA_POOL_FEE_UNITS = 30 as const;
export const RHEA_POOL_FEE_PCT = RHEA_POOL_FEE_UNITS / 100;

/** 1 yoctoNEAR, required by ft_transfer_call and non-whitelisted swap tokens. */
export const ONE_YOCTO_NEAR = "1" as const;
export const GAS_SWAP = "100000000000000" as const; // 100 Tgas
export const GAS_STORAGE = "30000000000000" as const; // 30 Tgas
/** Our tokens use the minimum NEP-145 storage bound (0.00125 NEAR). */
export const COFFEE_STORAGE_DEPOSIT_YOCTO = "1250000000000000000000" as const;

/** A quote older than this must not be signed. */
export const QUOTE_MAX_AGE_MS = 20_000 as const;

export const BACKING_CLASSIFICATION = "SIMULATED_TESTNET_INVENTORY" as const;

export type CoffeeVariant = "ARABICA" | "ROBUSTA" | "GESHA";

export interface CoffeeAsset {
  readonly variant: CoffeeVariant;
  readonly symbol: "rARABICA" | "rROBUSTA" | "rGESHA";
  readonly name: string;
  /** Deployed NEP-141 contract account. */
  readonly tokenId: string;
  /** RHEA USDC pool id that pairs this token with Circle USDC. */
  readonly poolId: number;
  /** Synthetic Testnet reference price, USD per kilogram. */
  readonly referenceUsdPerKg: number;
  /** Demonstration supply cap, kilograms. */
  readonly supplyCapKg: number;
  /** Seed liquidity RHEA received, kilograms. */
  readonly seedKg: number;
  /** Seed liquidity RHEA received, USDC. */
  readonly seedUsdc: number;
}

export const COFFEE_ASSETS: readonly CoffeeAsset[] = [
  {
    variant: "ARABICA",
    symbol: "rARABICA",
    name: "Testnet Arabica",
    tokenId: "arabica.roastake-dev-mta.testnet",
    poolId: 2947,
    referenceUsdPerKg: 10,
    supplyCapKg: 10,
    seedKg: 0.1,
    seedUsdc: 1,
  },
  {
    variant: "ROBUSTA",
    symbol: "rROBUSTA",
    name: "Testnet Robusta",
    tokenId: "robusta.roastake-dev-mta.testnet",
    poolId: 2949,
    referenceUsdPerKg: 5,
    supplyCapKg: 20,
    seedKg: 0.2,
    seedUsdc: 1,
  },
  {
    variant: "GESHA",
    symbol: "rGESHA",
    name: "Testnet Gesha",
    tokenId: "gesha.roastake-dev-mta.testnet",
    poolId: 2950,
    referenceUsdPerKg: 25,
    supplyCapKg: 4,
    seedKg: 0.04,
    seedUsdc: 1,
  },
] as const;

export function getCoffeeAsset(symbol: string): CoffeeAsset | null {
  return COFFEE_ASSETS.find((asset) => asset.symbol === symbol) ?? null;
}

export function getCoffeeAssetByTokenId(tokenId: string): CoffeeAsset | null {
  return COFFEE_ASSETS.find((asset) => asset.tokenId === tokenId) ?? null;
}

/** The two supported directions of every Mini Swap route. */
export type SwapDirection = "usdc-to-coffee" | "coffee-to-usdc";

export interface SwapRoute {
  readonly direction: SwapDirection;
  readonly tokenIn: string;
  readonly tokenOut: string;
  readonly decimalsIn: number;
  readonly decimalsOut: number;
  readonly poolId: number;
}

export function buildSwapRoute(asset: CoffeeAsset, direction: SwapDirection): SwapRoute {
  const coffeeFirst = direction === "coffee-to-usdc";
  return {
    direction,
    tokenIn: coffeeFirst ? asset.tokenId : CIRCLE_USDC_ID,
    tokenOut: coffeeFirst ? CIRCLE_USDC_ID : asset.tokenId,
    decimalsIn: coffeeFirst ? COFFEE_DECIMALS : USDC_DECIMALS,
    decimalsOut: coffeeFirst ? USDC_DECIMALS : COFFEE_DECIMALS,
    poolId: asset.poolId,
  };
}

/** Ref Finance v1 simple-pool swap message, sent through the input token's ft_transfer_call. */
export interface RheaSwapAction {
  pool_id: number;
  token_in: string;
  token_out: string;
  amount_in: string;
  min_amount_out: string;
}

export interface RheaSwapMessage {
  force: 0;
  actions: RheaSwapAction[];
}

export function buildSwapMessage(action: RheaSwapAction): RheaSwapMessage {
  return { force: 0, actions: [action] };
}

export function buildFtTransferCallArgs(amountIn: bigint, message: RheaSwapMessage) {
  return {
    receiver_id: RHEA_EXCHANGE_ID,
    amount: amountIn.toString(),
    msg: JSON.stringify(message),
  };
}

export function explorerTxUrl(txHash: string): string {
  return `https://explorer.testnet.near.org/transactions/${encodeURIComponent(txHash)}`;
}

export function explorerAccountUrl(accountId: string): string {
  return `https://explorer.testnet.near.org/accounts/${encodeURIComponent(accountId)}`;
}
