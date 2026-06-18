/**
 * Opportunity X — WWW-First Opportunity Intelligence Engine
 *
 * Pipeline:  Discovery → Verification (Firecrawl or HEAD) → Dedup (url_hash)
 *            → Scoring → Persistence → Recommendation
 *
 * The live WWW is the primary data source. Supabase is the cache.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { createHash } from "crypto";

export const OPPORTUNITY_CATEGORIES = [
  "Scholarships",
  "Fellowships",
  "Internships",
  "Grants",
  "Competitions",
  "Conferences",
  "Certifications",
  "Research Programs",
  "Graduate Programs",
  "Summer Schools",
  "Exchange Programs",
  "Startup Programs",
  "Jobs",
] as const;

export type OpportunityCategory = (typeof OPPORTUNITY_CATEGORIES)[number];

const MODEL = "google/gemini-2.5-flash";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SELECT_COLS =
  "id, title, organization, category, categories, opportunity_type, location, deadline, description, ai_insight, apply_url, source_url, source_domain, image_url, tags, verification_score, confidence_score, match_score_default, featured, verified, views_count, created_at, last_verified_at";

// ───────────────────── helpers ─────────────────────

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    // strip common tracking params
    [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "fbclid", "gclid", "mc_cid", "mc_eid", "ref", "ref_src",
    ].forEach((p) => u.searchParams.delete(p));
    let pathname = u.pathname.replace(/\/+$/, "");
    if (!pathname) pathname = "/";
    return `${u.protocol}//${u.host.toLowerCase()}${pathname}${u.search}`;
  } catch {
    return raw.trim().toLowerCase();
  }
}

function urlHash(raw: string): string {
  return createHash("md5").update(normalizeUrl(raw)).digest("hex");
}

function urlDomain(raw: string): string | null {
  try { return new URL(raw).host.toLowerCase().replace(/^www\./, ""); } catch { return null; }
}

const PRIORITY_TLDS = [".edu", ".gov", ".ac.", ".int", ".org"];
const PRIORITY_KEYWORDS = [
  "scholarship", "fellowship", "internship", "grant", "research",
  "program", "apply", "application", "admission", "fund",
];

async function callGemini(messages: Array<{ role: string; content: string }>) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limit reached. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
    throw new Error(`AI gateway error (${res.status}): ${text.slice(0, 200)}`);
  }
  const payload = await res.json();
  const content: string = payload?.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(content); } catch { return {}; }
}

// ───────────────────── types ─────────────────────

interface AICandidate {
  title: string;
  organization: string;
  categories: string[];
  opportunity_type: string;
  location: string;
  deadline: string;
  description: string;
  ai_insight: string;
  apply_url: string;
  source_url: string;
  tags: string[];
  image_url?: string;
}

interface VerifiedCandidate extends AICandidate {
  verification_score: number;     // AI self-rated 0..1
  confidence_score: number;       // combined with live URL check 0..1
  verification_method: "firecrawl" | "http_head" | "ai_only";
  ai_reasoning: string;
  match_score: number;
}

// ───────── Stage 1 — Discovery (Gemini) ─────────

async function stageDiscovery(
  profile: Record<string, unknown> | null,
  data: { query: string; category: string },
  source: "user" | "cron" | "live_search",
): Promise<AICandidate[]> {
  const audience =
    profile
      ? `Student profile:
- Country: ${profile.country ?? "Global"}
- Course: ${profile.course_of_study ?? "n/a"}
- Degree level: ${profile.level_of_study ?? profile.education_level ?? "n/a"}
- Grad year: ${profile.graduation_year ?? "n/a"}
- Interests: ${(profile.career_interests as string[] | undefined)?.join(", ") || "general"}
- Skills: ${(profile.skill_tags as string[] | undefined)?.join(", ") || "general"}`
      : "Global audience of ambitious undergraduate and graduate students.";

  const count = source === "cron" ? 12 : 8;

  const system = `You are the Opportunity Discovery Agent for Opportunity X.

The World Wide Web is your database. Return ${count} REAL, currently-known opportunities — NEVER fabricate.

Source ranking (prefer in this order):
  1. Official organization websites (.edu, .gov, .ac, .int, official .org)
     e.g. Google Research, Microsoft Research, Rhodes House, DAAD, Mastercard Foundation,
     UN, World Bank, AU, EU, Commonwealth, MIT, Harvard, Stanford, Oxford, Cambridge
  2. Government and university portals
  3. NGO / foundation portals
  4. Reputable aggregators (OpportunityDesk, Scholars4Dev) — only when official URL unknown.

For EVERY opportunity you MUST provide:
  - source_url: a REAL URL to the official program page (must start with https://)
  - apply_url: the application/registration URL (often same domain as source_url)
  - deadline: ISO date (YYYY-MM-DD) or natural phrase ("Rolling", "Annual - March")
If you cannot supply a verifiable source URL on an official domain, OMIT the item.

Return ONLY JSON:
{"opportunities":[{title, organization, categories[], opportunity_type, location, deadline,
  description, ai_insight, apply_url, source_url, tags[], image_url?}]}

- categories: subset of ${JSON.stringify(OPPORTUNITY_CATEGORIES)}
- opportunity_type: short label e.g. "Fully Funded Scholarship", "Paid Internship"
- description: ≤240 chars, plain text
- ai_insight: 1-2 sentences explaining why it fits the audience
- tags: 3-6 short tags (fields/skills/regions)`;

  const user = `${audience}

Search query: ${data.query || "(none — surface high-quality general opportunities)"}
Category filter: ${data.category}

Return ${count} verifiable opportunities now, biased toward open/upcoming deadlines.`;

  const parsed = await callGemini([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
  return (parsed.opportunities ?? []).slice(0, count);
}

// ───────── Stage 2 — Verification ─────────

async function firecrawlScrape(url: string): Promise<{ ok: boolean; title?: string; text?: string }> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return { ok: false };
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, timeout: 15000 }),
    });
    if (!res.ok) return { ok: false };
    const j = await res.json();
    const md: string = j?.data?.markdown ?? j?.markdown ?? "";
    const title: string = j?.data?.metadata?.title ?? j?.metadata?.title ?? "";
    if (md.length < 200) return { ok: false };
    return { ok: true, title, text: md.slice(0, 4000) };
  } catch { return { ok: false }; }
}

async function httpHeadVerify(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "OpportunityX/1.0 (+https://opportunityx.app)" },
      signal: ctrl.signal,
    });
    clearTimeout(to);
    return res.ok;
  } catch { return false; }
}

async function verifyCandidate(c: AICandidate): Promise<VerifiedCandidate | null> {
  if (!c.source_url || !/^https?:\/\//i.test(c.source_url)) return null;
  const domain = urlDomain(c.source_url);
  if (!domain) return null;

  // AI self-rating baseline
  let verification_score = 0.5;
  let confidence_score = 0.4;
  let method: VerifiedCandidate["verification_method"] = "ai_only";
  const isPriority = PRIORITY_TLDS.some((t) => domain.includes(t));
  if (isPriority) verification_score += 0.2;

  // Firecrawl first
  const fc = await firecrawlScrape(c.source_url);
  if (fc.ok) {
    method = "firecrawl";
    const blob = `${fc.title ?? ""} ${fc.text ?? ""}`.toLowerCase();
    const titleHit = c.title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .some((w) => blob.includes(w));
    const kwHit = PRIORITY_KEYWORDS.some((k) => blob.includes(k));
    if (titleHit && kwHit) { verification_score = 0.95; confidence_score = isPriority ? 0.95 : 0.85; }
    else if (titleHit || kwHit) { verification_score = 0.8; confidence_score = 0.7; }
    else { verification_score = 0.55; confidence_score = 0.5; }
  } else {
    // HEAD fallback
    const live = await httpHeadVerify(c.source_url);
    if (live) {
      method = "http_head";
      verification_score = isPriority ? 0.8 : 0.65;
      confidence_score = isPriority ? 0.75 : 0.55;
    } else {
      // URL dead — drop
      return null;
    }
  }

  if (confidence_score < 0.5) return null;

  return {
    ...c,
    verification_score: Number(verification_score.toFixed(2)),
    confidence_score: Number(confidence_score.toFixed(2)),
    verification_method: method,
    ai_reasoning: `Verified via ${method} on ${domain}. ${isPriority ? "Priority official source." : "Secondary source."}`,
    match_score: isPriority ? 0.7 : 0.55,
  };
}

// ───────── Stage 3 — Pipeline core ─────────

async function runPipeline(opts: {
  profile: Record<string, unknown> | null;
  query: string;
  category: string;
  source: "user" | "cron" | "live_search";
  userId?: string | null;
  supabaseAdmin: ReturnType<typeof import("@/integrations/supabase/client.server")["supabaseAdmin"]["from"]> extends never ? never : import("@/integrations/supabase/client.server")["supabaseAdmin"];
}) {
  const { profile, query, category, source, userId, supabaseAdmin } = opts;
  const runStart = Date.now();

  const candidates = await stageDiscovery(profile, { query, category }, source);
  const verified: VerifiedCandidate[] = [];
  // verify with limited parallelism
  const batchSize = 4;
  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(verifyCandidate));
    for (const r of results) if (r) verified.push(r);
  }

  let insertedCount = 0;
  const insertedIds: string[] = [];

  if (verified.length > 0) {
    const rows = verified.map((v) => {
      const hash = urlHash(v.source_url);
      return {
        title: v.title.slice(0, 200),
        organization: v.organization.slice(0, 200),
        category: (v.categories?.[0] ?? "Other").slice(0, 50),
        categories: v.categories ?? [],
        opportunity_type: v.opportunity_type?.slice(0, 80) ?? null,
        location: v.location?.slice(0, 120) ?? "Global",
        deadline: v.deadline?.slice(0, 60) || null,
        description: v.description?.slice(0, 600) || null,
        ai_insight: v.ai_insight?.slice(0, 400) || null,
        ai_reasoning: v.ai_reasoning,
        apply_url: v.apply_url?.slice(0, 500) || v.source_url.slice(0, 500),
        source_url: v.source_url.slice(0, 500),
        source_domain: urlDomain(v.source_url),
        image_url: v.image_url?.slice(0, 500) || null,
        tags: v.tags ?? [],
        url_hash: hash,
        verification_score: v.verification_score,
        confidence_score: v.confidence_score,
        verification_method: v.verification_method,
        match_score_default: v.match_score,
        verified: v.confidence_score >= 0.7,
        last_verified_at: new Date().toISOString(),
        discovery_query: query || null,
        discovered_by: userId ?? null,
      };
    });

    // Upsert by url_hash — dedup happens at the database level
    const { data: ins, error } = await supabaseAdmin
      .from("opportunities")
      .upsert(rows, { onConflict: "url_hash", ignoreDuplicates: false })
      .select("id, url_hash");
    if (error) throw error;
    insertedCount = ins?.length ?? 0;
    for (const r of ins ?? []) insertedIds.push(r.id);

    // Personalized scoring cache
    if (userId && insertedIds.length) {
      const scoreRows = insertedIds.map((id, i) => ({
        user_id: userId,
        opportunity_id: id,
        score: verified[i]?.match_score ?? 0.6,
        reasoning: verified[i]?.ai_reasoning ?? null,
      }));
      await supabaseAdmin.from("match_scores").upsert(scoreRows, {
        onConflict: "user_id,opportunity_id",
      });
    }
  }

  // Audit
  await supabaseAdmin.from("discovery_runs").insert({
    user_id: userId ?? null,
    query: query || null,
    category: category || null,
    source,
    candidates_found: candidates.length,
    verified_count: verified.length,
    inserted_count: insertedCount,
  });

  return {
    candidates: candidates.length,
    verified: verified.length,
    inserted: insertedCount,
    ids: insertedIds,
    durationMs: Date.now() - runStart,
  };
}

// ───────────────────── server functions ─────────────────────

const DiscoverInput = z.object({
  query: z.string().max(200).optional().default(""),
  category: z.string().max(50).optional().default("All"),
});

export const discoverOpportunities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DiscoverInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select(
        "country, education_level, interests, university, course_of_study, degree_type, level_of_study, graduation_year, career_interests, skill_tags, preferred_categories",
      )
      .eq("id", userId)
      .maybeSingle();

    const result = await runPipeline({
      profile,
      query: data.query,
      category: data.category,
      source: "user",
      userId,
      supabaseAdmin,
    });
    return { inserted: result.inserted, verified: result.verified, candidates: result.candidates };
  });

/**
 * Public Perplexity-style live web search.
 * No auth required — anyone can ask. Caches into the same opportunities table.
 */
