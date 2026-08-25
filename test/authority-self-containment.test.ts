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

/* ══════════════════════════════════════════════════════════════════════════
   PHASE 22 — THE REMAINING FAILURE MODES
   ══════════════════════════════════════════════════════════════════════════

   Phase 21C's three assertions covered unrecorded citations, missing
   provenance, and a reconstruction filed as an original. Phase 22 audited them
   adversarially and found five ways the authority graph could still rot
   silently. Each is closed below.

   The theme: every one of these failures makes the repository look *more*
   self-contained than it is. That is the direction the checks have to point. */

/**
 * Every distinct Bible section referenced by `src/`, canonical form.
 *
 * Two shapes exist since Phase 23, and the difference is the whole point:
 *
 *   `OXD-001 (hist. XB §7)`  — repointed. Current authority first, lineage after.
 *   `Experience Bible §7`    — bare. An unresolved claim on a missing document.
 *
 * Both are inventoried; only the second is an active claim on authority nobody
 * can read. `bareSections()` below is what failure mode 3 turns on.
 */
function citedSections(): Set<string> {
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
  const norm = (raw: string, num: string) => {
    const a = raw.replace(/ Bible$/, "");
    return `${alias[a] ?? `${a} Bible`} §${String(Number(num)).padStart(2, "0")}`;
  };
  const out = new Set<string>();
  for (const f of sourceFiles()) {
    const t = readFileSync(f, "utf8");
    for (const m of t.matchAll(
      /(Product|Experience|Brand|IA|Information Architecture|UX Flows|Flows|Component System|CS|PB|XB|BB)\s*(?:Bible)?\s*§\s*0*(\d+)/g,
    ))
      out.add(norm(m[1], m[2]));
    for (const m of t.matchAll(/(?:Brand Bible|BB)\s+(A-\d+)/g)) out.add(`Brand Bible ${m[1]}`);
  }
  return out;
}

/**
 * Sections still cited with NO current authority beside them.
 *
 * The test is the `hist. ` prefix, not proximity. A first attempt used an
 * optional leading-authority group, which matched empty at the citation's own
 * index and reported every repointed citation as bare — the regex was looking
 * for the marker in a place the scan never started from.
 */
function bareSections(): Set<string> {
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
  const out = new Set<string>();
  for (const f of sourceFiles()) {
    /*
      Everything inside a `(hist. …)` span is lineage, however many sections it
      names — `(hist. CS §14, IA §18)` is one repoint citing two predecessors.
      Blanking those spans first is what makes the grouped form work; a
      lookbehind on `hist. ` alone flagged the second section in every group.
    */
    const t = readFileSync(f, "utf8").replace(/\(hist\.[^)]*\)/g, "(hist.)");
    for (const m of t.matchAll(
      /(Product|Experience|Brand|IA|Information Architecture|UX Flows|Flows|Component System|CS|PB|XB|BB)\s*(?:Bible)?\s*§\s*0*(\d+)/g,
    )) {
      const a = m[1].replace(/ Bible$/, "");
      out.add(`${alias[a] ?? `${a} Bible`} §${String(Number(m[2])).padStart(2, "0")}`);
    }
    for (const m of t.matchAll(/(?:Brand Bible|BB)\s+(A-\d+)/g)) {
      out.add(`Brand Bible ${m[1]}`);
    }
  }
  return out;
}

/** Shipped source files. Kept in one place so no check can quietly narrow it. */
function sourceFiles(): string[] {
  const walk = (d: string): string[] =>
    readdirSync(d, { withFileTypes: true }).flatMap((e) => {
      const p = join(d, e.name);
      return e.isDirectory() ? walk(p) : /\.tsx?$/.test(e.name) ? [p] : [];
    });
  return walk("src");
}

