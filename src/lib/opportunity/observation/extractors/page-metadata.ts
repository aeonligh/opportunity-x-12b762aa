import type { IdentitySignal } from "../types";
import { attribution, type ClaimExtractor, type ExtractionResult } from "./types";

/**
 * Page metadata — identity, and a title that is only ever enrichment.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THIS EXTRACTOR MAY NOT CREATE AN ITEM
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Every HTML page has a `<title>`. An extractor that turned one into an
 * opportunity would assert one on the contact page, the sitemap, the staff
 * directory and the 404 — and the corpus would fill with entities that are
 * really just pages. Worse, they would be *verifiable*: two announcers both
 * having a contact page would corroborate each other.
 *
 * So its role is `enriches`. It fills a title on an item some other extractor
 * found, and it cannot bring one into existence. `composite.ts` enforces that
 * structurally rather than trusting this comment.
 *
 * ── What it is actually for ───────────────────────────────────────────────
 *
 * **Identity.** `<link rel="canonical">` and `og:url` are the publisher stating
 * which page this really is, and they are the single most valuable thing on a
 * page for entity resolution — they are how three announcer URLs describing one
 * scholarship become one entity instead of three.
 *
 * Before this existed, a page without JSON-LD contributed nothing at all, so
 * resolution could never do better than URL identity — which fails in both
 * directions and was the specific weakness this work set out to fix.
 *
 * ── What it will not do ───────────────────────────────────────────────────
 *
 * It does not read dates, eligibility or funding out of prose. Those are the
 * claims that decide whether a person applies in time and whether they may
 * apply at all, and a regex over a paragraph is a guess wearing an
 * observation's provenance.
 */

const CANONICAL_RE = /<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i;
const OG_URL_RE = /<meta\b[^>]*\bproperty\s*=\s*["']og:url["'][^>]*>/i;
const OG_TITLE_RE = /<meta\b[^>]*\bproperty\s*=\s*["']og:title["'][^>]*>/i;
const TITLE_RE = /<title\b[^>]*>([\s\S]*?)<\/title>/i;
const HREF_ATTR = /\bhref\s*=\s*["']([^"']+)["']/i;
const CONTENT_ATTR = /\bcontent\s*=\s*["']([^"']*)["']/i;

function attr(tag: string | undefined, pattern: RegExp): string | null {
  if (!tag) return null;
  const match = tag.match(pattern);
  return match ? match[1].trim() || null : null;
}

/** Resolve against the page so a relative canonical is still usable identity. */
function absolute(value: string, base: string): string | null {
  try {
    const url = new URL(value, base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const pageMetadataExtractor: ClaimExtractor = {
  id: "page-metadata",
  version: "1.0.0",
  role: "enriches",

  extract({ body, url, encoding }): ExtractionResult {
    if (encoding !== "utf-8") return { items: [], pageIdentity: [] };

    const pageIdentity: IdentitySignal[] = [];

    const canonical = attr(body.match(CANONICAL_RE)?.[0], HREF_ATTR);
    if (canonical) {
      const resolved = absolute(canonical, url);
      if (resolved) pageIdentity.push({ kind: "canonical-url", value: resolved });
    }

    const ogUrl = attr(body.match(OG_URL_RE)?.[0], CONTENT_ATTR);
    if (ogUrl) {
      const resolved = absolute(ogUrl, url);
      /* Only when it says something the canonical did not. Two signals with the
         same value are one signal, and counting them twice would make a page
         look better corroborated about its own identity than it is. */
      if (resolved && !pageIdentity.some((s) => s.value === resolved)) {
        pageIdentity.push({ kind: "canonical-url", value: resolved });
      }
    }

    const ogTitle = attr(body.match(OG_TITLE_RE)?.[0], CONTENT_ATTR);
    const htmlTitle = body.match(TITLE_RE)?.[1];
    const chosen = ogTitle ?? (htmlTitle ? decodeEntities(htmlTitle) : null);

    return {
      items: [],
      pageIdentity,
      pageTitle: chosen
        ? {
            asStated: chosen,
            locator: ogTitle ? "meta[property=og:title]" : "title",
          }
        : undefined,
    };
  },
};

export const PAGE_METADATA_ATTRIBUTION = attribution(pageMetadataExtractor);
