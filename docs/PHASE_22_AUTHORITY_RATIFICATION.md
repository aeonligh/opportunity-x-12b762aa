# Phase 22 — Authority Ratification & Standalone Independence

**Verdict: PARTIALLY standalone.** One dependency remains, it is precisely
located, and only the founder can close it.

Nothing was ratified, because ratification is not mine to perform. What changed
is that the repository now states its own authority position accurately and
cannot drift from it silently.

---

## A. Starting authority state

Phase 21C left the repository with: recovered AEON X constitutional corpus (7
docs, verbatim), the recovered System B plan, two Bible fragments, four
authority registers, and a self-containment test with three assertions. It
reported **111 citations across 25 sections, 2 with recovered text**.

Both of those numbers were wrong. See C.

## B. Source verification

Physically inspected, not summarised: `docs/CONSTITUTION.md`; all seven files in
`docs/authority/ORIGINAL_SOURCES/aeon-x-constitutional/`;
`ORIGINAL_SOURCES/lovable-system-b/SYSTEM_B_PLAN.md`; all four authority
registers; every `src/` file carrying a citation.

## C. Citation inventory — two corrections to Phase 21C

**Correction 1 — the count.** Phase 21C's 111 summed `src` + `docs` + `scripts`
+ `test`, which mixes three unlike things. Re-derived:

| Where | Occurrences | What it is |
|---|--:|---|
| **`src/`** | **93** | **This repository's own normative claims** |
| `docs/authority/ORIGINAL_SOURCES/` | 138 | AEON X's citations, preserved verbatim — not claims made here |
| `docs/AUTHORITY_*.md` | 81 | the registers, enumerating |
| `docs/PHASE*.md` | 28 | derived records |
| `test/`, `scripts/` | 1 | — |
| **Total** | **343** | |

The number that governs the phase is **93, across 23 distinct sections**.

**Correction 2 — the coverage, and this one matters.** Phase 21C reported 2
sections with recovered text. The real figure is **4**, and the difference is
not cosmetic: **Product Bible §07, the most-cited section in the product at 15
occurrences across 9 files, does have recovered verbatim text.** Phase 21C
recorded it as MISSING.

The cause was mine and worth naming. Phase 21C's first extraction paired each
citation with the nearest quotation and produced obvious nonsense; I tightened
it and published the survivors. The tightening was too aggressive and discarded
genuine fragments along with the false pairings. Re-extracted here by requiring
the citation and the opening quotation mark to fall in the same sentence.

| | Sections | Occurrences |
|---|--:|--:|
| Recovered text exists | **4** | 23 |
| No recovered text | **19** | 70 |

Recovered: `Product Bible §07`, `Brand Bible A-04`, `Component System Bible §01`,
`IA Bible §08`.

## D. Classification

| Status | Sections | Notes |
|---|--:|---|
| `VERIFIED_HISTORICAL` | 4 | text recovered inside a document preserved for provenance |
| `MISSING_AUTHORITY` | 19 | no text in any accessible source |
| `VERIFIED_CURRENT` | **0** | would require a governing document present here; no Bible citation qualifies |
| `MIS-CITED` | 0 | none found |
| `RETIRED` / `REPOINTED` | **0** | nothing repointed — see F |

The absence of `VERIFIED_CURRENT` is the honest result. Even the four recovered
sections are historical: their text survives inside AEON X's corpus, which
governs AEON X. A fragment proves what a rule said; it does not make the
document present, and it does not make it this product's law.

## E. Missing authority

19 sections, 70 occurrences. The largest dependencies: `IA Bible §11` (×9),
`IA Bible §18` (×9), `Experience Bible §07` (×7), `Component System Bible §02`
(×7), `Experience Bible §02` (×5), `Experience Bible §06` (×5), `Component
System Bible §04` (×5). Full list in `AUTHORITY_INVENTORY.md`.

## F. Ratification decisions — none taken, and why

**No citation was repointed.** Section 6 permits replacement only under explicit
ratification, direct textual support, or conversion to historical language. The
first has not happened. The second does not hold: `docs/CONSTITUTION.md` was
written independently and does not restate the Bible sections the code cites.
Repointing 70 citations at CR clauses that sound related is the authority
laundering this phase exists to prevent, so the decision is recorded and
deferred in `AUTHORITY_DECISIONS.md` rather than taken.

## G. Precedence

Rewritten as a table with per-relationship status —
`ESTABLISHED` / `RATIFIED` / `UNKNOWN` / `HISTORICAL_ONLY` — so no ordering hides
in prose.

`ESTABLISHED`: PB over BB, XB and IA (PB §12, verbatim); Bibles over the
Reconstruction Audit. `UNKNOWN`: PB against Flows and CS; Flows against CS; and
**`docs/CONSTITUTION.md` against any Bible** — recorded as a live unresolved
condition, because the product is governed in practice by CR-01–37 and on paper
by the Product Bible, and nothing ranks them.

## H. Unsupported quotation audit

48 distinct prose quotations in `src/` are attributed to a Bible. Each was
normalised and searched for in the recovered corpus.

**One real defect found.** `claim.ts` presented Component System Bible §01 as a
single two-sentence quotation:

- *"a statement without provenance is not a component in this system — it is a
  violation."* — **exact**, verbatim in `opportunity-ownership.md:117`.
- *"no component may state a claim without composing the Tier 0 primitives that
  make it checkable."* — **unsupported**. Appears in no recovered source.

