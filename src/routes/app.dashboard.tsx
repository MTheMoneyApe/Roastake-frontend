import { createFileRoute, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/shell';
import { Dashboard } from '@/components/coffee/overview';
import { Button } from '@/components/ui/button';
import { seo } from '@/lib/seo';

export const Route = createFileRoute('/app/dashboard')({
  head: () => seo('Dashboard', 'Your simulated portfolio, coffee assets and protocol activity.'),
  component: Page,
});
function Page() {
  return (
    <AppShell>
      <div className="mb-4 flex justify-end">
        <Button asChild size="sm" variant="outline">
          <Link to="/app/multichain">Network overview</Link>
        </Button>
      </div>
      <Dashboard />
    </AppShell>
  );
}