const LiveSearchInput = z.object({ query: z.string().min(2).max(200) });

export const liveWebSearch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => LiveSearchInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await runPipeline({
      profile: null,
      query: data.query,
      category: "All",
      source: "live_search",
      userId: null,
      supabaseAdmin,
    });
    // Return the freshly verified rows (plus existing matches)
    const { data: rows } = await supabaseAdmin
      .from("opportunities")
      .select(SELECT_COLS)
      .eq("verified", true)
      .or(`title.ilike.%${data.query}%,description.ilike.%${data.query}%,tags.cs.{${data.query}}`)
      .order("confidence_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);
    return { stats: result, results: rows ?? [] };
  });

/** Internal cron entry. Calls a small rotation of priority queries. */
export const runScheduledCrawl = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const queries = [
    "fully funded scholarships for international students 2026",
    "research internships undergraduate STEM",
    "fellowships Africa graduate students",
    "AI fellowships and research programs",
    "global health scholarships pharmacy medicine",
    "MIT Harvard Stanford Oxford fellowships",
  ];
  let totalInserted = 0;
  for (const q of queries) {
    try {
      const r = await runPipeline({
        profile: null,
        query: q,
        category: "All",
        source: "cron",
        userId: null,
        supabaseAdmin,
      });
      totalInserted += r.inserted;
    } catch (e) {
      await supabaseAdmin.from("discovery_runs").insert({
        query: q, source: "cron", error: String(e).slice(0, 400),
      });
    }
  }
  return { inserted: totalInserted };
});

