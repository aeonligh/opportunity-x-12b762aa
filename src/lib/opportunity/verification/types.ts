import type { SourceClass } from "../observation/types";
import type { Stakes } from "../entity/types";

/**
 * Verification — a property of the entity, never of the pairing.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * THE ONE RULE THAT SHAPES EVERY TYPE BELOW
 * ══════════════════════════════════════════════════════════════════════════
 *
 * **Verification is a property of the opportunity. Risk is a property of the
 * person–opportunity pairing.**
 *
 * Whether an opportunity is real does not depend on who is asking. A per-user
 * verification field would make "verified" mean one thing for one person and
 * another for the next, which is not verification — it is a personalised
 * opinion wearing verification's name. So `VerificationRecord` is keyed by
 * `entityId` alone, and there is no member on it that could hold a person.
 *
 * What *does* vary by person is what it costs them to be wrong. That is risk,
 * it lives in Layer 3, and it is a different scaling on a different object.
 *
 * ── Requirements this file discharges ─────────────────────────────────────
 *
 * V1  Verification state carries an expiry and **fails closed**. Expired means
 *     not verified. Never "still verified, just old". The expiry is applied at
 *     read time by `resolveVerification`, so a stale row cannot present itself
 *     as fresh merely because nothing ran to demote it.
 *
 * V2  **Transitions are retained**, not merely the current state. The decisive
 *     question — has anything ever gone verified → unverified? — is answerable
 *     only from a history. A system storing current state alone can claim decay
 *     works and never be contradicted, because there is nothing to check it
 *     against.
 *
 * V3  **Verification depth scales with the opportunity's inherent stakes.** A
 *     fully-funded overseas degree and a free two-hour webinar do not deserve
 *     the same corroboration, because the cost of the system being wrong is not
 *     the same. This is the entity-side scaling; the person-side one is the
 *     recommendation threshold, and they are deliberately separate.
 *
 * V4  **Closure is derived, never read.** No source expresses closure reliably:
 *     a programme page stays up after its deadline, an announcement is never
 *     retracted, an application portal simply stops accepting. So "is this
 *     still open?" is computed from an observed deadline and the clock, and it
 *     answers `unknown` when there is no deadline — never `open`. Defaulting to
 *     open is how a system recommends something that closed last month.
 *
 * V5  An entity can hold claims that disagree, and verification must be able to
 *     say so. `contradicted` is a first-class verdict, not an error. Silently
 *     picking the most recent reading would resolve the disagreement by
 *     recency, which is a decision nobody made and nobody can review.
 */

/**
 * What corroborates a verification.
 *
 * `institutionalSources` is counted separately from the total because an
 * aggregator agreeing with another aggregator is not corroboration — both may
 * be republishing the same original, and neither took responsibility for it.
 */
export interface VerificationBasis {
  /** Distinct sources that carried the decisive fields. */
  distinctSources: number;
  /** Of those, how many were an official page or an institutional announcer. */
  institutionalSources: number;
  /** The source classes seen, kept so the basis can be inspected not just counted. */
  sourceClasses: SourceClass[];
  /** Observations the verdict rests on. Followable to the retained bytes. */
  observationIds: string[];
}

/**
 * The verdicts that can be *stored*.
 *
 * `expired` is deliberately not among them. Expiry is a function of the clock,
 * and storing it would mean the record is only correct until the next tick —
 * a row that says `verified` at 23:59 and is still saying it at 00:01 because
 * no job ran. Expiry is applied on every read instead, which cannot be missed.
 */
export type StoredVerdict =
  /** Seen, not yet corroborated to the depth its stakes require. */
  | "unverified"
  /** Corroborated to that depth. */
  | "verified"
  /** Sources disagree on a decisive field. V5. */
  | "contradicted"
  /** A source Opportunity X was watching stopped answering, or said it is over. */
  | "withdrawn";

/** What a reader gets. `expired` appears only here — it is always derived. */
export type Verdict = StoredVerdict | "expired";

export interface VerificationTransition {
  from: StoredVerdict | null;
  to: StoredVerdict;
  at: string;
  /** Why, in a sentence. Never a code a reader has to look up. */
  reason: string;
  /** The observation that caused it, where one did. */
  observationId?: string;
}

export interface VerificationRecord {
  entityId: string;
  verdict: StoredVerdict;
  establishedAt: string;
  /** V1 — derived from stakes at establishment. Never read from a source. */
  expiresAt: string;
  basis: VerificationBasis;
  /** V2 — oldest first. Append-only, like the observations underneath it. */
  transitions: [VerificationTransition, ...VerificationTransition[]];
}

/**
 * What verification resolves to right now.
 *
 * A resolution rather than a bare verdict, because "verified until when" and
 * "verified on what basis" are part of the answer. A surface handed only the
 * word `verified` has to invent the freshness stamp it is required to show.
 */
export interface VerificationResolution {
  verdict: Verdict;
  /** Present for every verdict. The reader always knows when this was decided. */
  establishedAt: string;
  expiresAt: string;
  basis: VerificationBasis;
  /** Set when the verdict is `expired`: what it was before the clock demoted it. */
  lapsedFrom?: StoredVerdict;
}

/**
 * How much corroboration a given stakes level demands.
 *
 * V3. The numbers are a starting position and are stated here rather than
 * scattered through the checker so they can be argued with in one place. What
 * is not negotiable is the shape: more at stake means more required, and the
 * life-changing tier cannot be satisfied by aggregators alone.
 */
export interface CorroborationRequirement {
  distinctSources: number;
  institutionalSources: number;
  /** How long a verification stands before it must be re-established, in days. */
  freshnessDays: number;
}

export const CORROBORATION: Record<Stakes, CorroborationRequirement> = {
  /* A free webinar. One source is enough; being wrong costs an hour. */
  low: { distinctSources: 1, institutionalSources: 0, freshnessDays: 30 },
  /* A paid programme, a competition with a fee, a training place. */
  material: { distinctSources: 2, institutionalSources: 1, freshnessDays: 14 },
  /*
    A funded degree, a fellowship, a relocation. Two institutional sources,
    re-checked weekly. The tighter freshness is not fussiness: the more a person
    reorganises their life around an opportunity, the more expensive it is for
    Opportunity X to have been right last month and wrong today.
  */
  "life-changing": { distinctSources: 3, institutionalSources: 2, freshnessDays: 7 },
};

/**
 * Whether the opportunity is still open.
 *
 * V4. Three states, and `unknown` is the one that does the work: an opportunity
 * with no observed deadline is not open, it is undated, and telling someone it
 * is open would be asserting something no source said.
 */
export type OpenState =
  | { state: "open"; deadline: string }
  | { state: "closed"; deadline: string }
  /** No deadline has been observed, or the ones observed disagree. */
  | { state: "unknown"; reason: string };
