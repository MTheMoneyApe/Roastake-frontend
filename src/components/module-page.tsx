import { useParams } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/kit";

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
      <PageHeader title={title} subtitle={`Simulated ${title.toLowerCase()} module.`} crumbs={crumbs} />
      <Panel title={title}>
        <Empty text="This module is part of the demo and will be expanded soon." />
      </Panel>
    </div>
  );
}
