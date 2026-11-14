// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { OraclePage } from "@/components/coffee/oracle";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/app/oracle")({
  head: () =>
    seo(
      "Coffee Oracle",
      "Read-only OutLayer NEAR Testnet Oracle observations, independent from Perps. Historical IMF monthly benchmarks and synthetic fixtures are source-labelled, not live coffee quotes.",
    ),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <OraclePage />
    </AppShell>
  );
}
