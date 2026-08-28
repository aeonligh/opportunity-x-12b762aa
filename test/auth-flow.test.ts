import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * A SIGN-UP THAT WORKED MUST NOT BE REPORTED AS A FAILURE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The defect these exist for, stated exactly:
 *
 *     const { error } = await supabase.auth.signUp({ ... });
 *     if (error) throw error;
 *     const ok = await waitForSession(6000);
 *     if (!ok) throw new Error(SESSION_NEVER_ARRIVED);
 *
 * `data` was discarded. That is only safe if a sign-up which does not throw
 * always produces a session, and on this project it never does: email
 * confirmation is enabled — proven from the single row in `auth.users`, whose
 * `confirmation_sent_at` precedes its `email_confirmed_at` by three minutes —
 * so `signUp` succeeds and returns `session: null` by design.
 *
 * Every successful sign-up therefore polled for six seconds and then told the
 * person "Your details were accepted, and the session didn't arrive." The
 * account had been created. The product reported a fault.
 *
 * These are pure-function tests wherever the behaviour is in a pure function,
 * and source assertions where the behaviour is in a React component the suite
 * cannot render (it runs under `--conditions=react-server`, where importing a
 * route pulls in `react-dom` and fails). The source assertions are pinned to
 * mechanisms rather than to formatting, so a rewrite that keeps the property
 * keeps them green and a rewrite that drops it does not.
 */

const AUTH_ROUTE = "src/routes/auth.tsx";
const OUTCOME_MODULE = "src/lib/auth-outcome.ts";

function source(path: string): string {
  return readFileSync(path, "utf8");
}
function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/* ══════════════════════════════════════════════════════════════════════════
   The sign-up response is read
   ══════════════════════════════════════════════════════════════════════════ */

test("a sign-up awaiting confirmation is a notice, not a lost session", async () => {
  const { classifySignUp } = await import("@/lib/auth-outcome");

  const reading = classifySignUp({ user: { id: "u1" }, session: null });
  assert.equal(reading.established, false);
  assert.equal(reading.established === false && reading.outcome.kind, "confirm-email");
  assert.equal(
    reading.established === false && reading.outcome.tone,
    "notice",
    "a sign-up that worked is being presented as a problem",
  );

  const copy =
    reading.established === false
      ? `${reading.outcome.what} ${reading.outcome.stillTrue} ${reading.outcome.whatYouCanDo}`
      : "";
  /* The exact sentences a person saw instead, and must not see again. */
  assert.equal(/\bsession\b/i.test(copy), false, `the session vocabulary survived: "${copy}"`);
  assert.equal(/didn’t arrive|did not arrive/i.test(copy), false);
  /* And it says the one thing that is actually actionable. */
  assert.match(copy, /email/i);
  assert.match(copy, /sign in/i);
});

test("a sign-up that returns a session needs no message at all", async () => {
  const { classifySignUp } = await import("@/lib/auth-outcome");
  const reading = classifySignUp({ user: { id: "u1" }, session: { access_token: "t" } });
  assert.equal(reading.established, true);
  assert.equal("outcome" in reading, false, "a working sign-up carries something to show");
});

test("a sign-up that returns neither an account nor a refusal says so", async () => {
  const { classifySignUp } = await import("@/lib/auth-outcome");
  const reading = classifySignUp({ user: null, session: null });
  assert.equal(reading.established === false && reading.outcome.kind, "signup-uncertain");
  /*
    The temptation here is to pick the comfortable answer — "account created" —
    because it is the more common case. An unrecognised response is not evidence
    for either outcome, and this is the one branch whose whole job is to say so.
  */
  assert.match(
    reading.established === false ? reading.outcome.stillTrue : "",
    /can’t tell you|cannot tell you/i,
  );
});

