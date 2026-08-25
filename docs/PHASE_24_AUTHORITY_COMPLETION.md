# Phase 24 — Authority Completion & Product Constitution Audit

## 1. Commit

Started from `7d593d5b9e48033bac6468b2ec14303cc5c70498` (Phase 23), verified as an
ancestor of HEAD with a clean tree before any change.

## 2. Starting state — measured, not inherited

Recomputed from `src/`:

| | |
|---|--:|
| Historical (Bible) references | **93** |
| Resolved — inside a `(hist. …)` span | **41** |
| `REQUIRES_RATIFICATION` — bare | **52** |
| `CR-` references | 30 |
| `OXD-` references | 34 |
| Files carrying references | 11 |

The 52 total matches Phase 23. **Its composition does not**, and Phase 23's
report was wrong twice: it listed `PB §07` at 10 unresolved when the measured
figure is **11**, and listed `PB §12` at 2 when `PB §12` appears **nowhere in
`src/` at all**.

## 3. Citation disposition

| Outcome | Count |
|---|--:|
| Direct CR support | **1** |
| Existing OXD support | **0** |
| Historical only | **2** |
| No authority required | **0** |
| Pending new OXD | **4** |
| Still unresolved | **45** |
| **Total** | **52** |

## 4. Every unresolved citation

Full per-occurrence ledger: **`docs/AUTHORITY_LEDGER.md`** — 51 rows, each with
file, line, historical citation, the requirement actually invoked, whether the
code is reachable, disposition and reason. Kept honest in both directions by
`test/authority-self-containment.test.ts`: a citation with no row fails, and a
row with no citation fails.

### The structural finding that decided 45 of them

`src/lib/opportunity/foundation/{person,claim,next-action,evidence}.ts` carry
**45 of the 52** unresolved citations. Those modules are consumed only by
`src/lib/opportunity/recommendation/service.ts`, and **no route, server function
or component calls it.** Traced by import graph, not assumed.

| Type | On a live path? |
|---|---|
| `ProfileStore`, `ConsentSummary`, `Claim`, `NextAction`, `BaseRate` | **no** |
| `ProfileFact` | type-only, in `judgment/service.ts`; `resolveCards` passes `facts: []` |

So those 45 citations describe intended behaviour for capability **no user can
reach**. Ratifying rules for unbuilt features would be manufacturing decisions to
lower a count, which §J forbids. They stay `STILL UNRESOLVED`, with the
requirement each invokes recorded.

### Section identity is not requirement identity — confirmed twice more

**IA §11**, nine occurrences, at least **four** distinct requirements: the Profile
as the deliberate exception to the disappearing interface (`person.ts:10`);
gapless lineage (`:67`); one permission record per fact per product, readable two
ways (`:90`, `:332`); and the provenance affordance landing "directly on the fact
that produced it" (`:236`, `:285`, `evidence.ts:121`, `claim.ts:116`).

**PB §07**, eleven bare occurrences, at least **six**: the three tiers; the
Visibility Principle; the Accountability Principle; "it always tells me why";
sharing off by default; and correction semantics. Each was read individually. No
section was disposed of wholesale.

## 5. New OXD proposals

Four, in **`docs/OXD_PENDING.md`**, all `PENDING USER RATIFICATION`. Each covers a
requirement governing **code a user reaches today** that no ratified CR or OXD
states, and each names its closest existing authority and why that authority is
insufficient.

| ID | Requirement | Closest existing | Why insufficient |
|---|---|---|---|
| `OXD-PENDING-001` | The Visibility Principle: state as fact only what was observed; every fact explains how it was learned | CR-24 | CR-24 is scoped to the *person* model; this governs claims about the *world*. Searched: no clause contains "visibility principle" or "certainty only" |
| `OXD-PENDING-002` | The system is the subject of its own failure sentences; the user never is | CR-15, CR-16 | neither addresses voice or grammatical subject |
| `OXD-PENDING-003` | An absence verdict carries the time the search was made | OXD-001 | OXD-001 requires the states be distinct, not that they be dated |
| `OXD-PENDING-004` | Decline offered at the same reach as accept; withdrawal leaves a trace | CR-26 | CR-26 governs the system discouraging; this governs the person's own affordance |

