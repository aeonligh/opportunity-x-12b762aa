import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * A VISUAL STATE MAY NOT CLAIM MORE CERTAINTY THAN THE SYSTEM POSSESSES
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Phase 11 established that the states must be *distinguishable*. Phase 14
 * establishes what each one is allowed to say, and this file holds the four
 * collapses the state system forbids:
 *
 *   UNKNOWN  ≠ ABSENT ≠ EMPTY
 *   PENDING  ≠ persisted success
 *   ERROR    ≠ EMPTY
 *   DEGRADED ≠ SUCCESS
 *
 * Every assertion here either runs a real function or renders a real component.
 * `test/render-component.ts` does the rendering in a child process, because the
 * suite runs under `--conditions=react-server` and `react-dom/server` refuses to
 * load there. Source-text matching is used only where the claim genuinely is
 * about source — and §16 is right that it is usually not: an assertion that a
 * regex appears in a file keeps passing after the behaviour it names has gone,
 * and `test/surface.test.ts` had one that broke the moment an expression was
 * reworded, having never checked the behaviour at all.
 */

function render(specifier: string, exported: string, props?: unknown): string {
  return execFileSync(
    process.execPath,
    [
      "--import",
      "./test/register.mjs",
      "test/render-component.ts",
      specifier,
      exported,
      ...(props === undefined ? [] : [JSON.stringify(props)]),
    ],
    { encoding: "utf8" },
  );
}

