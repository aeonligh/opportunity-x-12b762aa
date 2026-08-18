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
     <li><a href="/also-moved">Redirects to the same place</a></li>
     <li><a href="/loop-a">Redirect loop</a></li>
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

  /* A second, different route onto /scholarship — CASE 4. */
  "/also-moved": { status: 302, body: null, location: "/scholarship" },

  /* A redirect that never resolves — CASE 6. */
  "/loop-a": { status: 302, body: null, location: "/loop-b" },
  "/loop-b": { status: 302, body: null, location: "/loop-a" },

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

async function localTransport(url: string, init: RequestInit): Promise<Response> {
  const target = new URL(url);
  const response = await fetch(`${origin}${target.pathname}${target.search}`, init);

  /*
    Map the final URL back into the announcer's namespace.

    Without this the harness lies in a way that matters: `response.url` would be
    the localhost address, so `finalUrl !== requestedUrl` for *every* page and
    each one would look like a redirect. `requestedUrl` is meant to be present
    only when something actually redirected, and a harness that populates it
    everywhere cannot test that.

    `Response.url` is read-only, so it is redefined on the instance. Confined to
    this file, and it restores rather than fakes: the path is genuinely what the
    server served, and only the host is being put back.
  */
  const fixtureUrl = `https://${ANNOUNCER.domain}${new URL(response.url).pathname}`;
  Object.defineProperty(response, "url", { value: fixtureUrl, configurable: true });
  return response;
}

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

