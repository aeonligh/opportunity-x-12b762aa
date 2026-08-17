import { createFileRoute, Link } from "@tanstack/react-router";
import { LabFrame } from "@/components/lab/LabFrame";
import { UnknownState } from "@/components/ui/absence/UnknownState";
import { AbsentState } from "@/components/ui/absence/AbsentState";
import { EmptyState } from "@/components/ui/absence/EmptyState";
import { SurfaceError } from "@/components/ui/state/SurfaceError";
import { OpportunityCardSkeleton } from "@/components/opportunity/OpportunityCardSkeleton";

/**
 * `/lab/states` — every state a surface can be in, side by side.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THESE NEED A PAGE OF THEIR OWN
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The specimen list cannot show them. Every one of its opportunities exists, so
 * the corpus is never unreadable, a search has never come back empty, and the
 * saved list is never new — which means the states the product is most likely
 * to get wrong are the ones the laboratory could not display.
 *
 * They are also the states that collapse into each other under any pressure to
 * tidy up. To a designer, every one of these is "nothing to show", and
 * rendering them the same way is a lie in most of the cases:
 *
 *   Unknown       — I cannot see. A limit on me, never a claim about the world.
 *   Absent        — I looked, and there was nothing. A finding, with a time on it.
 *   Empty         — nothing yet, and that is expected. Not a failure at all.
 *   Loading       — I am looking. Not yet any of the three above.
 *   Failed        — I tried to look and could not. Also not any of the three.
 *
 * Showing "no opportunities found" when the truth is "the record could not be
 * read" tells someone the world is empty when the system is blind. Showing a
 * blank while a read is in flight tells them the answer has arrived when it has
 * not. So they sit here next to one another, where the difference is visible and
 * a regression in any of them is obvious.
 *
 * ── The half that is not here ─────────────────────────────────────────────
 *
 * Writes. They need pressing rather than looking at, and they have their own
 * page at `/lab/mutations`.
 *
 * These are rendered components, not fixtures: no opportunity is claimed, and
 * nothing here is evidence about anything.
 */
export const Route = createFileRoute("/lab/states")({
  component: States,
});

function Specimen({
  name,
  meaning,
  wrong,
  children,
}: {
  name: string;
  meaning: string;
  wrong: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-b border-border pb-8 last:border-b-0">
      <div className="flex flex-col gap-1">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
          {name}
        </h2>
        <p className="max-w-[62ch] text-[14px] leading-relaxed text-foreground">{meaning}</p>
        <p className="max-w-[62ch] text-[13px] leading-relaxed text-text-s">
          Shown as anything else, it would say: {wrong}
        </p>
      </div>
      <div className="rounded-lg border border-border p-5">{children}</div>
    </section>
  );
}

function Band({ children }: { children: string }) {
  return (
    <h2 className="mt-4 border-b border-border pb-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
      {children}
    </h2>
  );
}

