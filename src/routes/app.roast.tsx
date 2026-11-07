import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/shell';
import { RoastPage } from '@/components/coffee/simulations';
import { seo } from '@/lib/seo';
import { z } from 'zod';

export const Route = createFileRoute('/app/roast')({
  validateSearch: z.object({ lot: z.string().optional() }),
  head: () => seo('Roasting Lab', 'Simulate green-to-roasted coffee conversion with recorded yield, loss and fees.'),
  component: Page,
});
function Page() { return <AppShell><RoastPage initialLot={Route.useSearch().lot}/></AppShell>; }
