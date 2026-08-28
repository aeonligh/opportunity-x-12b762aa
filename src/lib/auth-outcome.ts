import { isAuthRetryableFetchError } from "@supabase/supabase-js";

/**
 * What happened when someone tried to sign in or create an account.
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
 * ══════════════════════════════════════════════════════════════════════════
 * WHAT THIS PHASE FOUND STILL COLLAPSED
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Five branches were not enough, and two of the remaining gaps were producing
 * the exact screenshots this phase started from.
 *
 * **A successful sign-up was being reported as a lost session.** `signUp`
 * returns `{ data, error }`, and the caller destructured only `error`. With
 * email confirmation enabled — which it is on this project, proven by
 * `auth.users.confirmation_sent_at` preceding `email_confirmed_at` by three
 * minutes on the one row that exists — a successful sign-up returns *no
 * session*, cleanly, by design. The caller then waited six seconds for a
 * session that was never coming and reported "the session didn't arrive". The
 * account creation had worked. The product said something had gone wrong.
 *
 * **A `no-session` outcome claimed to know something it could not.** Its copy
 * read "Nothing is wrong with your account, and nothing was changed." Neither
 * half is checkable from a client that has just failed to establish a session:
 * it does not know the state of the account, and if the attempt was a sign-up
 * something very much was changed. It is gone.
 *
 * **A network fault and a broken service were the same branch.** Both are
 * `AuthRetryableFetchError`, but "your connection didn't reach us" and "we
 * reached the service and it is failing" are different facts and different
 * advice. The status separates them; nothing was reading it.
 *
 * **A misconfiguration was reported as a bad password.** A disabled provider,
 * a missing environment variable, a wrong publishable key: all fell through to
 * the residual branch, which blamed the person's credentials for a fault they
 * could not see, did not cause, and cannot fix.
 *
 * **The residual branch itself was `rejected`.** So *any* unrecognised failure
 * accused the password. The residual is now `unexpected`, and `rejected` is
 * reached only by an error that actually says a credential was refused.
 *
 * ── Why the outcomes are named rather than booleans ───────────────────────
 *
 * Because what the person should *do* differs for each, and only one warrants
 * "check your password":
 *
 *   invalid-input       — refused here. Nothing was sent, nothing was learned.
 *   rejected            — the service answered, and said no. A real answer.
 *   weak-password       — the service answered, and said this password is not
 *                         allowed. Its reason, in its words, because the policy
 *                         is Supabase's and this application does not hold it.
 *   unconfirmed         — the account exists and its email was never confirmed.
 *   confirm-email       — sign-up went through; a confirmation step remains.
 *   signup-uncertain    — sign-up returned neither an account nor a refusal.
 *   unreachable         — nothing was established. Says nothing about anything.
 *   service-unavailable — reached, and failing. Also says nothing about you.
 *   rate-limited        — the service answered, and asked us to wait.
 *   no-session          — accepted, and no session appeared.
 *   callback-failed     — a provider sent us back with an error instead.
 *   misconfigured       — this application is set up wrongly. Not your fault.
 *   unexpected          — an answer nothing here recognises. Said plainly.
 *
 * ── Why the copy lives here ───────────────────────────────────────────────
 *
 * So it can be tested without a browser, and so a future branch cannot be added
 * without also being given something truthful to say. A raw `error.message` from
 * an auth library is not product copy: it is an implementation detail that
 * happens to be a sentence.
 */

/**
 * Whether this is something that went wrong, or something that went right and
 * is not finished.
 *
 * The distinction exists because `confirm-email` was the state that had no home:
 * it is not a failure, so rendering it in the failure card's red would say the
 * sign-up did not work, and it is not a success either, because the person
 * cannot get in yet. It is carried on the outcome rather than derived at the
 * render, so a new branch has to decide which it is instead of inheriting
 * whatever the card happens to do.
 */
export type AuthTone = "problem" | "notice";

