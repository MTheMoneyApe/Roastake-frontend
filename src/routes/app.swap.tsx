import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/shell';
import { SwapPage } from '@/components/coffee/simulations';
import { seo } from '@/lib/seo';
import { z } from 'zod';

export const Route = createFileRoute('/app/swap')({
  validateSearch: z.object({ lot: z.string().optional() }),
  head: () => seo('Swap', 'Simulate coffee token exchanges with explicit estimated fees and balance updates.'),
  component: Page,
});
function Page() { return <AppShell><SwapPage initialLot={Route.useSearch().lot}/></AppShell>; }
