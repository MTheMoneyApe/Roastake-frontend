// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { flushSync } from "react-dom";
import {
  Activity,
  AlertTriangle,
  CandlestickChart,
  CheckCircle2,
  Coins,
  ExternalLink,
  Layers,
  Link2,
  Power,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pill } from "@/components/kit";
import { formatFixedPoint } from "@/lib/oracle/format";
import { ORACLE_CONTRACT_ID } from "@/lib/oracle/config";
import { MARKET_ARABICA_URL_SLUG, PERPS_CONTRACT_ID } from "@/lib/perps/config";
import { formatUsdE8 } from "@/lib/perps/math";
import { usePerpsTraderSnapshot } from "@/lib/perps/queries";
import { abbreviateAddress, HYPERLIQUID_TESTNET_API_URL } from "@/lib/wallet/config";
import { useWalletHub } from "@/lib/wallet/context";
import type { EvmTestnetId, WalletEcosystem } from "@/lib/wallet/types";
import { cn } from "@/lib/utils";
import { CopyAddressButton } from "./copy-address-button";

export function EcosystemIcon({
  ecosystem,
  className = "size-4",
}: {
  ecosystem: WalletEcosystem;
  className?: string;
}) {
  if (ecosystem === "near") return <Sparkles className={className} aria-hidden="true" />;
  if (ecosystem === "evm") return <Layers className={className} aria-hidden="true" />;
  if (ecosystem === "solana") return <Coins className={className} aria-hidden="true" />;
  return <CandlestickChart className={className} aria-hidden="true" />;
}

/**
 * Header trigger replacing the legacy fake Demo Wallet button.
 * Never displays simulated demo balances as connected wallet balances.
 */
