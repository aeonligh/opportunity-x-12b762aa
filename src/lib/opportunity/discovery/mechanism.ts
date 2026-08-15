import type { CrawlContext, MechanismReport } from "./crawl";

/**
 * Discovery is plural.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THIS FILE EXISTS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The announcer registry is a good starting mechanism and a bad definition of
 * discovery. Left as the only implementation, it becomes the system by default
 * — not by anyone deciding it should be, but because nothing in the code
 * distinguishes "the mechanism we built first" from "the way opportunities are
 * found". Six months later the blind spot is invisible, because there is
 * nothing it is a blind spot *relative to*.
 *
 * So the mechanisms are declared, all of them, with their status. Two are
 * implemented. Three are not, and their absence is a row in a table this
 * codebase can read rather than a gap someone has to remember. `coverage()`
 * turns that into a measurement: which mechanisms ran, which did not, and how
 * much of the corpus each is responsible for.
 *
 * ── Why declarations and not stubs ────────────────────────────────────────
 *
 * `src/lib/intelligence/` holds fourteen modules that throw
 * `NotImplementedError`. They look like capability and are not, and their names
 * were enough to make a stage model feel decided. The three unbuilt mechanisms
 * here get **no module**. They are data describing a gap, which cannot be
 * imported, cannot be called, and cannot be mistaken for a component.
 *
 * ── The single rule ───────────────────────────────────────────────────────
 *
 * A mechanism decides *what* to look at. It never decides how a page is
 * fetched, whether robots permits it, how a source is classified, or what a
 * retrieval means. Those live in `crawl.ts`, once, so a new mechanism cannot
 * bring a second discovery model in with it.
 */

export type MechanismId =
  | "institutional-channels"
  | "change-detection"
  | "institutional-artifact-crawl"
  | "unknown-domain-discovery"
  | "platform-integration";

export interface DiscoveryMechanism {
  id: MechanismId;
  label: string;
  run(ctx: CrawlContext, report: MechanismReport, touched: Set<string>): Promise<void>;
}

export interface MechanismDeclaration {
  id: MechanismId;
  label: string;
  /** The research names institutional channel monitoring as the primary one. */
  primary: boolean;
  status: "implemented" | "not-built";
  /** What it reaches that the implemented ones do not. */
  reaches: string;
}

/**
 * All five acquisition mechanisms, with the two that exist marked as such.
 *
 * The `reaches` column on an unbuilt mechanism is the important one. It is what
 * makes the gap legible: not "we have not built X" but "nothing currently
 * reaches Y", which is a statement about the corpus rather than the backlog.
 */
export const MECHANISMS: readonly MechanismDeclaration[] = [
  {
    id: "institutional-channels",
    label: "Institutional channel monitoring",
    primary: true,
    status: "implemented",
    reaches:
      "Opportunities announced by an enumerable institution — their own, external ones affecting their people, and third-party ones routed to them.",
  },
  {
    id: "change-detection",
    label: "Change detection on stable URLs",
    primary: false,
    status: "implemented",
    reaches:
      "Pages already observed, after the announcer stops linking to them. Without it a programme page scrolls off a homepage and is never looked at again.",
  },
  {
    id: "institutional-artifact-crawl",
    label: "Institutional artifact crawl",
    primary: false,
    status: "not-built",
    reaches:
      "Opportunities published only inside documents — PDF calls, circulars, bulletins — which are common in ministry and university publishing and invisible to an HTML link crawl.",
  },
  {
    id: "unknown-domain-discovery",
    label: "Unknown-domain discovery",
    primary: false,
    status: "not-built",
    reaches:
      "The C-18 residue: an organiser that neither is an institution nor routes to one, on an independent domain with no institutional announcer. The one class in the research corpus that resisted every other mechanism.",
  },
  {
    id: "platform-integration",
    label: "Platform integration",
    primary: false,
    status: "not-built",
    reaches:
      "Opportunities whose claim and application route live on different domains owned by different parties — a third-party application platform the organiser never links from its own site.",
  },
];

export const IMPLEMENTED_MECHANISMS = MECHANISMS.filter((m) => m.status === "implemented").map(
  (m) => m.id,
);

export interface MechanismCoverage {
  id: MechanismId;
  label: string;
  status: MechanismDeclaration["status"];
  /** Whether this run actually invoked it. */
  ran: boolean;
  requested: number;
  retrieved: number;
  /** Share of this run's retrievals. Null when the run retrieved nothing. */
  share: number | null;
  /** Set on a mechanism that did not run: what the corpus is therefore missing. */
  missing?: string;
}

/**
 * What a run actually covered.
 *
 * Reported as a row per declared mechanism, including the ones that did not
 * run, because a report listing only what happened cannot show what did not.
 * A run where one mechanism holds a share of 1.0 is a run where discovery and
 * that mechanism are the same thing — which may be correct today and is a fact
 * worth being able to state either way.
 */
export function coverage(reports: ReadonlyMap<MechanismId, MechanismReport>): MechanismCoverage[] {
  const totalRetrieved = [...reports.values()].reduce((sum, r) => sum + r.retrieved, 0);

  return MECHANISMS.map((declared) => {
    const report = reports.get(declared.id);

    if (!report) {
      return {
        id: declared.id,
        label: declared.label,
        status: declared.status,
        ran: false,
        requested: 0,
        retrieved: 0,
        share: null,
        missing: declared.reaches,
      };
    }

    return {
      id: declared.id,
      label: declared.label,
      status: declared.status,
      ran: true,
      requested: report.requested,
      retrieved: report.retrieved,
      share: totalRetrieved === 0 ? null : report.retrieved / totalRetrieved,
    };
  });
}
