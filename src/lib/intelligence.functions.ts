/**
 * Opportunity Intelligence Engine.
 *
 * Multi-stage pipeline:
 *   Discovery → Verification → Classification → Deduplication
 *   → Scoring → Persistence → Recommendation
 *
 * All AI calls go through Lovable AI Gateway (google/gemini-2.5-flash).
 * Only verified opportunities are persisted.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const OPPORTUNITY_CATEGORIES = [
  "Scholarships",
  "Internships",
  "Fellowships",
  "Grants",
  "Competitions",
  "Conferences",
  "Certifications",
  "Webinars",
  "Research Programs",
  "Jobs",
] as const;

export type OpportunityCategory = (typeof OPPORTUNITY_CATEGORIES)[number];

const DiscoverInput = z.object({
  query: z.string().max(200).optional().default(""),
  category: z.string().max(50).optional().default("All"),
});

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
  verification_score: number;
  ai_reasoning: string;
  match_score: number;
}

const MODEL = "google/gemini-2.5-flash";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

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
    if (res.status === 402)
      throw new Error("AI credits exhausted. Add credits to continue discovering.");
    throw new Error(`AI gateway error (${res.status}): ${text.slice(0, 200)}`);
  }
  const payload = await res.json();
  const content: string = payload?.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/** Stage 1 — Discovery */
