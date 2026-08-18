import { useTransition } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { getOpportunity } from "@/lib/opportunities.server";
import { OpportunityInspection } from "@/components/opportunity/OpportunityInspection";
import { UnknownState } from "@/components/ui/absence/UnknownState";
import { InspectionSkeleton } from "@/components/opportunity/InspectionSkeleton";
import { SurfaceError } from "@/components/ui/state/SurfaceError";

/**
 * One opportunity, in full.
 *
 * The heart of the product: what it is, what the publisher actually said, where
 * pages agree, where they disagree and who took which side, what has been
 * checked, and what is simply not known.
 *
 * ── The distinction this page exists to hold ──────────────────────────────
 *
 * "No source stated the eligibility" is not "you are not eligible". "One page
 * says this" is not "verified". A page's own words and this product's reading
 * of them are shown as different things, because a reader who cannot tell them
 * apart has to trust rather than check — and checking is the entire point.
 */
export const Route = createFileRoute("/_authenticated/opportunities/$id")({
  loader: ({ params }) => getOpportunity({ data: { id: params.id } }),
  pendingComponent: Pending,
  errorComponent: Failed,
  component: OneOpportunity,
});

/**
 * The way back, on every branch.
 *
 * Loading, failing, not-found and succeeding all render it. Someone arriving
 * from a shared link has no history to fall back on, and a failure that also
 * removes their only exit has made one unreadable page into a trap.
 */
function Back() {
  return (
    <Link
      to="/opportunities"
      className="mb-8 inline-block font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s transition-colors duration-[120ms] hover:text-accent"
    >
      &larr; Opportunities
    </Link>
  );
}

function Pending() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <Back />
      <InspectionSkeleton />
    </div>
  );
}

function Failed() {
  const router = useRouter();
  /*
    Retry with a pending state. `SurfaceError` accepted `retrying` from the day
    it was written and no call site ever passed it, so pressing Try again did
    nothing visible while the loader re-ran.
  */
  const [retrying, startRetry] = useTransition();
  const retry = () => startRetry(() => void router.invalidate());

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <Back />
      <SurfaceError
        what="I couldn’t read this opportunity."
        /*
          The distinction the whole page exists to hold, restated for the case
          where the page could not be built. "I could not read it" must not be
          allowed to read as "it is not there" — the route already has a separate,
          differently worded branch for that, and this one is not it.
        */
        stillTrue="That doesn’t mean it isn’t there, and it isn’t a judgement about the opportunity. Nothing I had already established about it has changed — I just can’t assemble the page right now."
        whatYouCanDo="Try again, or go back to the list and come at it from there."
        onRetry={retry}
        retrying={retrying}
      />
    </div>
  );
}

function OneOpportunity() {
  const { resolution, canKeepDeclarations, whyNot } = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <Back />

      {resolution?.state === "inspection" ? (
        <OpportunityInspection
          inspection={resolution.inspection}
          canPersistPursuit={canKeepDeclarations}
          pursuitWhyNot={whyNot}
        />
      ) : resolution?.state === "not-found" ? (
        /*
          A reference that resolves to nothing, and an unreadable record, are
          different facts. This is the first: said as an absence, not an error.
        */
        <div className="flex flex-col gap-4">
          <h1 className="max-w-[24ch] text-3xl font-black leading-[1.1] tracking-tighter text-foreground">
            Nothing here matches that reference.
          </h1>
          <p className="max-w-[58ch] text-[15px] leading-relaxed text-text-s">
            If you followed a link from somewhere, the opportunity it pointed at may have been
            re-identified since.
          </p>
        </div>
      ) : (
        <UnknownState gap={resolution?.gap ?? "I can’t read what I’ve observed right now."} />
      )}
    </div>
  );
}
