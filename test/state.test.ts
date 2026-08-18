import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * TIME IS THE FOURTH ABSENCE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The engine already refuses to let *unknown*, *absent* and *empty* collapse
 * into one another. This file applies the same refusal to the states a surface
 * passes through while it is finding out — which are the states where the
 * distinction is easiest to lose, because for the length of a request every one
 * of them looks like a page with nothing on it.
 *
 * The claims under test, each attached to something that was actually wrong
 * here rather than to a principle in the abstract:
 *
 *   1. A loading state does not look like an answer.
 *   2. A skeleton renders shapes, never values.
 *   3. A pending write does not look committed.
 *   4. A failed write leaves the previous truth on screen.
 *   5. A written-but-unread write is neither of its neighbours.
 *   6. A failure does not look like an empty result.
 *   7. "I could not verify your session" is not "you are signed out".
 *   8. Every surface that can wait, says so; every surface that can fail, says
 *      what is still true.
 *   9. A retry is offered only where it could work.
 *  10. Nothing in the loading or pending vocabulary claims an outcome.
 *
 * ── How these are checked ─────────────────────────────────────────────────
 *
 * Behaviourally wherever that is possible. `performWrite` and
 * `classifySessionCheck` are plain functions and every branch of both is run.
 * The components are *rendered* — `test/hook.mjs` transforms JSX so a `.tsx`
 * module can be imported, and `test/render-component.ts` renders one in a child
 * process because the suite's own `--conditions=react-server` forbids
 * `react-dom/server`. Only the route wiring is asserted against source text,
 * because "this route declares a pendingComponent" is a fact about the route
 * definition and there is nothing to run.
 */

const ROUTES = [
  "src/routes/_authenticated/opportunities.tsx",
  "src/routes/_authenticated/opportunities.$id.tsx",
  "src/routes/_authenticated/saved.tsx",
  "src/routes/_authenticated/opportunities.examples.tsx",
];

function source(path: string): string {
  return readFileSync(path, "utf8");
}