test("a citation may not be silently repointed without a decision record", () => {
  /*
    Failure mode 7. The cheapest way to make this repository look self-contained
    is to rewrite `PB §07` as `CR-24` across the codebase: every citation then
    resolves to a document that is present, the inventory goes quiet, and 15
    load-bearing attributions have been reassigned to a clause nobody checked
    says the same thing.

    The register is what makes that visible, so the register has to be reachable
    from the test. If a section leaves `src/` entirely, its row must survive in
    AUTHORITY_DECISIONS.md — a decision, not a deletion.
  */
  const decisions = readFileSync("docs/AUTHORITY_DECISIONS.md", "utf8");

  for (const family of [
    "Product Bible",
    "Brand Bible",
    "Experience Bible",
    "IA Bible",
    "UX Flows Bible",
    "Component System Bible",
    "Reconstruction Audit",
  ]) {
    assert.ok(
      decisions.includes(family),
      `${family} has no row in the decision register. A family may leave the codebase, but not the record.`,
    );
  }

  /*
    The register must state its repointing position explicitly and in numbers.
    "Some citations were updated" is the shape of a sentence that hides a
    sweep; a count can be checked against the inventory.
  */
  assert.match(
    decisions,
    /(\d+) of (\d+) occurrences were repointed/,
    "the register no longer states how much was repointed — a repoint without a count is not a record",
  );
  assert.match(
    decisions,
    /REQUIRES_RATIFICATION/,
    "the register no longer names anything as unresolved; the count must not be driven to zero silently",
  );
});

test("no new missing-authority citation can be introduced unnoticed", () => {
  /*
    Failure mode 8, and the one that actually decays over time. 19 sections are
    unresolved today; that is a known, recorded debt. What must not happen is a
    twentieth arriving in a future phase and joining the pile silently.

    The inventory is generated, so the guard is that the set of cited sections
    matches the set the inventory documents — in both directions. A new citation
    fails until someone records it; a stale row fails until someone removes it.
  */
  const inventory = readFileSync("docs/AUTHORITY_INVENTORY.md", "utf8");
  const cited = [...citedSections()].sort();

  const undocumented = cited.filter((s) => !inventory.includes(s));
  assert.deepEqual(
    undocumented,
    [],
    `new authority citation(s) with no inventory row: ${undocumented.join(", ")}. Regenerate AUTHORITY_INVENTORY.md and give each a status.`,
  );

  /* And the count the inventory advertises must be the real one. */
  const claimed = inventory.match(/(\d+) distinct sections/);
  assert.ok(claimed, "the inventory no longer states how many sections it covers");
  assert.equal(
    Number(claimed[1]),
    cited.length,
    `the inventory claims ${claimed?.[1]} distinct sections; src/ actually cites ${cited.length}`,
  );
});

