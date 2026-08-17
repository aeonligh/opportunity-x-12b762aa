import type { ProfileFact } from "@/lib/opportunity/foundation/person";
import { agreedValue, type OpportunityEntity } from "../entity/types";
import { deriveOpenState, resolveVerification } from "../verification/service";
import type { VerificationRecord } from "../verification/types";
import type {
  EligibilityJudgment,
  FitJudgment,
  PairingJudgments,
  RankingInput,
  RankingJudgment,
  RecommendationJudgment,
  RiskJudgment,
  VerificationJudgment,
} from "./types";

/**
 * Computing the six judgments.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHAT THIS VERSION CAN AND CANNOT DECIDE — STATED UP FRONT
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Three of the six rest on facts about the world and the clock, and are decided
 * here in full:
 *
 *   verification — established at Layer 2, resolved against the clock;
 *   ranking      — on verification, open state and deadline proximity;
 *   recommendation — on the other five.
 *
 * Three rest on reading a person's circumstances against an opportunity's
 * requirements written in prose, which is a semantic judgment:
 *
 *   eligibility, fit, risk.
 *
 * **This version returns `undetermined` for those three, and says so.** That is
 * not a stub and it is not a placeholder — `undetermined` is a real verdict with
 * a real meaning, and it is the correct one when the system has not read the
 * requirements. The alternative, a keyword overlap between an eligibility
 * paragraph and a person's stated goals, would produce a verdict that looks
 * decided and is not, which is worse than the honest one in exactly the case
 * that matters: telling someone they are eligible for something they are not.
 *
 * `PairingAssessor` is the seam where a semantic assessor attaches. It is a
 * parameter rather than an import so the deterministic judgments stay testable
 * without one, and so the day a model is wired in, nothing above this file
 * changes.
 *
 * ── The asymmetry rule, and where it is enforced ──────────────────────────
 *
 * **A negative judgment requires stronger evidence than a positive one.**
 * Telling someone they cannot apply closes a door they may never learn was
 * closed; telling them they can costs them an application they chose to make.
 * So `ineligible` and `does-not-fit` may only be reached from a **confirmed**
 * fact — something the person stated themselves — while their positive
 * counterparts may rest on an inference. Absence never reaches either: missing
 * evidence is not negative evidence, and a blank field is not a disqualification.
 */

export const JUDGMENT_LOGIC_VERSION = "1.0.0";

/**
 * The seam for semantic assessment.
 *
 * An implementation reads the entity's prose requirements against the person's
 * facts and returns inputs with real statuses. Everything it returns is subject
 * to the asymmetry rule below — an assessor cannot reach a negative verdict on
 * its own, because the verdict is decided here from the inputs, not by it.
 */
export interface PairingAssessor {
  version: string;
  eligibility(entity: OpportunityEntity, facts: readonly ProfileFact[]): RankingInput[];
  fit(entity: OpportunityEntity, facts: readonly ProfileFact[]): RankingInput[];
  risk(entity: OpportunityEntity, facts: readonly ProfileFact[]): string[];
}

/**
 * The assessor used when none is supplied.
 *
 * Returns nothing, for every pairing, always. Deliberately not a heuristic: a
 * heuristic here would be the compliance-shaped failure this whole layer is
 * built to avoid — the requirement "eligibility is assessed" nominally
 * satisfied, substantively void, and invisible because the output has the same
 * shape either way.
 */
export const NO_ASSESSOR: PairingAssessor = {
  version: "none",
  eligibility: () => [],
  fit: () => [],
  risk: () => [],
};

/** A confirmed fact is one the person stated. Only those can carry a negative. */
function hasConfirmedUnmet(inputs: readonly RankingInput[]): boolean {
  return inputs.some((i) => i.status === "unmet" && i.provenance === "confirmed");
}

function daysUntil(deadline: string, now: string): number {
  return (new Date(deadline).getTime() - new Date(now).getTime()) / 86_400_000;
}

export interface JudgeInput {
  personId: string;
  entity: OpportunityEntity;
  verification: VerificationRecord;
  /** The person's facts, already scoped to this product by the Profile service. */
  facts: readonly ProfileFact[];
  now: string;
  /** Position among the candidates considered, and how many there were. */
  ranking: { position: number | null; outOf: number };
  assessor?: PairingAssessor;
}

/**
 * Why a recommendation was withheld, in words a person can act on.
 *
 * This produced `Withheld on verification.` — the blocker enum joined with
 * commas. Seen in a browser it is the sentence that explains why Opportunity X will
 * not vouch for something, rendered as an internal field name. "Withheld" also
 * reads as *hidden*, which is the opposite of what happened: the opportunity is
 * right there, and what is being withheld is the endorsement.
 *
 * One clause per blocker, in the order they are checked, so a person learns
 * what would have to change rather than which subsystem objected.
 */
