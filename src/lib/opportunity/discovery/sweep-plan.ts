import { ANNOUNCERS, type Announcer } from "../announcers/registry";
import { pilotAnnouncers } from "../announcers/pilot";
import type { DiscoveryMechanism } from "./mechanism";
import { institutionalChannels } from "./mechanisms/institutional-channels";
import { changeDetection } from "./mechanisms/change-detection";
import { openWebSearch } from "./mechanisms/open-web-search";

export type SweepPlan =
  | { ok: false; error: string }
  | { ok: true; scope: "pilot" | "registry"; dryRun: boolean; announcers: readonly Announcer[] };

/** Validate the entire request before credentials, network calls or writes. */
export function planSweep(args: readonly string[]): SweepPlan {
  const dryRun = args.includes("--dry-run");
  const pilot = args.includes("--pilot");
  const requested = [...new Set(args.filter((arg) => arg !== "--dry-run" && arg !== "--pilot"))];
  const unknown = requested.filter((id) => !ANNOUNCERS.some((announcer) => announcer.id === id));
  if (unknown.length > 0) {
    return {
      ok: false,
      error: `Unknown announcer or option: ${unknown.join(", ")}. Known ids: ${ANNOUNCERS.map((a) => a.id).join(", ")}`,
    };
  }
  if (pilot && requested.length > 0) {
    return {
      ok: false,
      error:
        "--pilot cannot be combined with announcer ids. Run the fixed pilot or select ids separately.",
    };
  }
  return {
    ok: true,
    scope: pilot ? "pilot" : "registry",
    dryRun,
    announcers: pilot
      ? pilotAnnouncers()
      : requested.length > 0
        ? ANNOUNCERS.filter((a) => requested.includes(a.id))
        : ANNOUNCERS,
  };
}

/** The pilot must not silently acquire the registry run's wider scope. */
export function mechanismsForSweep(plan: Extract<SweepPlan, { ok: true }>): DiscoveryMechanism[] {
  return plan.scope === "pilot"
    ? [institutionalChannels({ announcers: plan.announcers, followLinks: false })]
    : [institutionalChannels({ announcers: plan.announcers }), changeDetection(), openWebSearch()];
}