A partial exact quote presented as a whole one. Corrected by splitting the two
and labelling each. The unsupported sentence was **kept**, because it records
what the code was built to satisfy and deleting it would destroy provenance
rather than correct it — it is simply no longer presented as a quotation from a
readable document. The recovered source was not edited to match the code.

`evidence.ts`'s two A-04 quotations and its PB §07 quotation are **exact**,
re-verified this phase.

## I. Historical versus normative language

One file changed: `src/lib/opportunity/foundation/claim.ts`, the case above. No
other normative sentence was rewritten. In particular the 70 unresolved
citations were **left in place** — they are accurate records of where a rule came
from, and rewriting 70 comments to hedge would be a large, unreviewable diff
that adds no information the registers do not already carry.

## J. AEON X independence

Every reference classified. **No active dependency found.**

| Location | Count | Classification |
|---|--:|---|
| `src/` | 1 | **historical reference** — a comment recording that the `aeon-x:` entity namespace was removed |
| `test/standalone.test.ts` | 4 | **active guard** — fails if AEON X vocabulary reappears |
| `test/authority-self-containment.test.ts` | 3 | **required provenance** |
| `scripts/verify-artifact.sh` | 2 | **active guard** — fails if "Powered by AEON X" ships |
| `supabase/` | 0 | — |
| `docs/authority/ORIGINAL_SOURCES/` | 52 | **required provenance** — verbatim recovered text |
| `docs/` (other) | 139 | **historical reference** / **stale documentation**, all in superseded sections already marked as such |

Runtime configuration points at `anfiojmbgonrtympzjch` — Opportunity X's own
Supabase project. Nothing points at AEON X infrastructure. Nothing was removed:
the goal is independence, not amnesia.

## K. Self-containment tests

`test/authority-self-containment.test.ts`, now **8 assertions** covering all
eight failure modes the phase named. What they actually prove:

1. every cited authority has a record — fails on an *emptied* register, not just a missing file
2. recovered originals exist and provenance names repository and commit
3. no file is named as a Bible, and the fragments file keeps its status label
4. every authority family keeps a row in the decision register, and the register keeps stating whether repointing occurred
5. the inventory's advertised section count equals the real one, in both directions
6. quotations are read **out of the source files** and matched against the recovered corpus
7. historical sources stay classified as historical
8. every `CR-NN` cited anywhere resolves in `docs/CONSTITUTION.md` — **41 occurrences, 13 clauses, zero dangling**

## L. Mutation testing

Eleven mutations. **Ten caught on the first attempt; one escaped and the
assertion was rebuilt.**

| # | Mutation | Result |
|---|---|---|
| 1 | citation with no record | caught |
| 2 | inventory emptied, file kept | caught |
| 3 | provenance loses its source commit | caught |
| 4 | reconstruction filed under `ORIGINAL_SOURCES/` | caught |
| 5 | an authority family dropped from the register | caught |
| 6 | the "nothing was repointed" statement removed | caught |
| 7 | new citation added, inventory count now stale | caught |
| 8a | A-04 resolution clause reworded | **ESCAPED → rebuilt → caught** |
| 8b | the recovered CS §01 half reworded | caught |
| 8c | unverifiable half swapped into the verbatim slot | caught |
| 9 | historical source reclassified as governing | caught |
| 10 | dangling `CR-91` introduced | caught |

**The escape is the useful part of this section.** The original assertion
compared a hardcoded fixture string against the corpus — circular, since the
fixture lived in the test, so editing the quotation in `evidence.ts` could never
fail it. It was a source-text check wearing the costume of a relationship check.
Rebuilt to extract the quotation from the source file. A second escape followed
immediately: a non-greedy capture stopped at the first closing quote, so only
sentence one of A-04 was checked. Both halves are now checked separately.

The assertion also caught its own first false positive — it read the literal
`/CR-0*(\d+)/` in its own source as a citation of "CR-0" — which is why the
scanner now excludes itself, with the reason recorded in the code.

## M. Product implementation impact

**None.** No route, component, server function, schema or behaviour was changed.
Section 12 governs: behaviour whose historical authority is unavailable is not
deleted to tidy the authority graph. The single source edit was a comment.

No unsupported-but-harmless behaviour was found to contradict current authority.
That is a weak result rather than a clean one — 19 of 23 sections cannot be
checked at all.

## N. Standalone verdict — **PARTIALLY**

A new maintainer cloning only this repository can now: enumerate every authority
claim it makes; see which are verifiable and which are not; read the recovered
originals with provenance and hashes; see the precedence that is established and
the relationships that are unknown; and confirm that every constitutional clause
the code cites exists.

They cannot verify 70 of 93 citations in `src/`, because the documents those
cite do not exist anywhere reachable.

**If AEON X disappeared tomorrow, nothing would break and nothing further would
be lost** — the corpus is copied here, byte-identical and hashed. The remaining
dependency is not on AEON X the repository. It is on documents that are not in
AEON X either.

## O. Decisions requiring the founder

1. **Produce the Bibles** — or confirm they no longer exist. 19 sections, 70
   citations, and the answer to whether PB §12 ranks Flows and CS.
2. **Ratify `docs/CONSTITUTION.md` as the successor authority, in writing** —
   which would license repointing those 70 citations, resolve the precedence
   question in G, and change most rows of the decision register to
   `RETIRED AND REPOINTED`.
3. **Decide whether the AEON X constitutional corpus is normative for
   Opportunity X**, or stays historical. It is currently classified historical,
   and the test enforces that classification until a decision changes it.

Neither 1 nor 2 was assumed. The repository is honest about being in the third
state — citing law nobody present can read — rather than resolving it by writing
a convincing document.
