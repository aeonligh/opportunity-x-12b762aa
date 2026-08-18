import { isTextual } from "../observation/record";
import type { CompletedExchange } from "../observation/record";

/**
 * The transport.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * THE ONLY COMPONENT IN THE ENGINE THAT TOUCHES THE NETWORK
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Everything else is a pure fold over what this produces. That is why the
 * `CompletedExchange` shape is so narrow: it describes something that already
 * happened, and `completedAt` is stamped here, at the moment the exchange
 * finished, from inside the function that performed it. No layer above can
 * supply that timestamp, and the observation type is branded so no layer above
 * can construct an observation without one.
 *
 * ── A failed fetch is a result, not an error ──────────────────────────────
 *
 * Every branch below returns a `CompletedExchange`. Nothing throws for a 404, a
 * timeout, a DNS failure or a body too large to keep. A source that stops
 * answering is frequently the earliest available signal that an opportunity
 * closed — no source announces its own closure reliably — so a failure is
 * recorded as an observation with the same care as a success.
 *
 * ── Limits, and why each one is here ──────────────────────────────────────
 *
 * `timeoutMs`      A crawl that blocks on one slow host stops being a crawl.
 * `maxBytes`       The body is retained permanently. An unbounded read would
 *                  let one misconfigured source fill the record.
 * `maxRedirects`   Redirect chains are how a crawl ends up somewhere it never
 *                  decided to go. The final URL is recorded, so an observation
 *                  always names what was actually read.
 * `userAgent`      Identifies Opportunity X and gives operators a way to reach a human.
 *                  A crawler that hides is a crawler that gets blocked, and
 *                  deserves to be.
 */

export const USER_AGENT =
  "OpportunityXBot/1.0 (+https://opportunityx.app/about/crawler; opportunity discovery)";

export interface FetchLimits {
  timeoutMs: number;
  maxBytes: number;
  maxRedirects: number;
}

export const DEFAULT_LIMITS: FetchLimits = {
  timeoutMs: 15_000,
  /* 4 MiB. Generous for an announcement page, and a hard stop on a source that
     serves something else entirely. */
  maxBytes: 4 * 1024 * 1024,
  maxRedirects: 5,
};

/** Injectable so the sweep can be tested without a network. */
export type Transport = (url: string, init: RequestInit) => Promise<Response>;

export async function retrieve(
  url: string,
  options: { limits?: FetchLimits; transport?: Transport } = {},
): Promise<CompletedExchange> {
  const limits = options.limits ?? DEFAULT_LIMITS;
  const transport = options.transport ?? ((u, init) => fetch(u, init));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), limits.timeoutMs);

  try {
    const response = await transport(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml,application/ld+json;q=0.9,*/*;q=0.5",
      },
    });

    /*
      The URL that was actually read, after redirects. Recording the requested
      URL instead would produce an observation attributing content to a page
      that did not serve it.
    */
    const finalUrl = response.url || url;
    /*
      Only when it differs — see `CompletedExchange.requestedUrl`. A redirect is
      the only way these come apart, so its presence *is* the redirect record.
    */
    const provenance = finalUrl === url ? {} : { requestedUrl: url };

    if (!response.ok) {
      return {
        url: finalUrl,
        ...provenance,
        completedAt: new Date().toISOString(),
        status: response.status,
        body: null,
        encoding: "utf-8",
        contentType: response.headers.get("content-type"),
      };
    }

    const contentType = response.headers.get("content-type");
    const declared = Number(response.headers.get("content-length") ?? "0");
    if (declared > limits.maxBytes) {
      return {
        url: finalUrl,
        ...provenance,
        completedAt: new Date().toISOString(),
        status: response.status,
        body: null,
        encoding: "utf-8",
        contentType,
        failure: `Source declared ${declared} bytes, above the ${limits.maxBytes}-byte retention limit.`,
      };
    }

    const bytes = await readCapped(response, limits.maxBytes);
    if (bytes === null) {
      return {
        url: finalUrl,
        ...provenance,
        completedAt: new Date().toISOString(),
        status: response.status,
        body: null,
        encoding: "utf-8",
        contentType,
        failure: `Source exceeded the ${limits.maxBytes}-byte retention limit while reading.`,
      };
    }

    /*
      Text is decoded; everything else is retained base64. A PDF circular
      decoded as UTF-8 becomes mojibake that can never be read back, and a hold
      that loses the evidence is not a hold. Nothing can extract from the bytes
      yet — that is recorded as an unreadable retrieval rather than hidden — but
      the retrieval stays reconstructible for whatever can read it later.
    */
    const textual = isTextual(contentType);

    return {
      url: finalUrl,
      ...provenance,
      /* Stamped after the body is in hand. An exchange is not complete until it
         is, and a timestamp taken earlier would overstate what was read. */
      completedAt: new Date().toISOString(),
      status: response.status,
      body: textual ? new TextDecoder().decode(bytes) : Buffer.from(bytes).toString("base64"),
      encoding: textual ? "utf-8" : "base64",
      contentType,
    };
  } catch (cause) {
    return {
      url,
      completedAt: new Date().toISOString(),
      status: null,
      body: null,
      encoding: "utf-8",
      contentType: null,
      failure:
        cause instanceof Error && cause.name === "AbortError"
          ? `No response within ${limits.timeoutMs}ms.`
          : `Request failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Read the body, stopping at the cap.
 *
 * Returns null when the cap is hit rather than a truncated result. A truncated
 * page would be stored as though it were the whole thing, and every claim
 * extracted from it — or *not* extracted, because the section was cut off —
 * would be attributed to the source rather than to the truncation.
 *
 * Bytes, not text: the caller decides how to hold them, and a PDF must not be
 * decoded on the way past.
 */
async function readCapped(response: Response, maxBytes: number): Promise<Uint8Array | null> {
  if (!response.body) {
    return new Uint8Array(await response.arrayBuffer());
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return joined;
}
