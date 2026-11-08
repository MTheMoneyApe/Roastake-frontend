import { Link, useParams } from "@tanstack/react-router";
import { PageHeader, DemoBadge, Empty } from "@/components/kit";
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
      <PageHeader title={title} subtitle="Coming soon · not implemented in this MVP." crumbs={crumbs} actions={<DemoBadge/>}/>
      <Empty text="No actions, real services or transactions are available here." action={<div className="flex flex-wrap justify-center gap-3"><Button asChild><Link to="/app/assets">Explore coffee assets</Link></Button><Button asChild variant="outline"><Link to="/market">Coffee marketplace</Link></Button></div>}/>
    </div>
  );
}
