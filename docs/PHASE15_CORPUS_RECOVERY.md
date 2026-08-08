# Phase 15 — Bible Corpus Recovery

## 1 · Recovery result

**The six Bibles are absent from all 26 commits of the canonical repository.**
Verified exhaustively: every file ever added, across all branches, all history,
after `git fetch --unshallow`. No Bible document has ever been committed.

**But the search recovered something more immediately consequential.** The
canonical repository contains a **mature, actively-maintained constitutional
apparatus** at `docs/constitutional/` — which my earlier audit missed because the
`--depth 1` clone sat at `0b25b1c` while origin had advanced to `6c16152`.

| Document | Lines | Purpose |
|---|---|---|
| `state.md` | 194 | Every requirement in one of three terminal states, verified by measurement |
| `blocked-procedures.md` | 324 | What is blocked and what must move |
| `opportunity-ownership.md` | 239 | A formal constitutional proof |
| `deployment.md` | 183 | Deployment procedure and its traps |
| `rbac.md` | 155 | The role model as the Constitution states it |
| `completion.md` | 106 | Every required artifact with status |
| `shared-database.md` | 91 | Cross-product database boundary |

Last reconciled against repository **and live database: 2026-08-03.**

---

## 2 · The corpus, named precisely

`opportunity-ownership.md` enumerates it:

> *"Derived only from the Product Bible, Experience Bible, Brand Bible (V1 ·
> Frozen — no V2 artifact exists in the published set), Information Architecture
> Bible, UX Flows Bible, Component System Bible and Reconstruction Audit, in
> their established precedence."*

| Cited as | Document | Status |
|---|---|---|
| **PB** | Product Bible | **Senior document** |
| **XB** | Experience Bible | Subordinate to PB |
| **BB** | Brand Bible | **V1 · Frozen.** No V2 exists in the published set |
| **IA** | Information Architecture Bible | Subordinate to PB |
| **Flows** | UX Flows Bible | — |
| **CS** | Component System Bible | — |
| — | Reconstruction Audit | **Explicitly not a Bible** — "the audit is not a Bible and CS §06 is" |

**Note on Brand Bible V2.** An earlier instruction in this session listed "Brand
Bible V2" as binding law. The canonical record states no V2 artifact exists in
the published set. **That is a direct conflict and only the founder can resolve
it.**

### The precedence order is established, in the corpus's own words

`state.md` quotes **PB §12** verbatim:

> *"This is the senior document … The Brand Bible, Experience Bible, and
> Information Architecture Bible are all subordinate to it. Where any of them
> conflicts with this document, this document governs."*

So the authority chain is not a matter for inference: **PB governs; BB, XB, IA
are subordinate; the Reconstruction Audit ranks below the Bibles.**

---

## 3 · Authority chain — the answer

Of the five options posed, the evidence supports **(2): an earlier and *current*
constitutional corpus** — and more precisely:

> **The Bibles are the constitution of the canonical product. CR-01–37 is a
> second, independently derived constitution for the same product.**

Two constitutions exist. The Bibles are cited by **43 source files** and by every
`docs/constitutional/` document; they govern routes (IA), components (CS),
experience and accessibility (XB), voice (BB), journeys (Flows), and product
scope (PB). **CR-01–37 has never been applied to the canonical system at all.**

On evidence, the Bibles govern. **Whether CR-01–37 extends, refines, or
contradicts them cannot be established without the documents themselves.**

---

## 4 · What this session re-derived

Stated plainly, because it matters more than any individual finding.

| This session | Already settled in the canonical record |
|---|---|
| **C-18 / ownership question**, never resolved here | **"Ownership is presently unknowable."** Same phrase, formal proof, ratified |
| **X-1 layer collapse** in `opportunities` | *"The table conflates three constitutionally distinct categories in one row"* |
| **CR-31** — silence is not evidence against | **The Visibility Principle** — "missing evidence is never negative evidence" |
| **`api_keys` migration** authored for the old repo | Surface **deliberately removed**: *"No surface asserts an effect it lacks — proved `key_hash` is written in one place and compared in none"* |
| **Discovery engine absent** (Phase 13) | Recorded as *Impossible until specified*: *"Seeding one would be the fabricated movement PB §07 forbids"* |
| **Migrations don't match live schema** | Known, deliberate: *"two files, sixteen tables… repairing it by writing migrations from memory would be worse"* |
| **CR-11** freshness/decay | `SourceRef.lastVerifiedAt` non-optional + per-fact `DecayClass` |
| **CR-24** known/inferred | Three honestly distinct fact tiers, per-fact provenance |

