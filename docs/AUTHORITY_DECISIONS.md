# Authority decisions register

What each authority family is, whether it can be inspected here, and what was
decided about it. One row per family — they are not collapsed by name similarity,
because the Product Bible and the Component System Bible are missing in the same
way but matter to the product very differently.

**No citation was repointed in Phase 22.** Section 6 of the phase instruction
permits a replacement only under explicit ratification, direct textual support,
or conversion to historical language. The first has not happened, and the second
does not hold: `docs/CONSTITUTION.md` was written independently and does not
restate the Bible sections the code cites. Repointing 70 unresolved citations at
CR clauses that merely sound related is the authority laundering this phase
exists to prevent. So the decision is recorded and deferred, not taken.

---

| Authority | Original available? | Citations in `src/` | Implementation depends on it? | Replacement available? | Decision |
|---|:--:|--:|:--:|:--:|---|
| **Product Bible (PB)** | **fragments only** — §07 and §12 | 17 (§07 ×15, §12 ×2) | Yes — `person.ts`, `evidence.ts`, `claim.ts`, `next-action.ts`, `ProvenanceChip`, `UnknownState` | No | **PARTIAL — §07 and §12 verifiable; the document is not.** Awaiting founder. |
| **Brand Bible (BB)** | **fragment only** — A-04 | 12 (A-04 ×3, §03/05/06/07/12 ×9) | Yes — `evidence.ts` derives provenance under A-04 | No | **PARTIAL — A-04 verifiable and enforced; 5 sections unresolved.** Awaiting founder. |
| **Experience Bible (XB)** | **no** | 22 | Yes — the three absence states cite §07 | No | **UNRESOLVED EXTERNAL AUTHORITY.** Behaviour retained; attribution not verifiable. |
| **IA Bible (IA)** | **fragment only** — §08 | 23 (§08 ×1, §04/11/13/18 ×22) | Yes — product isolation cites §13/§18 | No | **PARTIAL.** §11 (×9) and §18 (×9) are the two largest unresolved dependencies in the product. |
| **UX Flows Bible (Flows)** | **fragments** — §01, §08, §09 | 0 in `src/` | No | n/a | **RECOVERED FRAGMENTS, UNUSED.** Cited by the AEON X corpus, not by this product. |
| **Component System Bible (CS)** | **fragments** — §01, §06 | 21 (§01 ×4; §02/04/05/14 ×17) | Yes — `claim.ts` composition law cites §01 | No | **PARTIAL — §01 verifiable and enforced.** §02 (×7) and §04 (×5) unresolved. |
| **Reconstruction Audit** | **no** | 0 | No | n/a | **MISSING.** Named in the recovered corpus as explicitly *not* a Bible and ranking below them. No action. |
| **`docs/CONSTITUTION.md` (CR-01–37)** | **yes — present in this repository** | 41 CR citations, 13 distinct clauses | Yes, extensively | n/a | **PRESENT AND VERIFIABLE.** All 13 cited clauses exist in the document; **zero dangling CR references.** |
| **AEON X constitutional corpus (7 docs)** | **yes — recovered, verbatim** | 0 direct | No | n/a | **PRESENT BUT HISTORICAL.** Governs AEON X. Speaks *about* Opportunity X; that is not the same as governing it. Must not silently become normative. |
| **Lovable / System B plan** | **yes — recovered, verbatim** | 0 | No | n/a | **PRESENT BUT HISTORICAL.** The specification of the deleted product. Explicitly non-normative — it is the origin of claims Phase 21 removed. |

---

## The one verifiable positive

Every `CR-NN` cited anywhere in `src/`, `test/` or `scripts/` resolves to a
clause that exists in `docs/CONSTITUTION.md`. 41 occurrences, 13 distinct
clauses, **zero dangling references.** Checked mechanically in Phase 22, not
assumed. The Constitution is the only authority in this repository that is both
cited and fully inspectable.

## What was deliberately not done

- **No citation repointed.** See the note above.
- **No Bible reconstructed**, paraphrased, or inferred from code.
- **No implementation changed.** Section 12 governs: behaviour whose historical
  authority is unavailable is not deleted to tidy the authority graph. Nothing in
  the product was altered by this phase.
- **`docs/CONSTITUTION.md` not promoted.** It is not ranked against the Bibles,
  and no Bible citation was rewritten to point at it.

## What requires the founder

1. **Produce the Bibles**, or
2. **Ratify `docs/CONSTITUTION.md` as the successor authority in writing**, which
   would license repointing the 70 unresolved citations and change most rows
   above to RETIRED AND REPOINTED.

Until one happens, 70 of 93 citations in `src/` remain historical attributions
that cannot be independently verified — and the repository now says so in the
inventory rather than implying otherwise by citing them.
