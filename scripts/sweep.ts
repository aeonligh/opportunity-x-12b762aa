/**
 * Run one discovery sweep.
 *
 *   npm run sweep                    every announcer in the registry
 *   npm run sweep -- ng-unn ng-ui    only these
 *
 * Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Writes to
 * `opportunity_observations` and `opportunity_verification_events`, both of
 * which are append-only in the database itself — this script cannot revise or
 * remove anything it has written, and neither can anything else.
 *
 * ── How pages are fetched ─────────────────────────────────────────────────
 *
 * Through Firecrawl when `FIRECRAWL_API_KEY` is set, directly otherwise. The
 * choice is printed before the run rather than inferred afterwards, because a
 * brokered retrieval and a direct one are different evidence: the request
 * leaves a different user agent and different addresses, and a site may answer
 * one and refuse the other.
 *
 * It is not a fallback chain. A sweep that asked for Firecrawl and quietly ran
 * direct would report coverage it did not have — on a JS-rendered announcement
 * page, a direct fetch returns an empty shell and the engine would faithfully
 * record that the publisher said nothing.
 *
 * ── Why there is no cron here ─────────────────────────────────────────────
 *
 * Scheduling is a deployment decision, and adding a schedule from inside the
 * repository would put a job in the record that nothing has ever run. The
 * sweep is invocable and unscheduled; the first real run moves
 * `lastRetrievalAt()` off null, which is the only evidence that will be
 * accepted that it happened.
 */

import { createClient } from "@supabase/supabase-js";
import { ANNOUNCERS } from "../src/lib/opportunity/announcers/registry.ts";
import { SupabaseObservationStore } from "../src/lib/opportunity/observation/supabase-store.ts";
import { SupabaseVerificationLog } from "../src/lib/opportunity/verification/log.ts";
import { runDiscovery } from "../src/lib/opportunity/discovery/run.ts";
import { changeDetection } from "../src/lib/opportunity/discovery/mechanisms/change-detection.ts";
import { institutionalChannels } from "../src/lib/opportunity/discovery/mechanisms/institutional-channels.ts";
import { firecrawlTransport } from "../src/lib/opportunity/discovery/transports/firecrawl.ts";

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. The sweep writes observations and will not run without somewhere durable to write them."
    );
    process.exitCode = 1;
    return;
  }

  const requested = process.argv.slice(2);
  const announcers =
    requested.length > 0 ? ANNOUNCERS.filter((a) => requested.includes(a.id)) : ANNOUNCERS;

  if (announcers.length === 0) {
    console.error(
      `No announcer matched ${requested.join(", ")}. Known ids: ${ANNOUNCERS.map((a) => a.id).join(", ")}`
    );
    process.exitCode = 1;
    return;
  }

  const transport = firecrawlTransport() ?? undefined;
  console.log(`Fetching ${transport ? "through Firecrawl" : "directly"}`);

  const db = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const report = await runDiscovery({
    store: new SupabaseObservationStore(db),
    verification: new SupabaseVerificationLog(db),
    mechanisms: [institutionalChannels({ announcers }), changeDetection()],
    transport,
  });

  console.log(`Discovery run ${report.startedAt} → ${report.finishedAt}`);
  console.log(`  announcers   ${announcers.length}`);
  console.log(`  requested    ${report.requested}`);
  console.log(`  retrieved    ${report.retrieved}`);
  console.log(`  unreachable  ${report.unreachable}`);
  console.log(`  skipped      ${report.skipped.length}`);

  for (const skip of report.skipped) {
    console.log(`    - ${skip.url}: ${skip.reason}`);
  }

  console.log(`  observations ${report.observationIds.length}`);
  console.log(`  watermark    ${report.retrievalWatermark ?? "null (nothing has ever been retrieved)"}`);
}

await main();
