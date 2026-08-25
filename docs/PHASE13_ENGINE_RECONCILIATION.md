# Phase 13 — Engine Reconciliation Against the Implementation

**Artifact judged:** `aeonligh/Aeon-X-Technologies-` @ `0b25b1c`, plus the live
schema via generated `database.types.ts`.
**Standard:** the 36 ER requirements, G1–G5, and the five decisive tests.
**Governance:** the implementation is evidence of what exists. It is not
authority over what must exist.

---

## 1 · Executive verdict

> **This is not yet an Engine of Discovery. It is two systems of very unequal
> maturity, joined by a name.**

**The person side is exemplary.** `core/tier0`, `core/profile`, and
`InspectionPath.tsx` are the most constitutionally rigorous code I have seen in
this project — enforcing at the *type* level several things the ER requirements
only ask for at the *behaviour* level. In places it exceeds the standard.

**The opportunity side does not exist.** Every module under
`src/lib/intelligence/` throws `NotImplementedError`. What persists instead is a
single flat `opportunities` table that collapses all three layers and contains
two structurally forbidden fields.

**The verdict is therefore not "non-compliant". It is bifurcated**, and the
strong half demonstrates that the team can build to this standard — which makes
the weak half a matter of work not yet done rather than capability absent.

### The finding that outranks the audit

The code cites a constitutional corpus **that is not in the repository**:

> Product Bible §07 · IA Bible §11, §13, §14, §18 · Component System Bible §01,
> §02, §07, §14 · Experience Bible §6, §10 · Brand Bible §07 · XB §2, §5, §6 ·
> "assumption C-02" · "The Visibility Principle"

These are cited with **section-level precision** and are *more specific* than
anything produced in this session. **The Architecture Specification almost
certainly lives in that same corpus.** Phase 13 was blocked on a document whose
siblings are quoted throughout the canonical codebase.

**And an independent convergence worth recording.** The code states:

> *"The Visibility Principle — missing evidence is never negative evidence."*

That is **CR-31**, derived independently in this session as *"silence about
something is not evidence against it."* Two separate derivations, same rule. That
is the strongest available evidence that CR-31 is correct rather than invented.

---

## 2 · Reconciliation — 36 requirements

### A · Layer separation

| ER | Verdict | Evidence |
|---|---|---|
| **ER-01** three layers | **Wrong layer** | Person side layers partially (`profile_facts` + embedded observations). Opportunity side has one table, `opportunities`, holding entity facts, verification, and pairing judgments in one row |
| **ER-02** append-only, undeletable | **Missing** (opportunity) · **Superficial** (person) | No observations table exists — `grep` returns 0. `profile_facts.observed_from` is a **`Json` column on the fact**, so observations are nested, overwritable on fact update, and not independently countable |
| **ER-03** re-encounter appends | **Missing** | No append path. `opportunities.updated_at` implies update-in-place |
| **ER-04** resolution decisions recorded | **Missing** | No entity-resolution code or table |
| **ER-05** verification entity-level, no per-user field | **CONTRADICTS** | `opportunities` carries **`owner_id` alongside `confidence_score` and `last_verified`**. Verification is a property of an owned row. Two users ⇒ two rows ⇒ two independent confidences. *Flagged high-risk in advance; fails outright* |
| **ER-06** pairing judgments separate | **CONTRADICTS** | `eligibility_verdict`, `eligibility_blocker`, `opportunity_score`, `selection_probability`, `prep_time_hours`, `priority`, `strengths`, `weaknesses` all sit on the opportunity row |
| **ER-07** six judgments independently addressable | **Cannot support** | One row, one `opportunity_score`, one `weight_profile` |

### B · Observation content

| ER | Verdict | Evidence |
|---|---|---|
| **ER-08** eight elements | **Missing** (opportunity) · **Partial** (person) | `Observation` type carries 4 of 8: `summary`, `product`, `observedAt`, lineage. No source content, no representation identity, no parser version |
| **ER-09** retrieval timestamp distinct | **Superficial** | `date_discovered` exists but is one timestamp **on the entity**, not per observation. Cannot express "seen again on date X" |
| **ER-10** parser/logic version | **Missing** | No version field in any table or type |
| **ER-11** content reconstructable, not hash-only | **Missing** | **No source content is stored anywhere.** Not a hash — nothing. *Flagged high-risk in advance; fails outright* |

### C · Retention

