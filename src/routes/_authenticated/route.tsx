import { useTransition } from "react";
import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BrandLoader } from "@/components/BrandLoader";
import { isHydrated } from "@/lib/hydrated";
import {
  verifySession,
  SessionUnverifiable,
  isSessionUnverifiable,
} from "@/lib/session-verification";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // Branded loader is the ONLY thing visible while the session is being
  // verified. No protected surface renders until beforeLoad resolves.
  pendingMs: 0,
  pendingComponent: () => <BrandLoader label="Verifying your session" />,
  beforeLoad: async ({ location }) => {
    /*
      Two questions, kept apart. `verifySession` decides *what happened* — and
      bounds how long it will wait before deciding, because a dead auth host
      took 57 seconds to reject and the spinner asserted progress for all of
      them; this decides what to do about it. The version before it asked only
      `if (error || !data.user)` and redirected, which meant a network failure
      was reported to the person as "you are signed out" — an assertion about
      their account that the system had no evidence for. See
      `src/lib/session-verification.ts`.
    */
    const check = await verifySession(async () => {
      const { data, error } = await supabase.auth.getUser();
      return { user: data.user, error };
    });

    if (check.outcome === "unverifiable") {
      /*
        Not a redirect. The protected surface still does not render — nothing is
        relaxed here — but the reason shown is the true one, and the person is
        not told to sign in again for a session that may be perfectly valid.
      */
      throw new SessionUnverifiable(check.because);
    }

    if (check.outcome === "signed-out") {
      /*
        Carry where they were going.

        Without this, someone following a shared link to an opportunity signs in
        and lands on the workspace instead of the thing they were sent to — the
        destination is simply dropped. `location.href` is the path plus its
        query, because a depth link without its query points somewhere shallower
        than it did.

        Only the path is carried, never an absolute URL: `/auth` re-checks it
        against its own allowlist before honouring it, and an open redirect on a
        sign-in page is how one account becomes somebody else's.

        ── `reloadDocument` before hydration ─────────────────────────────

        The server rendered this route's pending shell on no evidence — it
        cannot see a session that lives in `localStorage`. If the client then
        changes the route while React is still hydrating, React finds `/auth`'s
        markup where the server wrote the gate's, and regenerates the tree.
        Measured: DOMContentLoaded 85ms, redirect 449ms, mismatch every time.

        So before hydration this asks the server for the page it should have
        rendered, instead of patching one it rendered on a guess. Afterwards the
        very same redirect is an ordinary client navigation and is clean — also
        measured. See `lib/hydrated.ts` and `SessionAbsent`'s note for the full
        trace and the alternatives that were rejected.
      */
      throw redirect({
        to: "/auth",
        search: { next: location.href },
        reloadDocument: !isHydrated(),
      });
    }

    /* Narrowed by the two throws above: only `signed-in` reaches here. */
    return { user: check.user };
  },
  errorComponent: SessionBoundary,
  component: () => <Outlet />,
});

/**
 * What a failed session check looks like.
 *
 * Only the gate's own failure is handled specially. Anything else reaching this
 * boundary is a page failing underneath a session that verified fine, and it is
 * re-thrown so the surface that knows what failed can say so — a gate that
 * caught every error below it would replace every specific message in the
 * product with one generic one.
 */
function SessionBoundary({ error }: { error: Error }) {
  const router = useRouter();

  /*
    A pending state, because this is the retry most likely to be pressed twice.
    The check that failed here is a network call to the auth service; re-running
    it can take seconds, and with no visible change the person presses again —
    which is how one unverifiable session becomes three concurrent checks.
  */
  const [retrying, startRetry] = useTransition();

  if (!isSessionUnverifiable(error)) throw error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-14">
      <section role="alert" className="flex max-w-lg flex-col gap-4">
        <h1 className="text-2xl font-black leading-[1.15] tracking-tighter text-foreground">
          I couldn&rsquo;t check whether you&rsquo;re signed in.
        </h1>

        <p className="text-[15px] leading-relaxed text-text-s">{error.message}</p>

        {/*
          The sentence this whole branch exists to make possible. Sending someone
          to /auth here would have said the opposite of it.
        */}
        <p className="text-[15px] leading-relaxed text-foreground">
          This is not a sign that you&rsquo;ve been signed out. Your session may be perfectly valid
          — I just can&rsquo;t confirm it right now, and I won&rsquo;t show you a page that might
          not be yours on a guess.
        </p>

        <div className="mt-1 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => startRetry(() => void router.invalidate())}
            disabled={retrying}
            aria-busy={retrying}
            className="rounded-full border border-border px-6 py-3 text-xs font-bold uppercase tracking-widest text-text-s transition-colors duration-[120ms] hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {retrying ? "Checking…" : "Check again"}
          </button>
          <a
            href="/"
            className="rounded-full px-2 py-3 text-xs font-bold uppercase tracking-widest text-text-s transition-colors duration-[120ms] hover:text-accent"
          >
            Home
          </a>
        </div>
      </section>
    </div>
  );
}
