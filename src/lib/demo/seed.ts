import type { DemoState, PerpMarket } from "./types";

const roasters: DemoState["roasters"] = [
  { id: "fern-copper", name: "Fern & Copper", city: "Paris", country: "France", founded: 2016, story: "A small-batch roastery in the 11th arrondissement roasting washed East African lots on a 1962 Probat.", zones: ["EU", "UK"], status: "Approved", rating: 4.9 },
  { id: "altura", name: "Altura Roasters", city: "Melbourne", country: "Australia", founded: 2012, story: "Direct-trade pioneers working with Huila and Nariño smallholders for over a decade.", zones: ["APAC", "US"], status: "Approved", rating: 4.8 },
  { id: "nordlys", name: "Nordlys Kaffe", city: "Oslo", country: "Norway", founded: 2018, story: "Nordic light roasts with transparent pricing published per lot.", zones: ["EU", "Nordics"], status: "Approved", rating: 4.7 },
  { id: "terra-cerrado", name: "Terra Cerrado", city: "São Paulo", country: "Brazil", founded: 2014, story: "Farm-owned roastery in Cerrado Mineiro bringing naturals straight from the patio.", zones: ["LATAM", "US", "EU"], status: "Approved", rating: 4.6 },
  { id: "kiln-kyoto", name: "Kiln Kyoto", city: "Kyoto", country: "Japan", founded: 2019, story: "Precision roasting inspired by tea ceremony, specialising in Ethiopian heirlooms.", zones: ["APAC"], status: "Approved", rating: 4.9 },
  { id: "brasswork", name: "Brasswork Coffee", city: "Portland", country: "USA", founded: 2021, story: "A new roaster applying for onboarding with anaerobic Kenyan lots.", zones: ["US"], status: "Pending", rating: 0 },
];

const P = (p: Partial<DemoState["products"][number]> & { id: string; name: string }) => ({
  roasterId: "fern-copper", origin: "Huila", country: "Colombia", farm: "Finca El Paraíso", producer: "Diego Bermúdez", altitude: "1,850 m",
  variety: "Caturra", process: "Washed", harvest: "2025", roastDate: "2026-10-28", roast: "Light" as const, notes: ["Red apple", "Panela", "Jasmine"],
  price: 16, sizes: [250, 500, 1000], stock: 120, format: "Whole bean" as const, status: "Live" as const, ...p,
});

