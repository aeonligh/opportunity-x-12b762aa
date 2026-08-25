# Authority inventory

Re-derived from the current repository in Phase 22. **This supersedes the Phase 21C
figure of 111.** That count summed `src`, `docs`, `scripts` and `test`, which mixes three
different things: claims this repository makes, citations inside recovered historical
documents that belong to their authors, and registers that enumerate citations to track
them.

| Where | Occurrences | What it means |
|---|--:|---|
| **`src/`** | **93** | **This repository's own normative claims. The number that matters.** |
| `docs/authority/ORIGINAL_SOURCES/` | 138 | AEON X's citations, preserved verbatim. Not claims made here. |
| `docs/AUTHORITY_*.md` | 81 | These registers, enumerating the above. |
| `docs/PHASE*.md` | 28 | Derived records. |
| `test/`, `scripts/` | 1 | — |
| Total | 343 | |

`src/` cites **23 distinct sections**. **4 have recovered verbatim text** (23 of 93 occurrences); 19 have none.

### Correction to Phase 21C

Phase 21C reported 2 sections with recovered text. That was wrong, in the cautious
direction: its extraction was tightened after a first pass produced false pairings, and
the tightening discarded genuine fragments with the bad ones. Re-extracted here by
requiring the citation and the opening quotation mark to fall in the same sentence.
**Product Bible §07 — the most-cited section in the product, 15 occurrences — does have
recovered text**, and Phase 21C recorded it as missing.

| Authority | Section | Occurrences | Files | Recovered text | Status |
|---|---|--:|--:|:--:|---|
| Brand Bible | A-04 | 3 | 2 | **YES** | FRAGMENT |
| Brand Bible | §03 | 2 | 2 | no | MISSING_AUTHORITY |
| Brand Bible | §05 | 1 | 1 | no | MISSING_AUTHORITY |
| Brand Bible | §06 | 1 | 1 | no | MISSING_AUTHORITY |
| Brand Bible | §07 | 3 | 2 | no | MISSING_AUTHORITY |
| Brand Bible | §12 | 2 | 2 | no | MISSING_AUTHORITY |
| Component System Bible | §01 | 4 | 3 | **YES** | FRAGMENT |
| Component System Bible | §02 | 7 | 3 | no | MISSING_AUTHORITY |
| Component System Bible | §04 | 5 | 1 | no | MISSING_AUTHORITY |
| Component System Bible | §05 | 1 | 1 | no | MISSING_AUTHORITY |
| Component System Bible | §14 | 4 | 3 | no | MISSING_AUTHORITY |
| Experience Bible | §02 | 5 | 2 | no | MISSING_AUTHORITY |
| Experience Bible | §05 | 1 | 1 | no | MISSING_AUTHORITY |
| Experience Bible | §06 | 5 | 2 | no | MISSING_AUTHORITY |
| Experience Bible | §07 | 7 | 5 | no | MISSING_AUTHORITY |
| Experience Bible | §10 | 3 | 2 | no | MISSING_AUTHORITY |
| Experience Bible | §15 | 1 | 1 | no | MISSING_AUTHORITY |
| IA Bible | §04 | 2 | 1 | no | MISSING_AUTHORITY |
| IA Bible | §08 | 1 | 1 | **YES** | FRAGMENT |
| IA Bible | §11 | 9 | 3 | no | MISSING_AUTHORITY |
| IA Bible | §13 | 2 | 2 | no | MISSING_AUTHORITY |
| IA Bible | §18 | 9 | 6 | no | MISSING_AUTHORITY |
| Product Bible | §07 | 15 | 6 | **YES** | FRAGMENT |

## Recovered fragment locations

All inside `docs/authority/ORIGINAL_SOURCES/aeon-x-constitutional/`.

| Section | Source | Quoted text |
|---|---|---|
| Brand Bible A-04 | `opportunity-ownership.md:141` | "Ownership says the user owns the truth of their life" |
| Component System Bible §01 | `opportunity-ownership.md:116` | "a statement without provenance is not a component in this system — it is a violation." |
| IA Bible §08 | `state.md:190` | "validated against an allowlist" |
| Product Bible §07 | `opportunity-ownership.md:94` | "visible to the person it concerns." |

## Per-citation detail

### Brand Bible A-04 — FRAGMENT
- `src/lib/opportunity/foundation/claim.ts:123`
- `src/lib/opportunity/foundation/evidence.ts:9`
- `src/lib/opportunity/foundation/evidence.ts:71`

### Brand Bible §03 — MISSING_AUTHORITY
- `src/components/ui/absence/AbsentState.tsx:10`
- `src/components/ui/absence/UnknownState.tsx:9`

### Brand Bible §05 — MISSING_AUTHORITY
- `src/components/ui/FreshnessStamp.tsx:8`

### Brand Bible §06 — MISSING_AUTHORITY
- `src/components/ui/ProvenanceChip.tsx:6`

### Brand Bible §07 — MISSING_AUTHORITY
- `src/components/ui/FreshnessStamp.tsx:5`
- `src/components/ui/FreshnessStamp.tsx:11`
- `src/lib/opportunity/foundation/person.ts:29`

### Brand Bible §12 — MISSING_AUTHORITY
- `src/components/opportunity/VerificationSeal.tsx:65`
- `src/components/ui/ProvenanceChip.tsx:7`

### Component System Bible §01 — FRAGMENT
- `src/lib/opportunity/foundation/claim.ts:7`
- `src/lib/opportunity/foundation/evidence.ts:24`
- `src/lib/opportunity/foundation/evidence.ts:121`
- `src/lib/opportunity/foundation/next-action.ts:10`

