import { Link } from "@tanstack/react-router";
import { EntityFact } from "./EntityFact";
import { VerificationSeal } from "./VerificationSeal";
import { PairingInference } from "./PairingInference";
import { InterestedControl } from "./InterestedControl";
import type { OpportunityCard as Card } from "@/lib/opportunity/surface/card";

/**
 * The opportunity card.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHAT THIS IS NOT
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Not a row from a table. The card holds no data of its own — every value on it
 * is projected from a layer that can account for itself, and there is no field
 * here that some component could set directly.
 *
 * Not a conversion unit. It carries enough to decide whether to look further,
 * and the thing it leads to is an inspection surface rather than a form. The
 * origin story is not that someone failed to convert; it is that someone found
 * out too late and could not tell what was real.
 *
 * ── The three regions, in order, and why that order ───────────────────────
 *
 *   1. What it is        — entity facts. Checkable against a source.
 *   2. Whether it is real — verification, with its date and its expiry.
 *   3. What I think      — pairing inference, in the system's own voice.
 *
 * Facts before opinion, and the opinion visibly separated. Reverse the order
 * and the reader meets Opportunity X's view of them before they meet the thing itself,
 * which is how a recommendation engine teaches people to stop checking.
 *
 * The person's own declaration comes last, because it is the only thing on the
 * card they write and it should not read as the card's purpose.
 *
 * ── Deliberately absent ───────────────────────────────────────────────────
 *
 * No score, no percentage, no probability of winning, no "N people applied", no
 * urgency device counting down. None of them exists on the projection, so none
 * of them can be rendered here without inventing it.
 */
export function OpportunityCard({
  card,
  /**
   * Whether the evidence behind this card is live or a fixture.
   *
   * A prop rather than an assumption, and it renders visibly. A demo card that
   * looked identical to a real one would be the fabricated movement the
   * constitution forbids by name — and the person could not tell.
   */
  evidence = "live",
  /**
   * Where "What this involves" goes.
   *
   * A prop rather than a template, because a fixture card and a live card
   * inspect in different places. Hardcoding `/opportunity/[id]` sent every
   * preview card to a route that resolves `unknown` for a fixture id — a dead
   * end shipped in the surface's first commit, and precisely the kind a route
   * list cannot reveal.
   */
  inspectHref,
  /** Whether a declaration can actually be kept. Read before it is offered. */
  canPersistPursuit = false,
  className = "",
}: {
  card: Card;
  evidence?: "live" | "fixture";
  inspectHref?: string;
  canPersistPursuit?: boolean;
  className?: string;
}) {
  const inspect = inspectHref ?? `/opportunity/${card.entityId}`;

  return (
    <article className={`flex flex-col gap-6 rounded-lg border border-border p-6 ${className}`}>
      {evidence === "fixture" ? (
        <p className="rounded-md border border-border bg-surface/40 px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-text-s">
          Fixture — nothing here was retrieved from a real source
        </p>
      ) : null}

      {/* ── 1 · What it is ─────────────────────────────────────────────── */}
      <header className="flex flex-col gap-2">
        <h2 className="max-w-[24ch] text-2xl font-black leading-[1.1] tracking-tighter text-foreground">
          {card.shown.statement}
        </h2>
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-s">
          {card.shown.timing}
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        <EntityFact label="Offered by" view={card.organiser} />
        <EntityFact label="Closes" view={card.deadline} />
        <EntityFact label="Funding" view={card.funding} />
        <EntityFact label="Where" view={card.location} />
      </div>

      {/* ── 2 · Whether it is real ─────────────────────────────────────── */}
      <VerificationSeal resolution={card.verification} />

      {/* ── 3 · What Opportunity X thinks it means for this person ────────────── */}
      <PairingInference pairing={card.pairing} whySurfaced={card.shown.whySurfaced} />

      {/*
        Everything unknown or unreconciled, on the card rather than behind the
        inspection link. Verification must never cost more than acceptance, and
        a caveat that requires a click has been priced above the action beside it.
      */}
      {card.shown.uncertainties.length > 0 ? (
        <section aria-label="What is not settled" className="flex flex-col gap-1.5">
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
            Not settled
          </h3>
          <ul className="flex flex-col gap-1">
            {card.shown.uncertainties.map((line) => (
              <li key={line} className="max-w-[58ch] text-[14px] leading-relaxed text-text-s">
                {line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/*
        What their declaration changes, when they have made one.

        Above the control rather than below it, because it is the consequence of
        the thing and not a caption on the buttons. Absent when undeclared —
        there is nothing to say about a position nobody has taken, and saying
        something anyway is how a product starts nudging.
      */}
      {card.stance.declaration !== "undeclared" ? (
        <section
          aria-label="The declaration, and what follows from it"
          className="flex flex-col gap-2"
        >
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s">
            {/* "You" is false on a fixture: the position belongs to the
                scenario, not to whoever is reading the page. */}
            {evidence === "fixture" ? "Since they said that" : "Since you said that"}
          </h3>
          <p className="max-w-[58ch] text-[15px] leading-relaxed text-foreground">
            {card.stance.statement}
          </p>

          {/*
            What Opportunity X does not know, when the person has declared interest and
            something stands in the way. Not a preparation checklist — the corpus
            defines no preparation model, and inventing "gather your transcripts"
            would present a requirement nobody derived with the same authority as
            a deadline three sources confirmed. Every line here traces to
            evidence, or to its absence.
          */}
          {card.stance.next.kind === "resolve-unknowns" ? (
            <ul className="mt-1 flex flex-col gap-1">
              {card.stance.next.outstanding.map((item) => (
                <li
                  key={item.because}
                  className="max-w-[58ch] text-[14px] leading-relaxed text-text-s"
                >
                  {item.because}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <InterestedControl
        entityId={card.entityId}
        pursuit={card.pursuit}
        canPersist={canPersistPursuit}
        evidence={evidence}
      />

      <div className="flex flex-wrap items-center gap-3">
        {/*
          Inspection first, and styled as the primary path. The terminal action
          is available and is not what the card is for.
        */}
        <Link
          to={inspect}
          className="rounded-full bg-accent px-6 py-3 text-xs font-bold uppercase tracking-widest text-background transition-opacity duration-[120ms] active:opacity-90"
        >
          What this involves
        </Link>

        {card.action ? (
          <a
            href={card.action.href}
            className="rounded-full border border-border px-6 py-3 text-xs font-bold uppercase tracking-widest text-text-s transition-colors duration-[120ms] hover:border-accent hover:text-accent"
          >
            {card.action.verb}
          </a>
        ) : (
          /*
            No single place to send someone. Stated rather than hidden: an absent
            button with no explanation reads as a broken card, and the reason —
            sources pointing different ways — is exactly what the person needs.
          */
          <span className="max-w-[42ch] text-[14px] leading-relaxed text-text-s">
            Sources disagree about where to go, so I won&rsquo;t pick one for you.
          </span>
        )}
      </div>
    </article>
  );
}
