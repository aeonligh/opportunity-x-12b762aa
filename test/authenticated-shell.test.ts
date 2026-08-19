import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * PHASE 19 — THE SHELL, AND KNOWING THAT A SESSION ACTUALLY ENDED
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A sign-out is a write, and this product does not call a write confirmed until
 * a read confirms it. The declaration control has worked that way since Phase
 * 15; the session had no way to be ended at all until now, so it had no such
 * rule. These hold it.
 *
 * The stakes are higher here than for a declaration. "You have been signed out",
 * said falsely on a shared machine, is how somebody else reads your saved
 * opportunities.
 */

function src(path: string): string {
  return readFileSync(path, "utf8");
}
function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** The shell, rendered at a location by a real router. See `render-shell.ts`. */
function shellAt(path: string): string {
  return execFileSync(
    process.execPath,
    ["--import", "./test/register.mjs", "test/render-shell.ts", path],
    { encoding: "utf8" },
  );
}

const present = async () => ({ user: { id: "p", email: "you@example.test" }, error: null });
const gone = async () => ({ user: null, error: null });

/* ══════════════════════════════════════════════════════════════════════════
   The sign-out machine
   ══════════════════════════════════════════════════════════════════════════ */

test("a sign-out is confirmed by reading the session, not by the request returning", async () => {
  const { performSignOut } = await import("@/lib/sign-out");

  const confirmed = await performSignOut({
    signOut: async () => ({ error: null }),
    readSession: gone,
  });
  assert.deepEqual(confirmed, { outcome: "signed-out" });

  /*
    The mirror, and the one a caller would get wrong. A request that returns
    cleanly while the session is still readable is not a success — it is the
    write-succeeded-read-disagrees case, and the honest report is that the
    person is still signed in.
  */
  const stillThere = await performSignOut({
    signOut: async () => ({ error: null }),
    readSession: present,
  });
  assert.equal(stillThere.outcome, "failed", "a clean request was believed over the session");
  assert.match("because" in stillThere ? stillThere.because : "", /still signed in/i);
});

test("a request that failed while the session ended anyway is a sign-out", async () => {
  /*
    `signOut()` can reject while the server has already ended the session — a
    response lost coming back, a socket closed after the row was deleted.
    Reporting failure there leaves someone believing they are still signed in
    when they are not, which is the same lie inverted.
  */
  const { performSignOut } = await import("@/lib/sign-out");

  const result = await performSignOut({
    signOut: async () => ({ error: new Error("connection closed") }),
    readSession: gone,
  });
  assert.deepEqual(result, { outcome: "signed-out" }, "the read did not get the final word");
});

test("a failed sign-out says the session is still there, and never that it ended", async () => {
  const { performSignOut } = await import("@/lib/sign-out");

  const failed = await performSignOut({
    signOut: async () => ({ error: new Error("network") }),
    readSession: present,
  });

  assert.equal(failed.outcome, "failed");
  const because = "because" in failed ? failed.because : "";
  assert.match(because, /couldn’t end your session/i);
  /* The sentence that must never appear on this branch. */
  assert.equal(/signed out|signed-out/i.test(because), false, `a failure says: ${because}`);
});

test("a sign-out that cannot be checked is unverifiable, never signed out", async () => {
  /*
    The same distinction the authenticated gate holds. "I could not end your
    session" is a claim about the session; "I could not check" is a claim about
    this system. Only a confirmed sign-out may send someone to /auth.
  */
  const { performSignOut } = await import("@/lib/sign-out");

  const result = await performSignOut(
    {
      signOut: async () => ({ error: new Error("offline") }),
      readSession: async () => {
        throw new TypeError("Failed to fetch");
      },
    },
    { deadlineMs: 200 },
  );

  assert.equal(result.outcome, "unverifiable", "an unreadable session was resolved to an answer");
  assert.match("because" in result ? result.because : "", /couldn’t reach|check whether/i);
});

test("a session read that never answers does not leave the control waiting", async () => {
  const { performSignOut } = await import("@/lib/sign-out");

  const began = Date.now();
  const result = await performSignOut(
    {
      signOut: async () => ({ error: null }),
      readSession: () => new Promise(() => {}),
    },
    { deadlineMs: 60 },
  );
  const took = Date.now() - began;

  assert.equal(result.outcome, "unverifiable");
  assert.ok(took < 2000, `the read-back was unbounded (${took}ms)`);
});