**The existing apparatus is methodologically stronger than this session's.**
Its claims are verified by browser measurement, Postgres constraint violation,
and network-level bundle inspection — *"29 tab stops for 29 focusable elements"*,
*"the anon key that ships in the browser bundle, pointed at all 16 tables: 0 rows
returned"*. And it enforces a discipline this session did not:

> *"Nothing sits in a fourth state. 'In progress' is not a finding."*

It also self-corrects against its own record: *"A claim in the previous version
of this file was false… The implementation is right and this file was wrong."*

---

## 5 · The six-stage / `Hero.tsx` question

**UNKNOWN — and must not be inferred.** The founder asked whether the Bibles
intended that model as epistemic architecture or visual metaphor. Answering
requires the Bibles.

One relevant observation, offered as a pointer rather than an answer: the
governing unit in the canonical record is **the Step**, not a stage pipeline. CS
§04 requires *"the Step resolves to exactly one of four states"*, and `state.md`
records it currently resolving `unknown` with BB §03's sanctioned sentence
verbatim. The six-stage sequence in `Hero.tsx` does not appear anywhere in
`docs/constitutional/`.

That is consistent with the sequence being presentational, and **consistent is
not established.**

---

## 6 · Phase 13 findings — preserved intact

None of the following is altered by this recovery:

- Person-side architecture: **strong**
- Opportunity/discovery side: **absent**
- `Claim` requiring evidence and base rate: **strong structural guard**
- `Observation.observedAt` required: **strong structural guard**
- `BaseRate` three-state union: **strong**
- Prohibited `FactKind`s: **strong**
- Revoked permissions retained: **strong**
- **ER-05, ER-11, ER-15: failed**
- **ER-35 contradicted** by `selection_probability`
- **CR-21 contradicted** by `opportunity_score`
- **Five decisive tests: failed**, except CR-28 which remains **deferred**

The canonical record independently corroborates the layer-collapse finding.

---

## 7 · Reconciliation matrix — cannot yet be built

The founder asked for `Existing Bible rule | CR-01–37 | ER | Implementation |
Relationship`. **Column 1 cannot be populated.** Every Bible rule reaches me only
as a citation — *PB §07*, *IA §11*, *CS §02* — never as text.

Building the matrix from citations would mean reconstructing the Bibles from the
code that cites them, which is precisely what the instruction forbids. **The
matrix is blocked on the documents.**

What *can* be recorded now, as suggestive only:

| Principle | Both corpora | Relationship |
|---|---|---|
| Missing evidence ≠ negative evidence | CR-31 · Visibility Principle | **Same rule, independent derivation** — preserve both |
| Freshness required with any verified claim | CR-11 · `SourceRef.lastVerifiedAt` | Likely same |
| Known vs inferred must be distinguishable | CR-24 · three fact tiers | Likely refinement (theirs is finer) |
| Reasoning must be inspectable | CR-33 · `Claim` composition law | Likely same |
| Absence has distinct states | CR-20 · `AbsentState`/`UnknownState`/`EmptyState` | Likely refinement |

Five "likely"s and no confirmations. **That is the honest state.**

---

## 8 · The one remaining blocker

Every prior blocker has now dissolved or been superseded. What remains is single
and precise:

> **The six Bible documents — Product, Experience, Brand (V1), Information
> Architecture, UX Flows, Component System — plus the Reconstruction Audit.**

`opportunity-ownership.md` calls them **"the published set"**, which implies they
exist as a coherent, versioned collection somewhere outside this repository.

They are not in either repository, not in any commit, and not in this session.

**Until they are in hand:**

- The reconciliation matrix cannot be built
- Whether CR-01–37 supplements or conflicts with governing law is unknown
- The `Hero.tsx` question is unanswerable
- **No implementation change should be made**, because the standard is unsettled

**Recommended next action:** paste the Product Bible first. PB §12 makes it the
senior document, so its authority section alone settles the precedence question
and tells us where CR-01–37 sits relative to existing law.
