import { deriveCorpus } from "@/lib/opportunity/corpus";
import { recommendNextStep } from "@/lib/opportunity/recommendation/service";
import { opportunityRecord } from "@/lib/opportunity/store";
import type { PursuitResolution } from "@/lib/opportunity/pursuit/types";
import type { StepResolution } from "./types";

export type { StepResolution, NextStep, StepSource } from "./types";

/**
 * Resolves Your Next Best Step for a person.
 *
 * Constitutional authority:
 *   Experience Bible §2  — the primary surface answers one question, with one step.
 *   Experience Bible §15 — the Step never spins; it is precomputed and stored.
 *   Product Bible §07    — nothing here may fabricate movement or invent novelty.
 *
 * ── The four answers, and what separates them ─────────────────────────────
 *
 *   step             — there is something to do, with its evidence.
 *   no-understanding — AEON X has not met you. About the relationship.
 *   absent           — a search ran, succeeded, and produced nothing better.
 *                      A verdict, reachable only from a witnessed retrieval.
 *   unknown          — AEON X cannot see. A limit on the system, never a claim
 *                      about the person.
 *
 * The last two are the ones a careless implementation collapses, and collapsing
 * them is the specific failure this surface exists to avoid. A crawler that
 * broke, a database that is unreachable, and a deployment with nothing
 * configured all produce zero rows — and none of them is a finding about the
 * world. Each resolves `unknown` here.
 *
 * ── Engineering note (IA Bible §18, binding) ──────────────────────────────
 *
 * The constitution requires a *stored* step: precomputed by the intelligence
 * layer, persisted with its source, evidence and freshness, and rendered from
 * that record, because a spinner where the answer belongs destroys conviction.
 *
 * This resolver folds the corpus on request, and that is a knowing shortfall
 * rather than a disagreement. The fold reads the append-only observation record
 * and derives entities from it — which is the right architecture, because Layer
 * 2 must be reconstructible from Layer 1 and may never be the sole record of
 * anything. What is missing is a materialised projection in front of it, and
 * that is the next slice. At the current corpus size the fold is not the reason
 * this surface is slow; at a larger one it would be, and the answer then is a
 * projection rebuilt from the log, never a table that becomes the truth.
 */
export async function resolveNextBestStep(
  userId: string,
  options: {
    /**
     * What the person has said about each opportunity.
     *
     * Passed in rather than read here, and that boundary is deliberate. Reading
     * declarations needs the person's own Supabase session, which needs the
     * request's cookies — and pulling `next/headers` into the Step made engine
     * code unloadable outside a Next request, which the test suite found
     * immediately. The route has the request; this does not.
     */
    pursuits?: ReadonlyMap<string, PursuitResolution>;
  } = {}
): Promise<StepResolution> {
  const now = new Date().toISOString();
  const record = opportunityRecord();

  /*
    Nothing configured. `since` is null because there is no earlier point to
    name: AEON X has never had visibility here, so it has none to have lost.
    Passing `now` — which this did — rendered as "no visibility since August
    2026", a lapse that never happened.
  */
  if (record === null) {
    return {
      state: "unknown",
      since: null,
      because:
        "Nothing is set up yet to search for opportunities, so I have never looked. That is a gap in me, not in you.",
    };
  }

  try {
    const corpus = await deriveCorpus(record.store, record.verification, { decidedAt: now });

    const { resolution } = await recommendNextStep({
      personId: userId,
      store: record.store,
      entities: corpus.entities,
      verifications: corpus.verifications,
      /*
        No Profile facts are passed yet, and the consequence is deliberate and
        visible: without a fact behind an input, no evidence can be minted, the
        composition law refuses the claim, and the resolution is `absent` rather
        than `step`. Wiring the Profile in is meaningful only alongside an
        assessor that can read requirements against it — passing facts to a
        resolver that has no way to match them would add a dependency and change
        nothing.
      */
      facts: [],
      /*
        What the person has said. It reorders what the Step is about and gives
        the step its sentence; it changes no verdict, and `judgeAll` never sees
        it. A declaration is the person's, not an input to the system's opinion
        of them.
      */
      pursuits: options.pursuits,
      now,
    });

    return resolution;
  } catch {
    /*
      A read that failed is not an empty corpus. Resolving `absent` here would
      tell the person a search ran and found nothing better, on the strength of
      a database that could not be reached — a failure reported as a finding.

      Distinct from the two above it, and said differently: this is a system
      that normally can see and cannot right now, which is the one case where
      coming back later is genuinely the answer.
    */
    return {
      state: "unknown",
      since: null,
      because:
        "I could not reach my own record just now, so I cannot tell you what I know. Nothing has been lost — I simply cannot read it at this moment.",
    };
  }
}
