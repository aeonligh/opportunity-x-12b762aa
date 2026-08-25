/**
 * Whether React has finished hydrating this document.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHAT THIS IS FOR, AND WHY IT IS NOT A GENERAL-PURPOSE FLAG
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Exactly one decision depends on it: whether the authenticated gate's redirect
 * to `/auth` can be an ordinary client navigation, or has to be a document
 * navigation.
 *
 * The reason is traced in `session-verification.ts`. A protected route is
 * `ssr: false`, so the server emits the gate's pending shell — it has no way to
 * know whether there is a session, because the session lives in `localStorage`.
 * If the client then discovers the answer is "no session" and the *router*
 * redirects, the entire match set changes while React is still hydrating, and
 * React finds `/auth`'s markup where the server wrote the gate's. Measured:
 * DOMContentLoaded at 85ms, redirect at 449ms, hydration mismatch every time.
 *
 * After hydration the same redirect is an ordinary navigation and is completely
 * clean — measured, and covered by a check in the state walk.
 *
 * So the flag answers one question: *has React finished, such that changing the
 * route is safe?* Before that point the honest repair is to ask the server for
 * the page it should have rendered, rather than to patch a tree it rendered on
 * a guess.
 *
 * ── Why a module flag rather than `useHydrated()` ─────────────────────────
 *
 * The decision is made in `beforeLoad`, which is not a component and cannot
 * call a hook. The router runs it before anything renders, which is precisely
 * why the problem exists.
 *
 * Deliberately not exported as a hook and deliberately not read anywhere else.
 * A flag that says "we are past hydration" invites `if (isHydrated())` branches
 * throughout a codebase, and every one of them is a server/client divergence
 * waiting to become the next mismatch.
 */
let hydrated = false;

/** Called once, from the root component's mount effect. */
export function markHydrated(): void {
  hydrated = true;
}

/** True once React has committed the initial client render. */
export function isHydrated(): boolean {
  return hydrated;
}
