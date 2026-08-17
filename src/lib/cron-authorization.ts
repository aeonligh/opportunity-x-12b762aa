/**
 * Who is allowed to invoke a scheduled job out of band.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHAT THIS CLOSES
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Two routes under `/api/public/hooks/` accepted an unauthenticated `POST` from
 * anyone on the internet, and each of them reaches past every boundary the rest
 * of the product maintains:
 *
 *   `crawl-opportunities`  — runs the discovery pipeline with the **service
 *                            role**, which bypasses RLS, and writes rows.
 *   `deadline-reminders`   — reads **every** user's saved opportunities and
 *                            **sends them email**.
 *
 * Neither checked a secret, a signature, or a header. The second is the serious
 * one: an endpoint that dispatches mail to an entire user base, triggerable by
 * a stranger with `curl`. `sent_reminders` de-duplicates repeats, so the ceiling
 * is one message per user per tier rather than unbounded — a limit on the blast
 * radius, not a control on who may fire it.
 *
 * The word `public` in the path was never a decision that these are public. It
 * is the routing convention for "not behind the authenticated layout", and the
 * comments on both handlers say what they are actually for: *"invoked by
 * pg_cron"*. Machines, on a schedule. This makes the code agree with the intent
 * that was already written down.
 *
 * ── Why it fails closed when nothing is configured ────────────────────────
 *
 * Because the alternative fails open, and an endpoint that mails your users is
 * the wrong place to be permissive by default. A deployment with no secret set
 * gets a job that refuses to run and says why, which is a visible, fixable
 * outage. A deployment with no secret set that runs for anybody is the state
 * this module exists to end, and it is invisible until it is exploited.
 *
 * Nothing is currently scheduled — the cron job was deliberately left
 * unscheduled during the migration (see the migration
 * `20260618065158_…`, which unschedules it and documents the replacement) — so
 * this breaks no running caller. The documented `cron.schedule` snippet now
 * carries the header.
 *
 * ── Why the comparison is constant-time ───────────────────────────────────
 *
 * A `===` on secrets leaks their length and their common prefix through timing.
 * That is a small leak against a high-entropy secret and a fatal one against a
 * short or guessable one, and the cost of not having the problem is nine lines.
 * Written by hand rather than with `node:crypto` so the module carries no
 * runtime import and works unchanged on any of the targets this has been built
 * for.
 */

/** The header a scheduler must present. */
export const CRON_SECRET_HEADER = "x-opportunity-x-cron-secret";

/** The environment variable holding the expected value. A secret; never `VITE_`. */
export const CRON_SECRET_ENV = "OPPORTUNITY_X_CRON_SECRET";

export type CronAuthorization =
  | { allowed: true }
  /** Refused, with the status to answer and a reason safe to return. */
  | { allowed: false; status: 401 | 503; because: string };

/**
 * Compare without revealing where two strings first differ.
 *
 * Lengths are compared separately and unavoidably — there is no way to compare
 * strings of different lengths in time independent of both — so the length of
 * the configured secret is the one thing this does not hide. That is why the
 * secret should be long and random rather than memorable.
 */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let differing = 0;
  for (let i = 0; i < a.length; i += 1) {
    differing |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return differing === 0;
}

/**
 * Decide whether a request may run a scheduled job.
 *
 * Takes the header value rather than the request so it can be tested directly,
 * and reads the environment **inside** the call rather than at module scope —
 * the deployment target binds env per request, so a module-scope read captures
 * whatever was set at cold start.
 */
export function authorizeCronRequest(presented: string | null): CronAuthorization {
  const expected = process.env[CRON_SECRET_ENV];

  if (!expected) {
    /*
      Not "unauthorized": nothing was presented that could be wrong. The
      deployment is misconfigured, and saying so is the difference between an
      operator finding this in a minute and finding it in an afternoon.
    */
    return {
      allowed: false,
      status: 503,
      because: `This job is not configured to run. Set ${CRON_SECRET_ENV} in the environment and send it as the ${CRON_SECRET_HEADER} header.`,
    };
  }

  if (!presented || !constantTimeEquals(presented, expected)) {
    return {
      allowed: false,
      status: 401,
      because: "This endpoint is for the scheduler.",
    };
  }

  return { allowed: true };
}

/**
 * The same decision, from a `Request`.
 *
 * A thin wrapper so both handlers read identically and neither has to remember
 * the header's name — a second endpoint spelling it differently would be
 * authorized by nothing at all.
 */
export function authorizeCronRun(request: Request | undefined): CronAuthorization {
  return authorizeCronRequest(request?.headers?.get(CRON_SECRET_HEADER) ?? null);
}