/**
 * One outcome, with its tone and retryability fixed by its kind.
 *
 * Pinned as type parameters rather than declared as fields so the compiler
 * refuses "a rejected credential you should retry" and "a notice that is
 * actually a failure". Thirteen hand-written branches would say the same thing
 * five times each; this says it once.
 */
type Outcome<K extends string, T extends AuthTone, R extends boolean> = {
  kind: K;
  tone: T;
  /** What happened. */
  what: string;
  /** What is still true regardless — the half that stops a failure reading as a verdict. */
  stillTrue: string;
  /** What this person can actually do about it. */
  whatYouCanDo: string;
  retryable: R;
};

export type AuthOutcome =
  /*
    Refused before anything was sent. Not produced by `classifyAuthFailure`,
    which classifies what a service *answered* — this one exists because
    nothing was asked. See `lib/auth-input.ts`.
  */
  | Outcome<"invalid-input", "problem", false>
  | Outcome<"rejected", "problem", false>
  | Outcome<"weak-password", "problem", false>
  | Outcome<"unconfirmed", "problem", false>
  | Outcome<"confirm-email", "notice", false>
  | Outcome<"signup-uncertain", "problem", true>
  | Outcome<"unreachable", "problem", true>
  | Outcome<"service-unavailable", "problem", true>
  | Outcome<"rate-limited", "problem", true>
  | Outcome<"no-session", "problem", true>
  | Outcome<"callback-failed", "problem", true>
  | Outcome<"misconfigured", "problem", false>
  | Outcome<"unexpected", "problem", true>;

/** Set when the object carries an HTTP-ish status, whatever its class. */
function statusOf(error: unknown): number | null {
  if (typeof error === "object" && error !== null) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return null;
}

/**
 * Supabase's own error code, where there is one.
 *
 * Preferred over the message wherever both are available: `code` is a stable
 * identifier and the message is prose that can be reworded upstream without
 * warning. Matching prose is what makes a classifier quietly rot into its
 * residual branch.
 */
function codeOf(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code.toLowerCase();
  }
  return "";
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "");
}

/**
 * What Supabase said about the password, passed through unchanged.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * THE PASSWORD POLICY IS NOT THIS APPLICATION'S TO STATE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A minimum length, a required character class, a banned-password list: all of
 * it is configured in the Supabase project and enforced by Supabase. This
 * repository cannot read it. It is not in the database — the `auth` schema has
 * twenty-three tables and none of them is a config table — it is not in the
 * project metadata, and the auth service is not reachable from here.
 *
 * So printing "at least 8 characters, one number" under the field would be a
 * guess wearing the clothes of a rule, and the failure mode is the bad one: it
 * is right until somebody changes the project setting, and then it is a
 * confident, prominent, wrong instruction that nobody thinks to look at.
 *
 * The rule this product already applies to opportunities applies to its own
 * form. Do not state what you have not checked. The requirement is therefore
 * carried from the only place that holds it, in the words of the service that
 * enforces it, at the moment it is enforced.
 *
 * The message is sanitised, not trusted: capped, and rejected outright if it
 * carries a URL, a code-shaped token or anything else that reads as an
 * implementation detail rather than a sentence for a person.
 */
const PROVIDER_REASON_MAX = 160;

function providerReason(message: string): string | null {
  const text = message.trim();
  if (text.length === 0 || text.length > PROVIDER_REASON_MAX) return null;
  /* A sentence for a person contains none of these. */
  if (/https?:\/\/|[{}<>]|_[a-z]+_|\bnull\b|\bundefined\b/i.test(text)) return null;
  return text.endsWith(".") ? text : `${text}.`;
}

/**
 * Classify a failed sign-in or sign-up attempt.
 *
 * Ordered so that the branches which say something *about the person* are
 * reached only by errors that are actually about the person. Everything else —
 * a network fault, a failing service, a misconfigured project, an answer
 * nothing here recognises — lands somewhere that says so.
 *
 * The residual is `unexpected`, not `rejected`. It used to be `rejected`, on
 * the reasoning that a service which answered is more likely to have refused
 * than to have broken. That reasoning is sound and the conclusion was still
 * wrong: it made "I do not recognise this" indistinguishable from "your
 * password is wrong", which is precisely the collapse the rest of this file
 * exists to prevent. An unrecognised answer is now reported as one.
 */
