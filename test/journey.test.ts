import { test } from "node:test";
import assert from "node:assert/strict";

import { deriveStakes } from "@/lib/opportunity/corpus";
import { groupObservations } from "@/lib/opportunity/entity/group";
import { resolveEntity } from "@/lib/opportunity/entity/resolve";
import { agreedValue, type OpportunityEntity } from "@/lib/opportunity/entity/types";
import { InMemoryObservationStore } from "@/lib/opportunity/observation/store";
import type { SourceObservation } from "@/lib/opportunity/observation/types";
import { InMemoryPursuitLog } from "@/lib/opportunity/pursuit/log";
import { declaration } from "@/lib/opportunity/pursuit/types";
import { recommendNextStep } from "@/lib/opportunity/recommendation/service";
import { projectCard } from "@/lib/opportunity/surface/card";
import { projectInspection } from "@/lib/opportunity/surface/inspection";
import { judgeAll } from "@/lib/opportunity/judgment/service";
import { deriveStance } from "@/lib/opportunity/pursuit/stance";
import { deriveOpenState, establishVerification } from "@/lib/opportunity/verification/service";
import type { VerificationRecord } from "@/lib/opportunity/verification/types";
import { observe, page, T0, T1, T2 } from "./fixtures.ts";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * ONE PERSON, ONE OPPORTUNITY, THE WHOLE WAY THROUGH
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Every other file in this suite tests a layer. This one tests the *sequence* —
 * the thing a person actually does, in the order they do it:
 *
 *   DISCOVER → INSPECT → INTEREST → RETURN → NEXT STEP → LEDGER
 *
 * It exists because a suite of green layers is not a working product. Each of
 * the six stages below was covered in isolation before this file was written,
 * and the chain still had to be walked end to end to know that the output of
 * one stage is the input the next one expects.
 *
 * ── What is real here, and what is not ────────────────────────────────────
 *
 * The observations are fixtures. Everything downstream of them is production
 * code: the same grouping, resolution, verification, judgment, projection,
 * stance and recommendation the deployed surfaces call, in the same order the
 * routes call them.
 *
 * So this proves the *mechanism* carries a person from meeting an opportunity
 * to committing to it. It proves nothing whatsoever about whether the world
 * contains that opportunity — the fixtures are labelled, and
 * `no-conclusion-without-acquisition.test.ts` is what holds the line between
 * the two claims.
 *
 * ── The stage that matters most ───────────────────────────────────────────
 *
 * Stage 2 → 5. Before the declaration, this person gets `absent`: the search
 * ran, and nothing connected the opportunity to *them*. After it, they get a
 * step. Nothing about the opportunity changed in between — no verdict moved, no
 * fact was learned about the world. What changed is that they spoke, and the
 * system now has a checkable, person-owned reason to bring it up.
 *
 * If that transition ever stops working, a person can declare interest and be
 * told there is nothing for them, which is the specific failure this walk
 * exists to catch.
 */

const PERSON = "person-journey";

const FMOE = "https://education.gov.ng/bea-2026";
const UNN = "https://www.unn.edu.ng/bea-scholarship/";
const UNILAG = "https://unilag.edu.ng/news/bea-scholarship";
const APPLY = "https://education.gov.ng/bea/apply";

const TITLE = "Bilateral Education Agreement (BEA) Scholarship";
const DEADLINE = "2026-09-30";
const IDENTIFIER = "JOURNEY-FMOE-BEA-2026";

/** Well after T2, and well before the deadline. The person's return visit. */
const NOW = "2026-08-14T09:00:00.000Z";

function announcement(at: string, url: string): SourceObservation {
  return observe(
    url,
    page({
      title: TITLE,
      organiser: "Federal Ministry of Education",
      deadline: DEADLINE,
      applyUrl: APPLY,
      identifier: IDENTIFIER,
    }),
    at
  );
}

interface World {
  store: InMemoryObservationStore;
  entity: OpportunityEntity;
  entities: OpportunityEntity[];
  verifications: Map<string, VerificationRecord>;
  observations: SourceObservation[];
}

