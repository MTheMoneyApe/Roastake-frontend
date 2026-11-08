import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DemoBadge, Empty, KV, PageHeader } from '@/components/kit';
import { ProductImage } from '@/components/commerce';
import { cartSummary, fmt, productLineTotal } from '@/lib/demo/calc';
import { demo, useDemo } from '@/lib/demo/store';

function Totals() {
  const s = useDemo(); const q = cartSummary(s);
  return <KV rows={[["Coffee subtotal", `€${fmt(q.subtotal)}`], ["Demo shipping", `€${fmt(q.shipping)} · ${q.shipments} roaster shipment(s)`], ["Total", `€${fmt(q.total)}`]]}/>;
}
function EmptyCart() { return <Empty text="Your demo cart is empty." action={<Button asChild><Link to="/market"><ShoppingBag/>Explore coffees</Link></Button>}/>; }

export function CartPage() {
  const s = useDemo();
  return <div className="space-y-7"><PageHeader title="Your coffee cart" subtitle="Demo inventory · no real purchase or reservation." actions={<DemoBadge/>}/>{!s.cart.length ? <EmptyCart/> : <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]"><section className="divide-y">{s.cart.map((c, i) => {
    const p = s.products.find((p) => p.id === c.productId);
    if (!p) return <div key={i} className="flex items-center justify-between py-4"><p>Unavailable coffee</p><Button variant="ghost" onClick={() => demo.setCartQty(i,0)}>Remove</Button></div>;
    return <article key={`${c.productId}-${c.size}-${c.grind}`} className="flex gap-4 py-5"><Link to="/market/$id" params={{id:p.id}} className="w-24 shrink-0"><ProductImage p={p} className="aspect-square"/></Link><div className="min-w-0 flex-1"><Link to="/market/$id" params={{id:p.id}} className="font-display text-xl">{p.name}</Link><p className="mt-1 text-xs text-muted-foreground">{s.roasters.find((r)=>r.id===p.roasterId)?.name} · {c.size} {p.format==='Capsules'?'caps':'g'} · {c.grind}</p><div className="mt-3 flex flex-wrap items-center gap-2"><Button size="icon" variant="outline" aria-label={`Decrease ${p.name}`} onClick={()=>demo.setCartQty(i,c.qty-1)}><Minus/></Button><span className="num w-8 text-center">{c.qty}</span><Button size="icon" variant="outline" aria-label={`Increase ${p.name}`} onClick={()=>demo.setCartQty(i,c.qty+1)}><Plus/></Button><Button size="icon" variant="ghost" aria-label={`Remove ${p.name}`} onClick={()=>demo.setCartQty(i,0)}><Trash2/></Button></div></div><p className="num shrink-0 text-sm">€{fmt(productLineTotal(s,c))}</p></article>;
  })}</section><aside className="border-t pt-5"><h2 className="mb-3 text-2xl">Order summary</h2><Totals/><Button asChild className="mt-5 w-full"><Link to="/checkout">Demo checkout <ArrowRight/></Link></Button><Button asChild variant="ghost" className="mt-2 w-full"><Link to="/market">Continue shopping</Link></Button></aside></div>}</div>;
}

export function CheckoutPage() {
  const s = useDemo(); const navigate = useNavigate();
  const [name,setName] = useState('Demo Customer'); const [address,setAddress] = useState('Example street, demo city'); const [error,setError] = useState('');
  return <div className="space-y-7"><PageHeader title="Demo checkout" subtitle="No card details, real payment, or shipment. Use fictional delivery details." actions={<DemoBadge>No real charge</DemoBadge>}/>{!s.cart.length ? <EmptyCart/> : <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_320px]"><form className="max-w-xl space-y-5" onSubmit={(e)=>{e.preventDefault();setError('');if(demo.checkout('Card',0,{name,address}))void navigate({to:'/orders'});else setError('Order could not complete. Check cart stock and fictional delivery details.');}}><div className="space-y-2"><Label htmlFor="checkout-name">Fictional recipient</Label><Input id="checkout-name" value={name} onChange={(e)=>setName(e.target.value)} required/></div><div className="space-y-2"><Label htmlFor="checkout-address">Fictional delivery address</Label><Input id="checkout-address" value={address} onChange={(e)=>setAddress(e.target.value)} required/></div><div className="border-y py-4"><p className="text-sm font-medium">Card · simulated only</p><p className="mt-1 text-xs text-muted-foreground">Prices are in EUR. No card is collected and no wallet balance is charged. Token checkout is not available.</p></div>{error&&<p role="alert" className="text-sm text-loss">{error}</p>}<Button disabled={!name.trim()||!address.trim()}><ShoppingBag/>Place simulated order</Button><Button asChild variant="ghost"><Link to="/cart">Back to cart</Link></Button></form><aside><h2 className="mb-3 text-2xl">Order summary</h2><ul className="mb-4 space-y-2 text-sm">{s.cart.map((c,i)=><li key={i}>{c.qty} × {s.products.find((p)=>p.id===c.productId)?.name} · {c.size} {s.products.find((p)=>p.id===c.productId)?.format==='Capsules'?'caps':'g'}</li>)}</ul><Totals/></aside></div>}</div>;
}

export function OrdersPage() {
  const s = useDemo(); const rows = s.orders.filter((o)=>o.customer===s.account);
  return <div className="space-y-7"><PageHeader title="Your demo orders" subtitle={`${s.account} · local simulated purchases, not real orders.`} actions={<Button asChild variant="outline"><Link to="/market">Explore marketplace <ArrowRight/></Link></Button>}/>{!rows.length ? <Empty text="No demo orders for this account yet."/> : <div className="divide-y">{rows.map((o)=><article key={o.id} className="py-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl">{o.id}</h2><p className="mt-1 text-xs text-muted-foreground">{s.roasters.find((r)=>r.id===o.roasterId)?.name} · {o.date.slice(0,10)}</p></div><p className="num">€{fmt(o.total)}</p></div><p className="mt-3 flex flex-wrap items-center gap-2 text-sm">{o.status} · {o.method}<DemoBadge/></p><ul className="mt-3 space-y-2 text-sm">{o.items.map((c,i)=><li key={i}><Link to="/market/$id" params={{id:c.productId}} className="underline underline-offset-4">{c.qty} × {s.products.find((p)=>p.id===c.productId)?.name??c.productId}</Link> · {c.size} {s.products.find((p)=>p.id===c.productId)?.format==='Capsules'?'caps':'g'} · {c.grind}</li>)}</ul><div className="mt-4 flex flex-wrap items-center gap-4"><p className="text-xs text-muted-foreground">Tracking: {o.tracking} · not a carrier link</p><Button variant="outline" size="sm" disabled={o.status==='Delivered'||o.status==='Cancelled'} onClick={()=>demo.advanceOrder(o.id)}>Advance demo status</Button></div></article>)}</div>}</div>;
}