import { createFileRoute } from "@tanstack/react-router";
import { runDeadlineIntelligenceCheck } from "@/lib/deadline-intelligence.server";

/**
 * Public cron endpoint — invoked by pg_cron via pg_net.
 * Scans every user's saved + tracked opportunities and dispatches
 * email + in-app reminders at 30, 14, 7, 3, and 1 day tiers.
 * Duplicate-protected by the sent_reminders table.
 */
export const Route = createFileRoute("/api/public/hooks/deadline-reminders")({
  server: {
    handlers: {
      POST: async () => {
        try {
          await runDeadlineIntelligenceCheck();
          return new Response(JSON.stringify({ success: true, ranAt: new Date().toISOString() }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("[deadline-reminders] failed", err);
          return new Response(JSON.stringify({ success: false, error: String(err) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
