import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * THE ONE COMMAND THE EXTERNAL CHECKPOINT DEPENDS ON
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `npm run sweep -- ng-fme` is the single instruction in
 * `docs/PHASE_10_EXTERNAL_VERIFICATION.md` that a person is asked to run on
 * their own machine. Six phases have pointed at it.
 *
 * **It had never worked.** It died on
 *
 *     Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@/lib'
 *       imported from src/lib/opportunity/observation/supabase-store.ts
 *
 * before reaching its own credential check, let alone the network. The engine
 * imports through the `@/` alias, which tsconfig resolves and Node does not, and
 * the resolve hook that fixes it lived in `test/` and was wired only into the
 * test runner.
 *
 * Nothing caught it because nothing ran it. The unit tests import the engine
 * *through the hook*, so every module resolved perfectly in the one context that
 * was exercised and in no other.
 *
 * This test runs the actual entry point as a subprocess, the way a person would.
 * It cannot assert what the sweep retrieves — that needs a network and a
 * database — but it can assert the thing that was broken: that the command
 * loads, resolves its whole import graph, and reaches its own logic.
 */

const SWEEP = [
  "--experimental-strip-types",
  "--import",
  "./scripts/register-alias.mjs",
  "scripts/sweep.ts",
];

/** Run the sweep and return whatever it printed, however it exited. */
function runSweep(args: string[], env: Record<string, string> = {}): string {
  try {
    return execFileSync(process.execPath, [...SWEEP, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60_000,
      env: {
        ...process.env,
        SUPABASE_URL: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
        FIRECRAWL_API_KEY: "",
        ...env,
      },
    });
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string };
    return `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
}

test("the sweep resolves its whole import graph", () => {
  /*
    The regression. A module-resolution failure means the command is dead on
    arrival on someone else's machine, and the failure names an internal path
    that tells them nothing about what to do.
  */
  const output = runSweep(["ng-fme"]);

  assert.equal(
    /ERR_MODULE_NOT_FOUND|Cannot find package/.test(output),
    false,
    `the sweep cannot load its own imports:\n${output.slice(0, 400)}`,
  );
});

test("the sweep refuses without credentials, and says which", () => {
  /*
    Reaching this message is the proof that the entry point loaded: it is printed
    by `main()`, after every import has resolved.

    It also has to name both variables. "Run this from a machine with ordinary
    outbound HTTPS" is not sufficient instruction — the sweep writes observations
    and needs the service-role key too, which is a second thing to have in hand.
  */
  const output = runSweep(["ng-fme"]);

  assert.match(output, /SUPABASE_URL/);
  assert.match(output, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(output, /will not run without somewhere durable/);
});

test("an unknown announcer id is refused rather than silently sweeping everything", () => {
  /*
    `npm run sweep` with no arguments sweeps all nine announcers; the documented
    bounded run passes one. A typo'd id must not quietly become the unbounded
    run — and `ng-fmoe` was in fact printed in an earlier handoff draft when the
    registry holds `ng-fme`.
  */
  const output = runSweep(["ng-fmoe"], {
    SUPABASE_URL: "https://example.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "unused",
  });

  assert.equal(
    /Fetching directly|Fetching through Firecrawl/.test(output),
    false,
    "an unknown announcer id started a sweep",
  );
});

test("the alias hook is reachable from outside the test directory", () => {
  /*
    The structural half of the fix. The hook now lives in `scripts/` because the
    test suite is not the only thing that runs the engine under plain Node —
    keeping it under `test/` is what let the sweep ship without it for six
    phases.
  */
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts: Record<string, string>;
  };

  assert.match(pkg.scripts.sweep, /--import \.\/scripts\/register-alias\.mjs/);
  assert.equal(
    /--import \.\/test\//.test(pkg.scripts.sweep),
    false,
    "a production script is importing from the test directory",
  );

  /* And the test runner still works through the same hook. */
  assert.match(readFileSync("test/register.mjs", "utf8"), /scripts\/register-alias\.mjs/);
});
