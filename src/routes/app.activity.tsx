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

        <Panel
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span>Simulated Coffee DeFi Activity & Fees</span>
              <DemoBadge>DEMO LOGS ONLY</DemoBadge>
            </span>
          }
          actions={
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
          }
        >
          <ActivityList category={category} />
        </Panel>
      </div>
    </AppShell>
  );
}
