/**
 * The Personal Intelligence Profile — the shape of everything Opportunity X believes
 * about a person, and the terms on which it may use any of it.
 *
 * Constitutional authority:
 *   Product Bible §07  — three honestly distinct tiers. Every entry shows how it
 *                        was learned, its confidence, when it was last updated,
 *                        and which products may use it. Cross-product sharing is
 *                        off by default.
 *   IA Bible §11       — the Profile is the deliberate exception to the
 *                        disappearing interface: the one place the machinery is
 *                        visible on purpose, because visibility is the trust
 *                        mechanism.
 *   IA Bible §18       — blocking: lineage and per-fact freshness must exist
 *                        before the first fact is written, and product isolation
 *                        must be enforced at the data layer because convention
 *                        will not hold.
 *   The Visibility Principle — missing evidence is never negative evidence.
 *
 * These types are the second of two enforcement layers, not the only one. The
 * same invariants are CHECK constraints in Postgres (migration
 * `personal_intelligence_profile`), because TypeScript protects this codebase
 * and the database protects the data — including from a future service, a
 * migration, or a direct SQL session that never sees this file.
 */

/**
 * How quickly confidence in a fact should fade without reinforcement. Decay is a
 * property of the fact, not a global clock (Brand Bible §07): a degree earned in
 * 2024 is still earned; "currently studying" expires in weeks.
 */
export type DecayClass = "monotonic" | "slow" | "fast";

/**
 * The products a fact can be learned in or granted to.
 *
 * A closed union rather than a string, matching the Postgres enum. Adding a
 * product is a deliberate migration on both sides — IA §13 calls this boundary
 * the hardest engineering constraint in the system, and a boundary you can cross
 * with a typo is not a boundary.
 */
export type ProductScope = "opportunity-x" | "elite-ai" | "light-logistics";

/**
 * What a fact asserts.
 *
 * Drawn from PB §07's "structured understanding (goals, strengths, preferences,
 * constraints)". There is deliberately no member for an internal state — no
 * mood, motivation, burnout, confidence, or fear. The Visibility Principle
 * forbids inferring those from behaviour, and the way to enforce a prohibition
 * is to leave nowhere to write it. Adding a member here is a constitutional
 * amendment, not a refactor.
 */
export type FactKind = "attribute" | "goal" | "strength" | "constraint" | "preference";

/**
 * A thing that happened, which an inference may rest on.
 *
 * `observedAt` is required, and that is the load-bearing detail: a non-event has
 * no timestamp. "They never opened a research listing" cannot be written as an
 * Observation, so the inference it would license — that the person is not
 * interested in research — has no path into the Profile. That is the Visibility
 * Principle made structural rather than reviewed.
 *
 * Lineage is required too, as a choice rather than an optional field. The
 * inspection path Finding → Evidence → Source → Observation → Permission is
 * constitutional (IA §11, XB §6), and it is only gapless if every observation
 * can be followed to what produced it. An optional `ref` makes a dead end
 * silent; requiring either a reference or a stated reason makes the dead end
 * declared, which is the same move AbsentState makes against UnknownState.
 */
export type ObservationLineage =
  /** The record that can be re-read — a saved item, an application, an answer. */
  | { ref: string; unaddressable?: never }
  /** No addressable record exists, and why. Stated, never implied. */
  | { unaddressable: string; ref?: never };

export type Observation = {
  /** What happened, in plain language the person would recognise. */
  summary: string;
  /** Where it happened. */
  product: ProductScope;
  /** When it happened. ISO 8601. */
  observedAt: string;
} & ObservationLineage;

/**
 * One product's permission to use one fact.
 *
 * IA §11: "there is one permission record per fact per product, and two ways to
 * read it" — by fact in the Profile, by product in the consent inventory. The
 * uniqueness is enforced in the database; the consent inventory is a SQL view
 * over this same data, so the two readings cannot disagree.
 *
 * A revoked permission is kept, not deleted. Experience Bible §10 requires grant
 * and revoke at equal weight, and a revocation that leaves no trace is not equal
 * to a grant that does.
 */
export interface FactPermission {
  product: ProductScope;
  state: "granted" | "revoked";
  /** When the person decided. Never a default, never set by a migration. */
  decidedAt: string;
}

