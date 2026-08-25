import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Declaring a position on an opportunity.
 *
 * The only thing on the product surface the person writes. It changes their
 * relationship to an opportunity and nothing about the opportunity: no verdict
 * moves, no judgment is recomputed, and `judgeAll` never sees it.
 *
 * Refuses rather than pretends. When nothing durable is configured the action
 * says so and the control renders the reason — optimistically showing
 * "Interested" and losing it on the next request would be telling someone their
 * answer was kept when it was not, and it is their fact, not the system's.
 */
const Declared = z.object({
  entityId: z.string(),
  state: z.enum(["interested", "not-interested"]),
});

export const declarePursuit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Declared.parse(input))
  .handler(async ({ context, data }) => {
    const { userId, supabase } = context as { userId: string; supabase: unknown };

    const { pursuitLogFor } = await import("@/lib/opportunity/pursuit/provider");
    const { declaration } = await import("@/lib/opportunity/pursuit/types");

    const log = pursuitLogFor(supabase as never);
    if (log === null) {
      return {
        recorded: false as const,
        limit:
          "I can’t keep this yet. Nowhere durable is configured to record what you tell me about an opportunity, so I won’t pretend to remember it.",
      };
    }

    await log.declare(
      declaration({
        personId: userId,
        entityId: data.entityId,
        state: data.state,
        declaredAt: new Date().toISOString(),
      }),
    );
    return { recorded: true as const };
  });

/**
 * Withdrawing one.
 *
 * A genuine delete, and the only one in the engine. A declaration is a fact
 * about a person and the Ownership Principle gives them the truth of their own
 * life; an observation is a fact about the world and nobody gets to unsay it.
 */
export const withdrawPursuit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ entityId: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const { userId, supabase } = context as { userId: string; supabase: unknown };

    const { pursuitLogFor } = await import("@/lib/opportunity/pursuit/provider");
    const log = pursuitLogFor(supabase as never);
    if (log === null) {
      return { recorded: false as const, limit: "There is nowhere durable to remove it from." };
    }
    await log.withdraw(userId, data.entityId);
    return { recorded: true as const };
  });
