import type { ProfileFact } from "@/lib/opportunity/foundation/person";
import { evidenceFromDeclaration, evidenceFromFact } from "@/lib/opportunity/foundation/evidence";
import type { BaseRate, Claim, ClaimInput, SourceRef } from "@/lib/opportunity/foundation/claim";
import type { NextStep, StepResolution } from "@/lib/opportunity/foundation/next-action";
import { agreedValue, type OpportunityEntity } from "../entity/types";
import type { ObservationStore } from "../observation/types";
import type { VerificationRecord } from "../verification/types";
import { judgeAll, type PairingAssessor } from "../judgment/service";
import type { PairingJudgments, RankingInput } from "../judgment/types";
import { deriveStance, type PursuitStance } from "../pursuit/stance";
import type { PursuitResolution } from "../pursuit/types";
import { deriveOpenState, resolveVerification } from "../verification/service";

/**
 * Recommendation — turning judgments into the one thing to do next.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * THE THREE ANSWERS, AND WHY THE DISTINCTION IS THE PRODUCT
 * ══════════════════════════════════════════════════════════════════════════
 *
 * This resolver can return a step, an absence, or an unknown, and the difference
 * between the last two is the trust model:
 *
 *   step     — there is something to do, and here is why, with its evidence.
 *   absent   — a search ran, succeeded, and produced nothing better. A verdict.
 *   unknown  — Opportunity X cannot see. A limit on the system, never on the person.
 *
 * The failure this guards against is specific and common: a pipeline that did
 * not run returning zero rows, and a surface rendering that as "nothing new for
 * you today". That is a failure reported as a finding, and the person has no way
 * to tell. So `absent` is only reachable when a retrieval was actually
 * witnessed — `store.lastRetrievalAt()` returns a real timestamp — and
 * `unknown` is what a system with no observations returns, every time.
 *
 * ── Why an honest deployment currently resolves `unknown` ─────────────────
 *
 * Nothing scans sources on this deployment. The observation store is empty and
 * `lastRetrievalAt()` is null, so this resolver returns `unknown`. That is the
 * same answer the surface gave before this engine existed, and it is reached for
 * a materially better reason: the resolver now asks a store that would tell it
 * otherwise, rather than asserting a constant.
 *
 * ── Why a step needs person-side evidence, and what happens without it ────
 *
 * A `Claim` cannot be constructed without `Evidence`, and `Evidence` can only be
 * minted from a Profile fact. That is the composition law, and it bites here
 * exactly as intended: Opportunity X can establish that an opportunity is real, open
 * and well-corroborated using nothing but observations — and still not be
 * entitled to call it *your* next best step, because nothing yet connects it to
 * you.
 *
 * So without a `PairingAssessor` there is no fact behind any input, no evidence
 * can be minted, and the resolution is `absent` rather than `step`. The law
 * refuses to let an opportunity-shaped fact masquerade as a person-shaped
 * recommendation, and the refusal is a type error rather than a review comment.
 */

export interface RecommendInput {
  personId: string;
  store: ObservationStore;
  /** Entities resolved from the store's observations. */
  entities: readonly OpportunityEntity[];
  /** One per entity, keyed by `entityId`. */
  verifications: ReadonlyMap<string, VerificationRecord>;
  /** The person's facts, already scoped to this product by the Profile service. */
  facts: readonly ProfileFact[];
  /**
   * What the person has said about each opportunity, keyed by entity id.
   *
   * Read, never written, and never treated as a judgment. It changes which
   * opportunity the Step is about and what the Step says — it does not change
   * any verdict, and `judgeAll` is not given it.
   */
  pursuits?: ReadonlyMap<string, PursuitResolution>;
  now: string;
  assessor?: PairingAssessor;
}

/** The full judgment set, kept alongside the resolution so nothing is recomputed to explain it. */
export interface RecommendationResult {
  resolution: StepResolution;
  /** Every pairing considered, in rank order. The record of what was weighed. */
  considered: PairingJudgments[];
}

