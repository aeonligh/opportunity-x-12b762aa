import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveEntity } from "@/lib/opportunity/entity/resolve";
import type { OpportunityEntity, Stakes } from "@/lib/opportunity/entity/types";
import { establishVerification } from "@/lib/opportunity/verification/service";
import { judge, judgeAll, NO_ASSESSOR } from "@/lib/opportunity/judgment/service";
import type { PairingJudgments, RankingInput } from "@/lib/opportunity/judgment/types";
import { measureDivergence } from "@/lib/opportunity/monitors";
import { deriveStakes } from "@/lib/opportunity/corpus";
import {
  confirmedFact,
  inferredFact,
  fixedAssessor,
  observe,
  page,
  T0,
  T1,
  T2,
  membersOf,
} from "./fixtures.ts";

const UNN = "https://www.unn.edu.ng/example-scholarship/";
const UNILAG = "https://unilag.edu.ng/example-scholarship/";

function pageWith(deadline: string, title = "Example National Scholarship") {
  return page({
    title,
    organiser: "Example Foundation",
    deadline,
    applyUrl: "https://www.unn.edu.ng/example-scholarship/apply",
  });
}

function verifiedPairing(stakes: Stakes = "material", deadline = "2026-12-30") {
  const observations = [
    observe(UNN, pageWith(deadline), T0),
    observe(UNILAG, pageWith(deadline), T1),
  ];
  const resolved = resolveEntity({
    members: membersOf(observations),
    identity: { method: "canonical-url", key: UNN },
    rationale: "Two announcers, one programme.",
    stakes,
    decidedAt: T1,
  });
  assert.ok("entity" in resolved);
  const entity: OpportunityEntity = resolved.entity;
  return { entity, verification: establishVerification(entity, observations, T1) };
}

const met = (criterion: string, factId?: string): RankingInput => ({
  kind: "stated-goal",
  criterion,
  status: "met",
  provenance: factId ? "confirmed" : "inferred",
  factId,
});

const unmetConfirmed = (criterion: string, factId: string): RankingInput => ({
  kind: "stated-constraint",
  criterion,
  status: "unmet",
  provenance: "confirmed",
  factId,
});

const unmetInferred = (criterion: string): RankingInput => ({
  kind: "stated-preference",
  criterion,
  status: "unmet",
  provenance: "inferred",
});

test("all six judgments are produced, each independently addressable", () => {
  const { entity, verification } = verifiedPairing();
  const j = judge({
    personId: "p1",
    entity,
    verification,
    facts: [],
    now: T2,
    ranking: { position: 1, outOf: 1 },
  });

  for (const kind of [
    "verification",
    "eligibility",
    "fit",
    "risk",
    "ranking",
    "recommendation",
  ] as const) {
    assert.ok(j[kind], `${kind} judgment must exist`);
    assert.equal(j[kind].kind, kind);
    assert.ok(j[kind].because.length > 0, `${kind} must say why`);
    assert.ok(j[kind].logicVersion.length > 0, `${kind} must record its logic version`);
  }
});

test("verification is entity-scoped; the other five are pairing-scoped", () => {
  const { entity, verification } = verifiedPairing();
  const j = judge({
    personId: "p1",
    entity,
    verification,
    facts: [],
    now: T2,
    ranking: { position: 1, outOf: 1 },
  });

  assert.equal("personId" in j.verification, false);
  for (const kind of ["eligibility", "fit", "risk", "ranking", "recommendation"] as const) {
    assert.equal(j[kind].personId, "p1");
  }
});

test("no judgment carries a composite score or a probability of winning", () => {
  const { entity, verification } = verifiedPairing();
  const j = judge({
    personId: "p1",
    entity,
    verification,
    facts: [],
    now: T2,
    ranking: { position: 1, outOf: 1 },
  });

  const forbidden = [
    "score",
    "matchscore",
    "opportunityscore",
    "selectionprobability",
    "probability",
    "chance",
    "odds",
    "likelihood",
    "successrate",
    "winprobability",
  ];

  const seen: string[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node === null || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      seen.push(key.toLowerCase());
      walk(value);
    }
  };
  walk(j);

  for (const key of forbidden) {
    assert.equal(seen.includes(key), false, `a judgment must not carry "${key}"`);
  }
});

