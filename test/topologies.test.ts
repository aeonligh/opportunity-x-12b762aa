import { test } from "node:test";
import assert from "node:assert/strict";

import { groupObservations } from "@/lib/opportunity/entity/group";
import { resolveEntity } from "@/lib/opportunity/entity/resolve";
import { agrees, agreedValue, contestedFields } from "@/lib/opportunity/entity/types";
import { InMemoryObservationStore } from "@/lib/opportunity/observation/store";
import { InMemoryVerificationLog } from "@/lib/opportunity/verification/log";
import { establishVerification } from "@/lib/opportunity/verification/service";
import { deriveCorpus, deriveStakes } from "@/lib/opportunity/corpus";
import type { RetrievedObservation, SourceObservation } from "@/lib/opportunity/observation/types";
import {
  listingPage,
  observe,
  observeBinary,
  page,
  prosePage,
  soleGroup,
  T0,
  T1,
  T2,
} from "./fixtures.ts";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * THE SOURCE TOPOLOGIES, AS FIXTURES
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Every case below is drawn from the topologies the discovery research
 * established, not invented to suit the implementation. Each is written to
 * fail if the engine takes a shortcut it would be tempting to take:
 *
 *   - a listing page, which punishes "one set of fields per page";
 *   - three announcements of one scholarship, which punishes URL identity;
 *   - two cycles at one address, which punishes URL identity from the other side;
 *   - a mutable timeline, which punishes last-writer-wins;
 *   - FINAL versus corrected, which punishes merging on resemblance;
 *   - identical titles on different opportunities, which punishes merging on name;
 *   - a PDF circular, which punishes treating unreadable as empty;
 *   - a prose page, which punishes treating JSON-LD as the definition.
 */

const FMOE = "https://education.gov.ng/bea-2026";
const UNN = "https://www.unn.edu.ng/bea-scholarship/";
const UNILAG = "https://unilag.edu.ng/news/bea-scholarship";
const APPLY = "https://portal.education.gov.ng/bea/apply";

/** The publisher's own name for the thing. The only signal strong enough to merge. */
const BEA_ID = "FMOE-BEA-2026";

function beaAt(url: string, opts: { deadline?: string; title?: string; cycle?: string } = {}) {
  return page({
    title: opts.title ?? "Bilateral Education Agreement (BEA) Scholarship",
    organiser: "Federal Ministry of Education",
    deadline: opts.deadline ?? "2026-09-30",
    applyUrl: APPLY,
    identifier: BEA_ID,
    cycle: opts.cycle,
    canonical: url === FMOE ? undefined : FMOE,
  });
}

function retrieved(o: SourceObservation): RetrievedObservation {
  assert.equal(o.outcome, "retrieved");
  return o as RetrievedObservation;
}

/* ══════════════════════════════════════════════════════════════════════════
   1 · One URL, several opportunities
   ══════════════════════════════════════════════════════════════════════════ */

test("a listing page declaring two opportunities yields two items, not one", () => {
  const body = listingPage("Scholarship opportunities", [
    {
      title: "BEA Scholarship 2026/2027",
      organiser: "Federal Ministry of Education",
      deadline: "2026-09-30",
      applyUrl: APPLY,
      identifier: BEA_ID,
    },
    {
      title: "PTDF Overseas Scholarship 2026",
      organiser: "Petroleum Technology Development Fund",
      deadline: "2026-11-15",
      applyUrl: "https://ptdf.gov.ng/apply",
      identifier: "PTDF-OSS-2026",
    },
  ]);

  const o = retrieved(observe(UNN, body, T0));

  /* The previous extractor produced ONE item here and the second opportunity
     left no trace anywhere in the record — not merged wrongly, destroyed. */
  assert.equal(o.items.length, 2);

  const titles = o.items.map((i) => i.claims.find((c) => c.field === "title")?.asStated);
  assert.ok(titles.includes("BEA Scholarship 2026/2027"));
  assert.ok(titles.includes("PTDF Overseas Scholarship 2026"));

  const { groups } = groupObservations([o]);
  assert.equal(groups.length, 2, "one URL resolved to two entities");
});