interface FactBase {
  id: string;
  kind: FactKind;
  /** The claim, as one plain sentence, in the person's terms where possible. */
  statement: string;
  /**
   * How it was learned, in plain language (IA §11). Required on every tier: a
   * fact that cannot explain itself is not shippable, and "it always tells me
   * why" is the compliment PB §07 is written to earn.
   */
  howLearned: string;
  /**
   * The product context it was learned in. Usable there by definition — that is
   * the product's own knowledge. Usable anywhere else only through `permissions`.
   */
  learnedIn: ProductScope;
  /** When Opportunity X last had reason to believe this. Drives the freshness stamp. */
  lastConfirmedAt: string;
  decay: DecayClass;
  /**
   * Which other products may use it. Empty means shared with nothing, and empty
   * is the only possible initial value — there is no "all", and no default that
   * means granted. PB §07: sharing is off until the person turns it on.
   */
  permissions: FactPermission[];
}

/**
 * ✓ Confirmed by you — stated explicitly by the person. Trusted as fact.
 *
 * Carries no confidence and no observations, and the type has nowhere to put
 * either. A confidence score on something a person told you is the system
 * doubting the person, and it would make the three tiers cosmetic rather than
 * "honestly distinct" (PB §07).
 */
export interface ConfirmedFact extends FactBase {
  tier: "confirmed";
  /** When they said it. */
  statedAt: string;
  /**
   * Set when this fact was an inference the person confirmed, rather than one
   * they stated outright.
   *
   * A graduated fact keeps the observations it came from. Clearing them on
   * graduation — which this service originally did — destroys the provenance
   * PB §07 requires when accounting for a wrong model: "a real error with
   * knowable provenance. Names which input, and corrects it." A belief whose
   * origin has been deleted cannot name its input.
   */
  graduatedAt?: string;
  /** Present only on a graduated fact. Its history, not its current basis. */
  observedFrom?: [Observation, ...Observation[]];
}

/**
 * ◐ Inferred by AI — a pattern Opportunity X believes may be true, always labelled so.
 *
 * `observedFrom` is a non-empty tuple by construction. An inference with nothing
 * behind it is a guess wearing a confidence score, and a pipeline that saw
 * nothing cannot produce one.
 */
export interface InferredFact extends FactBase {
  tier: "inferred";
  /** 0 exclusive to 1 inclusive. */
  confidence: number;
  observedFrom: [Observation, ...Observation[]];
  /**
   * PB §07: "rejecting teaches the AI not to repeat the assumption." So a
   * rejection is a record, not a delete — a deleted inference is simply
   * re-derived next week, and the correction the person made is lost. Only this
   * tier can be rejected: a confirmed fact is edited by the person who stated
   * it, and a learned preference evolves on its own.
   */
  rejection?: { rejectedAt: string; note?: string };
}

/**
 * ◎ Learned preference — behavioural, not factual. Interface density,
 * notification frequency, accessibility, working hours. Evolves automatically,
 * always visible and editable (PB §07).
 *
 * Still requires observations: "learned" means observed, and a preference nobody
 * ever demonstrated is an assumption by another name.
 */
export interface LearnedFact extends FactBase {
  tier: "learned";
  confidence: number;
  observedFrom: [Observation, ...Observation[]];
}

export type ProfileFact = ConfirmedFact | InferredFact | LearnedFact;

export type ProfileFactTier = ProfileFact["tier"];

/**
 * What the Profile surface resolves to.
 *
 * Mirrors StepResolution deliberately (see core/step/types.ts). An empty Profile
 * and an unasked Profile are different facts about the world, and Experience
 * Bible §7 requires they never collapse into one grey box: before the handshake
 * Opportunity X holds no understanding, which is not the same as holding none after
 * looking.
 */
export type ProfileResolution =
  | {
      state: "profile";
      facts: ProfileFact[];
      /**
       * Rows that could not be read as facts. Never silently dropped and never
       * coerced into a plausible shape: CS §02 is explicit that a fact arriving
       * without a tier is "a data defect. Render nothing and log — never default
       * to ✓ Confirmed, which would launder unknown provenance into certainty."
       */
      defects: FactDefect[];
    }
  /**
   * The handshake has not happened, established from a recorded
   * `handshake_completed_at` — never inferred from a fact count. Concluding
   * "we have never met" from zero rows is missing evidence treated as negative
   * evidence, and it misreads a person who answered and then deleted
   * everything as one who never arrived.
   */
  | { state: "no-understanding" }
  /** Opportunity X cannot read the Profile. A limit on the system, never on the person. */
  | { state: "unknown"; since: string };

