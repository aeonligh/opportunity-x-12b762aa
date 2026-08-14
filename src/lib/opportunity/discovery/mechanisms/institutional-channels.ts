import { ANNOUNCERS, type Announcer } from "../../announcers/registry";
import { visit, type CrawlContext, type MechanismReport } from "../crawl";

/**
 * Mechanism 5 — institutional channel monitoring.
 *
 * ── What it reaches, and what it cannot ───────────────────────────────────
 *
 * Publishers cannot be enumerated; announcers can. Universities, ministries,
 * agencies, funds and corporate newsrooms are a finite, slow-changing, publicly
 * known set, and the discovery research found they announce three distinct
 * kinds of thing: their own opportunities, external opportunities affecting
 * their people, and third-party opportunities routed to them. The third is why
 * this mechanism reaches a small NGO's scholarship at all.
 *
 * **It is the primary mechanism, and it is not the system.** It cannot reach an
 * opportunity whose organiser neither is an institution nor routes to one — an
 * independent domain with no institutional announcer. That residue exists; one
 * case in a twenty-opportunity corpus resisted this mechanism entirely. One case
 * is evidence the residue exists, not a measurement of its size, and unmeasured
 * is not small.
 *
 * Every one of those limits is a property of *this* mechanism. Reading them as
 * limits of discovery itself is the mistake the manifest in `../mechanism.ts`
 * exists to prevent.
 *
 * ── One hop, and no further ───────────────────────────────────────────────
 *
 * Known paths first, then links from those pages that stay inside the
 * announcer's registrable domain. Subdomains count, and that is the whole point:
 * well-resourced organisers put new programmes at `programme.institution.tld`,
 * and a monitor watching only known paths misses every one of them.
 *
 * There is no second hop. Depth is the cheapest way for a crawl to stop being
 * about the thing it was pointed at, and one hop already covers the pattern the
 * research actually observed.
 */

const HREF = /<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["']/gi;

export interface InstitutionalChannelOptions {
  announcers?: readonly Announcer[];
  maxPagesPerAnnouncer?: number;
}

export function institutionalChannels(options: InstitutionalChannelOptions = {}) {
  const announcers = options.announcers ?? ANNOUNCERS;
  const maxPages = options.maxPagesPerAnnouncer ?? 25;

  return {
    id: "institutional-channels" as const,
    label: "Institutional channel monitoring",

    async run(ctx: CrawlContext, report: MechanismReport, touched: Set<string>) {
      for (const announcer of announcers) {
        let budget = maxPages;

        const known = announcer.knownPaths.map(
          (path) => new URL(path, `https://${announcer.domain}`).href
        );
        const queued = new Set(known);
        const discovered: string[] = [];

        for (const url of known) {
          if (budget <= 0) break;
          const observation = await visit(ctx, url, report, touched);
          budget -= 1;

          if (observation?.outcome !== "retrieved") continue;

          for (const link of sameDomainLinks(
            observation.content.body,
            url,
            announcer.domain
          )) {
            if (!queued.has(link)) {
              queued.add(link);
              discovered.push(link);
            }
          }
        }

        /* The second and final hop. The queue cannot grow from here. */
        for (const url of discovered) {
          if (budget <= 0) break;
          await visit(ctx, url, report, touched);
          budget -= 1;
        }
      }
    },
  };
}

/**
 * Links on a page that stay within the announcer's registrable domain.
 *
 * Subdomains are included deliberately — `hackaholics.wemabank.com` is where
 * the programme lives and a filter on exact host would have excluded it.
 *
 * Fragments are stripped so `#apply` and the page itself are not two
 * observations of one retrieval. Query strings are kept: a listing paginated by
 * query is genuinely different content.
 */
export function sameDomainLinks(
  body: string,
  baseUrl: string,
  registrableDomain: string
): string[] {
  const found = new Set<string>();

  for (const match of body.matchAll(HREF)) {
    let resolved: URL;
    try {
      resolved = new URL(match[1], baseUrl);
    } catch {
      continue;
    }

    if (resolved.protocol !== "https:" && resolved.protocol !== "http:") continue;

    const host = resolved.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== registrableDomain && !host.endsWith(`.${registrableDomain}`)) continue;

    resolved.hash = "";
    if (resolved.href !== baseUrl) found.add(resolved.href);
  }

  return [...found];
}
