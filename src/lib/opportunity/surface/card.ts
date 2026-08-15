import {
  agrees,
  type EntityField,
  type EntityReading,
  type OpportunityEntity,
} from "../entity/types";
import type { ObservedField } from "../observation/types";
import { deriveOpenState, resolveVerification } from "../verification/service";
import type { OpenState, VerificationRecord, VerificationResolution } from "../verification/types";
import type { PairingJudgments } from "../judgment/types";
import type { PursuitResolution } from "../pursuit/types";
import { deriveStance, type PursuitStance } from "../pursuit/stance";
import { humanDate, readingDate } from "./wording";

export { humanDate, humanMoment, readingDate } from "./wording";

/**
 * The opportunity card — a projection, not a model.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THIS FILE IS A FUNCTION AND NOT A TABLE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The earlier product had opportunity cards backed by a flat row: title,
 * deadline, score, probability, all in one place, all equally authoritative and
 * none of them able to say where it came from. `shared-database.md` records the
 * consequence — "the table conflates three constitutionally distinct categories
 * in one row" — and rebuilding the card on top of a second such row would
 * reproduce the failure with better typography.
 *
 * So the card holds no data of its own. It is a pure projection of layers that
 * already exist:
 *
 *   entity fields      →  Layer 2. What sources said this opportunity is.
 *   verification       →  Entity-level. The same for everyone, and time-bounded.
 *   pairing            →  Layer 3. What it means for one person. Never merged in.
 *   pursuit            →  The person's own declaration. Theirs, not inferred.
 *   action             →  Derived from the publisher's declared type.
 *
 * Nothing here can drift from the engine, because there is nothing here to
 * drift.
 *
 * ── The separation the card exists to preserve ────────────────────────────
 *
 * Entity facts and pairing inference sit in different keys, and the surface
 * renders them in visibly different regions. That is not styling. "This closes
 * on 30 September" and "this looks like a fit for you" are claims of completely
 * different kinds — one is checkable against a source, the other is Opportunity X's
 * opinion about a person — and a card that presents them in one list has told
 * the reader they are the same sort of statement.
 *
 * ── What cannot appear on a card ──────────────────────────────────────────
 *
 * No composite score. No predicted probability of winning. No popularity, no
 * view count, no "N people applied". None of them has a field here, and the
 * ranking inputs behind the recommendation are a closed union with no member
 * that could carry one.
 */

/**
 * One entity fact, as the surface must show it.
 *
 * Three states, and each is a different sentence to a reader:
 *
 *   agreed     — every source that spoke said this.
 *   contested  — sources disagree, and here is each reading.
 *   unobserved — nobody said anything. Not "none", not blank.
 *
 * `unobserved` is the one that carries the constitutional weight. A card that
 * renders a missing deadline as an empty space has told the reader there is no
 * deadline, and missing evidence is never negative evidence.
 */
export type FieldView =
  | {
      state: "agreed";
      value: string;
      /** Distinct observations carrying it. Corroboration, not a score. */
      sources: number;
      firstSeenAt: string;
      lastSeenAt: string;
    }
  | {
      state: "contested";
      readings: { value: string; sources: number; firstSeenAt: string; lastSeenAt: string }[];
    }
  | { state: "unobserved" };

export function viewOf(entity: OpportunityEntity, field: ObservedField): FieldView {
  const held: EntityField | undefined = entity.fields.find((f) => f.field === field);
  if (!held) return { state: "unobserved" };

  if (agrees(held)) {
    const [only] = held.readings;
    return {
      state: "agreed",
      value: display(field, only),
      sources: only.observedIn.length,
      firstSeenAt: only.firstSeenAt,
      lastSeenAt: only.lastSeenAt,
    };
  }

  return {
    state: "contested",
    readings: held.readings.map((r) => ({
      value: display(field, r),
      sources: r.observedIn.length,
      firstSeenAt: r.firstSeenAt,
      lastSeenAt: r.lastSeenAt,
    })),
  };
}

/** The fields whose stored value is an instant and whose meaning is a date. */
const DATE_FIELDS = new Set<ObservedField>(["deadline", "opens"]);

/**
 * The value as a person reads it.
 *
 * Only here, in the projection. The entity keeps the instant — that is what a
 * comparison needs and what the Ledger is written from — and the projection is
 * where it becomes a sentence. Doing it the other way round would put a
 * formatted string where a date comparison happens, which is the bug that
 * produces an opportunity that never closes.
 */
function display(
  field: ObservedField,
  reading: Pick<EntityReading, "value" | "precision">,
): string {
  return DATE_FIELDS.has(field) ? readingDate(reading) : reading.value;
}

/**
 * What the person does next, in the publisher's own terms.
 *
 * Derived from the declared schema.org type, never from a title. "Apply" is
 * wrong for a webinar and "Attend" is wrong for a scholarship, and choosing
 * between them by reading a name is the guess the extractor refuses to make.
 *
 * Where nothing was declared — or where two announcers declared types that
 * imply different verbs — the action is to open the announcement. That is not a
 * fallback so much as the honest answer: Opportunity X knows where to look and does
 * not know what the process is called.
 *
 * This is also why the expanded surface is not named "Registration".
 * Registration is one terminal action among several and is wrong for most of
 * the categories the research corpus contains.
 */
