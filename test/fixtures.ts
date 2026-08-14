import type { ProfileFact } from "@/lib/opportunity/foundation/person";
import type { CompletedExchange } from "@/lib/opportunity/observation/record";
import { witness } from "@/lib/opportunity/observation/record";
import { defaultExtractor } from "@/lib/opportunity/observation/extractors/composite";
import { classify } from "@/lib/opportunity/announcers/registry";
import { isRetrieved, type SourceObservation } from "@/lib/opportunity/observation/types";
import { groupObservations, type GroupedItem } from "@/lib/opportunity/entity/group";
import type { PairingAssessor } from "@/lib/opportunity/judgment/service";
import type { RankingInput } from "@/lib/opportunity/judgment/types";

/**
 * Fixtures for the engine's acceptance tests.
 *
 * Everything here is synthetic and labelled as such. No fixture stands in for a
 * live measurement, and no test in this suite claims anything about the
 * production deployment — the suite proves the engine's invariants hold, which
 * is a different claim from "discovery works", and the two must not blur.
 */

export const T0 = "2026-08-01T09:00:00.000Z";
export const T1 = "2026-08-04T09:00:00.000Z";
export const T2 = "2026-08-10T09:00:00.000Z";

export interface PageOptions {
  title: string;
  organiser: string;
  deadline: string;
  applyUrl: string;
  /** schema.org `identifier` — the publisher naming the thing. */
  identifier?: string;
  /** A declared cycle. Never parsed out of a title. */
  cycle?: string;
  /** `<link rel="canonical">`. */
  canonical?: string;
}

function programme(opts: PageOptions): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalProgram",
    name: opts.title,
    provider: { "@type": "Organization", name: opts.organiser },
    applicationDeadline: opts.deadline,
    url: opts.applyUrl,
    ...(opts.identifier ? { identifier: opts.identifier } : {}),
    ...(opts.cycle ? { academicYear: opts.cycle } : {}),
  };
}

/** A page declaring exactly one opportunity. */
export function page(opts: PageOptions): string {
  return html(opts.title, [programme(opts)], opts.canonical);
}

/** A page declaring several — a listing, or a news post carrying two calls. */
export function listingPage(
  pageTitle: string,
  entries: PageOptions[],
  canonical?: string
): string {
  return html(pageTitle, entries.map(programme), canonical);
}

/** A page with a title and a canonical URL and no structured data at all. */
export function prosePage(title: string, bodyText: string, canonical?: string): string {
  return `<!doctype html><html><head><title>${title}</title>${
    canonical ? `<link rel="canonical" href="${canonical}">` : ""
  }</head><body><p>${bodyText}</p></body></html>`;
}

function html(title: string, nodes: unknown[], canonical?: string): string {
  return `<!doctype html><html><head>
<title>${title}</title>
${canonical ? `<link rel="canonical" href="${canonical}">` : ""}
<script type="application/ld+json">
${JSON.stringify(nodes.length === 1 ? nodes[0] : nodes)}
</script>
</head><body><h1>${title}</h1></body></html>`;
}

export function exchange(
  url: string,
  body: string | null,
  completedAt: string,
  status: number | null = 200,
  contentType = "text/html; charset=utf-8",
  encoding: "utf-8" | "base64" = "utf-8"
): CompletedExchange {
  return {
    url,
    completedAt,
    status,
    body,
    encoding,
    contentType: body === null ? null : contentType,
  };
}

export function observe(
  url: string,
  body: string | null,
  completedAt: string,
  status: number | null = 200
): SourceObservation {
  const { sourceId, label, sourceClass } = classify(url);
  return witness(exchange(url, body, completedAt, status), {
    source: { sourceId, label, sourceClass },
    extractor: defaultExtractor,
  });
}

/** A retrieval of something this engine cannot read — a ministry PDF circular. */
export function observeBinary(
  url: string,
  bytes: string,
  completedAt: string,
  contentType = "application/pdf"
): SourceObservation {
  const { sourceId, label, sourceClass } = classify(url);
  return witness(
    exchange(
      url,
      Buffer.from(bytes, "utf8").toString("base64"),
      completedAt,
      200,
      contentType,
      "base64"
    ),
    { source: { sourceId, label, sourceClass }, extractor: defaultExtractor }
  );
}

/**
 * Every observed item, paired with the observation it came from.
 *
 * Bypasses grouping deliberately: used by tests that want to hand a specific
 * set of members to the resolver. Tests about *which* items belong together go
 * through `groupObservations`, because that is the decision under test there.
 */
export function membersOf(observations: readonly SourceObservation[]): GroupedItem[] {
  const members: GroupedItem[] = [];
  for (const observation of observations) {
    if (!isRetrieved(observation)) continue;
    for (const item of observation.items) members.push({ observation, item });
  }
  return members;
}

/** The single group these observations resolve to. Fails loudly if there is not exactly one. */
export function soleGroup(observations: readonly SourceObservation[]) {
  const { groups } = groupObservations(observations);
  if (groups.length !== 1) {
    throw new Error(`Expected one resolution group, got ${groups.length}.`);
  }
  return groups[0];
}

/**
 * A confirmed fact — something the person stated.
 *
 * Only a confirmed fact can carry a negative judgment, so the tests covering
 * the asymmetry rule need one of each tier.
 */
export function confirmedFact(id: string, statement: string): ProfileFact {
  return {
    id,
    tier: "confirmed",
    kind: "goal",
    statement,
    howLearned: "You told AEON X during the handshake.",
    learnedIn: "opportunity-x",
    lastConfirmedAt: T0,
    decay: "slow",
    permissions: [],
    statedAt: T0,
  };
}

export function inferredFact(id: string, statement: string): ProfileFact {
  return {
    id,
    tier: "inferred",
    kind: "preference",
    statement,
    howLearned: "Inferred from what you saved.",
    learnedIn: "opportunity-x",
    lastConfirmedAt: T0,
    decay: "fast",
    permissions: [],
    confidence: 0.6,
    observedFrom: [
      {
        summary: "Saved a funded postgraduate programme.",
        product: "opportunity-x",
        observedAt: T0,
        /* Lineage is required, so even a fixture has to say what it points at. */
        ref: "saved-item:fixture-1",
      },
    ],
  };
}

/**
 * An assessor that returns exactly the inputs it is handed.
 *
 * Not a model and not a heuristic — a way for a test to state "suppose the
 * assessor concluded this" without depending on how a real one would conclude
 * it. Every assertion in the suite is about what the engine does with an
 * assessment, never about the quality of the assessment.
 */
export function fixedAssessor(opts: {
  eligibility?: RankingInput[];
  fit?: RankingInput[];
  risk?: string[];
  version?: string;
}): PairingAssessor {
  return {
    version: opts.version ?? "fixture",
    eligibility: () => opts.eligibility ?? [],
    fit: () => opts.fit ?? [],
    risk: () => opts.risk ?? [],
  };
}