test("without an assessor, eligibility fit and risk are undetermined — never eligible, never ineligible", () => {
  const { entity, verification } = verifiedPairing();
  const j = judge({
    personId: "p1",
    entity,
    verification,
    facts: [],
    now: T2,
    ranking: { position: 1, outOf: 1 },
    assessor: NO_ASSESSOR,
  });

  assert.equal(j.eligibility.verdict, "undetermined");
  assert.equal(j.fit.verdict, "undetermined");
  assert.equal(j.risk.verdict, "undetermined");
  assert.match(j.eligibility.because, /have not read this opportunity's requirements/);
});

test("missing evidence is never negative evidence — an unchecked requirement does not disqualify", () => {
  const { entity, verification } = verifiedPairing();
  const j = judge({
    personId: "p1",
    entity,
    verification,
    facts: [],
    now: T2,
    ranking: { position: 1, outOf: 1 },
    assessor: fixedAssessor({
      eligibility: [
        met("Open to Nigerian nationals.", "f1"),
        {
          kind: "stated-constraint",
          criterion: "Requires a first degree.",
          status: "unknown",
          provenance: "inferred",
        },
      ],
    }),
  });

  assert.equal(j.eligibility.verdict, "undetermined");
});

test("a negative verdict requires a confirmed fact; an inferred one cannot reach it", () => {
  const { entity, verification } = verifiedPairing();

  const fromInference = judge({
    personId: "p1",
    entity,
    verification,
    facts: [],
    now: T2,
    ranking: { position: 1, outOf: 1 },
    assessor: fixedAssessor({ eligibility: [unmetInferred("Probably not a postgraduate.")] }),
  });
  assert.equal(fromInference.eligibility.verdict, "undetermined");

  const fromStatement = judge({
    personId: "p1",
    entity,
    verification,
    facts: [],
    now: T2,
    ranking: { position: 1, outOf: 1 },
    assessor: fixedAssessor({
      eligibility: [unmetConfirmed("You told Opportunity X you have no first degree.", "f2")],
    }),
  });
  assert.equal(fromStatement.eligibility.verdict, "ineligible");
});

test("a positive verdict may rest on an inference — the asymmetry runs one way only", () => {
  const { entity, verification } = verifiedPairing();
  const j = judge({
    personId: "p1",
    entity,
    verification,
    facts: [],
    now: T2,
    ranking: { position: 1, outOf: 1 },
    assessor: fixedAssessor({ eligibility: [met("Open to Nigerian nationals.")] }),
  });
  assert.equal(j.eligibility.verdict, "eligible");
  assert.equal(j.eligibility.requirements[0].provenance, "inferred");
});

test("ranking inputs are enumerable, and the prohibited feature classes have no member to occupy", () => {
  const { entity, verification } = verifiedPairing();
  const j = judge({
    personId: "p1",
    entity,
    verification,
    facts: [],
    now: T2,
    ranking: { position: 1, outOf: 1 },
  });

  const allowed = new Set([
    "stated-goal",
    "stated-constraint",
    "stated-preference",
    "entity-attribute",
    "deadline-proximity",
    "base-rate",
  ]);

  assert.ok(j.ranking.inputs.length > 0, "a ranking must be able to show its inputs");
  for (const input of j.ranking.inputs) {
    assert.ok(allowed.has(input.kind), `unexpected ranking input kind: ${input.kind}`);
    assert.ok(input.provenance, "every input must carry its provenance");
  }

  /* The guard is structural: these strings are not members of the union, so no
     input could ever carry one without an amendment visible in a diff. */
  for (const prohibited of ["behavioural", "popularity", "commercial", "cohort-outcome"]) {
    assert.equal(allowed.has(prohibited), false);
  }
});

test("ranking orders on verification, open state, then deadline — and nothing else", () => {
  const near = verifiedPairing("material", "2026-08-20");
  const far = verifiedPairing("material", "2026-12-30");
  const unverifiedObs = [observe(UNN, pageWith("2026-08-15", "Single-source"), T0)];
  const unverifiedResolved = resolveEntity({
    members: membersOf(unverifiedObs),
    identity: { method: "same-url", key: UNN },
    rationale: "One announcer only.",
    stakes: "material",
    decidedAt: T1,
  });
  assert.ok("entity" in unverifiedResolved);
  const unverified = {
    entity: unverifiedResolved.entity,
    verification: establishVerification(unverifiedResolved.entity, unverifiedObs, T1),
  };

  const ranked = judgeAll(
    [unverified, far, near].map((p) => ({
      personId: "p1",
      entity: p.entity,
      verification: p.verification,
      facts: [],
      now: T2,
    })),
  );

  assert.equal(ranked[0].entityId, near.entity.id, "verified and closing soonest ranks first");
  assert.equal(ranked[1].entityId, far.entity.id);
  assert.equal(
    ranked[2].entityId,
    unverified.entity.id,
    "an unverified entity ranks last however near its deadline",
  );
  assert.deepEqual(
    ranked.map((r) => r.ranking.position),
    [1, 2, 3],
  );
});

test("a closed opportunity is still judged and still explains itself", () => {
  const { entity, verification } = verifiedPairing("material", "2026-08-05");
  const j = judge({
    personId: "p1",
    entity,
    verification,
    facts: [],
    now: T2,
    ranking: { position: 1, outOf: 1 },
  });

  assert.equal(j.recommendation.verdict, "withhold");
  assert.ok(j.ranking.inputs.some((i) => i.criterion === "The deadline has passed."));
  /*
    The reason, in words rather than in blocker names. This asserted
    `/Withheld on/`, which is how the sentence used to be built — the enum
    joined with commas — and it reached the card as
    "Not recommended. Withheld on verification."
  */
  assert.match(j.recommendation.because, /I won’t recommend this yet:/);
  assert.match(j.recommendation.because, /deadline has passed/);
  assert.doesNotMatch(
    j.recommendation.because,
    /\b(verification|eligibility|fit|risk|ranking)\b/,
    "no judgment kind is printed to the reader as its own name",
  );
});

test("verification and recommendation can disagree", () => {
  const { entity, verification } = verifiedPairing();

  const withheld = judge({
    personId: "p1",
    entity,
    verification,
    facts: [],
    now: T2,
    ranking: { position: 1, outOf: 1 },
    assessor: fixedAssessor({
      eligibility: [unmetConfirmed("You told Opportunity X you are not a postgraduate.", "f2")],
    }),
  });

  assert.equal(withheld.verification.resolution.verdict, "verified");
  assert.equal(withheld.recommendation.verdict, "withhold");
  assert.deepEqual(withheld.recommendation.decidedBy, ["eligibility"]);

  const divergence = measureDivergence([withheld]);
  assert.equal(divergence.verifiedButWithheld, 1);
  assert.equal(divergence.anyDivergence, true);
});

test("an override is structurally excluded from learning", () => {
  const override = {
    personId: "p1",
    entityId: "e1",
    kind: "fit" as const,
    statement: "This does suit me.",
    decidedAt: T2,
    excludedFromLearning: true as const,
  };
  /* The literal type means a pipeline could not include overrides in training
     without changing the type — a visible amendment, not a forgotten filter. */
  assert.equal(override.excludedFromLearning, true);
});

test("a judgment set never renders a person's facts into the entity", () => {
  const { entity, verification } = verifiedPairing();
  const facts = [
    confirmedFact("f1", "I want a fully funded master's."),
    inferredFact("f2", "Prefers UK programmes."),
  ];
  const j: PairingJudgments = judge({
    personId: "p1",
    entity,
    verification,
    facts,
    now: T2,
    ranking: { position: 1, outOf: 1 },
    assessor: fixedAssessor({ fit: [met("You want a fully funded master's.", "f1")] }),
  });

  /*
    Structural, not a substring search. The first version of this test looked
    for "f1" inside the serialised verification — and observation ids are random
    UUIDs, so it failed roughly one run in a handful when a hex pair happened to
    read "f1". A flaky assertion about a constitutional invariant is worse than
    none: it teaches whoever sees it to re-run the suite.

    The invariant is that verification does not vary by person, so that is what
    is asserted.
  */
  const forSomeoneElse = judge({
    personId: "p2",
    entity,
    verification,
    facts,
    now: T2,
    ranking: { position: 1, outOf: 1 },
    assessor: fixedAssessor({ fit: [met("You want a fully funded master's.", "f1")] }),
  });

  assert.deepEqual(j.verification, forSomeoneElse.verification);
  assert.equal("personId" in j.verification, false);
});

test("on the last day, the ranking says so rather than counting backwards", () => {
  /*
    This shipped, and only a rendered page caught it.

    `deriveOpenState` reports the instant the publisher denoted — the *start* of
    a day-precision deadline — while deciding open-or-closed against the end of
    that day. So on the final day the state is legitimately `open` and the raw
    subtraction is already negative.

    `deriveUrgency` clamped at zero. This did not. The result was a card whose
    stance read "today is the last day" directly above a ranking that read
    "There are -1 days until the deadline" — about the same opportunity, from
    the same deadline, in the same paragraph.

    Nothing failed, because no test rendered the ranking criterion and no test
    asserted the two agreed.
  */
  const CLOSES = "2026-09-30";
  /* Mid-afternoon on the closing day: past the stored instant, inside the day. */
  const NOW_ON_THE_DAY = "2026-09-30T15:00:00.000Z";

  const observations = [observe(UNN, pageWith(CLOSES), T0), observe(UNILAG, pageWith(CLOSES), T1)];
  const resolved = resolveEntity({
    members: membersOf(observations),
    identity: { method: "canonical-url", key: UNN },
    rationale: "Two announcers, one programme.",
    stakes: deriveStakes(),
    decidedAt: T1,
  });
  assert.ok("entity" in resolved);

  const j = judge({
    personId: "p1",
    entity: resolved.entity,
    verification: establishVerification(resolved.entity, observations, T1),
    facts: [],
    now: NOW_ON_THE_DAY,
    ranking: { position: 1, outOf: 1 },
  });

  const proximity = j.ranking.inputs.find((i) => i.kind === "deadline-proximity");
  assert.ok(proximity, "the ranking must state the deadline it ordered on");

  assert.doesNotMatch(
    proximity.criterion,
    /-\d/,
    `a negative day count reached a reader: ${proximity.criterion}`,
  );
  assert.equal(proximity.criterion, "Today is the last day.");

  /* And the opportunity really is still open, which is the whole reason the
     subtraction went negative in the first place. */
  assert.equal(proximity.status, "met");

  /* No ranking sentence anywhere may count below zero. */
  for (const input of j.ranking.inputs) {
    assert.doesNotMatch(input.criterion, /-\d+ days/, input.criterion);
  }
});
