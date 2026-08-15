import { agrees, type OpportunityEntity } from "../entity/types";
import type { ObservedField } from "../observation/types";
import type { PairingJudgments } from "../judgment/types";
import { terminalAction, type TerminalAction } from "../surface/card";
import { deriveOpenState } from "../verification/service";
import type { VerificationResolution } from "../verification/types";
import type { PursuitResolution } from "./types";

/**
 * Stance — how the person's declaration changes what happens next.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * A DECLARATION CHANGES THE PERSON'S RELATIONSHIP, NOT THE OPPORTUNITY'S FACTS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Saying "I'm interested" does not make an opportunity more verified, better
 * suited, or more likely to be won. Every entity fact and every pairing judgment
 * on the other side of this file is computed without reference to it, and this
 * module reads them rather than adjusting them.
 *
 * What it does change is what Opportunity X should say next. Someone who has declared
 * interest and returns three days before a deadline needs something different
 * from someone meeting the opportunity for the first time — not a different
 * opinion, a different *sentence*.
 *
 * ── The prohibition this file is most exposed to ──────────────────────────
 *
 * "Interested" must never become "you'll win", "you're a good fit", "you should
 * apply", or "you're ready". Every one of those is a judgment, and the judgment
 * layer either has evidence for it or does not. This module reads
 * `PairingJudgments` and never upgrades a verdict: an `undetermined` eligibility
 * stays undetermined however keen the person is.
 *
 * ── Why there is no preparation model here ────────────────────────────────
 *
 * The constitutional corpus does not define one. It was searched: no
 * preparation surface, no readiness model, no checklist is established
 * anywhere, and `docs/constitutional/opportunity-engine.md` already records the
 * gap as **Unknown — not established by the corpus. Not invented.**
 *
 * So this file does not produce a to-do list. Generic preparation UX —
 * "gather your transcripts", "draft your statement" — would be requirements
 * nobody derived from anything, presented with the same authority as a deadline
 * three sources confirmed.
 *
 * What it produces instead is the thing Opportunity X genuinely can enumerate: **its
 * own uncertainty.** "No source stated who may apply" is derived and checkable.
 * "Prepare your documents" is invented. The first is useful to someone deciding
 * whether they can act; the second is filler that looks like help.
 *
 * When a preparation model is established, `Outstanding` is the seam it
 * attaches to — a new member, derived from whatever the corpus turns out to
 * define, alongside the ones that already trace to evidence.
 */

/**
 * Something genuinely between the person and acting.
 *
 * Every member is derived from what the engine holds. There is deliberately no
 * `task` or `step` member: a requirement Opportunity X invented would be
 * indistinguishable, at a glance, from one a source stated.
 */
export type Outstanding =
  /** Sources disagree about a field that matters for acting. */
  | { kind: "contested"; field: ObservedField; readings: number; because: string }
  /** Nothing was ever stated about a field that matters for acting. */
  | { kind: "unobserved"; field: ObservedField; because: string }
  /** The opportunity has not been corroborated to the depth its stakes require. */
  | { kind: "unverified"; because: string }
  /** Opportunity X has not read the requirements against what it knows about the person. */
  | { kind: "eligibility-unread"; because: string };

/**
 * The fields whose absence actually stands between someone and acting.
 *
 * Not every field. A missing `location` does not stop an application; a missing
 * `deadline` or `eligibility` does, and pretending otherwise would bury the two
 * that matter in a list of eight.
 */
const DECISIVE: readonly ObservedField[] = ["deadline", "eligibility", "how-to-apply"];

/** How near a deadline has to be before the Step should lead with it. */
export const CLOSING_WINDOW_DAYS = 21;

export type Urgency =
  | { kind: "none" }
  /** Open, and near enough that the Step should lead with it. */
  | { kind: "closing"; deadline: string; daysLeft: number }
  /** Open, and far enough away that leading with it would manufacture pressure. */
  | { kind: "open"; deadline: string; daysLeft: number }
  | { kind: "passed"; deadline: string }
  /** Derived, and undecidable. Never "open" by default. */
  | { kind: "undated"; because: string };

/**
 * What the Step should say.
 *
 * One move, never a menu. The Workspace answers one question with one step, and
 * a list of three transfers the decision back to a person who came here because
 * deciding was hard.
 */
export type NextMove =
  /** They have not spoken about this. Nothing is assumed either way. */
  | { kind: "review" }
  /** Interested, and something Opportunity X does not know stands in the way. */
  | { kind: "resolve-unknowns"; outstanding: Outstanding[] }
  /** Interested, clear, and there is somewhere to go. */
  | { kind: "act"; action: TerminalAction }
  /** Interested, clear, and nothing is pressing. */
  | { kind: "watch" }
  /** The deadline has passed. Said plainly rather than quietly dropped. */
  | { kind: "closed"; deadline: string }
  /** They said no. Respected, and not re-argued. */
  | { kind: "declined" };

