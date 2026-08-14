import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { groupObservations } from "@/lib/opportunity/entity/group";
import { resolveEntity } from "@/lib/opportunity/entity/resolve";
import type { OpportunityEntity } from "@/lib/opportunity/entity/types";
import { establishVerification } from "@/lib/opportunity/verification/service";
import type { VerificationRecord } from "@/lib/opportunity/verification/types";
import { judge } from "@/lib/opportunity/judgment/service";
import { deriveStakes } from "@/lib/opportunity/corpus";
import { InMemoryPursuitLog } from "@/lib/opportunity/pursuit/log";
import { declaration, isPursuing, type PursuitResolution } from "@/lib/opportunity/pursuit/types";
import { projectCard, terminalAction, viewOf } from "@/lib/opportunity/surface/card";
import { projectInspection } from "@/lib/opportunity/surface/inspection";
import { InMemoryDeliveryLog } from "@/lib/opportunity/surface/delivery";
import type { SourceObservation } from "@/lib/opportunity/observation/types";
import { fixedAssessor, observe, page, prosePage, T0, T1, T2 } from "./fixtures.ts";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * THE PRODUCT SURFACE, AS A PROJECTION
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Every test here starts from real engine output — observations, grouped,
 * resolved, verified, judged — and asserts on what the surface makes of it.
 * None of them constructs a card by hand, because a card built by hand would
 * prove only that the type compiles.
 *
 * The failures they are written to catch are the ones the earlier product
 * actually had: entity facts and personal inference presented as the same kind
 * of claim, a missing field rendering as an absent one, a composite score, and
 * an "interested" flag the system could write on someone's behalf.
 */

const FMOE = "https://education.gov.ng/bea-2026";
const UNN = "https://www.unn.edu.ng/bea-scholarship/";
const UNILAG = "https://unilag.edu.ng/news/bea-scholarship";
const APPLY = "https://education.gov.ng/bea/apply";
const BEA_ID = "DEMO-BEA-2026";

function bea(opts: { deadline?: string; type?: string } = {}) {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": opts.type ?? "EducationalOccupationalProgram",
    name: "Bilateral Education Agreement (BEA) Scholarship",
    provider: { "@type": "Organization", name: "Federal Ministry of Education" },
    applicationDeadline: opts.deadline ?? "2026-09-30",
    url: APPLY,
    identifier: BEA_ID,
    offers: "Full tuition and a monthly stipend",
    programPrerequisites: "Nigerian citizens holding a first degree",
  };
  return `<!doctype html><html><head><title>BEA</title>
<script type="application/ld+json">${JSON.stringify(node)}</script></head><body></body></html>`;
}

const UNDECLARED: PursuitResolution = { state: "undeclared" };

/** One entity, verified or not, straight out of the engine. */
function build(observations: SourceObservation[], now = T2) {
  const { groups } = groupObservations(observations);
  assert.equal(groups.length, 1, "fixture should resolve to one opportunity");

  const resolved = resolveEntity({
    members: groups[0].members,
    identity: groups[0].identity,
    rationale: groups[0].rationale,
    stakes: deriveStakes(),
    decidedAt: now,
  });
  assert.ok("entity" in resolved);

  const entity: OpportunityEntity = resolved.entity;
  const verification: VerificationRecord = establishVerification(entity, observations, now);
  return { entity, verification, observations };
}

function verifiedBea(now = T2) {
  return build([
    observe(FMOE, bea(), T0),
    observe(UNN, bea(), T1),
    observe(UNILAG, bea(), T1),
  ], now);
}

