/**
 * UNKNOWN — Opportunity X cannot see. A limit on the system, never a claim about the person.
 *
 * Constitutional authority:
 *   Product Bible §07     — the Visibility Principle: Opportunity X speaks with certainty
 *                           only about what it observed. Missing evidence is not
 *                           negative evidence.
 *   OXD-001 (hist. XB §7) — "I've had no visibility into this since June."
 *   Brand Bible §03       — first person for the system; the user is never the
 *                           subject of a failure sentence.
 *
 * Two rules this component exists to enforce:
 *
 * 1. It states the system's limit, not the person's inactivity. "I haven't seen"
 *    — never "you haven't done".
 * 2. The correction affordance is an invitation, not a summons. A yes/no question
 *    ("Have you been making progress?") puts the person in the position of
 *    reporting on themselves, and makes silence read as non-compliance. Stating
 *    the gap and offering a correction costs nothing if ignored.
 */
export function UnknownState({
  /** What the system has no visibility into, in its own voice. */
  gap,
  /** Optional correction affordance. Never phrased as a question. */
  correction,
  className = "",
}: {
  gap: string;
  correction?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div className={`flex max-w-[56ch] flex-col items-start gap-3 ${className}`}>
      <p className="text-[15px] leading-relaxed text-foreground">{gap}</p>
      {correction ? (
        <a
          href={correction.href}
          className="rounded-lg font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-accent underline-offset-4 transition-opacity hover:underline focus-visible:underline"
        >
          {correction.label}
        </a>
      ) : null}
    </div>
  );
}
