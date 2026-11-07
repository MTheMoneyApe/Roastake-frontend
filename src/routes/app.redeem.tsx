import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/shell';
import { RedeemPage } from '@/components/coffee/simulations';
import { seo } from '@/lib/seo';
import { z } from 'zod';

export const Route = createFileRoute('/app/redeem')({
  validateSearch: z.object({ lot: z.string().optional() }),
  head: () => seo('Redeem Coffee', 'Simulate roasted coffee redemption, token burns and reserved physical inventory.'),
  component: Page,
});
function Page() { return <AppShell><RedeemPage initialLot={Route.useSearch().lot}/></AppShell>; }