No proposal was drafted for the 45 unreachable citations.

## 6. Authority versus implementation

| Authority | Status | Evidence |
|---|---|---|
| OXD-001 — three absences distinct | **IMPLEMENTED** | three components; `searchedAt === null` guard in `surface/service.ts`; all three rendered by live routes |
| OXD-002 — non-visual carrier | **PARTIAL** | honoured by `VerificationSeal` and `FreshnessStamp`, which render. `ProvenanceChip` implements it but **is rendered nowhere** |
| OXD-003 — product isolation at the data layer | **PARTIAL** | `ProductScope` exists as a type and RLS exists on the canonical tables, but the person-side boundary it describes has no implementation — `ProfileStore` has no implementor |
| OXD-004 — no claim without provenance | **PARTIAL** | the type-level guarantee is real and enforced by a brand symbol, but nothing constructs a `Claim`, so the rule currently binds no runtime value |
| OXD-005 — per-fact freshness | **IMPLEMENTED** | `DecayClass`, non-optional `lastVerifiedAt`; `FreshnessStamp` renders in `EntityFact`, `AbsentState`, `RefreshFailed`, `/saved` |
| CR-24 — person-model inspectable | **NOT YET IMPLEMENTED** | no `ProfileStore` implementation, no `/profile` route. Phase 23 repointed 5 citations here and this phase a 6th; the clause is ratified and the capability does not exist |
| CR-21 — mechanisms separable | **IMPLEMENTED** | no composite score anywhere; verified again by the 51 artifact assertions |

**No CONTRADICTED findings.** Nothing implemented conflicts with ratified
authority. That is a weak result, not a clean one: two of the five OXDs bind
code no user reaches.

## 7. Product reality

| Stage | Implemented | Reachable from a route | Fixture-tested | Live-verified |
|---|---|---|---|---|
| Source registry / announcers | yes | CLI only (`scripts/sweep.ts`) | yes | **no** |
| Retrieval (`discovery/fetcher.ts`) | yes | CLI only | yes | **no** — egress 403 |
| robots handling | yes (7 modules) | CLI only | yes | **no** |
| Observation store | yes | yes | yes | **schema only** (Phase 21A) |
| `requestedUrl` / redirect provenance | yes | yes | yes | **schema only** |
| retrieved vs unreachable outcome | yes (`record.ts:146/178`) | yes | yes | **no** |
| Extraction | yes | yes | yes | **no** |
| Entity resolution | yes | yes | yes | **no** |
| Corpus derivation | yes | yes | yes | **no** |
| Verification | yes | yes | yes | **no** |
| Judgment | yes | yes | yes | **no** |
| Card projection | yes | yes | yes | **no** |
| Detail / inspection | yes | yes | yes | **no** |
| Person model / Claim / NextAction | yes | **NO** | partly | **no** |

Every "live-verified: no" has the same two causes: zero observations in the
database, and egress policy denial from this sandbox.

**Authentication**, by strength of evidence:

| Property | Proven by |
|---|---|
| PKCE; credential validation; password never stored, logged or reflected; generic failures | **code** — `test/auth-security.test.ts`, 13 assertions |
| Service-role boundary; no secret in the client bundle | **build artifact** — 51 assertions in `verify-artifact.sh` |
| Sign-out lifecycle across five outcomes; last-good cleared on confirmed sign-out | **fixture/browser laboratory** — `/lab/session` |
| Any of the above against a real Supabase session | **not proven live** |

## 8. Production truth

| | Repository | Preview | Production |
|---|---|---|---|
| Commit | `7d593d5` + this phase | latest `dpl_CVk9…`, target `null` | `8a2090d` |
| Deployment | — | preview | `dpl_9Ufdj7PX2XF5Uvw8D2hPBTfZ9yhX`, target `production` |
| Branch | feature | feature | `main` |
| Age | current | current | **2026-07-29, 83 commits behind** |
| `/opportunities` exists | yes | yes | **NO** — `main`'s routes are System B: `search.tsx`, `dashboard*`, `vault`, `_admin/*`, `opportunity.$id.tsx` |
| `/saved` exists | yes | yes | **NO** |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | n/a | **UNVERIFIABLE** — no tool reads Vercel env vars | **UNVERIFIABLE** |

