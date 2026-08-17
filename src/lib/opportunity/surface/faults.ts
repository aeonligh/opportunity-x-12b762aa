import type { CardsResolution, DeclarationsResolution, InspectionResolution } from "./service";

/**
 * Named failures, produced deliberately, in the real result shapes.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS RATHER THAN AN ERROR-LOOKING PROP
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The laboratory could already *show* an error component by handing it error
 * text. That demonstrates the component, not the product: it proves a `<div>`
 * renders a sentence, and says nothing about whether the surface reaches that
 * sentence when a read actually fails.
 *
 * The distinction the state system draws is between a developer being able to
 * say *"this component has an error-looking prop"* and *"this operation failed"*.
 * These functions produce the second. They return the genuine
 * `CardsResolution` / `InspectionResolution` / `DeclarationsResolution` a failing
 * read produces, so the route under test takes the same branch, renders the same
 * component, and reaches the same words it would in production.
 *
 * ── Why the faults live in the surface module and not in the laboratory ───
 *
 * Because they must go stale when the contract changes. A fault list kept beside
 * the laboratory would keep compiling after `CardsResolution` grows a fourth
 * state, and the laboratory would quietly stop covering the product. Here, every
 * function is typed against the real union — adding a state to the union without
 * adding it here is not a silent omission, it is an obviously incomplete file
 * next to the type it mirrors.
 *
 * ── Why this is safe to ship ──────────────────────────────────────────────
 *
 * Nothing calls it but the laboratory, whose every entry point runs
 * `assertDevelopment()` on the server before doing anything. There is no flag,
 * no environment lookup and no branch inside production code — a fault has to be
 * *asked for* by name, by a caller that production does not have. This module is
 * pure data; it reads nothing, writes nothing, and holds no client.
 *
 * Every fault below is a state the real reads genuinely produce. Nothing is
 * simulated that the architecture cannot cause on its own — see
 * `docs/PHASE_14_STATE_SYSTEM.md` §H for the ones that are laboratory-only and
 * why.
 */

export const CARD_FAULTS = [
  /** The observation record could not be read at all. */
  "record-unreadable",
  /** Configured, read, and nothing has ever been retrieved. */
  "never-looked",
  /** Sources were consulted and nothing currently qualifies. A finding. */
  "nothing-open",
] as const;

export type CardFault = (typeof CARD_FAULTS)[number];

export function cardsUnder(fault: CardFault): CardsResolution {
  switch (fault) {
    case "record-unreadable":
      return { state: "unknown", gap: "I could not read what I have observed." };
    case "never-looked":
      return {
        state: "unknown",
        gap: "I have not looked at any source yet, so I have nothing to show you.",
      };
    case "nothing-open":
      /*
        The one that is a claim about the world rather than about the system, and
        the reason it carries a timestamp: "nothing right now" is only actionable
        if the person can see how recent the "now" is.
      */
      return { state: "absent", searchedAt: new Date(Date.now() - 2 * 3_600_000).toISOString() };
  }
}

export const INSPECTION_FAULTS = [
  /** The reference resolves to nothing the record holds. */
  "no-such-entity",
  /** The record could not be read, which is not the same as the above. */
  "record-unreadable",
] as const;

export type InspectionFault = (typeof INSPECTION_FAULTS)[number];

export function inspectionUnder(fault: InspectionFault): InspectionResolution {
  switch (fault) {
    case "no-such-entity":
      return { state: "not-found" };
    case "record-unreadable":
      return { state: "unknown", gap: "I could not read what I have observed." };
  }
}

export const SAVED_FAULTS = [
  /** Read successfully; this person has declared nothing. Their silence. */
  "nothing-declared",
  /** The declarations could not be read. Says nothing about them. */
  "declarations-unreadable",
  /** Nowhere durable is configured to keep a declaration. */
  "nowhere-to-keep",
] as const;

export type SavedFault = (typeof SAVED_FAULTS)[number];

export function savedUnder(fault: SavedFault): DeclarationsResolution {
  switch (fault) {
    case "nothing-declared":
      return { state: "empty" };
    case "declarations-unreadable":
      return { state: "unknown", gap: "I could not read what you have told me." };
    case "nowhere-to-keep":
      return {
        state: "unknown",
        gap: "Nowhere durable is configured to keep what you tell me about an opportunity, so there is nothing for me to show you here.",
      };
  }
}