export async function recommendNextStep(input: RecommendInput): Promise<RecommendationResult> {
  const searchedAt = await input.store.lastRetrievalAt();

  /*
    No retrieval has ever been witnessed. Not "nothing was found" — nothing was
    ever looked for, and the two must never resolve to the same thing.
  */
  if (searchedAt === null) {
    return {
      resolution: {
        state: "unknown",
        /* Nothing was ever retrieved, so there is no earlier visibility to name. */
        since: null,
        because:
          "I have never completed a search for opportunities, so I have nothing to weigh yet. That is a statement about me, not about what is out there.",
      },
      considered: [],
    };
  }

  const judgeable = input.entities
    .map((entity) => {
      const verification = input.verifications.get(entity.id);
      return verification ? { entity, verification } : null;
    })
    .filter(
      (x): x is { entity: OpportunityEntity; verification: VerificationRecord } => x !== null,
    );

  const considered = judgeAll(
    judgeable.map(({ entity, verification }) => ({
      personId: input.personId,
      entity,
      verification,
      facts: input.facts,
      now: input.now,
      assessor: input.assessor,
    })),
  );

  /*
    A declaration changes whose turn it is.

    Someone who said they were interested in something closing in four days is
    not well served by a Step about whatever ranked highest this morning. So a
    declared interest is considered first — and only the *order* changes. The
    judgments were computed before this line and none of them is touched here:
    an opportunity nobody has corroborated stays unverified however keen the
    person is.

    Declining removes it from consideration entirely. Re-surfacing something
    somebody has said no to is the behaviour that teaches people to stop
    answering.
  */
  const stanceFor = new Map<string, PursuitStance>();
  for (const judgments of considered) {
    const entity = input.entities.find((e) => e.id === judgments.entityId);
    const verification = input.verifications.get(judgments.entityId);
    if (!entity) continue;
    stanceFor.set(
      judgments.entityId,
      deriveStance({
        entity,
        verification: verification ? resolveVerification(verification, input.now) : null,
        judgments,
        pursuit: input.pursuits?.get(judgments.entityId) ?? { state: "undeclared" },
        now: input.now,
      }),
    );
  }

  const declined = new Set(
    [...stanceFor.values()]
      .filter((s) => s.declaration === "not-interested")
      .map((s) => s.entityId),
  );

  const interested = considered.filter(
    (j) => stanceFor.get(j.entityId)?.declaration === "interested",
  );

  /* Soonest real deadline first among declared interests. Not a score — a date. */
  interested.sort((a, b) => {
    const ua = stanceFor.get(a.entityId)?.urgency;
    const ub = stanceFor.get(b.entityId)?.urgency;
    const da = ua && "deadline" in ua ? new Date(ua.deadline).getTime() : Infinity;
    const db = ub && "deadline" in ub ? new Date(ub.deadline).getTime() : Infinity;
    return da - db;
  });

  const recommended = [
    ...interested.filter((j) => stanceFor.get(j.entityId)?.next.kind !== "closed"),
    ...considered.filter(
      (j) =>
        j.recommendation.verdict === "recommend" &&
        !declined.has(j.entityId) &&
        stanceFor.get(j.entityId)?.declaration !== "interested",
    ),
  ];

  if (recommended.length === 0) {
    /*
      A verdict, not a shrug. A search ran at `searchedAt` and nothing cleared
      all six judgments. The empty recommendation is first-class: it says
      "nothing better has appeared", never "nothing changed".
    */
    return { resolution: { state: "absent", searchedAt }, considered };
  }

  const best = recommended[0];
  const entity = input.entities.find((e) => e.id === best.entityId);
  if (!entity) {
    return { resolution: { state: "absent", searchedAt }, considered };
  }

  const step = buildStep(best, entity, input.facts, input.now, stanceFor.get(entity.id));
  if (step === null) {
    /*
      Recommended, but not renderable as a step: no Profile fact stands behind
      any of its inputs, so no evidence can be minted and the composition law
      refuses the claim. Reported as an absence rather than a broken step —
      and the pairing stays in `considered`, so the reason is retrievable.
    */
    return { resolution: { state: "absent", searchedAt }, considered };
  }

  return { resolution: { state: "step", step }, considered };
}

/**
 * `You said…` → `you said…`, for joining onto a clause.
 *
 * Only ever applied to a stance sentence, every one of which begins with an
 * ordinary word rather than a name — so there is nothing here that could
 * lowercase a proper noun.
 */
function uncapitalise(sentence: string): string {
  return sentence.charAt(0).toLowerCase() + sentence.slice(1);
}

/**
 * Assemble the `NextStep`.
 *
 * Returns null rather than fabricating any part of it. Every branch below that
 * could have been filled with a plausible default returns null instead, because
 * a default here is invented movement — the one thing a surface whose entire
 * purpose is conviction must never carry.
 */
