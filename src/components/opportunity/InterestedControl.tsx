"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@tanstack/react-router";
import { declarePursuit, withdrawPursuit } from "@/lib/pursuit.functions";
import type { PursuitResolution } from "@/lib/opportunity/pursuit/types";
import { performWrite, type WriteOutcome } from "@/lib/opportunity/pursuit/write";

/**
 * Interested — the person's own declaration, and the only thing on this surface
 * they write.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THERE ARE THREE STATES AND NOT A TOGGLE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A toggle has two positions, so silence has to occupy one of them — and
 * whichever it occupies is a decision the person never made. Rendered as "off",
 * "I haven't answered" becomes "no thanks", and a system that reads it that way
 * stops surfacing something nobody declined.
 *
 * So the control begins undeclared, and undeclared is visible as itself.
 * Declining is available and is a real position, distinct from never having
 * been asked, because re-surfacing something already declined is the behaviour
 * that teaches people not to answer at all.
 *
 * ── Why it never records anything on its own ──────────────────────────────
 *
 * Nothing here fires on render, on hover, on scroll or on opening the
 * inspection surface. The only writes are the two buttons, and the action
 * behind them takes an explicit position rather than a toggle — so the record
 * holds what the person meant even if the surface they were looking at was
 * stale.
 *
 * ── Why a refusal is shown in full ────────────────────────────────────────
 *
 * When nothing durable is configured the action refuses and says why, and this
 * renders that sentence. Optimistically showing "Interested" and losing it on
 * the next request would be telling someone their answer was kept when it was
 * not — and it is their fact, not the system's.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * THE SEQUENCE, AND WHY EVERY STEP OF IT IS VISIBLE
 * ══════════════════════════════════════════════════════════════════════════
 *
 *   current state → action → SAVING → confirmed by the server → new state
 *
 * The middle step used to be missing in both directions. Pressing *Interested*
 * disabled the buttons for the length of the request and said nothing, and on
 * success said nothing either: the write landed in the database and the control
 * still read "You haven't said either way", because no product route passed a
 * refresh and the loader was never re-run. Someone pressing the button saw an
 * unchanged control after a *successful* write — the read-back this component's
 * own documentation describes.
 *
 * So three rules now hold, and the tests in `test/state.test.ts` hold them:
 *
 *   1. **`aria-pressed` and the position sentence follow `pursuit` alone** — the
 *      server's confirmed answer. Never the intent. A pressed button means the
 *      database said yes; there is no code path on which it can mean anything
 *      else, which is what makes it worth trusting.
 *   2. **Saving is named as saving**, in a live region, and says outright that
 *      nothing is kept until it is confirmed.
 *   3. **A failure leaves the previous truth on screen and repeats it.** Not a
 *      cleared control, not a half-pressed button: the position that is still
 *      recorded, stated again, because a person who has just seen an error is
 *      exactly the person about to guess.
 *
 * ── The case that looks like pedantry and is not ──────────────────────────
 *
 * A write can succeed and the refresh that reveals it can fail. The write is
 * kept; the screen is stale. Reporting that as a failure would tell someone
 * their declaration was lost while it sits in the database, and reporting it as
 * a success would show them a control that contradicts what was recorded. It has
 * its own sentence for that reason.
 */

/**
 * Where a write has got to. Nothing here is ever rendered *as* a position — it
 * is rendered as commentary beside one, and the position itself comes from the
 * server.
 *
 * The four settled outcomes are `WriteOutcome`, decided by `performWrite` and
 * tested there rather than through this component. What this adds is the two
 * things only a surface has: that a write is *in flight*, and which intent it
 * carries — kept so a retry can repeat the position the person already chose
 * instead of asking them to decide it again.
 */
type Write =
  /* Every settled outcome except `failed`, which is re-stated below with the
     one field a surface needs and a pure function has no use for. */
  | Exclude<WriteOutcome, { phase: "failed" }>
  /** In flight. The old position is still the true one. */
  | { phase: "saving"; intent: Intent }
  /** Nothing was written; the intent is kept so it can be retried verbatim. */
  | { phase: "failed"; intent: Intent };

type Intent = { kind: "declare"; state: "interested" | "not-interested" } | { kind: "withdraw" };

function intentWords(intent: Intent): string {
  if (intent.kind === "withdraw") return "removing that position";
  return intent.state === "interested" ? "recording “Interested”" : "recording “Not for me”";
}

