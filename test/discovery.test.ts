import { test } from "node:test";
import assert from "node:assert/strict";

import { InMemoryObservationStore } from "@/lib/opportunity/observation/store";
import { InMemoryVerificationLog } from "@/lib/opportunity/verification/log";
import { retrieve, USER_AGENT, type Transport } from "@/lib/opportunity/discovery/fetcher";
import { parseRobots, readRobots } from "@/lib/opportunity/discovery/robots";
import { runDiscovery } from "@/lib/opportunity/discovery/run";
import { institutionalChannels, sameDomainLinks } from "@/lib/opportunity/discovery/mechanisms/institutional-channels";
import type { Announcer } from "@/lib/opportunity/announcers/registry";
import { page } from "./fixtures.ts";

/* ── A transport that answers from a fixture map, with no network ────────── */

interface Answer {
  status?: number;
  body?: string | null;
  contentType?: string;
  throws?: string;
}

function fakeTransport(answers: Record<string, Answer>): {
  transport: Transport;
  requested: string[];
  headers: Record<string, string>[];
} {
  const requested: string[] = [];
  const headers: Record<string, string>[] = [];

  const transport: Transport = async (url, init) => {
    requested.push(url);
    headers.push((init.headers ?? {}) as Record<string, string>);

    const answer = answers[url];
    if (!answer) return new Response(null, { status: 404 });
    if (answer.throws) throw new Error(answer.throws);

    return new Response(answer.body ?? null, {
      status: answer.status ?? 200,
      headers: { "content-type": answer.contentType ?? "text/html; charset=utf-8" },
    });
  };

  return { transport, requested, headers };
}

const noWait = async () => {};

/* ── The fetcher ─────────────────────────────────────────────────────────── */

test("a successful retrieval carries its body and a completion time", async () => {
  const { transport } = fakeTransport({
    "https://example.test/x": { body: "<html>hi</html>" },
  });

  const before = new Date().toISOString();
  const exchange = await retrieve("https://example.test/x", { transport });
  const after = new Date().toISOString();

  assert.equal(exchange.status, 200);
  assert.equal(exchange.body, "<html>hi</html>");
  /* Stamped inside the transport, between these two reads of the clock. */
  assert.ok(exchange.completedAt >= before && exchange.completedAt <= after);
});

