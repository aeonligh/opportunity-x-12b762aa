import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertDevelopment } from "@/lib/lab-guard";

/**
 * The fixture laboratory's server boundary — development only.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS AT ALL
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Opportunity X's three product surfaces are authenticated, and they should be:
 * they read one person's declarations out of a database under row-level
 * security. But that makes the product impossible to *look at* without a
 * reachable Supabase and a real account — and for long stretches of this
 * project neither existed, so nobody could see the thing being built.
 *
 * The tempting fix is to drop `_authenticated` from the examples route. That
 * would be a production auth change made for a development convenience, and it
 * is exactly the kind of edit that survives into a deployment because it looks
 * like a routing tidy-up in a diff.
 *
 * So the laboratory gets its own door instead. Nothing about the authenticated
 * routes changes.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THE GUARD IS A RUNTIME CHECK AND NOT `import.meta.env.DEV`
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `import.meta.env.DEV` is compiled to `false` and dead-code-eliminated, which
 * sounds stronger than a runtime check and is weaker where it matters. It is a
 * *bundler* fact: it protects the client bundle and says nothing about whether
 * a server handler will run. A server function is registered by its own module
 * graph, so a route guarded only in the browser still leaves the handler
 * reachable by anyone who can post to its endpoint.
 *
 * `process.env.NODE_ENV` is read inside the handler, on the server, per request
 * — which is the thing an attacker would have to defeat. Both are used: the
 * route hides in the client, and this refuses on the server.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHAT THIS CAN AND CANNOT TOUCH
 * ══════════════════════════════════════════════════════════════════════════
 *
 * It never constructs a Supabase client, so there is no path from here to
 * anyone's data — not even a read. It holds no service-role key and takes no
 * user id from the request. The "person" is a constant. There is no session to
 * forge because there is no session at all.
 *
 * Declarations are real: they go through the same `InMemoryPursuitLog` and the
 * same projection the live surface uses, so pressing Interested here exercises
 * the actual write-and-read-back path rather than flipping a boolean. They live
 * in this process and die with it, which the surface says out loud — a
 * laboratory that implied durability would be making the one promise the
 * product refuses to make falsely.
 */

/** Held across requests so a declaration survives a navigation. */
const declarations = new Map<string, "interested" | "not-interested" | null>();

async function corpus() {
  const { demoCorpus } = await import("@/lib/opportunity/surface/demo");
  return demoCorpus(new Date().toISOString(), declarations);
}

/** Every specimen, as cards, plus whatever has been declared in this session. */
export const labSurface = createServerFn({ method: "GET" }).handler(async () => {
  assertDevelopment();
  const { scenarios } = await corpus();

  return {
    specimens: scenarios.map((s) => ({
      id: s.card.entityId,
      label: s.label,
      demonstrates: s.demonstrates,
      card: s.card,
      /*
        Whether the position on this card is the visitor's own.

        The laboratory now holds two kinds of declaration and they must not be
        narrated the same way. A specimen ships with a position already taken —
        that belongs to the fixture person, and telling the visitor "you said you
        were interested" about it would attribute a statement to someone who
        never made it. A position taken by pressing the button on this page *is*
        theirs. Same shape, different owner, so the surface is told which.
      */
      yours: declarations.has(s.card.entityId),
    })),
  };
});

/** One specimen, with everything underneath it. */
export const labInspect = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ id: z.string() }).parse(i))
  .handler(async ({ data }) => {
    assertDevelopment();
    const { scenarios } = await corpus();
    const found = scenarios.find((s) => s.card.entityId === data.id);
    return found
      ? {
          found: true as const,
          label: found.label,
          demonstrates: found.demonstrates,
          inspection: found.inspection,
          /** Whose position this is. See `labSurface` for why it is asked. */
          yours: declarations.has(data.id),
        }
      : { found: false as const };
  });

/**
 * What has been declared, as the saved surface shows it.
 *
 * Built by reading the corpus back rather than by reading the override map,
 * which is the whole point of the return leg: it proves the position survived a
 * write and a re-projection, instead of proving that a Map still holds what was
 * put into it a moment ago.
 *
 * A declaration whose opportunity no longer resolves keeps its row with a null
 * title. The person's statement is theirs and does not stop existing because the
 * thing it pointed at did — dropping the row would quietly edit what they said.
 */
export const labSaved = createServerFn({ method: "GET" }).handler(async () => {
  assertDevelopment();
  const { scenarios } = await corpus();

  const rows = scenarios.flatMap((s) => {
    const pursuit = s.card.pursuit;
    if (pursuit.state !== "declared") return [];
    return [
      {
        entityId: s.card.entityId,
        state: pursuit.declaration.state,
        declaredAt: pursuit.declaration.declaredAt,
        title: s.card.shown.statement,
        yours: declarations.has(s.card.entityId),
      },
    ];
  });

  rows.sort((a, b) => b.declaredAt.localeCompare(a.declaredAt));

  return rows.length === 0
    ? { state: "empty" as const }
    : { state: "declarations" as const, declarations: rows };
});

/**
 * Take a position, for real.
 *
 * Written to the log and read back through the projection on the next request,
 * so what the surface then shows is the stored state rather than an optimistic
 * echo of the button that was pressed.
 */
export const labDeclare = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        entityId: z.string(),
        state: z.enum(["interested", "not-interested"]),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    assertDevelopment();
    declarations.set(data.entityId, data.state);
    return { recorded: true as const };
  });

/** Withdraw one. `null` rather than a delete, so the specimen's own position
    does not silently come back. */
export const labWithdraw = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ entityId: z.string() }).parse(i))
  .handler(async ({ data }) => {
    assertDevelopment();
    declarations.set(data.entityId, null);
    return { recorded: true as const };
  });
