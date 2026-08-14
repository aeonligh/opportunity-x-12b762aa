import { createFileRoute, Link } from "@tanstack/react-router";
import { fixtureOpportunities } from "@/lib/opportunities.server";
import { OpportunityCard } from "@/components/opportunity/OpportunityCard";

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
  component: Examples,
});

function Examples() {
  const examples = Route.useLoaderData();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-14 sm:px-6">
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
