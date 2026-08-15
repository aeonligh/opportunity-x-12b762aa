import { createFileRoute, useRouter } from "@tanstack/react-router";
import { labInspect, labDeclare, labWithdraw } from "@/lib/lab.server";
import { LabFrame } from "@/components/lab/LabFrame";
import { OpportunityInspection } from "@/components/opportunity/OpportunityInspection";

/**
 * `/lab/$id` — one specimen, in full.
 *
 * The same inspection component the authenticated route renders, over the same
 * projection, so what is being checked here is the real surface rather than a
 * copy of it that could drift.
 */
export const Route = createFileRoute("/lab/$id")({
  loader: ({ params }) => labInspect({ data: { id: params.id } }),
  component: OneSpecimen,
});

function OneSpecimen() {
  const result = Route.useLoaderData();
  const router = useRouter();

  const actions = {
    declare: async (args: {
      data: { entityId: string; state: "interested" | "not-interested" };
    }) => {
      const r = await labDeclare({ data: args.data });
      await router.invalidate();
      return r;
    },
    withdraw: async (args: { data: { entityId: string } }) => {
      const r = await labWithdraw({ data: args.data });
      await router.invalidate();
      return r;
    },
  };

  if (!result.found) {
    return (
      <LabFrame
        title="Nothing here matches that reference."
        lede="No specimen in the laboratory carries that id."
        back={{ label: "Laboratory", to: "/lab" }}
      >
        <span />
      </LabFrame>
    );
  }

  return (
    <LabFrame
      title={result.label}
      lede={result.demonstrates}
      back={{ label: "Laboratory", to: "/lab" }}
    >
      <OpportunityInspection
        inspection={result.inspection}
        evidence="fixture"
        canPersistPursuit
        pursuitActions={actions}
        pursuitVoice={result.yours ? "you" : "this-person"}
      />
    </LabFrame>
  );
}
