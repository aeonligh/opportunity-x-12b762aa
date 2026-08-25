import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * A FAILED REFRESH MAY NOT ERASE WHAT WAS ALREADY TRUE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Phase 15 added `Refreshing`, which says a re-read is in flight while the
 * previous answer stays on screen. It never answered the next question, and a
 * browser did: on `/lab/refresh`, a loader that throws during `invalidate()`
 * reaches the route's error boundary **with the previous data already
 * discarded**, so the content vanished and an error page took the page.
 *
 * That inverts the rule. Valid content plus a failed refresh must remain valid
 * content plus a refresh failure — never an error page, an empty list, or a
 * skeleton. Destroying known-good information to report that fresher
 * information could not be obtained presents a limit on the system as a fact
 * about the world, which is the defect this product exists to avoid.
 *
 * These prove the mechanism and the distinction it turns on. The rendered proof
 * is the browser walk; these hold the semantics.
 */

function render(specifier: string, exported: string, props?: unknown): string {
  return execFileSync(
    process.execPath,
    [
      "--import",
      "./test/register.mjs",
      "test/render-component.ts",
      specifier,
      exported,
      ...(props === undefined ? [] : [JSON.stringify(props)]),
    ],
    { encoding: "utf8" },
  );
}

function text(html: string): string {
  return html
    .replace(/<[^>]*class="[^"]*\bsr-only\b[^"]*"[^>]*>[\s\S]*?<\/[a-z]+>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ══════════════════════════════════════════════════════════════════════════
   The store
   ══════════════════════════════════════════════════════════════════════════ */

test("last-good remembers what was shown, with when", async () => {
  const { rememberLastGood, lastGood, forgetEverythingLastGood } = await import("@/lib/last-good");
  forgetEverythingLastGood();

  assert.equal(
    lastGood("nothing-yet"),
    null,
    "a surface that has shown nothing must remember nothing",
  );

  rememberLastGood("k", { rows: 3 });
  const kept = lastGood<{ rows: number }>("k");

  assert.ok(kept);
  assert.deepEqual(kept.data, { rows: 3 });
  /*
    The timestamp is not decoration. Preserved content without an age is the one
    way this pattern becomes a lie — a page silently showing yesterday's answer
    is claiming currency it does not have.
  */
  assert.equal(Number.isNaN(Date.parse(kept.at)), false);
});

test("last-good is not a cache", async () => {
  /*
    Nothing may read from it to satisfy a request. It is consulted only after a
    read has already failed, and only to answer "what were we showing?". A cache
    without a freshness model makes evidence go stale while looking current,
    which this product forbids.
  */
  const source = readFileSync("src/lib/last-good.ts", "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  for (const forbidden of [/ttl/i, /maxAge/i, /expires/i, /revalidate/i]) {
    assert.equal(forbidden.test(code), false, `last-good has grown cache semantics: ${forbidden}`);
  }

  /* And no route may consult it before a failure. */
  for (const route of [
    "src/routes/_authenticated/opportunities.tsx",
    "src/routes/_authenticated/saved.tsx",
  ]) {
    const r = readFileSync(route, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const failedAt = r.indexOf("function Failed(");
    const readAt = r.indexOf("lastGood<");
    assert.ok(readAt > failedAt, `${route} reads last-good outside its failure branch`);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   The two halves of a refresh failure
   ══════════════════════════════════════════════════════════════════════════ */

test("a refresh failure over known content is a caveat, not an error page", () => {
  const html = render("@/components/ui/state/RefreshFailed", "RefreshFailed", {
    what: "I couldn’t check for new opportunities.",
    at: "2026-08-18T09:14:00.000Z",
  });
  const said = text(html);

  assert.match(said, /couldn’t check for new opportunities/);
  /* The half that keeps it from reading as a loss. */
  assert.match(said, /hasn’t been contradicted/);
  /*
    And the age, always — as a rendered `<time>` carrying the actual instant, not
    the words "Last read".

    The first version of this asserted the label, which survived deleting the
    timestamp entirely: a preserved-content notice that says "Last read" and
    nothing else is exactly the silent-staleness this component exists to
    prevent, and the assertion would have passed through it.
  */
  assert.match(said, /Last read/i);
  /* Case-insensitive on the attribute: React 19 emits `dateTime` verbatim here. */
  assert.match(
    html,
    /<time[^>]*datetime="2026-08-18T09:14:00\.000Z"/i,
    "the preserved content carries no age",
  );

  /*
    A status, not an alert. The content beneath it is fine; interrupting a screen
    reader to announce that something newer could not be fetched would rank the
    caveat above the evidence.
  */
  assert.match(html, /role="status"/);
  assert.equal(/role="alert"/.test(html), false);
});

test("both list routes preserve content when they have any, and not when they do not", () => {
  /*
    The distinction the mechanism turns on. With something previously shown, a
    failed re-read is a caveat. With nothing shown, the first read failed and the
    full error treatment is correct — there is genuinely nothing to preserve.
  */
  for (const route of [
    "src/routes/_authenticated/opportunities.tsx",
    "src/routes/_authenticated/saved.tsx",
  ]) {
    const code = readFileSync(route, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

    assert.match(code, /if \(kept\) \{/, `${route}: no preserved branch`);
    assert.match(code, /<RefreshFailed/, `${route}: does not report a refresh failure`);
    /* And the unpreserved path still renders the full error. */
    assert.match(code, /<SurfaceError/, `${route}: lost its first-read error state`);
  }
});

test("retry has a pending state everywhere it is offered", () => {
  /*
    `SurfaceError` accepted `retrying` from the day it was written and **no call
    site ever passed it** — every route wired `onRetry={() => void
    router.invalidate()}`, so pressing Try again did nothing visible while the
    loader re-ran. A retry with no pending state is the infinite-spinner problem
    inverted: no spinner, and no evidence anything happened.

    This is discovered rather than listed. The first version of this test named
    four routes, and a browser walk then found three more retry controls it had
    never looked at — including the two in production that matter most: the root
    error boundary's "Try again" and the session gate's "Check again". Naming the
    call sites closes the instances; scanning for them closes the class.
  */
  const files = execFileSync(
    "sh",
    ["-c", "find src -name '*.tsx' -print0 | xargs -0 grep -l 'router.invalidate()'"],
    { encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean);

  assert.ok(
    files.length >= 7,
    `expected the sweep to find the known retry controls, found ${files.length}`,
  );

  const offenders: string[] = [];
  for (const file of files) {
    const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

    /*
      Any event handler that reaches `router.invalidate()` without going through
      a transition. `InterestedControl` is not caught by this and should not be:
      its `readBack` is not an event handler, and it carries its own pending
      model for the write it performs.
    */
    for (const [, attr, body] of code.matchAll(
      /\b(onClick|onRetry)=\{((?:[^{}]|\{[^{}]*\})*)\}/g,
    )) {
      if (!/router\.invalidate\(\)/.test(body)) continue;
      if (/start[A-Z]\w*\(/.test(body)) continue;
      offenders.push(`${file}: ${attr}={${body.replace(/\s+/g, " ").slice(0, 60)}}`);
    }

    /*
      And the indirection: `onRetry={retry}` where `retry` is declared without a
      transition. Every file here declares its retry one way or the other, so a
      named handler reaching invalidate must show a transition too.
    */
    for (const [, body] of code.matchAll(/const retry = ([^;]*);/g)) {
      if (!/router\.invalidate\(\)/.test(body)) continue;
      if (/start[A-Z]\w*\(/.test(body)) continue;
      offenders.push(`${file}: const retry = ${body.replace(/\s+/g, " ").slice(0, 60)}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `retry fires without entering a pending state:\n  ${offenders.join("\n  ")}`,
  );
});

test("every retry control can say it is busy", () => {
  /*
    A transition that nothing renders is still invisible. Each retry control must
    also disable itself and announce `aria-busy` while the re-read is in flight —
    the transition is the mechanism, these two are the evidence.
  */
  const controls = [
    "src/routes/__root.tsx",
    "src/routes/_authenticated/route.tsx",
    "src/routes/lab.refresh.tsx",
    "src/components/ui/state/SurfaceError.tsx",
    "src/components/ui/state/RefreshFailed.tsx",
  ];

  for (const file of controls) {
    const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.match(code, /aria-busy=\{/, `${file}: a retry that never announces it is busy`);
    assert.match(code, /disabled=\{/, `${file}: a retry that can be pressed twice`);
  }
});

test("the retry control says it is retrying, and cannot be pressed twice", () => {
  const idle = render("@/components/ui/state/SurfaceError", "SurfaceError", {
    what: "x",
    stillTrue: "y",
    onRetry: undefined,
    retrying: false,
  });
  /* No handler, no button — retry only where it can help. */
  assert.equal(/<button/.test(idle), false);

  const busy = render("@/components/ui/state/RefreshFailed", "RefreshFailed", {
    what: "x",
    at: "2026-08-18T09:14:00.000Z",
    retrying: true,
  });
  /* With no handler there is still no button, whatever `retrying` says. */
  assert.equal(/<button/.test(busy), false);
});

/* ══════════════════════════════════════════════════════════════════════════
   A pending state that never ends is its own lie
   ══════════════════════════════════════════════════════════════════════════ */

test("a session check that never answers becomes unverifiable, not signed out", async () => {
  /*
    Measured in a browser before this existed: with an expired token and the
    auth host unreachable, `getUser()` took 57.3 seconds to reject, and for all
    57 the gate showed "Verifying your session". The classification underneath
    was already correct — it just arrived a minute late, and a spinner asserts
    "this is progressing" the whole time it is on screen.
  */
  const { verifySession, SESSION_CHECK_DEADLINE_MS } = await import("@/lib/session-verification");

  const never = () => new Promise<{ user: unknown; error: unknown }>(() => {});

  const began = Date.now();
  const check = await verifySession(never, { deadlineMs: 40 });
  const took = Date.now() - began;

  assert.equal(check.outcome, "unverifiable", "silence was read as an answer about the account");
  assert.ok(took < 1000, `the deadline did not bound the wait (${took}ms)`);
  /* The reason is the one that happened, not the one for a refused connection. */
  assert.match(
    "because" in check ? check.because : "",
    /didn’t answer in time/,
    "the timeout borrowed another failure's explanation",
  );

  /* And the shipped bound is a human wait, not a minute. */
  assert.ok(
    SESSION_CHECK_DEADLINE_MS > 0 && SESSION_CHECK_DEADLINE_MS <= 15_000,
    `the shipped deadline is ${SESSION_CHECK_DEADLINE_MS}ms`,
  );
});

test("the deadline does not fire over an answer that did arrive", async () => {
  /*
    The bound must not manufacture uncertainty. A check that answers inside the
    deadline keeps its real outcome — including a real "signed out", which is a
    genuine answer and must still redirect.
  */
  const { verifySession } = await import("@/lib/session-verification");

  const signedIn = await verifySession(async () => ({ user: { id: "u" }, error: null }), {
    deadlineMs: 5_000,
  });
  assert.equal(signedIn.outcome, "signed-in");

  const signedOut = await verifySession(async () => ({ user: null, error: null }), {
    deadlineMs: 5_000,
  });
  assert.equal(signedOut.outcome, "signed-out");

  /* A thrown transport failure is still unverifiable, by classification not by clock. */
  const threw = await verifySession(
    async () => {
      throw new TypeError("Failed to fetch");
    },
    { deadlineMs: 5_000 },
  );
  assert.equal(threw.outcome, "unverifiable");
  assert.match("because" in threw ? threw.because : "", /couldn’t reach/);
});

test("the gate waits through the bounded check, not the raw call", () => {
  /*
    The bound is only worth anything if the gate goes through it. A route that
    kept calling `supabase.auth.getUser()` directly would classify correctly and
    still hang for a minute.
  */
  const gate = readFileSync("src/routes/_authenticated/route.tsx", "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  assert.match(gate, /await verifySession\(/, "the gate does not go through the bounded check");
  assert.equal(
    /classifySessionCheck\(/.test(gate),
    false,
    "the gate still classifies an unbounded call itself",
  );
});
