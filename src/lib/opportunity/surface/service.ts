import "@/lib/server-only";
import { deriveCorpus } from "../corpus";
import { agreedValue } from "../entity/types";
import { judgeAll } from "../judgment/service";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The person's own Supabase client, supplied by the caller.
 *
 * ── Why this is a parameter and not an import ─────────────────────────────
 *
 * In the Next.js codebase this engine came from, `createClient()` read the
 * request's cookies through `next/headers` and produced a client scoped to the
 * signed-in person, so RLS did the scoping. This repository has no equivalent
 * to import: its authenticated client is attached by the `requireSupabaseAuth`
 * middleware and lives in a server function's context.
 *
 * The only importable server client here is `supabaseAdmin`, which carries the
 * service-role key and **bypasses RLS entirely**. Reaching for it would have
 * made every read here unscoped — one person's declarations readable while
 * resolving another's — so it is deliberately not used.
 *
 * Passing the client in keeps the scoping where the request is. A caller with
 * no authenticated client passes null and gets the same honest `unknown` these
 * functions already return when nothing durable is configured.
 */
export type PersonClient = SupabaseClient | null;
import { pursuitLogFor, NO_PURSUIT_LOG_REASON } from "../pursuit/provider";
import type { PursuitResolution } from "../pursuit/types";
import { opportunityRecord } from "../store";
import { projectCard, type OpportunityCard } from "./card";
import { projectInspection, type OpportunityInspection } from "./inspection";

/**
 * Reading the product surface out of the live record.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * THE SAME THREE ANSWERS AS THE STEP, FOR THE SAME REASON
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A card that cannot be read and an opportunity that does not exist are
 * different facts, and a surface that renders both as "nothing here" has told
 * the person the wrong one half the time.
 *
 *   inspection — here it is.
 *   not-found  — nothing Opportunity X has observed resolves to that reference.
 *   unknown    — Opportunity X cannot see: no record configured, or the read failed.
 *
 * `not-found` is only reachable when the record was successfully read and did
 * not contain the entity. Anything else is `unknown`.
 */

export type InspectionResolution =
  | { state: "inspection"; inspection: OpportunityInspection }
  | { state: "not-found" }
  | { state: "unknown"; gap: string };

export type CardsResolution =
  | { state: "cards"; cards: OpportunityCard[]; searchedAt: string }
  | { state: "unknown"; gap: string };

const UNDECLARED: PursuitResolution = { state: "undeclared" };

/**
 * What the person has said about one opportunity.
 *
 * Falls back to `undeclared` when nothing is configured or the read fails. That
 * is the safe direction and the only one available: the alternative is failing
 * the whole surface because a person-owned side-record could not be read, and
 * the opportunity's facts do not depend on it. The control renders its own
 * limit separately, so nobody is shown "you haven't said either way" while
 * being led to believe it was checked.
 */
/** Everything the person has said, in one read. */
/**
 * What this person has declared, and whether that could be read at all.
 *
 * ── Why `readable` exists ─────────────────────────────────────────────────
 *
 * This used to return a bare map and swallow every failure into an empty one,
 * which made three different situations identical to the caller: this person has
 * declared nothing, the table has not been migrated, and the query failed. The
 * first is a fact about them; the other two are facts about the deployment.
 *
 * The consequence reached the surface. `canPersistPursuit` was passed as a
 * literal `true` by every route, so the Interested control was offered
 * unconditionally — and `InterestedControl`'s own contract says the opposite:
 * "Read before the control is offered, not discovered when it fails. Letting
 * someone press Interested and then telling them it could not be recorded is a
 * refusal disguised as an interaction."
 *
 * No extra round trip buys this. The route already reads declarations once per
 * page; this reports whether that read worked.
 */
export interface DeclarationsRead {
  pursuits: ReadonlyMap<string, PursuitResolution>;
  /** False when there is nowhere to keep a declaration, or the read failed. */
  readable: boolean;
  /** Why not, in the surface's own voice. Null when readable. */
  because: string | null;
}

