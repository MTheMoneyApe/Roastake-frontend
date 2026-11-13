import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/shell';
import { Dashboard } from '@/components/coffee/overview';
import { seo } from '@/lib/seo';

export const Route = createFileRoute('/app/dashboard')({
  head: () => seo('Dashboard', 'Your simulated portfolio, coffee assets and protocol activity.'),
  component: Page,
});
function Page() { return <AppShell><Dashboard/></AppShell>; }