test("reading the sign-up response cannot reveal whether an address already has an account", async () => {
  const { classifySignUp } = await import("@/lib/auth-outcome");

  /*
    Supabase answers a sign-up for an address that already belongs to a
    confirmed account with an obfuscated user object and no session — the same
    shape as a genuinely new sign-up. Their documentation is explicit that this
    "prevents user enumeration attacks". The tell is an empty `identities`
    array.

    Anyone can type an address into this form. Reading that tell would hand
    back, on demand, the answer Supabase spent the design withholding — so the
    two cases must produce one identical outcome, and the code must not be
    looking.
  */
  const fresh = classifySignUp({
    user: { id: "u1", identities: [{ id: "i1" }] } as { id: string },
    session: null,
  });
  const obfuscated = classifySignUp({
    user: { id: "u2", identities: [] } as { id: string },
    session: null,
  });

  assert.deepEqual(fresh, obfuscated, "the two sign-up cases are told apart");

  const copy =
    fresh.established === false
      ? `${fresh.outcome.what} ${fresh.outcome.stillTrue} ${fresh.outcome.whatYouCanDo}`
      : "";
  /* And the wording commits to neither. */
  for (const claim of [
    /account (was |has been )?created/i,
    /that address is (already )?(taken|registered|in use)/i,
    /\bnew account\b/i,
  ]) {
    assert.equal(claim.test(copy), false, `the sign-up notice asserts ${claim}: "${copy}"`);
  }

  /*
    Existence may be *mentioned*, and only hypothetically. "If you already have
    an account with this address, sign in instead" is the single most useful
    sentence on this card — it is what the person in the original screenshots
    needed — and it leaks nothing, because it holds equally for somebody who
    does not. The same words without the "If" would be an answer.
  */
  for (const mention of [...copy.matchAll(/[^.!?]*already (have|belongs)[^.!?]*/gi)]) {
    assert.match(
      mention[0],
      /\bIf\b|won’t tell you|isn’t mine to give/i,
      `the notice states account existence rather than supposing it: "${mention[0].trim()}"`,
    );
  }

  /* The mechanism, not just the output: nothing in the reader touches identities. */
  const reader = withoutComments(source(OUTCOME_MODULE));
  const body = reader.slice(reader.indexOf("export function classifySignUp"));
  assert.equal(
    /identities/.test(body),
    false,
    "classifySignUp inspects identities — that is the enumeration oracle",
  );
});

