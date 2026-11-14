// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Compass, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaturityBadge, Panel, Pill } from "@/components/kit";
import {
  MARKET_ARABICA_URL_SLUG,
  PERPS_CONTRACT_ID,
  TESTNET_NON_MONETARY_NOTICE,
} from "@/lib/perps/config";
import { evaluatePerpsOracleStatus, formatBpsAsPercent, formatUsdE8 } from "@/lib/perps/math";
import type { PerpsProtocolSnapshot } from "@/lib/perps/types";

interface WalkthroughStep {
  stepNumber: number;
  title: string;
  classification:
    "REAL ON-CHAIN" | "SYNTHETIC ORACLE" | "PREVIEW" | "PLANNED" | "NON-MONETARY TESTNET";
  badgeVariant: "real" | "testnet" | "preview" | "demo";
  routeTo: string;
  routeLabel: string;
  summary: string;
  whatToVerify: string;
}

const WALKTHROUGH_STEPS: readonly WalkthroughStep[] = [
  {
    stepNumber: 1,
    title: "Multichain Wallet Hub & NEAR Priority",
    classification: "REAL ON-CHAIN",
    badgeVariant: "real",
    routeTo: "/app/wallet",
    routeLabel: "Open Wallet Hub",
    summary:
      "Connect a supported NEAR Testnet wallet using the current provider selector, with NEAR as the primary execution network ahead of secondary test-network identities.",
    whatToVerify:
      "Connection stays identity-only (no automatic access-key signing transaction). Cross-chain wallets display as identity-only without fake bridging.",
  },
  {
    stepNumber: 2,
    title: "Live Circle Testnet USDC & NEP-145 Storage",
    classification: "NON-MONETARY TESTNET",
    badgeVariant: "testnet",
    routeTo: `/app/perps/${MARKET_ARABICA_URL_SLUG}`,
    routeLabel: "Inspect Margin Panel",
    summary:
      "Reads real 6-decimal Circle Native Testnet USDC (3e2210e1...) balance and NEP-145 storage registration directly from NEAR Testnet RPC.",
    whatToVerify:
      "Displays live ft_balance_of and storage_balance_of plus clear Circle Testnet USDC non-monetary disclosure.",
  },
  {
    stepNumber: 3,
    title: "Perpetuals Contract & LP Vault Live Health",
    classification: "REAL ON-CHAIN",
    badgeVariant: "real",
    routeTo: "/app/perps",
    routeLabel: "Open Three-Market Hub",
    summary:
      "Queries perps-v1.roastake-dev-mta.testnet pinned to a single finalized NEAR block for admin, solvency invariant, LP equity, and 10,000 locked seed shares.",
    whatToVerify:
      "verify_solvency_invariant() is true, utilization is bounded below 75% max cap, and zero general LP deposit/withdraw buttons are exposed in MVP.",
  },
  {
    stepNumber: 4,
    title: "Three-Market Coffee Experience",
    classification: "REAL ON-CHAIN",
    badgeVariant: "real",
    routeTo: "/app/perps",
    routeLabel: "Compare 3 Coffee Markets",
    summary:
      "Separates LIVE TESTNET COFFEE-ARABICA-TESTNET/USD, COFFEE-ROBUSTA-TESTNET/USD (COFFEE-ROBUSTA) & COFFEE-GESHA-TESTNET/USD (COFFEE-GESHA) on isolated feeds.",
    whatToVerify:
      "Arabica, Robusta and Gesha each maintain independent oracle sequences, prices, charts and open interest without cross-market contamination.",
  },
  {
    stepNumber: 5,
    title: "Register Trader Account (0.05 NEAR)",
    classification: "REAL ON-CHAIN",
    badgeVariant: "real",
    routeTo: `/app/perps/${MARKET_ARABICA_URL_SLUG}`,
    routeLabel: "Open Registration Flow",
    summary:
      "New NEAR Testnet wallets call register_account with 0.05 NEAR refundable storage via pre-signature review modal and FINAL receipt verification.",
    whatToVerify:
      "Unregistered traders see an explicit registration prompt before depositing USDC and never silently lose transfers.",
  },
  {
    stepNumber: 6,
    title: "Deposit Circle USDC Collateral (ft_transfer_call)",
    classification: "REAL ON-CHAIN",
    badgeVariant: "real",
    routeTo: `/app/perps/${MARKET_ARABICA_URL_SLUG}`,
    routeLabel: "Inspect Deposit Form",
    summary:
      'Calls Circle USDC ft_transfer_call targeting perps-v1.roastake-dev-mta.testnet with exact memo {"action":"trader_collateral"} and 1 yoctoNEAR.',
    whatToVerify:
      'RPC verifier explicitly checks ft_resolve_transfer for "0" refunds so failed deposits are never misreported as successful.',
  },
  {
    stepNumber: 7,
    title: "BigInt Fixed-Point Order Preview & Guards",
    classification: "SYNTHETIC ORACLE",
    badgeVariant: "testnet",
    routeTo: `/app/perps/${MARKET_ARABICA_URL_SLUG}`,
    routeLabel: "Test Order Preview",
    summary:
      "Computes 10^8 internal USD notional, 20% Initial Margin (5x max leverage; default ticket uses $0.25 at 4.00x), spread, 10 bps fee, LP utilization (<=75%), and indicative liquidation price using pure BigInt math.",
    whatToVerify:
      "Stale synthetic oracle ticks (>300s) or insufficient LP liquidity immediately block open orders with actionable explanations.",
  },
  {
    stepNumber: 8,
    title: "Open Position Execution & 8-State Tracker",
    classification: "REAL ON-CHAIN",
    badgeVariant: "real",
    routeTo: `/app/perps/${MARKET_ARABICA_URL_SLUG}`,
    routeLabel: "Inspect Order Execution",
    summary:
      "Submits open_position on COFFEE-ARABICA-TESTNET/USD through an explicit 8-state tracker without silent auto-retries on timeout.",
    whatToVerify:
      "Handles user rejection, timeout exhaustion, wallet disconnect, and RPC ambiguity without duplicating orders.",
  },
  {
    stepNumber: 9,
    title: "Position Health & Indicative Liquidation Monitor",
    classification: "SYNTHETIC ORACLE",
    badgeVariant: "testnet",
    routeTo: `/app/positions`,
    routeLabel: "View Positions Monitor",
    summary:
      "Reads get_positions_by_owner and get_position_health for live Unrealized PnL, net funding, equity, margin ratio (vs 8.00% MM), and indicative liquidation price.",
    whatToVerify:
      "Clearly labels liquidation price as indicative (actual on-chain liquidation uses full MTM equity + accrued funding).",
  },
  {
    stepNumber: 10,
    title: "Close Position & ReduceOnly Resilience",
    classification: "REAL ON-CHAIN",
    badgeVariant: "real",
    routeTo: `/app/perps/${MARKET_ARABICA_URL_SLUG}`,
    routeLabel: "Inspect Close Control",
    summary:
      "Executes close_position cleanly via confirmation dialog even if the market enters ReduceOnly or new opens are halted by age limits.",
    whatToVerify:
      "Close button stays available so existing traders can always exit positions under ReduceOnly mode.",
  },
  {
    stepNumber: 11,
    title: "Withdraw Collateral, Async Callback & Verified Proof",
    classification: "PLANNED",
    badgeVariant: "demo",
    routeTo: `/app/activity`,
    routeLabel: "Inspect Activity & M04.6-G Proof",
    summary:
      'Verifies async withdraw_collateral callback events ("settled" vs "restored") alongside auditable M04.6-G hybrid Admin (CLI) + Trader (Meteor Wallet) Explorer proof and post-hackathon roadmap.',
    whatToVerify:
      "Mainnet decentralization, independent multi-source coffee price feeds, and automated keeper liquidations are clearly delimited as post-hackathon roadmap.",
  },
] as const;

