import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { firecrawlTransport } from "@/lib/opportunity/discovery/transports/firecrawl";
import { retrieve } from "@/lib/opportunity/discovery/fetcher";
import { witness } from "@/lib/opportunity/observation/record";
import { classify } from "@/lib/opportunity/announcers/registry";
import { isRetrieved } from "@/lib/opportunity/observation/types";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * FIRECRAWL AS A TRANSPORT, AND THE LINE IT MUST NOT CROSS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A search index was refused as a transport because it would have produced
 * observations that lied about when a page was read, whether robots.txt was
 * honoured, and whose bytes were retained. Firecrawl is allowed because it
 * fetches on request rather than answering from its own crawl — but only while
 * it keeps behaving that way.
 *
 * These tests hold it to that. They exercise the transport against a stubbed
 * Firecrawl endpoint; none of them requires network, and none of them asserts
 * anything about the real service being reachable.
 */

const KEY = "test-key-not-a-secret";

/** A stand-in for Firecrawl's HTTP endpoint. */
function stubFirecrawl(handler: (body: Record<string, unknown>) => Response) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (_input: unknown, init?: RequestInit) =>
    handler(JSON.parse(String(init?.body ?? "{}")))) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

function ok(rawHtml: string, extra: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({ success: true, data: { rawHtml, metadata: { statusCode: 200, ...extra } } }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

const PAGE = `<!doctype html><html><head><title>BEA Scholarship</title>
<link rel="canonical" href="https://education.gov.ng/bea">
<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "EducationalOccupationalProgram",
  name: "BEA Scholarship",
  identifier: "FMOE-BEA-2026",
  applicationDeadline: "2026-09-30",
  provider: { "@type": "Organization", name: "Federal Ministry of Education" },
})}</script></head><body></body></html>`;

test("no key configured means no transport, never a silent direct fetch", () => {
  /*
    A caller that asked for Firecrawl and quietly got an ordinary fetch would be
    running a different experiment from the one it believes it is running — and
    on a JS-rendered page it would get an empty document and record it as a page
    that said nothing.
  */
  assert.equal(firecrawlTransport({ apiKey: "" }), null);
  assert.equal(typeof firecrawlTransport({ apiKey: KEY }), "function");
});

test("it asks for the source's own HTML, and refuses a cached copy", async () => {
  let sent: Record<string, unknown> = {};
  const restore = stubFirecrawl((body) => {
    sent = body;
    return ok(PAGE);
  });

  try {
    await retrieve("https://education.gov.ng/bea", {
      transport: firecrawlTransport({ apiKey: KEY })!,
    });
  } finally {
    restore();
  }

  /*
    `rawHtml`, not markdown. Every extractor here reads JSON-LD and canonical
    links out of the document; markdown strips both, and the engine would then
    report an opportunity whose publisher "declared no identifier" when the
    publisher had declared one all along.
  */
  assert.deepEqual(sent.formats, ["rawHtml"]);

  /* A retrieval time has to be a retrieval time. */
  assert.equal(sent.maxAge, 0);
});

test("a page fetched through Firecrawl still yields the publisher's declared identity", async () => {
  const restore = stubFirecrawl(() => ok(PAGE));

  let exchange;
  try {
    exchange = await retrieve("https://education.gov.ng/bea", {
      transport: firecrawlTransport({ apiKey: KEY })!,
    });
  } finally {
    restore();
  }

  const { sourceId, label, sourceClass } = classify("https://education.gov.ng/bea");
  const observation = witness(exchange, { source: { sourceId, label, sourceClass } });

  assert.ok(isRetrieved(observation));
  if (!isRetrieved(observation)) return;

  const [item] = observation.items;
  assert.ok(item, "the brokered document still produces an observed item");
  assert.deepEqual(
    item.identity.find((s) => s.kind === "declared-identifier"),
    { kind: "declared-identifier", value: "FMOE-BEA-2026" },
    "the publisher's own identifier survives the round trip",
  );
});

test("a Firecrawl failure is never recorded as the site refusing", async () => {
  /*
    A 402 from a billing limit is not a page that stopped answering. Recording
    it as one would decay a live opportunity's verification for want of credit,
    and the person would be told the source went away.
  */
  const restore = stubFirecrawl(() => new Response("no credit", { status: 402 }));

  let exchange;
  try {
    exchange = await retrieve("https://education.gov.ng/bea", {
      transport: firecrawlTransport({ apiKey: KEY })!,
    });
  } finally {
    restore();
  }

  assert.notEqual(exchange.status, 402, "the broker's status is not the site's status");
  assert.equal(exchange.status, 502);
});

test("a brokered retrieval says it was brokered", () => {
  /*
    The request leaves Firecrawl's user agent and addresses, not ours. That is a
    real difference from a direct retrieval, and it is recorded rather than
    hidden.
  */
  const source = readFileSync("src/lib/opportunity/discovery/transports/firecrawl.ts", "utf8");
  assert.match(source, /"x-opportunityx-via": "firecrawl"/);
});

test("robots is still decided by this engine, not by the broker", () => {
  /*
    The constitutional line. Routing a request differently must not move the
    decision about whether to make it — that happens in `robots.ts`, before any
    transport is consulted, and unreadable still means disallowed.
  */
  const crawl = readFileSync("src/lib/opportunity/discovery/crawl.ts", "utf8");
  const transport = readFileSync("src/lib/opportunity/discovery/transports/firecrawl.ts", "utf8");

  assert.match(crawl, /robots/i, "the crawl consults robots before visiting");
  assert.doesNotMatch(
    transport.replace(/\/\*[\s\S]*?\*\//g, ""),
    /robots/i,
    "the transport must not make, skip, or relax a robots decision",
  );
});