// ───────────────────── reads ─────────────────────

export const getOpportunity = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("opportunities")
      .select(SELECT_COLS)
      .eq("id", data.id)
      .eq("verified", true)
      .maybeSingle();
    if (error) throw error;
    return row;
  });

export const recommendedForUser = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: scored } = await supabase
      .from("match_scores")
      .select(`score, opportunity:opportunities(${SELECT_COLS})`)
      .eq("user_id", userId)
      .order("score", { ascending: false })
      .limit(12);
    const rows =
      (scored ?? [])
        .map((s) => s.opportunity)
        .filter((o): o is NonNullable<typeof o> => o !== null && (o as { verified: boolean }).verified) ?? [];
    if (rows.length > 0) return rows;
    const { data: fallback } = await supabase
      .from("opportunities")
      .select(SELECT_COLS)
      .eq("verified", true)
      .order("confidence_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(12);
    return fallback ?? [];
  });

export const trendingOpportunities = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("opportunities")
    .select(SELECT_COLS)
    .eq("verified", true)
    .order("views_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(12);
  return data ?? [];
});

export const newThisWeek = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data } = await supabaseAdmin
    .from("opportunities")
    .select(SELECT_COLS)
    .eq("verified", true)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(12);
  return data ?? [];
});

export const endingSoon = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("opportunities")
    .select(SELECT_COLS)
    .eq("verified", true)
    .not("deadline", "is", null)
    .order("created_at", { ascending: false })
    .limit(40);
  return data ?? [];
});

const ListByCategoryInput = z.object({ category: z.string().min(1).max(50) });
export const listByCategory = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => ListByCategoryInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("opportunities")
      .select(SELECT_COLS)
      .eq("verified", true)
      .contains("categories", [data.category])
      .order("created_at", { ascending: false })
      .limit(12);
    return rows ?? [];
  });

const SearchInput = z.object({
  query: z.string().max(200).optional().default(""),
  category: z.string().max(50).optional().default("All"),
});
export const searchOpportunities = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => SearchInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("opportunities")
      .select(SELECT_COLS)
      .eq("verified", true)
      .order("confidence_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(40);
    if (data.query) q = q.ilike("title", `%${data.query}%`);
    if (data.category && data.category !== "All")
      q = q.contains("categories", [data.category]);
    const { data: rows } = await q;
    return rows ?? [];
  });
