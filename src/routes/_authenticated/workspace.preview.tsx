import { createFileRoute, Link } from "@tanstack/react-router";
import { laboratory } from "@/lib/opportunity.functions";
import { OpportunityCard } from "@/components/opportunity/OpportunityCard";
import { NextBestStep } from "@/components/workspace/NextBestStep";

/**
 * The product laboratory.
 *
 * Nothing here was retrieved. Every card is produced by the same engine the
 * live surface uses — witnessed, grouped, resolved, verified, judged and
 * projected — from fixture pages instead of retrieved ones, and each specimen
 * states which situation it exists to demonstrate.
 *
 * Every card renders `evidence="fixture"`, and the marker sits on the card
 * itself rather than on this page, so the label travels with the component
 * wherever it is reused.
 */
export const Route = createFileRoute("/_authenticated/workspace/preview")({
  loader: () => laboratory(),
  component: Laboratory,
});

function Laboratory() {
  const { scenarios, step, stepUndeclared } = Route.useLoaderData();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-16 px-4 py-16 sm:px-6">
      <header className="flex flex-col gap-3">
        <Link
          to="/workspace"
          className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s transition-colors duration-[120ms] hover:text-accent"
        >
          &larr; Your next best step
        </Link>
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
          Fixture preview
        </p>
        <h1 className="max-w-[24ch] text-3xl font-black leading-[1.1] tracking-tighter text-foreground">
          The opportunity surface, on evidence that was never retrieved.
        </h1>
      </header>

      {/* What a declaration actually changes: the same corpus, resolved twice
          by the real recommender. The only difference is that in the second,
          this person has said something. */}
      <section className="flex flex-col gap-6">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
          The Step, before and after
        </h2>
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-lg border border-border p-6">
            <p className="font-mono text-[11px] uppercase tracking-widest text-text-s">
              Nobody has said anything
            </p>
            <NextBestStep resolution={stepUndeclared} />
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-border p-6">
            <p className="font-mono text-[11px] uppercase tracking-widest text-text-s">
              After three declarations
            </p>
            <NextBestStep resolution={step} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-12">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
          Every state the surface has to handle
        </h2>
        {scenarios.map((scenario, index) => (
          <article key={scenario.id} className="flex flex-col gap-4">
            <header className="flex flex-col gap-1.5">
              <p className="font-mono text-[11px] uppercase tracking-widest text-text-s">
                {String(index + 1).padStart(2, "0")} &middot; {scenario.label}
              </p>
              {/* Prose about the laboratory, never about the opportunity. Set
                  apart so it cannot be read as something a source said. */}
              <p className="max-w-[62ch] border-l border-border pl-4 text-[14px] leading-relaxed text-text-s">
                {scenario.demonstrates}
              </p>
            </header>
            <OpportunityCard
              card={scenario.card}
              evidence="fixture"
              inspectHref={`/workspace/opportunity/${scenario.card.entityId}`}
              canPersistPursuit={false}
            />
          </article>
        ))}
      </section>
    </div>
  );
}
