import type { ObservationStore, SourceObservation } from "./types";

/**
 * An in-memory observation store.
 *
 * ── What this is, stated plainly ──────────────────────────────────────────
 *
 * This is a real implementation of the port, and it is **not** a database. It
 * holds observations for the life of a process. Nothing survives a restart.
 *
 * It exists for two reasons, both of them honest:
 *
 * 1. The port is what the rest of the engine depends on. Every layer above
 *    Observation is written against `ObservationStore`, so the durable adapter
 *    can be added without touching entity resolution, verification, judgment or
 *    recommendation. That isolation is the point — a storage dependency that is
 *    presently unverifiable must not be allowed to block the layers that do not
 *    depend on which storage it is.
 *
 * 2. It makes the constitutional invariants testable in CI without a network,
 *    which is the only way a rule like "no observation is ever deleted" gets
 *    checked at every commit rather than at a review nobody schedules.
 *
 * ── What it must never become ─────────────────────────────────────────────
 *
 * A production path. A recommendation resting on observations that vanish on
 * deploy is a recommendation that cannot answer for itself the following
 * morning, and the whole three-layer model exists so that it can.
 * `isDurable` is false here and the recommendation service reads it, so an
 * ephemeral store cannot silently back a live surface.
 */
export class InMemoryObservationStore implements ObservationStore {
  readonly isDurable = false;

  #byId = new Map<string, SourceObservation>();
  #byUrl = new Map<string, string[]>();
  #lastRetrievalAt: string | null = null;

  async append(observation: SourceObservation): Promise<void> {
    /*
      Append-only, enforced rather than assumed. Re-appending an id would be a
      silent overwrite, which is an update wearing an append's name.
    */
    if (this.#byId.has(observation.id)) {
      throw new Error(
        `Observation ${observation.id} already exists. Observations are append-only; a re-encounter is a new observation.`,
      );
    }

    this.#byId.set(observation.id, observation);

    const forUrl = this.#byUrl.get(observation.url) ?? [];
    forUrl.push(observation.id);
    this.#byUrl.set(observation.url, forUrl);

    /*
      Monotonic. A retrieval that arrives out of order must not move the
      watermark backwards, or "when did Opportunity X last see anything" becomes a
      function of arrival order rather than of what happened.
    */
    if (this.#lastRetrievalAt === null || observation.retrievedAt > this.#lastRetrievalAt) {
      this.#lastRetrievalAt = observation.retrievedAt;
    }
  }

  async read(observationId: string): Promise<SourceObservation | null> {
    return this.#byId.get(observationId) ?? null;
  }

  async readByUrl(url: string): Promise<SourceObservation[]> {
    const ids = this.#byUrl.get(url) ?? [];
    return ids
      .map((id) => this.#byId.get(id))
      .filter((o): o is SourceObservation => o !== undefined)
      .sort((a, b) => a.retrievedAt.localeCompare(b.retrievedAt));
  }

  async readMany(observationIds: readonly string[]): Promise<SourceObservation[]> {
    return observationIds
      .map((id) => this.#byId.get(id))
      .filter((o): o is SourceObservation => o !== undefined)
      .sort((a, b) => a.retrievedAt.localeCompare(b.retrievedAt));
  }

  async readAll(): Promise<SourceObservation[]> {
    return [...this.#byId.values()].sort((a, b) => a.retrievedAt.localeCompare(b.retrievedAt));
  }

  async count(): Promise<number> {
    return this.#byId.size;
  }

  async observedUrls(): Promise<{ url: string; lastRetrievedAt: string }[]> {
    return [...this.#byUrl].map(([url, ids]) => ({
      url,
      lastRetrievedAt: ids
        .map((id) => this.#byId.get(id)?.retrievedAt ?? "")
        .reduce((latest, at) => (at > latest ? at : latest), ""),
    }));
  }

  /**
   * Null until something has actually been retrieved.
   *
   * Never `new Date()`. A store that reports "just now" when it has seen
   * nothing tells the Step surface that discovery is healthy, and the Step
   * surface would then render an absence verdict — "nothing better has
   * appeared" — on the strength of a pipeline that never ran. A failure
   * reported as a finding is the one thing the absence model exists to prevent.
   */
  async lastRetrievalAt(): Promise<string | null> {
    return this.#lastRetrievalAt;
  }
}