test("the form reads the sign-up response instead of waiting for a session that is not coming", () => {
  const code = withoutComments(source(AUTH_ROUTE));

  /* `data` is captured, not discarded. */
  assert.match(
    code,
    /const \{ data, error \} = await supabase\.auth\.signUp\(/,
    "the sign-up response is being discarded again",
  );
  assert.match(code, /classifySignUp\(data\)/, "the sign-up response is captured but not read");

  /*
    And the wait is skipped when no session was established. Pinned by
    ordering: the reading has to be consulted, and it has to be able to return,
    before the polling loop is reached.
  */
  const reading = code.indexOf("classifySignUp(data)");
  const wait = code.indexOf("waitForSession(6000)");
  assert.ok(reading > 0 && wait > reading, "the response is read after the wait, or not at all");
  assert.match(
    code.slice(reading, wait),
    /if \(!reading\.established\) \{[\s\S]*?return;\s*\}/,
    "a sign-up with no session still falls through to the session wait",
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   No outcome claims more than it knows
   ══════════════════════════════════════════════════════════════════════════ */

test("a lost session no longer claims the account is untouched", async () => {
  const { classifyAuthFailure } = await import("@/lib/auth-outcome");
  const outcome = classifyAuthFailure(new Error("Session did not become available"));
  assert.equal(outcome.kind, "no-session");

  /*
    It said: "Nothing is wrong with your account, and nothing was changed."

    A client that has just failed to establish a session knows neither. It has
    no view of the account, and where the attempt was a sign-up something was
    very much changed. Both halves were assertions dressed as reassurance.
  */
  const copy = `${outcome.what} ${outcome.stillTrue} ${outcome.whatYouCanDo}`;
  assert.equal(
    /nothing was changed|nothing is wrong with your account/i.test(copy),
    false,
    `an unprovable reassurance is back: "${copy}"`,
  );
  /* What it may say is what was actually established: the details got through. */
  assert.match(outcome.stillTrue, /did not refuse|accepted/i);
});

/* ══════════════════════════════════════════════════════════════════════════
   Every state the person can land in is a different state
   ══════════════════════════════════════════════════════════════════════════ */

test("the thirteen outcomes that need different advice are thirteen outcomes", async () => {
  const { classifyAuthFailure, classifySignUp, classifyCallbackError } =
    await import("@/lib/auth-outcome");
  const { validateCredentials } = await import("@/lib/auth-input");
  const { AuthApiError, AuthRetryableFetchError } = await import("@supabase/supabase-js");

  /*
    The point of this suite. One `catch` reported all of these identically, and
    the advice a person needs differs in every row: retype something, wait,
    check an inbox, do nothing because it is not your fault, or stop because
    retrying cannot help.

    A retryable network fault and a non-retryable configuration fault sharing a
    branch is not a cosmetic problem — it is the difference between "try again"
    and "trying again will never work".
  */
  const refused = validateCredentials({ email: "nope", password: "x" });
  const confirming = classifySignUp({ user: { id: "u" }, session: null });
  const uncertain = classifySignUp({ user: null, session: null });

  type Reportable = { kind: string; retryable: boolean };
  const cases: Array<[string, Reportable]> = [
    ["invalid form input", (refused as { ok: false; problem: Reportable }).problem],
    ["network failure", classifyAuthFailure(new TypeError("Failed to fetch"))],
    ["service unavailable", classifyAuthFailure(new AuthRetryableFetchError("bad gateway", 502))],
    ["rate limited", classifyAuthFailure(new AuthApiError("rate limit", 429, "x"))],
    [
      "invalid credentials",
      classifyAuthFailure(
        new AuthApiError("Invalid login credentials", 400, "invalid_credentials"),
      ),
    ],
    [
      "password refused by policy",
      classifyAuthFailure(
        new AuthApiError("Password should be at least 8 characters", 422, "weak_password"),
      ),
    ],
    [
      "email never confirmed",
      classifyAuthFailure(new AuthApiError("Email not confirmed", 400, "email_not_confirmed")),
    ],
    [
      "account created, confirmation required",
      confirming.established === false ? confirming.outcome : { kind: "", retryable: false },
    ],
    [
      "account creation uncertain",
      uncertain.established === false ? uncertain.outcome : { kind: "", retryable: false },
    ],
    [
      "session establishment failure",
      classifyAuthFailure(new Error("Session did not become available")),
    ],
    ["redirect/callback failure", classifyCallbackError({ error: "access_denied" })!],
    [
      "configuration failure",
      classifyAuthFailure(
        new AuthApiError("Signups not allowed for this instance", 422, "signup_disabled"),
      ),
    ],
    ["unexpected provider response", classifyAuthFailure(new Error("¯\\_(ツ)_/¯"))],
  ];

  const seen = new Map<string, string>();
  for (const [label, outcome] of cases) {
    assert.ok(outcome.kind, `${label} produced no outcome`);
    const clash = seen.get(outcome.kind);
    assert.equal(
      clash,
      undefined,
      `"${label}" and "${clash}" both land in "${outcome.kind}" — they need different advice`,
    );
    seen.set(outcome.kind, label);
  }
  assert.equal(seen.size, cases.length);

  /*
    The fourteenth state — account created AND session established — is
    deliberately not a message. There is nothing to say to somebody who is
    already being taken to the product, and inventing a card for it would be a
    congratulation on a screen nobody sees.
  */
  assert.equal(
    classifySignUp({ user: { id: "u" }, session: { access_token: "t" } }).established,
    true,
  );
});

test("a fault nobody here caused is never blamed on the person's password", async () => {
  const { classifyAuthFailure } = await import("@/lib/auth-outcome");
  const { AuthApiError, AuthRetryableFetchError } = await import("@supabase/supabase-js");

  /*
    Each of these used to reach the residual branch, which was `rejected` — the
    one branch allowed to say "that email and password don't match an account".
    A person with correct credentials, facing a disabled provider or a missing
    environment variable, was told their password was wrong and given a task
    that could not possibly succeed.
  */
  for (const [label, error] of [
    [
      "disabled sign-ups",
      new AuthApiError("Signups not allowed for this instance", 422, "signup_disabled"),
    ],
    [
      "disabled email provider",
      new AuthApiError("Email logins are disabled", 422, "email_provider_disabled"),
    ],
    ["missing configuration", new Error("Missing Supabase environment variable(s): SUPABASE_URL")],
    ["wrong publishable key", new AuthApiError("Invalid API key", 401, "x")],
    ["a failing service", new AuthRetryableFetchError("internal error", 500)],
    ["an answer nobody recognises", new Error("¯\\_(ツ)_/¯")],
  ] as const) {
    const outcome = classifyAuthFailure(error);
    assert.notEqual(outcome.kind, "rejected", `${label} was reported as a wrong password`);
    const copy = `${outcome.what} ${outcome.stillTrue} ${outcome.whatYouCanDo}`;
    assert.equal(
      /don’t match an account|check the address and the password/i.test(copy),
      false,
      `${label} tells the person to check their password: "${copy}"`,
    );
  }
});

test("a network fault and a failing service are told apart, because the advice differs", async () => {
  const { classifyAuthFailure } = await import("@/lib/auth-outcome");
  const { AuthRetryableFetchError } = await import("@supabase/supabase-js");

  const offline = classifyAuthFailure(new AuthRetryableFetchError("fetch failed", 0));
  const failing = classifyAuthFailure(new AuthRetryableFetchError("internal error", 503));

  assert.equal(offline.kind, "unreachable");
  assert.equal(failing.kind, "service-unavailable");
  /* One is worth checking your own connection over. The other is not. */
  assert.match(offline.whatYouCanDo, /connection/i);
  assert.equal(/connection/i.test(failing.whatYouCanDo), false);
});

/* ══════════════════════════════════════════════════════════════════════════
   The password policy belongs to whoever enforces it
   ══════════════════════════════════════════════════════════════════════════ */

test("the password requirement is quoted from the service, never invented here", async () => {
  const { classifyAuthFailure } = await import("@/lib/auth-outcome");
  const { AuthApiError } = await import("@supabase/supabase-js");

  const outcome = classifyAuthFailure(
    new AuthApiError("Password should be at least 8 characters", 422, "weak_password"),
  );
  assert.equal(outcome.kind, "weak-password");
  assert.match(
    outcome.stillTrue,
    /at least 8 characters/,
    "the service's own requirement did not reach the person",
  );

  /*
    And the quotation is sanitised, not trusted. An upstream message carrying a
    URL, a template placeholder or a raw identifier is an implementation detail,
    and the rule that no implementation detail reaches a person does not bend
    because the sentence came from somewhere reputable.
  */
  for (const hostile of [
    "See https://example.test/policy for the rules",
    "password failed check {min_length}",
    "x".repeat(400),
    "",
  ]) {
    const guarded = classifyAuthFailure(new AuthApiError(hostile, 422, "weak_password"));
    assert.equal(guarded.kind, "weak-password");
    assert.equal(
      hostile.length > 0 && guarded.stillTrue.includes(hostile),
      false,
      `an unsanitised provider message reached the person: "${guarded.stillTrue}"`,
    );
  }
});

test("the form states no password requirement of its own", () => {
  /*
    The requirement is configured in Supabase and enforced by Supabase. This
    repository cannot read it: the `auth` schema holds no config table, the
    project metadata does not carry it, and the auth service is not reachable
    from here.

    So a rule printed under the field would be a guess in the shape of a fact,
    and its failure mode is the bad one — correct until somebody changes a
    project setting, then confidently and prominently wrong, in the place a
    person looks when they are already stuck.
  */
  const code = withoutComments(source(AUTH_ROUTE));
  const form = code.slice(code.indexOf("<form"), code.indexOf("</form>"));

  for (const invention of [
    /at least \d+ characters/i,
    /minimum of \d+/i,
    /minLength=\{?\d/,
    /must contain/i,
    /one (uppercase|number|symbol|special)/i,
  ]) {
    assert.equal(
      invention.test(form),
      false,
      `the form states a password rule it cannot know is true: ${invention}`,
    );
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   Returning from a provider with a refusal
   ══════════════════════════════════════════════════════════════════════════ */

test("a cancelled or failed OAuth return is read, and told apart", async () => {
  const { classifyCallbackError } = await import("@/lib/auth-outcome");

  assert.equal(classifyCallbackError({ error: null }), null, "a clean return raised a failure");

  const cancelled = classifyCallbackError({ error: "access_denied" })!;
  const broken = classifyCallbackError({ error: "server_error" })!;

  assert.equal(cancelled.kind, "callback-failed");
  assert.equal(broken.kind, "callback-failed");
  /* A decision and a fault are not the same news. */
  assert.match(cancelled.what, /cancelled/i);
  assert.equal(/cancelled/i.test(broken.what), false);
});

test("the provider's error text is used to classify and never rendered", async () => {
  const { classifyCallbackError } = await import("@/lib/auth-outcome");

  /*
    `/auth?error=x&error_description=…` is a text field on this product's own
    sign-in page that anybody can fill in by sending somebody a link. Echoing it
    would make the sign-in page say whatever an attacker wants, in the product's
    own voice, at the exact moment a person is deciding whether to type a
    password.
  */
  const injected = "Your session expired. Confirm your card details at evil.test to continue.";
  const outcome = classifyCallbackError({ error: "server_error", description: injected })!;
  const copy = `${outcome.what} ${outcome.stillTrue} ${outcome.whatYouCanDo}`;
  assert.equal(copy.includes(injected), false, "the provider's description was rendered");
  assert.equal(/evil\.test|card details/i.test(copy), false);
});

test("the route reads a failed return and takes it out of the address bar", () => {
  const code = withoutComments(source(AUTH_ROUTE));

  /* Both carriers: the query string, and the fragment some flows use. */
  assert.match(code, /searchParams\.get\("error"\)[\s\S]{0,40}fragment\.get\("error"\)/);
  assert.match(code, /classifyCallbackError\(/);
  /*
    Pinned to the *call*, not the name. The first version of this line matched
    `/takeCallbackFailure\(\)/`, which the declaration `function
    takeCallbackFailure(): AuthOutcome | null` satisfies all by itself — so
    deleting the call site from the mount effect left the assertion green and
    the failed OAuth return silently unread again. Measured: that mutation
    escaped this suite until this line changed.
  */
  assert.match(
    code,
    /const callbackFailure = takeCallbackFailure\(\);[\s\S]{0,80}setFailure\(callbackFailure\)/,
    "the reader is defined but its result never reaches the person",
  );

  /*
    And the params are removed, so a reload does not re-raise a failure that has
    already been read, and so an injected `error_description` does not survive
    in a link somebody can share.
  */
  assert.match(code, /window\.history\.replaceState\(/);
  assert.match(code, /searchParams\.delete\(key\)/);
});

/* ══════════════════════════════════════════════════════════════════════════
   The form itself
   ══════════════════════════════════════════════════════════════════════════ */

test("the password can be revealed, by a real button that says what it does", () => {
  const code = withoutComments(source(AUTH_ROUTE));
  const form = code.slice(code.indexOf("<form"), code.indexOf("</form>"));

  /* A type swap on the same element, so the value and the caret survive it. */
  assert.match(form, /type=\{revealed \? "text" : "password"\}/);

  const anchor = form.indexOf('aria-controls="auth-password"');
  assert.ok(anchor > 0, "the reveal control does not point at the field it reveals");
  /* The whole element, so an attribute cannot escape the window by moving. */
  const toggle = form.slice(form.lastIndexOf("<button", anchor), form.indexOf("</button>", anchor));
  /*
    `type="button"`, because an unqualified button inside a form submits it —
    here that would mean "reveal my password" posting a half-typed credential.
  */
  assert.match(toggle, /type="button"/, "the reveal control submits the form");
  /* Its name changes with its state, because "Show password" on a shown password is a lie. */
  assert.match(
    toggle,
    /aria-label=\{revealed \? "Hide password" : "Show password"\}/,
    "the control's name does not follow its state",
  );
  assert.match(toggle, /aria-pressed=\{revealed\}/, "the control's state is not exposed");
  /* Reachable and visibly focused, since it sits between two fields in the tab order. */
  assert.equal(/tabIndex=\{-1\}/.test(toggle), false, "the reveal control is out of the tab order");
  /*
    Focus is asserted in "the reveal control's focus ring is one a browser
    actually draws" below, on the handler rather than on a class: the class that
    used to be here — `focus-visible:ring-2` — was measured drawing nothing, its
    computed box-shadow fully transparent. All this line needs to hold is that
    the control is reachable at all.
  */
  assert.equal(/tabIndex=\{-1\}/.test(toggle), false, "the reveal control is out of the tab order");
  /* And the icon is decorative — the accessible name is on the button. */
  assert.match(toggle, /aria-hidden="true"/);
});

test("both credential fields are labelled, not merely placeheld", () => {
  /*
    A placeholder is not a label. It disappears at the first keystroke, its
    contrast is deliberately low, and it is announced inconsistently — so the
    field that told you what it was for is blank exactly when you are trying to
    check what you put in it.
  */
  const code = withoutComments(source(AUTH_ROUTE));
  for (const id of ["auth-email", "auth-password"]) {
    assert.match(code, new RegExp(`htmlFor="${id}"`), `${id} has no label`);
    assert.match(code, new RegExp(`id="${id}"`), `${id} is labelled but does not exist`);
  }
});

test("what was typed survives a failed attempt, structurally", () => {
  /*
    Not a handler that remembers to preserve the email — a handler that has no
    way to lose it. The inputs are uncontrolled, so React never re-renders a
    value over them, and nothing in the failure path touches the refs.

    The version worth guarding against is the ordinary one: `setEmail("")` in a
    `finally`, or a controlled input reset on submit, which makes a person
    retype a correct address because their password was wrong.
  */
  const code = withoutComments(source(AUTH_ROUTE));
  assert.equal(/\.current\.value\s*=/.test(code), false, "a handler writes to a credential field");
  assert.equal(/\.reset\(\)/.test(code), false, "the form is reset, discarding what was typed");
  assert.equal(/value=\{/.test(code), false, "an input is controlled");

  /* And switching mode clears the outcome without clearing the fields. */
  const toggle = code.slice(code.indexOf('setMode(mode === "signin"'));
  assert.match(
    toggle.slice(0, 200),
    /setFailure\(null\)/,
    "a stale outcome survives a mode switch",
  );
});

test("a second submit cannot start a second request", () => {
  /*
    `disabled={loading}` is a render away from the click. A second Enter press
    inside the same tick, an autofill that submits, or a `disabled` attribute
    edited in devtools all get another request through — and on sign-up a
    duplicate request is a duplicate account attempt.
  */
  const code = withoutComments(source(AUTH_ROUTE));
  assert.match(code, /const inFlight = useRef\(false\)/, "there is no synchronous submit guard");

  const handler = code.slice(code.indexOf("const handleEmail"), code.indexOf("const handleGoogle"));
  const guard = handler.indexOf("if (inFlight.current) return;");
  const firstAwait = handler.indexOf("await ");
  assert.ok(guard > 0, "the email handler does not check the guard");
  assert.ok(guard < firstAwait, "the guard is checked after the first await, which is too late");
  /* And released on every path that does not navigate away. */
  assert.ok(
    (handler.match(/inFlight\.current = false/g) ?? []).length >= 2,
    "the guard is set but not released on every failure path",
  );
});

test("the blur hint and the submit refusal cannot disagree about an address", async () => {
  const { describeEmailProblem, validateCredentials } = await import("@/lib/auth-input");

  /*
    Two surfaces now judge the same address: a quiet hint when the field loses
    focus, and the refusal that stops the request. A form whose hint says an
    address is fine and whose submit then refuses it is arguing with itself in
    front of the person, so the decision is made once and worded twice.

    Empty is the deliberate exception: an untouched field is not a mistake, and
    a form that complains the moment you tab past an empty box is scolding
    people for doing nothing wrong. It is caught at submit, where it blocks
    something.
  */
  for (const address of [
    "person@example.test",
    "  person@example.test  ",
    "person.example.test",
    "person@example",
    "per son@example.test",
    "@example.test",
    "person@",
    `${"a".repeat(250)}@b.co`,
    "",
    "   ",
  ]) {
    const hinted = describeEmailProblem(address) !== null;
    const refused = validateCredentials({ email: address, password: "irrelevant" }).ok === false;
    if (address.trim().length === 0) {
      assert.equal(hinted, false, `an empty field is being scolded: "${address}"`);
      assert.equal(refused, true, `an empty address was accepted: "${address}"`);
      continue;
    }
    assert.equal(
      hinted,
      refused,
      `hint and submit disagree about "${address}": hinted=${hinted}, refused=${refused}`,
    );
  }
});

test("the address is judged when the field is left, not on every keystroke", () => {
  /*
    Telling somebody "that doesn't look like an email address" after they have
    typed the letter "a" is the form disagreeing with a sentence nobody has
    finished writing. The check belongs on blur; withdrawing it belongs on
    input, because a complaint that outlives its cause teaches people to ignore
    complaints.
  */
  const code = withoutComments(source(AUTH_ROUTE));
  assert.match(code, /onBlur=\{\(event\) => setEmailHint\(describeEmailProblem\(/);

  const onInput = code.slice(code.indexOf("onInput="), code.indexOf("onInput=") + 260);
  assert.match(onInput, /if \(emailHint &&/, "the hint is raised on every keystroke");
  assert.match(onInput, /=== null\) \{\s*setEmailHint\(null\)/, "the hint is never withdrawn");

  /* And the field points at its own message, so it is announced with the field. */
  assert.match(code, /aria-describedby=\{emailHint \? "auth-email-problem" : undefined\}/);
  assert.match(code, /id="auth-email-problem"/);
  assert.match(code, /aria-invalid=\{emailHint \? true : undefined\}/);
});

test("the submit button is disabled only while a request is in flight, and says why", () => {
  /*
    The pattern this avoids: a submit greyed out until some unstated condition
    is met, leaving a person pressing a dead control with nothing on screen
    telling them what is missing.
  */
  const code = withoutComments(source(AUTH_ROUTE));
  const submit = code.slice(code.indexOf('type="submit"'), code.indexOf("</form>"));
  assert.match(submit, /disabled=\{loading\}/);
  assert.equal(
    /disabled=\{[^}]*(!|valid|checked|empty|dirty)/.test(submit),
    false,
    "the submit button is disabled by something other than a request in flight",
  );
  /* And the wait is stated, not merely spun at. */
  assert.match(submit, /Signing you in|Creating your account/);
});

test("revealing the password preserves the caret, and survives the browser's late collapse", () => {
  /*
    Measured in Chromium with real key and mouse input: type a password, arrow
    back to position 7, click the eye, type a character — and the character
    landed at position 0. The value survived the type swap; the selection did
    not, so the person's edit went somewhere they did not put it, while doing
    the exact thing the control exists for.

    The event order is what makes this fixable, and it defeats the two obvious
    fixes:

      btn click                sel=7-7      <- still intact here
      (React commits the type)
      useLayoutEffect          restore
      document selectionchange sel=0-0      <- the browser collapses it AFTER

    Reading the selection at click time is right; restoring it only in a layout
    effect is not, because the collapse overwrites it. Hence the second restore
    on the next frame.

    A synthesised click never reproduces it — under untrusted events the
    selection is never lost at all — so this is asserted on the mechanism rather
    than left to a test that would pass either way.
  */
  const code = withoutComments(source(AUTH_ROUTE));

  /* Captured at click, from the field, while it is still the focused element. */
  assert.match(
    code,
    /caret\.current = \{\s*start: field\.selectionStart/,
    "the caret is no longer captured when the reveal is pressed",
  );
  /* Restored twice: now, and after the collapse. */
  assert.match(
    code,
    /restore\(\);\s*const frame = requestAnimationFrame\(restore\)/,
    "the caret restore no longer outlives the browser's late collapse",
  );
  assert.match(code, /cancelAnimationFrame\(frame\)/, "the queued restore is never cancelled");
  assert.match(
    code,
    /field\.setSelectionRange\(at\.start, at\.end\)/,
    "nothing puts the caret back",
  );

  /*
    And the press must not blur the field. `mousedown` blurs whatever is focused
    before `click` fires, which both loses the focus the caret belongs to and
    makes `setSelectionRange` a no-op — Chromium discards it on an unfocused
    input.
  */
  assert.match(
    code,
    /onMouseDown=\{\(e\) => e\.preventDefault\(\)\}/,
    "pressing the reveal blurs the password field again",
  );
});

test("the reveal control's focus ring is one a browser actually draws", () => {
  /*
    `focus-visible:ring-2 focus-visible:ring-accent` was on this button and drew
    nothing. Measured under a real Tab: the class was present, `:focus-visible`
    matched, and the computed box-shadow was
    `rgba(0,0,0,0) 0px 0px 0px 0px, …` — every ring layer emitted, every layer
    transparent.

    So the ring is asserted as the handler that was observed working, not as a
    class name. A test pinned to the class would have passed on a control with
    no focus indicator at all, which is precisely what shipped.
  */
  const code = withoutComments(source(AUTH_ROUTE));
  const anchor = code.indexOf('aria-controls="auth-password"');
  assert.ok(anchor > 0, "the reveal control does not point at the field it reveals");
  const toggle = code.slice(code.lastIndexOf("<button", anchor), code.indexOf("</button>", anchor));

  assert.match(
    toggle,
    /style\.outline = "2px solid var\(--accent\)"/,
    "the reveal control has no focus outline",
  );
  assert.match(toggle, /onBlur=\{/, "the focus outline is never cleared");
  /* Keyboard only — a mouse press should not draw a ring the pointer user did not ask for. */
  assert.match(
    toggle,
    /matches\(":focus-visible"\)/,
    "the ring is drawn on any focus, including a mouse press",
  );
  assert.equal(
    /focus-visible:ring/.test(toggle),
    false,
    "the transparent ring utility is back on the reveal control",
  );
});
