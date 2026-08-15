import { createFileRoute, Link } from "@tanstack/react-router";
import { labSaved } from "@/lib/lab.server";
import { LabFrame } from "@/components/lab/LabFrame";
import { EmptyState } from "@/components/ui/absence/EmptyState";
import { FreshnessStamp } from "@/components/ui/FreshnessStamp";

/**
 * `/lab/saved` — the return leg of the walk.
 *
 * Mirrors `/saved`: what was said, when, and nothing else. No progress, no
 * status, no stage. A declaration is not an application, and a page that showed
 * a pipeline here would teach the opposite in one screen.
 */
export const Route = createFileRoute("/lab/saved")({
  loader: () => labSaved(),
  component: LabSaved,
});

function LabSaved() {
  const saved = Route.useLoaderData();

  return (
    <LabFrame
      title="Saved"
      lede="What you’ve said you care about, most recent first. Saying so keeps it in view — it doesn’t apply to anything on your behalf."
      back={{ label: "Opportunities", to: "/lab" }}
    >
      {saved.state === "empty" ? (
        <EmptyState expectation="Opportunities you save will appear here." />
      ) : (
        <ul className="flex flex-col">
          {saved.declarations.map((row) => (
            <li
              key={row.entityId}
              className="flex flex-col gap-1 border-b border-border py-5 last:border-b-0"
            >
              <p className="max-w-[62ch] text-[15px] leading-snug text-foreground">
                {row.state === "interested" ? "Interested in " : "Not for you: "}
                <Link
                  to="/lab/$id"
                  params={{ id: row.entityId }}
                  className="font-bold underline decoration-border underline-offset-4 transition-colors duration-[120ms] hover:decoration-accent"
                >
                  {row.title}
                </Link>
              </p>
              <FreshnessStamp at={row.declaredAt} verb="saved" decay="slow" />
              {row.yours ? null : (
                /*
                  A position the fixture person shipped with, not one taken here.
                  Said on the row rather than in a footnote: this list reads as
                  "what you said", and two rows with different owners looking
                  identical is the attribution problem the laboratory has to
                  avoid most.
                */
                <p className="text-[13px] leading-relaxed text-text-s">
                  This one came with the scenario — it isn’t a position you took.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </LabFrame>
  );
}
