import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveEntity, reviseEntity } from "@/lib/opportunity/entity/resolve";
import { agreedValue, agrees, contestedFields } from "@/lib/opportunity/entity/types";
import { observe, page, T0, T1, T2, membersOf } from "./fixtures.ts";

const UNN = "https://www.unn.edu.ng/example-scholarship/";
const UNILAG = "https://unilag.edu.ng/example-scholarship/";

function pageWith(deadline: string) {
  return page({
    title: "Example National Scholarship",
    organiser: "Example Foundation",
    deadline,
    applyUrl: "https://www.unn.edu.ng/example-scholarship/apply",
  });
}

function resolve(observations: ReturnType<typeof observe>[], decidedAt = T1) {
  return resolveEntity({
    members: membersOf(observations),
    identity: { method: "same-url", key: UNN },
    rationale: "Successive retrievals of the same programme page.",
    stakes: "material",
    decidedAt,
  });
}

test("an entity refuses to be built from unreachable retrievals alone", () => {
  /* A failed retrieval carries no items, so there is nothing to fold. Asserting
     an entity from sources that never answered would be claiming an opportunity
     exists on the strength of never having seen it. */
  const result = resolve([observe(UNN, null, T0, 404)]);
  assert.ok("defect" in result);
  assert.match(result.defect.reason, /No observed items/);
});

test("an entity refuses to be built from no observations", () => {
  const result = resolve([]);
  assert.ok("defect" in result);
});

test("agreeing sources produce one reading per field", () => {
  const result = resolve([
    observe(UNN, pageWith("2026-09-30"), T0),
    observe(UNN, pageWith("2026-09-30"), T1),
  ]);
  assert.ok("entity" in result);

  const deadline = result.entity.fields.find((f) => f.field === "deadline");
  assert.ok(deadline);
  assert.equal(agrees(deadline), true);
  assert.equal(deadline.readings[0].observedIn.length, 2);
});

test("disagreement is expressible — the later reading does not overwrite the earlier", () => {
  const result = resolve([
    observe(UNN, pageWith("2026-09-30"), T0),
    observe(UNN, pageWith("2026-10-15"), T1),
  ]);
  assert.ok("entity" in result);

  const deadline = result.entity.fields.find((f) => f.field === "deadline");
  assert.ok(deadline);
  assert.equal(deadline.readings.length, 2, "both readings must survive");
  assert.equal(agrees(deadline), false);
  /* A contested field has no agreed value — recency does not decide it. */
  assert.equal(agreedValue(result.entity, "deadline"), null);
  assert.deepEqual(
    contestedFields(result.entity).map((f) => f.field),
    ["deadline"],
  );
});

test("first-observation provenance records which source class saw it first", () => {
  const first = observe(UNILAG, pageWith("2026-09-30"), T0);
  const second = observe(UNN, pageWith("2026-09-30"), T1);

  const result = resolveEntity({
    members: membersOf([second, first]),
    identity: { method: "canonical-url", key: UNN },
    rationale: "Two announcers, one canonical programme page.",
    stakes: "material",
    decidedAt: T2,
  });
  assert.ok("entity" in result);

  /* Ordered by when it was retrieved, not by the order it was passed in. */
  assert.equal(result.entity.firstObservation.observationId, first.id);
  assert.equal(result.entity.firstObservation.retrievedAt, T0);
  assert.equal(result.entity.firstObservation.sourceClass, "announcer");
});

test("a correction is additive — the superseded resolution stays retrievable", () => {
  const a = observe(UNN, pageWith("2026-09-30"), T0);
  const b = observe(UNILAG, pageWith("2026-09-30"), T1);

  const first = resolve([a]);
  assert.ok("entity" in first);

  const revised = reviseEntity(first.entity, {
    members: membersOf([a, b]),
    identity: { method: "operator-decision", key: UNN },
    rationale: "Confirmed by hand that both announcements describe one programme.",
    stakes: "material",
    decidedAt: T2,
  });
  assert.ok("entity" in revised);

  assert.equal(revised.entity.id, first.entity.id, "identity survives revision");
  assert.equal(revised.entity.resolution.method, "operator-decision");
  assert.ok(revised.entity.resolution.supersedes, "the prior decision must be kept");
  assert.equal(revised.entity.resolution.supersedes.method, "same-url");
  assert.equal(revised.entity.resolution.supersedes.decidedAt, T1);
  assert.equal(revised.entity.resolution.observationIds.length, 2);
});

test("a revision that would drop earlier observations is refused", () => {
  const a = observe(UNN, pageWith("2026-09-30"), T0);
  const b = observe(UNILAG, pageWith("2026-09-30"), T1);

  const first = resolve([a]);
  assert.ok("entity" in first);

  /* Supplying only the new observation would silently discard every reading
     derived from `a`, turning a revision into the overwrite this layer exists
     to prevent. */
  const revised = reviseEntity(first.entity, {
    members: membersOf([b]),
    identity: { method: "operator-decision", key: UNN },
    rationale: "Only the new one.",
    stakes: "material",
    decidedAt: T2,
  });
  assert.ok("defect" in revised);
  assert.match(revised.defect.reason, /complete set/);
});

test("the first observation is historical and never moves forward on revision", () => {
  const a = observe(UNN, pageWith("2026-09-30"), T0);
  const b = observe(UNILAG, pageWith("2026-09-30"), T2);

  const first = resolve([a]);
  assert.ok("entity" in first);

  const revised = reviseEntity(first.entity, {
    members: membersOf([a, b]),
    identity: { method: "canonical-url", key: UNN },
    rationale: "Second announcer found.",
    stakes: "material",
    decidedAt: T2,
  });
  assert.ok("entity" in revised);

  assert.equal(revised.entity.firstObservation.retrievedAt, T0);
  assert.equal(revised.entity.lastObservedAt, T2);
});

test("an entity carries no owner, no score and no rank", () => {
  const result = resolve([observe(UNN, pageWith("2026-09-30"), T0)]);
  assert.ok("entity" in result);

  const keys = Object.keys(result.entity);
  for (const forbidden of [
    "ownerId",
    "owner_id",
    "score",
    "rank",
    "opportunityScore",
    "selectionProbability",
  ]) {
    assert.equal(keys.includes(forbidden), false, `entity must not carry ${forbidden}`);
  }
});
