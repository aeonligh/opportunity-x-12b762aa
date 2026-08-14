import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { demoCorpus, type DemoScenario } from "@/lib/opportunity/surface/demo";
import { InMemoryObservationStore } from "@/lib/opportunity/observation/store";
import { InMemoryPursuitLog } from "@/lib/opportunity/pursuit/log";
import { declaration } from "@/lib/opportunity/pursuit/types";
import { recommendNextStep } from "@/lib/opportunity/recommendation/service";
import { transitionWords } from "@/lib/opportunity/surface/wording";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * THE PRODUCT, NOT THE MODULES
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `journey.test.ts` proves the mechanism carries a person from meeting an
 * opportunity to committing to it. This file asks the next question: **is what
 * they end up reading true, and can they understand it?**
 *
 * So the assertions here are about sentences. Not that a component rendered,
 * not that a field is populated — that the words a person sees say the thing
 * the evidence supports, and do not say anything it does not.
 *
 * Every scenario comes from `demoCorpus`, which builds through the real engine.
 * Nothing in this file constructs a card, an entity, or a projection by hand,
 * and that is the point: a hand-built object would let a test pass on a surface
 * the engine cannot actually produce.
 *
 * ── The rule these tests enforce, in one line ─────────────────────────────
 *
 * A sentence on a product surface is a claim, and every claim has to trace to
 * evidence or to the honest absence of it.
 */

/** Fixed so "closes today" is still today whenever this suite runs. */
const NOW = "2026-08-14T09:00:00.000Z";

let cached: Awaited<ReturnType<typeof demoCorpus>> | null = null;
async function lab() {
  cached ??= await demoCorpus(NOW);
  return cached;
}

async function scenario(id: string): Promise<DemoScenario> {
  const { scenarios } = await lab();
  const found = scenarios.find((s) => s.id === id);
  assert.ok(found, `no fixture scenario "${id}"`);
  return found;
}

/** Every sentence the surfaces put in front of a person, for one scenario. */
function prose(s: DemoScenario): string[] {
  return [
    s.card.shown.statement,
    s.card.shown.timing,
    s.card.shown.verification,
    s.card.shown.whySurfaced,
    ...s.card.shown.uncertainties,
    s.card.stance.statement,
    s.inspection.deadlineReasoning,
    ...s.inspection.whatHappensNext,
    ...s.inspection.contradictions.map((c) => c.consequence),
    ...s.inspection.sources.map((src) => src.kind),
    ...s.inspection.verificationHistory.map((t) => transitionWords(t.from, t.to)),
    ...(s.card.stance.next.kind === "resolve-unknowns"
      ? s.card.stance.next.outstanding.map((o) => o.because)
      : []),
  ];
}

/* ───────────────────────────── Journey 1 ─────────────────────────────────
   A new person, and a system that has never looked.                        */

test("journey 1 — nothing has ever been retrieved, and the Step says so without blaming the person", async () => {
  const empty = new InMemoryObservationStore();

  const { resolution } = await recommendNextStep({
    personId: "new-person",
    store: empty,
    entities: [],
    verifications: new Map(),
    facts: [],
    now: NOW,
  });

  assert.equal(resolution.state, "unknown", "never looked is never `absent`");
  if (resolution.state !== "unknown") return;

  assert.equal(
    resolution.since,
    null,
    "there is no earlier visibility to name, so none is claimed"
  );

  /*
    The defect this replaces: the Workspace rendered "I've had no visibility
    into this since August 2026", built from a `since` that was the moment the
    question was asked. It described a lapse that never happened, on the surface
    whose entire job is being trusted about what it does not know.
  */
  assert.doesNotMatch(
    resolution.because,
    /since \w+ \d{4}/,
    "no invented history of lost visibility"
  );
  assert.match(
    resolution.because,
    /\bI\b/,
    "the sentence is about AEON X, in its own voice"
  );
  assert.doesNotMatch(
    resolution.because,
    /\byou (haven|have not|did not|didn)/i,
    "a limit on the system is never phrased as the person's inactivity"
  );
});

/* ───────────────────────────── Journey 2 ─────────────────────────────────
   A search happened, something was found, and it can be inspected.         */