| ER | Verdict | Evidence |
|---|---|---|
| **ER-12** Class A permanent | **Missing** | Absent: source content, parser version, verification transitions, delivery events, eligibility-at-delivery, shown explanations, fetch failures |
| **ER-13** Class B reconstructible from A | **Cannot support** | Current state is the only record; there is no A to reconstruct from |
| **ER-14** logic versioning | **Missing** | Every judgment is therefore Class A by R-12's rule, and none is retained |
| **ER-15** evidence held, not borrowed | **CONTRADICTS** | `official_url`, `application_url`, `monitor_url` are **references only**. Reconstruction depends entirely on the source still existing. *Flagged high-risk in advance; fails outright* |
| **ER-16** told vs computed | **Missing** | `score_rationale` is a mutable text column; no record of what was shown, to whom, when |

### D · Delivery and CR-08

| ER | Verdict | Evidence |
|---|---|---|
| **ER-17** ingestion · eligibility-at-time · delivery | **Superficial** | `digest_log` has `sent_at`, `sent_for_date`, `new_opportunity_count`, `status` — **digest-level, not per (opportunity, person)**. `eligibility_verdict` is current-state, not as-at-delivery |
| **ER-18** latency measurable | **Cannot support** | Cannot compute ingestion→delivery for a given person and opportunity |

### E · Verification

| ER | Verdict | Evidence |
|---|---|---|
| **ER-19** expiry, fails closed | **Superficial** (data) · **Supports** (types) | `opportunities.last_verified` is a bare timestamp with no expiry semantics. But `tier0.SourceRef` makes **`lastVerifiedAt` non-optional and requires `decay`** — a badge without freshness is unconstructible in the type system |
| **ER-20** transitions retained | **Missing** | `status` and `confidence_score` are current-only. **CR-11's audit test cannot be run** |
| **ER-21** two scalings | **Missing** | One `confidence_score`; no separation of inherent stakes from person cost |
| **ER-22** expiry derived not read | **Partial** | `expected_next_cycle` and `recurring_programme` show derivation intent; `deadline` is stored as read from source |
| **ER-23** contradictory claims coexist | **Cannot support** | One row per opportunity. Cannot express "three sources say open, the official PDF is from 2021" |

### F · Discovery

| ER | Verdict | Evidence |
|---|---|---|
| **ER-24** five mechanisms | **Missing** | `discovery/engine.ts` → `throw new NotImplementedError("Discovery Engine")` |
| **ER-25** announcer registry | **SUPPORTS** | **`opportunity_radar` and `radar_watchlist`**: `organization`, `org_type`, `monitor_url`, `check_frequency`/`cadence`, `last_checked`, `why_monitored`, `expected_window`. **This is mechanism 5 in embryo, and it independently anticipates R-14's finding** |
| **ER-26** subdomain space | **Missing** | `monitor_url` is a single URL |
| **ER-27** first-observation provenance | **Superficial** | `source_tier` on the row and `official_sources_found` in `automation_logs` are **aggregate counts per cycle**, not per-observation official-vs-aggregator |
| **ER-28** announcement is an ordinary claim | **Cannot assess** | No claim model exists on the opportunity side |

### I · Presentation and prohibition

| ER | Verdict | Evidence |
|---|---|---|
| **ER-29** no composite score | **CONTRADICTS** | `opportunity_score` + `weight_profile` |
| **ER-30** entity vs pairing distinguishable | **Supports** (UI types) · **Contradicts** (data) | `ProvenanceChip` / `FreshnessStamp` exist; the `owner_id` row destroys the distinction underneath |
| **ER-31** known/inferred/unknown typed | **SUPPORTS — exceeds standard** | Three honestly distinct fact tiers. *"Confirmed by you"* **carries no confidence field and the type has nowhere to put one** — "a confidence score on something a person told you is the system doubting the person" |
| **ER-32** sub-threshold reach measurable | **Missing** | No impression or reach instrumentation |
| **ER-33** override excluded from learning | **Missing** | No override concept found |
| **ER-34** empty recommendation first-class | **Missing** | No empty-state model; `digest_log.new_opportunity_count` suggests digests are sent on count |
| **ER-35** no predicted-probability field | **CONTRADICTS** | **`opportunities.selection_probability` exists.** This is precisely the field ER-35 says must be unrepresentable |
| **ER-36** no capability inference | **CONTRADICTS** (opportunity) · **SUPPORTS — exceeds standard** (person) | `selection_probability`, `competitiveness`, `weaknesses` are capability judgments. But `FactKind` **deliberately omits mood, motivation, burnout, confidence, fear** — "the way to enforce a prohibition is to leave nowhere to write it. Adding a member here is a constitutional amendment, not a refactor" |