/**
 * Stage 1 — DISCOVER.
 *
 * Three institutional announcers, one declared identifier, all agreeing. Built
 * by folding observations exactly as `deriveCorpus` does, so a change to the
 * fold breaks this walk rather than quietly diverging from it.
 */
async function discover(now: string): Promise<World> {
  const observations = [
    announcement(T0, FMOE),
    announcement(T1, UNN),
    announcement(T2, UNILAG),
  ];

  const store = new InMemoryObservationStore();
  for (const observation of observations) await store.append(observation);

  const { groups } = groupObservations(observations);
  assert.equal(groups.length, 1, "three announcements of one identifier are one entity");

  const resolved = resolveEntity({
    members: groups[0].members,
    identity: groups[0].identity,
    rationale: groups[0].rationale,
    stakes: deriveStakes(),
    decidedAt: now,
  });
  assert.ok("entity" in resolved, "the group resolves to an entity");

  const entity = resolved.entity;
  const record = establishVerification(
    entity,
    groups[0].members.map((m) => m.observation),
    now
  );

  return {
    store,
    entity,
    entities: [entity],
    verifications: new Map([[entity.id, record]]),
    observations,
  };
}

function judgeOne(world: World, now: string) {
  return judgeAll([
    {
      personId: PERSON,
      entity: world.entity,
      verification: world.verifications.get(world.entity.id)!,
      facts: [],
      now,
    },
  ])[0];
}

test("stage 1 — three announcers become one verified opportunity", async () => {
  const world = await discover(NOW);

  assert.equal(agreedValue(world.entity, "title"), TITLE);
  /*
    The entity keeps the instant the published date denotes, not the string.
    `2026-09-30` is a calendar day, so the instant is the start of it — and the
    precision that says so is carried, because without it the opportunity reads
    as closed for the whole of its final day.
  */
  assert.equal(agreedValue(world.entity, "deadline"), `${DEADLINE}T00:00:00.000Z`);
  const deadlineField = world.entity.fields.find((f) => f.field === "deadline");
  assert.equal(deadlineField?.readings[0].precision, "day");
  assert.equal(
    world.entity.resolution.method,
    "declared-identifier",
    "identity came from what the publisher declared, not from the URL"
  );

  const record = world.verifications.get(world.entity.id)!;
  assert.equal(record.verdict, "verified");
  assert.equal(
    record.basis.distinctSources,
    3,
    "the verdict counts every distinct source that carried it"
  );
  assert.ok(
    record.basis.institutionalSources >= 1,
    "and says how many of them were institutional"
  );
});

test("stage 2 — INSPECT shows where every field came from, before anyone has said anything", async () => {
  const world = await discover(NOW);
  const judgments = judgeOne(world, NOW);

  const inspection = projectInspection({
    entity: world.entity,
    verification: world.verifications.get(world.entity.id) ?? null,
    judgments,
    pursuit: { state: "undeclared" },
    observations: world.observations,
    now: NOW,
  });

  const deadline = inspection.fields.find((f) => f.field === "deadline");
  assert.ok(deadline, "the deadline is on the inspection surface");
  assert.equal(deadline.view.state, "agreed");

  assert.equal(
    inspection.sources.length,
    3,
    "every retrieval that carried this is listed, not just the first"
  );
  for (const source of inspection.sources) {
    assert.ok(source.retrievedAt, "each source states when it was actually read");
    assert.ok(source.observationId, "each row points at the observation behind it");
  }

  assert.equal(
    inspection.contradictions.length,
    0,
    "nothing is contested here — the contested case is covered in surface.test.ts"
  );
});