test("journey 2 — a verified opportunity states what it is, who is behind it, and when it closes", async () => {
  const s = await scenario("verified-and-clear");

  assert.match(s.card.shown.statement, /Bilateral Education Agreement/);
  assert.match(s.card.shown.statement, /offered by Federal Ministry of Education/);
  assert.match(s.card.shown.timing, /^Closes \d{1,2} \w+ \d{4}\.$/);
  assert.match(s.card.shown.verification, /Verified against 3 independent sources/);

  assert.equal(s.card.organiser.state, "agreed");
  assert.equal(s.card.deadline.state, "agreed");
  assert.equal(
    s.card.deadline.state === "agreed" && s.card.deadline.sources,
    3,
    "the reader is told how many sources carried the date, not just the date"
  );
  assert.ok(s.card.action, "there is somewhere to go");

  /* Inspection can be followed back to the bytes. */
  assert.equal(s.inspection.sources.length, 3);
  for (const source of s.inspection.sources) {
    assert.ok(source.url, "each source is named by where it was read");
    assert.ok(source.observationId, "and points at the observation behind it");
  }
});

/* ───────────────────────────── Journey 3 ─────────────────────────────────
   Sources disagree, and the disagreement reaches the person.               */

test("journey 3 — a contested deadline is shown as contested, and AEON X refuses to pick", async () => {
  const s = await scenario("sources-disagree");

  assert.equal(s.card.deadline.state, "contested");
  if (s.card.deadline.state !== "contested") return;
  assert.equal(s.card.deadline.readings.length, 2, "both readings survive to the surface");

  assert.match(
    s.card.shown.timing,
    /cannot tell whether this is still open/,
    "a contested deadline is not quietly resolved into one"
  );
  assert.match(s.inspection.deadlineReasoning, /rather than choosing the later one/);
  assert.equal(s.inspection.contradictions.length, 1, "the disagreement is listed as one");

  assert.ok(
    s.card.shown.uncertainties.some((u) => /different values for the deadline/.test(u)),
    "and it is on the card, not only behind the inspection link"
  );
});

test("journey 3b — each side of a disagreement is attributed to the source that took it", async () => {
  const s = await scenario("sources-disagree");
  const [contradiction] = s.inspection.contradictions;

  assert.ok(contradiction, "the disagreement is projected, not left in a field view");
  assert.equal(contradiction.field, "deadline");
  assert.equal(contradiction.readings.length, 2);

  /*
    The previous surface showed two dates and left the reader to work out
    whether the disagreement was between two ministries or a ministry and an
    aggregator — which is the entire substance of it.
  */
  for (const reading of contradiction.readings) {
    assert.ok(reading.said.length > 0, `${reading.value} is attributed to nobody`);
    for (const said of reading.said) {
      assert.ok(said.label.length > 0, "each side names the source that took it");
      assert.doesNotMatch(
        said.kind,
        /^(official|announcer|aggregator|unknown-domain)$/,
        "the source class is said to a person, not printed as the stored enum"
      );
    }
  }

  const labels = contradiction.readings.flatMap((r) => r.said.map((x) => x.label));
  assert.ok(labels.includes("Petroleum Technology Development Fund"));
  assert.ok(labels.includes("University of Nigeria, Nsukka"));

  /* And what the disagreement costs, stated rather than left to be inferred. */
  assert.match(contradiction.consequence, /treats the timing as unknown/);
  assert.match(contradiction.consequence, /will not tell you there is time/);
});

test("journey 3c — every source shows what it actually said, in its own words", async () => {
  const s = await scenario("verified-and-clear");

  /*
    Without this the surface asserted "verified against 3 independent sources"
    and then listed three links: a number the reader had to believe, next to
    evidence they could not read.
  */
  for (const source of s.inspection.sources) {
    assert.ok(source.said.length > 0, `${source.label} shows no statements`);

    const deadline = source.said.find((x) => x.field === "deadline");
    assert.ok(deadline, "the closing date each page carried is shown");
    assert.equal(deadline.asStated, "2026-10-09", "the page's own words, uncleaned");
    assert.equal(
      deadline.readAs,
      "9 October 2026",
      "and how AEON X read them, so the reading can be checked against the words"
    );

    assert.doesNotMatch(
      source.kind,
      /^(official|announcer|aggregator|unknown-domain)$/,
      "the source class reaches the reader in plain words"
    );
  }
});

