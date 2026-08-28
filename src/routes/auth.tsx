import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { safeRedirectPath, AUTH_LANDING_PATH } from "@/lib/safe-redirect";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { BrandLoader } from "@/components/BrandLoader";
import {
  classifyAuthFailure,
  classifyCallbackError,
  classifySignUp,
  type AuthOutcome,
} from "@/lib/auth-outcome";
import {
  validateCredentials,
  describeEmailProblem,
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_LENGTH,
} from "@/lib/auth-input";
import { BrandMark } from "@/components/BrandMark";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Opportunity X" },
      {
        name: "description",
        content: "Sign in to Opportunity X to discover and share opportunities.",
      },
    ],
  }),
  component: AuthPage,
});

/**
 * Wait until the browser client has actually persisted a session before
 * navigating to a protected route. Prevents the classic race where
 * onAuthStateChange fires SIGNED_IN but the _authenticated gate's
 * getUser() call runs before the session is readable.
 */
async function waitForSession(timeoutMs = 8000): Promise<boolean> {
  const start = Date.now();
  /*
    The re-validation is bounded separately from the wait.

    This polled every 120ms and called `getUser()` — a network round trip —
    every time a session was present. If the session existed but the auth
    service was struggling, that was up to sixty-odd requests in eight seconds,
    from a client that had just been told the service was having trouble. An
    application that answers a slow service by asking it more often is a
    retry storm with a friendly name.

    Waiting for the session to *appear* is a local read and costs nothing, so
    that keeps its loop. Confirming it with the server is attempted a few times
    and then given up on.
  */
  let confirmations = 0;
  while (Date.now() - start < timeoutMs) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      if (confirmations >= MAX_SESSION_CONFIRMATIONS) return false;
      confirmations += 1;
      const { data: userData, error } = await supabase.auth.getUser();
      if (!error && userData.user) return true;
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  return false;
}

/**
 * How many times a present-but-unconfirmable session is re-checked.
 *
 * Three, spread across the wait. Enough to ride out one bad round trip; far
 * short of hammering a service that has already failed twice.
 */
const MAX_SESSION_CONFIRMATIONS = 3;

/**
 * The sentence `classifyAuthFailure` looks for when a sign-in succeeded and no
 * session followed.
 *
 * Shared, because it was written out twice — thrown here, matched by a
 * lowercase `includes()` there — with nothing binding the two. Changing the
 * wording in either place would have sent this outcome to the classifier's
 * residual branch, which was `rejected`: the one branch allowed to blame the
 * password. A successful password check would have been reported as a wrong
 * password, and the only clue would have been a diff that read like copy
 * editing.
 */
export const SESSION_NEVER_ARRIVED = "Session did not become available";

/**
 * Where to send this person once they are signed in.
 *
 * `?next=` is whatever was in the URL, which means it is attacker-controlled:
 * read through `safeRedirectPath`, never used raw. Resolved at call time rather
 * than stored, because the search string is only meaningful on this render.
 */
function destination(): string {
  if (typeof window === "undefined") return AUTH_LANDING_PATH;
  const next = new URLSearchParams(window.location.search).get("next");
  return safeRedirectPath(next);
}

/**
 * Read a failed OAuth return, and take it out of the URL.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * THE FAILURE THAT LOOKED LIKE NOTHING HAPPENING
 * ══════════════════════════════════════════════════════════════════════════
 *
 * "Continue with Google" leaves the page. When the round trip fails — the
 * person declines the consent screen, the provider is misconfigured, the
 * authorization expires — they are returned to `/auth` carrying `error` and
 * `error_description`. Nothing read them. What the person saw was a clean,
 * empty sign-in form, with no sign that anything had been attempted at all,
 * which is indistinguishable from having mistyped the URL.
 *
 * Both carriers are checked: a query string for the OAuth 2.0 error response,
 * and the fragment, which is where some Supabase flows put the same pair.
 *
 * The params are then removed from the address bar. Two reasons, and the second
 * is the one that matters: a reload would otherwise re-raise a failure that has
 * already been read and acted on, and `?error_description=` is a text field on
 * this application's own sign-in page that anybody can fill in by sending a
 * link. It is used here only to tell a refusal from a fault. It is never
 * rendered — see `classifyCallbackError`.
 */
