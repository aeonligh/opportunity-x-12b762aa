import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * THE SIGN-IN DOOR MUST NOT BLAME THE PASSWORD FOR THE NETWORK
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Phase 11 taught the authenticated *gate* to tell "your token was rejected"
 * from "I could not reach the service". The sign-in *form* still collapsed
 * every failure into one `catch` and showed whatever string the library carried.
 *
 * The consequence is specific: a person on a bad connection is told their
 * password is wrong, retypes a correct password, and is told it is wrong again.
 * The product makes a confident claim about something it never established, on
 * the one surface where being wrong locks someone out of their own account.
 *
 * These run the classifier directly. It is a pure function precisely so that the
 * branch a person lands in can be proved without a browser and without a network.
 */

test("an unreachable auth service never blames the password", async () => {
  const { classifyAuthFailure } = await import("@/lib/auth-outcome");
  const { AuthRetryableFetchError } = await import("@supabase/supabase-js");

  for (const error of [
    new AuthRetryableFetchError("fetch failed", 0),
    new TypeError("Failed to fetch"),
  ]) {
    const outcome = classifyAuthFailure(error);
    assert.equal(outcome.kind, "unreachable", `${error.constructor.name} misclassified`);
    assert.equal(outcome.retryable, true);

    /* The sentence that must be there, and the ones that must not. */
    assert.match(outcome.stillTrue, /says nothing about your password/i);
    for (const wrong of [/don’t match/i, /incorrect/i, /invalid/i]) {
      assert.equal(
        wrong.test(`${outcome.what} ${outcome.stillTrue} ${outcome.whatYouCanDo}`),
        false,
        `an unreachable service must not say ${wrong}`,
      );
    }
  }
});

test("a rejection is the only branch allowed to blame the password", async () => {
  const { classifyAuthFailure } = await import("@/lib/auth-outcome");
  const { AuthApiError } = await import("@supabase/supabase-js");

  const outcome = classifyAuthFailure(
    new AuthApiError("Invalid login credentials", 400, "invalid_credentials"),
  );
  assert.equal(outcome.kind, "rejected");
  /* Retry is not offered, because retrying the same password cannot help. */
  assert.equal(outcome.retryable, false);
  assert.match(outcome.what, /don’t match an account/);
  /* And it says the service answered — the thing that makes it an answer. */
  assert.match(outcome.stillTrue, /did reach the service/i);
});

test("the branches a naive catch would have merged stay separate", async () => {
  const { classifyAuthFailure } = await import("@/lib/auth-outcome");
  const { AuthApiError } = await import("@supabase/supabase-js");

  const kinds = new Set(
    [
      new AuthApiError("Email not confirmed", 400, "email_not_confirmed"),
      new AuthApiError("Request rate limit reached", 429, "over_request_rate_limit"),
      new Error("Session did not become available"),
      new AuthApiError("Invalid login credentials", 400, "invalid_credentials"),
    ].map((e) => classifyAuthFailure(e).kind),
  );

  assert.deepEqual(
    [...kinds].sort(),
    ["no-session", "rate-limited", "rejected", "unconfirmed"],
    "two failures that need different advice landed in the same branch",
  );
});

test("every outcome answers all three questions, in the product's voice", async () => {
  const { classifyAuthFailure } = await import("@/lib/auth-outcome");
  const { AuthApiError, AuthRetryableFetchError } = await import("@supabase/supabase-js");

  const outcomes = [
    classifyAuthFailure(new AuthRetryableFetchError("x", 0)),
    classifyAuthFailure(new AuthApiError("Email not confirmed", 400, "e")),
    classifyAuthFailure(new AuthApiError("rate limit", 429, "e")),
    classifyAuthFailure(new Error("Session did not become available")),
    classifyAuthFailure(new AuthApiError("Invalid login credentials", 400, "e")),
  ];

  for (const o of outcomes) {
    for (const part of [o.what, o.stillTrue, o.whatYouCanDo]) {
      assert.ok(part.length > 15, `${o.kind}: "${part}" is too short to say anything`);
    }
    /* No implementation detail may reach a person. */
    const all = `${o.what} ${o.stillTrue} ${o.whatYouCanDo}`;
    for (const leak of [
      /AuthApiError/,
      /AuthRetryableFetchError/,
      /PGRST/,
      /[A-Z]{3,}_[A-Z]{3,}/,
    ]) {
      assert.equal(leak.test(all), false, `${o.kind} leaks ${leak}`);
    }
  }
});

test("the form renders the outcome and no longer stringifies the error", () => {
  /*
    The specific regression: `toast.error(err.message)` put an auth library's
    internal sentence in front of a person and made every failure look alike.
    Also that it is not a toast — a transient message is the wrong surface for
    something someone needs to read while retyping the form it refers to.
  */
  const source = readFileSync("src/routes/auth.tsx", "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  assert.match(code, /classifyAuthFailure\(err\)/);
  assert.equal(
    /toast\.error\([^)]*err(or)?\b/.test(code),
    false,
    "an error object is being stringified into a toast again",
  );
  /*
    Rendered persistently, and announced — with the severity following the
    outcome's own tone rather than being fixed.

    `role="alert"` interrupts whatever a screen reader is doing. That is right
    for a failure and wrong for "your sign-up worked, go and confirm your
    email", which is now one of the things this card carries: announcing that
    as an alert tells somebody their account was not created when it was, in
    exactly the way the red border would.
  */
  assert.match(
    code,
    /role=\{failure\.tone === "problem" \? "alert" : "status"\}/,
    "the announcement severity no longer follows the outcome's tone",
  );
  assert.match(code, /failure\.what/);
  assert.match(code, /failure\.stillTrue/);
  assert.match(code, /failure\.whatYouCanDo/);
});

test("a refresh in flight is stated, and does not replace what is known", () => {
  /*
    The state nothing modelled: a loader re-running underneath content that is
    already rendered. Pressing Interested writes and then invalidates, and for
    the length of that read the page showed the previous answer as though it were
    current.

    A skeleton would be wrong here — it would destroy valid information to report
    that fresher information is coming. The rule is keep what is known and say
    what is happening beside it, so this asserts the component reads the router's
    own in-flight signal and renders a line rather than a placeholder.
  */
  const source = readFileSync("src/components/ui/state/Refreshing.tsx", "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  assert.match(code, /useRouterState\(\{\s*select:\s*\(state\)\s*=>\s*state\.isLoading/);
  assert.match(code, /aria-live="polite"/);
  assert.match(code, /the last answer I had/);
  /* No skeleton, and a fixed-height row so its arrival shifts nothing. */
  assert.equal(/Skeleton/.test(code), false);
  assert.match(code, /h-5/);

  /* And both list surfaces use it. */
  for (const route of [
    "src/routes/_authenticated/opportunities.tsx",
    "src/routes/_authenticated/saved.tsx",
  ]) {
    assert.match(
      readFileSync(route, "utf8"),
      /<Refreshing what=/,
      `${route} does not report refreshes`,
    );
  }
});
