import { FreshnessStamp } from "@/components/ui/FreshnessStamp";
import type { VerificationResolution } from "@/lib/opportunity/verification/types";

/**
 * Verification — a property of the opportunity, shown as one.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THIS IS NOT A BADGE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A green tick is a claim with no expiry, no basis, and no way to disagree
 * with it. What is true is narrower and more useful: *as of a stated moment*,
 * this many independent sources said so, and that finding lapses on a stated
 * date.
 *
 * So the seal always carries three things — the verdict, when it was
 * established, and when it stops counting. `expired` is not a degraded
 * `verified`; it is "not verified", and it is reached by the clock at read time
 * rather than by a job that might not have run.
 *
 * The count of sources is corroboration, not a score. It is shown as a number
 * of sources because that is what it is, and never converted into a percentage,
 * a rating, or a confidence — all three would imply a precision the model does
 * not have and invite optimising the number.
 */

const VERDICT_LINE: Record<VerificationResolution["verdict"], string> = {
  verified: "Verified",
  unverified: "Not yet corroborated",
  contradicted: "Sources disagree",
  withdrawn: "Sources have stopped answering",
  expired: "Verification lapsed",
};

export function VerificationSeal({
  resolution,
  className = "",
}: {
  /** Null when verification has never been established for this entity. */
  resolution: VerificationResolution | null;
  className?: string;
}) {
  if (resolution === null) {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
          Verification
        </span>
        <span className="text-[15px] leading-snug text-text-s">
          AEON X has not established whether this is real.
        </span>
      </div>
    );
  }

  const { verdict, basis, establishedAt, expiresAt, lapsedFrom } = resolution;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
        Verification
      </span>

      {/*
        The verdict as a sentence, not a chip. Brand Bible §12's rule applies
        here as everywhere: every encoded meaning carries a non-visual carrier,
        and this is the field where a misread costs someone a real decision.
      */}
      <span className="text-[15px] leading-snug text-foreground">
        {VERDICT_LINE[verdict]}
        {verdict === "expired" && lapsedFrom ? ` — it was ${lapsedFrom}` : ""}.
      </span>

      <span className="font-mono text-[11px] leading-relaxed text-text-s">
        {basis.distinctSources === 1
          ? "1 independent source"
          : `${basis.distinctSources} independent sources`}
        {basis.institutionalSources > 0
          ? `, ${basis.institutionalSources} institutional`
          : ", none institutional"}
        {" · "}
        <FreshnessStamp at={establishedAt} verb="established" decay="fast" />
      </span>

      {/*
        The expiry, always, in both directions. A verification that is still
        standing has a date it stops standing on, and a person deciding how much
        to trust it deserves that date rather than a reassuring absence.
      */}
      <span className="font-mono text-[11px] text-text-s">
        {verdict === "expired" ? "Lapsed " : "Counts until "}
        <time dateTime={expiresAt}>
          {new Date(expiresAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </time>
      </span>
    </div>
  );
}
