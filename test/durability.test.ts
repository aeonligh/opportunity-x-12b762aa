import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { entityIdFor } from "@/lib/opportunity/entity/identity";
import { resolveEntity } from "@/lib/opportunity/entity/resolve";
import { InMemoryObservationStore } from "@/lib/opportunity/observation/store";
import { InMemoryVerificationLog, foldEvents } from "@/lib/opportunity/verification/log";
import { establishVerification, resolveVerification } from "@/lib/opportunity/verification/service";
import { deriveCorpus, deriveStakes } from "@/lib/opportunity/corpus";
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

/* ── Entity identity ─────────────────────────────────────────────────────── */

test("an entity's id is a function of the identity it was resolved on", () => {
  const a = entityIdFor({ method: "same-url", key: UNN });
  const b = entityIdFor({ method: "same-url", key: UNN });
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("a different key, or a different method, is a different entity", () => {
  const byUrl = entityIdFor({ method: "same-url", key: UNN });
  assert.notEqual(byUrl, entityIdFor({ method: "same-url", key: UNILAG }));
  /* The same key matched on by a different method is not the same claim: an
     operator's decision and a rule that fired must stay distinguishable. */
  assert.notEqual(byUrl, entityIdFor({ method: "operator-decision", key: UNN }));
});

test("re-deriving an entity from the same observations gives the same id", () => {
  const observations = [observe(UNN, pageWith("2027-01-15"), T0)];
  const input = {
    members: membersOf(observations),
    identity: { method: "same-url" as const, key: UNN },
    rationale: "One retrieval.",
    stakes: deriveStakes(),
  };

  const first = resolveEntity({ ...input, decidedAt: T1 });
  const second = resolveEntity({ ...input, decidedAt: T2 });
  assert.ok("entity" in first && "entity" in second);

  /* Entities are derived on every read, so an id that varied would leave the
     verification log keyed against nothing. */
  assert.equal(first.entity.id, second.entity.id);
  assert.equal(first.entity.resolution.key, UNN);
});

/* ── The verification event log ──────────────────────────────────────────── */

test("the current verdict is folded from the events, newest last", async () => {
  const log = new InMemoryVerificationLog();
  const observations = [observe(UNN, pageWith("2027-01-15"), T0)];
  const resolved = resolveEntity({
    members: membersOf(observations),
    identity: { method: "same-url", key: UNN },
    rationale: "One retrieval.",
    stakes: "material",
    decidedAt: T0,
  });
  assert.ok("entity" in resolved);
  const entity = resolved.entity;
  const ref = { id: entity.id, key: UNN, method: "same-url", stakes: entity.stakes };

  const first = establishVerification(entity, observations, T0);
  await log.record(ref, first);

  const corroborated = [...observations, observe(UNILAG, pageWith("2027-01-15"), T1)];
  const second = establishVerification(entity, corroborated, T1, first);
  await log.record(ref, second);

  const folded = await log.read(entity.id);
  assert.ok(folded);
  assert.equal(folded.verdict, "verified");
  assert.equal(folded.establishedAt, T1);
  /* Both events survive. The history is the record; the state is a fold of it. */
  assert.equal(folded.transitions.length, 2);
  assert.equal(folded.transitions[0].to, "unverified");
  assert.equal(folded.transitions[1].from, "unverified");
  assert.equal(folded.transitions[1].to, "verified");
});

test("folding an empty log is null, not a default verdict", () => {
  assert.equal(foldEvents([]), null);
});

test("the log has no method that revises or removes an event", () => {
  const log = new InMemoryVerificationLog() as unknown as Record<string, unknown>;
  for (const forbidden of ["update", "delete", "remove", "clear", "revise"]) {
    assert.equal(typeof log[forbidden], "undefined", `the log must not expose ${forbidden}()`);
  }
});

test("a folded record still fails closed at its expiry", async () => {
  const log = new InMemoryVerificationLog();
  const observations = [
    observe(UNN, pageWith("2027-06-01"), T0),
    observe(UNILAG, pageWith("2027-06-01"), T0),
  ];
  const resolved = resolveEntity({
    members: membersOf(observations),
    identity: { method: "canonical-url", key: UNN },
    rationale: "Two announcers.",
    stakes: "material",
    decidedAt: T0,
  });
  assert.ok("entity" in resolved);

  const record = establishVerification(resolved.entity, observations, T0);
  await log.record(
    { id: resolved.entity.id, key: UNN, method: "canonical-url", stakes: "material" },
    record,
  );

  const folded = await log.read(resolved.entity.id);
  assert.ok(folded);
  assert.equal(resolveVerification(folded, T1).verdict, "verified");
  /* Fifteen days on. Nothing ran; the read applied the clock. */
  assert.equal(resolveVerification(folded, "2026-08-20T09:00:00.000Z").verdict, "expired");
});

/* ── Deriving the corpus from the record ─────────────────────────────────── */

test("an empty store derives an empty corpus with a null search time", async () => {
  const corpus = await deriveCorpus(new InMemoryObservationStore(), new InMemoryVerificationLog(), {
    decidedAt: T2,
  });

  assert.deepEqual(corpus.entities, []);
  /* Null, never `now`. This is the single value that separates "discovery ran
     and found nothing" from "discovery has never run". */
  assert.equal(corpus.searchedAt, null);
});

test("the corpus is folded from observations, with one entity per URL", async () => {
  const store = new InMemoryObservationStore();
  await store.append(observe(UNN, pageWith("2027-01-15"), T0));
  await store.append(observe(UNN, pageWith("2027-01-15"), T1));
  await store.append(observe(UNILAG, pageWith("2027-01-15"), T1));

  const corpus = await deriveCorpus(store, new InMemoryVerificationLog(), { decidedAt: T2 });

  assert.equal(corpus.entities.length, 2, "grouped by URL, not merged across announcers");
  assert.equal(corpus.searchedAt, T1);

  const unn = corpus.entities.find((e) => e.resolution.key === UNN);
  assert.ok(unn);
  assert.equal(unn.resolution.observationIds.length, 2);
  assert.equal(unn.id, entityIdFor({ method: "same-url", key: UNN }));
});

test("a URL that only ever failed is recorded as a defect, not silently dropped", async () => {
  const store = new InMemoryObservationStore();
  await store.append(observe(UNN, null, T0, 404));

  const corpus = await deriveCorpus(store, new InMemoryVerificationLog(), { decidedAt: T2 });

  assert.deepEqual(corpus.entities, []);
  assert.equal(corpus.defects.length, 0, "a URL that only ever failed produces no group at all");
  assert.equal(corpus.unreadable.length, 0, "an unreachable retrieval is not an unreadable page");
  /* A retrieval happened, so the search time is real even though nothing was
     resolvable from it. */
  assert.equal(corpus.searchedAt, T0);
});

test("unclassified stakes default to the most demanding tier, never the least", () => {
  /* Stakes set how much corroboration verification requires and how quickly it
     lapses. The conservative direction is more evidence and shorter freshness,
     so an unclassified opportunity must be harder to verify, never easier. */
  assert.equal(deriveStakes(), "life-changing");
});

/* ── The schema agrees with the engine ───────────────────────────────────── */

const OBSERVATIONS_SQL = readFileSync(
  "supabase/migrations/20260810121500_opportunity_observations.sql",
  "utf8",
);
const EVENTS_SQL = readFileSync(
  "supabase/migrations/20260810122000_opportunity_verification_events.sql",
  "utf8",
);

test("the observations table revokes update, delete and truncate from every role", () => {
  assert.match(
    OBSERVATIONS_SQL,
    /revoke insert, update, delete, truncate, references, trigger\s+on public\.opportunity_observations from anon, authenticated;/,
  );
  /* Including the role the crawler itself runs as. The append-only rule is not
     a rule the writer gets to opt out of. */
  assert.match(
    OBSERVATIONS_SQL,
    /revoke update, delete, truncate on public\.opportunity_observations from service_role;/,
  );
});

test("both tables refuse mutation in a trigger, not only at the grant", () => {
  assert.match(OBSERVATIONS_SQL, /before update or delete on public\.opportunity_observations/);
  assert.match(OBSERVATIONS_SQL, /before truncate on public\.opportunity_observations/);
  assert.match(EVENTS_SQL, /before update or delete on public\.opportunity_verification_events/);
});

test("the schema refuses a retrieval stamped in the future", () => {
  /* The last line against a scheduled job recording a check it did not perform.
     The engine brands the type; the database checks the clock. */
  assert.match(OBSERVATIONS_SQL, /retrieved_at <= now\(\) \+ interval '5 minutes'/);
});

test("the schema refuses a failed retrieval that carries content", () => {
  assert.match(OBSERVATIONS_SQL, /constraint unreachable_carries_its_reason/);
  assert.match(OBSERVATIONS_SQL, /constraint retrieved_carries_its_content/);
});

test("the verification enum has no stored 'expired' member", () => {
  const enumBlock = EVENTS_SQL.slice(
    EVENTS_SQL.indexOf("create type public.verification_verdict"),
    EVENTS_SQL.indexOf(");", EVENTS_SQL.indexOf("create type public.verification_verdict")),
  );
  /* Expiry is a function of the clock. A stored `expired` would be correct only
     until the next tick, so it is applied on read and has nowhere to persist. */
  assert.equal(enumBlock.includes("expired"), false);
});

test("neither table carries an owner column", () => {
  for (const sql of [OBSERVATIONS_SQL, EVENTS_SQL]) {
    assert.equal(/\bowner_id\b/.test(sql), false);
    assert.equal(/\buser_id\b/.test(sql), false);
  }
});
