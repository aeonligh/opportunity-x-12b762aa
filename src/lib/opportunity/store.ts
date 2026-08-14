import "@/lib/server-only";
import { createAdminClient } from "@/lib/supabase/admin";
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
 * `createAdminClient()` returns null when `SUPABASE_SERVICE_ROLE_KEY` is unset,
 * and this returns null in turn rather than substituting an in-memory store.
 * An ephemeral store in a request handler would report "no observations" on
 * every invocation while *looking* configured to anyone reading the code, and a
 * component that appears wired and is not is worse than one that is plainly
 * absent.
 *
 * A caller with no store resolves `unknown` — AEON X cannot see — which is the
 * truth.
 */

export interface OpportunityRecord {
  store: ObservationStore;
  verification: VerificationLog;
}

export function opportunityRecord(): OpportunityRecord | null {
  const db = createAdminClient();
  if (db === null) return null;

  return {
    store: new SupabaseObservationStore(db),
    verification: new SupabaseVerificationLog(db),
  };
}

/** Just the observation store, for callers that do not touch verification. */
export function observationStore(): ObservationStore | null {
  return opportunityRecord()?.store ?? null;
}

/** Why there is no record, in a sentence a status surface can render. */
export const NO_RECORD_REASON =
  "No durable observation record is configured on this deployment, so no source has been observed.";
