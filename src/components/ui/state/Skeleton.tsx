/**
 * A placeholder for something whose shape is known and whose content is not.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY A SKELETON AND NOT A SPINNER
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A spinner says "wait" and nothing else. A skeleton says "an opportunity is
 * arriving, and this is the shape it will take" — which is information the
 * product already has, because the card's layout is fixed before any data
 * exists. Withholding it costs a layout shift when the content lands and gives
 * the reader nothing to orient against in the meantime.
 *
 * ── The rule that makes this safe ─────────────────────────────────────────
 *
 * **A skeleton stands for a shape, never for a value.** It is grey space where
 * a sentence will be. It never fades a number into place, never animates a
 * verdict, and never shows a plausible-looking placeholder that could be
 * mistaken for a real one. Everything this component renders is visibly not
 * content — that is the whole of its job.
 *
 * ── Motion ────────────────────────────────────────────────────────────────
 *
 * A slow opacity pulse, not a travelling shimmer. The distinction matters for
 * this product: a shimmer sweeping across a card reads as the interface being
 * pleased with itself, and Opportunity X's motion principle is that atmosphere
 * may move and information does not. A pulse says only "still waiting".
 *
 * `prefers-reduced-motion` removes the animation globally (`styles.css`), and
 * the element stays a visible placeholder without it — the meaning survives
 * with the motion switched off, which is the test for whether motion was ever
 * carrying meaning on its own.
 */
export function Skeleton({
  className = "",
  /** Marks the element that carries the accessible waiting message. */
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "status" : undefined}
      className={`block animate-pulse rounded bg-[color-mix(in_oklab,var(--foreground)_10%,transparent)] ${className}`}
    />
  );
}

/**
 * A line of text that has not arrived.
 *
 * Widths are deliberately uneven and deliberately fixed per line rather than
 * random: a re-render must not reshuffle them, or the placeholder becomes the
 * animated thing on the page.
 */
export function SkeletonText({
  lines = 1,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  const widths = ["w-full", "w-11/12", "w-4/5", "w-2/3"];
  return (
    <span className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-3 ${widths[i % widths.length]}`} />
      ))}
    </span>
  );
}
