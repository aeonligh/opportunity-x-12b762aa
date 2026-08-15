import "@/lib/server-only";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SupabaseObservationStore } from "./observation/supabase-store";
import type { ObservationStore } from "./observation/types";
import { SupabaseVerificationLog, type VerificationLog } from "./verification/log";

/**
 * Which durable record this deployment has, if any.
 *
 * ── Why the service role, and not the signed-in person's session ──────────
 *
 * Observations are facts about public web pages. They are not owned by anyone,
 * there is no `owner_id`, and the tables carry no person-scoped column — so
 * there is no row-level decision a user session could make that the service
 * role does not make identically. What the service role adds is the ability to
 * *write*, which the crawler needs and no browser session should have.
 *
 * The read path could use the anon key: both tables grant `select` to
 * `authenticated` with a `using (true)` policy, precisely so the inspection
 * path — Finding, Evidence, Source, Observation — does not dead-end. It uses
 * the admin client anyway, for one reason: the Step is resolved server-side in
 * a server component, and giving the read and the write the same client means
 * one place to reason about which credentials touch this data.
 *
 * ── Why null is a real answer ─────────────────────────────────────────────
 *
 * When the service-role credentials are unset this returns null rather than
 * substituting an in-memory store.
 * An ephemeral store in a request handler would report "no observations" on
 * every invocation while *looking* configured to anyone reading the code, and a
 * component that appears wired and is not is worse than one that is plainly
 * absent.
 *
 * A caller with no store resolves `unknown` — Opportunity X cannot see — which is the
 * truth.
 */

export interface OpportunityRecord {
  store: ObservationStore;
  verification: VerificationLog;
}

/**
 * Whether this deployment has service-role credentials at all.
 *
 * Read from the environment rather than by testing `supabaseAdmin` against
 * null, because `supabaseAdmin` is a lazy Proxy and is *never* null: it
 * constructs its client — and throws, when the variables are missing — on first
 * property access. `const db = supabaseAdmin; if (db === null)` touches no
 * property, so the check was dead code and the null branch below was
 * unreachable.
 *
 * The consequence reached a reader. With nothing configured, the surface fell
 * through to its catch and said "I could not read what I have observed", which
 * claims a record exists and could not be read. The truth was that no record is
 * configured at all. Both resolve to Unknown, and this product's whole argument
 * is that it says *which* Unknown — `resolveDeclarations` already distinguished
 * the two, and this path silently did not.
 *
 * Read inside the function, never at module scope: Workers bind environment
 * per request, and a module-scope read is evaluated once at cold start.
 */
function hasServiceRoleCredentials(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function opportunityRecord(): OpportunityRecord | null {
  if (!hasServiceRoleCredentials()) return null;

  return {
    store: new SupabaseObservationStore(supabaseAdmin),
    verification: new SupabaseVerificationLog(supabaseAdmin),
  };
}

/** Just the observation store, for callers that do not touch verification. */
export function observationStore(): ObservationStore | null {
  return opportunityRecord()?.store ?? null;
}

/** Why there is no record, in a sentence a status surface can render. */
export const NO_RECORD_REASON =
  "No durable observation record is configured on this deployment, so no source has been observed.";
