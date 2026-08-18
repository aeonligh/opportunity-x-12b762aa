/**
 * What a surface last knew, kept so a failed refresh cannot erase it.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * THE DEFECT THIS EXISTS FOR
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Measured in a browser, on `/lab/refresh`: a route showing valid content, asked
 * to re-read, and the re-read fails. The content vanishes and the route's error
 * boundary takes the page.
 *
 * That is the state system's rule inverted. Valid content plus a failed refresh
 * must remain **valid content plus a refresh failure** — never an error page, an
 * empty list, or a skeleton. Destroying known-good information in order to
 * report that fresher information could not be obtained is the same class of lie
 * as rendering an unreadable corpus as an empty one: in both, a limit on the
 * system is presented as a fact about the world.
 *
 * The router has no notion of "the last answer that worked". A loader either
 * resolves or throws, and a throw during `invalidate()` puts the route into its
 * error state with the previous data already discarded. So the surface has to
 * remember for itself.
 *
 * ── Why a module-level map rather than React state ────────────────────────
 *
 * Because the two components that need it never coexist. The component holding
 * the data unmounts when the error boundary mounts, so anything held in its own
 * state, a ref, or a context beneath it is gone precisely when it is wanted.
 * The value has to outlive the unmount, which means it has to live outside the
 * tree.
 *
 * ── What this is not ──────────────────────────────────────────────────────
 *
 * **Not a cache.** Nothing reads from here to satisfy a request, nothing is
 * served from it in place of a read, and its presence never shortens or skips a
 * fetch. It is only ever consulted after a read has already failed, and only to
 * answer "what were we showing a moment ago?".
 *
 * That distinction matters: a cache without an explicit freshness model makes
 * evidence go stale while looking current, which this product forbids. This
 * carries `at` for exactly that reason — anything rendering preserved content is
 * obliged to say how old it is.
 *
 * Per-tab and deliberately not persisted. It dies with the page, because a
 * "last good" answer from a previous session is not something this product
 * should reintroduce silently on load.
 */

export interface LastGood<T> {
  data: T;
  /** When this was last read successfully. Renderers must show it. */
  at: string;
}

const remembered = new Map<string, LastGood<unknown>>();

/**
 * Record a successful read.
 *
 * Called from the component that rendered it, so only data that actually reached
 * a person is remembered — a loader result that resolved and was then replaced
 * before paint was never shown, and claiming it as "what you were looking at"
 * would be false.
 */
export function rememberLastGood<T>(key: string, data: T): void {
  remembered.set(key, { data, at: new Date().toISOString() });
}

/** What this surface last showed, if it has shown anything this session. */
export function lastGood<T>(key: string): LastGood<T> | null {
  return (remembered.get(key) as LastGood<T> | undefined) ?? null;
}

/**
 * Forget a surface's last answer.
 *
 * For the case where preserved content would be actively misleading — a sign-out,
 * or a change of identity. Nothing calls it yet; it exists so that the obligation
 * is visible rather than discovered later.
 */
export function forgetLastGood(key: string): void {
  remembered.delete(key);
}

/** Test seam. Never called by the product. */
export function forgetEverythingLastGood(): void {
  remembered.clear();
}
