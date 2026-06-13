import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TrackInput = z.object({
  opportunity_id: z.string().uuid(),
  event_type: z.enum(["view", "save", "share", "apply_click"]),
});

/**
 * Public event tracker. Anyone (anon or signed-in) can log an event.
 * Increments view_count on the opportunity for 'view' events.
 */
export const trackEvent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TrackInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("opportunity_analytics").insert({
      opportunity_id: data.opportunity_id,
      event_type: data.event_type,
    });
    if (data.event_type === "view") {
      await supabaseAdmin.rpc("increment_views", { _id: data.opportunity_id }).catch(() => {
        // RPC may not exist; fall back to direct update.
        return supabaseAdmin
          .from("opportunities")
          .update({ views_count: 1 })
          .eq("id", data.opportunity_id);
      });
    }
    return { ok: true };
  });
