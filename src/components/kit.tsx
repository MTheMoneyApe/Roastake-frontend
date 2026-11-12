import { Link } from "@tanstack/react-router";
import { useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { HelpCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/demo/calc";

export function DemoBadge({ children = "DEMO", className }: { children?: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border border-warning-foreground/30 bg-warning px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-warning-foreground", className)}>● {children}</span>;
}

export type MaturityVariant = "real" | "testnet" | "demo" | "preview";

const MATURITY_STYLES: Record<MaturityVariant, string> = {
  real: "border-gain/50 bg-gain/15 text-gain",
  testnet: "border-gain/40 bg-accent text-accent-foreground",
  demo: "border-warning-foreground/30 bg-warning text-warning-foreground",
  preview: "border-dashed border-muted-foreground/45 bg-muted/40 text-muted-foreground",
};

/** Discrete module maturity pill distinguishing real/testnet features, local demos, and planned previews. */
export function MaturityBadge({
  variant,
  children,
  className,
  ...rest
}: {
  variant: MaturityVariant;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<"span">, "children" | "className">) {
  return (
    <span
      {...rest}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider leading-none",
        MATURITY_STYLES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
export function Illustrative({ className }: { className?: string }) {
  return <p className={cn("text-[11px] uppercase tracking-wider text-muted-foreground", className)}>Illustrative demo data · simulated · not financial advice</p>;
}

export function Help({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild><button type="button" aria-label="Help" className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"><HelpCircle className="size-3.5" /></button></TooltipTrigger>
      <TooltipContent className="max-w-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

export function PageHeader({ title, subtitle, crumbs = [], actions, help, demo = true }: { title: string; subtitle?: string; crumbs?: { label: string; to?: string }[]; actions?: ReactNode; help?: string; demo?: boolean }) {
  return (
    <div className="mb-6 flex min-w-0 flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {c.to ? <Link to={c.to} className="hover:text-foreground">{c.label}</Link> : <span className="text-foreground">{c.label}</span>}
                {i < crumbs.length - 1 && <span>/</span>}
              </span>
            ))}
          </nav>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="brand-page-title">{title}</h1>
          {demo && <DemoBadge />}
          {help && <Help text={help} />}
        </div>
        {subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone, help }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "gain" | "loss"; help?: string }) {
  return (
    <div className="brand-surface p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">{label}{help && <Help text={help} />}</div>
      <div className={cn("num mt-1.5 text-xl font-medium md:text-2xl", tone === "gain" && "text-gain", tone === "loss" && "text-loss")}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
export const Stats = ({ children, cols = 4 }: { children: ReactNode; cols?: number }) => (
  <div className={cn("grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 [&>*]:min-w-0", cols === 3 && "md:grid-cols-3", cols === 4 && "md:grid-cols-4", cols === 5 && "md:grid-cols-5", cols === 6 && "md:grid-cols-3 lg:grid-cols-6")}>{children}</div>
);

export function Panel({ title, children, actions, className, bodyClass }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn("brand-surface", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="font-sans text-sm font-semibold tracking-normal">{title}</h2>
          <div className="flex flex-wrap gap-2">{actions}</div>
        </header>
      )}
      <div className={cn("p-4", bodyClass)}>{children}</div>
    </section>
  );
}

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="brand-surface flex flex-col items-center gap-3 border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
      <Inbox className="size-6" aria-hidden="true" />
      <p>{text}</p>
      {action}
    </div>
  );
}

export interface Col<T> { key: string; label: string; render: (r: T) => ReactNode; align?: "right" }
export function DataTable<T>({ cols, rows, empty = "Nothing here yet.", rowKey }: { cols: Col<T>[]; rows: T[]; empty?: string; rowKey?: (r: T, i: number) => string }) {
  if (!rows.length) return <Empty text={empty} />;
  return (
    <div className="-mx-4 overflow-x-auto focus-visible:outline-offset-[-3px]" role="region" aria-label="Scrollable data table" tabIndex={0}>
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            {cols.map((c) => <th key={c.key} scope="col" className={cn("px-4 py-2 font-medium", c.align === "right" && "text-right")}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey ? rowKey(r, i) : i} className="border-b last:border-0 hover:bg-muted/40">
              {cols.map((c) => <td key={c.key} className={cn("px-4 py-2.5", c.align === "right" && "num text-right")}>{c.render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "gain" | "loss" | "warn" | "info" }) {
  const t = { muted: "bg-muted text-muted-foreground", gain: "bg-gain/15 text-gain", loss: "bg-loss/15 text-loss", warn: "bg-warning text-warning-foreground", info: "bg-accent text-accent-foreground" }[tone];
  return <span className={cn("inline-flex items-center rounded-full border border-current/15 px-2 py-1 text-[11px] font-medium", t)}>{children}</span>;
}
export const statusTone = (s: string): "muted" | "gain" | "loss" | "warn" | "info" =>
  /deliver|pass|approved|live|filled|operational|funded|completed|low/i.test(s) ? "gain" : /reject|cancel|liquidat|flag|suspend|paused|high|shortfall/i.test(s) ? "loss" : /pending|submitted|processing|roasting|open|screening|degraded|medium|custody/i.test(s) ? "warn" : "info";

/** Generic amount-entry confirmation modal used by every simulated financial action. */
export function AmountDialog({ open, onOpenChange, title, description, asset, max, onConfirm, summary, confirmLabel = "Confirm", defaultValue = "" }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; asset: string; max?: number; onConfirm: (n: number) => boolean | void; summary?: (n: number) => [string, ReactNode][]; confirmLabel?: string; defaultValue?: string;
}) {
  const [v, setV] = useState(defaultValue);
  const n = parseFloat(v);
  const invalid = v !== "" && (!Number.isFinite(n) || n <= 0);
  const over = max != null && n > max + 1e-9;
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setV(defaultValue); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{title} <DemoBadge>SIMULATED</DemoBadge></DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-2">
          <div className="flex justify-between text-xs"><Label htmlFor="amt">Amount ({asset})</Label>{max != null && <button type="button" className="num text-muted-foreground hover:text-foreground" onClick={() => setV(String(+max.toFixed(6)))}>Max {fmt(max, 4)}</button>}</div>
          <Input id="amt" inputMode="decimal" className="num text-lg" value={v} onChange={(e) => setV(e.target.value)} placeholder="0.00" autoFocus />
          {invalid && <p className="text-xs text-loss">Invalid amount</p>}
          {over && <p className="text-xs text-loss">Insufficient balance</p>}
          {summary && Number.isFinite(n) && n > 0 && (
            <dl className="mt-3 space-y-1.5 rounded-md bg-muted/60 p-3 text-xs">
              {summary(n).map(([k, val]) => <div key={k} className="flex justify-between gap-4"><dt className="text-muted-foreground">{k}</dt><dd className="num text-right">{val}</dd></div>)}
            </dl>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!v || invalid || over} onClick={() => { if (onConfirm(n) !== false) { onOpenChange(false); setV(defaultValue); } }}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Button that opens an AmountDialog. */
export function AmountAction(props: Omit<Parameters<typeof AmountDialog>[0], "open" | "onOpenChange"> & { label: string; variant?: "default" | "outline" | "secondary" | "ghost"; size?: "sm" | "default"; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const { label, variant = "default", size = "sm", disabled, ...rest } = props;
  return (
    <>
      <Button variant={variant} size={size} disabled={disabled} onClick={() => setOpen(true)}>{label}</Button>
      <AmountDialog open={open} onOpenChange={setOpen} {...rest} />
    </>
  );
}

export function ConfirmButton({ label, title, body, onConfirm, variant = "default", size = "sm", disabled }: { label: ReactNode; title: string; body: ReactNode; onConfirm: () => void; variant?: "default" | "outline" | "secondary" | "destructive" | "ghost"; size?: "sm" | "default"; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} disabled={disabled} onClick={() => setOpen(true)}>{label}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2">{title} <DemoBadge>SIMULATED</DemoBadge></DialogTitle></DialogHeader>
          <div className="text-sm text-muted-foreground">{body}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { onConfirm(); setOpen(false); }}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, color: "var(--popover-foreground)" } };
export function AreaMini({ data, height = 180, color = "var(--chart-1)", axis = true }: { data: { d: string; v: number }[]; height?: number; color?: string; axis?: boolean }) {
  const id = "g" + color.replace(/\W/g, "");
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.35} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
        {axis && <XAxis dataKey="d" hide />}
        {axis && <YAxis hide domain={["auto", "auto"]} />}
        <RTooltip {...tip} />
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} fill={`url(#${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
export function Bars({ data, height = 200, keys }: { data: Record<string, number | string>[]; height?: number; keys: { k: string; c: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <XAxis dataKey="d" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <RTooltip {...tip} cursor={{ fill: "var(--muted)" }} />
        {keys.map((k) => <Bar key={k.k} dataKey={k.k} stackId="a" fill={k.c} radius={[2, 2, 0, 0]} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}
export const PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--mint)", "var(--parchment)"];
export function Donut({ data, height = 200 }: { data: { name: string; value: number }[]; height?: number }) {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="w-full sm:w-1/2"><ResponsiveContainer width="100%" height={height}>
        <PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="90%" stroke="var(--card)" strokeWidth={2}>{data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Pie><RTooltip {...tip} /></PieChart>
      </ResponsiveContainer></div>
      <ul className="w-full space-y-1.5 text-xs sm:w-1/2">
        {data.map((d, i) => { const tot = data.reduce((a, b) => a + b.value, 0); return (
          <li key={d.name} className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><span className="size-2.5 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />{d.name}</span><span className="num">{tot ? ((d.value / tot) * 100).toFixed(1) : 0}%</span></li>
        ); })}
      </ul>
    </div>
  );
}

export function Candles({ data, height = 320 }: { data: { o: number; h: number; l: number; c: number }[]; height?: number }) {
  const w = 800, pad = 6;
  const hi = Math.max(...data.map((d) => d.h)), lo = Math.min(...data.map((d) => d.l));
  const y = (v: number) => pad + ((hi - v) / (hi - lo || 1)) * (height - pad * 2);
  const cw = w / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none" role="img" aria-label="Simulated candlestick chart">
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={0} x2={w} y1={height * f} y2={height * f} stroke="var(--border)" strokeDasharray="3 4" />)}
      {data.map((d, i) => {
        const up = d.c >= d.o, col = up ? "var(--gain)" : "var(--loss)", x = i * cw + cw / 2;
        return <g key={i}><line x1={x} x2={x} y1={y(d.h)} y2={y(d.l)} stroke={col} /><rect x={x - cw * 0.32} width={cw * 0.64} y={y(Math.max(d.o, d.c))} height={Math.max(1, Math.abs(y(d.o) - y(d.c)))} fill={col} /></g>;
      })}
    </svg>
  );
}

export function KV({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="divide-y text-sm">
      {rows.map(([k, v]) => <div key={k} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2"><dt className="text-muted-foreground">{k}</dt><dd className="min-w-0 break-words text-right [overflow-wrap:anywhere]">{v}</dd></div>)}
    </dl>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}
