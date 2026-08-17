/**
 * Write, then read back — and four different things to say about how that went.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THIS IS NOT INSIDE THE COMPONENT
 * ══════════════════════════════════════════════════════════════════════════
 *
 * It was, and that made it untestable. The interesting behaviour of a mutation
 * is entirely in its failure branches, and reaching those from a React component
 * needs a DOM, a client renderer and an `act()` — none of which this suite has,
 * because the engine runs under `--conditions=react-server`. The alternative on
 * offer was asserting against the component's source text, which is how a test
 * keeps passing after the behaviour it describes has gone.
 *
 * So the sequence lives here as a plain async function over two injected calls,
 * and `test/state.test.ts` runs every branch of it directly.
 *
 * ── The distinction the whole thing exists for ────────────────────────────
 *
 * A write and the read that reveals it are two operations, and they fail
 * separately. Collapsing them gives three outcomes where there are four, and the
 * one that disappears is the nastiest:
 *
 *   idle     — written, and read back. Only now may a surface show the new state.
 *   refused  — the system declined *before* writing, and said why. Not a fault.
 *   failed   — nothing was written. Whatever was recorded before still is.
 *   stale    — written, and the read-back failed. The record has changed and the
 *              screen has not.
 *
 * Reported as `failed`, a `stale` write tells someone their declaration was lost
 * while it sits in the database. Reported as `idle`, it shows them a position
 * the surface has no evidence for. It needs its own answer, so it has one.
 */

/** What to say, once the attempt is over. Never a position — only how it went. */
export type WriteOutcome =
  /** Written and read back. The surface may now show what the record holds. */
  | { phase: "idle" }
  /** Declined before writing, in the words the action itself gave. */
  | { phase: "refused"; because: string }
  /** Nothing was written. The previous state is still the true one. */
  | { phase: "failed" }
  /** Written; the read-back failed. The surface is a moment out of date. */
  | { phase: "stale" };

/**
 * The sentence used when a refusal arrives without one.
 *
 * Deliberately admits to having no reason rather than inventing a plausible
 * one. A refusal that explains itself with a guess is worse than one that
 * doesn't explain itself at all, because the guess is unfalsifiable from where
 * the reader is standing.
 */
export const REFUSED_WITHOUT_REASON =
  "I could not keep that, and I don’t have a reason to give you.";

export async function performWrite({
  write,
  readBack,
}: {
  /** The mutation. Resolving with `recorded: false` is a refusal, not a fault. */
  write: () => Promise<{ recorded: boolean; limit?: string }>;
  /**
   * How the surface learns what was written. `null` means it has no way to —
   * which is the `stale` outcome, not the successful one, because a write
   * nobody can read back is a write the surface cannot honestly display.
   */
  readBack: (() => void | Promise<void>) | null;
}): Promise<WriteOutcome> {
  let result: { recorded: boolean; limit?: string };

  try {
    result = await write();
  } catch {
    /* Nothing was written. The caller still holds the previous truth. */
    return { phase: "failed" };
  }

  if (!result.recorded) {
    return { phase: "refused", because: result.limit ?? REFUSED_WITHOUT_REASON };
  }

  if (readBack === null) return { phase: "stale" };

  try {
    await readBack();
  } catch {
    /*
      The write stands. Only the view of it failed, and saying "failed" here
      would report a durable declaration as lost.
    */
    return { phase: "stale" };
  }

  return { phase: "idle" };
}
