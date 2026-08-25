import { test } from "node:test";
import assert from "node:assert/strict";

import { InMemoryObservationStore } from "@/lib/opportunity/observation/store";
import { resolveEntity } from "@/lib/opportunity/entity/resolve";
import { establishVerification } from "@/lib/opportunity/verification/service";
import type { VerificationRecord } from "@/lib/opportunity/verification/types";
import { recommendNextStep } from "@/lib/opportunity/recommendation/service";
import { observationStore } from "@/lib/opportunity/store";
import type { OpportunityEntity } from "@/lib/opportunity/entity/types";
import { confirmedFact, fixedAssessor, observe, page, T0, T1, T2, membersOf } from "./fixtures.ts";

const UNN = "https://www.unn.edu.ng/example-scholarship/";
const UNILAG = "https://unilag.edu.ng/example-scholarship/";
const APPLY = "https://www.unn.edu.ng/example-scholarship/apply";

function pageWith(deadline: string) {
  return page({
    title: "Example National Scholarship",
    organiser: "Example Foundation",
    deadline,
    applyUrl: APPLY,
  });
}

async function corpus(deadline = "2026-12-30") {
  const store = new InMemoryObservationStore();
  const observations = [
    observe(UNN, pageWith(deadline), T0),
    observe(UNILAG, pageWith(deadline), T1),
  ];
  for (const o of observations) await store.append(o);

  const resolved = resolveEntity({
    members: membersOf(observations),
    identity: { method: "canonical-url", key: UNN },
    rationale: "Two announcers, one programme.",
    stakes: "material",
    decidedAt: T1,
  });
  assert.ok("entity" in resolved);
  const entity: OpportunityEntity = resolved.entity;

  const verifications = new Map<string, VerificationRecord>([
    [entity.id, establishVerification(entity, observations, T1)],
  ]);

  return { store, entities: [entity], verifications };
}

test("an empty store resolves unknown — never absent", async () => {
  const { resolution } = await recommendNextStep({
    personId: "p1",
    store: new InMemoryObservationStore(),
    entities: [],
    verifications: new Map(),
    facts: [],
    now: T2,
  });

  /* A pipeline that never ran must not be able to produce a verdict about the
     world. "Nothing better has appeared" would be a failure reported as a
     finding. */
  assert.equal(resolution.state, "unknown");
});

test("a witnessed retrieval with nothing recommendable resolves absent, with the search time", async () => {
  const { store, entities, verifications } = await corpus("2026-08-05");

  const { resolution } = await recommendNextStep({
    personId: "p1",
    store,
    entities,
    verifications,
    facts: [],
    now: T2,
  });

  assert.equal(resolution.state, "absent");
  if (resolution.state !== "absent") return;
  assert.equal(resolution.searchedAt, T1, "the absence must cite a real retrieval");
});

test("a recommendation with no Profile fact behind it cannot become a step", async () => {
  const { store, entities, verifications } = await corpus();

  const { resolution, considered } = await recommendNextStep({
    personId: "p1",
    store,
    entities,
    verifications,
    facts: [],
    now: T2,
  });

  /* Verified, open, nothing ruling it out — so it is recommended. And still not
     renderable as *your* next step, because nothing connects it to you. The
     composition law refuses the claim, and the refusal surfaces as an absence
     rather than a broken step. */
  assert.equal(considered[0].recommendation.verdict, "recommend");
  assert.equal(resolution.state, "absent");
});

test("the full chain resolves to a step when a Profile fact grounds it", async () => {
  const { store, entities, verifications } = await corpus();
  const fact = confirmedFact("f1", "I want a fully funded scholarship.");

  const { resolution } = await recommendNextStep({
    personId: "p1",
    store,
    entities,
    verifications,
    facts: [fact],
    now: T2,
    assessor: fixedAssessor({
      eligibility: [
        {
          kind: "stated-goal",
          criterion: "You want a fully funded scholarship.",
          status: "met",
          provenance: "confirmed",
          factId: "f1",
        },
      ],
    }),
  });

  assert.equal(resolution.state, "step");
  if (resolution.state !== "step") return;

  const { step } = resolution;
  assert.equal(step.claim.statement, "Example National Scholarship");
  assert.equal(step.claim.origin, "revelation");
  assert.equal(step.action?.href, APPLY);
  assert.equal(step.commitment?.title, "Example National Scholarship");
  assert.equal(step.commitment?.deadline, "2026-12-30T00:00:00.000Z");
});

