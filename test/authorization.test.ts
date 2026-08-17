import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * WHERE THE BOUNDARY ACTUALLY IS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Phase 12's authorization audit, held in place. The question these ask is not
 * "is there a check" but "is the check where the capability is" — because a
 * guard on a route, a hidden button, or a disabled control is not an
 * authorization boundary. It is a suggestion, and the person who matters is the
 * one who never sees the interface.
 *
 * Two things are under test:
 *
 *   1. **The scheduled jobs.** Both `/api/public/hooks/*` routes accepted an
 *      unauthenticated POST from anyone. One runs the discovery pipeline with
 *      the service role; the other reads every user's saved opportunities and
 *      **sends them email**. Neither checked anything.
 *
 *   2. **The admin capability.** Every mutating admin action must call
 *      `requireAdmin` *inside the handler*, against the user-scoped client. The
 *      route guard on `/admin` is a courtesy — a server function is its own
 *      HTTP endpoint, so a UI that merely hides the page protects nobody.
 */

const CRON = "src/lib/cron-authorization.ts";
const ADMIN = "src/lib/admin.functions.ts";
const HOOKS = "src/routes/api/public/hooks";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/* ══════════════════════════════════════════════════════════════════════════
   The scheduled jobs
   ══════════════════════════════════════════════════════════════════════════ */

/** Run a function with the environment temporarily set, then put it back. */
async function withSecret<T>(value: string | undefined, run: () => T | Promise<T>): Promise<T> {
  const before = process.env.OPPORTUNITY_X_CRON_SECRET;
  if (value === undefined) delete process.env.OPPORTUNITY_X_CRON_SECRET;
  else process.env.OPPORTUNITY_X_CRON_SECRET = value;
  try {
    return await run();
  } finally {
    if (before === undefined) delete process.env.OPPORTUNITY_X_CRON_SECRET;
    else process.env.OPPORTUNITY_X_CRON_SECRET = before;
  }
}

test("an unconfigured deployment refuses to run a scheduled job", async () => {
  /*
    Fails closed, and the two refusals are different facts with different status
    codes: 503 means "this deployment cannot run the job", 401 means "you may
    not run it". An operator reading a log needs to tell those apart.
  */
  const { authorizeCronRequest } = await import("@/lib/cron-authorization");

  await withSecret(undefined, () => {
    const noHeader = authorizeCronRequest(null);
    assert.equal(noHeader.allowed, false);
    assert.equal(noHeader.allowed === false && noHeader.status, 503);

    /* Even presenting something — there is nothing to compare it against. */
    const withHeader = authorizeCronRequest("anything-at-all");
    assert.equal(withHeader.allowed, false);
    assert.equal(withHeader.allowed === false && withHeader.status, 503);
  });
});

test("a configured job runs only for the exact secret", async () => {
  const { authorizeCronRequest } = await import("@/lib/cron-authorization");

  await withSecret("s3cret-value-long-enough", () => {
    assert.deepEqual(authorizeCronRequest("s3cret-value-long-enough"), { allowed: true });

    for (const wrong of [
      null,
      "",
      "s3cret-value-long-enoug", // one short
      "s3cret-value-long-enoughX", // one long
      "S3CRET-VALUE-LONG-ENOUGH", // case
      "s3cret-value-long-enougi", // last character
    ]) {
      const result = authorizeCronRequest(wrong);
      assert.equal(result.allowed, false, `accepted ${JSON.stringify(wrong)}`);
      assert.equal(result.allowed === false && result.status, 401);
    }
  });
});

test("a refusal does not disclose the secret", async () => {
  /*
    The reason is returned in an HTTP body to an unauthenticated caller, so it
    must say why without saying what. The 503 case names the *variable* — which
    an operator needs and an attacker already knows from the source — and never
    its value.
  */
  const { authorizeCronRequest } = await import("@/lib/cron-authorization");

  await withSecret("a-very-distinctive-secret-value", () => {
    const refused = authorizeCronRequest("wrong");
    assert.equal(refused.allowed, false);
    if (refused.allowed === false) {
      assert.equal(refused.because.includes("a-very-distinctive-secret-value"), false);
    }
  });
});

test("the comparison does not short-circuit on the first differing character", async () => {
  /*
    Not a timing measurement — a timing assertion in a test suite is noise, not
    evidence. This checks the property that makes constant time possible: the
    loop visits every character rather than returning at the first mismatch.
  */
  const text = withoutComments(source(CRON));
  assert.match(text, /for \(let i = 0; i < a\.length; i \+= 1\)/);
  assert.match(text, /differing \|=/);
  assert.equal(
    /if \(a\[i\] !== b\[i\]\) return false/.test(text),
    false,
    "an early return reintroduces the timing leak",
  );
  /* And `===` on the secrets themselves is gone. */
  assert.equal(/presented === expected|expected === presented/.test(text), false);
});