test("journey 3d — verification history is sentences, not an enum with an arrow", async () => {
  const { scenarios } = await lab();

  for (const s of scenarios) {
    for (const transition of s.inspection.verificationHistory) {
      const said = transitionWords(transition.from, transition.to);
      assert.doesNotMatch(said, /→/, "no arrows between verdict words");
      assert.doesNotMatch(
        said,
        /\bunverified\b|\bcontradicted\b|\bwithdrawn\b/,
        `stored verdict word reached the reader: ${said}`
      );
      assert.match(said, /\.$/, "it is a sentence");
    }
  }
});

/* ───────────────────────────── Journey 4 ─────────────────────────────────
   Interest changes the Step — and changes nothing about the opportunity.   */

test("journey 4 — declaring interest changes the Step and leaves every judgment where it was", async () => {
  const { step, stepUndeclared } = await lab();

  assert.equal(
    stepUndeclared.state,
    "absent",
    "before anyone speaks, nothing connects these opportunities to them"
  );
  assert.equal(step.state, "step", "after they speak, there is something to say");
  if (step.state !== "step") return;

  assert.equal(
    step.step.claim.origin,
    "understanding",
    "the world did not change; what AEON X knows about this person did"
  );

  /*
    The Step's own sentence, read as a person reads it. It used to be
    "You said you were interested. Today is the last day, and 2 things I still
    don't know. 3MTT Cohort Application" — the opportunity's name bolted onto
    the end of a paragraph.
  */
  const statement = step.step.claim.statement;
  assert.ok(
    statement.startsWith("3MTT Cohort Application —"),
    `the Step leads with the opportunity, got: ${statement}`
  );
  assert.doesNotMatch(statement, /\.\s+[A-Z0-9][^.]*$/, "no trailing name after a full stop");

  /* And the facts are untouched by the declaration. */
  const declared = await scenario("closes-today");
  assert.equal(declared.card.verification?.verdict, "unverified");
  assert.match(
    declared.card.shown.verification,
    /not corroborated/,
    "enthusiasm does not upgrade a verdict"
  );
});

/* ───────────────────────────── Journey 5 ─────────────────────────────────
   Withdrawal returns the person to undeclared, not to declined.            */

test("journey 5 — withdrawing a declaration returns to undeclared, which is not a 'no'", async () => {
  const log = new InMemoryPursuitLog();
  const entityId = "entity-under-test";

  await log.declare(
    declaration({
      personId: "p",
      entityId,
      state: "interested",
      declaredAt: NOW,
    })
  );
  assert.equal((await log.read("p", entityId)).state, "declared");

  await log.withdraw("p", entityId);

  const after = await log.read("p", entityId);
  assert.equal(
    after.state,
    "undeclared",
    "withdrawal is a return to silence, never a recorded decline"
  );
});

/* ───────────────────────────── Journey 6 ─────────────────────────────────
   The last day.                                                            */

test("journey 6 — an opportunity closing today reads as today, and is still open", async () => {
  const s = await scenario("closes-today");

  assert.equal(s.card.stance.urgency.kind, "closing");
  assert.equal(
    s.card.stance.urgency.kind === "closing" && s.card.stance.urgency.daysLeft,
    0
  );
  assert.match(s.card.stance.statement, /[Tt]oday is the last day/);
  assert.doesNotMatch(s.card.stance.statement, /-?\d+ days? left/, "no countdown, no negative");
  assert.match(s.card.shown.timing, /^Closes 14 August 2026\.$/);
});

test("journey 6b — a publisher that gave an hour has its hour said back", async () => {
  const s = await scenario("closes-at-an-hour");

  assert.match(
    s.card.shown.timing,
    /at \d{2}:\d{2} UTC/,
    `a stated closing time must not be rounded away, got: ${s.card.shown.timing}`
  );
});

/* ───────────────────────────── Journey 7 ─────────────────────────────────
   Unknown eligibility is shown as a gap, never filled in.                  */

