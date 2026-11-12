import { Link, useParams } from "@tanstack/react-router";
import { PageHeader, MaturityBadge, Empty } from "@/components/kit";
import { Button } from "@/components/ui/button";

function titleize(s: string) {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ModulePage({ path }: { path: string }) {
  const params = useParams({ strict: false }) as Record<string, string | undefined>;
  const segments = path
    .split("/")
    .filter(Boolean)
    .map((seg) => (seg.startsWith("$") ? params[seg.slice(1)] ?? seg.slice(1) : seg));
  const title = titleize(segments[segments.length - 1] ?? "Overview");
  const crumbs = segments.slice(0, -1).map((s) => ({ label: titleize(s) }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        demo={false}
        subtitle="Planned module preview · not deployed yet. No live smart contracts, yields, or real transactions run here."
        crumbs={crumbs}
        actions={<MaturityBadge variant="preview">PREVIEW · PLANNED</MaturityBadge>}
      />
      <Empty
        text="This module is part of the planned ROASTAKE ecosystem roadmap and is not yet operational on NEAR Testnet."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/app/perps">Perpetuals (NEAR Testnet)</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/oracle">Coffee Oracle (Testnet)</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/wallet">Wallet Hub</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/app/assets">Coffee assets</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