const WITHHELD: Record<RecommendationJudgment["decidedBy"][number], string> = {
  verification: "I haven’t established that this is real",
  eligibility: "what I know about you rules this out",
  fit: "this doesn’t match what you said you want",
  risk: "what it would cost you to be wrong is too high",
  ranking: "its deadline has passed",
  /* Never reached — recommendation is not one of its own blockers. Present
     because `decidedBy` is typed as every judgment kind, and a partial record
     here would be a silent `undefined` in a sentence. */
  recommendation: "I have not finished weighing this",
};

function withheldBecause(blockers: RecommendationJudgment["decidedBy"]): string {
  const reasons = blockers.map((b) => WITHHELD[b]);
  const joined =
    reasons.length === 1
      ? reasons[0]
      : `${reasons.slice(0, -1).join(", ")} and ${reasons[reasons.length - 1]}`;

  return `I won’t recommend this yet: ${joined}.`;
}

export function judge(input: JudgeInput): PairingJudgments {
  const assessor = input.assessor ?? NO_ASSESSOR;
  const { entity, personId, now } = input;
  const logicVersion = `${JUDGMENT_LOGIC_VERSION}+assessor:${assessor.version}`;

  const resolution = resolveVerification(input.verification, now);
  const openState = deriveOpenState(entity, now);

  const verification: VerificationJudgment = {
    kind: "verification",
    entityId: entity.id,
    computedAt: now,
    logicVersion,
    resolution,
    because:
      resolution.verdict === "expired"
        ? `Last established ${resolution.establishedAt}; the verification lapsed on ${resolution.expiresAt}.`
        : `${resolution.basis.distinctSources} independent sources, ${resolution.basis.institutionalSources} institutional.`,
  };

  /* ── Eligibility ──────────────────────────────────────────────────────── */

  const requirements = assessor.eligibility(entity, input.facts);
  const eligibility: EligibilityJudgment = {
    kind: "eligibility",
    personId,
    entityId: entity.id,
    computedAt: now,
    logicVersion,
    requirements,
    verdict:
      /*
        The negative first, and only from a confirmed unmet requirement. Order
        matters: checking "all met" first would let a single unknown requirement
        turn a disqualification into a pass.
      */
      hasConfirmedUnmet(requirements)
        ? "ineligible"
        : requirements.length > 0 && requirements.every((r) => r.status === "met")
          ? "eligible"
          : "undetermined",
    because:
      requirements.length === 0
        ? "I have not read this opportunity’s requirements against what I know about you."
        : hasConfirmedUnmet(requirements)
          ? "You told me something that rules this out."
          : requirements.every((r) => r.status === "met")
            ? "Every requirement I could check is met."
            : "Some requirements could not be checked against what I know.",
  };

  /* ── Fit ──────────────────────────────────────────────────────────────── */

  const fitInputs = assessor.fit(entity, input.facts);
  const fit: FitJudgment = {
    kind: "fit",
    personId,
    entityId: entity.id,
    computedAt: now,
    logicVersion,
    inputs: fitInputs,
    verdict: hasConfirmedUnmet(fitInputs)
      ? "does-not-fit"
      : fitInputs.length > 0 && fitInputs.every((i) => i.status === "met")
        ? "fits"
        : "undetermined",
    because:
      fitInputs.length === 0
        ? "I have not assessed this against what you said you want."
        : "Assessed against what you told me you want.",
  };

  /* ── Risk ─────────────────────────────────────────────────────────────── */

  const costs = assessor.risk(entity, input.facts);
  const risk: RiskJudgment = {
    kind: "risk",
    personId,
    entityId: entity.id,
    computedAt: now,
    logicVersion,
    costs,
    /*
      Risk is about consequence, not likelihood. There is no probability here
      and no field one could be written into. `undetermined` with an empty cost
      list is the honest reading when nobody has established what this would
      cost this person.
    */
    verdict:
      costs.length === 0 ? "undetermined" : entity.stakes === "life-changing" ? "high" : "material",
    because:
      costs.length === 0
        ? "I have not established what pursuing this would cost you."
        : `Identified: ${costs.join("; ")}.`,
  };

  /* ── Ranking ──────────────────────────────────────────────────────────── */

  const inputs: RankingInput[] = [
    {
      kind: "entity-attribute",
      criterion: "The opportunity is verified.",
      status:
        resolution.verdict === "verified"
          ? "met"
          : resolution.verdict === "expired"
            ? "unknown"
            : "unmet",
      provenance: "inferred",
      entityField: "verification",
    },
  ];

  if (openState.state === "unknown") {
    inputs.push({
      kind: "deadline-proximity",
      criterion: "There is a deadline I can read.",
      status: "unknown",
      provenance: "inferred",
      entityField: "deadline",
    });
  } else {
    /*
      Zero is the floor, for the same reason it is in `deriveUrgency`.

      `deriveOpenState` reports the instant the publisher denoted — the *start*
      of a day-precision deadline — while deciding open-or-closed against the
      end of that day. So on the final day the state is legitimately `open` and
      the raw subtraction is already negative, and this read "There are -1 days
      until the deadline" on an opportunity that was still open.

      `deriveUrgency` clamped and this did not, which is why the card said
      "today is the last day" and the ranking underneath it said -1. The state
      is authoritative: if it says open, the remaining time is not negative.
    */
    const days = Math.max(0, Math.floor(daysUntil(openState.deadline, now)));
    inputs.push({
      kind: "deadline-proximity",
      criterion:
        openState.state === "closed"
          ? "The deadline has passed."
          : days === 0
            ? "Today is the last day."
            : `There ${days === 1 ? "is 1 day" : `are ${days} days`} until the deadline.`,
      status: openState.state === "open" ? "met" : "unmet",
      provenance: "inferred",
      entityField: "deadline",
    });
  }

  const title = agreedValue(entity, "title");
  if (title !== null) {
    inputs.push({
      kind: "entity-attribute",
      criterion: `Every source calls this "${title}".`,
      status: "met",
      provenance: "inferred",
      entityField: "title",
    });
  }

  const ranking: RankingJudgment = {
    kind: "ranking",
    personId,
    entityId: entity.id,
    computedAt: now,
    logicVersion,
    position: input.ranking.position,
    outOf: input.ranking.outOf,
    inputs: [...inputs, ...requirements, ...fitInputs],
    /*
      The ordering has to name what it ordered on.

      This said "on the inputs listed", and the card rendered a bare "Ranked 3
      of 9 considered" — a position with no stated basis, which is the one thing
      a ranking must never be here. A reader shown a number and no criterion has
      to assume the system knows something it has not said, and this product's
      whole argument is that it says what it knows.

      The criteria are read off the inputs rather than described, so this
      sentence cannot drift from what actually decided the order.
    */
    because:
      input.ranking.position === null
        ? "Not ranked: nothing distinguishes it from the alternatives yet."
        : `Ranked ${input.ranking.position} of ${input.ranking.outOf}, on: ${inputs
            .map((i) => i.criterion.replace(/\.$/, ""))
            .join("; ")}.`,
  };

  /* ── Recommendation ───────────────────────────────────────────────────── */

  const blockers: RecommendationJudgment["decidedBy"] = [];
  if (resolution.verdict !== "verified") blockers.push("verification");
  if (eligibility.verdict === "ineligible") blockers.push("eligibility");
  if (fit.verdict === "does-not-fit") blockers.push("fit");
  if (risk.verdict === "high") blockers.push("risk");
  if (openState.state === "closed") blockers.push("ranking");

  const recommendation: RecommendationJudgment = {
    kind: "recommendation",
    personId,
    entityId: entity.id,
    computedAt: now,
    logicVersion,
    verdict: blockers.length === 0 ? "recommend" : "withhold",
    /*
      When recommending, the recommendation was decided by every judgment that
      had to clear — naming only the blockers on a pass would leave the positive
      case unexplained.
    */
    decidedBy:
      blockers.length === 0 ? ["verification", "eligibility", "fit", "risk", "ranking"] : blockers,
    because:
      blockers.length === 0
        ? "Verified, open, and nothing I know about you rules it out."
        : withheldBecause(blockers),
  };

  return {
    personId,
    entityId: entity.id,
    verification,
    eligibility,
    fit,
    risk,
    ranking,
    recommendation,
  };
}

