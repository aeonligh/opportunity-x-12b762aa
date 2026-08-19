import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * PHASE 20 — SECURE USE OF SOMEBODY ELSE'S AUTHENTICATION
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Supabase owns the password: storing it, hashing it, comparing it, deciding
 * what a valid one is. Nothing here re-implements any of that, and these tests
 * are not about whether Supabase is correct.
 *
 * They are about the four things Opportunity X can still get wrong with an
 * authentication system it did not write: handing a credential to the wrong
 * place, letting a token end up somewhere it can be read, claiming a security
 * property it has not got, and turning a service failure into an accusation
 * against a person's password.
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
   Tokens must not travel in a URL
   ══════════════════════════════════════════════════════════════════════════ */

test("the OAuth request is PKCE, so no token comes back in the URL", () => {
  /*
    `@supabase/auth-js` defaults to `flowType: "implicit"`, and nothing
    overrode it. Measured, not read: the authorize URL this client built for
    Google carried no `code_challenge`.

    Under implicit flow the provider returns the access *and refresh* tokens in
    the URL fragment. A fragment is not sent to servers — the usual
    reassurance — but it is written into browser history, readable by any
    extension with host access, present in a screenshot of the moment after
    sign-in, and available to anything that can read `location.hash`. A refresh
    token is a long-lived credential to leave in a place nobody treats as
    sensitive.

    The browser walk proves the request that actually goes out. This proves the
    configuration that produces it, and that nothing has quietly returned it to
    the default.
  */
  const client = withoutComments(src("src/integrations/supabase/client.ts"));
  assert.match(client, /flowType:\s*"pkce"/, "the OAuth flow is back on the implicit default");
  assert.equal(
    /flowType:\s*"implicit"/.test(client),
    false,
    "the client explicitly asks for the flow that returns tokens in the URL",
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   The credential contract at this application's boundary
   ══════════════════════════════════════════════════════════════════════════ */

test("credentials are checked before anything is sent, and the password is never altered", async () => {
  const { validateCredentials, MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH } =
    await import("@/lib/auth-input");

  /* Accepted, and passed on exactly. */
  const ok = validateCredentials({ email: "person@example.test", password: "  spaces  kept  " });
  assert.equal(ok.ok, true);
  assert.equal(ok.ok && ok.email, "person@example.test");
  /*
    The password is opaque. A credential the application quietly rewrites is a
    different credential from the one the person typed, and the failure —
    an account that cannot be signed into with its own password — looks like
    their mistake rather than ours.
  */
  assert.equal(ok.ok && ok.password, "  spaces  kept  ", "the password was transformed");

  /* The address is trimmed, because a trailing space from a paste is not part of it. */
  const padded = validateCredentials({ email: "  person@example.test  ", password: "x" });
  assert.equal(padded.ok && padded.email, "person@example.test");

  /* Refused, without a round trip. */
  for (const [label, input] of [
    ["missing email", { email: "", password: "x" }],
    ["missing password", { email: "a@b.co", password: "" }],
    ["not a string", { email: 42, password: "x" }],
    ["password not a string", { email: "a@b.co", password: null }],
    ["no @", { email: "person.example.test", password: "x" }],
    ["no domain dot", { email: "person@example", password: "x" }],
    ["whitespace inside", { email: "per son@example.test", password: "x" }],
    ["oversized email", { email: "a".repeat(MAX_EMAIL_LENGTH) + "@b.co", password: "x" }],
    ["oversized password", { email: "a@b.co", password: "x".repeat(MAX_PASSWORD_LENGTH + 1) }],
  ] as const) {
    const result = validateCredentials(input as { email: unknown; password: unknown });
    assert.equal(result.ok, false, `${label} was accepted`);
    assert.equal(result.ok === false && result.problem.kind, "invalid-input", label);
    /*
      And a refusal here must not read as a verdict about the account. Nothing
      was sent, so nothing was learned.
    */
    assert.match(
      result.ok === false ? result.problem.stillTrue : "",
      /says nothing about whether the account exists/i,
      `${label}: a local refusal implies something about the account`,
    );
  }

  /* A long passphrase is welcome. The ceiling is about magnitude, not strength. */
  const passphrase = validateCredentials({
    email: "a@b.co",
    password: "correct horse battery staple ".repeat(8),
  });
  assert.equal(passphrase.ok, true, "a long passphrase was refused");
});

test("the sign-in handler refuses locally before calling the auth service", () => {
  /*
    A contract nothing calls is decoration. The handler must consult it and
    return, rather than validate and continue.
  */
  /*
    Matched on the call, not its argument shape. The first version pinned
    `validateCredentials({ email, password })` exactly and broke when the inputs
    became uncontrolled and the values started coming from refs — a change that
    made the page *more* secure, not less. What matters is the ordering: check,
    return on refusal, and only then reach the network.
  */
  const auth = withoutComments(src("src/routes/auth.tsx"));
  const check = auth.indexOf("validateCredentials(");
  assert.ok(check > 0, "the sign-in handler does not check its input");

  const call = auth.indexOf("signInWithPassword");
  assert.ok(call > check, "credentials are sent before they are checked");
  assert.match(
    auth.slice(check, call),
    /if \(!checked\.ok\) \{\s*setFailure\(checked\.problem\);\s*return;\s*\}/,
    "a refused credential does not stop the request",
  );

  /* And what is sent is the checked value, not the raw field. */
  assert.match(auth, /email: checked\.email/, "the raw email is sent rather than the checked one");
  assert.match(
    auth,
    /password: checked\.password/,
    "the raw password is sent rather than the checked one",
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   A service failure must never become an accusation
   ══════════════════════════════════════════════════════════════════════════ */

test("the sentence that routes a lost session away from 'wrong password' is shared, not retyped", () => {
  /*
    `classifyAuthFailure` matches the string "session did not become available"
    to reach its `no-session` branch. That string was thrown in `auth.tsx` and
    matched in `auth-outcome.ts`, with nothing binding them. Rewording either —
    the kind of change that reads like copy editing — would have dropped the
    outcome into the classifier's residual branch, which is `rejected`: the one
    branch allowed to blame the password.

    A successful password check would then have been reported to the person as a
    wrong password, and retrying would have produced it again.
  */
  const auth = withoutComments(src("src/routes/auth.tsx"));
  assert.match(
    auth,
    /export const SESSION_NEVER_ARRIVED = "([^"]+)"/,
    "the sentence has no shared home",
  );
  assert.match(
    auth,
    /throw new Error\(SESSION_NEVER_ARRIVED\)/,
    "the thrown value is not the shared one",
  );

  const sentence = /export const SESSION_NEVER_ARRIVED = "([^"]+)"/.exec(auth)![1];

  /* And the classifier must actually reach `no-session` for that exact sentence. */
  const outcome = /includes\("([^"]*session did not become available[^"]*)"\)/i.exec(
    src("src/lib/auth-outcome.ts"),
  );
  assert.ok(outcome, "the classifier no longer matches a lost session at all");
  assert.ok(
    sentence.toLowerCase().includes(outcome[1].toLowerCase()),
    `the thrown sentence "${sentence}" no longer matches what the classifier looks for`,
  );
});

test("a lost session is classified as no-session, and an unreachable service is never rejection", async () => {
  const { classifyAuthFailure } = await import("@/lib/auth-outcome");
  const { AuthRetryableFetchError } = await import("@supabase/supabase-js");

  /*
    The sentence is read out of the route rather than imported from it: the
    suite runs under `--conditions=react-server`, where importing a route pulls
    in `react-dom` and fails. Reading it means this test uses the same literal
    the application throws, which is the point — a reworded constant must break
    this, not slip past it.
  */
  const declared = /export const SESSION_NEVER_ARRIVED = "([^"]+)"/.exec(
    src("src/routes/auth.tsx"),
  );
  assert.ok(declared, "the shared sentence is gone");
  assert.equal(classifyAuthFailure(new Error(declared[1])).kind, "no-session");
  assert.equal(
    classifyAuthFailure(new AuthRetryableFetchError("fetch failed", 0)).kind,
    "unreachable",
  );
  assert.equal(classifyAuthFailure(new TypeError("Failed to fetch")).kind, "unreachable");
});

