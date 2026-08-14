import "@/lib/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { rehydrateWitnessed } from "./record";
import type {
  IdentitySignal,
  ObservationStore,
  ObservedItem,
  ParserVersion,
  SourceClass,
  SourceObservation,
  Unreadable,
  UnwitnessedObservation,
} from "./types";

/**
 * The durable observation store.
 *
 * ── What this adapter is allowed to do ────────────────────────────────────
 *
 * Insert and select. Nothing else, and not because it was written carefully —
 * the table revokes UPDATE, DELETE and TRUNCATE from every role including
 * `service_role`, and a trigger refuses them again for any role that
 * reacquires the grant. An adapter that tried to update would get an error
 * rather than a silent no-op, which is the point of stating the boundary at
 * the grant instead of in a policy.
 *
 * ── Why failures throw here and resolve elsewhere ─────────────────────────
 *
 * A read that cannot reach the database is not "no observations". If this
 * returned an empty array on error, the Step surface would resolve `absent` —
 * "a search ran and produced nothing better" — on the strength of a database
 * outage. That is a failure reported as a finding, and it is the specific
 * confusion the three-state absence model exists to prevent.
 *
 * So this throws, and `recommendNextStep`'s caller turns a throw into
 * `unknown`: AEON X cannot see. A limit on the system, never a claim about the
 * person.
 */

const COLUMNS =
  "id, retrieved_at, url, source_id, source_label, source_class, parser_version, related_to, outcome, content_body, content_type, content_sha256, content_bytes, content_encoding, items, page_identity, unreadable, status, reason";

interface ObservationRow {
  id: string;
  retrieved_at: string;
  url: string;
  source_id: string;
  source_label: string;
  source_class: SourceClass;
  parser_version: string;
  related_to: string[] | null;
  outcome: "retrieved" | "unreachable";
  content_body: string | null;
  content_type: string | null;
  content_sha256: string | null;
  content_bytes: number | null;
  content_encoding: "utf-8" | "base64" | null;
  items: ObservedItem[] | null;
  page_identity: IdentitySignal[] | null;
  unreadable: Unreadable | null;
  status: number | null;
  reason: string | null;
}

function toRow(observation: SourceObservation): Record<string, unknown> {
  const base = {
    id: observation.id,
    retrieved_at: observation.retrievedAt,
    url: observation.url,
    source_id: observation.source.sourceId,
    source_label: observation.source.label,
    source_class: observation.source.sourceClass,
    parser_version: observation.parserVersion,
    related_to: observation.relatedTo,
    outcome: observation.outcome,
  };

  if (observation.outcome === "retrieved") {
    return {
      ...base,
      content_body: observation.content.body,
      content_type: observation.content.contentType,
      content_sha256: observation.content.sha256,
      content_bytes: observation.content.byteLength,
      content_encoding: observation.content.encoding,
      items: observation.items,
      page_identity: observation.pageIdentity,
      /* Written whenever there are no items, because the table refuses a
         retrieval whose emptiness nobody can account for. */
      unreadable: observation.unreadable ?? null,
    };
  }

  return { ...base, status: observation.status, reason: observation.reason };
}

function fromRow(row: ObservationRow): SourceObservation {
  const base = {
    id: row.id,
    /*
      Postgres returns `timestamptz` in its own format. Normalising to the same
      ISO 8601 the engine writes matters more than it looks: freshness, expiry
      and the ranking's deadline comparison are all string comparisons, and two
      formats for the same instant would order wrongly.
    */
    retrievedAt: new Date(row.retrieved_at).toISOString(),
    url: row.url,
    source: {
      sourceId: row.source_id,
      label: row.source_label,
      sourceClass: row.source_class,
    },
    parserVersion: row.parser_version as ParserVersion,
    relatedTo: row.related_to ?? [],
  };

  const stored: UnwitnessedObservation =
    row.outcome === "retrieved"
      ? {
          ...base,
          outcome: "retrieved",
          content: {
            /*
              A non-null assertion would be wrong here even though the table's
              CHECK constraint guarantees these are present: the constraint
              protects the data, and this protects against a schema that drifts
              from it. An empty body would be a lie about what was observed, so
              the read fails instead.
            */
            body: required(row.content_body, row.id, "content_body"),
            encoding: required(row.content_encoding, row.id, "content_encoding"),
            contentType: required(row.content_type, row.id, "content_type"),
            sha256: required(row.content_sha256, row.id, "content_sha256"),
            byteLength: required(row.content_bytes, row.id, "content_bytes"),
          },
          items: row.items ?? [],
          pageIdentity: required(row.page_identity, row.id, "page_identity"),
          ...(row.unreadable ? { unreadable: row.unreadable } : {}),
        }
      : {
          ...base,
          outcome: "unreachable",
          status: row.status,
          reason: required(row.reason, row.id, "reason"),
        };

  return rehydrateWitnessed(stored);
}

