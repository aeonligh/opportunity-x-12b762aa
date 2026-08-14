import type { DecayClass, Observation, ProductScope } from "@/lib/opportunity/foundation/person";
import type { ProvenanceTier } from "@/components/ui/ProvenanceChip";

/**
 * Tier 0 — the trust primitives, as data.
 *
 * Component System Bible §01 states the composition law: "no component may state
 * a claim without composing the Tier 0 primitives that make it checkable. A
 * statement without provenance is not a component in this system — it is a
 * violation."
 *
 * A law that lives only in prose is a convention, and CS §14 and IA §18 both say
 * conventions do not hold. So the law is encoded here: `Claim` requires its
 * evidence and its base rate as non-optional fields. A recommendation, readiness
 * figure, ranking or profile insight that cannot supply them cannot be
 * constructed, and therefore cannot be rendered.
 *
 * The inspection path the constitution requires —
 *   Finding → Evidence → Source → Observation → Permission
 * — is expressed as a chain of required references, so a gap is a type error
 * rather than a missing link discovered by a user.
 */

/** Which of the three legitimate origins produced a step (XB §2, §5). */
export type ClaimOrigin = "revelation" | "understanding" | "stable";

/**
 * Where a piece of evidence ultimately came from — Depth 3 in the verification
 * model (XB §6), which "always shows its own freshness. A source verified two
 * years ago is labelled as such."
 */
export interface SourceRef {
  /** What it is, in the person's terms. "DAAD 2027 programme page". */
  label: string;
  kind: "listing" | "document" | "record" | "statement" | "observation";
  /** The original, where one can be linked. */
  href?: string;
  /** When AEON X last checked it. Never omitted — see FreshnessStamp. */
  lastVerifiedAt: string;
  decay: DecayClass;
}

/**
 * The competitive reality of an opportunity.
 *
 * Three states, never an optional field. CS §02 and assumption C-02 are explicit
 * that when an opportunity is contested but the figures are unknown, the
 * component "renders explicitly: 'Competition for this is unknown to me.'
 * Silence would let the person infer the field is uncontested — a false
 * impression created by omission."
 *
 * An optional `baseRate?` produces exactly that silence, and cannot distinguish
 * "no contest" from "contest, figures unknown" from "nobody thought about it".
 * The union makes the third case unrepresentable and the first two distinct.
 */
export type BaseRate =
  | {
      state: "known";
      places: number;
      applicants: number;
      /** The period the applicant figure was observed in, e.g. "2025 intake". */
      observedIn: string;
      /**
       * CS §02, Engineering: "Base rates need their own provenance and
       * freshness; last year's applicant count is a decaying fact like any
       * other." A base rate presented without its own source is the same
       * half-truth it exists to prevent.
       */
      source: SourceRef;
      lastConfirmedAt: string;
      decay: DecayClass;
    }
  /** Contested, figures unavailable. Stated aloud, never left blank. */
  | { state: "unknown" }
  /** Genuinely not a contest — an open course, a rolling intake. */
  | { state: "uncontested" };

/**
 * One sentence of reasoning, and everything needed to check it.
 *
 * CS §02 EvidenceLine: "reasoning that costs an interaction is reasoning most
 * people never read, which makes confidence unearned." So `summary` ships inline
 * with the claim; the rest of this shape is what the person reaches when they
 * decide to look further.
 */
interface EvidenceBase {
  /** The inline sentence. Capped at 58ch when rendered. Never generic filler. */
  summary: string;
  /** When AEON X last had reason to believe it. */
  lastConfirmedAt: string;
  decay: DecayClass;
  /** Depth 3 — the original. */
  source: SourceRef;
  /**
   * Depth 4 — what was actually seen. Empty only for a `confirmed` tier, where
   * the person's own statement is the origin and there is nothing observed
   * behind it.
   */
  observations: Observation[];
  /**
   * The Profile fact this rests on, when it rests on one. Carrying the id is
   * what lets the inspection path continue from Observation into Permission —
   * IA §11 requires the provenance affordance to land "directly on the fact that
   * produced it".
   */
  factId?: string;
  /** Which product's context produced this. */
  product: ProductScope;
}

/**
 * Evidence, with confidence attached to exactly the tiers that have one.
 *
 * The same discrimination as the fact model: a `confirmed` origin carries no
 * confidence, because a confidence score on something a person stated is the
 * system doubting the person. A renderer therefore cannot read a confidence off
 * confirmed evidence, and cannot fall back to a plausible number when one is
 * absent — the fallback has nowhere to live.
 */
