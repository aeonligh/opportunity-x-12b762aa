import type { ProductScope } from "@/lib/core/profile/types";
import type { Claim } from "@/lib/core/tier0/types";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * THE LEDGER — CONSTITUTIONAL SPECIFICATION
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Written before the implementation, from the Bibles only. Every requirement
 * below is quoted, and every element of the implementation traces to one. Any
 * capability not on this list is rejected — see REJECTED at the foot.
 *
 * ── Requirements ──────────────────────────────────────────────────────────
 *
 * L1  PB §04 — "a unified tracker of applications, requests, and submissions
 *     made across the ecosystem".
 *     Satisfies: the Workspace's obligation to hold the user's own commitments.
 *
 * L2  XB §2 — "A feed is unbounded and sorted by novelty. A ledger is bounded
 *     by reality and sorted by consequence."
 *     Satisfies: the distinction that makes this not an activity stream.
 *
 * L3  XB §2 — "the Ledger itself is a full destination".
 *     Satisfies: IA §03's four destinations.
 *
 * L4  XB §2 — "Its length is determined by what the user actually committed
 *     to, never by what the system found."
 *     Satisfies: the ban on the system padding the record with its own output.
 *
 * L5  XB §2 — "Infinite scroll stays prohibited".
 *
 * L6  XB §2 / IA §03 — the Step carries "the Ledger's nearest-consequence
 *     preview".
 *
 * L7  IA §03 — route `/ledger`.
 *
 * L8  IA §03 — "Every application, request, and submission made across the
 *     ecosystem, sorted by consequence. Unbounded, because its length comes
 *     from the user's commitments."
 *
 * L9  IA §03 — "Tier 2 events concern a specific commitment, so they land on
 *     that item in the Ledger. A separate inbox would duplicate the fact and
 *     create something to clear."
 *     Satisfies: the absence of a notification centre.
 *
 * L10 IA §03 — "An inbox creates obligation; a ledger creates orientation.
 *     Only one of those helps someone move."
 *
 * L11 IA §03 — "Facts appear once, in the place they belong — never duplicated
 *     into a surface that exists to be visited."
 *
 * L12 IA §04 — `/ledger/[itemId]` — "one commitment, its history, its state
 *     changes".
 *
 * L13 IA §04 — depth as URL state: `/ledger/42?why=rank` is Level 1, the
 *     reasoning behind a ranking.
 *
 * L14 IA §12 — a transactional product "appears in the Ledger as commitments
 *     and never competes for the Step".
 *     Satisfies: cross-product items carrying their origin.
 *
 * L15 IA §16 — "Single column, sorted by consequence. Single column. Width
 *     does not justify a second one."
 *
 * L16 CS §00, Override 2 — "no skeleton on the Step, the Ledger, or the
 *     Profile. A stale value with its freshness stamp ships instead."
 *
 * L17 CS §05 — states: "open · deadline passed, outcome unknown · outcome
 *     reported · withdrawn. Cross-product items carry their origin product."
 *
 * L18 CS §05 — "Opens the RecommendationRecord. Carries the OutcomeReporter
 *     when a deadline has passed."
 *
 * L19 CS §05 — "Sorted by consequence — nearest irreversible deadline first.
 *     Never sorted by recency, which would make it a feed."
 *
 * L20 CS §05 — unknown state: "This closed on 14 March. I don't know what
 *     happened." Never assumes either outcome.
 *
 * L21 CS §05 — empty state: "Applications you start will appear here." Never
 *     "nothing found".
 *
 * L22 CS §05 — anti-patterns: "Sorting by recency · unread dots · hiding
 *     closed items · a count anywhere · infinite scroll."
 *
 * L23 Flows §08 — "When a committed deadline passes with no reported outcome,
 *     the Ledger item states the limit. Reporting is one interaction from
 *     there. Nothing is pushed."
 *
 * L24 Flows §08 — "Every recommendation, its reasoning, its base rate, and its
 *     outcome — visible to the person it concerns, in the Ledger."
 *
 * L25 Flows §08 — never "Reordering, hiding, or ageing-out a failed
 *     recommendation."
 *
 * L26 CS §01 — Tier 3 composes Tier 0 + Tier 1.
 *
 * ── REJECTED: capabilities no constitutional statement requires ────────────
 *
 *   Status filters or tabs   — no statement requires them, and L19 fixes the
 *                              order, so a filter is a second way to hide
 *                              commitments (L22: "hiding closed items").
 *   A sort control           — L19 fixes sorting by consequence. A control that
 *                              offered "most recent" would expose the exact
 *                              ordering L19 forbids.
 *   Search                   — no statement.
 *   Counts, badges, totals   — L22, explicitly.
 *   Pagination / load more   — L5 and L8: bounded by reality, so it ends.
 *   Charts or statistics     — no statement; PB §07 forbids a success-rate
 *                              headline on the record.
 *   Skeleton loaders         — L16, explicitly.
 *   "Activity" framing       — L10.
 *   Archive / dismiss        — L22 ("hiding closed items") and L25.
 */

