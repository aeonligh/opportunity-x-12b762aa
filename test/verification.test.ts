import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveEntity } from "@/lib/opportunity/entity/resolve";
import type { OpportunityEntity, Stakes } from "@/lib/opportunity/entity/types";
import {
  deriveOpenState,
  establishVerification,
  hasEverDeverified,
  resolveVerification,
} from "@/lib/opportunity/verification/service";
import { CORROBORATION } from "@/lib/opportunity/verification/types";
import { observe, page, T0, T1, T2, membersOf } from "./fixtures.ts";

const UNN = "https://www.unn.edu.ng/example-scholarship/";
const UNILAG = "https://unilag.edu.ng/example-scholarship/";
const AGGREGATOR = "https://scholarships.example.com/example-scholarship/";

function pageWith(deadline: string) {
  return page({
    title: "Example National Scholarship",
    organiser: "Example Foundation",
    deadline,
    applyUrl: "https://www.unn.edu.ng/example-scholarship/apply",
  });
}

function entityFrom(
  observations: ReturnType<typeof observe>[],
  stakes: Stakes = "material",
): OpportunityEntity {
  const result = resolveEntity({
    members: membersOf(observations),
    identity: { method: "canonical-url", key: UNN },
    rationale: "Test fixture.",
    stakes,
    decidedAt: T1,
  });
  assert.ok("entity" in result);
  return result.entity;
}

test("verification is keyed by entity and carries nothing person-shaped", () => {
  const o = [observe(UNN, pageWith("2026-09-30"), T0)];
  const record = establishVerification(entityFrom(o), o, T1);

  const keys = Object.keys(record);
  assert.ok(keys.includes("entityId"));
  for (const forbidden of ["personId", "userId", "user_id", "owner", "ownerId"]) {
    assert.equal(keys.includes(forbidden), false, `verification must not carry ${forbidden}`);
  }
});

test("one institutional source does not verify a material opportunity", () => {
  const o = [observe(UNN, pageWith("2026-09-30"), T0)];
  const record = establishVerification(entityFrom(o), o, T1);
  assert.equal(record.verdict, "unverified");
  assert.match(record.transitions[0].reason, /below the material threshold/);
});

test("two institutional sources verify a material opportunity", () => {
  const o = [observe(UNN, pageWith("2026-09-30"), T0), observe(UNILAG, pageWith("2026-09-30"), T1)];
  const record = establishVerification(entityFrom(o), o, T1);
  assert.equal(record.verdict, "verified");
  assert.equal(record.basis.distinctSources, 2);
  assert.equal(record.basis.institutionalSources, 2);
});

test("verification depth scales with the opportunity's own stakes", () => {
  const o = [observe(UNN, pageWith("2026-09-30"), T0), observe(UNILAG, pageWith("2026-09-30"), T1)];

  /* The same two sources: enough for material, not enough for life-changing. */
  assert.equal(establishVerification(entityFrom(o, "material"), o, T1).verdict, "verified");
  assert.equal(establishVerification(entityFrom(o, "life-changing"), o, T1).verdict, "unverified");

  assert.ok(
    CORROBORATION["life-changing"].distinctSources > CORROBORATION.material.distinctSources,
  );
  assert.ok(CORROBORATION["life-changing"].freshnessDays < CORROBORATION.material.freshnessDays);
});

test("aggregators alone cannot satisfy an institutional requirement", () => {
  const o = [
    observe(AGGREGATOR, pageWith("2026-09-30"), T0),
    observe("https://listings.example.org/x", pageWith("2026-09-30"), T1),
  ];
  const record = establishVerification(entityFrom(o), o, T1);
  assert.equal(record.basis.distinctSources, 2);
  assert.equal(record.basis.institutionalSources, 0);
  assert.equal(record.verdict, "unverified");
});

test("contradiction beats corroboration — volume does not outvote conflict", () => {
  const o = [
    observe(UNN, pageWith("2026-09-30"), T0),
    observe(UNILAG, pageWith("2026-10-15"), T1),
    observe("https://ui.edu.ng/x", pageWith("2026-11-01"), T2),
  ];
  const record = establishVerification(entityFrom(o), o, T2);
  assert.equal(record.verdict, "contradicted");
  assert.match(record.transitions[0].reason, /disagree on deadline/);
});

