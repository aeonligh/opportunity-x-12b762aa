# Authority decisions register

What each authority family is, whether it can be inspected here, and what was
decided about it. One row per family — they are not collapsed by name similarity,
because the Product Bible and the Component System Bible are missing in the same
way but matter to the product very differently.

**Phase 22: no citation was repointed** — ratification had not happened, and
`docs/CONSTITUTION.md` does not restate the Bible sections the code cites.

**Phase 23: the product owner ratified `docs/CONSTITUTION.md` as current
governing authority.** 36 of 93 occurrences were repointed — 6 to a constitutional
clause that states the requirement directly, 30 to a new OXD decision. 57 remain
`REQUIRES_RATIFICATION`, deliberately. The count was not driven to zero; a clause
that sounds adjacent is not the same rule.

---

| Authority | Original available? | Citations in `src/` | Implementation depends on it? | Replacement available? | Decision |
|---|:--:|--:|:--:|:--:|---|
| **Product Bible (PB)** | **fragments only** — §07 and §12 | 17 | Yes | CR-24, partially | **PARTIALLY REPOINTED.** 5 tier/inspectability sites → CR-24. 10 sites claim requirements CR-24 does not state; `REQUIRES_RATIFICATION`. |
| **Brand Bible (BB)** | **fragment only** — A-04 | 12 | Yes | OXD-002, OXD-004, OXD-005 | **REPOINTED** for A-04, §07, §12. §03/§05/§06 `REQUIRES_RATIFICATION`. |
| **Experience Bible (XB)** | **no** | 22 | Yes | OXD-001, OXD-005 | **REPOINTED** for §05, §07, §15. §02/§06/§10 `REQUIRES_RATIFICATION`. |
| **IA Bible (IA)** | **fragment only** — §08 | 23 | Yes | OXD-003 | **REPOINTED** for §13, §18. §04 (×2), §08 (×1), §11 (×9) `REQUIRES_RATIFICATION` — §11 is now the largest single unresolved dependency. |
| **UX Flows Bible (Flows)** | **fragments** — §01, §08, §09 | 0 in `src/` | No | n/a | **RECOVERED FRAGMENTS, UNUSED.** Cited by the AEON X corpus, not by this product. |
| **Component System Bible (CS)** | **fragments** — §01, §06 | 21 | Yes | OXD-004, OXD-003, CR-21 | **REPOINTED** for §01, §14, and one §02 site. §02 (×6), §04 (×5), §05 (×1) `REQUIRES_RATIFICATION`. |
| **Reconstruction Audit** | **no** | 0 | No | n/a | **MISSING.** Named in the recovered corpus as explicitly *not* a Bible and ranking below them. No action. |
| **`docs/CONSTITUTION.md` (CR-01–37)** | **yes — present** | 43 CR citations | Yes, extensively | n/a | **RATIFIED CURRENT GOVERNING AUTHORITY** (product owner, 2026-08-22). Every cited clause exists; zero dangling. |
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

## What still requires the founder

**Item 2 is done** — the Constitution was ratified in Phase 23, and this register
records the consequences.

What remains:

1. **57 occurrences across 11 sections marked `REQUIRES_RATIFICATION`.** Each
   needs either the original document, or a new OXD decision, or a finding that
   the behaviour needs no authority at all. The largest is `IA Bible §11` (×9).
2. **Produce the Bibles**, if they exist. Their discovery would not override the
   ratified model; it would let the historical record be completed.
