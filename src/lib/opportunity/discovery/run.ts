import type { ClaimExtractor } from "../observation/record";
import type { ObservationStore } from "../observation/types";
import type { VerificationLog } from "../verification/log";
import {
  emptyReport,
  reconcile,
  type CrawlContext,
  type MechanismReport,
  type SkippedPage,
  type Transition,
} from "./crawl";
import type { Transport } from "./fetcher";
import type { RobotsPolicy } from "./robots";
import {
  coverage,
  type DiscoveryMechanism,
  type MechanismCoverage,
  type MechanismId,
} from "./mechanism";
import { institutionalChannels } from "./mechanisms/institutional-channels";
import { changeDetection } from "./mechanisms/change-detection";

/**
 * One discovery run.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * THE ONE THING A RUN MAY CONCLUDE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * What it saw. Nothing else.
 *
 * It does not decide that an opportunity closed, that a source went away, that
 * a corpus is stale, or that there is nothing to find. Those are judgments,
 * they belong to layers above this one, and they are computed from the
 * observations a run leaves behind rather than asserted by the process that
 * gathered them.
 *
 * **A failed or unexecuted run produces no world-state conclusion.** That is
 * the guarantee, and it holds because a run has no way to write one: it appends
 * observations, and an observation only exists where a request was actually
 * made. A run blocked by robots, a run against an unreachable host, a run that
 * never happened — all three leave the retrieval watermark exactly where it
 * was, which is what makes `absent` unreachable downstream.
 *
 * The only way to move that watermark is to complete an exchange, and the only
 * thing that can complete an exchange is the transport.
 *
 * ── Ordering ──────────────────────────────────────────────────────────────
 *
 * Mechanisms run in sequence, sharing a visited set so two of them cannot
 * double-fetch a page. Verification is re-established once, after all of them,
 * so a page found late in the run can still corroborate an entity an earlier
 * mechanism reached — and so two entities cannot draw different conclusions
 * from the same evidence because of the order they happened to be visited in.
 */

export interface DiscoveryOptions {
  store: ObservationStore;
  verification: VerificationLog;
  /** Defaults to every implemented mechanism. */
  mechanisms?: readonly DiscoveryMechanism[];
  transport?: Transport;
  extractor?: ClaimExtractor;
  politenessMs?: number;
  recheckAfterHours?: number;
  wait?: (ms: number) => Promise<void>;
}

export interface DiscoveryReport {
  startedAt: string;
  finishedAt: string;
  requested: number;
  retrieved: number;
  unreachable: number;
  skipped: SkippedPage[];
  observationIds: string[];
  transitions: Transition[];
  /** Per declared mechanism, including the ones that did not run. */
  coverage: MechanismCoverage[];
  /**
   * The watermark after this run — null if nothing has *ever* been retrieved.
   *
   * Carried on the report so a caller can tell a run that fetched nothing from
   * a run that fetched nothing *and* found nothing was there before, without
   * having to ask the store a second question.
   */
  retrievalWatermark: string | null;
}

const DEFAULTS = { politenessMs: 1_000, recheckAfterHours: 24 };
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Every mechanism that exists. Adding one here is the only way it ever runs. */
export function defaultMechanisms(): DiscoveryMechanism[] {
  return [institutionalChannels(), changeDetection()];
}

export async function runDiscovery(options: DiscoveryOptions): Promise<DiscoveryReport> {
  const mechanisms = options.mechanisms ?? defaultMechanisms();
  const recheckAfterHours = options.recheckAfterHours ?? DEFAULTS.recheckAfterHours;
  const startedAt = new Date().toISOString();

  const ctx: CrawlContext = {
    store: options.store,
    verification: options.verification,
    transport: options.transport,
    extractor: options.extractor,
    politenessMs: options.politenessMs ?? DEFAULTS.politenessMs,
    recheckAfterHours,
    wait: options.wait ?? sleep,
    robotsCache: new Map<string, RobotsPolicy>(),
    seenRecently: await recentlyObserved(options.store, recheckAfterHours, startedAt),
    visited: new Set<string>(),
  };

  const touched = new Set<string>();
  const reports = new Map<MechanismId, MechanismReport>();

  for (const mechanism of mechanisms) {
    const report = emptyReport();
    reports.set(mechanism.id, report);
    await mechanism.run(ctx, report, touched);
  }

  const transitions = await reconcile(ctx, touched);

  const all = [...reports.values()];
  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    requested: all.reduce((n, r) => n + r.requested, 0),
    retrieved: all.reduce((n, r) => n + r.retrieved, 0),
    unreachable: all.reduce((n, r) => n + r.unreachable, 0),
    skipped: all.flatMap((r) => r.skipped),
    observationIds: all.flatMap((r) => r.observationIds),
    transitions,
    coverage: coverage(reports),
    /* Read from the store, not computed from this run. A run that fetched
       nothing must not be able to report a watermark it did not create. */
    retrievalWatermark: await options.store.lastRetrievalAt(),
  };
}

async function recentlyObserved(
  store: ObservationStore,
  hours: number,
  now: string,
): Promise<Set<string>> {
  const cutoff = new Date(new Date(now).getTime() - hours * 3_600_000).toISOString();
  const observed = await store.observedUrls();
  /*
    Strictly after the cutoff, not on it. At `hours: 0` the window is empty and
    nothing should count as recent — with `>=` an observation whose timestamp
    landed on the same millisecond as the run's start would exclude itself from
    a re-check that was explicitly asked for. The distinction is invisible at 24
    hours and decisive at zero.
  */
  return new Set(observed.filter((o) => o.lastRetrievedAt > cutoff).map((o) => o.url));
}