export interface PursuitStance {
  entityId: string;
  /** Exactly what the person said. Never inferred, never upgraded. */
  declaration: "undeclared" | "interested" | "not-interested";
  /** When they said it. Null when they have not. */
  since: string | null;
  urgency: Urgency;
  /** What Opportunity X does not know. Empty is a real and good state. */
  outstanding: Outstanding[];
  next: NextMove;
  /** The sentence the Step renders. Built here so what is shown can be retained. */
  statement: string;
}

const DAY = 86_400_000;

export function deriveUrgency(entity: OpportunityEntity, now: string): Urgency {
  const open = deriveOpenState(entity, now);

  if (open.state === "unknown") return { kind: "undated", because: open.reason };
  if (open.state === "closed") return { kind: "passed", deadline: open.deadline };

  /*
    Never negative. `open.deadline` is the instant the source denoted, and for a
    deadline the publisher gave as a bare day that instant is the *start* of the
    day — so on the final day the raw subtraction goes negative and the Step
    said "there are -1 days left". The state is `open`, which means there is
    time by definition. Zero is the floor, and zero reads as "today".
  */
  const daysLeft = Math.max(
    0,
    Math.floor((new Date(open.deadline).getTime() - new Date(now).getTime()) / DAY),
  );

  return daysLeft <= CLOSING_WINDOW_DAYS
    ? { kind: "closing", deadline: open.deadline, daysLeft }
    : { kind: "open", deadline: open.deadline, daysLeft };
}

/**
 * Everything Opportunity X does not know that bears on acting.
 *
 * Derived, in every case, from something the engine holds. Nothing here is a
 * task, and nothing here was invented.
 */
export function outstandingFor(
  entity: OpportunityEntity,
  verification: VerificationResolution | null,
  judgments: PairingJudgments | null,
): Outstanding[] {
  const out: Outstanding[] = [];

  for (const field of DECISIVE) {
    const held = entity.fields.find((f) => f.field === field);

    if (!held) {
      out.push({
        kind: "unobserved",
        field,
        because: `No source stated the ${field.replace(/-/g, " ")}.`,
      });
      continue;
    }

    if (!agrees(held)) {
      out.push({
        kind: "contested",
        field,
        readings: held.readings.length,
        because: `Sources give ${held.readings.length} different values for the ${field.replace(/-/g, " ")}.`,
      });
    }
  }

  if (verification === null || verification.verdict !== "verified") {
    out.push({
      kind: "unverified",
      because:
        verification === null
          ? "I have not established whether this is real."
          : verification.verdict === "expired"
            ? "My check on this has lapsed and I have not re-run it."
            : verification.verdict === "contradicted"
              ? "Sources disagree about this, so I will not call it verified."
              : verification.verdict === "withdrawn"
                ? "Every source I was watching has stopped answering."
                : "I have not corroborated this to the depth its stakes require.",
    });
  }

  if (judgments === null || judgments.eligibility.verdict === "undetermined") {
    out.push({
      kind: "eligibility-unread",
      because:
        judgments?.eligibility.because ??
        "I have not read this opportunity’s requirements against what I know about you.",
    });
  }

  return out;
}

export interface StanceInput {
  entity: OpportunityEntity;
  verification: VerificationResolution | null;
  judgments: PairingJudgments | null;
  pursuit: PursuitResolution;
  now: string;
  /**
   * Whose position the sentence should describe. Defaults to the reader's,
   * which is right everywhere except a fixture surface. See `Voice`.
   */
  voice?: "you" | "this-person";
}

export function deriveStance(input: StanceInput): PursuitStance {
  const { entity, pursuit, now } = input;

  const declaration = pursuit.state === "declared" ? pursuit.declaration.state : "undeclared";
  const since = pursuit.state === "declared" ? pursuit.declaration.declaredAt : null;

  const urgency = deriveUrgency(entity, now);
  const outstanding = outstandingFor(entity, input.verification, input.judgments);
  const action = terminalAction(entity);

  const next = decide({ declaration, urgency, outstanding, action });

  return {
    entityId: entity.id,
    declaration,
    since,
    urgency,
    outstanding,
    next,
    statement: say({ next, urgency, since, outstanding, voice: VOICES[input.voice ?? "you"] }),
  };
}

function decide(input: {
  declaration: PursuitStance["declaration"];
  urgency: Urgency;
  outstanding: Outstanding[];
  action: TerminalAction | null;
}): NextMove {
  /*
    Declining is respected and not re-argued. Checked first, because everything
    below it is a way of helping someone toward a thing they have said they do
    not want.
  */
  if (input.declaration === "not-interested") return { kind: "declined" };

  /*
    A passed deadline outranks the declaration in both directions. Telling
    someone who said they were interested to go and act on something that closed
    last month is worse than saying nothing.
  */
  if (input.urgency.kind === "passed") {
    return { kind: "closed", deadline: input.urgency.deadline };
  }

  /*
    Undeclared. The move is to look, and nothing is assumed either way —
    silence is not a decline and not an interest.
  */
  if (input.declaration === "undeclared") return { kind: "review" };

  /*
    Interested, and something Opportunity X does not know stands in the way. This is
    checked before the action, and that order is the point: sending someone to
    apply while the deadline is contested and the eligibility unread would be
    treating their enthusiasm as a reason to stop mentioning what is unsettled.
  */
  if (input.outstanding.length > 0) {
    return { kind: "resolve-unknowns", outstanding: input.outstanding };
  }

  if (input.action) return { kind: "act", action: input.action };

  /* Interested, nothing unsettled, and nowhere agreed to send them. */
  return { kind: "watch" };
}

