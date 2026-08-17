import { agrees, type OpportunityEntity } from "../entity/types";
import {
  isRetrieved,
  type ObservedField,
  type SourceClass,
  type SourceObservation,
} from "../observation/types";
import type { VerificationRecord, VerificationTransition } from "../verification/types";
import type { PairingJudgments } from "../judgment/types";
import type { PursuitResolution } from "../pursuit/types";
import { projectCard, viewOf, type FieldView, type OpportunityCard } from "./card";
import { count, humanDate, readingDate, sourceKind } from "./wording";

/**
 * The inspection surface — "what this involves".
 *
 * ══════════════════════════════════════════════════════════════════════════
 * AN INSPECTION SURFACE, NOT A FUNNEL
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The obvious thing to build behind a card is a detail page that ends in a big
 * button, and every metric would improve. It is the wrong shape for this
 * product, and the reason is in the origin story: the harm was not that someone
 * failed to convert. It was that someone found out too late, and could not tell
 * what was real.
 *
 * So this surface answers "what would I be getting into", and the terminal
 * action sits at the foot of it as one available thing rather than as the
 * page's purpose. It is deliberately not called Registration — registration is
 * one terminal action among several and is wrong for most of the categories in
 * the research corpus.
 *
 * ── What it must be able to say ───────────────────────────────────────────
 *
 * That sources disagree. That a field was never observed. That verification
 * lapsed three weeks ago. That the deadline is derived rather than read. That
 * one of the two pages it rests on has stopped answering. All of it in the
 * person's terms, none of it hidden behind a disclosure that costs an
 * interaction — because verification must never cost more than acceptance.
 */

export interface FieldRow {
  field: ObservedField;
  view: FieldView;
}

/**
 * One thing one page said, in the words it used.
 *
 * `asStated` is the page's own text and is never cleaned up. `readAs` appears
 * only where Opportunity X turned those words into something else — a published
 * "2026-09-30" read as a closing day — so the reader can check the reading
 * against the words rather than taking the reading on trust.
 */
export interface SourceStatement {
  field: ObservedField;
  asStated: string;
  readAs?: string;
}

export interface SourceRow {
  observationId: string;
  url: string;
  label: string;
  sourceClass: SourceClass;
  /** The same class, said to a person. `official` is jargon; this is not. */
  kind: string;
  retrievedAt: string;
  /** False when the retrieval failed — kept, because it is evidence too. */
  answered: boolean;
  /** Set when it answered and nothing could be read from it. */
  unreadable?: string;
  /**
   * What this page actually said.
   *
   * The single most important addition to this surface. Without it, "verified
   * against 3 independent sources" is a number the reader has to believe: the
   * page listed three URLs and never showed what any of them carried. With it,
   * the claim is checkable — and checkability is the entire product.
   */
  said: SourceStatement[];
}

/**
 * One field where sources disagree, with each reading attributed.
 *
 * The contested `FieldView` already carried the values; what it could not say
 * was **who said which**, because a reading holds observation ids and the
 * surface had no way to turn those into the name of a ministry. So the page
 * showed two dates and left the reader to guess whether the disagreement was
 * between two institutions or one institution and an aggregator — which is the
 * whole substance of the disagreement.
 */
export interface Contradiction {
  field: ObservedField;
  readings: {
    /** Formatted for a reader. */
    value: string;
    /** The distinct wordings behind it, where they differ from the value. */
    asStated: string[];
    said: { label: string; kind: string; observedAt: string }[];
  }[];
  /** What Opportunity X concludes from the disagreement, and what it will not. */
  consequence: string;
}

export interface OpportunityInspection {
  card: OpportunityCard;

  /** Every field, including the ones nothing was said about. */
  fields: FieldRow[];

  /** Only the contested ones, so a surface can lead with them. */
  contradictions: Contradiction[];

  /**
   * How the deadline was arrived at.
   *
   * Stated because it is derived, not read. No source expresses its own
   * closure reliably — programme pages stay up for years after the intake they
   * describe — so "closes on the 30th" is Opportunity X's inference from an observed
   * date and the clock, and a person deciding whether to trust it deserves to
   * know which.
   */
  deadlineReasoning: string;

  /**
   * Oldest first. Includes re-affirmations, so freshness has evidence.
   *
   * A plain array rather than the record's non-empty tuple: an entity that has
   * never been verified has no history, and that is a state this surface must
   * be able to render rather than one it refuses to construct.
   */
  verificationHistory: VerificationTransition[];

  /** Every retrieval this entity rests on, successes and failures alike. */
  sources: SourceRow[];

