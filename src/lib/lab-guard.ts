/**
 * The one condition under which the fixture laboratory is allowed to answer.
 *
 * Its own module, with no framework imports, for two reasons. It can be tested
 * directly — importing the server-function module pulls in the whole router and
 * React DOM, which a plain test runner cannot load, and a guard that is awkward
 * to test is a guard that ends up asserted structurally instead of actually
 * run. And it keeps the rule in one place, so every endpoint calls the same
 * sentence rather than each re-deciding what "development" means.
 */

/**
 * Throw unless this is a development server.
 *
 * ── Why the check is `=== "production"` and not `!== "development"` ───────
 *
 * Because unset is the common case, not the suspicious one. `bun run dev` does
 * not export `NODE_ENV` on every platform, and a guard that failed closed on
 * absence would make the laboratory unusable exactly where it is meant to be
 * used, which is how a safety check gets deleted rather than fixed.
 *
 * A production build sets `NODE_ENV=production`; that is the signal being
 * looked for, and it is the one an actual deployment reliably carries.
 *
 * ── Why it throws rather than returning nothing ──────────────────────────
 *
 * A laboratory that quietly returned an empty result in production would look
 * like a product with no opportunities in it. Rendering "there is nothing here"
 * when the truth is "this endpoint refused" is the exact confusion between
 * absence and inability that the rest of this codebase spends its effort
 * preventing.
 */
export function assertDevelopment(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "The fixture laboratory is not available in production. It exists so the product can be seen without a database, and its data is not real.",
    );
  }
}
