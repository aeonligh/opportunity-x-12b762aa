import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * THE PIPELINE HAS NEVER RUN
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Every opportunity this product has ever rendered came from `demoCorpus`,
 * which calls `witness()` directly with a hand-built exchange object. That
 * exercises extraction, entity resolution, verification and projection — and
 * nothing below them.
 *
 * **`retrieve()`, `readRobots()`, the link walk, the page budget and the
 * politeness delay have never executed against an HTTP server.** Not once, in
 * fifteen phases. The one command the external checkpoint asks a person to run
 * — `npm run sweep -- ng-fme` — goes straight through all of them, on a laptop,
 * with one hour of somebody's attention riding on it.
 *
 * So this stands up a real server on a real socket and runs the real discovery
 * mechanism against it. The only substitution is a transport that rewrites the
 * hostname, because `institutionalChannels` builds `https://<domain>` and a
 * self-signed certificate would be a second thing under test. Everything above
 * the socket is production code taking production paths.
 *
 * ── What this is not ──────────────────────────────────────────────────────
 *
 * Not a claim that any opportunity exists. Nothing here is written to any
 * durable store, the store is in-memory and dies with the process, and every
 * page served is obviously synthetic. It proves the machinery survives contact
 * with HTTP — not that the machinery has found anything.
 *
 * ── The pages ─────────────────────────────────────────────────────────────
 *
 * Shaped after the content the real corpus will actually hit, which the fixture
 * corpus never had to handle: pages with no JSON-LD at all, a title longer than
 * any card was designed for, a missing deadline, a duplicate at a second URL, a
 * server that returns 500, and a path `robots.txt` forbids.
 */

const HTML = (body: string, head = "") =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8">${head}</head><body>${body}</body></html>`;

const jsonLd = (node: Record<string, unknown>) =>
  `<script type="application/ld+json">${JSON.stringify(node)}</script>`;

/** Served at `/`. The link walk has to find the rest from here. */
const INDEX = HTML(
  `<h1>Announcements</h1>
   <ul>
     <li><a href="/scholarship">Scholarship</a></li>
     <li><a href="/bare">Bursary, no structured data</a></li>
     <li><a href="/long-title">A very long title</a></li>
     <li><a href="/no-deadline">Workshop</a></li>
     <li><a href="/mirror">Mirror of the scholarship</a></li>
     <li><a href="/moved">Redirects elsewhere</a></li>
     <li><a href="/broken">Server error</a></li>
     <li><a href="/forbidden">Disallowed by robots</a></li>
     <li><a href="https://elsewhere.example/off-site">Off site</a></li>
   </ul>`,
  "<title>Announcements</title>",
);

const PAGES: Record<
  string,
  { status: number; body: string | null; type?: string; location?: string }