  /**
   * How complete the evidence under this page actually is.
   *
   * ══════════════════════════════════════════════════════════════════════════
   * WHY THIS IS A REAL STATE AND NOT A MANUFACTURED ONE
   * ══════════════════════════════════════════════════════════════════════════
   *
   * The state system forbids inventing epistemic information to make a UI state
   * possible: a surface may not say *"3 of 4 sources answered"* unless the system
   * genuinely knows that three answered and one did not.
   *
   * It does. Every observation records its own outcome — `answered` is false when
   * the retrieval failed, and `unreadable` carries the reason when a page replied
   * with nothing legible. The page already rendered both, one row at a time, in
   * the middle of a list. What was missing was the **summary**: a reader had to
   * count the failures themselves to notice that this opportunity rests on two
   * sources rather than four.
   *
   * So this is a projection of evidence that was already there, not a new claim.
   * It is the one genuinely degraded state in the product — *some independently
   * requested information succeeded and some failed* — and it exists here rather
   * than at the surface precisely so the surface cannot fabricate it.
   */
  evidence: {
    /** Sources consulted for this entity. */
    consulted: number;
    /** Of those, the ones that answered with something legible. */
    answered: number;
    /** Answered, and nothing about the opportunity could be read from them. */
    unreadable: number;
    /** Did not answer at all. */
    unreachable: number;
    /**
     * True when at least one source is missing from the picture.
     *
     * Named rather than left to the caller to compute, so every surface that
     * asks the question gets the same answer to it.
     */
    degraded: boolean;
  };

  /** What happens if the person acts. Plain, and never a promise. */
  whatHappensNext: string[];
}

/**
 * Count what actually answered.
 *
 * Deliberately three separate counts rather than a ratio. "Two of four" is a
 * different fact from "two answered, one was unreachable, one replied with
 * nothing readable" — and the second is the one that tells a reader whether to
 * come back later or to distrust the page.
 */
function evidenceCompleteness(
  observations: readonly SourceObservation[],
): OpportunityInspection["evidence"] {
  let answered = 0;
  let unreadable = 0;
  let unreachable = 0;

  for (const observation of observations) {
    if (!isRetrieved(observation)) {
      unreachable += 1;
    } else if (observation.unreadable) {
      unreadable += 1;
    } else {
      answered += 1;
    }
  }

  return {
    consulted: observations.length,
    answered,
    unreadable,
    unreachable,
    degraded: unreadable + unreachable > 0,
  };
}

export function projectInspection(input: {
  entity: OpportunityEntity;
  verification: VerificationRecord | null;
  judgments: PairingJudgments | null;
  pursuit: PursuitResolution;
  /** Every observation the entity's resolution references. */
  observations: readonly SourceObservation[];
  now: string;
  /** Whose position the stance sentence describes. See `projectCard`. */
  voice?: "you" | "this-person";
}): OpportunityInspection {
  const card = projectCard({
    entity: input.entity,
    verification: input.verification,
    judgments: input.judgments,
    pursuit: input.pursuit,
    now: input.now,
    voice: input.voice,
  });

  const ALL_FIELDS: readonly ObservedField[] = [
    "title",
    "organiser",
    "eligibility",
    "funding",
    "opens",
    "deadline",
    "location",
    "how-to-apply",
  ];

  const fields: FieldRow[] = ALL_FIELDS.map((field) => ({
    field,
    view: viewOf(input.entity, field),
  }));

  /* Observation id → the page it came from, for attributing readings. */
  const byId = new Map(input.observations.map((o) => [o.id, o]));

  return {
    card,
    fields,
    contradictions: ALL_FIELDS.flatMap((field) => contradictionFor(input.entity, field, byId)),
    deadlineReasoning: deadlineReasoning(input.entity, card),
    verificationHistory: input.verification?.transitions ?? [],
    sources: input.observations.map((observation) => ({
      observationId: observation.id,
      url: observation.url,
      label: observation.source.label,
      sourceClass: observation.source.sourceClass,
      kind: sourceKind(observation.source.sourceClass),
      retrievedAt: observation.retrievedAt,
      answered: isRetrieved(observation),
      ...(isRetrieved(observation) && observation.unreadable
        ? { unreadable: observation.unreadable.reason }
        : {}),
      said: statementsIn(observation),
    })),
    evidence: evidenceCompleteness(input.observations),
    whatHappensNext: whatHappensNext(card),
  };
}

/**
 * Everything one page said about this opportunity, in its own words.
 *
 * Deduplicated on field plus wording, because two extractors reading the same
 * document produce the same sentence twice and the page said it once. The
 * *disagreement* between extractors survives — two different wordings are two
 * entries — which is the case worth seeing.
 */
function statementsIn(observation: SourceObservation): SourceStatement[] {
  if (!isRetrieved(observation)) return [];

  const seen = new Set<string>();
  const out: SourceStatement[] = [];

  for (const item of observation.items) {
    for (const claim of item.claims) {
      const key = `${claim.field}:${claim.asStated}`;
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        field: claim.field,
        asStated: claim.asStated,
        /* Only where the reading differs from the words. Showing
           "30 September 2026" beside "30 September 2026" is noise. */
        ...(claim.normalised && claim.normalised !== claim.asStated
          ? { readAs: readingDate({ value: claim.normalised, precision: claim.precision }) }
          : {}),
      });
    }
  }

  return out;
}

