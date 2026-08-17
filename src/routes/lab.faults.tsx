import { createFileRoute, Link } from "@tanstack/react-router";
import { labCardsFault, labInspectionFault, labSavedFault } from "@/lib/lab.server";
import { LabFrame } from "@/components/lab/LabFrame";
import { UnknownState } from "@/components/ui/absence/UnknownState";
import { AbsentState } from "@/components/ui/absence/AbsentState";
import { EmptyState } from "@/components/ui/absence/EmptyState";
import { CARD_FAULTS, SAVED_FAULTS, INSPECTION_FAULTS } from "@/lib/opportunity/surface/faults";
import type { CardsResolution } from "@/lib/opportunity/surface/service";

/**
 * `/lab/faults` — read failures, induced rather than mimed.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHAT THIS PAGE PROVES THAT `/lab/states` DOES NOT
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `/lab/states` renders the state components directly, with props. That is the
 * right tool for comparing how the states *look* side by side, and it is not
 * evidence about the product: it shows that `UnknownState` renders a sentence
 * when given one, which nobody doubted.
 *
 * The question this page answers is the other one. **When a read genuinely
 * fails, does the surface reach the right component at all?** Every row below
 * asks the server for a named failure, gets back the real
 * `CardsResolution` / `InspectionResolution` / `DeclarationsResolution` a failing
 * read produces, and then takes the same branch the authenticated route takes —
 * so a route that mapped `unknown` to an empty list would be visibly wrong here,
 * and could not be fixed by editing this page.
 *
 * ── The distinction the whole laboratory turns on ─────────────────────────
 *
 * A developer must be able to say *"this operation failed"*, not merely *"this
 * component has an error-looking prop"*. The faults come from
 * `src/lib/opportunity/surface/faults.ts`, typed against the real result unions,
 * so a state added to a union without being added there leaves an obviously
 * incomplete file rather than a laboratory that quietly stopped covering the
 * product.
 *
 * Nothing here is production evidence. Every resolution is constructed, not
 * observed, and no opportunity is claimed to exist.
 */
export const Route = createFileRoute("/lab/faults")({
  loader: async () => ({
    cards: await Promise.all(
      CARD_FAULTS.map(async (fault) => ({
        fault,
        resolution: await labCardsFault({ data: { fault } }),
      })),
    ),
    inspection: await Promise.all(
      INSPECTION_FAULTS.map(async (fault) => ({
        fault,
        resolution: await labInspectionFault({ data: { fault } }),
      })),
    ),
    saved: await Promise.all(
      SAVED_FAULTS.map(async (fault) => ({
        fault,
        resolution: await labSavedFault({ data: { fault } }),
      })),
    ),
  }),
  component: Faults,
});

function Row({
  fault,
  meaning,
  children,
}: {
  fault: string;
  meaning: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-b border-border pb-8 last:border-b-0">
      <div className="flex flex-col gap-1">
        <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
          {fault}
        </h3>
        <p className="max-w-[62ch] text-[14px] leading-relaxed text-foreground">{meaning}</p>
      </div>
      <div className="rounded-lg border border-border p-5">{children}</div>
    </section>
  );
}

/**
 * The list route's own branching, reproduced exactly.
 *
 * Deliberately a copy of the three-way `result.state` check in
 * `_authenticated/opportunities.tsx` rather than a shared component: if the two
 * ever disagree, the disagreement is the finding. A shared renderer would make
 * this page agree with the route by construction and prove nothing.
 */
function CardsBranch({ resolution }: { resolution: CardsResolution }) {
  if (resolution.state === "absent") {
    return (
      <AbsentState
        verdict="Nothing I watch is currently offering something worth your attention."
        searchedAt={resolution.searchedAt}
        standing="This is what I found, not a gap in my looking. When something opens, it appears here."
      />
    );
  }
  if (resolution.state === "unknown") return <UnknownState gap={resolution.gap} />;
  return <p className="text-[14px] text-text-s">Cards would render here.</p>;
}

function Faults() {
  const { cards, inspection, saved } = Route.useLoaderData();

  return (
    <LabFrame
      title="Failures, induced"
      lede="Each row below asked the server for a named failure and received the real result a failing read produces. The surfaces then branch exactly as the authenticated routes do — so a route that rendered a failure as an absence would be visibly wrong here, and could not be fixed by editing this page."
      back={{ label: "Laboratory", to: "/lab" }}
    >
      <p className="max-w-[62ch] text-[14px] leading-relaxed text-text-s">
        The neighbouring page,{" "}
        <Link to="/lab/states" className="underline decoration-border underline-offset-4">
          the states of a surface
        </Link>
        , renders the state components directly with props. That compares how they look. This
        compares what the product actually reaches.
      </p>

      <h2 className="mt-4 border-b border-border pb-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
        Opportunities
      </h2>

      {cards.map(({ fault, resolution }) => (
        <Row
          key={fault}
          fault={fault}
          meaning={
            fault === "nothing-open"
              ? "A finding about the world, carrying the time it was made. The only one of the three that is a claim rather than a limit."
              : fault === "never-looked"
                ? "Configured and readable, and no source has ever been consulted. Not an empty world — an unlooked one."
                : "The record could not be read. Says nothing about whether opportunities exist."
          }
        >
          <CardsBranch resolution={resolution} />
        </Row>
      ))}

      <h2 className="mt-4 border-b border-border pb-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
        One opportunity
      </h2>

      {inspection.map(({ fault, resolution }) => (
        <Row
          key={fault}
          fault={fault}
          meaning={
            fault === "no-such-entity"
              ? "The record was read and does not hold it. A real absence, and the only branch allowed to say so."
              : "The record could not be read. It may well be there."
          }
        >
          {resolution.state === "not-found" ? (
            <div className="flex flex-col gap-3">
              <h4 className="max-w-[24ch] text-xl font-black leading-[1.1] tracking-tighter text-foreground">
                Nothing here matches that reference.
              </h4>
              <p className="max-w-[58ch] text-[14px] leading-relaxed text-text-s">
                If you followed a link from somewhere, the opportunity it pointed at may have been
                re-identified since.
              </p>
            </div>
          ) : resolution.state === "unknown" ? (
            <UnknownState gap={resolution.gap} />
          ) : (
            <p className="text-[14px] text-text-s">An inspection would render here.</p>
          )}
        </Row>
      ))}

      <h2 className="mt-4 border-b border-border pb-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
        Saved
      </h2>

      {saved.map(({ fault, resolution }) => (
        <Row
          key={fault}
          fault={fault}
          meaning={
            fault === "nothing-declared"
              ? "Read successfully, and this person has said nothing. Their silence — expected, and not a failure."
              : fault === "declarations-unreadable"
                ? "The read failed. Everything they said is still recorded; this is a failure to read it."
                : "Nothing durable is configured. A limit of the deployment, not of the person."
          }
        >
          {resolution.state === "empty" ? (
            <EmptyState expectation="Opportunities you save will appear here." />
          ) : resolution.state === "unknown" ? (
            <UnknownState gap={resolution.gap} />
          ) : (
            <p className="text-[14px] text-text-s">Declarations would render here.</p>
          )}
        </Row>
      ))}
    </LabFrame>
  );
}
