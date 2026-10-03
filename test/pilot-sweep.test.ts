import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { ANNOUNCERS, announcerFor, classify } from "@/lib/opportunity/announcers/registry";
import { PILOT_SOURCE_PAGES } from "@/lib/opportunity/announcers/pilot";
import { planSweep, mechanismsForSweep } from "@/lib/opportunity/discovery/sweep-plan";
import { runDiscovery } from "@/lib/opportunity/discovery/run";
import { InMemoryObservationStore } from "@/lib/opportunity/observation/store";
import { InMemoryVerificationLog } from "@/lib/opportunity/verification/log";

const entry = [
  "--experimental-strip-types",
  "--import",
  "./scripts/register-alias.mjs",
  "scripts/sweep.ts",
];
function command(args: string[]) {
  return spawnSync(process.execPath, [...entry, ...args], {
    encoding: "utf8",
    timeout: 20_000,
    env: {
      ...process.env,
      SUPABASE_URL: "https://example.invalid",
      SUPABASE_SERVICE_ROLE_KEY: "unused",
      FIRECRAWL_API_KEY: "",
      OPEN_WEB_SEARCH_API_KEY: "",
    },
  });
}

test("pilot dry run reaches the real entry point without credentials or writes", () => {
  const result = command(["--pilot", "--dry-run"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /20 publishers, 25 seed pages/);
  const urls = result.stdout
    .split("\n")
    .filter((line) => line.startsWith("  https://"))
    .map((line) => line.trim())
    .sort();
  assert.deepEqual(urls, PILOT_SOURCE_PAGES.map((page) => page.url).sort());
  assert.match(result.stdout, /No network calls or database writes/);
  assert.doesNotMatch(
    result.stdout + result.stderr,
    /Fetching directly|Fetching through Firecrawl|Discovery run/,
  );
});

test("one valid id cannot hide another mistyped id", () => {
  const result = command(["ng-uniben", "ng-fmoe"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown announcer or option: ng-fmoe/);
  assert.doesNotMatch(result.stdout, /Fetching/);
});

test("pilot scope cannot be widened with extra ids or unknown flags", () => {
  assert.equal(planSweep(["--pilot", "ng-fme"]).ok, false);
  assert.equal(planSweep(["--pilot", "--dry-rnu"]).ok, false);
});

test("registry selection still supports named publishers and the full discovery mechanisms", () => {
  const selected = planSweep(["ng-uniben", "ng-uniben", "--dry-run"]);
  assert.equal(selected.ok, true);
  if (!selected.ok) throw new Error(selected.error);
  assert.deepEqual(
    selected.announcers.map((a) => a.id),
    ["ng-uniben"],
  );
  assert.deepEqual(
    mechanismsForSweep(selected).map((m) => m.id),
    ["institutional-channels", "change-detection", "unknown-domain-discovery"],
  );
  const all = planSweep([]);
  assert.ok(all.ok);
  assert.equal(all.announcers.length, ANNOUNCERS.length);
});

test("pilot pages have unique identities and belong to their declared publisher", () => {
  assert.equal(new Set(PILOT_SOURCE_PAGES.map((p) => p.id)).size, PILOT_SOURCE_PAGES.length);
  assert.equal(new Set(PILOT_SOURCE_PAGES.map((p) => p.url)).size, PILOT_SOURCE_PAGES.length);
  for (const page of PILOT_SOURCE_PAGES)
    assert.equal(announcerFor(page.url)?.id, page.announcerId, page.url);
  assert.equal(
    classify("https://candidate.scholastica.ng/schemes/2026CNLawards").sourceClass,
    "announcer",
  );
  assert.equal(announcerFor("https://uniben.edu.evil.example/"), null);
  assert.equal(announcerFor("https://fakeuniben.edu/"), null);
});

test("a pilot discovery run reads the exact seeds and robots policies without following links", async () => {
  const plan = planSweep(["--pilot"]);
  assert.ok(plan.ok);
  const requested: string[] = [];
  const report = await runDiscovery({
    store: new InMemoryObservationStore(),
    verification: new InMemoryVerificationLog(),
    mechanisms: mechanismsForSweep(plan),
    politenessMs: 0,
    wait: async () => {},
    transport: async (url) => {
      requested.push(url);
      if (new URL(url).pathname === "/robots.txt")
        return new Response("User-agent: *\nAllow: /\n", {
          headers: { "content-type": "text/plain" },
        });
      return new Response(
        '<html><title>Test fixture only</title><a href="/out-of-scope">Another call</a></html>',
        { headers: { "content-type": "text/html; charset=utf-8" } },
      );
    },
  });
  assert.equal(report.requested, PILOT_SOURCE_PAGES.length);
  assert.equal(report.retrieved, PILOT_SOURCE_PAGES.length);
  assert.deepEqual(
    requested.filter((url) => new URL(url).pathname !== "/robots.txt").sort(),
    PILOT_SOURCE_PAGES.map((page) => page.url).sort(),
  );
  assert.equal(
    requested.some((url) => url.includes("out-of-scope")),
    false,
  );
  assert.deepEqual(
    report.coverage.filter((c) => c.ran).map((c) => c.id),
    ["institutional-channels"],
  );
  assert.equal(report.transitions.length, 0, "a plain page title must not invent an opportunity");
});
