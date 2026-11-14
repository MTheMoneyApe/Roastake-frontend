// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createConfig, createStorage, noopStorage } from "wagmi";
import { custom } from "viem";
import { JudgesWalkthrough } from "@/components/perps/judges-walkthrough";
import { DegenModeProvider } from "@/hooks/useDegenMode";
import {
  ArabicaLiveMarketView,
  PerpsLiveMarketView,
  PreviewCoffeeMarketView,
  ThreeMarketPerpsIndex,
} from "@/components/perps/live-perps";
import { TooltipProvider } from "@/components/ui/tooltip";
import { demo, getDemo } from "@/lib/demo/store";
import {
  CIRCLE_TESTNET_USDC_ID,
  MARKET_ARABICA_PERPS_ID,
  MARKET_GESHA_PERPS_ID,
  MARKET_ROBUSTA_PERPS_ID,
  PERPS_CONTRACT_ID,
  THREE_MARKET_CATALOG,
  VERIFIED_TESTNET_CYCLE_PROOF,
  isAuthorizedOperatorAdmin,
} from "@/lib/perps/config";
import * as marketHistory from "@/lib/perps/market-history";
import * as perpsRpc from "@/lib/perps/rpc";
import { clearPerpsTxHistory } from "@/lib/perps/tx";
import type { PerpsProtocolSnapshot, PerpsTraderSnapshot } from "@/lib/perps/types";
import type { NearAdapterPort } from "@/lib/wallet/near";
import { WalletInfrastructureProvider } from "@/lib/wallet/provider";
import type { NearSignedTxOutcome, NearTransactionRequest } from "@/lib/wallet/types";
import { ROASTAKE_EVM_CHAINS } from "@/lib/wallet/wagmi";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    className,
  }: {
    to: string;
    params?: Record<string, string>;
    children: ReactNode;
    className?: string;
  }) => {
    const href = params
      ? Object.entries(params).reduce((acc, [k, v]) => acc.replace(`$${k}`, v), to)
      : to;
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  },
}));

