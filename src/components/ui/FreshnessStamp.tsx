/**
 * Freshness stamp — how long ago AEON X last had reason to believe something.
 *
 * Constitutional authority:
 *   Brand Bible §07  — freshness is encoded in weight and opacity, never in hue,
 *                      so a decaying fact stays readable and the semantic palette
 *                      stays uncontaminated.
 *   Brand Bible §05  — mono marks the system describing its own knowledge.
 *   Experience Bible §15 — a stale answer clearly labelled beats a fresh spinner.
 *
 * Decay is a property of the fact, not a global clock (Brand Bible §07): a degree
 * earned in 2024 is still earned, while "currently studying" expires in weeks.
 * The caller supplies the class; this component only renders the consequence.
 */

/** How quickly confidence in a fact should fade without reinforcement. */
export type DecayClass = "monotonic" | "slow" | "fast";

const DAY = 86_400_000;

/** Half-life in days per class. `monotonic` never decays and is handled separately. */
const HALF_LIFE: Record<Exclude<DecayClass, "monotonic">, number> = {
  slow: 540,
  fast: 21,
};

/**
 * Maps age to a rendering weight. Four steps rather than a continuous ramp so
 * the result is legible and reproducible rather than subtly different every time.
 */
function decayStep(ageMs: number, decay: DecayClass): 0 | 1 | 2 | 3 {
  if (decay === "monotonic") return 0;
  const ratio = ageMs / (HALF_LIFE[decay] * DAY);
  if (ratio < 0.25) return 0;
  if (ratio < 0.6) return 1;
  if (ratio < 1) return 2;
  return 3;
}

const STEP_CLASS = [
  "opacity-100 font-semibold",
  "opacity-[0.78] font-medium",
  "opacity-[0.58] font-normal",
  "opacity-[0.42] font-normal",
] as const;

/** Coarse, calm relative time. No "just now", no seconds, no live ticking. */
function relative(from: Date, now: Date): string {
  const days = Math.floor((now.getTime() - from.getTime()) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 24) return months === 1 ? "1 month ago" : `${months} months ago`;
  return `${Math.floor(months / 12)} years ago`;
}

export function FreshnessStamp({
  /** ISO timestamp of when this was last confirmed or computed. */
  at,
  decay = "slow",
  /** Leading word, e.g. "confirmed", "computed", "last searched". */
  verb = "confirmed",
  now = new Date(),
  className = "",
}: {
  at: string;
  decay?: DecayClass;
  verb?: string;
  now?: Date;
  className?: string;
}) {
  const then = new Date(at);
  const step = decayStep(now.getTime() - then.getTime(), decay);

  return (
    <span
      className={`font-mono text-[11px] tabular-nums text-text-s ${STEP_CLASS[step]} ${className}`}
    >
      {/* The machine-readable value stays exact even as the label stays coarse. */}
      <time dateTime={at}>
        {verb} {relative(then, now)}
      </time>
    </span>
  );
}