export function classifyAuthFailure(error: unknown): AuthOutcome {
  const message = messageOf(error);
  const lower = message.toLowerCase();
  const code = codeOf(error);
  const status = statusOf(error);

  /*
    ── Configuration, first ──────────────────────────────────────────────────

    Checked before anything else because a misconfigured project produces
    ordinary-looking 4xx answers, and every one of them would otherwise be read
    as a statement about the person's credentials. Nothing the person types can
    change any of these, so offering them "check your password" is worse than
    saying nothing.
  */
  if (
    lower.includes("missing supabase environment variable") ||
    lower.includes("invalid api key") ||
    lower.includes("no api key") ||
    code === "signup_disabled" ||
    code === "email_provider_disabled" ||
    code === "provider_disabled" ||
    lower.includes("signups not allowed") ||
    lower.includes("is not enabled")
  ) {
    return {
      kind: "misconfigured",
      tone: "problem",
      what: "Signing in isn’t set up correctly on my side.",
      stillTrue:
        "This is my configuration, not your account and not what you typed. Nothing you change here will get past it.",
      whatYouCanDo:
        "There is nothing for you to fix. If you know who runs this, tell them sign-in is misconfigured.",
      retryable: false,
    };
  }

  /*
    ── Nothing was established ───────────────────────────────────────────────

    A bare `TypeError` is a fetch that never reached supabase-js at all —
    offline, DNS, a blocked request. `AuthRetryableFetchError` with a zero or
    absent status is the same thing seen from one layer up.
  */
  const retryableFetch = isAuthRetryableFetchError(error);
  if ((retryableFetch && !status) || error instanceof TypeError) {
    return {
      kind: "unreachable",
      tone: "problem",
      what: "I couldn’t reach the service that signs you in.",
      stillTrue:
        "This says nothing about your password — I never got far enough to check it. Your account is untouched.",
      whatYouCanDo: "Check your connection and try again. Nothing needs retyping.",
      retryable: true,
    };
  }

  /*
    ── Reached, and failing ──────────────────────────────────────────────────

    Distinct from unreachable, because the two need different patience: a
    connection problem is usually the person's to fix and often fixes itself in
    seconds; a service returning 5xx is nobody-here's to fix and may take a
    while. Merging them made one of the two pieces of advice always wrong.
  */
  if (retryableFetch || (status !== null && status >= 500)) {
    return {
      kind: "service-unavailable",
      tone: "problem",
      what: "The service that signs you in is having trouble.",
      stillTrue:
        "I reached it and it failed on its own. That is not about your password, and your account is untouched.",
      whatYouCanDo:
        "Wait a little and try again. If it keeps happening, it is down rather than busy.",
      retryable: true,
    };
  }

  /* The service answered and asked us to wait. Retrying immediately makes it worse. */
  if (
    status === 429 ||
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    lower.includes("rate limit") ||
    lower.includes("too many requests")
  ) {
    return {
      kind: "rate-limited",
      tone: "problem",
      what: "Too many attempts in a short time.",
      stillTrue: "The service asked me to wait rather than refusing you. Nothing has been locked.",
      whatYouCanDo: "Wait a minute or two, then try again.",
      retryable: true,
    };
  }

  /*
    ── The password the service will not accept ──────────────────────────────

    Reached only on sign-up, and the one place a requirement is stated to a
    person. The requirement comes from Supabase, in Supabase's words, because
    Supabase is the only party that knows it. See `providerReason`.
  */
  if (
    code === "weak_password" ||
    lower.includes("password should be") ||
    lower.includes("weak password")
  ) {
    const reason = providerReason(message);
    return {
      kind: "weak-password",
      tone: "problem",
      what: "That password doesn’t meet the requirements for this site.",
      stillTrue: reason
        ? `The requirement, as the sign-in service stated it: ${reason}`
        : "The sign-in service sets that requirement, and it didn’t say which part failed.",
      whatYouCanDo: "Choose a longer or less common password and try again.",
      retryable: false,
    };
  }

  /* A real account whose email was never confirmed. Distinct from a wrong password. */
  if (code === "email_not_confirmed" || lower.includes("not confirmed")) {
    return {
      kind: "unconfirmed",
      tone: "problem",
      what: "This account exists, but its email address was never confirmed.",
      stillTrue: "Your password may well be correct — confirmation is a separate step.",
      whatYouCanDo: "Check your inbox for the confirmation email, then sign in again.",
      retryable: false,
    };
  }

  /*
    ── Accepted, and no session appeared ─────────────────────────────────────

    Rare and real: a successful password check followed by a failed session
    exchange. It must not be reported as a wrong password.

    Its second line used to read "Nothing is wrong with your account, and
    nothing was changed." A client that has just failed to establish a session
    knows neither of those things, and where the attempt was a sign-up the
    second half was flatly false. What replaced it is the only thing actually
    established: the credentials got past the service.
  */
  if (lower.includes("session did not become available")) {
    return {
      kind: "no-session",
      tone: "problem",
      what: "Your details were accepted, and the session didn’t arrive.",
      stillTrue:
        "Getting that far means the service did not refuse your details. What failed was the step after.",
      whatYouCanDo: "Try again. If it happens twice, reload the page first.",
      retryable: true,
    };
  }

  /*
    ── The service answered, and said no ─────────────────────────────────────

    The only branch allowed to blame the password, and it is now reached only by
    an error that says a credential was refused, rather than by everything the
    classifier failed to recognise.

    The wording commits to neither "wrong password" nor "no such account".
    Supabase answers both with the same `invalid_credentials`, and adding a
    distinction it deliberately withheld would rebuild account enumeration on
    top of a service that had already prevented it.
  */
  if (
    code === "invalid_credentials" ||
    code === "invalid_grant" ||
    lower.includes("invalid login credentials") ||
    lower.includes("invalid grant")
  ) {
    return {
      kind: "rejected",
      tone: "problem",
      what: "That email and password don’t match an account.",
      stillTrue: "I did reach the service, so this is an answer rather than a guess.",
      whatYouCanDo: "Check the address and the password, or create an account instead.",
      retryable: false,
    };
  }

  /* An answer nothing here recognises, reported as exactly that. */
  return {
    kind: "unexpected",
    tone: "problem",
    what: "Something went wrong that I don’t recognise.",
    stillTrue:
      "I can’t tell you whether your details were the problem, because I don’t know what this answer means. I’m not going to guess and blame your password.",
    whatYouCanDo: "Try again. If it keeps happening, it is unlikely to be anything you typed.",
    retryable: true,
  };
}