function required<T>(value: T | null, id: string, column: string): T {
  if (value === null) {
    throw new Error(
      `Observation ${id} is stored as ${column}-null, which the table's CHECK constraints forbid. The schema and the engine disagree; do not read past this.`
    );
  }
  return value;
}

export class SupabaseObservationStore implements ObservationStore {
  readonly isDurable = true;

  readonly #db: SupabaseClient;

  constructor(db: SupabaseClient) {
    this.#db = db;
  }

  async append(observation: SourceObservation): Promise<void> {
    const { error } = await this.#db
      .from("opportunity_observations")
      .insert(toRow(observation));

    if (error) {
      throw new Error(`Could not append observation ${observation.id}: ${error.message}`);
    }
  }

  async read(observationId: string): Promise<SourceObservation | null> {
    const { data, error } = await this.#db
      .from("opportunity_observations")
      .select(COLUMNS)
      .eq("id", observationId)
      .maybeSingle();

    if (error) throw new Error(`Could not read observation ${observationId}: ${error.message}`);
    return data ? fromRow(data as unknown as ObservationRow) : null;
  }

  async readByUrl(url: string): Promise<SourceObservation[]> {
    const { data, error } = await this.#db
      .from("opportunity_observations")
      .select(COLUMNS)
      .eq("url", url)
      .order("retrieved_at", { ascending: true });

    if (error) throw new Error(`Could not read observations for ${url}: ${error.message}`);
    return (data ?? []).map((row) => fromRow(row as unknown as ObservationRow));
  }

  async readMany(observationIds: readonly string[]): Promise<SourceObservation[]> {
    if (observationIds.length === 0) return [];

    const { data, error } = await this.#db
      .from("opportunity_observations")
      .select(COLUMNS)
      .in("id", [...observationIds])
      .order("retrieved_at", { ascending: true });

    if (error) throw new Error(`Could not read observations: ${error.message}`);
    return (data ?? []).map((row) => fromRow(row as unknown as ObservationRow));
  }

  /**
   * Every observation, oldest first.
   *
   * Entity resolution groups over the whole record rather than per URL, because
   * a scholarship announced on four sites is one opportunity and grouping by URL
   * would leave four uncorroborated ones. That needs the corpus, not a slice of
   * it.
   *
   * This is the query that will need paging first. It is written plainly and
   * left plain: a projection built before there is a corpus to measure would be
   * guessing at where the cost lands.
   */
  async readAll(): Promise<SourceObservation[]> {
    const { data, error } = await this.#db
      .from("opportunity_observations")
      .select(COLUMNS)
      .order("retrieved_at", { ascending: true });

    if (error) throw new Error(`Could not read the observation record: ${error.message}`);
    return (data ?? []).map((row) => fromRow(row as unknown as ObservationRow));
  }

  async count(): Promise<number> {
    const { count, error } = await this.#db
      .from("opportunity_observations")
      .select("id", { count: "exact", head: true });

    if (error) throw new Error(`Could not count observations: ${error.message}`);
    return count ?? 0;
  }

  /**
   * The retrieval watermark.
   *
   * Null when nothing has ever been retrieved — never `now()`, and never a
   * value invented because a row was expected. This single value is what lets
   * the Step surface tell "discovery ran and found nothing" from "discovery has
   * never run", and those must not collapse.
   */
  async lastRetrievalAt(): Promise<string | null> {
    const { data, error } = await this.#db
      .from("opportunity_observations")
      .select("retrieved_at")
      .order("retrieved_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Could not read the retrieval watermark: ${error.message}`);
    if (!data) return null;
    return new Date((data as { retrieved_at: string }).retrieved_at).toISOString();
  }

  async observedUrls(): Promise<{ url: string; lastRetrievedAt: string }[]> {
    const { data, error } = await this.#db
      .from("opportunity_observations")
      .select("url, retrieved_at")
      .order("retrieved_at", { ascending: false });

    if (error) throw new Error(`Could not read observed URLs: ${error.message}`);

    const latest = new Map<string, string>();
    for (const row of (data ?? []) as { url: string; retrieved_at: string }[]) {
      if (!latest.has(row.url)) {
        latest.set(row.url, new Date(row.retrieved_at).toISOString());
      }
    }
    return [...latest].map(([url, lastRetrievedAt]) => ({ url, lastRetrievedAt }));
  }
}
