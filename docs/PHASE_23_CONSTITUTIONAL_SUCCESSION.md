# Phase 23 — Constitutional Succession & Standalone Authority

**Standalone verdict: YES.**

A new maintainer can now determine what currently governs Opportunity X entirely
from this repository. That was not true before this phase.

---

## A. Ratification received

The product owner ratified `docs/CONSTITUTION.md` as the **current governing
constitutional authority** of Opportunity X — a successor authority for the
standalone repository, explicitly *not* a recovered copy of any missing Bible.
The recovered AEON X corpus remains **historical/provenance only**; the recovered
System B plan remains **historical/retired**; the six Bibles and the
Reconstruction Audit remain **unavailable** and are not to be reconstructed.

## B. Starting authority state — measured, not assumed

93 Bible references in `src/`, 23 distinct sections, 11 files. Independently
re-derived this phase and matching Phase 22 exactly. 43 `CR-` citations, all
resolving.

## C. Citation resolution

| Outcome | Occurrences | Sections |
|---|--:|---|
| **CASE 1** — direct constitutional support, repointed | **6** | PB §07 (5 sites), CS §02 (1 site) |
| **CASE 2** — ratified as a new OXD decision | **35** | XB §05/§07/§15, BB §07/§12/A-04, IA §13/§18, CS §01/§14 |
| **CASE 3** — `REQUIRES_RATIFICATION`, left visible | **52** | PB §07 (10), IA §11 (9), CS §02 (6), XB §02 (5), XB §06 (5), CS §04 (5), XB §10 (3), BB §03 (2), IA §04 (2), PB §12 (2), BB §05/§06 (2), CS §05 (1) |
| **CASE 4** — converted to historical language | 0 | — |
| **CASE 5** — removed as unnecessary | **0** | no site was found to be merely describing itself |

**41 repointed, 52 unresolved.** The count was not driven to zero. §D of the
instruction is the reason and I want to be explicit about it: 52 remaining is the
correct answer, not a shortfall.

## D. Every repointing

**CASE 1 — direct constitutional support.** Two clauses, six sites, each
individually evidenced.

| Old | New | Requirement claimed | Why the support is direct |
|---|---|---|---|
| PB §07 — `person.ts:6`, `person.ts:139`, `person.ts:301`, `evidence.ts:17`, `claim.ts:244` | **CR-24** | Three honestly distinct fact tiers; a person can inspect what is known versus inferred | CR-24: *"The person must be able to distinguish **what Opportunity X knows about them** from **what it is inferring about them**."* Same requirement, not a neighbour. |
| CS §02 — `claim.ts:242` | **CR-21** | A confidence percentage is refused: *"a number implies precision the model doesn't have"* | CR-21: the mechanisms *"may not be collapsed into a single opaque score."* Same prohibition. |

**PB §07 and CS §02 were repointed only in part**, and that is the most important
judgement in this phase. PB §07 is cited 15 times for at least four distinct
requirements — the fact tiers, the Accountability Principle, *"it always tells me
why"*, and sharing defaults. CR-24 states the first and none of the others.
Repointing all 15 would have been the laundering the instruction forbids, at
finer grain than a whole section. Ten PB §07 sites and six CS §02 sites remain
unresolved.

**CASE 2 — repointed to a new OXD decision.** Full text in
`docs/OPPORTUNITY_X_DECISIONS.md`; each decision names what it does *not* claim.

| Old | New | Why not a CR |
|---|---|---|
| XB §07 (×7), XB §05 (×1) | **OXD-001** — the three absences are distinct | CR-20 makes returning nothing legitimate; it does not distinguish Unknown / Absent / Empty |
| BB §12 (×2) | **OXD-002** — every encoded meaning carries a non-visual carrier | CR-17 concerns degradation across device capability and bandwidth |
| IA §18 (×9), IA §13 (×2), CS §14 (×4) | **OXD-003** — product isolation holds at the data layer | CR-07 concerns interface multiplicity, not data isolation |
| CS §01 (×4), BB A-04 (×3) | **OXD-004** — no claim without provenance; provenance is inherited | both have recovered verbatim text, but a historical fragment cannot be current authority |
| BB §07 (×3), XB §15 (×1) | **OXD-005** — freshness is per fact, not a global clock | CR-11 gives *opportunity* verification an expiry; it says nothing about per-fact decay in the person model |

## E. Opportunity X decisions

Five, all `RATIFIED` by the product owner on 2026-08-22: OXD-001 the three
absences; OXD-002 non-visual carriers; OXD-003 data-layer product isolation;
OXD-004 provenance inheritance; OXD-005 per-fact freshness. Each records its
reason, affected implementation, historical predecessor, and — required by the
test — what it does **not** claim.

## F. The historical boundary

**Citation convention.** `CR-24 (hist. PB §07)` and `OXD-001 (hist. XB §7)`: the
first token is current authority, everything inside `(hist. …)` is lineage. A
bare Bible citation has no current authority behind it.

Enforced in four places: the precedence table pins AEON X as `HISTORICAL`, System
B as `RETIRED`, the Reconstruction Audit as `UNAVAILABLE`, and none may be marked
`**CURRENT**`; the decision register pins both recovered sources as `PRESENT BUT
HISTORICAL`; a repointed section may not revert to bare; and no retired System B
rule (`verification_score`, `drop < 0.6`, the stage pipeline, fuzzy dedup) may
appear in shipped source.

