/**
 * Server-only guard.
 *
 * The engine arrived from a Next.js codebase where `import "server-only"` was a
 * build-time error if a module reached the client bundle. Vite has no such
 * package; its convention is the `*.server.ts` filename, which the rest of this
 * repository already uses.
 *
 * Renaming seven engine modules to `.server.ts` would have rippled through
 * every import in the engine and its tests for no behavioural gain, so the
 * guarantee is kept as a runtime one instead: importing any of these in a
 * browser throws immediately and loudly, rather than shipping a service-role
 * client to a page.
 *
 * It is weaker than the build-time check it replaces — it fails on first load
 * rather than at build — and that is a deliberate, stated trade. If a module
 * here ever needs the stronger guarantee, rename it `.server.ts` and Vite will
 * enforce it at build time.
 */
if (typeof window !== "undefined") {
  throw new Error(
    "This module is server-only and was imported in the browser. It reads credentials that must never reach a client bundle."
  );
}

export {};