function makeProtocol(overrides: Partial<PerpsProtocolSnapshot> = {}): PerpsProtocolSnapshot {
  return {
    network: "testnet",
    contractId: PERPS_CONTRACT_ID,
    collateralTokenId: CIRCLE_TESTNET_USDC_ID,
    rpcEndpoint: "https://rpc.testnet.fastnear.com",
    blockHash: "block-live-001",
    blockHeight: 222_333_444,
    blockTimestampSec: 1_794_350_050,
    fetchedAtMs: 1_794_350_050_000,
    admin: "roastake-dev-mta.testnet",
    treasury: "roastake-dev-mta.testnet",
    pausedGlobal: false,
    markets: [
      MARKET_ARABICA_PERPS_ID,
      "COFFEE-ROBUSTA-TESTNET/USD",
      MARKET_GESHA_PERPS_ID,
    ],
    arabicaMarket: {
      market_id: MARKET_ARABICA_PERPS_ID,
      unit: "USD/kg",
      mode: "Normal",
      paused_for_insolvency: false,
      feed_classification: "TESTNET_SANDBOX_FEED",
      is_synthetic_testnet_sandbox: true,
      sandbox_operator: "roastake-dev-mta.testnet",
      sandbox_min_price_e8: "100000000",
      sandbox_max_price_e8: "10000000000",
      sandbox_sequence: 2,
      long_oi_e8: "0",
      short_oi_e8: "0",
      long_size_e8: "0",
      short_size_e8: "0",
      open_positions: 0,
      cum_funding_index_e12: "0",
      last_funding_sec: 1_794_350_000,
      last_valid_price_e8: "1000000000",
      last_valid_observed_sec: 1_794_350_000,
      frozen_settlement_price_e8: null,
      frozen_funding_index_e12: null,
      risk: {
        max_leverage: 5,
        initial_margin_bps: 2000,
        maintenance_margin_bps: 800,
        trade_fee_bps: 10,
        liq_keeper_fee_bps: 50,
        liq_insurance_fee_bps: 50,
        max_utilization_bps: 7500,
        matched_gap_buffer_bps: 2500,
        max_hourly_funding_rate_e12: "500000000",
        max_pnl_bps: 10000,
      },
      oracle_policy: {
        allow_testnet_sandbox: true,
        max_execution_age_sec: 300,
        emergency_close_age_sec: 3600,
        max_jump_bps: 500,
        max_clock_drift_sec: 60,
      },
      exec_spread_bps: 0,
    },
    robustaMarket: {
      market_id: "COFFEE-ROBUSTA-TESTNET/USD",
      unit: "USD/kg",
      mode: "Normal",
      paused_for_insolvency: false,
      feed_classification: "TESTNET_SANDBOX_FEED",
      is_synthetic_testnet_sandbox: true,
      sandbox_operator: "roastake-dev-mta.testnet",
      sandbox_min_price_e8: "100000000",
      sandbox_max_price_e8: "50000000000",
      sandbox_sequence: 1,
      long_oi_e8: "0",
      short_oi_e8: "0",
      long_size_e8: "0",
      short_size_e8: "0",
      open_positions: 0,
      cum_funding_index_e12: "0",
      last_funding_sec: 1_794_350_000,
      last_valid_price_e8: "500000000",
      last_valid_observed_sec: 1_794_350_010,
      frozen_settlement_price_e8: null,
      frozen_funding_index_e12: null,
      risk: {
        max_leverage: 5,
        initial_margin_bps: 2000,
        maintenance_margin_bps: 800,
        trade_fee_bps: 10,
        liq_keeper_fee_bps: 50,
        liq_insurance_fee_bps: 50,
        max_utilization_bps: 7500,
        matched_gap_buffer_bps: 2500,
        max_hourly_funding_rate_e12: "500000000",
        max_pnl_bps: 10000,
      },
      oracle_policy: {
        allow_testnet_sandbox: true,
        max_execution_age_sec: 300,
        emergency_close_age_sec: 3600,
        max_jump_bps: 500,
        max_clock_drift_sec: 60,
      },
      exec_spread_bps: 0,
    },
    geshaMarket: {
      market_id: MARKET_GESHA_PERPS_ID,
      unit: "USD/kg",
      mode: "Normal",
      paused_for_insolvency: false,
      feed_classification: "TESTNET_SANDBOX_FEED",
      is_synthetic_testnet_sandbox: true,
      sandbox_operator: "roastake-dev-mta.testnet",
      sandbox_min_price_e8: "100000000",
      sandbox_max_price_e8: "50000000000",
      sandbox_sequence: 1,
      long_oi_e8: "0",
      short_oi_e8: "0",
      long_size_e8: "0",
      short_size_e8: "0",
      open_positions: 0,
      cum_funding_index_e12: "0",
      last_funding_sec: 1_794_350_000,
      last_valid_price_e8: "2500000000",
      last_valid_observed_sec: 1_794_350_015,
      frozen_settlement_price_e8: null,
      frozen_funding_index_e12: null,
      risk: {
        max_leverage: 5,
        initial_margin_bps: 2000,
        maintenance_margin_bps: 800,
        trade_fee_bps: 10,
        liq_keeper_fee_bps: 50,
        liq_insurance_fee_bps: 50,
        max_utilization_bps: 7500,
        matched_gap_buffer_bps: 2500,
        max_hourly_funding_rate_e12: "500000000",
        max_pnl_bps: 10000,
      },
      oracle_policy: {
        allow_testnet_sandbox: true,
        max_execution_age_sec: 300,
        emergency_close_age_sec: 3600,
        max_jump_bps: 500,
        max_clock_drift_sec: 60,
      },
      exec_spread_bps: 0,
    },
    collateralConfig: {
      token_id: CIRCLE_TESTNET_USDC_ID,
      symbol: "USDC",
      decimals: 6,
      scale_to_usd_e8: "100",
      active: true,
      metadata_verified_on_chain: true,
      tracked_balance_units: "100",
      non_monetary_testnet_disclosure: "Circle Native Testnet USDC (no monetary value).",
    },
    circleMetadata: { spec: "ft-1.0.0", name: "USD Coin", symbol: "USDC", decimals: 6 },
    contractUsdcBalanceUnits: "2001302",
    contractCircleStorage: { total: "1250000000000000000000", available: "0" },
    lpSnapshot: {
      lp_vault_realized_equity_e8: "1000000000",
      lp_mtm_equity_e8: "1000000000",
      reserved_liquidity_e8: "0",
      lp_available_liquidity_e8: "1000000000",
      net_bounded_trader_claim_e8: "0",
      total_unrealized_bad_debt_e8: "0",
      lp_total_shares: "1000000000",
      lp_locked_seed_shares: "10000",
      withdrawals_locked_for_emergency: false,
    },
    accounting: {
      total_trader_free_collateral_e8: "0",
      total_trader_locked_margin_e8: "0",
      total_in_flight_withdrawals_e8: "0",
      lp_vault_realized_equity_e8: "1000000000",
      insurance_fund_e8: "0",
      protocol_fees_e8: "0",
      tracked_collateral_e8: "1000000000",
      lp_total_shares: "1000000000",
      total_open_positions: 0,
      solvency_ok: true,
      paused_global: false,
    },
    solvencyInvariant: true,
    ...overrides,
  };
}

function makeTrader(overrides: Partial<PerpsTraderSnapshot> = {}): PerpsTraderSnapshot {
  return {
    accountId: "demo-roaster.testnet",
    rpcEndpoint: "https://rpc.testnet.fastnear.com",
    blockHash: "block-live-001",
    blockHeight: 222_333_444,
    fetchedAtMs: 1_794_350_050_000,
    nearBalanceYocto: "10000000000000000000000000",
    circleUsdcBalanceUnits: "12000000", // 12 USDC
    circleStorage: { total: "1250000000000000000000", available: "0" },
    isRegistered: true,
    perpsStorage: { total: "50000000000000000000000", available: "0" },
    account: {
      account_id: "demo-roaster.testnet",
      registered: true,
      storage_paid_yocto: "50000000000000000000000",
      free_collateral_e8: "500000000", // $5.00
      withdrawable_token_units_at_scale_100: "5000000",
      sub_micro_unit_residue_e8: "42",
      lp_shares: "0",
      pending_action_lock: false,
      has_pending_withdrawal: false,
    },
    positions: [],
    ...overrides,
  };
}