/* ══════════════════════════════════════════════════════════════════════════
   Nothing may claim success before it has evidence
   ══════════════════════════════════════════════════════════════════════════ */

test("creating an account is not announced before a session exists", () => {
  /*
    `signUp` was followed immediately by a success toast. Where a project
    requires email confirmation, `signUp` returns cleanly with no session at
    all, so the sequence a person saw was "Account created. Welcome!" and then
    a failure. A write is not announced until it has been read back, and that
    rule does not stop applying because the write is an account.
  */
  const auth = withoutComments(src("src/routes/auth.tsx"));
  assert.equal(/toast\.success/.test(auth), false, "sign-up announces success before it has any");
  assert.equal(/Account created/.test(auth), false, "the premature congratulation is back");
});

test("a struggling auth service is not answered by asking it more often", () => {
  /*
    `waitForSession` polled every 120ms and made a network `getUser()` call each
    time a session was present — up to sixty-odd requests in eight seconds,
    from a client that had just been told the service was having trouble.
    Waiting for the session to appear is a local read and stays in the loop;
    confirming it with the server is now attempted a bounded number of times.
  */
  const auth = withoutComments(src("src/routes/auth.tsx"));
  assert.match(
    auth,
    /MAX_SESSION_CONFIRMATIONS = (\d+)/,
    "the confirmation attempts are unbounded again",
  );
  const cap = Number(/MAX_SESSION_CONFIRMATIONS = (\d+)/.exec(auth)![1]);
  assert.ok(cap >= 1 && cap <= 5, `${cap} confirmation attempts is not a bound`);
  assert.match(
    auth,
    /if \(confirmations >= MAX_SESSION_CONFIRMATIONS\) return false;/,
    "the bound is declared but never enforced",
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   Passwords stay where they were handed over
   ══════════════════════════════════════════════════════════════════════════ */

test("no password is stored, hashed, logged, or reflected by this application", () => {
  /*
    Supabase owns password storage and hashing. The thing worth proving is the
    negative: that Opportunity X never takes a copy, never re-implements the
    comparison, and never puts one somewhere it can be read back.
  */
  const offenders: string[] = [];

  for (const file of walk("src")) {
    const code = withoutComments(src(file));
    if (!/password/i.test(code)) continue;

    /* Never persisted anywhere this application controls. */
    for (const sink of [
      /localStorage\.setItem\([^)]*password/i,
      /sessionStorage\.setItem\([^)]*password/i,
      /document\.cookie\s*=\s*[^;]*password/i,
      /\.insert\(\{[^}]*password/i,
      /\.update\(\{[^}]*password/i,
    ]) {
      if (sink.test(code)) offenders.push(`${file}: persists a password (${sink})`);
    }

    /* Never logged. */
    if (/console\.\w+\([^)]*\bpassword\b/i.test(code)) offenders.push(`${file}: logs a password`);

    /* Never hashed here — that would be a second authentication system. */
    for (const own of [/bcrypt/i, /argon2/i, /scrypt/i, /pbkdf2/i, /createHash\(/]) {
      if (own.test(code)) offenders.push(`${file}: hashes credentials itself (${own})`);
    }

    /* Never placed in a URL. */
    if (/[?&]password=/i.test(code)) offenders.push(`${file}: puts a password in a URL`);
  }

  assert.deepEqual(offenders, [], `password handling:\n  ${offenders.join("\n  ")}`);

  /*
    And exactly one module ever holds one: the sign-in form, which passes it
    straight to Supabase. A second module reading `password` is the change worth
    noticing.
  */
  /*
    Strings stripped as well as comments. `auth-outcome.ts` says the word
    "password" in the copy it shows a person — "That email and password don't
    match an account" — which is the product speaking, not the product handling
    a credential. Counting prose as handling made the list wrong and would have
    made it wrong again on any wording change.
  */
  const withoutText = (code: string) =>
    withoutComments(code)
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/`(?:[^`\\]|\\.)*`/g, "``");

  const holders = walk("src").filter((f) => /\bpassword\b/.test(withoutText(src(f))));
  assert.deepEqual(
    holders.sort(),
    ["src/lib/auth-input.ts", "src/routes/auth.tsx"].sort(),
    `a password is handled in: ${holders.join(", ")}`,
  );
});

test("the credential goes to the auth service and nowhere else", () => {
  /*
    The one thing a compromised or careless client can do that Supabase cannot
    defend against: send the password somewhere else as well. Every call that
    receives it must be a Supabase auth call.
  */
  const auth = withoutComments(src("src/routes/auth.tsx"));
  const receivers = [...auth.matchAll(/(\w[\w.]*)\(\{[^}]*password[^}]*\}/g)].map((m) => m[1]);

  assert.ok(receivers.length > 0, "nothing receives the password — the form cannot work");
  for (const receiver of receivers) {
    assert.match(
      receiver,
      /^(supabase\.auth\.(signInWithPassword|signUp)|validateCredentials)$/,
      `the password is passed to ${receiver}`,
    );
  }

  /* And no server function of ours accepts one. */
  for (const file of walk("src").filter((f) => /createServerFn/.test(src(f)))) {
    assert.equal(
      /password/i.test(withoutComments(src(file))),
      false,
      `${file}: a server function takes a password — authentication does not go through this application`,
    );
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   What the person is told
   ══════════════════════════════════════════════════════════════════════════ */

test("no authentication failure shows an implementation detail", async () => {
  const { classifyAuthFailure } = await import("@/lib/auth-outcome");
  const { validateCredentials } = await import("@/lib/auth-input");
  const { AuthApiError, AuthRetryableFetchError } = await import("@supabase/supabase-js");

  const outcomes = [
    classifyAuthFailure(new AuthApiError("Invalid login credentials", 400, "invalid_credentials")),
    classifyAuthFailure(new AuthRetryableFetchError("fetch failed", 0)),
    classifyAuthFailure(new TypeError("Failed to fetch")),
    classifyAuthFailure(new AuthApiError("Email not confirmed", 400, "email_not_confirmed")),
    classifyAuthFailure(new Error("boom")),
    (validateCredentials({ email: "nope", password: "x" }) as { problem: unknown }).problem,
  ] as { what: string; stillTrue: string; whatYouCanDo: string }[];

  for (const outcome of outcomes) {
    const all = `${outcome.what} ${outcome.stillTrue} ${outcome.whatYouCanDo}`;
    for (const leak of [
      /supabase/i,
      /postgres|postgrest|pgrst/i,
      /\bjwt\b|bearer|access[_ ]token|refresh[_ ]token/i,
      /\bsql\b|relation |column /i,
      /https?:\/\//,
      /\bat \w+\.\w+ \(/ /* a stack frame */,
      /[0-9a-f]{8}-[0-9a-f]{4}-/ /* a uuid */,
      /anfiojmbgonrtympzjch/ /* the project ref */,
      /service[_ ]role/i,
      /\.ts:\d+|\/src\// /* a source path */,
    ]) {
      assert.equal(leak.test(all), false, `an authentication message leaks ${leak}: "${all}"`);
    }
  }
});

test("a wrong password and a missing account are told apart from nothing", async () => {
  /*
    Account enumeration, at the part Opportunity X controls. Supabase answers
    both a nonexistent address and a wrong password with the same
    `invalid_credentials`; what this application must not do is add a
    distinction Supabase did not make.
  */
  const { classifyAuthFailure } = await import("@/lib/auth-outcome");
  const { AuthApiError } = await import("@supabase/supabase-js");

  const nonexistent = classifyAuthFailure(
    new AuthApiError("Invalid login credentials", 400, "invalid_credentials"),
  );
  const wrongPassword = classifyAuthFailure(
    new AuthApiError("Invalid login credentials", 400, "invalid_credentials"),
  );

  assert.deepEqual(nonexistent, wrongPassword, "the two cases are told apart");
  /* And the wording commits to neither. */
  assert.equal(
    /no account|not registered|does not exist|unknown email|account not found/i.test(
      nonexistent.what,
    ),
    false,
    `the rejection reveals account existence: "${nonexistent.what}"`,
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   The service-role boundary
   ══════════════════════════════════════════════════════════════════════════ */

test("the service-role key is never reachable from anything the browser runs", () => {
  /*
    The artifact gate proves it is absent from the built client. This proves the
    import graph that makes that true, so a change is caught before a build is
    even made: the only module reading the key is `.server.ts`, which Vite will
    not bundle into the client, and the only module importing that is the
    engine's record.
  */
  const readers = walk("src").filter((f) =>
    /SUPABASE_SERVICE_ROLE_KEY/.test(withoutComments(src(f))),
  );
  assert.deepEqual(
    readers.sort(),
    ["src/integrations/supabase/client.server.ts", "src/lib/opportunity/store.ts"].sort(),
    `the service-role key is read in: ${readers.join(", ")}`,
  );
  /*
    Each reader must carry a guarantee, and there are two kinds. A `.server.ts`
    filename is refused at build time by the import protection restored in this
    phase; `import "@/lib/server-only"` throws if the module is ever evaluated
    in a browser. `store.ts` is not `.server.ts` and relies on the second;
    `client.server.ts` now carries both.

    Measured before this was true: with the protection narrowed to a directory
    pattern nothing matched, a client component could import the service-role
    client, the build succeeded, and the credential name reached the bundle.
  */
  for (const reader of readers) {
    const code = withoutComments(src(reader));
    const buildTime = reader.includes(".server.");
    const runTime = /import "@\/lib\/server-only"/.test(code);
    assert.ok(
      buildTime || runTime,
      `${reader} reads the service-role key with neither a .server. filename nor the runtime guard`,
    );
  }
});

test("the credential inputs are uncontrolled, so nothing types into the markup", () => {
  /*
    Measured with a marker string in a browser: React renders a controlled
    input's value as an HTML *attribute*, so a typed password was present in
    `document.documentElement.outerHTML`.

    That is one DOM serialisation from leaving the page — session-replay tools
    and error reporters attach DOM snapshots, HTML export writes attributes, and
    any third-party script with DOM access can read it without touching the
    input. The browser must hold what was typed; that lives in the element's
    property and is unavoidable. Nothing requires it in the serialised markup.

    The browser walk proves the absence. This proves the mechanism, because the
    obvious "improvement" — putting `value`/`onChange` back for symmetry with
    every other React form — would silently reintroduce it.
  */
  const auth = withoutComments(src("src/routes/auth.tsx"));
  const inputs = auth.slice(auth.indexOf("<form"), auth.indexOf("</form>"));

  assert.match(
    inputs,
    /type="email"[\s\S]*?ref=\{emailRef\}/,
    "the email input is not uncontrolled",
  );
  assert.match(
    inputs,
    /type="password"[\s\S]*?ref=\{passwordRef\}/,
    "the password input is not uncontrolled",
  );
  assert.equal(
    /value=\{(email|password)\}/.test(inputs),
    false,
    "a credential input is controlled again — its value will be rendered as an attribute",
  );

  /* And the submitted values come from the refs, not from React state. */
  assert.match(auth, /emailRef\.current\?\.value/, "the email is not read from the input");
  assert.match(auth, /passwordRef\.current\?\.value/, "the password is not read from the input");
  assert.equal(
    /useState\(""\)/.test(auth),
    false,
    "a credential is back in React state, where it will be rendered",
  );
});
