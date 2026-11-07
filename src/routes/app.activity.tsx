import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AppShell } from '@/components/shell';
import { ActivityList } from '@/components/coffee/overview';
import { PageHeader } from '@/components/kit';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { seo } from '@/lib/seo';
export const Route = createFileRoute('/app/activity')({ head: () => seo('Activity', 'Review simulated coffee token events, conversions, redemptions, purchases and explicit protocol fees.'), component: Page });
function Page() { const [category,setCategory] = useState('All'); return <AppShell><PageHeader title="Activity & fees" subtitle="Simulated records only. Seed entries have dates; new actions include UTC timestamps. Fee entries are distinct from coffee movement." crumbs={[{label:'Dashboard',to:'/app/dashboard'},{label:'Activity'}]}/><Select value={category} onValueChange={setCategory}><SelectTrigger aria-label="Activity category" className="mb-4 w-56"><SelectValue/></SelectTrigger><SelectContent>{['All','Assets','Swap','Roasting','Redemption','Marketplace','Fees'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><ActivityList category={category}/></AppShell>; }
