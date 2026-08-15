import type { SourceClass } from "../observation/types";

/**
 * The announcer registry.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY A REGISTRY IS POSSIBLE AT ALL
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Publishers cannot be enumerated. Anyone can put an opportunity on a page, and
 * a system that tries to list every such page is trying to list the web.
 *
 * **Announcers can.** Universities, ministries, agencies, funds and corporate
 * newsrooms are a finite, slow-changing, publicly known set, and the discovery
 * research found that they announce three distinct kinds of thing:
 *
 *   1. their own opportunities;
 *   2. external opportunities that affect their students;
 *   3. third-party opportunities routed to them by someone else.
 *
 * The third is what makes the registry worth more than it looks. A small NGO
 * scholarship — about as sub-institutional as an organiser gets — reached the
 * institutional record because it was routed to a university whose students it
 * affected. Organiser size does not decide whether an opportunity is
 * discoverable this way. **Routing does.** Large organisers route by default,
 * being institutions themselves; small ones route when they ask.
 *
 * ── Subdomains, not just page paths ───────────────────────────────────────
 *
 * Well-resourced organisers put new programmes on subdomains of domains they
 * already own — `programme.institution.tld`. A monitor watching only known page
 * paths misses every one of them; a monitor watching the announcer's subdomain
 * space does not. `monitorSubdomains` is therefore a property of the announcer
 * rather than a global setting.
 *
 * ── What this list is and is not ──────────────────────────────────────────
 *
 * It is a seed, not a claim of coverage. Each entry is a real institution with
 * a real domain, entered because it was independently observed announcing
 * opportunities. None of it asserts that a page was ever fetched — no entry
 * carries a `lastCheckedAt`, because nothing here has been checked. Freshness
 * is a property of an observation, and this file contains none.
 *
 * The residue is named rather than hidden: an opportunity whose organiser
 * neither *is* an institution nor *routes* to one, published on an independent
 * domain, is not reachable from this registry. That class exists — one case in
 * a twenty-opportunity corpus — and one case is evidence the residue exists,
 * not a measurement of how large it is. **Unmeasured is not small.**
 */

export type AnnouncerKind = "university" | "ministry" | "agency" | "fund" | "corporate-newsroom";

export interface Announcer {
  id: string;
  /** In the person's terms, not the domain. */
  label: string;
  kind: AnnouncerKind;
  /** Registrable domain. Subdomains are covered when `monitorSubdomains`. */
  domain: string;
  /** ISO 3166-1 alpha-2. The registry is not global yet and does not pretend to be. */
  country: string;
  /** New programmes commonly appear at `programme.domain`, not under a known path. */
  monitorSubdomains: boolean;
  /**
   * Pages known to carry announcements. A starting point for a crawl, never a
   * boundary on it — an announcer whose known paths are all stale is still
   * monitored through its subdomain space.
   */
  knownPaths: string[];
  /**
   * How this announcer's own pages should be treated when it announces. An
   * announcer speaking about its own programme is `official`; the same
   * announcer relaying someone else's is `announcer`. The distinction is
   * decided per observation, not per row — this is the default only.
   */
  defaultSourceClass: Extract<SourceClass, "official" | "announcer">;
}

export const ANNOUNCERS: readonly Announcer[] = [
  {
    id: "ng-unn",
    label: "University of Nigeria, Nsukka",
    kind: "university",
    domain: "unn.edu.ng",
    country: "NG",
    monitorSubdomains: true,
    knownPaths: ["/"],
    defaultSourceClass: "announcer",
  },
  {
    id: "ng-unilag",
    label: "University of Lagos",
    kind: "university",
    domain: "unilag.edu.ng",
    country: "NG",
    monitorSubdomains: true,
    knownPaths: ["/"],
    defaultSourceClass: "announcer",
  },
  {
    id: "ng-ui",
    label: "University of Ibadan",
    kind: "university",
    domain: "ui.edu.ng",
    country: "NG",
    monitorSubdomains: true,
    knownPaths: ["/news/scholarship-opportunities"],
    defaultSourceClass: "announcer",
  },
  {
    id: "ng-uniport",
    label: "University of Port Harcourt",
    kind: "university",
    domain: "uniport.edu.ng",
    country: "NG",
    monitorSubdomains: true,
    knownPaths: ["/latest-info"],
    defaultSourceClass: "announcer",
  },
  {
    id: "ng-fme",
    label: "Federal Ministry of Education",
    kind: "ministry",
    domain: "education.gov.ng",
    country: "NG",
    monitorSubdomains: true,
    knownPaths: ["/"],
    defaultSourceClass: "official",
  },
  {
    id: "ng-fmcide",
    label: "Federal Ministry of Communications, Innovation and Digital Economy",
    kind: "ministry",
    domain: "fmcide.gov.ng",
    country: "NG",
    monitorSubdomains: true,
    knownPaths: ["/"],
    defaultSourceClass: "official",
  },
  {
    id: "ng-nitda",
    label: "National Information Technology Development Agency",
    kind: "agency",
    domain: "nitda.gov.ng",
    country: "NG",
    /* 3MTT lives at 3mtt.nitda.gov.ng — a subdomain, not a path. */
    monitorSubdomains: true,
    knownPaths: ["/3mtt/"],
    defaultSourceClass: "official",
  },
  {
    id: "ng-nelfund",
    label: "Nigerian Education Loan Fund",
    kind: "fund",
    domain: "nelf.gov.ng",
    country: "NG",
    monitorSubdomains: true,
    knownPaths: ["/"],
    defaultSourceClass: "official",
  },
  {
    id: "ng-ptdf",
    label: "Petroleum Technology Development Fund",
    kind: "fund",
    domain: "ptdf.gov.ng",
    country: "NG",
    monitorSubdomains: true,
    knownPaths: ["/"],
    defaultSourceClass: "official",
  },
];

const BY_DOMAIN = new Map(ANNOUNCERS.map((a) => [a.domain, a]));

/**
 * The announcer responsible for a URL, if there is one.
 *
 * Matches an exact host or any subdomain of a registered domain, and only when
 * that announcer opted into subdomain monitoring. A URL that matches nothing
 * returns null — which is a finding, not a failure: it is the residue this
 * registry cannot reach, and it is counted by `classify` below.
 */
export function announcerFor(url: string): Announcer | null {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }

  const exact = BY_DOMAIN.get(host);
  if (exact) return exact;

  for (const announcer of ANNOUNCERS) {
    if (!announcer.monitorSubdomains) continue;
    if (host.endsWith(`.${announcer.domain}`)) return announcer;
  }

  return null;
}

/**
 * How a URL should be treated when it is observed.
 *
 * The unenumerated case is `unknown-domain` rather than a guess. Guessing here
 * would quietly convert the one measurable risk in the discovery model — how
 * much of the corpus arrives only through aggregators — into an unmeasurable
 * one.
 */
export function classify(url: string): {
  sourceId: string;
  label: string;
  sourceClass: SourceClass;
} {
  const announcer = announcerFor(url);
  if (announcer) {
    return {
      sourceId: announcer.id,
      label: announcer.label,
      sourceClass: announcer.defaultSourceClass,
    };
  }

  let host = url;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    /* Keep the raw string; an unparseable URL is still worth recording as seen. */
  }

  return { sourceId: host, label: host, sourceClass: "unknown-domain" };
}
