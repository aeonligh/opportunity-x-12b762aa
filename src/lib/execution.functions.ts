import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MODEL = "google/gemini-2.5-flash";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callGemini(messages: Array<{ role: string; content: string }>, jsonMode = true) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
  
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${apiKey}`, 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limit reached. Try again shortly.");
    if (res.status === 402)
      throw new Error("AI credits exhausted. Add credits to continue.");
    throw new Error(`AI gateway error (${res.status}): ${text.slice(0, 200)}`);
  }

  const payload = await res.json();
  const content: string = payload?.choices?.[0]?.message?.content ?? "{}";
  
  try {
    return jsonMode ? JSON.parse(content) : content;
  } catch {
    return jsonMode ? {} : content;
  }
}

// ============ APPLICATIONS ============

export const getUserApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("applications")
      .select(`
        *,
        opportunity:opportunities(id, title, organization, category, categories, opportunity_type, location, deadline, description, ai_insight, apply_url, image_url, tags)
      `)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    
    if (error) throw error;
    return data || [];
  });

export const trackApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      opportunityId: z.string().uuid(),
      status: z.enum(['Interested', 'Preparing', 'Submitted', 'Interview', 'Accepted', 'Rejected']),
      notes: z.string().optional().nullable(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { opportunityId, status, notes } = data;

    // Fetch opportunity title for notification
    const { data: op } = await supabase
      .from("opportunities")
      .select("title")
      .eq("id", opportunityId)
      .maybeSingle();
    const opTitle = op?.title || "an opportunity";

    // Check if it already exists to see if it's a new or updated tracking
    const { data: existing } = await supabase
      .from("applications")
      .select("status")
      .eq("user_id", userId)
      .eq("opportunity_id", opportunityId)
      .maybeSingle();

    const { data: upserted, error } = await supabase
      .from("applications")
      .upsert({
        user_id: userId,
        opportunity_id: opportunityId,
        status,
        notes: notes || null,
        submitted_at: status === "Submitted" && (!existing || existing.status !== "Submitted") ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,opportunity_id",
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger notification
    const verb = existing ? "updated" : "tracked";
    await supabase.from("notifications").insert({
      user_id: userId,
      title: existing ? "Application Updated" : "Application Tracked",
      message: `You ${verb} your application for "${opTitle}" to "${status}".`,
      read: false,
    });

    return upserted;
  });

export const deleteApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      opportunityId: z.string().uuid(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("user_id", userId)
      .eq("opportunity_id", data.opportunityId);
    
    if (error) throw error;
    return { success: true };
  });

// ============ ELIGIBILITY ENGINE ============

export const checkEligibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      opportunityId: z.string().uuid(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { opportunityId } = data;

    // Load profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    // Load opportunity
    const { data: op } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", opportunityId)
      .maybeSingle();

    if (!op) throw new Error("Opportunity not found");

    const system = `You are the Opportunity X Eligibility Engine.
Compare the student's profile against the opportunity details.
Evaluate if they meet standard requirements: education level, field of study, country of origin/residence, career interests, and skills.
Return ONLY JSON in the following format:
{
  "score": number (0 to 100 representing match percentage),
  "requirements_met": ["Requirement 1 description", "Requirement 2 description", ...],
  "requirements_missing": ["Missing Requirement 1 description", ...]
}`;

    const user = `Student Profile:
- Country: ${profile?.country ?? "Unknown"}
- University: ${profile?.university ?? "Unknown"}
- Course of Study: ${profile?.course_of_study ?? "Unknown"}
- Degree Type: ${profile?.degree_type ?? "Unknown"}
- Level of Study: ${profile?.level_of_study ?? "Unknown"}
- Career Interests: ${profile?.career_interests?.join(", ") || "None specified"}
- Skills: ${profile?.skill_tags?.join(", ") || "None specified"}
- Bio/Info: ${profile?.bio ?? "None specified"}

Opportunity Details:
- Title: ${op.title}
- Organization: ${op.organization}
- Category: ${op.category}
- Type: ${op.opportunity_type ?? "Unknown"}
- Location: ${op.location ?? "Global"}
- Description: ${op.description ?? "No description provided."}

Return the eligibility match score and the checklist of requirements.`;

    const result = await callGemini([
      { role: "system", content: system },
      { role: "user", content: user }
    ], true);

    const score = typeof result.score === "number" ? result.score : 50;
    const met = Array.isArray(result.requirements_met) ? result.requirements_met : [];
    const missing = Array.isArray(result.requirements_missing) ? result.requirements_missing : [];

    // Store in eligibility_results
    const { data: cached, error } = await supabase
      .from("eligibility_results")
      .upsert({
        user_id: userId,
        opportunity_id: opportunityId,
        score,
        requirements_met: met,
        requirements_missing: missing,
        checked_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,opportunity_id"
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger notification
    await supabase.from("notifications").insert({
      user_id: userId,
      title: "Eligibility Checked",
      message: `Your eligibility match score for "${op.title}" is ${score}%.`,
      read: false,
    });

    return cached;
  });

export const getEligibilityResult = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ opportunityId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: result } = await supabase
      .from("eligibility_results")
      .select("*")
      .eq("user_id", userId)
      .eq("opportunity_id", data.opportunityId)
      .maybeSingle();
    return result;
  });

// ============ AI SOP GENERATOR ============

export const generateSOP = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      opportunityId: z.string().uuid(),
      type: z.enum(['Scholarship Essay', 'Motivation Letter', 'Personal Statement', 'Study Plan']),
      careerGoals: z.string().min(10, "Please outline your career goals in more detail."),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { opportunityId, type, careerGoals } = data;

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    const { data: op } = await supabase.from("opportunities").select("*").eq("id", opportunityId).maybeSingle();
    if (!op) throw new Error("Opportunity not found");

    const system = `You are a professional academic consultant and copywriter.
