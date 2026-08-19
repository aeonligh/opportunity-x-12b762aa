import { useEffect, useTransition } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { listSaved } from "@/lib/opportunities.functions";
import { EmptyState } from "@/components/ui/absence/EmptyState";
import { UnknownState } from "@/components/ui/absence/UnknownState";
import { FreshnessStamp } from "@/components/ui/FreshnessStamp";
import { Skeleton } from "@/components/ui/state/Skeleton";
import { SurfaceError } from "@/components/ui/state/SurfaceError";
import { Refreshing } from "@/components/ui/state/Refreshing";
import { RefreshFailed } from "@/components/ui/state/RefreshFailed";
import { lastGood, rememberLastGood } from "@/lib/last-good";

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
  pendingComponent: Pending,
  errorComponent: Failed,
  component: Saved,
});

function Masthead() {
  return (
    <header className="flex flex-col gap-3">
      <h1 className="text-3xl font-black leading-[1.1] tracking-tighter text-foreground sm:text-4xl">
        Saved
      </h1>
      <p className="max-w-[62ch] text-[15px] leading-relaxed text-text-s">
        What you&rsquo;ve said you care about, most recent first. Saying so keeps it in view — it
        doesn&rsquo;t apply to anything on your behalf.
      </p>
    </header>
  );
}

/**
 * Waiting for the saved list.
 *
 * Three rows, matching the list's own `border-b` rhythm, and no card geometry —
 * this page renders one line per declaration, not an opportunity card, and a
 * placeholder shaped like the wrong thing is a layout shift dressed as a
 * courtesy.
 */
function Pending() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-14 sm:px-6">
      <Masthead />
      <div className="flex flex-col">
        <p role="status" className="sr-only">
          Loading what you&rsquo;ve saved.
        </p>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            aria-hidden
            className="flex flex-col gap-2 border-b border-border py-5 last:border-b-0"
          >
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-2.5 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Exactly what the loader returns, so preserved and live content share a type. */
type LoaderData = Awaited<ReturnType<typeof listSaved>>;

const LAST_GOOD_KEY = "saved";

function Failed() {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();
  const kept = lastGood<LoaderData>(LAST_GOOD_KEY);
  const retry = () => startRetry(() => void router.invalidate());

  /* Preserved content beats an error page. See `lib/last-good.ts`. */
  if (kept) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-14 sm:px-6">
        <Masthead />
        <RefreshFailed
          what="I couldn’t check your saved list for changes."
          at={kept.at}
          onRetry={retry}
          retrying={retrying}
        />
        <Saved data={kept.data} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-14 sm:px-6">
      <Masthead />
      <SurfaceError
        what="I couldn’t read what you’ve saved."
        /*
          The strongest form of the rule on this page. These are the person's own
          statements; an unreadable list rendered as an empty one would tell them
          they had never said anything — about their own record, which is exactly
          the claim they have no way to check from here.
        */
        stillTrue="Nothing has been lost. Everything you’ve told me is still recorded — this is a failure to read it, not an empty list."
        whatYouCanDo="Try again. Your positions are kept in the database, not in this page."
        onRetry={retry}
        retrying={retrying}
      />
    </div>
  );
}

function Saved({ data }: { data?: LoaderData }) {
  const live = Route.useLoaderData();
  /* Supplied only by the refresh-failure branch; one body for both paths. */
  const saved = data ?? live;

  useEffect(() => {
    if (!data) rememberLastGood(LAST_GOOD_KEY, live);
  }, [data, live]);

  return (
    <div
      className={
        data ? "flex flex-col gap-8" : "mx-auto flex max-w-2xl flex-col gap-8 px-4 py-14 sm:px-6"
      }
    >
      {data ? null : <Masthead />}
      {data ? null : <Refreshing what="what you’ve saved" />}

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
