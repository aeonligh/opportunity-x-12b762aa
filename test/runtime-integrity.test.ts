import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * PHASE 18 — DOES THE TRUTH SURVIVE WHEN THE STATES INTERACT?
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Phase 17 proved each state says only what it knows. These hold the properties
 * that only exist *between* states: what happens when the browser hydrates,
 * when two async operations overlap, when a write and a re-read disagree.
 *
 * The rendered proof is `scripts/state-walk.mjs`. These hold the semantics, and
 * the invariants that a browser cannot see.
 */

function src(path: string): string {
  return readFileSync(path, "utf8");
}
function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════════════════
   A. Hydration integrity
   ══════════════════════════════════════════════════════════════════════════ */

test("the gate's redirect cannot land while React is hydrating", () => {
  /*
    Traced, not guessed. A protected route is `ssr: false`, so the server emits
    the gate's pending shell — it cannot see a session that lives in
    localStorage. If the client then changes the *route* while React is still
    hydrating, React finds `/auth`'s markup where the server wrote the gate's
    and regenerates the whole tree. Measured: DOMContentLoaded 85ms, redirect
    449ms, mismatch every time, on every protected route.

    The repair is to ask the server for the page it should have rendered rather
    than patch one it rendered on a guess. Measured cost: 873ms before (with the
    mismatch) against 880ms after — the extra round trip replaces React's own
    tree regeneration, which cost about the same.
  */
  const gate = withoutComments(src("src/routes/_authenticated/route.tsx"));

  assert.match(
    gate,
    /reloadDocument:\s*!isHydrated\(\)/,
    "the gate's redirect can land mid-hydration",
  );
  assert.equal(
    /reloadDocument:\s*(true|false)\b/.test(gate),
    false,
    "the document reload is unconditional — after hydration it must be an ordinary navigation",
  );
  /* And the destination is still carried. */
  assert.match(
    gate,
    /search:\s*\{\s*next:\s*location\.href\s*\}/,
    "the deep link is not carried through the gate",
  );
});

