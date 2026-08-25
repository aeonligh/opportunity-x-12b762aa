import { Skeleton, SkeletonText } from "@/components/ui/state/Skeleton";

/**
 * The shape of an opportunity, before the opportunity arrives.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHAT THIS IS COPYING, AND WHAT IT IS NOT
 * ══════════════════════════════════════════════════════════════════════════
 *
 * It mirrors `OpportunityCard`'s own geometry — the same `gap-6` column, the
 * same bordered box, the same two-column fact grid, the same left-ruled
 * inference block, the same action row at the foot. That is the point: when the
 * real card replaces this, nothing should jump. A placeholder with a different
 * shape is a layout shift with extra steps.
 *
 * It is **not** a copy of the card's meaning. There is no title here, no
 * verdict, no count of sources, no date — nothing that could be misread as a
 * dim version of a real value. Grey bars in the position where a deadline will
 * be say "a deadline is coming"; a grey bar that read "Closes soon" would be
 * the product inventing a fact to fill a gap, which is the one thing it does
 * not do.
 *
 * ── The one asymmetry worth noticing ──────────────────────────────────────
 *
 * The real card's height varies — some opportunities have four contested
 * fields, some have none. This renders the common case and lets the difference
 * settle when the content lands. Matching the tallest possible card would leave
 * a visible collapse on almost every load, which is a worse trade than a small
 * expansion on a few.
 */
export function OpportunityCardSkeleton() {
  return (
    <article aria-hidden className="flex flex-col gap-6 rounded-lg border border-border p-6">
      {/* Title and timing. */}
      <header className="flex flex-col gap-2">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="mt-1 h-3 w-40" />
      </header>

      {/* The four entity facts, in their grid. */}
      <div className="grid gap-5 sm:grid-cols-2">
        {["Offered by", "Closes", "Funding", "Where"].map((label) => (
          <div key={label} className="flex flex-col gap-2">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-2.5 w-28" />
          </div>
        ))}
      </div>

      {/* Verification. */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/*
        The inference block keeps its left rule even while empty. It is the one
        piece of card furniture that carries meaning by position — everything
        inside it is Opportunity X's opinion rather than a source's claim — and
        dropping the rule while loading would let the regions merge for as long
        as the skeleton is up.
      */}
      <div className="flex flex-col gap-3 border-l-2 border-border pl-4">
        <Skeleton className="h-2.5 w-48" />
        <SkeletonText lines={2} />
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>

      {/* The declaration control and the actions, at their real reach. */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-2.5 w-28" />
        <Skeleton className="h-4 w-56" />
        <div className="mt-1 flex flex-wrap gap-3">
          <Skeleton className="h-11 w-32 rounded-full" />
          <Skeleton className="h-11 w-32 rounded-full" />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-11 w-44 rounded-full" />
        <Skeleton className="h-11 w-24 rounded-full" />
      </div>
    </article>
  );
}

/**
 * A list of them, with the page's own heading structure.
 *
 * Three, because a feed of one reads as "there is one opportunity" the instant
 * before the real list lands, and a feed of ten reads as a promise about how
 * many were found. Three is visibly a placeholder rhythm rather than a count.
 */
export function OpportunityListSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        Loading opportunities.
      </p>
      {[0, 1, 2].map((i) => (
        <OpportunityCardSkeleton key={i} />
      ))}
    </div>
  );
}