/** Comments describe the rules; only what ships is under test. */
function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/**
 * Render a component for real, in a process allowed to load `react-dom/server`.
 *
 * Slower than an in-process render and worth it: the alternative is asserting
 * that a regex matches a `.tsx` file, which keeps passing long after the
 * component stops rendering what the regex was written to describe.
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

/** Visible text only — the thing a person actually reads. */
function text(html: string): string {
  return html
    .replace(/<[^>]*class="[^"]*\bsr-only\b[^"]*"[^>]*>[\s\S]*?<\/[a-z]+>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ══════════════════════════════════════════════════════════════════════════
   1 · Every surface that waits says it is waiting, and every one that fails
   says what failed — on the route, not by falling through to the root.
   ══════════════════════════════════════════════════════════════════════════ */

test("every canonical route with a loader declares both a pending and an error state", () => {
  /*
    All four had a `loader` and neither hook. A slow read showed the previous
    page and then swapped; a failed one reached `__root.tsx` and read "something
    went wrong on our end" — a full-page takeover whose wording a reader cannot
    tell apart from "there is nothing here".
  */
  for (const path of ROUTES) {
    const text_ = withoutComments(source(path));
    assert.match(text_, /\bloader:/, `${path}: expected a loader`);
    assert.match(text_, /\bpendingComponent:/, `${path}: has a loader and no pending state`);
    assert.match(text_, /\berrorComponent:/, `${path}: has a loader and no error state`);
  }
});

test("a route's failure keeps the way out of that route", () => {
  /*
    A failure that also removes the navigation turns one broken read into a dead
    end — and on `/opportunities/$id`, someone arriving from a shared link has no
    history to go back through either.
  */
  for (const path of ROUTES) {
    const text_ = withoutComments(source(path));
    assert.match(
      text_,
      /function Failed\(\)[\s\S]*?<(Masthead|Back)\s*\/>/,
      `${path}: the error branch drops the page's own navigation`,
    );
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   2 · A skeleton stands for a shape, never for a value.
   ══════════════════════════════════════════════════════════════════════════ */

test("skeletons render no readable content at all", () => {
  /*
    The failure mode being excluded is the plausible placeholder: a grey box
    reading "Closes soon", or a dimmed "3 sources", which is the product
    inventing a fact to fill a gap. The only text permitted is the screen-reader
    status line, and `text()` strips that before looking.
  */
  for (const [module_, exported] of [
    ["@/components/opportunity/OpportunityCardSkeleton", "OpportunityCardSkeleton"],
    ["@/components/opportunity/OpportunityCardSkeleton", "OpportunityListSkeleton"],
    ["@/components/opportunity/InspectionSkeleton", "InspectionSkeleton"],
  ]) {
    assert.equal(
      text(render(module_, exported)),
      "",
      `${exported} renders readable text, which a reader can mistake for a value`,
    );
  }
});

test("a loading list says it is loading, to a screen reader too", () => {
  /*
    Silence is the same defect one layer down: a person using a screen reader
    gets an empty region and no announcement, which is indistinguishable from a
    finished, empty page.
  */
  const html = render(
    "@/components/opportunity/OpportunityCardSkeleton",
    "OpportunityListSkeleton",
  );
  assert.match(html, /role="status"/);
  assert.match(html, /Loading opportunities\./);

  /* And says it once, not once per placeholder card. */
  assert.equal(html.match(/role="status"/g)?.length, 1);
});

test("a skeleton is hidden from assistive technology", () => {
  const html = render(
    "@/components/opportunity/OpportunityCardSkeleton",
    "OpportunityCardSkeleton",
  );
  assert.match(html, /aria-hidden="true"/);
});

test("nothing in the loading vocabulary claims an outcome", () => {
  /*
    "Almost there", "just a moment more", a percentage — each is a claim about a
    request in flight that nothing has established. A progress bar is the worst
    of them: it draws a fraction out of nothing.
  */
  const forbidden =
    /\b(almost there|nearly done|just a (?:moment|second) more|success|succeeded|saved!|all set|complete[d]?!)\b/i;
  for (const path of [
    "src/components/ui/state/Skeleton.tsx",
    "src/components/opportunity/OpportunityCardSkeleton.tsx",
    "src/components/opportunity/InspectionSkeleton.tsx",
  ]) {
    assert.equal(forbidden.test(withoutComments(source(path))), false, `${path}`);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   3 · A write, and the four ways it can end.
   ══════════════════════════════════════════════════════════════════════════ */

test("a write that throws is reported as nothing written", async () => {
  const { performWrite } = await import("@/lib/opportunity/pursuit/write");

  let readBackRan = false;
  const outcome = await performWrite({
    write: () => Promise.reject(new Error("network")),
    readBack: () => {
      readBackRan = true;
    },
  });

  assert.deepEqual(outcome, { phase: "failed" });
  /* And the read-back never runs: re-reading after a failed write would show
     the old value as though it were the new one. */
  assert.equal(readBackRan, false);
});

test("a refusal keeps the words the action gave it", async () => {
  const { performWrite, REFUSED_WITHOUT_REASON } = await import("@/lib/opportunity/pursuit/write");

  const said = await performWrite({
    write: async () => ({ recorded: false, limit: "There is nowhere durable to keep it." }),
    readBack: () => {},
  });
  assert.deepEqual(said, {
    phase: "refused",
    because: "There is nowhere durable to keep it.",
  });

  /* A refusal with no reason admits to having none rather than inventing one. */
  const silent = await performWrite({
    write: async () => ({ recorded: false }),
    readBack: () => {},
  });
  assert.deepEqual(silent, { phase: "refused", because: REFUSED_WITHOUT_REASON });
});

test("a write is only settled once it has been read back", async () => {
  const { performWrite } = await import("@/lib/opportunity/pursuit/write");

  const order: string[] = [];
  const outcome = await performWrite({
    write: async () => {
      order.push("write");
      return { recorded: true };
    },
    readBack: () => {
      order.push("read");
    },
  });

  assert.deepEqual(outcome, { phase: "idle" });
  assert.deepEqual(order, ["write", "read"], "the read-back must follow the write");
});

test("written-but-unread is neither success nor failure", async () => {
  const { performWrite } = await import("@/lib/opportunity/pursuit/write");

  /*
    The state that only exists because the two steps were separated. Reported as
    `failed`, a durable declaration is announced as lost. Reported as `idle`, the
    surface shows a position it has no evidence for.
  */
  const readThrew = await performWrite({
    write: async () => ({ recorded: true }),
    readBack: () => {
      throw new Error("could not refresh");
    },
  });
  assert.deepEqual(readThrew, { phase: "stale" });

  /* Same answer when there is no way to read back at all. Not success. */
  const noReader = await performWrite({
    write: async () => ({ recorded: true }),
    readBack: null,
  });
  assert.deepEqual(noReader, { phase: "stale" });
});

/* ══════════════════════════════════════════════════════════════════════════
   4 · A pressed button is a claim about the record.
   ══════════════════════════════════════════════════════════════════════════ */

const CONTROL = "@/components/opportunity/InterestedControl";

function control(pursuit: unknown) {
  return render(CONTROL, "InterestedControl", { entityId: "e1", pursuit, canPersist: true });
}

test("the control's pressed state comes from the record and nothing else", () => {
  const undeclared = control({ state: "undeclared" });
  /* Both buttons unpressed, and undeclared said aloud rather than shown as an
     unchecked box. */
  assert.equal(undeclared.match(/aria-pressed="false"/g)?.length, 2);
  assert.equal(/aria-pressed="true"/.test(undeclared), false);
  assert.match(text(undeclared), /You haven’t said either way\./);

  const declared = control({
    state: "declared",
    declaration: {
      personId: "p1",
      entityId: "e1",
      state: "interested",
      declaredAt: "2026-08-01T09:00:00.000Z",
      declaredBy: "person",
    },
    history: [],
  });
  assert.equal(declared.match(/aria-pressed="true"/g)?.length, 1);
  assert.match(text(declared), /You said you are interested/);
});

test("the control never binds a button's pressed state to a pending intent", () => {
  /*
    The whole invariant in one line of source: `aria-pressed` may only read
    `declared`, which is derived from `pursuit` — the server's answer. If it ever
    reads the in-flight intent, a pressed button starts meaning "a request was
    sent", and the pending sentence below it becomes a decoration.
  */
  const text_ = withoutComments(source("src/components/opportunity/InterestedControl.tsx"));
  const bindings = text_.match(/aria-pressed=\{[^}]*\}/g) ?? [];
  assert.equal(bindings.length, 2);
  for (const binding of bindings) {
    assert.match(binding, /^aria-pressed=\{declared === "(interested|not-interested)"\}$/);
  }

  /* And `declared` itself comes from the record. */
  assert.match(
    text_,
    /const declared = pursuit\.state === "declared" \? pursuit\.declaration\.state : null;/,
  );
});

test("a declared button does not look like a hovered one", () => {
  /*
    Found in a browser, not in a diff. "Not for me" declared and "Not for me"
    under the cursor were the same two properties, so an undeclared button with
    the mouse resting on it was pixel-identical to a declared one — and the mouse
    rests there most naturally right after pressing it, which on a *failed* write
    is exactly where the surface must not suggest a position was taken.

    Hover may suggest. Only the record may assert, so the declared state carries
    something hover does not.
  */
  const declaredFill = /declared === "not-interested"\s*\?\s*"([^"]+)"\s*:\s*"([^"]+)"/.exec(
    withoutComments(source("src/components/opportunity/InterestedControl.tsx")),
  );
  assert.ok(declaredFill, "could not find the not-interested styling");

  const [, whenDeclared, whenNot] = declaredFill;
  const hoverOnly = whenNot
    .split(/\s+/)
    .filter((c) => c.startsWith("hover:"))
    .map((c) => c.slice("hover:".length));

  const beyondHover = whenDeclared
    .split(/\s+/)
    .filter((c) => !hoverOnly.includes(c) && !whenNot.includes(c));
  assert.ok(
    beyondHover.length > 0,
    "the declared state is reachable by hovering an undeclared button",
  );
});

test("a pending write says outright that nothing is kept yet", () => {
  /*
    "Saving…" on its own invites a reader to treat the outcome as settled and
    look away. The second clause is what makes the pending state distinguishable
    from success, so it is the part under test.
  */
  const text_ = withoutComments(source("src/components/opportunity/InterestedControl.tsx"));
  assert.match(text_, /Nothing is kept until I’ve confirmed it\./);
  assert.match(text_, /\{saving \?/);
});

test("a failed write restates what is still recorded", () => {
  /*
    Not a cleared control and not a half-pressed button. A person who has just
    seen an error is exactly the person about to guess, so the position that is
    still recorded is stated again beside the failure.
  */
  const text_ = withoutComments(source("src/components/opportunity/InterestedControl.tsx"));
  assert.match(text_, /nothing was recorded\. \{stillTrue\}/);
  assert.match(text_, /You still haven’t said either way\./);
  assert.match(text_, /position is still/);
});

/* ══════════════════════════════════════════════════════════════════════════
   5 · A failure to look is not a finding.
   ══════════════════════════════════════════════════════════════════════════ */

test("a surface error always carries what is still true", () => {
  /*
    `stillTrue` is a required prop, which is the enforcement — an error cannot be
    rendered without the half that keeps it from reading as an absence. This
    checks the type says so, and that the component actually renders it.
  */
  const text_ = source("src/components/ui/state/SurfaceError.tsx");
  assert.match(text_, /\n {2}stillTrue: string;/, "stillTrue must not be optional");
  assert.equal(/stillTrue\?:/.test(text_), false);

  const html = render("@/components/ui/state/SurfaceError", "SurfaceError", {
    what: "I couldn’t read the record.",
    stillTrue: "This is a failure to look, not a finding.",
  });
  assert.match(text(html), /I couldn’t read the record\./);
  assert.match(text(html), /This is a failure to look, not a finding\./);
});

test("an error is announced, and does not claim the world is empty", () => {
  const html = render("@/components/ui/state/SurfaceError", "SurfaceError", {
    what: "I couldn’t read what you’ve saved.",
    stillTrue: "Nothing has been lost.",
  });
  assert.match(html, /role="alert"/);

  /* The vocabulary of a finding, in a component that has not made one. */
  const said = text(html);
  for (const claim of [/\bno opportunities\b/i, /\bnot found\b/i, /\bnothing (?:was )?found\b/i]) {
    assert.equal(claim.test(said), false, `an error must not say ${claim}`);
  }
});

test("a retry is offered only where retrying could work", () => {
  /*
    A button that cannot succeed teaches people that this product's buttons are
    decoration. Where the failure is environmental the honest answer is a
    sentence, so `onRetry` is optional and its absence removes the control.
  */
  const withRetry = render("@/components/ui/state/SurfaceError", "SurfaceError", {
    what: "x",
    stillTrue: "y",
    onRetry: undefined,
  });
  assert.equal(/<button/.test(withRetry), false, "no retry handler must mean no retry button");
});

test("every failing route surface states what is still true", () => {
  /*
    The prop being required makes it present; this checks it is not present as a
    placeholder. Each route's `stillTrue` must actually deny the reading that
    failure equals absence.
  */
  for (const path of ROUTES) {
    const text_ = withoutComments(source(path));
    const match = text_.match(/stillTrue="([^"]+)"/);
    assert.ok(match, `${path}: no stillTrue on its SurfaceError`);
    assert.ok(match[1].length > 60, `${path}: stillTrue is too short to say anything`);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   6 · "I could not check" is not "you are signed out".
   ══════════════════════════════════════════════════════════════════════════ */

test("a network failure while checking the session is not a signed-out answer", async () => {
  const { classifySessionCheck } = await import("@/lib/session-verification");
  const { AuthRetryableFetchError } = await import("@supabase/supabase-js");

  /*
    The gate read `if (error || !data.user) redirect("/auth")`, so an unreachable
    auth service told the person they were signed out — an assertion about their
    account with nothing behind it. Signing in again fails the same way, so the
    product manufactured a loop out of a network blip.
  */
  const offline = classifySessionCheck(new AuthRetryableFetchError("fetch failed", 0), null);
  assert.equal(offline.outcome, "unverifiable");
  assert.ok(offline.outcome === "unverifiable" && offline.because.length > 0);

  /* A `fetch` that never reached supabase-js at all: same fact, same answer,
     rather than falling through to "signed out" as the residual case. */
  assert.equal(
    classifySessionCheck(new TypeError("Failed to fetch"), null).outcome,
    "unverifiable",
  );
});

test("a rejected token is a signed-out answer", async () => {
  const { classifySessionCheck } = await import("@/lib/session-verification");
  const { AuthApiError } = await import("@supabase/supabase-js");

  /* Asked and answered. A redirect to sign in is truthful here, and the point of
     the distinction is that it stays available rather than being softened. */
  assert.deepEqual(classifySessionCheck(new AuthApiError("invalid claim", 401, "bad_jwt"), null), {
    outcome: "signed-out",
  });
  assert.equal(classifySessionCheck(null, null).outcome, "signed-out");
  assert.equal(classifySessionCheck(null, { id: "u1" }).outcome, "signed-in");
});

test("the gate acts on the classification rather than on truthiness", async () => {
  const text_ = withoutComments(source("src/routes/_authenticated/route.tsx"));

  /* The exact shape of the defect, excluded. */
  assert.equal(
    /if \(error \|\| !data\.user\)/.test(text_),
    false,
    "the gate is back to collapsing a failed check into a signed-out answer",
  );
  /*
    The gate must go through the classifier, whatever the classifier is currently
    called. This named `classifySessionCheck` until Phase 17 put a deadline in
    front of it — the check now runs inside `verifySession`, which classifies the
    answer *and* bounds how long it will wait for one. Either is acceptable here;
    a gate that inspects `error` and `user` itself is not.
  */
  assert.match(text_, /verifySession\(|classifySessionCheck\(/);
  assert.match(text_, /check\.outcome === "unverifiable"/);
  assert.match(text_, /check\.outcome === "signed-out"/);

  /*
    And the unverifiable branch must not redirect. A redirect to `/auth` *is* the
    claim "you are signed out", however gently it is worded on arrival.
  */
  const unverifiable = text_.slice(
    text_.indexOf('check.outcome === "unverifiable"'),
    text_.indexOf('check.outcome === "signed-out"'),
  );
  assert.equal(/redirect\(/.test(unverifiable), false);
});

test("an unverifiable session is still refused entry", async () => {
  /*
    The other half, and the one a fix like this can quietly break: saying "I
    can't tell" must not become "so I'll let you in". Nothing below the gate
    renders — the branch throws instead of returning a context.
  */
  const text_ = withoutComments(source("src/routes/_authenticated/route.tsx"));
  assert.match(text_, /throw new SessionUnverifiable\(check\.because\)/);

  const { isSessionUnverifiable, SessionUnverifiable } = await import("@/lib/session-verification");
  assert.equal(isSessionUnverifiable(new SessionUnverifiable("x")), true);
  /* Recognised across a serialisation boundary, where `instanceof` is lost. */
  assert.equal(isSessionUnverifiable({ name: "SessionUnverifiable" }), true);
  assert.equal(isSessionUnverifiable(new Error("something else")), false);
});

/* ══════════════════════════════════════════════════════════════════════════
   7 · The laboratory can still show every one of these.
   ══════════════════════════════════════════════════════════════════════════ */

test("the state laboratory covers each state the product can be in", () => {
  /*
    A state that cannot be reached on demand is a state nobody has looked at, and
    the pending and failure branches are exactly the ones that never appear
    during ordinary use on a fast machine with a working database.
  */
  const states = withoutComments(source("src/routes/lab.states.tsx"));
  for (const specimen of [
    "Unknown",
    "Absent",
    "Empty",
    "Loading",
    "Failed",
    "Failed, with nothing to do about it",
    "Partly available",
    "Session unverifiable",
  ]) {
    assert.match(states, new RegExp(`name="${specimen.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }

  const mutations = withoutComments(source("src/routes/lab.mutations.tsx"));
  for (const specimen of [
    "Pending, then confirmed",
    "The write fails",
    "The system refuses",
    "Written, and not shown",
    "Slow, and honest about it",
  ]) {
    assert.match(mutations, new RegExp(`name="${specimen}"`));
  }
});

test("the mutation laboratory drives the real control", () => {
  /*
    A laboratory that reimplemented the control would demonstrate the
    laboratory's honesty rather than the product's. Only the store behind it is
    substituted.
  */
  const text_ = withoutComments(source("src/routes/lab.mutations.tsx"));
  assert.match(
    text_,
    /import \{ InterestedControl \} from "@\/components\/opportunity\/InterestedControl"/,
  );
  assert.equal(/useState<Write>|phase: "saving"/.test(text_), false);

  /*
    And the visible position may only move through the read-back. If the
    laboratory could set it from an action, it would be capable of demonstrating
    exactly the optimism the page exists to rule out.
  */
  assert.equal(text_.match(/setShown\(/g)?.length, 1);
  assert.match(text_, /async function onWritten\(\)[\s\S]*?setShown\(stored\.current\)/);
});