test("the machine always reads back, whatever the request reported", async () => {
  /*
    Skipping the read when the request looked fine is exactly how "we asked"
    becomes "it happened". Counted rather than inspected: the read must be made
    on both paths.
  */
  const { performSignOut } = await import("@/lib/sign-out");

  let reads = 0;
  const counting = async () => {
    reads += 1;
    return { user: null, error: null };
  };

  await performSignOut({ signOut: async () => ({ error: null }), readSession: counting });
  assert.equal(reads, 1, "a clean request skipped the read-back");

  await performSignOut({ signOut: async () => ({ error: new Error("x") }), readSession: counting });
  assert.equal(reads, 2, "a failed request skipped the read-back");
});

/* ══════════════════════════════════════════════════════════════════════════
   The control
   ══════════════════════════════════════════════════════════════════════════ */

test("only a confirmed sign-out may navigate, forget, or re-run the gate", () => {
  /*
    Ordering, which no rendered output can show. Three things happen on the
    confirmed branch and they must happen there and nowhere else:

      forgetEverythingLastGood()  — `last-good` holds whatever each surface last
                                    successfully showed. Across a sign-out that
                                    stops being a safeguard and becomes a leak:
                                    the next person to sign in on this tab would
                                    see the previous person's list the first time
                                    a read failed. Phase 17 wrote the forget
                                    function for this moment and recorded that
                                    nothing called it yet.
      router.invalidate()         — so the gate re-evaluates and nothing
                                    authenticated survives the transition.
      navigate({ to: "/auth" })   — last.
  */
  const code = withoutComments(src("src/components/shell/AccountControl.tsx"));

  const guard = code.indexOf('result.outcome !== "signed-out"');
  assert.ok(guard > 0, "the control no longer separates confirmed from unconfirmed");

  for (const effect of [
    "forgetEverythingLastGood()",
    "router.invalidate()",
    'navigate({ to: "/auth"',
  ]) {
    const at = code.indexOf(effect);
    assert.ok(at > guard, `${effect} runs before the outcome is known to be a sign-out`);
  }

  /* And the order among them: forget, then re-gate, then leave. */
  assert.ok(
    code.indexOf("forgetEverythingLastGood()") < code.indexOf("router.invalidate()"),
    "the gate re-runs before this session's preserved content is forgotten",
  );
});

test("the sign-out control cannot be pressed twice", () => {
  /*
    One press must not start a second sign-out against a session the first may
    already have ended. Both the primary control and the retry are covered,
    because the retry is the one that gets pressed repeatedly.
  */
  const code = withoutComments(src("src/components/shell/AccountControl.tsx"));

  /*
    Counted rather than matched per tag. The obvious regex — `<button[\s\S]*?>`
    — is non-greedy and stops at the first `>`, which in this file is the arrow
    inside `onClick={() =>`. It reported every button as missing its guard while
    both had one. JSX cannot be tag-matched with a regex, so the invariant is
    expressed as a count instead: every button in this file guards on the same
    pending flag.

    The pending state itself is proven in the browser walk, by pressing the slow
    specimen and reading the attributes off the live control.
  */
  const buttons = (code.match(/<button\b/g) ?? []).length;
  const disabled = (code.match(/aria-disabled=\{pending\}/g) ?? []).length;
  const busy = (code.match(/aria-busy=\{pending\}/g) ?? []).length;

  assert.ok(buttons >= 2, `expected the control and its retry, found ${buttons}`);
  assert.equal(
    disabled,
    buttons,
    `${buttons - disabled} sign-out control(s) never announce being unavailable`,
  );

  /*
    `aria-disabled` keeps the control focusable — measured: `disabled` blurred
    it and dropped the person at the top of the document when a keyboard-driven
    sign-out failed. The double-press it stops preventing at the platform level
    has to be refused in the handler instead, or the guard is simply gone.
  */
  assert.equal(/\sdisabled=\{pending\}/.test(code), false, "a control blurs itself while pending");
  assert.match(code, /if \(pending\) return;/, "nothing refuses a second press");
  assert.equal(busy, buttons, `${buttons - busy} sign-out control(s) never announce being busy`);
});

/* ══════════════════════════════════════════════════════════════════════════
   The shell
   ══════════════════════════════════════════════════════════════════════════ */