> = {
  "/": { status: 200, body: INDEX },

  "/robots.txt": {
    status: 200,
    type: "text/plain; charset=utf-8",
    body: "User-agent: *\nDisallow: /forbidden\n",
  },

  /* The happy path: declared identity, every field present. */
  "/scholarship": {
    status: 200,
    body: HTML(
      `<h1>National Merit Scholarship</h1>` +
        jsonLd({
          "@type": "Course",
          name: "National Merit Scholarship",
          identifier: "HTTP-FIXTURE-NMS",
          provider: { "@type": "Organization", name: "Fixture Ministry of Education" },
          endDate: "2027-03-31",
          offers: "Full tuition and a monthly stipend",
        }),
      "<title>National Merit Scholarship</title>",
    ),
  },

  /*
    No structured data whatsoever. The overwhelmingly common real case, and one
    the fixture corpus never produced: every specimen there carries JSON-LD
    because it was written to.
  */
  "/bare": {
    status: 200,
    body: HTML(
      `<h1>Rural Students Bursary</h1>
       <p>Applications close on 15 December 2026.</p>
       <p>Open to students enrolled at any federal institution.</p>`,
      "<title>Rural Students Bursary — Fixture Ministry</title>",
    ),
  },

  /* Longer than any card was designed around, with non-ASCII in it. */
  "/long-title": {
    status: 200,
    body: HTML(
      `<h1>Programme</h1>` +
        jsonLd({
          "@type": "Course",
          name:
            "The Federal Government of Nigeria Presidential Special Scholarship Scheme for " +
            "Innovation and Development (PRESSID) — Cohort XII — Fully Funded Postgraduate " +
            "Awards in Science, Technology, Engineering, Mathematics and Médecine · 2027 intake",
          identifier: "HTTP-FIXTURE-LONG",
          provider: {
            "@type": "Organization",
            name: "Federal Ministry of Education, Department of Tertiary Education Services",
          },
          endDate: "2027-01-09",
        }),
      "<title>PRESSID</title>",
    ),
  },

  /* A real opportunity with no closing date stated anywhere. */
  "/no-deadline": {
    status: 200,
    body: HTML(
      `<h1>Research Methods Workshop</h1>` +
        jsonLd({
          "@type": "EducationEvent",
          name: "Research Methods Workshop",
          identifier: "HTTP-FIXTURE-WORKSHOP",
          provider: { "@type": "Organization", name: "Fixture Ministry of Education" },
        }),
      "<title>Research Methods Workshop</title>",
    ),
  },

  /* The same opportunity at a second address — R-01's observed reality. */
  "/mirror": {
    status: 200,
    body: HTML(
      `<h1>National Merit Scholarship</h1>` +
        jsonLd({
          "@type": "Course",
          name: "National Merit Scholarship",
          identifier: "HTTP-FIXTURE-NMS",
          provider: { "@type": "Organization", name: "Fixture Ministry of Education" },
          endDate: "2027-03-31",
        }),
      "<title>National Merit Scholarship</title>",
    ),
  },

  /* Redirects to the revised filename — R-01's observed reality, where one
     advert appeared as `-FINAL` and `-corrected` with nothing linking them. */
  "/moved": { status: 302, body: null, location: "/scholarship" },

  "/broken": { status: 500, body: null },
  "/forbidden": { status: 200, body: HTML("<h1>Should never be retrieved</h1>") },
};

let server: Server;
let origin = "";

before(async () => {
  server = createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0];
    const page = PAGES[path];
    if (!page) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    res.writeHead(page.status, {
      "content-type": page.type ?? "text/html; charset=utf-8",
      ...(page.location ? { location: page.location } : {}),
    });
    res.end(page.body ?? "");
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
});

/**
 * Rewrites the host and calls real `fetch`.
 *
 * The single substitution in this file, and it is below everything under test:
 * `retrieve()` still applies its own timeout, redirect policy, size limit and
 * decoding, and `readRobots()` still fetches and parses `robots.txt` over the
 * same socket.
 */
function localTransport(url: string, init: RequestInit): Promise<Response> {
  const target = new URL(url);
  return fetch(`${origin}${target.pathname}${target.search}`, init);
}

const ANNOUNCER = {
  id: "fixture-http",
  label: "Fixture Ministry of Education",
  kind: "ministry" as const,
  domain: "fixture.test",
  country: "NG",
  monitorSubdomains: false,
  knownPaths: ["/"],
  defaultSourceClass: "official" as const,
};

async function sweep() {
  const { runDiscovery } = await import("@/lib/opportunity/discovery/run");
  const { institutionalChannels } =
    await import("@/lib/opportunity/discovery/mechanisms/institutional-channels");
  const { InMemoryObservationStore } = await import("@/lib/opportunity/observation/store");
  const { InMemoryVerificationLog } = await import("@/lib/opportunity/verification/log");

  const store = new InMemoryObservationStore();
  const verification = new InMemoryVerificationLog();

  const report = await runDiscovery({
    store,
    verification,
    transport: localTransport,
    mechanisms: [institutionalChannels({ announcers: [ANNOUNCER] })],
    /* No delay between pages: politeness is real behaviour and a real 30s test. */
    politenessMs: 0,
  });

  return { report, store, verification };
}

/* ══════════════════════════════════════════════════════════════════════════
   The sweep survives contact with HTTP
   ══════════════════════════════════════════════════════════════════════════ */