test("the crawler identifies itself", async () => {
  const { transport, headers } = fakeTransport({ "https://example.test/x": { body: "ok" } });
  await retrieve("https://example.test/x", { transport });
  assert.equal(headers[0]["user-agent"], USER_AGENT);
  assert.match(USER_AGENT, /\+https:\/\//, "must give operators a way to reach a human");
});

test("a 404 is a completed exchange, not a thrown error", async () => {
  const { transport } = fakeTransport({});
  const exchange = await retrieve("https://example.test/gone", { transport });
  assert.equal(exchange.status, 404);
  assert.equal(exchange.body, null);
});

test("a transport failure is a completed exchange with its reason", async () => {
  const { transport } = fakeTransport({
    "https://example.test/x": { throws: "ENOTFOUND" },
  });
  const exchange = await retrieve("https://example.test/x", { transport });
  assert.equal(exchange.status, null);
  assert.match(exchange.failure ?? "", /ENOTFOUND/);
});

test("a body over the retention limit is refused, never truncated", async () => {
  const { transport } = fakeTransport({
    "https://example.test/big": { body: "x".repeat(5000) },
  });

  const exchange = await retrieve("https://example.test/big", {
    transport,
    limits: { timeoutMs: 1000, maxBytes: 1000, maxRedirects: 5 },
  });

  /* Truncated content would be stored as though it were the whole page, and
     every claim missing from the cut-off section would be attributed to the
     source rather than to the truncation. */
  assert.equal(exchange.body, null);
  assert.match(exchange.failure ?? "", /retention limit/);
});

/* ── robots.txt ──────────────────────────────────────────────────────────── */

test("an absent robots.txt is no restriction", async () => {
  const { transport } = fakeTransport({});
  const policy = await readRobots("https://example.test", { transport });
  assert.equal(policy.known, true);
  assert.equal(policy.allows("/anything"), true);
});

test("an unreadable robots.txt disallows everything", async () => {
  const { transport } = fakeTransport({
    "https://example.test/robots.txt": { status: 500, body: null },
  });
  const policy = await readRobots("https://example.test", { transport });

  /* Preferences unknown means do not crawl. Proceeding would be acting on an
     assumption inside the site owner's own domain. */
  assert.equal(policy.known, false);
  assert.equal(policy.allows("/anything"), false);
});

test("Disallow is honoured, and Allow overrides it at greater specificity", () => {
  const policy = parseRobots(
    ["User-agent: *", "Disallow: /private", "Allow: /private/public-notice"].join("\n")
  );
  assert.equal(policy.allows("/news"), true);
  assert.equal(policy.allows("/private/thing"), false);
  assert.equal(policy.allows("/private/public-notice"), true);
});

test("a group naming AeonXBot takes precedence over the wildcard", () => {
  const policy = parseRobots(
    [
      "User-agent: *",
      "Disallow: /",
      "",
      "User-agent: AeonXBot",
      "Disallow: /admin",
      "Crawl-delay: 3",
    ].join("\n")
  );
  assert.equal(policy.allows("/news"), true);
  assert.equal(policy.allows("/admin/secret"), false);
  assert.equal(policy.crawlDelaySeconds, 3);
});

test("an empty Disallow is a permission, not a prohibition", () => {
  const policy = parseRobots(["User-agent: *", "Disallow:"].join("\n"));
  assert.equal(policy.allows("/anything"), true);
});

test("wildcards and end-anchors are matched", () => {
  const policy = parseRobots(
    ["User-agent: *", "Disallow: /*.pdf$", "Disallow: /tmp/*/cache"].join("\n")
  );
  assert.equal(policy.allows("/files/report.pdf"), false);
  assert.equal(policy.allows("/files/report.pdf?v=2"), true);
  assert.equal(policy.allows("/tmp/a/cache"), false);
  assert.equal(policy.allows("/tmp/a/keep"), true);
});

/* ── Link discovery ──────────────────────────────────────────────────────── */

test("links to subdomains of the announcer are followed; other domains are not", () => {
  const body = `
    <a href="/news/scholarship">relative</a>
    <a href="https://programme.unn.edu.ng/apply">subdomain</a>
    <a href="https://www.unn.edu.ng/other">www</a>
    <a href="https://elsewhere.test/x">different domain</a>
    <a href="mailto:someone@unn.edu.ng">mailto</a>
  `;

  const links = sameDomainLinks(body, "https://www.unn.edu.ng/", "unn.edu.ng");

  assert.ok(links.includes("https://www.unn.edu.ng/news/scholarship"));
  /* The finding that matters: new programmes appear at programme.institution.tld,
     and a filter on exact host would have excluded this one. */
  assert.ok(links.includes("https://programme.unn.edu.ng/apply"));
  assert.ok(links.includes("https://www.unn.edu.ng/other"));
  assert.equal(links.some((l) => l.includes("elsewhere.test")), false);
  assert.equal(links.some((l) => l.startsWith("mailto:")), false);
});

test("fragments are stripped so one page is not two observations", () => {
  const body = `<a href="/news#apply">x</a><a href="/news">y</a>`;
  const links = sameDomainLinks(body, "https://unn.edu.ng/", "unn.edu.ng");
  assert.deepEqual(links, ["https://unn.edu.ng/news"]);
});

/* ── The sweep ───────────────────────────────────────────────────────────── */

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

function runFixture(answers: Record<string, Answer>) {
  const store = new InMemoryObservationStore();
  const verification = new InMemoryVerificationLog();
  const { transport, requested } = fakeTransport(answers);
  return { store, verification, transport, requested };
}

test("a discovery run records every request as an observation, successes and failures alike", async () => {
  const { store, verification, transport } = runFixture({
    "https://unn.edu.ng/robots.txt": { body: "User-agent: *\nDisallow: /private\n" },
    "https://unn.edu.ng/": { body: `<a href="/scholarship">s</a><a href="/dead">d</a>` },
    "https://unn.edu.ng/scholarship": { body: PROGRAMME },
    /* /dead is absent from the fixture, so it answers 404. */
  });

  const report = await runDiscovery({
    store,
    verification,
    mechanisms: [institutionalChannels({ announcers: [TEST_ANNOUNCER] })],
    transport,
    politenessMs: 0,
    wait: noWait,
  });

  assert.equal(report.requested, 3);
  assert.equal(report.retrieved, 2);
  assert.equal(report.unreachable, 1);
  assert.equal(await store.count(), 3);

  /* A 404 on a page AEON X was watching is frequently the earliest signal that
     an opportunity closed. Discarding it would make "the page came down" and
     "nobody looked" indistinguishable. */
  const dead = await store.readByUrl("https://unn.edu.ng/dead");
  assert.equal(dead.length, 1);
  assert.equal(dead[0].outcome, "unreachable");
});

test("a discovery run never requests a path robots.txt disallows", async () => {
  const { store, verification, transport, requested } = runFixture({
    "https://unn.edu.ng/robots.txt": { body: "User-agent: *\nDisallow: /private\n" },
    "https://unn.edu.ng/": { body: `<a href="/private/x">no</a><a href="/open">yes</a>` },
    "https://unn.edu.ng/open": { body: PROGRAMME },
    "https://unn.edu.ng/private/x": { body: PROGRAMME },
  });

  const report = await runDiscovery({
    store,
    verification,
    mechanisms: [institutionalChannels({ announcers: [TEST_ANNOUNCER] })],
    transport,
    politenessMs: 0,
    wait: noWait,
  });

  assert.equal(requested.includes("https://unn.edu.ng/private/x"), false);
  assert.ok(report.skipped.some((s) => s.url === "https://unn.edu.ng/private/x"));
  /* And no observation was invented for the page it did not fetch. */
  assert.equal((await store.readByUrl("https://unn.edu.ng/private/x")).length, 0);
});

test("a discovery run does not crawl a host whose robots.txt it could not read", async () => {
  const { store, verification, transport } = runFixture({
    "https://unn.edu.ng/robots.txt": { status: 503, body: null },
    "https://unn.edu.ng/": { body: PROGRAMME },
  });

  const report = await runDiscovery({
    store,
    verification,
    mechanisms: [institutionalChannels({ announcers: [TEST_ANNOUNCER] })],
    transport,
    politenessMs: 0,
    wait: noWait,
  });

  assert.equal(report.requested, 0);
  assert.equal(await store.count(), 0);
  assert.match(report.skipped[0].reason, /could not be read/);
});

test("a discovery run goes one hop and no further", async () => {
  const { store, verification, transport, requested } = runFixture({
    "https://unn.edu.ng/robots.txt": { body: "" },
    "https://unn.edu.ng/": { body: `<a href="/one">1</a>` },
    "https://unn.edu.ng/one": { body: `<a href="/two">2</a>` },
    "https://unn.edu.ng/two": { body: PROGRAMME },
  });

  await runDiscovery({
    store,
    verification,
    mechanisms: [institutionalChannels({ announcers: [TEST_ANNOUNCER] })],
    transport,
    politenessMs: 0,
    wait: noWait,
  });

  assert.ok(requested.includes("https://unn.edu.ng/one"));
  assert.equal(requested.includes("https://unn.edu.ng/two"), false);
});

test("a discovery run does not re-fetch a URL observed recently", async () => {
  const answers = {
    "https://unn.edu.ng/robots.txt": { body: "" },
    "https://unn.edu.ng/": { body: PROGRAMME },
  };

  const { store, verification, transport } = runFixture(answers);
  const first = await runDiscovery({
    store,
    verification,
    mechanisms: [institutionalChannels({ announcers: [TEST_ANNOUNCER] })],
    transport,
    politenessMs: 0,
    wait: noWait,
  });
  assert.equal(first.requested, 1);

  const second = await runDiscovery({
    store,
    verification,
    mechanisms: [institutionalChannels({ announcers: [TEST_ANNOUNCER] })],
    transport: fakeTransport(answers).transport,
    politenessMs: 0,
    wait: noWait,
  });
  assert.equal(second.requested, 0);
  assert.match(second.skipped[0].reason, /within the last 24h/);
});

test("a discovery run establishes verification and records the transition", async () => {
  const { store, verification, transport } = runFixture({
    "https://unn.edu.ng/robots.txt": { body: "" },
    "https://unn.edu.ng/": { body: PROGRAMME },
  });

  const report = await runDiscovery({
    store,
    verification,
    mechanisms: [institutionalChannels({ announcers: [TEST_ANNOUNCER] })],
    transport,
    politenessMs: 0,
    wait: noWait,
  });

  assert.equal(report.transitions.length, 1);
  assert.equal(report.transitions[0].from, null);
  /* One source, and the derived stakes are the most demanding tier — so a
     single announcement is honestly not enough to call it verified. */
  assert.equal(report.transitions[0].to, "unverified");

  const stored = await verification.read(report.transitions[0].entityId);
  assert.ok(stored);
  assert.equal(stored.transitions.length, 1);
});

test("the source class is decided per URL, not inherited from the announcer", async () => {
  const { store, verification, transport } = runFixture({
    "https://unn.edu.ng/robots.txt": { body: "" },
    "https://unn.edu.ng/": { body: PROGRAMME },
  });

  await runDiscovery({
    store,
    verification,
    mechanisms: [institutionalChannels({ announcers: [TEST_ANNOUNCER] })],
    transport,
    politenessMs: 0,
    wait: noWait,
  });

  const [observation] = await store.readByUrl("https://unn.edu.ng/");
  /* The registry classifies unn.edu.ng as an announcer, and it is the registry
     that decides — not the loop that happened to be iterating over it. */
  assert.equal(observation.source.sourceClass, "announcer");
  assert.equal(observation.source.sourceId, "ng-unn");
});

test("a discovery run that fetched nothing leaves the retrieval watermark null", async () => {
  const { store, verification, transport } = runFixture({
    "https://unn.edu.ng/robots.txt": { status: 503, body: null },
  });

  await runDiscovery({
    store,
    verification,
    mechanisms: [institutionalChannels({ announcers: [TEST_ANNOUNCER] })],
    transport,
    politenessMs: 0,
    wait: noWait,
  });

  /* This is what keeps `absent` honest downstream: a sweep that could not run
     leaves exactly the same evidence as no sweep at all — none. */
  assert.equal(await store.lastRetrievalAt(), null);
});