function takeCallbackFailure(): AuthOutcome | null {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));

  const error = url.searchParams.get("error") ?? fragment.get("error");
  if (!error) return null;

  const description =
    url.searchParams.get("error_description") ?? fragment.get("error_description");
  const outcome = classifyCallbackError({ error, description });

  for (const key of ["error", "error_code", "error_description"]) {
    url.searchParams.delete(key);
    fragment.delete(key);
  }
  const rest = fragment.toString();
  url.hash = rest ? `#${rest}` : "";
  window.history.replaceState(null, "", url.toString());

  return outcome;
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  /*
    ══════════════════════════════════════════════════════════════════════════
    UNCONTROLLED, SO THE CREDENTIAL IS NOT WRITTEN INTO THE MARKUP
    ══════════════════════════════════════════════════════════════════════════

    These were `useState`. React renders a controlled input's value as an HTML
    **attribute**, which puts whatever has been typed into
    `document.documentElement.outerHTML` — measured, with a marker string, in
    the browser walk.

    That is one DOM serialisation away from a plaintext password leaving the
    page: session-replay and error-reporting tools attach DOM snapshots, HTML
    export writes attributes, and any third-party script with DOM access can
    read it without touching the input element at all. The browser has to hold
    what was typed — that is unavoidable and lives in the element's *property* —
    but nothing requires it to also be in the serialised markup.

    Refs keep the values out of React's render output entirely, and nothing else
    in this component ever needed to read them: they are used once, at submit.
    Uncontrolled inputs also survive the sign-in/sign-up toggle, a failed
    attempt, and the show/hide toggle below without losing what somebody has
    already typed — which is the whole of this form's "preserve what was
    entered" behaviour, and it is structural rather than something a handler
    has to remember to do.
  */
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  /*
    Reveal is a property of the field, not of what is in it.

    Toggling `type` leaves the same DOM node in place, so the value is untouched
    and the caret does not move. Crucially it also does not make the input
    controlled: `type="text"` renders a type attribute, never a value attribute,
    so the security property measured above still holds while the password is
    on screen. A "show password" built by swapping in a controlled text input —
    the obvious implementation — would have written the plaintext straight into
    the markup, which is the one thing this form is careful not to do.
  */
  const [revealed, setRevealed] = useState(false);
  // True while an OAuth handshake is in-flight and we've confirmed a session
  // but are about to navigate. Renders the full-screen BrandLoader so no
  // stale content flashes and no protected surface is exposed.
  const [handingOff, setHandingOff] = useState(false);
  /*
    The last outcome, kept on screen rather than thrown at a toast.

    A toast is the wrong surface for this: it is transient, it stacks, and it
    disappears while the person is still reading the form it refers to. An
    authentication outcome is the one message someone needs to be able to look
    back at while they retype something.

    Named `failure` historically; it now carries notices too — a sign-up that
    worked and needs an email confirming is not a failure, and saying so in red
    would tell somebody their account was not created when it was.
  */
  const [failure, setFailure] = useState<AuthOutcome | null>(null);
  /*
    The one thing worth checking while the person is still looking at the field.

    Address shape only. There is deliberately no password hint beside the
    password field: the requirements are Supabase's, this repository cannot read
    them, and a made-up "8 characters, one number" would be a guess that reads
    like a rule. What the service actually requires arrives from the service, on
    the one occasion it is relevant. See `weak-password` in `auth-outcome.ts`.
  */
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const initialCheckDone = useRef(false);
  /*
    Double-submit, closed at the source rather than at the button.

    `disabled={loading}` is a render away from the click, so a second Enter
    press inside the same tick, an autofill that submits, or a disabled
    attribute somebody edits all get a second request through. This ref is set
    synchronously, before the first `await`.
  */
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;

    /* A provider that sent this person back with a refusal, read before anything else. */
    const callbackFailure = takeCallbackFailure();
    if (callbackFailure) setFailure(callbackFailure);

    // Initial check — if the visitor is already signed in, hand off.
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled && data.user) {
        setHandingOff(true);
        await navigate({ to: destination() });
      }
      initialCheckDone.current = true;
    })();

    // Listen for identity transitions triggered elsewhere (popup OAuth).
    // Filter to SIGNED_IN and ignore INITIAL_SESSION / TOKEN_REFRESHED.
    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      if (event !== "SIGNED_IN") return;
      if (!initialCheckDone.current) return;
      // Confirm the session is really readable before we navigate.
      const ok = await waitForSession(4000);
      if (cancelled || !ok) return;
      setHandingOff(true);
      await navigate({ to: destination() });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    setFailure(null);
    setEmailHint(null);

    /*
      Checked here, before anything is sent. The form's `required` and
      `type="email"` are browser conveniences and are gone the moment a submit
      is made programmatically or an attribute is edited. See `lib/auth-input.ts`
      for what this does and does not claim to be — it is not a password policy.
    */
    const checked = validateCredentials({
      email: emailRef.current?.value ?? "",
      password: passwordRef.current?.value ?? "",
    });
    if (!checked.ok) {
      setFailure(checked.problem);
      return;
    }

    inFlight.current = true;
    setLoading(true);
    try {
      if (mode === "signup") {
        /*
          ══════════════════════════════════════════════════════════════════
          `data` IS NOT SPARE
          ══════════════════════════════════════════════════════════════════

          This was `const { error } = await supabase.auth.signUp(...)`, and the
          response was thrown away. That is safe only if a sign-up which does
          not throw always yields a session — and on this project it never
          does. Email confirmation is enabled, proven from the one row in
          `auth.users`, whose `confirmation_sent_at` precedes its
          `email_confirmed_at` by three minutes. `signUp` therefore succeeds
          and returns `session: null`, by design.

          The code below then waited six seconds for a session that was never
          coming, gave up, and reported "your details were accepted, and the
          session didn't arrive" — a failure message, at the end of a sign-up
          that had worked. That is the screenshot this phase began with.

          `classifySignUp` reads the response and says which of the three
          things happened. It deliberately does not read `identities`, which is
          how Supabase's obfuscated response for an existing address could be
          told apart: looking would hand back exactly the account-enumeration
          answer Supabase withholds on purpose.
        */
        const { data, error } = await supabase.auth.signUp({
          email: checked.email,
          password: checked.password,
          /*
            The confirmation link comes back to the sign-in route, not to the
            marketing page. `detectSessionInUrl` exchanges the code wherever it
            lands, so the old value did establish a session — and dropped the
            person on the landing page as an anonymous-looking visitor, with no
            statement that anything had happened. Arriving here instead, the
            mount check above finds the session and hands off to the product.

            If this path is not in the project's Redirect URLs allow list,
            Supabase falls back to the Site URL, which is where this went
            before. The change cannot therefore be worse than what it replaces.
          */
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;

        const reading = classifySignUp(data);
        if (!reading.established) {
          /*
            No success toast, and no congratulation. It said "Account created.
            Welcome!" before anything had been established. A write is not
            announced until it has been read back; that rule does not stop
            applying because the write is an account.
          */
          setFailure(reading.outcome);
          setLoading(false);
          inFlight.current = false;
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: checked.email,
          password: checked.password,
        });
        if (error) throw error;
      }
      // Wait for a real session, then hand off. The onAuthStateChange
      // listener above will also fire — waitForSession is idempotent.
      const ok = await waitForSession(6000);
      if (!ok) throw new Error(SESSION_NEVER_ARRIVED);
      setHandingOff(true);
      await navigate({ to: destination() });
    } catch (err) {
      /*
        Classified, not stringified. `err.message` from an auth library is an
        implementation detail that happens to be a sentence, and it reports a
        network failure and a wrong password identically — which tells a person
        on a bad connection that their correct password is wrong, repeatedly.
        See `src/lib/auth-outcome.ts`.
      */
      setFailure(classifyAuthFailure(err));
      setLoading(false);
      inFlight.current = false;
    }
  };

  const handleGoogle = async () => {
    if (inFlight.current) return;
    setFailure(null);
    inFlight.current = true;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth` },
      });
      if (error) {
        setFailure(classifyAuthFailure(error));
        setLoading(false);
        inFlight.current = false;
        return;
      }
      // Full-page redirect: browser is leaving; keep the loader up.
      setHandingOff(true);
    } catch (err) {
      setFailure(classifyAuthFailure(err));
      setLoading(false);
      inFlight.current = false;
    }
  };

  if (handingOff) {
    return <BrandLoader label="Signing you in" />;
  }

  const notice = failure?.tone === "notice";
  const submitLabel = mode === "signin" ? "Sign in" : "Create account";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="flex flex-col items-center gap-3 mb-8"
          aria-label="Opportunity X home"
        >
          <BrandMark size={44} className="text-accent" />
          <span className="font-mono text-lg font-bold tracking-tighter">
            OPPORTUNITY <span className="text-accent">X</span>
          </span>
        </Link>
        <div className="bg-surface border border-border rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-1">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          {/*
            "Sign in to your opportunities feed." A feed is a stream you are
            meant to keep consuming, and CR-04 makes engagement void as a
            measure of this product working — the aim is that someone finds one
            thing and wins it, then has no reason to come back for a while.
            CR-13 puts it the other way round: attention is the scarce resource,
            and a product that calls its surface a feed has already decided
            whose side it is on.

            "in seconds" went with it. Nothing here is instant, and discovery
            has not run at all yet.
          */}
          <p className="text-sm text-text-s mb-6">
            {mode === "signin"
              ? "Sign in to see what has been found for you."
              : "Create an account to start looking."}
          </p>

          {/*
            What happened, what is still true, and what to do — the same three
            parts every other outcome in this product answers, on the surface
            where getting it wrong locks someone out of their own account.

            Announced, because it is the result of something the person just
            did; it replaces a toast that vanished while they were still reading
            the form it referred to. The severity follows the outcome's own
            tone: `alert` interrupts, which is right for a failure and wrong for
            "your sign-up worked, go and confirm your email" — announcing that
            as an error is the same lie the colour would tell.
          */}
          {failure ? (
            <div
              role={failure.tone === "problem" ? "alert" : "status"}
              className={
                notice
                  ? "mb-5 flex flex-col gap-2 rounded-xl border border-[color-mix(in_oklab,var(--accent)_35%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_6%,transparent)] p-4"
                  : "mb-5 flex flex-col gap-2 rounded-xl border border-[color-mix(in_oklab,var(--destructive)_35%,var(--border))] bg-[color-mix(in_oklab,var(--destructive)_6%,transparent)] p-4"
              }
            >
              <p className="text-[14px] font-bold leading-snug text-foreground">{failure.what}</p>
              <p className="text-[13px] leading-relaxed text-text-s">{failure.stillTrue}</p>
              <p className="text-[13px] leading-relaxed text-text-s">{failure.whatYouCanDo}</p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full mb-4 py-2.5 rounded-xl border border-border bg-background hover:bg-surface transition flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] font-mono text-text-s uppercase">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-4" aria-busy={loading} noValidate>
            {/*
              Labelled, not placeheld. A placeholder is not a label: it is
              removed by the first keystroke, it is read by some screen readers
              and not others, and its contrast is deliberately low. The field
              that told you what it was for is blank exactly when you are trying
              to check what you put in it.
            */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="auth-email"
                className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s"
              >
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                maxLength={MAX_EMAIL_LENGTH}
                autoComplete="email"
                ref={emailRef}
                aria-invalid={emailHint ? true : undefined}
                aria-describedby={emailHint ? "auth-email-problem" : undefined}
                /*
                  Checked when the field is left, not on every keystroke:
                  telling somebody "that doesn't look like an email address"
                  after they have typed the letter "a" is the form disagreeing
                  with a sentence nobody has finished writing.
                */
                onBlur={(event) => setEmailHint(describeEmailProblem(event.target.value))}
                /*
                  And withdrawn the moment it stops being true. A correction
                  that leaves the complaint on screen teaches people to ignore
                  the complaint.
                */
                onInput={(event) => {
                  if (emailHint && describeEmailProblem(event.currentTarget.value) === null) {
                    setEmailHint(null);
                  }
                }}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm aria-[invalid]:border-[color-mix(in_oklab,var(--destructive)_50%,var(--border))]"
              />
              {emailHint ? (
                <p id="auth-email-problem" className="text-[12px] leading-snug text-text-s">
                  {emailHint}
                </p>
              ) : null}
            </div>

            {/*
              No `minLength` on either mode. It was 6 on both, which is a guess
              at Supabase's configured minimum applied to the wrong side of the
              transaction: on sign-in it stops somebody with a shorter existing
              password from even attempting one, and on sign-up it states a
              requirement this repository cannot read and therefore cannot keep
              true. What the password *must* satisfy is Supabase's business, and
              Supabase says so itself when it refuses one; how large a value
              this form will carry is this application's.
            */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="auth-password"
                className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={revealed ? "text" : "password"}
                  required
                  maxLength={MAX_PASSWORD_LENGTH}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  ref={passwordRef}
                  placeholder="Your password"
                  className="w-full pl-3 pr-12 py-2.5 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm"
                />
                {/*
                  A real button, in the tab order, with a label that says what
                  pressing it will do and a state that says what it is doing
                  now. `type="button"` because an unqualified button inside a
                  form submits it — which here would mean "reveal my password"
                  posting a half-typed credential.
                */}
                <button
                  type="button"
                  onClick={() => setRevealed((shown) => !shown)}
                  aria-controls="auth-password"
                  aria-pressed={revealed}
                  aria-label={revealed ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-text-s transition-colors duration-[120ms] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {revealed ? (
                    <EyeOff size={16} aria-hidden="true" />
                  ) : (
                    <Eye size={16} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/*
              Disabled only while a request is actually in flight, and the
              spinner beside the label says why. A submit button greyed out
              until some unstated condition is met is the pattern this avoids:
              the person is left pressing a dead control with nothing on screen
              telling them what is missing.
            */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              {loading
                ? mode === "signin"
                  ? "Signing you in…"
                  : "Creating your account…"
                : submitLabel}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              /*
                The outcome belonged to the other mode's attempt. What was typed
                is kept — the inputs are uncontrolled, so switching does not
                touch them — but a refusal of a sign-in must not sit above a
                sign-up form as though it were about that.
              */
              setFailure(null);
            }}
            className="block mx-auto mt-5 text-xs text-text-s hover:text-foreground transition"
          >
            {mode === "signin"
              ? "Don’t have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
