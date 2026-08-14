import { createFileRoute, Link } from "@tanstack/react-router";
import { declarations } from "@/lib/opportunity.functions";
import { EmptyState } from "@/components/ui/absence/EmptyState";
import { UnknownState } from "@/components/ui/absence/UnknownState";
import { FreshnessStamp } from "@/components/ui/FreshnessStamp";

/**
 * The Ledger.
 *
 * Two records, kept apart. What you committed to is what you did; what you said
 * is a position you took. Saying "I'm interested" is not saying "I applied", and
 * folding them into one list would pad the record of someone's life with
 * intentions they never acted on.
 *
 * Commitments are not read here yet — they live in the earlier product's tables
 * and are not part of the engine that was transferred. The section is present
 * and honest about that rather than absent, because a Ledger that silently
 * showed only half of itself would be the more misleading of the two.
 */
export const Route = createFileRoute("/_authenticated/workspace/ledger")({
  loader: () => declarations(),
  component: Ledger,
});

function Ledger() {
  const declared = Route.useLoaderData();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16 sm:px-6 sm:py-20">
      <Link
        to="/workspace"
        className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s transition-colors duration-[120ms] hover:text-accent"
      >
        &larr; Your next best step
      </Link>

      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-black leading-[1.1] tracking-tighter text-foreground sm:text-4xl">
          What you have said.
        </h1>
        <p className="max-w-[62ch] text-[15px] leading-relaxed text-text-s">
          Positions you took on opportunities, most recent first. Saying you are
          interested is not the same as applying, so nothing here is recorded as
          an application.
        </p>
      </header>

      {declared.state === "unknown" ? <UnknownState gap={declared.gap} /> : null}

      {declared.state === "empty" ? (
        <EmptyState expectation="Opportunities you say something about will appear here." />
      ) : null}

      {declared.state === "declarations" ? (
        <ul className="flex flex-col">
          {declared.declarations.map((row) => (
            <li
              key={row.entityId}
              className="flex flex-col gap-1 border-b border-border py-5 last:border-b-0"
            >
              <p className="max-w-[62ch] text-[15px] leading-snug text-foreground">
                {row.state === "interested"
                  ? "You said you were interested in "
                  : "You said this one wasn’t for you: "}
                {row.title ? (
                  <Link
                    to="/workspace/opportunity/$entityId"
                    params={{ entityId: row.entityId }}
                    className="font-bold underline decoration-border underline-offset-4 transition-colors duration-[120ms] hover:decoration-accent"
                  >
                    {row.title}
                  </Link>
                ) : (
                  /* The declaration outlived the evidence. Said plainly rather
                     than dropped: dropping the row would quietly edit the
                     person's own record. */
                  <span className="text-text-s">
                    something I can no longer see. I still hold what you said; I
                    no longer hold the opportunity it was about.
                  </span>
                )}
              </p>
              <FreshnessStamp at={row.declaredAt} verb="said" decay="slow" />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
