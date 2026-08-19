import type { AuthOutcome } from "@/lib/auth-outcome";

/**
 * The credentials contract, at Opportunity X's own boundary.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHAT THIS IS FOR, AND WHAT IT DELIBERATELY IS NOT
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Supabase owns authentication: it stores the password, hashes it, compares it,
 * and decides what a valid credential is. Opportunity X never sees a password
 * again after handing it over, never stores one, and has no business deciding
 * what makes a good one. Re-implementing any of that here would be building a
 * second authentication system beside the real one.
 *
 * So this is **not** a password policy. It is the narrow set of things this
 * application can honestly check before spending a network round trip and
 * before handing a value to somebody else's API:
 *
 *   - the fields are present, and are strings
 *   - the address is shaped like an address
 *   - neither field is pathologically large
 *
 * ── Why the boundary needed one at all ────────────────────────────────────
 *
 * The form had `required`, `type="email"` and `minLength`, and nothing else.
 * Those are browser conveniences: they are gone the moment a form is submitted
 * programmatically, the attribute is edited in devtools, or `noValidate` is
 * set. Nothing in the submit handler looked at what it was sending. A
 * multi-megabyte string in a password field was accepted, held in React state,
 * and posted to the auth service.
 *
 * ── The password is opaque, and is never touched ──────────────────────────
 *
 * Not trimmed, not normalised, not case-folded, not truncated. A credential
 * that the application quietly rewrites is a different credential from the one
 * the person typed, and the failure mode — an account that cannot be signed
 * into with its own password — is the worst kind, because it looks like the
 * person's mistake. Its length is measured; its content is never read.
 *
 * The address *is* trimmed, because a trailing space from a paste is not part
 * of anyone's email and is the single most common way a correct address is
 * rejected. Case is left alone: Supabase already treats addresses
 * case-insensitively, and lowercasing here would be this application forming an
 * opinion about identity that it does not own.
 */

/**
 * RFC 5321's limit on a forward path. Anything longer is not an address that
 * could be delivered to, so there is nothing to be gained by asking.
 */
export const MAX_EMAIL_LENGTH = 254;

/**
 * A ceiling, not a policy.
 *
 * Long passphrases are good and this must not discourage them; 1024 characters
 * is far beyond any human-chosen secret and far below the size at which a field
 * becomes a way to make somebody else's server do work. Supabase enforces
 * whatever real minimum the project is configured with — this says nothing
 * about strength, only about magnitude.
 */
export const MAX_PASSWORD_LENGTH = 1024;

/**
 * Deliberately permissive: one `@`, something either side, a dot in the domain,
 * no whitespace. The authoritative check is Supabase's, and after that the
 * only real check is whether mail arrives. A stricter pattern here would reject
 * valid addresses — which is a worse outcome than passing a doubtful one on to
 * the service that actually decides.
 */
const PLAUSIBLE_EMAIL = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

/** Accepted, with the exact values that should be sent onward. */
export interface AcceptedCredentials {
  ok: true;
  email: string;
  password: string;
}

/** Refused here, with something true to say about why. */
export interface RefusedCredentials {
  ok: false;
  problem: AuthOutcome;
}

function refuse(what: string, whatYouCanDo: string): RefusedCredentials {
  return {
    ok: false,
    problem: {
      kind: "invalid-input",
      what,
      /*
        The half that keeps a refusal from reading as a verdict. Nothing was
        sent, so nothing was checked, and nothing about the account is known —
        exactly the distinction the rest of this product holds everywhere else.
      */
      stillTrue: "Nothing was sent, so this says nothing about whether the account exists.",
      whatYouCanDo,
      retryable: false,
    },
  };
}

/**
 * Check what can honestly be checked, and pass the rest to Supabase.
 *
 * Takes `unknown` so it is the same function whether the values came from
 * controlled inputs or from somewhere less trustworthy.
 */
export function validateCredentials(input: {
  email: unknown;
  password: unknown;
}): AcceptedCredentials | RefusedCredentials {
  const { email, password } = input;

  if (typeof email !== "string" || typeof password !== "string") {
    return refuse(
      "I couldn’t read the details you submitted.",
      "Type your email address and password into the form and try again.",
    );
  }

  /* Trimmed for the address only. See the note above on why never the password. */
  const address = email.trim();

  if (address.length === 0) {
    return refuse(
      "An email address is needed to sign in.",
      "Enter the address you signed up with.",
    );
  }
  if (password.length === 0) {
    return refuse("A password is needed to sign in.", "Enter your password and try again.");
  }
  if (address.length > MAX_EMAIL_LENGTH) {
    return refuse(
      "That email address is longer than any real address can be.",
      `Check it for a paste that went wrong — addresses stop at ${MAX_EMAIL_LENGTH} characters.`,
    );
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return refuse(
      "That password is too long to send.",
      `Passphrases are welcome, but this one is over ${MAX_PASSWORD_LENGTH} characters.`,
    );
  }
  if (!PLAUSIBLE_EMAIL.test(address)) {
    return refuse(
      "That doesn’t look like an email address.",
      "Check for a missing @ or a typo in the domain.",
    );
  }

  return { ok: true, email: address, password };
}
