"use client";

import { useRouterState } from "@tanstack/react-router";

/**
 * What is on screen is being replaced.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * THE STATE NOTHING MODELLED
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Phase 14 gave every read a loading state and every write a pending one. It
 * left out the case where both are true at once: a loader re-running *underneath
 * content that is already rendered*.
 *
 * It happens on the most ordinary path in the product. Pressing *Interested*
 * writes, then calls `router.invalidate()` to read the declaration back — and
 * for the length of that read the page shows the previous answer with no
 * indication that it is the previous answer. The person is looking at data the
 * system has already decided is out of date, presented as current.
 *
 * That is a smaller lie than the ones Phase 14 fixed and it is the same kind:
 * a surface claiming more currency than the system possesses.
 *
 * ── Why this is a line of text and not a skeleton ─────────────────────────
 *
 * Because the content is still true. A skeleton would destroy known, valid
 * information to report that fresher information is coming — which is what §9
 * of the state system forbids, and which would make every declaration flash the
 * whole page back to grey. The rule is: keep what is known, and say what is
 * happening beside it.
 *
 * ── Why it is quiet ───────────────────────────────────────────────────────
 *
 * A refresh is not an event in the person's life. It gets one small line, no
 * motion of its own beyond the pulse the reduced-motion rule already governs,
 * and it never moves the controls beneath it — `sr-only` for the announcement,
 * a fixed-height row for the visual, so nothing below it shifts when it appears
 * or leaves.
 */
export function Refreshing({ what = "this page" }: { what?: string }) {
  /*
    `isLoading` is true only while a loader is actually in flight. Deliberately
    not `isTransitioning`, which is also true during ordinary navigation — a
    "refreshing" line on a page the person has just navigated to would be
    describing something that is not happening.
  */
  const refreshing = useRouterState({ select: (state) => state.isLoading });

  /*
    The row exists whether or not it is occupied, so its appearance shifts
    nothing. An indicator that pushes the content it describes is a worse
    problem than the one it solves.
  */
  return (
    <div className="flex h-5 items-center" aria-live="polite">
      {refreshing ? (
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-text-s">
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]"
          />
          {`Checking ${what} again — what you see below is the last answer I had.`}
        </p>
      ) : null}
    </div>
  );
}
