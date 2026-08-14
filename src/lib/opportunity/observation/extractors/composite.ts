import type { ObservedItem, ParserVersion } from "../types";
import { jsonLdExtractor } from "./json-ld";
import { pageMetadataExtractor } from "./page-metadata";
import { attribution, type ClaimExtractor, type ExtractionResult } from "./types";

/**
 * Running several extractors over one document.
 *
 * ── The two rules, both enforced rather than documented ───────────────────
 *
 * **1. Only an `identifies` extractor may create an item.** Anything an
 * `enriches` extractor returns in `items` is dropped here, and dropped loudly
 * enough to be visible in a test. Without that check the role is a comment, and
 * an extractor that reads `<title>` would eventually assert an opportunity on
 * every contact page in the corpus.
 *
 * **2. Disagreement is kept.** When two extractors read the same field
 * differently, both claims survive, each attributed to the extractor that made
 * it. The entity layer turns that into two readings and verification decides
 * what it means. Picking a winner here would resolve a contradiction inside the
 * immutable record, where nothing downstream could see it had happened.
 *
 * Identical claims are collapsed — same field, same text, same extractor is one
 * statement, not two. Two *different* extractors independently reading the same
 * value are also collapsed to one claim, because they read one statement in the
 * document; treating that as corroboration would manufacture agreement out of
 * the fact that we ran two parsers.
 *
 * ── Version ───────────────────────────────────────────────────────────────
 *
 * The composite's version composes its members'. An observation's
 * `parserVersion` therefore identifies the exact combination that produced it,
 * and a claim's `extractedBy` identifies which member made that claim. Both are
 * needed: the first says what ran, the second says who is responsible.
 */

export interface CompositeOptions {
  /** Own version, bumped when the *composition* changes, not its members. */
  version?: ParserVersion;
}

export function compositeExtractor(
  members: readonly ClaimExtractor[],
  options: CompositeOptions = {}
): ClaimExtractor {
  const own = options.version ?? "1.0.0";

  return {
    id: "composite",
    /*
      Not a real semver of anything — a fingerprint of the combination, in a
      shape the schema's version check accepts. What matters is that it changes
      when any member changes, so observations produced by different pipelines
      are never mistaken for each other.
    */
    version: `${own.split(".")[0]}.${members.length}.${fingerprint(members)}` as ParserVersion,
    role: "identifies",

    extract(input): ExtractionResult {
      const items: ObservedItem[] = [];
      const pageIdentity: ExtractionResult["pageIdentity"] = [];
      const unreadableReasons: string[] = [];
      let pageTitle: ExtractionResult["pageTitle"];

      for (const member of members) {
        const result = member.extract(input);

        if (member.role === "identifies") {
          items.push(...result.items);
        } else if (result.items.length > 0) {
          /*
            Rule 1. An `enriches` extractor returning items is a bug in that
            extractor, and silently accepting them is how the role stops
            meaning anything.
          */
          throw new Error(
            `Extractor ${member.id} is declared "enriches" but returned ${result.items.length} item(s). Only an "identifies" extractor may assert that a document describes an opportunity.`
          );
        }

        for (const signal of result.pageIdentity) {
          if (!pageIdentity.some((s) => s.kind === signal.kind && s.value === signal.value)) {
            pageIdentity.push(signal);
          }
        }

        if (result.pageTitle && !pageTitle) pageTitle = result.pageTitle;
        if (result.unreadable) unreadableReasons.push(`${member.id}: ${result.unreadable.reason}`);
      }

      const merged = mergeItems(items);

      /* Rule 1 again, from the other side: a page title fills a gap on an item
         that exists. It never creates one. */
      if (pageTitle) {
        for (const item of merged) {
          if (item.claims.some((c) => c.field === "title")) continue;
          item.claims.push({
            field: "title",
            asStated: pageTitle.asStated,
            locator: pageTitle.locator,
            extractedBy: attribution(pageMetadataExtractor),
          });
        }
      }

      if (merged.length > 0) return { items: merged, pageIdentity };

      return {
        items: [],
        pageIdentity,
        unreadable: {
          reason:
            unreadableReasons.length > 0
              ? unreadableReasons.join(" · ")
              : "No extractor found an opportunity on this page.",
          mediaType: input.contentType,
        },
      };
    },
  };
}

/**
 * Fold items that several extractors found at the same place in the document.
 *
 * Keyed by locator, because two extractors reading the same node are describing
 * one thing, and two nodes are two things however similar they look. Item-level
 * merging by *content* would be entity resolution, and it belongs a layer up
 * where the decision can be recorded and superseded.
 */
function mergeItems(items: readonly ObservedItem[]): ObservedItem[] {
  const byLocator = new Map<string, ObservedItem>();

  for (const item of items) {
    const existing = byLocator.get(item.locator);
    if (!existing) {
      byLocator.set(item.locator, {
        ...item,
        identity: [...item.identity],
        claims: [...item.claims],
      });
      continue;
    }

    for (const signal of item.identity) {
      if (!existing.identity.some((s) => s.kind === signal.kind && s.value === signal.value)) {
        existing.identity.push(signal);
      }
    }

    for (const claim of item.claims) {
      /* Same field and same text is one statement about the document, however
         many parsers noticed it. Different text is a disagreement, and both
         survive. */
      const duplicate = existing.claims.some(
        (c) => c.field === claim.field && c.asStated === claim.asStated
      );
      if (!duplicate) existing.claims.push(claim);
    }

    if (!existing.cycle && item.cycle) existing.cycle = item.cycle;
  }

  return [...byLocator.values()];
}

function fingerprint(members: readonly ClaimExtractor[]): number {
  const text = members.map((m) => `${m.id}@${m.version}`).sort().join("|");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 100_000;
  }
  return hash;
}

/**
 * The pipeline a sweep uses unless told otherwise.
 *
 * One extractor that may assert opportunities, one that may only describe the
 * page they were found on.
 */
export const defaultExtractor = compositeExtractor([jsonLdExtractor, pageMetadataExtractor]);