test("journey 7 — nobody stated the eligibility, and that is said as AEON X's gap", async () => {
  const s = await scenario("eligibility-unstated");

  assert.ok(
    s.card.shown.uncertainties.some((u) => /No source stated the eligibility/.test(u)),
    "the gap is named on the card"
  );

  const all = prose(s).join(" ");
  assert.doesNotMatch(all, /open to all|anyone (can|may) apply|you (are|may be) eligible/i);
  assert.doesNotMatch(all, /you (do not|don't) qualify|not eligible/i);
});

test("journey 7b — nothing anywhere in the laboratory invents a preparation task", async () => {
  const { scenarios } = await lab();
  const everything = scenarios.flatMap(prose).join(" ");

  /*
    The corpus establishes no preparation model, so there is nothing to derive
    one from. `Outstanding` deliberately has no member that could carry a task,
    and this is the surface-level check that none arrived by another route.
  */
  for (const invention of [
    /gather your (documents|transcripts)/i,
    /prepare your/i,
    /draft your/i,
    /update your (cv|resume)/i,
    /get your .* ready/i,
    /checklist/i,
  ]) {
    assert.doesNotMatch(everything, invention, `invented preparation: ${invention}`);
  }
});

/* ───────────────────────────── Journey 8 ─────────────────────────────────
   A "no" is respected.                                                     */

test("journey 8 — a declined opportunity is left alone and never re-argued", async () => {
  const s = await scenario("declined");

  assert.equal(s.card.stance.declaration, "not-interested");
  assert.equal(s.card.stance.next.kind, "declined");
  assert.match(s.card.stance.statement, /left it alone/);

  /* No counter-argument, no second ask, no reasons to reconsider. */
  assert.doesNotMatch(
    s.card.stance.statement,
    /but |however|reconsider|are you sure|still (open|available)/i
  );

  const { step } = await lab();
  if (step.state === "step") {
    assert.notEqual(
      step.step.commitment?.title,
      "Graduate Trainee Programme",
      "something declined never becomes the next best step"
    );
  }
});

/* ───────────────────────────── Journey 9 ─────────────────────────────────
   The terminal action, and what it does not record.                        */

test("journey 9 — the action leaves AEON X, and following it records nothing", async () => {
  const s = await scenario("verified-and-clear");

  assert.ok(s.card.action);
  assert.equal(s.card.action?.verb, "Apply");

  const next = s.inspection.whatHappensNext.join(" ");
  assert.match(next, /leaves AEON X entirely/);
  assert.match(
    next,
    /not recorded as an application/i,
    "clicking is not committing, and the person is told so before they click"
  );
});

test("journey 9b — the Step can name a commitment, and both values came from sources", async () => {
  const { step } = await lab();
  assert.equal(step.state, "step");
  if (step.state !== "step") return;

  const commitment = step.step.commitment;
  assert.ok(commitment, "the ledger affordance has something truthful to write");
  assert.equal(commitment.title, "3MTT Cohort Application");
  assert.ok(commitment.deadline, "and a deadline that a source actually gave");
});

/* ───────────────────────────── Journey 10 ────────────────────────────────
   The whole laboratory, with nothing hand-built and nothing leaking.       */

test("journey 10 — every fixture card is engine output, and the laboratory says so", () => {
  const demo = readFileSync("src/lib/opportunity/surface/demo.ts", "utf8");
  const page = readFileSync("src/app/(workspace)/opportunity/preview/page.tsx", "utf8");

  /* Built, not written. */
  for (const stage of [
    "witness(",
    "groupObservations(",
    "resolveEntity(",
    "establishVerification(",
    "judgeAll(",
    "projectCard(",
    "projectInspection(",
    "recommendNextStep(",
  ]) {
    assert.ok(demo.includes(stage), `the laboratory must go through ${stage}`);
  }

  /* And labelled, on the card rather than on the page around it. */
  assert.match(page, /evidence="fixture"/);
  const card = readFileSync("src/components/opportunity/OpportunityCard.tsx", "utf8");
  assert.match(card, /Fixture — nothing here was retrieved from a real source/);
});

test("journey 10b — no machine timestamp reaches any sentence a person reads", async () => {
  const { scenarios } = await lab();

  for (const s of scenarios) {
    for (const sentence of prose(s)) {
      assert.doesNotMatch(
        sentence,
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
        `ISO instant in user-facing copy (${s.id}): ${sentence}`
      );
    }
    /* Field views are read too — the deadline is rendered from one. */
    for (const view of [s.card.deadline, s.card.organiser, s.card.funding, s.card.location]) {
      if (view.state === "agreed") {
        assert.doesNotMatch(view.value, /\d{4}-\d{2}-\d{2}T/);
      }
      if (view.state === "contested") {
        for (const r of view.readings) assert.doesNotMatch(r.value, /\d{4}-\d{2}-\d{2}T/);
      }
    }
  }
});

test("journey 10c — no score, percentage or probability anywhere in the laboratory", async () => {
  const { scenarios, step } = await lab();

  const banned =
    /"(score|match|matchScore|probability|percent|percentage|chance|odds|confidenceScore)"\s*:/;

  assert.doesNotMatch(JSON.stringify(scenarios), banned);
  assert.doesNotMatch(JSON.stringify(step), banned);

  for (const s of scenarios) {
    for (const sentence of prose(s)) {
      assert.doesNotMatch(sentence, /\d+\s?%/, `a percentage reached the surface: ${sentence}`);
    }
  }
});

test("journey 10d — the laboratory covers every state it claims to, and each says which", async () => {
  const { scenarios } = await lab();

  const ids = scenarios.map((s) => s.id);
  for (const required of [
    "verified-and-clear",
    "single-source",
    "sources-disagree",
    "eligibility-unstated",
    "closes-today",
    "closes-at-an-hour",
    "interested-closing",
    "interested-uncertain",
    "declined",
  ]) {
    assert.ok(ids.includes(required), `the laboratory is missing the ${required} state`);
  }

  for (const s of scenarios) {
    assert.ok(s.label.length > 0, `${s.id} has no label`);
    assert.ok(
      s.demonstrates.length > 20,
      `${s.id} does not say what it is there to demonstrate`
    );
  }

  /* The three absences are three components, never one with a variant prop. */
  const page = readFileSync("src/app/(workspace)/opportunity/preview/page.tsx", "utf8");
  assert.match(page, /UnknownState/);
  assert.match(page, /EmptyState/);
  assert.match(page, /NextBestStep/, "Absent is rendered by the Step, from a real resolution");
});

/* ─────────────────── Seen in a browser, then fixed ──────────────────────
   Every test below was written after looking at the rendered page.        */

test("the Step keeps its authority in the two states a real deployment lives in", () => {
  /*
    Seen at 1280×900: `absent` and `unknown` rendered as a 15px grey paragraph
    in an otherwise empty viewport, while `step` and `no-understanding` got a
    36px headline. The two states a working deployment spends most of its time
    in were the two that looked unfinished — and a person cannot tell "the
    system is being careful" from "the page failed to load" by font size.

    The shared absence components stay small, because they are also used inline
    on the Profile and the Ledger where small is right. The Step supplies its
    own headline.
  */
  const source = readFileSync("src/components/workspace/NextBestStep.tsx", "utf8");

  const headline = /text-\[clamp\(28px,5\.4vw,42px\)\] font-black/g;
  assert.equal(
    (source.match(headline) ?? []).length,
    3,
    "no-understanding, absent and unknown each carry the Step's headline"
  );

  assert.match(source, /Nothing better has appeared\./);
  assert.match(source, /I can&rsquo;t see anything yet\./);
});

test("no judgment kind is printed to a person as its own name", async () => {
  /*
    Seen on the card: "Not recommended. Withheld on verification." The sentence
    that explains why AEON X will not vouch for something was the blocker enum
    joined with commas — and "withheld" reads as *hidden*, which is the opposite
    of what happened. The opportunity is right there; the endorsement is what
    is being withheld.
  */
  const { scenarios } = await lab();

  for (const s of scenarios) {
    assert.doesNotMatch(s.card.shown.whySurfaced, /Withheld on/);
    assert.doesNotMatch(
      s.card.shown.whySurfaced,
      /\bWithheld\b|\bblocker\b|\bundetermined\b/,
      `internal vocabulary on the card: ${s.card.shown.whySurfaced}`
    );
  }
});

test("the verdict is stated once, not twice", async () => {
  /*
    Seen on the card at 390px: "Not recommended. I won't recommend this yet:
    I haven't established that this is real." The prefix existed because the
    reason used to be a fragment; making the reason a whole sentence made the
    prefix a stammer.
  */
  const { scenarios } = await lab();

  for (const s of scenarios) {
    assert.doesNotMatch(
      s.card.shown.whySurfaced,
      /Not recommended\./,
      `the verdict is said twice: ${s.card.shown.whySurfaced}`
    );
  }
});

test("the Workspace reads a person's declarations once, not once per card", () => {
  /*
    Seen while measuring: the route read every declaration for the Step, then
    `resolveCards` read them again — a fresh Supabase client and a separate
    query per card. Eight opportunities meant nine reads of one table for data
    the route already held.

    Asserted on both halves, because either alone silently reintroduces it: the
    projection has to accept them, and the route has to pass them.
  */
  const service = readFileSync("src/lib/opportunity/surface/service.ts", "utf8");
  const page = readFileSync("src/app/(workspace)/workspace/page.tsx", "utf8");

  assert.match(
    service,
    /pursuits\?: ReadonlyMap<string, PursuitResolution>/,
    "resolveCards must accept declarations the caller already read"
  );
  assert.match(
    page,
    /resolveCards\(user\.id, \{ pursuits \}\)/,
    "the Workspace must hand over the declarations it already read"
  );
});

test("field provenance counts sources, not retrievals", () => {
  /*
    Seen under every fact on the card: "2 retrievals · last seen today".
    "Retrieval" is what the engine calls the act; a person reading a fact wants
    to know how many sources said it.
  */
  const source = readFileSync("src/components/opportunity/EntityFact.tsx", "utf8");

  /*
    Comments stripped first. This suite has caught itself asserting on prose
    twice before — the word under test appears in the note explaining why it was
    removed, and a test that passes on a comment is checking nothing.
  */
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  assert.doesNotMatch(code, /retrieval/i);
  assert.match(code, /count\(view\.sources, "source"\)/);
});

/* ───────────────────────────── Motion ───────────────────────────────────
   Atmosphere moves. Information does not.                                  */

const INFORMATION_SURFACES = [
  "src/components/opportunity/OpportunityCard.tsx",
  "src/components/opportunity/OpportunityInspection.tsx",
  "src/components/opportunity/EntityFact.tsx",
  "src/components/opportunity/VerificationSeal.tsx",
  "src/components/opportunity/PairingInference.tsx",
  "src/components/workspace/NextBestStep.tsx",
  "src/components/ui/absence/UnknownState.tsx",
  "src/components/ui/absence/AbsentState.tsx",
  "src/components/ui/absence/EmptyState.tsx",
];

test("no surface that carries evidence animates it in", () => {
  /*
    The principle, stated as a check rather than left as a convention.

    A deadline that fades in has been delayed. A verification seal that scales
    up has been dramatised. A staggered list of sources reveals corroboration as
    a performance, which makes three agreeing announcers feel like a flourish
    rather than a fact. And a Step behind an entrance animation is a Step that
    spins, which XB §15 forbids outright — the answer is precomputed precisely so
    it can arrive whole.

    Atmosphere is free to move. Nothing in this list is atmosphere.
  */
  for (const path of INFORMATION_SURFACES) {
    const source = readFileSync(path, "utf8");

    for (const [pattern, why] of [
      [/\banimate-(?!none)/, "an entrance or looping animation"],
      [/\bmotion\.[a-z]/, "a motion component"],
      [/\binitial=|\banimate=|\bwhileInView=/, "an animated reveal"],
      [/\btransition-all\b/, "transition-all, which animates layout"],
      [/\bdelay-\[?\d/, "a staggered delay"],
      [/\btransition-transform\b/, "a transform transition on information"],
    ] as const) {
      assert.doesNotMatch(source, pattern, `${path} carries ${why}`);
    }

    /*
      Hover and press feedback is allowed and is not information moving — but
      only at the system's interaction duration. Anything slower starts to read
      as the content itself changing.
    */
    for (const duration of source.match(/duration-\[(\d+)ms\]/g) ?? []) {
      const ms = Number(duration.match(/(\d+)/)![1]);
      assert.ok(ms <= 240, `${path} has a ${ms}ms transition; information must not linger`);
    }
  }
});

test("reduced motion is honoured globally, not per component", () => {
  /*
    A per-component opt-out is a per-component thing to forget. The global rule
    is what makes a new surface safe by default.
  */
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation-duration:\s*0\.01ms\s*!important/);
  assert.match(css, /transition-duration:\s*0\.01ms\s*!important/);
});

/* ───────────────────────────── The Ledger ────────────────────────────────
   Memory, and the line between what happened and what was said.            */

test("a declaration never becomes a commitment", () => {
  const page = readFileSync("src/app/(workspace)/ledger/page.tsx", "utf8");

  /*
    L4: the Ledger's "length is determined by what the user actually committed
    to, never by what the system found." Saying "I'm interested" is not saying
    "I applied", and one list holding both would pad the record of someone's
    life with intentions they never acted on.

    Two sections, two headings, and the declarations are not sorted into the
    commitment list — asserted structurally, because the way this breaks is
    somebody concatenating the two arrays to simplify the render.
  */
  assert.match(page, /What you have committed to\./);
  assert.match(page, /What you have said\./);
  assert.match(page, /is not the same as applying/);

  assert.doesNotMatch(
    page,
    /\.\.\.declarations\.declarations[\s\S]{0,80}commitments|commitments[\s\S]{0,80}\.\.\.declarations/,
    "the two records must not be merged into one list"
  );
});

test("a declaration whose opportunity AEON X can no longer see is still shown", () => {
  /*
    The statement is the person's. It does not stop existing because AEON X lost
    track of what it was about, and dropping the row would quietly edit their
    own record — the one thing the Ownership Principle puts beyond the system.
  */
  const page = readFileSync("src/app/(workspace)/ledger/page.tsx", "utf8");
  assert.match(page, /something I can no longer see/);
  assert.match(page, /I still hold what you said/);

  const service = readFileSync("src/lib/opportunity/surface/service.ts", "utf8");
  assert.match(service, /title: string \| null/, "an untitled declaration is representable");
});

test("a shared opportunity link survives signing in", async () => {
  /*
    Both opportunity pages redirected an anonymous visitor with a bare
    `redirect("/login")`, which drops the destination — so someone following a
    shared link signed in and arrived at the Workspace instead of the
    opportunity. Nothing was exposed; the person simply lost where they were
    going, which is the deep-link dead end IA §08 exists to prevent.

    The fix is one entry in PROTECTED_ROUTES, because the Proxy captures
    `pathname + search` as `next` and `safeRedirectPath` allowlists from the
    same constant. Asserting on both halves, since a route that is guarded but
    not capturable would be bounced back to the fallback anyway.
  */
  const { PROTECTED_ROUTES } = await import("@/lib/routes");
  const { safeRedirectPath } = await import("@/lib/safe-redirect");

  assert.ok(
    (PROTECTED_ROUTES as readonly string[]).includes("/opportunity"),
    "the opportunity tree must be guarded by the Proxy, which is what sets `next`"
  );

  assert.equal(
    safeRedirectPath("/opportunity/preview/some-id?why=rank"),
    "/opportunity/preview/some-id?why=rank",
    "and capturable, query included, so a depth link lands where it pointed"
  );
});

test("a fixture never tells the reader that they said something", async () => {
  /*
    The declarations in the laboratory belong to the scenario, not to whoever
    is looking at the page. A card that says "You said you are interested" to
    someone who never said it is the one lie this whole arrangement exists to
    avoid — and it is the easy mistake, because the component is the same one
    the live surface uses.
  */
  const control = readFileSync("src/components/opportunity/InterestedControl.tsx", "utf8");
  const card = readFileSync("src/components/opportunity/OpportunityCard.tsx", "utf8");

  assert.match(control, /evidence\?: "live" \| "fixture"/);
  assert.match(control, /This person’s position/);
  assert.match(control, /In this scenario, they have said/);
  assert.match(card, /evidence={evidence}/, "the card must pass its provenance down");
  assert.match(card, /Since they said that/);
});