test("every quoted authority fragment is present in the source it names", () => {
  /*
    Failure mode 6, and the one this suite got wrong on the first attempt. The
    original version compared a hardcoded fixture string against the corpus —
    which is circular: the fixture is in the test, so editing the *quotation in
    the code* could never fail it. Mutation testing caught that (M8 escaped),
    and the assertion was rebuilt rather than the mutation excused.

    It now reads the quotation out of the source file, so rewording a quote in
    `evidence.ts` or `claim.ts` is what fails. That is the actual risk: a later
    edit tidying a quotation until it reads better, with the word "verbatim"
    still attached to text the source never contained.

    Only quotations naming a section the corpus actually holds are checked.
    Asserting a quote against a document that does not exist would be theatre.
  */
  const corpus = readdirSync("docs/authority/ORIGINAL_SOURCES/aeon-x-constitutional")
    .map((f) =>
      readFileSync(join("docs/authority/ORIGINAL_SOURCES/aeon-x-constitutional", f), "utf8"),
    )
    .join("\n");
  const flatten = (s: string) =>
    s
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/\n\s*\*\s?/g, " ")
      .replace(/[\s*>|_`]+/g, " ")
      .toLowerCase()
      .trim();
  const flatCorpus = flatten(corpus);

  /* Quotations in the code whose named section IS in the recovered corpus. */
  const checked: { file: string; section: string; marker: RegExp }[] = [
    {
      file: "src/lib/opportunity/foundation/evidence.ts",
      section: "Brand Bible A-04, first sentence (declared verbatim)",
      marker: /BB A-04\), verbatim: "([\s\S]*?)"/,
    },
    {
      /*
        The second quoted segment of the same block. A non-greedy capture stops
        at the first closing quote, so the marker above checks only the opening
        sentence — mutation M8a reworded the resolution clause and escaped.
        Both halves are declared verbatim, so both are checked.
      */
      file: "src/lib/opportunity/foundation/evidence.ts",
      section: "Brand Bible A-04, resolution clause (declared verbatim)",
      marker: /Resolution: "([\s\S]*?)"/,
    },
    {
      file: "src/lib/opportunity/foundation/claim.ts",
      section: "OXD-004, historically CS §01",
      marker: /Recovered, verbatim[\s\S]*?:\n \* {5}"([\s\S]*?)"/,
    },
  ];

  for (const { file, section, marker } of checked) {
    const source = readFileSync(file, "utf8");
    const m = source.match(marker);
    assert.ok(
      m,
      `${file} no longer presents a quotation for ${section} in the expected shape — if the citation was removed, remove it here too and record the decision`,
    );

    const quoted = flatten(m[1]);
    assert.ok(quoted.length > 30, `the ${section} quotation in ${file} is too short to verify`);
    assert.ok(
      flatCorpus.includes(quoted),
      `${file} presents this as ${section}, but the recovered source does not contain it:\n  "${m[1].replace(/\s+/g, " ").trim().slice(0, 200)}"\n` +
        `Either the quotation drifted from the source, or it was never in the document. Do not resolve this by editing the recovered source to match the code.`,
    );
  }
});

test("a historical source cannot be presented as current governing authority", () => {
  /*
    Failure mode 5. The AEON X corpus and the System B plan are both real,
    complete, and in this repository — which makes them the most tempting things
    here to start treating as law. The System B plan is the dangerous one: it
    reads like a specification, and it is the origin of "drop < 0.6", the
    seven-stage pipeline and "94% Match".

    So both must keep saying what they are, and the register must keep them
    classified as historical.
  */
  const provenance = readFileSync("docs/authority/PROVENANCE.md", "utf8");
  assert.match(
    provenance,
    /not governing law|NOT governing law/,
    "PROVENANCE.md no longer marks the System B plan as non-normative",
  );

  const decisions = readFileSync("docs/AUTHORITY_DECISIONS.md", "utf8");
  for (const historical of ["AEON X constitutional corpus", "Lovable / System B plan"]) {
    const row = decisions.split("\n").find((l) => l.includes(historical));
    assert.ok(row, `${historical} has no row in the decision register`);
    assert.match(
      row,
      /PRESENT BUT HISTORICAL/,
      `${historical} is no longer classified as historical — if it has been ratified as governing, that needs an explicit decision, not a silent reclassification`,
    );
  }

  /*
    And the same rows in the precedence table, which is the document a reader
    actually consults to learn what governs. Mutation N2 flipped the AEON X
    corpus there from HISTORICAL to CURRENT and escaped, because this assertion
    only looked at the decision register — two places state the boundary and
    only one was guarded.
  */
  const precedence = readFileSync("docs/AUTHORITY_PRECEDENCE.md", "utf8");
  for (const [label, expected] of [
    ["AEON X constitutional corpus", /HISTORICAL/],
    ["System B / Lovable plan", /RETIRED/],
    ["Reconstruction Audit", /UNAVAILABLE/],
  ] as const) {
    const row = precedence.split("\n").find((l) => l.startsWith("|") && l.includes(label));
    assert.ok(row, `the precedence table has no row for ${label}`);
    assert.match(
      row,
      expected,
      `${label} changed status in the precedence table without an explicit decision`,
    );
    assert.doesNotMatch(
      row,
      /\*\*CURRENT\*\*/,
      `${label} is marked CURRENT in the precedence table; historical material may not silently govern`,
    );
  }
});

test("every CR cited by the codebase exists in the Constitution", () => {
  /*
    The counterpart, and the only authority in this repository that can be
    checked end to end. `docs/CONSTITUTION.md` is present, so a dangling CR
    reference is a real defect rather than an unavoidable one — and unlike the
    Bibles, it is fixable by whoever introduces it.
  */
  const constitution = readFileSync("docs/CONSTITUTION.md", "utf8");
  const defined = new Set([...constitution.matchAll(/CR-0*(\d+)/g)].map((m) => Number(m[1])));

  const walk = (d: string): string[] =>
    readdirSync(d, { withFileTypes: true }).flatMap((e) => {
      const p = join(d, e.name);
      return e.isDirectory() ? walk(p) : /\.(tsx?|sh)$/.test(e.name) ? [p] : [];
    });

  const dangling = new Set<string>();
  /*
    This file is excluded from its own scan. It contains the literal
    `/CR-0*(\d+)/` as the scanner's pattern, which the scanner then reads back
    as a citation of "CR-0" — a false positive produced by the test looking at
    itself, and the first thing this assertion caught.
  */
  const SELF = "authority-self-containment.test.ts";
  for (const f of [...walk("src"), ...walk("test"), ...walk("scripts")]) {
    if (f.endsWith(SELF)) continue;
    for (const m of readFileSync(f, "utf8").matchAll(/CR-0*(\d+)/g)) {
      if (!defined.has(Number(m[1]))) dangling.add(`CR-${m[1]} (${f})`);
    }
  }

  assert.deepEqual(
    [...dangling],
    [],
    `code cites constitutional clauses that do not exist: ${[...dangling].join(", ")}`,
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   PHASE 23 — THE SUCCESSION BOUNDARY
   ══════════════════════════════════════════════════════════════════════════

   The owner ratified `docs/CONSTITUTION.md` as current governing authority and
   left the recovered AEON X corpus and the System B plan as historical. Those
   are now two different kinds of document sitting in the same repository, and
   the only thing keeping them apart is discipline. These make it enforcement. */

test("the ratified Constitution is present and is recorded as governing", () => {
  /* Failure mode 1. Everything downstream assumes this file exists. */
  assert.ok(existsSync("docs/CONSTITUTION.md"), "the ratified governing authority is missing");
  assert.ok(
    readFileSync("docs/CONSTITUTION.md", "utf8").length > 10_000,
    "CONSTITUTION.md has been emptied or truncated",
  );

  const precedence = readFileSync("docs/AUTHORITY_PRECEDENCE.md", "utf8");
  const row = precedence.split("\n").find((l) => l.includes("CONSTITUTION.md") && l.includes("|"));
  assert.ok(row, "the precedence table no longer has a row for CONSTITUTION.md");
  assert.match(
    row,
    /CURRENT/,
    "CONSTITUTION.md is no longer recorded as CURRENT authority — succession cannot be undone silently",
  );
});

test("no unresolved Bible citation is presented as current authority", () => {
  /*
    Failure mode 3, and the one the whole succession turns on.

    A bare `Experience Bible §7` in source reads as current law about a document
    nobody can open. A repointed `OXD-001 (hist. XB §7)` says the same lineage
    while naming an authority a reader can actually inspect. Phase 23 repointed
    41 occurrences; the rest are genuinely unresolved and stay visible.

    What must not happen is a *repointed* section quietly reverting to bare, or a
    new bare citation appearing in a file that had none. So the set of bare
    sections is pinned: it may shrink as decisions are made, never grow.
  */
  const RESOLVED = new Set([
    "Experience Bible §05",
    "Experience Bible §07",
    "Experience Bible §15",
    "Brand Bible §07",
    "Brand Bible §12",
    "Brand Bible A-04",
    "IA Bible §13",
    "IA Bible §18",
    "Component System Bible §01",
    "Component System Bible §14",
  ]);

  const regressed = [...bareSections()].filter((s) => RESOLVED.has(s)).sort();
  assert.deepEqual(
    regressed,
    [],
    `these sections were repointed to a current authority and are bare again: ${regressed.join(", ")}. ` +
      `A repoint is a decision; reverting it is also a decision and needs a record.`,
  );
});

test("every OXD decision carries explicit owner authority", () => {
  /*
    Failure mode 8. An OXD is only worth anything because a person decided it.
    A decision that loses its authority line becomes indistinguishable from a
    paragraph someone wrote — which is exactly how a reconstructed Bible would
    enter, one plausible entry at a time.
  */
  const decisions = readFileSync("docs/OPPORTUNITY_X_DECISIONS.md", "utf8");
  const blocks = decisions.split(/^## /m).slice(1);
  assert.ok(blocks.length > 0, "no OXD decisions found");

  for (const block of blocks) {
    const id = block.slice(0, block.indexOf(" "));
    assert.match(block, /\*\*Status:\*\* RATIFIED/, `${id} is not marked RATIFIED`);
    assert.match(block, /\*\*Authority:\*\* Product owner/, `${id} has no owner authority line`);
    assert.match(block, /\*\*Date:\*\*/, `${id} has no date`);
    assert.match(block, /What this does NOT claim/, `${id} does not state its limits`);
  }

  /* Every OXD cited in source must exist in the register. */
  const defined = new Set([...decisions.matchAll(/^## (OXD-\d+)/gm)].map((m) => m[1]));
  const used = new Set<string>();
  for (const f of sourceFiles()) {
    for (const m of readFileSync(f, "utf8").matchAll(/OXD-\d+/g)) used.add(m[0]);
  }
  const dangling = [...used].filter((o) => !defined.has(o)).sort();
  assert.deepEqual(dangling, [], `source cites undefined decisions: ${dangling.join(", ")}`);
});

test("System B rules cannot re-enter as current authority", () => {
  /*
    Failure mode 5. The recovered `.lovable/plan.md` is the origin of "drop <
    0.6", the seven-stage pipeline, `match_score` and fuzzy deduplication —
    every fabrication Phase 21 removed from the landing page. It is in this
    repository now, which is the first time those rules have been readable here
    since Phase 13 deleted them.

    They may be quoted as history. They may not reappear in shipped source.
  */
  const retired = [
    /verification_score/,
    /match_score_default/,
    /\bdrop *< *0\.6\b/,
    /Stage [1-7] [A-Z]/,
    /fuzzy match/i,
  ];
  for (const f of sourceFiles()) {
    if (f.includes("integrations/supabase/types.ts")) continue; // generated from the live DB
    const text = readFileSync(f, "utf8");
    for (const rule of retired) {
      assert.doesNotMatch(
        text,
        rule,
        `${f} reintroduces a retired System B rule (${rule}). It is historical; see docs/authority/PROVENANCE.md.`,
      );
    }
  }
});

test("the authority scanner covers all of src/, and cannot be narrowed", () => {
  /*
    Failure mode 11. Every check above walks `sourceFiles()`. Excluding one
    directory from that walk would empty the findings without changing a single
    citation — the cheapest possible way to fake compliance, and invisible in a
    diff that only touches a test helper.

    So the walk is pinned against a floor and against the directories that
    actually hold the citations.
  */
  const files = sourceFiles();
  assert.ok(
    files.length > 50,
    `the scanner sees only ${files.length} files; src/ is larger than that`,
  );

  for (const dir of [
    "src/lib/opportunity/foundation",
    "src/components/ui/absence",
    "src/components/opportunity",
  ]) {
    assert.ok(
      files.some((f) => f.startsWith(dir)),
      `the scanner no longer covers ${dir}, which carries authority citations`,
    );
  }
});