The runtime error record is unchanged since Phase 21B: the config error last
fired 2026-08-19, and production still throws the Lovable-era
`deadline-intelligence` error from a module deleted in Phase 13. Nothing was
deployed or configured in this phase.

## 9. Defects found

**Pre-existing, reported, not fixed** (all require owner decisions or later phases):

| | Severity | Finding |
|---|---|---|
| D-1 | **P1** | Production serves System B and has no `/opportunities` or `/saved`. Unchanged since Phase 21B. |
| D-2 | **P1** | `ProvenanceChip` is rendered by nothing. Provenance tiers — the trust primitive OXD-004 and CR-24 both turn on — are never shown to a user. |
| D-3 | **P2** | CR-24 is ratified and not implemented: no `ProfileStore` implementor, no `/profile` route. |
| D-4 | **P2** | `recommendation/service.ts` and everything under it is unreachable, stranding 45 authority citations against dead capability. |
| D-5 | **P3** | Phase 23's report miscounted `PB §07` (10 vs 11) and listed `PB §12` at 2 when it has 0 occurrences in `src/`. Corrected here. |

**Introduced during this phase:** none. **Fixed:** D-5 (documentation), and one
citation repointed with evidence.

## 10. Tests and mutations

`test/authority-self-containment.test.ts`: **13 → 17 assertions**. Suite: **376
pass / 0 fail**.

Eight mutations, all caught:

| # | Mutation | Result |
|---|---|---|
| P1 | unresolved citation dropped from source | caught |
| P2 | ledger row deleted to hide a citation | caught |
| P3 | phantom ledger row with no citation | caught |
| P4 | pending proposal pasted into the ratified register | caught |
| P5 | pending status line removed | caught |
| P6 | authority named only in a test | caught (first attempt was a **bad mutation** — my replace target did not match, so nothing was mutated; re-run correctly and caught) |
| P7 | ledger row count falsified | caught |
| P8 | every disposition flipped to RESOLVED | caught |

**No escapes.** P6 is recorded because a mutation that silently fails to apply
looks exactly like a passing test, and that is worth naming rather than counting
as a pass.

## 11. Gates — re-run, not carried forward

TypeScript 0 errors · ESLint 0 errors, 8 warnings (unchanged) · **376 tests
pass** · build clean · 51 artifact assertions · 44 migration assertions.

## 12. What requires your decision

1. **Ratify or reject the four pending OXDs** in `docs/OXD_PENDING.md`. All four
   govern code users reach today.
2. **`ProvenanceChip` renders nowhere (D-2).** Either wire it into
   `OpportunityCard`/`OpportunityInspection`, or accept that provenance tiers are
   not shown and record that decision.
3. **CR-24 is ratified but not implemented (D-3).** Either schedule the person
   model, or amend the clause. Six citations now point at it.
4. **The 45 unresolved citations against unreachable code (D-4).** Three options:
   build the capability, delete the modules, or leave them as specification with
   the ledger as the record. I recommend the third for now and have implemented
   nothing.
5. **Production (D-1).** Merge to `main` or repoint the production branch, and set
   the three Supabase variables on Production *and* Preview scopes.

## 13. Definition of done

- Every live normative citation has a recorded disposition — **yes**, 52 of 52.
- No citation laundered into unrelated authority — **yes**; one repoint, evidenced by quoted clause text.
- Pending OXDs cannot be mistaken for ratified — **yes**, enforced and mutation-tested.
- Authority tests read real source relationships — **yes**; the ledger check compares source to document in both directions.
- Ratified authority compared against implementation — **yes**, §6.
- Fixture and live verification separated — **yes**, §7.
- Production truth reported independently — **yes**, §8, re-measured this phase.