test("every source falling silent withdraws the entity", () => {
  const live = [observe(UNN, pageWith("2026-09-30"), T0)];
  const entity = entityFrom(live);

  const gone = [observe(UNN, null, T2, 404)];
  const record = establishVerification(entity, gone, T2);
  assert.equal(record.verdict, "withdrawn");
});

test("verification fails closed at expiry, without any job running", () => {
  const o = [observe(UNN, pageWith("2026-12-30"), T0), observe(UNILAG, pageWith("2026-12-30"), T1)];
  const record = establishVerification(entityFrom(o), o, T1);
  assert.equal(record.verdict, "verified");

  /* Material freshness is 14 days. Nothing demotes the stored row; the read
     does. */
  const withinWindow = resolveVerification(record, "2026-08-10T09:00:00.000Z");
  assert.equal(withinWindow.verdict, "verified");

  const past = resolveVerification(record, "2026-09-01T09:00:00.000Z");
  assert.equal(past.verdict, "expired");
  assert.equal(past.lapsedFrom, "verified");
});

test("the expiry is derived from stakes and cannot be supplied", () => {
  const o = [observe(UNN, pageWith("2026-12-30"), T0), observe(UNILAG, pageWith("2026-12-30"), T1)];
  const material = establishVerification(entityFrom(o, "material"), o, T1);
  const critical = establishVerification(entityFrom(o, "life-changing"), o, T1);
  assert.ok(critical.expiresAt < material.expiresAt);
});

test("transitions are retained, not just the current verdict", () => {
  const strong = [
    observe(UNN, pageWith("2026-12-30"), T0),
    observe(UNILAG, pageWith("2026-12-30"), T0),
  ];
  const first = establishVerification(entityFrom(strong), strong, T0);
  assert.equal(first.verdict, "verified");

  const conflicting = [...strong, observe("https://ui.edu.ng/x", pageWith("2027-01-15"), T2)];
  const second = establishVerification(entityFrom(conflicting), conflicting, T2, first);

  assert.equal(second.verdict, "contradicted");
  assert.equal(second.transitions.length, 2);
  assert.equal(second.transitions[1].from, "verified");
  assert.equal(second.transitions[1].to, "contradicted");
  assert.equal(hasEverDeverified([second]), true);
});

test("expiry alone does not count as de-verification", () => {
  const o = [observe(UNN, pageWith("2026-12-30"), T0), observe(UNILAG, pageWith("2026-12-30"), T1)];
  const record = establishVerification(entityFrom(o), o, T1);
  /* The clock demoting a stale row is not the model revising a belief. */
  assert.equal(hasEverDeverified([record]), false);
});

test("closure is derived from the deadline, never read from the page", () => {
  const o = [observe(UNN, pageWith("2026-09-30"), T0)];
  const entity = entityFrom(o);

  assert.deepEqual(deriveOpenState(entity, T1).state, "open");
  assert.deepEqual(deriveOpenState(entity, "2026-10-01T00:00:00.000Z").state, "closed");
});

test("no observed deadline resolves unknown, never open", () => {
  const noDeadline = page({
    title: "Undated Programme",
    organiser: "Example",
    deadline: "rolling admissions",
    applyUrl: "https://www.unn.edu.ng/undated/apply",
  });
  const o = [observe("https://www.unn.edu.ng/undated/", noDeadline, T0)];
  const state = deriveOpenState(entityFrom(o), T1);

  /* "rolling admissions" is retained as a reading but has no normalised date,
     so the derived state is unknown — not open, which would be optimism
     written into a function. */
  assert.equal(state.state, "unknown");
});

test("a contested deadline is not a deadline", () => {
  const o = [observe(UNN, pageWith("2026-09-30"), T0), observe(UNILAG, pageWith("2026-10-15"), T1)];
  const state = deriveOpenState(entityFrom(o), T1);
  assert.equal(state.state, "unknown");
  if (state.state !== "unknown") return;
  assert.match(state.reason, /2 different deadlines/);
});