Generate a high-quality, persuasive ${type} for the specified opportunity, tailored to the student's profile and career goals.
Use a formal, elegant, and student-focused tone. Highlight achievements, alignment with the opportunity, and long-term potential.
Return ONLY JSON in the following format:
{
  "content": "Full text of the generated document with paragraphs separated by double newlines (\\n\\n). Do NOT use markdown bold/italics inside the text. Keep paragraphs professional and structured."
}`;

    const user = `Student Profile:
- Name: ${profile?.display_name ?? "Student"}
- Country: ${profile?.country ?? "Unknown"}
- University: ${profile?.university ?? "Unknown"}
- Course of study: ${profile?.course_of_study ?? "Unknown"}
- Degree type: ${profile?.degree_type ?? "Unknown"}
- Level of study: ${profile?.level_of_study ?? "Unknown"}
- Career Goals: ${careerGoals}
- Skills: ${profile?.skill_tags?.join(", ") || "None specified"}
- Bio: ${profile?.bio ?? "None specified"}

Opportunity details:
- Title: ${op.title}
- Organization: ${op.organization}
- Description: ${op.description ?? ""}

Generate the ${type} now.`;

    const result = await callGemini([
      { role: "system", content: system },
      { role: "user", content: user }
    ], true);

    const content = result.content || "Failed to generate SOP";

    const { data: inserted, error } = await supabase
      .from("generated_sops")
      .insert({
        user_id: userId,
        opportunity_id: opportunityId,
        type,
        content,
        career_goals: careerGoals
      })
      .select()
      .single();

    if (error) throw error;

    // Add notification
    await supabase.from("notifications").insert({
      user_id: userId,
      title: `${type} Generated`,
      message: `Your custom ${type} for "${op.title}" is ready.`,
      read: false
    });

    return inserted;
  });

export const getUserSOPs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("generated_sops")
      .select(`
        *,
        opportunity:opportunities(id, title, organization)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data || [];
  });

// ============ AI CV OPTIMIZER ============

export const optimizeCV = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      cvText: z.string().min(50, "Please paste at least 50 characters of your CV content."),
      opportunityId: z.string().uuid().optional().nullable(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { cvText, opportunityId } = data;

    let opDetails = "";
    if (opportunityId) {
      const { data: op } = await supabase.from("opportunities").select("*").eq("id", opportunityId).maybeSingle();
      if (op) {
        opDetails = `Tailor the suggestions for this opportunity:
- Title: ${op.title}
- Organization: ${op.organization}
- Description: ${op.description}`;
      }
    }

    const system = `You are a professional CV coach and recruiter.
Analyze the provided CV text content. Evaluate:
1. Formatting: Readability, structure, bullet points
2. Keywords: Presence of strong industry action verbs and relevant terms
3. Achievements: Quantification of results, clear impact statements
4. Relevance: Alignment with standard opportunity or scholarship requirements ${opDetails ? '(specifically the targeted opportunity)' : ''}

Return ONLY JSON in the following format:
{
  "score": number (0 to 100),
  "suggestions": {
    "formatting": ["suggestion 1", "suggestion 2", ...],
    "keywords": ["suggestion 1", "suggestion 2", ...],
    "achievements": ["suggestion 1", "suggestion 2", ...],
    "relevance": ["suggestion 1", "suggestion 2", ...]
  }
}`;

    const user = `Here is the CV text to analyze:
---
${cvText}
---
Please evaluate and score it.`;

    const result = await callGemini([
      { role: "system", content: system },
      { role: "user", content: user }
    ], true);

    const score = typeof result.score === "number" ? result.score : 70;
    const suggestions = result.suggestions ?? { formatting: [], keywords: [], achievements: [], relevance: [] };

    const { data: inserted, error } = await supabase
      .from("cv_optimizations")
      .insert({
        user_id: userId,
        score,
        suggestions
      })
      .select()
      .single();

    if (error) throw error;

    // Send a notification
    await supabase.from("notifications").insert({
      user_id: userId,
      title: "CV Optimized",
      message: `Your CV analysis is ready. Score: ${score}/100. Check the vault for details.`,
      read: false
    });

    return inserted;
  });

export const getLatestCVOptimization = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("cv_optimizations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  });

// ============ NOTIFICATIONS ============

export const getNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    
    if (error) throw error;
    return data || [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", data.id)
      .eq("user_id", userId);
    
    if (error) throw error;
    return { success: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId);
    
    if (error) throw error;
    return { success: true };
  });

// ============ SUCCESS METRICS ============

export const getSuccessMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { count: savedCount } = await supabase
      .from("saved_opportunities")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const { data: apps } = await supabase
      .from("applications")
      .select("status")
      .eq("user_id", userId);

    const counts = {
      Interested: 0,
      Preparing: 0,
      Submitted: 0,
      Interview: 0,
      Accepted: 0,
      Rejected: 0,
    };

    if (apps) {
      for (const a of apps) {
        const s = a.status as keyof typeof counts;
        if (counts[s] !== undefined) {
          counts[s]++;
        }
      }
    }

    const totalSubmitted = counts.Submitted + counts.Interview + counts.Accepted + counts.Rejected;
    const acceptances = counts.Accepted;
    const successRate = totalSubmitted > 0 ? Math.round((acceptances / totalSubmitted) * 100) : 0;

    return {
      savedOpportunities: savedCount ?? 0,
      submitted: totalSubmitted,
      interviews: counts.Interview,
      acceptances: acceptances,
      successRate,
      counts,
    };
  });

export const triggerDeadlineCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { runDeadlineIntelligenceCheck } = await import("./deadline-intelligence.server");
    void runDeadlineIntelligenceCheck();
    return { triggered: true };
  });

