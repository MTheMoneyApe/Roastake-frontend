// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { z } from "zod";
import { U128StringSchema } from "@/lib/oracle/types";

export const SignedIntStringSchema = z.string().regex(/^-?\d+$/, {
  message: "Expected signed decimal integer string.",
});

export const StoredMarketModeSchema = z.enum(["Normal", "ReduceOnly", "Paused", "Emergency"]);
export type StoredMarketMode = z.infer<typeof StoredMarketModeSchema>;

export const StoredPositionSideSchema = z.enum(["Long", "Short"]);
export type StoredPositionSide = z.infer<typeof StoredPositionSideSchema>;

export const StoredMarketRiskParamsSchema = z.object({
  max_leverage: z.number().int().positive(),
  initial_margin_bps: z.number().int().nonnegative(),
  maintenance_margin_bps: z.number().int().nonnegative(),
  trade_fee_bps: z.number().int().nonnegative(),
  liq_keeper_fee_bps: z.number().int().nonnegative(),
  liq_insurance_fee_bps: z.number().int().nonnegative(),
  max_utilization_bps: z.number().int().nonnegative(),
  matched_gap_buffer_bps: z.number().int().nonnegative(),
  max_hourly_funding_rate_e12: U128StringSchema,
  max_pnl_bps: z.number().int().positive().nullable().optional(),
});
export type StoredMarketRiskParams = z.infer<typeof StoredMarketRiskParamsSchema>;

export const StoredOraclePolicySchema = z.object({
  allow_testnet_sandbox: z.boolean(),
  max_execution_age_sec: z.number().int().nonnegative(),
  emergency_close_age_sec: z.number().int().nonnegative(),
  max_jump_bps: z.number().int().nonnegative(),
  max_clock_drift_sec: z.number().int().nonnegative(),
});
export type StoredOraclePolicy = z.infer<typeof StoredOraclePolicySchema>;

export const MarketViewSchema = z.object({
  market_id: z.string().min(1),
  unit: z.string().min(1),
  mode: StoredMarketModeSchema,
  paused_for_insolvency: z.boolean(),
  feed_classification: z.string().min(1),
  is_synthetic_testnet_sandbox: z.boolean(),
  sandbox_operator: z.string().nullable().optional(),
  sandbox_min_price_e8: U128StringSchema.nullable().optional(),
  sandbox_max_price_e8: U128StringSchema.nullable().optional(),
  sandbox_sequence: z.number().int().nonnegative().nullable().optional(),
  long_oi_e8: U128StringSchema,
  short_oi_e8: U128StringSchema,
  long_size_e8: U128StringSchema,
  short_size_e8: U128StringSchema,
  open_positions: z.number().int().nonnegative(),
  cum_funding_index_e12: SignedIntStringSchema,
  last_funding_sec: z.number().int().nonnegative(),
  last_valid_price_e8: U128StringSchema.nullable().optional(),
  last_valid_observed_sec: z.number().int().nonnegative().nullable().optional(),
  frozen_settlement_price_e8: U128StringSchema.nullable().optional(),
  frozen_funding_index_e12: SignedIntStringSchema.nullable().optional(),
  risk: StoredMarketRiskParamsSchema,
  oracle_policy: StoredOraclePolicySchema,
  exec_spread_bps: z.number().int().nonnegative(),
});
export type MarketView = z.infer<typeof MarketViewSchema>;
export const NullableMarketViewSchema = MarketViewSchema.nullable();

export const CollateralTokenViewSchema = z.object({
  token_id: z.string().min(1),
  symbol: z.string().min(1),
  decimals: z.number().int().nonnegative(),
  scale_to_usd_e8: U128StringSchema,
  active: z.boolean(),
  metadata_verified_on_chain: z.boolean(),
  tracked_balance_units: U128StringSchema,
  non_monetary_testnet_disclosure: z.string(),
});
export type CollateralTokenView = z.infer<typeof CollateralTokenViewSchema>;
export const NullableCollateralTokenViewSchema = CollateralTokenViewSchema.nullable();

export const PerpsAccountViewSchema = z.object({
  account_id: z.string().min(1),
  registered: z.boolean(),
  storage_paid_yocto: U128StringSchema,
  free_collateral_e8: U128StringSchema,
  withdrawable_token_units_at_scale_100: U128StringSchema,
  sub_micro_unit_residue_e8: U128StringSchema,
  lp_shares: U128StringSchema,
  pending_action_lock: z.boolean(),
  has_pending_withdrawal: z.boolean(),
});
export type PerpsAccountView = z.infer<typeof PerpsAccountViewSchema>;
export const NullablePerpsAccountViewSchema = PerpsAccountViewSchema.nullable();

export const LpSnapshotViewSchema = z.object({
  lp_vault_realized_equity_e8: U128StringSchema,
  lp_mtm_equity_e8: SignedIntStringSchema,
  reserved_liquidity_e8: U128StringSchema,
  lp_available_liquidity_e8: U128StringSchema,
  net_bounded_trader_claim_e8: SignedIntStringSchema,
  total_unrealized_bad_debt_e8: U128StringSchema,
  lp_total_shares: U128StringSchema,
  lp_locked_seed_shares: U128StringSchema,
  withdrawals_locked_for_emergency: z.boolean(),
});
export type LpSnapshotView = z.infer<typeof LpSnapshotViewSchema>;

