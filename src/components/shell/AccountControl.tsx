import { useState, useTransition } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { performSignOut, type SignOutOutcome } from "@/lib/sign-out";
import { forgetEverythingLastGood } from "@/lib/last-good";

/**
 * Who is signed in, and the way out.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THIS IS NOT A MENU
 * ══════════════════════════════════════════════════════════════════════════
 *
 * There is exactly one account action. A dropdown holding a single item is
 * chrome wrapped around chrome: it costs a press, a focus trap, Escape
 * handling and an `aria-expanded` state, and returns nothing a plain button
 * does not already give. If a second action ever earns its place, that is the
 * moment to reconsider — not before.
 *
 * The address is shown because a person is entitled to know whose evidence
 * they are looking at, which matters most on a shared machine — the same
 * machine where a false "you have been signed out" does the most harm.
 *
 * ── The lifecycle ─────────────────────────────────────────────────────────
 *
 * Idle → pending → one of three outcomes, and only one of them navigates.
 * See `lib/sign-out.ts` for why the request's own result is not the answer:
 * a sign-out is a write, and this product does not call a write confirmed
 * until a read confirms it.
 */
export function AccountControl({
  /** The signed-in address, or null when the session carries none. */
  email,
  /**
   * Injected so the laboratory can drive this exact control against a rigged
   * session without touching production authentication. Undefined in the
   * product, where the real Supabase client is used.
   */
  signOutWith,
}: {
  email: string | null;
  signOutWith?: () => Promise<SignOutOutcome>;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const [pending, startSignOut] = useTransition();
  const [outcome, setOutcome] = useState<SignOutOutcome | null>(null);

  async function run() {
    /*
      The guard that `disabled` used to provide. See the note on the button
      below: the control stays focusable, so a second press is possible and has
      to be refused here instead of by the platform.
    */
    if (pending) return;

    const result = signOutWith
      ? await signOutWith()
      : await (async () => {
          const { supabase } = await import("@/integrations/supabase/client");
          return performSignOut({
            signOut: () => supabase.auth.signOut(),
            readSession: async () => {
              const { data, error } = await supabase.auth.getUser();
              return { user: data.user, error };
            },
          });
        })();

    if (result.outcome !== "signed-out") {
      setOutcome(result);
      return;
    }

    /*
      Confirmed gone. Everything this session remembered goes with it.

      `last-good` holds whatever each surface last successfully showed, so that
      a failed refresh cannot erase it. Across a sign-out that becomes the
      opposite of a safeguard: the next person to sign in on this tab could be
      shown the previous person's saved opportunities the first time a read
      failed. Phase 17 built the forget function for exactly this moment and
      recorded that nothing called it yet.
    */
    forgetEverythingLastGood();
    setOutcome(null);
    /* Re-run the gate, so nothing authenticated survives the transition. */
    await router.invalidate();
    await navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-3">
        {email ? (
          <span
            /* Hidden below `sm` on purpose: at 375px the two destinations and
               the way out are what must fit. The address is orientation, not
               navigation. */
            className="hidden max-w-[22ch] truncate font-mono text-[11px] tracking-[0.08em] text-text-s sm:block"
            title={email}
          >
            {email}
          </span>
        ) : null}

        <button
          type="button"
          /*
            The transition is given the async function itself, not a call to it.
            `startTransition(() => void run())` returns the instant `run()` is
            *started*, so `pending` flipped true and false again within a frame
            and the control never showed anything — the browser walk caught it
            on the three-second specimen. React 19 keeps a transition pending
            for as long as the function it was given has not settled, which is
            the whole duration a sign-out is actually in flight.
          */
          onClick={() =>
            startSignOut(async () => {
              await run();
            })
          }
          /*
            `aria-disabled`, not `disabled`, and the difference was measured.

            A focused button that becomes `disabled` is blurred by the browser,
            and nothing puts focus back when it is re-enabled. Pressing Sign out
            by keyboard and having it fail therefore dropped the person at the
            top of the document — they pressed a control, an alert appeared
            below it, and their place was gone. `aria-disabled` keeps the
            element focusable and still announces it as unavailable, so focus
            stays where they left it and the retry is one Tab away.

            The double-press it no longer prevents at the platform level is
            refused in `run()` instead. One press must not start a second
            sign-out against a session the first may already have ended.
          */
          aria-disabled={pending}
          aria-busy={pending}
          className="rounded-full border border-border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s transition-colors duration-[120ms] hover:border-accent hover:text-accent aria-disabled:cursor-default aria-disabled:opacity-50"
        >
          {pending ? "Signing out…" : "Sign out"}
        </button>
      </div>

      {/*
        Both non-success outcomes interrupt, because in both the person may be
        about to walk away from the machine believing something untrue. That is
        the one case where an alert is the proportionate treatment.
      */}
      {outcome && outcome.outcome !== "signed-out" ? (
        <div
          role="alert"
          className="flex max-w-[46ch] flex-col items-end gap-1 rounded-md border border-[color-mix(in_oklab,var(--destructive)_25%,var(--border))] bg-[color-mix(in_oklab,var(--destructive)_4%,transparent)] px-3 py-2 text-right"
        >
          <p className="text-[13px] leading-snug text-foreground">{outcome.because}</p>
          <p className="text-[12px] leading-snug text-text-s">
            {outcome.outcome === "failed"
              ? "You are still signed in. Nothing about your account has changed."
              : "I can’t tell whether your session ended. If you are on a shared machine, close the browser to be sure."}
          </p>
          <button
            type="button"
            onClick={() =>
              startSignOut(async () => {
                await run();
              })
            }
            /* Same reasoning as the control above: focus must survive a retry
               that fails, because a retry that fails is the one people repeat. */
            aria-disabled={pending}
            aria-busy={pending}
            className="mt-1 w-fit rounded-full border border-border px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s transition-colors duration-[120ms] hover:border-accent hover:text-accent aria-disabled:cursor-default aria-disabled:opacity-50"
          >
            {pending ? "Trying…" : "Try again"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
