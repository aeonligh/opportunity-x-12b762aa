"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useExclusiveLayer } from "@/components/ui/exclusive-layer";

/**
 * Overlay — the one primitive every depth surface is built from.
 *
 * Constitutional authority:
 *   IA Bible §14 — one overlay at a time, Escape returns exactly one level,
 *     depth is URL state.
 *   Experience Bible §6 — "Depth opens over the surface and closes back to it.
 *     Losing your place is a cost, and cost applied to scrutiny is a dark
 *     pattern." Verification must never cost more than acceptance.
 *   Component System §07 — "The one-at-a-time rule cannot be enforced by
 *     discipline. If a second overlay implementation exists, someone will stack
 *     them... The rule is enforceable only if there is exactly one component
 *     that can create one."
 *
 * Two things here were learned the hard way and are not theoretical:
 *
 *   1. It portals to document.body. The shell carries `backdrop-blur`, and an
 *      ancestor with `backdrop-filter` becomes the containing block for
 *      `position: fixed` descendants — so an overlay rendered in place is
 *      clamped to the header's box and silently fails to isolate. This was
 *      found in production on the summon affordance.
 *
 *   2. The scrim is true black at 60%, never the background token. Tinting
 *      near-black with near-black dims nothing, which was the second half of
 *      the same bug.
 */

/** Module-level guard. A second open Overlay is a bug, not a layout choice. */
let openCount = 0;

export function Overlay({
  open,
  onClose,
  /** Names the dialog for assistive technology. Required — never decorative. */
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  /* The same coordinator the shell's layers use. The module-level guard below
     only ever saw other Overlay instances; the switcher, identity menu and
     summon layer are not Overlays, and measured, one of them could sit open
     underneath this one. CS §07 — "Opening while one is open replaces, never
     stacks." */
  useExclusiveLayer("overlay", open, onClose);

  /* Escape closes exactly one level — never the whole stack, because there is
     never a stack. */
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      // Focus trap. Without it, tabbing walks out onto the inert surface
      // underneath, which is a known failure of hand-rolled overlays.
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;

    openCount += 1;
    if (openCount > 1 && process.env.NODE_ENV !== "production") {
      // Loud rather than silent: stacked overlays are a focus-management trap,
      // and the constitution forbids them outright.
      console.error(
        "Overlay: a second overlay opened while one was already open. IA §14 permits exactly one."
      );
    }

    returnFocusTo.current = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", onKeyDown, true);

    // The surface behind must not scroll under the overlay — losing your place
    // is the exact cost XB §6 forbids applying to scrutiny.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus enters on open.
    const frame = requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(
        'button,a[href],input,[tabindex]:not([tabindex="-1"])'
      );
      (target ?? panelRef.current)?.focus();
    });

    return () => {
      openCount -= 1;
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      // ...and returns to the trigger on close.
      returnFocusTo.current?.focus();
    };
  }, [open, onKeyDown]);

  /*
    No mounted-flag effect. Setting state in an effect purely to detect the
    client causes a cascading render, and this component already has a stable
    answer: an overlay is opened by an interaction, so `open` is false on the
    server and on the first client render alike. Guarding on `document` keeps
    createPortal safe during SSR without introducing a second source of truth
    that could disagree with the first — which is how the reduced-motion
    hydration mismatches in this codebase were built.
  */
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/*
        Scrim: true black at 60% plus blur (CS §07). Dismisses on click.
        aria-hidden because the dialog below carries the accessible name; a
        focusable scrim would be a tab stop that means nothing.
      */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm motion-safe:animate-[overlay-in_240ms_cubic-bezier(0.65,0,0.35,1)]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-border bg-surface/95 outline-none backdrop-blur-xl motion-safe:animate-[overlay-panel-in_240ms_cubic-bezier(0.65,0,0.35,1)] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[80vh] sm:w-[min(42rem,calc(100vw-3rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border"
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
