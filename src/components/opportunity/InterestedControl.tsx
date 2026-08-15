"use client";

import { useState, useTransition } from "react";
import { declarePursuit, withdrawPursuit } from "@/lib/pursuit.functions";
import type { PursuitResolution } from "@/lib/opportunity/pursuit/types";

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
 */
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
}: {
  entityId: string;
  pursuit: PursuitResolution;
  canPersist?: boolean;
  evidence?: "live" | "fixture";
}) {
  const [pending, startTransition] = useTransition();
  const [limit, setLimit] = useState<string | null>(null);

  const declared = pursuit.state === "declared" ? pursuit.declaration.state : null;
  const disabled = pending || !canPersist;
  const fixture = evidence === "fixture";

  function declare(state: "interested" | "not-interested") {
    setLimit(null);
    startTransition(async () => {
      const result = await declarePursuit({ data: { entityId, state } });
      if (!result.recorded) setLimit(result.limit);
    });
  }

  function withdraw() {
    setLimit(null);
    startTransition(async () => {
      const result = await withdrawPursuit({ data: { entityId } });
      if (!result.recorded) setLimit(result.limit);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
        {fixture ? "This person’s position" : "Your position"}
      </span>

      {declared !== null ? (
        <p className="text-[15px] leading-snug text-foreground">
          {fixture ? "In this scenario, they have said they are " : "You said you are "}
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
      ) : (
        /* Undeclared, said aloud. Not an unchecked box. */
        <p className="text-[15px] leading-snug text-text-s">
          {fixture
            ? "In this scenario, they haven’t said either way."
            : "You haven’t said either way."}
        </p>
      )}

      <div className="mt-1 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => declare("interested")}
          aria-pressed={declared === "interested"}
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
          onClick={() => declare("not-interested")}
          aria-pressed={declared === "not-interested"}
          className={`rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors duration-[120ms] disabled:opacity-50 ${
            declared === "not-interested"
              ? "border border-accent text-accent"
              : "border border-border text-text-s hover:border-accent hover:text-accent"
          }`}
        >
          Not for me
        </button>

        {declared !== null ? (
          <button
            type="button"
            disabled={disabled}
            onClick={withdraw}
            className="rounded-full px-2 py-3 text-xs font-bold uppercase tracking-widest text-text-s transition-colors duration-[120ms] hover:text-accent disabled:opacity-50"
          >
            Forget that I said this
          </button>
        ) : null}
      </div>

      {/*
        The system's limit, stated before it is hit rather than after. A control
        that looks live and fails on press is worse than one that says plainly
        what it cannot do yet.
      */}
      {!canPersist ? (
        <p className="max-w-[58ch] text-[14px] leading-relaxed text-text-s">
          {fixture
            ? "These buttons do nothing here. This is a fixture opportunity, so there is no real record to write a position into."
            : "I can’t keep this yet. Nowhere durable is configured to record what you tell me about an opportunity, so I won’t pretend to remember it."}
        </p>
      ) : null}

      {limit ? (
        <p className="max-w-[58ch] text-[14px] leading-relaxed text-text-s">{limit}</p>
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
