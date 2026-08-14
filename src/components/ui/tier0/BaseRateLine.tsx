import type { BaseRate } from "@/lib/core/tier0/types";

/**
 * BaseRate — the competitive reality of a contested opportunity.
 *
 * Constitutional authority:
 *   Product Bible §07, Accountability Principle — "'You meet 8 of 8 criteria' is
 *     a half-truth if the system also knows there were twelve places and four
 *     hundred applicants." Base rates are evidence; "withholding them to protect
 *     someone's hope is exactly the encouragement this constitution forbids."
 *   Experience Bible §8 — every recommendation carrying a real contest must
 *     carry its contest.
 *   Component System §02 + assumption C-02 — the unknown case renders explicitly,
 *     because "silence would let a person infer the field is uncontested — a
 *     false impression created by omission."
 *
 * It takes a required three-state value rather than an optional object. There is
 * no way to render this component "empty", and no way for a caller to omit it
 * and leave the reader to assume. That is the whole design.
 *
 * No probability percentage. CS §02 rejects it: it "implies a model of the
 * selection process that doesn't exist, and would be the system claiming
 * knowledge it lacks."
 */
export function BaseRateLine({
  baseRate,
  className = "",
}: {
  baseRate: BaseRate;
  className?: string;
}) {
  const base = `font-mono text-[12px] tabular-nums tracking-tight ${className}`;

  if (baseRate.state === "uncontested") {
    return (
      <p className={`${base} text-text-s`}>
        Not a contest — places are not limited.
      </p>
    );
  }

  if (baseRate.state === "unknown") {
    /*
      Stated, not omitted. This sentence is the difference between the system
      admitting a limit and the system letting an absence read as good news.
      Phrased as a limit on AEON X ("unknown to me"), never as a fact about the
      opportunity — the same distinction UnknownState draws against AbsentState.
    */
    return (
      <p className={`${base} text-text-s`}>Competition for this is unknown to me.</p>
    );
  }

  return (
    <p className={`${base} text-foreground/85`}>
      <span className="font-bold">{baseRate.places.toLocaleString()}</span>
      {baseRate.places === 1 ? " place" : " places"}
      <span aria-hidden="true" className="mx-1.5 text-text-s">
        ·
      </span>
      <span className="font-bold">~{baseRate.applicants.toLocaleString()}</span> applicants,{" "}
      {baseRate.observedIn}
    </p>
  );
}
