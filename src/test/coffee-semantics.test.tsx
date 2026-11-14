import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "@/components/coffee/overview";
import { AssetExplorer } from "@/components/coffee/lots";
import { RedeemPage, RoastPage } from "@/components/coffee/simulations";
import { demo, getDemo } from "@/lib/demo/store";

const mocks = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: mocks.toast, error: vi.fn() } }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
vi.mock("@/lib/wallet/context", () => ({
  useWalletHub: () => ({
    hydrated: true,
    near: { status: "connected", accountId: "reader.testnet", unsupportedNetwork: false },
    connectedAccounts: [{ accountId: "reader.testnet" }],
    openHub: vi.fn(),
  }),
}));
vi.mock("@/components/wallet/wallet-pages", () => ({ SimulatedDemoNetworkSelect: () => null }));
vi.mock("@/components/coffee/oracle", () => ({
  OracleOverviewCard: () => <section aria-label="Separate Oracle telemetry" />,
}));
vi.mock("@/lib/oracle/queries", () => ({
  useOracleSnapshot: () => ({ isError: true, isPending: false }),
}));
vi.mock("@/lib/perps/queries", () => ({
  usePerpsProtocolSnapshot: () => ({ isError: true, isPending: false }),
  usePerpsTraderSnapshot: () => ({ isError: true, isPending: false }),
}));

beforeEach(() => {
  demo.reset();
  mocks.toast.mockClear();
});
afterEach(cleanup);

describe("coffee prototype maturity and accounting", () => {
  it("isolates the browser portfolio from contract data even with a connected wallet and failed RPC", () => {
    render(<Dashboard />);
    const portfolio = screen.getByRole("region", { name: "Demo Portfolio" });
    expect(
      within(portfolio)
        .getByText(/localStorage/)
        .closest("p"),
    ).toHaveTextContent(/not a connected-wallet valuation/i);
    expect(within(portfolio).getByText("Simulated portfolio value")).toBeInTheDocument();
    expect(
      screen.getByText(/Connected-wallet portfolio valuation is unavailable/),
    ).toBeInTheDocument();
    const contracts = screen.getByRole("region", { name: "ROASTAKE Perpetuals" });
    expect(within(contracts).getByText(/Trader balance unavailable/)).toBeInTheDocument();
    expect(within(contracts).queryByText("Simulated portfolio value")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Illustrative coffee assets" })).toBeInTheDocument();
  });

  it("presents 1 token per kg as proposed accounting, not backing or redemption today", () => {
    render(<AssetExplorer />);
    expect(screen.getByText(/Proposed accounting: 1 GCT/)).toHaveTextContent(
      /not backed or redeemable today/i,
    );
    expect(screen.getByText(/Illustrative lot-specific token records/)).toHaveTextContent(
      /all inventory fields are demo examples/i,
    );
  });
});

describe("explicitly simulated coffee actions", () => {
  it("shows green input, roast loss and output fee, then confirms only a simulated conversion", () => {
    render(<RoastPage initialLot="GCT-COL-HUI-25A" />);
    expect(screen.getByText("Mass, not a 1:1 conversion")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Simulate roasting" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      /Simulated conversion completed: 5.000 kg green → 4.116/,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/No real roasting or token issuance/);
    expect(getDemo().conversions[0]).toMatchObject({
      inputKg: 5,
      outputKg: 4.2,
      lossKg: 0.8,
      feeKg: 0.084,
      netKg: 4.116,
    });
    expect(mocks.toast.mock.calls.at(-1)?.[0]).toMatch(/simulated/i);
  });

  it("reserves a demo redemption without claiming shipment and labels later status steps simulated", () => {
    render(<RedeemPage initialLot="RCT-COL-HUI-25A" />);
    expect(screen.queryByText(/Redeemable wallet balance/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Fictional delivery address"), {
      target: { value: "Example demo street" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simulate redemption" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Simulated reservation created/);
    expect(screen.getByRole("status")).toHaveTextContent(/No shipment was created/);
    const request = getDemo().redemptions[0];
    const record = screen.getByText(new RegExp(request.id)).closest("article")!;
    expect(within(record).getByText(/Simulated · Requested/)).toBeInTheDocument();
    expect(getDemo().lots.find((lot) => lot.id === request.lotId)).toMatchObject({
      physicalKg: 1400,
      supply: 1299,
      reservedRedemption: 21,
    });
    fireEvent.click(within(record).getByRole("button", { name: /Advance demo status/ }));
    expect(within(record).getByText(/Simulated · Processing/)).toBeInTheDocument();
    expect(mocks.toast.mock.calls.at(-1)?.[0]).toMatch(/simulated/i);
  });
});
