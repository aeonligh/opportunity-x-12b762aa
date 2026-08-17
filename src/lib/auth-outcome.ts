import { isAuthRetryableFetchError } from "@supabase/supabase-js";

/**
 * What happened when someone tried to sign in.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * THE SAME COLLAPSE, AT THE DOOR
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Phase 11 gave the authenticated *gate* three answers instead of two, because
 * `if (error || !data.user) redirect("/auth")` reported an unreachable auth
 * service as "you are signed out". The sign-in *form* still had the original
 * problem, one step earlier and worse:
 *
 *     catch (err) {
 *       toast.error(err instanceof Error ? err.message : "Authentication failed");
 *     }
 *
 * Every failure landed in one branch. A wrong password and a network that could
 * not reach Supabase produced the same outcome, and the message was whatever
 * string the library happened to carry — *"Invalid login credentials"* for both,
 * because that is what a failed round trip and a rejected password both surface
 * as once the distinction has been thrown away.
 *
 * The consequence is specific and cruel: a person on a bad connection is told
 * their password is wrong. They retype a correct password, repeatedly, and are
 * told it is wrong every time. The product has made a confident claim about
 * something it never established, on the one surface where being wrong locks
 * someone out of their own account.
 *
 * ── Why the outcomes are named rather than booleans ───────────────────────
 *
 * Because what the person should *do* differs for each, and only the first
 * warrants "check your password":
 *
 *   rejected      — the service answered, and said no. A real answer.
 *   unconfirmed   — the account exists and its email was never confirmed.
 *   unreachable   — nothing was established. Says nothing about the password.
 *   rate-limited  — the service answered, and asked us to wait.
 *   no-session    — credentials accepted, and no session appeared. Rare, real.
 *
 * ── Why the copy lives here ───────────────────────────────────────────────
 *
 * So it can be tested without a browser, and so a future branch cannot be added
 * without also being given something truthful to say. A raw `error.message` from
 * an auth library is not product copy: it is an implementation detail that
 * happens to be a sentence.
 */
export type AuthOutcome =
  | { kind: "rejected"; what: string; stillTrue: string; whatYouCanDo: string; retryable: false }
  | { kind: "unconfirmed"; what: string; stillTrue: string; whatYouCanDo: string; retryable: false }
  | { kind: "unreachable"; what: string; stillTrue: string; whatYouCanDo: string; retryable: true }
  | { kind: "rate-limited"; what: string; stillTrue: string; whatYouCanDo: string; retryable: true }
  | { kind: "no-session"; what: string; stillTrue: string; whatYouCanDo: string; retryable: true };

/** Set when the object carries an HTTP-ish status, whatever its class. */
function statusOf(error: unknown): number | null {
  if (typeof error === "object" && error !== null) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return null;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "");
}

/**
 * Classify a failed sign-in or sign-up attempt.
 *
 * Ordered most-specific first. The residual case is deliberately `rejected`
 * rather than `unreachable`: an unclassified failure from a service that
 * *answered* is far more likely to be a refusal than a network fault, and
 * claiming "we couldn't reach the service" when we could is the mirror image of
 * the defect this exists to fix.
 */
export function classifyAuthFailure(error: unknown): AuthOutcome {
  const message = messageOf(error).toLowerCase();
  const status = statusOf(error);

  /*
    Nothing was established. `AuthRetryableFetchError` covers a rejected fetch
    and 5xx from the auth service; a bare `TypeError` is a fetch that never
    reached supabase-js at all — offline, DNS, a blocked request.
  */
  if (isAuthRetryableFetchError(error) || error instanceof TypeError) {
    return {
      kind: "unreachable",
      what: "I couldn’t reach the service that signs you in.",
      stillTrue:
        "This says nothing about your password — I never got far enough to check it. Your account is untouched.",
      whatYouCanDo: "Try again in a moment. If it keeps failing, the service is likely down.",
      retryable: true,
    };
  }

  /* The service answered and asked us to wait. Retrying immediately makes it worse. */
  if (status === 429 || message.includes("rate limit") || message.includes("too many requests")) {
    return {
      kind: "rate-limited",
      what: "Too many sign-in attempts in a short time.",
      stillTrue: "Your account is fine, and nothing has been locked.",
      whatYouCanDo: "Wait a minute or two, then try again.",
      retryable: true,
    };
  }

  /* A real account whose email was never confirmed. Distinct from a wrong password. */
  if (message.includes("not confirmed") || message.includes("email not confirmed")) {
    return {
      kind: "unconfirmed",
      what: "This account exists, but its email address was never confirmed.",
      stillTrue: "Your password may well be correct — confirmation is a separate step.",
      whatYouCanDo: "Check your inbox for the confirmation email, then sign in again.",
      retryable: false,
    };
  }

  /*
    Credentials accepted and no session appeared. Rare and real — it is what a
    successful password check followed by a failed session exchange looks like —
    and it must not be reported as a wrong password either.
  */
  if (message.includes("session did not become available")) {
    return {
      kind: "no-session",
      what: "Your details were accepted, and the session didn’t arrive.",
      stillTrue: "Nothing is wrong with your account, and nothing was changed.",
      whatYouCanDo: "Try again. If it happens twice, reload the page first.",
      retryable: true,
    };
  }

  /* The service answered, and said no. The only branch allowed to blame the password. */
  return {
    kind: "rejected",
    what: "That email and password don’t match an account.",
    stillTrue: "I did reach the service, so this is an answer rather than a guess.",
    whatYouCanDo: "Check the address and the password, or create an account instead.",
    retryable: false,
  };
}
