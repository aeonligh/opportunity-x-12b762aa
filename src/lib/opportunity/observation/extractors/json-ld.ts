import type { IdentitySignal, ObservedClaim, ObservedField, ObservedItem } from "../types";
import { attribution, type ClaimExtractor, type ExtractionResult } from "./types";

/**
 * JSON-LD extraction.
 *
 * ── What changed, and why it mattered ─────────────────────────────────────
 *
 * This extractor used to walk a whole document into one flat set of fields,
 * first writer winning. On a page declaring two programmes it produced one, and
 * **the second left no trace anywhere in the record** — not merged wrongly,
 * deleted. A listing page is the ordinary case for a university news feed, so
 * this was not an edge: it was the common path quietly losing opportunities.
 *
 * It now segments the document into items. One declared programme is one item,
 * with its own identity, its own cycle where the publisher declared one, and
 * its own claims. A page with three becomes three.
 *
 * ── Which nodes count as an opportunity ───────────────────────────────────
 *
 * A closed set of schema.org types, checked explicitly. Treating any node with
 * a `name` as an opportunity would turn every `Organization` and `WebSite` on
 * the page into one — and those are on nearly every page, so the corpus would
 * fill with entities that are really publishers.
 *
 * ── What it will not do ───────────────────────────────────────────────────
 *
 * It does not fall back to prose when there is no JSON-LD. A value guessed from
 * a paragraph carries a real observation's provenance on something nobody
 * published, and no reader downstream can tell the difference. Prose extraction
 * is a separate extractor with a separate version, so every claim it makes is
 * attributable to it.
 */

const SCRIPT_RE = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/**
 * The node types that describe an opportunity.
 *
 * A closed set. Adding a member is a decision about what this product is for,
 * and it should look like one in a diff.
 */
const OPPORTUNITY_TYPES = new Set([
  "EducationalOccupationalProgram",
  "Course",
  "JobPosting",
  "Grant",
  "MonetaryGrant",
  "Scholarship",
  "EducationEvent",
  "Event",
]);

/** schema.org property → the field it maps to, where the mapping is unambiguous. */
const FIELDS: Record<string, ObservedField> = {
  name: "title",
  title: "title",
  provider: "organiser",
  hiringOrganization: "organiser",
  organizer: "organiser",
  funder: "organiser",
  sponsor: "organiser",
  applicationStartDate: "opens",
  startDate: "opens",
  applicationDeadline: "deadline",
  validThrough: "deadline",
  expires: "deadline",
  eligibilityToWorkRequirement: "eligibility",
  programPrerequisites: "eligibility",
  eligibleRegion: "eligibility",
  offers: "funding",
  financialAidEligible: "funding",
  estimatedSalary: "funding",
  location: "location",
  jobLocation: "location",
  url: "how-to-apply",
  applicationUrl: "how-to-apply",
};

/** Properties a publisher uses to declare *which cycle* this is. */
const CYCLE_PROPERTIES = ["educationalProgramMode", "termCode", "cycle", "academicYear"];

function textOf(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const parts = value.map(textOf).filter((v): v is string => v !== null);
    return parts.length > 0 ? parts.join("; ") : null;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["name", "value", "address", "description", "@id", "url"]) {
      const nested = textOf(record[key]);
      if (nested !== null) return nested;
    }
  }
  return null;
}

/**
 * A time-of-day, somewhere in the string.
 *
 * Anything with an hour is taken at its word. Anything without one named a
 * calendar day, and the day is all the precision the publisher offered.
 */
const HAS_TIME = /\d{1,2}:\d{2}/;

function normaliseDate(raw: string): { value: string; precision?: "day" } | undefined {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  /* A bare "2027" parses as 2027-01-01 in most runtimes — a precise deadline
     nobody published. Require at least a day-level date before treating the
     value as one. */
  if (!/\d{4}-\d{2}-\d{2}|\d{1,2}\s+\w+\s+\d{4}|\w+\s+\d{1,2},\s*\d{4}/.test(raw)) {
    return undefined;
  }
  return HAS_TIME.test(raw)
    ? { value: parsed.toISOString() }
    : { value: parsed.toISOString(), precision: "day" };
}

function typesOf(node: Record<string, unknown>): string[] {
  const raw = node["@type"];
  if (typeof raw === "string") return [raw];
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === "string");
  return [];
}

