import "@/lib/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stakes } from "../entity/types";
import type {
  StoredVerdict,
  VerificationBasis,
  VerificationRecord,
  VerificationTransition,
} from "./types";

/**
 * The verification transition log.
 *
 * ── Why an event log rather than a state row ──────────────────────────────
 *
 * The decisive question about verification is whether anything has ever gone
 * *verified → not verified*. A table holding current state can claim decay works
 * and never be contradicted, because there is nothing to check it against.
 *
 * So the durable record is the transitions, append-only, and the current state
 * is folded from them on read. This has three consequences, all wanted:
 *
 *   * No UPDATE path exists, so the same three-level append-only enforcement the
 *     observations table uses applies here unchanged.
 *   * Freshness has evidence behind it. `expiresAt` moves forward only when a
 *     re-establishment was actually recorded.
 *   * The de-verification monitor reads history rather than a counter someone
 *     has to remember to increment.
 *
 * ── Why re-affirmation is written ─────────────────────────────────────────
 *
 * An event whose `from` equals its `to` is not a no-op — it is the record that
 * verification was re-established, and it is the only thing that moves the
 * expiry. Skipping it to save rows would leave freshness asserted rather than
 * evidenced.
 */

export interface VerificationLog {
  /** Append one transition. There is no update and no delete. */
  record(
    entity: { id: string; key: string; method: string; stakes: Stakes },
    record: VerificationRecord,
  ): Promise<void>;
  /** Every entity that has any verification history, folded to a record. */
  readAll(): Promise<Map<string, VerificationRecord>>;
  /** One entity's folded record, or null when it has never been verified. */
  read(entityId: string): Promise<VerificationRecord | null>;
}

interface EventRow {
  entity_id: string;
  entity_key: string;
  entity_method: string;
  from_verdict: StoredVerdict | null;
  to_verdict: StoredVerdict;
  at: string;
  reason: string;
  expires_at: string;
  stakes: Stakes;
  basis: VerificationBasis;
  observation_id: string | null;
}

const COLUMNS =
  "entity_id, entity_key, entity_method, from_verdict, to_verdict, at, reason, expires_at, stakes, basis, observation_id";

/**
 * Fold an entity's events into its current record.
 *
 * The last event decides the verdict, the basis and the expiry, and every event
 * survives as a transition. Nothing here applies the clock — expiry is applied
 * by `resolveVerification` at the point of reading, so a record folded now and
 * read in an hour cannot disagree with itself.
 */
export function foldEvents(rows: readonly EventRow[]): VerificationRecord | null {
  if (rows.length === 0) return null;

  const ordered = [...rows].sort((a, b) => a.at.localeCompare(b.at));
  const last = ordered[ordered.length - 1];

  const transitions = ordered.map(
    (row): VerificationTransition => ({
      from: row.from_verdict,
      to: row.to_verdict,
      at: new Date(row.at).toISOString(),
      reason: row.reason,
      ...(row.observation_id ? { observationId: row.observation_id } : {}),
    }),
  );

  return {
    entityId: last.entity_id,
    verdict: last.to_verdict,
    establishedAt: new Date(last.at).toISOString(),
    expiresAt: new Date(last.expires_at).toISOString(),
    basis: last.basis,
    transitions: transitions as [VerificationTransition, ...VerificationTransition[]],
  };
}

export class SupabaseVerificationLog implements VerificationLog {
  readonly #db: SupabaseClient;

  constructor(db: SupabaseClient) {
    this.#db = db;
  }

  async record(
    entity: { id: string; key: string; method: string; stakes: Stakes },
    record: VerificationRecord,
  ): Promise<void> {
    /*
      Only the newest transition is written. The earlier ones are already rows —
      re-inserting them would duplicate history, and there is no update path to
      reconcile it with afterwards.
    */
    const latest = record.transitions[record.transitions.length - 1];

    const { error } = await this.#db.from("opportunity_verification_events").insert({
      entity_id: entity.id,
      entity_key: entity.key,
      entity_method: entity.method,
      from_verdict: latest.from,
      to_verdict: latest.to,
      at: latest.at,
      reason: latest.reason,
      expires_at: record.expiresAt,
      stakes: entity.stakes,
      basis: record.basis,
      observation_id: latest.observationId ?? null,
    });

    if (error) {
      throw new Error(
        `Could not record the verification transition for ${entity.id}: ${error.message}`,
      );
    }
  }

  async readAll(): Promise<Map<string, VerificationRecord>> {
    const { data, error } = await this.#db
      .from("opportunity_verification_events")
      .select(COLUMNS)
      .order("at", { ascending: true });

    if (error) throw new Error(`Could not read verification history: ${error.message}`);

    const byEntity = new Map<string, EventRow[]>();
    for (const row of (data ?? []) as unknown as EventRow[]) {
      const existing = byEntity.get(row.entity_id);
      if (existing) existing.push(row);
      else byEntity.set(row.entity_id, [row]);
    }

    const folded = new Map<string, VerificationRecord>();
    for (const [entityId, rows] of byEntity) {
      const record = foldEvents(rows);
      if (record) folded.set(entityId, record);
    }
    return folded;
  }

  async read(entityId: string): Promise<VerificationRecord | null> {
    const { data, error } = await this.#db
      .from("opportunity_verification_events")
      .select(COLUMNS)
      .eq("entity_id", entityId)
      .order("at", { ascending: true });

    if (error) {
      throw new Error(`Could not read verification history for ${entityId}: ${error.message}`);
    }
    return foldEvents((data ?? []) as unknown as EventRow[]);
  }
}

/**
 * An in-memory log, for tests and for a crawl that has nowhere durable to write.
 *
 * Holds the same append-only discipline: `record` pushes, and there is no
 * method that revises or removes.
 */
export class InMemoryVerificationLog implements VerificationLog {
  #events = new Map<string, EventRow[]>();

  async record(
    entity: { id: string; key: string; method: string; stakes: Stakes },
    record: VerificationRecord,
  ): Promise<void> {
    const latest = record.transitions[record.transitions.length - 1];
    const rows = this.#events.get(entity.id) ?? [];
    rows.push({
      entity_id: entity.id,
      entity_key: entity.key,
      entity_method: entity.method,
      from_verdict: latest.from,
      to_verdict: latest.to,
      at: latest.at,
      reason: latest.reason,
      expires_at: record.expiresAt,
      stakes: entity.stakes,
      basis: record.basis,
      observation_id: latest.observationId ?? null,
    });
    this.#events.set(entity.id, rows);
  }

  async readAll(): Promise<Map<string, VerificationRecord>> {
    const folded = new Map<string, VerificationRecord>();
    for (const [entityId, rows] of this.#events) {
      const record = foldEvents(rows);
      if (record) folded.set(entityId, record);
    }
    return folded;
  }

  async read(entityId: string): Promise<VerificationRecord | null> {
    return foldEvents(this.#events.get(entityId) ?? []);
  }
}
