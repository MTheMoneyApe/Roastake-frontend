// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CoffeeMiniSwap } from "@/components/coffee/mini-swap";
import type { NearAdapterPort } from "@/lib/wallet/near";
import { WalletInfrastructureProvider } from "@/lib/wallet/provider";
import { fetchOnChainQuote, fetchPoolSnapshot, verifySwapFinality } from "@/lib/coffee-assets/rpc";

const ARABICA_TOKEN = "arabica.roastake-dev-mta.testnet";
const USDC_TOKEN = "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af";

vi.mock("@/lib/coffee-assets/rpc", () => ({
  fetchPoolSnapshot: vi.fn(async (poolId: number) => ({
    poolId,
    exists: true,
    tokenIds: [ARABICA_TOKEN, USDC_TOKEN],
    amounts: [10_000_000n, 1_000_000n],
    totalFeeUnits: 30,
    sharesTotalSupply: 1_000_000_000_000_000_000_000_000n,
  })),
  fetchOnChainQuote: vi.fn(async () => 474_829n),
  fetchFtBalance: vi.fn(async ({ tokenId }: { tokenId: string }) =>
    tokenId === USDC_TOKEN ? 15_403_562n : 906_551n,
  ),
  fetchStorageBalance: vi.fn(async () => 1_250_000_000_000_000_000_000n),
  fetchExchangeDeposit: vi.fn(async () => 300_000n),
  verifySwapFinality: vi.fn(),
  fetchFtMetadata: vi.fn(async () => ({
    decimals: 8,
    symbol: "rARABICA",
    name: "Testnet Arabica",
  })),
}));

function makeNearFactory(
  initialAccountId?: string,
  signAndSendTransaction?: NearAdapterPort["signAndSendTransaction"],
): () => NearAdapterPort {
  return () => ({
    initialize: async () => ({
      wallets: [{ id: "hot-wallet", name: "HOT Wallet", supportsTestnet: true }],
      existing: initialAccountId
        ? {
            accountId: initialAccountId,
            providerId: "hot-wallet",
            providerName: "HOT Wallet",
            networkId: "testnet",
          }
        : null,
    }),
    connect: async () => ({
      accountId: "roastake-dev-mta.testnet",
      providerId: "hot-wallet",
      providerName: "HOT Wallet",
      networkId: "testnet",
    }),
    signAndSendTransaction,
    disconnect: async () => {},
    dispose: () => {},
  });
}

function renderMiniSwap(
  initialAccountId?: string,
  signer?: NearAdapterPort["signAndSendTransaction"],
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ui: ReactNode = (
    <QueryClientProvider client={client}>
      <WalletInfrastructureProvider nearAdapterFactory={makeNearFactory(initialAccountId, signer)}>
        <CoffeeMiniSwap />
      </WalletInfrastructureProvider>
    </QueryClientProvider>
  );
  return render(ui);
}

afterEach(() => {
  cleanup();
});

