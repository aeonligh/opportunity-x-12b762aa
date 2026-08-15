import type { DecayClass, ProductScope, ProfileFact } from "@/lib/opportunity/foundation/person";
import type { Evidence, SourceRef, UncheckedEvidence } from "./claim";

/**
 * Building Evidence from the Profile fact it rests on.
 *
 * ── CONSTITUTIONAL SPECIFICATION ──────────────────────────────────────────
 *
 * E1  Brand Bible A-04, verbatim: "Ownership says the user owns the truth of
 *     their life. Visibility says the system speaks with certainty only about
 *     what it observed. Eligibility claims rest on unverified testimony."
 *     Resolution: "self-reported facts are ✓ Confirmed by You, and any claim
 *     derived from them inherits and displays that provenance. Confidence is
 *     never laundered into something the system appears to have verified
 *     itself."
 *
 * E2  PB §07 — every entry shows "how it was learned, its confidence, when it
 *     was last updated, and which products are allowed to use it."
 *
 * E3  IA §13, §18 — product isolation is "the hardest engineering constraint in
 *     the system", and must hold at the data layer "because convention will not
 *     hold."
 *
 * E4  CS §01 — the composition law: a statement without provenance is a
 *     violation, not a component.
 *
 * ── Why this function exists at all ───────────────────────────────────────
 *
 * `ProfileFact.tier` and `Evidence.provenance` are two unions over the same
 * three values, and until now nothing connected them. A caller could construct
 * evidence declaring `provenance: "confirmed"` while resting on a fact whose
 * tier was `learned` — presenting a behavioural guess as something the person
 * stated. That is precisely the laundering E1 forbids by name.
 *
 * No such call site existed yet, so nothing had been laundered. The defect was
 * that the type permitted it: the constitution's rule lived in prose, and CS §14
 * and IA §18 both say prose does not hold. Provenance is now *computed from* the
 * fact rather than supplied beside it, so the mismatch is unrepresentable rather
 * than merely discouraged.
 *
 * `provenance`, `confidence`, `lastConfirmedAt`, `decay`, `factId` and
 * `observations` are all inherited. The caller supplies only what is genuinely
 * about the claim and not about the fact: the one-sentence summary, the source,
 * and the product context the claim is being made in.
 *
 * ── Why it returns a defect instead of throwing ───────────────────────────
 *
 * The same discipline `toFact` uses in the Profile service. A refusal that
 * carries its reason can be surfaced; an exception at render time becomes an
 * `unknown` state that blames the system for something specific and knowable.
 * Nothing is defaulted, so a caller cannot ignore the failure and ship a claim
 * anyway.
 */

export type EvidenceResult =
  | { evidence: Evidence }
  /** Refused, with the constitutional reason. Never rendered as a claim. */
  | { defect: { factId: string; reason: string } };

/**
 * The one place Evidence is minted.
 *
 * `Evidence` carries a private brand that no other module can satisfy, so this
 * assertion is the only door. It is deliberately a single expression in a single
 * file: the assertion is safe exactly because the two callers below compute
 * `provenance` from `fact.tier` rather than accepting it, and keeping the cast
 * here means that reasoning has one place to be checked rather than being
 * re-argued at every future call site.
 *
 * Widening this — exporting it, or taking `provenance` as a parameter — reopens
 * the laundering Brand Bible A-04 forbids.
 */
function minted(evidence: UncheckedEvidence): Evidence {
  return evidence as Evidence;
}

