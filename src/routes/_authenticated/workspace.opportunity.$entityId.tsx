import { createFileRoute, Link } from "@tanstack/react-router";
import { opportunityInspection } from "@/lib/opportunity.functions";
import { OpportunityInspection } from "@/components/opportunity/OpportunityInspection";
import { UnknownState } from "@/components/ui/absence/UnknownState";

/**
 * One opportunity, inspected.
 *
 * ── Why an unreadable entity resolves `unknown` and not "not found" ───────
 *
 * A bad id and an unreachable record are different facts. "No such
 * opportunity" tells a person the thing does not exist; "I cannot see" tells
 * them the system is limited. Getting that backwards on a trust surface is the
 * worst possible place for it, so the service distinguishes them and this
 * renders each honestly.
 */
export const Route = createFileRoute("/_authenticated/workspace/opportunity/$entityId")({
  loader: ({ params }) => opportunityInspection({ data: { entityId: params.entityId } }),
  component: Inspect,
});

function Inspect() {
  const resolution = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      {/* A way back, on every branch. Someone who arrived from a shared link
          has no browser history to fall back on. */}
      <Link
        to="/workspace"
        className="mb-8 inline-block font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s transition-colors duration-[120ms] hover:text-accent"
      >
        &larr; Your next best step
      </Link>

      {resolution.state === "inspection" ? (
        <OpportunityInspection inspection={resolution.inspection} />
      ) : resolution.state === "not-found" ? (
        <div className="flex flex-col gap-4">
          <h1 className="max-w-[24ch] text-3xl font-black leading-[1.1] tracking-tighter text-foreground">
            I don&rsquo;t hold anything under that reference.
          </h1>
          <p className="max-w-[58ch] text-[15px] leading-relaxed text-text-s">
            Nothing I have observed resolves to it. If you followed a link from
            somewhere, the opportunity it pointed at may have been re-resolved
            since.
          </p>
        </div>
      ) : (
        <UnknownState gap={resolution.gap} />
      )}
    </div>
  );
}