export function WalletHubHeaderButton() {
  const { hydrated, near, evm, solana, hyperliquid, connectedAccounts, openHub } = useWalletHub();

  const nearConnected = hydrated && near.status === "connected" && Boolean(near.accountId);
  const extraCount = hydrated
    ? connectedAccounts.filter((acc) => acc.ecosystem !== "near").length
    : 0;
  const anyWarning =
    hydrated &&
    ((near.status === "connected" && near.unsupportedNetwork) ||
      (evm.status === "connected" && evm.unsupportedChain) ||
      (solana.status === "connected" && solana.unsupportedCluster));

  let buttonText = "Connect Wallet";
  let ariaLabel = "Open multichain wallet hub (NEAR Testnet primary)";
  if (hydrated && nearConnected && near.accountId) {
    buttonText = abbreviateAddress(near.accountId);
    ariaLabel = `Connected NEAR Testnet wallet ${near.accountId}. Open wallet hub`;
  } else if (hydrated && connectedAccounts.length > 0) {
    buttonText = connectedAccounts[0].abbreviatedAddress;
    ariaLabel = `${connectedAccounts.length} secondary wallet connected. Connect NEAR Testnet in wallet hub`;
  } else if (hydrated && (evm.isSwitchingChain || near.status === "connecting")) {
    buttonText = "Connecting…";
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={nearConnected ? "outline" : "default"}
      onClick={() => openHub(nearConnected ? "near" : undefined)}
      aria-label={ariaLabel}
      className={cn(
        "min-h-11 min-w-11 shrink-0 gap-1.5 px-2.5 text-xs sm:min-h-8",
        nearConnected && "border-gain/50 bg-forest/30 hover:bg-forest/50",
        !nearConnected && connectedAccounts.length > 0 && "border-brass/60",
      )}
    >
      {anyWarning ? (
        <AlertTriangle className="size-3.5 shrink-0 text-loss" aria-hidden="true" />
      ) : nearConnected ? (
        <span className="size-2 shrink-0 rounded-full bg-gain" aria-hidden="true" />
      ) : (
        <Wallet className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="hidden max-w-[125px] truncate font-mono sm:inline sm:max-w-[165px]">{buttonText}</span>
      <span className="inline rounded bg-forest/30 px-1.5 py-1 font-mono text-[10px] uppercase tracking-wider sm:hidden">
        NEAR
      </span>
      {!nearConnected && connectedAccounts.length === 0 && (
        <span className="hidden rounded bg-forest/30 px-1 py-0.5 font-mono text-[10px] uppercase tracking-wider sm:inline">
          NEAR
        </span>
      )}
      {nearConnected && extraCount > 0 && (
        <span className="hidden rounded bg-muted px-1 py-0.5 font-mono text-[10px] sm:inline">
          +{extraCount}
        </span>
      )}
      {!nearConnected && connectedAccounts.length > 0 && (
        <span className="hidden rounded bg-brass/20 px-1 py-0.5 font-mono text-[10px] text-warning-foreground xl:inline">
          NEAR unset
        </span>
      )}
      {hyperliquid.status === "connected" && nearConnected && (
        <span className="hidden text-[10px] text-muted-foreground 2xl:inline">· HL</span>
      )}
    </Button>
  );
}

const SECONDARY_TABS: { id: Exclude<WalletEcosystem, "near">; label: string; tag: string }[] = [
  { id: "evm", label: "EVM Testnets", tag: "4 chains" },
  { id: "solana", label: "Solana Devnet", tag: "Kit / Std" },
  { id: "hyperliquid", label: "Hyperliquid Core", tag: "Venue API" },
];

export function WalletHubPanels({
  compact = false,
  onConnectNear,
}: {
  compact?: boolean;
  onConnectNear?: (walletId?: string) => void;
}) {
  const {
    hydrated,
    primaryProtocolNetwork,
    selectedEcosystem,
    setSelectedEcosystem,
    near,
    evm,
    solana,
    hyperliquid,
    connectedAccounts,
    supportedEvmChains,
    hasWalletConnectProjectId,
    connectNear,
    disconnectNear,
    connectEvm,
    disconnectEvm,
    switchEvmChain,
    connectSolana,
    disconnectSolana,
    connectHyperliquid,
    disconnectHyperliquid,
    refreshHyperliquidSummary,
    disconnectAccount,
    clearError,
  } = useWalletHub();

  const activeSecondaryTab: Exclude<WalletEcosystem, "near"> =
    selectedEcosystem === "near" ? "evm" : selectedEcosystem;
  const nearPerpsTrader = usePerpsTraderSnapshot(
    hydrated && near.status === "connected" && !near.unsupportedNetwork ? near.accountId : null,
  );

  return (
    <div className="min-w-0 space-y-5">
      {/* Explicit Protocol Network Priority & Demo Isolation Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gain/40 bg-forest/20 px-3.5 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="gain">Primary Execution: {primaryProtocolNetwork.name}</Pill>
          <span className="text-muted-foreground">
            {connectedAccounts.length === 0
              ? "No real wallets connected yet."
              : `${connectedAccounts.length} active wallet ${connectedAccounts.length === 1 ? "session" : "sessions"}`}
          </span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          Testnets / Devnet only · Zero txs signed on connect
        </span>
      </div>

      {/* Section A: NEAR Testnet Featured Primary Area */}
      <section
        aria-labelledby="wallet-near-primary-heading"
        className="rounded-lg border-2 border-gain/45 bg-card p-4 shadow-soft"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid size-7 place-items-center rounded-full bg-forest text-mint">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <h2 id="wallet-near-primary-heading" className="font-display text-lg font-semibold">
                NEAR Testnet
              </h2>
              <Pill tone="gain">PRIMARY</Pill>
              <Pill tone="info">ROASTAKE EXECUTION NETWORK</Pill>
            </div>
            <p className="text-xs text-muted-foreground">
              Live deployed contracts:{" "}
              <Link
                to="/app/perps/$market"
                params={{ market: MARKET_ARABICA_URL_SLUG }}
                className="font-mono text-foreground underline underline-offset-2"
              >
                {PERPS_CONTRACT_ID}
              </Link>{" "}
              (Arabica Perpetuals · Circle USDC) &amp;{" "}
              <Link
                to="/app/oracle"
                className="font-mono text-foreground underline underline-offset-2"
              >
                {ORACLE_CONTRACT_ID}
              </Link>{" "}
              (IMF &amp; Gesha oracle).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hydrated && near.status === "connected" && near.accountId ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => disconnectNear()}
                className="min-h-9 gap-1.5"
              >
                <Power className="size-3.5" aria-hidden="true" />
                <span>Disconnect NEAR</span>
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => (onConnectNear ?? connectNear)()}
                disabled={!hydrated || near.status === "connecting"}
                className="min-h-9 gap-1.5"
              >
                <Sparkles className="size-3.5" aria-hidden="true" />
                <span>{near.status === "connecting" ? "Connecting…" : "Connect NEAR Wallet"}</span>
              </Button>
            )}
          </div>
        </div>

        {near.error && (
          <Alert variant="destructive" className="mt-3">
            <AlertTriangle className="size-4" aria-hidden="true" />
            <AlertTitle>NEAR Testnet wallet notice</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span>{near.error}</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => clearError("near")}>
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {hydrated && near.status === "connected" && near.accountId ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background/60 px-3.5 py-2.5">
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <CheckCircle2 className="size-3.5 text-gain" aria-hidden="true" />
                <span className="font-mono text-sm font-semibold">{near.accountId}</span>
                <CopyAddressButton
                  value={near.accountId}
                  label={`Copy NEAR Testnet account ${near.accountId}`}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Provider: <strong className="text-foreground">{near.providerName}</strong> ·
                Network: <span className="font-mono">{near.networkId}</span> · Abbreviated:{" "}
                <span className="font-mono">{abbreviateAddress(near.accountId)}</span>
              </p>
              {nearPerpsTrader.data && (
                <p className="text-xs text-muted-foreground num">
                  Circle Testnet USDC:{" "}
                  <strong className="text-foreground">
                    {formatFixedPoint(nearPerpsTrader.data.circleUsdcBalanceUnits, 6, {
                      maxFractionDigits: 4,
                    })}{" "}
                    USDC
                  </strong>{" "}
                  · Perps Free Margin:{" "}
                  <strong className="text-foreground">
                    {nearPerpsTrader.data.account
                      ? formatUsdE8(nearPerpsTrader.data.account.free_collateral_e8)
                      : nearPerpsTrader.data.isRegistered
                        ? "$0.000000"
                        : "Unregistered (0.05 NEAR)"}
                  </strong>
                </p>
              )}
            </div>
            <Pill tone={near.unsupportedNetwork ? "loss" : "gain"}>
              {near.unsupportedNetwork ? "Wrong NEAR network" : "NEAR Testnet active"}
            </Pill>
          </div>
        ) : (
          <div className="mt-3 space-y-2 rounded-md border border-dashed px-3.5 py-2.5 text-xs text-muted-foreground">
            <p>
              Connect through the{" "}
              <strong className="text-foreground">NEAR Testnet wallet selector</strong> powered by
              @hot-labs/near-connect. Available providers depend on its current Testnet manifest;
              HOT Wallet support is not implied. No access-key or on-chain transaction is submitted
              on connect.
            </p>
            {near.availableWallets.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px]">Discovered wallets:</span>
                {near.availableWallets.slice(0, 6).map((w) => (
                  <Button
                    key={w.id}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => (onConnectNear ?? connectNear)(w.id)}
                  >
                    {w.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Section B: Active Connected Accounts Inventory */}
      {hydrated && connectedAccounts.length > 0 && (
        <section aria-labelledby="connected-accounts-heading" className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="connected-accounts-heading" className="text-sm font-semibold">
              Connected Wallets &amp; Venues ({connectedAccounts.length})
            </h2>
            <span className="text-[11px] text-muted-foreground">
              Independent sessions · Disconnect any account individually
            </span>
          </div>

          <ul className="space-y-2">
            {connectedAccounts.map((acc) => (
              <li
                key={acc.id}
                className={cn(
                  "rounded-lg border bg-card/80 p-3 text-xs",
                  acc.unsupportedNetwork && "border-loss/60",
                  acc.isPrimaryProtocolNetwork && "border-gain/40",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <EcosystemIcon
                        ecosystem={acc.ecosystem}
                        className="size-3.5 text-accent-foreground"
                      />
                      <span className="font-semibold text-foreground">{acc.ecosystemLabel}</span>
                      <span className="text-muted-foreground">· {acc.providerName}</span>
                      {acc.isPrimaryProtocolNetwork && <Pill tone="gain">Primary Execution</Pill>}
                      {acc.isExternalVenue && <Pill tone="warn">External Venue</Pill>}
                      {!acc.isPrimaryProtocolNetwork && !acc.isExternalVenue && (
                        <Pill tone={acc.unsupportedNetwork ? "loss" : "muted"}>
                          {acc.unsupportedNetwork ? "Unsupported Network" : "Connected Identity"}
                        </Pill>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono font-medium text-foreground">
                        {acc.abbreviatedAddress}
                      </span>
                      <CopyAddressButton
                        value={acc.address}
                        label={`Copy ${acc.ecosystemLabel} address ${acc.address}`}
                      />
                      <span className="text-muted-foreground">
                        · Active: {acc.activeNetworkName}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground">{acc.deploymentNote}</p>
                    {acc.unsupportedReason && (
                      <p role="alert" className="text-[11px] font-medium text-loss">
                        {acc.unsupportedReason}
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => disconnectAccount(acc.ecosystem)}
                    className="min-h-8 shrink-0 gap-1 text-xs"
                    aria-label={`Disconnect ${acc.ecosystemLabel} wallet ${acc.abbreviatedAddress}`}
                  >
                    <Power className="size-3" aria-hidden="true" />
                    <span>Disconnect</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Section C: Secondary Ecosystems & External Trading Venue */}
      <section aria-labelledby="secondary-wallets-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="secondary-wallets-heading" className="text-sm font-semibold">
            Secondary Chains &amp; External Venue
          </h2>
          <span className="text-[11px] text-muted-foreground">
            Secondary connections never replace NEAR as primary execution network
          </span>
        </div>

        <details className="rounded-lg border bg-muted/20 p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Advanced networks · EVM, Solana and Hyperliquid
          </summary>
          <div className="mt-3 space-y-4">
            <div role="tablist" aria-label="Secondary wallet ecosystems" className="flex flex-wrap gap-2">
          {SECONDARY_TABS.map((tab) => {
            const active = activeSecondaryTab === tab.id;
            return (
              <Button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                size="sm"
                variant={active ? "default" : "outline"}
                onClick={() => setSelectedEcosystem(tab.id)}
                className="min-h-9 gap-1.5 text-xs"
              >
                <EcosystemIcon ecosystem={tab.id} className="size-3.5" />
                <span>{tab.label}</span>
                <span className="rounded bg-background/40 px-1 py-0.5 font-mono text-[10px]">
                  {tab.tag}
                </span>
              </Button>
            );
          })}
            </div>

        {/* EVM Testnets Panel (including HyperEVM Chain ID 998) */}
        {activeSecondaryTab === "evm" && (
          <div
            role="tabpanel"
            aria-label="EVM Testnets"
            className="space-y-3 rounded-lg border bg-card p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">
                  EVM Testnet Wallets (Ethereum Sepolia · Base Sepolia · Arbitrum Sepolia · HyperEVM
                  998)
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Identity and chain verification only. No ROASTAKE contracts are deployed on EVM
                  chains. HyperEVM (Chain 998) is distinct from Hyperliquid Core API.
                </p>
              </div>
              {evm.status === "connected" && (
                <Button type="button" size="sm" variant="outline" onClick={() => disconnectEvm()}>
                  Disconnect EVM
                </Button>
              )}
            </div>

            {evm.error && (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" aria-hidden="true" />
                <AlertTitle>EVM wallet error</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span>{evm.error}</span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => clearError("evm")}>
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {evm.status === "connected" && evm.unsupportedChain && (
              <Alert variant="destructive">
                <ShieldAlert className="size-4" aria-hidden="true" />
                <AlertTitle>Unsupported EVM network ({evm.chainName})</AlertTitle>
                <AlertDescription className="text-xs">
                  Approve a manual switch below to Ethereum Sepolia (11155111), Base Sepolia
                  (84532), Arbitrum Sepolia (421614), or HyperEVM Testnet (998). Networks are never
                  switched silently.
                </AlertDescription>
              </Alert>
            )}

            {evm.status === "connected" && evm.address ? (
              <div className="space-y-3 rounded-md border bg-background/50 p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono font-semibold">{evm.address}</span>
                    <CopyAddressButton
                      value={evm.address}
                      label={`Copy EVM address ${evm.address}`}
                    />
                  </div>
                  <Pill tone={evm.unsupportedChain ? "loss" : "info"}>
                    {evm.chainName} ({evm.chainId})
                  </Pill>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Switch approved EVM testnet (requires wallet approval):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {supportedEvmChains.map((net) => {
                      const isCurrent = evm.chainId === net.chainId;
                      return (
                        <Button
                          key={net.id}
                          type="button"
                          size="sm"
                          variant={isCurrent ? "default" : "outline"}
                          disabled={isCurrent || evm.isSwitchingChain}
                          onClick={() => switchEvmChain(net.chainId as EvmTestnetId)}
                          className="h-8 text-xs"
                        >
                          {net.shortName} ({net.chainId})
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex flex-wrap gap-2">
                  {evm.connectors.map((c) => (
                    <Button
                      key={c.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!hydrated || evm.status === "connecting"}
                      onClick={() => connectEvm(c.id)}
                      className="min-h-9 gap-1.5 text-xs"
                    >
                      <Layers className="size-3.5" aria-hidden="true" />
                      <span>Connect {c.name}</span>
                    </Button>
                  ))}
                </div>
                {!hasWalletConnectProjectId && (
                  <p className="text-[11px] text-muted-foreground">
                    Browser-injected wallets work immediately. WalletConnect QR is hidden until{" "}
                    <span className="font-mono">VITE_WALLETCONNECT_PROJECT_ID</span> is configured.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Solana Devnet Panel */}
        {activeSecondaryTab === "solana" && (
          <div
            role="tabpanel"
            aria-label="Solana Devnet"
            className="space-y-3 rounded-lg border bg-card p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">
                  Solana Devnet (Solana Kit + Wallet Standard)
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Connects Wallet Standard extensions targeting{" "}
                  <span className="font-mono">solana:devnet</span>. Identity verification only — no
                  ROASTAKE contracts deployed on Solana Devnet.
                </p>
              </div>
              {solana.status === "connected" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => disconnectSolana()}
                >
                  Disconnect Solana
                </Button>
              )}
            </div>

            {solana.error && (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" aria-hidden="true" />
                <AlertTitle>Solana Devnet wallet notice</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span>{solana.error}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => clearError("solana")}
                  >
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {solana.status === "connected" && solana.address ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background/50 p-3 text-xs">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono font-semibold">{solana.address}</span>
                    <CopyAddressButton
                      value={solana.address}
                      label={`Copy Solana Devnet address ${solana.address}`}
                    />
                  </div>
                  <p className="text-muted-foreground">
                    Provider: <strong className="text-foreground">{solana.providerName}</strong> ·
                    Cluster: <span className="font-mono">solana:devnet</span>
                  </p>
                </div>
                <Pill tone={solana.unsupportedCluster ? "loss" : "info"}>
                  {solana.unsupportedCluster ? "Cluster unsupported" : "Solana Devnet"}
                </Pill>
              </div>
            ) : solana.availableWallets.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {solana.availableWallets.map((w) => (
                  <Button
                    key={w.name}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={solana.status === "connecting"}
                    onClick={() => connectSolana(w.name)}
                    className="min-h-9 gap-1.5 text-xs"
                  >
                    <Coins className="size-3.5" aria-hidden="true" />
                    <span>Connect {w.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {w.supportsDevnet ? "devnet" : "no-devnet"}
                    </span>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="space-y-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                <p>No Wallet Standard Solana wallet detected yet in this browser session.</p>
                <Button type="button" size="sm" variant="outline" onClick={() => connectSolana()}>
                  Check for Solana wallet
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Hyperliquid Testnet Core Venue Panel */}
        {activeSecondaryTab === "hyperliquid" && (
          <div
            role="tabpanel"
            aria-label="Hyperliquid Testnet Core"
            className="space-y-3 rounded-lg border border-brass/35 bg-card p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">Hyperliquid Testnet Core</h3>
                  <Pill tone="warn">External Venue · Not HyperEVM</Pill>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Official Testnet Core API (
                  <span className="font-mono">{HYPERLIQUID_TESTNET_API_URL}</span>), separate from
                  HyperEVM (Chain ID 998). Uses an associated EVM address strictly for read-only
                  account inspection. Zero order signing or API/agent wallet creation.
                </p>
              </div>
              {hyperliquid.status === "connected" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={hyperliquid.isLoadingSummary}
                    onClick={() => refreshHyperliquidSummary()}
                    className="gap-1.5"
                  >
                    <RefreshCw
                      className={cn("size-3.5", hyperliquid.isLoadingSummary && "animate-spin")}
                      aria-hidden="true"
                    />
                    <span>Refresh</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => disconnectHyperliquid()}
                  >
                    Disconnect Venue
                  </Button>
                </div>
              )}
            </div>

            {hyperliquid.error && (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" aria-hidden="true" />
                <AlertTitle>Hyperliquid Testnet Core notice</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span>{hyperliquid.error}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => clearError("hyperliquid")}
                  >
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {hyperliquid.status === "connected" && hyperliquid.associatedEvmAddress ? (
              <div className="space-y-3 rounded-md border bg-background/50 p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link2 className="size-3.5 text-highlight" aria-hidden="true" />
                    <span className="font-mono font-semibold">
                      {hyperliquid.associatedEvmAddress}
                    </span>
                    <CopyAddressButton
                      value={hyperliquid.associatedEvmAddress}
                      label={`Copy Hyperliquid EVM address ${hyperliquid.associatedEvmAddress}`}
                    />
                  </div>
                  <Pill tone="info">Read-only venue inspection</Pill>
                </div>

                {hyperliquid.summary ? (
                  <dl className="grid gap-2 border-t pt-2.5 sm:grid-cols-4">
                    <div>
                      <dt className="text-[11px] text-muted-foreground">Account value</dt>
                      <dd className="num font-semibold">${hyperliquid.summary.accountValueUsd}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-muted-foreground">Withdrawable</dt>
                      <dd className="num font-semibold">${hyperliquid.summary.withdrawableUsd}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-muted-foreground">Margin used</dt>
                      <dd className="num font-semibold">
                        ${hyperliquid.summary.totalMarginUsedUsd}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-muted-foreground">Perp pos / Spot tokens</dt>
                      <dd className="num font-semibold">
                        {hyperliquid.summary.openPositionCount} /{" "}
                        {hyperliquid.summary.spotBalanceCount}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-muted-foreground">
                    {hyperliquid.isLoadingSummary
                      ? "Querying official Hyperliquid Testnet Core /info endpoint…"
                      : "Read-only account summary unavailable."}
                  </p>
                )}
              </div>
            ) : evm.status === "connected" && evm.address ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed p-3 text-xs">
                <span className="text-muted-foreground">
                  Associate EVM identity{" "}
                  <span className="font-mono text-foreground">
                    {abbreviateAddress(evm.address)}
                  </span>{" "}
                  with Hyperliquid Testnet Core (read-only `/info` query).
                </span>
                <Button type="button" size="sm" onClick={() => connectHyperliquid()}>
                  Associate Hyperliquid Core
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed p-3 text-xs">
                <span className="text-muted-foreground">
                  Connect an EVM wallet first to inspect a Hyperliquid Testnet Core account.
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedEcosystem("evm")}
                >
                  Open EVM Tab
                </Button>
              </div>
            )}
          </div>
        )}
          </div>
        </details>
      </section>

      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
          <span>
            Connection-only boundaries: no token approvals, transaction signing, agent wallets, or
            OutLayer triggers occur here.
          </span>
          <div className="flex flex-wrap gap-3">
            <Link to="/app/oracle" className="inline-flex items-center gap-1 underline">
              <Activity className="size-3.5" aria-hidden="true" />
              Coffee Oracle (Testnet)
            </Link>
            <Link to="/app/wallet" className="inline-flex items-center gap-1 underline">
              Wallet Hub &amp; Demo Env
              <ExternalLink className="size-3" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/** Accessible Radix Modal hosting the Unified Wallet Hub from header triggers. */
export function WalletHubDialog() {
  const { isHubOpen, openHub, closeHub, connectNear } = useWalletHub();
  const [isNearHandoff, setIsNearHandoff] = useState(false);

  async function handOffNearConnection(walletId?: string) {
    // near-connect portals its selector/provider UI directly into document.body.
    // Fully unmount Radix (including its exit animation) before opening that UI:
    // otherwise Dialog's pointer lock and focus trap make provider cards inert.
    flushSync(() => setIsNearHandoff(true));
    try {
      await connectNear(walletId);
    } finally {
      // Restore the hub to show either the connected account or explicit error.
      setIsNearHandoff(false);
    }
  }

  if (isNearHandoff) return null;

  return (
    <Dialog open={isHubOpen} onOpenChange={(next) => (next ? openHub() : closeHub())}>
      <DialogContent className="grid-cols-1 w-[calc(100vw-1rem)] max-h-[88vh] max-w-3xl overflow-y-auto overflow-x-hidden p-4 text-foreground sm:w-full sm:p-6">
        <DialogHeader className="min-w-0 pr-6 text-left">
          <DialogTitle className="flex flex-wrap items-center gap-2 font-display text-xl">
            <span>ROASTAKE Multichain Wallet Hub</span>
            <Pill tone="gain">NEAR-First · Testnet Only</Pill>
          </DialogTitle>
          <DialogDescription>
            Connect and verify real testnet accounts across NEAR (primary execution), EVM testnets,
            Solana Devnet, and Hyperliquid Testnet Core without touching simulated demo balances.
          </DialogDescription>
        </DialogHeader>
        <WalletHubPanels compact onConnectNear={handOffNearConnection} />
      </DialogContent>
    </Dialog>
  );
}
