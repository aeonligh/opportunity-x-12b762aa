import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * CAN OPPORTUNITY X BE AUDITED BY SOMEONE WHO HAS ONLY OPPORTUNITY X?
 * ══════════════════════════════════════════════════════════════════════════
 *
 * For twenty-one phases this repository cited "Product Bible §07" and "IA Bible
 * §18" as binding law in 111 places, while containing no such document and no
 * record of where one might be. Anyone cloning it — including several of this
 * project's own later phases — had no way to tell whether the authority existed,
 * had been lost, or had never been written.
 *
 * Phase 21C settled that: the Bibles are missing, two sections survive as quoted
 * fragments, and the AEON X constitutional corpus was recovered and transferred.
 *
 * This test keeps the answer true. It does not check that the Bibles exist —
 * they do not, and asserting otherwise would be the fiction the phase forbade.
 * It checks the weaker property that actually matters: **every authority this
 * code cites is accounted for in a local record**, as recovered, as a fragment,
 * or as explicitly missing. A citation with no entry anywhere is the failure.
 */

const INVENTORY = "docs/AUTHORITY_INVENTORY.md";
const RECONCILIATION = "docs/AUTHORITY_CITATION_RECONCILIATION.md";

/** Every Bible citation in shipped source, normalised the way the docs are. */
function citationsInSource(): Set<string> {
  const alias: Record<string, string> = {
    PB: "Product Bible",
    XB: "Experience Bible",
    BB: "Brand Bible",
    IA: "IA Bible",
    "Information Architecture": "IA Bible",
    CS: "Component System Bible",
    Flows: "UX Flows Bible",
    "UX Flows": "UX Flows Bible",
  };
  const found = new Set<string>();
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = join(dir, e.name);
      if (e.isDirectory()) return walk(p);
      return /\.tsx?$/.test(e.name) ? [p] : [];
    });

  for (const file of walk("src")) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(
      /(Product|Experience|Brand|IA|Information Architecture|UX Flows|Flows|Component System|CS|PB|XB|BB)\s*(?:Bible)?\s*§\s*0*(\d+)/g,
    )) {
      const raw = m[1].replace(/ Bible$/, "");
      const authority = alias[raw] ?? `${raw} Bible`;
      found.add(`${authority} §${String(Number(m[2])).padStart(2, "0")}`);
    }
    for (const m of text.matchAll(/Brand Bible\s+(A-\d+)/g)) found.add(`Brand Bible ${m[1]}`);
  }
  return found;
}

test("every authority cited by the source is accounted for in a local record", () => {
  /*
    The real self-containment property. Not "a file called AUTHORITY_INVENTORY
    exists" — that would pass with an empty file — but that each citation the
    code actually makes appears in both records, with a status.
  */
  assert.ok(existsSync(INVENTORY), "the authority inventory is gone");
  assert.ok(existsSync(RECONCILIATION), "the citation reconciliation is gone");

  const inventory = readFileSync(INVENTORY, "utf8");
  const reconciliation = readFileSync(RECONCILIATION, "utf8");
  const cited = citationsInSource();

  assert.ok(cited.size > 0, "no citations found at all — the scanner is broken, not the repo");

  const unrecorded = [...cited].filter(
    (c) => !inventory.includes(c) || !reconciliation.includes(c),
  );

  assert.deepEqual(
    unrecorded,
    [],
    `source cites authorities with no local record: ${unrecorded.join(", ")}. ` +
      `Add them to ${INVENTORY} and ${RECONCILIATION} with a status — including MISSING, which is a valid status.`,
  );
});

test("recovered originals are present, and provenance names where each came from", () => {
  /*
    A transferred original with no provenance is indistinguishable from
    something written here and called recovered. The provenance file must name
    the source repository and the exact commit, because that is what makes the
    claim checkable by someone who does not trust it.
  */
  const provenance = readFileSync("docs/authority/PROVENANCE.md", "utf8");

  for (const f of [
    "blocked-procedures.md",
    "completion.md",
    "deployment.md",
    "opportunity-ownership.md",
    "rbac.md",
    "shared-database.md",
    "state.md",
  ]) {
    assert.ok(
      existsSync(`docs/authority/ORIGINAL_SOURCES/aeon-x-constitutional/${f}`),
      `recovered original missing: ${f}`,
    );
  }

  assert.match(
    provenance,
    /Aeon-X-Technologies-/,
    "provenance does not name the source repository",
  );
  assert.match(
    provenance,
    /6c161522c205f518665f6f30191359b391e5d842/,
    "provenance does not name the source commit",
  );
  assert.match(
    provenance,
    /VERIFIED COPY OF ORIGINAL/,
    "provenance does not state an authority status",
  );
});

test("the repository does not claim to hold a Bible", () => {
  /*
    The failure this phase most needed to avoid. If a later pass reconstructs a
    Bible from the code that cites it and files it under ORIGINAL_SOURCES, every
    citation resolves, this suite goes green, and the circularity is now load-
    bearing and invisible.

    So: no file may be named as a Bible, and the fragments file must keep saying
    what it is.
  */
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = join(dir, e.name);
      return e.isDirectory() ? walk(p) : [p];
    });

  const named = walk("docs").filter((p) => /bible/i.test(p.split("/").pop() ?? ""));
  assert.deepEqual(
    named.filter((p) => !p.endsWith("FRAGMENTS/BIBLE_FRAGMENTS.md")),
    [],
    `a file is named as a Bible: ${named.join(", ")}. No Bible was recovered; a reconstruction must not be filed as one.`,
  );

  const fragments = readFileSync("docs/authority/FRAGMENTS/BIBLE_FRAGMENTS.md", "utf8");
  assert.match(
    fragments,
    /STATUS: FRAGMENT/,
    "the fragments file stopped declaring itself a fragment",
  );
  assert.match(
    fragments,
    /No Bible was recovered/,
    "the fragments file stopped saying no Bible was recovered",
  );
});
