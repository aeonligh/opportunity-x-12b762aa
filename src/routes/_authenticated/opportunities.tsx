import { createFileRoute, Link } from "@tanstack/react-router";
import { listOpportunities, listSaved } from "@/lib/opportunities.server";
import { OpportunityCard } from "@/components/opportunity/OpportunityCard";
import { UnknownState } from "@/components/ui/absence/UnknownState";

/**
 * Opportunities — the home of Opportunity X.
 *
 * The product question, answered in order: what is there, what is actually
 * known about it, and which of it have I already said I care about.
 *
 * ── On ordering ───────────────────────────────────────────────────────────
 *
 * There is none beyond one split: opportunities you have said you are
 * interested in come first. That is your decision, not a judgement — no score
 * is computed, nothing is ranked, and the caption says whose choice produced
 * the grouping. A ranked list would hand the decision back to the person who
 * came here because deciding was hard, and it would need a score to justify
 * itself, which this product does not have and will not invent.
 */
export const Route = createFileRoute("/_authenticated/opportunities")({
  loader: async () => ({
    result: await listOpportunities(),
    saved: await listSaved(),
  }),
  component: Opportunities,
});

function Opportunities() {
  const { result } = Route.useLoaderData();

  const all = result.state === "cards" ? result.cards : [];
  const cared = all.filter((c) => c.stance.declaration === "interested");
  const rest = all.filter((c) => c.stance.declaration !== "interested");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-14 sm:px-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-black leading-[1.1] tracking-tighter text-foreground sm:text-4xl">
          Opportunities
        </h1>
        <p className="max-w-[62ch] text-[15px] leading-relaxed text-text-s">
          What has been found, what is actually known about it, and what is still uncertain. Every
          claim here can be traced back to the page it came from.
        </p>
        <Link
          to="/saved"
          className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s underline decoration-border underline-offset-4 transition-colors duration-[120ms] hover:text-accent hover:decoration-accent"
        >
          What you&rsquo;ve saved
        </Link>
      </header>

      {result.state === "cards" ? (
        <>
          {cared.length > 0 ? (
            <section className="flex flex-col gap-6">
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
                You said you were interested
              </h2>
              {cared.map((card) => (
                <OpportunityCard
                  key={card.entityId}
                  card={card}
                  inspectHref={`/opportunities/${card.entityId}`}
                  canPersistPursuit
                />
              ))}
            </section>
          ) : null}

          <section className="flex flex-col gap-6">
            {cared.length > 0 ? (
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
                Everything else
              </h2>
            ) : null}
            {rest.map((card) => (
              <OpportunityCard
                key={card.entityId}
                card={card}
                inspectHref={`/opportunities/${card.entityId}`}
                canPersistPursuit
              />
            ))}
          </section>
        </>
      ) : (
        /*
          Nothing has been searched for, or the record could not be read. Not
          "there are no opportunities" — that is a claim about the world, and
          nothing here is in a position to make it.
        */
        <section className="flex flex-col gap-5">
          <UnknownState gap={result.gap} />
          <Link
            to="/opportunities/examples"
            className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s underline decoration-border underline-offset-4 transition-colors duration-[120ms] hover:text-accent hover:decoration-accent"
          >
            See example opportunities &rarr;
          </Link>
        </section>
      )}
    </div>
  );
}
