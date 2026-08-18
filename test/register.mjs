/**
 * Registers the `@/` path alias for `node --test`.
 *
 * The hook itself lives in `scripts/`, because the test suite is not the only
 * thing that runs the engine under plain Node — `npm run sweep` does too, and
 * for a long time it did not have this, which is why it had never run.
 *
 * Kept as its own file so the `test` script's `--import` path is unchanged.
 */
import "../scripts/register-alias.mjs";
