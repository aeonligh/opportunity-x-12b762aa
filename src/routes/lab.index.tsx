import type { ComponentProps } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { labSurface, labDeclare, labWithdraw } from "@/lib/lab.server";
import { LabFrame } from "@/components/lab/LabFrame";
import { OpportunityCard } from "@/components/opportunity/OpportunityCard";

/**
 * `/lab` — the fixture laboratory's front door.
 *
 * Deliberately outside `_authenticated`. The three product surfaces stay
 * authenticated exactly as they were; this is a separate entrance to fixture
 * data, refused on the server anywhere that is not a development build. See
 * `lab.server.ts` for why the guard lives there rather than here.
 *
 * The layout mirrors `/opportunities` on purpose — same components, same split
 * between declared and undeclared — because a laboratory that looked different
 * from the product would stop being evidence about the product.
 */
export const Route = createFileRoute("/lab/")({
  loader: () => labSurface(),
  component: Lab,
});

function Lab() {
  const { specimens } = Route.useLoaderData();

  /*
    Re-read after a write rather than tracking the position locally. The point
    of the walk is to prove the declaration was stored and can be read back; a
    local state update would show the button changing colour whether or not
    anything was recorded, which is the exact illusion the product refuses.

    The re-read no longer lives in here. It used to — each action wrote and then
    invalidated the router — which made the two indistinguishable to the control
    above, and so a successful write whose refresh failed was reported as a
    failure. `InterestedControl` performs the read-back itself now.
  */
  const actions = { declare: labDeclare, withdraw: labWithdraw };

  const cared = specimens.filter((s) => s.card.stance.declaration === "interested");
  const rest = specimens.filter((s) => s.card.stance.declaration !== "interested");

  return (
    <LabFrame
      title="Opportunities"
      lede="What has been found, what is actually known about it, and what is still uncertain. Every claim here can be traced back to the page it came from."
    >
      <nav className="flex flex-wrap gap-x-6 gap-y-2">
        <Link
          to="/lab/saved"
          className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s underline decoration-border underline-offset-4 transition-colors duration-[120ms] hover:text-accent hover:decoration-accent"
        >
          What you&rsquo;ve saved
        </Link>
        {/*
          The absences need their own page: every specimen below exists, so the
          corpus is never unreadable and the saved list is never new. The states
          the product is most likely to get wrong are the ones this list cannot
          display.
        */}
        <Link
          to="/lab/states"
          className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s underline decoration-border underline-offset-4 transition-colors duration-[120ms] hover:text-accent hover:decoration-accent"
        >
          The states of a surface
        </Link>
        {/*
          And the states that only exist while something is being written. They
          need pressing rather than looking at, so they get an interactive page
          rather than a row on the one above.
        */}
        {/* Reads that fail, induced by name rather than mimed with props. */}
        <Link
          to="/lab/faults"
          className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s underline decoration-border underline-offset-4 transition-colors duration-[120ms] hover:text-accent hover:decoration-accent"
        >
          Failures, induced
        </Link>
        <Link
          to="/lab/mutations"
          className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s underline decoration-border underline-offset-4 transition-colors duration-[120ms] hover:text-accent hover:decoration-accent"
        >
          What a write looks like
        </Link>
        {/*
          And the one state that only exists in the seam between the two: a
          re-read that fails over content that is still valid. It cannot be
          staged with props — the defect was that the router discards the
          previous data before the error boundary mounts — so it has to be
          provoked by arming a real loader to throw.
        */}
        <Link
          to="/lab/refresh"
          className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s underline decoration-border underline-offset-4 transition-colors duration-[120ms] hover:text-accent hover:decoration-accent"
        >
          A refresh that fails
        </Link>
      </nav>

      {cared.length > 0 ? (
        <section className="flex flex-col gap-6">
          {/*
            Neutral on purpose. `/opportunities` says "You said you were
            interested" and is right to, because every declaration there is the
            reader's. This list can hold both — a position the visitor took and
            one the specimen shipped with — so a heading claiming either owner
            would be wrong for half the rows. Each card says whose it is.
          */}
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
            Marked interested
          </h2>
          {cared.map((s) => (
            <Specimen key={s.id} specimen={s} actions={actions} />
          ))}
        </section>
      ) : null}

      <section className="flex flex-col gap-6">
        {cared.length > 0 ? (
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
            Everything else
          </h2>
        ) : null}
        {rest.map((s) => (
          <Specimen key={s.id} specimen={s} actions={actions} />
        ))}
      </section>
    </LabFrame>
  );
}

/**
 * One specimen, with the note about what it is for above the card.
 *
 * `demonstrates` is prose about the laboratory, never about the opportunity, and
 * it sits outside the card so it cannot be read as one of the card's own claims.
 */
/** Derived from the loader, so the shape cannot drift from what is sent. */
type LabSpecimen = Awaited<ReturnType<typeof labSurface>>["specimens"][number];

function Specimen({
  specimen,
  actions,
}: {
  specimen: LabSpecimen;
  actions: ComponentProps<typeof OpportunityCard>["pursuitActions"];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
          {specimen.label}
        </h3>
        <p className="max-w-[62ch] text-[13px] leading-relaxed text-text-s">
          {specimen.demonstrates}
        </p>
      </div>
      <OpportunityCard
        card={specimen.card}
        evidence="fixture"
        inspectHref={`/lab/${specimen.id}`}
        canPersistPursuit
        pursuitActions={actions}
        pursuitVoice={specimen.yours ? "you" : "this-person"}
      />
    </div>
  );
}