test("a real sweep over a real socket retrieves and records", async () => {
  const { store } = await sweep();
  const all = await store.readAll();

  assert.ok(all.length > 0, "the sweep recorded no observations at all");

  /*
    Every observation names the page the bytes actually came from.

    That is `response.url` — the address after redirects — which `retrieve()`
    records deliberately: "recording the requested URL instead would produce an
    observation attributing content to a page that did not serve it."

    So under this rewriting transport the recorded host is the local server's,
    and that is *correct* rather than a defect: those bytes genuinely came from
    there. The first version of this assertion expected `https://fixture.test/`
    and was wrong about the product, not the other way round. What matters is
    that the path is one this server actually served, and that a real timestamp
    accompanies it.
  */
  for (const observation of all) {
    const path = new URL(observation.url).pathname;
    assert.ok(path in PAGES, `observation from a path the server never served: ${observation.url}`);
    assert.ok(observation.retrievedAt, "an observation carries no retrieval time");
    assert.equal(
      Number.isNaN(Date.parse(observation.retrievedAt)),
      false,
      "retrievedAt is not a real timestamp",
    );
  }
});

test("a redirect is recorded at its destination, and the request is not kept", async () => {
  /*
    Documents real behaviour rather than asserting a preference. `/moved` 302s to
    `/scholarship`, and the observation is filed under `/scholarship` — honest,
    because that is what served the bytes.

    **The gap this exposes:** the requested URL is discarded. R-01 observed one
    advert published at three addresses with `-FINAL` and `-corrected` revisions
    and "nothing linking them to what they supersede", and a recorded
    request→destination edge is exactly the evidence R-11's entity resolution
    would want. Recorded in `docs/PHASE_16_FIRST_CONTACT.md` §C; not fixed here,
    because inventing a schema field ahead of the first real redirect is the kind
    of speculative work this phase is meant to avoid.
  */
  const { store } = await sweep();
  const urls = (await store.readAll()).map((o) => new URL(o.url).pathname);

  assert.equal(urls.includes("/moved"), false, "the redirect source was recorded as a page");
  assert.ok(urls.includes("/scholarship"), "the redirect destination was not retrieved");
});

test("robots.txt is obeyed against a live server", async () => {
  /*
    Never exercised before. `parseRobots` had unit coverage; the fetch of
    `/robots.txt`, the cache, and the decision not to visit a disallowed path had
    none — and a sweep that ignores robots is the kind of thing that gets a
    project's user agent banned from a ministry's website permanently.
  */
  const { store } = await sweep();
  const urls = (await store.readAll()).map((o) => o.url);

  assert.equal(
    urls.some((u) => u.endsWith("/forbidden")),
    false,
    "a path disallowed by robots.txt was retrieved",
  );
  assert.ok(
    urls.some((u) => u.endsWith("/scholarship")),
    "the allowed pages were not reached",
  );
});

test("the link walk stays on the announcer's domain", async () => {
  const { store } = await sweep();
  const urls = (await store.readAll()).map((o) => o.url);
  assert.equal(
    urls.some((u) => u.includes("elsewhere.example")),
    false,
    "the walk followed an off-site link",
  );
});

test("a 500 is recorded as unreachable, not skipped", async () => {
  /*
    O7: a fetch failure against a known entity is itself an observation. A sweep
    that silently drops failures reports coverage it does not have.
  */
  const { store } = await sweep();
  const broken = (await store.readAll()).find((o) => o.url.endsWith("/broken"));

  assert.ok(broken, "the failing page produced no observation at all");
  assert.equal(broken.outcome, "unreachable");
});

/* ══════════════════════════════════════════════════════════════════════════
   What the real content shapes do to extraction
   ══════════════════════════════════════════════════════════════════════════ */

