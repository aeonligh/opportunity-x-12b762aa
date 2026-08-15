import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * What `requireSupabaseAuth` puts on a server function's context.
 *
 * TanStack types middleware context structurally, and every handler that needed
 * it was re-declaring its own shape locally — several as `{ supabase: any }`,
 * which then required an `as never` at each call into the engine to get past the
 * mismatch. Two casts in a row is not type safety; it is type silence, and it
 * hid the one thing worth knowing here.
 *
 * That thing: **this client is the signed-in person's, and row-level security
 * applies to it.** `supabaseAdmin` holds the service-role key and bypasses RLS
 * entirely, so the two are interchangeable to a type checker and catastrophically
 * different at runtime — an admin client reading someone's saved opportunities
 * returns everyone's. Naming the authenticated one gives the distinction
 * somewhere to live.
 */
export interface AuthedContext {
  /** Scoped to the bearer token. Never the service-role client. */
  supabase: SupabaseClient<Database>;
  userId: string;
}
