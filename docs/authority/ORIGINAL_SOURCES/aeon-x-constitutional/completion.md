# Constitutional completion

Every artifact the six documents require, with its status. Status is one of:

- **Implemented** — built and verified by measurement.
- **Partial** — some of it exists; what is missing is named.
- **Missing** — required, buildable, not built.
- **Blocked** — cannot be built here; the blocker is named.
- **Deferred by the Constitution** — the documents say deciding now would be
  invention. Not a gap.

Percentages are of the artifact, not of the document.

---

## The role model, as the Constitution states it

Searched across all six documents for role, permission, ownership, authority,
workspace, control, collaboration, founder, administrator, organization, access
and identity. The complete model is three audiences and two authorities:

| Application | Audience | Namespace | Source |
|---|---|---|---|
| Public | "Visitors, collaborators, organisations, service clients" | `aeonx.ai/*` | IA §02 |
| User Workspace | "Every authenticated person" | `aeonx.ai/` (session) | IA §02 |
| Mission Control | "Founder and admins only" | `aeonx.ai/control/*` | IA §02, §12; PB §04 |

**There is no tiering inside the Workspace.** IA §02's audience is "every
authenticated person", unqualified. PB §09's freemium note governs what is
charged for, not what a session may reach.

**Collaboration and organisation "roles" are not access roles.** PB §05, IA §09
and Flows §09 list ambassador, technical contribution, research, partnership,
sponsorship and the rest as branches of an enquiry form. They live in
`intake_submissions.role` and `.partnership_type` as text a visitor typed.
Treating them as permissions would grant standing to anyone who filled in a
form. This is recorded because a reasonable reader expects RBAC to include them,
and the Constitution does not.

---

## Systems

| Artifact | Status | % | Blocking dependency |
|---|---|---|---|
| Identity layer (one account, one auth) | Implemented | 100 | — |
| Authorisation model (visitor / person / operator) | Implemented | 100 | — |
| Founder claim held by a real account | Implemented | 100 | Granted to anthonyadogbejiodjegba@gmail.com, 2026-08-07, on explicit instruction |
| Mission Control boundary (`/control/*`, 404 for non-operators) | Implemented | 100 | — |
| Mission Control shell (own, visibly different) | Implemented | 100 | — |
| Mission Control aggregates + access log | Implemented | 100 | — |
| Mission Control primary signal | Deferred by the Constitution | — | IA §12 and PB §11 both say deciding now is invention |
| Mission Control: analytics, product management, user insights | Blocked | 0 | No business signals exist to report on |
| Workspace shell (4 elements, IA §05) | Implemented | 100 | — |
| Four destinations, no fifth | Implemented | 100 | — |
| The Step surface | Partial | 60 | Resolves `unknown` honestly; the `step` resolution needs a discovery engine |
| Ledger + Ledger detail | Implemented | 100 | — |
| Recommendation Record | Implemented | 100 | — |
| Outcome Reporter | Implemented | 100 | — |
| Profile (three tiers, provenance, freshness) | Implemented | 100 | — |
| Profile fact detail + lineage | Implemented | 100 | — |
| Consent inventory (`/profile/sharing`) | Implemented | 100 | — |
| Handshake (four questions, single-use) | Implemented | 100 | — |
| Overlay primitive + one-at-a-time | Implemented | 100 | — |
| Three absence states | Implemented | 100 | — |
| Tier 0 primitives (provenance, freshness, evidence, base rate) | Implemented | 100 | — |
| Public surface (`/`, `/ecosystem`, `/vision`, `/founder`) | Implemented | 100 | — |
| Collaboration flow (individual + organisation) | Implemented | 100 | — |
| Services + Enquire | Implemented | 100 | — |
| Legal: privacy, data handling | Implemented | 100 | — |
| Legal: terms of service | Blocked | 0 | Founder business decision; not derivable |
| `/ecosystem` entry points to live applications | Partial | 70 | Real product URLs unknown |
| `/?why=step` (Level 1 depth) | Partial | 80 | Built; unexercisable until a Step resolves |
| Discovery engine | Blocked | 0 | Not in this repository |
| Opportunity ownership | Blocked | 0 | **Ownership is presently unknowable** — 7 rows, all `owner_id` null. Cause established 2026-08-07: the table belongs to an earlier product sharing this database, and AEON X never reads it. See `shared-database.md` |
| Cross-origin session continuity | Blocked | 0 | Needs the other products as separate origins |
| Shell as a published package | Blocked | 0 | Same |
| Migrations reflect the live schema | Implemented | 100 | Closed 2026-08-07. All 10 AEON X migrations are now in `supabase/migrations/`, copied verbatim from `supabase_migrations.schema_migrations` on the live project — not recall. The 8 belonging to the earlier product are named and deliberately excluded; see `supabase/migrations/README.md` and `shared-database.md` |

---

## Known gaps that are buildable

1. ~~**Observation shape**~~ — closed 2026-08-07. `observations_name_what_happened`
   and `observations_name_where_it_happened` now refuse in Postgres what the
   application already refused to render. Falsified after applying: the
   previously-accepted shape raises `check_violation`.
2. ~~**IA §18 forbidden-list**~~ — all four closed 2026-08-07 and recorded in
   `state.md`. No badge or count primitive exists; no full-page error component
   exists; the one skeleton sits where no stale value is available, and the
   Step, Ledger and Profile each document having none. Marketing code was
   measured at the network level and appears in **0** signed-in bundles.

   Nothing here needed changing — all four were already compliant. They are
   recorded because "untested" and "unmet" are indistinguishable from outside.

3. ~~**The migrations baseline**~~ — closed 2026-08-07, and the reason it was
   open was a wrong finding rather than a missing capability. The claim was that
   the history existed only in memory. It did not: the SQL of all 18 applied
   migrations is stored on the project in
   `supabase_migrations.schema_migrations.statements`, and the 10 that are AEON
   X's were copied from there verbatim.

**Remaining buildable: none.** Every gap still open is blocked on an external
dependency named in its row, an owner decision, or a system outside this
repository.
