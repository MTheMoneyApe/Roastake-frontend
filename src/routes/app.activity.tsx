import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { AppShell } from '@/components/shell';
import { ActivityList } from '@/components/coffee/overview';
import { PageHeader, Panel, DemoBadge } from '@/components/kit';
import { TxStatusPanel } from '@/components/perps/tx-status-panel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useRefreshPerpsQueries } from '@/lib/perps/queries';
import { useWalletHub } from '@/lib/wallet/context';
import { seo } from '@/lib/seo';

export const Route = createFileRoute('/app/activity')({
  head: () =>
    seo(
      'Activity',
      'Inspect live NEAR Testnet Perpetuals transactions, M04.6-G verification proof, and isolated simulated coffee demo events.',
    ),
  component: Page,
});

function Page() {
  const [category, setCategory] = useState('All');
  const { near } = useWalletHub();
  const refreshAll = useRefreshPerpsQueries(near.accountId);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          demo={false}
          title="Activity & On-Chain Proof"
          subtitle="Live NEAR Testnet receipts, demo coffee orders and local activity — clearly separated by source."
          crumbs={[{ label: 'Dashboard', to: '/app/dashboard' }, { label: 'Orders & Activity' }]}
          actions={
            <Button size="sm" variant="outline" asChild>
              <Link to="/orders">Demo orders</Link>
            </Button>
          }
        />

        <TxStatusPanel onAfterVerify={() => void refreshAll()} />

        <details className="group overflow-hidden rounded-lg border bg-card">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
            <span>
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                Simulated Coffee DeFi Activity &amp; Fees
                <DemoBadge>DEMO LOGS ONLY</DemoBadge>
              </span>
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">Browser-only events · not NEAR transactions</span>
            </span>
            <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="space-y-3 border-t p-4">
            <div className="flex justify-end">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger aria-label="Activity category" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['All', 'Assets', 'Swap', 'Roasting', 'Redemption', 'Marketplace', 'Fees'].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ActivityList category={category} />
          </div>
        </details>
      </div>
    </AppShell>
  );
}
