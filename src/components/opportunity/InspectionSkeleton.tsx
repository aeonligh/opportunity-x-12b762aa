import { Skeleton, SkeletonText } from "@/components/ui/state/Skeleton";

/**
 * The shape of an inspection, before the inspection arrives.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THIS ONE IS DELIBERATELY SHORTER THAN THE PAGE IT STANDS FOR
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `OpportunityInspection` has nine sections and five of them are conditional:
 * contradictions appear only when sources disagree, the verification history
 * only once a verdict has moved, *Not settled* only when something is unsettled.
 * A skeleton that rendered all nine would promise a page that most opportunities
 * do not have — and a placeholder for *Sources disagree* is the product implying
 * a contradiction before it has read one.
 *
 * So this renders only the sections that are always present: the title, what
 * this involves, how the timing was worked out, whether this is real, what I
 * looked at, and the position control. Anything conditional is left out, and the
 * page grows into it. Growing is the honest direction — a skeleton that collapses
 * has told the reader there was more here than there is.
 *
 * The same rule as the card: shapes, never values. No verdict word, no source
 * count, no date, nothing that could be read as a dim version of a real answer.
 */
export function InspectionSkeleton() {
  return (
    <div className="flex flex-col gap-12">
      <p role="status" className="sr-only">
        Loading this opportunity.
      </p>

      {/* Title and timing. */}
      <header aria-hidden className="flex flex-col gap-3">
        <Skeleton className="h-9 w-11/12" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="mt-1 h-4 w-72 max-w-full" />
      </header>

      {/* What this involves — the eight-field grid, at four rows of two. */}
      <section aria-hidden className="flex flex-col gap-4">
        <Skeleton className="h-2.5 w-32" />
        <div className="grid gap-5 sm:grid-cols-2">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-2.5 w-32" />
            </div>
          ))}
        </div>
      </section>

      {/* How the timing was worked out. */}
      <section aria-hidden className="flex flex-col gap-2">
        <Skeleton className="h-2.5 w-52" />
        <SkeletonText lines={3} />
      </section>

      {/* Whether this is real. */}
      <section aria-hidden className="flex flex-col gap-4">
        <Skeleton className="h-2.5 w-36" />
        <Skeleton className="h-5 w-3/5" />
        <SkeletonText lines={2} />
      </section>

      {/*
        What I looked at. Two sources, each with the left-ruled block that holds
        the page's own words — the rule stays for the same reason it stays on the
        card: it is what separates a source's claim from this product's reading of
        it, and losing that separation for the length of a load is losing it at
        the moment the reader is least able to notice.
      */}
      <section aria-hidden className="flex flex-col gap-4">
        <Skeleton className="h-2.5 w-28" />
        <div className="flex flex-col gap-7">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-2.5 w-48" />
              <div className="mt-1 flex flex-col gap-1.5 border-l-2 border-border pl-4">
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why this was surfaced — Opportunity X's own reasoning, kept ruled off. */}
      <section aria-hidden className="flex flex-col gap-3 border-l-2 border-border pl-4">
        <Skeleton className="h-2.5 w-48" />
        <SkeletonText lines={2} />
      </section>

      {/* The position control, at its real reach. */}
      <div aria-hidden className="flex flex-col gap-2">
        <Skeleton className="h-2.5 w-28" />
        <Skeleton className="h-4 w-56" />
        <div className="mt-1 flex flex-wrap gap-3">
          <Skeleton className="h-11 w-32 rounded-full" />
          <Skeleton className="h-11 w-32 rounded-full" />
        </div>
      </div>
    </div>
  );
}
