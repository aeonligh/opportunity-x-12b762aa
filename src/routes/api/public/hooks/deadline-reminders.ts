/**
 * Scheduled deadline-reminder hook.
 *
 * Scans every user's saved and tracked opportunities and dispatches email plus
 * in-app reminders at the 30, 14, 7, 3 and 1 day tiers. Duplicate-protected by
 * `sent_reminders`.
 *
 * **The most consequential endpoint in the product**, and until now the least
 * protected: it reads across every account and sends mail. `sent_reminders`
 * bounds repeats; it does not decide who may fire the job. That is
 * `src/lib/cron-authorization.ts`, which refuses without the scheduler's shared
 * secret and refuses when no secret is configured.
 */
import { createFileRoute } from "@tanstack/react-router";
import { runDeadlineIntelligenceCheck } from "@/lib/deadline-intelligence.server";
import { authorizeCronRun } from "@/lib/cron-authorization";

export const Route = createFileRoute("/api/public/hooks/deadline-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const allowed = authorizeCronRun(request);
        if (!allowed.allowed) {
          return new Response(JSON.stringify({ success: false, error: allowed.because }), {
            status: allowed.status,
            headers: { "Content-Type": "application/json" },
          });
        }

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
