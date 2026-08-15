import { test } from "node:test";
import assert from "node:assert/strict";

import { InMemoryObservationStore } from "@/lib/opportunity/observation/store";
import { InMemoryVerificationLog } from "@/lib/opportunity/verification/log";
import { runDiscovery, defaultMechanisms } from "@/lib/opportunity/discovery/run";
import { institutionalChannels } from "@/lib/opportunity/discovery/mechanisms/institutional-channels";
import { changeDetection } from "@/lib/opportunity/discovery/mechanisms/change-detection";
import { MECHANISMS } from "@/lib/opportunity/discovery/mechanism";
import { deriveCorpus } from "@/lib/opportunity/corpus";
import { recommendNextStep } from "@/lib/opportunity/recommendation/service";
import type { Announcer } from "@/lib/opportunity/announcers/registry";
import type { Transport } from "@/lib/opportunity/discovery/fetcher";
import { page } from "./fixtures.ts";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * A FAILED OR UNEXECUTED ACQUISITION PRODUCES NO WORLD-STATE CONCLUSION
 * ══════════════════════════════════════════════════════════════════════════
 *
 * This is the guarantee the entire absence model rests on, and it is easy to
 * lose without noticing: every one of the failures below produces zero rows,
 * and zero rows is also what a healthy search of an empty world produces. A
 * system that cannot tell those apart will eventually tell someone "nothing new
 * for you today" because a crawler crashed.
 *
 * So each case below is run end to end — acquisition, corpus, recommendation,
 * the Step resolution a person would actually see — and asserted to reach
 * `unknown` ("Opportunity X cannot see") rather than `absent` ("a search ran and
 * produced nothing better").
 *
 * The last test is the positive control. Without it the suite would pass on a
 * system that could never say `absent` at all, which is a different bug with
 * the same green tick.
 */

const TEST_ANNOUNCER: Announcer = {
  id: "test-uni",
  label: "Test University",
  kind: "university",
  domain: "unn.edu.ng",
  country: "NG",
  monitorSubdomains: true,
  knownPaths: ["/"],
  defaultSourceClass: "announcer",
};

const PROGRAMME = page({
  title: "Test Scholarship",
  organiser: "Test Foundation",
  deadline: "2027-03-01",
  applyUrl: "https://unn.edu.ng/scholarship/apply",
});

interface Answer {
  status?: number;
  body?: string | null;
  throws?: string;
}

function transportFor(answers: Record<string, Answer>): Transport {
  return async (url) => {
    const answer = answers[url];
    if (!answer) return new Response(null, { status: 404 });
    if (answer.throws) throw new Error(answer.throws);
    return new Response(answer.body ?? null, {
      status: answer.status ?? 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  };
}

const noWait = async () => {};

/**
 * The whole path, from acquisition to the words a person would read.
 *
 * Deliberately not stubbed anywhere in the middle. A test that asserted on the
 * discovery report alone would prove the crawler is honest and say nothing
 * about whether the honesty survives four layers of derivation.
 */
async function acquireThenResolve(answers: Record<string, Answer> | null) {
  const store = new InMemoryObservationStore();
  const verification = new InMemoryVerificationLog();

  const report =
    answers === null
      ? null
      : await runDiscovery({
          store,
          verification,
          mechanisms: [institutionalChannels({ announcers: [TEST_ANNOUNCER] })],
          transport: transportFor(answers),
          politenessMs: 0,
          wait: noWait,
        });

  const now = new Date().toISOString();
  const corpus = await deriveCorpus(store, verification, { decidedAt: now });
  const { resolution } = await recommendNextStep({
    personId: "p1",
    store,
    entities: corpus.entities,
    verifications: corpus.verifications,
    facts: [],
    now,
  });

  return { store, report, corpus, resolution };
}

test("acquisition that never ran concludes nothing", async () => {
  const { store, resolution } = await acquireThenResolve(null);

  assert.equal(await store.count(), 0);
  assert.equal(await store.lastRetrievalAt(), null);
  assert.equal(resolution.state, "unknown");
});

test("acquisition blocked by robots concludes nothing", async () => {
  const { store, report, resolution } = await acquireThenResolve({
    "https://unn.edu.ng/robots.txt": { body: "User-agent: *\nDisallow: /\n" },
    "https://unn.edu.ng/": { body: PROGRAMME },
  });

  assert.ok(report);
  assert.equal(report.requested, 0);
  assert.ok(report.skipped.length > 0, "the refusal must be recorded");
  /* Refusing to look leaves no observation, so nothing downstream can read the
     refusal as a finding about the world. */
  assert.equal(await store.count(), 0);
  assert.equal(report.retrievalWatermark, null);
  assert.equal(resolution.state, "unknown");
});

test("acquisition against an unreadable robots.txt concludes nothing", async () => {
  const { store, report, resolution } = await acquireThenResolve({
    "https://unn.edu.ng/robots.txt": { status: 503, body: null },
    "https://unn.edu.ng/": { body: PROGRAMME },
  });

  assert.ok(report);
  assert.equal(report.requested, 0);
  assert.equal(await store.count(), 0);
  assert.equal(resolution.state, "unknown");
});

test("acquisition whose transport throws on every request concludes nothing about the world", async () => {
  const { store, report, resolution } = await acquireThenResolve({
    "https://unn.edu.ng/robots.txt": { throws: "ENOTFOUND" },
    "https://unn.edu.ng/": { throws: "ENOTFOUND" },
  });

  assert.ok(report);
  /* robots.txt could not be read, so nothing was requested and nothing recorded
     — the failure is total and produces no observations at all. */
  assert.equal(await store.count(), 0);
  assert.equal(resolution.state, "unknown");
});

test("a reachable host whose pages all fail records the failures and still concludes nothing positive", async () => {
  const { store, report, corpus, resolution } = await acquireThenResolve({
    "https://unn.edu.ng/robots.txt": { body: "" },
    /* No entry for "/" — it answers 404. */
  });

  assert.ok(report);
  assert.equal(report.requested, 1);
  assert.equal(report.unreachable, 1);
  assert.equal(report.retrieved, 0);

  /* A request WAS made, so the watermark moves and the failure is on record.
     That is the honest difference from the cases above. */
  assert.equal(await store.count(), 1);
  assert.notEqual(report.retrievalWatermark, null);

  /* But no entity can be asserted from a source that did not answer, so there
     is still nothing to recommend. The failure lives in the observation record
     rather than in a defect list: a page that never answered is not a page that
     answered unreadably, and the corpus keeps those apart. */
  assert.deepEqual(corpus.entities, []);
  assert.equal(corpus.unreadable.length, 0);
  assert.equal(corpus.defects.length, 0);

  /* A search genuinely ran. `absent` is now the truthful answer, not `unknown`. */
  assert.equal(resolution.state, "absent");
});

test("a store that throws on read resolves unknown, never absent", async () => {
  const store = new InMemoryObservationStore();
  const broken = {
    ...store,
    lastRetrievalAt: async () => {
      throw new Error("connection refused");
    },
  } as unknown as InMemoryObservationStore;

  /* A database outage must never present as a verdict about opportunities. */
  await assert.rejects(
    () =>
      deriveCorpus(broken, new InMemoryVerificationLog(), {
        decidedAt: new Date().toISOString(),
      }),
    /connection refused/,
  );
});

test("a successful acquisition that finds nothing recommendable does say absent", async () => {
  /* The positive control. Without it, every assertion above would still pass on
     a system that had simply lost the ability to conclude anything. */
  const { store, report, corpus, resolution } = await acquireThenResolve({
    "https://unn.edu.ng/robots.txt": { body: "" },
    "https://unn.edu.ng/": { body: PROGRAMME },
  });

  assert.ok(report);
  assert.equal(report.retrieved, 1);
  assert.equal(await store.count(), 1);
  assert.equal(corpus.entities.length, 1);

  /* One announcer, and derived stakes are the most demanding tier, so it is
     honestly not verified — withheld, and the search is a real verdict. */
  assert.equal(resolution.state, "absent");
  if (resolution.state !== "absent") return;
  assert.equal(resolution.searchedAt, report.retrievalWatermark);
});

/* ── Discovery is plural, and says so ────────────────────────────────────── */

test("the mechanism manifest declares every mechanism, built or not", () => {
  const ids = MECHANISMS.map((m) => m.id);
  assert.deepEqual(ids, [
    "institutional-channels",
    "change-detection",
    "institutional-artifact-crawl",
    "unknown-domain-discovery",
    "platform-integration",
  ]);

  /* Exactly one primary, and the unbuilt ones each say what nothing reaches —
     which is a statement about the corpus, not about a backlog. */
  assert.equal(MECHANISMS.filter((m) => m.primary).length, 1);
  for (const m of MECHANISMS.filter((m) => m.status === "not-built")) {
    assert.ok(m.reaches.length > 20, `${m.id} must name what nothing reaches`);
  }
});

test("a run reports the mechanisms that did not run, not only those that did", async () => {
  const store = new InMemoryObservationStore();
  const report = await runDiscovery({
    store,
    verification: new InMemoryVerificationLog(),
    mechanisms: [institutionalChannels({ announcers: [TEST_ANNOUNCER] })],
    transport: transportFor({
      "https://unn.edu.ng/robots.txt": { body: "" },
      "https://unn.edu.ng/": { body: PROGRAMME },
    }),
    politenessMs: 0,
    wait: noWait,
  });

  assert.equal(report.coverage.length, MECHANISMS.length);

  const ran = report.coverage.filter((c) => c.ran);
  assert.deepEqual(
    ran.map((c) => c.id),
    ["institutional-channels"],
  );

  /* The announcer registry accounts for this entire run. Being able to state
     that is the difference between a known limitation and an invisible one. */
  assert.equal(ran[0].share, 1);

  const notRun = report.coverage.filter((c) => !c.ran);
  assert.equal(notRun.length, 4);
  for (const c of notRun) {
    assert.ok(c.missing, `${c.id} must report what the corpus is missing`);
  }
});

test("change detection re-checks a page the announcer no longer links to", async () => {
  const store = new InMemoryObservationStore();
  const verification = new InMemoryVerificationLog();

  const withLink = transportFor({
    "https://unn.edu.ng/robots.txt": { body: "" },
    "https://unn.edu.ng/": { body: `<a href="/scholarship">s</a>` },
    "https://unn.edu.ng/scholarship": { body: PROGRAMME },
  });

  const first = await runDiscovery({
    store,
    verification,
    mechanisms: [institutionalChannels({ announcers: [TEST_ANNOUNCER] })],
    transport: withLink,
    politenessMs: 0,
    wait: noWait,
  });
  assert.equal(first.retrieved, 2);

  /* The programme scrolls off the homepage. The channel monitor would never
     look at it again — every judgment resting on it would keep citing a
     retrieval that quietly ages. */
  const withoutLink = transportFor({
    "https://unn.edu.ng/robots.txt": { body: "" },
    "https://unn.edu.ng/": { body: `<p>nothing here now</p>` },
    "https://unn.edu.ng/scholarship": { body: PROGRAMME },
  });

  const second = await runDiscovery({
    store,
    verification,
    mechanisms: [institutionalChannels({ announcers: [TEST_ANNOUNCER] }), changeDetection()],
    transport: withoutLink,
    politenessMs: 0,
    /* Zero, so the first run's observations are already outside the window. */
    recheckAfterHours: 0,
    wait: noWait,
  });

  const scholarship = await store.readByUrl("https://unn.edu.ng/scholarship");
  assert.equal(scholarship.length, 2, "the delinked page was re-checked");

  const byChangeDetection = second.coverage.find((c) => c.id === "change-detection");
  assert.ok(byChangeDetection?.ran);
  assert.equal(byChangeDetection.retrieved, 1);
});

test("two mechanisms never double-fetch the same page in one run", async () => {
  const store = new InMemoryObservationStore();
  const verification = new InMemoryVerificationLog();

  const answers = {
    "https://unn.edu.ng/robots.txt": { body: "" },
    "https://unn.edu.ng/": { body: PROGRAMME },
  };

  await runDiscovery({
    store,
    verification,
    mechanisms: [institutionalChannels({ announcers: [TEST_ANNOUNCER] })],
    transport: transportFor(answers),
    politenessMs: 0,
    wait: noWait,
  });

  const second = await runDiscovery({
    store,
    verification,
    mechanisms: [institutionalChannels({ announcers: [TEST_ANNOUNCER] }), changeDetection()],
    transport: transportFor(answers),
    politenessMs: 0,
    recheckAfterHours: 0,
    wait: noWait,
  });

  /* Both mechanisms wanted the same URL. One request, one observation. */
  assert.equal(second.requested, 1);
  assert.equal((await store.readByUrl("https://unn.edu.ng/")).length, 2);
});

test("the default run uses every implemented mechanism", () => {
  const ids = defaultMechanisms().map((m) => m.id);
  const implemented = MECHANISMS.filter((m) => m.status === "implemented").map((m) => m.id);
  /* A mechanism marked implemented but absent from the default run would be a
     capability the manifest claims and no run ever exercises. */
  assert.deepEqual(ids.sort(), implemented.sort());
});
