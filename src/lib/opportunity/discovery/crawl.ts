import { classify } from "../announcers/registry";
import { deriveStakes } from "../corpus";
import { groupObservations } from "../entity/group";
import { resolveEntity } from "../entity/resolve";
import { defaultExtractor } from "../observation/extractors/composite";
import { witness, type ClaimExtractor } from "../observation/record";
import type { ObservationStore, SourceObservation } from "../observation/types";
import type { VerificationLog } from "../verification/log";
import { establishVerification } from "../verification/service";
import { retrieve, type Transport } from "./fetcher";
import { readRobots, type RobotsPolicy } from "./robots";

/**
 * The shared act of looking at one page.
 *
 * Every discovery mechanism needs the same six things — check whether it was
 * seen recently, read the origin's robots policy, wait, fetch, classify the
 * source, record the observation — and none of them should be allowed to
 * implement those differently.
 *
 * That is the point of extracting this. A mechanism that could skip the robots
 * check, or classify a URL by the mechanism that found it rather than by the
 * registry, would be a second discovery model wearing the first one's name. The
 * mechanisms choose *what* to look at. `visit` decides *how*, once.
 */

export interface CrawlContext {
  store: ObservationStore;
  verification: VerificationLog;
  transport?: Transport;
  extractor?: ClaimExtractor;
  politenessMs: number;
  recheckAfterHours: number;
  wait: (ms: number) => Promise<void>;
  /** Shared across mechanisms so one origin's robots.txt is read once per run. */
  robotsCache: Map<string, RobotsPolicy>;
  /** URLs observed inside the re-check window when the run began. */
  seenRecently: Set<string>;
  /** URLs any mechanism has already visited this run. */
  visited: Set<string>;
}

export interface SkippedPage {
  url: string;
  reason: string;
}

/** What one mechanism did. Accumulated per mechanism, never merged silently. */
export interface MechanismReport {
  requested: number;
  retrieved: number;
  unreachable: number;
  skipped: SkippedPage[];
  observationIds: string[];
}

export function emptyReport(): MechanismReport {
  return { requested: 0, retrieved: 0, unreachable: 0, skipped: [], observationIds: [] };
}

/**
 * Look at one page, and record what happened.
 *
 * Returns the observation when a request was made, null when it was skipped.
 * The distinction is load-bearing: a skip leaves no observation, so nothing
 * downstream can mistake "Opportunity X chose not to look" for "Opportunity X looked and the
 * page was empty".
 */
export async function visit(
  ctx: CrawlContext,
  url: string,
  report: MechanismReport,
  touched: Set<string>,
): Promise<SourceObservation | null> {
  if (ctx.visited.has(url)) {
    report.skipped.push({ url, reason: "Already visited in this run." });
    return null;
  }

  if (ctx.seenRecently.has(url)) {
    report.skipped.push({
      url,
      reason: `Observed within the last ${ctx.recheckAfterHours}h.`,
    });
    return null;
  }

  const origin = originOf(url);
  if (origin === null) {
    report.skipped.push({ url, reason: "Not a URL I can parse." });
    return null;
  }

  /* Per origin, because a subdomain states its own preferences and honouring
     the parent's would be enforcing a policy it never made. */
  const robots = await readRobots(origin, {
    transport: ctx.transport,
    cache: ctx.robotsCache,
  });

  if (!robots.allows(new URL(url).pathname)) {
    report.skipped.push({
      url,
      reason: robots.known
        ? "Disallowed by the site’s robots.txt."
        : "The site’s robots.txt could not be read, so its preferences are unknown.",
    });
    return null;
  }

  await ctx.wait(Math.max(ctx.politenessMs, (robots.crawlDelaySeconds ?? 0) * 1000));

  ctx.visited.add(url);

  const exchange = await retrieve(url, { transport: ctx.transport });
  report.requested += 1;

  /*
    Classified by the registry, from the URL that actually answered. Not by the
    mechanism that found it: a ministry linking to a third-party portal produces
    an observation *of that portal*, and calling it `official` because a ministry
    pointed at it would launder exactly the provenance the source-class model
    exists to keep honest.
  */
  const source = classify(exchange.url);
  const observation = witness(exchange, {
    source,
    extractor: ctx.extractor ?? defaultExtractor,
  });

  await ctx.store.append(observation);
  report.observationIds.push(observation.id);
  touched.add(observation.url);

  if (observation.outcome === "retrieved") report.retrieved += 1;
  else report.unreachable += 1;

  return observation;
}

export interface Transition {
  entityId: string;
  from: string | null;
  to: string;
  reason: string;
}

/**
 * Re-establish verification for every entity a run touched.
 *
 * Runs once, after all mechanisms have finished, and that ordering is
 * deliberate. Verifying as each page arrives would let two entities reach
 * different conclusions from the same evidence depending on which mechanism
 * happened to reach them first — and worse, a page found by the second
 * mechanism could corroborate an entity the first had already written off.
 */
export async function reconcile(
  ctx: CrawlContext,
  touched: ReadonlySet<string>,
): Promise<Transition[]> {
  if (touched.size === 0) return [];

  /*
    Grouped over the whole record, not over the URLs this run happened to visit.
    An announcement fetched today can be the second source for an entity first
    seen on a ministry page three weeks ago, and grouping only what was touched
    would leave that entity looking single-sourced — unverified, on evidence
    that already exists.
  */
  const all = await ctx.store.readAll();
  const { groups } = groupObservations(all);

  const transitions: Transition[] = [];

  for (const group of groups) {
    /* Only entities this run actually saw. Re-establishing verification for the
       whole corpus on every run would move freshness forward for pages nobody
       looked at, which is the manufactured evidence the engine exists to
       refuse. */
    const wasTouched = group.members.some((m) => touched.has(m.observation.url));
    if (!wasTouched) continue;

    const resolved = resolveEntity({
      members: group.members,
      identity: group.identity,
      rationale: group.rationale,
      stakes: deriveStakes(),
      decidedAt: new Date().toISOString(),
    });
    if ("defect" in resolved) continue;

    const entity = resolved.entity;
    const observations = group.members.map((m) => m.observation);
    const previous = (await ctx.verification.read(entity.id)) ?? undefined;
    const record = establishVerification(entity, observations, new Date().toISOString(), previous);

    await ctx.verification.record(
      {
        id: entity.id,
        key: entity.resolution.key,
        method: entity.resolution.method,
        stakes: entity.stakes,
      },
      record,
    );

    const latest = record.transitions[record.transitions.length - 1];
    transitions.push({
      entityId: entity.id,
      from: latest.from,
      to: latest.to,
      reason: latest.reason,
    });
  }

  return transitions;
}

export function originOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}