/**
 * The four states, exactly as CS §05 names them (L17). There is no fifth, and
 * no "in progress" — a commitment is open until something happens to it.
 */
export type CommitmentState =
  /** Live. The deadline has not passed. */
  | { state: "open"; deadline: string | null }
  /**
   * The deadline passed and the person has not said what happened. The system
   * does not assume, and does not chase (L20, L23).
   */
  | { state: "deadline-passed"; deadline: string }
  /** The person reported what happened. */
  | { state: "outcome-reported"; deadline: string | null; outcome: "accepted" | "rejected"; reportedAt: string }
  /** The person withdrew. */
  | { state: "withdrawn"; withdrawnAt: string };

export interface Commitment {
  id: string;
  /** What was committed to, in the person's terms. */
  title: string;
  /** Which product it was made in — L14, cross-product items carry origin. */
  product: ProductScope;
  status: CommitmentState;
  /** When the person committed. Recorded, but never the sort key (L19). */
  committedAt: string;
}

/**
 * What `/ledger` resolves to.
 *
 * Deliberately only three cases. There is no "loading" — L16 forbids a skeleton
 * here, so a stale value ships with its freshness stamp instead, and there is
 * no state in which the Ledger is rendered as pending.
 */
export type LedgerResolution =
  | { state: "ledger"; commitments: Commitment[] }
  /** Nothing committed yet, and that is expected. Not a search result (L21). */
  | { state: "empty" }
  /** The system cannot read the record. A limit on it, never on the person. */
  | { state: "unknown"; since: string };

/**
 * Consequence ordering (L19).
 *
 * "Nearest irreversible deadline first. Never sorted by recency, which would
 * make it a feed."
 *
 * The ordering is a pure function and is not configurable, because L19 fixes it
 * and a user-facing control would expose the recency ordering the same sentence
 * forbids.
 *
 * Rank, in order of how soon something becomes irreversible:
 *   0  open with a deadline      — sooner deadline first; the only urgent class
 *   1  deadline passed, unknown  — already irreversible, still unresolved
 *   2  outcome reported          — settled, but never hidden (L22, L25)
 *   3  withdrawn                 — settled by the person
 */
export function consequenceRank(commitment: Commitment): number {
  switch (commitment.status.state) {
    case "open":
      return 0;
    case "deadline-passed":
      return 1;
    case "outcome-reported":
      return 2;
    case "withdrawn":
      return 3;
  }
}

export function byConsequence(a: Commitment, b: Commitment): number {
  const rank = consequenceRank(a) - consequenceRank(b);
  if (rank !== 0) return rank;

  const deadline = (c: Commitment) =>
    "deadline" in c.status && c.status.deadline
      ? new Date(c.status.deadline).getTime()
      : Number.POSITIVE_INFINITY;

  const delta = deadline(a) - deadline(b);
  if (delta !== 0) return delta;

  /* Last resort only, and deliberately not recency: title keeps the order
     stable between renders without introducing the ordering L19 bans. */
  return a.title.localeCompare(b.title);
}

/**
 * ══════════════════════════════════════════════════════════════════════════
 * THE RECORD — CS §05, quoted verbatim from the Component System Bible
 * ══════════════════════════════════════════════════════════════════════════
 *
 * RecommendationRecord — "A recommendation, its reasoning, its base rate, and
 *   its outcome — permanently."
 *   Requires it: PB §07 — "Without the record the two obligations above are a
 *     promise; with it they are verifiable, because failures sit beside
 *     successes in a record the system does not control."
 *   Uncertainty removed: "Whether AEON X has actually been right. This is the
 *     only component that lets a person audit the system rather than the system
 *     audit them."
 *   Alternatives rejected: "Internal-only analytics — a record the person cannot
 *     read is not accountability. Ageing failures out — that is the concealment
 *     that destroys institutional trust, made into a feature."
 *   Interaction: "Read-only. Immutable — the system may append, never edit or
 *     delete."
 *   Anti-patterns: "Filtering to successes by default · a success-rate headline
 *     number · pagination that buries old failures · any edit path."
 *
 * OutcomeReporter — "One interaction to tell the system what happened."
 *   Requires it: "Ownership Principle — the person owns the truth of their life,
 *     and the system never chases it. Accountability — an outcome is the highest-
 *     quality evidence the system will ever receive."
 *   Alternatives rejected: "An email asking 'did you get it?' — pursues
 *     information, forbidden outright. Inferring from behaviour — the Visibility
 *     Principle forbids concluding anything from absence of signal."
 *   States: "available · reporting · reported. Never required, never blocking,
 *     never dismissible-with-guilt."
 *   Interaction: "Present on the item, one interaction from the Ledger.
 *     Reporting a rejection and reporting an acceptance are identical in weight
 *     and prominence — asymmetry here would bias the record the system learns
 *     from."
 *   Accountability: "On report, the system responds per the four-kinds-of-wrong
 *     table and updates the model. No apology, no celebration."
 *   Anti-patterns: "Nagging · making rejection harder to report than acceptance ·
 *     congratulating success · 'Sorry to hear that' · requiring a reason."
 */