### Component System Bible §02 — MISSING_AUTHORITY
- `src/lib/opportunity/foundation/claim.ts:46`
- `src/lib/opportunity/foundation/claim.ts:64`
- `src/lib/opportunity/foundation/claim.ts:81`
- `src/lib/opportunity/foundation/claim.ts:209`
- `src/lib/opportunity/foundation/claim.ts:229`
- `src/lib/opportunity/foundation/next-action.ts:24`
- `src/lib/opportunity/foundation/person.ts:215`

### Component System Bible §04 — MISSING_AUTHORITY
- `src/lib/opportunity/foundation/claim.ts:168`
- `src/lib/opportunity/foundation/claim.ts:185`
- `src/lib/opportunity/foundation/claim.ts:188`
- `src/lib/opportunity/foundation/claim.ts:215`
- `src/lib/opportunity/foundation/claim.ts:222`

### Component System Bible §05 — MISSING_AUTHORITY
- `src/lib/opportunity/foundation/next-action.ts:52`

### Component System Bible §14 — MISSING_AUTHORITY
- `src/lib/opportunity/foundation/claim.ts:12`
- `src/lib/opportunity/foundation/claim.ts:129`
- `src/lib/opportunity/foundation/evidence.ts:36`
- `src/lib/opportunity/foundation/next-action.ts:14`

### Experience Bible §02 — MISSING_AUTHORITY
- `src/lib/opportunity/foundation/claim.ts:24`
- `src/lib/opportunity/foundation/claim.ts:186`
- `src/lib/opportunity/foundation/claim.ts:222`
- `src/lib/opportunity/foundation/next-action.ts:7`
- `src/lib/opportunity/foundation/next-action.ts:57`

### Experience Bible §05 — MISSING_AUTHORITY
- `src/components/ui/absence/AbsentState.tsx:7`

### Experience Bible §06 — MISSING_AUTHORITY
- `src/lib/opportunity/foundation/claim.ts:29`
- `src/lib/opportunity/foundation/claim.ts:163`
- `src/lib/opportunity/foundation/claim.ts:214`
- `src/lib/opportunity/foundation/person.ts:67`
- `src/lib/opportunity/foundation/person.ts:311`

### Experience Bible §07 — MISSING_AUTHORITY
- `src/components/ui/absence/AbsentState.tsx:9`
- `src/components/ui/absence/EmptyState.tsx:5`
- `src/components/ui/absence/EmptyState.tsx:13`
- `src/components/ui/absence/UnknownState.tsx:8`
- `src/lib/opportunity/foundation/next-action.ts:8`
- `src/lib/opportunity/foundation/next-action.ts:71`
- `src/lib/opportunity/foundation/person.ts:240`

### Experience Bible §10 — MISSING_AUTHORITY
- `src/components/opportunity/InterestedControl.tsx:346`
- `src/lib/opportunity/foundation/person.ts:95`
- `src/lib/opportunity/foundation/person.ts:322`

### Experience Bible §15 — MISSING_AUTHORITY
- `src/components/ui/FreshnessStamp.tsx:9`

### IA Bible §04 — MISSING_AUTHORITY
- `src/lib/opportunity/foundation/person.ts:235`
- `src/lib/opportunity/foundation/person.ts:282`

### IA Bible §08 — FRAGMENT
- `src/lib/opportunity/foundation/next-action.ts:86`

### IA Bible §11 — MISSING_AUTHORITY
- `src/lib/opportunity/foundation/claim.ts:103`
- `src/lib/opportunity/foundation/evidence.ts:121`
- `src/lib/opportunity/foundation/person.ts:10`
- `src/lib/opportunity/foundation/person.ts:67`
- `src/lib/opportunity/foundation/person.ts:90`
- `src/lib/opportunity/foundation/person.ts:112`
- `src/lib/opportunity/foundation/person.ts:236`
- `src/lib/opportunity/foundation/person.ts:285`
- `src/lib/opportunity/foundation/person.ts:332`

### IA Bible §13 — MISSING_AUTHORITY
- `src/lib/opportunity/foundation/evidence.ts:20`
- `src/lib/opportunity/foundation/person.ts:38`

### IA Bible §18 — MISSING_AUTHORITY
- `src/components/ui/ProvenanceChip.tsx:8`
- `src/components/ui/absence/EmptyState.tsx:6`
- `src/lib/opportunity/foundation/claim.ts:12`
- `src/lib/opportunity/foundation/claim.ts:129`
- `src/lib/opportunity/foundation/evidence.ts:37`
- `src/lib/opportunity/foundation/evidence.ts:94`
- `src/lib/opportunity/foundation/next-action.ts:29`
- `src/lib/opportunity/foundation/person.ts:14`
- `src/lib/opportunity/foundation/person.ts:293`

### Product Bible §07 — FRAGMENT
- `src/components/ui/ProvenanceChip.tsx:5`
- `src/components/ui/absence/UnknownState.tsx:5`
- `src/lib/opportunity/foundation/claim.ts:231`
- `src/lib/opportunity/foundation/evidence.ts:17`
- `src/lib/opportunity/foundation/evidence.ts:139`
- `src/lib/opportunity/foundation/next-action.ts:9`
- `src/lib/opportunity/foundation/person.ts:6`
- `src/lib/opportunity/foundation/person.ts:47`
- `src/lib/opportunity/foundation/person.ts:114`
- `src/lib/opportunity/foundation/person.ts:128`
- `src/lib/opportunity/foundation/person.ts:139`
- `src/lib/opportunity/foundation/person.ts:151`
- `src/lib/opportunity/foundation/person.ts:173`
- `src/lib/opportunity/foundation/person.ts:185`
- `src/lib/opportunity/foundation/person.ts:301`
