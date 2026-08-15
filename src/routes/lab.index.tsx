import type { ComponentProps } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
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
  const router = useRouter();

  /*
    Re-read after a write rather than tracking the position locally. The point
    of the walk is to prove the declaration was stored and can be read back; a
    local state update would show the button changing colour whether or not
    anything was recorded, which is the exact illusion the product refuses.
  */
  const actions = {
    declare: async (args: {
      data: { entityId: string; state: "interested" | "not-interested" };
    }) => {
      const result = await labDeclare({ data: args.data });
      await router.invalidate();
      return result;
    },
    withdraw: async (args: { data: { entityId: string } }) => {
      const result = await labWithdraw({ data: args.data });
      await router.invalidate();
      return result;
    },
  };

  const cared = specimens.filter((s) => s.card.stance.declaration === "interested");
  const rest = specimens.filter((s) => s.card.stance.declaration !== "interested");

  return (
    <LabFrame
      title="Opportunities"
      lede="What has been found, what is actually known about it, and what is still uncertain. Every claim here can be traced back to the page it came from."
    >
      <Link
        to="/lab/saved"
        className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s underline decoration-border underline-offset-4 transition-colors duration-[120ms] hover:text-accent hover:decoration-accent"
      >
        What you&rsquo;ve saved
      </Link>

      {cared.length > 0 ? (
        <section className="flex flex-col gap-6">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
            You said you were interested
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
