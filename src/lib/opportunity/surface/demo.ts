import "@/lib/server-only";
import { classify } from "../announcers/registry";
import { deriveStakes } from "../corpus";
import { groupObservations } from "../entity/group";
import { resolveEntity } from "../entity/resolve";
import type { OpportunityEntity } from "../entity/types";
import { witness } from "../observation/record";
import { InMemoryObservationStore } from "../observation/store";
import type { SourceObservation } from "../observation/types";
import { InMemoryVerificationLog } from "../verification/log";
import { establishVerification } from "../verification/service";
import { judgeAll } from "../judgment/service";
import { InMemoryPursuitLog } from "../pursuit/log";
import { declaration, type PursuitResolution, type PursuitState } from "../pursuit/types";
import { recommendNextStep } from "../recommendation/service";
import type { StepResolution } from "@/lib/opportunity/foundation/next-action";
import { projectCard, type OpportunityCard } from "./card";
import { projectInspection, type OpportunityInspection } from "./inspection";

/**
 * The fixture laboratory.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * THE RULE THIS FILE LIVES UNDER
 * ══════════════════════════════════════════════════════════════════════════
 *
 * **Nothing here may ever reach a live surface.** It is reachable from exactly
 * two routes, `/opportunity/preview` and `/opportunity/preview/[entityId]`,
 * every card it produces is rendered with `evidence="fixture"`, and the marker
 * is on the card itself rather than on the page around it — so a component
 * reused elsewhere carries the label with it.
 *
 * Seeding this into the real store would be the fabricated movement the
 * constitution forbids by name, and it would be undetectable afterwards: a
 * fixture observation and a real one are the same shape.
 *
 * ── Why it is built through the engine rather than hand-written ───────────
 *
 * Every card and inspection below is produced by witnessing fixture HTML,
 * grouping it, resolving entities, establishing verification, judging pairings
 * and projecting — the whole chain, in the order the live routes call it. Not
 * one object here is assembled by hand.
 *
 * That is the difference between a laboratory and a mockup. A hand-built card
 * can show a surface the engine cannot actually produce, and the demo then
 * starts driving the architecture instead of reflecting it. Here, if the engine
 * cannot produce a state, the laboratory cannot show it — which is exactly the
 * feedback a product surface needs.
 *
 * ── Why the dates are relative ────────────────────────────────────────────
 *
 * "Closes today" has to still be true tomorrow. Every deadline is computed from
 * the `now` the corpus is built with, so the states stay the states rather than
 * decaying into "everything closed last year" a month after they were written.
 *
 * ── Why some scenarios carry a declaration ────────────────────────────────
 *
 * Because the states that matter most — interested with a deadline closing,
 * interested with something unsettled, declined — only exist once somebody has
 * spoken, and those are the states the product was hardest to get right.
 *
 * The declaration is part of the fixture, exactly as the observations are. It
 * is **not** a persisted answer from whoever is looking at the page, and the
 * surface must not say it is: `InterestedControl` is told this is fixture
 * evidence and speaks about "this person" rather than "you". Showing someone
 * their own name against a position they never took would be the one lie this
 * whole arrangement exists to avoid.
 */

const DAY = 86_400_000;

/** `2026-09-30`. Day precision, exactly as an announcer publishes it. */
function inDays(now: string, days: number): string {
  return new Date(new Date(now).getTime() + days * DAY).toISOString().slice(0, 10);
}

function programme(opts: {
  title: string;
  organiser: string;
  deadline: string;
  applyUrl: string;
  identifier?: string;
  type?: string;
  funding?: string;
  eligibility?: string;
  location?: string;
}): string {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": opts.type ?? "EducationalOccupationalProgram",
    name: opts.title,
    provider: { "@type": "Organization", name: opts.organiser },
    applicationDeadline: opts.deadline,
    url: opts.applyUrl,
  };
  if (opts.identifier) node.identifier = opts.identifier;
  if (opts.funding) node.offers = opts.funding;
  if (opts.eligibility) node.programPrerequisites = opts.eligibility;
  if (opts.location) node.location = opts.location;

  return `<!doctype html><html><head><title>${opts.title}</title>
<script type="application/ld+json">${JSON.stringify(node)}</script>
</head><body><h1>${opts.title}</h1></body></html>`;
}

function observe(url: string, body: string, at: string): SourceObservation {
  const { sourceId, label, sourceClass } = classify(url);
  return witness(
    {
      url,
      completedAt: at,
      status: 200,
      body,
      encoding: "utf-8",
      contentType: "text/html; charset=utf-8",
    },
    { source: { sourceId, label, sourceClass } }
  );
}

