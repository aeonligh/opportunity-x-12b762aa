import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/BrandMark";
import { AccountControl } from "@/components/shell/AccountControl";
import type { SignOutOutcome } from "@/lib/sign-out";

/**
 * The authenticated shell.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY IT IS THIS SMALL
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The Constitution says nothing about shells or navigation, so the shape of
 * this one is a product decision — recorded in
 * `docs/PHASE_19_AUTHENTICATED_SHELL.md`. Two ratified constraints decide it.
 *
 * **CR-13, attention is the scarce resource.** Opportunity is not scarce;
 * attention is. Every pixel of persistent chrome is attention not spent on the
 * evidence, and a shell is the easiest place in a product for chrome to
 * accumulate without anyone deciding that it should.
 *
 * **CR-16, the friction test.** Every feature must answer what friction it
 * removes. This one removes exactly two:
 *
 *   1. Moving between the two peer surfaces meant finding a hand-written link
 *      whose wording and position differed on every page — and whose direction
 *      was incoherent: `/saved` treated Opportunities as a parent ("←
 *      Opportunities") while `/opportunities` treated Saved as a sibling.
 *   2. There was no way to sign out at all.
 *
 * It removes nothing else, so it does nothing else.
 *
 * ── The decisions, and what they are not ──────────────────────────────────
 *
 * **A bar, not a sidebar.** A sidebar spends horizontal space permanently, and
 * horizontal space is where an opportunity's evidence lives. Two destinations
 * do not need a column.
 *
 * **Not sticky.** A fixed header costs its height on every screen for the
 * whole session — about a seventh of a 375px viewport — to hold two links
 * someone follows occasionally and a control they use once. It scrolls away
 * with the page, which is what "the shell recedes behind the evidence" has to
 * mean in layout rather than in tone.
 *
 * **No hamburger, and no bottom bar.** Both are answers to having more
 * destinations than fit. There are two. Hiding two links behind a press adds
 * the friction this exists to remove, and a bottom bar would take permanent
 * vertical space on the smallest screens for the same two links.
 *
 * **No counts, no badges, no activity.** A number beside "Saved" would invite
 * checking it, and CR-04 is explicit that success is never engagement.
 */
export function AppShell({
  email,
  children,
  signOutWith,
}: {
  email: string | null;
  children: ReactNode;
  /** Test/laboratory seam; undefined in the product. See `AccountControl`. */
  signOutWith?: () => Promise<SignOutOutcome>;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-start justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
          {/*
            One landmark, named. A second nav for two links would make a screen
            reader's landmark list longer than the navigation it describes.
          */}
          <nav aria-label="Opportunity X" className="flex items-center gap-4 sm:gap-6">
            {/*
              Orientation, not a destination.

              This began as a link home, by convention. Two things removed it,
              and the first decided it: `Link` sets `aria-current="page"` itself
              whenever the location matches, so on `/opportunities` both the
              mark and the Opportunities link claimed to be the current page.
              "Current page" stops meaning anything when two elements are it,
              and `activeProps` cannot take it back.

              The second is that it never earned a place. CR-16 asks what
              friction a thing removes; a link to `/opportunities` sitting
              immediately beside a link to `/opportunities` removes none. The
              mark stays as the thing that says whose product this is, and the
              navigation landmark beside it carries the name.
            */}
            <BrandMark size={24} aria-hidden="true" className="shrink-0 text-foreground" />

            {/*
              `aria-current="page"` is what carries the current destination to
              anyone not looking at the underline. Opportunities matches its
              whole section — a detail page is still Opportunities — while
              Saved matches only itself.
            */}
            <ShellLink to="/opportunities" exact={false}>
              Opportunities
            </ShellLink>
            <ShellLink to="/saved" exact>
              Saved
            </ShellLink>
          </nav>

          <AccountControl email={email} signOutWith={signOutWith} />
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}

/**
 * One destination.
 *
 * The active treatment is an underline *and* `aria-current`, never colour
 * alone — CR-17 puts accessibility beside beauty rather than after it, and a
 * current-page state carried only by an accent hue disappears under forced
 * colours and for anyone who cannot separate the two.
 */
function ShellLink({
  to,
  exact,
  children,
}: {
  to: "/opportunities" | "/saved";
  exact: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact }}
      activeProps={{
        "aria-current": "page",
        className:
          "font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-foreground underline decoration-accent decoration-2 underline-offset-[6px]",
      }}
      inactiveProps={{
        className:
          "font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s underline decoration-transparent decoration-2 underline-offset-[6px] transition-colors duration-[120ms] hover:text-foreground hover:decoration-border",
      }}
    >
      {children}
    </Link>
  );
}
