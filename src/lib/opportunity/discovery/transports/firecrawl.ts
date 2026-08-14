import "@/lib/server-only";
import type { Transport } from "../fetcher";

/**
 * Firecrawl, as a discovery transport.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THIS IS ALLOWED WHERE A SEARCH INDEX WAS NOT
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A search index was refused as a transport, and the reasoning is worth
 * repeating because it is what makes this one acceptable rather than a
 * reversal.
 *
 * An index answers from a crawl it performed at a time of its own choosing.
 * Wiring one in would have produced observations false in three ways:
 * `retrievedAt` would claim AEON X read the page at a moment it did not,
 * robots.txt compliance would be fiction because our request never reached the
 * site, and the retained bytes would be the index's rendering rather than the
 * source's.
 *
 * Firecrawl is a fetcher, not an index. It requests the URL it is given, when
 * it is given it, and returns what that server answered. So:
 *
 *   `retrievedAt`  — a real retrieval time, because a real retrieval happened.
 *                    `maxAge: 0` below refuses any cached copy, so this stays
 *                    true rather than true-by-default.
 *   robots.txt     — still checked by this engine, against the real file, and
 *                    still refused when unreadable. That decision is made in
 *                    `robots.ts` before a request is ever issued, and routing
 *                    the request differently does not move it.
 *   the bytes      — the source's own HTML. `rawHtml` is requested, not
 *                    markdown, and that is not a preference: every extractor
 *                    here reads JSON-LD and `<link rel="canonical">` out of the
 *                    document. Markdown would silently strip the structured
 *                    data the whole identity model rests on, and the engine
 *                    would report an opportunity with no declared identifier as
 *                    though the publisher had never given one.
 *
 * ── What is still borrowed, and is recorded ───────────────────────────────
 *
 * The request goes out from Firecrawl's user agent and Firecrawl's addresses,
 * not ours. A site that would have refused `AeonXBot` may answer them, and a
 * site that blocks datacentre ranges may refuse them where we would have got
 * through. Either way the retrieval is not the one AEON X would have made
 * alone.
 *
 * That is a real difference and it is not hidden: the response carries an
 * `x-aeonx-via` header, so anything downstream that cares can tell a direct
 * retrieval from a brokered one without inspecting configuration. Nothing is
 * asserted about the page that the page did not say.
 */

const FIRECRAWL_SCRAPE = "https://api.firecrawl.dev/v2/scrape";

/**
 * Build a transport that fetches through Firecrawl.
 *
 * Returns null when no key is configured, rather than throwing or quietly
 * falling back to a direct fetch. A caller that asked for Firecrawl and
 * silently got something else would be running a different experiment from the
 * one it thinks it is running.
 */
export function firecrawlTransport(options: { apiKey?: string } = {}): Transport | null {
  const apiKey = options.apiKey ?? process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;

  return async (url: string, init: RequestInit): Promise<Response> => {
    const response = await fetch(FIRECRAWL_SCRAPE, {
      method: "POST",
      signal: init.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        url,
        /*
          The source's own document. Not markdown — see the note above; the
          extractors read JSON-LD and canonical links out of the HTML, and
          markdown would drop both without any error to notice.
        */
        formats: ["rawHtml"],
        onlyMainContent: false,
        /* No cached copy. A retrieval time has to be a retrieval time. */
        maxAge: 0,
      }),
    });

    if (!response.ok) {
      /*
        Firecrawl itself failed. Reported as a transport failure with its own
        status, never as something the target site said — a 402 from a billing
        limit is not a page that stopped answering, and recording it as one
        would eventually retire a live opportunity for want of credit.
      */
      return new Response(null, {
        status: 502,
        statusText: `Firecrawl responded ${response.status}`,
        headers: { "x-aeonx-via": "firecrawl", "x-aeonx-transport-error": "true" },
      });
    }

    const payload = (await response.json()) as {
      success?: boolean;
      data?: { rawHtml?: string; metadata?: { statusCode?: number; sourceURL?: string } };
    };

    const html = payload.data?.rawHtml;
    const status = payload.data?.metadata?.statusCode ?? 200;

    if (!payload.success || typeof html !== "string") {
      return new Response(null, {
        status: 502,
        statusText: "Firecrawl returned no document",
        headers: { "x-aeonx-via": "firecrawl", "x-aeonx-transport-error": "true" },
      });
    }

    /*
      The URL Firecrawl actually read, after redirects, so an observation is
      attributed to the page that served it rather than the one requested.
    */
    const finalUrl = payload.data?.metadata?.sourceURL ?? url;

    return new Response(html, {
      status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "x-aeonx-via": "firecrawl",
        "x-aeonx-final-url": finalUrl,
      },
    });
  };
}

/** Whether a Firecrawl key is configured. Read before it is offered. */
export function firecrawlConfigured(): boolean {
  return Boolean(process.env.FIRECRAWL_API_KEY);
}
