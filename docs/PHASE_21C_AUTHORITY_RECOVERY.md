# Phase 21C — Authority Recovery

**Outcome: B — PARTIAL RECOVERY.**

The hypothesis was right about the mechanism and wrong about the object. Governing
documents *did* exist outside this repository and *were* never transferred — but
they are not the Bibles. The Bibles are absent from every accessible source, and
after this phase the repository says so in writing instead of citing them 111
times in silence.

---

## A. The hypothesis

That the six Bibles existed in AEON X or in wider project context, were used
while building Opportunity X, and were never copied into the standalone
repository. Earlier audits had concluded they did not exist, having searched
only this repository.

## B. Search scope

Everything actually reachable, named precisely.

| Source | How searched | Bibles found |
|---|---|:--:|
| `aeonligh/opportunity-x-12b762aa` (this repo) | 198 commits, all branches, all history | no |
| `aeonligh/Aeon-X-Technologies-` | cloned, **unshallowed to 65 commits**, `--diff-filter=AD` over all history | no |
| `aeonligh/opportunity-x` | cloned at `716ee7e` | no |
| `aeonligh/opportunity-x-ai` | cloned at `828556c` | no |
| Lovable workspace knowledge (`aeon x technologies`) | `get_workspace_knowledge` | empty |
| Lovable project knowledge (`opportunity-x`) | `get_project_knowledge` | empty |
| Lovable conversation, project `e297105a` | 1,385,581 bytes, 40 messages spanning 2026-06-10 → 2026-08-19, grepped | **0 occurrences of "Bible"** |
| Google Drive | `title contains 'Bible'` → 0; `title contains 'Opportunity'`; `fullText contains 'Experience Bible'`; `fullText contains 'Visibility Principle'` | no |

Searched for: `Bible`, each of the six names, `Constitution`, `Ratification`,
`Amendment`, `CR-`, `FPR-`, `Visibility Principle`, `§`, and section forms
(`§7`, `§07`, `PB §12`, `CS §06`, `A-04`).

**Not searched, and named as such:** Lovable conversations beyond page 1
(`has_more: true`; page 1 already spans the full project lifespan with zero
hits), the six remaining Lovable projects, `aeonligh/AEONX`, `aeon-x`,
`aeon-x-main`, `elite-ai`, `Light-Logistics-`, and any local machine or email.

## C. Recovered authorities

**1. The AEON X constitutional corpus — 7 documents, VERIFIED COPY OF ORIGINAL.**

Transferred byte-identically to
`docs/authority/ORIGINAL_SOURCES/aeon-x-constitutional/`, `cmp`-verified,
SHA-256 recorded in `docs/authority/PROVENANCE.md`.

Identification is by hash, not by name. `PHASE15_CORPUS_RECOVERY.md` named a
"canonical repository" at origin HEAD `6c16152` with a shallow clone at
`0b25b1c`. `Aeon-X-Technologies-` clones to
`6c161522c205f518665f6f30191359b391e5d842`; both commits resolve there and in no
other accessible repository. All seven line counts match Phase 15's table
exactly (194 / 324 / 239 / 183 / 155 / 106 / 91).

**2. `.lovable/plan.md` — VERIFIED COPY OF ORIGINAL, not governing law.**

The System B specification, from `aeonligh/opportunity-x` at `716ee7e`
(2026-06-14). Transferred as `ORIGINAL_SOURCES/lovable-system-b/SYSTEM_B_PLAN.md`;
filename changed, content untouched.

This one changes a finding from Phase 21. It contains, verbatim, a seven-stage
pipeline (`Stage 1 Discovery … Stage 7 Recommendation`), `verification_score`
with **"drop < 0.6"**, `match_score`, `Stage 4 Deduplication → fuzzy match`, a
`verified boolean` column, and `opportunity_analytics(view|save|share|apply_click)`.

Those are the sources of "Anything below 0.6 never gets published", the "Live
discovery pipeline", "94% Match", "Duplicates removed", the verified badges and
"Share on WhatsApp". **Phase 21 removed them as fabrications. They were not
fabricated — they accurately described this plan.** They became false when Phase
13 deleted the system and left the copy behind. The removals were still correct;
the reason recorded for them was not, and this report corrects it.

**3. Two Bible fragments — FRAGMENT.**

`docs/authority/FRAGMENTS/BIBLE_FRAGMENTS.md`. Product Bible §12 (elided) and
Brand Bible A-04 (apparently complete), both quoted inside recovered originals
with explicit attribution.

A first extraction pass produced roughly 28 candidate fragments by taking the
nearest quotation to each citation. On reading, most were mis-paired — three
different sections had captured the same unrelated table row. **They were
discarded, not published.** Two survived verification.

## D. Missing authorities