const products: DemoState["products"] = [
  P({ id: "huila-paraiso", name: "El Paraíso Caturra", roasterId: "altura", featured: true, lotId: "RCT-COL-HUI-25A" }),
  P({ id: "yirgacheffe-kochere", name: "Kochere Heirloom", roasterId: "kiln-kyoto", origin: "Yirgacheffe", country: "Ethiopia", farm: "Kochere Station", producer: "Kochere Cooperative", altitude: "2,100 m", variety: "Heirloom", notes: ["Bergamot", "Peach", "Black tea"], price: 19, featured: true, lotId: "RCT-ETH-YIR-25B" }),
  P({ id: "nyeri-gatomboya", name: "Gatomboya AA", roasterId: "fern-copper", origin: "Nyeri", country: "Kenya", farm: "Gatomboya Factory", producer: "Barichu Society", altitude: "1,750 m", variety: "SL28 / SL34", notes: ["Blackcurrant", "Grapefruit", "Cane sugar"], price: 21, featured: true }),
  P({ id: "cerrado-natural", name: "Cerrado Natural", roasterId: "terra-cerrado", origin: "Cerrado Mineiro", country: "Brazil", farm: "Fazenda Santa Inês", producer: "Família Ottoni", altitude: "1,150 m", variety: "Yellow Bourbon", process: "Natural", roast: "Medium", notes: ["Milk chocolate", "Hazelnut", "Dried fig"], price: 13, featured: true }),
  P({ id: "narino-pink", name: "Nariño Pink Bourbon", roasterId: "altura", origin: "Nariño", country: "Colombia", farm: "La Esperanza", producer: "Ana Lucía Pantoja", altitude: "2,050 m", variety: "Pink Bourbon", process: "Honey", notes: ["Raspberry", "Rose", "Honey"], price: 24 }),
  P({ id: "guji-natural", name: "Guji Hambela Natural", roasterId: "nordlys", origin: "Guji", country: "Ethiopia", farm: "Hambela Estate", producer: "METAD", altitude: "2,200 m", variety: "Heirloom", process: "Natural", notes: ["Blueberry", "Strawberry jam", "Cacao nib"], price: 20 }),
  P({ id: "kirinyaga-peaberry", name: "Kirinyaga Peaberry", roasterId: "nordlys", origin: "Kirinyaga", country: "Kenya", farm: "Kii Factory", producer: "Rungeto FCS", altitude: "1,800 m", variety: "SL28", notes: ["Tomato", "Rhubarb", "Plum"], price: 22, stock: 14 }),
  P({ id: "mogiana-espresso", name: "Mogiana Espresso", roasterId: "terra-cerrado", origin: "Alta Mogiana", country: "Brazil", farm: "Fazenda Ambiental", producer: "Silvia Barretto", altitude: "1,100 m", variety: "Mundo Novo", process: "Pulped natural", roast: "Medium-Dark", notes: ["Dark chocolate", "Caramel", "Almond"], price: 12, format: "Ground" }),
  P({ id: "sidamo-washed", name: "Sidamo Bensa", roasterId: "kiln-kyoto", origin: "Sidamo", country: "Ethiopia", farm: "Bensa Station", producer: "Daye Bensa", altitude: "2,000 m", variety: "74158", notes: ["Lemongrass", "Apricot", "Honeysuckle"], price: 18 }),
  P({ id: "tolima-decaf", name: "Tolima Sugarcane Decaf", roasterId: "fern-copper", origin: "Tolima", country: "Colombia", farm: "Planadas Collective", producer: "ASOPEP", altitude: "1,700 m", variety: "Castillo", process: "EA decaf", roast: "Medium", notes: ["Toffee", "Orange", "Red grape"], price: 15, stock: 0 }),
  P({ id: "nordic-capsules", name: "Nordic Light Capsules", roasterId: "nordlys", origin: "Huila", country: "Colombia", variety: "Caturra", notes: ["Citrus", "Brown sugar"], price: 9, sizes: [10, 30], format: "Capsules" }),
  P({ id: "sul-minas-blend", name: "Sul de Minas House", roasterId: "terra-cerrado", origin: "Sul de Minas", country: "Brazil", farm: "Various", producer: "Minasul Coop", altitude: "1,200 m", variety: "Catuaí", process: "Natural", roast: "Dark", notes: ["Cocoa", "Molasses"], price: 11 }),
];