---

## 3 · G1–G5 guard audit

| Guard | Verdict | Evidence |
|---|---|---|
| **G1** low-capability reference path | **Missing** | No CI fixture found; no test directory in the repo |
| **G2** enumerable / prohibited ranking inputs | **Cannot support** | `weight_profile` is opaque; `selection_probability` is a prohibited-class field already present |
| **G3** reasoning as primary artifact | **SUPPORTS (person) — exemplary** · **Missing (opportunity)** | `Claim` requires evidence and base rate as **non-optional fields**: *"A recommendation, readiness figure, ranking or profile insight that cannot supply them cannot be constructed, and therefore cannot be rendered."* `InspectionPath` is gapless **by type construction** — a missing link is a compile error. Opportunity side has `score_rationale`, a mutable text column |
| **G4** decline monitoring | **Missing** | `automation_logs` records per-cycle counts but nothing alerts on decline |
| **G5** independent judgments + divergence | **Cannot support** | Single score; nothing can diverge |

---

## 4 · Five decisive tests

| Test | Result | Why |
|---|---|---|
| **CR-11** verification can decay | **FAIL** | No transition history. Nothing has gone verified → unverified because nothing can |
| **CR-26** higher bar for negative judgment | **FAIL** | No negative-judgment path distinct from positive |
| **CR-21** verification and ranking can disagree | **FAIL** | One score; structurally impossible |
| **CR-08** ingestion + delivery at required granularity | **FAIL** | `digest_log` is digest-level; not per (opportunity, eligible person) |
| **CR-28** economic survival of silence | **DEFERRED** | R-05 unresolved. **Not passed** |

---

## 5 · Three-layer integrity

| Collapse | Present? | Location |
|---|---|---|
| Observation vs Entity | **YES** | No observations table; `date_discovered` is a column on the entity |
| Entity verification vs person inference | **YES** | `owner_id` + `confidence_score` on the same row |
| Verification vs ranking | **YES** | `confidence_score` and `opportunity_score` on one row, no independent evidence |
| Ranking vs recommendation | **YES** | `priority` and `opportunity_score` undifferentiated |
| Recommendation vs action | **YES** | `application_status` and `stage` on the opportunity row |

**Person side:** partial layering — facts are separate rows, permissions are
separate rows and **revocations are kept not deleted**, but observations are
embedded JSON rather than an independent layer.

---

## 6 · Constitutional contradictions

| # | Contradiction | Rule |
|---|---|---|
| **X-1** | `opportunities.owner_id` makes verification person-relative | **CR-30**, ER-05 |
| **X-2** | `selection_probability` stores predicted success | **CR-02, CR-09, CR-32**, ER-35 |
| **X-3** | `opportunity_score` is a composite standing for several judgments | **CR-21**, ER-29 |
| **X-4** | No source content held; reconstruction depends on the source persisting | **CR-19 logic**, ER-15 |
| **X-5** | No verification transitions ⇒ CR-11's decay is unauditable | **CR-11, CR-34** |
| **X-6** | Update-in-place with no observation layer | **CR-36, CR-37** |
| **X-7** | Implemented pipeline is *Discovery → Verification → Classification → Deduplication → Scoring → Recommendation*, derived from marketing copy in `Hero.tsx` — **no Risk, no Action/Preparation** | Ratified six mechanisms |

**X-7 deserves emphasis.** `shared/types.ts` states the pipeline shape "echoes
the six-stage pipeline narrative already written into
`src/components/home/Hero.tsx`." **The engine's stage model was derived from the
homepage animation.** That is Principle Zero inverted at the source.

---

## 7 · Compliance-shaped failures

| Risk | Where |
|---|---|
| Vocabulary without behaviour | `src/lib/intelligence/` exports 14 namespaces; all throw |
| Verification as static badge | `last_verified` with no expiry — *the exact failure predicted in the card reconciliation* |
| Provenance as aggregate | `automation_logs` counts sources; cannot attribute any single opportunity |
| Rationale as free text | `score_rationale` satisfies "explanation exists" while being unstructured and mutable |
| Radar as list | `opportunity_radar` has `last_checked` but no decline alerting |

