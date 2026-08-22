# Provenance of recovered authority

Every file under `ORIGINAL_SOURCES/` was copied byte-for-byte from the source
named below and verified with `cmp` at transfer time. Nothing was edited,
reformatted, summarised or completed. The SHA-256 of each transferred file is
recorded so a later reader can prove it has not drifted.

Recovery date: **2026-08-22**.

---

## `ORIGINAL_SOURCES/aeon-x-constitutional/` — 7 files

| | |
|---|---|
| Original location | `docs/constitutional/` |
| Original repository | `github.com/aeonligh/Aeon-X-Technologies-` (private) |
| Source commit | `6c161522c205f518665f6f30191359b391e5d842` |
| Branch | `claude/aeon-x-digital-identity-hhhmmj` (origin HEAD) |
| Original dates | added 2026-08-01 → 2026-08-02; corpus states it was last reconciled against repository and live database **2026-08-03** |
| Transferred unchanged | **YES** — `cmp` byte-identical, all 7 |
| Transformation performed | none |
| Authority status | **VERIFIED COPY OF ORIGINAL** |

| File | SHA-256 | Lines |
|---|---|---|
| `blocked-procedures.md` | `6866758797a008f8…` | 324 |
| `completion.md` | `c510a05c1a637eb8…` | 106 |
| `deployment.md` | `1147979eb1a4c443…` | 183 |
| `opportunity-ownership.md` | `e27527218c15c606…` | 239 |
| `rbac.md` | `2ca8f6a188cc7b1f…` | 155 |
| `shared-database.md` | `9c9748d86e2be482…` | 91 |
| `state.md` | `be33ddb27e56441f…` | 194 |

**Identification evidence.** `docs/PHASE15_CORPUS_RECOVERY.md` named a "canonical
repository" whose origin HEAD was `6c16152` while a shallow clone sat at
`0b25b1c`. Both commits resolve in `Aeon-X-Technologies-` and in no other
accessible repository. All seven line counts match Phase 15's table exactly.
The identification is by commit hash and content, not by inference from a name.

---

## `ORIGINAL_SOURCES/lovable-system-b/SYSTEM_B_PLAN.md`

| | |
|---|---|
| Original location | `.lovable/plan.md` |
| Original repository | `github.com/aeonligh/opportunity-x` (private) |
| Source commit | `716ee7e5b49d230813fd56c5019f853e9833ba25` |
| Original date | 2026-06-14 |
| Transferred unchanged | **YES** — `cmp` byte-identical |
| Transformation performed | **filename only**: `plan.md` → `SYSTEM_B_PLAN.md`. Content untouched. |
| SHA-256 | `fdc12789163177cd…` |
| Authority status | **VERIFIED COPY OF ORIGINAL** — but see the warning below |

**⚠ This is not governing law. It is the specification of the retired product.**

It is preserved because it is the *provenance* of several claims Phase 21
removed from the landing page as fabrications. It records, in the original
build's own words: a seven-stage pipeline (`Stage 1 Discovery … Stage 7
Recommendation`), `verification_score` with **"drop < 0.6"**, `match_score`,
`Stage 4 Deduplication → fuzzy match`, a `verified boolean` column, and
`opportunity_analytics(view|save|share|apply_click)`.

Those are the originals of "Anything below 0.6 never gets published", the "Live
discovery pipeline", "94% Match", "Duplicates removed", the verified badges and
"Share on WhatsApp". **The landing copy was not invented from nothing — it
described this plan accurately.** It became false when Phase 13 deleted the
system it described and the copy was left behind. That is a materially different
failure from fabrication, and the record should say which one happened.

---

## What was NOT recovered

The six Bibles and the Reconstruction Audit. See
`../PHASE_21C_AUTHORITY_RECOVERY.md` §D for the full search scope. No file
matching `*bible*` has ever existed in any commit of any accessible repository.
