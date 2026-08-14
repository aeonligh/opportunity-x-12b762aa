import { createFileRoute, Link } from "@tanstack/react-router";
import { nextBestStep, opportunityCards } from "@/lib/opportunity.functions";
import { NextBestStep } from "@/components/workspace/NextBestStep";
import { OpportunityCard } from "@/components/opportunity/OpportunityCard";
import { UnknownState } from "@/components/ui/absence/UnknownState";

/**
 * The Workspace — Your Next Best Step.
 *
 * Opens on the answer. No greeting, no session summary: arrival is not an
 * event, and a surface that acknowledges time away has made the person's
 * absence the subject.
 *
 * ── Why there is no pending component here ────────────────────────────────
 *
 * The Step never spins. A skeleton where the answer belongs is exactly the loss
 * of conviction the precomputed-step architecture exists to prevent, so the
 * loader resolves before anything renders rather than streaming into a
 * placeholder.
 */
export const Route = createFileRoute("/_authenticated/workspace")({
  loader: async () => ({
    resolution: await nextBestStep(),
    cards: await opportunityCards(),
  }),
  component: Workspace,
});

function Workspace() {
  const { resolution, cards } = Route.useLoaderData();

  /*
    Split on what the person said, not on what the engine thinks. Someone
    returning came back for the things they already said yes to; interleaving
    those with ones they have never seen makes them search their own workspace
    for their own answer. Ordering only — no verdict differs between the groups.
  */
  const shown = cards.state === "cards" ? cards.cards : [];
  const spokenAbout = shown.filter((c) => c.stance.declaration === "interested");
  const unspoken = shown.filter((c) => c.stance.declaration !== "interested");

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-5xl flex-col justify-center px-4 py-16 sm:px-6">
      <NextBestStep resolution={resolution} />

      {/*
        The two destinations the canonical journey needs, and no more.

        The shell carries no navigation list — that is deliberate and stays.
        But a surface nobody can leave is not a hub, and the Ledger and the
        laboratory were both orphaned: reachable only by typing the URL. These
        sit under the answer, at the weight of a footnote, because they are
        where you go *after* reading the Step rather than instead of it.
      */}
      <nav aria-label="Where else you can go" className="mt-10 flex flex-wrap gap-x-6 gap-y-2">
        <Link
          to="/workspace/ledger"
          className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s underline decoration-border underline-offset-4 transition-colors duration-[120ms] hover:text-accent hover:decoration-accent"
        >
          What you have said
        </Link>
        <Link
          to="/workspace/preview"
          className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s underline decoration-border underline-offset-4 transition-colors duration-[120ms] hover:text-accent hover:decoration-accent"
        >
          The fixture laboratory
        </Link>
      </nav>

      <section aria-labelledby="considered" className="mt-16 flex flex-col gap-6">
        {/* The heading has to survive the state beneath it: "What I weighed"
            above "I have not looked at any source yet" says weighing happened
            and then says it did not. */}
        <h2
          id="considered"
          className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s"
        >
          {cards.state === "cards" ? "What I weighed" : "What I have to go on"}
        </h2>

        {cards.state === "cards" ? (
          <>
            {spokenAbout.length > 0 ? (
              <div className="flex flex-col gap-6">
                <p className="max-w-[58ch] text-[14px] leading-relaxed text-text-s">
                  {spokenAbout.length === 1
                    ? "The one you have said something about."
                    : `The ${spokenAbout.length} you have said something about.`}
                </p>
                {spokenAbout.map((card) => (
                  <OpportunityCard
                    key={card.entityId}
                    card={card}
                    inspectHref={`/workspace/opportunity/${card.entityId}`}
                  />
                ))}
              </div>
            ) : null}

            {unspoken.length > 0 ? (
              <div className="flex flex-col gap-6">
                {spokenAbout.length > 0 ? (
                  <p className="mt-6 max-w-[58ch] text-[14px] leading-relaxed text-text-s">
                    And the rest, which you haven&rsquo;t.
                  </p>
                ) : null}
                {unspoken.map((card) => (
                  <OpportunityCard
                    key={card.entityId}
                    card={card}
                    inspectHref={`/workspace/opportunity/${card.entityId}`}
                  />
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <>
            {/* A limit on the system, never a claim about the world. Silence
                here would read as a bug, and silence is not one of the three
                absence states. */}
            <UnknownState gap={cards.gap} />
            <Link
              to="/workspace/preview"
              className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s underline decoration-border underline-offset-4 transition-colors duration-[120ms] hover:text-accent hover:decoration-accent"
            >
              See the surface on fixture evidence &rarr;
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