---

## 8 · Critical missing capabilities

1. The **entire discovery pipeline** — every stage throws
2. **The observation layer** for opportunities — nothing is recorded about claims
3. **Entity resolution** — no code, no table, no decisions
4. **Verification transition history**
5. **Per-person delivery events** — CR-08 unadjudicable
6. **Logic and parser versioning**
7. **Source content retention**

---

## 9 · Genuinely strong — do not disturb

1. **`core/tier0`** — trust primitives as data. `Claim` cannot be constructed without evidence and base rate. `BaseRate` distinguishes *known* / *unknown* / *uncontested* so silence cannot imply "uncontested". Exceeds ER-29 and CR-33.
2. **`core/profile`** — three honestly distinct tiers; per-fact decay; `howLearned` required on every tier; permissions default to empty with no "all"; **revoked permissions kept, not deleted**.
3. **`Observation.observedAt` required** — *"a non-event has no timestamp"*, so "they never opened a research listing" is **unwritable**. CR-31 made structurally unrepresentable.
4. **`FactKind` omits internal states** by design.
5. **`InspectionPath`** — Finding → Evidence → Source → Observation → Permission, gapless by type construction, four levels in one overlay.
6. **Two enforcement layers** — TypeScript plus Postgres CHECK constraints, explicitly because "convention will not hold".
7. **`opportunity_radar` / `radar_watchlist`** — mechanism 5, anticipated independently.

**These should be the template for the opportunity side, not replaced by it.**

---

## 10 · Required changes, ordered by dependency

| # | Change | Unblocks |
|---|---|---|
| **1** | Introduce an **observations table** — append-only, undeletable, with source content, retrieval timestamp, source identity, representation identity, parser version | ER-01/02/03/08/09/10/11; every downstream layer |
| **2** | **Split `opportunities`** into Entity (shared truth) and Pairing (per-person judgment). Remove `owner_id` from the entity | X-1, ER-05/06/07 |
| **3** | **Drop `selection_probability`**; make it unrepresentable | X-2, ER-35 |
| **4** | **Decompose `opportunity_score`** into independently addressable judgments with their own evidence | X-3, ER-29, G5 |
| **5** | **Verification transitions table** with expiry; fail closed | X-5, CR-11, ER-19/20 |
| **6** | **Delivery events** per (opportunity, person) with eligibility-as-at | CR-08, ER-17/18 |
| **7** | **Retain source content** at observation time | X-4, ER-15 |
| **8** | Extend `radar` to subdomain-space monitoring; record per-observation provenance | ER-26/27 |
| **9** | Implement the discovery mechanisms behind the existing stubs | ER-24 |
| **10** | **Re-derive the stage model from the Constitution, not from `Hero.tsx`** | X-7 |

Changes 1 and 2 are prerequisites for everything else.

---

## 11 · Test before any implementation change

1. **Confirm `opportunities.owner_id` semantics against live data** — is it single-tenant prototype scaffolding, or is per-user duplication already happening? The table comment says *"single-tenant prototype pending an owner backfill"*, which suggests the former. **Row counts per opportunity per owner settle it.**
2. **Establish whether `profile_facts.observed_from` JSON is ever overwritten** — if append-only in practice, the person side is closer to ER-02 than the schema implies.
3. **Verify the Postgres CHECK constraints** referenced by `profile/types.ts` — the second enforcement layer is claimed but unread; the repo holds only one migration while the live database has fourteen.
4. **Run the CR-11 query on live data**: has any opportunity ever changed `status` or `confidence_score` downward? Predicted zero.

---

## 12 · Next dependency

**Not the Architecture Specification.** The corpus the code cites — Product
Bible, IA Bible, Component System Bible, Experience Bible, Brand Bible, XB — is
the real missing artifact, and it is **more specific than anything produced in
this session.** Every section reference in `tier0/types.ts` and `profile/types.ts`
points into documents that exist somewhere and govern code already shipped.

**Retrieving that corpus outranks every change above**, for two reasons:

1. The Architecture Specification is probably in it.
2. **This session may have spent Phases 1–14 re-deriving a constitution that
   already existed** — and where the two disagree, we currently have no way to
   know which governs.

The Visibility Principle / CR-31 convergence suggests the two are compatible.
That is one data point, not a reconciliation.
