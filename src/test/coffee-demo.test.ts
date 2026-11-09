import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, demo, getDemo, swapQuote } from '@/lib/demo/store';
import { cartSummary, coffeeActivity, coffeeOverview, lotAccounting } from '@/lib/demo/calc';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const GCT = 'GCT-COL-HUI-25A', RCT = 'RCT-COL-HUI-25A';
function lot(id: string) { const l = getDemo().lots.find((l)=>l.id===id); if(!l)throw new Error('Missing test lot');return l; }
beforeEach(()=>demo.reset());

describe('Shared coffee accounting',()=>{
  it('does not add supply to physical coffee or count reserves twice',()=>{
    expect(lotAccounting(lot(RCT)).available).toBe(1260);
    const q = coffeeOverview(getDemo());
    expect(q.physical).toBe(48300);
    expect(q.available+q.encumbered+q.reserved).toBe(q.physical);
    expect(q.walletKg).toBe(1337);
    expect(q.representedKg).toBeCloseTo(1890.2);
  });
  it('converts 5 kg at 84% yield with 2% fee on output',()=>{
    expect(demo.roast(GCT,5)).toBe(true);
    expect(lot(GCT).physicalKg).toBe(11995);
    expect(lot(GCT).supply).toBe(9995);
    expect(lot(RCT).physicalKg).toBe(1404.2);
    expect(lot(RCT).supply).toBe(1304.2);
    expect(getDemo().balances[RCT]).toBe(39.116);
    expect(getDemo().conversions[0]).toMatchObject({inputKg:5,outputKg:4.2,lossKg:0.8,feeKg:0.084,netKg:4.116});
    expect(coffeeOverview(getDemo()).physical).toBe(48299.2);
  });
  it('rejects batches below 5 kg atomically',()=>{
    const before = structuredClone(getDemo());
    expect(demo.roast(GCT,4.999)).toBe(false);
    expect(getDemo()).toEqual(before);
  });
  it('rejects paused roasted output without changing any records',()=>{
    act('Test','Pause output',(d)=>{const r=d.lots.find((l)=>l.id===RCT);if(r)r.paused=true;},{silent:true});
    const before = structuredClone(getDemo());
    expect(demo.roast(GCT,5)).toBe(false);
    expect(getDemo()).toEqual(before);
  });
  it('burns 1 kg and reserves it without removing physical mass until delivery',()=>{
    expect(demo.redeem(RCT,1,250,'Whole bean','Spain','Example demo street')).toBe(true);
    const r = getDemo().redemptions[0];
    expect(lot(RCT).supply).toBe(1299);
    expect(lot(RCT).reservedRedemption).toBe(21);
    expect(lot(RCT).physicalKg).toBe(1400);
    expect(getDemo().balances[RCT]).toBe(34);
    expect(getDemo().balances.USDC).toBe(24985.5);
    expect(getDemo().ledger[0].amount).toBe(6);
    for(let i=0;i<4;i++)expect(demo.advanceRedemption(r.id)).toBe(true);
    expect(lot(RCT).reservedRedemption).toBe(20);
    expect(lot(RCT).physicalKg).toBe(1399);
    expect(lot(RCT).supply).toBe(1299);
    const before=structuredClone(getDemo());
    expect(demo.advanceRedemption(r.id)).toBe(false);
    expect(getDemo()).toEqual(before);
  });
  it('rejects redemptions below 1 kg and fractional packs',()=>{
    const before=structuredClone(getDemo());
    expect(demo.redeem(RCT,0.75,250,'Whole bean','Spain','Demo')).toBe(false);
    expect(demo.redeem(RCT,1.1,250,'Whole bean','Spain','Demo')).toBe(false);
    expect(getDemo()).toEqual(before);
  });
  it('swaps balances with a 0.30 USDC fee without creating coffee',()=>{
    const before=structuredClone(getDemo()); const q=swapQuote(before,'USDC',GCT,100);
    expect(q.feeUsd).toBe(0.3);
    expect(demo.swap('USDC',GCT,100,1)).toBe(true);
    expect(getDemo().balances.USDC).toBe(24900);
    expect(getDemo().balances[GCT]).toBeCloseTo(420+q.out,5);
    expect(getDemo().lots).toEqual(before.lots);
  });
  it('rejects insufficient balance and slippage atomically',()=>{
    const before=structuredClone(getDemo());
    expect(demo.swap('USDC',GCT,30000,100)).toBe(false);
    expect(demo.swap('USDC',GCT,100,0)).toBe(false);
    expect(getDemo()).toEqual(before);
  });
  it('does not sell protocol-owned roast fee tokens through swaps',()=>{
    act('Test','Limit inventory',(d)=>{const r=d.lots.find((l)=>l.id===RCT);if(r){r.supply=36;r.encumbered=0;}},{silent:true});
    const before=structuredClone(getDemo());
    // Supply 36 - wallet 35 - recorded protocol fees 0.84 = 0.16 available.
    expect(swapQuote(before,'USDC',RCT,10).out).toBeGreaterThan(0.16);
    expect(demo.swap('USDC',RCT,10,1)).toBe(false);
    expect(getDemo()).toEqual(before);
  });
});

describe('Marketplace demo',()=>{
  it('aggregates stock across sizes and rejects overstock atomically',()=>{
    expect(demo.addToCart('huila-paraiso',100,250,'Whole bean')).toBe(true);
    const before=structuredClone(getDemo());
    expect(demo.addToCart('huila-paraiso',21,500,'Filter')).toBe(false);
    expect(getDemo()).toEqual(before);
    expect(demo.setCartQty(0,121)).toBe(false);
    expect(getDemo()).toEqual(before);
  });
  it('creates two EUR shipments with consistent totals and account activity',()=>{
    demo.addToCart('huila-paraiso',1,250,'Whole bean');
    demo.addToCart('yirgacheffe-kochere',1,250,'Whole bean');
    expect(cartSummary(getDemo())).toEqual({subtotal:35,shipping:12,shipments:2,total:47});
    const balances=structuredClone(getDemo().balances); const fees=coffeeOverview(getDemo()).recentFees;
    expect(demo.checkout('Card',0,{name:'Fictional recipient',address:'Example demo street'})).toBe(true);
    expect(getDemo().cart).toHaveLength(0);
    expect(getDemo().orders.slice(0,2).reduce((a,o)=>a+o.total,0)).toBe(47);
    expect(getDemo().orders[0].customer).toBe('Demo Explorer');
    expect(getDemo().balances).toEqual(balances);
    expect(getDemo().products.find((p)=>p.id==='huila-paraiso')?.stock).toBe(119);
    expect(getDemo().ledger[0].bucket).toBe('Marketplace EUR');
    expect(coffeeOverview(getDemo()).recentFees).toBe(fees);
    expect(coffeeActivity(getDemo()).filter((a)=>a.action==='Marketplace purchase').length).toBe(4);
  });
  it('rejects unsupported token payment without converting EUR to USDC',()=>{
    demo.addToCart('huila-paraiso',1,250,'Whole bean');const before=structuredClone(getDemo());
    expect(demo.checkout('USDC',0,{name:'Demo',address:'Demo'})).toBe(false);
    expect(getDemo()).toEqual(before);
  });
});