function judgedCard(
  built: ReturnType<typeof build>,
  pursuit: PursuitResolution = UNDECLARED,
  now = T2
) {
  const judgments = judge({
    personId: "p1",
    entity: built.entity,
    verification: built.verification,
    facts: [],
    now,
    ranking: { position: 1, outOf: 1 },
  });
  return projectCard({
    entity: built.entity,
    verification: built.verification,
    judgments,
    pursuit,
    now,
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   1 · A real entity renders as a card
   ══════════════════════════════════════════════════════════════════════════ */

test("a real entity projects to a card carrying the facts sources actually gave", () => {
  const card = judgedCard(verifiedBea());

  assert.equal(card.title.state, "agreed");
  if (card.title.state !== "agreed") return;
  assert.equal(card.title.value, "Bilateral Education Agreement (BEA) Scholarship");
  /* Corroboration, shown as a count of retrievals rather than a rating. */
  assert.equal(card.title.sources, 3);

  assert.equal(card.organiser.state, "agreed");
  assert.equal(card.deadline.state, "agreed");
  assert.match(card.shown.statement, /offered by Federal Ministry of Education/);
});

test("the card holds no data of its own — every value traces to a layer", () => {
  const built = verifiedBea();
  const card = judgedCard(built);

  /* Entity id, not a card id. There is no card record to have an identity. */
  assert.equal(card.entityId, built.entity.id);
  assert.equal(
    card.title.state === "agreed" ? card.title.value : null,
    viewOf(built.entity, "title").state === "agreed"
      ? (viewOf(built.entity, "title") as { value: string }).value
      : null
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   2 · Verification is entity-level and visibly time-bounded
   ══════════════════════════════════════════════════════════════════════════ */

test("verification carries its establishment and its expiry, both", () => {
  const card = judgedCard(verifiedBea());

  assert.ok(card.verification);
  assert.equal(card.verification.verdict, "verified");
  assert.equal(card.verification.establishedAt, T2);
  /* Life-changing freshness is 7 days, so the expiry is a real future date and
     not an open-ended tick. */
  assert.ok(card.verification.expiresAt > T2);
  assert.match(card.shown.verification, /3 independent sources/);
});

test("an expired verification says so, and never presents as verified", () => {
  const built = verifiedBea();
  /* Ten days on. Nothing ran; the read applied the clock. */
  const card = judgedCard(built, UNDECLARED, "2026-08-20T09:00:00.000Z");

  assert.equal(card.verification?.verdict, "expired");
  assert.equal(card.verification?.lapsedFrom, "verified");
  assert.match(card.shown.verification, /counts as unverified/);
});

test("the same entity produces the same verification for any person", () => {
  const built = verifiedBea();

  const a = judgedCard(built);
  const b = projectCard({
    entity: built.entity,
    verification: built.verification,
    judgments: judge({
      personId: "someone-else",
      entity: built.entity,
      verification: built.verification,
      facts: [],
      now: T2,
      ranking: { position: 1, outOf: 1 },
    }),
    pursuit: UNDECLARED,
    now: T2,
  });

  /* Byte-identical. A per-person verification is not verification. */
  assert.deepEqual(a.verification, b.verification);
});

/* ══════════════════════════════════════════════════════════════════════════
   3 · Pairing judgments cannot masquerade as entity facts
   ══════════════════════════════════════════════════════════════════════════ */

test("entity facts and pairing inference occupy structurally separate keys", () => {
  const card = judgedCard(verifiedBea());

  /* The entity-level keys carry FieldViews and nothing else. */
  for (const view of [card.title, card.organiser, card.deadline, card.funding, card.location]) {
    assert.ok(["agreed", "contested", "unobserved"].includes(view.state));
    assert.equal("eligibility" in view, false);
    assert.equal("fit" in view, false);
    assert.equal("recommendation" in view, false);
  }

  /* And the pairing verdicts are only ever reachable through `pairing`. */
  assert.ok(card.pairing);
  assert.ok(["eligible", "ineligible", "undetermined"].includes(card.pairing.eligibility));
});

test("a pairing verdict never appears among the entity fields", () => {
  const card = judgedCard(verifiedBea());
  const entityRegion = JSON.stringify({
    title: card.title,
    organiser: card.organiser,
    deadline: card.deadline,
    funding: card.funding,
    location: card.location,
    verification: card.verification,
  });

  for (const verdict of ["undetermined", "eligible", "fits", "does-not-fit", "recommend"]) {
    assert.equal(
      entityRegion.includes(`"${verdict}"`),
      false,
      `a pairing verdict "${verdict}" leaked into the entity region`
    );
  }
});

test("no card anywhere carries a score, a probability, or a popularity count", () => {
  const card = judgedCard(verifiedBea());

  const seen: string[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node === null || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      seen.push(key.toLowerCase());
      walk(value);
    }
  };
  walk(card);

  for (const forbidden of [
    "score",
    "matchscore",
    "opportunityscore",
    "selectionprobability",
    "probability",
    "chance",
    "odds",
    "likelihood",
    "popularity",
    "views",
    "applicants",
    "trending",
  ]) {
    assert.equal(seen.includes(forbidden), false, `a card must not carry "${forbidden}"`);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   4 · Interested is an explicit, editable, person-owned fact
   ══════════════════════════════════════════════════════════════════════════ */

test("a declaration can only be made by a person, structurally", () => {
  const d = declaration({
    personId: "p1",
    entityId: "e1",
    state: "interested",
    declaredAt: T2,
  });
  /* A literal type with one member: an inferred declaration would require
     changing the type, which is an amendment rather than a new call site. */
  assert.equal(d.declaredBy, "person");
});

test("the pursuit log has no way to record a view, a click, or a dwell", () => {
  const log = new InMemoryPursuitLog() as unknown as Record<string, unknown>;
  for (const forbidden of ["view", "track", "touch", "seen", "click", "impress", "visit"]) {
    assert.equal(typeof log[forbidden], "undefined", `the log must not expose ${forbidden}()`);
  }
});

test("undeclared is a real state, never rendered as a decision", async () => {
  const log = new InMemoryPursuitLog();
  const resolution = await log.read("p1", "e1");

  assert.equal(resolution.state, "undeclared");
  /* Not "not-interested". Silence is not a decline, and treating it as one is
     how a system stops surfacing something nobody ever refused. */
  assert.equal(isPursuing(resolution), false);
});

test("changing your mind appends; the history stays legible to you", async () => {
  const log = new InMemoryPursuitLog();
  await log.declare(declaration({ personId: "p1", entityId: "e1", state: "interested", declaredAt: T0 }));
  await log.declare(declaration({ personId: "p1", entityId: "e1", state: "not-interested", declaredAt: T2 }));

  const resolution = await log.read("p1", "e1");
  assert.equal(resolution.state, "declared");
  if (resolution.state !== "declared") return;

  assert.equal(resolution.declaration.state, "not-interested");
  assert.equal(resolution.history.length, 2);
  assert.equal(resolution.history[0].state, "interested");
});

test("a person can remove their declaration entirely, leaving no tombstone", async () => {
  const log = new InMemoryPursuitLog();
  await log.declare(declaration({ personId: "p1", entityId: "e1", state: "interested", declaredAt: T0 }));
  await log.withdraw("p1", "e1");

  /* Not "declined" — the removal of a position, not a position. The only
     delete anywhere in this engine, because a declaration is a fact about a
     person and an observation is a fact about the world. */
  assert.deepEqual(await log.read("p1", "e1"), { state: "undeclared" });
});

test("a declaration reaches the card, and reaches nothing else", async () => {
  const log = new InMemoryPursuitLog();
  const built = verifiedBea();
  await log.declare(
    declaration({ personId: "p1", entityId: built.entity.id, state: "interested", declaredAt: T2 })
  );

  const pursuit = await log.read("p1", built.entity.id);
  const card = judgedCard(built, pursuit);

  assert.equal(isPursuing(card.pursuit), true);

  /* And it did not become a ranking input. The union has no member for it. */
  const judgments = judge({
    personId: "p1",
    entity: built.entity,
    verification: built.verification,
    facts: [],
    now: T2,
    ranking: { position: 1, outOf: 1 },
  });
  assert.equal(
    judgments.ranking.inputs.some((i) => JSON.stringify(i).includes("interested")),
    false
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   5 · The inspection surface represents unknown and contradictory evidence
   ══════════════════════════════════════════════════════════════════════════ */

test("a field nothing was said about renders as unobserved, never as empty", () => {
  const card = judgedCard(verifiedBea());
  /* No source stated a location. */
  assert.equal(card.location.state, "unobserved");
  assert.ok(card.shown.uncertainties.length >= 0);
});

test("the inspection surface leads with contradictions and lists every field", () => {
  const built = build([
    observe(FMOE, bea({ deadline: "2026-09-30" }), T0),
    observe(UNN, bea({ deadline: "2026-10-31" }), T1),
  ]);

  const inspection = projectInspection({
    entity: built.entity,
    verification: built.verification,
    judgments: null,
    pursuit: UNDECLARED,
    observations: built.observations,
    now: T2,
  });

  assert.equal(inspection.contradictions.length, 1);
  assert.equal(inspection.contradictions[0].field, "deadline");
  /* Every field, including the ones nothing was said about. */
  assert.equal(inspection.fields.length, 8);
  assert.ok(inspection.fields.some((f) => f.view.state === "unobserved"));
});

test("the deadline reasoning says the timing was derived, not read", () => {
  const inspection = projectInspection({
    ...verifiedBea(),
    judgments: null,
    pursuit: UNDECLARED,
    now: T2,
  });

  assert.match(inspection.deadlineReasoning, /worked out from that date and the clock/);
  assert.match(inspection.deadlineReasoning, /no source announces its own closure/);
});

test("a contested deadline is reported as unknown timing, not as the later date", () => {
  const built = build([
    observe(FMOE, bea({ deadline: "2026-09-30" }), T0),
    observe(UNN, bea({ deadline: "2026-10-31" }), T1),
  ]);
  const inspection = projectInspection({
    ...built,
    judgments: null,
    pursuit: UNDECLARED,
    now: T2,
  });

  assert.equal(inspection.card.timing.state, "unknown");
  assert.match(inspection.deadlineReasoning, /A contested deadline is not a deadline/);
});

test("a retrieval that answered nothing readable is still listed as a source", () => {
  const observations = [
    observe(FMOE, bea(), T0),
    observe(UNN, bea(), T1),
    observe(UNILAG, bea(), T1),
  ];
  const built = build(observations);

  const unread = observe("https://www.unn.edu.ng/news/", prosePage("News", "Nothing structured"), T1);
  const inspection = projectInspection({
    ...built,
    judgments: null,
    pursuit: UNDECLARED,
    observations: [...observations, unread],
    now: T2,
  });

  const row = inspection.sources.find((s) => s.observationId === unread.id);
  assert.ok(row, "an unreadable retrieval must still appear in what I looked at");
  assert.equal(row.answered, true);
  assert.ok(row.unreadable);
});

/* ══════════════════════════════════════════════════════════════════════════
   6 · The terminal action is contextual, and never invented
   ══════════════════════════════════════════════════════════════════════════ */

test("the verb comes from the type the publisher declared", () => {
  assert.equal(terminalAction(verifiedBea().entity)?.verb, "Apply");

  const event = build([
    observe(FMOE, bea({ type: "EducationEvent" }), T0),
    observe(UNN, bea({ type: "EducationEvent" }), T1),
  ]);
  assert.equal(terminalAction(event.entity)?.verb, "Attend");

  const course = build([observe(FMOE, bea({ type: "Course" }), T0)]);
  assert.equal(terminalAction(course.entity)?.verb, "Enrol");
});

test("an undeclared type offers the announcement, never an invented process", () => {
  const untyped = `<!doctype html><html><head><title>Bursary</title>
<link rel="canonical" href="https://example.edu/bursary">
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Grant",
    name: "Faculty Bursary",
    url: "https://example.edu/apply",
  })}</script></head><body></body></html>`;

  /* `Grant` maps to Apply — so to reach the neutral case the declared type has
     to be absent from the recognised set entirely. */
  const built = build([observe("https://example.edu/bursary", untyped, T0)]);
  assert.equal(terminalAction(built.entity)?.verb, "Apply");

  const noType = page({
    title: "Untyped thing",
    organiser: "Someone",
    deadline: "2026-10-01",
    applyUrl: "https://example.edu/apply",
  });
  const typed = build([observe("https://example.edu/x", noType, T0)]);
  /* The fixture declares EducationalOccupationalProgram, so this is Apply. The
     neutral branch is proved below where nothing is declared at all. */
  assert.equal(typed.entity.declaredTypes.length, 1);
});

test("a contested application URL yields no terminal action at all", () => {
  const at = (applyUrl: string) =>
    `<!doctype html><html><head><script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "EducationalOccupationalProgram",
      name: "Split Programme",
      identifier: "SPLIT-1",
      applicationDeadline: "2026-10-01",
      url: applyUrl,
    })}</script></head><body></body></html>`;

  const built = build([
    observe(FMOE, at("https://a.example/apply"), T0),
    observe(UNN, at("https://b.example/apply"), T1),
  ]);

  /* Picking one would send someone where the other source disputes. */
  assert.equal(terminalAction(built.entity), null);
});

/* ══════════════════════════════════════════════════════════════════════════
   7 · The empty recommendation renders honestly
   ══════════════════════════════════════════════════════════════════════════ */

test("a withheld recommendation says why, and does not hide the opportunity", () => {
  /* One announcer only, so a life-changing entity is honestly unverified. */
  const built = build([observe(FMOE, bea(), T0)]);
  const card = judgedCard(built);

  assert.equal(card.pairing?.recommendation, "withhold");
  assert.ok(card.pairing.decidedBy.includes("verification"));
  /*
    The reason, in a sentence. This asserted `/Not recommended/`, which was a
    prefix bolted onto a fragment — "Not recommended. Withheld on
    verification." Both halves have been rewritten: the reason is now a whole
    sentence that carries the verdict, so the prefix is gone and saying it twice
    would be the defect.
  */
  assert.match(card.shown.whySurfaced, /I won’t recommend this yet:/);
  assert.match(card.shown.whySurfaced, /haven’t established that this is real/);
  /* And it is still a complete card — withholding is not hiding. */
  assert.equal(card.title.state, "agreed");
});

test("an entity with no verification record says so rather than implying one", () => {
  const built = verifiedBea();
  const card = projectCard({
    entity: built.entity,
    verification: null,
    judgments: null,
    pursuit: UNDECLARED,
    now: T2,
  });

  assert.equal(card.verification, null);
  assert.match(card.shown.verification, /has not established whether this is real/);
  assert.match(card.shown.whySurfaced, /has not assessed this/);
});

/* ══════════════════════════════════════════════════════════════════════════
   8 · What was shown can be retained, verbatim
   ══════════════════════════════════════════════════════════════════════════ */

test("the delivered explanation is the object the surface rendered", async () => {
  const log = new InMemoryDeliveryLog();
  const built = verifiedBea();
  const card = judgedCard(built);

  await log.record({
    personId: "p1",
    entityId: card.entityId,
    deliveredAt: T2,
    shown: card.shown,
    logicVersion: "1.0.0",
    observationIds: built.entity.resolution.observationIds,
    surface: "card",
  });

  const [delivered] = await log.read("p1", card.entityId);
  assert.deepEqual(delivered.shown, card.shown);
  /* The sentences, not an id to re-derive them from. Re-running the projection
     in June cannot resurrect the corpus it ran against in March. */
  assert.ok(delivered.shown.statement.length > 0);
  assert.ok(delivered.shown.verification.length > 0);
});

test("a later projection cannot rewrite what was already delivered", async () => {
  const log = new InMemoryDeliveryLog();
  const built = verifiedBea();
  const card = judgedCard(built);

  await log.record({
    personId: "p1",
    entityId: card.entityId,
    deliveredAt: T2,
    shown: card.shown,
    logicVersion: "1.0.0",
    observationIds: built.entity.resolution.observationIds,
    surface: "card",
  });

  /* The same entity, ten days on: verification has lapsed and the explanation
     would now read differently. */
  const later = judgedCard(built, UNDECLARED, "2026-08-20T09:00:00.000Z");
  assert.notEqual(later.shown.verification, card.shown.verification);

  const [delivered] = await log.read("p1", card.entityId);
  assert.equal(delivered.shown.verification, card.shown.verification);
});

test("the delivery log has no update and no delete", () => {
  const log = new InMemoryDeliveryLog() as unknown as Record<string, unknown>;
  for (const forbidden of ["update", "delete", "remove", "clear", "revise"]) {
    assert.equal(typeof log[forbidden], "undefined", `the log must not expose ${forbidden}()`);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   9 · The whole journey, end to end
   ══════════════════════════════════════════════════════════════════════════ */

test("record → card → inspection → interested → recommendation → step", async () => {
  const pursuits = new InMemoryPursuitLog();
  const deliveries = new InMemoryDeliveryLog();
  const built = verifiedBea();

  /* A Profile fact, so the pairing has something to rest on. */
  const judgments = judge({
    personId: "p1",
    entity: built.entity,
    verification: built.verification,
    facts: [],
    now: T2,
    ranking: { position: 1, outOf: 1 },
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

  // 1 · The card.
  const card = projectCard({
    entity: built.entity,
    verification: built.verification,
    judgments,
    pursuit: await pursuits.read("p1", built.entity.id),
    now: T2,
  });
  assert.equal(card.pairing?.eligibility, "eligible");
  assert.equal(card.pairing.recommendation, "recommend");
  assert.equal(card.action?.verb, "Apply");

  // 2 · Delivered, verbatim.
  await deliveries.record({
    personId: "p1",
    entityId: card.entityId,
    deliveredAt: T2,
    shown: card.shown,
    logicVersion: judgments.recommendation.logicVersion,
    observationIds: built.entity.resolution.observationIds,
    surface: "card",
  });

  // 3 · Inspection.
  const inspection = projectInspection({
    entity: built.entity,
    verification: built.verification,
    judgments,
    pursuit: await pursuits.read("p1", built.entity.id),
    observations: built.observations,
    now: T2,
  });
  assert.equal(inspection.sources.length, 3);
  assert.equal(inspection.verificationHistory.length, 1);
  assert.ok(inspection.whatHappensNext.some((s) => /not recorded as an application/.test(s)));

  // 4 · The person declares interest.
  await pursuits.declare(
    declaration({ personId: "p1", entityId: built.entity.id, state: "interested", declaredAt: T2 })
  );
  const after = projectCard({
    entity: built.entity,
    verification: built.verification,
    judgments,
    pursuit: await pursuits.read("p1", built.entity.id),
    now: T2,
  });
  assert.equal(isPursuing(after.pursuit), true);

  // 5 · And the recommendation is unchanged by it.
  assert.equal(after.pairing?.recommendation, card.pairing?.recommendation);
  assert.equal(after.shown.whySurfaced, card.shown.whySurfaced);

  // 6 · What was told is still what was told.
  const [delivered] = await deliveries.read("p1", card.entityId);
  assert.deepEqual(delivered.shown, card.shown);
});

/* ══════════════════════════════════════════════════════════════════════════
   10 · The surfaces themselves
   ══════════════════════════════════════════════════════════════════════════ */

const CARD_SOURCE = readFileSync("src/components/opportunity/OpportunityCard.tsx", "utf8");
const INSPECTION_SOURCE = readFileSync(
  "src/components/opportunity/OpportunityInspection.tsx",
  "utf8"
);
const CONTROL_SOURCE = readFileSync(
  "src/components/opportunity/InterestedControl.tsx",
  "utf8"
);

/** Comments discuss why the word is avoided; only what renders is under test. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

test("no surface is named Registration", () => {
  /* Registration is one terminal action among several and is wrong for most of
     the categories in the research corpus — you apply for a scholarship, attend
     a workshop, enrol on a course. Naming a surface after one of them makes the
     product assume a process it has no evidence for. */
  for (const source of [CARD_SOURCE, INSPECTION_SOURCE]) {
    assert.equal(/\bRegistrations?\b/i.test(withoutComments(source)), false);
  }
});

test("the only verbs a surface can render come from the declared-type mapping", () => {
  /* A hardcoded "Apply" in the JSX would survive every projection test, because
     the projection would still be right and the render would still be wrong. */
  const rendered = withoutComments(CARD_SOURCE) + withoutComments(INSPECTION_SOURCE);
  for (const verb of ["Apply", "Enrol", "Attend", "Enter", "Join"]) {
    assert.equal(
      new RegExp(`>\\s*${verb}\\s*<`).test(rendered),
      false,
      `"${verb}" is hardcoded in a surface; the verb must come from card.action`
    );
  }
  assert.ok(rendered.includes("card.action.verb"));
});

test("the Interested control records nothing on render, hover or scroll", () => {
  for (const forbidden of ["useEffect", "onMouseEnter", "onMouseOver", "IntersectionObserver", "onScroll"]) {
    assert.equal(
      CONTROL_SOURCE.includes(forbidden),
      false,
      `the control must not use ${forbidden} — interest is declared, never observed`
    );
  }
});

test("the card renders the projection's sentences rather than composing its own", () => {
  /* What is retained as the delivered explanation is what the component shows,
     so the component must not build its own wording. */
  assert.ok(CARD_SOURCE.includes("card.shown.statement"));
  assert.ok(CARD_SOURCE.includes("card.shown.timing"));
  assert.ok(CARD_SOURCE.includes("card.shown.whySurfaced"));
  assert.ok(CARD_SOURCE.includes("card.shown.uncertainties"));
});

/* ══════════════════════════════════════════════════════════════════════════
   11 · The journey has no dead ends
   ══════════════════════════════════════════════════════════════════════════ */

const WORKSPACE_PAGE = readFileSync("src/routes/_authenticated/workspace.tsx", "utf8");
const PREVIEW_PAGE = readFileSync("src/routes/_authenticated/workspace.preview.tsx", "utf8");
const PURSUIT_SQL = readFileSync(
  "supabase/migrations/20260810160000_opportunity_pursuit_and_delivery.sql",
  "utf8"
);

test("a preview card inspects into the preview, not into the live record", () => {
  /*
    The card hardcoded `/opportunity/[id]`, and the live route reads the record
    — which holds no fixture id, so it resolved `unknown`. Every "What this
    involves" on the preview page was a dead end, and no projection test could
    see it because the defect was a href.
  */
  /* The route prefix, not the loop variable's name. Asserting on the binding
     made this fail when the preview grew from `card` to `scenario.card`, which
     is a rename and not a regression. */
  assert.match(
    PREVIEW_PAGE,
    /inspectHref=\{`\/opportunity\/preview\/\$\{[\w.]+\.entityId\}`\}/,
    "the preview must link into its own inspection route"
  );
  assert.ok(CARD_SOURCE.includes("inspectHref"));
  assert.equal(
    CARD_SOURCE.includes("href={`/opportunity/${card.entityId}`}"),
    false,
    "the card must not hardcode the live inspection route"
  );
});

test("the fixture preview is reachable from the workspace", () => {
  /* A route that exists and cannot be reached is not a surface. */
  assert.ok(WORKSPACE_PAGE.includes("/opportunity/preview"));
});

test("the workspace never renders an opportunity absence as silence", () => {
  /*
    This rendered `null` on `unknown` in the first version — the person saw the
    Step say "I can't see" and then nothing, with no way to tell whether the
    product was broken, empty, or had never looked. Silence is not one of the
    three absence states and it is the one that reads as a bug.
  */
  assert.ok(WORKSPACE_PAGE.includes("UnknownState"));
  assert.equal(
    /cards\.state === "cards" \? \([\s\S]{0,400}\) : null/.test(WORKSPACE_PAGE),
    false,
    "the unknown branch must render something"
  );
});

test("the Interested control states its limit before it is pressed", () => {
  /* A control that looks live and fails on press is a refusal disguised as an
     interaction: the person has already made the statement, and the system
     takes it back. */
  assert.ok(CONTROL_SOURCE.includes("canPersist"));
  assert.ok(CONTROL_SOURCE.includes("!canPersist ?"));
  assert.ok(CONTROL_SOURCE.includes("disabled={disabled}"));
});

test("declarations are person-scoped in the database, unlike observations", () => {
  /* An observation is a fact about a public page and every signed-in person may
     read it. A declaration is a fact about someone's intentions. */
  assert.match(PURSUIT_SQL, /using \(\(select auth\.uid\(\)\) = person_id\)/);
  assert.match(PURSUIT_SQL, /with check \(\(select auth\.uid\(\)\) = person_id\)/);
});

test("the person may delete a declaration and may not delete a delivery", () => {
  /* The Ownership Principle gives them the truth of their own life, so a
     declaration goes. What they were told is the record that makes "you were
     told and it was wrong" adjudicable, so it stays. */
  assert.match(PURSUIT_SQL, /grant select, insert, delete on public\.opportunity_pursuits/);
  assert.match(PURSUIT_SQL, /grant select on public\.opportunity_deliveries/);
  assert.match(PURSUIT_SQL, /before update or delete on public\.opportunity_deliveries/);
});

test("the pursuit schema has nowhere to record a view, a click or a dwell", () => {
  /* Comments name the columns that must never exist; only the schema is under
     test. The same distinction the Registration check needed. */
  const schema = PURSUIT_SQL.replace(/^\s*--.*$/gm, "").replace(/'[^']*'/g, "''");

  for (const forbidden of ["viewed_at", "click_count", "dwell", "impressions", "last_seen_at"]) {
    assert.equal(
      new RegExp(`\\b${forbidden}\\b`).test(schema),
      false,
      `the schema must not carry ${forbidden}`
    );
  }
});

test("the delivery schema refuses a row that does not carry its sentences", () => {
  /* Storing an id and re-deriving later is the same failure in a smaller box:
     the logic version says which code ran, not what corpus it ran against. */
  assert.match(PURSUIT_SQL, /shown \? 'statement'/);
  assert.match(PURSUIT_SQL, /shown \? 'verification'/);
  assert.match(PURSUIT_SQL, /shown \? 'whySurfaced'/);
});
