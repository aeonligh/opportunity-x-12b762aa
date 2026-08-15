import type { PairingJudgments } from "./judgment/types";
import type { VerificationRecord } from "./verification/types";

/**
 * The structural guards, as measurements.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY MONITORS AND NOT REVIEWS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The failure this file exists for is the one that presents as improvement.
 *
 * A discovery pipeline that quietly breaks produces fewer results, and fewer
 * results look like a cleaner feed. A verification model that stops demoting
 * anything produces more verified opportunities, and more verified
 * opportunities look like better coverage. A judgment layer whose six verdicts
 * silently collapse into one computation produces perfectly consistent output,
 * and consistency looks like confidence.
 *
 * Every one of those degradations is invisible to a reviewer looking at a single
 * result, and every one is obvious in a rate. So the guards are rates, they are
 * computed here, and **a decline is an incident** — not a metric someone
 * glances at.
 *
 * Nothing in this file alerts on its own. These are pure functions over records
 * the system already holds; wiring them to a schedule is a separate decision,
 * and a monitor that claims to be running when nothing invokes it would be the
 * same manufactured evidence the rest of the engine refuses.
 */

export interface Rate {
  /** How many of the population satisfied the condition. */
  count: number;
  /** The population. Zero is reported, never turned into a 0% rate. */
  of: number;
  /** Null when `of` is zero — an undefined rate is not the same as zero. */
  rate: number | null;
}

function rate(count: number, of: number): Rate {
  return { count, of, rate: of === 0 ? null : count / of };
}

/**
 * G4 · de-verification.
 *
 * The decisive question: has anything ever gone verified → not verified? A
 * corpus where this rate is flat zero over time has a verification model that
 * only ratchets upward, which is accumulation rather than decay. Expiry is
 * excluded — the clock demoting a stale row is not the model revising a belief.
 */
export function deverificationRate(records: readonly VerificationRecord[]): Rate {
  const everVerified = records.filter((r) => r.transitions.some((t) => t.to === "verified"));
  const demoted = everVerified.filter((r) =>
    r.transitions.some(
      (t) =>
        t.from === "verified" &&
        (t.to === "unverified" || t.to === "contradicted" || t.to === "withdrawn"),
    ),
  );
  return rate(demoted.length, everVerified.length);
}

/**
 * G4 · empty recommendations.
 *
 * A rising empty rate is the honest signal of a corpus going stale. A *falling*
 * one is the suspicious signal — it usually means a threshold was loosened, not
 * that the world improved.
 */
export function emptyRecommendationRate(sets: readonly PairingJudgments[][]): Rate {
  const empty = sets.filter((s) => s.every((j) => j.recommendation.verdict === "withhold"));
  return rate(empty.length, sets.length);
}

/**
 * G4 · novelty.
 *
 * The share of judged entities first observed within the window. Discovery that
 * has silently stopped keeps producing recommendations from a corpus that no
 * longer changes, and every surface downstream continues to look healthy. This
 * is the rate that catches it.
 */
export function noveltyRate(firstObservedAt: readonly string[], since: string): Rate {
  return rate(firstObservedAt.filter((at) => at >= since).length, firstObservedAt.length);
}

/**
 * G4 · sub-threshold reach.
 *
 * Opportunities that were withheld are still opportunities, and a person who
 * never sees any of them is being protected out of the ability to decide for
 * themselves. Presence is not the measure — this counts the ones actually
 * surfaced with their uncertainty exposed, against the ones withheld.
 */
export function subThresholdReach(
  judgments: readonly PairingJudgments[],
  surfacedEntityIds: ReadonlySet<string>,
): Rate {
  const withheld = judgments.filter((j) => j.recommendation.verdict === "withhold");
  return rate(withheld.filter((j) => surfacedEntityIds.has(j.entityId)).length, withheld.length);
}

/**
 * G5 · judgment divergence.
 *
 * The six judgments must be *capable* of disagreeing, and capability is only
 * demonstrated by disagreement actually occurring. If verification and ranking
 * never diverge across a corpus, they are one computation with two names, and no
 * amount of separate typing changes that.
 *
 * Reported as observed pairs rather than a score. "Verification says verified,
 * recommendation says withhold — 14 times" is a fact someone can check; a
 * divergence index is not.
 */
export interface Divergence {
  /** Verified entities that were nonetheless withheld. */
  verifiedButWithheld: number;
  /** Unverified entities that ranked first. */
  unverifiedButTopRanked: number;
  /** Eligible pairings that do not fit. */
  eligibleButUnfit: number;
  /** Recommendations that did not come from the top rank. */
  recommendedNotTopRanked: number;
  /** True when at least one pair diverged. False across a real corpus is a defect. */
  anyDivergence: boolean;
}

export function measureDivergence(judgments: readonly PairingJudgments[]): Divergence {
  const verifiedButWithheld = judgments.filter(
    (j) =>
      j.verification.resolution.verdict === "verified" && j.recommendation.verdict === "withhold",
  ).length;

  const unverifiedButTopRanked = judgments.filter(
    (j) => j.verification.resolution.verdict !== "verified" && j.ranking.position === 1,
  ).length;

  const eligibleButUnfit = judgments.filter(
    (j) => j.eligibility.verdict === "eligible" && j.fit.verdict === "does-not-fit",
  ).length;

  const recommendedNotTopRanked = judgments.filter(
    (j) => j.recommendation.verdict === "recommend" && j.ranking.position !== 1,
  ).length;

  return {
    verifiedButWithheld,
    unverifiedButTopRanked,
    eligibleButUnfit,
    recommendedNotTopRanked,
    anyDivergence:
      verifiedButWithheld + unverifiedButTopRanked + eligibleButUnfit + recommendedNotTopRanked > 0,
  };
}
