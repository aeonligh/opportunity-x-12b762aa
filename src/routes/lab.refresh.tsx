import { useEffect, useState, useTransition } from "react";
import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { labRefreshProbe, labRefreshShouldFail } from "@/lib/lab.server";
import { LabFrame } from "@/components/lab/LabFrame";
import { SurfaceError } from "@/components/ui/state/SurfaceError";
import { Refreshing } from "@/components/ui/state/Refreshing";
import { RefreshFailed } from "@/components/ui/state/RefreshFailed";
import { lastGood, rememberLastGood } from "@/lib/last-good";

/**
 * `/lab/refresh` — what a failing refresh does to content that is already true.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * THE STATE THIS EXISTS TO SETTLE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Phase 15 added `Refreshing`, which says a re-read is in flight while the
 * previous answer stays on screen. It never answered the next question: **what
 * happens when that re-read fails?**
 *
 * The requirement is explicit — valid content plus a failed refresh must remain
 * *valid content plus a refresh failure*. Not an error page, not an empty list,
 * not a skeleton. Destroying known-good information to report that fresher
 * information could not be obtained is the same class of lie as rendering an
 * unreadable corpus as an empty one.
 *
 * That could not be answered by reading the router's source, because the answer
 * depends on how *this* application's routes are configured — a loader that
 * throws during `invalidate()` may or may not reach `errorComponent`, and which
 * it does decides whether the content survives. So this route makes the failure
 * happen on demand and lets a browser answer it.
 *
 * ── Why this is a laboratory route and not a production one ───────────────
 *
 * The fault is requested by name, server-side, behind `assertDevelopment()`.
 * Nothing in production branches on it and no flag exists there. See
 * `lab.server.ts`.
 *
 * Nothing here is production evidence: the "content" is a counter, and no
 * opportunity is claimed to exist.
 */
export const Route = createFileRoute("/lab/refresh")({
  loader: () => labRefreshProbe(),
  /*
    Deliberately present, because its *absence* would also be a finding. If a
    failed refresh routes here, the content above is gone and the requirement is
    violated — which is exactly what this route is built to reveal rather than
    assume.
  */
  errorComponent: RefreshBoundary,
  component: RefreshProbe,
});

type Reading = { readings: number; at: string };

const KEY = "lab/refresh";

function RefreshBoundary({ error }: { error: Error }) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();
  const kept = lastGood<Reading>(KEY);

  const retry = () => startRetry(() => void router.invalidate());

  /*
    The distinction the whole route was built to expose. With something already
    known, a failed refresh is a caveat on good information. With nothing known,
    the first read failed and there is genuinely nothing to preserve — that is
    the full error treatment, correctly.
  */
  if (kept) {
    return (
      <LabFrame
        title="Refreshing, and failing"
        lede="The re-read failed and the content survived. That is the requirement: valid content plus a refresh failure, never an error page."
        back={{ label: "Laboratory", to: "/lab" }}
      >
        <RefreshFailed
          what="I couldn’t re-read this."
          at={kept.at}
          onRetry={retry}
          retrying={retrying}
        />

        <div className="rounded-lg border border-border p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-s">
            Preserved content
          </p>
          <p className="mt-2 text-2xl font-black tracking-tighter text-foreground">
            reading #{kept.data.readings}
          </p>
          <p className="mt-1 font-mono text-[11px] text-text-s">{kept.data.at}</p>
        </div>

        <p className="max-w-[62ch] font-mono text-[11px] leading-relaxed text-text-s">
          {error.message}
        </p>
      </LabFrame>
    );
  }

  return (
    <LabFrame
      title="The first read failed"
      lede="Nothing had been shown yet, so there is nothing to preserve. This is the other half of the pair, and the full error treatment is correct here."
      back={{ label: "Laboratory", to: "/lab" }}
    >
      <SurfaceError
        what="I couldn’t read this."
        stillTrue="Nothing has been shown yet, so nothing has been lost — this is a first read that did not succeed."
        whatYouCanDo="Try again."
        onRetry={retry}
        retrying={retrying}
      />
    </LabFrame>
  );
}

function RefreshProbe() {
  const { readings, at } = Route.useLoaderData();
  const router = useRouter();
  const [arming, setArming] = useState(false);
  /* The succeeding refresh gets a pending state too — otherwise the laboratory
     would demonstrate the defect it exists to rule out. */
  const [refreshing, startRefresh] = useTransition();

  /*
    Remembered from the component that rendered it, so only what actually
    reached a person is preserved. See `src/lib/last-good.ts`.
  */
  useEffect(() => {
    rememberLastGood<Reading>(KEY, { readings, at });
  }, [readings, at]);

  async function refreshAndFail() {
    setArming(true);
    /* Arm the next read to fail, then trigger it. */
    await labRefreshShouldFail({ data: { fail: true } });
    await router.invalidate();
    setArming(false);
  }

  return (
    <LabFrame
      title="Refreshing, and failing"
      lede="The counter below is valid content. Refresh it successfully, then refresh it in a way that fails, and watch what happens to the content that was already true."
      back={{ label: "Laboratory", to: "/lab" }}
    >
      <Refreshing what="the reading" />

      <div className="rounded-lg border border-border p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-s">
          Valid content
        </p>
        <p className="mt-2 text-2xl font-black tracking-tighter text-foreground">
          reading #{readings}
        </p>
        <p className="mt-1 font-mono text-[11px] text-text-s">{at}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => startRefresh(() => void router.invalidate())}
          disabled={refreshing}
          aria-busy={refreshing}
          className="rounded-full border border-border px-6 py-3 text-xs font-bold uppercase tracking-widest text-text-s transition-colors duration-[120ms] hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "Refresh, and succeed"}
        </button>
        <button
          type="button"
          onClick={() => void refreshAndFail()}
          disabled={arming}
          aria-busy={arming}
          className="rounded-full border border-[color-mix(in_oklab,var(--destructive)_45%,var(--border))] px-6 py-3 text-xs font-bold uppercase tracking-widest text-text-s transition-colors duration-[120ms] hover:text-[var(--destructive)] disabled:opacity-50"
        >
          {arming ? "Refreshing…" : "Refresh, and fail"}
        </button>
      </div>

      <p className="max-w-[62ch] text-[13px] leading-relaxed text-text-s">
        The requirement:{" "}
        <span className="text-foreground">
          valid content plus a failed refresh must remain valid content plus a refresh failure
        </span>{" "}
        — never an error page, an empty list, or a skeleton. See also{" "}
        <Link to="/lab/faults" className="underline decoration-border underline-offset-4">
          failures, induced
        </Link>
        .
      </p>
    </LabFrame>
  );
}