function States() {
  return (
    <LabFrame
      title="The states of a surface"
      lede="Nothing to show is not one state. These are the ones this product has to keep apart, and what each of them would be lying about if it were rendered as one of the others."
      back={{ label: "Laboratory", to: "/lab" }}
    >
      <p className="max-w-[62ch] text-[14px] leading-relaxed text-text-s">
        Writes have their own page, because they need pressing rather than looking at:{" "}
        <Link to="/lab/mutations" className="underline decoration-border underline-offset-4">
          what a write looks like
        </Link>
        .
      </p>

      <Band>Three ways of having nothing</Band>

      <Specimen
        name="Unknown"
        meaning="I cannot see. This is a limit on the system, and never a claim about the world."
        wrong="that there are no opportunities, when the truth is that the record could not be read."
      >
        <UnknownState gap="I have no record of anything I have observed, so I cannot show you opportunities." />
      </Specimen>

      <Specimen
        name="Absent"
        meaning="A search ran, completed, and found nothing. That is a finding, and it carries the time it was made."
        wrong="that nothing has been checked, throwing away the one thing that was actually established."
      >
        <AbsentState
          verdict="No opportunity matching those terms was announced by any source I watch."
          /*
            A literal, not `Date.now() - three hours`. Computed, the server and
            the client landed on different milliseconds and React reported a
            hydration mismatch — a rendered value two halves of the system
            disagreed about, on the page whose subject is not doing that.
            Nothing here is a fact about the world, so pinning it costs nothing.
          */
          searchedAt="2026-08-17T09:00:00.000Z"
          standing="Three sources answered. None of them carried a call that is still open."
        />
      </Specimen>

      <Specimen
        name="Empty"
        meaning="Nothing here yet, and that is expected. Not a failure, not a limit, not a finding."
        wrong="that something went wrong, when the person has simply not done the thing yet."
      >
        <EmptyState expectation="Opportunities you save will appear here." />
      </Specimen>

      <Band>Two ways of not having an answer yet</Band>

      {/*
        The state most likely to be mistaken for one of the three above, because
        for the first few hundred milliseconds it renders in the same place and
        occupies the same slot in the reader's attention. It is the only one of
        the five that is going to change on its own.
      */}
      <Specimen
        name="Loading"
        meaning="I am looking. The shape of the answer is known — that is why a placeholder can be drawn at all — and none of its content is."
        wrong="that the answer has arrived. A blank page during a read is indistinguishable from a page that finished and found nothing, and the reader has no way to tell which they are looking at."
      >
        <OpportunityCardSkeleton />
      </Specimen>

      <Specimen
        name="Failed"
        meaning="I tried to look and could not. Distinct from Unknown: unknown is a standing limit, this is an attempt that broke, and it is worth retrying."
        wrong="that there is nothing there. This is the confusion the product is least able to afford, because it is the one that makes a person stop looking."
      >
        <SurfaceError
          what="I couldn’t read the record of what I’ve observed, so I can’t show you any opportunities."
          stillTrue="This is a failure to look, not a finding. Opportunities I have already observed are still there — I just can’t reach them from here at the moment."
          whatYouCanDo="Trying again usually works. If it doesn’t, the record is genuinely unreachable and nothing you do here will change that."
          onRetry={() => {}}
        />
      </Specimen>

      {/*
        The same component with the retry withheld. Worth its own specimen
        because the temptation is to offer one everywhere: a button that cannot
        work teaches people that buttons here do not work, and the honest
        alternative is a sentence saying waiting is the only move.
      */}
      <Specimen
        name="Failed, with nothing to do about it"
        meaning="Some failures are environmental. Where retrying cannot help, no retry is offered and the surface says why."
        wrong="that pressing something will fix it. A retry that cannot succeed is worse than none: it teaches people that this product’s buttons are decoration."
      >
        <SurfaceError
          what="I couldn’t reach any of the sources I watch."
          stillTrue="Nothing about what I have already observed has changed, and none of this is a statement about whether those opportunities are still open."
          whatYouCanDo={null}
        />
      </Specimen>

      <Band>Degraded, and saying so</Band>

      {/*
        Partial success is the case a product is most tempted to round up. Three
        of four sources answered and the page renders — so it renders as though
        four did, and the count of sources on the card is quietly a count of the
        ones that happened to reply.
      */}
      <Specimen
        name="Partly available"
        meaning="Most of a surface worked and a named part of it did not. The working part is shown, and the missing part is named rather than omitted."
        wrong="that this is the whole picture. A page that silently drops what it could not fetch is telling the reader it looked everywhere."
      >
        <SurfaceError
          what="One of the four sources for this opportunity didn’t answer, so what you see below is built from three."
          stillTrue="Everything shown is real and was read from a page. What is missing is one source’s view, which may have agreed or disagreed with the rest — I don’t know which, and I won’t guess."
          whatYouCanDo="Nothing needs doing. I’ll try that source again on the next sweep and the page will say so if its answer changes anything."
        />
      </Specimen>

      <Band>Identity</Band>

      {/*
        The gate's third answer. It is on this page rather than in a comment
        because a redirect to /auth is a *claim* — "you are signed out" — and for
        as long as the gate could not tell a rejected token from an unreachable
        auth service, it was a claim the product made without evidence, on the
        surface people trust most.
      */}
      <Specimen
        name="Session unverifiable"
        meaning="I could not reach the service that checks whether you are signed in. This says nothing about whether you are."
        wrong="that you have been signed out. Sending someone to the sign-in page here asserts something about their account that nothing has established — and the sign-in attempt will fail the same way, so the product has manufactured a loop out of a network blip."
      >
        <div className="flex flex-col gap-3">
          <h3 className="text-xl font-black leading-[1.15] tracking-tighter text-foreground">
            I couldn&rsquo;t check whether you&rsquo;re signed in.
          </h3>
          <p className="max-w-[58ch] text-[14px] leading-relaxed text-text-s">
            I couldn&rsquo;t reach the service that checks whether you&rsquo;re signed in.
          </p>
          <p className="max-w-[58ch] text-[14px] leading-relaxed text-foreground">
            This is not a sign that you&rsquo;ve been signed out. Your session may be perfectly
            valid — I just can&rsquo;t confirm it right now, and I won&rsquo;t show you a page that
            might not be yours on a guess.
          </p>
        </div>
      </Specimen>

      <Band>A record that outlived its subject</Band>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
          A declaration that outlived its opportunity
        </h2>
        <p className="max-w-[62ch] text-[14px] leading-relaxed text-foreground">
          The case most likely to be tidied away. When a saved opportunity can no longer be
          resolved, the row stays.
        </p>
        <p className="max-w-[62ch] text-[13px] leading-relaxed text-text-s">
          Removing it would quietly edit what the person said, and they would have no way to notice
          it had gone. Take a position in the laboratory and it appears on{" "}
          <Link to="/lab/saved" className="underline decoration-border underline-offset-4">
            saved
          </Link>{" "}
          this way if its opportunity stops resolving.
        </p>
        <div className="rounded-lg border border-border p-5">
          <p className="max-w-[62ch] text-[15px] leading-snug text-foreground">
            Interested in{" "}
            <span className="text-text-s">
              something that can no longer be resolved. What you said is still here; the opportunity
              it pointed at is not.
            </span>
          </p>
        </div>
      </section>
    </LabFrame>
  );
}