/**
 * Rank a set of entities for one person.
 *
 * The ordering is deterministic and its whole basis is stated here: verified
 * before unverified, open before undated, then soonest deadline. No behavioural
 * signal, no popularity, no commercial weighting — and none of those could be
 * added without adding a member to `RankingInputKind`, which is a visible
 * amendment.
 *
 * Entities that are closed or withheld are still ranked and still judged. They
 * are filtered at recommendation, not here: an entity that vanishes before it
 * is judged cannot explain why it was not shown.
 */
export function judgeAll(inputs: readonly Omit<JudgeInput, "ranking">[]): PairingJudgments[] {
  /*
    `ordered`, not `scored`. Nothing here computes a number: the sort below is
    three separate criteria applied in sequence — verified, then open, then
    deadline — which is exactly the structure CR-21 requires, since a composite
    score is what it forbids. The old name described the shape of a judgment this
    engine does not make, and a misleading name is how the thing it describes
    eventually gets written.
  */
  const ordered = inputs.map((input) => {
    const resolution = resolveVerification(input.verification, input.now);
    const openState = deriveOpenState(input.entity, input.now);
    return {
      input,
      verified: resolution.verdict === "verified" ? 0 : 1,
      open: openState.state === "open" ? 0 : openState.state === "unknown" ? 1 : 2,
      deadline: openState.state === "open" ? new Date(openState.deadline).getTime() : Infinity,
    };
  });

  ordered.sort((a, b) => a.verified - b.verified || a.open - b.open || a.deadline - b.deadline);

  return ordered.map((s, index) =>
    judge({ ...s.input, ranking: { position: index + 1, outOf: ordered.length } }),
  );
}
