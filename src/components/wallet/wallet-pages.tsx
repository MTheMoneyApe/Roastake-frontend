// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CandlestickChart, Globe, Sparkles } from "lucide-react";
import { DemoBadge, PageHeader, Panel, Pill } from "@/components/kit";
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
import { fmt, portfolio, usd } from "@/lib/demo/calc";
import { demo, useDemo } from "@/lib/demo/store";
import { ALL_WALLET_NETWORKS } from "@/lib/wallet/config";
import { useWalletHub } from "@/lib/wallet/context";
import { EcosystemIcon, WalletHubPanels } from "./wallet-hub";

const DEMO_ACCOUNTS = ["Demo Explorer", "Demo Whale", "Demo Roaster Ops"] as const;

export function SimulatedDemoNetworkSelect({ className = "w-[158px]" }: { className?: string }) {
  const s = useDemo();
  return (
    <Select value={s.network} onValueChange={demo.setNetwork}>
      <SelectTrigger
        className={`h-8 gap-1.5 text-xs ${className}`}
        aria-label="Simulated demo network"
      >
        <Globe className="size-3.5 shrink-0 text-brass" aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {s.networks.map((n) => (
          <SelectItem key={n.id} value={n.id}>
            Demo · {n.name}
            {n.status !== "Operational" ? ` (${n.status})` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Dedicated `/app/wallet` page pairing the real NEAR-First Wallet Hub with a strictly isolated,
 * explicitly labeled "Simulated Demo Wallet" sandbox section for prototype persistence.
 */
export function WalletOverviewPage() {
  const s = useDemo();
  const p = portfolio(s);
  const netName = s.networks.find((n) => n.id === s.network)?.name ?? s.network;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Multichain Wallet"
        demo={false}
        crumbs={[{ label: "Dashboard", to: "/app/dashboard" }, { label: "Wallet" }]}
        subtitle="Connect real browser/standard wallets on NEAR Testnet (primary execution), EVM Testnets, Solana Devnet, and Hyperliquid Testnet Core."
      />

      <WalletHubPanels />

      {/* Strictly Isolated Legacy Simulated Demo Wallet */}
      <Panel
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span>Simulated Demo Wallet (Browser LocalStorage Prototype)</span>
            <DemoBadge>NOT REAL WALLET BALANCES</DemoBadge>
          </span>
        }
        actions={
          <Button variant="destructive" size="sm" onClick={() => demo.reset()}>
            Reset demo data
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Balances below ({usd(p.total)}) are offline simulated prototype values stored in this
            browser. They are completely isolated from NEAR Testnet oracle accounting and from any
            real wallets connected above.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Simulated persona</p>
              <Select value={s.account} onValueChange={demo.setAccount}>
                <SelectTrigger aria-label="Simulated demo persona">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEMO_ACCOUNTS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">
                Simulated demo network (legacy UI context)
              </p>
              <SimulatedDemoNetworkSelect className="w-full" />
            </div>
            <div className="rounded-md border bg-background/50 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Simulated total · {netName}
              </p>
              <p className="num text-xl font-semibold">{usd(p.total)}</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Object.entries(s.balances)
              .filter(([, v]) => v > 0)
              .map(([asset, bal]) => (
                <div
                  key={asset}
                  className="flex items-center justify-between rounded-md border bg-background/40 px-3 py-2 text-xs"
                >
                  <span className="font-mono text-muted-foreground">{asset}</span>
                  <span className="num font-medium">{fmt(bal, 4)}</span>
                </div>
              ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}

/**
 * Dedicated `/app/multichain` architecture matrix + isolated Simulated Multichain Bridge demo.
 */
export function MultichainOverviewPage() {
  const s = useDemo();
  const { openHub } = useWalletHub();
  const [bridgeAsset, setBridgeAsset] = useState("USDC");
  const [fromNet, setFromNet] = useState("base");
  const [toNet, setToNet] = useState("arbitrum");
  const [amount, setAmount] = useState("100");
  const [bridgeMsg, setBridgeMsg] = useState("");

  const availableOnFrom = s.networkBalances[bridgeAsset]?.[fromNet] ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Multichain Infrastructure"
        demo={false}
        crumbs={[{ label: "Dashboard", to: "/app/dashboard" }, { label: "Multi-chain" }]}
        subtitle="ROASTAKE protocol deployment status across NEAR Testnet (primary execution), secondary testnets, and Hyperliquid Testnet Core."
        actions={
          <Button type="button" size="sm" onClick={() => openHub("near")} className="gap-1.5">
            <Sparkles className="size-3.5" aria-hidden="true" />
            <span>Open Wallet Hub</span>
          </Button>
        }
      />

      <Panel
        title="Protocol Deployment & Wallet Support Matrix (Testnets / Devnet Only)"
        bodyClass="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Network / Venue</th>
                <th className="px-4 py-3 font-medium">Ecosystem</th>
                <th className="px-4 py-3 font-medium">ID / Environment</th>
                <th className="px-4 py-3 font-medium">ROASTAKE Role</th>
                <th className="px-4 py-3 font-medium">Deployed Contracts / Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs">
              {ALL_WALLET_NETWORKS.map((net) => (
                <tr key={net.id} className={net.isPrimaryProtocolNetwork ? "bg-forest/15" : ""}>
                  <td className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-2">
                      <EcosystemIcon ecosystem={net.ecosystem} className="size-3.5 text-sage" />
                      <span>{net.name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono uppercase">{net.ecosystem}</td>
                  <td className="px-4 py-3 font-mono">
                    {net.chainId ? `Chain ID ${net.chainId}` : net.environment}
                  </td>
                  <td className="px-4 py-3">
                    {net.isPrimaryProtocolNetwork ? (
                      <Pill tone="gain">PRIMARY EXECUTION</Pill>
                    ) : net.isExternalVenue ? (
                      <Pill tone="warn">EXTERNAL TRADING VENUE</Pill>
                    ) : (
                      <Pill tone="muted">WALLET IDENTITY ONLY</Pill>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{net.deployedContractsNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Isolated Simulated Demo Bridge Section */}
      <Panel
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span>Simulated Multichain Demo Bridge</span>
            <DemoBadge>OFFLINE PROTOTYPE</DemoBadge>
          </span>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const ok = demo.bridge(bridgeAsset, Number(amount), fromNet, toNet);
              setBridgeMsg(
                ok
                  ? `Simulated transfer recorded: ${amount} ${bridgeAsset} (${fromNet} → ${toNet}).`
                  : "Simulated bridge blocked by demo validation.",
              );
            }}
          >
            <p className="text-xs text-muted-foreground">
              Simulates wrapping/allocation across legacy prototype networks inside{" "}
              <span className="font-mono">DemoState.networkBalances</span>. Zero real cross-chain
              transactions are created.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="demo-bridge-asset">Asset</Label>
                <Select value={bridgeAsset} onValueChange={setBridgeAsset}>
                  <SelectTrigger id="demo-bridge-asset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(s.networkBalances).map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="demo-bridge-from">From</Label>
                <Select value={fromNet} onValueChange={setFromNet}>
                  <SelectTrigger id="demo-bridge-from">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {s.networks.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="demo-bridge-to">To</Label>
                <Select value={toNet} onValueChange={setToNet}>
                  <SelectTrigger id="demo-bridge-to">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {s.networks.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="demo-bridge-amt">
                Amount (available on {fromNet}: {fmt(availableOnFrom, 4)} {bridgeAsset})
              </Label>
              <Input
                id="demo-bridge-amt"
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline" className="gap-1.5">
              <span>Simulate bridge transfer</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Button>
            {bridgeMsg && (
              <p role="status" className="text-xs text-muted-foreground">
                {bridgeMsg}
              </p>
            )}
          </form>

          <div className="space-y-2 text-xs">
            <h3 className="font-semibold">Recent simulated bridge transfers</h3>
            <ul className="divide-y rounded-md border">
              {s.bridgeTransfers.slice(0, 6).map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span>
                    <span className="font-mono font-medium">{b.id}</span> · {fmt(b.amount, 2)}{" "}
                    {b.asset} ({b.from} → {b.to})
                  </span>
                  <Pill tone="muted">{b.status}</Pill>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground">
              Hyperliquid Core <CandlestickChart className="inline size-3" aria-hidden="true" /> is
              an external venue accessed via EVM identity, not an EVM bridge destination.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
