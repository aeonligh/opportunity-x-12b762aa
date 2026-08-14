import type { ProvenanceTier } from "@/components/ui/ProvenanceChip";
import type { OpportunityEntity } from "../entity/types";
import type { VerificationResolution } from "../verification/types";

/**
 * Layer 3 — Judgment.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * SIX JUDGMENTS, AND WHY THEY ARE SIX
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A single "match score" answers no question truthfully. Asked what an 82 means,
 * a system that stores one cannot say whether the opportunity is real, whether
 * the person may apply, whether it suits them, what it costs them to be wrong,
 * or whether it should have been shown at all — because the number was produced
 * by collapsing all five into one, and the collapse is not invertible.
 *
 * So there are six judgments, each independently addressable, each carrying its
 * own evidence:
 *
 *   1. verification    Is this real?              — about the ENTITY
 *   2. eligibility     May this person apply?     — about the PAIRING
 *   3. fit             Does it suit them?         — about the PAIRING
 *   4. risk            What does being wrong cost THEM? — about the PAIRING
 *   5. ranking         Where does it place?       — about the PAIRING
 *   6. recommendation  Should it be surfaced?     — about the PAIRING
 *
 * **They must be capable of disagreeing.** A verified opportunity a person is
 * ineligible for; a perfect fit that cannot be verified; a high-ranking
 * opportunity withheld because the risk to this person is wrong. If verification
 * and ranking never diverge across a live corpus, they are one computation
 * wearing two names, and `divergence.ts` measures exactly that.
 *
 * Verification is in the list but is the odd one out on purpose: it attaches to
 * the entity, so it is byte-identical for everyone. The other five are keyed by
 * (person, entity). That asymmetry is the constitutional line between "is this
 * real" and "is this right for you", and flattening it is how a system ends up
 * with a per-user notion of truth.
 *
 * ── What cannot be represented here, and why ──────────────────────────────
 *
 * **There is no composite score.** No member of any verdict union is a number
 * that stands for several judgments at once.
 *
 * **There is no predicted probability of winning.** Not as a field, not as a
 * derived getter, not as an internal. A stored probability is a number someone
 * will eventually render, and a system that tells a person it thinks they have
 * a 12% chance has told them something it cannot possibly know and that they
 * cannot possibly act on. Unrepresentable, therefore unshowable.
 *
 * **There is no capability inference from cohort.** Circumstance and capability
 * are different types here. "Studied at a polytechnic" is a circumstance. "Is
 * unlikely to win a Chevening" is a capability claim derived from a cohort, and
 * the ranking input union below has no member that could carry it.
 */

/**
 * The inputs a ranking may rest on.
 *
 * A closed union, and the closure is the guard. There is deliberately **no
 * member** for:
 *
 *   - behavioural signals — what the person clicked, how long they lingered;
 *   - popularity — how many others viewed, saved, or applied;
 *   - commercial arrangements — who paid, who partnered, who sponsored;
 *   - cohort outcomes — how people "like this person" fared.
 *
 * Each of those is excluded for its own reason. Behaviour is the raw material of
 * the engagement products this one exists as an alternative to. Popularity ranks
 * by crowd rather than by fit, and in this domain the crowd is precisely the
 * information asymmetry the product is trying to remove. Commercial influence
 * over ranking is the line the product does not cross: no one who benefits from
 * being surfaced may pay for it. Cohort outcome infers destiny from
 * circumstance.
 *
 * Adding a member here is an amendment, and it will be visible in a diff as one
 * — which is the entire reason the union exists rather than a `Record<string,
 * number>` of weights.
 */
export type RankingInputKind =
  /** Something the person stated they want. */
  | "stated-goal"
  /** Something the person stated they cannot do. */
  | "stated-constraint"
  /** Something the person stated they prefer. */
  | "stated-preference"
  /** A verified fact about the opportunity itself. */
  | "entity-attribute"
  /** How near the deadline is, against what the person said about their time. */
  | "deadline-proximity"
  /** The competitive reality, where it is known. Never a personal probability. */
  | "base-rate";

/**
 * One input, with everything needed to challenge it.
 *
 * `provenance` is required. An input a person cannot trace to something they
 * said, or to something the system observed, is an input they cannot argue
 * with, and a ranking nobody can argue with is not inspectable however many
 * fields it exposes.
 */
export interface RankingInput {
  kind: RankingInputKind;
  /** The criterion, in plain language. "Funding must be full." */
  criterion: string;
  status: "met" | "unmet" | "unknown";
  provenance: ProvenanceTier;
  /** The Profile fact behind it, where there is one. Makes it editable in place. */
  factId?: string;
  /** The entity field behind it, where there is one. */
  entityField?: string;
}

export type JudgmentKind =
  | "verification"
  | "eligibility"
  | "fit"
  | "risk"
  | "ranking"
  | "recommendation";

/**
 * `undetermined` is a verdict, not a gap.
 *
 * Every pairing judgment can reach it, and reaching it is frequently the right
 * answer. The alternative — defaulting to the permissive verdict when evidence
 * is thin — is how a system tells someone they are eligible for something they
 * are not.
 */