test("the shell marks exactly one current destination, and the right one", () => {
  /*
    Rendered against a real router over the real generated route tree, because
    the marking is computed by `Link` from the router's location. Asserting
    `activeProps` from source would check the spelling, not that a person on
    /saved is told they are on Saved.
  */
  for (const [path, expected] of [
    ["/opportunities", "/opportunities"],
    ["/opportunities/abc-123", "/opportunities"],
    ["/opportunities/examples", "/opportunities"],
    ["/saved", "/saved"],
  ] as const) {
    const html = shellAt(path);
    const current = [...html.matchAll(/<a[^>]*aria-current="page"[^>]*>/g)];
    assert.equal(current.length, 1, `${path}: ${current.length} destinations marked current`);
    assert.match(current[0][0], new RegExp(`href="${expected}"`), `${path}: marked the wrong one`);
  }
});

test("the current destination is not carried by colour alone", () => {
  /*
    CR-17 puts accessibility beside beauty rather than after it. A current-page
    state expressed only as an accent hue is gone under forced colours and for
    anyone who cannot separate the two — so it is an underline *and* an
    attribute, and the attribute is what a screen reader reads.
  */
  const html = shellAt("/saved");
  const active = html.match(/<a[^>]*aria-current="page"[^>]*>/)?.[0] ?? "";
  assert.match(active, /aria-current="page"/);
  assert.match(active, /underline/, "the current destination has no non-colour treatment");
});

test("the shell offers both destinations and a way out, and nothing else", () => {
  /*
    Pinned deliberately. A shell is the easiest place in a product for chrome to
    accumulate without anyone deciding that it should, and CR-13 makes attention
    the scarce resource. Two destinations, one account control. A third link
    appearing here should be a decision, not a diff.
  */
  const html = shellAt("/opportunities");
  const nav = html.match(/<nav[^>]*aria-label="Opportunity X"[\s\S]*?<\/nav>/)?.[0] ?? "";
  assert.ok(nav, "the shell has no named navigation landmark");

  const hrefs = [...nav.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(
    [...new Set(hrefs)].sort(),
    ["/opportunities", "/saved"],
    `the shell navigates to: ${hrefs.join(", ")}`,
  );

  assert.match(html, /Sign out/, "the shell offers no way out");
  /* No counts or badges: a number beside Saved invites checking it, and CR-04
     is explicit that success is never engagement. */
  assert.equal(/aria-label="[^"]*\d+[^"]*saved/i.test(html), false, "the shell has grown a count");
});

test("no authenticated chrome renders before the session is known", () => {
  /*
    The shell is the gate's `component`, which the router reaches only after
    `beforeLoad` returned a signed-in context. While the check is in flight the
    route shows its pending component, and on either failing outcome it shows
    the session boundary — neither renders the shell. That ordering is the whole
    of the requirement, so it is the thing asserted.
  */
  const gate = withoutComments(src("src/routes/_authenticated/route.tsx"));

  assert.match(gate, /component:\s*Authenticated/, "the gate no longer owns what renders");
  assert.match(gate, /<AppShell/, "the shell is not rendered by the gate");
  assert.match(gate, /pendingComponent:.*BrandLoader/s, "the gate has no pending treatment");

  /* The boundary must not render the shell either. */
  const boundary = gate.slice(gate.indexOf("function SessionBoundary"));
  assert.equal(
    /<AppShell/.test(boundary),
    false,
    "an unverified session renders authenticated chrome",
  );
});

test("the shell is the only peer navigation, and leaves keep their own way back", () => {
  /*
    The friction this shell exists to remove (CR-16) was two peer surfaces with
    no consistent way between them: `/saved` carried "← Opportunities" while
    `/opportunities` carried "What you've saved", so the same pair looked like a
    parent and a child depending on where you stood. Peer navigation now lives
    in one place.

    A leaf keeps its contextual return, which is a different thing: `$id` and
    `examples` are reached *from* the list and return *to* it, and that link sits
    beside the content rather than at the top of the page.
  */
  for (const list of [
    "src/routes/_authenticated/opportunities.tsx",
    "src/routes/_authenticated/saved.tsx",
  ]) {
    const code = withoutComments(src(list));
    const peers = [...code.matchAll(/to="\/(opportunities|saved)"/g)].map((m) => m[0]);
    assert.deepEqual(peers, [], `${list} still hand-rolls peer navigation: ${peers.join(", ")}`);
  }

  for (const leaf of [
    "src/routes/_authenticated/opportunities.$id.tsx",
    "src/routes/_authenticated/opportunities.examples.tsx",
  ]) {
    assert.match(
      withoutComments(src(leaf)),
      /to="\/opportunities"/,
      `${leaf} lost the way back to the list it was reached from`,
    );
  }
});