test("stage 3 → 5 — a declaration is what turns `absent` into a step", async () => {
  const world = await discover(NOW);

  /*
    Before. The search ran — the watermark is real — and the answer is still
    `absent`, because nothing connects this opportunity to this person. Not a
    failure: the honest state of a system that knows a lot about an opportunity
    and nothing about whether it is for you.
  */
  const before = await recommendNextStep({
    personId: PERSON,
    store: world.store,
    entities: world.entities,
    verifications: world.verifications,
    facts: [],
    now: NOW,
  });
  assert.equal(before.resolution.state, "absent");

  /* Stage 3 — INTEREST. The person says so, and the log holds their words. */
  const pursuits = new InMemoryPursuitLog();
  await pursuits.declare(
    declaration({
      personId: PERSON,
      entityId: world.entity.id,
      state: "interested",
      declaredAt: NOW,
    })
  );

  const resolution = await pursuits.read(PERSON, world.entity.id);
  assert.equal(resolution.state, "declared");
  assert.equal(
    resolution.state === "declared" && resolution.declaration.declaredBy,
    "person",
    "a declaration can only have been made by the person"
  );

  /* Stage 5 — NEXT STEP. Same world, same evidence, one thing said. */
  const after = await recommendNextStep({
    personId: PERSON,
    store: world.store,
    entities: world.entities,
    verifications: world.verifications,
    facts: [],
    pursuits: await pursuits.readAll(PERSON),
    now: NOW,
  });

  assert.equal(
    after.resolution.state,
    "step",
    "declaring interest gives the Step something to be about"
  );
  if (after.resolution.state !== "step") return;

  const step = after.resolution.step;
  assert.ok(step.claim.statement.includes(TITLE), "the step names the opportunity");
  assert.equal(
    step.claim.origin,
    "understanding",
    "the world did not change — what AEON X knows about this person did"
  );
  assert.equal(step.action?.href, APPLY, "there is somewhere to go, and it is the declared one");

  /*
    No verdict moved. The declaration reordered what the Step is about and gave
    it a sentence; it did not make the opportunity more verified or better
    suited, and this is the assertion that catches it if it ever starts to.
  */
  assert.deepEqual(
    before.considered.map((j) => [j.entityId, j.recommendation.verdict]),
    after.considered.map((j) => [j.entityId, j.recommendation.verdict]),
    "the same judgments, before and after the declaration"
  );
});

test("stage 4 — RETURN: the card says what follows from what they said, and invents no task", async () => {
  const world = await discover(NOW);

  const card = projectCard({
    entity: world.entity,
    verification: world.verifications.get(world.entity.id) ?? null,
    judgments: judgeOne(world, NOW),
    pursuit: {
      state: "declared",
      declaration: declaration({
        personId: PERSON,
        entityId: world.entity.id,
        state: "interested",
        declaredAt: NOW,
      }),
      history: [],
    },
    now: NOW,
  });

  assert.equal(card.stance.declaration, "interested");
  assert.ok(
    card.stance.statement.startsWith("You said you were interested"),
    "the card speaks back the thing they said, not a system verdict"
  );

  /*
    Nothing has read the requirements against this person, so that is what is
    outstanding — and it is the only kind of thing that may be listed. A
    preparation checklist is not derivable from anything the corpus establishes,
    so `Outstanding` has no member that could carry one.
  */
  assert.equal(card.stance.next.kind, "resolve-unknowns");
  if (card.stance.next.kind !== "resolve-unknowns") return;

  const kinds = card.stance.next.outstanding.map((o) => o.kind);
  assert.ok(
    kinds.includes("eligibility-unread"),
    "the unread eligibility is named as AEON X's gap, not the person's"
  );
  for (const item of card.stance.next.outstanding) {
    assert.ok(
      ["contested", "unobserved", "unverified", "eligibility-unread"].includes(item.kind),
      `outstanding item ${item.kind} is derived from evidence or its absence`
    );
    assert.ok(item.because.length > 0, "every outstanding item says why");
  }
});