## G. Quotations

Every quotation in `src/` attributed to a Bible was re-checked against the
recovered corpus.

- **EXACT_HISTORICAL** — BB A-04 (both sentences) and PB §07's *"how it was
  learned…"*, verified by string match this phase, now cited as
  `OXD-004 (hist. BB A-04)` and `CR-24 (hist. PB §07)`.
- **PARTIAL_HISTORICAL** — CS §01. The Phase 22 correction is intact and was
  re-verified: the second sentence is verbatim, the first appears in no recovered
  source, and the block still labels which is which.
- **UNSUPPORTED** — none newly found. No quotation was edited to fit a source,
  and no recovered source was edited to fit the code.

## H. Implementation impact

**No behaviour changed.** 10 files touched, comments only.

| Behaviour | Old authority | New status | Implementation changed | Reason |
|---|---|---|---|---|
| Three fact tiers | PB §07 | CR-24 | **NO** | attribution corrected; the tiers already satisfy CR-24 |
| Confidence as bands, not a percentage | CS §02 | CR-21 | **NO** | already compliant |
| Three absence components | XB §07 | OXD-001 | **NO** | the decision ratifies existing behaviour |
| Glyph + label, never colour alone | BB §12 | OXD-002 | **NO** | already compliant |
| `ProductScope`, RLS isolation | IA §18/§13, CS §14 | OXD-003 | **NO** | already compliant |
| `Claim` requires evidence; provenance branded | CS §01, BB A-04 | OXD-004 | **NO** | already compliant |
| Per-fact `DecayClass` | BB §07, XB §15 | OXD-005 | **NO** | already compliant |

## I. Contradictions

**None found** between the implementation and the newly ratified authority. That
is a weak result rather than a clean one: 52 citations still name requirements no
current authority states, so there is nothing to contradict them with.

## J. Tests

`test/authority-self-containment.test.ts`, **13 assertions**. They prove: the
ratified Constitution exists and is recorded as CURRENT; every cited authority
has a record, and an emptied register fails; recovered originals carry
repository-and-commit provenance; no file is named as a Bible; every authority
family keeps a decision row; the inventory's advertised count equals the real
one; quotations are read *out of source files* and matched against the corpus; no
repointed section reverts to bare; every OXD carries owner authority, a date, and
its limits; no undefined OXD is cited; every `CR-NN` resolves; no System B rule
re-enters; and the scanner cannot be narrowed.

## K. Mutation results

| # | Mutation | Result |
|---|---|---|
| N1 | repoint reverted to bare | caught |
| N2 | AEON X corpus flipped to CURRENT in the precedence table | **ESCAPED → fixed → caught** |
| N3 | fake `CR-88` introduced | caught |
| N4 | Constitution emptied | caught |
| N5 | unresolved citation hidden from the inventory | caught |
| N6 | recovered quotation reworded | caught |
| N7 | OXD stripped of owner authority | caught |
| N8 | System B `verification_score` injected | caught |
| N9 | scanner narrowed to `src/components` | caught |
| N10 | undefined `OXD-042` cited | caught |

**N2 is the one worth reading.** The historical-boundary assertion checked the
decision register but not the precedence table — and the precedence table is the
document a reader actually consults to learn what governs. Two places stated the
boundary; one was guarded. Now both are.

Two further self-inflicted findings, both caught by the tests rather than by me:
a `Component System §01` variant without the word "Bible" that my repointing map
missed, and a `bareSections()` regex whose optional leading-authority group
matched empty at the citation's own index and so reported every repointed
citation as bare.

One process failure to record: mutation N1 used `git checkout` to restore a file,
which reverted it to HEAD and silently discarded that file's Phase 23 repoints.
Detected by the suite, re-applied by hand.

## L. Standalone verdict — **YES**

A new maintainer with only this repository can determine what governs Opportunity
X: `AUTHORITY_PRECEDENCE.md` states the model; `CONSTITUTION.md` is present and
ratified; `OPPORTUNITY_X_DECISIONS.md` records the five standalone decisions;
`AUTHORITY_INVENTORY.md` locates all 93 references with a status;
`AUTHORITY_CITATION_RECONCILIATION.md` gives per-section evidence; and
`docs/authority/` holds the recovered originals with hashes.

**Why YES and not PARTIALLY**, given 52 unresolved citations: the question is
whether a maintainer can determine what governs, not whether every historical
attribution can be traced. They can. Every unresolved citation is now labelled as
unresolved, in a register the tests keep honest. What they cannot do is read the
missing Bibles — but they no longer need to in order to know what the rules are,
because the rules that survive are stated in documents that are present.

## M. Remaining owner decisions

1. **52 occurrences across 12 sections marked `REQUIRES_RATIFICATION`.** Each
   needs the original document, a new OXD, or a finding that the behaviour needs
   no authority. Largest: PB §07's ten non-tier sites, and IA §11 (×9).
2. **The Bibles**, if they exist. Discovery would not override the ratified
   model; it would complete the historical record.
