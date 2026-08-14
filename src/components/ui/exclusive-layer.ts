"use client";

import { useEffect } from "react";

/**
 * One layer open at a time, enforced in one place.
 *
 * ── CONSTITUTIONAL SPECIFICATION ──────────────────────────────────────────
 *
 * CS §07, Overlay — "Opening while one is open replaces, never stacks." Its
 * anti-pattern list names both halves of what was happening here: "A second
 * modal implementation · stacking".
 *
 * CS §07 also states the reason this cannot be left to care:
 *
 *   "The one-at-a-time rule cannot be enforced by discipline. If a second
 *    overlay implementation exists, someone will stack them, and stacked
 *    overlays are a known focus-management trap. The rule is enforceable only
 *    if there is exactly one component that can create one."
 *
 * IA §18 asks for the same thing from the engineering side: "A single overlay
 * primitive that enforces one-at-a-time, URL binding, focus trapping, and
 * Escape semantics — so the accessibility rule cannot be bypassed by building
 * a second one."
 *
 * IA §14, quoted by CS §07: "Escape returns exactly one level."
 *
 * ── What was measured ─────────────────────────────────────────────────────
 *
 * The prediction in that quoted paragraph had already come true. Four
 * components implemented their own dismissal — ui/Overlay, ProductSwitcher,
 * IdentityMenu, SummonAffordance — and only the first had a guard, which
 * covered only its own instances.
 *
 * In a browser, on the Step: opening the product switcher and then pressing the
 * summon keystroke without closing it left **two dialogs open at once**. One
 * Escape then closed **both**, where IA §14 allows exactly one level. Stacked
 * layers with two competing key handlers is the focus-management trap CS §07
 * names.
 *
 * ── Why a coordinator rather than one component ───────────────────────────
 *
 * CS §07's ideal is a single component. The shell's three elements are not
 * modals though — IA §05 fixes them as four named shell elements with their own
 * anchored geometry, and CS §07 lists them separately from Overlay under
 * "Shell". Forcing a switcher dropdown through a centred, portalled, focus-
 * trapping modal would satisfy the letter and break IA §05's shape.
 *
 * So the enforceable part is extracted instead of the markup: there is exactly
 * one place that decides which layer is open, and every dismissible layer
 * defers to it. Opening replaces. A component cannot opt out by forgetting,
 * because the hook is what makes it open at all.
 *
 * ── REJECTED ──────────────────────────────────────────────────────────────
 *
 *   Leaving it to review          — CS §07 says in as many words that
 *                                   discipline does not hold here.
 *   A per-component `if (other)`  — the same distributed rule, restated three
 *                                   times, drifting on the first edit.
 *   React context                 — the layers do not share a provider, and
 *                                   adding one would put shell state in the
 *                                   tree for a rule that is global by nature.
 */

/** The single open layer. Module scope, because the rule is global. */
let current: { id: string; close: () => void } | null = null;

/**
 * Registers an open layer, closing whichever was open before it.
 *
 * Returns nothing: callers never need to ask what else is open, which is the
 * property that keeps the rule in one place.
 */
export function useExclusiveLayer(id: string, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) {
      /* Only clear the slot if this layer still owns it. A layer that was
         already replaced must not wipe its replacement on the way out. */
      if (current?.id === id) current = null;
      return;
    }

    /* CS §07 — "Opening while one is open replaces, never stacks." */
    if (current && current.id !== id) current.close();
    current = { id, close };

    return () => {
      if (current?.id === id) current = null;
    };
  }, [id, open, close]);
}

/**
 * True when some other layer is already open.
 *
 * Read at the moment of a keystroke rather than during render, so a global
 * shortcut can decline to open on top of something — the keystroke replaces
 * deliberately, it never stacks.
 */
export function anotherLayerIsOpen(id: string) {
  return current !== null && current.id !== id;
}