interface JudgmentBase {
  entityId: string;
  computedAt: string;
  /**
   * The version of the logic that produced this verdict.
   *
   * Without it a recomputable judgment is not recomputable — there is no way to
   * reproduce what was decided, only what today's code would decide. A judgment
   * whose logic version was not retained has to be treated as permanent
   * evidence rather than a projection, because nothing can regenerate it.
   */
  logicVersion: string;
  /** Why, in one sentence, in the person's terms. Never a code. */
  because: string;
}

/** Entity-scoped. The same for every person, by construction. */
export interface VerificationJudgment extends JudgmentBase {
  kind: "verification";
  resolution: VerificationResolution;
}

interface PairingJudgmentBase extends JudgmentBase {
  personId: string;
}

/**
 * May this person apply?
 *
 * `ineligible` is the asymmetric verdict and is guarded accordingly in the
 * service: it may only be reached from an explicit disqualifying fact the person
 * themselves stated. **Missing evidence is never negative evidence.** A person
 * who has not told AEON X their nationality is `undetermined`, never
 * `ineligible` — the second would shut a door on the strength of a blank field,
 * and they would never know it happened.
 */
export interface EligibilityJudgment extends PairingJudgmentBase {
  kind: "eligibility";
  verdict: "eligible" | "ineligible" | "undetermined";
  /** Every requirement checked, met or not. The complete list, not the failures. */
  requirements: RankingInput[];
}

export interface FitJudgment extends PairingJudgmentBase {
  kind: "fit";
  verdict: "fits" | "does-not-fit" | "undetermined";
  inputs: RankingInput[];
}

/**
 * What it costs *this person* to be wrong.
 *
 * Not how likely they are to succeed — that is the probability this system does
 * not compute. Risk here is the consequence side alone: a relocation they cannot
 * fund, an application fee they cannot afford, a term they would have to
 * abandon. Two people can face very different risk on the same verified
 * opportunity, which is exactly why this is a pairing judgment and verification
 * is not.
 */
export interface RiskJudgment extends PairingJudgmentBase {
  kind: "risk";
  verdict: "low" | "material" | "high" | "undetermined";
  /** The specific costs identified. Empty is only valid with `undetermined`. */
  costs: string[];
}

export interface RankingJudgment extends PairingJudgmentBase {
  kind: "ranking";
  /** Position among the candidates considered, 1-based. Null when unranked. */
  position: number | null;
  /** How many were considered. Makes the position interpretable. */
  outOf: number;
  /** G2 — enumerable and inspectable, with the prohibited classes absent. */
  inputs: RankingInput[];
}

/**
 * Should this be surfaced to this person at all?
 *
 * Separate from ranking on purpose. The top-ranked opportunity is not
 * automatically the one to show: it may be unverified, it may carry risk this
 * person should not take, it may be a week past the point where applying is
 * realistic. A system where recommendation is just "ranking position 1" has five
 * judgments, not six.
 */
export interface RecommendationJudgment extends PairingJudgmentBase {
  kind: "recommendation";
  verdict: "recommend" | "withhold";
  /** Which of the other judgments decided it. Names the blocker when withholding. */
  decidedBy: JudgmentKind[];
}

export type Judgment =
  | VerificationJudgment
  | EligibilityJudgment
  | FitJudgment
  | RiskJudgment
  | RankingJudgment
  | RecommendationJudgment;

/**
 * The full set for one pairing.
 *
 * All six are required. An optional judgment is a judgment that will sometimes
 * be absent, and a consumer facing an absent judgment has to choose a default —
 * which relocates the decision from this file, where it is reviewable, to a
 * render path, where it is not.
 */
export interface PairingJudgments {
  personId: string;
  entityId: string;
  verification: VerificationJudgment;
  eligibility: EligibilityJudgment;
  fit: FitJudgment;
  risk: RiskJudgment;
  ranking: RankingJudgment;
  recommendation: RecommendationJudgment;
}

/**
 * A person disagreeing with a judgment.
 *
 * First-class, and **excluded from every learning input**. That exclusion is the
 * point of the type: an override that feeds back into ranking turns a
 * correction into training data, and the person who corrected the system
 * discovers next month that it has generalised their one-off decision into a
 * belief about them. Overrides are honoured and remembered; they are never
 * learned from.
 */
export interface Override {
  personId: string;
  entityId: string;
  kind: JudgmentKind;
  /** What the person said instead. Their words where possible. */
  statement: string;
  decidedAt: string;
  /**
   * Structurally `true`, always. A literal type rather than a boolean, so a
   * pipeline that tried to include overrides in training would have to change
   * this type to do it — which is a visible amendment rather than a filter
   * someone forgot.
   */
  readonly excludedFromLearning: true;
}

export function isEntityScoped(judgment: Judgment): judgment is VerificationJudgment {
  return judgment.kind === "verification";
}

/** Read the entity a judgment set is about, for callers that hold only the set. */
export function judgedEntity(
  judgments: PairingJudgments,
  entities: readonly OpportunityEntity[]
): OpportunityEntity | null {
  return entities.find((e) => e.id === judgments.entityId) ?? null;
}