/** What a person actually reads. */
function text(html: string): string {
  return html
    .replace(/<[^>]*class="[^"]*\bsr-only\b[^"]*"[^>]*>[\s\S]*?<\/[a-z]+>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CONTROL = "@/components/opportunity/InterestedControl";

/* ══════════════════════════════════════════════════════════════════════════
   1 · A failed declaration read is not silence
   ══════════════════════════════════════════════════════════════════════════ */

test("an unreadable declaration never renders as having said nothing", () => {
  /*
    The defect this state exists to end. `pursuitFor` caught every read failure
    and returned `{ state: "undeclared" }`, so a read that did not happen
    rendered as "You haven't said either way" — a claim about what the person
    did, made by a system that could not look.
  */
  const unreadable = render(CONTROL, "InterestedControl", {
    entityId: "e1",
    canPersist: true,
    pursuit: { state: "unreadable", because: "I could not reach the store." },
  });
  const said = text(unreadable);

  assert.equal(
    /haven’t said either way|haven't said either way/.test(said),
    false,
    "an unreadable read is being reported as the person's silence",
  );
  assert.match(said, /couldn’t read what you’ve said/);
  assert.match(said, /still recorded/);

  /* And silence still reads as silence — the two must not have merged. */
  const undeclared = text(
    render(CONTROL, "InterestedControl", {
      entityId: "e1",
      canPersist: true,
      pursuit: { state: "undeclared" },
    }),
  );
  assert.match(undeclared, /haven’t said either way/);
  assert.equal(/couldn’t read/.test(undeclared), false);
});

test("an unreadable position is not offered as changeable", () => {
  /*
    A declaration is append-only. Offering the buttons over a position nobody
    can see would let someone record a second declaration on top of one they
    already made, without being able to tell that they had.
  */
  const html = render(CONTROL, "InterestedControl", {
    entityId: "e1",
    canPersist: true,
    pursuit: { state: "unreadable", because: "I could not reach the store." },
  });

  /*
    `disabled=""`, the attribute React actually emits — not the bare word.
    `/<button[^>]*\bdisabled\b/` matched `disabled:opacity-50` inside every
    button's Tailwind class list, so it counted two disabled buttons on a control
    whose buttons were fully live.
  */
  assert.equal(html.match(/<button[^>]*\sdisabled=""/g)?.length, 2);
  /* Neither button may claim a position while none is known. */
  assert.equal(/aria-pressed="true"/.test(html), false);
  /* And the refusal says why, rather than leaving the person to guess. */
  assert.match(text(html), /won’t offer to change a position I can’t see/);
});

test("the stance carries the unreadable state instead of folding it", async () => {
  /*
    The fold would have been invisible: `pursuit.state === "declared" ? … :
    "undeclared"` is total, so adding a third state to the union compiled cleanly
    and would have reported it as silence one layer down — which is the same
    defect one level up from the one this phase came to fix.

    Built over a real entity, resolved from real observations by the real
    grouper, because `deriveStance` reads the entity for timing and outstanding
    questions. A hand-made stub would test the branch and not the pipeline.
  */
  const { classify } = await import("@/lib/opportunity/announcers/registry");
  const { witness } = await import("@/lib/opportunity/observation/record");
  const { groupObservations } = await import("@/lib/opportunity/entity/group");
  const { resolveEntity } = await import("@/lib/opportunity/entity/resolve");
  const { deriveStance } = await import("@/lib/opportunity/pursuit/stance");

  const now = new Date().toISOString();
  const url = "https://education.gov.ng/state-system-fixture";
  const { sourceId, label, sourceClass } = classify(url);
  const body =
    "<!doctype html><html><head><title>Fixture</title>" +
    '<script type="application/ld+json">' +
    JSON.stringify({
      "@type": "Course",
      name: "Fixture Programme",
      identifier: "STATE-SYSTEM-1",
      provider: { "@type": "Organization", name: "Federal Ministry of Education" },
    }) +
    "</script></head><body></body></html>";

  const observation = witness(
    {
      url,
      completedAt: now,
      status: 200,
      body,
      encoding: "utf-8",
      contentType: "text/html; charset=utf-8",
    },
    { source: { sourceId, label, sourceClass } },
  );

  const { deriveStakes } = await import("@/lib/opportunity/corpus");
  const { groups } = groupObservations([observation]);
  assert.equal(groups.length, 1, "the fixture observation did not group into one entity");

  const resolved = resolveEntity({
    members: groups[0].members,
    identity: groups[0].identity,
    rationale: groups[0].rationale,
    stakes: deriveStakes(),
    decidedAt: now,
  });
  assert.ok("entity" in resolved, "the group did not resolve to an entity");
  const { entity } = resolved;

  const unreadable = deriveStance({
    entity,
    pursuit: { state: "unreadable", because: "the store could not be reached" },
    verification: null,
    judgments: null,
    now,
  });
  assert.equal(unreadable.declaration, "unreadable");
  assert.notEqual(unreadable.declaration, "undeclared");

  /* And silence still arrives as silence — the two must not have merged. */
  const silent = deriveStance({
    entity,
    pursuit: { state: "undeclared" },
    verification: null,
    judgments: null,
    now,
  });
  assert.equal(silent.declaration, "undeclared");
});

/* ══════════════════════════════════════════════════════════════════════════
   2 · A finding is not a limit — ABSENT ≠ UNKNOWN
   ══════════════════════════════════════════════════════════════════════════ */

test("the card resolution distinguishes a finding from an inability", async () => {
  const { cardsUnder } = await import("@/lib/opportunity/surface/faults");

  const nothingOpen = cardsUnder("nothing-open");
  assert.equal(nothingOpen.state, "absent");
  /* A finding carries the time it was made; a limit cannot. */
  assert.ok(nothingOpen.state === "absent" && typeof nothingOpen.searchedAt === "string");

  assert.equal(cardsUnder("record-unreadable").state, "unknown");
  assert.equal(cardsUnder("never-looked").state, "unknown");
});

test("an absent finding renders as a finding, with its time", () => {
  const html = render("@/components/ui/absence/AbsentState", "AbsentState", {
    verdict: "Nothing I watch is currently offering something worth your attention.",
    searchedAt: "2026-08-17T09:00:00.000Z",
    standing: "This is what I found, not a gap in my looking.",
  });
  const said = text(html);

  assert.match(said, /Nothing I watch is currently offering/);
  assert.match(said, /not a gap in my looking/);
  /* The timestamp is what makes it actionable rather than a shrug. */
  assert.match(html, /2026-08-17|searched|today|hour|ago/i);
});

test("an unknown state never claims the world is empty", () => {
  const said = text(
    render("@/components/ui/absence/UnknownState", "UnknownState", {
      gap: "I could not read what I have observed.",
    }),
  );

  for (const claim of [/\bno opportunities\b/i, /\bnothing (?:was )?found\b/i, /\bnone exist/i]) {
    assert.equal(claim.test(said), false, `an unknown state must not say ${claim}`);
  }
  assert.match(said, /could not read/);
});

test("the three absences render three different sentences", () => {
  /*
    The collapse this whole engine exists to prevent, checked at the surface:
    if any two of these produced the same words, a reader could not tell a limit
    from a finding from an expectation.
  */
  const unknown = text(
    render("@/components/ui/absence/UnknownState", "UnknownState", { gap: "I could not look." }),
  );
  const absent = text(
    render("@/components/ui/absence/AbsentState", "AbsentState", {
      verdict: "I looked and found nothing.",
      searchedAt: "2026-08-17T09:00:00.000Z",
      standing: "Three sources answered.",
    }),
  );
  const empty = text(
    render("@/components/ui/absence/EmptyState", "EmptyState", {
      expectation: "Opportunities you save will appear here.",
    }),
  );

  assert.notEqual(unknown, absent);
  assert.notEqual(absent, empty);
  assert.notEqual(unknown, empty);
});

/* ══════════════════════════════════════════════════════════════════════════
   3 · Degraded is not success, and is not invented
   ══════════════════════════════════════════════════════════════════════════ */

test("evidence completeness reports real failures when there are any", async () => {
  /*
    The partition assertion below holds trivially over a corpus with no failures
    — 0 + 0 + 0 === 0 — so it caught nothing when `degraded` was hard-coded to
    `false`. This drives the projection with observations that genuinely failed,
    built by the real `witness`, which decides the outcome from the exchange.
  */
  const { classify } = await import("@/lib/opportunity/announcers/registry");
  const { witness } = await import("@/lib/opportunity/observation/record");
  const { projectInspection } = await import("@/lib/opportunity/surface/inspection");
  const { groupObservations } = await import("@/lib/opportunity/entity/group");
  const { resolveEntity } = await import("@/lib/opportunity/entity/resolve");
  const { deriveStakes } = await import("@/lib/opportunity/corpus");

  const now = new Date().toISOString();
  const mk = (url: string, status: number, body: string | null) => {
    const { sourceId, label, sourceClass } = classify(url);
    return witness(
      {
        url,
        completedAt: now,
        status,
        body,
        encoding: "utf-8",
        contentType: body === null ? null : "text/html; charset=utf-8",
      },
      { source: { sourceId, label, sourceClass } },
    );
  };

  const good = mk(
    "https://education.gov.ng/evidence-fixture",
    200,
    '<!doctype html><html><head><title>F</title><script type="application/ld+json">' +
      JSON.stringify({ "@type": "Course", name: "F", identifier: "EVIDENCE-1" }) +
      "</script></head><body></body></html>",
  );
  const dead = mk("https://unilag.edu.ng/evidence-fixture", 503, null);

  const { groups } = groupObservations([good]);
  const resolved = resolveEntity({
    members: groups[0].members,
    identity: groups[0].identity,
    rationale: groups[0].rationale,
    stakes: deriveStakes(),
    decidedAt: now,
  });
  assert.ok("entity" in resolved);

  const inspection = projectInspection({
    entity: resolved.entity,
    verification: null,
    judgments: null,
    pursuit: { state: "undeclared" },
    /* Both, including the one that never answered. */
    observations: [good, dead],
    now,
  });

  assert.equal(inspection.evidence.consulted, 2);
  assert.equal(inspection.evidence.answered, 1);
  assert.equal(inspection.evidence.unreachable, 1);
  assert.equal(inspection.evidence.degraded, true, "a failed retrieval must degrade the evidence");
});

test("evidence completeness is counted from the observations themselves", async () => {
  /*
    The state system forbids manufacturing epistemic information to make a UI
    state possible. This checks the counts come from the record: an observation
    either was retrieved or was not, and a retrieved one either yielded
    statements or carried a reason why not.
  */
  const { demoCorpus } = await import("@/lib/opportunity/surface/demo");
  const { scenarios } = await demoCorpus();

  for (const scenario of scenarios) {
    const { evidence, sources } = scenario.inspection;
    assert.equal(
      evidence.consulted,
      sources.length,
      `${scenario.id}: consulted must be the sources`,
    );
    assert.equal(
      evidence.answered + evidence.unreadable + evidence.unreachable,
      evidence.consulted,
      `${scenario.id}: the three counts must partition the sources`,
    );
    assert.equal(
      evidence.degraded,
      evidence.unreadable + evidence.unreachable > 0,
      `${scenario.id}: degraded must follow the counts, not be set independently`,
    );
    /* And it must agree with the per-source flags it summarises. */
    assert.equal(evidence.unreachable, sources.filter((s) => !s.answered).length);
  }
});

test("a failed retrieval cannot yet reach an entity, and this records that", async () => {
  /*
    The honest state of the degraded branch, asserted so the gap cannot close
    silently and cannot be forgotten.

    `evidence.degraded` is a correct projection: it counts what it is given, and
    the moment failed retrievals reach an inspection it reports them with no
    change. Nothing currently gives it one. `entity/group.ts` skips every
    observation that is not `isRetrieved`, so a failed retrieval never joins an
    entity and never appears in `entity.resolution.observationIds`.

    A fixture was written to exercise this and removed, because it could not:
    the page rendered two sources and had no way to say a third was attempted.
    Manufacturing the state at the projection layer is exactly what the state
    system forbids, so the branch stays unreachable and is reported as such.

    **When this test starts failing, the gap has been closed** — swap it for the
    two-sided assertion (at least one degraded fixture, at least one complete)
    that this replaced.
  */
  const { demoCorpus } = await import("@/lib/opportunity/surface/demo");
  const { scenarios } = await demoCorpus();

  assert.ok(scenarios.length > 0);
  assert.deepEqual(
    scenarios.filter((s) => s.inspection.evidence.degraded).map((s) => s.id),
    [],
    "a fixture now reaches the degraded branch — see the note above",
  );

  /* The drop point, named, so a refactor that moves it fails here. */
  const group = readFileSync("src/lib/opportunity/entity/group.ts", "utf8");
  assert.match(group, /if \(!isRetrieved\(observation\)\) continue;/);
});

/* ══════════════════════════════════════════════════════════════════════════
   4 · Failure injection produces operations, not props
   ══════════════════════════════════════════════════════════════════════════ */

test("every declared fault produces a real resolution of the right shape", async () => {
  const faults = await import("@/lib/opportunity/surface/faults");

  for (const fault of faults.CARD_FAULTS) {
    const r = faults.cardsUnder(fault);
    assert.ok(["cards", "absent", "unknown"].includes(r.state), `${fault} → ${r.state}`);
  }
  for (const fault of faults.INSPECTION_FAULTS) {
    const r = faults.inspectionUnder(fault);
    assert.ok(["inspection", "not-found", "unknown"].includes(r.state), `${fault} → ${r.state}`);
  }
  for (const fault of faults.SAVED_FAULTS) {
    const r = faults.savedUnder(fault);
    assert.ok(["declarations", "empty", "unknown"].includes(r.state), `${fault} → ${r.state}`);
  }
});

test("the laboratory's faults cover every non-success state of each union", () => {
  /*
    The laboratory is only evidence about the product while it can still reach
    every branch. A state added to a resolution union without a fault would leave
    a surface nobody can look at — so the union and the fault list are compared
    directly rather than trusted to stay in step.
  */
  const service = readFileSync("src/lib/opportunity/surface/service.ts", "utf8");
  const faults = readFileSync("src/lib/opportunity/surface/faults.ts", "utf8");

  const statesOf = (typeName: string) => {
    const start = service.indexOf(`export type ${typeName}`);
    assert.ok(start > 0, `${typeName} not found`);
    /*
      To the end of the declaration, not to the first semicolon after the first
      union member. The first attempt did the latter, so it captured exactly one
      state per union — always the success one, which this test then skips. It
      passed while checking nothing at all, and kept passing when a fault was
      deleted.

      A type alias ends at the first semicolon that is not inside a member, and
      every member here is a braced object, so tracking brace depth is enough.
    */
    let depth = 0;
    let end = start;
    for (let i = service.indexOf("=", start); i < service.length; i += 1) {
      const c = service[i];
      if (c === "{") depth += 1;
      else if (c === "}") depth -= 1;
      else if (c === ";" && depth === 0) {
        end = i;
        break;
      }
    }
    assert.ok(end > start, `${typeName} declaration has no terminator`);
    const states = [...service.slice(start, end).matchAll(/state: "([a-z-]+)"/g)].map((m) => m[1]);
    assert.ok(
      states.length > 1,
      `${typeName} parsed as ${states.length} state(s) — parser is wrong`,
    );
    return states;
  };

  /* The success branch of each union needs no fault; every other branch does. */
  const expectations: [string, string[]][] = [
    ["CardsResolution", ["cards"]],
    ["InspectionResolution", ["inspection"]],
    ["DeclarationsResolution", ["declarations"]],
  ];

  for (const [typeName, successStates] of expectations) {
    for (const state of statesOf(typeName)) {
      if (successStates.includes(state)) continue;
      assert.match(
        faults,
        new RegExp(`state: "${state}"`),
        `${typeName}.${state} has no fault, so nothing can render it`,
      );
    }
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   5 · Motion is off when it is asked to be
   ══════════════════════════════════════════════════════════════════════════ */

test("reduced motion is enforced once, globally", () => {
  /*
    It was per component, which means the rule held only for as long as each
    future author remembered it — and `animate-pulse` on the skeletons, the one
    element whose whole job is to appear during a wait, carried no guard at all.
  */
  const css = readFileSync("src/styles.css", "utf8");

  /*
    The universal block specifically, not "somewhere after the first
    reduced-motion media query" — that slice runs to the end of the file, so it
    stayed satisfied by any later block and reported success after the rule under
    test had been deleted.

    Phase 14 also learned something from this assertion: a global block already
    existed at the foot of the file, and the one added here was a duplicate. It
    was removed rather than kept. See `docs/PHASE_14_STATE_SYSTEM.md` §E.
  */
  const universal = css.match(
    /@media \(prefers-reduced-motion: reduce\) \{\s*\*,\s*\*::before,\s*\*::after \{[^}]*\}/,
  );
  assert.ok(universal, "no universal reduced-motion rule");
  assert.match(universal[0], /animation-duration:\s*0\.01ms\s*!important/);
  assert.match(universal[0], /transition-duration:\s*0\.01ms\s*!important/);
  assert.equal(
    css.match(/@media \(prefers-reduced-motion: reduce\) \{\s*\*,/g)?.length,
    1,
    "the universal block is duplicated",
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   PHASE 21A — A CONTENTLESS SCREEN IS NOT A PLACE FOR A DESCRIPTION OF CONTENT
   ══════════════════════════════════════════════════════════════════════════ */

test("the product lede is withheld from every contentless state", () => {
  /*
    Not a state-model rule — a rule about who gets the top of the screen, added
    because production showed what the alternative looks like. A phone-sized
    view of `/opportunities` failing was: heading, two lines promising that
    every claim can be traced to its source page, a five-line error card saying
    no claims could be read at all, and a link to fixtures. The reader had to
    get through a description of what they were about to see before reaching
    the news that they were not going to see it.

    What is asserted is narrow and deliberate. Each lede must live behind the
    `lede` flag, and the flag must be tied to the one state that has content to
    caption. Nothing here constrains what any state *says* — `unknown`,
    `absent`, `empty` and unreadable keep their exact wording and stay four
    distinguishable things, which is what the rest of this file is about.
  */
  const surfaces = [
    {
      path: "src/routes/_authenticated/opportunities.tsx",
      lede: /Every\s+claim here can be traced back to the page it came from/,
      guard: /<Masthead lede=\{result\.state === "cards"\} \/>/,
    },
    {
      path: "src/routes/_authenticated/saved.tsx",
      lede: /What you&rsquo;ve said you care about, most recent first/,
      guard: /<Masthead lede=\{saved\?\.state === "declarations"\} \/>/,
    },
  ];

  for (const { path, lede, guard } of surfaces) {
    const source = readFileSync(path, "utf8");

    const match = source.match(lede);
    assert.ok(match, `${path}: the lede this test guards is no longer there`);

    /*
      The lede must sit inside the `{lede ? (…) : null}` branch of Masthead. Read
      from the `lede ?` to the closing `: null}` and require the sentence to fall
      inside it — an unconditional lede put back above the heading would leave
      that window intact but the sentence outside it.
    */
    const conditional = source.match(/\{lede \? \([\s\S]*?\) : null\}/);
    assert.ok(conditional, `${path}: Masthead no longer has a conditional lede`);
    assert.match(conditional[0], lede, `${path}: the lede is rendered unconditionally`);

    /* And the flag is driven by the state, not passed as a constant. */
    assert.match(source, guard, `${path}: the lede flag is not tied to the content state`);
  }
});

test("the fixture route is not the forward action on an empty or failed surface", () => {
  /*
    "See example opportunities →" was the last thing on `/opportunities` when it
    had nothing real, and with Try again living inside the error card it was the
    only onward link. On a page that has just said it has nothing, that reads as
    "we have nothing, so here are made-up ones" — the sentence this product
    exists never to say.

    The fixtures stay: they are how somebody sees a well-corroborated
    opportunity, a single-source one and a contested one before discovery has
    run, and every card carries its own fixture marker. Only the invitation
    changed, so this pins the label rather than the link.
  */
  const source = readFileSync("src/routes/_authenticated/opportunities.tsx", "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  assert.doesNotMatch(
    code,
    /See example opportunities/,
    "the fixture link again invites the reader to examples as though they were opportunities",
  );
  assert.match(
    code,
    /Sample cards, not real openings/,
    "the fixture link no longer says what is on the other side of it",
  );

  /* One component, so the three call sites cannot drift apart again. */
  assert.equal(
    (code.match(/to="\/opportunities\/examples"/g) ?? []).length,
    1,
    "the fixture link is hand-written per branch again instead of going through ExamplesLink",
  );
});