test("every scheduled hook checks the secret before doing anything", () => {
  /*
    The check has to come first. A handler that runs the job and then decides
    whether it was allowed has already sent the email.
  */
  const hooks = readdirSync(HOOKS).filter((f) => f.endsWith(".ts"));
  assert.ok(hooks.length >= 2, "expected the crawl and reminder hooks");

  for (const file of hooks) {
    const whole = withoutComments(source(join(HOOKS, file)));

    /*
      The handler body only. Ordering must be measured against the *call*, and
      the first mention of `authorizeCronRun` in the file is its import — which
      is unavoidably above everything, so a check against the whole file reports
      correct ordering no matter where the guard actually sits. That is exactly
      how this assertion first passed against a handler that ran the job before
      authorizing it.
    */
    const handlerAt = whole.indexOf("POST:");
    assert.ok(handlerAt > 0, `${file}: no POST handler`);
    const handler = whole.slice(handlerAt);

    assert.match(handler, /authorizeCronRun\(request\)/, `${file}: no authorization`);

    const guardAt = handler.indexOf("authorizeCronRun(request)");
    const workAt = handler.search(/await (runScheduledCrawl|runDeadlineIntelligenceCheck)\(/);
    assert.ok(workAt > 0, `${file}: could not find the job it runs`);
    assert.ok(guardAt < workAt, `${file}: the job runs before it is authorized`);
  }
});

test("the capability is guarded, not only the route that calls it", () => {
  /*
    `runScheduledCrawl` is a server function, which is an HTTP endpoint of its
    own. Guarding the hook route alone would leave the same service-role write
    pipeline reachable through a second door.
  */
  const text = withoutComments(source("src/lib/intelligence.functions.ts"));
  const fn = text.slice(text.indexOf("export const runScheduledCrawl"));
  const body = fn.slice(0, fn.indexOf("supabaseAdmin"));

  /*
    The call and the refusal, not the identifier. Matching `authorizeCronRun`
    alone matches the `await import` that binds it — which survives deleting the
    guard, so the assertion passed against an unguarded function. Importing a
    check is not performing one.
  */
  assert.match(body, /authorizeCronRun\(getRequest\(\)\)/, "the guard is imported but not called");
  assert.match(body, /if \(!allowed\.allowed\) throw/, "the guard's answer is not acted on");
});

/* ══════════════════════════════════════════════════════════════════════════
   The admin capability
   ══════════════════════════════════════════════════════════════════════════ */

test("every mutating admin function checks the role server-side", () => {
  /*
    Not the route. `/admin`'s `beforeLoad` redirects a non-admin to the
    dashboard, which hides the screen and protects nothing: each of these is
    individually callable over HTTP.
  */
  const text = source(ADMIN);

  const handlers = [
    ...text.matchAll(
      /export const (\w+) = createServerFn[\s\S]*?\.handler\(([\s\S]*?)\n {2}\}\);/g,
    ),
  ];
  assert.ok(handlers.length >= 5, `expected the admin functions, found ${handlers.length}`);

  for (const [, name, body] of handlers) {
    /* `isAdmin` is the read that answers the question; it does not gate. */
    if (name === "isAdmin") continue;

    assert.match(body, /await requireAdmin\(context\)/, `${name}: no server-side role check`);

    /*
      And the check must precede the service role. `supabaseAdmin` bypasses RLS,
      so a role check after it has already given away the database.
    */
    const checkAt = body.indexOf("requireAdmin");
    const adminAt = body.indexOf("supabaseAdmin");
    if (adminAt >= 0) {
      assert.ok(checkAt < adminAt, `${name}: reaches the service role before checking the role`);
    }
  }
});

test("the role check cannot be answered by the caller", () => {
  /*
    `requireAdmin` asks the database through the **user-scoped** client, so the
    answer comes from `user_roles` under that person's own token. Asking through
    `supabaseAdmin` would ask a client that bypasses RLS, and passing a role in
    from the request would let the caller grant it to themselves.
  */
  const text = withoutComments(source(ADMIN));
  const fn = text.slice(text.indexOf("async function requireAdmin"), text.indexOf("export const"));

  assert.match(fn, /context\.supabase\.rpc\("has_role"/);
  assert.match(fn, /_user_id: context\.userId/);
  assert.equal(
    /supabaseAdmin/.test(fn),
    false,
    "the role is checked with a client that bypasses RLS",
  );
  assert.equal(/data\.role|input\.role|args\.role/.test(fn), false, "the caller supplies the role");
});

test("has_role is SECURITY DEFINER with a pinned search_path", () => {
  /*
    Both halves matter. SECURITY DEFINER lets the function read `user_roles`
    under RLS that would otherwise hide it; without `SET search_path`, a caller
    who can create a schema on their own path can shadow the table the function
    reads and answer its own question.
  */
  const migration = readdirSync("supabase/migrations")
    .map((f) => source(join("supabase/migrations", f)))
    .find((sql) => /CREATE OR REPLACE FUNCTION public\.has_role/.test(sql));

  assert.ok(migration, "has_role is not defined in any migration");
  const definition = migration.slice(
    migration.indexOf("CREATE OR REPLACE FUNCTION public.has_role"),
  );
  const head = definition.slice(0, definition.indexOf("$$"));
  assert.match(head, /SECURITY DEFINER/);
  assert.match(head, /SET search_path = public/);
});
