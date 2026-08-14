import { test } from "node:test";
import assert from "node:assert/strict";

import { InMemoryObservationStore } from "@/lib/opportunity/observation/store";
import { classify } from "@/lib/opportunity/announcers/registry";
import type { ObservedClaim, RetrievedObservation, SourceObservation } from "@/lib/opportunity/observation/types";
import { observe, page, T0, T1 } from "./fixtures.ts";

/** Every fixture page here declares exactly one opportunity. */
function soleItem(o: SourceObservation) {
  assert.equal(o.outcome, "retrieved");
  const retrieved = o as RetrievedObservation;
  assert.equal(retrieved.items.length, 1, "fixture should declare exactly one item");
  return retrieved.items[0];
}

const UNN = "https://www.unn.edu.ng/example-scholarship/";

const BODY = page({
  title: "Example National Scholarship",
  organiser: "Example Foundation",
  deadline: "2026-09-30",
  applyUrl: "https://www.unn.edu.ng/example-scholarship/apply",
});

test("an observation's retrievedAt comes from the exchange, not the clock", () => {
  const o = observe(UNN, BODY, T0);
  assert.equal(o.retrievedAt, T0);
});

test("the retrieval timestamp is distinct from a date stated inside the page", () => {
  const o = observe(UNN, BODY, T0);
  assert.equal(o.outcome, "retrieved");
  if (o.outcome !== "retrieved") return;

  const deadline = soleItem(o).claims.find((c: ObservedClaim) => c.field === "deadline");
  assert.ok(deadline, "the page's deadline should have been extracted");
  assert.notEqual(deadline.normalised, o.retrievedAt);
  /* The page says September; Opportunity X looked in August. Conflating them is how a
     system starts believing a page was checked because it mentions a date. */
  assert.ok(o.retrievedAt < (deadline.normalised as string));
});

test("content is retained, not a hash alone", () => {
  const o = observe(UNN, BODY, T0);
  assert.equal(o.outcome, "retrieved");
  if (o.outcome !== "retrieved") return;

  assert.equal(o.content.body, BODY);
  assert.equal(o.content.byteLength, Buffer.byteLength(BODY));
  assert.match(o.content.sha256, /^[0-9a-f]{64}$/);
});

test("a fetch failure is recorded as an observation, and carries no claims", () => {
  const o = observe(UNN, null, T0, 404);
  assert.equal(o.outcome, "unreachable");
  if (o.outcome !== "unreachable") return;

  assert.equal(o.status, 404);
  assert.equal(o.retrievedAt, T0);
  /* The union gives a failed retrieval nowhere to put content or claims, so a
     failure cannot present as a thin success. */
  assert.equal("content" in o, false);
  assert.equal("items" in o, false);
});

test("the parser version identifies the whole pipeline, on success and failure alike", () => {
  const version = observe(UNN, BODY, T0).parserVersion;
  /* The composite's version fingerprints its members, so observations produced
     by different pipelines are never mistaken for each other. */
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.equal(observe(UNN, null, T0, 500).parserVersion, version);
});

test("each claim names the extractor that produced it, not just the pipeline", () => {
  const o = observe(UNN, BODY, T0);
  assert.equal(o.outcome, "retrieved");
  if (o.outcome !== "retrieved") return;

  /* Several extractors read one document. Attributing a wrong value to "the
     parser" when three of them ran identifies nothing. */
  for (const claim of soleItem(o).claims) {
    assert.match(claim.extractedBy, /^[a-z-]+@\d+\.\d+\.\d+$/);
  }
});

test("first-observation provenance distinguishes an announcer from an unknown domain", () => {
  assert.equal(classify(UNN).sourceClass, "announcer");
  assert.equal(classify("https://3mtt.nitda.gov.ng/").sourceClass, "official");
  /* A subdomain of an enumerated announcer is reachable; an independent domain
     is the residue, and it is counted rather than guessed at. */
  assert.equal(classify("https://ulesarb.org/challenge").sourceClass, "unknown-domain");
});

test("the store has no update and no delete", () => {
  const store = new InMemoryObservationStore();
  const surface = store as unknown as Record<string, unknown>;
  for (const forbidden of ["update", "delete", "remove", "clear", "set", "purge"]) {
    assert.equal(
      typeof surface[forbidden],
      "undefined",
      `ObservationStore must not expose ${forbidden}()`
    );
  }
});

test("re-encountering a URL appends; it never replaces", async () => {
  const store = new InMemoryObservationStore();
  await store.append(observe(UNN, BODY, T0));
  await store.append(observe(UNN, BODY, T1));

  assert.equal(await store.count(), 2);
  const both = await store.readByUrl(UNN);
  assert.equal(both.length, 2);
  assert.deepEqual(
    both.map((o) => o.retrievedAt),
    [T0, T1]
  );
});

test("appending an observation twice is refused rather than silently overwriting", async () => {
  const store = new InMemoryObservationStore();
  const o = observe(UNN, BODY, T0);
  await store.append(o);
  await assert.rejects(() => store.append(o), /append-only/);
});

test("an empty store reports no retrieval, never 'just now'", async () => {
  const store = new InMemoryObservationStore();
  assert.equal(await store.lastRetrievalAt(), null);
});

test("the retrieval watermark does not move backwards on out-of-order arrival", async () => {
  const store = new InMemoryObservationStore();
  await store.append(observe(UNN, BODY, T1));
  await store.append(observe(UNN, BODY, T0));
  assert.equal(await store.lastRetrievalAt(), T1);
});

test("the extractor declines to invent a date it cannot read", () => {
  const rolling = page({
    title: "Rolling Programme",
    organiser: "Example",
    deadline: "rolling admissions",
    applyUrl: "https://www.unn.edu.ng/rolling/apply",
  });
  const o = observe("https://www.unn.edu.ng/rolling/", rolling, T0);
  assert.equal(o.outcome, "retrieved");
  if (o.outcome !== "retrieved") return;

  const deadline = soleItem(o).claims.find((c: ObservedClaim) => c.field === "deadline");
  assert.equal(deadline?.asStated, "rolling admissions");
  assert.equal(deadline?.normalised, undefined);
});

test("a bare year is not normalised into a precise date", () => {
  const vague = page({
    title: "Vague Programme",
    organiser: "Example",
    deadline: "2027",
    applyUrl: "https://www.unn.edu.ng/vague/apply",
  });
  const o = observe("https://www.unn.edu.ng/vague/", vague, T0);
  assert.equal(o.outcome, "retrieved");
  if (o.outcome !== "retrieved") return;

  assert.equal(soleItem(o).claims.find((c: ObservedClaim) => c.field === "deadline")?.normalised, undefined);
});

test("a page with no JSON-LD yields no claims rather than a prose guess", () => {
  const prose = "<html><body><h1>Scholarship</h1><p>Deadline: 30 September 2026</p></body></html>";
  const o = observe("https://www.unn.edu.ng/prose/", prose, T0);
  assert.equal(o.outcome, "retrieved");
  if (o.outcome !== "retrieved") return;

  assert.deepEqual(o.items, []);
  assert.ok(o.unreadable, 'an empty extraction must say why');
});
