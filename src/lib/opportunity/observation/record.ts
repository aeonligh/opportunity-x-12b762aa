import { createHash, randomUUID } from "node:crypto";
import type {
  IdentitySignal,
  ObservedSource,
  SourceObservation,
  UnwitnessedObservation,
} from "./types";
import { defaultExtractor } from "./extractors/composite";
import type { ClaimExtractor } from "./extractors/types";

/**
 * The one place a `SourceObservation` is minted.
 *
 * ── Why a single door ─────────────────────────────────────────────────────
 *
 * `retrievedAt` is a claim that Opportunity X looked at a source at a moment in time.
 * Everything downstream inherits it: verification freshness, decay, the
 * "checked N days ago" a person reads before deciding whether to trust a
 * deadline. If any caller can supply that timestamp, the discipline "no
 * `last_checked` unless a real check occurred" is a convention, and conventions
 * do not hold — the database this project shares with an earlier product runs a
 * cron job whose entire body is `select 1;` under a name that reads like a scan.
 *
 * So `retrievedAt` is not a parameter. It is read from the completion time of
 * an exchange a transport actually performed, and the brand on
 * `SourceObservation` means no other module can produce the type by hand.
 *
 * ── Binary media ──────────────────────────────────────────────────────────
 *
 * A ministry circular is routinely a PDF, and a great deal of what institutions
 * publish is not HTML at all. Those retrievals are recorded with the bytes
 * retained base64 and no items extracted, carrying an `unreadable` note naming
 * the media type.
 *
 * That is deliberately not the same as discarding them. The page stays under
 * monitoring, the bytes stay held rather than borrowed, and the count of
 * unreadable retrievals per source is the measurement that says how much of the
 * corpus this engine currently cannot see. Decoding a PDF as UTF-8 — which this
 * function used to do — stored mojibake that could never be read back, which is
 * a hold that loses the evidence.
 */

export interface CompletedExchange {
  /**
   * The URL that actually served the bytes, after redirects.
   *
   * Recording the requested URL here instead would attribute content to a page
   * that did not serve it. This stays the source of the content.
   */
  url: string;
  /**
   * The URL discovery asked for, when it differs from the one that answered.
   *
   * Provenance about how the system arrived — never a claim that this address
   * published anything. Absent when nothing redirected, which is the common case:
   * carrying `requestedUrl === url` on every observation would be noise in the
   * record and one more field every reader has to remember to compare.
   *
   * It exists because discarding it lost something real. R-01 observed one advert
   * published at three addresses with `-FINAL` and `-corrected` revisions and
   * "nothing linking them to what they supersede" — a request → destination edge
   * is exactly the evidence R-11's entity resolution wants, and the pipeline was
   * throwing it away at the one moment it existed.
   */
  requestedUrl?: string;
  /** ISO 8601, taken at the moment the exchange finished. */
  completedAt: string;
  status: number | null;
  /** Decoded text when `encoding` is utf-8; base64 otherwise. */
  body: string | null;
  encoding: "utf-8" | "base64";
  contentType: string | null;
  /** Set when the exchange failed. Its presence is what makes it a failure. */
  failure?: string;
}

export interface WitnessOptions {
  source: ObservedSource;
  /** Defaults to the standard pipeline: JSON-LD, plus page metadata. */
  extractor?: ClaimExtractor;
  relatedTo?: string[];
}

function minted(observation: UnwitnessedObservation): SourceObservation {
  return observation as SourceObservation;
}

/**
 * Read a persisted observation back into its branded type.
 *
 * The brand guards *minting* — the act of asserting a retrieval happened.
 * Reading back a row already witnessed, stored and made immutable is not that
 * act, and the alternatives are worse: either the store returns an unbranded
 * shape and every consumer widens, or the engine re-witnesses on read and
 * stamps a fresh timestamp over a real one.
 *
 * A genuine second door, and not the last line of defence: the table refuses a
 * future `retrieved_at`, refuses UPDATE and DELETE at the grant, and refuses
 * them again in a trigger.
 */
export function rehydrateWitnessed(stored: UnwitnessedObservation): SourceObservation {
  return minted(stored);
}

/** Media this engine can currently read as text. Everything else is retained raw. */
const TEXTUAL = /^(text\/|application\/(xhtml\+xml|xml|json|ld\+json))/i;

export function isTextual(contentType: string | null): boolean {
  return contentType !== null && TEXTUAL.test(contentType);
}

/**
 * Turn a completed exchange into an immutable observation.
 *
 * A non-2xx status, a transport failure or a missing body all produce the
 * `unreachable` variant. That is deliberate rather than defensive: a 404 on a
 * page Opportunity X was watching is a real signal — frequently the earliest available
 * signal that an opportunity closed — and swallowing it is how the system comes
 * to hold an entity it can no longer account for.
 */
export function witness(exchange: CompletedExchange, options: WitnessOptions): SourceObservation {
  const extractor = options.extractor ?? defaultExtractor;

  const base = {
    id: randomUUID(),
    /* Not a parameter. Not `new Date()`. The exchange's own completion time. */
    retrievedAt: exchange.completedAt,
    url: exchange.url,
    /* Only present when a redirect happened. See `CompletedExchange`. */
    ...(exchange.requestedUrl ? { requestedUrl: exchange.requestedUrl } : {}),
    source: options.source,
    parserVersion: extractor.version,
    relatedTo: options.relatedTo ?? [],
  };

  const reachable =
    exchange.failure === undefined &&
    exchange.status !== null &&
    exchange.status >= 200 &&
    exchange.status < 300 &&
    exchange.body !== null;

  if (!reachable) {
    return minted({
      ...base,
      outcome: "unreachable",
      status: exchange.status,
      reason:
        exchange.failure ??
        (exchange.status === null
          ? "No response reached me."
          : `Source answered ${exchange.status}.`),
    });
  }

  const body = exchange.body as string;
  const contentType = exchange.contentType ?? "application/octet-stream";

  const extracted = extractor.extract({
    body,
    contentType,
    url: exchange.url,
    encoding: exchange.encoding,
  });

  /*
    The page URL is always an identity signal, and always the weakest one. It is
    appended rather than prepended so a declared canonical outranks it — and it
    is never omitted, so every item has at least one thing to be resolved on.
  */
  const pageIdentity: IdentitySignal[] = [
    ...extracted.pageIdentity,
    { kind: "page-url", value: exchange.url },
  ];

  return minted({
    ...base,
    outcome: "retrieved",
    content: {
      /* Held, not borrowed. Reconstruction never re-fetches. */
      body,
      encoding: exchange.encoding,
      contentType,
      sha256: digestOf(body, exchange.encoding),
      byteLength:
        exchange.encoding === "base64"
          ? Buffer.from(body, "base64").byteLength
          : Buffer.byteLength(body),
    },
    items: extracted.items,
    pageIdentity,
    /*
      Required exactly when nothing was extracted. "We could not read this" and
      "we read it and it described nothing" are different facts about coverage,
      and a record that writes both as an empty list can never tell which it has.
    */
    ...(extracted.items.length === 0
      ? {
          unreadable: extracted.unreadable ?? {
            reason: "No extractor found an opportunity on this page.",
            mediaType: contentType,
          },
        }
      : {}),
  });
}

/** Over the raw bytes either way, so a digest is comparable across encodings. */
function digestOf(body: string, encoding: "utf-8" | "base64"): string {
  const bytes = encoding === "base64" ? Buffer.from(body, "base64") : Buffer.from(body, "utf8");
  return createHash("sha256").update(bytes).digest("hex");
}

export type { ClaimExtractor } from "./extractors/types";