/**
 * The four kinds of wrong, exactly as Flows §08 enumerates them, plus the
 * accepted case that section covers alongside them.
 *
 * These are a *classification the system makes about itself* — never a question
 * put to the person. CS §05 lists "requiring a reason" as an anti-pattern by
 * name, so nothing here is ever collected from a form.
 */
export type AccountingKind =
  /** Outcome reported as accepted. "Recorded, and the model updates." */
  | "accepted"
  /** "Sound decision, bad outcome — the common case, and not an error." */
  | "sound-decision"
  /** "The reasoning was wrong — named without softening." */
  | "reasoning-wrong"
  /** "The model was wrong — provenance named, inferred or stated." */
  | "model-wrong"
  /** "The world moved — not an error, a change." */
  | "world-moved";

/**
 * What the system said for itself when the outcome came in.
 *
 * `statement` is stored, not templated. Every example in Flows §08 is specific
 * to the case — "I ranked this first on funding fit and missed the residency
 * requirement" — and a generic sentence assembled at render time would be the
 * retroactive hedging that section calls "the most corrosive response
 * available". A renderer therefore cannot manufacture one.
 */
export interface Accounting {
  kind: AccountingKind;
  statement: string;
  /** When the system said it. Appended, never revised (CS §05, Interaction). */
  recordedAt: string;
}

/**
 * One commitment, everything that produced it, and what came of it (L12, L24).
 *
 * `recommendation` is nullable because a person may commit to something AEON X
 * never recommended. That case is stated at the render rather than hidden: a
 * record that silently showed no reasoning would be indistinguishable from one
 * whose reasoning was lost.
 *
 * `accounting` is nullable for the same reason in the other direction — see
 * `reportOutcome` below.
 */
export interface RecommendationRecord {
  commitment: Commitment;
  /** The claim this commitment came from, where it came from one. */
  recommendation: Claim | null;
  /** The system's own accounting, once an outcome has been reported. */
  accounting: Accounting | null;
}

/** What `/ledger/[itemId]` resolves to. No "loading" — L16 applies here too. */
export type RecordResolution =
  | { state: "record"; record: RecommendationRecord }
  /** No such commitment for this person. Not an error, and not a 404 shrug. */
  | { state: "not-found" }
  /** The system cannot read the record. A limit on it, never on the person. */
  | { state: "unknown"; since: string };

/**
 * The result of reporting an outcome.
 *
 * `recorded: false` is representable because the system must be able to say it
 * failed. CS §05 requires the reporter to state the result of a report; a
 * silent failure would leave the person believing the highest-quality evidence
 * the system will ever receive had been captured when it had not.
 */
export type OutcomeReport =
  | { recorded: true; accounting: Accounting | null }
  | { recorded: false; limit: string };

export interface LedgerService {
  read(userId: string): Promise<LedgerResolution>;
  /**
   * The Step's nearest-consequence preview (L6). One item — the same first item
   * `read` would return under the same ordering, never a separate computation
   * that could disagree with the destination (L11).
   */
  nearestConsequence(userId: string): Promise<Commitment | null>;
  /** One commitment, its history, its state changes (L12). */
  byId(userId: string, itemId: string): Promise<RecordResolution>;
  /**
   * Record what happened (L23, CS §05).
   *
   * Takes only the outcome. There is no `reason` parameter, and adding one
   * would be a constitutional violation rather than a feature — CS §05 names
   * "requiring a reason" an anti-pattern, and a parameter that exists will
   * eventually be made required by a form.
   */
  reportOutcome(
    userId: string,
    itemId: string,
    outcome: "accepted" | "rejected"
  ): Promise<OutcomeReport>;
}
