/**
 * Layer 1 — Observation.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THIS LAYER EXISTS SEPARATELY FROM THE OTHER TWO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The engine holds three layers and never collapses them:
 *
 *   Observation — what was seen, when, where. Append-only. Immutable.
 *   Entity      — what Opportunity X believes the opportunity *is*. Revisable.
 *   Judgment    — what it means for one person. Recomputed; time-varying.
 *
 * A row that carries all three at once cannot answer "what did you actually
 * see, and when?" after the page has changed underneath it. The database this
 * project shares with an earlier product contains exactly that row, and
 * `docs/constitutional/shared-database.md` records the consequence: the table
 * "conflates three constitutionally distinct categories in one row". This file
 * is the first of the three, kept alone on purpose.
 *
 * ── Requirements this file discharges ─────────────────────────────────────
 *
 * O1  Observations are append-only, immutable and **undeletable**. The store
 *     port below has `append` and reads. It has no `update` and no `delete`,
 *     so a caller cannot rewrite history — not because it is discouraged, but
 *     because there is no method to call.
 *
 * O2  A re-encounter appends; it never updates. Two retrievals of the same URL
 *     are two observations. The disagreement between them is data, and the
 *     Entity layer is where it is reconciled — never here.
 *
 * O3  The retrieval timestamp is distinct from any date stated inside the
 *     opportunity. `retrievedAt` is when Opportunity X looked; a deadline written on
 *     the page is an `ObservedClaim` like any other.
 *
 * O4  The parser version is recorded per observation **and per claim**. A page
 *     is read by several extractors; attributing a wrong value to "the parser"
 *     when three of them ran identifies nothing.
 *
 * O5  **Content is retained, not a hash alone.** A hash proves that something
 *     changed; it cannot reconstruct what was claimed.
 *
 * O6  **Evidence is held, not borrowed.** Nothing in reconstruction may depend
 *     on re-fetching the source.
 *
 * O7  A fetch failure against a known entity is itself an observation.
 *
 * O8  **First-observation provenance is recorded** — official, announcer,
 *     aggregator, or an unenumerated domain.
 *
 * O9  **A page carries items, not fields.** One URL routinely describes several
 *     opportunities — a listing, a news page with two calls, a programme page
 *     covering successive cycles. A shape with one set of claims per page has
 *     to choose one of them, and the ones it does not choose are not merged
 *     wrongly; they are *destroyed*. This was a real defect: a fixture with two
 *     declared programmes produced one, and the second left no trace anywhere
 *     in the record.
 *
 * O10 **Absence of extraction is not absence of an opportunity.** A retrieval
 *     that yielded no items says so, with the reason and the media type, and
 *     the page stays in the record and under monitoring. "We could not read
 *     this" and "there was nothing here" are different facts, and a system that
 *     writes both as zero rows can never measure its own coverage.
 */

/**
 * Semantic version of an extractor.
 *
 * A template literal type rather than a string: a version that can be "latest"
 * or "" is a version nobody can compare against, and comparison is the entire
 * reason it is stored.
 */
export type ParserVersion = `${number}.${number}.${number}`;

/**
 * What kind of source produced this observation.
 *
 * An opportunity acquires an institutional announcer when it is *routed* to an
 * institution whose community it affects. Organiser size is not the variable;
 * routing is. `unknown-domain` is the residue, kept as a distinct member so it
 * can be counted rather than inferred.
 */
export type SourceClass = "official" | "announcer" | "aggregator" | "unknown-domain";

/** The fields an extractor may assert about an opportunity. */
export type ObservedField =
  | "title"
  | "organiser"
  | "opens"
  | "deadline"
  | "eligibility"
  | "funding"
  | "location"
  | "how-to-apply";

