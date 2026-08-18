import { isAuthRetryableFetchError } from "@supabase/supabase-js";

/**
 * Whether this person is signed in — and the third answer.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THIS IS NOT A BOOLEAN
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The authenticated gate used to read:
 *
 *     const { data, error } = await supabase.auth.getUser();
 *     if (error || !data.user) throw redirect({ to: "/auth", ... });
 *
 * which collapses two unlike facts into one action. "Your token was rejected"
 * and "I could not reach the service that checks tokens" both became a redirect
 * to the sign-in page — so a person with a perfectly good session, on a train,
 * was told they were signed out. They then sign in again, which also cannot
 * reach the service, and the product has produced a loop out of a network blip
 * while asserting something false about their account at every turn.
 *
 * This is the same distinction the rest of the engine already holds between
 * *absent* and *unknown*, applied to identity instead of evidence:
 *
 *   signed-out    — asked and answered. There is no valid session.
 *   unverifiable  — could not ask. This says nothing about whether one exists.
 *
 * A redirect to `/auth` is a claim of the first kind. It may only be made when
 * the answer actually came back.
 *
 * ── Why the classification lives here and not in the route ────────────────
 *
 * Because it is the part that can be tested. Feeding a route's `beforeLoad` a
 * fake network failure means standing up a router; feeding this function one is
 * three lines, and `test/state.test.ts` does exactly that for each branch. The
 * route keeps only the decision about what to *do* with each outcome.
 */
export type SessionCheck<U = unknown> =
  /*
    Carries the user, rather than leaving the caller to hold onto it separately.
    The gate needs it for its route context, and a version of this that answered
    "signed-in" without saying *who* forced the caller to keep a parallel copy of
    the very thing being classified — which is how the two drift apart.
  */
  | { outcome: "signed-in"; user: NonNullable<U> }
  /** Asked, and answered: no valid session. A redirect is truthful here. */
  | { outcome: "signed-out" }
  /** Could not ask. Not a statement about whether a session exists. */
  | { outcome: "unverifiable"; because: string };

/**
 * Classify the result of `supabase.auth.getUser()`.
 *
 * Takes the pieces rather than the response object so a caller that *threw*
 * instead of returning — `fetch` rejecting outright — can be classified by the
 * same rules, with the thrown value passed as `error`.
 */
export function classifySessionCheck<U>(error: unknown, user: U): SessionCheck<U> {
  /*
    A retryable fetch failure is the network, not the account. supabase-js raises
    `AuthRetryableFetchError` for a rejected fetch and for 5xx from the auth
    service, which are precisely the cases where nothing was learned about the
    session.
  */
  if (isAuthRetryableFetchError(error)) {
    return {
      outcome: "unverifiable",
      because: "I couldn’t reach the service that checks whether you’re signed in.",
    };
  }

  /*
    A `TypeError` from `fetch` that never reached supabase-js at all — an
    offline browser, a DNS failure, a blocked request. Same fact, arriving by a
    different route, so it gets the same answer rather than being allowed to
    fall through to "signed out" as the residual case.
  */
  if (error instanceof TypeError) {
    return {
      outcome: "unverifiable",
      because: "I couldn’t reach the service that checks whether you’re signed in.",
    };
  }

  /*
    Any other auth error is an answer: the token was missing, expired, malformed
    or refused. That is a real "no", and a redirect to sign in is the honest
    response to it.
  */
  if (error) return { outcome: "signed-out" };

  return user ? { outcome: "signed-in", user: user as NonNullable<U> } : { outcome: "signed-out" };
}

/**
 * How long the gate will wait for an answer before treating silence as one.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY A DEADLINE IS PART OF THE STATE MODEL, NOT A PERFORMANCE TWEAK
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Measured, in a browser, with an expired token and the auth host unreachable:
 * `getUser()` took **57.3 seconds** to reject. For all 57 of them the person saw
 * "Verifying your session" and nothing else — no way out, no cancel, no hint
 * that anything was wrong.
 *
 * The classification underneath was already right; it just arrived a minute
 * late. And a spinner is not a neutral thing to show while waiting: it asserts
 * *this is progressing*. After a few seconds against a dead host that assertion
 * is no longer supported by anything, which makes the loading state itself the
 * lie — a UI state claiming more knowledge than the system possesses.
 *
 * So the bound is not "make it feel faster". It is the point past which
 * continuing to show a pending state would be dishonest, and past which the
 * truthful answer is the one this module already has a name for: *unverifiable*.
 * No new state, no new component — the deadline only makes an existing correct
 * answer reachable in human time.
 *
 * Eight seconds: comfortably longer than a slow-but-real auth round trip, far
 * short of the minute a dead host costs.
 */
export const SESSION_CHECK_DEADLINE_MS = 8_000;

/**
 * Ask whether this person is signed in, and give up honestly if nothing answers.
 *
 * `ask` is injected rather than importing the Supabase client here, for the same
 * reason `classifySessionCheck` takes pieces instead of a response: this stays
 * testable with three lines and a fake, and the module keeps no opinion about
 * where the answer comes from.
 *
 * A timeout is reported as `unverifiable` with its own `because`, because it is
 * a different fact from a refused connection and the person is entitled to the
 * one that actually happened. It is emphatically **not** `signed-out`: nothing
 * was learned about the session, which is the whole distinction this module
 * exists to hold.
 */
export async function verifySession<U>(
  ask: () => Promise<{ user: U; error: unknown }>,
  { deadlineMs = SESSION_CHECK_DEADLINE_MS }: { deadlineMs?: number } = {},
): Promise<SessionCheck<U>> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const answered = (async (): Promise<SessionCheck<U>> => {
    try {
      const { user, error } = await ask();
      return classifySessionCheck(error, user);
    } catch (thrown) {
      return classifySessionCheck<U>(thrown, null as U);
    }
  })();

  const gaveUp = new Promise<SessionCheck<U>>((resolve) => {
    timer = setTimeout(
      () =>
        resolve({
          outcome: "unverifiable",
          because: "The service that checks whether you’re signed in didn’t answer in time.",
        }),
      deadlineMs,
    );
  });

  try {
    return await Promise.race([answered, gaveUp]);
  } finally {
    /*
      Always, on both paths. A pending timer keeps the process alive under a test
      runner and, in a browser, keeps a resolved promise's callback queued for
      the rest of the deadline.
    */
    clearTimeout(timer);
  }
}

/**
 * Thrown by the gate when the answer never came back.
 *
 * A distinct type rather than a bare `Error`, so the route's boundary can tell
 * "I could not verify your session" apart from "your session is fine and the
 * page underneath it failed" — two errors that reach the same boundary and need
 * completely different sentences.
 */
export class SessionUnverifiable extends Error {
  readonly because: string;

  constructor(because: string) {
    super(because);
    this.name = "SessionUnverifiable";
    this.because = because;
  }
}

/**
 * Recognise one across a serialisation boundary.
 *
 * TanStack Start can carry an error from a server round-trip, and `instanceof`
 * does not survive that. Matching on `name` does, and the class sets it
 * explicitly for this reason.
 */
export function isSessionUnverifiable(error: unknown): boolean {
  return (
    error instanceof SessionUnverifiable ||
    (typeof error === "object" &&
      error !== null &&
      (error as { name?: string }).name === "SessionUnverifiable")
  );
}
