import { createFileRoute } from "@tanstack/react-router";
import { labInspect, labDeclare, labWithdraw } from "@/lib/lab.functions";
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

  /*
    Just the writes. This used to invalidate the router inside each action, which
    made the write and the read-back one indivisible step — so a control could not
    tell "nothing was recorded" from "it was recorded and the page did not
    refresh". `InterestedControl` now performs the read-back itself, after the
    write returns, and reports those two outcomes differently.
  */
  const actions = { declare: labDeclare, withdraw: labWithdraw };

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
