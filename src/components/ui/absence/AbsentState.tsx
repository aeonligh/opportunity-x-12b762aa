import { FreshnessStamp } from "../FreshnessStamp";

/**
 * ABSENT — a search ran, succeeded, and returned nothing better. A verdict.
 *
 * Constitutional authority:
 *   Experience Bible §5 — "Nothing better has appeared", never "nothing changed".
 *                         One reports an absence; the other reports a verdict.
 *   Experience Bible §7 — Absent requires a recorded successful search.
 *   Brand Bible §03     — confidence without provenance is just tone, so the
 *                         search timestamp is mandatory, not decorative.
 *
 * `searchedAt` is required by the type, not optional by convention. That is the
 * §7 precondition made structural: a broken pipeline returning no rows has no
 * successful search to cite and therefore cannot render this state. It must
 * render UnknownState instead, so a failure can never masquerade as a finding.
 */
export function AbsentState({
  /** The verdict itself, e.g. "No better opportunity has appeared." */
  verdict,
  /** ISO timestamp of the successful search that produced this verdict. */
  searchedAt,
  /** What still stands, if anything does. */
  standing,
  className = "",
}: {
  verdict: string;
  searchedAt: string;
  standing?: string;
  className?: string;
}) {
  return (
    <div className={`flex max-w-[56ch] flex-col gap-2 ${className}`}>
      <p className="text-[15px] leading-relaxed text-foreground">{verdict}</p>
      {standing ? <p className="text-sm leading-relaxed text-text-s">{standing}</p> : null}
      <FreshnessStamp at={searchedAt} verb="last searched" decay="fast" className="mt-1" />
    </div>
  );
}
