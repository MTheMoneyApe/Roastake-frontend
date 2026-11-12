// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("Wallet Infrastructure SSR safety without browser globals", () => {
  it("imports and renders WalletInfrastructureProvider, header button, and WalletHubPanels with window and document undefined", async () => {
    vi.resetModules();
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("document", undefined);

    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");

    const [{ WalletHubHeaderButton, WalletHubPanels }, { WalletInfrastructureProvider }] =
      await Promise.all([
        import("@/components/wallet/wallet-hub"),
        import("@/lib/wallet/provider"),
      ]);

    const client = new QueryClient();
    const html = renderToString(
      <QueryClientProvider client={client}>
        <WalletInfrastructureProvider>
          <WalletHubHeaderButton />
          <WalletHubPanels />
        </WalletInfrastructureProvider>
      </QueryClientProvider>,
    );

    expect(html).toContain("Connect Wallet");
    expect(html).toContain("NEAR Testnet");
    expect(html).toContain("PRIMARY");
  }, 15_000);
});