function buildStep(
  judgments: PairingJudgments,
  entity: OpportunityEntity,
  facts: readonly ProfileFact[],
  now: string,
  stance?: PursuitStance,
): NextStep | null {
  const title = agreedValue(entity, "title");
  if (title === null) {
    /* Sources disagree about what this even is. Nothing to state in one sentence. */
    return null;
  }

  const source: SourceRef = {
    label: title,
    kind: "listing",
    href: applyHref(entity),
    /* The verification's own establishment time. Never `now` — that would
       report the moment of rendering as the moment of checking. */
    lastVerifiedAt: judgments.verification.resolution.establishedAt,
    decay: entity.stakes === "life-changing" ? "fast" : "slow",
  };

  /*
    What the step rests on.

    A declaration first, and that is the whole point of this pass: "you told me
    you were interested in this" is a checkable, person-stated reason for
    showing something, and until now the Step had no way to use it. Before this,
    a person could declare interest and get the same `absent` they got before
    they said anything.

    Otherwise the older path: a Profile fact behind a met input. No declaration
    and no fact means no evidence, and the composition law refuses the claim —
    which is correct, because nothing then connects the opportunity to them.
  */
  const evidence = groundIn(judgments, entity, facts, source, stance);
  if (evidence === null) return null;

  const openState = deriveOpenState(entity, now);

  const claim: Claim = {
    id: `${judgments.personId}:${entity.id}`,
    /*
      What to do, when the person's declaration gives the step a shape — and
      the bare identification otherwise. The stance builds the sentence so what
      is retained as the delivered explanation is the thing that was rendered.
    */
    /*
      The opportunity first, then what follows from what they said.

      This used to be `${stance.statement} ${title}`, which rendered as the
      Step's h1: "You said you were interested. Today is the last day, and 2
      things I still don't know. 3MTT Cohort Application" — a name bolted onto
      the end of a paragraph. Leading with the thing and joining with a dash
      makes it one sentence about one opportunity, which is what the surface
      promises.
    */
    statement:
      stance && stance.declaration !== "undeclared"
        ? `${title} — ${uncapitalise(stance.statement)}`
        : title,
    /*
      A recommendation produced because a source revealed something is
      `revelation`; one produced because the model improved is `understanding`.
      This resolver only runs on observations, so it can only honestly claim the
      first.
    */
    /*
      `revelation` when a source produced this. `understanding` when the person's
      own declaration is what moved it to the front — the world did not change,
      what Opportunity X knows about them did.
    */
    origin: stance?.declaration === "interested" ? "understanding" : "revelation",
    evidence,
    baseRate: baseRateFor(entity),
    computedAt: judgments.recommendation.computedAt,
    inputs: judgments.ranking.inputs.map(
      (i): ClaimInput => ({
        criterion: i.criterion,
        status: i.status,
        provenance: i.provenance,
        factId: i.factId,
      }),
    ),
  };

  const href = applyHref(entity);

  return {
    id: claim.id,
    claim,
    action: href ? { label: "Open the application", href } : undefined,
    /*
      A commitment is only offered when Opportunity X can name what would be written.
      An invented title would be fabricating the person's own record, and a
      guessed deadline would later become a "passed" state they never entered —
      so the deadline is null unless one was derived, never approximated.
    */
    commitment: {
      title,
      deadline: openState.state === "open" ? openState.deadline : null,
    },
  };
}

/**
 * What the step rests on, in order of what actually connects it to the person.
 *
 * 1. **A declaration.** They said they were interested, and when. Checkable
 *    against their own record, withdrawable by them, and the strongest
 *    provenance available — stronger than most inferences the system makes.
 *
 * 2. **A Profile fact** behind a met requirement. The older path, and the only
 *    one available for something nobody has spoken about.
 *
 * Null when neither exists. The composition law then refuses the claim, and the
 * resolution is `absent` rather than a step nothing connects to the person.
 */
function groundIn(
  judgments: PairingJudgments,
  entity: OpportunityEntity,
  facts: readonly ProfileFact[],
  source: SourceRef,
  stance: PursuitStance | undefined,
) {
  if (stance?.declaration === "interested" && stance.since) {
    return evidenceFromDeclaration(
      { entityId: entity.id, declaredAt: stance.since, declaredBy: "person" },
      {
        /* What they said, not what it implies. This sentence must never become
           "you are a good fit" — the judgments say what they say, separately. */
        summary: `You told me you were interested in this.`,
        source,
        product: "opportunity-x",
      },
    );
  }

  const grounding = [...judgments.eligibility.requirements, ...judgments.fit.inputs].find(
    (i): i is RankingInput & { factId: string } =>
      i.status === "met" && typeof i.factId === "string",
  );
  if (!grounding) return null;

  const fact = facts.find((f) => f.id === grounding.factId);
  if (!fact) return null;

  const minted = evidenceFromFact(fact, {
    summary: grounding.criterion,
    source,
    product: "opportunity-x",
  });
  return "defect" in minted ? null : minted.evidence;
}

function applyHref(entity: OpportunityEntity): string | undefined {
  return agreedValue(entity, "how-to-apply") ?? undefined;
}

/**
 * The competitive reality, as far as it is known.
 *
 * `unknown` is the answer whenever figures have not been observed, and it is
 * said aloud rather than left blank — silence would let a person infer the field
 * is uncontested, which is a false impression created by omission. There is no
 * branch here that estimates one.
 */
function baseRateFor(entity: OpportunityEntity): BaseRate {
  const places = agreedValue(entity, "funding");
  /*
    A funding line is not an applicant count and this function will not pretend
    otherwise. Until a base rate is observed as its own claim, with its own
    source and its own freshness, the honest state is `unknown`.
  */
  void places;
  return { state: "unknown" };
}