test("stage 6 — LEDGER: the step can name a commitment, truthfully", async () => {
  const world = await discover(NOW);

  const pursuits = new InMemoryPursuitLog();
  await pursuits.declare(
    declaration({
      personId: PERSON,
      entityId: world.entity.id,
      state: "interested",
      declaredAt: NOW,
    })
  );

  const { resolution } = await recommendNextStep({
    personId: PERSON,
    store: world.store,
    entities: world.entities,
    verifications: world.verifications,
    facts: [],
    pursuits: await pursuits.readAll(PERSON),
    now: NOW,
  });

  assert.equal(resolution.state, "step");
  if (resolution.state !== "step") return;

  /*
    What "I've applied to this" would write. The affordance renders only when
    the Step can name it, so these two values are the whole interface between
    an opportunity and a person's own record — and both must be things a source
    actually said, never approximations.
  */
  const commitment = resolution.step.commitment;
  assert.ok(commitment, "the Step can name what committing would write");
  assert.equal(commitment.title, TITLE, "the ledger row is titled what the sources titled it");
  assert.equal(
    commitment.deadline,
    agreedValue(world.entity, "deadline"),
    "the ledger deadline is the agreed one, never a guess"
  );
});

test("declining removes it from the Step entirely, and is not re-argued", async () => {
  const world = await discover(NOW);

  const pursuits = new InMemoryPursuitLog();
  await pursuits.declare(
    declaration({
      personId: PERSON,
      entityId: world.entity.id,
      state: "not-interested",
      declaredAt: NOW,
    })
  );

  const { resolution } = await recommendNextStep({
    personId: PERSON,
    store: world.store,
    entities: world.entities,
    verifications: world.verifications,
    facts: [],
    pursuits: await pursuits.readAll(PERSON),
    now: NOW,
  });

  assert.equal(
    resolution.state,
    "absent",
    "something declined is not re-surfaced as the next best step"
  );
});

test("changing your mind is a new declaration, and the earlier one stays legible", async () => {
  const world = await discover(NOW);
  const pursuits = new InMemoryPursuitLog();

  await pursuits.declare(
    declaration({
      personId: PERSON,
      entityId: world.entity.id,
      state: "interested",
      declaredAt: "2026-08-12T09:00:00.000Z",
    })
  );
  await pursuits.declare(
    declaration({
      personId: PERSON,
      entityId: world.entity.id,
      state: "not-interested",
      declaredAt: NOW,
    })
  );

  const resolution = await pursuits.read(PERSON, world.entity.id);
  assert.equal(resolution.state, "declared");
  if (resolution.state !== "declared") return;

  assert.equal(resolution.declaration.state, "not-interested", "the latest position wins");
  assert.equal(resolution.history.length, 2, "and the earlier one is still there");
  assert.deepEqual(
    resolution.history.map((d) => d.state),
    ["interested", "not-interested"],
    "in the order they said them"
  );
});

/**
 * ── The last day ──────────────────────────────────────────────────────────
 *
 * Found by walking the journey rather than by testing a layer, and it is the
 * exact failure the product exists to prevent: someone finding out too late.
 *
 * A source that publishes "applicationDeadline: 2026-09-30" has named a day.
 * Normalised, that is the *start* of the 30th — so compared as an instant, the
 * opportunity read as closed from one second past midnight on the day the
 * publisher said you could still apply. Every announcer in the registry is in
 * Nigeria (UTC+1), where that lands at 1 a.m. local on the final day.
 */
test("a deadline published as a day stays open through that whole day", async () => {
  const world = await discover(NOW);

  /* Mid-morning UTC on the deadline itself. Late morning in Lagos. */
  const onTheDay = `${DEADLINE}T10:00:00.000Z`;
  const open = deriveOpenState(world.entity, onTheDay);

  assert.equal(open.state, "open", "the last day is still a day you can apply on");

  const stance = deriveStance({
    entity: world.entity,
    verification: null,
    judgments: null,
    pursuit: {
      state: "declared",
      declaration: declaration({
        personId: PERSON,
        entityId: world.entity.id,
        state: "interested",
        declaredAt: NOW,
      }),
      history: [],
    },
    now: onTheDay,
  });

  assert.equal(stance.urgency.kind, "closing");
  assert.equal(
    stance.urgency.kind === "closing" && stance.urgency.daysLeft,
    0,
    "zero days left, never a negative count"
  );
  assert.ok(
    stance.statement.includes("today is the last day") ||
      stance.statement.includes("Today is the last day"),
    `the final day is said plainly, got: ${stance.statement}`
  );
  assert.doesNotMatch(stance.statement, /-\d+ days/, "no negative countdown");
});