/**
 * What `/profile/[factId]` resolves to.
 *
 * IA §04 gives the route as "one fact — provenance, freshness, lineage", and
 * IA §11 requires it be reachable "from the provenance affordance on any
 * recommendation… Both paths, always." A surface reached from a claim must
 * therefore answer for an id it may not recognise.
 *
 * `not-found` and `unknown` are separate for the reason XB §7 gives everywhere
 * else: one says the record does not exist, the other says the system cannot
 * see. A bad reference reported as a system failure blames Opportunity X for something
 * that is merely absent, and a system failure reported as absence tells a person
 * their fact was deleted when it was not.
 */
export type FactResolution =
  | { state: "fact"; fact: ProfileFact }
  /** No such fact for this person. Not an error. */
  | { state: "not-found" }
  /** Opportunity X cannot read it. A limit on the system, never on the person. */
  | { state: "unknown"; since: string };

/** A stored row that violates the fact model. Surfaced, never rendered. */
export interface FactDefect {
  id: string;
  reason: string;
}

/** A grant or revocation, aggregated by product — the consent inventory's row. */
export interface ConsentSummary {
  product: ProductScope;
  grantedCount: number;
  revokedCount: number;
  /** When the person last made a decision about this product. */
  lastDecidedAt: string | null;
}

/**
 * What a caller may write. Server-assigned fields are absent by construction so
 * a client cannot forge lineage or freshness.
 */
export type ProfileFactDraft =
  | Omit<ConfirmedFact, "id" | "lastConfirmedAt" | "permissions">
  | Omit<InferredFact, "id" | "lastConfirmedAt" | "permissions" | "rejection">
  | Omit<LearnedFact, "id" | "lastConfirmedAt" | "permissions">;

export interface ProfileService {
  /** Every fact Opportunity X holds about this person, whatever its tier. */
  read(userId: string): Promise<ProfileResolution>;

  /**
   * One fact, for `/profile/[factId]` (IA §04).
   *
   * Resolves rather than throws. This surface is reachable from the provenance
   * affordance on any claim (IA §11), so it is routinely handed ids by other
   * code — an exception there becomes a crash on a trust surface, which is the
   * worst possible place for one.
   */
  readFact(userId: string, factId: string): Promise<FactResolution>;

  /**
   * The facts a given product is allowed to use: those learned in it, plus those
   * explicitly granted to it. This is the product-isolation boundary IA §18
   * requires be enforced at the data layer — callers cannot widen it, because
   * there is no parameter that would let them.
   */
  readForProduct(userId: string, product: ProductScope): Promise<ProfileFact[]>;

  record(userId: string, draft: ProfileFactDraft): Promise<ProfileFact>;

  /** Graduates an inference to Confirmed, keeping its lineage. PB §07. */
  confirm(userId: string, factId: string): Promise<ProfileFact>;

  /**
   * Records that the first session happened, so `read()` can distinguish "we
   * have not met" from "you removed everything I knew" without inferring either
   * from a row count.
   */
  completeHandshake(userId: string): Promise<void>;

  /** Corrects the statement in place, where the error is visible (XB §6). */
  edit(userId: string, factId: string, statement: string): Promise<ProfileFact>;

  /** Records a rejection so the assumption is not repeated. Never a delete. */
  reject(userId: string, factId: string, note?: string): Promise<ProfileFact>;

  /** Removes the fact entirely, at the person's instruction. */
  forget(userId: string, factId: string): Promise<void>;

  /**
   * Grant or revoke one product's use of one fact. One method for both, because
   * XB §10 requires equal weight and two methods invite two different amounts of
   * friction.
   */
  decide(
    userId: string,
    factId: string,
    product: ProductScope,
    state: FactPermission["state"]
  ): Promise<FactPermission>;

  /** The same permission records, read by product instead of by fact (IA §11). */
  consentInventory(userId: string): Promise<ConsentSummary[]>;
}
