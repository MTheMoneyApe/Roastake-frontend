import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/shell';
import { AssetExplorer } from '@/components/coffee/lots';
import { seo } from '@/lib/seo';

export const Route = createFileRoute('/app/assets/')({
  head: () => seo('Coffee Assets', 'Discover lot-specific green and roasted coffee tokens and simulated physical records.'),
  component: Page,
});
function Page() { return <AppShell><AssetExplorer/></AppShell>; }
