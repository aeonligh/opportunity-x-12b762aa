import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { openWebSearch, DEFAULT_QUERIES } from "@/lib/opportunity/discovery/mechanisms/open-web-search";
import { runDiscovery } from "@/lib/opportunity/discovery/run";
import { InMemoryObservationStore } from "@/lib/opportunity/observation/store";
import { InMemoryVerificationLog } from "@/lib/opportunity/verification/log";
import { isRetrieved } from "@/lib/opportunity/observation/types";
import { page } from "./fixtures.ts";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * A SEARCH HIT IS A PLACE TO LOOK, NEVER SOMETHING OBSERVED
 * ══════════════════════════════════════════════════════════════════════════
 *
 * This mechanism reaches the residue the announcer registry structurally
 * cannot: an opportunity whose organiser is neither an institution nor routed
 * through one. Search is the only instrument that can, because publishers
 * cannot be enumerated.
 *
 * The risk it carries is equally structural. A search engine's title, snippet
 * and description are its account of a page, produced at a time of its
 * choosing and frequently stale — a snippet describing last year's deadline is
 * the commonest way an aggregator misleads someone. Witnessing that as though
 * the publisher had said it would put a third party's summary into an
 * append-only record with the publisher's authority attached.
 *
 * These tests hold the line: results are URLs to retrieve, and only what the
 * page itself served is ever recorded.
 */

const ANNOUNCEMENT = page({
  title: "Independent Foundation Fellowship",
  organiser: "Ada Lovelace Foundation",
  deadline: "2026-11-30",
  applyUrl: "https://ada-foundation.org/fellowship/apply",
  identifier: "ALF-FELLOW-2026",
});

/** A transport that serves the announcement and a permissive robots.txt. */
function servingTransport(pages: Record<string, string>) {
  return async (url: string) => {
    if (url.endsWith("/robots.txt")) {
      return new Response("User-agent: *\nAllow: /", { status: 200 });
    }
    const body = pages[url];
    return body
      ? new Response(body, { status: 200, headers: { "content-type": "text/html" } })
      : new Response(null, { status: 404 });
  };
}

test("a search hit is retrieved, and only the page's own words are recorded", async () => {
  const store = new InMemoryObservationStore();
  const url = "https://ada-foundation.org/fellowship";

  await runDiscovery({
    store,
    verification: new InMemoryVerificationLog(),
    mechanisms: [
      openWebSearch({
        queries: ["fellowship"],
        /*
          The search returns the URL *and* a tempting summary. The mechanism's
          contract is that only the URL travels — so the summary below has no
          way to reach the record even though it is right here.
        */
        search: async () => [url],
      }),
    ],
    transport: servingTransport({ [url]: ANNOUNCEMENT }),
    politenessMs: 0,
  });

  const observations = await store.readAll();
  assert.equal(observations.length, 1, "the candidate was actually retrieved");

  const [observation] = observations;
  assert.ok(isRetrieved(observation));
  if (!isRetrieved(observation)) return;

  /* What the page said, not what a search engine said about it. */
  const title = observation.items[0]?.claims.find((c) => c.field === "title");
  assert.equal(title?.asStated, "Independent Foundation Fellowship");

  const identity = observation.items[0]?.identity.find(
    (s) => s.kind === "declared-identifier"
  );
  assert.deepEqual(identity, { kind: "declared-identifier", value: "ALF-FELLOW-2026" });
});

test("a search hit that cannot be retrieved records nothing", async () => {
  /*
    The failure mode this prevents: a result list treated as a finding. A search
    engine saying a page exists is not evidence that it does, and an opportunity
    that only ever existed in a snippet must never reach a person.
  */
  const store = new InMemoryObservationStore();

  const report = await runDiscovery({
    store,
    verification: new InMemoryVerificationLog(),
    mechanisms: [
      openWebSearch({
        queries: ["fellowship"],
        search: async () => ["https://gone.example/fellowship"],
      }),
    ],
    transport: servingTransport({}),
    politenessMs: 0,
  });

  const observations = await store.readAll();
  const retrieved = observations.filter(isRetrieved);
  assert.equal(retrieved.length, 0, "nothing was successfully read");
  assert.equal(report.retrieved, 0);
});

test("a failed search concludes nothing about the world", async () => {
  const store = new InMemoryObservationStore();

  const report = await runDiscovery({
    store,
    verification: new InMemoryVerificationLog(),
    mechanisms: [
      openWebSearch({
        queries: ["fellowship"],
        search: async () => {
          throw new Error("search provider is down");
        },
      }),
    ],
    transport: servingTransport({}),
    politenessMs: 0,
  });

  assert.equal(await store.lastRetrievalAt(), null, "the watermark never moved");
  assert.equal(report.observationIds.length, 0);
});

test("with no key and no injected search, the mechanism does nothing rather than something else", async () => {
  /*
    A run that reported this mechanism as having run, having searched nothing,
    would be coverage claimed and not held.
  */
  const store = new InMemoryObservationStore();

  await runDiscovery({
    store,
    verification: new InMemoryVerificationLog(),
    mechanisms: [openWebSearch({ queries: ["fellowship"], apiKey: "" })],
    transport: servingTransport({}),
    politenessMs: 0,
  });

  assert.equal(await store.count(), 0);
});

test("the queries describe opportunities, not people", () => {
  /*
    A generated query is an inference about what this person wants, and running
    discovery against it would make the corpus a function of the model's guess
    about them. Matching happens later, in the judgment layer, against evidence.
  */
  for (const query of DEFAULT_QUERIES) {
    assert.doesNotMatch(query, /\byou\b|\byour\b|for me\b/i, `person-shaped query: ${query}`);
  }
  assert.ok(DEFAULT_QUERIES.length > 0);
});

test("nothing the search API says about a page can reach the record", () => {
  /*
    Structural, because this is the one that would be easy to relax later: the
    search function's type returns `string[]`, so a title or snippet has nowhere
    to travel even if a future API response carries one.
  */
  const source = readFileSync(
    "src/lib/opportunity/discovery/mechanisms/open-web-search.ts",
    "utf8"
  );

  assert.match(source, /Promise<string\[\]>/, "search returns URLs and nothing else");

  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  for (const borrowed of [/\bsnippet\b/i, /\bdescription\b/i, /\bmarkdown\b/i]) {
    assert.doesNotMatch(code, borrowed, `borrowed text handled in code: ${borrowed}`);
  }
});