export function InterestedControl({
  entityId,
  pursuit,
  /**
   * Whether a declaration can actually be kept.
   *
   * Read before the control is offered, not discovered when it fails. Letting
   * someone press Interested and then telling them it could not be recorded is
   * a refusal disguised as an interaction — the person has already made the
   * statement, and the system takes it back. Saying so first costs nothing and
   * leaves the choice with them.
   */
  canPersist = false,
  /**
   * Whose position this is.
   *
   * On a fixture card the declaration was written into the scenario, not taken
   * by whoever is reading the page — so "You said you are interested" would be
   * the surface attributing a statement to someone who never made it. That is
   * precisely the class of lie the fixture route exists to avoid, so it speaks
   * about "this person" instead.
   */
  evidence = "live",
  /**
   * Whose position the surface should say this is.
   *
   * Defaults to following `evidence`, which is right for the two original
   * cases: a live card is the reader's, a fixture card's position was written
   * into the scenario. The laboratory is the case that broke the equivalence —
   * its cards are fixtures whose positions the visitor really does take, one
   * card at a time — so the two questions are now asked separately instead of
   * one standing in for the other.
   */
  voice,
  /**
   * Why a declaration cannot be kept, when it cannot.
   *
   * The generic sentence below is true but coarse: "nothing is configured" and
   * "the place your declarations live could not be reached" are different facts
   * about the deployment, and this product's standard is to say which. Supplied
   * by the surface, which learns it from the read it already performs.
   */
  whyNot,
  /**
   * Where a position gets written.
   *
   * Defaults to the authenticated server functions, which is what every product
   * surface uses. The fixture laboratory passes its own pair so that pressing
   * Interested there exercises this component's real write-then-read-back path
   * against its own store, instead of the laboratory reimplementing the control
   * with a mock behind it.
   *
   * Injected rather than branched on `evidence`, because a branch would put a
   * second, dormant code path inside the component every authenticated person
   * uses — and the wrong branch taken in production is a declaration written
   * somewhere it cannot be read back from.
   */
  actions = { declare: declarePursuit, withdraw: withdrawPursuit },
  /**
   * How the surface learns what was written.
   *
   * Defaults to re-running the route's loader, which is the only mechanism that
   * makes a pressed button mean "the database said yes". The laboratory swaps in
   * its own re-read of its own store for the same reason it swaps in `actions`.
   *
   * It is allowed to throw. That is not the same as the write failing, and the
   * two are reported differently.
   */
  onWritten,
}: {
  entityId: string;
  pursuit: PursuitResolution;
  canPersist?: boolean;
  evidence?: "live" | "fixture";
  voice?: "you" | "this-person";
  whyNot?: string | null;
  actions?: {
    declare: (args: {
      data: { entityId: string; state: "interested" | "not-interested" };
    }) => Promise<{ recorded: boolean; limit?: string }>;
    withdraw: (args: {
      data: { entityId: string };
    }) => Promise<{ recorded: boolean; limit?: string }>;
  };
  onWritten?: () => void | Promise<void>;
}) {
  const [, startTransition] = useTransition();
  const [write, setWrite] = useState<Write>({ phase: "idle" });
  /*
    `warn: false` because this component is rendered by the fixture laboratory
    and by tests outside a `RouterProvider`, and a console warning on every
    render there would train everyone to ignore console warnings. Absence of a
    router is handled below rather than crashed on.
  */
  const router = useRouter({ warn: false });

  const declared = pursuit.state === "declared" ? pursuit.declaration.state : null;
  /*
    The read failed. Distinct from `declared === null`, which means the record
    was read and holds nothing — this means it was not read, and the control may
    not describe the person's position either way.
  */
  const unreadable = pursuit.state === "unreadable" ? pursuit.because : null;
  const saving = write.phase === "saving";
  /*
    Offering the buttons over an unreadable position would let someone press
    "Interested" without being able to see that they had already pressed it —
    and a declaration is append-only, so the second press is a second record.
    The refusal is stated rather than mimed: see the sentence below.
  */
  const disabled = saving || !canPersist || unreadable !== null;
  const fixture = evidence === "fixture";
  /* Who is speaking, which is not always who the evidence belongs to. */
  const theirs = (voice ?? (fixture ? "this-person" : "you")) === "this-person";

  /** What is still recorded, said for the person who has just seen a failure. */
  const stillTrue =
    declared === null
      ? theirs
        ? "Nothing has been said either way, and that is still the case."
        : "You still haven’t said either way."
      : `${theirs ? "Their" : "Your"} position is still “${
          declared === "interested" ? "Interested" : "Not for me"
        }”.`;

  async function run(intent: Intent) {
    setWrite({ phase: "saving", intent });

    /*
      Written first, read back second, and the four ways that can end are decided
      in `performWrite` rather than here — see that module for why the read-back
      is a separate step and why "written but not shown" needs its own answer.

      The read-back is `router.invalidate()` on every product surface: re-running
      the loader is the only thing that makes a pressed button mean "the database
      said yes". `null` when there is no router and nothing injected, which
      `performWrite` treats as stale rather than as success.
    */
    const outcome = await performWrite({
      write: () =>
        intent.kind === "withdraw"
          ? actions.withdraw({ data: { entityId } })
          : actions.declare({ data: { entityId, state: intent.state } }),
      readBack: onWritten ?? (router ? () => router.invalidate() : null),
    });

    /* The one outcome that carries something extra: what to retry. */
    setWrite(outcome.phase === "failed" ? { phase: "failed", intent } : outcome);
  }

  function act(intent: Intent) {
    startTransition(() => {
      void run(intent);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
        {theirs ? "This person’s position" : "Your position"}
      </span>

      {/*
        The confirmed position, and nothing else. This reads `pursuit` — never
        the pending intent — so the sentence a person sees is always one the
        server has agreed to.
      */}
      {declared !== null ? (
        <p className="text-[15px] leading-snug text-foreground">
          {theirs ? "In this scenario, they have said they are " : "You said you are "}
          {declared === "interested" ? "interested" : "not interested"}
          {pursuit.state === "declared" ? (
            <>
              {" "}
              <span className="font-mono text-[11px] text-text-s">
                on{" "}
                <time dateTime={pursuit.declaration.declaredAt}>
                  {new Date(pursuit.declaration.declaredAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                  })}
                </time>
              </span>
            </>
          ) : null}
          .
        </p>
      ) : unreadable !== null ? (
        /*
          The state this control most needed and did not have.

          Before this, a failed declaration read arrived here as `undeclared` and
          rendered "You haven't said either way" — a statement about what the
          person did, produced by a system that could not look. It is the same
          error as showing an empty list when the corpus is unreadable, made
          about someone's own record rather than about the world.
        */
        <p role="status" className="max-w-[58ch] text-[15px] leading-snug text-text-s">
          {theirs
            ? "I couldn’t read what they’ve said about this, so I can’t show their position."
            : "I couldn’t read what you’ve said about this, so I can’t show your position."}{" "}
          <span className="text-foreground">
            {theirs
              ? "Whatever they said is still recorded."
              : "Whatever you said is still recorded — this is a failure to read it, not a blank."}
          </span>
        </p>
      ) : (
        /* Undeclared, said aloud. Not an unchecked box. */
        <p className="text-[15px] leading-snug text-text-s">
          {theirs
            ? "In this scenario, they haven’t said either way."
            : "You haven’t said either way."}
        </p>
      )}

      <div className="mt-1 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => act({ kind: "declare", state: "interested" })}
          /*
            Bound to the confirmed declaration, deliberately. A pressed button is
            a claim that the database holds this position, so it must not move
            while a write is in flight — the whole point of the pending sentence
            below is that the button has *not* moved yet.
          */
          aria-pressed={declared === "interested"}
          aria-busy={
            saving && write.intent.kind === "declare" && write.intent.state === "interested"
          }
          className={`rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest transition-opacity duration-[120ms] disabled:opacity-50 ${
            declared === "interested"
              ? "bg-accent text-background"
              : "border border-border text-text-s hover:border-accent hover:text-accent"
          }`}
        >
          Interested
        </button>

        {/*
          Declining sits at the same reach as accepting. Experience Bible §10
          requires grant and revoke at equal weight, and the same reasoning
          applies to a position on an opportunity: a "no" that costs more than a
          "yes" is a "no" the system has discouraged.
        */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => act({ kind: "declare", state: "not-interested" })}
          aria-pressed={declared === "not-interested"}
          aria-busy={
            saving && write.intent.kind === "declare" && write.intent.state === "not-interested"
          }
          /*
            The declared state carries a fill, not only an accent border.

            Without it, this button's declared styling and its own hover styling
            were the same two properties — so an *undeclared* "Not for me" under
            the cursor was pixel-identical to a declared one. A browser walk
            caught it on the failure specimen, where the mouse naturally rests on
            the button that has just failed to record anything: the surface was
            showing a position that had not been taken, in the one place it
            matters most. Hover may suggest; only the record may assert.
          */
          className={`rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors duration-[120ms] disabled:opacity-50 ${
            declared === "not-interested"
              ? "border border-accent bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-accent"
              : "border border-border text-text-s hover:border-accent hover:text-accent"
          }`}
        >
          Not for me
        </button>

        {declared !== null ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => act({ kind: "withdraw" })}
            aria-busy={saving && write.intent.kind === "withdraw"}
            className="rounded-full px-2 py-3 text-xs font-bold uppercase tracking-widest text-text-s transition-colors duration-[120ms] hover:text-accent disabled:opacity-50"
          >
            Forget that I said this
          </button>
        ) : null}
      </div>

      {/*
        In flight, named. `aria-live="polite"` rather than an alert: this is
        progress, and interrupting a screen reader to announce that something is
        still happening is a worse experience than hearing it a moment later.

        The second clause is the part that cannot be dropped. "Saving…" alone
        invites the reader to treat the outcome as settled and look away; saying
        that nothing is kept until it is confirmed is what makes the pending
        state distinguishable from success.
      */}
      {saving ? (
        <p
          role="status"
          aria-live="polite"
          className="max-w-[58ch] text-[14px] leading-relaxed text-text-s"
        >
          {`I’m ${intentWords(write.intent)}. Nothing is kept until I’ve confirmed it.`}
        </p>
      ) : null}

      {/*
        The write did not happen, and the record is unchanged. Both halves are
        said: what failed, and what is still true — because the reader's next
        move depends far more on the second than the first.
      */}
      {write.phase === "failed" ? (
        <div role="alert" className="flex flex-col gap-2">
          <p className="max-w-[58ch] text-[14px] leading-relaxed text-foreground">
            I couldn’t reach the place {theirs ? "positions are" : "your positions are"} kept, so
            nothing was recorded. {stillTrue}
          </p>
          <button
            type="button"
            onClick={() => act(write.intent)}
            className="w-fit rounded-full border border-border px-6 py-3 text-xs font-bold uppercase tracking-widest text-text-s transition-colors duration-[120ms] hover:border-accent hover:text-accent"
          >
            Try again
          </button>
        </div>
      ) : null}

      {/*
        Written, and unseen. The awkward middle case, kept as its own sentence
        because collapsing it into either neighbour would be a lie: into failure,
        and a real declaration is reported lost; into success, and the control
        beside it contradicts the record.
      */}
      {write.phase === "stale" ? (
        <div role="status" className="flex flex-col gap-2">
          <p className="max-w-[58ch] text-[14px] leading-relaxed text-foreground">
            That was recorded, and I couldn’t refresh this page to show it — so what you see above
            may be a moment out of date. Reloading will show what is actually kept.
          </p>
        </div>
      ) : null}

      {/*
        The system's limit, stated before it is hit rather than after. A control
        that looks live and fails on press is worse than one that says plainly
        what it cannot do yet.
      */}
      {/*
        Why the buttons are inert right now. A disabled control that does not say
        why is a refusal the person has to guess at.
      */}
      {unreadable !== null ? (
        <p className="max-w-[58ch] text-[14px] leading-relaxed text-text-s">
          {unreadable} Until I can, I won’t offer to change a position I can’t see — pressing
          Interested now could record a second declaration on top of one you already made.
        </p>
      ) : null}

      {!canPersist && unreadable === null ? (
        <p className="max-w-[58ch] text-[14px] leading-relaxed text-text-s">
          {fixture
            ? "These buttons do nothing here. This is a fixture opportunity, so there is no real record to write a position into."
            : (whyNot ??
              "I can’t keep this yet. Nowhere durable is configured to record what you tell me about an opportunity, so I won’t pretend to remember it.")}
        </p>
      ) : null}

      {/* A refusal from the write itself, in the words the action gave. */}
      {write.phase === "refused" ? (
        <p role="alert" className="max-w-[58ch] text-[14px] leading-relaxed text-text-s">
          {write.because} {stillTrue}
        </p>
      ) : null}

      {/*
        What the declaration is and is not, said once. Absent on a fixture card:
        "this is yours" is false there, and repeating a promise about someone
        else's record is how a demo starts making claims on the product's behalf.
      */}
      {fixture ? null : (
        <p className="max-w-[58ch] text-[13px] leading-relaxed text-text-s">
          This is yours. It changes what I keep in view and when I remind you. It never becomes a
          signal about you, and I never infer it from what you click.
        </p>
      )}
    </div>
  );
}
