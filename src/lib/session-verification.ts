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
export type SessionCheck =
  | { outcome: "signed-in" }
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
export function classifySessionCheck(error: unknown, user: unknown): SessionCheck {
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

  return user ? { outcome: "signed-in" } : { outcome: "signed-out" };
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
