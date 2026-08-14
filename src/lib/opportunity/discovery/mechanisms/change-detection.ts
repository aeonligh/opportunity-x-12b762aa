import { visit, type CrawlContext, type MechanismReport } from "../crawl";

/**
 * Mechanism 2 — change detection on stable URLs.
 *
 * ── Why this is a separate mechanism and not a setting ────────────────────
 *
 * Institutional channel monitoring reaches a page because an announcer links to
 * it *today*. That is exactly the wrong dependency for the thing this mechanism
 * exists to catch.
 *
 * A programme page is announced, sits on the homepage for a fortnight, and then
 * scrolls off. The opportunity has not changed; the announcer's front page has.
 * From that moment the channel monitor will never look at it again — and the
 * deadline could move, the eligibility could be rewritten, the page could go
 * 404, and nothing would notice. Every judgment resting on it would keep citing
 * a retrieval that is quietly months old.
 *
 * So this mechanism watches **what has already been observed**, independent of
 * whether anything still links to it. Its input is the observation record
 * itself, which is the one source of URLs that never forgets.
 *
 * ── What "changed" means here, and what it does not ───────────────────────
 *
 * This mechanism does not decide that anything changed. It re-fetches, and the
 * new observation is appended beside the old one. Whether the two disagree is
 * the entity layer's question, and whether that disagreement matters is
 * verification's. A crawler that compared digests and skipped the write when
 * they matched would be deciding, in the transport, that nothing happened — and
 * "we looked and it was the same" is a materially different fact from "we did
 * not look", which is precisely the confusion the whole record exists to
 * prevent.
 *
 * ── The one thing it must not become ──────────────────────────────────────
 *
 * A reason not to re-check. The re-check window is a floor on politeness, not a
 * budget to be spent as slowly as possible: a life-changing opportunity's
 * verification lapses in seven days, so a page re-checked less often than that
 * can never hold a verified state at all.
 */

export interface ChangeDetectionOptions {
  /** Hard ceiling on re-checks in one run, oldest first. */
  maxPages?: number;
}

export function changeDetection(options: ChangeDetectionOptions = {}) {
  const maxPages = options.maxPages ?? 50;

  return {
    id: "change-detection" as const,
    label: "Change detection on stable URLs",

    async run(ctx: CrawlContext, report: MechanismReport, touched: Set<string>) {
      const observed = await ctx.store.observedUrls();

      /*
        Oldest first. When the budget runs out, it should run out on the pages
        AEON X has looked at most recently — never on the ones it has been
        ignoring longest, which are the ones whose freshness claim is weakest.
      */
      const stale = observed
        .filter((o) => !ctx.seenRecently.has(o.url))
        .sort((a, b) => a.lastRetrievedAt.localeCompare(b.lastRetrievedAt))
        .slice(0, maxPages);

      for (const { url } of stale) {
        await visit(ctx, url, report, touched);
      }
    },
  };
}
