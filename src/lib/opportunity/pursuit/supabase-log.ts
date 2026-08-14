import "@/lib/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Declaration, PursuitLog, PursuitResolution, PursuitState } from "./types";

/**
 * The durable pursuit log.
 *
 * ── Why this uses the person's session and not the service role ───────────
 *
 * Unlike observations, declarations *are* person-owned. The table's policies
 * are scoped to `auth.uid()`, so reading through the person's own session is
 * what makes "nobody else can see what you said" true at the database rather
 * than in application code that could be bypassed by the next caller.
 *
 * The observation store uses the admin client for the opposite reason: those
 * rows have no owner and the service role is needed to write them.
 *
 * ── Why a read failure throws ─────────────────────────────────────────────
 *
 * An unreachable table is not "you have said nothing". Returning `undeclared`
 * on error would show a person the undeclared control after they had already
 * answered, and their next click would look to them like a correction of
 * something the system had lost.
 */

interface PursuitRow {
  entity_id: string;
  state: PursuitState;
  declared_at: string;
  note: string | null;
}

const COLUMNS = "entity_id, state, declared_at, note";

function toDeclaration(personId: string, row: PursuitRow): Declaration {
  return {
    personId,
    entityId: row.entity_id,
    state: row.state,
    declaredAt: new Date(row.declared_at).toISOString(),
    ...(row.note ? { note: row.note } : {}),
    /* Every stored row was written by an explicit act — the insert policy
       requires the declaring person's own session — so reading one back is not
       a place a behavioural signal could enter. */
    declaredBy: "person",
  };
}

function fold(personId: string, rows: readonly PursuitRow[]): PursuitResolution {
  if (rows.length === 0) return { state: "undeclared" };

  const history = [...rows]
    .sort((a, b) => a.declared_at.localeCompare(b.declared_at))
    .map((row) => toDeclaration(personId, row));

  return { state: "declared", declaration: history[history.length - 1], history };
}

export class SupabasePursuitLog implements PursuitLog {
  readonly isDurable = true;

  readonly #db: SupabaseClient;

  constructor(db: SupabaseClient) {
    this.#db = db;
  }

  async declare(declaration: Declaration): Promise<void> {
    const { error } = await this.#db.from("opportunity_pursuits").insert({
      person_id: declaration.personId,
      entity_id: declaration.entityId,
      state: declaration.state,
      declared_at: declaration.declaredAt,
      note: declaration.note ?? null,
    });

    if (error) throw new Error(`Could not record what you said: ${error.message}`);
  }

  async read(personId: string, entityId: string): Promise<PursuitResolution> {
    const { data, error } = await this.#db
      .from("opportunity_pursuits")
      .select(COLUMNS)
      .eq("entity_id", entityId)
      .order("declared_at", { ascending: true });

    if (error) throw new Error(`Could not read what you said: ${error.message}`);
    return fold(personId, (data ?? []) as unknown as PursuitRow[]);
  }

  async readAll(personId: string): Promise<Map<string, PursuitResolution>> {
    const { data, error } = await this.#db
      .from("opportunity_pursuits")
      .select(COLUMNS)
      .order("declared_at", { ascending: true });

    if (error) throw new Error(`Could not read what you said: ${error.message}`);

    const byEntity = new Map<string, PursuitRow[]>();
    for (const row of (data ?? []) as unknown as PursuitRow[]) {
      const existing = byEntity.get(row.entity_id);
      if (existing) existing.push(row);
      else byEntity.set(row.entity_id, [row]);
    }

    const out = new Map<string, PursuitResolution>();
    for (const [entityId, rows] of byEntity) out.set(entityId, fold(personId, rows));
    return out;
  }

  async withdraw(personId: string, entityId: string): Promise<void> {
    /*
      A real delete, and the only one in this engine. RLS scopes it to the
      declaring person, so `person_id` is not a filter this code has to be
      trusted to apply.
    */
    const { error } = await this.#db
      .from("opportunity_pursuits")
      .delete()
      .eq("entity_id", entityId);

    if (error) throw new Error(`Could not remove what you said: ${error.message}`);
  }
}