/**
 * Brand: only `evidenceFromFact` may mint Evidence.
 *
 * Brand Bible A-04 requires that a derived claim "inherits and displays" the
 * provenance of the fact behind it, and that "confidence is never laundered into
 * something the system appears to have verified itself."
 *
 * A constructor that derives provenance correctly is worth nothing if a caller
 * can bypass it with an object literal — that would leave the rule as a
 * convention, and CS §14 and IA §18 both say conventions do not hold. This
 * private symbol is not exported, so no other module can satisfy the type by
 * hand. `src/lib/core/tier0/evidence.ts` performs the single assertion that
 * mints one, from a `ProfileFact`, with provenance computed rather than passed.
 *
 * The brand is a type-level marker only. It does not exist at runtime, costs
 * nothing, and is invisible to every consumer that merely *reads* evidence.
 */
declare const EVIDENCE_PROVENANCE_CHECKED: unique symbol;

/**
 * The shape of evidence, before the provenance check.
 *
 * Exported so `evidenceFromFact` can name its own return value. Exporting it is
 * safe: producing this shape is not enough to produce `Evidence`, because the
 * brand below cannot be satisfied outside `types.ts`. It is a parameter type,
 * never an accepted substitute.
 */
export type UncheckedEvidence = EvidenceBase &
  (
    | { provenance: "confirmed" }
    | { provenance: "inferred" | "learned"; confidence: number }
  );

export type Evidence = UncheckedEvidence & {
  readonly [EVIDENCE_PROVENANCE_CHECKED]: true;
};

/**
 * Anything AEON X asserts: a step, a ranking, a readiness figure, an insight.
 *
 * `evidence` and `baseRate` are required. That is the composition law, and it is
 * the entire reason this type exists rather than being a loose set of props.
 */
/**
 * One input a ranking rested on.
 *
 * XB §6, Level 1: "Why this, ahead of what, on which criteria. Includes the
 * provenance tier of every input." The tier is what makes an input challengeable
 * — a criterion sourced from something the person stated carries different
 * weight from one the system inferred, and the panel has to show which.
 *
 * `factId` is what makes the input editable in place (CS §04): correcting it
 * writes to the Profile fact it came from, rather than to a copy that would then
 * disagree with the Profile.
 */
export interface ClaimInput {
  /** The criterion, in plain language. "Funding must be full." */
  criterion: string;
  /** Whether this input was met, unmet, or could not be evaluated. */
  status: "met" | "unmet" | "unknown";
  provenance: ProvenanceTier;
  /** The Profile fact behind it, where there is one. Enables in-place edit. */
  factId?: string;
}

/**
 * The next-ranked alternative.
 *
 * Deliberately ONE, not a set. CS §04 says "opens reasoning and the runner-up
 * together" and XB §2 says "the next-ranked step" — both singular. A list of
 * competing hypotheses is not in the constitution, and offering several would
 * rebuild the ranked list that CS §04 rejects for the Step itself ("a ranked
 * list of three transfers the decision back to a person who came here because
 * deciding was hard").
 */
export interface RunnerUp {
  statement: string;
  /** Why it ranked second. Never a hedge — a stated, checkable difference. */
  whyNot: string;
}

export interface Claim {
  id: string;
  /** The assertion itself, in one sentence. */
  statement: string;
  origin: ClaimOrigin;
  evidence: Evidence;
  baseRate: BaseRate;
  /** When this was computed. Steps are stored, never computed on request. */
  computedAt: string;
  /**
   * For a `stable` origin: when this first became the answer. Powers "unchanged
   * 12 days", which CS §02 notes is confidence rather than staleness.
   */
  unchangedSince?: string;

  /**
   * The criteria this ranking rested on, each with its provenance tier (XB §6).
   * Optional at the type level and handled explicitly at the render: CS §04's
   * failure clause requires that when reasoning cannot be retrieved the panel
   * says so and still offers the runner-up, so "absent" must be representable
   * rather than impossible.
   */
  inputs?: ClaimInput[];

  /** The next-ranked step. One, per CS §04 and XB §2. */
  runnerUp?: RunnerUp;
}

/**
 * How confidently a claim's underlying understanding is held.
 *
 * Deliberately coarse. CS §02 rejects a confidence percentage outright: "a
 * number implies precision the model doesn't have, and invites optimising the
 * number." PB §07 nonetheless requires that every Profile entry show "its
 * confidence" — so confidence is stored as a float and *rendered* as one of
 * three bands, which satisfies the requirement without publishing a false
 * precision.
 */
export type ConfidenceBand = "held-firmly" | "held-loosely" | "provisional";

export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.8) return "held-firmly";
  if (confidence >= 0.5) return "held-loosely";
  return "provisional";
}

export const CONFIDENCE_LABEL: Record<ConfidenceBand, string> = {
  "held-firmly": "Held firmly",
  "held-loosely": "Held loosely",
  provisional: "Provisional",
};
