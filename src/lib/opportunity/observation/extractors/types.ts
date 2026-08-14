import type {
  IdentitySignal,
  ObservedItem,
  ParserVersion,
  Unreadable,
} from "../types";

/**
 * The extraction contract.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * JSON-LD IS NOT THE DEFINITION OF AN OPPORTUNITY
 * ══════════════════════════════════════════════════════════════════════════
 *
 * It was, implicitly, and that is a real problem rather than a missing feature.
 * With one extractor, "an opportunity is a thing with schema.org markup" was
 * true of the system whatever the documents said — and the institutions this
 * engine monitors publish a great deal that carries no markup at all. A
 * ministry circular is a PDF. A university news post is a paragraph and a date.
 *
 * So extraction is plural, and the roles are separated, because the failure
 * mode of adding extractors carelessly is worse than having one:
 *
 *   identifies — may assert that this document describes an opportunity.
 *   enriches   — may add to items others found, and may never create one.
 *
 * The distinction exists because every HTML page has a `<title>`. An extractor
 * that created an item from one would assert an opportunity on the contact
 * page, the sitemap and the 404, and the corpus would fill with entities that
 * are really just pages. Title extraction is genuinely useful — as enrichment
 * of an item a publisher declared, never as evidence one exists.
 *
 * ── Disagreement is not resolved here ─────────────────────────────────────
 *
 * When two extractors read the same field differently, both claims are kept,
 * each attributed to the extractor that produced it. The entity layer turns
 * that into two readings, and verification decides what it means. An extractor
 * that picked a winner would be resolving a contradiction inside the immutable
 * record, where nothing downstream could see it happened.
 */

export interface ExtractionInput {
  body: string;
  contentType: string;
  url: string;
  /** utf-8 for text; base64 for binary media nothing can currently read. */
  encoding: "utf-8" | "base64";
}

export interface ExtractionResult {
  /** One entry per opportunity this extractor says the document describes. */
  items: ObservedItem[];
  /** Identity the page declared about itself. Applies to every item. */
  pageIdentity: IdentitySignal[];
  /**
   * A title the page declared about itself, used only to fill an item that has
   * none. Never enough on its own to assert that an item exists.
   */
  pageTitle?: { asStated: string; locator: string };
  /** Set when this extractor could not read the document at all. */
  unreadable?: Unreadable;
}

export interface ClaimExtractor {
  /** Stable, short, and part of every claim's attribution. */
  id: string;
  version: ParserVersion;
  /**
   * `identifies` may create items. `enriches` may not, however much it finds —
   * the check is structural in `composite.ts`, not a convention here.
   */
  role: "identifies" | "enriches";
  extract(input: ExtractionInput): ExtractionResult;
}

export function attribution(extractor: ClaimExtractor): string {
  return `${extractor.id}@${extractor.version}`;
}

export const EMPTY: ExtractionResult = { items: [], pageIdentity: [] };