export async function pursuitsFor(
  personId: string,
  client: PersonClient,
): Promise<DeclarationsRead> {
  const nothingKept = {
    pursuits: new Map<string, PursuitResolution>(),
    readable: false,
  };

  if (client === null) {
    return { ...nothingKept, because: NO_PURSUIT_LOG_REASON };
  }

  const log = pursuitLogFor(client);
  if (log === null) {
    return { ...nothingKept, because: NO_PURSUIT_LOG_REASON };
  }

  try {
    return { pursuits: await log.readAll(personId), readable: true, because: null };
  } catch {
    /*
      Most often the migration has not been applied. Not distinguished from any
      other read failure, because the person cannot act on the difference and
      guessing at the cause would be a claim about the deployment this code is
      in no position to make.
    */
    return {
      ...nothingKept,
      because:
        "I could not reach the place your declarations are kept, so I won’t offer to record one I might lose.",
    };
  }
}

async function pursuitFor(
  personId: string,
  entityId: string,
  client: PersonClient,
): Promise<PursuitResolution> {
  try {
    if (client === null) return UNDECLARED;
    const log = pursuitLogFor(client);
    if (log === null) return UNDECLARED;
    return await log.read(personId, entityId);
  } catch {
    return UNDECLARED;
  }
}

/**
 * Every opportunity currently worth showing this person, as cards.
 *
 * Returns `unknown` rather than an empty list when nothing has been retrieved.
 * An empty list reads as "there is nothing out there", and a deployment that
 * has never fetched anything is in no position to say that.
 */
export async function resolveCards(
  personId: string,
  client: PersonClient,
  options: {
    /**
     * Declarations the caller has already read.
     *
     * The Workspace reads them once for the Step and passed nothing here, so
     * this function read them again — a fresh Supabase client and a separate
     * query *per card*. Eight opportunities meant nine reads of one table for
     * data the route already had in hand.
     *
     * Optional rather than required, because `resolveCards` is also called
     * where nobody has read them yet, and making it mandatory would push the
     * same N+1 into every future caller that forgot.
     */
    pursuits?: ReadonlyMap<string, PursuitResolution>;
  } = {},
): Promise<CardsResolution> {
  const now = new Date().toISOString();
  const record = opportunityRecord();

  if (record === null) {
    return {
      state: "unknown",
      gap: "I have no record of anything I have observed, so I cannot show you opportunities.",
    };
  }

  try {
    const corpus = await deriveCorpus(record.store, record.verification, { decidedAt: now });

    if (corpus.searchedAt === null) {
      /* Nothing has ever been retrieved. Not an empty world — an unlooked one. */
      return {
        state: "unknown",
        gap: "I have not looked at any source yet, so I have nothing to show you.",
      };
    }

    const judgeable = corpus.entities.flatMap((entity) => {
      const verification = corpus.verifications.get(entity.id);
      return verification ? [{ entity, verification }] : [];
    });

    const judgments = judgeAll(
      judgeable.map(({ entity, verification }) => ({
        personId,
        entity,
        verification,
        facts: [],
        now,
      })),
    );

    const cards: OpportunityCard[] = [];
    for (const { entity, verification } of judgeable) {
      cards.push(
        projectCard({
          entity,
          verification,
          judgments: judgments.find((j) => j.entityId === entity.id) ?? null,
          pursuit:
            options.pursuits?.get(entity.id) ??
            (options.pursuits ? UNDECLARED : await pursuitFor(personId, entity.id, client)),
          now,
        }),
      );
    }

    return { state: "cards", cards, searchedAt: corpus.searchedAt };
  } catch {
    /*
      A read that failed is not an empty corpus. Rendering "nothing to show"
      here would be a failure reported as a finding.
    */
    return { state: "unknown", gap: "I could not read what I have observed." };
  }
}

/**
 * One thing the person has said, and what Opportunity X can still see of it.
 *
 * `title` is null when the declaration outlives the evidence — the entity was
 * re-resolved under a different identity, or the record no longer holds it.
 * That is a real state and it renders as one: the statement is the person's,
 * and it does not stop existing because Opportunity X lost track of what it was about.
 */
export interface DeclarationRow {
  entityId: string;
  state: "interested" | "not-interested";
  declaredAt: string;
  title: string | null;
  /** Where to go to see it. Null when there is nothing left to inspect. */
  href: string | null;
}