export function JudgesWalkthrough({
  protocol,
  defaultExpanded = true,
}: {
  protocol?: PerpsProtocolSnapshot;
  defaultExpanded?: boolean;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [expanded, setExpanded] = useState(defaultExpanded);

  const step = WALKTHROUGH_STEPS[stepIdx] ?? WALKTHROUGH_STEPS[0];
  const oracleStatus = protocol
    ? evaluatePerpsOracleStatus(protocol.arabicaMarket, protocol.blockTimestampSec)
    : null;

  return (
    <Panel
      title={
        <span className="flex flex-wrap items-center gap-2">
          <Compass className="size-4 text-primary" aria-hidden="true" />
          <span>Hackathon Demo Walkthrough (11 Verifiable Steps)</span>
          <MaturityBadge variant="testnet">ZERO-TX INSPECTION READY</MaturityBadge>
        </span>
      }
      actions={
        <div className="flex items-center gap-2">
          {protocol && (
            <Pill tone={protocol.solvencyInvariant ? "gain" : "loss"}>
              {protocol.solvencyInvariant ? "On-Chain Solvency OK" : "Solvency Check Alert"}
            </Pill>
          )}
          <Button type="button" size="sm" variant="outline" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Collapse Guide" : "Expand 11-Step Guide"}
          </Button>
        </div>
      }
    >
      {!expanded ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Interactive walkthrough contrasting real on-chain NEAR Testnet execution (
            <code className="font-mono">{PERPS_CONTRACT_ID}</code>), synthetic oracle ticks, and
            multi-market isolation across Arabica, Robusta & Gesha without requiring a signature.
          </span>
          <Button type="button" size="sm" onClick={() => setExpanded(true)}>
            Start Step {step.stepNumber} / {WALKTHROUGH_STEPS.length}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Walkthrough steps">
            {WALKTHROUGH_STEPS.map((item, idx) => (
              <button
                key={item.stepNumber}
                type="button"
                role="tab"
                aria-selected={idx === stepIdx}
                onClick={() => setStepIdx(idx)}
                className={`cursor-pointer rounded border px-2 py-1 text-xs font-mono transition ${
                  idx === stepIdx
                    ? "border-primary bg-primary text-primary-foreground underline underline-offset-4"
                    : "bg-muted/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.stepNumber}
              </button>
            ))}
          </div>

          <div className="rounded-lg border bg-card/60 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  Step {step.stepNumber} / {WALKTHROUGH_STEPS.length}
                </span>
                <h3 className="text-sm font-semibold">{step.title}</h3>
              </div>
              <MaturityBadge variant={step.badgeVariant}>{step.classification}</MaturityBadge>
            </div>

            <p className="text-xs leading-relaxed text-foreground/90">{step.summary}</p>
            <p className="rounded border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <strong className="text-foreground">Judge check:</strong> {step.whatToVerify}
            </p>

            {protocol && (
              <div className="flex flex-wrap items-center gap-3 rounded border border-dashed px-3 py-2 text-[11px] text-muted-foreground">
                <span>
                  Live Contract Snapshot:{" "}
                  <strong className="text-foreground">{protocol.contractId}</strong>
                </span>
                <span>
                  Arabica Price:{" "}
                  <strong className="num text-foreground">
                    {oracleStatus?.priceE8 ? `${formatUsdE8(oracleStatus.priceE8)}/kg` : "No tick"}
                  </strong>
                </span>
                <span>
                  Oracle Status:{" "}
                  <strong className="text-foreground">{oracleStatus?.status ?? "Unknown"}</strong>
                </span>
                <span>
                  LP Utilization:{" "}
                  <strong className="num text-foreground">
                    {formatUsdE8(protocol.lpSnapshot.lp_mtm_equity_e8)} MTM (cap{" "}
                    {formatBpsAsPercent(protocol.arabicaMarket?.risk.max_utilization_bps ?? 7500)})
                  </strong>
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={stepIdx === 0}
                  onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                >
                  <ChevronLeft className="mr-1 size-3.5" aria-hidden="true" />
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={stepIdx === WALKTHROUGH_STEPS.length - 1}
                  onClick={() => setStepIdx((i) => Math.min(WALKTHROUGH_STEPS.length - 1, i + 1))}
                >
                  Next
                  <ChevronRight className="ml-1 size-3.5" aria-hidden="true" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={step.routeTo}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium hover:bg-muted"
                >
                  {step.routeLabel}
                  <ExternalLink className="size-3" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">{TESTNET_NON_MONETARY_NOTICE}</p>
        </div>
      )}
    </Panel>
  );
}