describe("M04.18 Coffee Mini Swap UI", () => {
  it("shows pending pool reads without enabling transaction review", async () => {
    vi.mocked(fetchPoolSnapshot).mockImplementationOnce(() => new Promise(() => {}));
    renderMiniSwap("qa-only.testnet");
    expect(await screen.findByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Review transaction/i })).toBeNull();
  });

  it("distinguishes an empty pool from a failed read", async () => {
    vi.mocked(fetchPoolSnapshot).mockResolvedValueOnce({
      poolId: 2947,
      exists: true,
      tokenIds: [ARABICA_TOKEN, USDC_TOKEN],
      amounts: [0n, 0n],
      totalFeeUnits: 30,
      sharesTotalSupply: 0n,
    });
    renderMiniSwap("qa-only.testnet");
    expect(await screen.findByText(/The RHEA pool has no liquidity/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Review transaction/i })).toBeNull();
  });

  it("fails closed for missing quotes and invalid input", async () => {
    vi.mocked(fetchOnChainQuote).mockResolvedValueOnce(null);
    renderMiniSwap("qa-only.testnet");
    await screen.findByText(/Wallet: 15\.403562 USDC/);
    fireEvent.change(screen.getByLabelText(/Amount \(USDC\)/), { target: { value: "0.05" } });
    expect(await screen.findByText(/exchange did not return a quote/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Review transaction/i })).toBeNull();
    for (const value of ["-1", "abc", "0"]) {
      fireEvent.change(screen.getByLabelText(/Amount \(USDC\)/), { target: { value } });
      expect(screen.queryByRole("button", { name: /Review transaction/i })).toBeNull();
    }
  });

  it("prevents duplicate signing and preserves pending state until mocked finality", async () => {
    let resolveSign!: (
      value: Awaited<ReturnType<NonNullable<NearAdapterPort["signAndSendTransaction"]>>>,
    ) => void;
    const signer = vi.fn(
      () =>
        new Promise<Awaited<ReturnType<NonNullable<NearAdapterPort["signAndSendTransaction"]>>>>(
          (resolve) => {
            resolveSign = resolve;
          },
        ),
    );
    vi.mocked(verifySwapFinality).mockResolvedValueOnce({
      verdict: "final_success",
      finalExecutionStatus: "FINAL",
      receiptsChecked: 1,
      failedReceipts: 0,
      failureDetail: null,
      swappedLogs: [],
      transferLogs: [],
    });
    renderMiniSwap("qa-only.testnet", signer);
    await screen.findByText(/Wallet: 15\.403562 USDC/);
    fireEvent.change(screen.getByLabelText(/Amount \(USDC\)/), { target: { value: "0.05" } });
    fireEvent.click(await screen.findByRole("button", { name: /Review transaction/i }));
    const send = screen.getByRole("button", { name: /Sign & send swap/i });
    fireEvent.click(send);
    await screen.findByText(/Waiting for the wallet to sign/);
    fireEvent.click(send);
    expect(signer).toHaveBeenCalledTimes(1);
    expect(send).toBeDisabled();
    expect(screen.getByLabelText(/Amount \(USDC\)/)).toBeDisabled();
    await act(async () =>
      resolveSign({
        transactionHash: "mock-test-hash-not-broadcast",
        signerId: "qa-only.testnet",
        receiverId: USDC_TOKEN,
        rawOutcome: {},
      }),
    );
    expect(await screen.findByText(/FINAL · every receipt succeeded/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open on NEAR Explorer/ })).toHaveAttribute(
      "href",
      expect.stringContaining("mock-test-hash-not-broadcast"),
    );
  });

  it("reports a rejected signature without manufacturing a transaction link", async () => {
    renderMiniSwap(
      "qa-only.testnet",
      vi.fn().mockRejectedValue(new Error("User rejected test signature")),
    );
    await screen.findByText(/Wallet: 15\.403562 USDC/);
    fireEvent.change(screen.getByLabelText(/Amount \(USDC\)/), { target: { value: "0.05" } });
    fireEvent.click(await screen.findByRole("button", { name: /Review transaction/i }));
    fireEvent.click(screen.getByRole("button", { name: /Sign & send swap/i }));
    expect(await screen.findByText(/User rejected test signature/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Open on NEAR Explorer/ })).toBeNull();
  });
  it("renders the live RHEA pool and refuses to swap without a wallet", async () => {
    renderMiniSwap();

    expect(screen.getByRole("heading", { name: /Live Mini Swap/i, level: 1 })).toHaveClass(
      "brand-page-title",
    );
    expect(screen.getAllByText(/SIMULATED_TESTNET_INVENTORY/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Pool id/)).toBeInTheDocument();
    expect(await screen.findByText("2947")).toBeInTheDocument();
    expect(await screen.findByText(/0\.1 rARABICA \/ 1 USDC/)).toBeInTheDocument();
    expect(await screen.findByText(/Connect a NEAR Testnet wallet to swap\./)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Connect NEAR Testnet wallet/i }),
    ).toBeInTheDocument();
  });

  it("quotes against the exchange and walks the user through review before signing", async () => {
    renderMiniSwap("roastake-dev-mta.testnet");

    await waitFor(() => expect(screen.getByText(/Wallet: 15\.403562 USDC/)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Amount \(USDC\)/), { target: { value: "0.05" } });

    expect(await screen.findByText("0.004748 rARABICA")).toBeInTheDocument();
    expect(await screen.findByText(/0\.30%/)).toBeInTheDocument();
    expect(await screen.findByText(/4\.762%/)).toBeInTheDocument();

    const review = await screen.findByRole("button", { name: /Review transaction/i });
    fireEvent.click(review);

    expect(await screen.findByText(/Review before signing/i)).toBeInTheDocument();
    expect(screen.getAllByText(USDC_TOKEN).length).toBeGreaterThan(0);
    expect(screen.getByText(/ft_transfer_call → ref-finance-101\.testnet/)).toBeInTheDocument();
    expect(screen.getByText(/1 yoctoNEAR/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign & send swap/i })).toBeInTheDocument();
  });

  it("fails closed when the pool RPC read fails instead of presenting an empty or missing pool", async () => {
    vi.mocked(fetchPoolSnapshot).mockRejectedValueOnce(
      new Error("All configured NEAR Testnet RPC endpoints failed."),
    );
    renderMiniSwap("roastake-dev-mta.testnet");

    expect(
      await screen.findByText(/RHEA pool state could not be verified from NEAR Testnet RPC/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/The RHEA pool has no liquidity/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Review transaction/i })).toBeNull();
  });

  it("blocks swaps larger than the wallet balance", async () => {
    renderMiniSwap("roastake-dev-mta.testnet");

    await waitFor(() => expect(screen.getByText(/Wallet: 15\.403562 USDC/)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Amount \(USDC\)/), { target: { value: "999" } });

    expect(
      await screen.findByText(/Amount exceeds your Testnet balance for the input token\./),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Review transaction/i })).not.toBeInTheDocument();
  });
});