export type DeclarationsResolution =
  | { state: "declarations"; declarations: DeclarationRow[] }
  | { state: "empty" }
  | { state: "unknown"; gap: string };

/**
 * Everything the person has said about an opportunity, in one place.
 *
 * ── Why this is on the Ledger and not in it ───────────────────────────────
 *
 * L4 fixes the Ledger's contents: its "length is determined by what the user
 * actually committed to, never by what the system found." A declaration is not
 * a commitment — saying "I'm interested" is not saying "I applied" — so folding
 * the two into one list would pad the record of someone's life with intentions
 * they never acted on.
 *
 * But both are the person's own statements rather than Opportunity X's findings, and
 * until now a declaration had no surface of its own at all: it changed the Step
 * and was then visible only on the card it was made from. Someone who had said
 * yes to six things had nowhere to see the six.
 *
 * So: the same page, a separate section, and the line held between what
 * happened in the world and what the person said about it.
 */
export async function resolveDeclarations(
  personId: string,
  client: PersonClient,
): Promise<DeclarationsResolution> {
  let pursuits: ReadonlyMap<string, PursuitResolution>;

  try {
    const log = client === null ? null : pursuitLogFor(client);
    if (log === null) {
      return {
        state: "unknown",
        gap: "Nowhere durable is configured to keep what you tell me about an opportunity, so there is nothing for me to show you here.",
      };
    }
    pursuits = await log.readAll(personId);
  } catch {
    /* A read that failed is not an absence of declarations. */
    return { state: "unknown", gap: "I could not read what you have told me." };
  }

  /*
    Titles, where the record still holds them. A corpus that cannot be read does
    not invalidate the declarations — they are the person's statements, not
    Opportunity X's observations — so that failure degrades to untitled rows rather
    than taking the whole section down with it.
  */
  const titles = new Map<string, string>();
  const record = opportunityRecord();

  if (record !== null) {
    try {
      const corpus = await deriveCorpus(record.store, record.verification, {
        decidedAt: new Date().toISOString(),
      });
      for (const entity of corpus.entities) {
        const title = agreedValue(entity, "title");
        if (title !== null) titles.set(entity.id, title);
      }
    } catch {
      /* Deliberately swallowed. See above. */
    }
  }

  const declarations: DeclarationRow[] = [];

  for (const [entityId, resolution] of pursuits) {
    if (resolution.state !== "declared") continue;
    const title = titles.get(entityId) ?? null;
    declarations.push({
      entityId,
      state: resolution.declaration.state,
      declaredAt: resolution.declaration.declaredAt,
      title,
      href: title === null ? null : `/opportunity/${entityId}`,
    });
  }

  if (declarations.length === 0) return { state: "empty" };

  /* Most recent first — what someone said today is what they came back about. */
  declarations.sort((a, b) => b.declaredAt.localeCompare(a.declaredAt));

  return { state: "declarations", declarations };
}

export async function resolveInspection(
  personId: string,
  entityId: string,
  client: PersonClient,
): Promise<InspectionResolution> {
  const now = new Date().toISOString();
  const record = opportunityRecord();

  if (record === null) {
    return {
      state: "unknown",
      gap: "I have no record of anything I have observed, so I cannot show you this opportunity.",
    };
  }

  try {
    const corpus = await deriveCorpus(record.store, record.verification, { decidedAt: now });
    const entity = corpus.entities.find((e) => e.id === entityId);

    /* The record was read and did not contain it. A real absence. */
    if (!entity) return { state: "not-found" };

    const verification = corpus.verifications.get(entity.id) ?? null;

    const judgments = verification
      ? (judgeAll([{ personId, entity, verification, facts: [], now }])[0] ?? null)
      : null;

    return {
      state: "inspection",
      inspection: projectInspection({
        entity,
        verification,
        judgments,
        pursuit: await pursuitFor(personId, entityId, client),
        /* Every retrieval the entity rests on, failures included. */
        observations: await record.store.readMany(entity.resolution.observationIds),
        now,
      }),
    };
  } catch {
    return { state: "unknown", gap: "I could not read what I have observed." };
  }
}
