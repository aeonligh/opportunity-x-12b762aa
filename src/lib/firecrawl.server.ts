/**
 * Firecrawl server-side wrapper.
 * Server-only. Never import from client code.
 * Requires FIRECRAWL_API_KEY to be set in the environment.
 */

const FC_BASE = "https://api.firecrawl.dev/v2";

function getKey(): string | null {
  return process.env.FIRECRAWL_API_KEY ?? null;
}

async function fcFetch<T = unknown>(path: string, body: unknown): Promise<T | null> {
  const key = getKey();
  if (!key) return null;
  try {
    const res = await fetch(`${FC_BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface ScrapeResult {
  url: string;
  title: string;
  markdown: string;
  text: string;
  ok: boolean;
}

export async function scrapePage(url: string): Promise<ScrapeResult> {
  const j = await fcFetch<{
    data?: { markdown?: string; metadata?: { title?: string } };
    markdown?: string;
    metadata?: { title?: string };
  }>("/scrape", {
    url,
    formats: ["markdown"],
    onlyMainContent: true,
    timeout: 15000,
  });
  const md = j?.data?.markdown ?? j?.markdown ?? "";
  const title = j?.data?.metadata?.title ?? j?.metadata?.title ?? "";
  return { url, title, markdown: md, text: md.slice(0, 8000), ok: md.length >= 200 };
}

export interface WebSearchHit {
  url: string;
  title: string;
  description: string;
  markdown?: string;
}

export async function searchWeb(query: string, opts?: { limit?: number; scrape?: boolean }): Promise<WebSearchHit[]> {
  const j = await fcFetch<{
    data?: Array<{ url: string; title?: string; description?: string; markdown?: string }>;
    web?: Array<{ url: string; title?: string; description?: string; markdown?: string }>;
  }>("/search", {
    query,
    limit: opts?.limit ?? 10,
    ...(opts?.scrape ? { scrapeOptions: { formats: ["markdown"], onlyMainContent: true } } : {}),
  });
  const arr = j?.data ?? j?.web ?? [];
  return arr.map((r) => ({
    url: r.url,
    title: r.title ?? "",
    description: r.description ?? "",
    markdown: r.markdown,
  }));
}

const OPPORTUNITY_KEYWORDS = [
  "scholarship", "fellowship", "internship", "grant", "fund",
  "apply", "application", "deadline", "eligibility", "program",
];

/**
 * Verifies a URL points to a real, relevant opportunity page.
 * Returns confidence 0..1 and the scrape evidence.
 */
export async function verifyOpportunity(
  url: string,
  expectedTitle?: string,
): Promise<{ ok: boolean; confidence: number; method: "firecrawl" | "http" | "none"; evidence?: ScrapeResult }> {
  const scrape = await scrapePage(url);
  if (scrape.ok) {
    const blob = `${scrape.title} ${scrape.text}`.toLowerCase();
    const kwHits = OPPORTUNITY_KEYWORDS.filter((k) => blob.includes(k)).length;
    const titleHit = expectedTitle
      ? expectedTitle.toLowerCase().split(/\s+/).filter((w) => w.length > 4).some((w) => blob.includes(w))
      : true;
    let confidence = 0.4 + Math.min(kwHits, 4) * 0.1;
    if (titleHit) confidence += 0.2;
    confidence = Math.min(1, confidence);
    return { ok: confidence >= 0.5, confidence, method: "firecrawl", evidence: scrape };
  }
  // HTTP fallback
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { redirect: "follow", signal: ctrl.signal });
    clearTimeout(to);
    return { ok: res.ok, confidence: res.ok ? 0.5 : 0, method: "http" };
  } catch {
    return { ok: false, confidence: 0, method: "none" };
  }
}

export interface ExtractedOpportunity {
  title?: string;
  organization?: string;
  deadline?: string;
  eligibility?: string;
  benefits?: string;
  apply_url?: string;
  description?: string;
}

/**
 * AI-powered structured extraction via Firecrawl's JSON format.
 */
export async function extractOpportunity(url: string): Promise<ExtractedOpportunity | null> {
  const j = await fcFetch<{ data?: { json?: ExtractedOpportunity }; json?: ExtractedOpportunity }>(
    "/scrape",
    {
      url,
      formats: [
        {
          type: "json",
          prompt:
            "Extract the opportunity details: title, organization, deadline (ISO date if possible), eligibility, benefits, application URL, and a short description.",
        },
      ],
      onlyMainContent: true,
      timeout: 20000,
    },
  );
  return j?.data?.json ?? j?.json ?? null;
}

export function isFirecrawlConfigured(): boolean {
  return !!getKey();
}
