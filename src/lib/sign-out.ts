import { verifySession, type SessionCheck } from "@/lib/session-verification";

/**
 * Ending a session, and knowing whether it actually ended.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY A SIGN-OUT IS A WRITE, AND WRITES ARE READ BACK
 * ══════════════════════════════════════════════════════════════════════════
 *
 * This product already refuses to call a declaration saved because the write
 * returned without an error — the control changes only after a read confirms
 * the row. A sign-out is the same shape of claim, with a worse failure mode: a
 * person told "you have been signed out" walks away from a shared machine.
 *
 * So `signOut()` returning cleanly is not the answer. It is the *request*. The
 * answer is what a subsequent read of the session says, and there are three:
 *
 *   signed-out    — read back, and there is no session. Confirmed.
 *   failed        — read back, and the session is still there. Nothing ended.
 *   unverifiable  — the read could not be made. Nothing is known either way.
 *
 * ── The ambiguous case this exists for ────────────────────────────────────
 *
 * `signOut()` can reject while the server has *already* ended the session — a
 * response lost on the way back, a socket closed after the row was deleted.
 * Treating that rejection as failure would leave someone believing they are
 * still signed in when they are not, which is the same lie inverted.
 *
 * Reading the session afterwards settles it, whichever way the call went. The
 * request's own error is only ever used to *explain* an outcome the read
 * established — never to decide one.
 *
 * ── And the reverse ───────────────────────────────────────────────────────
 *
 * A `signOut()` that resolves cleanly while the session is still readable is
 * **not** a success. It is the write-succeeded-read-disagrees case, and the
 * honest report is that the person is still signed in.
 *
 * ── Why `unverifiable` is not `failed` ────────────────────────────────────
 *
 * The same distinction the authenticated gate holds. "I could not end your
 * session" is a claim about the session; "I could not check" is a claim about
 * this system. Only the first justifies telling someone they are still signed
 * in, and only a confirmed sign-out justifies sending them to `/auth`.
 */
export type SignOutOutcome =
  /** Read back: there is no session. The only outcome that may navigate away. */
  | { outcome: "signed-out" }
  /** Read back: the session is still there. Nothing ended. */
  | { outcome: "failed"; because: string }
  /** The read could not be made. Nothing is known about the session either way. */
  | { outcome: "unverifiable"; because: string };

/** What `performSignOut` needs, injected so the laboratory can drive the real path. */
export interface SignOutDeps {
  /** The real `supabase.auth.signOut()`, or a rigged stand-in. */
  signOut: () => Promise<{ error: unknown }>;
  /** The real `supabase.auth.getUser()`, reshaped. */
  readSession: () => Promise<{ user: unknown; error: unknown }>;
}

function reasonFrom(raised: unknown): string | null {
  if (!raised) return null;
  if (raised instanceof Error && raised.message) return raised.message;
  if (typeof raised === "object" && raised !== null && "message" in raised) {
    const message = (raised as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return null;
}

/**
 * Ask for the session to end, then find out whether it did.
 *
 * The read is bounded by `verifySession`, so a dead auth host produces
 * `unverifiable` in seconds rather than leaving a control spinning. See
 * `SESSION_CHECK_DEADLINE_MS`.
 */
export async function performSignOut(
  deps: SignOutDeps,
  options: { deadlineMs?: number } = {},
): Promise<SignOutOutcome> {
  let raised: unknown = null;
  try {
    const { error } = await deps.signOut();
    raised = error;
  } catch (thrown) {
    raised = thrown;
  }

  /*
    The read decides, whatever the request did. Deliberately unconditional:
    skipping it when `signOut()` looked fine is exactly how "we asked" becomes
    "it happened".
  */
  const after: SessionCheck = await verifySession(deps.readSession, options);

  if (after.outcome === "signed-out") return { outcome: "signed-out" };

  if (after.outcome === "unverifiable") {
    return {
      outcome: "unverifiable",
      because:
        "I asked for your session to end, and then couldn’t reach the service to check whether it did.",
    };
  }

  /*
    Still signed in. The request's own error explains *why* where there is one;
    where there is not, the request claimed to succeed and the session
    disagreed, and saying so plainly is better than inventing a cause.
  */
  const why = reasonFrom(raised);
  return {
    outcome: "failed",
    because: why
      ? "I couldn’t end your session."
      : "I asked for your session to end, but you are still signed in.",
  };
}