const lots: DemoState["lots"] = [
  { id: "GCT-COL-HUI-25A", kind: "GCT", name: "Huila El Paraíso Green", origin: "Huila", country: "Colombia", farm: "Finca El Paraíso", producer: "Diego Bermúdez", variety: "Caturra", process: "Washed", harvest: "2025", grade: "SCA 86.5 · Excelso EP", altitude: "1,850 m", physicalKg: 12000, supply: 10000, encumbered: 1800, reservedRedemption: 0, custodian: "Demo Custody AG (simulated)", warehouse: "Antwerp Bonded W-12", certificates: ["Phyto (demo)", "Q-grade (demo)"], price: 9.4, roastYield: 0.84, roasterId: "altura" },
  { id: "GCT-ETH-YIR-25B", kind: "GCT", name: "Yirgacheffe Kochere Green", origin: "Yirgacheffe", country: "Ethiopia", farm: "Kochere Station", producer: "Kochere Cooperative", variety: "Heirloom", process: "Washed", harvest: "2025", grade: "SCA 88 · G1", altitude: "2,100 m", physicalKg: 8000, supply: 7000, encumbered: 900, reservedRedemption: 0, custodian: "Demo Custody AG (simulated)", warehouse: "Hamburg Speicherstadt H-4", certificates: ["ECX (demo)", "Organic (demo)"], price: 11.2, roastYield: 0.83, roasterId: "kiln-kyoto" },
  { id: "GCT-KEN-NYE-25A", kind: "GCT", name: "Nyeri Gatomboya Green", origin: "Nyeri", country: "Kenya", farm: "Gatomboya Factory", producer: "Barichu Society", variety: "SL28/SL34", process: "Washed", harvest: "2025", grade: "SCA 87.5 · AA", altitude: "1,750 m", physicalKg: 6000, supply: 5000, encumbered: 500, reservedRedemption: 0, custodian: "Demo Logistics Trust (simulated)", warehouse: "Mombasa Port M-2", certificates: ["NCE auction (demo)"], price: 12.8, roastYield: 0.85, roasterId: "fern-copper" },
  { id: "GCT-BRA-CER-25C", kind: "GCT", name: "Cerrado Santa Inês Green", origin: "Cerrado Mineiro", country: "Brazil", farm: "Fazenda Santa Inês", producer: "Família Ottoni", variety: "Yellow Bourbon", process: "Natural", harvest: "2025", grade: "SCA 84 · NY2 17/18", altitude: "1,150 m", physicalKg: 20000, supply: 18000, encumbered: 3000, reservedRedemption: 0, custodian: "Demo Custody AG (simulated)", warehouse: "Santos Armazém S-7", certificates: ["Rainforest (demo)", "DO Cerrado (demo)"], price: 6.1, roastYield: 0.82, roasterId: "terra-cerrado" },
  { id: "RCT-COL-HUI-25A", kind: "RCT", name: "Huila El Paraíso Roasted", origin: "Huila", country: "Colombia", farm: "Finca El Paraíso", producer: "Diego Bermúdez", variety: "Caturra", process: "Washed", harvest: "2025", grade: "Light · Agtron 72", altitude: "1,850 m", physicalKg: 1400, supply: 1300, encumbered: 120, reservedRedemption: 20, custodian: "Altura Roasters (simulated)", warehouse: "Melbourne Roastery R-1", certificates: ["Roast log (demo)"], price: 18.5, parentLot: "GCT-COL-HUI-25A", roasterId: "altura" },
  { id: "RCT-ETH-YIR-25B", kind: "RCT", name: "Yirgacheffe Kochere Roasted", origin: "Yirgacheffe", country: "Ethiopia", farm: "Kochere Station", producer: "Kochere Cooperative", variety: "Heirloom", process: "Washed", harvest: "2025", grade: "Light · Agtron 75", altitude: "2,100 m", physicalKg: 900, supply: 850, encumbered: 60, reservedRedemption: 0, custodian: "Kiln Kyoto (simulated)", warehouse: "Kyoto Roastery K-1", certificates: ["Roast log (demo)"], price: 22.4, parentLot: "GCT-ETH-YIR-25B", roasterId: "kiln-kyoto" },
];

const vaults: DemoState["vaults"] = [
  { id: "gct-single", name: "Green Coffee Reserve", type: "Green Coffee Single Asset", asset: "GCT-COL-HUI-25A", share: "sGCT", tvl: 1_240_000, capacity: 2_000_000, apy: 4.2, lockDays: 0, risk: "Low", perfFee: 10, strategy: "Deposits are lent to verified roasters as pre-financing for green purchases. Repayments flow back as yield.", mix: { defi: 20, realEconomy: 70, incentives: 10 } },
  { id: "rct-single", name: "Roasted Coffee Reserve", type: "Roasted Coffee Single Asset", asset: "RCT-COL-HUI-25A", share: "sRCT", tvl: 410_000, capacity: 800_000, apy: 5.1, lockDays: 30, risk: "Medium", perfFee: 10, strategy: "Supplies roasted inventory liquidity to retail redemptions and wholesale settlement.", mix: { defi: 35, realEconomy: 55, incentives: 10 } },
  { id: "gct-lp", name: "GCT / USDC LP", type: "Green Coffee LP", asset: "USDC", share: "sGCT-LP", tvl: 2_870_000, capacity: 5_000_000, apy: 9.8, lockDays: 7, risk: "Medium", perfFee: 15, strategy: "Provides concentrated liquidity on GCT-COL/USDC; earns swap fees, auto-compounds.", mix: { defi: 70, realEconomy: 10, incentives: 20 } },
  { id: "rct-lp", name: "RCT / USDC LP", type: "Roasted Coffee LP", asset: "USDC", share: "sRCT-LP", tvl: 960_000, capacity: 1_500_000, apy: 11.4, lockDays: 14, risk: "High", perfFee: 15, strategy: "Liquidity for RCT/USDC pairs used by retail checkout and redemptions.", mix: { defi: 75, realEconomy: 5, incentives: 20 } },
  { id: "hybrid", name: "Harvest Hybrid Yield", type: "Hybrid Yield", asset: "USDC", share: "sHYB", tvl: 3_420_000, capacity: 3_500_000, apy: 7.6, lockDays: 90, risk: "Medium", perfFee: 12, strategy: "Splits capital between trade-finance notes for cooperatives and LP positions.", mix: { defi: 40, realEconomy: 50, incentives: 10 } },
];