async function stageDiscovery(
  profile: Record<string, unknown> | null,
  data: { query: string; category: string },
): Promise<AICandidate[]> {
  const system = `You are Opportunity X's discovery agent for the AEON X ecosystem.

You MUST return 6 REAL, currently-known opportunities (do NOT invent any).
Prioritize sources from:
- University websites (.edu, official .ac domains)
- Government portals (.gov, official ministries)
- NGOs and foundations (Gates, Ford, Rockefeller, MasterCard, Open Society, etc.)
- International organizations (UN, UNESCO, WHO, World Bank, AU, EU)
- Corporate programs (Google, Microsoft, Meta, OpenAI, McKinsey, etc.)

For EACH opportunity you MUST provide a real \`source_url\` from one of the above types of sources, and a real \`apply_url\`. If you cannot supply a verifiable source URL, omit the item — do not fabricate URLs.

Return ONLY JSON: {"opportunities":[{title, organization, categories[], opportunity_type, location, deadline, description, ai_insight, apply_url, source_url, tags[], image_url?}]}.
- categories: subset of ${JSON.stringify(OPPORTUNITY_CATEGORIES)}
- opportunity_type: one short label like "Fully Funded Scholarship", "Paid Internship", "Research Fellowship"
- description: <= 240 chars
- ai_insight: 1-2 sentence reason it fits THIS user
- tags: 3-6 short tags (skills/fields)`;

  const user = `User profile:
- Country: ${profile?.country ?? "Global"}
- University: ${profile?.university ?? "n/a"}
- Course: ${profile?.course_of_study ?? "n/a"}
- Degree: ${profile?.degree_type ?? "n/a"}
- Level: ${profile?.level_of_study ?? profile?.education_level ?? "n/a"}
- Graduation year: ${profile?.graduation_year ?? "n/a"}
- Career interests: ${(profile?.career_interests as string[] | undefined)?.join(", ") || "general"}
- Skill tags: ${(profile?.skill_tags as string[] | undefined)?.join(", ") || "general"}
- Preferred categories: ${(profile?.preferred_categories as string[] | undefined)?.join(", ") || "any"}

Search query: ${data.query || "(none)"}
Category filter: ${data.category}

Return 6 personalized, real, verifiable opportunities now.`;

  const parsed = await callGemini([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
  return (parsed.opportunities ?? []).slice(0, 8);
}

/** Stage 2 — Verification (separate AI pass) */
async function stageVerification(candidates: AICandidate[]): Promise<VerifiedCandidate[]> {
  if (candidates.length === 0) return [];
  const system = `You are Opportunity X's verification agent.

For each candidate opportunity, judge realism on a 0.0-1.0 scale:
- 1.0: definitely a real program with the URL pattern matching its sponsor
- 0.7: likely real, plausible URL
- 0.4: vague or unverifiable
- 0.0: probably fabricated

Also provide a 1-sentence \`ai_reasoning\` explaining your score, plus a default match_score (0.0-1.0) for an average ambitious student.

Return ONLY JSON: {"verified":[{index, verification_score, ai_reasoning, match_score}]}.`;
  const user = `Candidates:\n${JSON.stringify(
    candidates.map((c, i) => ({
      index: i,
      title: c.title,
      organization: c.organization,
      source_url: c.source_url,
      apply_url: c.apply_url,
    })),
    null,
    2,
  )}`;
  const parsed = await callGemini([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
  const verdicts: Array<{
    index: number;
    verification_score: number;
    ai_reasoning: string;
    match_score: number;
  }> = parsed.verified ?? [];
  const out: VerifiedCandidate[] = [];
  for (const v of verdicts) {
    const c = candidates[v.index];
    if (!c) continue;
    if (typeof v.verification_score !== "number" || v.verification_score < 0.6) continue;
    if (!c.source_url || !/^https?:\/\//i.test(c.source_url)) continue;
    out.push({
      ...c,
      verification_score: Number(v.verification_score.toFixed(2)),
      ai_reasoning: String(v.ai_reasoning ?? "").slice(0, 400),
      match_score: Number((v.match_score ?? 0.5).toFixed(2)),
    });
  }
  return out;
}

const SELECT_COLS =
  "id, title, organization, category, categories, opportunity_type, location, deadline, description, ai_insight, apply_url, source_url, image_url, tags, verification_score, match_score_default, featured, verified, views_count, created_at";

export const discoverOpportunities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DiscoverInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "country, education_level, interests, bio, university, course_of_study, degree_type, level_of_study, graduation_year, career_interests, skill_tags, preferred_categories",
      )
      .eq("id", userId)
      .maybeSingle();

    // Stage 1
    const candidates = await stageDiscovery(profile, data);
    if (candidates.length === 0) return { inserted: 0 };

    // Stage 2
    const verified = await stageVerification(candidates);
    if (verified.length === 0) return { inserted: 0 };

    // Stage 4 — Deduplication
    const titles = verified.map((v) => v.title.toLowerCase());
    const { data: existing } = await supabase
      .from("opportunities")
      .select("title, organization")
      .in(
        "title",
        verified.map((v) => v.title),
      );
    const existingKeys = new Set(
      (existing ?? []).map(
        (r) => `${r.title.toLowerCase()}::${(r.organization ?? "").toLowerCase()}`,
      ),
    );
    const deduped = verified.filter(
      (v) =>
        !existingKeys.has(`${v.title.toLowerCase()}::${v.organization.toLowerCase()}`),
    );

    if (deduped.length === 0) return { inserted: 0 };

    // Stage 6 — Persistence (verified=true)
    const rows = deduped.map((v) => ({
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
      apply_url: v.apply_url?.slice(0, 500) || null,
      source_url: v.source_url?.slice(0, 500) || null,
      image_url: v.image_url?.slice(0, 500) || null,
      tags: v.tags ?? [],
      verification_score: v.verification_score,
      match_score_default: v.match_score,
      verified: true,
      discovered_by: userId,
    }));

    const { data: inserted, error } = await supabase
      .from("opportunities")
      .insert(rows)
      .select("id");
    if (error) throw error;

    // Stage 7 — per-user scoring cache (use AI default match_score for now)
    if (inserted && inserted.length) {
      const scoreRows = inserted.map((r, i) => ({
        user_id: userId,
        opportunity_id: r.id,
        score: deduped[i]?.match_score ?? 0.5,
        reasoning: deduped[i]?.ai_reasoning ?? null,
      }));
      await supabase.from("match_scores").upsert(scoreRows, {
        onConflict: "user_id,opportunity_id",
      });
    }

    return { inserted: inserted?.length ?? 0 };
  });

/** Public read for shareable detail page; bypasses RLS via service role. */
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

/** Recommended For You — uses match_scores, falls back to recent verified. */
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
      .order("match_score_default", { ascending: false })
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
      .order("created_at", { ascending: false })
      .limit(40);
    if (data.query) q = q.ilike("title", `%${data.query}%`);
    if (data.category && data.category !== "All")
      q = q.contains("categories", [data.category]);
    const { data: rows } = await q;
    return rows ?? [];
  });
