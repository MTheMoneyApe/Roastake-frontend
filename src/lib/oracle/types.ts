import { z } from "zod";

/** Strict decimal string schema matching NEAR `near_sdk::json_types::U128` serialization. */
export const U128StringSchema = z
  .string()
  .regex(/^\d+$/, "Expected unsigned decimal integer string for U128 field");

export const MarketSecretsRefSchema = z.object({
  profile: z.string(),
  account_id: z.string(),
});

export const MarketConfigSchema = z.object({
  symbol: z.string(),
  description: z.string(),
  decimals: z.number().int().nonnegative(),
  unit: z.string(),
  min_price: U128StringSchema,
  max_price: U128StringSchema,
  max_price_age_sec: z.number().int().nonnegative(),
  max_divergence_bps: z.number().int().nonnegative(),
  wasm_url: z.string(),
  wasm_sha256: z.string(),
  build_target: z.string(),
  active: z.boolean(),
  worker_mode: z.string(),
  secrets_ref: MarketSecretsRefSchema.nullable(),
  min_source_count: z.number().int().nonnegative(),
  allow_synthetic: z.boolean(),
  max_source_spread_bps: z.number().int().nonnegative(),
});

export const PriceObservationSchema = z.object({
  market: z.string(),
  price: U128StringSchema,
  decimals: z.number().int().nonnegative(),
  unit: z.string(),
  source: z.string(),
  source_count: z.number().int().nonnegative(),
  observed_at_sec: z.number().int().nonnegative(),
  stored_at_sec: z.number().int().nonnegative(),
  nonce: z.number().int().nonnegative(),
  data_class: z.string(),
});

export const AccountingSnapshotSchema = z.object({
  account_balance: U128StringSchema,
  storage_usage_bytes: z.number().int().nonnegative(),
  storage_locked_balance: U128StringSchema,
  spendable_balance: U128StringSchema,
  minimum_operating_reserve: U128StringSchema,
  refund_reserve_balance: U128StringSchema,
  insurance_reserve_balance: U128StringSchema,
  insurance_in_flight_liability: U128StringSchema,
  insurance_return_pending_liability: U128StringSchema,
  insurance_unresolved_liability: U128StringSchema,
  insurance_enabled: z.boolean(),
  total_refund_liability: U128StringSchema,
  in_flight_liability: U128StringSchema,
  disputed_liability: U128StringSchema,
  backed_refund_liability: U128StringSchema,
  required_backing: U128StringSchema,
  encumbered_backing_floor: U128StringSchema,
  unallocated_surplus: U128StringSchema,
  invariant_holds: z.boolean(),
  pending_request_count: z.number().int().nonnegative(),
  unreconciled_failure_count: z.number().int().nonnegative(),
  active_refund_credit_count: z.number().int().nonnegative(),
  active_claim_count: z.number().int().nonnegative(),
  open_request_slots: z.number().int().nonnegative(),
  max_open_requests: z.number().int().nonnegative(),
  active_insurance_compensation_count: z.number().int().nonnegative(),
  max_active_insurance_compensations: z.number().int().nonnegative(),
  market_count: z.number().int().nonnegative(),
  authorized_requester_count: z.number().int().nonnegative(),
  next_claim_id: z.number().int().nonnegative(),
  next_compensation_id: z.number().int().nonnegative(),
});

export const MarketListSchema = z.array(z.string());
export const VerifySolvencySchema = z.boolean();
export const NextNonceSchema = z.number().int().nonnegative();
export const NullableMarketConfigSchema = MarketConfigSchema.nullable();
export const NullablePriceObservationSchema = PriceObservationSchema.nullable();

export type MarketSecretsRef = z.infer<typeof MarketSecretsRefSchema>;
export type MarketConfig = z.infer<typeof MarketConfigSchema>;
export type PriceObservation = z.infer<typeof PriceObservationSchema>;
export type AccountingSnapshot = z.infer<typeof AccountingSnapshotSchema>;

export interface MarketOracleState {
  symbol: string;
  config: MarketConfig | null;
  observation: PriceObservation | null;
}

export interface OracleDashboardSnapshot {
  network: "testnet";
  contractId: string;
  rpcEndpoint: string;
  blockHash: string;
  blockHeight?: number;
  fetchedAtMs: number;
  markets: string[];
  marketStates: Record<string, MarketOracleState>;
  solvencyInvariant: boolean;
  accounting: AccountingSnapshot;
  nextNonce: number;
}