export type TerminalVerb = "Apply" | "Enrol" | "Attend" | "Open the announcement";

const VERB_FOR: Record<string, Exclude<TerminalVerb, "Open the announcement">> = {
  EducationalOccupationalProgram: "Apply",
  Scholarship: "Apply",
  Grant: "Apply",
  MonetaryGrant: "Apply",
  JobPosting: "Apply",
  Course: "Enrol",
  Event: "Attend",
  EducationEvent: "Attend",
};

export interface TerminalAction {
  verb: TerminalVerb;
  href: string;
  /** Why this verb, traceable to a declaration or to the absence of one. */
  because: string;
}

export function terminalAction(entity: OpportunityEntity): TerminalAction | null {
  const apply = viewOf(entity, "how-to-apply");
  /*
    A contested application URL means two sources point somewhere different.
    Picking one would send a person to a place the other source disputes, so the
    card offers no terminal action and the inspection surface shows both.
  */
  if (apply.state !== "agreed") return null;

  const verbs = [...new Set(entity.declaredTypes.map((t) => VERB_FOR[t]).filter(Boolean))];

  if (verbs.length === 1) {
    return {
      verb: verbs[0],
      href: apply.value,
      because: `The publisher declared this a ${entity.declaredTypes[0]}.`,
    };
  }

  return {
    verb: "Open the announcement",
    href: apply.value,
    because:
      verbs.length > 1
        ? "Sources describe this as different kinds of thing, so I will not name the process."
        : "No source declared what kind of opportunity this is, so I will not name the process.",
  };
}

/**
 * The sentences the person is actually shown.
 *
 * Built here rather than in the component, and that is the whole point: what
 * gets retained as the delivered explanation is this object, and the component
 * renders it verbatim. A component that composed its own wording would make the
 * record of "what we told someone" a plausible reconstruction rather than the
 * thing itself.
 */
export interface ShownExplanation {
  /** The one-line identification. */
  statement: string;
  /** Verification, in the person's terms, including when it was established. */
  verification: string;
  /** Timing, derived — never read off the page. */
  timing: string;
  /** Why this reached them at all. Pairing-level, and labelled as such. */
  whySurfaced: string;
  /** Everything Opportunity X does not know or cannot reconcile. Never omitted. */
  uncertainties: string[];
}

export interface OpportunityCard {
  entityId: string;

  /** ── Entity level. Checkable against a source. ────────────────────────── */
  title: FieldView;
  organiser: FieldView;
  deadline: FieldView;
  funding: FieldView;
  location: FieldView;
  /** Derived from the deadline and the clock. Never read from the page. */
  timing: OpenState;
  /** Entity-level and identical for every person. Null when never established. */
  verification: VerificationResolution | null;

  /**
   * ── Pairing level. Opportunity X's opinion about one person. ─────────────────
   *
   * A separate key rather than fields alongside the entity facts, so a renderer
   * cannot flatten the two into one list without deliberately doing so.
   */
  pairing: {
    eligibility: PairingJudgments["eligibility"]["verdict"];
    fit: PairingJudgments["fit"]["verdict"];
    risk: PairingJudgments["risk"]["verdict"];
    recommendation: PairingJudgments["recommendation"]["verdict"];
    /** Which judgments decided it — the blockers when withheld. */
    decidedBy: PairingJudgments["recommendation"]["decidedBy"];
    position: number | null;
    outOf: number;
    /** Why this order, in the ranking judgment's own words. */
    rankedOn: string;
  } | null;

  /** ── The person's own words. Never inferred. ──────────────────────────── */
  pursuit: PursuitResolution;
  /**
   * How their declaration changes what happens next.
   *
   * Derived from the declaration and the engine's own uncertainty — never from
   * a judgment it upgrades. An `undetermined` eligibility stays undetermined
   * however keen the person is.
   */
  stance: PursuitStance;

  action: TerminalAction | null;
  shown: ShownExplanation;
}

export interface CardInput {
  entity: OpportunityEntity;
  verification: VerificationRecord | null;
  judgments: PairingJudgments | null;
  pursuit: PursuitResolution;
  now: string;
  /**
   * Whose position the stance sentence describes. Defaults to the reader's.
   *
   * Only the fixture laboratory passes anything else: its cards carry positions
   * the reader did not take, and the sentence has to say so rather than
   * addressing them as though they had.
   */
  voice?: "you" | "this-person";
}