function isOpportunity(node: Record<string, unknown>): boolean {
  return typesOf(node).some((t) => OPPORTUNITY_TYPES.has(t.replace(/^.*[/#]/, "")));
}

/** Walk every node in a JSON-LD document, remembering where each one was. */
function* nodes(
  value: unknown,
  path: string,
): Generator<{ node: Record<string, unknown>; path: string }> {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) yield* nodes(item, `${path}[${index}]`);
    return;
  }
  if (value === null || typeof value !== "object") return;

  const node = value as Record<string, unknown>;
  yield { node, path };

  for (const [key, child] of Object.entries(node)) {
    if (child !== null && typeof child === "object") yield* nodes(child, `${path}.${key}`);
  }
}

function itemFrom(node: Record<string, unknown>, path: string, by: string): ObservedItem {
  const claims: ObservedClaim[] = [];
  const seen = new Set<string>();

  for (const [property, field] of Object.entries(FIELDS)) {
    if (!(property in node)) continue;

    const asStated = textOf(node[property]);
    if (asStated === null) continue;

    /* Two properties can map to one field — `startDate` and
       `applicationStartDate` both mean "opens". Keeping both when they carry
       the same text would manufacture agreement out of one statement. */
    const key = `${field}:${asStated}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const claim: ObservedClaim = {
      field,
      asStated,
      locator: `${path}.${property}`,
      extractedBy: by,
    };

    if (field === "deadline" || field === "opens") {
      const normalised = normaliseDate(asStated);
      if (normalised !== undefined) {
        claim.normalised = normalised.value;
        if (normalised.precision) claim.precision = normalised.precision;
      }
    }

    claims.push(claim);
  }

  const identity: IdentitySignal[] = [];

  const declared = textOf(node["identifier"]) ?? textOf(node["@id"]);
  if (declared !== null) identity.push({ kind: "declared-identifier", value: declared });

  /*
    schema.org `url` is deliberately NOT taken as identity, though it is the
    obvious candidate and this extractor briefly did take it.

    On a programme node it is where to apply, and two things that share a place
    to apply are routinely not the same opportunity: successive cycles of one
    programme share a portal, and a FINAL and a corrected revision of one advert
    share everything. Using it as identity merged both — silently, and in the
    direction that loses an opportunity rather than duplicating one.

    It is kept as a `how-to-apply` claim, where it belongs, and `group.ts` uses
    it to *propose* a merge that an operator decides. A declaration about where
    to apply is not a declaration about what this is.
  */

  let cycle: string | undefined;
  for (const property of CYCLE_PROPERTIES) {
    const value = textOf(node[property]);
    if (value !== null) {
      cycle = value;
      break;
    }
  }

  /* The declared type — first recognised one only. A node carrying several is
     declaring one thing under several vocabularies, not several things. */
  const declaredType = typesOf(node)
    .map((t) => t.replace(/^.*[/#]/, ""))
    .find((t) => OPPORTUNITY_TYPES.has(t));

  return { locator: path, identity, cycle, declaredType, claims };
}

export const jsonLdExtractor: ClaimExtractor = {
  id: "json-ld",
  /* 2.1.0 — date claims now carry the precision the source gave. A version
     bump rather than a silent change, because `extractedBy` is what identifies
     the readings an extractor is answerable for. */
  version: "2.1.0",
  role: "identifies",

  extract({ body, contentType, encoding }): ExtractionResult {
    if (encoding !== "utf-8") {
      return {
        items: [],
        pageIdentity: [],
        unreadable: {
          reason:
            "Binary media. Nothing in this engine can read it yet, and the bytes are retained so it can be read later.",
          mediaType: contentType,
        },
      };
    }

    const by = attribution(jsonLdExtractor);
    const items: ObservedItem[] = [];
    let blocks = 0;
    let malformed = 0;

    for (const match of body.matchAll(SCRIPT_RE)) {
      blocks += 1;
      let parsed: unknown;
      try {
        parsed = JSON.parse(match[1]);
      } catch {
        /* One malformed block must not discard the good ones on the same page,
           but it is counted — a source whose markup is consistently broken is a
           coverage fact rather than a silent zero. */
        malformed += 1;
        continue;
      }

      for (const { node, path } of nodes(parsed, "$")) {
        if (!isOpportunity(node)) continue;
        items.push(itemFrom(node, path, by));
      }
    }

    if (items.length > 0) return { items, pageIdentity: [] };

    return {
      items: [],
      pageIdentity: [],
      unreadable: {
        reason:
          blocks === 0
            ? "No JSON-LD on the page."
            : malformed === blocks
              ? `All ${blocks} JSON-LD block(s) were malformed.`
              : `${blocks} JSON-LD block(s), none declaring an opportunity type.`,
        mediaType: contentType,
      },
    };
  },
};