test("the step's evidence inherits the fact's provenance and cannot be laundered", async () => {
  const { store, entities, verifications } = await corpus();
  const fact = confirmedFact("f1", "I want a fully funded scholarship.");

  const { resolution } = await recommendNextStep({
    personId: "p1",
    store,
    entities,
    verifications,
    facts: [fact],
    now: T2,
    assessor: fixedAssessor({
      eligibility: [
        {
          kind: "stated-goal",
          criterion: "You want a fully funded scholarship.",
          status: "met",
          provenance: "confirmed",
          factId: "f1",
        },
      ],
    }),
  });
  assert.equal(resolution.state, "step");
  if (resolution.state !== "step") return;

  const { evidence } = resolution.step.claim;
  assert.equal(evidence.provenance, "confirmed");
  assert.equal(evidence.factId, "f1");
  /* Freshness is inherited from the fact, so a claim can never look fresher
     than what it rests on. */
  assert.equal(evidence.lastConfirmedAt, fact.lastConfirmedAt);
  /* A confirmed tier has nowhere to put a confidence score. */
  assert.equal("confidence" in evidence, false);
});

test("the step's source freshness is the verification's, never the moment of rendering", async () => {
  const { store, entities, verifications } = await corpus();

  const { resolution } = await recommendNextStep({
    personId: "p1",
    store,
    entities,
    verifications,
    facts: [confirmedFact("f1", "I want a fully funded scholarship.")],
    now: T2,
    assessor: fixedAssessor({
      eligibility: [
        {
          kind: "stated-goal",
          criterion: "You want a fully funded scholarship.",
          status: "met",
          provenance: "confirmed",
          factId: "f1",
        },
      ],
    }),
  });
  assert.equal(resolution.state, "step");
  if (resolution.state !== "step") return;

  assert.equal(resolution.step.claim.evidence.source.lastVerifiedAt, T1);
  assert.notEqual(resolution.step.claim.evidence.source.lastVerifiedAt, T2);
});

test("the base rate is stated as unknown rather than estimated", async () => {
  const { store, entities, verifications } = await corpus();

  const { resolution } = await recommendNextStep({
    personId: "p1",
    store,
    entities,
    verifications,
    facts: [confirmedFact("f1", "I want a fully funded scholarship.")],
    now: T2,
    assessor: fixedAssessor({
      eligibility: [
        {
          kind: "stated-goal",
          criterion: "You want a fully funded scholarship.",
          status: "met",
          provenance: "confirmed",
          factId: "f1",
        },
      ],
    }),
  });
  assert.equal(resolution.state, "step");
  if (resolution.state !== "step") return;

  /* Contested with unknown figures is said aloud. Silence would let a person
     infer the field is uncontested. */
  assert.equal(resolution.step.claim.baseRate.state, "unknown");
});

test("an expired verification withholds the step", async () => {
  const { store, entities, verifications } = await corpus();

  const { resolution, considered } = await recommendNextStep({
    personId: "p1",
    store,
    entities,
    verifications,
    facts: [confirmedFact("f1", "I want a fully funded scholarship.")],
    /* Material freshness is 14 days from T1. */
    now: "2026-09-01T09:00:00.000Z",
    assessor: fixedAssessor({
      eligibility: [
        {
          kind: "stated-goal",
          criterion: "You want a fully funded scholarship.",
          status: "met",
          provenance: "confirmed",
          factId: "f1",
        },
      ],
    }),
  });

  assert.equal(considered[0].verification.resolution.verdict, "expired");
  assert.equal(considered[0].recommendation.verdict, "withhold");
  assert.equal(resolution.state, "absent");
});

test("with no store configured, the reader says it cannot see rather than that nothing exists", async () => {
  /*
    The invariant this protects is Opportunity X's, and it is the one the whole
    absence model exists for: a deployment with nowhere to read from has not
    searched and found nothing — it has not searched. Those are different facts
    and a person is entitled to know which they are being told.

    It asserted Opportunity X's Step service before, which no longer exists here. The
    claim is the same; the surface it is made against is now this product's.
  */
  /*
    Deliberately not asserting whether a store happens to be configured in this
    environment — that is a fact about a developer's `.env`, not about the
    product, and pinning it makes the suite pass or fail on who ran it. What is
    asserted is the behaviour: whatever the reader cannot reach, it says so.
  */
  const { resolveCards } = await import("@/lib/opportunity/surface/service");
  const resolution = await resolveCards("p1", null);

  assert.equal(resolution.state, "unknown", "never `cards`, and never an empty list");
  if (resolution.state !== "unknown") return;
  assert.ok(resolution.gap.length > 0, "and it says why it cannot see");
});
