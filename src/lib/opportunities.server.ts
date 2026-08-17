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

/**
 * Everything currently worth showing, or the honest reason there is nothing.
 *
 * `canKeepDeclarations` rides along because the surface has to know it *before*
 * offering the Interested control. It costs nothing extra: the declarations are
 * read once here for the cards, and whether that read worked is the answer.
 */
export const listOpportunities = authed.handler(async ({ context }) => {
  const { userId, supabase } = context as Ctx;
  const { resolveCards, pursuitsFor } = await import("@/lib/opportunity/surface/service");
  const saved = await pursuitsFor(userId, supabase);
  const result = await resolveCards(userId, supabase, { pursuits: saved.pursuits });
  return { result, canKeepDeclarations: saved.readable, whyNot: saved.because };
});

/** One opportunity, with everything underneath it. */
export const getOpportunity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string() }).parse(i))
  .handler(async ({ context, data }) => {
    const { userId, supabase } = context as Ctx;
    const { resolveInspection, pursuitsFor } = await import("@/lib/opportunity/surface/service");
    /* Same question as the list, asked the same way: can a declaration actually
       be kept, established before the control is offered rather than when it
       is pressed. */
    const saved = await pursuitsFor(userId, supabase);
    const resolution = await resolveInspection(userId, data.id, supabase);
    return { resolution, canKeepDeclarations: saved.readable, whyNot: saved.because };
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

/*
  ══════════════════════════════════════════════════════════════════════════
  WHY THERE IS NO WRITE IN THIS MODULE
  ══════════════════════════════════════════════════════════════════════════

  There used to be: `saveOpportunity` and `unsaveOpportunity`, a complete second
  pair of declaration functions writing to `opportunity_pursuits` through the
  same `pursuitLogFor` that `declarePursuit` and `withdrawPursuit` use.

  Nothing called them. `grep -rln "\bsaveOpportunity\b" src/ test/` returned only
  this file — so the product had **three** ways to record a declaration
  (`pursuit.functions.ts`, here, and the legacy `saved_opportunities` writes in
  the old card) and used exactly one.

  Two of the three are now gone. A duplicate write path that nothing calls is
  not harmless: it is the one a future change picks by accident, and it returns a
  differently-shaped answer (`{ saved }` rather than `{ recorded }`), so the
  surface that picked it would silently lose the read-back contract Phase 11
  established.

  **Declarations are written in exactly one place: `src/lib/pursuit.functions.ts`.**
  This module reads.
*/
