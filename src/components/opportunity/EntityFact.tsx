import { FreshnessStamp } from "@/components/ui/FreshnessStamp";
import { count } from "@/lib/opportunity/surface/wording";
import type { FieldView } from "@/lib/opportunity/surface/card";

/**
 * One entity-level fact, in the state the record actually holds it.
 *
 * ── Why "unobserved" renders and does not disappear ───────────────────────
 *
 * A card that omits a missing deadline has told the reader there is no
 * deadline. Missing evidence is never negative evidence, and the difference
 * between "no closing date" and "nobody stated a closing date" is the whole
 * distance between a reassuring interface and an honest one.
 *
 * ── Why contested readings are all shown ──────────────────────────────────
 *
 * Choosing one and showing it alone is the last-writer-wins failure the entity
 * layer refuses at the point of resolution. Repeating it here would undo that
 * work at the only place a person could have noticed.
 *
 * The disagreement is stated in words, not by colour. Encoding it in hue alone
 * would lose it in greyscale, in forced-colours mode, and for anyone who cannot
 * distinguish the hues — and this is the field where being wrong costs a
 * deadline.
 */
export function EntityFact({
  label,
  view,
  className = "",
}: {
  label: string;
  view: FieldView;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
        {label}
      </span>

      {view.state === "agreed" ? (
        <>
          <span className="text-[15px] leading-snug text-foreground">{view.value}</span>
          <span className="font-mono text-[11px] text-text-s">
            {/* "retrievals" is what the engine calls them; a person reading a
                fact wants to know how many sources said it. */}
            {count(view.sources, "source")} ·{" "}
            <FreshnessStamp at={view.lastSeenAt} verb="last seen" decay="fast" />
          </span>
        </>
      ) : null}

      {view.state === "contested" ? (
        <>
          {/*
            Named before the values are read, so nobody takes the first line as
            the answer and stops.
          */}
          <span className="text-[15px] leading-snug text-foreground">
            Sources disagree. {view.readings.length} different values:
          </span>
          <ul className="mt-1 flex flex-col gap-1.5">
            {view.readings.map((reading) => (
              <li key={reading.value} className="flex flex-col">
                <span className="text-[15px] leading-snug text-foreground">{reading.value}</span>
                <span className="font-mono text-[11px] text-text-s">
                  {count(reading.sources, "source")} ·{" "}
                  <FreshnessStamp at={reading.lastSeenAt} verb="last seen" decay="fast" />
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {view.state === "unobserved" ? (
        /*
          The system's limit, in the system's voice. Never "this opportunity has
          no deadline" — Opportunity X does not know that, and saying it would be
          asserting something no source said.
        */
        <span className="text-[15px] leading-snug text-text-s">No source stated this.</span>
      ) : null}
    </div>
  );
}
