import type { Declaration, PursuitLog, PursuitResolution } from "./types";

/**
 * An in-memory pursuit log.
 *
 * A real implementation of the port and not a database — it holds declarations
 * for the life of a process. It exists so the product surface can be built and
 * tested against the port before a durable adapter exists, exactly as
 * `InMemoryObservationStore` does, and for the same reason: a storage
 * dependency that is presently unverifiable must not block the layers that do
 * not care which storage it is.
 *
 * `isDurable` is false and the surface reads it, so an ephemeral log cannot
 * silently back a control that tells a person their answer was saved.
 */
export class InMemoryPursuitLog implements PursuitLog {
  readonly isDurable = false;

  /** personId → entityId → declarations, oldest first. */
  #byPerson = new Map<string, Map<string, Declaration[]>>();

  async declare(declaration: Declaration): Promise<void> {
    const forPerson = this.#byPerson.get(declaration.personId) ?? new Map<string, Declaration[]>();
    const forEntity = forPerson.get(declaration.entityId) ?? [];

    forEntity.push(declaration);
    forEntity.sort((a, b) => a.declaredAt.localeCompare(b.declaredAt));

    forPerson.set(declaration.entityId, forEntity);
    this.#byPerson.set(declaration.personId, forPerson);
  }

  async read(personId: string, entityId: string): Promise<PursuitResolution> {
    const history = this.#byPerson.get(personId)?.get(entityId) ?? [];
    if (history.length === 0) return { state: "undeclared" };

    return {
      state: "declared",
      /* The latest position, with the history that led to it. Changing your
         mind is a new declaration, so both stay legible. */
      declaration: history[history.length - 1],
      history,
    };
  }

  async readAll(personId: string): Promise<Map<string, PursuitResolution>> {
    const out = new Map<string, PursuitResolution>();
    const forPerson = this.#byPerson.get(personId);
    if (!forPerson) return out;

    for (const [entityId, history] of forPerson) {
      if (history.length === 0) continue;
      out.set(entityId, {
        state: "declared",
        declaration: history[history.length - 1],
        history,
      });
    }
    return out;
  }

  async withdraw(personId: string, entityId: string): Promise<void> {
    /*
      A genuine delete, and the only one anywhere in this engine. A declaration
      is a fact about a person and the Ownership Principle gives them the truth
      of their own life; an observation is a fact about the world and nobody
      gets to unsay it. The asymmetry is deliberate.
    */
    this.#byPerson.get(personId)?.delete(entityId);
  }
}
