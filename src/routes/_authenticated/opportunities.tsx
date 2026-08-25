import { useEffect, useTransition } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { listOpportunities } from "@/lib/opportunities.functions";
import { OpportunityCard } from "@/components/opportunity/OpportunityCard";
import { UnknownState } from "@/components/ui/absence/UnknownState";
import { AbsentState } from "@/components/ui/absence/AbsentState";
import { OpportunityListSkeleton } from "@/components/opportunity/OpportunityCardSkeleton";
import { SurfaceError } from "@/components/ui/state/SurfaceError";
import { Refreshing } from "@/components/ui/state/Refreshing";
import { RefreshFailed } from "@/components/ui/state/RefreshFailed";
import { lastGood, rememberLastGood } from "@/lib/last-good";

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
 * Loading, failing and succeeding all keep the heading. The way *out* moved to
 * the shell in Phase 19: this used to carry a hand-written "What you've saved"
 * link while `/saved` carried "← Opportunities", which made two peer surfaces
 * look like a parent and a child depending on which one you were standing on.
 * Peer navigation now belongs to one place, and it is the same place on every
 * page — including this route's failing and pending branches, because the
 * shell wraps all of them.
 *
 * ── Why the lede is conditional (Phase 21A) ───────────────────────────────
 *
 * This paragraph describes what the page contains. On a screen that contains
 * nothing it describes nothing, and it was doing real damage: a phone-sized
 * view of the failure state was a heading, then two lines promising traceable
 * claims, then a five-line error card, then a link to fixtures. Four blocks of
 * prose and no product. The reader had to work through a description of what
 * they were about to see in order to reach the news that they were not going to
 * see it.
 *
 * The state model is not weakened by this — every state still says exactly what
 * it said, and `unknown`, `absent` and `unreadable` remain distinct. What
 * changes is only which of them gets the top of the screen.
 *
 * Shown with cards, because then it is a caption on something. Withheld
 * otherwise, including while loading: the skeleton is already content-shaped
 * and says "something is coming" more directly than a sentence can.
 */
function Masthead({ lede = false }: { lede?: boolean }) {
  return (
    <header className="flex flex-col gap-3">
      <h1 className="text-3xl font-black leading-[1.1] tracking-tighter text-foreground sm:text-4xl">
        Opportunities
      </h1>
      {lede ? (
        <p className="max-w-[62ch] text-[15px] leading-relaxed text-text-s">
          What has been found, what is actually known about it, and what is still uncertain. Every
          claim here can be traced back to the page it came from.
        </p>
      ) : null}
    </header>
  );
}

/**
 * The way to the fixtures, deliberately quiet.
 *
 * This link was the last thing on an empty or failed Opportunities page and,
 * with "Try again" sitting inside the error card, the only forward motion
 * offered. On a surface that has just said it has nothing real, an invitation
 * reading "See example opportunities" is close to "we have nothing, so here
 * are some made-up ones" — which is the sentence this product exists to never
 * say.
 *
 * The fixtures keep their purpose: they are how somebody sees what a
 * well-corroborated opportunity, a single-source one and a contested one
 * actually read. That is worth reaching. It is not worth reaching *instead of*
 * the product, so the label now says what is on the other side of it.
 */
function ExamplesLink() {
  return (
    <Link
      to="/opportunities/examples"
      className="w-fit font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-s transition-colors duration-[120ms] hover:text-accent"
    >
      Sample cards, not real openings &rarr;
    </Link>
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

/** Exactly what the loader returns, so preserved and live content share a type. */
type LoaderData = Awaited<ReturnType<typeof listOpportunities>>;

const LAST_GOOD_KEY = "opportunities";

function Failed() {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();
  const kept = lastGood<LoaderData>(LAST_GOOD_KEY);
  const retry = () => startRetry(() => void router.invalidate());

  /*
    A failed re-read must not destroy what was already true. With something
    previously shown, this is a caveat on good information; with nothing shown,
    the first read failed and the full treatment is correct.

    Measured, not assumed: `/lab/refresh` showed that a loader throwing during
    `invalidate()` reaches this boundary with the previous data already
    discarded, so the surface has to remember for itself. See `lib/last-good.ts`.
  */
  if (kept) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-14 sm:px-6">
        <Masthead lede />
        <RefreshFailed
          what="I couldn’t check for new opportunities."
          at={kept.at}
          onRetry={retry}
          retrying={retrying}
        />
        <Opportunities data={kept.data} />
      </div>
    );
  }

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
        onRetry={retry}
        retrying={retrying}
      />
      <ExamplesLink />
    </div>
  );
}

function Opportunities({ data }: { data?: LoaderData }) {
  const live = Route.useLoaderData();
  /*
    `data` is supplied only by the refresh-failure branch, which renders this
    body over preserved content. The live path passes nothing and reads the
    loader as before — one body, so preserved content cannot drift from current
    content by being rendered somewhere else.
  */
  const { result, canKeepDeclarations, whyNot } = data ?? live;

  /* Only what actually reached a person is remembered. */
  useEffect(() => {
    if (!data) rememberLastGood(LAST_GOOD_KEY, live);
  }, [data, live]);

  const all = result.state === "cards" ? result.cards : [];
  const cared = all.filter((c) => c.stance.declaration === "interested");
  const rest = all.filter((c) => c.stance.declaration !== "interested");

  return (
    <div
      className={
        data ? "flex flex-col gap-10" : "mx-auto flex max-w-3xl flex-col gap-10 px-4 py-14 sm:px-6"
      }
    >
      {data ? null : <Masthead lede={result.state === "cards"} />}
      {data ? null : <Refreshing what="for new opportunities" />}

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
      ) : result.state === "absent" ? (
        /*
          Sources were consulted and nothing currently qualifies — a finding, and
          CR-20's first-class output. It carries the time it was made, because
          "nothing right now" is only actionable if the person can see how recent
          the "now" is. This is deliberately *not* the branch below: that one is
          about the system's limits, this one is about the world.
        */
        <section className="flex flex-col gap-5">
          <AbsentState
            verdict="Nothing I watch is currently offering something worth your attention."
            searchedAt={result.searchedAt}
            standing="This is what I found, not a gap in my looking. When something opens, it appears here."
          />
          <ExamplesLink />
        </section>
      ) : (
        /*
          Nothing has been searched for, or the record could not be read. Not
          "there are no opportunities" — that is a claim about the world, and
          nothing here is in a position to make it.
        */
        <section className="flex flex-col gap-5">
          <UnknownState gap={result.gap} />
          <ExamplesLink />
        </section>
      )}
    </div>
  );
}
