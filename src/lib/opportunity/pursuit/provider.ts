import "@/lib/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabasePursuitLog } from "./supabase-log";
import type { PursuitLog } from "./types";

/**
 * Which durable pursuit log this deployment has, if any.
 *
 * ── Why the person's own client, and not the service role ─────────────────
 *
 * Declarations are person-owned. The table's policies are scoped to
 * `auth.uid()`, so going through the person's session is what makes "nobody
 * else can read what you said" true at the database rather than in application
 * code the next caller could bypass. That is the opposite of the observation
 * store, whose rows have no owner and need the service role to be written at
 * all.
 *
 * ── Two failure modes, kept apart ─────────────────────────────────────────
 *
 * **Nothing configured.** No Supabase environment, so there is no log. The
 * surface reads this before offering the control and says plainly that it
 * cannot keep a declaration — because letting someone press Interested and then
 * telling them it was not recorded is a refusal disguised as an interaction.
 *
 * **Configured but not migrated.** The environment is set and the table is
 * absent, because `20260810160000_opportunity_pursuit_and_delivery.sql` has not
 * been applied. The adapter then errors on the query and the action reports the
 * real reason. That is deliberately *not* pre-empted by a capability probe on
 * every render: a probe would add a round trip to every card, and the honest
 * error already reaches the person.
 *
 * The moment the migration lands, both paths light up with no code change here.
 */
export function pursuitLogFor(db: SupabaseClient | null): PursuitLog | null {
  if (db === null) return null;
  return new SupabasePursuitLog(db);
}

/**
 * Whether this deployment is configured to keep a declaration at all.
 *
 * ── What was wrong with this ──────────────────────────────────────────────
 *
 * It read `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
 * — Next.js names, carried across with the engine. This application is built on
 * TanStack Start over Vite, which never sets them, so the function returned
 * `false` on every deployment including a correctly configured one.
 *
 * It was also never called: the routes passed `canPersistPursuit` as a literal
 * `true`. So the dead default was harmless only by accident, and the surface
 * offered the control without checking anything.
 *
 * The names now match what `requireSupabaseAuth` actually requires, so this
 * agrees with the middleware rather than with a different framework.
 *
 * ── What it still does not establish ──────────────────────────────────────
 *
 * That the migration has been applied. Nothing short of a query does. The
 * surface therefore prefers `pursuitsFor`'s `readable`, which is derived from a
 * read it performs anyway; this remains the answer where no read has happened.
 */
export function canKeepDeclarations(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);
}

export const NO_PURSUIT_LOG_REASON =
  "No durable record of what you tell me about an opportunity is configured on this deployment.";
