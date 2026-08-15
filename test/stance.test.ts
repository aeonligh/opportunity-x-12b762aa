import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { groupObservations } from "@/lib/opportunity/entity/group";
import { resolveEntity } from "@/lib/opportunity/entity/resolve";
import { deriveStakes } from "@/lib/opportunity/corpus";
import { establishVerification, resolveVerification } from "@/lib/opportunity/verification/service";
import { judge } from "@/lib/opportunity/judgment/service";
import { InMemoryObservationStore } from "@/lib/opportunity/observation/store";
import { InMemoryPursuitLog } from "@/lib/opportunity/pursuit/log";
import { declaration, type PursuitResolution } from "@/lib/opportunity/pursuit/types";
import { deriveStance, CLOSING_WINDOW_DAYS } from "@/lib/opportunity/pursuit/stance";
import { projectCard } from "@/lib/opportunity/surface/card";
import { recommendNextStep } from "@/lib/opportunity/recommendation/service";
import type { SourceObservation } from "@/lib/opportunity/observation/types";
import { fixedAssessor, observe, T0, T1 } from "./fixtures.ts";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * A DECLARATION CHANGES THE RELATIONSHIP, NOT THE FACTS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Every test here starts from real engine output and then adds — or does not
 * add — something the person said. The invariant under test throughout is that
 * saying "I'm interested" changes what Opportunity X *says next* and changes no verdict
 * whatsoever.
 *
 * The failure this suite is written to catch is the commercially obvious one: a
 * product that reads enthusiasm as evidence, and quietly turns "I want this"
 * into "you're a good fit for this".
 */

const FMOE = "https://education.gov.ng/bea";
const UNN = "https://www.unn.edu.ng/bea/";
const UNILAG = "https://unilag.edu.ng/bea";
const APPLY = "https://education.gov.ng/bea/apply";

const NOW = "2026-08-10T09:00:00.000Z";
const IN_FOUR_DAYS = "2026-08-14T00:00:00.000Z";
const IN_SIX_MONTHS = "2027-02-10T00:00:00.000Z";
const LAST_MONTH = "2026-07-10T00:00:00.000Z";

function bea(opts: { deadline?: string; id?: string; eligibility?: string | null } = {}) {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalProgram",
    name: "BEA Scholarship",
    provider: { "@type": "Organization", name: "Federal Ministry of Education" },
    url: APPLY,
    identifier: opts.id ?? "STANCE-BEA",
  };
  if (opts.deadline !== undefined) node.applicationDeadline = opts.deadline;
  if (opts.eligibility !== null) {
    node.programPrerequisites = opts.eligibility ?? "Nigerian citizens with a first degree";
  }
  return `<!doctype html><html><head><script type="application/ld+json">${JSON.stringify(
    node,
  )}</script></head><body></body></html>`;
}

function build(observations: SourceObservation[]) {
  const { groups } = groupObservations(observations);
  assert.equal(groups.length, 1);
  const resolved = resolveEntity({
    members: groups[0].members,
    identity: groups[0].identity,
    rationale: groups[0].rationale,
    stakes: deriveStakes(),
    decidedAt: NOW,
  });
  assert.ok("entity" in resolved);
  const entity = resolved.entity;
  return {
    entity,
    verification: establishVerification(entity, observations, NOW),
    observations,
  };
}

/** Verified: three institutional announcers agreeing. */
function verified(deadline: string, opts: { eligibility?: string | null } = {}) {
  return build([
    observe(FMOE, bea({ deadline, ...opts }), T0),
    observe(UNN, bea({ deadline, ...opts }), T1),
    observe(UNILAG, bea({ deadline, ...opts }), T1),
  ]);
}

const UNDECLARED: PursuitResolution = { state: "undeclared" };

function interestedOn(entityId: string, at = T1): PursuitResolution {
  const d = declaration({ personId: "p1", entityId, state: "interested", declaredAt: at });
  return { state: "declared", declaration: d, history: [d] };
}

function declinedOn(entityId: string, at = T1): PursuitResolution {
  const d = declaration({ personId: "p1", entityId, state: "not-interested", declaredAt: at });
  return { state: "declared", declaration: d, history: [d] };
}