test("the day after a day-precision deadline, it is closed", async () => {
  const world = await discover(NOW);

  const nextDay = "2026-10-01T00:00:01.000Z";
  const open = deriveOpenState(world.entity, nextDay);

  assert.equal(open.state, "closed");
  assert.equal(
    open.state === "closed" && open.deadline,
    `${DEADLINE}T00:00:00.000Z`,
    "the reported deadline is still the instant the source denoted, not the widened one"
  );
});

test("a deadline published with a time is taken at its word, not widened to a day", async () => {
  const at = "2026-09-30T17:00:00.000Z";
  const observations = [
    observe(
      FMOE,
      page({
        title: TITLE,
        organiser: "Federal Ministry of Education",
        deadline: at,
        applyUrl: APPLY,
        identifier: "JOURNEY-TIMED-2026",
      }),
      T0
    ),
  ];

  const { groups } = groupObservations(observations);
  const resolved = resolveEntity({
    members: groups[0].members,
    identity: groups[0].identity,
    rationale: groups[0].rationale,
    stakes: deriveStakes(),
    decidedAt: T0,
  });
  assert.ok("entity" in resolved);

  const field = resolved.entity.fields.find((f) => f.field === "deadline");
  assert.equal(field?.readings[0].precision, undefined, "an hour was published; it is not a day");

  assert.equal(
    deriveOpenState(resolved.entity, "2026-09-30T18:00:00.000Z").state,
    "closed",
    "an hour after a 17:00 deadline is closed, not open until midnight"
  );
});

test("the card shows a person a date, never a machine timestamp", async () => {
  const world = await discover(NOW);

  const card = projectCard({
    entity: world.entity,
    verification: world.verifications.get(world.entity.id) ?? null,
    judgments: judgeOne(world, NOW),
    pursuit: { state: "undeclared" },
    now: NOW,
  });

  assert.equal(card.shown.timing, "Closes 30 September 2026.");
  assert.equal(
    card.deadline.state === "agreed" && card.deadline.value,
    "30 September 2026"
  );

  /*
    Structural. `Closes 2026-09-30T00:00:00.000Z.` was what this surface
    actually rendered, and no assertion in the suite was looking at the string a
    person reads.
  */
  assert.doesNotMatch(
    card.shown.timing + card.shown.verification,
    /\d{4}-\d{2}-\d{2}T/,
    "no ISO instant reaches a sentence"
  );
});

test("nothing anywhere in the walk carries a score, a percentage, or a probability", async () => {
  const world = await discover(NOW);

  const pursuits = new InMemoryPursuitLog();
  await pursuits.declare(
    declaration({
      personId: PERSON,
      entityId: world.entity.id,
      state: "interested",
      declaredAt: NOW,
    })
  );

  const card = projectCard({
    entity: world.entity,
    verification: world.verifications.get(world.entity.id) ?? null,
    judgments: judgeOne(world, NOW),
    pursuit: await pursuits.read(PERSON, world.entity.id),
    now: NOW,
  });

  const { resolution } = await recommendNextStep({
    personId: PERSON,
    store: world.store,
    entities: world.entities,
    verifications: world.verifications,
    facts: [],
    pursuits: await pursuits.readAll(PERSON),
    now: NOW,
  });

  /*
    Structural, not textual. A `match: 0.82` anywhere in what reaches the
    surface is the failure — the old product's composite score, arriving back
    through a projection nobody was watching.
  */
  const banned = /"(score|match|matchScore|probability|percent|percentage|chance|odds|confidenceScore|rank)"\s*:/;

  assert.doesNotMatch(JSON.stringify(card), banned, "the card carries no score");
  assert.doesNotMatch(JSON.stringify(resolution), banned, "the step carries no score");
});