| Authority | Cited sections | Occurrences | Status |
|---|--:|--:|---|
| Product Bible | 2 | 21 | §12 FRAGMENT · §07 **MISSING** |
| Experience Bible | 6 | 25 | **MISSING** |
| Brand Bible | 6 | 15 | A-04 FRAGMENT · 5 sections **MISSING** |
| IA Bible | 5 | 26 | **MISSING** |
| Component System Bible | 6 | 24 | **MISSING** |
| UX Flows Bible | — | — | cited in the recovered corpus, not in this repo's source |
| Reconstruction Audit | — | — | **MISSING** |

**23 of 25 cited sections have no recovered text.** The most-cited section in the
entire product, **PB §07 — 19 occurrences across 9 files** — is among them.

No file matching `*bible*` has ever existed in any commit of any accessible
repository. This is a genuine absence, not a search that ran out of patience.

## E. Provenance

`docs/authority/PROVENANCE.md` — per file: original location, repository,
commit, dates, whether transferred unchanged, transformation performed, SHA-256,
and authority status.

## F. The AEON X relationship — **Model 4, mixed**, with a specific shape

- **Opportunity X the product** began inside Lovable (`aeonligh/opportunity-x`,
  June 2026) and was extracted into this standalone repository. → *Model 1*.
- **The constitutional apparatus** lives in AEON X and was never transferred
  until now. → *Model 2*: externally governed, and the external governor was
  never named in the governed repository.
- **The Bibles** are cited by both and present in neither. If they exist at all
  they are outside every version-controlled and API-reachable source available
  here — a private document set, a local machine, or a conversation this session
  cannot read. → *Model 3*, unconfirmed.
- **CR-01–37** was authored directly in this repository and appears nowhere in
  the recovered corpus. → *Model 1*, in reverse: governance created downstream.

Evidence: commit hashes, `--diff-filter=AD` history over 65 + 198 commits, file
timestamps (constitutional docs added 2026-08-01/02, corpus self-dated
2026-08-03), and repository structure (`.lovable/` present in the June repo,
absent here).

## G. Citation reconciliation

| Outcome | Sections |
|---|--:|
| Matched exactly, verbatim text recovered | **2** |
| Matched a versioned predecessor | 0 |
| Matched an amendment | 0 |
| Unresolved | **23** |

Detail per citation in `docs/AUTHORITY_CITATION_RECONCILIATION.md`. No citation
was resolved by approximation; there were no renumbering near-misses to
adjudicate, because the documents are absent rather than reorganised.

One positive result worth stating. `foundation/evidence.ts:9` quotes Brand Bible
A-04 and calls the quotation *"verbatim"*. That was tested rather than trusted:
both sentences were normalised and string-matched against the recovered source.
**Both are present verbatim.** The one Bible claim in this codebase that could be
checked, checks out.

## H. Precedence

`docs/AUTHORITY_PRECEDENCE.md`. Established on evidence: **Product Bible is
senior; Brand, Experience and IA are subordinate** (PB §12, verbatim). The
Reconstruction Audit ranks below the Bibles.

**PRECEDENCE NOT ESTABLISHED** for UX Flows Bible and Component System Bible —
PB §12 as quoted does not name them, and the quote is elided.

**Where CR-01–37 sits: UNRESOLVED.** Nothing recovered ranks it in either
direction. No order was chosen.

## I. Implementation audit, against recovered authority only

Auditing against the 23 missing sections is not possible, and inferring their
content from the code that cites them is the circularity this phase forbade.
What follows is limited to what was actually recovered.

| Requirement | Source | Finding |
|---|---|---|
| Provenance is inherited, never declared | BB A-04 (FRAGMENT) | **COMPLIANT** — `evidenceFrom()` derives `provenance` from `fact.tier` rather than accepting it |
| Provenance is displayed, not merely stored | BB A-04 | **COMPLIANT** — `ProvenanceChip`, `FreshnessStamp` |
| Confidence is never laundered | BB A-04 | **COMPLIANT** — the two unions are connected; this is what `evidence.ts` exists to prevent |
| No composite score | CR-21 · Phase 15 recorded `opportunity_score` as a contradiction | **SUPERSEDED in code** — `opportunity_score` and `selection_probability` appear 0 times in `src/`. `match_score` survives only in the *generated* `supabase/types.ts`, reflecting retired tables still present in the live database |
| Product Bible is senior | PB §12 | **UNVERIFIABLE** — the product currently applies `docs/CONSTITUTION.md`; whether that conflicts with PB cannot be known without PB |

Everything else is **UNVERIFIABLE — authority absent**. That is 23 of 25
sections, and it should be read as the main result of the audit rather than a
footnote to it.

## J. Contradictions

**None found against recovered authority.** Not reported as a clean bill of
health — it is what you get when only two of twenty-five sections can be checked.
Nothing was fixed automatically, because nothing needed fixing among the two.

## K. Unimplemented requirements

