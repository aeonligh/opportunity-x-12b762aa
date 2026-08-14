import { register } from "node:module";
import { pathToFileURL } from "node:url";

/**
 * Registers the `@/` path alias for `node --test`.
 *
 * The application resolves `@/*` to `src/*` through tsconfig, which Node knows
 * nothing about. Rather than add a test runner and its dependency tree to carry
 * one mapping, the mapping is nine lines of a resolve hook.
 *
 * Node 22 strips TypeScript types natively, so the tests import the real
 * modules — not a compiled copy that could drift from them.
 */
register("./hook.mjs", pathToFileURL("./test/"));
