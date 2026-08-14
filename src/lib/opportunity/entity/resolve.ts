import {
  isRetrieved,
  type ObservedField,
  type SourceObservation,
} from "../observation/types";
import type { GroupedItem } from "./group";
import { entityIdFor, type EntityIdentity } from "./identity";
import type { EntityField, EntityReading, OpportunityEntity, Stakes } from "./types";

/**
 * Entity resolution — folding observed items into a belief.
 *
 * ── The rule that governs every line below ────────────────────────────────
 *
 * **A later observation never erases an earlier one.** When a source changes
 * what it says, the new value joins the old as a second reading; it does not
 * replace it. Whether the change is a correction, a new cycle, or a mistake is
 * a question for verification, and answering it here would be deciding on
 * recency alone — the failure mode where a page edited by an intern silently
 * overwrites a deadline three sources confirmed.
 *
 * The same rule now applies *within* one document. Two extractors reading one
 * field differently produce two claims, and both become readings. Taking the
 * first — which this module used to do — resolved a contradiction invisibly, at
 * the layer least able to explain it.
 *
 * ── What this module no longer does ───────────────────────────────────────
 *
 * It no longer groups. Deciding which observations describe one opportunity is
 * `group.ts`, because that decision needs the publisher's declared identity and
 * has to be able to say why — and because URL identity, which is all this
 * module could see, fails in both directions.
 */

const FIELDS: readonly ObservedField[] = [
  "title",
  "organiser",
  "opens",
  "deadline",
  "eligibility",
  "funding",
  "location",
  "how-to-apply",
];

/**
 * Build the field set from a group's items.
 *
 * Every distinct value becomes its own reading, whatever produced it. Two
 * readings on one field is a live contradiction and is left as one — resolving
 * it is verification's work, and collapsing it here makes the contradiction
 * unrepresentable exactly where it needs to be visible.
 */
function foldFields(members: readonly GroupedItem[]): EntityField[] {
  const fields: EntityField[] = [];

  for (const field of FIELDS) {
    const byValue = new Map<string, EntityReading>();

    for (const { observation, item } of members) {
      /*
        Every claim on the field, not the first. A document read by two
        extractors that disagree carries both, and the disagreement is the
        finding.
      */
      for (const claim of item.claims) {
        if (claim.field !== field) continue;

        /* The normalised form where the extractor produced one without
           guessing; the source's own words otherwise. Never a normalisation
           invented here. */
        const value = claim.normalised ?? claim.asStated;

        const existing = byValue.get(value);
        if (existing) {
          if (!existing.observedIn.includes(observation.id)) {
            existing.observedIn.push(observation.id);
          }
          if (!existing.extractedBy.includes(claim.extractedBy)) {
            existing.extractedBy.push(claim.extractedBy);
          }
          if (observation.retrievedAt < existing.firstSeenAt) {
            existing.firstSeenAt = observation.retrievedAt;
            existing.firstSourceClass = observation.source.sourceClass;
          }
          if (observation.retrievedAt > existing.lastSeenAt) {
            existing.lastSeenAt = observation.retrievedAt;
          }
          /*
            Day precision survives only while every claim behind the value
            agrees it is a day. One source that gave a time has said something
            more exact, and the more exact statement wins — widening it back to
            a whole day would discard what that source actually published.
          */
          if (claim.precision === undefined) delete existing.precision;
          continue;
        }

        byValue.set(value, {
          value,
          ...(claim.precision ? { precision: claim.precision } : {}),
          observedIn: [observation.id],
          extractedBy: [claim.extractedBy],
          firstSourceClass: observation.source.sourceClass,
          firstSeenAt: observation.retrievedAt,
          lastSeenAt: observation.retrievedAt,
        });
      }
    }

    const readings = [...byValue.values()].sort((a, b) =>
      a.firstSeenAt.localeCompare(b.firstSeenAt)
    );
    if (readings.length > 0) {
      fields.push({ field, readings: readings as [EntityReading, ...EntityReading[]] });
    }
  }

  return fields;
}

export interface ResolveInput {
  /**
   * The items this entity is built from, each with the observation it came
   * from. Produced by `groupObservations` — the grouping decision is where
   * identity is established, and assembling members by hand bypasses it.
   */
  members: readonly GroupedItem[];
  /** What this entity is claimed to be. The id is derived from it. */
  identity: EntityIdentity;
  rationale: string;
  /**
   * How much is at stake, judged on the opportunity's own terms.
   *
   * Required rather than defaulted. A default would mean every entity nobody
   * considered was verified to the same depth as a webinar — and the one place
   * that matters is the life-changing case where the default is wrong.
   */
  stakes: Stakes;
  decidedAt: string;
  /**
   * Observations that touched this entity without contributing an item — a
   * failed re-check of its page, a retrieval nothing could read. Folded into
   * the resolution's observation list so the entity can still account for
   * every time AEON X looked, not only the times it saw something.
   */
  alsoObserved?: readonly SourceObservation[];
}

