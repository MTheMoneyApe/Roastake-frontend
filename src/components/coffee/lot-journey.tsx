import { CoffeePhoto } from "@/components/coffee-photo";
import { DemoBadge } from "@/components/kit";
import type { CoffeeLot, DemoState } from "@/lib/demo/types";
import { fmt } from "@/lib/demo/calc";

/** A presentation of existing sample records, never a chain-of-custody attestation. */
export function LotJourney({ lot, state }: { lot: CoffeeLot; state: DemoState }) {
  const source = state.lots.find((candidate) => candidate.id === lot.parentLot) ?? lot;
  const records = state.roastRecords.filter((record) => record.lot === source.id);
  const conversions = state.conversions.filter(
    (record) => record.gctLot === source.id && (lot.kind === "GCT" || record.rctLot === lot.id),
  );
  const steps = [
    {
      title: "Origin / harvest",
      photo: "harvest" as const,
      detail: `${source.origin}, ${source.country} · harvest ${source.harvest}. ${source.producer} · ${source.farm}.`,
      status: "DEMO RECORD · NOT VERIFIED",
    },
    {
      title: "Processing",
      photo: "cherries" as const,
      detail: `${source.process} · ${source.variety}. No processing date or independently verified process record is supplied.`,
      status: "DEMO RECORD · NOT VERIFIED",
    },
    {
      title: "Custody / shipping",
      photo: "green" as const,
      detail: `${lot.custodian} · ${lot.warehouse}. This is a sample custody field, not a verified shipment. No transport route, handover dates or carrier evidence is supplied.`,
      status: "SHIPMENT EVIDENCE MISSING",
    },
    {
      title: "Roasting",
      photo: "roasting" as const,
      detail:
        records.length || conversions.length
          ? [
              ...records.map(
                (record) =>
                  `Demo roast log ${record.date}: ${fmt(record.greenKg, 3)} kg green → ${fmt(record.roastedKg, 3)} kg roasted; ${record.profile}.`,
              ),
              ...conversions.map(
                (record) =>
                  `Separate demo conversion ${record.date}: ${fmt(record.inputKg, 3)} kg input → ${fmt(record.outputKg, 3)} kg output, ${fmt(record.feeKg, 3)} kg fee; ${fmt(record.netKg, 3)} kg net tokens.`,
              ),
            ].join(" ")
          : lot.kind === "RCT"
            ? `Roasted classification recorded: ${lot.grade}. No dated roast log or conversion is supplied for this record.`
            : "No roast event is recorded for this green lot. A configured yield is a simulation parameter, not proof that roasting occurred.",
      status:
        records.length || conversions.length
          ? "DEMO LOGS · NOT VERIFIED"
          : "DATED ROAST EVIDENCE MISSING",
    },
  ];
  return (
    <section className="space-y-4" aria-labelledby="lot-journey-title">
      <div>
        <h2 id="lot-journey-title" className="brand-section-title">
          Illustrative lot journey
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          A stage-by-stage reading of the existing demo record, not a verified chronology. Photos
          are supporting illustrations, never evidence of this lot. Missing dates and documents stay
          missing.
        </p>
      </div>
      <div className="brand-surface border-dashed p-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-highlight">
          Indicative origin · region level only
        </p>
        <p className="mt-1 font-display text-2xl">
          {source.origin} / {source.country}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Approximate, illustrative origin from the demo metadata. No exact farm coordinates or
          verified geography supplied; no map pin or shipping route inferred.
        </p>
      </div>
      <ol className="grid gap-4 md:grid-cols-2">
        {steps.map((step, index) => (
          <li key={step.title} className="brand-surface min-w-0 p-4">
            <CoffeePhoto
              photo={step.photo}
              sizes="(min-width: 1440px) 480px, (min-width: 768px) 40vw, 100vw"
            />
            <p className="mt-4 font-mono text-xs text-highlight">0{index + 1}</p>
            <h3 className="mt-1 font-display text-xl">{step.title}</h3>
            <p className="my-3 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
            <DemoBadge>{step.status}</DemoBadge>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">
        Roast logs and conversions are separate sample records; they are not reconciled shipment
        attestations. No verified physical backing, custody, shipment or real-world redemption.
      </p>
    </section>
  );
}
