import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AppShell } from '@/components/shell';
import { LotDetail, LotSelect } from '@/components/coffee/lots';
import { useDemo } from '@/lib/demo/store';
import { seo } from '@/lib/seo';
import { useState } from 'react';
export const Route = createFileRoute('/app/coffee-passport')({
  validateSearch: z.object({ lot: z.string().optional() }),
  head: () => seo('Coffee Passport — Demo data', 'Illustrative sample lot records only. No physical custody, producer identity or supply-chain claims are independently verified.'),
  component: Page,
});
function Page() {
  const s = useDemo(); const search = Route.useSearch(); const [selected, setSelected] = useState(search.lot ?? s.lots[0]?.id ?? '');
  return <AppShell><div className="mb-6 max-w-xl"><LotSelect value={selected} onChange={setSelected} lots={s.lots} label="Passport lot"/></div><LotDetail id={selected} passport/></AppShell>;
}