test("a page with no structured data yields an observation, not an invention", async () => {
  /*
    The commonest real shape, and one the fixture corpus never produced — every
    specimen there carries JSON-LD because it was written to. The rule under test
    is the engine's own: unknown is preferable to invented.
  */
  const { store } = await sweep();
  const bare = (await store.readAll()).find((o) => o.url.endsWith("/bare"));

  assert.ok(bare, "no observation for the unstructured page");
  assert.equal(bare.outcome, "retrieved");

  if (bare.outcome === "retrieved") {
    const claimed = bare.unreadable ? [] : Object.keys(bare.statements ?? {});
    /* Whatever it did or did not read, it must not have invented a deadline. */
    const deadline = (bare.statements as Record<string, unknown> | undefined)?.deadline;
    if (deadline !== undefined) {
      assert.ok(
        JSON.stringify(deadline).includes("2026"),
        `a deadline was produced that the page does not support: ${JSON.stringify(deadline)}`,
      );
    }
    void claimed;
  }
});

test("the same opportunity at two urls produces two observations and one entity", async () => {
  /*
    CR-36: duplicate observations are not discarded — the fact that two
    representations existed is itself evidence. CR-35: they describe one
    opportunity, not two.
  */
  const { store } = await sweep();
  const { groupObservations } = await import("@/lib/opportunity/entity/group");

  const all = await store.readAll();
  const { groups } = groupObservations(all);

  /* Both addresses are retained — the fact that two representations existed is
     itself evidence (CR-36), and they resolve to one entity (CR-35). */
  assert.ok(
    all.some((o) => o.url.endsWith("/mirror")),
    "the mirror was not retained",
  );
  assert.ok(
    all.some((o) => o.url.endsWith("/scholarship")),
    "the original was not retained",
  );

  const merged = groups.filter((g) => g.members.length > 1);
  assert.ok(
    merged.length >= 1,
    "two urls carrying one declared identifier did not resolve to a single entity",
  );

  /*
    ── The finding this test exists to pin ──────────────────────────────────

    `/scholarship` is observed **twice in one sweep**: once directly, and once
    because `/moved` redirects onto it. The crawler's `visited` set is keyed on
    the *requested* URL, so the two look like different pages; the fetcher then
    records both under the same final URL, because that is where the bytes came
    from.

    Both halves are individually defensible and together they lose information.
    The record ends up holding two observations with the same URL, the same
    content and the same sweep, and **no way to tell why there are two** — the
    requested URL that would have explained it was discarded.

    That matters beyond tidiness. Corroboration is counted from observations,
    and this product's whole trust argument is that "read from N sources" can be
    checked. A page reached twice by two routes is one source, not two.

    Asserted as current behaviour rather than fixed, per the phase's own rule
    about not rewriting the engine ahead of real evidence. Both candidate fixes
    — dedupe `visited` on the final URL after retrieval, or record the requested
    URL alongside it — are recorded in `docs/PHASE_16_FIRST_CONTACT.md` §C.
  */
  const scholarship = all.filter((o) => o.url.endsWith("/scholarship"));
  assert.equal(
    scholarship.length,
    2,
    "the redirect duplicate has changed — re-read PHASE_16 §C before adjusting this",
  );
  assert.equal(
    new Set(scholarship.map((o) => o.url)).size,
    1,
    "the duplicates no longer share a url, which would mean the requested url is now kept",
  );
});

test("a missing deadline stays missing", async () => {
  const { store } = await sweep();
  const { groupObservations } = await import("@/lib/opportunity/entity/group");
  const { resolveEntity } = await import("@/lib/opportunity/entity/resolve");
  const { deriveStakes } = await import("@/lib/opportunity/corpus");
  const { agreedValue } = await import("@/lib/opportunity/entity/types");

  const all = await store.readAll();
  const { groups } = groupObservations(all);

  const resolved = groups.flatMap((g) => {
    const r = resolveEntity({
      members: g.members,
      identity: g.identity,
      rationale: g.rationale,
      stakes: deriveStakes(),
      decidedAt: new Date().toISOString(),
    });
    return "entity" in r ? [r.entity] : [];
  });

  const workshop = resolved.find((e) => agreedValue(e, "title")?.includes("Research Methods"));
  if (workshop) {
    assert.equal(
      agreedValue(workshop, "deadline"),
      null,
      "a deadline was produced for a page that states none",
    );
  }
});
