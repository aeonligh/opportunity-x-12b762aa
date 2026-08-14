import { EntityFact } from "./EntityFact";
import { VerificationSeal } from "./VerificationSeal";
import { PairingInference } from "./PairingInference";
import { InterestedControl } from "./InterestedControl";
import { FreshnessStamp } from "@/components/ui/FreshnessStamp";
import { transitionWords } from "@/lib/opportunity/surface/wording";
import type { OpportunityInspection as Inspection } from "@/lib/opportunity/surface/inspection";
import type { ObservedField } from "@/lib/opportunity/observation/types";

/**
 * What this involves — the inspection surface.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * DELIBERATELY NOT CALLED REGISTRATION
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Registration is one terminal action among several, and it is wrong for most
 * of the categories in the research corpus — you apply for a scholarship,
 * attend a workshop, enrol on a course, enter a competition. Naming the surface
 * after one of them would make the product quietly assume a process it has no
 * evidence for.
 *
 * More importantly, naming it after a step commits the page to producing that
 * step. This page's purpose is for someone to find out what they would be
 * getting into, including the parts that would put them off. The terminal
 * action sits at the foot as one available thing, not as the page's reason for
 * existing.
 *
 * ── Reading order ─────────────────────────────────────────────────────────
 *
 *   Contradictions first, when there are any. If sources disagree about the
 *   deadline, that is the most important thing on the page and burying it under
 *   the requirements would be a presentational lie.
 *
 *   Then requirements, then timing and how it was derived, then verification
 *   and its history, then the sources themselves, then what happens next.
 *
 * Nothing here is behind a disclosure. Verification must never cost more than
 * acceptance, and a caveat that takes an interaction has been priced above the
 * button beside it.
 */

const LABELS: Record<ObservedField, string> = {
  title: "What it is",
  organiser: "Offered by",
  eligibility: "Who may apply",
  funding: "What it covers",
  opens: "Opens",
  deadline: "Closes",
  location: "Where",
  "how-to-apply": "Where to go",
};