export function evidenceFromFact(
  fact: ProfileFact,
  claim: {
    /** The inline sentence. About the claim, not the fact — so not inherited. */
    summary: string;
    /** Depth 3, the original. Also about the claim. */
    source: SourceRef;
    /** The product context this claim is being made in. */
    product: ProductScope;
  },
): EvidenceResult {
  /*
    E3 — product isolation, checked before anything is built.

    A fact is usable in the product it was learned in by definition; anywhere
    else it needs a granted permission. Checking here means a cross-product claim
    cannot be constructed without consent, rather than being constructed and then
    hopefully filtered on the way out. IA §18 calls this boundary the hardest
    constraint in the system and says convention will not hold it.

    A revoked permission is a permission row, not an absent one, so the state is
    read rather than the presence of a row.
  */
  if (claim.product !== fact.learnedIn) {
    const granted = fact.permissions.some(
      (p) => p.product === claim.product && p.state === "granted",
    );
    if (!granted) {
      return {
        defect: {
          factId: fact.id,
          reason: `Fact was learned in ${fact.learnedIn} and has no granted permission for ${claim.product}.`,
        },
      };
    }
  }

  const base = {
    summary: claim.summary,
    source: claim.source,
    product: claim.product,
    /* E2 — inherited, so a claim can never look fresher than what it rests on. */
    lastConfirmedAt: fact.lastConfirmedAt,
    decay: fact.decay as DecayClass,
    /* CS §01 / IA §11 — carrying the id is what lets the inspection path
       continue from Observation into Permission, landing "directly on the fact
       that produced it". */
    factId: fact.id,
  };

  /*
    E1 — provenance is the fact's tier. Not a parameter, not a default, and not
    overridable: there is no argument a caller could pass to change it.
  */
  if (fact.tier === "confirmed") {
    return {
      evidence: minted({
        ...base,
        provenance: "confirmed",
        /*
          A confirmed fact carries no confidence and the Evidence variant has
          nowhere to put one — a confidence score on something a person stated is
          the system doubting the person (PB §07).

          Observations are its history, not its basis: a graduated fact keeps the
          observations it was inferred from, and `?? []` covers the ordinary case
          where the person simply stated it and nothing was observed.
        */
        observations: fact.observedFrom ?? [],
      }),
    };
  }

  return {
    evidence: minted({
      ...base,
      provenance: fact.tier,
      /* Inherited, never recomputed. E1: "Confidence is never laundered." */
      confidence: fact.confidence,
      observations: fact.observedFrom,
    }),
  };
}

/**
 * Building Evidence from something the person declared about one opportunity.
 *
 * ── Why this is not a widening of the laundering rule ─────────────────────
 *
 * `evidenceFromFact` exists because provenance must be *computed* rather than
 * supplied. The same holds here, and more simply: a declaration carries
 * `declaredBy: "person"` as a literal with one member, so its tier is not a
 * parameter and cannot be anything but `confirmed`. There is no argument a
 * caller could pass to change it.
 *
 * The `confirmed` variant of Evidence was designed for exactly this shape. Its
 * own comment says `observations` is "empty only for a `confirmed` tier, where
 * the person's own statement is the origin and there is nothing observed behind
 * it" — which is a description of a declaration. Nothing is being stretched to
 * fit; the case was anticipated and had no constructor until now.
 *
 * ── Why a declaration may ground a step at all ────────────────────────────
 *
 * The composition law refuses a claim that cannot be checked. "You told me you
 * were interested in this, on the tenth of August" is checkable: the person
 * either said it or did not, they can see when, and they can withdraw it. That
 * is a stronger provenance than most inferences the system makes.
 *
 * What it does *not* do is upgrade any judgment. A step grounded this way still
 * carries whatever eligibility, fit and verification the engine actually
 * computed, and this function has no access to any of them.
 */
export function evidenceFromDeclaration(
  declaration: {
    entityId: string;
    declaredAt: string;
    readonly declaredBy: "person";
  },
  claim: {
    /** The inline sentence. About what the person said, not about the entity. */
    summary: string;
    source: SourceRef;
    product: ProductScope;
  },
): Evidence {
  return minted({
    summary: claim.summary,
    source: claim.source,
    product: claim.product,
    /*
      Their own statement is the origin, so freshness is when they made it. A
      declaration does not decay the way an observed fact does — it stays true
      that they said it — but it can be withdrawn, which is the person's own
      correction rather than a decay the system applies.
    */
    lastConfirmedAt: declaration.declaredAt,
    decay: "monotonic",
    provenance: "confirmed",
    /*
      Nothing observed sits behind it, and the type has nowhere to put a
      confidence — a confidence score on something a person stated is the system
      doubting the person.
    */
    observations: [],
  });
}
