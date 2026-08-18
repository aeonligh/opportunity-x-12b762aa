import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * THE LABORATORY DOOR, AND THE THREE DOORS IT MUST NOT HAVE OPENED
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `/lab` exists so Opportunity X can be looked at without a database and
 * without an account. That is a real need — for long stretches of this project
 * neither was reachable — and the obvious way to meet it was to drop
 * `_authenticated` from a route. This file exists because that would have been
 * a production authentication change made for a development convenience, and
 * the kind of change that survives into a deployment precisely because it reads
 * as a routing tidy-up in a diff.
 *
 * So the tests here are not about whether the laboratory works. They are about
 * what it must never become:
 *
 *   - reachable in production,
 *   - a way to reach anyone's data,
 *   - a reason the product's own routes stopped being guarded.
 */

const LAB_SERVER = "src/lib/lab.server.ts";

/** Every `.ts`/`.tsx` under `src/`, generated route tree excluded. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!/\.tsx?$/.test(entry.name)) return [];
    if (entry.name === "routeTree.gen.ts") return [];
    return [path];
  });
}

test("the laboratory refuses to run in production", async () => {
  const { assertDevelopment } = await import("@/lib/lab-guard");

  const original = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    assert.throws(
      () => assertDevelopment(),
      /not available in production/,
      "a production server must not serve fixture data",
    );

    process.env.NODE_ENV = "development";
    assert.doesNotThrow(() => assertDevelopment());

    /* Unset is a development server that has not said so, not a production one.
       Failing closed here would break `bun run dev` for anyone whose shell does
       not export NODE_ENV, which is most of them. */
    delete process.env.NODE_ENV;
    assert.doesNotThrow(() => assertDevelopment());
  } finally {
    if (original === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = original;
  }
});