/**
 * The sentence, built here rather than in the component.
 *
 * Same reason the card's `shown` is built in the projection: what gets retained
 * as the delivered explanation has to be the thing that was rendered, and a
 * component composing its own wording makes the record a reconstruction.
 */
/**
 * Who the sentence is about.
 *
 * ── Why this is a parameter and not a hardcoded "you" ─────────────────────
 *
 * Because the same projection renders two different situations. On a live card
 * the position belongs to whoever is reading, and "you" is correct. On a
 * fixture card the position was written into the scenario, and "you" is a
 * statement attributed to a reader who never made it.
 *
 * That mismatch shipped: the card's heading was already voice-aware and read
 * "Since they said that", while the sentence underneath it — this one — said
 * "You said you were interested". Two voices in one paragraph, and the wrong
 * one asserting a position on the reader's behalf. It was invisible in every
 * test, because both halves were individually well-formed.
 *
 * The subject is carried here rather than fixed by string surgery in a
 * component: rewriting "You" to "They" downstream would have to re-conjugate
 * the verbs, and a projection whose prose is patched afterwards is no longer
 * the thing that was retained as the delivered explanation.
 */
interface Voice {
  /** "You said you were interested" / "They said they were interested" */
  said: string;
  /** The whole declined sentence, which re-conjugates too much to compose. */
  declined: string;
  /** "your time" / "their time" */
  theirTime: string;
  /** "you spend" / "they spend" */
  theySpend: string;
}

const VOICES: Record<"you" | "this-person", Voice> = {
  you: {
    said: "You said you were interested",
    declined: "You said this one isn’t for you. I’ve left it alone.",
    theirTime: "your time",
    theySpend: "you spend",
  },
  "this-person": {
    said: "They said they were interested",
    declined: "They said this one isn’t for them. I’ve left it alone.",
    theirTime: "their time",
    theySpend: "they spend",
  },
};

function say(input: {
  next: NextMove;
  urgency: Urgency;
  since: string | null;
  outstanding: Outstanding[];
  voice: Voice;
}): string {
  const { next, urgency, voice } = input;

  switch (next.kind) {
    case "review":
      return `Look at this and decide whether it is worth ${voice.theirTime}.`;

    case "declined":
      return voice.declined;

    case "closed":
      return `${voice.said}, and the deadline has passed.`;

    case "watch":
      return urgency.kind === "undated"
        ? `${voice.said}. Nothing I know stands in the way, but no source gave a closing date, so I can’t tell you when to move.`
        : `${voice.said}. Nothing I know stands in the way, and there is time.`;

    case "act":
      if (urgency.kind === "closing") {
        return urgency.daysLeft === 0
          ? `${voice.said}, and today is the last day.`
          : `${voice.said}, and there ${remaining(urgency.daysLeft)} left.`;
      }
      /*
        Undated has to be said even when everything else is clear. Dropping it
        here — which this branch originally did — produced "nothing stands in
        the way" for an opportunity whose closing date no source ever gave,
        which is the omission that lets a person assume there is time.
      */
      if (urgency.kind === "undated") {
        return `${voice.said}. Nothing I know stands in the way, but no source gave a closing date, so I can’t tell you when to move.`;
      }
      return `${voice.said}, and nothing I know stands in the way.`;

    case "resolve-unknowns": {
      const count = next.outstanding.length;
      const things = count === 1 ? "one thing" : `${count} things`;

      /*
        The deadline leads when it is near, because the person's decision is
        time-bound whether or not the unknowns get resolved. It never appears as
        a countdown or a colour — a number of days, once, stated.
      */
      if (urgency.kind === "closing") {
        return urgency.daysLeft === 0
          ? `${voice.said}. Today is the last day, and ${things} I still don’t know.`
          : `${voice.said}. There ${remaining(urgency.daysLeft)} left, and ${things} I still don’t know.`;
      }
      if (urgency.kind === "undated") {
        return `${voice.said}. ${things.charAt(0).toUpperCase()}${things.slice(1)} I don’t know, and no source gave a closing date.`;
      }
      return `${voice.said}. Before ${voice.theySpend} time on this, ${things} I don’t know.`;
    }
  }
}

/** "is 1 day" / "are 4 days". Never a countdown, never a colour — a number, once. */
function remaining(daysLeft: number): string {
  return daysLeft === 1 ? "is 1 day" : `are ${daysLeft} days`;
}