/**
 * One state the product has to handle, and the evidence that produces it.
 *
 * `demonstrates` is the point of the scenario in a sentence — what a reader
 * should be checking when they look at it. It is prose about the laboratory,
 * never prose about the opportunity, so it cannot be mistaken for a finding.
 */
interface Specimen {
  id: string;
  label: string;
  demonstrates: string;
  observations: SourceObservation[];
  /** A position the fixture person has taken, where the state needs one. */
  declared?: PursuitState;
}

const PERSON = "preview";

function specimens(now: string): Specimen[] {
  /* Retrievals, oldest first. All in the past relative to `now`. */
  const seen = (daysAgo: number) =>
    new Date(new Date(now).getTime() - daysAgo * DAY).toISOString();

  return [
    {
      id: "verified-and-clear",
      label: "Verified, and nothing unsettled about the opportunity itself",
      demonstrates:
        "Three institutional announcers, one declared identifier, every field agreeing. This is the best case, and it should still show what is not known.",
      observations: (() => {
        const body = programme({
          title: "Bilateral Education Agreement (BEA) Scholarship",
          organiser: "Federal Ministry of Education",
          deadline: inDays(now, 56),
          applyUrl: "https://education.gov.ng/bea/apply",
          identifier: "DEMO-FMOE-BEA-2026",
          funding: "Full tuition, monthly stipend, one return flight",
          eligibility:
            "Nigerian citizens holding a first degree with at least Second Class Upper",
          location: "Study abroad; partner countries vary by cycle",
        });
        return [
          observe("https://education.gov.ng/bea-2026", body, seen(12)),
          observe("https://www.unn.edu.ng/bea-scholarship/", body, seen(7)),
          observe("https://unilag.edu.ng/news/bea-scholarship", body, seen(2)),
        ];
      })(),
    },

    {
      id: "single-source",
      label: "One source, and no corroboration",
      demonstrates:
        "Seen once, by one announcer. The facts are real observations; the verification is not there, and the card must say so rather than looking like the one above.",
      observations: [
        observe(
          "https://www.unn.edu.ng/young-innovators-forum/",
          programme({
            title: "Young Innovators Forum",
            organiser: "University of Nigeria, Nsukka",
            deadline: inDays(now, 15),
            applyUrl: "https://www.unn.edu.ng/young-innovators-forum/register",
            identifier: "DEMO-UNN-YIF-2026",
            type: "EducationEvent",
            location: "Nsukka, Enugu State",
          }),
          seen(4)
        ),
      ],
    },

    {
      id: "sources-disagree",
      label: "Two announcers, two different closing dates",
      demonstrates:
        "The disagreement survives to the surface instead of being deduplicated away. AEON X will not pick one, and says which sources said what.",
      observations: [
        observe(
          "https://ptdf.gov.ng/scholarship",
          programme({
            title: "PTDF Overseas Scholarship",
            organiser: "Petroleum Technology Development Fund",
            deadline: inDays(now, 40),
            applyUrl: "https://ptdf.gov.ng/apply",
            identifier: "DEMO-PTDF-OSS-2026",
            funding: "Full tuition and stipend",
          }),
          seen(9)
        ),
        observe(
          "https://www.unn.edu.ng/ptdf-scholarship/",
          programme({
            title: "PTDF Overseas Scholarship",
            organiser: "Petroleum Technology Development Fund",
            deadline: inDays(now, 56),
            applyUrl: "https://ptdf.gov.ng/apply",
            identifier: "DEMO-PTDF-OSS-2026",
            funding: "Full tuition and stipend",
          }),
          seen(3)
        ),
      ],
    },

    {
      id: "eligibility-unstated",
      label: "Nobody said who may apply",
      demonstrates:
        "No source stated the eligibility. That is shown as a gap in the evidence — never as 'open to all', and never as a reason to think the person does not qualify.",
      observations: (() => {
        const body = programme({
          title: "NELF Student Loan — 2026 intake",
          organiser: "Nigerian Education Loan Fund",
          deadline: inDays(now, 30),
          applyUrl: "https://nelf.gov.ng/apply",
          identifier: "DEMO-NELF-2026",
          funding: "Interest-free tuition loan, repayable after employment",
        });
        return [
          observe("https://nelf.gov.ng/student-loan", body, seen(11)),
          observe("https://education.gov.ng/nelf-intake", body, seen(6)),
        ];
      })(),
    },

    {
      id: "closes-today",
      label: "Closes today",
      demonstrates:
        "A deadline published as a bare calendar day, reached. It stays open through the whole of that day, and the wording says 'today' rather than counting zero days.",
      declared: "interested",
      observations: (() => {
        const body = programme({
          title: "3MTT Cohort Application",
          organiser: "National Information Technology Development Agency",
          deadline: inDays(now, 0),
          applyUrl: "https://3mtt.nitda.gov.ng/apply",
          identifier: "DEMO-NITDA-3MTT-C4",
          eligibility: "Nigerian residents aged 18 and above",
          funding: "Fully funded training place",
        });
        return [
          observe("https://nitda.gov.ng/3mtt/", body, seen(20)),
          observe("https://3mtt.nitda.gov.ng/cohort", body, seen(5)),
        ];
      })(),
    },

    {
      id: "closes-at-an-hour",
      label: "A closing time, not just a closing day",
      demonstrates:
        "The one publisher in the set that gave an hour. It is taken at its word and not widened to the end of the day — the contrast with the scenario above is the whole point.",
      observations: [
        observe(
          "https://ptdf.gov.ng/fellowship",
          programme({
            title: "PTDF Research Fellowship",
            organiser: "Petroleum Technology Development Fund",
            deadline: new Date(new Date(now).getTime() + 21 * DAY).toISOString(),
            applyUrl: "https://ptdf.gov.ng/fellowship/apply",
            identifier: "DEMO-PTDF-FELLOW-2026",
            eligibility: "Holders of a masters degree in a petroleum-related discipline",
          }),
          seen(8)
        ),
      ],
    },

    {
      id: "interested-closing",
      label: "Interested, and the deadline is close",
      demonstrates:
        "A declaration changes what AEON X says next and nothing else. The verification, the fields and the judgments are the same as they would be undeclared.",
      declared: "interested",
      observations: (() => {
        const body = programme({
          title: "Federal Government Postgraduate Scholarship",
          organiser: "Federal Ministry of Education",
          deadline: inDays(now, 9),
          applyUrl: "https://education.gov.ng/pgs/apply",
          identifier: "DEMO-FMOE-PGS-2026",
          eligibility: "First-class or Second Class Upper graduates under 35",
          funding: "Tuition, stipend and research allowance",
        });
        return [
          observe("https://education.gov.ng/postgraduate-scholarship", body, seen(14)),
          observe("https://www.unn.edu.ng/fg-postgraduate/", body, seen(6)),
          observe("https://unilag.edu.ng/news/fg-pgs", body, seen(1)),
        ];
      })(),
    },

    {
      id: "interested-uncertain",
      label: "Interested, and something is genuinely in the way",
      demonstrates:
        "Enthusiasm does not upgrade a verdict. The unsettled things are listed as AEON X's own gaps, and none of them is an invented preparation task.",
      declared: "interested",
      observations: [
        observe(
          "https://uniport.edu.ng/opportunities/shell-jv",
          programme({
            title: "Shell JV University Scholarship",
            organiser: "University of Port Harcourt",
            deadline: inDays(now, 12),
            applyUrl: "https://uniport.edu.ng/opportunities/shell-jv/apply",
            identifier: "DEMO-UNIPORT-SHELL-2026",
          }),
          seen(5)
        ),
      ],
    },

    {
      id: "declined",
      label: "Declined",
      demonstrates:
        "A 'no' is a real position, distinct from never having answered. It is respected, not re-argued, and the opportunity leaves the Step entirely.",
      declared: "not-interested",
      observations: (() => {
        const body = programme({
          title: "Graduate Trainee Programme",
          organiser: "Nigerian Content Development and Monitoring Board",
          deadline: inDays(now, 25),
          applyUrl: "https://ncdmb.gov.ng/graduate-trainee/apply",
          identifier: "DEMO-NCDMB-GT-2026",
          eligibility: "Graduates within two years of national service",
        });
        return [
          observe("https://education.gov.ng/ncdmb-trainee", body, seen(10)),
          observe("https://www.unn.edu.ng/ncdmb-graduate-trainee/", body, seen(4)),
        ];
      })(),
    },
  ];
}

