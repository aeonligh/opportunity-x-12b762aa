import { Link } from "@tanstack/react-router";
import type { Commitment } from "@/lib/core/ledger/types";

/**
 * The Ledger's nearest-consequence preview, on the Step surface.
 *
 * Constitutional authority — IA §03, verbatim:
 *   "The Step | / | Your Next Best Step, its source tag, its inline evidence,
 *    its action, and the Ledger's nearest-consequence preview"
 *   "It becomes the Ledger, a real destination; the Step surface shows only its
 *    nearest-consequence preview."
 *
 * ── Why "only" is the operative word ──────────────────────────────────────
 *
 * One item, never a list. XB §2 gives the Step one answer, and a second ranked
 * thing beside it would reintroduce the choice the surface exists to remove. The
 * preview is not a mini-Ledger; it is the single nearest irreversible deadline,
 * and everything else lives at the destination.
 *
 * The item shown is whatever `LedgerService.nearestConsequence` returns, which is
 * the first item of the same read under the same ordering the Ledger itself uses.
 * L11 — "Facts appear once, in the place they belong" — is why it is derived that
 * way rather than computed here: a preview with its own query could disagree with
 * the page it previews.
 *
 * ── REJECTED ──────────────────────────────────────────────────────────────
 *
 *   A count of open commitments  — IA §05: "a number invites clearing, and
 *                                  clearing is the engagement loop." CS §05
 *                                  names "a count anywhere" an anti-pattern.
 *   An unread or "new" dot       — CS §05, by name.
 *   Two or three items           — IA §03 says "only its nearest-consequence
 *                                  preview"; a list is the Ledger, not a preview.
 *   Rendering nothing when the   — the absence is stated. Silence here would read
 *   Ledger is empty                as the surface having failed to load.
 */
export function NearestConsequence({
  commitment,
}: {
  /** Null when nothing has been committed to, or the Ledger cannot be read. */
  commitment: Commitment | null;
}) {
  if (!commitment) {
    /*
      Stated plainly, and deliberately not styled as an empty state with an
      illustration or a call to action — XB §7. Nothing is wrong; the person
      simply has not committed to anything yet.
    */
    return (
      <p className="text-[14px] leading-relaxed text-text-ss">
        Nothing committed yet. Anything you apply to will be tracked in your{" "}
        <Link
          to={"/workspace/ledger" as never}
          className="underline decoration-border underline-offset-4 transition-colors duration-[120ms] hover:decoration-accent"
        >
          ledger
        </Link>
        .
      </p>
    );
  }

  const { status } = commitment;
  const deadline =
    "deadline" in status && status.deadline ? new Date(status.deadline) : null;

  return (
    <Link
      href={`/ledger/${commitment.id}`}
      className="group flex flex-col gap-1 border-t border-border pt-5 transition-colors duration-[120ms]"
    >
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-text-ss">
        Nearest in your ledger
      </span>

      <span className="text-[15px] leading-snug text-text-s transition-colors duration-[120ms] group-hover:text-foreground">
        {commitment.title}
      </span>

      <span className="text-[14px] leading-relaxed text-text-ss">
        {status.state === "open" && deadline ? (
          <>
            Closes{" "}
            {deadline.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.
          </>
        ) : null}
        {status.state === "open" && !deadline ? "Open. No deadline recorded." : null}
        {/* L20 — the same sentence the Ledger uses. Never assumes an outcome, and
            never differs from the destination's wording for the same fact. */}
        {status.state === "deadline-passed"
          ? "This closed. I don't know what happened."
          : null}
        {status.state === "outcome-reported"
          ? `You reported this as ${status.outcome}.`
          : null}
        {status.state === "withdrawn" ? "You withdrew this." : null}
      </span>
    </Link>
  );
}
