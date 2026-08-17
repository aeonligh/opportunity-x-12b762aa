import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { fixtureOpportunities } from "@/lib/opportunities.server";
import { OpportunityCard } from "@/components/opportunity/OpportunityCard";
import { OpportunityCardSkeleton } from "@/components/opportunity/OpportunityCardSkeleton";
import { Skeleton } from "@/components/ui/state/Skeleton";
import { SurfaceError } from "@/components/ui/state/SurfaceError";

/**
 * Example opportunities.
 *
 * None of these was retrieved from a real source. They exist so the product can
 * be judged on the situations that matter — something well corroborated,
 * something only one page mentions, something two publishers disagree about —
 * before discovery has run against the live web.
 *
 * Every card renders with its fixture marker, and the marker lives on the card
 * rather than on this page, so the label travels with the component wherever it
 * is used. Nothing here is written to the record: viewing a page is not an
 * observation.
 */
export const Route = createFileRoute("/_authenticated/opportunities/examples")({
  loader: () => fixtureOpportunities(),
  /*
    Fixtures load from a module, so this is usually instantaneous — but "usually
    instantaneous" is not "synchronous", and the route is a server function
    round-trip like any other. It gets the same two states as the live routes for
    a second reason as well: this page is the one somebody is sent to when the
    live list cannot be read, so it failing silently would break the fallback.
  */
  pendingComponent: Pending,
  errorComponent: Failed,
  component: Examples,
});

function Masthead() {
  return (
    <header className="flex flex-col gap-3">
      <Link
        to="/opportunities"
        className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s transition-colors duration-[120ms] hover:text-accent"
      >
        &larr; Opportunities
      </Link>
      <h1 className="text-3xl font-black leading-[1.1] tracking-tighter text-foreground">
        Examples
      </h1>
      <p className="max-w-[62ch] text-[15px] leading-relaxed text-text-s">
        Nothing on this page came from a real source. It shows how an opportunity reads when it is
        well corroborated, when only one page mentions it, and when two publishers disagree.
      </p>
    </header>
  );
}

function Pending() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-14 sm:px-6">
      <Masthead />
      <div className="flex flex-col gap-10">
        <p role="status" className="sr-only">
          Loading example opportunities.
        </p>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-3">
            {/* The label above each example is part of this page's shape, not the
                card's, so it gets its own placeholder line. */}
            <Skeleton className="h-2.5 w-40" />
            <OpportunityCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

function Failed() {
  const router = useRouter();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-14 sm:px-6">
      <Masthead />
      <SurfaceError
        what="I couldn’t load the examples."
        stillTrue="These are fixtures, so nothing about the real record is affected either way — there is simply nothing to look at here for the moment."
        whatYouCanDo="Try again."
        onRetry={() => void router.invalidate()}
      />
    </div>
  );
}

function Examples() {
  const examples = Route.useLoaderData();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-14 sm:px-6">
      <Masthead />

      <div className="flex flex-col gap-10">
        {examples.map((example) => (
          <article key={example.id} className="flex flex-col gap-3">
            <p className="font-mono text-[11px] uppercase tracking-widest text-text-s">
              {example.label}
            </p>
            <OpportunityCard card={example.card} evidence="fixture" canPersistPursuit={false} />
          </article>
        ))}
      </div>
    </div>
  );
}
