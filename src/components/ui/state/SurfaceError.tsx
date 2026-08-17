/**
 * Something failed here, said here.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS RATHER THAN THE GLOBAL ERROR PAGE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Every Opportunity X surface used to fail into the root boundary, which shows
 * a centred page reading *"This page didn't load — something went wrong on our
 * end."* Two things are wrong with that here.
 *
 * It takes the whole screen for a failure that is usually partial. If the
 * declarations read fails and the opportunities read succeeds, the person has
 * lost a working page to report a broken part of it.
 *
 * And it collapses the distinction the entire product is built on. "Something
 * went wrong" is indistinguishable from "there is nothing here", and this
 * product spends its whole architecture keeping *I could not look*, *I looked
 * and found nothing*, and *nothing has happened yet* apart. A generic error
 * throws that away at exactly the moment it matters most — when the system is
 * actually failing.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHAT AN ERROR HAS TO SAY
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Three things, in this order, because that is the order a person needs them:
 *
 *   1. **What failed** — named, specific, and in the first person, because the
 *      failure belongs to the system and not to them.
 *   2. **What is still true** — the part that matters most and is almost always
 *      omitted. "I could not read this" is not "this does not exist", and the
 *      difference is the difference between a person giving up on an
 *      opportunity and coming back to it.
 *   3. **What they can do** — a real action, or an honest statement that
 *      waiting is the only one.
 *
 * `Retry` is optional on purpose. Offering it where nothing has changed teaches
 * people to press a button that cannot work; a surface whose failure is
 * environmental should say so instead.
 */
export function SurfaceError({
  /** What failed, in the first person. "I couldn't read what you've saved." */
  what,
  /** What remains true despite it. Never omitted — this is the honest half. */
  stillTrue,
  /** What the person can do. Null when the truthful answer is "wait". */
  whatYouCanDo = null,
  onRetry,
  retrying = false,
  className = "",
}: {
  what: string;
  stillTrue: string;
  whatYouCanDo?: string | null;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  return (
    <section
      role="alert"
      aria-live="polite"
      className={`flex flex-col gap-3 rounded-lg border border-[color-mix(in_oklab,var(--destructive)_35%,var(--border))] bg-[color-mix(in_oklab,var(--destructive)_6%,transparent)] p-5 ${className}`}
    >
      <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--destructive)]">
        Something here didn&rsquo;t load
      </h2>

      <p className="max-w-[62ch] text-[15px] leading-relaxed text-foreground">{what}</p>

      {/*
        The sentence that keeps a failure from being read as a finding. A person
        who cannot tell "I couldn't look" from "there's nothing there" will
        conclude the second, because it is the one that ends the search.
      */}
      <p className="max-w-[62ch] text-[14px] leading-relaxed text-text-s">{stillTrue}</p>

      {whatYouCanDo ? (
        <p className="max-w-[62ch] text-[14px] leading-relaxed text-text-s">{whatYouCanDo}</p>
      ) : null}

      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          aria-busy={retrying}
          className="mt-1 w-fit rounded-full border border-border px-6 py-3 text-xs font-bold uppercase tracking-widest text-text-s transition-colors duration-[120ms] hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {retrying ? "Trying again…" : "Try again"}
        </button>
      ) : null}
    </section>
  );
}