/**
 * What `signUp` actually returned.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * THE BUG THIS PHASE WAS CALLED IN FOR
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The caller was:
 *
 *     const { error } = await supabase.auth.signUp({ ... });
 *     if (error) throw error;
 *     const ok = await waitForSession(6000);
 *     if (!ok) throw new Error(SESSION_NEVER_ARRIVED);
 *
 * `data` was discarded. That is fine only if a sign-up that does not throw
 * always produces a session, and on this project it never does — email
 * confirmation is enabled, so `signUp` succeeds and deliberately returns
 * `session: null`. Every successful sign-up therefore spent six seconds
 * polling for something that was never coming and then reported a failure.
 *
 * ── The response this must NOT read too closely ───────────────────────────
 *
 * When the address already belongs to a confirmed account, Supabase returns
 * the *same shape* — a user object, no session — with no email sent. That is
 * deliberate on their side: the documentation calls it an obfuscated response
 * and says it "prevents user enumeration attacks". The tell is an empty
 * `identities` array.
 *
 * Reading that tell would hand the client back exactly the answer Supabase
 * spent the design refusing to give: type an address, learn whether it has an
 * account. Anyone can type an address. So this function does not look, and the
 * two cases share one outcome — which is why that outcome's copy says what is
 * true of both and declines to say which one happened.
 */
