import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { InMemoryObservationStore } from "@/lib/opportunity/observation/store";
import { InMemoryVerificationLog } from "@/lib/opportunity/verification/log";
import { deriveCorpus } from "@/lib/opportunity/corpus";
import { resolveCards } from "@/lib/opportunity/surface/service";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * PHASE 21B — ZERO OBSERVATIONS IS "I HAVE NOT LOOKED", NEVER "THERE IS NOTHING"
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The production database holds zero rows in `opportunity_observations`. The
 * question this file settles by execution, rather than by reading the source,
 * is which of the three absences that produces.
 *
 * It is the single most consequential mapping in the product. "I looked and
 * found nothing" is a claim about the world and a reason for somebody to stop
 * looking. "I have not looked yet" is a statement about the system. A product
 * that says the first when the second is true has told a person there are no
 * scholarships for them, on the strength of a crawler that never ran.
 *
 * CR-20 makes returning nothing a first-class output. It does not license
 * returning nothing *as a finding* without having searched.
 */

test("an empty corpus reports no watermark rather than an old one", async () => {
  const corpus = await deriveCorpus(new InMemoryObservationStore(), new InMemoryVerificationLog(), {
    decidedAt: "2026-08-21T00:00:00.000Z",
  });

  assert.equal(
    corpus.searchedAt,
    null,
    "an unsearched corpus invented a search time; every downstream absence claim is dated from this",
  );
  assert.deepEqual(corpus.entities, [], "entities appeared from an empty observation record");
});

test("with no record configured, the surface says so and claims nothing about the world", async () => {
  /*
    Executed, not grepped. `opportunityRecord()` requires SUPABASE_URL *and*
    SUPABASE_SERVICE_ROLE_KEY, so this is a real deployment state and not a
    hypothetical: a server that has the publishable key (enough for the auth
    middleware to pass) but no service-role key reaches `resolveCards` and finds
    no record at all.

    What matters is that this reports a limit on the system. The wrong answer
    here is `absent`, which would tell somebody there are no opportunities
    because a credential was missing from a deployment.
  */
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const result = await resolveCards("person-1", null);

    assert.equal(
      result.state,
      "unknown",
      "an unconfigured record reported something other than unknown",
    );
    assert.notEqual(result.state, "absent");
    if (result.state === "unknown") {
      assert.match(result.gap, /no record of anything I have observed/);
      /* It must not read as a statement about what exists. */
      assert.doesNotMatch(
        result.gap,
        /no opportunities (are|exist)|nothing (is )?available|none found/i,
      );
    }
  } finally {
    if (url === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = url;
    if (key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = key;
  }
});

test("the never-looked guard precedes the absent branch", () => {
  /*
    The one rule that cannot be reached by executing `resolveCards` from here,
    because it builds its own Supabase store from configuration and this sandbox
    has no egress to reach one. So it is pinned in the source, and the pin is
    narrow: the ordering of two returns.

    Remove the `searchedAt === null` guard and an empty record falls through to
    `cards.length === 0` and is reported as `absent` — a database that has never
    been written to, announcing that the world contains no opportunities. It
    would look like a tidy simplification to anyone who had not read this.
  */
  const source = readFileSync("src/lib/opportunity/surface/service.ts", "utf8");
  const guard = source.indexOf("corpus.searchedAt === null");
  const absent = source.indexOf('return { state: "absent", searchedAt: corpus.searchedAt }');

  assert.notEqual(guard, -1, "the never-looked guard is gone; an empty record now reports absent");
  assert.notEqual(absent, -1, "the absent branch is gone");
  assert.ok(guard < absent, "the never-looked guard no longer precedes the absent branch");

  const branch = source.slice(guard, guard + 400);
  assert.match(branch, /state: "unknown"/, "the never-looked branch stopped reporting unknown");
  assert.doesNotMatch(branch, /state: "absent"/, "the never-looked branch now reports absent");
});

test("an unreadable observation table cannot be mistaken for an unsearched one", async () => {
  /*
    The other half, and the one that is easy to get wrong. `lastRetrievalAt`
    returns null for "no rows". If it also returned null when the read failed,
    a database outage would render as "I have not looked yet" — a calm,
    plausible sentence that happens to be a lie about the system's own state.

    The Supabase implementation throws on error and returns null only for a
    genuinely empty table. Proved here against a store whose read fails.
  */
  const broken = new InMemoryObservationStore();
  broken.lastRetrievalAt = async () => {
    throw new Error("Could not read the retrieval watermark: connection reset");
  };

  await assert.rejects(
    () =>
      deriveCorpus(broken, new InMemoryVerificationLog(), {
        decidedAt: "2026-08-21T00:00:00.000Z",
      }),
    /retrieval watermark/,
    "a failed watermark read was swallowed; the surface would call it 'not looked yet'",
  );
});
