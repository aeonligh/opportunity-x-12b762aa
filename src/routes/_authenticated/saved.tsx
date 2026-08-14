import { createFileRoute, Link } from "@tanstack/react-router";
import { listSaved } from "@/lib/opportunities.server";
import { EmptyState } from "@/components/ui/absence/EmptyState";
import { UnknownState } from "@/components/ui/absence/UnknownState";
import { FreshnessStamp } from "@/components/ui/FreshnessStamp";

/**
 * Saved — what you told Opportunity X you care about.
 *
 * Saying you are interested is exactly that. It is not an application, not an
 * acceptance, and not a commitment, and this page does not imply otherwise:
 * there is no progress, no status, and no stage. The only thing recorded is
 * what you said and when.
 */
export const Route = createFileRoute("/_authenticated/saved")({
  loader: () => listSaved(),
  component: Saved,
});

function Saved() {
  const saved = Route.useLoaderData();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-14 sm:px-6">
      <header className="flex flex-col gap-3">
        <Link
          to="/opportunities"
          className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s transition-colors duration-[120ms] hover:text-accent"
        >
          &larr; Opportunities
        </Link>
        <h1 className="text-3xl font-black leading-[1.1] tracking-tighter text-foreground sm:text-4xl">
          Saved
        </h1>
        <p className="max-w-[62ch] text-[15px] leading-relaxed text-text-s">
          What you&rsquo;ve said you care about, most recent first. Saying so keeps it in view — it
          doesn&rsquo;t apply to anything on your behalf.
        </p>
      </header>

      {saved?.state === "unknown" ? <UnknownState gap={saved.gap} /> : null}

      {saved?.state === "empty" ? (
        <EmptyState expectation="Opportunities you save will appear here." />
      ) : null}

      {saved?.state === "declarations" ? (
        <ul className="flex flex-col">
          {saved.declarations.map((row) => (
            <li
              key={row.entityId}
              className="flex flex-col gap-1 border-b border-border py-5 last:border-b-0"
            >
              <p className="max-w-[62ch] text-[15px] leading-snug text-foreground">
                {row.state === "interested" ? "Interested in " : "Not for you: "}
                {row.title ? (
                  <Link
                    to="/opportunities/$id"
                    params={{ id: row.entityId }}
                    className="font-bold underline decoration-border underline-offset-4 transition-colors duration-[120ms] hover:decoration-accent"
                  >
                    {row.title}
                  </Link>
                ) : (
                  /*
                    The saved item outlived the evidence. Kept and said plainly:
                    dropping the row would quietly edit what the person told us.
                  */
                  <span className="text-text-s">
                    something that can no longer be resolved. What you said is still here; the
                    opportunity it pointed at is not.
                  </span>
                )}
              </p>
              <FreshnessStamp at={row.declaredAt} verb="saved" decay="slow" />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
