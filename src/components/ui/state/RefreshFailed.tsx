import { FreshnessStamp } from "@/components/ui/FreshnessStamp";

/**
 * The re-read failed, and what you are looking at is still true.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THIS IS NOT `SurfaceError`
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `SurfaceError` replaces a surface that has nothing to show. This one sits
 * *above* a surface that has plenty to show, and the difference is the whole
 * point: the content beneath it was read successfully and has not been
 * contradicted. Only the attempt to get something newer failed.
 *
 * Rendering the full error treatment here would be the defect it exists to
 * prevent — a person losing a working page, and the information on it, because
 * the system could not confirm the page was still current.
 *
 * ── What it must always carry ─────────────────────────────────────────────
 *
 * **When the content is from.** Preserved content without an age is the one way
 * this pattern turns into a lie: a page that silently keeps showing yesterday's
 * answer is claiming currency it does not have. The timestamp is not decoration
 * and is not optional — it is what converts "here is stale data" into "here is
 * what I knew at 09:14, and I could not check since".
 *
 * ── Tone ──────────────────────────────────────────────────────────────────
 *
 * Quiet. This is a caveat on good information, not an incident. Louder than the
 * evidence beneath it would invert the hierarchy the whole product rests on.
 */
export function RefreshFailed({
  /** What could not be re-read, in the surface's own words. */
  what,
  /** When the content below was last successfully read. */
  at,
  onRetry,
  retrying = false,
}: {
  what: string;
  at: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <section
      role="status"
      aria-live="polite"
      className="flex flex-col gap-2 rounded-md border border-[color-mix(in_oklab,var(--destructive)_25%,var(--border))] bg-[color-mix(in_oklab,var(--destructive)_4%,transparent)] px-4 py-3"
    >
      <p className="max-w-[62ch] text-[14px] leading-relaxed text-foreground">
        {what}{" "}
        <span className="text-text-s">
          What&rsquo;s below is what I had, and it hasn&rsquo;t been contradicted — I just
          couldn&rsquo;t check for anything newer.
        </span>
      </p>

      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-s">
        Last read <FreshnessStamp at={at} verb="" decay="fast" />
      </p>

      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          aria-busy={retrying}
          className="mt-1 w-fit rounded-full border border-border px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-text-s transition-colors duration-[120ms] hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {retrying ? "Checking…" : "Check again"}
        </button>
      ) : null}
    </section>
  );
}
