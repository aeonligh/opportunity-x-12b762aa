import type { ClaimOrigin } from "@/lib/core/tier0/types";

/**
 * SourceTag — which of the three legitimate origins produced this claim.
 *
 * Constitutional authority:
 *   Experience Bible §2, §5 — the person always knows whether they are looking
 *     at a revelation, a better understanding, or a stable priority.
 *   Component System §02 — "A step that cannot name its source class is not
 *     shippable. There is no fourth value and no default."
 *
 * Three values, no fallback, no catch-all. The type has exactly three members,
 * so an unlabelled claim is a compile error rather than a rendering decision.
 *
 * No colour coding by desirability. CS §02 names it as an anti-pattern:
 * colour-coding revelation as "good" and stable as "neutral" would teach people
 * that novelty is the valuable outcome, which is the behaviour the entire
 * product is built to avoid. All three render in the same neutral treatment.
 *
 * No motion. "A source tag that animated on 'new revelation' would reward
 * novelty."
 */

const ORIGIN_LABEL: Record<ClaimOrigin, string> = {
  revelation: "New revelation",
  understanding: "Better understanding",
  stable: "Stable priority",
};

/** Whole days between two instants, floored. Never finer — CS §02. */
function daysSince(iso: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
}

export function SourceTag({
  origin,
  unchangedSince,
  now = new Date(),
  className = "",
}: {
  origin: ClaimOrigin;
  /** Required in practice for `stable` — see the note below. */
  unchangedSince?: string;
  now?: Date;
  className?: string;
}) {
  /*
    On a stable priority the duration is appended, because CS §02 is explicit
    that "the stable case is precisely where the label does the most work,
    because unchanged plus unlabelled reads as broken" — and that duration held
    is confidence, not staleness.
  */
  const held =
    origin === "stable" && unchangedSince ? daysSince(unchangedSince, now) : null;

  return (
    <span
      className={`inline-flex w-fit items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-text-s ${className}`}
    >
      {ORIGIN_LABEL[origin]}
      {held !== null && held > 0 ? (
        <>
          <span aria-hidden="true" className="opacity-50">
            ·
          </span>
          <span className="font-medium normal-case tracking-normal">
            unchanged {held === 1 ? "1 day" : `${held} days`}
          </span>
        </>
      ) : null}
    </span>
  );
}
