import { register } from "node:module";
import { pathToFileURL } from "node:url";

/**
 * Teach Node the `@/` alias.
 *
 * The application resolves `@/*` to `src/*` through tsconfig, which Node knows
 * nothing about. Anything that runs the engine outside Vite therefore needs this
 * registered first — the test suite, and `scripts/sweep.ts`.
 *
 * ── Why this moved out of `test/` ─────────────────────────────────────────
 *
 * It lived there because tests were the only thing that ran the engine under
 * plain Node. That was not true: `npm run sweep` does too, and it did not have
 * the hook — so **the one command the entire external checkpoint depends on had
 * never worked**, failing on `Cannot find package '@/lib'` before it reached its
 * own credential check.
 *
 * A resolve hook for the project's own import alias is not a testing concern. It
 * belongs where anything that needs it can reach it without importing from the
 * test directory.
 */
register("./alias-hook.mjs", pathToFileURL("./scripts/"));