export function OpportunityInspection({
  inspection,
  evidence = "live",
  canPersistPursuit = false,
}: {
  inspection: Inspection;
  evidence?: "live" | "fixture";
  /** Whether a declaration can actually be kept. Read before it is offered. */
  canPersistPursuit?: boolean;
}) {
  const { card } = inspection;

  return (
    <div className="flex flex-col gap-12">
      {evidence === "fixture" ? (
        <p className="rounded-md border border-border bg-surface/40 px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-text-s">
          Fixture — nothing on this page was retrieved from a real source
        </p>
      ) : null}

      <header className="flex flex-col gap-3">
        <h1 className="max-w-[24ch] text-3xl font-black leading-[1.1] tracking-tighter text-foreground sm:text-4xl">
          {card.shown.statement}
        </h1>
        <p className="max-w-[58ch] text-[15px] leading-relaxed text-text-s">
          {card.shown.timing}
        </p>
      </header>

      {/*
        Contradictions lead. If sources disagree about when this closes, no
        amount of well-organised detail below matters more than saying so.
      */}
      {inspection.contradictions.length > 0 ? (
        <section aria-labelledby="contradictions" className="flex flex-col gap-6">
          <h2
            id="contradictions"
            className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s"
          >
            Sources disagree
          </h2>

          {inspection.contradictions.map((row) => (
            <div key={row.field} className="flex flex-col gap-4">
              <p className="text-[15px] font-bold leading-snug text-foreground">
                {LABELS[row.field]}
              </p>

              {/*
                Each side, attributed. The previous version showed two dates and
                left the reader to work out whether the disagreement was between
                two ministries or a ministry and an aggregator — which is the
                entire substance of the disagreement.
              */}
              <ul className="flex flex-col gap-4">
                {row.readings.map((reading) => (
                  <li
                    key={reading.value}
                    className="flex flex-col gap-1.5 border-l-2 border-border pl-4"
                  >
                    <p className="text-[17px] font-bold leading-tight text-foreground">
                      {reading.value}
                    </p>
                    {reading.asStated.length > 0 ? (
                      <p className="max-w-[58ch] font-mono text-[11px] leading-relaxed text-text-s">
                        published as {reading.asStated.map((w) => `“${w}”`).join(", ")}
                      </p>
                    ) : null}
                    <ul className="flex flex-col gap-0.5">
                      {reading.said.map((source) => (
                        <li
                          key={`${source.label}-${source.observedAt}`}
                          className="max-w-[58ch] text-[14px] leading-relaxed text-text-s"
                        >
                          {source.label} — {source.kind},{" "}
                          <FreshnessStamp at={source.observedAt} verb="read" decay="fast" />
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>

              {/*
                What the disagreement costs. Two values side by side invite a
                reader to pick the friendlier one; saying that Opportunity X will not
                pick — and will not tell them there is time — is the point.
              */}
              <p className="max-w-[62ch] text-[15px] leading-relaxed text-foreground">
                {row.consequence}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      <section aria-labelledby="requirements" className="flex flex-col gap-4">
        <h2
          id="requirements"
          className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s"
        >
          What this involves
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {inspection.fields.map((row) => (
            <EntityFact key={row.field} label={LABELS[row.field]} view={row.view} />
          ))}
        </div>
      </section>

      <section aria-labelledby="timing" className="flex flex-col gap-2">
        <h2
          id="timing"
          className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s"
        >
          How the timing was worked out
        </h2>
        <p className="max-w-[68ch] text-[15px] leading-relaxed text-text-s">
          {inspection.deadlineReasoning}
        </p>
      </section>

      <section aria-labelledby="verification" className="flex flex-col gap-4">
        <h2
          id="verification"
          className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s"
        >
          Whether this is real
        </h2>

        <VerificationSeal resolution={card.verification} />

        {/*
          The history, not just the current state. "Has anything ever gone
          verified to not-verified" is the question that decides whether decay
          works at all, and a person looking at one opportunity deserves the
          same answer about theirs.
        */}
        {inspection.verificationHistory.length > 0 ? (
          <ol className="flex flex-col gap-2 border-l-2 border-border pl-4">
            {inspection.verificationHistory.map((transition) => (
              <li key={`${transition.at}-${transition.to}`} className="flex flex-col">
                {/*
                  A sentence, not the stored enum with an arrow between it. This
                  rendered "unverified → contradicted", which asks a person
                  reading their own opportunity's history to learn four verdict
                  words and infer what an arrow means between them.
                */}
                <span className="max-w-[62ch] text-[14px] leading-snug text-foreground">
                  {transitionWords(transition.from, transition.to)}
                </span>
                <span className="max-w-[58ch] font-mono text-[11px] leading-relaxed text-text-s">
                  {transition.reason} ·{" "}
                  <FreshnessStamp at={transition.at} verb="" decay="fast" />
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      <section aria-labelledby="sources" className="flex flex-col gap-4">
        <h2
          id="sources"
          className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s"
        >
          What I looked at
        </h2>
        <ul className="flex flex-col gap-7">
          {inspection.sources.map((source) => (
            <li key={source.observationId} className="flex flex-col gap-2">
              <a
                href={source.url}
                className="max-w-[68ch] break-words text-[15px] font-bold leading-snug text-foreground underline decoration-border underline-offset-4 transition-colors duration-[120ms] hover:decoration-accent"
              >
                {source.label}
              </a>
              <span className="font-mono text-[11px] text-text-s">
                {source.kind} ·{" "}
                <FreshnessStamp at={source.retrievedAt} verb="read" decay="fast" />
                {/*
                  A failed retrieval is evidence too, and often the earliest
                  signal that something closed. Hiding it would leave the count
                  of sources looking healthier than the record is.
                */}
                {!source.answered ? " · did not answer" : ""}
                {source.unreadable ? ` · ${source.unreadable}` : ""}
              </span>

              {/*
                What the page said, in its own words.

                Without this the surface asserted "verified against 3
                independent sources" and then listed three links — a number the
                reader had to believe, next to evidence they could not read. The
                whole product rests on being checkable, and this is where it
                becomes checkable.
              */}
              {source.said.length > 0 ? (
                <dl className="mt-1 flex flex-col gap-1.5 border-l-2 border-border pl-4">
                  {source.said.map((statement) => (
                    <div
                      key={`${statement.field}-${statement.asStated}`}
                      className="flex flex-col gap-0.5 sm:flex-row sm:gap-3"
                    >
                      <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-s sm:w-[13ch] sm:shrink-0 sm:pt-[3px]">
                        {LABELS[statement.field]}
                      </dt>
                      <dd className="max-w-[52ch] text-[14px] leading-relaxed text-foreground">
                        {statement.asStated}
                        {statement.readAs ? (
                          <span className="text-text-s"> — read as {statement.readAs}</span>
                        ) : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : source.answered ? (
                <p className="max-w-[58ch] border-l-2 border-border pl-4 text-[14px] leading-relaxed text-text-s">
                  This page answered, and nothing about the opportunity could be
                  read from it.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <PairingInference pairing={card.pairing} whySurfaced={card.shown.whySurfaced} />

      {card.shown.uncertainties.length > 0 ? (
        <section aria-labelledby="unsettled" className="flex flex-col gap-2">
          <h2
            id="unsettled"
            className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s"
          >
            Not settled
          </h2>
          <ul className="flex flex-col gap-1">
            {card.shown.uncertainties.map((line) => (
              <li key={line} className="max-w-[68ch] text-[15px] leading-relaxed text-text-s">
                {line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="next" className="flex flex-col gap-2">
        <h2
          id="next"
          className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s"
        >
          What happens next
        </h2>
        <ul className="flex flex-col gap-2">
          {inspection.whatHappensNext.map((line) => (
            <li key={line} className="max-w-[68ch] text-[15px] leading-relaxed text-text-s">
              {line}
            </li>
          ))}
        </ul>
      </section>

      <InterestedControl
        entityId={card.entityId}
        pursuit={card.pursuit}
        canPersist={canPersistPursuit}
        evidence={evidence}
      />

      {/*
        The terminal action, at the foot, as one available thing. Not the page's
        purpose, and never labelled with a process no source described.
      */}
      {card.action ? (
        <div className="flex flex-col gap-2">
          <a
            href={card.action.href}
            className="w-fit rounded-full bg-accent px-8 py-4 text-xs font-bold uppercase tracking-widest text-background transition-opacity duration-[120ms] active:opacity-90"
          >
            {card.action.verb}
          </a>
          <span className="max-w-[58ch] font-mono text-[11px] leading-relaxed text-text-s">
            {card.action.because}
          </span>
        </div>
      ) : null}
    </div>
  );
}