export const PerpsAccountingSnapshotViewSchema = z.object({
  total_trader_free_collateral_e8: U128StringSchema,
  total_trader_locked_margin_e8: U128StringSchema,
  total_in_flight_withdrawals_e8: U128StringSchema,
  lp_vault_realized_equity_e8: U128StringSchema,
  insurance_fund_e8: U128StringSchema,
  protocol_fees_e8: U128StringSchema,
  tracked_collateral_e8: U128StringSchema,
  lp_total_shares: U128StringSchema,
  total_open_positions: z.number().int().nonnegative(),
  solvency_ok: z.boolean(),
  paused_global: z.boolean(),
});
export type PerpsAccountingSnapshotView = z.infer<typeof PerpsAccountingSnapshotViewSchema>;

export const PositionRecordViewSchema = z.object({
  id: z.number().int().nonnegative(),
  owner: z.string().min(1),
  market_id: z.string().min(1),
  side: StoredPositionSideSchema,
  size_e8: U128StringSchema,
  notional_e8: U128StringSchema,
  entry_price_e8: U128StringSchema,
  locked_margin_e8: U128StringSchema,
  entry_funding_index_e12: SignedIntStringSchema,
  opened_at_sec: z.number().int().nonnegative(),
  locked: z.boolean(),
});
export type PositionRecordView = z.infer<typeof PositionRecordViewSchema>;
export const PositionListSchema = z.array(PositionRecordViewSchema);

export const PositionHealthViewSchema = z.object({
  position: PositionRecordViewSchema,
  reference_price_e8: U128StringSchema,
  unrealized_pnl_e8: SignedIntStringSchema,
  capped_pnl_e8: SignedIntStringSchema,
  funding_net_e8: SignedIntStringSchema,
  equity_e8: SignedIntStringSchema,
  maintenance_margin_e8: U128StringSchema,
  margin_ratio_bps: z.number().int().nonnegative(),
  liquidatable_at_reference: z.boolean(),
  indicative_liquidation_price_e8: U128StringSchema.nullable().optional(),
});
export type PositionHealthView = z.infer<typeof PositionHealthViewSchema>;
export const NullablePositionHealthViewSchema = PositionHealthViewSchema.nullable();

export const StorageBalanceViewSchema = z.object({
  total: U128StringSchema,
  available: U128StringSchema,
});
export type StorageBalanceView = z.infer<typeof StorageBalanceViewSchema>;
export const NullableStorageBalanceViewSchema = StorageBalanceViewSchema.nullable();

export const FtMetadataSchema = z.object({
  spec: z.string(),
  name: z.string(),
  symbol: z.string(),
  icon: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  reference_hash: z.string().nullable().optional(),
  decimals: z.number().int().nonnegative(),
});
export type FtMetadata = z.infer<typeof FtMetadataSchema>;

export interface PositionWithHealth {
  record: PositionRecordView;
  health: PositionHealthView | null;
}

export interface PerpsProtocolSnapshot {
  network: "testnet";
  contractId: string;
  collateralTokenId: string;
  rpcEndpoint: string;
  blockHash: string;
  blockHeight?: number;
  blockTimestampSec: number;
  fetchedAtMs: number;
  admin: string;
  treasury: string;
  pausedGlobal: boolean;
  markets: string[];
  arabicaMarket: MarketView | null;
  robustaMarket?: MarketView | null;
  geshaMarket?: MarketView | null;
  marketStates?: Record<string, MarketView | null>;
  collateralConfig: CollateralTokenView | null;
  circleMetadata: FtMetadata | null;
  contractUsdcBalanceUnits: string;
  contractCircleStorage: StorageBalanceView | null;
  lpSnapshot: LpSnapshotView;
  accounting: PerpsAccountingSnapshotView;
  solvencyInvariant: boolean;
}

export interface PerpsTraderSnapshot {
  accountId: string;
  rpcEndpoint: string;
  blockHash: string;
  blockHeight?: number;
  fetchedAtMs: number;
  nearBalanceYocto: string | null;
  circleUsdcBalanceUnits: string;
  circleStorage: StorageBalanceView | null;
  isRegistered: boolean;
  perpsStorage: StorageBalanceView | null;
  account: PerpsAccountView | null;
  positions: PositionWithHealth[];
}

export type NearTxLifecyclePhase =
  | "idle"
  | "awaiting_wallet"
  | "signing"
  | "processing"
  | "finalizing"
  | "successful"
  | "failed"
  | "expired"
  | "unknown_verification_required";

export interface NearUserTxRecord {
  id: string;
  action: string;
  marketId?: string;
  token?: string;
  amountDisplay: string;
  signerId: string;
  receiverId: string;
  txHash?: string;
  explorerUrl?: string;
  phase: NearTxLifecyclePhase;
  detail: string;
  timestampIso: string;
}
