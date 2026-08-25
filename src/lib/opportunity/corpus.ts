import { groupObservations, type MergeCandidate } from "./entity/group";
import { resolveEntity, unreadableObservations } from "./entity/resolve";
import type { OpportunityEntity, Stakes } from "./entity/types";
import type { ObservationStore } from "./observation/types";
import type { VerificationLog } from "./verification/log";
import type { VerificationRecord } from "./verification/types";

/**
 * Deriving the corpus — entities and verification — from the append-only record.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY ENTITIES ARE DERIVED AND NOT STORED
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Class B — the entity graph, the current verification state, the person model —
 * must be reconstructible from Class A and may never be the sole record of
 * anything. Deriving entities on read is the strongest possible form of that
 * rule: there is no entity table to drift from the observations, because there
 * is no entity table.
 *
 * The cost is a fold on every read, and at this corpus size that is the right
 * trade. It stops being the right trade when the fold outgrows a request, and
 * the answer then is a materialised projection rebuilt from the log — not a
 * table that becomes the truth.
 *
 * Verification is the deliberate exception. Its transitions are the record, so
 * they are stored; the *current state* is still folded rather than kept.
 *
 * ── Grouping ──────────────────────────────────────────────────────────────
 *
 * Grouping is `entity/group.ts`, on the strongest identity the publisher
 * declared — an identifier, then a canonical URL, then the page URL. This fold
 * no longer groups by URL, because URL identity fails in both directions: many
 * URLs describe one opportunity, and one URL describes many.
 *
 * Under-merging remains the safe failure. Two entities that are really one
 * appear twice and their claims are not pooled; one entity that is really two
 * pools claims from different opportunities and reports agreement that never
 * existed. Given a choice, duplicate — and record a merge candidate so the
 * duplicate is visible rather than merely tolerated.
 */

/**
 * How much is at stake, when nothing has established it.
 *
 * Answers `life-changing` — the most demanding tier — and does so on purpose.
 * Stakes set how much corroboration verification requires and how quickly it
 * lapses, so the conservative direction is *more* evidence and *shorter*
 * freshness. An unclassified opportunity is therefore harder to verify and
 * harder to recommend, never easier.
 *
 * This is the opposite of the default the `ResolveInput` comment warns about.
 * The danger there is an unconsidered entity being verified as lightly as a
 * webinar; the danger here would be one being verified too heavily, which costs
 * a recommendation rather than a person's plans.
 *
 * A real classifier — reading funding, duration and relocation out of the
 * entity — is future work, and it can only lower this. It should have to argue
 * its way down.
 */
export function deriveStakes(): Stakes {
  return "life-changing";
}

export interface Corpus {
  entities: OpportunityEntity[];
  verifications: Map<string, VerificationRecord>;
  /** Null when nothing has ever been retrieved. Never defaulted. */
  searchedAt: string | null;
  /** Groups that resemble each other. Offered to an operator, never acted on. */
  mergeCandidates: MergeCandidate[];
  /**
   * Retrievals that answered and produced no items.
   *
   * Not failures. A PDF circular nothing can parse yet, and a news page that
   * genuinely described nothing, are both facts about what Opportunity X can see — and
   * counting them is the only way the coverage gap is measurable rather than
   * indistinguishable from an empty world.
   */
  unreadable: { url: string; reason: string; mediaType: string }[];
  /** Groups that resolved to no usable entity, with the reason. */
  defects: { key: string; reason: string }[];
}

/**
 * Read the store and fold it into the corpus the judgment layer consumes.
 *
 * Throws rather than degrading if the store cannot be read. A read failure is
 * not an empty corpus: returning one would let a database outage present as
 * "nothing better has appeared", which is a failure reported as a finding.
 * Callers turn the throw into `unknown` — Opportunity X cannot see.
 */
export async function deriveCorpus(
  store: ObservationStore,
  log: VerificationLog,
  options: { decidedAt: string },
): Promise<Corpus> {
  const searchedAt = await store.lastRetrievalAt();
  const observations = await store.readAll();

  const { groups, candidates } = groupObservations(observations);

  const entities: OpportunityEntity[] = [];
  const defects: { key: string; reason: string }[] = [];

  for (const group of groups) {
    const resolved = resolveEntity({
      members: group.members,
      identity: group.identity,
      rationale: group.rationale,
      stakes: deriveStakes(),
      decidedAt: options.decidedAt,
    });

    if ("defect" in resolved) {
      defects.push({ key: group.identity.key, reason: resolved.defect.reason });
      continue;
    }

    entities.push(resolved.entity);
  }

  return {
    entities,
    verifications: await log.readAll(),
    searchedAt,
    mergeCandidates: candidates,
    unreadable: unreadableObservations(observations).map((u) => ({
      url: u.observation.url,
      reason: u.reason,
      mediaType: u.mediaType,
    })),
    defects,
  };
}