/**
 * A disagreement, with each side attributed to the pages that took it.
 */
function contradictionFor(
  entity: OpportunityEntity,
  field: ObservedField,
  byId: ReadonlyMap<string, SourceObservation>,
): Contradiction[] {
  const held = entity.fields.find((f) => f.field === field);
  if (!held || agrees(held)) return [];

  const readings = held.readings.map((reading) => {
    const said = reading.observedIn.flatMap((id) => {
      const observation = byId.get(id);
      return observation
        ? [
            {
              label: observation.source.label,
              kind: sourceKind(observation.source.sourceClass),
              observedAt: observation.retrievedAt,
            },
          ]
        : [];
    });

    /* The publisher's own wording, where it differs from the value shown. */
    const asStated = [
      ...new Set(
        reading.observedIn.flatMap((id) => {
          const observation = byId.get(id);
          if (!observation || !isRetrieved(observation)) return [];
          return observation.items.flatMap((item) =>
            item.claims
              .filter(
                (c) =>
                  c.field === field &&
                  (c.normalised ?? c.asStated) === reading.value &&
                  c.asStated !== reading.value,
              )
              .map((c) => c.asStated),
          );
        }),
      ),
    ];

    return {
      value: DATE_LIKE.has(field) ? readingDate(reading) : reading.value,
      asStated,
      said,
    };
  });

  return [{ field, readings, consequence: consequenceOf(field, readings.length) }];
}

const DATE_LIKE = new Set<ObservedField>(["deadline", "opens"]);

/**
 * What the disagreement costs, stated rather than left for the reader to infer.
 *
 * A contested deadline is not a deadline — the timing goes unknown rather than
 * resolving to the later date, and someone deciding whether to act needs that
 * said out loud rather than deduced from two numbers side by side.
 */
function consequenceOf(field: ObservedField, sides: number): string {
  switch (field) {
    case "deadline":
      return `Because ${sides} sources give different closing dates, I treat the timing as unknown. I will not choose the later one for you, and I will not tell you there is time.`;
    case "how-to-apply":
      return "Because sources point somewhere different, I offer no single place to go. Choosing one would send you where another source disputes.";
    case "title":
      return "Because sources name this differently, I may be holding two things as one, or one thing under two names. It is shown as unsettled rather than resolved.";
    case "organiser":
      return "Because sources disagree about who is behind this, I cannot say whose announcement carries the most weight — which is what my verification normally rests on.";
    default:
      return `Because ${sides} sources say different things here, I hold both rather than picking one. Nothing about this field is treated as settled.`;
  }
}

function deadlineReasoning(entity: OpportunityEntity, card: OpportunityCard): string {
  const held = entity.fields.find((f) => f.field === "deadline");

  if (!held) {
    return "No source stated a deadline, so I cannot say whether this is still open. I will not assume that it is.";
  }

  if (!agrees(held)) {
    return `Sources give ${held.readings.length} different deadlines — ${held.readings
      .map((r) => readingDate(r))
      .join(
        " and ",
      )}. A contested deadline is not a deadline, so I treat the timing as unknown rather than choosing the later one.`;
  }

  const reading = held.readings[0];
  /*
    Every value in this sentence goes through the wording module. It used to
    read "One deadline, 2026-10-09T00:00:00.000Z, stated by 3 retrieval(s) and
    last seen 2026-08-12T09:00:00.000Z" — three machine values and a plural
    nobody wrote, on the surface whose whole job is making evidence legible.
  */
  const base = `One closing date — ${readingDate(reading)} — stated by ${count(
    reading.observedIn.length,
    "source",
  )}, last seen on ${humanDate(reading.lastSeenAt) ?? reading.lastSeenAt}. Whether it has passed is worked out from that date and the clock, because no source announces its own closure reliably.`;

  return card.timing.state === "closed"
    ? `${base} It has passed.`
    : card.timing.state === "open"
      ? `${base} It has not passed.`
      : base;
}

function whatHappensNext(card: OpportunityCard): string[] {
  const steps: string[] = [];

  if (card.action) {
    steps.push(
      card.action.verb === "Open the announcement"
        ? "Opening the announcement takes you to the source. I do not know what the process is called, so I will not describe one."
        : `${card.action.verb} takes you to ${new URL(card.action.href).hostname}. That leaves Opportunity X entirely.`,
    );
  } else {
    steps.push(
      "I have no single place to send you: sources disagree about where to go, and both are listed above.",
    );
  }

  /*
    Said plainly, because the alternative is a system that quietly infers a
    commitment from a click. Following a link means someone went to look.
  */
  steps.push(
    "Following that link is not recorded as an application. Nothing is concluded from the fact that you clicked, and I do not track whether you applied.",
  );

  if (card.pursuit.state === "undeclared") {
    steps.push(
      "Marking this Interested keeps it in view and affects when you are reminded. It is your statement, editable and removable, and it never becomes a signal about you.",
    );
  }

  return steps;
}
