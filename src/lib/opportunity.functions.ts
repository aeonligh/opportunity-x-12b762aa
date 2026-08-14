import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * The Opportunity engine's surfaces, as server functions.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THE ENGINE IS IMPORTED INSIDE THE HANDLERS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Every module under `lib/opportunity` that touches storage begins with
 * `import "@/lib/server-only"`, which throws in a browser. A top-level import
 * here would pull that into the client graph and the page would fail to load
 * before rendering anything. Importing inside the handler keeps the engine on
 * the server where it belongs.
 *
 * ── Why the client is passed in rather than created ───────────────────────
 *
 * `supabaseAdmin` carries the service-role key and bypasses RLS. Using it to
 * read declarations would make every read unscoped — one person's positions
 * readable while resolving another's. The authenticated client comes from
 * `requireSupabaseAuth`, so RLS does the scoping, and it is handed to the
 * engine rather than reached for.
 */

/** Nothing is authenticated until the middleware says so. */
const authed = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]);

/**
 * Your Next Best Step, with the person's declarations folded in.
 *
 * Returns `unknown` rather than throwing when nothing is configured or a read
 * fails. A surface that cannot see must say so; it must never report an
 * absence it did not establish.
 */
export const nextBestStep = authed.handler(async ({ context }) => {
  const { userId, supabase } = context as { userId: string; supabase: unknown };

  const { resolveNextBestStep } = await import("@/lib/core/step/service");
  const { pursuitsFor } = await import("@/lib/opportunity/surface/service");

  const pursuits = await pursuitsFor(userId, supabase as never);
  return resolveNextBestStep(userId, { pursuits });
});

/**
 * The opportunities behind the Step, as cards.
 *
 * The declarations are read once here and handed to the projection, rather than
 * the projection reading them again per card.
 */
export const opportunityCards = authed.handler(async ({ context }) => {
  const { userId, supabase } = context as { userId: string; supabase: unknown };

  const { resolveCards, pursuitsFor } = await import("@/lib/opportunity/surface/service");

  const pursuits = await pursuitsFor(userId, supabase as never);
  return resolveCards(userId, supabase as never, { pursuits });
});

/** One opportunity, with the evidence underneath it. */
export const opportunityInspection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ entityId: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const { userId, supabase } = context as { userId: string; supabase: unknown };

    const { resolveInspection } = await import("@/lib/opportunity/surface/service");
    return resolveInspection(userId, data.entityId, supabase as never);
  });

/** Everything the person has said, for the Ledger. */
export const declarations = authed.handler(async ({ context }) => {
  const { userId, supabase } = context as { userId: string; supabase: unknown };

  const { resolveDeclarations } = await import("@/lib/opportunity/surface/service");
  return resolveDeclarations(userId, supabase as never);
});

/**
 * The fixture laboratory.
 *
 * Authenticated like the rest, and deliberately a separate function from the
 * live ones: a single function that returned fixtures or real evidence
 * depending on a flag is one refactor away from serving fixtures as evidence,
 * which is the failure the whole arrangement exists to avoid.
 */
export const laboratory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { demoCorpus } = await import("@/lib/opportunity/surface/demo");
    return demoCorpus();
  });
