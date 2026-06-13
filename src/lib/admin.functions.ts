import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
}

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { admin: !!data };
  });

const IdInput = z.object({ id: z.string().uuid() });
const FeatureInput = z.object({ id: z.string().uuid(), featured: z.boolean() });

export const approveOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => IdInput.parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("opportunities").update({ verified: true }).eq("id", data.id);
    return { ok: true };
  });

export const deleteOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => IdInput.parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("opportunities").delete().eq("id", data.id);
    return { ok: true };
  });

export const setFeatured = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => FeatureInput.parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("opportunities")
      .update({ featured: data.featured })
      .eq("id", data.id);
    return { ok: true };
  });

export const adminListPending = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("opportunities")
      .select(
        "id, title, organization, category, categories, source_url, apply_url, verification_score, verified, featured, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

export const adminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("opportunity_analytics")
      .select("event_type, opportunity_id");
    const totals: Record<string, number> = {
      view: 0,
      save: 0,
      share: 0,
      apply_click: 0,
    };
    const perOpp: Record<string, Record<string, number>> = {};
    for (const r of rows ?? []) {
      totals[r.event_type] = (totals[r.event_type] ?? 0) + 1;
      perOpp[r.opportunity_id] ??= { view: 0, save: 0, share: 0, apply_click: 0 };
      perOpp[r.opportunity_id][r.event_type] =
        (perOpp[r.opportunity_id][r.event_type] ?? 0) + 1;
    }
    return { totals, perOpp };
  });
