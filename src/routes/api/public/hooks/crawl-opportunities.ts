/**
 * Public cron hook that runs the WWW-first crawl pipeline.
 * Invoked daily by pg_cron (06:00 UTC). Idempotent via opportunities.url_hash.
 */
import { createFileRoute } from "@tanstack/react-router";
import { runScheduledCrawl } from "@/lib/intelligence.functions";

export const Route = createFileRoute("/api/public/hooks/crawl-opportunities")({
  server: {
    handlers: {
      POST: async () => {
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
