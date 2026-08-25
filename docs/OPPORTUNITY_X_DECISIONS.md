# Opportunity X decisions

Explicit standalone decisions taken after constitutional succession
(Phase 23, 2026-08-22). **This file begins a new decision history.** It is not a
reconstruction of the missing Bibles and must never be used as one: every entry
below is a decision made now, by the product owner, about what Opportunity X
does going forward. Where a decision has a historical predecessor the
predecessor is named — as lineage, not as authority.

Each decision exists because the behaviour is intentional, is load-bearing in
the product today, and is **not stated by `docs/CONSTITUTION.md`**. Where the
Constitution does state a requirement, the citation was repointed to it instead
and no decision was created — see `AUTHORITY_CITATION_RECONCILIATION.md`.

**Citation convention.** In source, `OXD-00N (historically XB §07)` means: OXD-00N
is the current authority; the Bible section is the lineage. A bare Bible citation
with no current authority beside it is an unresolved claim, and
`test/authority-self-containment.test.ts` enforces the distinction.

---

## OXD-001 — The three absences are distinct states

**Status:** RATIFIED · **Authority:** Product owner · **Date:** 2026-08-22

**Decision.** Opportunity X distinguishes three absences and may never collapse
them: **Unknown** (the system could not see), **Absent** (a search ran and found
nothing), **Empty** (nothing yet, and that is expected). Each has its own
component and its own wording. A failure to look may never render as a finding.

**Reason.** This is the single most load-bearing epistemic rule in the product.
"I looked and found nothing" is a claim about the world and a reason for someone
to stop looking; "I could not look" is a statement about the system. Conflating
them tells a person there are no scholarships for them on the strength of a
crawler that never ran.

**Affected implementation.** `components/ui/absence/{UnknownState,AbsentState,EmptyState}.tsx`,
`lib/opportunity/surface/service.ts` (the `searchedAt === null` guard),
`lib/opportunity/foundation/next-action.ts`, `test/never-looked.test.ts`,
`test/state-system.test.ts`.

**Historical predecessor.** Experience Bible §07 and §05, cited 8 times in `src/`.
Original text unavailable.

**What this does NOT claim.** It does not claim to reproduce XB §07. CR-20 says
returning nothing is a legitimate first-class output — related, and deliberately
not the same rule. CR-20 does not distinguish the three absences, which is
precisely why this decision was needed rather than a repoint.

---

## OXD-002 — Every encoded meaning carries a non-visual carrier

**Status:** RATIFIED · **Authority:** Product owner · **Date:** 2026-08-22

**Decision.** Where Opportunity X encodes meaning in colour, weight, position or
iconography, that meaning must also be available non-visually — as text, a
label, or an accessible name. Tier is conveyed by glyph *and* label, never by
colour alone.

**Reason.** A misread on a provenance tier or a verification verdict costs
someone a real decision. Colour alone fails for roughly one in twelve men, every
screen-reader user, and anyone in bright sunlight on a phone.

**Affected implementation.** `components/ui/ProvenanceChip.tsx`,
`components/opportunity/VerificationSeal.tsx`, `components/ui/FreshnessStamp.tsx`.

**Historical predecessor.** Brand Bible §12, cited twice. Original text unavailable.

**What this does NOT claim.** CR-17 ("Beauty must never reduce access") is about
degrading gracefully across device capability, bandwidth and hardware. That is a
neighbouring concern, not this requirement, and repointing to it would have been
the similarity trap the succession instruction forbids.

---

## OXD-003 — Product isolation holds at the data layer

**Status:** RATIFIED · **Authority:** Product owner · **Date:** 2026-08-22

**Decision.** Which product may read which fact is enforced in the database and
in the type system, not by convention in application code. A primitive required
across products ships as one implementation, not as a copy per product.

**Reason.** Opportunity X and AEON X are sibling products over related data.
Convention does not survive four teams and a year; a copied primitive becomes
four different trust models. Enforcement has to sit where it cannot be forgotten.

**Affected implementation.** `lib/opportunity/foundation/person.ts` (`ProductScope`),
`lib/opportunity/foundation/claim.ts`, RLS policies in `supabase/migrations/`,
`test/standalone.test.ts`.

**Historical predecessor.** IA Bible §18 (×9), §13 (×2), Component System Bible
§14 (×4). Original text unavailable.

**What this does NOT claim.** No constitutional clause states it. CR-07 ("Many
interfaces, one intelligence") concerns interface multiplicity, not data-layer
isolation.

---

## OXD-004 — No claim without provenance, and provenance is inherited

**Status:** RATIFIED · **Authority:** Product owner · **Date:** 2026-08-22

**Decision.** Anything Opportunity X asserts carries the evidence behind it as a
required field. A claim derived from a person's own statement inherits and
displays that statement's provenance; it may not declare its own, and confidence
may never be laundered into something the system appears to have verified itself.

**Reason.** A statement without provenance is not checkable, and an unchecked
statement presented as a finding is the failure this product exists to prevent.
Inheritance rather than declaration is what stops a derived assessment quietly
acquiring more authority than the fact under it.

**Affected implementation.** `lib/opportunity/foundation/claim.ts` (`Claim`
requires `evidence` and `baseRate`; the `EVIDENCE_PROVENANCE_CHECKED` brand),
`lib/opportunity/foundation/evidence.ts` (`evidenceFromFact` derives provenance
from `fact.tier`).

**Historical predecessor.** Component System Bible §01 (×4) and Brand Bible A-04
(×3). **Both have recovered verbatim text** — see `AUTHORITY_INVENTORY.md`. This
decision does not replace that text; it makes the requirement current authority,
which a historical fragment cannot be.

**What this does NOT claim.** It does not restate CS §01 or A-04, and it does not
claim their wording. The recovered fragments remain historical evidence of what
was said, filed separately.

---

## OXD-005 — Freshness is a property of the fact, not a global clock

**Status:** RATIFIED · **Authority:** Product owner · **Date:** 2026-08-22

**Decision.** Each fact and each source carries its own decay class and its own
last-confirmed time. There is no single staleness threshold. A clearly labelled
stale answer is preferred to a spinner that hides one.

**Reason.** A degree earned in 2019 does not decay; a funding figure from last
year's intake does. One global clock is wrong for both.

**Affected implementation.** `lib/opportunity/foundation/person.ts` (`DecayClass`),
`components/ui/FreshnessStamp.tsx`, `SourceRef.lastVerifiedAt` (non-optional).

**Historical predecessor.** Brand Bible §07 (×3), Experience Bible §15 (×1).
Original text unavailable.

**What this does NOT claim.** CR-11 makes verification continuous and gives
verified status an expiry, for *opportunities*. It does not state per-fact decay
for the person model, so this is a decision rather than a repoint.