export type SignUpReading =
  /** A session came back with the account. Nothing further is required. */
  | { established: true }
  /** No session, for a reason worth stating. */
  | { established: false; outcome: AuthOutcome };

/**
 * Read a `signUp` response without looking at what it must not look at.
 *
 * Deliberately structural, and deliberately narrow: `session` decides, `user`
 * decides the fallback, and `identities` is never touched.
 */
export function classifySignUp(data: {
  user: { id?: string } | null;
  session: { access_token?: string } | null;
}): SignUpReading {
  if (data.session) return { established: true };

  if (data.user) {
    return {
      established: false,
      outcome: {
        kind: "confirm-email",
        tone: "notice",
        what: "Check your email to finish signing up.",
        /*
          Every word of this is true whether the address was new or already had
          an account, which is the whole requirement. "Your account was created"
          would be more satisfying to read and would be a claim this client
          cannot make: for an address that already exists, nothing was created
          and no email was sent.
        */
        stillTrue:
          "If that address still needs confirming, a link is on its way to it. I won’t tell you whether it already belongs to an account — anyone can type an address in, so that answer isn’t mine to give.",
        whatYouCanDo:
          "Open the link in that email, then come back and sign in. If you already have an account with this address, sign in with your existing password instead.",
        retryable: false,
      },
    };
  }

  /*
    Neither a session nor an account, and no error either. Nothing in the
    supabase-js contract produces this, which is exactly why it is worth having
    a branch: the alternative is falling into whichever branch happens to be
    last and asserting something about a response nobody has seen.
  */
  return {
    established: false,
    outcome: {
      kind: "signup-uncertain",
      tone: "problem",
      what: "I sent your details and didn’t get a clear answer back.",
      stillTrue:
        "I can’t tell you whether an account was created. I would rather say that than pick the more comfortable answer.",
      whatYouCanDo:
        "Try signing in with those details. If that doesn’t work, create the account again — a second attempt with the same address is safe.",
      retryable: true,
    },
  };
}

/**
 * An OAuth provider that sent the person back with a refusal instead of a code.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * THE FAILURE THAT LOOKED LIKE NOTHING HAPPENING
 * ══════════════════════════════════════════════════════════════════════════
 *
 * "Continue with Google" leaves the page entirely. When the round trip fails —
 * the person declines the consent screen, the provider is misconfigured, the
 * authorization expires — Google returns them to `/auth` with `?error=` and
 * `?error_description=` in the URL. Nothing read them. The person arrived back
 * at a clean, empty sign-in form with no indication that anything had been
 * attempted, let alone that it had failed.
 *
 * Supabase puts the same pair in the fragment for some flows, so both are
 * checked. Neither is trusted as copy: the description is attacker-supplied in
 * the sense that anyone can send someone a link to `/auth?error_description=…`,
 * so it is used only to distinguish a refusal from a fault, and never rendered.
 */
export function classifyCallbackError(params: {
  error: string | null;
  description?: string | null;
}): AuthOutcome | null {
  if (!params.error) return null;

  const kind = params.error.toLowerCase();

  /* The person said no on the consent screen. Not a failure — a decision. */
  if (kind === "access_denied") {
    return {
      kind: "callback-failed",
      tone: "problem",
      what: "The Google sign-in was cancelled before it finished.",
      stillTrue: "Nothing was shared with me, and no account was created or changed.",
      whatYouCanDo: "Try again, or use an email address and password instead.",
      retryable: true,
    };
  }

  return {
    kind: "callback-failed",
    tone: "problem",
    what: "Google sent you back without signing you in.",
    stillTrue:
      "The handover failed rather than your details being refused — I never received anything to check.",
    whatYouCanDo: "Try again, or use an email address and password instead.",
    retryable: true,
  };
}