function stanceFor(
  built: ReturnType<typeof build>,
  pursuit: PursuitResolution,
  opts: { assessed?: boolean } = {},
) {
  const judgments = judge({
    personId: "p1",
    entity: built.entity,
    verification: built.verification,
    facts: [],
    now: NOW,
    ranking: { position: 1, outOf: 1 },
    ...(opts.assessed
      ? {
          assessor: fixedAssessor({
            eligibility: [
              {
                kind: "stated-goal" as const,
                criterion: "You want a fully funded scholarship.",
                status: "met" as const,
                provenance: "confirmed" as const,
                factId: "f1",
              },
            ],
          }),
        }
      : {}),
  });

  return {
    judgments,
    stance: deriveStance({
      entity: built.entity,
      verification: resolveVerification(built.verification, NOW),
      judgments,
      pursuit,
      now: NOW,
    }),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   The six distinctions
   ══════════════════════════════════════════════════════════════════════════ */

test("1 · never declared — the move is to look, and nothing is assumed", () => {
  const built = verified(IN_FOUR_DAYS);
  const { stance } = stanceFor(built, UNDECLARED);

  assert.equal(stance.declaration, "undeclared");
  assert.equal(stance.since, null);
  assert.equal(stance.next.kind, "review");
  /* Not "you should apply", and not a soft decline either. */
  assert.match(stance.statement, /decide whether it is worth your time/);
});

test("2 · declared interest, nothing pressing — watching, not urging", () => {
  const built = verified(IN_SIX_MONTHS);
  const { stance } = stanceFor(built, interestedOn(built.entity.id), { assessed: true });

  assert.equal(stance.declaration, "interested");
  assert.equal(stance.urgency.kind, "open");
  assert.equal(stance.next.kind, "act");
  assert.match(stance.statement, /You said you were interested/);
  /* Six months out. No countdown, no pressure invented from a distant date. */
  assert.equal(/\d+ days left/.test(stance.statement), false);
});

test("3 · declared interest and the deadline is close — the days are stated once", () => {
  const built = verified(IN_FOUR_DAYS);
  const { stance } = stanceFor(built, interestedOn(built.entity.id), { assessed: true });

  assert.equal(stance.urgency.kind, "closing");
  if (stance.urgency.kind !== "closing") return;
  assert.equal(stance.urgency.daysLeft, 3);
  assert.match(stance.statement, /3 days left/);
  /* A number of days, derived from an observed date and the clock. Not a
     colour, not a countdown, not "hurry". */
  assert.equal(/hurry|act now|don't miss|last chance/i.test(stance.statement), false);
});

test("4 · declared interest but something is unknown — the uncertainty leads", () => {
  /* No eligibility stated by any source, and no assessor has read requirements. */
  const built = verified(IN_FOUR_DAYS, { eligibility: null });
  const { stance } = stanceFor(built, interestedOn(built.entity.id));

  assert.equal(stance.next.kind, "resolve-unknowns");
  if (stance.next.kind !== "resolve-unknowns") return;

  const kinds = stance.next.outstanding.map((o) => o.kind);
  assert.ok(kinds.includes("unobserved"), "a field nothing was said about");
  assert.ok(kinds.includes("eligibility-unread"), "requirements never read");

  /* Every line traces to evidence or to its absence. None is a task. */
  for (const item of stance.next.outstanding) {
    assert.ok(item.because.length > 0);
    assert.equal(
      /gather|prepare|upload|draft|collect your/i.test(item.because),
      false,
      `"${item.because}" reads as an invented preparation task`,
    );
  }
});

test("5 · declared interest, nothing unknown — the concrete action surfaces", () => {
  const built = verified(IN_FOUR_DAYS);
  const { stance } = stanceFor(built, interestedOn(built.entity.id), { assessed: true });

  assert.equal(stance.outstanding.length, 0);
  assert.equal(stance.next.kind, "act");
  if (stance.next.kind !== "act") return;
  /* The publisher's verb, not one the product chose. */
  assert.equal(stance.next.action.verb, "Apply");
  assert.equal(stance.next.action.href, APPLY);
});

test("6 · declined — respected, and not re-argued", () => {
  const built = verified(IN_FOUR_DAYS);
  const { stance } = stanceFor(built, declinedOn(built.entity.id), { assessed: true });

  assert.equal(stance.next.kind, "declined");
  assert.match(stance.statement, /isn't for you/);
  /* Not softened into "are you sure?" and not re-pitched. */
  assert.equal(/reconsider|are you sure|but/i.test(stance.statement), false);
});

test("withdrawal returns the person to undeclared, and that is deliberate", async () => {
  const log = new InMemoryPursuitLog();
  const built = verified(IN_FOUR_DAYS);

  await log.declare(
    declaration({ personId: "p1", entityId: built.entity.id, state: "interested", declaredAt: T1 }),
  );
  await log.withdraw("p1", built.entity.id);

  const after = await log.read("p1", built.entity.id);
  const { stance } = stanceFor(built, after);

  /*
    Indistinguishable from never having spoken — because they asked to be
    forgotten. A tombstone reading "withdrew" would keep the record they asked
    to be rid of, which is the opposite of what withdrawal is for.
  */
  assert.equal(stance.declaration, "undeclared");
  assert.equal(stance.next.kind, "review");
});

/* ══════════════════════════════════════════════════════════════════════════
   The prohibition
   ══════════════════════════════════════════════════════════════════════════ */

test("interest never upgrades a verdict", () => {
  /* One announcer: honestly unverified at life-changing stakes. */
  const built = build([observe(FMOE, bea({ deadline: IN_FOUR_DAYS }), T0)]);

  const cold = stanceFor(built, UNDECLARED);
  const keen = stanceFor(built, interestedOn(built.entity.id));

  /* Byte-identical judgments. The declaration was not an input to any of them. */
  assert.deepEqual(cold.judgments.verification, keen.judgments.verification);
  assert.deepEqual(cold.judgments.eligibility, keen.judgments.eligibility);
  assert.deepEqual(cold.judgments.fit, keen.judgments.fit);
  assert.deepEqual(cold.judgments.risk, keen.judgments.risk);
  assert.deepEqual(cold.judgments.recommendation, keen.judgments.recommendation);

  /* And the stance says so rather than papering over it. */
  assert.equal(keen.stance.next.kind, "resolve-unknowns");
  assert.ok(keen.stance.outstanding.some((o) => o.kind === "unverified"));
});

test("no stance ever tells the person they will win, fit, or are ready", () => {
  const cases: PursuitResolution[] = [UNDECLARED, interestedOn("x"), declinedOn("x")];
  const deadlines = [IN_FOUR_DAYS, IN_SIX_MONTHS, LAST_MONTH];

  for (const deadline of deadlines) {
    const built = verified(deadline);
    for (const pursuit of cases) {
      for (const assessed of [true, false]) {
        const { stance } = stanceFor(built, pursuit, { assessed });
        const text = [stance.statement, ...stance.outstanding.map((o) => o.because)].join(" ");
        assert.equal(
          /you will win|good fit for you|you should apply|you're ready|you are ready|likely to succeed|strong candidate/i.test(
            text,
          ),
          false,
          `stance leaked a judgment: "${text}"`,
        );
      }
    }
  }
});

test("a passed deadline outranks the declaration, in both directions", () => {
  const built = verified(LAST_MONTH);

  for (const pursuit of [UNDECLARED, interestedOn(built.entity.id)]) {
    const { stance } = stanceFor(built, pursuit, { assessed: true });
    assert.equal(stance.urgency.kind, "passed");
  }

  /* Telling someone who said they were interested to go and act on something
     that closed last month is worse than saying nothing. */
  const { stance } = stanceFor(built, interestedOn(built.entity.id), { assessed: true });
  assert.equal(stance.next.kind, "closed");
  assert.match(stance.statement, /deadline has passed/);
});

test("an undated opportunity is never urged, and says why", () => {
  const built = verified("rolling admissions");
  const { stance } = stanceFor(built, interestedOn(built.entity.id), { assessed: true });

  /* Derived closure: no readable date means unknown, never open. */
  assert.equal(stance.urgency.kind, "undated");
  assert.match(stance.statement, /no source gave a closing date/);
});

test("the closing window is a stated number of days, not a mood", () => {
  assert.equal(typeof CLOSING_WINDOW_DAYS, "number");
  assert.ok(CLOSING_WINDOW_DAYS > 0);
});

/* ══════════════════════════════════════════════════════════════════════════
   The Step actually changes
   ══════════════════════════════════════════════════════════════════════════ */

async function stepFor(built: ReturnType<typeof build>, pursuits: Map<string, PursuitResolution>) {
  const store = new InMemoryObservationStore();
  for (const o of built.observations) await store.append(o);

  return recommendNextStep({
    personId: "p1",
    store,
    entities: [built.entity],
    verifications: new Map([[built.entity.id, built.verification]]),
    facts: [],
    pursuits,
    now: NOW,
  });
}

test("before declaring, the Step cannot resolve — nothing connects it to the person", async () => {
  const built = verified(IN_FOUR_DAYS);
  const { resolution } = await stepFor(built, new Map());

  /* Verified, open, recommended — and still not *your* next step, because the
     composition law has no person-side evidence to rest a claim on. */
  assert.equal(resolution.state, "absent");
});

test("declaring interest is what makes the Step resolve, and it says why", async () => {
  const built = verified(IN_FOUR_DAYS);
  const { resolution } = await stepFor(
    built,
    new Map([[built.entity.id, interestedOn(built.entity.id)]]),
  );

  assert.equal(resolution.state, "step");
  if (resolution.state !== "step") return;

  /* Grounded in what they said — confirmed tier, because they said it. */
  assert.equal(resolution.step.claim.evidence.provenance, "confirmed");
  assert.match(resolution.step.claim.evidence.summary, /you were interested/);
  /* Their own statement is the origin, so there is nothing observed behind it
     and nowhere for a confidence score to live. */
  assert.deepEqual(resolution.step.claim.evidence.observations, []);
  assert.equal("confidence" in resolution.step.claim.evidence, false);

  /* The world did not change; what Opportunity X knows about them did. */
  assert.equal(resolution.step.claim.origin, "understanding");
  assert.match(resolution.step.claim.statement, /3 days left/);
});

test("declining removes an opportunity from the Step entirely", async () => {
  const built = verified(IN_FOUR_DAYS);
  const { resolution, considered } = await stepFor(
    built,
    new Map([[built.entity.id, declinedOn(built.entity.id)]]),
  );

  /* Still judged and still inspectable — withholding is not hiding. */
  assert.equal(considered.length, 1);
  /* But never the Step. Re-surfacing something somebody declined is the
     behaviour that teaches people to stop answering. */
  assert.equal(resolution.state, "absent");
});

test("an interested opportunity whose deadline passed does not become the Step", async () => {
  const built = verified(LAST_MONTH);
  const { resolution } = await stepFor(
    built,
    new Map([[built.entity.id, interestedOn(built.entity.id)]]),
  );

  assert.equal(resolution.state, "absent");
});

test("the card carries the stance, and shows nothing when nothing was said", () => {
  const built = verified(IN_FOUR_DAYS);

  const cold = projectCard({
    entity: built.entity,
    verification: built.verification,
    judgments: stanceFor(built, UNDECLARED).judgments,
    pursuit: UNDECLARED,
    now: NOW,
  });
  assert.equal(cold.stance.declaration, "undeclared");
  assert.equal(cold.stance.next.kind, "review");

  const keen = projectCard({
    entity: built.entity,
    verification: built.verification,
    judgments: stanceFor(built, interestedOn(built.entity.id)).judgments,
    pursuit: interestedOn(built.entity.id),
    now: NOW,
  });
  assert.equal(keen.stance.declaration, "interested");

  /* And the entity facts are byte-identical across the two. */
  assert.deepEqual(cold.deadline, keen.deadline);
  assert.deepEqual(cold.verification, keen.verification);
});

/* ══════════════════════════════════════════════════════════════════════════
   No preparation model was invented
   ══════════════════════════════════════════════════════════════════════════ */

const STANCE_SOURCE = readFileSync("src/lib/opportunity/pursuit/stance.ts", "utf8");
const CARD_COMPONENT = readFileSync("src/components/opportunity/OpportunityCard.tsx", "utf8");

test("the Outstanding union has no member for an invented task", () => {
  const code = STANCE_SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  /* The corpus defines no preparation model. Every Outstanding member traces to
     something the engine holds; a `task` or `step` member would let a
     requirement nobody derived sit beside a deadline three sources confirmed. */
  for (const forbidden of ['kind: "task"', 'kind: "step"', 'kind: "todo"', 'kind: "document"']) {
    assert.equal(code.includes(forbidden), false, `${forbidden} is an invented requirement`);
  }
});

test("no surface renders a preparation checklist", () => {
  const rendered = CARD_COMPONENT.replace(/\/\*[\s\S]*?\*\//g, "").replace(
    /\{\/\*[\s\S]*?\*\/\}/g,
    "",
  );

  for (const phrase of ["Gather", "Prepare your", "Upload", "Checklist", "Get ready"]) {
    assert.equal(
      rendered.includes(phrase),
      false,
      `"${phrase}" is preparation UX the corpus does not establish`,
    );
  }
});