function renderPerpsUi(
  ui: ReactNode,
  opts: {
    accountId?: string;
    signAndSendTransaction?: NearAdapterPort["signAndSendTransaction"];
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wagmiConfig = createConfig({
    chains: ROASTAKE_EVM_CHAINS,
    connectors: [],
    transports: {
      11155111: custom({ request: async () => null }),
      84532: custom({ request: async () => null }),
      421614: custom({ request: async () => null }),
      998: custom({ request: async () => null }),
    },
    storage: createStorage({ storage: noopStorage }),
  });

  const nearFactory = (): NearAdapterPort => ({
    initialize: async () => ({
      wallets: [{ id: "meteor-wallet", name: "Meteor Wallet", supportsTestnet: true }],
      existing: opts.accountId
        ? {
            accountId: opts.accountId,
            providerId: "meteor-wallet",
            providerName: "Meteor Wallet",
            networkId: "testnet",
          }
        : null,
    }),
    connect: async () => ({
      accountId: opts.accountId ?? "demo-roaster.testnet",
      providerId: "meteor-wallet",
      providerName: "Meteor Wallet",
      networkId: "testnet",
    }),
    disconnect: async () => {},
    signAndSendTransaction: opts.signAndSendTransaction,
    dispose: () => {},
  });

  return render(
    <DegenModeProvider>
      <QueryClientProvider client={queryClient}>
        <WalletInfrastructureProvider wagmiConfig={wagmiConfig} nearAdapterFactory={nearFactory}>
          <TooltipProvider>{ui}</TooltipProvider>
        </WalletInfrastructureProvider>
      </QueryClientProvider>
    </DegenModeProvider>,
  );
}

describe("ROASTAKE Perpetuals UI, Three-Market Catalog & Transaction Flows", () => {
  beforeEach(() => {
    window.localStorage.clear();
    demo.reset();
    clearPerpsTxHistory();
    vi.restoreAllMocks();
    vi.spyOn(marketHistory, "fetchArabicaHistoryWithFallback").mockResolvedValue({
      network: "testnet",
      contractId: PERPS_CONTRACT_ID,
      marketId: MARKET_ARABICA_PERPS_ID,
      rpcEndpoint: "http://127.0.0.1:8787",
      referenceNowSec: 1_794_350_050,
      maxAgeSec: 300,
      fetchedAtMs: 1_794_350_050_000,
      sourceMode: "persistent_indexer",
      historyConnectionState: "indexer_connected",
      observations: [],
      tradeMarkers: [],
      latestObservation: null,
      latestAgeSec: null,
      isStale: false,
      rejectedCount: 0,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Three-Market Hub cleanly across live Arabica, Robusta & Gesha without fabricating metrics", async () => {
    vi.spyOn(perpsRpc, "fetchPerpsProtocolSnapshot").mockResolvedValue(makeProtocol());

    renderPerpsUi(<ThreeMarketPerpsIndex />);

    expect(await screen.findByText(/Coffee Index Perpetuals/i)).toBeInTheDocument();
    expect(screen.getByText("Arabica / USD")).toBeInTheDocument();
    expect(screen.getByText("Robusta / USD")).toBeInTheDocument();
    expect(screen.getByText("Gesha / USD")).toBeInTheDocument();
    expect(screen.getAllByText(/\$10\.000000\/kg/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/\$5\.000000\/kg/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/\$25\.000000\/kg/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/REGISTERED ON-CHAIN/i).length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByRole("button", { name: /Deposit LP/i })).toBeNull();
  });

  it("does not promote catalog entries to live markets when the on-chain registry is empty", async () => {
    vi.spyOn(perpsRpc, "fetchPerpsProtocolSnapshot").mockResolvedValue(
      makeProtocol({ markets: [], arabicaMarket: null, robustaMarket: null, geshaMarket: null, marketStates: {} }),
    );

    renderPerpsUi(<ThreeMarketPerpsIndex />);

    expect(await screen.findByText(/Three-Market Coffee Hub \(0\/3 Registered On-chain\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/NOT REGISTERED/i).length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText(/LIVE TESTNET/i)).toBeNull();
  });

  it("surfaces explicit RPC error panel when NEAR Testnet RPC fails and never fabricates on-chain risk defaults", async () => {
    vi.spyOn(perpsRpc, "fetchPerpsProtocolSnapshot").mockRejectedValue(
      new Error("All configured NEAR Testnet RPC endpoints failed."),
    );

    renderPerpsUi(<ThreeMarketPerpsIndex />);

    expect(
      await screen.findByText(/NEAR Testnet RPC Unavailable/i, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry RPC/i })).toBeInTheDocument();
    expect(screen.getAllByText(/UNVERIFIED/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/LIVE TESTNET/i)).toBeNull();
    expect(screen.queryByText(/4x · 25\.00% · 12\.50%/i)).toBeNull();

    // Verify M04.6-G proof tab exposes all 8 Explorer-linked transactions
    expect(VERIFIED_TESTNET_CYCLE_PROOF).toHaveLength(8);
    const proofTab = screen.getByRole("tab", { name: /M04\.6-G Proof \(8\)/i });
    fireEvent.click(proofTab);
    expect(await screen.findByText(/CNgQkfrRpM\.\.\./i)).toBeInTheDocument();
    expect(screen.getByText(/2PJWPxDTP4\.\.\./i)).toBeInTheDocument();
  });

  it("prompts account registration (0.05 NEAR) before deposit and leaves DemoState isolated", async () => {
    const initialDemoNetwork = getDemo().network;
    const protocol = makeProtocol();
    const traderUnregistered = makeTrader({
      isRegistered: false,
      perpsStorage: null,
      account: null,
    });

    vi.spyOn(perpsRpc, "fetchPerpsProtocolSnapshot").mockResolvedValue(protocol);
    vi.spyOn(perpsRpc, "fetchPerpsTraderSnapshot").mockResolvedValue(traderUnregistered);
    const verifySpy = vi.spyOn(perpsRpc, "verifyNearTransactionFinality").mockResolvedValue({
      verdict: "successful",
      detail: "Account registered via 0.05 NEAR.",
      events: [],
    });
    const signSpy = vi.fn(
      async (_request: NearTransactionRequest): Promise<NearSignedTxOutcome> => ({
        transactionHash: "RegisterTxHash001",
        signerId: "demo-roaster.testnet",
        receiverId: PERPS_CONTRACT_ID,
        rawOutcome: {},
      }),
    );

    renderPerpsUi(<ArabicaLiveMarketView />, {
      accountId: "demo-roaster.testnet",
      signAndSendTransaction: signSpy,
    });

    const regBtn = await screen.findByRole("button", { name: /Register Account \(0\.05 NEAR\)/i });
    fireEvent.click(regBtn);

    // Pre-sign confirmation dialog appears
    expect(await screen.findByRole("dialog")).toHaveTextContent(/Register Trader Account/i);
    fireEvent.click(screen.getByRole("button", { name: /Confirm & Sign in Wallet \(0\.05 NEAR\)/i }));

    await waitFor(() => expect(signSpy).toHaveBeenCalledTimes(1));
    expect(signSpy.mock.calls[0]?.[0]?.actions[0]?.params.deposit).toBe("50000000000000000000000");
    expect(verifySpy).toHaveBeenCalledTimes(1);
    expect(getDemo().network).toBe(initialDemoNetwork);
  });

  it("submits registered ft_transfer_call deposit (trader_collateral) & warns on missing Circle storage during withdraw", async () => {
    const protocol = makeProtocol();
    const registeredNoCircleStorage = makeTrader({
      circleStorage: null,
    });

    vi.spyOn(perpsRpc, "fetchPerpsProtocolSnapshot").mockResolvedValue(protocol);
    vi.spyOn(perpsRpc, "fetchPerpsTraderSnapshot").mockResolvedValue(registeredNoCircleStorage);
    const verifySpy = vi.spyOn(perpsRpc, "verifyNearTransactionFinality").mockResolvedValue({
      verdict: "successful",
      detail: "Circle USDC collateral deposit verified on Perpetuals contract.",
      events: [],
    });
    const signSpy = vi.fn(
      async (_request: NearTransactionRequest): Promise<NearSignedTxOutcome> => ({
        transactionHash: "DepositTxHash002",
        signerId: "demo-roaster.testnet",
        receiverId: _request.receiverId,
        rawOutcome: {},
      }),
    );

    renderPerpsUi(<ArabicaLiveMarketView />, {
      accountId: "demo-roaster.testnet",
      signAndSendTransaction: signSpy,
    });

    expect(await screen.findByText(/^12\.000000 USDC$/i)).toBeInTheDocument();
    const depositInput = screen.getByLabelText(/Deposit Amount \(Circle Testnet USDC\)/i);
    fireEvent.change(depositInput, { target: { value: "5.00" } });
    fireEvent.blur(depositInput);
    const reviewDepositBtn = screen.getByRole("button", { name: /Review Trader Collateral Deposit/i });
    await waitFor(() => expect(reviewDepositBtn).not.toBeDisabled());
    fireEvent.click(reviewDepositBtn);

    expect(await screen.findByRole("dialog")).toHaveTextContent(/"action":"trader_collateral"/i);
    fireEvent.click(screen.getByRole("button", { name: /Confirm & Sign in Wallet \(5\.000000 USDC\)/i }));

    await waitFor(() => expect(signSpy).toHaveBeenCalledTimes(1));
    expect(signSpy.mock.calls[0]?.[0]?.receiverId).toBe(CIRCLE_TESTNET_USDC_ID);
    expect(signSpy.mock.calls[0]?.[0]?.actions[0]?.params.methodName).toBe("ft_transfer_call");
    expect(signSpy.mock.calls[0]?.[0]?.actions[0]?.params.deposit).toBe("1");
    expect(verifySpy).toHaveBeenCalledTimes(1);

    // Check Withdraw tab warns on missing Circle NEP-145 storage AND deposit prompt allows Circle storage_deposit
    const regCircleBtn = screen.getByRole("button", { name: /Register Circle USDC Storage \(0\.00125 NEAR\)/i });
    fireEvent.click(regCircleBtn);
    expect(await screen.findByRole("dialog")).toHaveTextContent(/storage_deposit/i);
    fireEvent.click(screen.getByRole("button", { name: /Confirm & Sign in Wallet \(0\.00125 NEAR\)/i }));
    await waitFor(() => expect(signSpy).toHaveBeenCalledTimes(2));
    expect(signSpy.mock.calls[1]?.[0]?.receiverId).toBe(CIRCLE_TESTNET_USDC_ID);
    expect(signSpy.mock.calls[1]?.[0]?.actions[0]?.params.methodName).toBe("storage_deposit");
    expect(signSpy.mock.calls[1]?.[0]?.actions[0]?.params.deposit).toBe("1250000000000000000000");

    fireEvent.click(screen.getByRole("tab", { name: /Withdraw USDC/i }));
    expect(await screen.findByText(/Circle USDC Storage Missing/i)).toBeInTheDocument();
  });

  it("blocks open orders when oracle is stale (>300s) or LP MTM is 0 while keeping Close enabled on open positions", async () => {
    const staleProtocol = makeProtocol({
      blockTimestampSec: 1_794_350_400, // 400s > 300s policy
    });
    const traderWithPos = makeTrader({
      positions: [
        {
          record: {
            id: 12,
            owner: "demo-roaster.testnet",
            market_id: MARKET_ARABICA_PERPS_ID,
            side: "Long",
            size_e8: "10000000",
            notional_e8: "100000000",
            entry_price_e8: "1000000000",
            locked_margin_e8: "25000000",
            entry_funding_index_e12: "0",
            opened_at_sec: 1_794_350_000,
            locked: false,
          },
          health: {
            position: {
              id: 12,
              owner: "demo-roaster.testnet",
              market_id: MARKET_ARABICA_PERPS_ID,
              side: "Long",
              size_e8: "10000000",
              notional_e8: "100000000",
              entry_price_e8: "1000000000",
              locked_margin_e8: "25000000",
              entry_funding_index_e12: "0",
              opened_at_sec: 1_794_350_000,
              locked: false,
            },
            reference_price_e8: "1000000000",
            unrealized_pnl_e8: "0",
            capped_pnl_e8: "0",
            funding_net_e8: "0",
            equity_e8: "25000000",
            maintenance_margin_e8: "12500000",
            margin_ratio_bps: 2500,
            liquidatable_at_reference: false,
            indicative_liquidation_price_e8: "857142858",
          },
        },
      ],
    });

    const protoSpy = vi.spyOn(perpsRpc, "fetchPerpsProtocolSnapshot").mockResolvedValue(staleProtocol);
    vi.spyOn(perpsRpc, "fetchPerpsTraderSnapshot").mockResolvedValue(traderWithPos);

    const view = renderPerpsUi(<ArabicaLiveMarketView />, { accountId: "demo-roaster.testnet" });

    expect(await screen.findByText(/Open Orders Blocked/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Review Open Long Position/i })).toBeDisabled();

    // Existing open position shows sub-micro-unit residue note and keeps Close ENABLED!
    expect(await screen.findByText(/Sub-micro-unit residue:/i)).toBeInTheDocument();
    const closeBtn = await screen.findByRole("button", { name: /^Close$/i });
    expect(closeBtn).not.toBeDisabled();

    // Verify LP MTM 0 blocks opens cleanly and empty positions show clean empty state
    view.unmount();
    cleanup();
    protoSpy.mockResolvedValue(
      makeProtocol({
        lpSnapshot: { ...makeProtocol().lpSnapshot, lp_mtm_equity_e8: "0", lp_available_liquidity_e8: "0" },
      }),
    );
    vi.spyOn(perpsRpc, "fetchPerpsTraderSnapshot").mockResolvedValue(makeTrader({ positions: [] }));
    renderPerpsUi(<ArabicaLiveMarketView />, { accountId: "demo-roaster.testnet" });
    expect(await screen.findByText(/LP Vault has zero MTM liquidity/i)).toBeInTheDocument();
    expect(await screen.findByText(/No open Perpetuals positions/i)).toBeInTheDocument();
  });

  it("handles ReduceOnly mode and disabled Preview views (Robusta & Gesha) plus zero-tx 11-step Judges Walkthrough", async () => {
    const reduceProtocol = makeProtocol({
      arabicaMarket: { ...makeProtocol().arabicaMarket!, mode: "ReduceOnly" },
    });
    vi.spyOn(perpsRpc, "fetchPerpsProtocolSnapshot").mockResolvedValue(reduceProtocol);
    vi.spyOn(perpsRpc, "fetchPerpsTraderSnapshot").mockResolvedValue(makeTrader());

    const { unmount } = renderPerpsUi(<ArabicaLiveMarketView />, {
      accountId: "demo-roaster.testnet",
    });

    expect(await screen.findByText(/Market mode is ReduceOnly/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Review Open Long Position/i })).toBeDisabled();
    unmount();

    renderPerpsUi(
      <PreviewCoffeeMarketView
        entry={{
          ...THREE_MARKET_CATALOG[2],
          status: "preview",
          badges: ["PREVIEW", "ROADMAP"],
        }}
      />,
    );
    expect(screen.getByText("Gesha / USD")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Order Placement Unavailable in Preview/i })).toBeDisabled();
    cleanup();

    renderPerpsUi(<JudgesWalkthrough protocol={reduceProtocol} defaultExpanded />);
    expect(screen.getByText(/Multichain Wallet Hub & NEAR Priority/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "11" }));
    expect(
      screen.getByText(/Withdraw Collateral, Async Callback & Verified Proof/i),
    ).toBeInTheDocument();
  });

  it("gates Testnet Operator Controls strictly to connected roastake-dev-mta.testnet admin and prepares oracle, LP seed & LP withdraw calls", async () => {
    expect(
      isAuthorizedOperatorAdmin({
        nearStatus: "connected",
        unsupportedNetwork: false,
        connectedAccountId: "trader.testnet",
        contractAdmin: "roastake-dev-mta.testnet",
      }),
    ).toBe(false);
    expect(
      isAuthorizedOperatorAdmin({
        nearStatus: "connected",
        unsupportedNetwork: true,
        connectedAccountId: "roastake-dev-mta.testnet",
        contractAdmin: "roastake-dev-mta.testnet",
      }),
    ).toBe(false);
    expect(
      isAuthorizedOperatorAdmin({
        nearStatus: "connected",
        unsupportedNetwork: false,
        connectedAccountId: "roastake-dev-mta.testnet",
        contractAdmin: "roastake-dev-mta.testnet",
      }),
    ).toBe(true);

    const protocol = makeProtocol();
    const nonAdminTrader = makeTrader({ accountId: "demo-roaster.testnet" });
    vi.spyOn(perpsRpc, "fetchPerpsProtocolSnapshot").mockResolvedValue(protocol);
    const traderSpy = vi
      .spyOn(perpsRpc, "fetchPerpsTraderSnapshot")
      .mockResolvedValue(nonAdminTrader);

    const nonAdminView = renderPerpsUi(<ArabicaLiveMarketView />, {
      accountId: "demo-roaster.testnet",
    });
    expect(await screen.findByText(/^12\.000000 USDC$/i)).toBeInTheDocument();
    expect(screen.queryByText(/Testnet Operator Controls/i)).toBeNull();
    nonAdminView.unmount();
    cleanup();

    // Now render as admin operator `roastake-dev-mta.testnet` with 19.999299 USDC & redeemable LP shares
    traderSpy.mockResolvedValue(
      makeTrader({
        accountId: "roastake-dev-mta.testnet",
        account: {
          ...makeTrader().account!,
          account_id: "roastake-dev-mta.testnet",
          lp_shares: "200000000",
        },
      }),
    );
    vi.spyOn(perpsRpc, "fetchFreshFinalizedBlockTimestampSec").mockResolvedValue({
      blockHash: "fresh-block-hash",
      blockHeight: 277_167_100,
      blockTimestampSec: 1_794_372_000,
    });
    vi.spyOn(perpsRpc, "verifyNearTransactionFinality").mockResolvedValue({
      verdict: "successful",
      detail: "Verified on NEAR Testnet.",
      events: [],
    });
    const signSpy = vi.fn(
      async (request: NearTransactionRequest): Promise<NearSignedTxOutcome> => ({
        transactionHash: "AdminOpTxHash01",
        signerId: "roastake-dev-mta.testnet",
        receiverId: request.receiverId,
        rawOutcome: {},
      }),
    );

    renderPerpsUi(<ArabicaLiveMarketView />, {
      accountId: "roastake-dev-mta.testnet",
      signAndSendTransaction: signSpy,
    });

    expect(await screen.findByText(/Testnet Operator Controls/i)).toBeInTheDocument();

    // Trigger Oracle refresh modal -> sign push_sandbox_oracle_price seq #3
    fireEvent.click(screen.getByRole("button", { name: /Review Oracle Refresh/i }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(/push_sandbox_oracle_price/i);
    fireEvent.click(screen.getByRole("button", { name: /Confirm & Sign in Wallet/i }));
    await waitFor(() => expect(signSpy).toHaveBeenCalledTimes(1));
    expect(signSpy.mock.calls[0]?.[0]?.actions[0]?.params.methodName).toBe(
      "push_sandbox_oracle_price",
    );

    // Trigger LP Seed modal -> sign ft_transfer_call with {"action":"lp_deposit"} & 2.000000 USDC
    fireEvent.click(screen.getByRole("button", { name: /Review LP Seed Deposit/i }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(/"action":"lp_deposit"/i);
    fireEvent.click(screen.getByRole("button", { name: /Confirm & Sign in Wallet/i }));
    await waitFor(() => expect(signSpy).toHaveBeenCalledTimes(2));
    expect(signSpy.mock.calls[1]?.[0]?.receiverId).toBe(CIRCLE_TESTNET_USDC_ID);
    expect(signSpy.mock.calls[1]?.[0]?.actions[0]?.params.deposit).toBe("1");

    // Trigger Max redeemable LP withdrawal -> sign withdraw_lp burning 200000000 shares
    fireEvent.click(screen.getByRole("button", { name: /Max: 200,000,000 shares/i }));
    fireEvent.click(screen.getByRole("button", { name: /Review LP Share Withdrawal/i }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(/withdraw_lp/i);
    fireEvent.click(screen.getByRole("button", { name: /Confirm & Sign in Wallet/i }));
    await waitFor(() => expect(signSpy).toHaveBeenCalledTimes(3));
    expect(signSpy.mock.calls[2]?.[0]?.actions[0]?.params.methodName).toBe("withdraw_lp");
  });

  it("renders Robusta Live Terminal cleanly with isolated $5.00/kg price, history query, and COFFEE-ROBUSTA-TESTNET/USD order payload", async () => {
    const robustaHistorySpy = vi
      .spyOn(marketHistory, "fetchMarketHistoryWithFallback")
      .mockResolvedValue({
        network: "testnet",
        contractId: PERPS_CONTRACT_ID,
        marketId: MARKET_ROBUSTA_PERPS_ID,
        rpcEndpoint: "http://127.0.0.1:8787",
        referenceNowSec: 1_794_350_050,
        maxAgeSec: 300,
        fetchedAtMs: 1_794_350_050_000,
        sourceMode: "persistent_indexer",
        historyConnectionState: "indexer_connected",
        observations: [],
        tradeMarkers: [],
        latestObservation: null,
        latestAgeSec: null,
        isStale: false,
        rejectedCount: 0,
      });

    vi.spyOn(perpsRpc, "fetchPerpsProtocolSnapshot").mockResolvedValue(makeProtocol());
    vi.spyOn(perpsRpc, "fetchPerpsTraderSnapshot").mockResolvedValue(makeTrader({ positions: [] }));
    vi.spyOn(perpsRpc, "verifyNearTransactionFinality").mockResolvedValue({
      verdict: "successful",
      detail: "Opened Long on COFFEE-ROBUSTA-TESTNET/USD.",
      events: [],
    });

    const signSpy = vi.fn(
      async (request: NearTransactionRequest): Promise<NearSignedTxOutcome> => ({
        transactionHash: "RobustaOpenTx01",
        signerId: "majorblog5570.testnet",
        receiverId: request.receiverId,
        rawOutcome: {},
      }),
    );

    renderPerpsUi(<PerpsLiveMarketView marketEntry={THREE_MARKET_CATALOG[1]} />, {
      accountId: "majorblog5570.testnet",
      signAndSendTransaction: signSpy,
    });

    expect(await screen.findByText(/Robusta \/ USD/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\$5\.000000\/kg/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/COFFEE-ROBUSTA-TESTNET\/USD/i).length).toBeGreaterThanOrEqual(1);
    expect(robustaHistorySpy).toHaveBeenCalledWith(
      expect.objectContaining({ marketId: MARKET_ROBUSTA_PERPS_ID }),
    );

    const openBtn = await screen.findByRole("button", { name: /Review Open Long Position/i });
    expect(openBtn).toBeEnabled();
    fireEvent.click(openBtn);
    expect(await screen.findByRole("dialog")).toHaveTextContent(/COFFEE-ROBUSTA-TESTNET\/USD/i);
    fireEvent.click(screen.getByRole("button", { name: /Confirm & Sign Open Long/i }));

    await waitFor(() => expect(signSpy).toHaveBeenCalledTimes(1));
    expect(signSpy.mock.calls[0]?.[0]?.actions[0]?.params.methodName).toBe("open_position");
    expect(signSpy.mock.calls[0]?.[0]?.actions[0]?.params.args).toEqual(
      expect.objectContaining({ market_id: MARKET_ROBUSTA_PERPS_ID, side: "Long" }),
    );
  });

  it("renders Gesha Live Terminal cleanly at $25.00/kg, defaults 0.04 kg ($1.00 / $0.25 4x), and blocks ordering when unregistered on-chain", async () => {
    const geshaHistorySpy = vi
      .spyOn(marketHistory, "fetchMarketHistoryWithFallback")
      .mockResolvedValue({
        network: "testnet",
        contractId: PERPS_CONTRACT_ID,
        marketId: MARKET_GESHA_PERPS_ID,
        rpcEndpoint: "https://rpc.testnet.fastnear.com",
        referenceNowSec: 1_794_350_015,
        maxAgeSec: 300,
        fetchedAtMs: 1_794_350_015_000,
        sourceMode: "verified_testnet_tx_receipts",
        historyConnectionState: "fallback_m0412_rpc",
        observations: [],
        tradeMarkers: [],
        latestObservation: null,
        latestAgeSec: 0,
        isStale: false,
        rejectedCount: 0,
      });

    // Unregistered check: order entry must remain disabled until verified on-chain registration
    vi.spyOn(perpsRpc, "fetchPerpsProtocolSnapshot").mockResolvedValueOnce(
      makeProtocol({
        markets: [MARKET_ARABICA_PERPS_ID, MARKET_ROBUSTA_PERPS_ID],
        geshaMarket: null,
      }),
    );
    vi.spyOn(perpsRpc, "fetchPerpsTraderSnapshot").mockResolvedValue(makeTrader({ positions: [] }));

    const { unmount } = renderPerpsUi(<PerpsLiveMarketView marketEntry={THREE_MARKET_CATALOG[2]} />, {
      accountId: "majorblog5570.testnet",
    });
    expect(
      await screen.findByText(/order placement is disabled until on-chain registration is verified/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Review Open Long Position/i })).toBeNull();
    unmount();

    // Registered live check: enables 0.04 kg ($1.00 notional / $0.25 margin) open_position for COFFEE-GESHA-TESTNET/USD
    vi.spyOn(perpsRpc, "fetchPerpsProtocolSnapshot").mockResolvedValue(makeProtocol());
    const signSpy = vi.fn(
      async (request: NearTransactionRequest): Promise<NearSignedTxOutcome> => ({
        transactionHash: "GeshaOpenTx01",
        signerId: "majorblog5570.testnet",
        receiverId: request.receiverId,
        rawOutcome: {},
      }),
    );

    renderPerpsUi(<PerpsLiveMarketView marketEntry={THREE_MARKET_CATALOG[2]} />, {
      accountId: "majorblog5570.testnet",
      signAndSendTransaction: signSpy,
    });

    expect(await screen.findByText(/Gesha \/ USD/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\$25\.000000\/kg/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/COFFEE-GESHA-TESTNET\/USD/i).length).toBeGreaterThanOrEqual(1);
    expect(geshaHistorySpy).toHaveBeenCalledWith(
      expect.objectContaining({ marketId: MARKET_GESHA_PERPS_ID }),
    );

    const openBtn = await screen.findByRole("button", { name: /Review Open Long Position/i });
    expect(openBtn).toBeEnabled();
    fireEvent.click(openBtn);
    expect(await screen.findByRole("dialog")).toHaveTextContent(/COFFEE-GESHA-TESTNET\/USD/i);
    fireEvent.click(screen.getByRole("button", { name: /Confirm & Sign Open Long/i }));

    await waitFor(() => expect(signSpy).toHaveBeenCalledTimes(1));
    expect(signSpy.mock.calls[0]?.[0]?.actions[0]?.params.methodName).toBe("open_position");
    expect(signSpy.mock.calls[0]?.[0]?.actions[0]?.params.args).toEqual(
      expect.objectContaining({
        market_id: MARKET_GESHA_PERPS_ID,
        side: "Long",
        size_e8: "4000000",
        collateral_e8: "25000000",
      }),
    );
  });
  it("renders Degen banner and Mumu/Bobo labels without changing order-side behavior", async () => {
    window.localStorage.setItem("roastake-degen-mode", "true");
    vi.spyOn(perpsRpc, "fetchPerpsProtocolSnapshot").mockResolvedValue(makeProtocol());
    vi.spyOn(perpsRpc, "fetchPerpsTraderSnapshot").mockResolvedValue(makeTrader({ positions: [] }));

    renderPerpsUi(<PerpsLiveMarketView marketEntry={THREE_MARKET_CATALOG[0]} />);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "DEGEN MODE ACTIVE · CAFFEINATED PERPS 🚀",
    );
    const long = screen.getByRole("tab", { name: /MUMU LONG \(Pump! ☕\)/i });
    const short = screen.getByRole("tab", { name: /BOBO SHORT \(Hedge! 🐻\)/i });
    expect(long).toHaveAttribute("aria-selected", "true");
    expect(short).toHaveAttribute("aria-selected", "false");
    fireEvent.click(short);
    expect(short).toHaveAttribute("aria-selected", "true");
    expect(long).toHaveAttribute("aria-selected", "false");
  });

});
