/**
 * Scheduled crawl hook.
 *
 * Runs the WWW-first crawl pipeline with the service role. Invoked by pg_cron;
 * idempotent via `opportunities.url_hash`.
 *
 * **Not public despite the path.** `public` here is the routing convention for
 * "outside the authenticated layout", never a statement that anyone may call
 * this. See `src/lib/cron-authorization.ts` — it refuses without the scheduler's
 * shared secret, and refuses when no secret is configured.
 */
import { createFileRoute } from "@tanstack/react-router";
import { runScheduledCrawl } from "@/lib/intelligence.functions";
import { authorizeCronRun } from "@/lib/cron-authorization";

export const Route = createFileRoute("/api/public/hooks/crawl-opportunities")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const allowed = authorizeCronRun(request);
        if (!allowed.allowed) {
          return new Response(JSON.stringify({ ok: false, error: allowed.because }), {
            status: allowed.status,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const result = await runScheduledCrawl();
          return new Response(JSON.stringify({ ok: true, ...result }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: String(e).slice(0, 400) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