test("hydration is marked exactly once, from the root's mount", () => {
  const root = withoutComments(src("src/routes/__root.tsx"));
  assert.match(root, /useEffect\(markHydrated,\s*\[\]\)/, "nothing ever marks hydration complete");

  /*
    And nothing else reads it. A flag meaning "we are past hydration" invites
    `if (isHydrated())` branches throughout a codebase, and every one of them is
    a server/client divergence waiting to become the next mismatch.
  */
  const readers = walk("src")
    .filter((f) => /isHydrated\(/.test(withoutComments(src(f))))
    .filter((f) => f !== "src/lib/hydrated.ts");
  assert.deepEqual(
    readers,
    ["src/routes/_authenticated/route.tsx"],
    "the hydration flag has spread beyond the one decision it exists for",
  );
});

test("only one route opts out of SSR, and it is the gate", () => {
  /*
    The mismatch was a property of `ssr: false` combined with a route change.
    A second route opting out would reopen the same class without anyone
    noticing, so the set is pinned rather than assumed.
  */
  const optedOut = walk("src/routes")
    .filter((f) => !f.endsWith("routeTree.gen.ts"))
    .filter((f) => /^\s*ssr:\s*(false|"data-only")/m.test(withoutComments(src(f))));
  assert.deepEqual(optedOut, ["src/routes/_authenticated/route.tsx"]);
});

test("no route changes the route from anywhere but an effect or a handler", () => {
  /*
    The safe kinds of navigation are the ones React has already committed for:
    an effect, or something a person pressed. A navigation issued during render
    — or from `beforeLoad`, which runs before anything renders — is the one that
    can collide with hydration. `/auth` has three, all in effects or handlers.
  */
  const offenders: string[] = [];
  for (const file of walk("src/routes").filter((f) => !f.endsWith("routeTree.gen.ts"))) {
    const code = withoutComments(src(file));
    for (const m of code.matchAll(/\bthrow redirect\(/g)) {
      /* The gate's is the only one, and it is guarded above. */
      if (file !== "src/routes/_authenticated/route.tsx") {
        offenders.push(`${file}: throw redirect at ${m.index}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `an unguarded route change: ${offenders.join(", ")}`);
});

/* ══════════════════════════════════════════════════════════════════════════
   B. Every async boundary participates in the state system
   ══════════════════════════════════════════════════════════════════════════ */

test("every server function is either auth-gated or development-only", () => {
  /*
    The audit that produced this found `getGreeting` — scaffold from the
    original template, `POST`, no middleware, no guard, echoing its input plus
    `config.nodeEnv`. It had no importers and was tree-shaken out of the build,
    so it was never a live endpoint; it was a live *possibility*, one import
    away, and nothing would have said so.

    Sixteen server functions exist. Six product reads and writes go through
    `requireSupabaseAuth`; ten laboratory probes are refused off a development
    build by `assertDevelopment`. There is no third category, and this fails if
    one appears.
  */
  const sources = walk("src").filter((f) => /createServerFn\(/.test(src(f)));
  const unprotected: string[] = [];
  let total = 0;

  for (const file of sources) {
    const code = src(file);
    /*
      Split on top-level `export const`, so each function is judged on its own
      chain rather than on whatever a neighbour happens to declare. The shared
      base form — `const authed = createServerFn(...).middleware([...])` — is
      picked up because the handlers built from it name it.
    */
    const bases = new Map<string, boolean>();
    for (const m of code.matchAll(
      /const (\w+)\s*=\s*createServerFn\([\s\S]{0,200}?\.middleware\(\[([^\]]*)\]\)/g,
    )) {
      bases.set(m[1], /requireSupabaseAuth/.test(m[2]));
    }

    for (const m of code.matchAll(/export const (\w+)\s*=\s*([\s\S]*?)(?=\nexport const |\n?$)/g)) {
      const [, name, body] = m;
      if (!/createServerFn\(|\.handler\(/.test(body)) continue;
      if (
        !/createServerFn\(/.test(body) &&
        ![...bases.keys()].some((b) => body.startsWith(b + "."))
      )
        continue;
      total += 1;

      const viaBase = [...bases.entries()].some(
        ([b, authed]) => body.startsWith(b + ".") && authed,
      );
      const authed = viaBase || /\.middleware\(\[[^\]]*requireSupabaseAuth/.test(body);
      const devOnly = /assertDevelopment\(\)/.test(body);
      if (!authed && !devOnly) unprotected.push(`${file}: ${name}`);
    }
  }

  assert.ok(total >= 16, `expected the sweep to see every server function, saw ${total}`);
  assert.deepEqual(
    unprotected,
    [],
    `server functions with no protection:\n  ${unprotected.join("\n  ")}`,
  );
});

test("the model client distinguishes refused, unreadable and answered", async (t) => {
  /*
    Three unlike things used to return `{}`: a safety refusal, an unparseable
    response, and a response with no text block. An empty object is
    indistinguishable from "the model answered, and found nothing" — the same
    collapse the product refuses everywhere else, sitting in the one module the
    AI layer goes through.
  */
  const { callClaude } = await import("@/lib/ai.server");

  const realFetch = globalThis.fetch;
  const realKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "test-key-not-a-real-credential";
  const reply = (payload: unknown) => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(payload), { status: 200 })) as typeof fetch;
  };
  t.after(() => {
    globalThis.fetch = realFetch;
    if (realKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = realKey;
  });

  reply({ stop_reason: "refusal", content: [] });
  assert.deepEqual(await callClaude([{ role: "user", content: "x" }]), { outcome: "refused" });

  reply({ content: [{ type: "text", text: "I'd rather explain than emit JSON." }] });
  const unreadable = await callClaude([{ role: "user", content: "x" }]);
  assert.equal(unreadable.outcome, "unreadable", "unparseable text was read as an answer");
  assert.match(
    "raw" in unreadable ? unreadable.raw : "",
    /rather explain/,
    "the raw text was discarded",
  );

  reply({ content: [] });
  assert.equal(
    (await callClaude([{ role: "user", content: "x" }])).outcome,
    "unreadable",
    "a response with no text block was read as an empty answer",
  );

  /* `JSON.parse("7")` succeeds and is not an object; every field reads absent. */
  reply({ content: [{ type: "text", text: "7" }] });
  assert.equal(
    (await callClaude([{ role: "user", content: "x" }])).outcome,
    "unreadable",
    "a non-object JSON value was accepted as a model answer",
  );

  reply({ content: [{ type: "text", text: '{"verdict":"eligible"}' }] });
  const answered = await callClaude([{ role: "user", content: "x" }]);
  assert.equal(answered.outcome, "answered");
  assert.deepEqual("value" in answered ? answered.value : null, { verdict: "eligible" });

  /* A failure to *ask* is still an exception — it is not an answer of any kind. */
  globalThis.fetch = (async () => new Response("nope", { status: 500 })) as typeof fetch;
  await assert.rejects(
    () => callClaude([{ role: "user", content: "x" }]),
    /Anthropic API error \(500\)/,
  );
});

test("no Supabase read turns an error into an empty result", () => {
  /*
    `(data ?? [])` is the shape this collapse takes: PostgREST returns
    `{ data: null, error }` on failure, and a bare `?? []` downstream reports
    "the record is empty" for "the record could not be read". Every such site
    must be preceded by a throw on `error` in the same function.
  */
  const offenders: string[] = [];
  for (const file of walk("src/lib")) {
    const code = src(file);
    if (!/\bfrom\("/.test(code)) continue;

    for (const fn of code.split(/\n {2}(?:async )?[a-zA-Z#]+\(/)) {
      if (!/\bdata\s*\?\?\s*\[\]|\bcount\s*\?\?\s*0/.test(fn)) continue;
      if (!/\bfrom\("/.test(fn)) continue;
      if (!/if \(error\)/.test(fn)) {
        offenders.push(`${file}: a nullish-coalesced read with no error check`);
      }
    }
  }
  assert.deepEqual(offenders, [], offenders.join("\n  "));
});

/* ══════════════════════════════════════════════════════════════════════════
   C. State composition
   ══════════════════════════════════════════════════════════════════════════ */

test("loading announces itself in words, not only in motion", () => {
  /*
    The composition that would break it: reduced motion plus a screen reader.
    A skeleton conveys "we are reading" by pulsing, and under
    `prefers-reduced-motion` the pulse is removed — correctly — which leaves a
    few grey rectangles and no statement at all. To anyone not looking at the
    animation, an unannounced skeleton is indistinguishable from a page that
    finished and rendered nothing.

    So the pending state has to say so in text. This is asserted against the
    rendered markup rather than in the browser walk, because the laboratory
    routes have no pending component to observe — the skeletons belong to the
    authenticated surfaces, and a browser check written against a page that
    cannot show the state is one that passes by finding nothing.
  */
  const html = execFileSync(
    process.execPath,
    [
      "--import",
      "./test/register.mjs",
      "test/render-component.ts",
      "@/components/opportunity/OpportunityCardSkeleton",
      "OpportunityListSkeleton",
    ],
    { encoding: "utf8" },
  );

  assert.match(html, /role="status"/, "the skeleton does not announce itself");
  assert.match(html, /sr-only/, "the announcement is not available to a screen reader");
  assert.match(
    html.replace(/<[^>]+>/g, " "),
    /load|read|find/i,
    "the announcement does not say that something is being read",
  );

  /*
    And the shape survives without the animation: the placeholder blocks are
    elements in the markup, not something a keyframe draws. Removing motion must
    subtract reassurance, never information.
  */
  const blocks = html.match(/animate-pulse/g) ?? [];
  assert.ok(blocks.length > 0, "the skeleton has no placeholder blocks at all");
});

test("a preserved page states an age that only a successful read can move", async () => {
  /*
    Composition: stale preserved content *plus* a further refresh failure. If
    the age came from the moment of rendering, every failure would make the
    content look freshly read — staleness hidden by the very failure that caused
    it. The store is therefore written only on success.
  */
  const { rememberLastGood, lastGood, forgetEverythingLastGood } = await import("@/lib/last-good");
  forgetEverythingLastGood();

  rememberLastGood("compose", { rows: 1 });
  const first = lastGood<{ rows: number }>("compose");
  assert.ok(first);

  /* Time passes, and two refreshes fail. Nothing calls `rememberLastGood`. */
  await new Promise((r) => setTimeout(r, 5));
  const afterFailures = lastGood<{ rows: number }>("compose");
  assert.equal(afterFailures?.at, first.at, "a failed refresh moved the age");

  /* Only a read that succeeded may move it. */
  await new Promise((r) => setTimeout(r, 5));
  rememberLastGood("compose", { rows: 2 });
  const second = lastGood<{ rows: number }>("compose");
  assert.ok(
    second && Date.parse(second.at) > Date.parse(first.at),
    "a successful read did not move the age",
  );

  /*
    And the guard that makes that true in the routes: the preserved render must
    not re-remember what it is preserving, or the first paint of the caveat
    would reset the very age it is reporting.
  */
  for (const route of [
    "src/routes/_authenticated/opportunities.tsx",
    "src/routes/_authenticated/saved.tsx",
  ]) {
    const code = withoutComments(src(route));
    assert.match(
      code,
      /if \(!data\) rememberLastGood\(/,
      `${route}: the preserved render re-remembers, resetting the age it reports`,
    );
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   D. Authentication contracts
   ══════════════════════════════════════════════════════════════════════════ */

test("no destination off this origin survives the sign-in handshake", async () => {
  /*
    An open redirect on a sign-in page is how one account becomes somebody
    else's: `/auth?next=https://evil.example/workspace` sends a
    freshly-authenticated person somewhere that looks like the product and asks
    them to confirm something.

    The existing suite tried four hostile inputs. This tries the shapes that
    actually get past hand-written checks — encoded slashes, whitespace
    smuggling, embedded credentials, backslash hosts, and prefixes that merely
    *look* like an allowed route.
  */
  const { safeRedirectPath, AUTH_LANDING_PATH } = await import("@/lib/safe-redirect");

  const hostile = [
    "https://evil.example/opportunities",
    "http://evil.example",
    "//evil.example",
    "//evil.example/opportunities",
    "/\\evil.example",
    "/\\/evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "https://user:pass@evil.example/opportunities",
    "%2F%2Fevil.example",
    "opportunities",
    "",
    /* Prefixes that resemble an allowed route without being one. */
    "/opportunities.evil.example",
    "/opportunities@evil.example",
    "/opportunitiesevil",
    "/saved.evil",
    "/savedx",
    /* Not on the allowlist at all. */
    "/lab",
    "/lab/mutations",
    "/auth",
    /*
      A scheme carried *inside* an allowed prefix. This set originally had none,
      and mutation testing showed it: deleting the embedded-scheme guard from
      `safeRedirectPath` broke nothing, because every scheme-bearing input here
      already failed the leading-slash check before reaching it. These are the
      inputs that actually reach the guard — the allowlist would otherwise pass
      them, since they do begin with `/opportunities/`.
    */
    "/opportunities/javascript:alert(1)",
    "/opportunities/data:text/html,<script>alert(1)</script>",
    "/saved/https://evil.example",
  ];

  for (const path of hostile) {
    assert.equal(safeRedirectPath(path), AUTH_LANDING_PATH, `let through: ${JSON.stringify(path)}`);
  }
  assert.equal(safeRedirectPath(null), AUTH_LANDING_PATH);
  assert.equal(safeRedirectPath(undefined), AUTH_LANDING_PATH);

  /* And the destinations that must survive, because capturing them is the point. */
  for (const good of [
    "/opportunities",
    "/opportunities/abc-123",
    "/opportunities/examples",
    "/opportunities?q=maths&page=2",
    "/saved",
    "/saved?sort=recent",
  ]) {
    assert.equal(safeRedirectPath(good), good, `wrongly rejected: ${good}`);
  }
});

test("every hand-off out of the sign-in page goes through the allowlist", () => {
  /*
    A perfect allowlist that a call site forgets to use is not an allowlist. The
    sign-in page navigates in three places — an already-signed-in visitor, an
    OAuth transition, and the email form — and all three must resolve their
    destination the same way.
  */
  const auth = withoutComments(src("src/routes/auth.tsx"));
  const navigations = [...auth.matchAll(/navigate\(\{\s*to:\s*([^,}]+)/g)].map((m) => m[1].trim());

  assert.ok(navigations.length >= 3, `expected the three hand-offs, found ${navigations.length}`);
  for (const target of navigations) {
    assert.equal(target, "destination()", `a hand-off bypasses the allowlist: to: ${target}`);
  }
  assert.match(
    auth,
    /return safeRedirectPath\(next\)/,
    "destination() no longer resolves through the allowlist",
  );
});

test("a wrong password and an unreachable service are never the same message", async () => {
  /*
    Reporting a network failure as a rejection tells a person on a bad
    connection that their correct password is wrong — repeatedly, because
    retrying produces the same message. The five outcomes must stay five, and
    each must carry its own words.
  */
  const { classifyAuthFailure } = await import("@/lib/auth-outcome");
  const { AuthRetryableFetchError, AuthApiError } = await import("@supabase/supabase-js");

  const rejected = classifyAuthFailure(
    new AuthApiError("Invalid login credentials", 400, "invalid_credentials"),
  );
  const unreachable = classifyAuthFailure(new AuthRetryableFetchError("fetch failed", 0));
  const offline = classifyAuthFailure(new TypeError("Failed to fetch"));

  assert.equal(rejected.kind, "rejected");
  assert.equal(unreachable.kind, "unreachable");
  assert.equal(offline.kind, "unreachable", "an offline browser was read as a wrong password");

  assert.notEqual(
    rejected.what,
    unreachable.what,
    "a rejection and a network failure say the same thing",
  );
  /* Retryability is the actionable half: retrying a rejection cannot help. */
  assert.equal(rejected.retryable, false);
  assert.equal(unreachable.retryable, true);

  /* And every outcome says what is still true, so none reads as a verdict. */
  for (const outcome of [rejected, unreachable, offline]) {
    assert.ok(
      outcome.stillTrue.length > 0,
      `${outcome.kind} says nothing about what is still true`,
    );
    assert.ok(outcome.whatYouCanDo.length > 0, `${outcome.kind} offers nothing to do`);
  }
});

test("a sign-out that happens elsewhere is honoured here", () => {
  /*
    There is no sign-out control in the product — recorded as a gap in the
    Phase 18 report, not fixed here, because adding one means designing an
    authenticated app shell that does not exist yet.

    What must not also be missing is the *response*: if a session ends in
    another tab, or expires, this document has to stop showing protected
    content. The root listens for the identity transition and re-runs the gate,
    which is what makes the missing control a missing affordance rather than a
    broken contract.
  */
  const root = withoutComments(src("src/routes/__root.tsx"));
  assert.match(root, /onAuthStateChange/, "nothing listens for an identity change");
  assert.match(root, /"SIGNED_OUT"/, "a sign-out elsewhere is not treated as an identity change");
  assert.match(root, /router\.invalidate\(\)/, "an identity change does not re-run the gate");
});

/* ══════════════════════════════════════════════════════════════════════════
   E. The declaration layer cannot touch what is true about an opportunity
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Observation ids are minted fresh on every fixture build, so two identical
 * corpora differ in them and in nothing else. Measured, not assumed: two calls
 * to `demoCorpus` with the same clock and no declarations produce different
 * observation ids and identical entity ids — identity is derived from what was
 * observed, the ids are just handles.
 *
 * Normalising them out is what lets the comparison below say something. Left in,
 * every field containing one differs and the test proves nothing.
 */
function withoutObservationIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutObservationIds);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === "observationId") continue;
      if (k === "observationIds") continue;
      if (k === "observations" && Array.isArray(v)) {
        out[k] = `${v.length} observation(s)`;
        continue;
      }
      out[k] = withoutObservationIds(v);
    }
    return out;
  }
  return value;
}

test("declaring interest changes the person's position and nothing else", async () => {
  /*
    The Ownership Principle in both directions. A declaration is a fact about a
    person, so they may make and unmake it; an opportunity's requirements,
    timing, verification and sources are facts about the world, and no amount of
    interest may edit them.

    ── Why every entity is declared, not one ─────────────────────────────────

    The first version of this declared `scenarios[0]` and compared that one
    entity. Mutation testing walked straight through it: making `timing`
    silently report "open" for any declared entity changed nothing observable,
    because that specimen's deadline was already open. One sample cannot
    distinguish "the projection ignores the declaration" from "this specimen
    happens to be immune".

    So the whole corpus is declared at once and every entity is compared against
    its undeclared self. The specimens exist precisely to span the states —
    open, closing, closed, unverified, contested — which is what makes the
    comparison mean something.
  */
  const { demoCorpus } = await import("@/lib/opportunity/surface/demo");
  const NOW = "2026-08-18T09:00:00.000Z";

  const before = await demoCorpus(NOW);
  const everything = new Map(before.scenarios.map((s) => [s.card.entityId, "interested" as const]));
  const after = await demoCorpus(NOW, everything);

  assert.ok(
    before.scenarios.length >= 5,
    `expected a corpus worth comparing, got ${before.scenarios.length}`,
  );

  /* The specimens must actually differ in timing, or the sweep proves little. */
  const timings = new Set(
    before.scenarios.map((s) => JSON.stringify(s.card.timing?.state ?? null)),
  );
  assert.ok(
    timings.size >= 2,
    `every specimen shares one timing state: ${[...timings].join(", ")}`,
  );

  let declaredSomething = false;

  for (const b of before.scenarios) {
    const a = after.scenarios.find((s) => s.card.entityId === b.card.entityId);
    assert.ok(a, `${b.card.entityId} vanished once declared`);

    /* Entity identity is not something a declaration may move. */
    assert.equal(a.card.entityId, b.card.entityId);

    /*
      Every entity-level fact, named individually rather than diffed wholesale,
      so a new fact added to the card is not silently covered — it has to be
      added here, deliberately.
    */
    for (const field of [
      "title",
      "organiser",
      "deadline",
      "funding",
      "location",
      "timing",
      "verification",
      "action",
      "shown",
      "pairing",
    ] as const) {
      assert.deepEqual(
        withoutObservationIds(a.card[field]),
        withoutObservationIds(b.card[field]),
        `declaring interest altered ${b.card.entityId}'s ${field}`,
      );
    }

    /* And the inspection's evidence. */
    const bi = b.inspection as unknown as Record<string, unknown>;
    const ai = a.inspection as unknown as Record<string, unknown>;
    for (const field of [
      "sources",
      "unsettled",
      "verificationHistory",
      "requirements",
      "evidence",
      "entity",
    ]) {
      if (!(field in bi)) continue;
      assert.deepEqual(
        withoutObservationIds(ai[field]),
        withoutObservationIds(bi[field]),
        `declaring interest altered ${b.card.entityId}'s inspection ${field}`,
      );
    }

    if (JSON.stringify(a.card.pursuit) !== JSON.stringify(b.card.pursuit)) declaredSomething = true;
  }

  /* And the test cannot pass by the declaration having done nothing at all. */
  assert.ok(declaredSomething, "no declaration registered anywhere in the corpus");
});

test("one person's declaration changes nothing about any other opportunity", async () => {
  const { demoCorpus } = await import("@/lib/opportunity/surface/demo");
  const NOW = "2026-08-18T09:00:00.000Z";

  const before = await demoCorpus(NOW);
  const target = before.scenarios[0].card.entityId;
  const after = await demoCorpus(NOW, new Map([[target, "interested" as const]]));

  let compared = 0;
  for (const b of before.scenarios) {
    if (b.card.entityId === target) continue;
    const a = after.scenarios.find((s) => s.card.entityId === b.card.entityId);
    assert.ok(a, `${b.card.entityId} disappeared when another entity was declared`);
    assert.deepEqual(
      withoutObservationIds(a.card),
      withoutObservationIds(b.card),
      `declaring one opportunity altered ${b.card.entityId}`,
    );
    compared += 1;
  }
  assert.ok(compared >= 5, `expected a corpus worth comparing, compared ${compared}`);
});

test("withdrawing restores the undeclared position exactly", async () => {
  /*
    Withdrawal is the only genuine delete in the engine, and it must leave no
    trace on the opportunity. `null` in the override map means withdrawn, which
    is deliberately distinct from absent — absent would restore the specimen's
    own fixture declaration rather than removing one.
  */
  const { demoCorpus } = await import("@/lib/opportunity/surface/demo");
  const NOW = "2026-08-18T09:00:00.000Z";

  const declaredFixture = (await demoCorpus(NOW)).scenarios.find(
    (s) => s.card.pursuit.state === "declared",
  );
  assert.ok(declaredFixture, "no specimen ships with a declaration to withdraw");

  const id = declaredFixture.card.entityId;
  const withdrawn = (await demoCorpus(NOW, new Map([[id, null]]))).scenarios.find(
    (s) => s.card.entityId === id,
  );
  assert.ok(withdrawn);

  assert.equal(
    withdrawn.card.pursuit.state,
    "undeclared",
    "withdrawal left the declaration standing",
  );

  /* And the opportunity itself is untouched by the removal. */
  for (const field of [
    "title",
    "organiser",
    "deadline",
    "funding",
    "location",
    "timing",
    "verification",
  ] as const) {
    assert.deepEqual(
      withoutObservationIds(withdrawn.card[field]),
      withoutObservationIds(declaredFixture.card[field]),
      `withdrawing altered the opportunity's ${field}`,
    );
  }
});

test("the pursuit layer writes to exactly one table, and it is not an opportunity fact", () => {
  /*
    The schema half of the same guarantee. Behaviour can be re-derived; a stray
    `.update()` against `opportunity_observations` from the pursuit path would
    be a constitutional breach (CR-37: observations are immutable) that no
    projection test would see.
  */
  const pursuitFiles = walk("src/lib/opportunity/pursuit").concat(["src/lib/pursuit.functions.ts"]);
  const tables = new Set<string>();
  for (const file of pursuitFiles) {
    for (const m of src(file).matchAll(/\.from\("(\w+)"\)/g)) tables.add(m[1]);
  }
  assert.deepEqual(
    [...tables],
    ["opportunity_pursuits"],
    `the pursuit path reaches: ${[...tables].join(", ")}`,
  );

  /* And nothing anywhere mutates or deletes an observation. */
  for (const file of walk("src/lib")) {
    const code = src(file);
    for (const m of code.matchAll(/\.from\("opportunity_observations"\)([\s\S]{0,200})/g)) {
      assert.equal(
        /\.(update|upsert|delete)\(/.test(m[1]),
        false,
        `${file}: an observation is mutated or deleted — CR-37 forbids it`,
      );
    }
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   F. Discovery and evidence — the counts a person is shown
   ══════════════════════════════════════════════════════════════════════════ */

test("evidence is counted per page, and the latest retrieval decides its outcome", async () => {
  /*
    These four numbers are what the degraded line puts in front of a reader:
    consulted, answered, unreadable, unreachable. They had no test.

    Two properties, both of which were real defects at some point in this
    engine's history:

    1. **Per page, not per observation.** A page reached twice — which a
       redirect produces routinely — used to make "2 of 2 sources" out of one
       page. That inflates corroboration, which is the single number a reader
       uses to decide whether to believe an unverified claim.

    2. **The latest retrieval decides.** A page that failed on Monday and
       answered on Tuesday is available. Counting it as degraded because a
       historical retrieval failed would make the record's own completeness
       decay as it grows, so the longer the engine watched a source the less it
       would claim to know about it.
  */
  const { groupObservations } = await import("@/lib/opportunity/entity/group");
  const { resolveEntity } = await import("@/lib/opportunity/entity/resolve");
  const { establishVerification } = await import("@/lib/opportunity/verification/service");
  const { deriveStakes } = await import("@/lib/opportunity/corpus");
  const { projectInspection } = await import("@/lib/opportunity/surface/inspection");
  const { observe, page, prosePage, T0, T1, T2 } = await import("./fixtures.ts");

  const FMOE = "https://education.gov.ng/bea-2026";
  const UNN = "https://www.unn.edu.ng/bea-scholarship/";
  const bea = () =>
    page({
      name: "Bilateral Education Agreement 2026",
      organiser: "Federal Ministry of Education",
      deadline: "2026-09-30",
      url: FMOE,
    });

  const inspect = (observations: Parameters<typeof groupObservations>[0]) => {
    const { groups } = groupObservations(observations);
    const resolved = resolveEntity({
      members: groups[0].members,
      identity: groups[0].identity,
      rationale: groups[0].rationale,
      stakes: deriveStakes(),
      decidedAt: T2,
    });
    assert.ok("entity" in resolved);
    return projectInspection({
      entity: resolved.entity,
      verification: establishVerification(resolved.entity, observations, T2),
      judgments: null,
      pursuit: { state: "undeclared" },
      observations,
      now: T2,
    });
  };

  /* ── one page, retrieved twice ─────────────────────────────────────────── */
  const twice = inspect([observe(FMOE, bea(), T0), observe(FMOE, bea(), T1)]);
  assert.equal(twice.evidence.consulted, 1, "one page reached twice was counted as two sources");
  assert.equal(twice.evidence.answered, 1);
  assert.equal(twice.evidence.degraded, false);

  /* ── failed first, answered later: available ───────────────────────────── */
  const recovered = inspect([
    observe(FMOE, null, T0, 500),
    observe(FMOE, bea(), T1),
    observe(UNN, bea(), T1),
  ]);
  assert.equal(
    recovered.evidence.unreachable,
    0,
    "a page that recovered is still counted as unreachable",
  );
  assert.equal(recovered.evidence.answered, 2);
  assert.equal(
    recovered.evidence.degraded,
    false,
    "a historical failure permanently degrades the record",
  );

  /* ── answered first, failed later: degraded ────────────────────────────── */
  const lost = inspect([
    observe(FMOE, bea(), T0),
    observe(UNN, bea(), T0),
    observe(UNN, null, T1, 500),
  ]);
  assert.equal(
    lost.evidence.unreachable,
    1,
    "the latest retrieval did not decide the page's outcome",
  );
  assert.equal(lost.evidence.answered, 1);
  assert.equal(lost.evidence.degraded, true);

  /* ── retrieved, and nothing readable in it ─────────────────────────────── */
  const unread = inspect([
    observe(FMOE, bea(), T0),
    observe(UNN, bea(), T0),
    observe("https://www.unn.edu.ng/news/", prosePage("News", "Nothing structured"), T1),
  ]);
  assert.equal(
    unread.evidence.unreadable,
    1,
    "a page with nothing readable was counted as answered",
  );
  assert.equal(unread.evidence.degraded, true);

  /*
    And the partition holds in every case. Three counts that do not add up to
    the total mean a page fell into no category at all, which is how a source
    disappears from a reader's view of what was looked at.
  */
  for (const [name, i] of [
    ["twice", twice],
    ["recovered", recovered],
    ["lost", lost],
    ["unread", unread],
  ] as const) {
    const { consulted, answered, unreadable, unreachable, degraded } = i.evidence;
    assert.equal(
      answered + unreadable + unreachable,
      consulted,
      `${name}: ${answered}+${unreadable}+${unreachable} ≠ ${consulted} consulted`,
    );
    assert.equal(
      degraded,
      unreadable + unreachable > 0,
      `${name}: degraded disagrees with the counts`,
    );
  }
});

test("a source list counts pages, and says how many times each was reached", async () => {
  /*
    The companion to the counts. Two routes to one source is one source — but
    two observations of one source over time is two observations, and the row
    has to say so or a redirect looks identical to a fresh corroboration.
  */
  const { groupObservations } = await import("@/lib/opportunity/entity/group");
  const { resolveEntity } = await import("@/lib/opportunity/entity/resolve");
  const { establishVerification } = await import("@/lib/opportunity/verification/service");
  const { deriveStakes } = await import("@/lib/opportunity/corpus");
  const { projectInspection } = await import("@/lib/opportunity/surface/inspection");
  const { observe, page, T0, T1, T2 } = await import("./fixtures.ts");

  const FMOE = "https://education.gov.ng/bea-2026";
  const bea = () =>
    page({
      name: "BEA 2026",
      organiser: "Federal Ministry of Education",
      deadline: "2026-09-30",
      url: FMOE,
    });

  const observations = [observe(FMOE, bea(), T0), observe(FMOE, bea(), T1)];
  const { groups } = groupObservations(observations);
  const resolved = resolveEntity({
    members: groups[0].members,
    identity: groups[0].identity,
    rationale: groups[0].rationale,
    stakes: deriveStakes(),
    decidedAt: T2,
  });
  assert.ok("entity" in resolved);
  const inspection = projectInspection({
    entity: resolved.entity,
    verification: establishVerification(resolved.entity, observations, T2),
    judgments: null,
    pursuit: { state: "undeclared" },
    observations,
    now: T2,
  });

  assert.equal(inspection.sources.length, 1, "one page produced two source rows");
  assert.equal(inspection.sources[0].retrievals, 2, "the row does not say it was reached twice");
});

/* ══════════════════════════════════════════════════════════════════════════
   G. The database contract, as the application actually uses it
   ══════════════════════════════════════════════════════════════════════════ */

test("nothing user-scoped is read with the key that bypasses row-level security", () => {
  /*
    Two clients exist and the distinction is the whole of this product's
    multi-tenancy. `supabaseAdmin` carries the service-role key and bypasses RLS;
    the middleware's client carries the person's own token and the database does
    the scoping.

    Reading someone's saved opportunities with the admin client would make every
    read unscoped — one person's list readable while resolving another's — and
    it would not fail, or warn, or look wrong in a diff.

    The admin client's legitimate use is the world's facts: observations and
    verification events, which are identical for everyone and protected by
    append-only triggers rather than by RLS.
  */
  const admins = walk("src")
    .filter((f) => /\bsupabaseAdmin\b/.test(withoutComments(src(f))))
    .filter((f) => f !== "src/integrations/supabase/client.server.ts");

  assert.deepEqual(
    admins,
    ["src/lib/opportunity/store.ts"],
    `the service-role client reached: ${admins.join(", ")}`,
  );

  /* And what that one module builds with it is only the world's record. */
  const store = withoutComments(src("src/lib/opportunity/store.ts"));
  assert.equal(/pursuit/i.test(store), false, "the service-role record now includes pursuits");

  /* Every user-scoped read takes its client from the middleware context. */
  const server = withoutComments(src("src/lib/opportunities.functions.ts"));
  assert.equal(/supabaseAdmin/.test(server), false, "a product read reaches for the admin client");
  for (const fn of ["listOpportunities", "getOpportunity", "listSaved"]) {
    const at = server.indexOf(fn);
    assert.ok(at > 0, `${fn} is gone`);
    assert.match(
      server.slice(at, at + 400),
      /context as Ctx|context as AuthedContext/,
      `${fn} does not scope its read to the signed-in person`,
    );
  }
});

test("the application touches only the engine's own tables", () => {
  /*
    A legacy table silently treated as canonical is how a retired system comes
    back. Phase 13 retired the previous judgment system; these four are what
    replaced it, and the set is pinned rather than assumed.
  */
  const referenced = new Set<string>();
  for (const file of walk("src")) {
    for (const m of src(file).matchAll(/\.from\("([a-z_]+)"\)/g)) referenced.add(m[1]);
  }
  assert.deepEqual(
    [...referenced].sort(),
    ["opportunity_observations", "opportunity_pursuits", "opportunity_verification_events"],
    `unexpected table(s): ${[...referenced].join(", ")}`,
  );
});

test("withdrawal is the only delete, and it is a person's own declaration", () => {
  /*
    CR-37: observations are immutable — a fact about the world, and nobody gets
    to unsay it. A declaration is a fact about a person, and the Ownership
    Principle gives them the truth of their own life, so it is the one thing in
    the engine that may genuinely be removed.
  */
  const deletes: string[] = [];
  for (const file of walk("src")) {
    const code = src(file);
    for (const m of code.matchAll(/\.from\("([a-z_]+)"\)([\s\S]{0,300})/g)) {
      if (/\.delete\(\)/.test(m[2])) deletes.push(`${file}: ${m[1]}`);
    }
  }
  assert.ok(deletes.length > 0, "withdrawal no longer deletes anything");
  for (const d of deletes) {
    assert.match(d, /opportunity_pursuits/, `something other than a declaration is deleted: ${d}`);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   I. Routes and information architecture
   ══════════════════════════════════════════════════════════════════════════ */

test("every internal link points at a route that exists", () => {
  /*
    A manual URL that points nowhere is a 404 the diff does not show. The
    generated tree is the authority — it is what the router was actually built
    with — so link targets are checked against it rather than against a list
    someone maintained by hand.
  */
  const tree = src("src/routeTree.gen.ts");
  const known = new Set([...tree.matchAll(/'(\/[^']*)'/g)].map((m) => m[1]));
  assert.ok(known.size > 10, `the route tree looks unparsed: ${known.size} paths`);

  const missing: string[] = [];
  for (const file of walk("src").filter((f) => f.endsWith(".tsx"))) {
    const code = withoutComments(src(file));
    for (const m of code.matchAll(/\bto="(\/[^"]*)"/g)) {
      if (!known.has(m[1])) missing.push(`${file}: to="${m[1]}"`);
    }
    for (const m of code.matchAll(/\bhref="(\/[^"#?]*)"/g)) {
      if (!known.has(m[1])) missing.push(`${file}: href="${m[1]}"`);
    }
  }
  assert.deepEqual(missing, [], `link(s) pointing nowhere:\n  ${missing.join("\n  ")}`);
});

test("the product's surfaces are exactly the canonical set", () => {
  /*
    Pinned so that a route appearing or disappearing is a decision someone made
    rather than something that happened. The laboratory is deliberately listed
    separately: it is a development surface, and the day it stops being
    separable from the product is the day fixtures become evidence.
  */
  const tree = src("src/routeTree.gen.ts");
  const paths = new Set([...tree.matchAll(/'(\/[^']*)'/g)].map((m) => m[1]));

  for (const surface of [
    "/",
    "/auth",
    "/opportunities",
    "/opportunities/$id",
    "/opportunities/examples",
    "/saved",
  ]) {
    assert.ok(paths.has(surface), `${surface} is not in the generated route tree`);
  }

  /* Every protected surface sits under the gate, not beside it. */
  for (const guarded of [
    "/opportunities",
    "/opportunities/$id",
    "/opportunities/examples",
    "/saved",
  ]) {
    assert.ok(
      paths.has(`/_authenticated${guarded}`),
      `${guarded} is routable without passing the authenticated gate`,
    );
  }

  /* And nothing from a retired system is routable. */
  for (const retired of ["/workspace", "/dashboard", "/step", "/onboarding", "/applications"]) {
    assert.equal(paths.has(retired), false, `${retired} is still routable`);
  }
});
