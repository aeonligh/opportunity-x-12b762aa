# Authority precedence

Established by product-owner ratification, Phase 23 (2026-08-22).

| Authority | Status | Role |
|---|---|---|
| Explicit product-owner ratification | **CURRENT** | Highest explicit decision authority |
| `docs/CONSTITUTION.md` | **CURRENT** | Governing constitutional authority |
| `docs/OPPORTUNITY_X_DECISIONS.md` (OXD) | **CURRENT** | Explicit standalone decisions |
| AEON X constitutional corpus | **HISTORICAL** | Provenance only |
| System B / Lovable plan | **RETIRED** | Historical provenance |
| Product / Brand / Experience / IA / Flows / Component System Bibles | **UNAVAILABLE** | Cannot currently govern |
| Reconstruction Audit | **UNAVAILABLE** | Cannot currently govern |

A requirement presented as current governing authority must be traceable to
`docs/CONSTITUTION.md` or to a recorded OXD decision. Historical material never
silently overrides current authority. If a later explicit owner decision
conflicts with the Constitution, the later decision controls and the conflict is
recorded.

## No hierarchy among unavailable documents

The old ordering is preserved below as **historical fact about what the corpus
said**, not as a live hierarchy. None of these documents can govern anything now.

| Historical relationship | Evidence |
|---|---|
| PB senior to BB, XB, IA | PB §12, verbatim in `authority/ORIGINAL_SOURCES/aeon-x-constitutional/state.md:159-163` |
| Bibles above the Reconstruction Audit | `state.md:156` — *"the audit is not a Bible and CS §06 is"* |
| PB against Flows and CS | **never established.** PB §12 as quoted names three subordinates; the quote is elided |

No ordering was invented for Flows or CS, then or now.

## What succession did and did not settle

**Settled.** The question Phase 22 recorded as a live unresolved condition —
`docs/CONSTITUTION.md` against the Bibles — is closed. The owner ratified the
Constitution as current governing authority. The Bibles are unavailable and
cannot govern.

**Not settled, and deliberately left open.** 52 citations in `src/` name a
missing section for a requirement that neither the Constitution nor any OXD
states. Those are `REQUIRES_RATIFICATION`. They were not repointed, because a
Constitution clause that sounds adjacent is not the same rule — see
`AUTHORITY_CITATION_RECONCILIATION.md` for each one.

## Citation convention

In source, `CR-24 (hist. PB §07)` and `OXD-001 (hist. XB §7)` mean: the first
token is current authority, everything inside `(hist. …)` is lineage. A bare
Bible citation has no current authority behind it and is unresolved.
`test/authority-self-containment.test.ts` enforces the distinction and fails if
a repointed section reverts to bare.
