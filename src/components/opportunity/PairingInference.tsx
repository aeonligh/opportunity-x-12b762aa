import type { OpportunityCard } from "@/lib/opportunity/surface/card";

/**
 * What Opportunity X thinks this means for one person — labelled as an opinion.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THIS IS A SEPARATE REGION AND NOT MORE ROWS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * "Closes on 30 September" and "this looks like a fit for you" are claims of
 * completely different kinds. The first is checkable against a source that
 * exists. The second is Opportunity X's inference about a person, made from a Profile
 * that may be wrong and a model that is certainly incomplete.
 *
 * A card that lists them together has told the reader they are the same sort of
 * statement, and the reader will trust the second as much as the first. The
 * separation is therefore structural — a different key on the projection, a
 * different region on the card, a heading in the system's own voice — rather
 * than a matter of styling that a redesign could quietly remove.
 *
 * ── What is deliberately absent ───────────────────────────────────────────
 *
 * No score. No percentage. No "85% match", no predicted probability of winning,
 * no "N people like you applied". None of them has anywhere to come from: the
 * projection carries no numeric verdict, and the ranking inputs behind the
 * recommendation are a closed union with no member for popularity, behaviour,
 * commercial arrangement or cohort outcome.
 *
 * ── Why `undetermined` is written out in full ─────────────────────────────
 *
 * It is the honest verdict while no assessor has read the requirements, and it
 * is the most common one today. Rendering it as a dash, or hiding the row,
 * would let a reader infer that nothing stands in their way — which is exactly
 * the false impression by omission the base-rate rule exists to prevent
 * elsewhere.
 */

const ELIGIBILITY: Record<NonNullable<OpportunityCard["pairing"]>["eligibility"], string> = {
  eligible: "Everything I could check, you meet.",
  ineligible: "You told me something that rules this out.",
  undetermined: "I have not read this opportunity's requirements against what I know about you.",
};

const FIT: Record<NonNullable<OpportunityCard["pairing"]>["fit"], string> = {
  fits: "This matches what you said you want.",
  "does-not-fit": "You told me something this does not match.",
  undetermined: "I have not assessed this against what you said you want.",
};

const RISK: Record<NonNullable<OpportunityCard["pairing"]>["risk"], string> = {
  low: "Being wrong about this would cost you little.",
  material: "Being wrong about this would cost you something real.",
  high: "Being wrong about this would cost you a great deal.",
  undetermined: "I have not established what pursuing this would cost you.",
};

export function PairingInference({
  pairing,
  whySurfaced,
  className = "",
}: {
  pairing: OpportunityCard["pairing"];
  /** Verbatim from the projection — the same string that is retained. */
  whySurfaced: string;
  className?: string;
}) {
  return (
    <section
      aria-label="What Opportunity X infers about this for you"
      className={`flex flex-col gap-3 border-l-2 border-border pl-4 ${className}`}
    >
      {/*
        The heading is the disclaimer. First person, because the system is
        speaking about its own reasoning rather than about the person.
      */}
      <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
        What I think this means for you
      </h3>

      {pairing === null ? (
        <p className="max-w-[58ch] text-[15px] leading-relaxed text-text-s">
          I haven&rsquo;t assessed this against what I know about you.
        </p>
      ) : (
        <>
          <p className="max-w-[58ch] text-[15px] leading-relaxed text-foreground">{whySurfaced}</p>

          <dl className="flex flex-col gap-2">
            {(
              [
                ["Eligibility", ELIGIBILITY[pairing.eligibility]],
                ["Fit", FIT[pairing.fit]],
                ["What it costs you to be wrong", RISK[pairing.risk]],
              ] as const
            ).map(([term, description]) => (
              <div key={term} className="flex flex-col">
                <dt className="font-mono text-[11px] uppercase tracking-widest text-text-s">
                  {term}
                </dt>
                <dd className="max-w-[58ch] text-[14px] leading-relaxed text-text-s">
                  {description}
                </dd>
              </div>
            ))}
          </dl>

          {/*
            Position among what was considered, with the denominator *and* the
            basis. "Ranked 1" alone is a boast; "1 of 3" is a fact a person can
            weigh; "1 of 3, on: the opportunity is verified; there are 34 days
            until the deadline" is a fact they can check.

            The sentence comes from the ranking judgment rather than being
            composed here, so it cannot claim an ordering the engine did not
            perform. There is no score anywhere in it and nowhere for one to go.
          */}
          {pairing.position !== null ? (
            <p className="max-w-[58ch] text-[11px] leading-relaxed text-text-s">
              {pairing.rankedOn}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