export type ResolveResult =
  | { entity: OpportunityEntity }
  /**
   * Refused, with the reason. The same discipline the evidence constructor
   * uses: a refusal carrying its reason can be surfaced and acted on; an
   * exception becomes an `unknown` that blames the system for something
   * specific and knowable.
   */
  | { defect: { reason: string } };

export function resolveEntity(input: ResolveInput): ResolveResult {
  if (input.members.length === 0) {
    return { defect: { reason: "No observed items were supplied." } };
  }

  const ordered = [...input.members].sort((a, b) =>
    a.observation.retrievedAt.localeCompare(b.observation.retrievedAt)
  );
  const first = ordered[0].observation;
  const last = ordered[ordered.length - 1].observation;

  const fields = foldFields(ordered);
  if (fields.length === 0) {
    return {
      defect: {
        reason:
          "The items carried no claims. An entity with no fields asserts an opportunity exists while saying nothing about it.",
      },
    };
  }

  const observationIds = [
    ...new Set([
      ...ordered.map((m) => m.observation.id),
      ...(input.alsoObserved ?? []).map((o) => o.id),
    ]),
  ] as [string, ...string[]];

  return {
    entity: {
      id: entityIdFor(input.identity),
      resolution: {
        decidedAt: input.decidedAt,
        method: input.identity.method,
        key: input.identity.key,
        rationale: input.rationale,
        observationIds,
      },
      fields,
      firstObservation: {
        observationId: first.id,
        retrievedAt: first.retrievedAt,
        sourceClass: first.source.sourceClass,
      },
      lastObservedAt: last.retrievedAt,
      stakes: input.stakes,
      declaredTypes: [
        ...new Set(
          ordered
            .map((m) => m.item.declaredType)
            .filter((t): t is string => typeof t === "string")
        ),
      ],
    },
  };
}

/**
 * Fold further items into an existing entity.
 *
 * `input.members` must be the **complete** set — everything already folded in,
 * plus the new. Readings are derived from items, so folding only the new ones
 * would silently drop every earlier reading and turn a revision into the
 * overwrite this layer exists to prevent. The store is append-only precisely so
 * the complete set is always available. The requirement is checked, not
 * documented and hoped for.
 *
 * Additive in both senses: the field set gains readings rather than losing
 * them, and the previous resolution is kept whole under `supersedes` so the
 * decision chain can be walked back to the first one. A revision that discarded
 * its predecessor would leave a corrected merge looking exactly like a merge
 * that was always right.
 */
export function reviseEntity(
  entity: OpportunityEntity,
  input: ResolveInput
): ResolveResult {
  const supplied = new Set(input.members.map((m) => m.observation.id));
  for (const o of input.alsoObserved ?? []) supplied.add(o.id);

  const dropped = entity.resolution.observationIds.filter((id) => !supplied.has(id));
  if (dropped.length > 0) {
    return {
      defect: {
        reason: `Revision must carry every observation already folded in; ${dropped.length} would have been dropped (${dropped.join(", ")}). Read them from the store and supply the complete set.`,
      },
    };
  }

  const revised = resolveEntity(input);
  if ("defect" in revised) return revised;

  const allIds = [
    ...new Set([
      ...entity.resolution.observationIds,
      ...revised.entity.resolution.observationIds,
    ]),
  ] as [string, ...string[]];

  return {
    entity: {
      ...revised.entity,
      /* Identity survives revision — that is what makes it a revision. */
      id: entity.id,
      resolution: {
        ...revised.entity.resolution,
        observationIds: allIds,
        supersedes: entity.resolution,
      },
      /* The first observation is a historical fact and never moves. */
      firstObservation:
        revised.entity.firstObservation.retrievedAt < entity.firstObservation.retrievedAt
          ? revised.entity.firstObservation
          : entity.firstObservation,
      lastObservedAt:
        revised.entity.lastObservedAt > entity.lastObservedAt
          ? revised.entity.lastObservedAt
          : entity.lastObservedAt,
    },
  };
}

/**
 * Retrievals that answered and produced no items.
 *
 * Not a defect list. A PDF circular nothing can parse yet, and a news page that
 * genuinely described no opportunity, are both real facts about what AEON X can
 * currently see — and the count of them per source is the measurement that says
 * how much of the corpus is out of reach. Dropping them would turn absence of
 * extraction into absence of an opportunity.
 */
export function unreadableObservations(
  observations: readonly SourceObservation[]
): { observation: SourceObservation; reason: string; mediaType: string }[] {
  const out: { observation: SourceObservation; reason: string; mediaType: string }[] = [];

  for (const observation of observations) {
    if (!isRetrieved(observation)) continue;
    if (observation.items.length > 0) continue;
    out.push({
      observation,
      reason: observation.unreadable?.reason ?? "No reason recorded.",
      mediaType: observation.unreadable?.mediaType ?? observation.content.contentType,
    });
  }

  return out;
}