export function projectCard(input: CardInput): OpportunityCard {
  const { entity, now } = input;

  const title = viewOf(entity, "title");
  const organiser = viewOf(entity, "organiser");
  const deadline = viewOf(entity, "deadline");
  const funding = viewOf(entity, "funding");
  const location = viewOf(entity, "location");
  const timing = deriveOpenState(entity, now);

  const verification = input.verification ? resolveVerification(input.verification, now) : null;

  return {
    entityId: entity.id,
    title,
    organiser,
    deadline,
    funding,
    location,
    timing,
    verification,
    pairing: input.judgments
      ? {
          eligibility: input.judgments.eligibility.verdict,
          fit: input.judgments.fit.verdict,
          risk: input.judgments.risk.verdict,
          recommendation: input.judgments.recommendation.verdict,
          decidedBy: input.judgments.recommendation.decidedBy,
          position: input.judgments.ranking.position,
          outOf: input.judgments.ranking.outOf,
          /* The ordering's own sentence, which names what it ordered on. The
             card used to compose "Ranked N of M considered" itself, which is a
             position with no stated basis. */
          rankedOn: input.judgments.ranking.because,
        }
      : null,
    pursuit: input.pursuit,
    stance: deriveStance({
      entity,
      verification,
      judgments: input.judgments,
      pursuit: input.pursuit,
      now,
      voice: input.voice,
    }),
    action: terminalAction(entity),
    shown: explain({ entity, title, organiser, timing, verification, judgments: input.judgments }),
  };
}

/**
 * The deadline as the publisher expressed it.
 *
 * `OpenState` carries only the instant, so the precision has to be read back
 * off the entity. Worth the lookup: the alternative is a sentence that is
 * either less precise than the source (dropping a stated hour) or more precise
 * than it (inventing midnight), and both have already shipped once.
 */
function deadlineWords(entity: OpportunityEntity, iso: string): string {
  const held = entity.fields.find((f) => f.field === "deadline");
  const reading = held?.readings.find((r) => r.value === iso);
  return reading ? readingDate(reading) : (humanDate(iso) ?? iso);
}

/** `how-to-apply` → `how to apply`. A field name a person can read. */
function fieldWords(field: ObservedField): string {
  return field.replace(/-/g, " ");
}

function explain(input: {
  entity: OpportunityEntity;
  title: FieldView;
  organiser: FieldView;
  timing: OpenState;
  verification: VerificationResolution | null;
  judgments: PairingJudgments | null;
}): ShownExplanation {
  const { entity, title, organiser, timing, verification, judgments } = input;

  const name =
    title.state === "agreed"
      ? title.value
      : title.state === "contested"
        ? `${title.readings[0].value} — sources disagree on the name`
        : "An opportunity I could not name";

  const by =
    organiser.state === "agreed"
      ? ` offered by ${organiser.value}`
      : organiser.state === "contested"
        ? " — sources disagree on who is offering it"
        : " — no source said who is offering it";

  const uncertainties: string[] = [];

  for (const field of entity.fields) {
    if (agrees(field)) continue;
    uncertainties.push(
      `Sources give ${field.readings.length} different values for the ${fieldWords(field.field)}.`,
    );
  }
  for (const field of ["deadline", "eligibility", "funding"] as const) {
    if (!entity.fields.some((f) => f.field === field)) {
      uncertainties.push(`No source stated the ${fieldWords(field)}.`);
    }
  }
  if (judgments?.eligibility.verdict === "undetermined") {
    uncertainties.push(judgments.eligibility.because);
  }

  return {
    statement: `${name}${by}.`,

    verification:
      verification === null
        ? "I have not established whether this is real."
        : verification.verdict === "verified"
          ? `Verified against ${verification.basis.distinctSources} independent sources, ${verification.basis.institutionalSources} of them institutional. Established ${humanDate(verification.establishedAt) ?? verification.establishedAt}.`
          : verification.verdict === "expired"
            ? `This was ${verification.lapsedFrom} until ${humanDate(verification.expiresAt) ?? verification.expiresAt}. I have not re-checked it since, so it counts as unverified.`
            : verification.verdict === "contradicted"
              ? "Sources disagree about this opportunity, so I will not call it verified."
              : verification.verdict === "withdrawn"
                ? "Every source I was watching has stopped answering."
                : `Seen, but not corroborated to the depth a ${entity.stakes} opportunity requires.`,

    /*
      As precisely as the publisher was, and no more. A source that named an
      hour gets its hour said back: "Closes 4 September" for something that
      shuts at nine that morning is the midnight bug pointed the other way.
    */
    timing:
      timing.state === "open"
        ? `Closes ${deadlineWords(entity, timing.deadline)}.`
        : timing.state === "closed"
          ? `The deadline passed on ${deadlineWords(entity, timing.deadline)}.`
          : `I cannot tell whether this is still open: ${timing.reason}`,

    whySurfaced:
      judgments === null
        ? "I have not assessed this against what I know about you."
        : /*
             The reason alone, either way.

             The withheld branch prefixed "Not recommended." to a sentence that
             now begins "I won't recommend this yet", so the card read "Not
             recommended. I won't recommend this yet: I haven't established that
             this is real." The prefix existed because the reason used to be a
             fragment — "Withheld on verification." — and it is a whole sentence
             now that carries the verdict itself.
          */
          judgments.recommendation.because,

    uncertainties,
  };
}