test("every laboratory endpoint is behind that refusal", () => {
  /*
    Structural, and deliberately so. The guard is worth nothing if a handler
    added later forgets to call it, and that omission is invisible in
    development — which is the only place anyone would ever run this code.
  */
  const source = readFileSync(LAB_SERVER, "utf8");

  const handlers = source.match(/\.handler\(async \([^)]*\) => \{/g) ?? [];
  assert.ok(handlers.length >= 5, `expected the laboratory's handlers, found ${handlers.length}`);

  /* Each handler body must call the guard before anything else. */
  const bodies = source.split(/\.handler\(async \([^)]*\) => \{/).slice(1);
  for (const [i, body] of bodies.entries()) {
    const firstStatement = body.trim().split("\n")[0].trim();
    assert.equal(
      firstStatement,
      "assertDevelopment();",
      `handler ${i + 1} does not open with the production guard`,
    );
  }
});

test("the laboratory has no route to anyone's data", () => {
  /*
    It holds no Supabase client, no service-role key, and takes no user id from
    the request — so there is nothing for an unauthenticated caller to reach
    even if the guard were defeated. Belt and braces, because the guard is one
    `if`.
  */
  /* Comments are stripped first: this file's own header explains *why* it holds
     no client, and the word appearing in that explanation is not a reach for
     one. Scanning the prose would make the honest documentation fail the test. */
  const source = readFileSync(LAB_SERVER, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  for (const forbidden of [
    /supabase/i,
    /SERVICE_ROLE/,
    /requireSupabaseAuth/,
    /createClient/,
    /getUser|getClaims|getSession/,
  ]) {
    assert.doesNotMatch(source, forbidden, `the laboratory reaches for ${forbidden}`);
  }
});

test("the product's own surfaces are still authenticated", () => {
  /*
    The point of building a separate door was to leave these alone. If a future
    change moves one of them out of `_authenticated`, this fails — which is the
    warning the diff itself would not give.
  */
  const guarded = readdirSync("src/routes/_authenticated");

  for (const surface of ["opportunities.tsx", "opportunities.$id.tsx", "saved.tsx"]) {
    assert.ok(guarded.includes(surface), `${surface} left the authenticated tree`);
  }

  /*
    And the gate itself still redirects rather than rendering.

    Matched across whitespace deliberately. The first version of this pinned the
    call to one line — `/throw redirect\(\{ to: "\/auth"/` — and broke in Phase 18
    when the redirect grew a third argument and Prettier wrapped it. The
    invariant had not changed at all; only its formatting had. An assertion that
    fails on a reformat is testing the formatter, and the noise trains whoever
    sees it to reach for the regex instead of the behaviour.
  */
  const gate = readFileSync("src/routes/_authenticated/route.tsx", "utf8");
  assert.match(gate, /throw redirect\(\{[\s\S]*?to:\s*"\/auth"/, "the gate no longer redirects");
  assert.match(gate, /next:\s*location\.href/, "the gate no longer carries the destination");
});

test("a fixture surface always says it is a fixture", () => {
  /*
    A fixture card and a real card are the same shape by construction — that is
    what makes the laboratory evidence about the product rather than a mockup —
    so the only thing separating the two is what the page says about itself.
  */
  const frame = readFileSync("src/components/lab/LabFrame.tsx", "utf8");
  assert.match(frame, /Fixture laboratory/i);
  assert.match(frame, /not real opportunities|not.*real source/i);

  for (const route of ["src/routes/lab.index.tsx", "src/routes/lab.$id.tsx"]) {
    const source = readFileSync(route, "utf8");
    assert.match(source, /evidence="fixture"/, `${route} renders cards without the fixture marker`);
  }
});

test("the laboratory does not invent product concepts", async () => {
  /*
    The states it shows must be states the engine actually produces. A
    laboratory that grew its own vocabulary would start driving the
    architecture instead of reflecting it — and these four words in particular
    name things this product has repeatedly been asked not to have.
  */
  const sources = [
    "src/lib/lab.server.ts",
    "src/routes/lab.index.tsx",
    "src/routes/lab.$id.tsx",
    "src/routes/lab.saved.tsx",
    "src/components/lab/LabFrame.tsx",
  ].map((f) => readFileSync(f, "utf8"));

  for (const source of sources) {
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    for (const invented of [/\bLedger\b/i, /\bcommitment\b/i, /\bpreparation\b/i, /\bscore\b/i]) {
      assert.doesNotMatch(code, invented, `the laboratory invented ${invented}`);
    }
  }
});

test("the fixture corpus is reachable from exactly the surfaces that label it", () => {
  /*
    The safety invariant, enforced rather than described.

    `demo.ts` carried this rule in prose and named two routes —
    `/opportunity/preview` and `/opportunity/preview/[entityId]` — for a long
    time after both were deleted. Nobody noticed, because a comment cannot fail.
    A safety claim documented against routes that do not exist is worse than no
    claim at all: it reads as though someone checked.

    So the rule is a test now. If a new caller imports the fixture corpus, this
    fails and whoever added it has to say which surface labels the result.
  */
  const importers = sourceFiles("src").filter((f) =>
    /surface\/demo|demoCorpus/.test(readFileSync(f, "utf8")),
  );

  assert.deepEqual(
    importers.sort(),
    [
      "src/lib/lab.server.ts",
      "src/lib/opportunities.server.ts",
      "src/lib/opportunity/surface/demo.ts",
    ],
    "something new can reach the fixture corpus",
  );

  /* And every route that renders it says so on the card itself. */
  for (const route of [
    "src/routes/lab.index.tsx",
    "src/routes/lab.$id.tsx",
    "src/routes/_authenticated/opportunities.examples.tsx",
  ]) {
    assert.match(
      readFileSync(route, "utf8"),
      /evidence="fixture"/,
      `${route} renders fixture data without marking it`,
    );
  }
});

test("no shipped route reference points at a route that does not exist", () => {
  /*
    `AUTH_LANDING_PATH` once pointed at `/workspace` after those routes were
    deleted — a 404 at the moment someone had just proved who they are. That is
    already pinned in `standalone.test.ts`; this widens it to every literal
    in-app path a component navigates to.

    Only `to="/…"` and `to: "/…"` are checked: those are router destinations,
    which is where a dead path becomes a dead end. Hrefs to other origins,
    anchors and API paths are not router destinations and are left alone.
  */
  const tree = readFileSync("src/routeTree.gen.ts", "utf8");
  const dead: string[] = [];

  for (const file of sourceFiles("src")) {
    const source = readFileSync(file, "utf8");
    for (const m of source.matchAll(/\bto[=:]\s*"(\/[^"{}$]*)"/g)) {
      const path = m[1].replace(/\/$/, "") || "/";
      if (path.startsWith("/api")) continue;
      if (tree.includes(`'${path}'`) || tree.includes(`"${path}"`)) continue;
      dead.push(`${file}  →  ${path}`);
    }
  }

  assert.deepEqual(dead, [], `router destinations with no route:\n${dead.join("\n")}`);
});
