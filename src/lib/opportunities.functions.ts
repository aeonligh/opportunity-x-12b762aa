/**
 * Public + protected server functions for opportunities.
 * Imports of `client.server` happen inside handlers so this file stays client-safe.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const DiscoverInput = z.object({
  query: z.string().max(200).optional().default(""),
  category: z.string().max(50).optional().default("All"),
});

interface AIOpportunity {
  title: string;
  organization: string;
  category: string;
  location: string;
  deadline: string;
  description: string;
  ai_insight: string;
  apply_url: string;
}

/**
 * Discover new opportunities via Lovable AI Gateway, persist them, and return
 * the freshly inserted rows + the user's recent opportunities.
 */
export const discoverOpportunities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DiscoverInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Read profile for personalization
    const { data: profile } = await supabase
      .from("profiles")
      .select("country, education_level, interests, bio")
      .eq("id", userId)
      .maybeSingle();

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are Opportunity X's discovery agent. Generate a JSON array of 6 realistic, current opportunities (scholarships, internships, fellowships, grants, certifications, or webinars) tailored to the user. Use REAL well-known programs when possible (e.g. Google PhD Fellowship, MIT MicroMasters, Chevening Scholarship). Return ONLY a JSON object: {"opportunities": [...]} where each item has exactly: title, organization, category, location, deadline, description, ai_insight, apply_url. Keep description under 240 chars. ai_insight is a 1-2 sentence reason it fits this specific user.`;

    const userPrompt = `User profile:
- Country: ${profile?.country ?? "Global"}
- Education: ${profile?.education_level ?? "Unspecified"}
- Interests: ${(profile?.interests ?? []).join(", ") || "general"}
- Bio: ${profile?.bio ?? "n/a"}

Search query: ${data.query || "(none)"}
Category filter: ${data.category}

Return personalized opportunities now.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
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
    let parsed: { opportunities?: AIOpportunity[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { opportunities: [] };
    }

    const items = (parsed.opportunities ?? []).slice(0, 8).map((o) => ({
      title: String(o.title ?? "Untitled").slice(0, 200),
      organization: String(o.organization ?? "Unknown").slice(0, 200),
      category: String(o.category ?? "Other").slice(0, 50),
      location: String(o.location ?? "Global").slice(0, 120),
      deadline: String(o.deadline ?? "").slice(0, 60) || null,
      description: String(o.description ?? "").slice(0, 600) || null,
      ai_insight: String(o.ai_insight ?? "").slice(0, 400) || null,
      apply_url: String(o.apply_url ?? "").slice(0, 500) || null,
      discovered_by: userId,
    }));

    if (items.length === 0) return { inserted: [] as { id: string }[] };

    const { data: inserted, error } = await supabase
      .from("opportunities")
      .insert(items)
      .select("id");
    if (error) throw error;
    return { inserted: inserted ?? [] };
  });

/** Public read for shareable detail page; bypasses RLS via service role. */
export const getOpportunity = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("opportunities")
      .select(
        "id, title, organization, category, location, deadline, description, ai_insight, apply_url, image_url, created_at",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    return row;
  });
