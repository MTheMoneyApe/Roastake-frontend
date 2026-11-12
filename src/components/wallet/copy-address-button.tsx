// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { AlertTriangle, Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Accessible clipboard copy control following `modern-web-guidance` copy-button patterns:
 * keeps the button enabled during feedback so keyboard focus is never dropped, places
 * `role="status"` outside the button, and cleans up pending timers cleanly.
 */
export function CopyAddressButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const lastMsgRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleCopy() {
    if (timerRef.current) clearTimeout(timerRef.current);
    let ok = false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        ok = true;
      }
    } catch {
      ok = false;
    }

    const base = ok ? "Copied" : "Copy failed";
    // Append a non-breaking space when repeating identically so VoiceOver re-announces.
    const nextAnnouncement = base === lastMsgRef.current ? `${base}\u00A0` : base;
    lastMsgRef.current = nextAnnouncement;

    setCopyState(ok ? "copied" : "failed");
    setStatusMessage(nextAnnouncement);

    timerRef.current = setTimeout(() => {
      setCopyState("idle");
      setStatusMessage("");
    }, 2000);
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        aria-label={label}
        className="min-h-7 min-w-7 size-7 rounded-md text-muted-foreground hover:text-foreground"
        data-copied={copyState === "copied" ? "" : undefined}
        data-failed={copyState === "failed" ? "" : undefined}
      >
        {copyState === "copied" ? (
          <Check className="size-3.5 text-gain" aria-hidden="true" />
        ) : copyState === "failed" ? (
          <AlertTriangle className="size-3.5 text-loss" aria-hidden="true" />
        ) : (
          <Copy className="size-3.5" aria-hidden="true" />
        )}
      </Button>
      <span
        role="status"
        className={cn(
          "text-[11px] font-medium transition-opacity",
          copyState === "idle" ? "sr-only" : copyState === "copied" ? "text-gain" : "text-loss",
        )}
      >
        {statusMessage}
      </span>
    </span>
  );
}
