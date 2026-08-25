import type { Claim, ClaimOrigin } from "@/lib/opportunity/foundation/claim";

/**
 * Your Next Best Step — the contract for the Workspace's primary surface.
 *
 * Constitutional authority:
 *   Experience Bible §2   — one step, never two; source always shown; evidence inline.
 *   OXD-001 (hist. XB §7) — Empty, Absent, and Unknown are three distinct states.
 *   Product Bible §07     — the Accountability Principle: state the odds, not only the fit.
 *   OXD-004 (hist. CS §01) — the composition law: nothing states a claim without
 *                           composing the Tier 0 primitives that make it checkable.
 *
 * This file used to define its own `BaseRate` and `StepEvidence`. Both are gone.
 * OXD-003 (hist. CS §14) is explicit that Tier 0 "ships as a published package consumed by every
 * product on every origin — copied primitives become four different trust models
 * within a year", and a second definition inside one repository is already the
 * first of those four. A step is now a `Claim` with an action, so the Step
 * surface cannot drift from the Profile, from a ranking, or from whatever
 * renders a readiness figure next.
 *
 * The old shape also made `baseRate` optional, which meant a contested
 * opportunity with unknown figures rendered as silence — and silence reads as
 * uncontested. `Claim.baseRate` is required and three-valued to close exactly
 * that, per CS §02 and assumption C-02.
 */

/**
 * The only three legitimate origins for a step. There is no fourth — a step that
 * cannot name its source class is not shippable (OXD-003 (hist. IA §18), binding).
 *
 *   revelation    — something genuinely appeared or changed in the world.
 *   understanding — the model improved; the ranking moved because Opportunity X learned.
 *   stable        — nothing changed externally or internally, so the answer holds.
 */
export type StepSource = ClaimOrigin;

export interface NextStep {
  id: string;
  /**
   * Everything asserted, with everything needed to check it. Carrying the whole
   * Claim rather than loose fields is what makes the composition law
   * unavoidable: there is no way to hand the Step surface a statement without
   * its evidence and its base rate.
   */
  claim: Claim;
  /** The thing that advances it. May leave Opportunity X entirely. */
  action?: { label: string; href: string };
  /**
   * What a commitment to this step would be recorded as, if the person makes
   * one.
   *
   * Optional, and its absence is meaningful rather than a default. CS §05 calls
   * a Ledger entry "one commitment the person made"; a record whose title the
   * system had to invent would not be that. When this is absent the Step offers
   * no commit affordance at all, because the system cannot name what would be
   * written — and writing an approximation would be fabricating the person's own
   * record, which XB §2 forbids by fixing the Ledger's contents to "what the
   * user actually committed to".
   *
   * `deadline` is nullable and stays null when unknown. The schema's
   * `passed_requires_a_deadline` constraint makes a passed deadline
   * unrepresentable without one, so a guessed date here would later become a
   * state the person never entered.
   */
  commitment?: { title: string; deadline: string | null };
}

/**
 * What the Step surface resolves to.
 *
 * The variants encode OXD-001 (hist. XB §7)'s three absence states as separate
 * cases so they cannot be collapsed into one grey box — the differences between
 * them *are* the trust model.
 *
 * Note `absent` requires `searchedAt`. That is the §7 precondition made
 * structural: an Absent verdict may only be produced by a recorded successful
 * search. A broken pipeline returning no rows cannot construct this variant,
 * so a failure can never masquerade as a finding.
 */
export type StepResolution =
  /** A real step, from one of the three legitimate sources. */
  | { state: "step"; step: NextStep }
  /**
   * The person has not completed the first session, so Opportunity X holds no
   * understanding. Not an error and not an empty state — the handshake simply
   * hasn't happened (IA Bible §08: a new account never lands on an empty Step).
   */
  | { state: "no-understanding" }
  /**
   * A search ran, succeeded, and produced nothing better. A verdict.
   * Says "nothing better has appeared" — never "nothing changed".
   */
  | { state: "absent"; searchedAt: string; previousStep?: NextStep }
  /**
   * Opportunity X cannot see. A limit on the system, never a claim about the person.
   *
   * ── Why `since` is nullable, and why `because` is required ──────────────
   *
   * `since` is the last point at which Opportunity X *did* have visibility. Every
   * producer used to pass `new Date()` for it, which is not that point — it is
   * the moment the question was asked — and the Workspace rendered it as
   * "I've had no visibility into this since August 2026". To a person that
   * says visibility existed and lapsed recently. On this deployment none has
   * ever existed, so the sentence claimed a history that never happened, on the
   * one surface whose entire job is to be trusted about what it does not know.
   *
   * Null now means exactly that: there was never any visibility to lose. And
   * `because` is required so the layer that knows *why* it cannot see writes the
   * sentence, rather than a component inferring one from a timestamp. Nothing
   * configured, a record that could not be read, and a search that has never run
   * are three different admissions, and they were all rendering as the same one.
   */
  | { state: "unknown"; since: string | null; because: string };
