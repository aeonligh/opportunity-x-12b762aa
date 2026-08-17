import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

/*
  ══════════════════════════════════════════════════════════════════════════
  WHAT USED TO BE HERE, AND WHY IT IS NOT
  ══════════════════════════════════════════════════════════════════════════

  A module-scope block that called `runDeadlineIntelligenceCheck()` on startup
  and then every hour, on a `setInterval`. It read every user's saved
  opportunities out of the legacy `saved_opportunities` table and sent them
  email.

  It was the third door onto that job, and the one Phase 12 did not find: the
  two HTTP hooks were given a shared secret, and this needed no request at all.
  On a serverless target every cold start is a server start, so the schedule was
  neither hourly nor bounded — it was "once per instance, plus hourly for as long
  as that instance survives", which is a fan-out nobody chose.

  Retired with the rest of the legacy system in Phase 13. Reminders have real
  constitutional authority — CR-08 makes lateness a product failure — and a
  canonical implementation must read `opportunity_pursuits`, not the legacy
  store, and must be invoked by something that can be authorized. See
  `docs/PHASE_13_CONSOLIDATION.md` §D.
*/

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
