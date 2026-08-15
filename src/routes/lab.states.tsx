import { createFileRoute, Link } from "@tanstack/react-router";
import { LabFrame } from "@/components/lab/LabFrame";
import { UnknownState } from "@/components/ui/absence/UnknownState";
import { AbsentState } from "@/components/ui/absence/AbsentState";
import { EmptyState } from "@/components/ui/absence/EmptyState";

/**
 * `/lab/states` — the three absences, side by side.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THESE NEED A PAGE OF THEIR OWN
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The specimen list cannot show them. Every one of its opportunities exists, so
 * the corpus is never unreadable, a search has never come back empty, and the
 * saved list is never new — which means the states the product is most likely
 * to get wrong are the ones the laboratory could not display.
 *
 * They are also the states that collapse into each other under any pressure to
 * tidy up. All three are "nothing to show" to a designer, and rendering them
 * the same way is a lie in two of the three cases:
 *
 *   Unknown  — I cannot see. A limit on me, never a claim about the world.
 *   Absent   — I looked, and there was nothing. A finding, with a time on it.
 *   Empty    — nothing yet, and that is expected. Not a failure at all.
 *
 * Showing "no opportunities found" when the truth is "the record could not be
 * read" tells someone the world is empty when the system is blind. Showing a
 * blank where a search has genuinely returned nothing throws away a real
 * finding. So they sit here next to one another, where the difference is
 * visible and a regression in any of them is obvious.
 *
 * These are rendered components, not fixtures: no opportunity is claimed, and
 * nothing here is evidence about anything.
 */
export const Route = createFileRoute("/lab/states")({
  component: States,
});

function Specimen({
  name,
  meaning,
  wrong,
  children,
}: {
  name: string;
  meaning: string;
  wrong: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-b border-border pb-8 last:border-b-0">
      <div className="flex flex-col gap-1">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
          {name}
        </h2>
        <p className="max-w-[62ch] text-[14px] leading-relaxed text-foreground">{meaning}</p>
        <p className="max-w-[62ch] text-[13px] leading-relaxed text-text-s">
          Shown as anything else, it would say: {wrong}
        </p>
      </div>
      <div className="rounded-lg border border-border p-5">{children}</div>
    </section>
  );
}

function States() {
  return (
    <LabFrame
      title="The three absences"
      lede="Nothing to show is not one state. These are the three, and what each of them would be lying about if it were rendered as one of the others."
      back={{ label: "Laboratory", to: "/lab" }}
    >
      <Specimen
        name="Unknown"
        meaning="I cannot see. This is a limit on the system, and never a claim about the world."
        wrong="that there are no opportunities, when the truth is that the record could not be read."
      >
        <UnknownState gap="I have no record of anything I have observed, so I cannot show you opportunities." />
      </Specimen>

      <Specimen
        name="Absent"
        meaning="A search ran, completed, and found nothing. That is a finding, and it carries the time it was made."
        wrong="that nothing has been checked, throwing away the one thing that was actually established."
      >
        <AbsentState
          verdict="No opportunity matching those terms was announced by any source I watch."
          searchedAt={new Date(Date.now() - 3 * 3_600_000).toISOString()}
          standing="Three sources answered. None of them carried a call that is still open."
        />
      </Specimen>

      <Specimen
        name="Empty"
        meaning="Nothing here yet, and that is expected. Not a failure, not a limit, not a finding."
        wrong="that something went wrong, when the person has simply not done the thing yet."
      >
        <EmptyState expectation="Opportunities you save will appear here." />
      </Specimen>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
          A declaration that outlived its opportunity
        </h2>
        <p className="max-w-[62ch] text-[14px] leading-relaxed text-foreground">
          The fourth case, and the one most likely to be tidied away. When a saved opportunity can
          no longer be resolved, the row stays.
        </p>
        <p className="max-w-[62ch] text-[13px] leading-relaxed text-text-s">
          Removing it would quietly edit what the person said, and they would have no way to notice
          it had gone. Take a position in the laboratory and it appears on{" "}
          <Link to="/lab/saved" className="underline decoration-border underline-offset-4">
            saved
          </Link>{" "}
          this way if its opportunity stops resolving.
        </p>
        <div className="rounded-lg border border-border p-5">
          <p className="max-w-[62ch] text-[15px] leading-snug text-foreground">
            Interested in{" "}
            <span className="text-text-s">
              something that can no longer be resolved. What you said is still here; the opportunity
              it pointed at is not.
            </span>
          </p>
        </div>
      </section>
    </LabFrame>
  );
}