const perpBase: [string, string, number][] = [
  ["COL-G", "Colombia Green Index", 9.4], ["KEN-G", "Kenya Green Index", 12.8], ["ETH-G", "Ethiopia Green Index", 11.2], ["BRA-G", "Brazil Green Index", 6.1],
  ["COL-R", "Colombia Roasted Index", 18.5], ["KEN-R", "Kenya Roasted Index", 24.1], ["ETH-R", "Ethiopia Roasted Index", 22.4], ["BRA-R", "Brazil Roasted Index", 12.3],
];
const perpMarkets: PerpMarket[] = perpBase.map(([id, name, base], i) => ({ id, name, base, vol: 1_200_000 + i * 310_000, oi: 640_000 + i * 120_000, funding: [0.0012, -0.0008, 0.0021, 0.0004, 0.0015, -0.0011, 0.0009, 0.0003][i] }));

export const seed = (): DemoState => ({
  version: 1,
  role: "User",
  account: "Demo Explorer",
  network: "base",
  tick: 0,
  roastFeePct: 2,
  balances: { USDC: 25000, USDT: 5000, ETH: 4.2, BTC: 0.15, SOL: 60, HYPE: 300, COFFEE: 12000, "GCT-COL-HUI-25A": 420, "GCT-ETH-YIR-25B": 180, "GCT-KEN-NYE-25A": 90, "GCT-BRA-CER-25C": 600, "RCT-COL-HUI-25A": 35, "RCT-ETH-YIR-25B": 12 },
  networks: [
    { id: "base", name: "Base", status: "Operational", gas: 0.04, color: "var(--chart-4)", canonical: true },
    { id: "arbitrum", name: "Arbitrum", status: "Operational", gas: 0.06, color: "var(--chart-1)" },
    { id: "ethereum", name: "Ethereum", status: "Operational", gas: 3.8, color: "var(--chart-3)" },
    { id: "solana", name: "Solana", status: "Degraded", gas: 0.002, color: "var(--chart-2)" },
    { id: "hyperevm", name: "HyperEVM", status: "Operational", gas: 0.01, color: "var(--chart-5)" },
  ],
  roasters, products, cart: [],
  orders: [
    { id: "ORD-1042", date: "2026-10-21", items: [{ productId: "yirgacheffe-kochere", qty: 2, size: 250, grind: "Whole bean" }], roasterId: "kiln-kyoto", total: 38, method: "Card (simulated)", status: "Delivered", customer: "Demo Explorer", tracking: "DEMO-TRK-88120" },
    { id: "ORD-1051", date: "2026-10-30", items: [{ productId: "nyeri-gatomboya", qty: 1, size: 500, grind: "Filter" }], roasterId: "fern-copper", total: 42, method: "USDC (simulated)", status: "Shipped", customer: "Demo Explorer", tracking: "DEMO-TRK-88341" },
    { id: "ORD-1055", date: "2026-11-02", items: [{ productId: "gatomboya", qty: 3, size: 250, grind: "Espresso" }].map((i) => ({ ...i, productId: "nyeri-gatomboya" })), roasterId: "fern-copper", total: 63, method: "Card (simulated)", status: "Paid", customer: "Léa Martin", tracking: "—" },
  ],
  subscriptions: [{ id: "SUB-01", productId: "huila-paraiso", every: "2 weeks", next: "2026-11-12", active: true }],
  lots,
  events: [
    { id: "EV-1", lotId: "GCT-COL-HUI-25A", type: "Mint", qty: 10000, date: "2026-03-14", note: "Initial tokenization after custody intake (simulated)" },
    { id: "EV-2", lotId: "GCT-COL-HUI-25A", type: "Audit", qty: 0, date: "2026-09-01", note: "Quarterly warehouse count: 12,000 kg (demo attestation)" },
    { id: "EV-3", lotId: "RCT-COL-HUI-25A", type: "Mint", qty: 1300, date: "2026-06-02", note: "Roast batch output minted (simulated)" },
    { id: "EV-4", lotId: "GCT-ETH-YIR-25B", type: "Mint", qty: 7000, date: "2026-04-20", note: "Initial tokenization (simulated)" },
    { id: "EV-5", lotId: "GCT-BRA-CER-25C", type: "Mint", qty: 18000, date: "2026-05-11", note: "Initial tokenization (simulated)" },
    { id: "EV-6", lotId: "GCT-KEN-NYE-25A", type: "Mint", qty: 5000, date: "2026-07-03", note: "Initial tokenization (simulated)" },
    { id: "EV-7", lotId: "RCT-ETH-YIR-25B", type: "Mint", qty: 850, date: "2026-08-19", note: "Roast batch output minted (simulated)" },
  ],
  conversions: [{ id: "CNV-001", date: "2026-09-12", gctLot: "GCT-COL-HUI-25A", rctLot: "RCT-COL-HUI-25A", inputKg: 50, outputKg: 42, lossKg: 8, feeKg: 0.84, netKg: 41.16 }],
  redemptions: [{ id: "RDM-007", date: "2026-10-25", lotId: "RCT-COL-HUI-25A", qty: 5, pack: 1000, grind: "Whole bean", country: "France", address: "12 Rue Oberkampf, Paris", fees: 14.5, status: "Shipped" }],
  vaults,
  vaultPositions: [{ vaultId: "gct-single", shares: 150, deposited: 150, rewards: 3.2 }, { vaultId: "hybrid", shares: 5000, deposited: 5000, rewards: 61.4 }],
  stakes: [{ id: "STK-1", asset: "COFFEE", amount: 3000, lockDays: 90, apr: 8, start: "2026-09-01", rewards: 41.2 }],
  pools: [
    { id: "gct-usdc", pair: ["GCT-COL-HUI-25A", "USDC"], tvl: 2_870_000, apr: 12.4, fee: 0.3 },
    { id: "rct-usdc", pair: ["RCT-COL-HUI-25A", "USDC"], tvl: 960_000, apr: 15.1, fee: 0.3 },
    { id: "coffee-usdc", pair: ["COFFEE", "USDC"], tvl: 4_100_000, apr: 18.7, fee: 0.3 },
    { id: "gct-eth-usdc", pair: ["GCT-ETH-YIR-25B", "USDC"], tvl: 1_310_000, apr: 13.2, fee: 0.3 },
  ],
  lpPositions: [{ poolId: "coffee-usdc", lp: 1200, rewards: 18.6 }],
  markets: [
    { id: "m-gct-col", collateral: "GCT-COL-HUI-25A", borrowAsset: "USDC", supplied: 2100, borrowed: 9200, supplyApy: 0.4, borrowApr: 6.8, cf: 0.6, lt: 0.72 },
    { id: "m-gct-eth", collateral: "GCT-ETH-YIR-25B", borrowAsset: "USDC", supplied: 1200, borrowed: 5100, supplyApy: 0.3, borrowApr: 7.2, cf: 0.55, lt: 0.68 },
    { id: "m-gct-bra", collateral: "GCT-BRA-CER-25C", borrowAsset: "USDC", supplied: 4300, borrowed: 11200, supplyApy: 0.5, borrowApr: 6.1, cf: 0.6, lt: 0.72 },
    { id: "m-rct-col", collateral: "RCT-COL-HUI-25A", borrowAsset: "USDC", supplied: 300, borrowed: 1900, supplyApy: 0.2, borrowApr: 8.4, cf: 0.45, lt: 0.6 },
    { id: "m-gct-ken", collateral: "GCT-KEN-NYE-25A", borrowAsset: "USDT", supplied: 700, borrowed: 3600, supplyApy: 0.3, borrowApr: 7.5, cf: 0.55, lt: 0.68, paused: true },
  ],
  loans: [{ marketId: "m-gct-bra", collateral: 400, debt: 900 }],
  perpMarkets,
  perpPositions: [{ id: "POS-1", market: "COL-G", side: "Long", size: 500, entry: 9.1, leverage: 3, margin: 1516.67, marginAsset: "USDC", mode: "Isolated", opened: "2026-10-29" }],
  perpOrders: [{ id: "PO-1", market: "COL-G", side: "Long", type: "Market", size: 500, price: 9.1, status: "Filled", date: "2026-10-29" }],
  proposals: [
    { id: "CIP-12", title: "Raise Roasting Lab protocol fee from 2% to 2.5%", author: "treasury.demo", category: "Fees", status: "Active", forV: 4_120_000, againstV: 2_870_000, abstainV: 310_000, quorum: 8_000_000, ends: "2026-11-09", body: "Proposes increasing the conversion fee to fund the custody risk reserve. Physical roast loss remains separate and unaffected.", comments: [{ who: "fern-copper.demo", text: "Supportive if the extra fee goes to reserve audits." }, { who: "anon-412", text: "2.5% feels high for small roasters." }] },
    { id: "CIP-11", title: "Onboard Solana as candidate network (demo)", author: "infra.demo", category: "Infrastructure", status: "Active", forV: 6_300_000, againstV: 900_000, abstainV: 120_000, quorum: 8_000_000, ends: "2026-11-07", body: "Adds Solana to the candidate network list with canonical supply remaining on Base.", comments: [] },
    { id: "CIP-10", title: "Allocate 250k USDC to Coffee Ventures grants pool", author: "ventures.demo", category: "Treasury", status: "Passed", forV: 9_100_000, againstV: 1_200_000, abstainV: 400_000, quorum: 8_000_000, ends: "2026-10-15", body: "Funds early-stage producer cooperatives.", comments: [] },
    { id: "CIP-09", title: "Increase RCT-COL lending collateral factor to 55%", author: "risk.demo", category: "Risk", status: "Rejected", forV: 2_400_000, againstV: 7_100_000, abstainV: 500_000, quorum: 8_000_000, ends: "2026-09-30", body: "Rejected due to roasted coffee shelf-life risk.", comments: [] },
  ],
  myVotes: {}, delegate: "self",
  ledger: [
    { id: "L-1", date: "2026-10-01", category: "Revenue", desc: "Illustrative model: marketplace commission (Oct)", amount: 48200, bucket: "Operating" },
    { id: "L-2", date: "2026-10-01", category: "Revenue", desc: "Illustrative model: tokenization & custody fees", amount: 21400, bucket: "Operating" },
    { id: "L-3", date: "2026-10-01", category: "Revenue", desc: "Illustrative model: swap & trading fees", amount: 63900, bucket: "Operating" },
    { id: "L-4", date: "2026-10-01", category: "Revenue", desc: "Illustrative model: vault performance fees", amount: 18700, bucket: "Operating" },
    { id: "L-5", date: "2026-10-01", category: "Revenue", desc: "Illustrative model: lending reserve factor", amount: 9100, bucket: "Operating" },
    { id: "L-6", date: "2026-10-03", category: "Expense", desc: "Custody audits (demo)", amount: -14200, bucket: "Operating" },
    { id: "L-7", date: "2026-10-05", category: "Expense", desc: "Engineering contributors", amount: -52000, bucket: "Development" },
    { id: "L-8", date: "2026-10-15", category: "Transfer", desc: "Coffee Ventures grants (CIP-10)", amount: -25000, bucket: "Ventures" },
  ],
  allocationPolicy: { "Risk reserve": 25, "Liquidity budget": 20, Development: 25, "Community grants": 15, "Coffee Ventures": 15 },
  ventures: [
    { id: "kochere-coop", name: "Kochere Washing Station Upgrade", category: "Producers / cooperatives", location: "Yirgacheffe, Ethiopia", model: "Cooperative wet mill serving 1,200 smallholders", team: ["Tesfaye A. — Chair", "Meron K. — QC"], thesis: "New eco-pulpers raise cup scores and reduce water use 60%.", target: 400000, raised: 262000, valuation: 2_000_000, risk: "Medium", stage: "Committee", revenue: 1_100_000, docs: ["Business plan (demo).pdf", "Cooperative statutes (demo).pdf"] },
    { id: "andes-dry", name: "Andes Solar Dryers", category: "Farms / agriculture", location: "Nariño, Colombia", model: "Leasing solar drying beds to farms", team: ["Camila R. — CEO"], thesis: "Controlled drying unlocks honey/natural premiums.", target: 250000, raised: 90000, valuation: 1_200_000, risk: "High", stage: "Due diligence", revenue: 180_000, docs: ["Pitch deck (demo).pdf"] },
    { id: "brasswork-v", name: "Brasswork Roastery Expansion", category: "Independent roasters", location: "Portland, USA", model: "Second 15kg roaster + wholesale", team: ["Jordan P. — Founder"], thesis: "Wholesale demand exceeds capacity 2×.", target: 180000, raised: 180000, valuation: 900_000, risk: "Medium", stage: "Funded", revenue: 640_000, docs: ["Financials (demo).xlsx"] },
    { id: "coldchain", name: "GreenLine Bonded Storage", category: "Logistics / storage", location: "Antwerp, Belgium", model: "Climate-controlled bonded warehousing", team: ["Pieter V. — COO"], thesis: "Custody partner capacity for tokenized lots.", target: 1_200_000, raised: 410000, valuation: 8_000_000, risk: "Low", stage: "Screening", revenue: 3_400_000, docs: ["Info memo (demo).pdf"] },
    { id: "brewbar", name: "Sage & Steam Cafés", category: "Retailers", location: "Lisbon, Portugal", model: "Specialty café chain, 4 locations", team: ["Inês F. — CEO"], thesis: "Proven unit economics, expanding to 8 sites.", target: 300000, raised: 300000, valuation: 2_400_000, risk: "Medium", stage: "Monitoring", revenue: 1_900_000, docs: ["Unit economics (demo).pdf"] },
    { id: "cuptrace", name: "CupTrace", category: "CoffeeTech / AgriTech", location: "Nairobi, Kenya", model: "SaaS traceability for washing stations", team: ["Wanjiru M. — CTO"], thesis: "Feeds lot data into Coffee Passports.", target: 500000, raised: 140000, valuation: 4_000_000, risk: "High", stage: "Due diligence", revenue: 220_000, docs: ["Product overview (demo).pdf"] },
  ],
  investments: [{ ventureId: "brewbar", amount: 2000, date: "2026-08-12" }],
  applications: [{ id: "APP-3", name: "Huehuetenango Women Growers", category: "Producers / cooperatives", ask: 150000, stage: "Screening", date: "2026-10-28" }],
  notifications: [
    { id: "N-1", text: "Order ORD-1051 shipped (simulated)", date: "2026-10-31", read: false },
    { id: "N-2", text: "CIP-12 voting ends in 5 days", date: "2026-11-03", read: false },
    { id: "N-3", text: "Hybrid vault rewards accrued: 61.4 USDC (illustrative)", date: "2026-11-01", read: true },
  ],
  txs: [
    { id: "TX-1", date: "2026-10-29", module: "Perps", action: "Open Long", detail: "500 COL-G @ 9.10, 3×", actor: "User" },
    { id: "TX-2", date: "2026-10-30", module: "Marketplace", action: "Order", detail: "ORD-1051 · 42 USDC", actor: "User" },
    { id: "TX-3", date: "2026-10-25", module: "Redemption", action: "Request", detail: "RDM-007 · 5 kg RCT-COL", actor: "User" },
  ],
  tokenizationRequests: [
    { id: "TKN-21", roasterId: "fern-copper", lotName: "Nyeri Gatomboya Roasted", kind: "RCT", kg: 400, status: "Custody check", date: "2026-10-27" },
    { id: "TKN-22", roasterId: "brasswork", lotName: "Kiambu Anaerobic Green", kind: "GCT", kg: 2500, status: "Submitted", date: "2026-11-01" },
  ],
  roastRecords: [
    { id: "RR-88", date: "2026-10-26", lot: "GCT-KEN-NYE-25A", greenKg: 60, roastedKg: 51, profile: "Light filter · 9:40 dev 1:20" },
    { id: "RR-89", date: "2026-10-28", lot: "GCT-COL-HUI-25A", greenKg: 45, roastedKg: 37.8, profile: "Omni · 10:15 dev 1:35" },
  ],
  bridgeTransfers: [{ id: "BR-1", asset: "USDC", amount: 2000, from: "base", to: "arbitrum", date: "2026-10-20", status: "Completed (simulated)" }],
  networkBalances: {},
  fees: { "Marketplace commission %": 8, "Tokenization fee %": 0.5, "Custody fee % / yr": 0.8, "Swap fee %": 0.3, "Vault performance fee %": 12, "Lending reserve factor %": 10, "Perps taker fee %": 0.05, "Redemption processing (USDC)": 6 },
});

/** Distribute balances across networks: canonical on Base with a wrapped share elsewhere; totals always equal the wallet balance. */
export function initNetworkBalances(s: DemoState) {
  const out: Record<string, Record<string, number>> = {};
  for (const [asset, amt] of Object.entries(s.balances)) {
    out[asset] = { base: +(amt * 0.7).toFixed(4), arbitrum: +(amt * 0.2).toFixed(4), ethereum: 0, solana: 0, hyperevm: 0 };
    out[asset].hyperevm = +(amt - out[asset].base - out[asset].arbitrum).toFixed(4);
  }
  return out;
}
