import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { listOpportunities } from "@/lib/opportunities.server";
import { OpportunityCard } from "@/components/opportunity/OpportunityCard";
import { UnknownState } from "@/components/ui/absence/UnknownState";
import { OpportunityListSkeleton } from "@/components/opportunity/OpportunityCardSkeleton";
import { SurfaceError } from "@/components/ui/state/SurfaceError";

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
  /*
    One read. This also awaited `listSaved()` and never used the result: the
    component destructures `result`, `canKeepDeclarations` and `whyNot`, and
    nothing referenced `saved`. That was not a spare field — `resolveDeclarations`
    runs a second full `deriveCorpus` over the whole observation record, serially
    after the first, and the page threw it away.

    The declarations this page does need are already inside `listOpportunities`,
    which reads them once and projects them onto the cards.
  */
  loader: () => listOpportunities(),
  /*
    Waiting, shown as the shape of what is coming rather than as an empty page.

    This route had no pending state at all: the loader reads the whole
    observation record and derives the corpus, and until it returned the person
    saw the previous route. A blank page during that read is indistinguishable
    from a page that has finished and found nothing, which is the one confusion
    this product cannot afford. See `OpportunityCardSkeleton`.
  */
  pendingComponent: Pending,
  /*
    And failure, shown here rather than as a full-page takeover. Before this,
    every failure on this route reached the root boundary and read "something
    went wrong on our end" — a sentence that a reader cannot tell apart from
    "there are no opportunities". See `SurfaceError`.
  */
  errorComponent: Failed,
  component: Opportunities,
});

/**
 * The page's own furniture, on every branch.
 *
 * Loading, failing and succeeding all keep the heading and the way out. A
 * failure that also removes the navigation has turned one broken read into a
 * dead end.
 */
function Masthead() {
  return (
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
  );
}

function Pending() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-14 sm:px-6">
      <Masthead />
      <OpportunityListSkeleton />
    </div>
  );
}

function Failed() {
  const router = useRouter();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-14 sm:px-6">
      <Masthead />
      <SurfaceError
        what="I couldn’t read the record of what I’ve observed, so I can’t show you any opportunities."
        /*
          The half that stops a failure being read as a finding. Without it, a
          reader concludes the search came back empty and stops looking.
        */
        stillTrue="This is a failure to look, not a finding. Opportunities I have already observed are still there — I just can’t reach them from here at the moment."
        whatYouCanDo="Trying again usually works. If it doesn’t, the record is genuinely unreachable and nothing you do here will change that."
        onRetry={() => void router.invalidate()}
      />
      <Link
        to="/opportunities/examples"
        className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s underline decoration-border underline-offset-4 transition-colors duration-[120ms] hover:text-accent hover:decoration-accent"
      >
        See example opportunities &rarr;
      </Link>
    </div>
  );
}

function Opportunities() {
  const { result, canKeepDeclarations, whyNot } = Route.useLoaderData();

  const all = result.state === "cards" ? result.cards : [];
  const cared = all.filter((c) => c.stance.declaration === "interested");
  const rest = all.filter((c) => c.stance.declaration !== "interested");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-14 sm:px-6">
      <Masthead />

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
                  canPersistPursuit={canKeepDeclarations}
                  pursuitWhyNot={whyNot}
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
                canPersistPursuit={canKeepDeclarations}
                pursuitWhyNot={whyNot}
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