test("a redirect records both the destination and the route taken", async () => {
  /*
    Both halves, which is the Phase 16A change. `/moved` 302s to `/scholarship`:
    the bytes came from `/scholarship` and the observation says so, and the fact
    that discovery arrived by asking for `/moved` is kept beside it rather than
    discarded — R-01's `-FINAL` and `-corrected` revisions with "nothing linking
    them to what they supersede", previously reproduced by the pipeline itself.
  */
  const { store } = await sweep();
  const all = await store.readAll();
  const paths = all.map((o) => new URL(o.url).pathname);

  assert.equal(paths.includes("/moved"), false, "the redirect source was filed as a page");
  assert.ok(paths.includes("/scholarship"), "the redirect destination was not retrieved");

  const viaMoved = all.find((o) => o.requestedUrl?.endsWith("/moved"));
  assert.ok(viaMoved, "the route that reached the page was discarded");
  assert.ok(viaMoved.url.endsWith("/scholarship"), "the route was attached to the wrong page");
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
  /* CR-36: duplicates are evidence. CR-35: they describe one opportunity. */
  const { store } = await sweep();
  const { groupObservations } = await import("@/lib/opportunity/entity/group");

  const all = await store.readAll();
  assert.ok(
    all.some((o) => o.url.endsWith("/mirror")),
    "the mirror was not retained",
  );
  assert.ok(
    all.some((o) => o.url.endsWith("/scholarship")),
    "the original was not retained",
  );

  const { groups } = groupObservations(all);
  assert.ok(
    groups.some((g) => g.members.length > 1),
    "two urls carrying one declared identifier did not resolve to a single entity",
  );

  /*
    `/scholarship` is still observed three times in one sweep — directly, via
    `/moved` and via `/also-moved`. Deliberate and unchanged: each was a real
    request that really returned bytes, and CR-37 keeps every one.

    What changed is that the record explains itself. Each redirected arrival
    carries the route that produced it, so the projection can show one page
    reached three ways rather than three pages.
  */
  const scholarship = all.filter((o) => new URL(o.url).pathname === "/scholarship");
  assert.equal(scholarship.length, 3);
  assert.equal(
    scholarship.filter((o) => o.requestedUrl !== undefined).length,
    2,
    "the two redirected arrivals did not record their routes",
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

/* ══════════════════════════════════════════════════════════════════════════
   What a redirect duplicate actually does to the numbers a person is shown
   ══════════════════════════════════════════════════════════════════════════ */

test("a redirect duplicate does not inflate corroboration", async () => {
  /*
    ── Correcting Phase 16's own report ─────────────────────────────────────

    `docs/PHASE_16_FIRST_CONTACT.md` §C.2 claimed the redirect duplicate
    "inflates exactly the number the inspection surface asks people to trust."
    That was wrong, and it was wrong because the claim was reasoned from the
    observation count rather than measured.

    `establishVerification` counts `new Set(retrieved.map(o => o.source.sourceId))`
    — distinct **announcers**, resolved by `classify()` from the domain. Two paths
    on one domain are one source; a page reached twice through a redirect is one
    source. Corroboration was never exposed to this.

    That is also the right model: one publisher saying a thing twice is not
    independent corroboration, whether the second saying arrived by a mirror, a
    redirect or a second crawl.
  */
  const { store } = await sweep();
  const { groupObservations } = await import("@/lib/opportunity/entity/group");
  const { resolveEntity } = await import("@/lib/opportunity/entity/resolve");
  const { deriveStakes } = await import("@/lib/opportunity/corpus");
  const { establishVerification } = await import("@/lib/opportunity/verification/service");
  const { agreedValue } = await import("@/lib/opportunity/entity/types");

  const all = await store.readAll();
  const { groups } = groupObservations(all);

  const scholarship = groups
    .map((g) => {
      const r = resolveEntity({
        members: g.members,
        identity: g.identity,
        rationale: g.rationale,
        stakes: deriveStakes(),
        decidedAt: new Date().toISOString(),
      });
      return "entity" in r ? r.entity : null;
    })
    .find((e) => e && agreedValue(e, "title")?.includes("National Merit"));

  assert.ok(scholarship, "the scholarship entity did not resolve");

  const members = all.filter((o) => scholarship.resolution.observationIds.includes(o.id));
  /* Three observations: /scholarship twice (direct and via the redirect) and
     /mirror once. All on one domain. */
  assert.ok(members.length >= 3, `expected the duplicate to be present, got ${members.length}`);

  const verification = establishVerification(scholarship, members, new Date().toISOString());

  assert.equal(
    verification.basis.distinctSources,
    1,
    "three observations of one publisher were counted as more than one source",
  );
});

test("the inspection tally counts pages, not observations", async () => {
  /*
    The half of the earlier §C.2 finding that was real, now fixed.
    `projectInspection` built one row per observation and `evidence.consulted`
    from their length, so a page reached three ways read as three sources on the
    surface a person is asked to trust.

    Corroboration itself was never exposed to this — `establishVerification`
    counts distinct announcers — and the earlier report claimed otherwise because
    the claim had been reasoned rather than measured. The defect was real; its
    location was not where the report put it.
  */
  const { inspection, members } = await inspectScholarship();

  assert.equal(
    members.filter((o) => new URL(o.url).pathname === "/scholarship").length,
    3,
    "the harness no longer produces the duplicate",
  );
  assert.equal(
    inspection.sources.filter((r) => r.url.endsWith("/scholarship")).length,
    1,
    "one page is still being listed as several sources",
  );
  assert.equal(inspection.evidence.consulted, inspection.sources.length);
});

/* ══════════════════════════════════════════════════════════════════════════
   Phase 16D — the six redirect cases, over the socket
   ══════════════════════════════════════════════════════════════════════════ */

async function inspectScholarship() {
  const { store } = await sweep();
  const { groupObservations } = await import("@/lib/opportunity/entity/group");
  const { resolveEntity } = await import("@/lib/opportunity/entity/resolve");
  const { deriveStakes } = await import("@/lib/opportunity/corpus");
  const { projectInspection } = await import("@/lib/opportunity/surface/inspection");
  const { agreedValue } = await import("@/lib/opportunity/entity/types");

  const all = await store.readAll();
  const { groups } = groupObservations(all);

  for (const g of groups) {
    const r = resolveEntity({
      members: g.members,
      identity: g.identity,
      rationale: g.rationale,
      stakes: deriveStakes(),
      decidedAt: new Date().toISOString(),
    });
    if (!("entity" in r)) continue;
    if (!agreedValue(r.entity, "title")?.includes("National Merit")) continue;

    const members = all.filter((o) => r.entity.resolution.observationIds.includes(o.id));
    return {
      all,
      entity: r.entity,
      members,
      inspection: projectInspection({
        entity: r.entity,
        verification: null,
        judgments: null,
        pursuit: { state: "undeclared" },
        observations: members,
        now: new Date().toISOString(),
      }),
    };
  }
  throw new Error("the scholarship entity did not resolve");
}

test("CASE 1+4 — many routes to one page remain one source", async () => {
  /*
    `/scholarship` is reached three ways: directly, via `/moved`, and via
    `/also-moved`. The bytes came from one page and the record says so once,
    with the routes named rather than discarded.
  */
  const { inspection } = await inspectScholarship();
  const rows = inspection.sources.filter((r) => r.url.endsWith("/scholarship"));

  assert.equal(rows.length, 1, "one page was listed as several sources");
  assert.equal(rows[0].retrievals, 3, "the retrievals were collapsed instead of counted");
  assert.deepEqual(
    rows[0].reachedVia.map((u) => new URL(u).pathname).sort(),
    ["/also-moved", "/moved"],
    "the routes that reached this page were lost",
  );
});

test("CASE 2+5 — the tally counts pages, and distinct sources stay distinct", async () => {
  const { inspection } = await inspectScholarship();

  /* /scholarship and /mirror: two genuinely different pages. */
  assert.equal(inspection.evidence.consulted, inspection.sources.length);
  assert.equal(
    inspection.sources.length,
    2,
    `expected two pages, got ${inspection.sources.map((r) => r.url).join(", ")}`,
  );
  assert.ok(inspection.sources.some((r) => r.url.endsWith("/mirror")));
});

test("CASE 3 — a later retrieval is added, never overwritten", async () => {
  /*
    The half that must not collapse. Grouping by page is right for counting
    sources and wrong for history: two readings of one page at two times are two
    observations, and CR-37 keeps both.
  */
  const { store } = await sweep();
  const { witness } = await import("@/lib/opportunity/observation/record");
  const { projectInspection } = await import("@/lib/opportunity/surface/inspection");
  const { groupObservations } = await import("@/lib/opportunity/entity/group");
  const { resolveEntity } = await import("@/lib/opportunity/entity/resolve");
  const { deriveStakes } = await import("@/lib/opportunity/corpus");

  const all = await store.readAll();
  const original = all.find((o) => o.url.endsWith("/mirror"));
  assert.ok(original);

  /* The same page, read later, saying something different. */
  const later = witness(
    {
      url: original.url,
      completedAt: new Date(Date.parse(original.retrievedAt) + 86_400_000).toISOString(),
      status: 200,
      body:
        "<!doctype html><html><head><title>x</title>" +
        '<script type="application/ld+json">' +
        JSON.stringify({
          "@type": "Course",
          name: "National Merit Scholarship",
          identifier: "HTTP-FIXTURE-NMS",
          endDate: "2027-04-30",
        }) +
        "</script></head><body></body></html>",
      encoding: "utf-8",
      contentType: "text/html; charset=utf-8",
    },
    { source: original.source },
  );

  const withHistory = [...all, later];
  const { groups } = groupObservations(withHistory);
  const g = groups.find((x) => x.members.length > 1);
  assert.ok(g, "the later reading did not join the entity");

  const r = resolveEntity({
    members: g.members,
    identity: g.identity,
    rationale: g.rationale,
    stakes: deriveStakes(),
    decidedAt: new Date().toISOString(),
  });
  assert.ok("entity" in r);

  const members = withHistory.filter((o) => r.entity.resolution.observationIds.includes(o.id));
  const inspection = projectInspection({
    entity: r.entity,
    verification: null,
    judgments: null,
    pursuit: { state: "undeclared" },
    observations: members,
    now: new Date().toISOString(),
  });

  const mirror = inspection.sources.find((row) => row.url.endsWith("/mirror"));
  assert.ok(mirror);
  assert.equal(mirror.retrievals, 2, "a second reading of one page was collapsed away");
  /* And the row speaks for the page as it was last read. */
  assert.equal(mirror.retrievedAt, later.retrievedAt);
  /* Both observations are still in the record. */
  assert.equal(members.filter((o) => o.url.endsWith("/mirror")).length, 2);
});

test("CASE 6 — a redirect loop fabricates nothing", async () => {
  const { store } = await sweep();
  const all = await store.readAll();
  const loops = all.filter((o) => new URL(o.url).pathname.startsWith("/loop"));

  for (const o of loops) {
    assert.notEqual(o.outcome, "retrieved", `a redirect loop produced content: ${o.url}`);
  }
  /* Whatever was recorded, nothing claims an opportunity exists at a loop. */
  assert.equal(
    loops.some((o) => o.outcome === "retrieved"),
    false,
  );
});

test("a page reached directly carries no route", async () => {
  /*
    Presence is the signal. If `requestedUrl` were populated on every
    observation, a reader would have to compare two fields to learn that nothing
    happened.
  */
  const { store } = await sweep();
  const bare = (await store.readAll()).find((o) => o.url.endsWith("/bare"));
  assert.ok(bare);
  assert.equal(bare.requestedUrl, undefined);
});
