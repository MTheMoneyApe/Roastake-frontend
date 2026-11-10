export type Role = "User" | "Roaster" | "Admin" | "Treasury Manager";
export type TokenKind = "GCT" | "RCT";

export interface Network { id: string; name: string; status: "Operational" | "Degraded" | "Paused"; gas: number; color: string; canonical?: boolean }
export interface Roaster { id: string; name: string; city: string; country: string; founded: number; story: string; zones: string[]; status: "Approved" | "Pending" | "Suspended"; rating: number }
export interface Product {
  id: string; name: string; roasterId: string; origin: string; country: string; farm: string; producer: string;
  altitude: string; variety: string; process: string; harvest: string; roastDate: string; roast: "Light" | "Medium" | "Medium-Dark" | "Dark";
  notes: string[]; price: number; sizes: number[]; stock: number; format: "Whole bean" | "Ground" | "Capsules"; featured?: boolean; status: "Live" | "Draft" | "Flagged"; lotId?: string;
}
export interface CartItem { productId: string; qty: number; size: number; grind: string }
export type OrderStatus = "Paid" | "Roasting" | "Shipped" | "Delivered" | "Cancelled";
export interface Order { id: string; date: string; items: CartItem[]; roasterId: string; total: number; method: string; status: OrderStatus; customer: string; tracking: string }
export interface CoffeeLot {
  id: string; kind: TokenKind; name: string; origin: string; country: string; farm: string; producer: string; variety: string; process: string;
  harvest: string; grade: string; altitude: string; physicalKg: number; supply: number; encumbered: number; reservedRedemption: number;
  custodian: string; warehouse: string; certificates: string[]; price: number; roastYield?: number; parentLot?: string; roasterId: string; paused?: boolean;
}
export interface AssetEvent { id: string; lotId: string; type: "Mint" | "Burn" | "Transfer" | "Audit" | "Reconcile"; qty: number; date: string; note: string }
export interface Conversion { id: string; date: string; gctLot: string; rctLot: string; inputKg: number; outputKg: number; lossKg: number; feeKg: number; netKg: number }
export type RedemptionStatus = "Requested" | "Processing" | "Prepared" | "Shipped" | "Delivered";
export interface Redemption { id: string; date: string; lotId: string; qty: number; pack: number; grind: string; country: string; address: string; fees: number; status: RedemptionStatus }
export interface Vault {
  id: string; name: string; type: string; asset: string; share: string; tvl: number; capacity: number; apy: number; lockDays: number;
  risk: "Low" | "Medium" | "High"; perfFee: number; strategy: string; mix: { defi: number; realEconomy: number; incentives: number }; paused?: boolean;
}
export interface VaultPosition { vaultId: string; shares: number; deposited: number; rewards: number }
export interface StakePosition { id: string; asset: string; amount: number; lockDays: number; apr: number; start: string; rewards: number }
export interface Pool { id: string; pair: [string, string]; tvl: number; apr: number; fee: number }
export interface LPPosition { poolId: string; lp: number; rewards: number }
export interface LendingMarket { id: string; collateral: string; borrowAsset: string; supplied: number; borrowed: number; supplyApy: number; borrowApr: number; cf: number; lt: number; paused?: boolean }
export interface LoanPosition { marketId: string; collateral: number; debt: number }
export interface PerpMarket { id: string; name: string; base: number; vol: number; oi: number; funding: number; paused?: boolean }
export interface PerpPosition { id: string; market: string; side: "Long" | "Short"; size: number; entry: number; leverage: number; margin: number; marginAsset: string; mode: "Isolated" | "Cross"; opened: string }
export interface PerpOrder { id: string; market: string; side: "Long" | "Short"; type: "Market" | "Limit"; size: number; price: number; status: "Filled" | "Open" | "Cancelled" | "Closed" | "Liquidated"; pnl?: number; date: string; leverage?: number; marginAsset?: string; marginAmt?: number; mode?: "Isolated" | "Cross" }
export interface Proposal { id: string; title: string; author: string; category: string; status: "Active" | "Passed" | "Rejected" | "Pending"; forV: number; againstV: number; abstainV: number; quorum: number; ends: string; body: string; comments: { who: string; text: string }[] }
export interface LedgerEntry { id: string; date: string; category: string; desc: string; amount: number; bucket: string }
export interface Venture { id: string; name: string; category: string; location: string; model: string; team: string[]; thesis: string; target: number; raised: number; valuation: number; risk: "Low" | "Medium" | "High"; stage: "Screening" | "Due diligence" | "Committee" | "Funded" | "Monitoring"; revenue: number; docs: string[] }
export interface Investment { ventureId: string; amount: number; date: string }
export interface VentureApplication { id: string; name: string; category: string; ask: number; stage: "Submitted" | "Screening" | "Committee"; date: string }
export interface Notification { id: string; text: string; date: string; read: boolean }
export interface DemoTx { id: string; date: string; module: string; action: string; detail: string; actor: Role }
export interface TokenizationRequest { id: string; roasterId: string; lotName: string; kind: TokenKind; kg: number; status: "Submitted" | "Custody check" | "Approved" | "Rejected"; date: string }
export interface RoastRecord { id: string; date: string; lot: string; greenKg: number; roastedKg: number; profile: string }

export interface DemoState {
  version: number;
  role: Role;
  account: string;
  network: string;
  tick: number;
  roastFeePct: number;
  balances: Record<string, number>;
  networks: Network[];
  roasters: Roaster[];
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  subscriptions: { id: string; productId: string; every: string; next: string; active: boolean }[];
  lots: CoffeeLot[];
  events: AssetEvent[];
  conversions: Conversion[];
  redemptions: Redemption[];
  vaults: Vault[];
  vaultPositions: VaultPosition[];
  stakes: StakePosition[];
  pools: Pool[];
  lpPositions: LPPosition[];
  markets: LendingMarket[];
  loans: LoanPosition[];
  perpMarkets: PerpMarket[];
  perpPositions: PerpPosition[];
  perpOrders: PerpOrder[];
  proposals: Proposal[];
  myVotes: Record<string, "For" | "Against" | "Abstain">;
  delegate: string;
  ledger: LedgerEntry[];
  allocationPolicy: Record<string, number>;
  ventures: Venture[];
  investments: Investment[];
  applications: VentureApplication[];
  notifications: Notification[];
  txs: DemoTx[];
  tokenizationRequests: TokenizationRequest[];
  roastRecords: RoastRecord[];
  bridgeTransfers: { id: string; asset: string; amount: number; from: string; to: string; date: string; status: string }[];
  networkBalances: Record<string, Record<string, number>>;
  fees: Record<string, number>;
}
