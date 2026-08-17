import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * ONE PRODUCT
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Phase 12 found that the repository contained two incompatible products. Phase
 * 13 retired one of them. This file is the barrier that keeps it retired.
 *
 * The question every assertion here asks is the one the directive posed:
 *
 *   > Can a real user still enter the old product?
 *
 * Not "is the old UI hidden" — hiding is a CSS problem and CSS is not an
 * architecture. So these check for the legacy system's *existence*: its files,
 * its identifiers, its tables, its routes in the generated tree, and its routes
 * in the built artifact. A thing that is not built cannot be reached.
 *
 * ── Why so much of this is about names ────────────────────────────────────
 *
 * Because the legacy system's defining property was a claim, not a file. A
 * percentage next to an opportunity is the composite score CR-21 forbids, and it
 * can be reintroduced by anyone in any component in twenty minutes. The
 * assertions therefore guard the *shape of the claim* as well as the modules
 * that used to make it.
 */

const LEGACY_MODULES = [
  "src/components/MatchScoreBadge.tsx",
  "src/components/OpportunityCard.tsx",
  "src/components/OpportunitySection.tsx",
  "src/components/UrgencyBadge.tsx",
  "src/components/EligibilityPanel.tsx",
  "src/components/CopilotPanel.tsx",
  "src/components/ShareToWhatsApp.tsx",
  "src/components/Header.tsx",
  "src/lib/intelligence.functions.ts",
  "src/lib/execution.functions.ts",
  "src/lib/admin.functions.ts",
  "src/lib/analytics.functions.ts",
  "src/lib/deadline-intelligence.server.ts",
  "src/routes/search.tsx",
  "src/routes/opportunity.$id.tsx",
  "src/routes/_authenticated/vault.tsx",
  "src/routes/_authenticated/onboarding.tsx",
  "src/routes/_authenticated/dashboard.tsx",
  "src/routes/api/public/hooks/crawl-opportunities.ts",
  "src/routes/api/public/hooks/deadline-reminders.ts",
];

/** Legacy paths a person could once type into the address bar. */
const LEGACY_ROUTES = [
  "/search",
  "/opportunity/$id",
  "/vault",
  "/onboarding",
  "/dashboard",
  "/dashboard/applications",
  "/dashboard/documents",
  "/admin",
  "/admin/queue",
  "/admin/featured",
  "/admin/analytics",
  "/api/public/hooks/crawl-opportunities",
  "/api/public/hooks/deadline-reminders",
];

/** The legacy data model. Nothing in the application may read or write it. */
const LEGACY_TABLES = [
  "match_scores",
  "saved_opportunities",
  "eligibility_results",
  "generated_sops",
  "cv_optimizations",
  "user_documents",
  "sent_reminders",
  "discovery_runs",
  "opportunity_analytics",
];

/** Every `.ts`/`.tsx` under `src/`, generated route tree and DB mirror excluded. */
function sourceFiles(dir = "src"): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!/\.tsx?$/.test(entry.name)) return [];
    /* `routeTree.gen.ts` is generated from the routes; `types.ts` mirrors the
       database, which still holds the legacy tables and is not the application
       reading them. Both are asserted about separately. */
    if (entry.name === "routeTree.gen.ts") return [];
    if (path === join("src", "integrations", "supabase", "types.ts")) return [];
    return [path];
  });
}

function read(path: string): string {
  return readFileSync(path, "utf8");
}

/**
 * Code only.
 *
 * Phase 13 deliberately left comments explaining what was removed and why — a
 * deletion nobody can find the reasoning for gets reinvented. Those comments
 * name the legacy identifiers, so an assertion over raw text would fail on its
 * own documentation, and the fix would be to delete the explanations.
 */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/* ══════════════════════════════════════════════════════════════════════════
   1 · The legacy system does not exist
   ══════════════════════════════════════════════════════════════════════════ */

test("no legacy module is present in the source tree", () => {
  for (const path of LEGACY_MODULES) {
    assert.equal(existsSync(path), false, `${path} is back`);
  }
});

test("no legacy route exists in the generated route tree", () => {
  /*
    The generated tree is the authority on what the router will serve. A route
    file that exists is a route a person can reach by typing the path, whether or
    not anything links to it.
  */
  const tree = read("src/routeTree.gen.ts");
  const paths = [...tree.matchAll(/^ {2}path: '([^']+)'/gm)].map((m) => m[1]);

  for (const legacy of LEGACY_ROUTES) {
    assert.equal(paths.includes(legacy), false, `${legacy} is routable again`);
  }

  /* And the canonical set is what remains. */
  for (const canonical of ["/", "/auth", "/saved"]) {
    assert.ok(paths.includes(canonical), `${canonical} disappeared`);
  }
});

