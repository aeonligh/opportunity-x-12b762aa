import type { ObservedField, SourceClass } from "../observation/types";

/**
 * Layer 2 — Entity.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHAT AN ENTITY IS, AND WHAT IT IS NOT
 * ══════════════════════════════════════════════════════════════════════════
 *
 * An entity is Opportunity X's current belief about what an opportunity *is*, assembled
 * from observations and revisable when they change. It is not a listing, and the
 * distinction is the reason this layer exists.
 *
 * A listing is a row someone wrote. An entity is a reconciliation of everything
 * that has been seen, which means it must be able to represent the case a
 * listing cannot: **two sources that disagree.**
 *
 * ── Requirements this file discharges ─────────────────────────────────────
 *
 * E1  Entity-resolution decisions are recorded with their rationale, and
 *     corrections are additive. A superseded resolution stays retrievable. An
 *     entity that was merged wrongly and then split must be able to explain
 *     both decisions, or the correction is indistinguishable from a bug.
 *
 * E2  **An entity can hold claims that disagree, and that state is
 *     expressible.** Every field is a set of readings, never a value. One
 *     reading is agreement; two is a live contradiction that the Verification
 *     layer must resolve or declare. A schema with one column per field makes
 *     disagreement unrepresentable, so the last writer silently wins and the
 *     contradiction becomes invisible at exactly the moment it matters.
 *
 * E3  First-observation provenance is carried on the entity — which source
 *     class saw it first, and when. This is the measurement that decides
 *     whether the discovery model actually reaches opportunities through
 *     institutions, or whether it has quietly become dependent on aggregators.
 *
 * E4  Nothing here is person-scoped. Verification attaches to the entity, so
 *     the entity must be the same object for everyone. A per-user field on this
 *     type would make "verified" mean something different depending on who
 *     asked, which is not verification.
 *
 * ── What is deliberately absent ───────────────────────────────────────────
 *
 * There is no score, no rank, no probability, and no owner. Ranking is a
 * judgment about a person–opportunity pairing and belongs to Layer 3. An
 * `owner_id` on an opportunity is a category error that the shared database
 * already demonstrates: it makes a fact about the world look like a fact about
 * a user, and `docs/constitutional/opportunity-ownership.md` records the formal
 * proof that the resulting rows are unownable.
 */

/**
 * One value a field has been observed to hold.
 *
 * `observedIn` carries the observation ids rather than a count, so the reading
 * can be followed back to the bytes that produced it. A count would tell a
 * reader how many sources agreed and give them no way to check.
 */
export interface EntityReading {
  value: string;
  /**
   * `"day"` when the sources behind this reading named a calendar day and no
   * time. Carried up from `ObservedClaim.precision` so a judgment can tell a
   * deadline meaning "before this instant" from one meaning "any time that
   * day". The difference between the two is the person's last day.
   */
  precision?: "day";
  /** Every observation that carried this value. Never empty. */
  observedIn: [string, ...string[]];
  /**
   * Every extractor that produced it, as `id@version`.
   *
   * Per reading rather than per observation, because several extractors read
   * one document. When one of them is later found to be wrong, this is what
   * identifies the readings it is responsible for — and when two of them
   * disagree, it is what says which said what.
   */
  extractedBy: [string, ...string[]];
  /** The class of the source that first carried it. Powers E3 per field. */
  firstSourceClass: SourceClass;
  firstSeenAt: string;
  lastSeenAt: string;
}

/**
 * What the entity currently holds for one field.
 *
 * A set, not a value — see E2. `readings` is a non-empty tuple because a field
 * with no readings is not a field the entity has; it is simply absent, and
 * absence is represented by the field not appearing.
 */
export interface EntityField {
  field: ObservedField;
  readings: [EntityReading, ...EntityReading[]];
}

/** True when every source that spoke about this field said the same thing. */
export function agrees(field: EntityField): boolean {
  return field.readings.length === 1;
}

/**
 * The decision that this set of observations describes one opportunity.
 *
 * `method` is a closed union because "how did you decide these were the same
 * thing?" must be answerable from the record. URL identity fails in both
 * directions — one URL can serve successive years of a programme, and one
 * programme can live at several URLs — so the method is stored per decision
 * rather than assumed to be the same everywhere.
 *
 * `supersedes` is what makes corrections additive (E1). A revision links to the
 * decision it replaced instead of overwriting it, so the chain can be walked.
 */
export interface EntityResolution {
  decidedAt: string;
  method: /**
     * The publisher named the thing — a schema.org `identifier` or `@id`. The
     * only signal strong enough to merge across domains, and the only one that
     * separates two cycles at one address.
     */
    | "declared-identifier"
    /** The same URL, retrieved again. The weakest identity and the commonest. */
    | "same-url"
    /** Distinct URLs that declare the same canonical. */
    | "canonical-url"
    /** An announcement that links to the organiser's page. */
    | "announcement-link"
    /** A human decided. Always recorded as such, never laundered into a rule. */
    | "operator-decision";
  /**
   * What the method matched on — the URL, the canonical URL, the label an
   * operator decided under. Stored in the clear alongside the entity's id,
   * which is a digest of it, so the id can be checked rather than trusted.
   */
  key: string;
  /** Why, in a sentence a person could disagree with. */
  rationale: string;
  /** Every observation this decision folded in. */
  observationIds: [string, ...string[]];
  /** The decision this one replaces, kept whole. */
  supersedes?: EntityResolution;
}

/**
 * How much is at stake in this opportunity, considered on its own.
 *
 * A property of the opportunity, not of any person. It sets how much
 * corroboration verification requires before it will say "verified" — a
 * fully-funded overseas degree needs more than a free two-hour webinar, because
 * the cost of the system being wrong is not the same.
 *
 * The person's cost of being wrong is a different scaling on a different object
 * and lives in Layer 3. Merging the two produces a single "importance" number
 * that answers neither question.
 */
export type Stakes = "low" | "material" | "life-changing";

export interface OpportunityEntity {
  id: string;
  /** E1 */
  resolution: EntityResolution;
  /** E2 — one entry per field the entity holds anything about. */
  fields: EntityField[];
  /** E3 */
  firstObservation: {
    observationId: string;
    retrievedAt: string;
    sourceClass: SourceClass;
  };
  /**
   * The most recent retrieval folded into this entity. Distinct from
   * verification freshness: a page can be fetched successfully every day and
   * still carry a claim nothing has corroborated.
   */
  lastObservedAt: string;
  stakes: Stakes;
  /**
   * Every type a publisher declared for this opportunity, distinct.
   *
   * Plural because two announcers can declare differently, and the disagreement
   * survives here as it does everywhere else. Empty when nobody declared one —
   * a real state, and the surface then offers to open the announcement rather
   * than naming a process nobody described.
   */
  declaredTypes: string[];
}

/** Read one field's agreed value, or null when it is absent or contested. */
export function agreedValue(entity: OpportunityEntity, field: ObservedField): string | null {
  const held = entity.fields.find((f) => f.field === field);
  if (!held || !agrees(held)) return null;
  return held.readings[0].value;
}

/** Every field on which sources are currently in conflict. */
export function contestedFields(entity: OpportunityEntity): EntityField[] {
  return entity.fields.filter((f) => !agrees(f));
}
