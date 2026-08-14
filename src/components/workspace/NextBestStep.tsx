import { Finding } from "@/components/ui/tier0/Finding";
import { AbsentState } from "@/components/ui/absence/AbsentState";
import { UnknownState } from "@/components/ui/absence/UnknownState";
import { CommitAffordance } from "./CommitAffordance";
import type { NextStep, StepResolution } from "@/lib/core/step/types";
import type { FactPermission } from "@/lib/core/profile/types";

/**
 * Your Next Best Step — the Workspace's primary surface.
 *
 * Constitutional authority:
 *   Experience Bible §2  — one step, its source, its inline evidence, its action,
 *                           and a correction path. Never a list, never two.
 *   Experience Bible §5  — the return opens on the answer. No greeting, no session
 *                           summary, no acknowledgement of time away.
 *   Experience Bible §7  — Absent and Unknown render differently, always.
 *   Component System §01 — the composition law.
 *
 * This file previously carried its own SourceTag and rendered the base rate as
 * `baseRate ? … : null`. Both were violations found on audit:
 *
 *   - A local SourceTag is a copied Tier 0 primitive, and CS §14 says copied
 *     primitives "become four different trust models within a year". It now
 *     composes the one implementation.
 *   - The conditional base rate meant a contested opportunity whose figures were
 *     unknown rendered as nothing, and nothing reads as uncontested — the false
 *     impression by omission that CS §02 and assumption C-02 exist to prevent.
 *     `Finding` always renders the contest, including when it is unknown.
 *
 * The step also gains its inspection path for free, because `Finding` carries it:
 * one interaction to the reasoning, then Source, Observation and Permission.
 */

function Step({ step, permissions }: { step: NextStep; permissions: FactPermission[] }) {
  return (
    <div className="flex flex-col gap-6">
      <Finding
        claim={step.claim}
        permissions={permissions}
        action={step.action}
        /* The page's single h1, and the first thing after the shell landmark. */
        as="h1"
      />

      {/*
        Committing is a separate act from following the action.

        XB §2's action "may leave AEON X entirely", so a click on it means the
        person went to look — not that they applied. Recording a commitment from
        that click would be concluding a fact about someone's life from their
        browsing, which the Visibility Principle forbids and the Ownership
        Principle ("the system never chases it") forbids again.

        Rendered only when the step can name what would be recorded. CS §05 makes
        a Ledger entry "one commitment the person made"; a row whose title the
        system invented would not be one, so the affordance is absent rather than
        approximate.
      */}
      {step.commitment ? (
        <CommitAffordance
          title={step.commitment.title}
          product={step.claim.evidence.product}
          deadline={step.commitment.deadline}
          recommendationId={step.id}
        />
      ) : null}
    </div>
  );
}

/**
 * No understanding yet — the person has not completed the first session.
 *
 * IA Bible §08: a new account goes to the handshake, never to an empty Step.
 * Until the handshake exists, this states the true position of the deployment
 * rather than seeding a fabricated step. Sample data here would be invented
 * movement, which the constitution prohibits outright.
 */
function NoUnderstanding() {
  return (
    <div className="flex flex-col gap-5">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
        Nothing understood yet
      </p>
      <h1 className="max-w-[20ch] text-[clamp(28px,5.4vw,42px)] font-black leading-[1.05] tracking-[-0.04em] text-balance text-foreground">
        I don&rsquo;t know enough about you to recommend anything.
      </h1>
      <p className="max-w-[58ch] text-[15px] leading-relaxed text-pretty text-text-s">
        Your next best step comes from four questions, asked once. They take a
        few minutes, each one tells you something before the next is asked, and
        I will not ask them again.
      </p>
      <a
        href="/handshake"
        className="mt-1 w-fit rounded-full bg-accent px-8 py-4 text-xs font-bold uppercase tracking-widest text-background transition-opacity duration-[120ms] active:opacity-90"
      >
        Start your first session
      </a>
    </div>
  );
}

export function NextBestStep({
  resolution,
  permissions = [],
}: {
  resolution: StepResolution;
  /** Per-product decisions on the fact the step rests on — Depth 4. */
  permissions?: FactPermission[];
}) {
  switch (resolution.state) {
    case "step":
      return <Step step={resolution.step} permissions={permissions} />;

    case "no-understanding":
      return <NoUnderstanding />;

    case "absent":
      /*
        A verdict, not an absence. "Nothing better has appeared" — never
        "nothing changed". One creates emptiness; the other creates confidence.

        ── Why this is wrapped rather than rendered bare ────────────────────

        Seen in a browser, it was not reading as a verdict at all. `AbsentState`
        renders a 15px paragraph — correct where it is used inline on the
        Profile and the Ledger, and wrong here, because the Step's answer
        arrived at the weight of a caption while `step` and `no-understanding`
        got a 36px headline above it.

        The two states a working deployment spends most of its time in were the
        two that looked unfinished, and a person cannot tell "the system is
        being careful" from "the page failed to load" by reading font sizes.
        So the Step supplies its own authority and keeps the component for the
        supporting detail, rather than making the shared primitive shout
        everywhere it appears.
      */
      return (
        <div className="flex flex-col gap-5">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
            A search ran
          </p>
          <h1 className="max-w-[20ch] text-[clamp(28px,5.4vw,42px)] font-black leading-[1.05] tracking-[-0.04em] text-balance text-foreground">
            Nothing better has appeared.
          </h1>
          <AbsentState
            verdict="I looked at everything I hold and none of it cleared the bar to put in front of you."
            searchedAt={resolution.searchedAt}
            standing={
              resolution.previousStep
                ? `Your next best step is still to ${resolution.previousStep.claim.statement
                    .charAt(0)
                    .toLowerCase()}${resolution.previousStep.claim.statement.slice(1, -1)}.`
                : undefined
            }
          />
        </div>
      );

    case "unknown":
      /*
        A limit on the system, never a claim about the person.

        The sentence comes from the resolver, which is the layer that knows
        *why* it cannot see. This component used to assemble one out of
        `since` — "I've had no visibility into this since August 2026" — and
        every producer passed the moment the question was asked, so the surface
        described a lapse that had never happened. Nothing configured, a record
        that could not be read, and a search that has never run are three
        different admissions, and all three rendered as that one.

        The correction is offered only where there is something to correct. When
        AEON X has never looked, the gap is entirely its own, and handing the
        person a link to their profile suggests their data is what is missing.
      */
      return (
        <div className="flex flex-col gap-5">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
            Nothing to go on yet
          </p>
          {/*
            The headline is fixed and the explanation varies, which is the right
            way round: "I can't see" is the state, and *why* differs between
            nothing configured, an unreadable record, and a search that never
            ran. Putting the varying sentence in the headline would give three
            different-sized answers to one question.
          */}
          <h1 className="max-w-[20ch] text-[clamp(28px,5.4vw,42px)] font-black leading-[1.05] tracking-[-0.04em] text-balance text-foreground">
            I can&rsquo;t see anything yet.
          </h1>
          <UnknownState
            gap={resolution.because}
            correction={
              resolution.since === null
                ? undefined
                : { label: "Correct what I know", href: "/profile" }
            }
          />
        </div>
      );
  }
}