test("nothing in the application links to a legacy route", () => {
  /*
    TypeScript already refuses `to="/search"` once the route is gone — that is
    how the three surviving landing-page links were found. This covers what the
    type system cannot see: raw `href`s, redirects built from strings, and
    metadata.
  */
  for (const path of sourceFiles()) {
    const text = code(read(path));
    for (const legacy of ["/search", "/vault", "/dashboard", "/onboarding", "/admin"]) {
      const linked = new RegExp(`(to|href)=["'\`]${legacy}\\b`).test(text);
      assert.equal(linked, false, `${path} links to ${legacy}`);
    }
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   2 · No opaque score, under any name — CR-21
   ══════════════════════════════════════════════════════════════════════════ */

test("nothing renders a match percentage", () => {
  /*
    The claim, not the component. `MatchScoreBadge` is gone, and the rule it
    broke is about the shape of the statement: a number standing for how well an
    opportunity suits a person. It can come back as a ring, a bar, a chip or a
    bare `{n}%`, so this looks for the sentence rather than the widget.
  */
  const forbidden = [
    /\{[^}]*\b(match|fit|relevance)Score[^}]*\}\s*%/i,
    /\b\d{1,3}%\s*Match\b/i,
    /Avg\s*match/i,
    /match_score/,
  ];

  for (const path of sourceFiles()) {
    const text = code(read(path));
    for (const pattern of forbidden) {
      assert.equal(pattern.test(text), false, `${path} reintroduces a match score (${pattern})`);
    }
  }
});

test("the engine holds no score at all", () => {
  /*
    Stronger than the surface rule and narrower in scope: the constitutional
    engine must not compute one either, because a score that exists will
    eventually be displayed.
  */
  for (const path of sourceFiles("src/lib/opportunity")) {
    const text = code(read(path));
    /*
      Any affix, any casing. `\b(score|scoring)\b` was the first attempt and it
      missed both `fitScore` — camelCase puts no word boundary before "score" —
      and `scored`, which `judgeAll` used for a local holding three separate sort
      criteria. No number was ever computed there, but a variable named for a
      judgment this engine does not make is how that judgment eventually gets
      written, so the name went and the pattern widened.
    */
    const found = text.match(/\w*scor\w*/i);
    assert.equal(found, null, `${path} names something a score: ${found?.[0]}`);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   3 · One declaration store, one write path
   ══════════════════════════════════════════════════════════════════════════ */

test("the application never touches a legacy table", () => {
  for (const path of sourceFiles()) {
    const text = code(read(path));
    for (const table of LEGACY_TABLES) {
      assert.equal(
        new RegExp(`from\\(["'\`]${table}["'\`]\\)`).test(text),
        false,
        `${path} reads or writes ${table}`,
      );
    }
  }
});

test("exactly one module writes a declaration", () => {
  /*
    There were three: `pursuit.functions.ts`, a dead duplicate pair in
    `opportunities.server.ts` writing the same table with a differently-shaped
    return, and the legacy card writing `saved_opportunities` outright. A
    duplicate write path is the one a future change picks by accident.

    The laboratory's store is deliberately excluded — it is development-only,
    refused in production by `assertDevelopment`, and writing to it is how the
    fixture walk proves the real control's read-back path.
  */
  const writers = sourceFiles("src/lib").filter((path) => {
    if (path.endsWith("lab.server.ts")) return false;
    if (path.endsWith("pursuit/supabase-log.ts")) return false; // the store itself
    return /\blog\.declare\(|\blog\.withdraw\(/.test(code(read(path)));
  });

  assert.deepEqual(writers, ["src/lib/pursuit.functions.ts"]);
});

test("saved reads the canonical store and nothing else", () => {
  const saved = code(read("src/routes/_authenticated/saved.tsx"));
  assert.match(saved, /listSaved/);
  assert.equal(/saved_opportunities/.test(saved), false);

  /* And what `listSaved` resolves comes from the pursuit log. */
  const service = code(read("src/lib/opportunity/surface/service.ts"));
  assert.match(service, /pursuitLogFor|pursuitsFor|resolveDeclarations/);
});

/* ══════════════════════════════════════════════════════════════════════════
   4 · Nothing runs on its own
   ══════════════════════════════════════════════════════════════════════════ */

test("the server entry starts no background job", () => {
  /*
    `src/server.ts` used to call the deadline-reminder scan on startup and then
    every hour on a `setInterval`, reading every user's saved opportunities and
    emailing them. On a serverless target every cold start is a server start, so
    the schedule was neither hourly nor bounded — and it needed no request, which
    is why Phase 12's shared secret on the two HTTP hooks did not cover it.
  */
  const server = code(read("src/server.ts"));
  assert.equal(/setInterval|setTimeout/.test(server), false, "the entry schedules work again");
  assert.equal(/deadline|reminder/i.test(server), false);
});

test("no unauthenticated route can reach the service role", () => {
  /*
    Both public hooks are gone, so the surviving service-role callers must all
    sit behind the authenticated middleware or the development-only laboratory
    guard.
  */
  const callers = sourceFiles("src/lib").filter((path) =>
    /supabaseAdmin|hasServiceRoleCredentials/.test(code(read(path))),
  );

  for (const path of callers) {
    const text = code(read(path));
    const guarded =
      /requireSupabaseAuth/.test(text) ||
      /assertDevelopment/.test(text) ||
      /client\.server/.test(path) ||
      path.includes("/opportunity/"); // engine internals, called by guarded entries
    assert.ok(guarded, `${path} reaches the service role with no guard`);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   5 · The built artifact, not only the source
   ══════════════════════════════════════════════════════════════════════════ */

test(
  "the production build contains no legacy route",
  { skip: !existsSync(".vercel/output") },
  () => {
    /*
    Source is what we wrote; the artifact is what ships. They diverge when a
    stale build is deployed, and "we deleted it" is not the same claim as "it is
    not in the bundle".

    Skipped when no build is present so the suite stays runnable without one;
    `bun run build` before `npm test` exercises it.
  */
    const files: string[] = [];
    (function walk(dir: string) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (/\.(mjs|js)$/.test(entry.name) && statSync(path).size < 4_000_000)
          files.push(path);
      }
    })(".vercel/output");

    assert.ok(files.length > 0, "no build output to inspect");

    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      /* Route *definitions*, not incidental strings: the router registers each
       path with its id, which is what makes it reachable. */
      for (const legacy of ["/opportunity/$id", "/vault", "/dashboard", "/onboarding", "/admin"]) {
        if (text.includes(`id: '${legacy}'`) || text.includes(`id: "${legacy}"`)) {
          offenders.push(`${file} → ${legacy}`);
        }
      }
    }
    assert.deepEqual(offenders, []);
  },
);
