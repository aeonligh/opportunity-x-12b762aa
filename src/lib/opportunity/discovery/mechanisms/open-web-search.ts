import "@/lib/server-only";
import { visit, type CrawlContext, type MechanismReport } from "../crawl";

/**
 * Mechanism 4 — unknown-domain discovery, through open web search.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * THE RESIDUE THIS EXISTS TO REACH
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The institutional-channel mechanism is the primary one and it has a shape it
 * cannot escape: it can only find what an announcer announces. An opportunity
 * whose organiser is neither an institution nor routed through one — an
 * independent foundation on its own domain, a company programme with no
 * university partner — is unreachable by it, permanently, no matter how many
 * announcers the registry gains.
 *
 * That residue is real and unmeasured. This mechanism is the one that reaches
 * into it, and search is the only instrument that can: publishers cannot be
 * enumerated, but they can be searched for.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY A SEARCH RESULT IS A CANDIDATE AND NEVER EVIDENCE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * This is the distinction the whole mechanism turns on, and getting it wrong
 * would quietly undo the verification model.
 *
 * A search engine's snippet, title and description are **its** account of a
 * page, produced at a time of its choosing, and frequently stale — a snippet
 * describing last year's deadline is the single most common way an opportunity
 * aggregator misleads someone. Witnessing that text as though the publisher had
 * said it would put a third party's summary into the observation record with
 * the publisher's authority attached, and the record is append-only: it could
 * never be taken back.
 *
 * So nothing this mechanism receives from the search API is witnessed. The
 * results are **URLs to go and read**, and every one of them is then retrieved
 * through the ordinary path — robots checked first, the transport making a real
 * request, `witness()` recording what that page actually served. If the
 * retrieval fails, the candidate produces nothing. A search hit alone has never
 * been evidence that an opportunity exists.
 *
 * ── What is recorded about the search itself ──────────────────────────────
 *
 * Nothing, deliberately. The search is how Opportunity X came to look at a URL, not
 * something it observed. `visit()` records the retrieval, and the retrieval is
 * the same shape whether the URL came from an announcer's link or from a query
 * — which is what keeps a searched-for opportunity from being second-class
 * evidence, or first-class evidence, on the strength of how it was found.
 *
 * ── Why the queries are a fixed list ──────────────────────────────────────
 *
 * Because a generated query is an inference about what this person wants, and
 * running discovery against it would make the corpus a function of the model's
 * guess about them. The queries here describe *categories of opportunity*, not
 * people. Matching to a person happens later, in the judgment layer, against
 * evidence — never by having searched for them in the first place.
 */

const FIRECRAWL_SEARCH = "https://api.firecrawl.dev/v2/search";

/**
 * What to search for.
 *
 * About opportunities, never about a person. Kept small and explicit rather
 * than generated: every query here is a decision someone made and can defend,
 * and a corpus assembled from generated queries could not be audited at all.
 */
export const DEFAULT_QUERIES: readonly string[] = [
  "scholarship application deadline Nigeria 2026",
  "fully funded fellowship Nigerian graduates apply",
  "grant call for applications Nigeria deadline",
  "graduate trainee programme Nigeria applications open",
];

export interface OpenWebSearchOptions {
  queries?: readonly string[];
  /** Results per query. Small by default: this is a residue, not a firehose. */
  perQuery?: number;
  apiKey?: string;
  /** Injectable so the mechanism is testable without a network or a key. */
  search?: (query: string, limit: number) => Promise<string[]>;
}

/**
 * Ask Firecrawl for URLs matching a query.
 *
 * Returns URLs and nothing else — deliberately not the title, description or
 * markdown the API also offers. Taking those would put a third party's account
 * of a page within reach of the witnessing code, and the only reliable way to
 * keep borrowed text out of an append-only record is to never carry it past
 * this function.
 */
function firecrawlSearch(apiKey: string) {
  return async (query: string, limit: number): Promise<string[]> => {
    const response = await fetch(FIRECRAWL_SEARCH, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ query, limit }),
    });

    if (!response.ok) return [];

    const payload = (await response.json()) as {
      data?: Array<{ url?: string }> | { web?: Array<{ url?: string }> };
    };

    const rows = Array.isArray(payload.data) ? payload.data : (payload.data?.web ?? []);

    return rows.flatMap((r) => (typeof r.url === "string" ? [r.url] : []));
  };
}

export function openWebSearch(options: OpenWebSearchOptions = {}) {
  const queries = options.queries ?? DEFAULT_QUERIES;
  const perQuery = options.perQuery ?? 5;

  const apiKey = options.apiKey ?? process.env.FIRECRAWL_API_KEY;
  const search = options.search ?? (apiKey ? firecrawlSearch(apiKey) : null);

  return {
    id: "unknown-domain-discovery" as const,
    label: "Open web search",

    async run(ctx: CrawlContext, report: MechanismReport, touched: Set<string>) {
      /*
        No search available. The mechanism does nothing rather than falling back
        to something else — a run that reported this mechanism as having run,
        having searched nothing, would be coverage claimed and not held.
      */
      if (search === null) return;

      const seen = new Set<string>();

      for (const query of queries) {
        let urls: string[];
        try {
          urls = await search(query, perQuery);
        } catch {
          /* A failed search found nothing. It did not establish that nothing
             is there, and it appends no observation saying so. */
          continue;
        }

        for (const url of urls) {
          if (seen.has(url)) continue;
          seen.add(url);

          /*
            The ordinary path: robots first, a real retrieval, and `witness()`
            recording what the page actually served. Nothing the search API said
            about this URL travels with it.
          */
          await visit(ctx, url, report, touched);
        }
      }
    },
  };
}
