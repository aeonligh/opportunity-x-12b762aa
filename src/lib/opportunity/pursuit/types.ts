/**
 * Pursuit — what the person said, about one opportunity.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * A DECLARATION IS NOT A JUDGMENT, AND NOT AN EVENT
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Layer 3 already holds six judgments: what AEON X infers about a
 * person–opportunity pairing. This is the other half of that layer, and it is a
 * different kind of thing entirely.
 *
 *   Judgment    — the system's inference. Recomputed. The system owns it.
 *   Declaration — the person's statement. Never recomputed. They own it.
 *
 * Keeping them in separate types is the whole design. A field called
 * `interested` that the system could also write is a field that will eventually
 * be written by a click handler, and at that point "you told me you were
 * interested" becomes "you looked at this twice" — which is a claim about
 * someone's intentions derived from their browsing, and the Visibility
 * Principle forbids exactly that.
 *
 * ── Why this is not a behavioural signal, structurally ────────────────────
 *
 * `declaredBy: "person"` is a literal type with one member. There is no other
 * value, so a pipeline that wanted to record an inferred interest would have to
 * change this type to do it — a visible amendment rather than a quiet extra
 * call site. The same technique the `Override` type uses for
 * `excludedFromLearning`.
 *
 * And there is deliberately no `viewedAt`, no `clickCount`, no `dwell`. Not as
 * a matter of policy: there is nowhere to put them.
 *
 * ── What it may and may not influence ─────────────────────────────────────
 *
 * **May:** what the person is shown again, when they are reminded, which
 * deadlines are treated as consequential for them. All of that is the system
 * honouring something they said.
 *
 * **May not:** ranking inputs. `RankingInputKind` has no member for a
 * declaration and must not gain one. The moment "people who said they were
 * interested in X also…" becomes an input, this stops being a statement the
 * person made and becomes training data about them.
 *
 * ── Why the person may delete this and cannot delete an observation ───────
 *
 * An observation is a fact about the world — a page said something on a date,
 * and no one gets to unsay it. A declaration is a fact about a person, and the
 * Ownership Principle gives them the truth of their own life. So `withdraw`
 * exists here and has no counterpart in the observation store, and that
 * asymmetry is the point rather than an inconsistency.
 *
 * Between declaration and withdrawal the log is append-only: changing your mind
 * is a new declaration, so "I was interested in March and not in June" stays
 * legible to the person it belongs to.
 */

export type PursuitState =
  /** The person said they want to keep this in view. */
  | "interested"
  /**
   * The person said no. Distinct from having never said anything: a system that
   * conflates them re-surfaces something already declined, which is the
   * behaviour that makes people stop answering at all.
   */
  | "not-interested";

export interface Declaration {
  personId: string;
  entityId: string;
  state: PursuitState;
  declaredAt: string;
  /** The person's own words, where they gave any. Never generated. */
  note?: string;
  /**
   * Structurally `"person"`, always. A literal with one member, so an inferred
   * declaration would require changing this type — which is an amendment, not a
   * new call site.
   */
  readonly declaredBy: "person";
}

/**
 * What the person has said about one opportunity, right now.
 *
 * Three states, and `undeclared` is a real one. It is not `not-interested` with
 * a softer name: a person who has not answered has not declined, and treating
 * silence as a decision is the same error as treating missing evidence as
 * negative evidence.
 */
export type PursuitResolution =
  | { state: "declared"; declaration: Declaration; history: Declaration[] }
  | { state: "undeclared" };

export interface PursuitLog {
  /** Record a declaration. The only writer. Requires an explicit person act. */
  declare(declaration: Declaration): Promise<void>;
  /** The current position on one pairing, with how it got there. */
  read(personId: string, entityId: string): Promise<PursuitResolution>;
  /** Current positions across every pairing this person has spoken about. */
  readAll(personId: string): Promise<Map<string, PursuitResolution>>;
  /**
   * Remove every declaration for one pairing, at the person's instruction.
   *
   * Not "set to not-interested" — that is a position, and this is the removal
   * of a position. A person who wants AEON X to forget they ever considered
   * something is entitled to that, and leaving a tombstone that says "declined"
   * would be keeping the record they asked to be rid of.
   */
  withdraw(personId: string, entityId: string): Promise<void>;
}

/**
 * The one constructor.
 *
 * Takes the person's act and the moment, and nothing that could stand in for
 * either. There is no overload that accepts a behavioural event.
 */
export function declaration(input: {
  personId: string;
  entityId: string;
  state: PursuitState;
  declaredAt: string;
  note?: string;
}): Declaration {
  return { ...input, declaredBy: "person" };
}

/** True when the person has said they want this in view. */
export function isPursuing(resolution: PursuitResolution): boolean {
  return resolution.state === "declared" && resolution.declaration.state === "interested";
}
