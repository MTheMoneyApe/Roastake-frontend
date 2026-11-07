import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/shell';
import { LotDetail } from '@/components/coffee/lots';
import { seo } from '@/lib/seo';

export const Route = createFileRoute('/app/assets/$id')({
  head: () => seo('Coffee Lot Details', 'Inspect coffee origin, custody records, token supply and physical kilograms.'),
  component: Page,
});
function Page() { return <AppShell><LotDetail id={Route.useParams().id}/></AppShell>; }