/**
 * One thing a source said about one opportunity, as it said it.
 *
 * `asStated` is the page's own words. `normalised` is present only when the
 * extractor could produce one without guessing — "1st March" has a
 * normalisation, "spring" does not, and leaving it absent is how the engine
 * declines to invent one.
 *
 * `extractedBy` is per claim, not per page. Several extractors read the same
 * document, and when two of them disagree the record has to say which produced
 * which — otherwise a parser found to be wrong cannot be traced to the claims
 * it made.
 *
 * There is deliberately no `confidence`. An observation records what was seen,
 * not how much of it is believed. Belief is verification's work, and a
 * confidence written here would be a judgment inside the immutable record where
 * it could never be revised.
 */
export interface ObservedClaim {
  field: ObservedField;
  /** Exactly the text the source carried. Never a cleaned-up rendering. */
  asStated: string;
  /** Where in the document it was found, so a human can re-check it. */
  locator: string;
  /** Present only when the extractor could normalise without guessing. */
  normalised?: string;
  /**
   * How precise the source actually was, when `normalised` is an instant.
   *
   * `"day"` means the source named a calendar day and no time — "2026-09-30",
   * "30 September 2026". The normalised form is then the *start* of that day,
   * because that is what the string literally denotes; reading it as anything
   * else is an interpretation, and an interpretation does not belong in the
   * immutable record.
   *
   * It is recorded because dropping it is not harmless. A day-precision
   * deadline compared as an instant reads as passed from the first second of
   * the day the publisher said you could still apply — so a person is told they
   * missed it on the morning they still had. `deriveOpenState` is where the
   * interpretation lives; this is what makes the interpretation possible.
   */
  precision?: "day";
  /** `id@version` of the extractor that produced it. */
  extractedBy: string;
}

/**
 * A signal about *which opportunity* an item is, ordered by how much weight it
 * can bear.
 *
 * The whole point of this type is that URL identity fails in both directions —
 * one URL serves successive cycles of a programme, and one programme lives at
 * an announcement, an organiser page and an application portal on three
 * domains. A resolver with only a URL cannot do better than be wrong in one of
 * those directions, so it is given something better where the publisher
 * declared something better, and told plainly when it has nothing.
 *
 * Every signal here is **declared by the publisher**. None is inferred from
 * similarity, filename, or wording. That is the line: a resolver may act on a
 * declaration and may only ever *propose* on a resemblance.
 */
export type IdentitySignal =
  /** schema.org `@id` or `identifier` — the publisher naming the thing. */
  | { kind: "declared-identifier"; value: string }
  /** `<link rel="canonical">`, `og:url`, or JSON-LD `url`. */
  | { kind: "canonical-url"; value: string }
  /** The URL that answered. Always available, and the weakest thing there is. */
  | { kind: "page-url"; value: string };

/** Strongest first. The order is the precedence and is relied on. */
export const IDENTITY_STRENGTH: readonly IdentitySignal["kind"][] = [
  "declared-identifier",
  "canonical-url",
  "page-url",
];

/**
 * One opportunity, as one document described it.
 *
 * `cycle` is the intake, round or academic year — and it is only ever set from
 * something the publisher declared. It is never parsed out of a title, because
 * "2026/2027" appearing in a name is not a statement that this is the 2026/2027
 * round; it is a string in a name. A declared cycle separates two entities at
 * one URL. An undeclared one leaves them as a single entity holding claims that
 * disagree, which is the honest reading: "the deadline moved" and "this is next
 * year's round" are genuinely indistinguishable without a declaration, and
 * guessing between them silently rewrites the record either way.
 */
export interface ObservedItem {
  /** Where in the document this item was found. */
  locator: string;
  /** Strongest first. May be empty at the item level; the page supplies more. */
  identity: IdentitySignal[];
  /** Declared only. Never parsed out of prose or a title. */
  cycle?: string;
  /**
   * The type the publisher declared — the schema.org `@type`, unmodified.
   *
   * Carried because it is the only non-guessing basis for the verb on a
   * terminal action. "Apply" is wrong for a webinar and "Attend" is wrong for a
   * scholarship, and inferring which from a title is exactly the guess this
   * engine refuses everywhere else. Absent where nothing was declared, and the
   * surface then offers to open the announcement rather than instructing
   * someone to begin a process that may not exist.
   */
  declaredType?: string;
  claims: ObservedClaim[];
}

