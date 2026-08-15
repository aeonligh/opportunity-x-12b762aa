/**
 * EMPTY — nothing exists yet, and that is expected.
 *
 * Constitutional authority:
 *   Experience Bible §7 — Empty, Absent and Unknown are three distinct states.
 *   IA Bible §18        — deliberately three components, not one with a variant
 *                         prop, because a shared component gets used for the
 *                         wrong state and the differences between these states
 *                         *are* the trust model.
 *
 * Says what will fill the space. Never says "nothing found" — nothing was
 * searched for. Never illustrated: a finding stated plainly reads as competence,
 * a finding decorated reads as an apology for the product (Experience Bible §7).
 */
export function EmptyState({
  /** What will appear here once it exists, in the user's terms. */
  expectation,
  className = "",
}: {
  expectation: string;
  className?: string;
}) {
  return (
    <p className={`max-w-[52ch] text-sm leading-relaxed text-text-s ${className}`}>{expectation}</p>
  );
}
