import type { SourceObservation } from "../observation/types";
import { agrees, contestedFields, type OpportunityEntity } from "../entity/types";
import {
  CORROBORATION,
  type OpenState,
  type StoredVerdict,
  type VerificationBasis,
  type VerificationRecord,
  type VerificationResolution,
  type VerificationTransition,
} from "./types";

/** The fields whose disagreement makes an entity contradicted rather than merely noisy. */
const DECISIVE_FIELDS = ["deadline", "eligibility", "funding"] as const;

function addDays(iso: string, days: number): string {
  const at = new Date(iso);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString();
}

/**
 * Establish or re-establish verification for an entity.
 *
 * Returns a record whose `expiresAt` is **derived from the entity's stakes**,
 * never supplied and never read off a source. A caller cannot extend a
 * verification by passing a later date, because there is no parameter for one.
 */
export function establishVerification(
  entity: OpportunityEntity,
  observations: readonly SourceObservation[],
  now: string,
  previous?: VerificationRecord,
): VerificationRecord {
  const requirement = CORROBORATION[entity.stakes];

  const retrieved = observations.filter(
    (o): o is Extract<SourceObservation, { outcome: "retrieved" }> => o.outcome === "retrieved",
  );
  const unreachable = observations.filter((o) => o.outcome === "unreachable");

  const sourceIds = new Set(retrieved.map((o) => o.source.sourceId));
  const institutional = new Set(
    retrieved
      .filter((o) => o.source.sourceClass === "official" || o.source.sourceClass === "announcer")
      .map((o) => o.source.sourceId),
  );

  const basis: VerificationBasis = {
    distinctSources: sourceIds.size,
    institutionalSources: institutional.size,
    sourceClasses: [...new Set(retrieved.map((o) => o.source.sourceClass))],
    observationIds: observations.map((o) => o.id),
  };

  const { verdict, reason } = decide(entity, {
    requirement,
    basis,
    retrievedCount: retrieved.length,
    /*
      A source Opportunity X was watching that stops answering is evidence, not an
      outage to be retried past. It is only decisive when nothing else is still
      answering — one dead mirror among three live sources says nothing.
    */
    allSourcesSilent: retrieved.length === 0 && unreachable.length > 0,
  });

  const transition: VerificationTransition = {
    from: previous?.verdict ?? null,
    to: verdict,
    at: now,
    reason,
    observationId: observations.at(-1)?.id,
  };

  return {
    entityId: entity.id,
    verdict,
    establishedAt: now,
    /* Derived. The only place an expiry is ever produced. */
    expiresAt: addDays(now, requirement.freshnessDays),
    basis,
    transitions: previous ? [...previous.transitions, transition] : [transition],
  };
}

function decide(
  entity: OpportunityEntity,
  input: {
    requirement: (typeof CORROBORATION)[keyof typeof CORROBORATION];
    basis: VerificationBasis;
    retrievedCount: number;
    allSourcesSilent: boolean;
  },
): { verdict: StoredVerdict; reason: string } {
  if (input.allSourcesSilent) {
    return {
      verdict: "withdrawn",
      reason: "Every source I was watching stopped answering.",
    };
  }

  /*
    Contradiction is checked before corroboration, and that order is the whole
    point. Three sources that disagree about the deadline are not three sources
    agreeing about anything — counting them first would let volume outvote
    conflict, and the person would be shown a confident deadline the system has
    two readings of.
  */
  const contested = contestedFields(entity).filter((f) =>
    (DECISIVE_FIELDS as readonly string[]).includes(f.field),
  );
  if (contested.length > 0) {
    return {
      verdict: "contradicted",
      reason: `Sources disagree on ${contested.map((f) => f.field).join(", ")}.`,
    };
  }

  const { requirement, basis } = input;
  if (
    basis.distinctSources >= requirement.distinctSources &&
    basis.institutionalSources >= requirement.institutionalSources
  ) {
    return {
      verdict: "verified",
      reason: `${basis.distinctSources} independent sources (${basis.institutionalSources} institutional) meet the ${entity.stakes} threshold.`,
    };
  }

  return {
    verdict: "unverified",
    reason: `${basis.distinctSources} of ${requirement.distinctSources} independent sources and ${basis.institutionalSources} of ${requirement.institutionalSources} institutional; below the ${entity.stakes} threshold.`,
  };
}