/** One specimen, projected. */
export interface DemoScenario {
  id: string;
  label: string;
  demonstrates: string;
  card: OpportunityCard;
  inspection: OpportunityInspection;
}

export interface DemoCorpus {
  scenarios: DemoScenario[];
  /** Kept for the routes that read a single inspection by entity id. */
  inspections: Map<string, OpportunityInspection>;
  /**
   * What the Workspace Step resolves to over this corpus, for the fixture
   * person, with their fixture declarations.
   *
   * Produced by the real resolver rather than described in prose, because the
   * claim the laboratory has to support is that a declaration changes the Step
   * — and a sentence asserting that is not evidence of it.
   */
  step: StepResolution;
  /**
   * The same resolver over the same corpus with **no** declarations. The
   * before, so the transition can be seen rather than asserted.
   */
  stepUndeclared: StepResolution;
}

export async function demoCorpus(now: string = new Date().toISOString()): Promise<DemoCorpus> {
  const store = new InMemoryObservationStore();
  const verifications = new InMemoryVerificationLog();
  const pursuits = new InMemoryPursuitLog();

  const set = specimens(now);

  const all = set.flatMap((s) => s.observations);
  for (const observation of all) await store.append(observation);

  /*
    Grouped in one pass over the whole corpus, exactly as `deriveCorpus` does.
    Not per specimen — grouping across everything is what would catch two
    fixtures accidentally resolving to one entity, and a per-specimen fold would
    hide precisely that.
  */
  const { groups } = groupObservations(all);

  const resolved = groups.flatMap((group) => {
    const result = resolveEntity({
      members: group.members,
      identity: group.identity,
      rationale: group.rationale,
      stakes: deriveStakes(),
      decidedAt: now,
    });
    return "entity" in result ? [{ group, entity: result.entity }] : [];
  });

  for (const { group, entity } of resolved) {
    await verifications.record(
      {
        id: entity.id,
        key: entity.resolution.key,
        method: entity.resolution.method,
        stakes: entity.stakes,
      },
      establishVerification(entity, group.members.map((m) => m.observation), now)
    );
  }

  const records = await verifications.readAll();

  /* Which specimen an entity came from, by the observations underneath it. */
  const specimenFor = new Map<string, Specimen>();
  for (const { group, entity } of resolved) {
    const ids = new Set(group.members.map((m) => m.observation.id));
    const owner = set.find((s) => s.observations.some((o) => ids.has(o.id)));
    if (owner) specimenFor.set(entity.id, owner);
  }

  /* The fixture person's positions, declared through the real log. */
  for (const { entity } of resolved) {
    const state = specimenFor.get(entity.id)?.declared;
    if (!state) continue;
    await pursuits.declare(
      declaration({
        personId: PERSON,
        entityId: entity.id,
        state,
        /* Said a few days ago, so "since you said that" has somewhere to point. */
        declaredAt: new Date(new Date(now).getTime() - 3 * DAY).toISOString(),
      })
    );
  }

  const judgments = judgeAll(
    resolved.map(({ entity }) => ({
      personId: PERSON,
      entity,
      /* Every resolved entity has a record — it was written above. */
      verification: records.get(entity.id)!,
      facts: [],
      now,
    }))
  );

  const scenarios: DemoScenario[] = [];
  const inspections = new Map<string, OpportunityInspection>();

  /* Presented in the order the specimens are written, not the order the
     grouping happened to produce — the sequence is the argument. */
  const byId = new Map(resolved.map((r) => [r.entity.id, r]));
  const ordered = set.flatMap((specimen) => {
    const match = [...byId.values()].find(
      (r) => specimenFor.get(r.entity.id)?.id === specimen.id
    );
    return match ? [{ specimen, ...match }] : [];
  });

  for (const { specimen, group, entity } of ordered) {
    const input = {
      entity,
      verification: records.get(entity.id) ?? null,
      judgments: judgments.find((j) => j.entityId === entity.id) ?? null,
      pursuit: await pursuits.read(PERSON, entity.id),
      now,
    };

    const inspection = projectInspection({
      ...input,
      observations: group.members.map((m) => m.observation),
    });

    inspections.set(entity.id, inspection);
    scenarios.push({
      id: specimen.id,
      label: specimen.label,
      demonstrates: specimen.demonstrates,
      card: projectCard(input),
      inspection,
    });
  }

  const entities: OpportunityEntity[] = resolved.map((r) => r.entity);

  const [declared, undeclared] = await Promise.all([
    recommendNextStep({
      personId: PERSON,
      store,
      entities,
      verifications: records,
      facts: [],
      pursuits: await pursuits.readAll(PERSON),
      now,
    }),
    recommendNextStep({
      personId: PERSON,
      store,
      entities,
      verifications: records,
      facts: [],
      now,
    }),
  ]);

  return {
    scenarios,
    inspections,
    step: declared.resolution,
    stepUndeclared: undeclared.resolution,
  };
}

/** The fixture person's declaration for one entity. Exposed for the tests. */
export type { PursuitResolution };
