import type { ShownExplanation } from "./card";

/**
 * What Opportunity X actually told someone, kept.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * A RECOMPUTED EXPLANATION IS NOT THE EXPLANATION THAT WAS GIVEN
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Judgments are recomputed. That is correct — they are time-varying, they
 * depend on a corpus that changes, and a stale one would be worse than none.
 *
 * But it means the reasoning shown to a person in March cannot be reconstructed
 * in June by asking the system what it thinks. The corpus moved, the
 * verification lapsed and was re-established, the extractor was fixed. Re-run
 * the projection and you get today's explanation, presented as though it were
 * the one that was given — which is the most flattering possible error and
 * completely undetectable from outside.
 *
 * So *what we told someone* is retained as evidence, separately from anything
 * recomputable. This log is the only record of it, and it is append-only for
 * the same reason the observation store is: the value of a record you can edit
 * is the value of no record at all.
 *
 * ── Why the whole explanation and not an id ───────────────────────────────
 *
 * Storing `{ entityId, logicVersion }` and re-deriving the sentences later is
 * the same failure in a smaller box. The logic version tells you *which code*
 * ran; it does not resurrect the corpus that code ran against. The sentences
 * are the artifact, so the sentences are what is kept.
 *
 * ── What this is not ──────────────────────────────────────────────────────
 *
 * Not analytics. It is not counted, not aggregated into a delivery rate, and
 * not read by ranking. It exists so a person can be shown what they were told,
 * and so "we didn't know in time" and "you were told and it was wrong" can be
 * told apart afterwards — which is the only way either claim is adjudicable.
 */

export interface DeliveredExplanation {
  personId: string;
  entityId: string;
  /** When it was put in front of them. Not when it was computed. */
  deliveredAt: string;
  /** Verbatim. The same object the component rendered, not a summary of it. */
  shown: ShownExplanation;
  /**
   * The logic that produced it, so a wrong explanation can be traced to the
   * code that wrote it. Kept *alongside* the sentences, never instead of them.
   */
  logicVersion: string;
  /** The observations the entity rested on at that moment. */
  observationIds: string[];
  /** Where it was shown — the card, or the inspection surface. */
  surface: "card" | "inspection";
}

export interface DeliveryLog {
  /** Append one delivery. There is no update and no delete. */
  record(delivery: DeliveredExplanation): Promise<void>;
  /** Everything this person was told about one opportunity, oldest first. */
  read(personId: string, entityId: string): Promise<DeliveredExplanation[]>;
  /** Everything this person was told, oldest first. */
  readAll(personId: string): Promise<DeliveredExplanation[]>;
}

/**
 * An in-memory delivery log.
 *
 * Holds the same append-only discipline as the durable one would: `record`
 * pushes, and there is no method that revises or removes. `isDurable` is false
 * so a surface cannot claim a delivery was retained when it was not.
 */
export class InMemoryDeliveryLog implements DeliveryLog {
  readonly isDurable = false;

  #deliveries: DeliveredExplanation[] = [];

  async record(delivery: DeliveredExplanation): Promise<void> {
    /*
      Structuredly cloned on the way in. The caller holds a projection that will
      be regenerated on the next request, and keeping a reference to it would
      let a later render mutate what we claim to have said.
    */
    this.#deliveries.push(structuredClone(delivery));
  }

  async read(personId: string, entityId: string): Promise<DeliveredExplanation[]> {
    return this.#deliveries
      .filter((d) => d.personId === personId && d.entityId === entityId)
      .sort((a, b) => a.deliveredAt.localeCompare(b.deliveredAt));
  }

  async readAll(personId: string): Promise<DeliveredExplanation[]> {
    return this.#deliveries
      .filter((d) => d.personId === personId)
      .sort((a, b) => a.deliveredAt.localeCompare(b.deliveredAt));
  }
}
