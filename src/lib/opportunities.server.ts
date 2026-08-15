import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AuthedContext } from "@/integrations/supabase/context";

/**
 * Opportunity X's server boundary.
 *
 * The routes call this; this calls the engine. No route embeds domain logic,
 * and the engine knows nothing about routing.
 *
 * ── Why the engine is imported inside each handler ────────────────────────
 *
 * Its storage modules begin with `import "@/lib/server-only"`, which throws in
 * a browser. A top-level import would pull that into the client graph and the
 * page would fail before rendering.
 *
 * ── Why the person's client is passed down ────────────────────────────────
 *
 * `supabaseAdmin` holds the service-role key and bypasses row-level security.
 * Reading someone's saved opportunities with it would make every read unscoped
 * — one person's list readable while resolving another's. The authenticated
 * client comes from the middleware, so the database does the scoping.
 */

const authed = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]);
type Ctx = AuthedContext;

/** Everything currently worth showing, or the honest reason there is nothing. */
export const listOpportunities = authed.handler(async ({ context }) => {
  const { userId, supabase } = context as Ctx;
  const { resolveCards, pursuitsFor } = await import("@/lib/opportunity/surface/service");
  const saved = await pursuitsFor(userId, supabase);
  return resolveCards(userId, supabase, { pursuits: saved });
});

/** One opportunity, with everything underneath it. */
export const getOpportunity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string() }).parse(i))
  .handler(async ({ context, data }) => {
    const { userId, supabase } = context as Ctx;
    const { resolveInspection } = await import("@/lib/opportunity/surface/service");
    return resolveInspection(userId, data.id, supabase);
  });

/** What the person has said they care about. */
export const listSaved = authed.handler(async ({ context }) => {
  const { userId, supabase } = context as Ctx;
  const { resolveDeclarations } = await import("@/lib/opportunity/surface/service");
  return resolveDeclarations(userId, supabase);
});

/**
 * Fixture opportunities, for validating the surfaces before discovery has run.
 *
 * A separate function from the live ones on purpose. One function that returned
 * fixtures or real evidence depending on a flag is a single refactor away from
 * serving fixtures as evidence.
 */
export const fixtureOpportunities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { demoCorpus } = await import("@/lib/opportunity/surface/demo");
    const { scenarios } = await demoCorpus();
    return scenarios.map((s) => ({ id: s.id, label: s.label, card: s.card }));
  });

/**
 * Saying you care about something, or that you do not.
 *
 * Refuses rather than pretends. Nothing reports success unless the write
 * actually happened — telling someone their answer was kept when it was not is
 * worse than telling them it could not be.
 */
export const saveOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string(), state: z.enum(["interested", "not-interested"]) }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const { userId, supabase } = context as Ctx;
    const { pursuitLogFor } = await import("@/lib/opportunity/pursuit/provider");
    const { declaration } = await import("@/lib/opportunity/pursuit/types");

    const log = pursuitLogFor(supabase);
    if (log === null) {
      return {
        saved: false as const,
        because: "There is nowhere durable to keep this yet, so I won't pretend to remember it.",
      };
    }
    await log.declare(
      declaration({
        personId: userId,
        entityId: data.id,
        state: data.state,
        declaredAt: new Date().toISOString(),
      }),
    );
    return { saved: true as const };
  });

/** Taking it back. The person owns what they said about their own life. */
export const unsaveOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string() }).parse(i))
  .handler(async ({ context, data }) => {
    const { userId, supabase } = context as Ctx;
    const { pursuitLogFor } = await import("@/lib/opportunity/pursuit/provider");
    const log = pursuitLogFor(supabase);
    if (log === null)
      return { saved: false as const, because: "Nothing durable to remove it from." };
    await log.withdraw(userId, data.id);
    return { saved: true as const };
  });