/**
 * The bytes, kept.
 *
 * `encoding` exists because not everything an institution publishes is text. A
 * ministry circular is routinely a PDF, and decoding one as UTF-8 stores
 * mojibake that can never be read back — a hold that loses the evidence is not
 * a hold. Binary media is retained base64, so the retrieval remains
 * reconstructible even though nothing can currently extract from it.
 */
export interface RetrievedContent {
  body: string;
  encoding: "utf-8" | "base64";
  contentType: string;
  /** Over the raw bytes, not the encoded string, so it is comparable either way. */
  sha256: string;
  byteLength: number;
}

/** Who was asked, and in what capacity. */
export interface ObservedSource {
  sourceId: string;
  label: string;
  sourceClass: SourceClass;
}

/**
 * Why a retrieved page yielded no items.
 *
 * Required whenever `items` is empty, so the two cases can never be confused:
 * a page Opportunity X cannot read, and a page it read that described nothing. Both
 * stay under monitoring; only one of them is a coverage gap, and a system that
 * writes both as zero rows can never tell which it has.
 */
export interface Unreadable {
  reason: string;
  mediaType: string;
}

/**
 * A witnessed retrieval.
 *
 * `retrievedAt` is the load-bearing field and the reason this type is branded.
 * A timestamp is worth nothing if any caller can write one; a scheduled job
 * that stamps `last_checked` without checking manufactures evidence that the
 * protected behaviour occurred. The brand cannot be satisfied outside
 * `record.ts`, and `record.ts` derives `retrievedAt` from a completed HTTP
 * exchange rather than accepting it.
 */
declare const RETRIEVAL_WITNESSED: unique symbol;

interface SourceObservationBase {
  id: string;
  /** O3 — when Opportunity X looked. Never a date read off the page. */
  retrievedAt: string;
  url: string;
  source: ObservedSource;
  /** The composite extractor's version. Per-claim attribution is on the claim. */
  parserVersion: ParserVersion;
  relatedTo: string[];
}

export type UnwitnessedObservation = SourceObservationBase &
  (
    | {
        outcome: "retrieved";
        content: RetrievedContent;
        /** O9 — one entry per opportunity the document described. May be empty. */
        items: ObservedItem[];
        /** Identity the page declared about itself. Applies to every item. */
        pageIdentity: IdentitySignal[];
        /** O10 — required exactly when `items` is empty. */
        unreadable?: Unreadable;
      }
    /** O7 — the source did not answer, and that is recorded rather than discarded. */
    | {
        outcome: "unreachable";
        status: number | null;
        reason: string;
      }
  );

export type SourceObservation = UnwitnessedObservation & {
  readonly [RETRIEVAL_WITNESSED]: true;
};

export type RetrievedObservation = Extract<SourceObservation, { outcome: "retrieved" }>;

export function isRetrieved(o: SourceObservation): o is RetrievedObservation {
  return o.outcome === "retrieved";
}

/**
 * The append-only record.
 *
 * O1 made structural: there is no `update` and no `delete`. Adding either is a
 * constitutional amendment, not a convenience — a store that can forget cannot
 * answer for what it once said.
 */
export interface ObservationStore {
  append(observation: SourceObservation): Promise<void>;
  read(observationId: string): Promise<SourceObservation | null>;
  readByUrl(url: string): Promise<SourceObservation[]>;
  readMany(observationIds: readonly string[]): Promise<SourceObservation[]>;
  /** Every observation, oldest first. The input to entity resolution. */
  readAll(): Promise<SourceObservation[]>;
  count(): Promise<number>;
  observedUrls(): Promise<{ url: string; lastRetrievedAt: string }[]>;
  /** Null when no retrieval has ever been witnessed. Never defaulted to now. */
  lastRetrievalAt(): Promise<string | null>;
}