/**
 * Read verification as of a moment.
 *
 * **This is where V1 is enforced.** A stored `verified` past its expiry
 * resolves to `expired`, and there is no code path that returns the stored
 * verdict without passing through this function's clock check. That matters
 * more than it looks: the alternative design — a job that demotes stale rows —
 * is correct only while the job runs, and the failure mode is silent, because a
 * row that should have been demoted looks exactly like one that shouldn't.
 *
 * Fails closed in the literal sense: when the clock is past the expiry the
 * answer is "not verified", whatever was stored.
 */
export function resolveVerification(
  record: VerificationRecord,
  now: string,
): VerificationResolution {
  const base = {
    establishedAt: record.establishedAt,
    expiresAt: record.expiresAt,
    basis: record.basis,
  };

  if (now >= record.expiresAt) {
    return { ...base, verdict: "expired", lapsedFrom: record.verdict };
  }

  return { ...base, verdict: record.verdict };
}

/**
 * Whether the opportunity is still open, derived.
 *
 * V4. Never reads a source's own statement about closure, because no source
 * states it reliably — programme pages stay up for years after the intake they
 * describe, and an announcement is never retracted.
 *
 * Answers `unknown` when there is no agreed deadline. That includes the case
 * where two sources give different deadlines: a contested deadline is not a
 * deadline, and picking the later one would be optimism written into a
 * function.
 */
export function deriveOpenState(entity: OpportunityEntity, now: string): OpenState {
  const field = entity.fields.find((f) => f.field === "deadline");

  if (!field) {
    return { state: "unknown", reason: "No deadline has been observed for this opportunity." };
  }

  if (!agrees(field)) {
    return {
      state: "unknown",
      reason: `Sources give ${field.readings.length} different deadlines.`,
    };
  }

  const reading = field.readings[0];
  const deadline = new Date(reading.value);
  if (Number.isNaN(deadline.getTime())) {
    return {
      state: "unknown",
      reason: `The observed deadline "${reading.value}" could not be read as a date.`,
    };
  }

  const iso = deadline.toISOString();

  /*
    ── When the source named a day and no hour ─────────────────────────────

    "Closes 30 September" means you may apply on the 30th. Compared as an
    instant it means the opposite: the normalised form is the *start* of the
    30th, so from 00:00:01 that morning the person is told the deadline passed —
    on the day the publisher said they still had. In Lagos, where most of this
    registry's announcers publish, that lands at 1 a.m. local on the final day.

    So a day-precision deadline stays open through the end of that day. The
    boundary is the end of the day in UTC, which is the latest instant any
    reading of the published date could mean, and the direction of that choice
    is deliberate: being told something is open shortly after it shut costs a
    wasted click, and being told it is shut while it is open costs the
    opportunity. The two errors are not the same size.

    `deadline` still reports the instant the source denoted. The widening
    decides open-or-closed; it does not rewrite what was published.
  */
  const closesAfter =
    reading.precision === "day" ? new Date(deadline.getTime() + DAY_MS - 1).toISOString() : iso;

  return now < closesAfter ? { state: "open", deadline: iso } : { state: "closed", deadline: iso };
}

const DAY_MS = 86_400_000;

/**
 * Has anything ever gone verified → unverified?
 *
 * The decisive test for whether decay actually works, and it is a monitor
 * rather than a comment because the answer must be measurable at any moment.
 * A system where this is permanently `false` has a verification model that only
 * ever ratchets upward, which is not decay — it is accumulation.
 *
 * `expired` does not count. Expiry is the clock doing its job; de-verification
 * is the system revising a belief on evidence, and conflating the two would let
 * a working clock stand in for a working model.
 */
export function hasEverDeverified(records: readonly VerificationRecord[]): boolean {
  return records.some((record) =>
    record.transitions.some(
      (t) =>
        t.from === "verified" &&
        (t.to === "unverified" || t.to === "contradicted" || t.to === "withdrawn"),
    ),
  );
}
