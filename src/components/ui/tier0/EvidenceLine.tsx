/**
 * EvidenceLine — the one sentence of reasoning that ships inline with a claim.
 *
 * Constitutional authority:
 *   Experience Bible §2 — evidence arrives with the claim, never behind a
 *     disclosure. The reasoning arrives with the recommendation.
 *   Brand Bible §03 — ranking without reasoning is an opinion; with reasoning
 *     it is a finding.
 *   Component System §02 — "This component *is* the Revelation Principle in its
 *     smallest form: the difference between 'we think you'll like this' and
 *     'you meet 7 of 8 criteria'."
 *
 * It takes no `collapsed` prop and has no disclosure. CS §02 rejects the
 * accordion and the info icon by name: "reasoning that costs an interaction is
 * reasoning most people never read, which makes confidence unearned."
 *
 * There is no fallback string. If reasoning cannot be produced the claim is not
 * shippable — a generic line would be "tone pretending to be evidence".
 */
export function EvidenceLine({
  summary,
  className = "",
}: {
  /** One sentence. Never "based on your profile", never "we think". */
  summary: string;
  className?: string;
}) {
  return (
    /*
      Measure capped at 58ch per CS §02, and adjacent to the claim in reading
      order — never visually near but semantically distant.
    */
    <p className={`max-w-[58ch] text-[15px] leading-relaxed text-text-s ${className}`}>
      {summary}
    </p>
  );
}