Cannot be enumerated. A requirement can only be called unimplemented against a
text that states it, and 23 sections have no text. The recovered corpus does
describe capabilities absent here — a Ledger, an inspectable person model, a
Step resolving to one of four states — but those are AEON X's, and importing
them would be exactly the "code transfer" this phase was told to treat as a
separate decision.

## L. AEON X-only material

| Item | Classification |
|---|---|
| `docs/constitutional/` × 7 | **AEON X ONLY** → now DUPLICATED (verbatim, this phase) |
| `public/brand/opportunity-x-symbol.{md,svg}` | **AEON X ONLY** — Opportunity X brand asset living in AEON X |
| `supabase/migrations/20260801152659_deny_opportunity_writes_at_the_grant.sql` | **AEON X ONLY** — an Opportunity X grant policy |
| `.claude/skills/{brand,design-system,design,banner-design}` | **AEON X ONLY** — design-system references |
| `src/components/profile/FactInspection.tsx`, `ui/tier0/InspectionPath.tsx` | **AEON X ONLY** — the inspectable person model |
| Bibles | **neither** |

Nothing was copied except the seven constitutional documents. No code was
transferred.

## M. Self-containment

**Yes, for the first time.** A reader cloning only this repository can now reach:
every citation (`AUTHORITY_INVENTORY.md`), its resolution or explicit absence
(`AUTHORITY_CITATION_RECONCILIATION.md`), the precedence order and its limits
(`AUTHORITY_PRECEDENCE.md`), the recovered originals with provenance
(`docs/authority/`), and the two surviving fragments.

Enforced by `test/authority-self-containment.test.ts`, which fails if source
cites an authority with no local record — including when the record file exists
but is empty, the case a filename check would miss.

## N. What was transferred

- 7 × `docs/authority/ORIGINAL_SOURCES/aeon-x-constitutional/*.md` — byte-identical
- 1 × `docs/authority/ORIGINAL_SOURCES/lovable-system-b/SYSTEM_B_PLAN.md` — content byte-identical, renamed

## O. What was deliberately not transferred

- **AEON X source code and skills.** Out of scope; provenance was the task.
- **The AEON X `docs/constitutional/` documents as *governing* Opportunity X.**
  They are filed as recovered originals, not adopted as law. They govern AEON X
  and speak about Opportunity X; that is not the same as governing it.
- **Any reconstruction of a Bible.** Not attempted.
- **`docs/CONSTITUTION.md`** — untouched. Not merged, not rewritten, not reranked.

## P. Tests and verification

`test/authority-self-containment.test.ts`, 3 assertions, 5 mutations all caught:
a source citation with no record; an emptied-but-present inventory; provenance
stripped of its source commit; a reconstructed Bible filed under
`ORIGINAL_SOURCES/`; the fragments file dropping its status label.

## Q. Final authority matrix

| Authority | Original found | Location | Provenance | Complete | Citations reconciled | Status |
|---|:--:|---|---|:--:|:--:|---|
| AEON X constitutional corpus (7) | **yes** | `docs/authority/ORIGINAL_SOURCES/aeon-x-constitutional/` | AEON X `6c16152` | yes | n/a | **VERIFIED COPY OF ORIGINAL** |
| System B plan | **yes** | `.../lovable-system-b/` | opportunity-x `716ee7e` | yes | n/a | **VERIFIED COPY** — not law |
| Product Bible §12 | partial | `.../FRAGMENTS/` | quoted in `state.md` | no (elided) | 1/1 | **FRAGMENT** |
| Brand Bible A-04 | partial | `.../FRAGMENTS/` | quoted in `opportunity-ownership.md` | apparently | 1/1 | **FRAGMENT** |
| Product Bible (§07, rest) | no | — | — | no | 0/1 | **MISSING** |
| Experience Bible | no | — | — | no | 0/6 | **MISSING** |
| Brand Bible (§03,05,06,07,12) | no | — | — | no | 0/5 | **MISSING** |
| IA Bible | no | — | — | no | 0/5 | **MISSING** |
| Component System Bible | no | — | — | no | 0/6 | **MISSING** |
| UX Flows Bible | no | — | — | no | n/a | **MISSING** |
| Reconstruction Audit | no | — | — | no | n/a | **MISSING** |
| `docs/CONSTITUTION.md` (CR-01–37) | n/a | this repository | authored here, Phases 1–6 | yes | n/a | **ORIGINAL, authored in place** |

---

## The one thing only you can resolve

Twenty-three of twenty-five cited sections have no text anywhere this session can
reach. If the Bibles exist, they are on a machine, in an email, or in a chat
history outside every API available here.

Either produce them, or ratify `docs/CONSTITUTION.md` as the successor authority
in writing and let the 111 Bible citations be rewritten to point at it. What
should not continue is the third state the repository has been in for
twenty-one phases: citing law that nobody present can read.