test("two opportunities on one page do not pool each other's deadlines", () => {
  const body = listingPage("Two calls", [
    {
      title: "A",
      organiser: "Org A",
      deadline: "2026-09-30",
      applyUrl: "https://a.test/x",
      identifier: "A-1",
    },
    {
      title: "B",
      organiser: "Org B",
      deadline: "2026-11-15",
      applyUrl: "https://b.test/x",
      identifier: "B-1",
    },
  ]);

  const { groups } = groupObservations([observe(UNN, body, T0)]);
  const entities = groups.map((g) => {
    const r = resolveEntity({
      members: g.members,
      identity: g.identity,
      rationale: g.rationale,
      stakes: "material",
      decidedAt: T1,
    });
    assert.ok("entity" in r);
    return r.entity;
  });

  for (const entity of entities) {
    const deadline = entity.fields.find((f) => f.field === "deadline");
    assert.ok(deadline);
    /* Pooling would give each entity two deadlines and make both contested —
       a contradiction manufactured by the reader, not present in the source. */
    assert.equal(agrees(deadline), true);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   2 · Many URLs, one opportunity  —  same opportunity ≠ same URL
   ══════════════════════════════════════════════════════════════════════════ */

test("the same advert at three URLs resolves to one entity", () => {
  const observations = [
    observe(FMOE, beaAt(FMOE), T0),
    observe(UNN, beaAt(UNN), T1),
    observe(UNILAG, beaAt(UNILAG), T1),
  ];

  const { groups } = groupObservations(observations);
  assert.equal(groups.length, 1, "three announcements of one scholarship are one opportunity");
  assert.equal(groups[0].identity.method, "declared-identifier");
  assert.equal(groups[0].members.length, 3);
  assert.match(groups[0].rationale, /publisher's own identifier/);
});

test("merging across URLs is what lets corroboration verify an opportunity", () => {
  const observations = [
    observe(FMOE, beaAt(FMOE), T0),
    observe(UNN, beaAt(UNN), T1),
    observe(UNILAG, beaAt(UNILAG), T1),
  ];

  const group = soleGroup(observations);
  const resolved = resolveEntity({
    members: group.members,
    identity: group.identity,
    rationale: group.rationale,
    stakes: "life-changing",
    decidedAt: T2,
  });
  assert.ok("entity" in resolved);

  const record = establishVerification(resolved.entity, observations, T2);
  /* Grouped by URL these were three single-sourced entities, none of which
     could ever reach the life-changing threshold. The corroboration that
     verifies it is exactly what URL identity threw away. */
  assert.equal(record.basis.distinctSources, 3);
  assert.equal(record.verdict, "verified");
});

test("a declared canonical merges pages that declare no identifier", () => {
  const withCanonical = () =>
    page({
      title: "Faculty Bursary",
      organiser: "Example University",
      deadline: "2026-10-01",
      applyUrl: "https://example.edu/apply",
      canonical: "https://example.edu/bursary",
    });

  const { groups } = groupObservations([
    observe("https://example.edu/news/bursary", withCanonical(), T0),
    observe("https://example.edu/bursary?utm_source=x", withCanonical(), T1),
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].identity.method, "canonical-url");
  assert.equal(groups[0].identity.key, "https://example.edu/bursary");
});

/* ══════════════════════════════════════════════════════════════════════════
   3 · One URL, several cycles  —  same URL ≠ same opportunity
   ══════════════════════════════════════════════════════════════════════════ */

test("a declared cycle separates two rounds served at one stable URL", () => {
  const observations = [
    observe(FMOE, beaAt(FMOE, { cycle: "2026/2027", deadline: "2026-09-30" }), T0),
    observe(FMOE, beaAt(FMOE, { cycle: "2027/2028", deadline: "2027-09-30" }), T2),
  ];

  const { groups } = groupObservations(observations);

  /* Same URL, same identifier, two declared cycles. Merging them would let next
     year's deadline overwrite this year's and tell a person to apply by a date
     belonging to a different round. */
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map((g) => g.identity.key).sort(), [
    `${BEA_ID}#2026/2027`,
    `${BEA_ID}#2027/2028`,
  ]);
  for (const group of groups) {
    assert.match(group.rationale, /declared cycle/);
  }
});

test("an undeclared cycle change is a contradiction, not a silent new entity", () => {
  const observations = [
    observe(FMOE, beaAt(FMOE, { deadline: "2026-09-30" }), T0),
    observe(FMOE, beaAt(FMOE, { deadline: "2027-09-30" }), T2),
  ];

  const group = soleGroup(observations);
  const resolved = resolveEntity({
    members: group.members,
    identity: group.identity,
    rationale: group.rationale,
    stakes: "material",
    decidedAt: T2,
  });
  assert.ok("entity" in resolved);

  /*
    "The deadline moved" and "this is next year's round" are indistinguishable
    without a declaration. Guessing rewrites the record either way, so both
    readings survive and verification says the sources disagree.
  */
  const deadline = resolved.entity.fields.find((f) => f.field === "deadline");
  assert.ok(deadline);
  assert.equal(deadline.readings.length, 2);
  assert.equal(agreedValue(resolved.entity, "deadline"), null);

  const record = establishVerification(resolved.entity, observations, T2);
  assert.equal(record.verdict, "contradicted");
});

/* ══════════════════════════════════════════════════════════════════════════
   4 · The mutable timeline
   ══════════════════════════════════════════════════════════════════════════ */

test("a page rewritten in place keeps both readings and both retrievals", () => {
  const observations = [
    observe(FMOE, beaAt(FMOE, { deadline: "2026-09-30" }), T0),
    observe(FMOE, beaAt(FMOE, { deadline: "2026-10-31" }), T1),
    observe(FMOE, beaAt(FMOE, { deadline: "2026-10-31" }), T2),
  ];

  const group = soleGroup(observations);
  const resolved = resolveEntity({
    members: group.members,
    identity: group.identity,
    rationale: group.rationale,
    stakes: "material",
    decidedAt: T2,
  });
  assert.ok("entity" in resolved);

  const deadline = resolved.entity.fields.find((f) => f.field === "deadline");
  assert.ok(deadline);
  assert.equal(deadline.readings.length, 2, "the superseded deadline is not deleted");

  const [original, revised] = deadline.readings;
  assert.equal(original.firstSeenAt, T0);
  assert.equal(original.lastSeenAt, T0);
  /* The current value was seen twice, and the record says which retrievals. */
  assert.equal(revised.observedIn.length, 2);
  assert.equal(revised.lastSeenAt, T2);

  /* And the bytes behind the first reading are still held, so what the page
     said in August is reconstructible in December. */
  const first = retrieved(observations[0]);
  assert.ok(first.content.body.includes("2026-09-30"));
});

/* ══════════════════════════════════════════════════════════════════════════
   5 · FINAL versus corrected  —  resemblance proposes, it never decides
   ══════════════════════════════════════════════════════════════════════════ */

test("two revisions of one advert stay separate and raise a merge candidate", () => {
  const advert = (title: string) =>
    page({
      title,
      organiser: "Federal Ministry of Education",
      deadline: "2026-09-30",
      applyUrl: APPLY,
    });

  const observations = [
    observe("https://education.gov.ng/docs/bea-FINAL", advert("BEA Scholarship Advert"), T0),
    observe("https://education.gov.ng/docs/bea-corrected", advert("BEA Scholarship Advert"), T1),
  ];

  const { groups, candidates } = groupObservations(observations);

  /* No declared identifier links them, and merging on a filename or a matching
     title would eventually fuse two genuinely different opportunities. */
  assert.equal(groups.length, 2);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].status, "unresolved");
  assert.ok(candidates[0].because.some((b) => /same place to apply/.test(b)));
  assert.ok(candidates[0].because.some((b) => /Identical title and organiser/.test(b)));
  assert.ok(candidates[0].against.length > 0, "a candidate must state what stops it");
});

test("a shared application URL alone never merges two cycles", () => {
  const observations = [
    observe(FMOE, beaAt(FMOE, { cycle: "2026/2027" }), T0),
    observe(FMOE, beaAt(FMOE, { cycle: "2027/2028", deadline: "2027-09-30" }), T2),
  ];

  const { groups, candidates } = groupObservations(observations);
  assert.equal(groups.length, 2);

  /* They share an application portal, so a resolver keyed on that would fuse
     two rounds a person applies to separately. It is a candidate, and the
     declared cycles are recorded as the reason not to act on it. */
  assert.equal(candidates.length, 1);
  assert.ok(candidates[0].against.some((a) => /Different declared cycles/.test(a)));
});

/* ══════════════════════════════════════════════════════════════════════════
   6 · Names  —  same name ≠ same opportunity, different names ≠ different
   ══════════════════════════════════════════════════════════════════════════ */

test("two different opportunities sharing a title stay separate", () => {
  const generic = (organiser: string, id: string, apply: string) =>
    page({
      title: "Postgraduate Scholarship",
      organiser,
      deadline: "2026-10-01",
      applyUrl: apply,
      identifier: id,
    });

  const { groups, candidates } = groupObservations([
    observe(
      "https://www.unn.edu.ng/pg",
      generic("UNN", "UNN-PG-1", "https://unn.edu.ng/apply"),
      T0,
    ),
    observe(
      "https://unilag.edu.ng/pg",
      generic("UNILAG", "UNILAG-PG-1", "https://unilag.edu.ng/apply"),
      T0,
    ),
  ]);

  assert.equal(groups.length, 2, "an identical name is not an identity");
  /* Different organisers and different apply URLs, so not even a candidate. */
  assert.equal(candidates.length, 0);
});

test("one opportunity under two different names resolves to one entity", () => {
  const observations = [
    observe(FMOE, beaAt(FMOE, { title: "FSB BEA Scholarship" }), T0),
    observe(
      UNN,
      beaAt(UNN, { title: "Bilateral Education Agreement (BEA) Scholarship 2026/2027" }),
      T1,
    ),
  ];

  const group = soleGroup(observations);
  const resolved = resolveEntity({
    members: group.members,
    identity: group.identity,
    rationale: group.rationale,
    stakes: "material",
    decidedAt: T2,
  });
  assert.ok("entity" in resolved);

  /* Merged on the declared identifier, and the two names survive as two
     readings rather than one being chosen. */
  const title = resolved.entity.fields.find((f) => f.field === "title");
  assert.ok(title);
  assert.equal(title.readings.length, 2);
  assert.deepEqual(
    contestedFields(resolved.entity).map((f) => f.field),
    ["title"],
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   7 · Conflicting claims survive resolution
   ══════════════════════════════════════════════════════════════════════════ */

test("announcers disagreeing about eligibility keep both readings, attributed", () => {
  const variant = (eligibility: string) => ({
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalProgram",
    name: "BEA Scholarship",
    identifier: BEA_ID,
    programPrerequisites: eligibility,
    applicationDeadline: "2026-09-30",
  });

  const wrap = (node: unknown) =>
    `<html><head><script type="application/ld+json">${JSON.stringify(node)}</script></head><body></body></html>`;

  const observations = [
    observe(FMOE, wrap(variant("Open to all Nigerian graduates")), T0),
    observe(UNN, wrap(variant("Open to first-class graduates only")), T1),
  ];

  const group = soleGroup(observations);
  const resolved = resolveEntity({
    members: group.members,
    identity: group.identity,
    rationale: group.rationale,
    stakes: "material",
    decidedAt: T2,
  });
  assert.ok("entity" in resolved);

  const eligibility = resolved.entity.fields.find((f) => f.field === "eligibility");
  assert.ok(eligibility);
  assert.equal(eligibility.readings.length, 2);
  /* Each reading names the extractor that produced it, so a parser later found
     to be wrong can be traced to the readings it is responsible for. */
  for (const reading of eligibility.readings) {
    assert.ok(reading.extractedBy[0].startsWith("json-ld@"));
  }

  const record = establishVerification(resolved.entity, observations, T2);
  assert.equal(record.verdict, "contradicted");
  assert.match(record.transitions[0].reason, /eligibility/);
});

/* ══════════════════════════════════════════════════════════════════════════
   8 · Absence of extraction is not absence of an opportunity
   ══════════════════════════════════════════════════════════════════════════ */

test("a PDF circular is retained whole and recorded as unreadable, not empty", () => {
  const o = retrieved(
    observeBinary("https://education.gov.ng/circulars/bea.pdf", "%PDF-1.4 fake", T0),
  );

  assert.equal(o.content.encoding, "base64");
  /* The bytes round-trip. Decoding a PDF as UTF-8 — which this engine used to
     do — stored mojibake that could never be read back. */
  assert.equal(Buffer.from(o.content.body, "base64").toString("utf8"), "%PDF-1.4 fake");

  assert.deepEqual(o.items, []);
  assert.ok(o.unreadable);
  assert.equal(o.unreadable.mediaType, "application/pdf");
  assert.match(o.unreadable.reason, /Binary media/);
});

test("an unreadable retrieval is a counted coverage fact, not a dropped row", async () => {
  const store = new InMemoryObservationStore();
  await store.append(observeBinary("https://education.gov.ng/circulars/bea.pdf", "%PDF", T0));
  await store.append(observe(UNN, prosePage("News", "Deadline: 30 September 2026"), T1));

  const corpus = await deriveCorpus(store, new InMemoryVerificationLog(), { decidedAt: T2 });

  assert.deepEqual(corpus.entities, []);
  assert.equal(corpus.unreadable.length, 2);
  /* Both stay in the record and under monitoring. Turning them into nothing
     would make the coverage gap indistinguishable from an empty world. */
  assert.equal(corpus.searchedAt, T1);

  const media = corpus.unreadable.map((u) => u.mediaType).sort();
  assert.ok(media.some((m) => m.includes("pdf")));
  assert.ok(media.some((m) => m.includes("html")));
});

test("a prose page contributes identity even when it declares no opportunity", () => {
  const o = retrieved(
    observe(
      "https://www.unn.edu.ng/news/bursary?utm_source=x",
      prosePage(
        "Bursary announced",
        "Apply by 30 September.",
        "https://www.unn.edu.ng/news/bursary",
      ),
      T0,
    ),
  );

  /* No item — a `<title>` is not evidence an opportunity exists, or every
     contact page in the corpus would become one. */
  assert.deepEqual(o.items, []);

  /* But the declared canonical is recorded, so when a structured page later
     names the same canonical the two resolve together. */
  assert.ok(
    o.pageIdentity.some(
      (s) => s.kind === "canonical-url" && s.value === "https://www.unn.edu.ng/news/bursary",
    ),
  );
  /* And the page URL is always present, and always last. */
  assert.equal(o.pageIdentity.at(-1)?.kind, "page-url");
});

test("a page title fills a missing title on a declared item, and never creates one", () => {
  const untitled = `<html><head><title>BEA Scholarship — Ministry of Education</title>
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalProgram",
    identifier: BEA_ID,
    applicationDeadline: "2026-09-30",
  })}</script></head><body></body></html>`;

  const o = retrieved(observe(FMOE, untitled, T0));
  assert.equal(o.items.length, 1);

  const title = o.items[0].claims.find((c) => c.field === "title");
  assert.ok(title, "the declared item had no name; the page title filled it");
  assert.equal(title.asStated, "BEA Scholarship — Ministry of Education");
  assert.ok(title.extractedBy.startsWith("page-metadata@"));
});

/* ══════════════════════════════════════════════════════════════════════════
   9 · The whole corpus, end to end
   ══════════════════════════════════════════════════════════════════════════ */

test("a mixed corpus resolves into the right number of entities", async () => {
  const store = new InMemoryObservationStore();

  /* One scholarship announced three times. */
  await store.append(observe(FMOE, beaAt(FMOE), T0));
  await store.append(observe(UNN, beaAt(UNN), T1));
  await store.append(observe(UNILAG, beaAt(UNILAG), T1));

  /* A listing carrying two more. */
  await store.append(
    observe(
      "https://unilag.edu.ng/opportunities",
      listingPage("Opportunities", [
        {
          title: "PTDF",
          organiser: "PTDF",
          deadline: "2026-11-15",
          applyUrl: "https://ptdf.gov.ng/a",
          identifier: "PTDF-1",
        },
        {
          title: "NELFUND",
          organiser: "NELFUND",
          deadline: "2026-12-01",
          applyUrl: "https://nelf.gov.ng/a",
          identifier: "NELF-1",
        },
      ]),
      T1,
    ),
  );

  /* A circular nothing can read, and a page that answered with nothing. */
  await store.append(observeBinary("https://education.gov.ng/c.pdf", "%PDF", T1));
  await store.append(observe("https://www.unn.edu.ng/", prosePage("Home", "Welcome"), T1));

  const corpus = await deriveCorpus(store, new InMemoryVerificationLog(), { decidedAt: T2 });

  /* Six retrievals → three opportunities, two unreadable pages, and nothing
     invented in between. Under the previous engine this was six entities, one
     of which had silently swallowed the other listing entry. */
  assert.equal(corpus.entities.length, 3);
  assert.equal(corpus.unreadable.length, 2);
  assert.equal(corpus.defects.length, 0);

  const bea = corpus.entities.find((e) => e.resolution.key === BEA_ID);
  assert.ok(bea);
  assert.equal(bea.resolution.method, "declared-identifier");
  assert.equal(bea.resolution.observationIds.length, 3);
  /* First-observation provenance still points at the ministry, not whichever
     announcer happened to be read first. */
  assert.equal(bea.firstObservation.sourceClass, "official");
});

test("stakes are still the most demanding tier when nothing classified them", () => {
  assert.equal(deriveStakes(), "life-changing");
});
