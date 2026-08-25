# Roles and authorization

Audited 2026-08-08 against the six Bible source texts, then demonstrated
end-to-end against the live database. Nothing here is inferred from
implementation history.

## What the Constitution actually says

The word **"authorization" appears zero times in all six Bibles.** So does
"authorisation". The model is not stated as a permissions system; it is stated
as three applications with three audiences, and the boundary between them is
described as architecture rather than configuration.

IA §02 gives the whole model in one table:

| Application | Audience | Namespace |
|---|---|---|
| Public | "Visitors, collaborators, organisations, service clients" | `aeonx.ai/*` |
| User Workspace | "Every authenticated person" | `aeonx.ai/` (session) |
| Mission Control | "Founder and admins only" | `aeonx.ai/control/*` |

Two authorities, three audiences. That is the complete set.

### There is no Organization role

This is the finding most likely to surprise a reader, so it is stated with its
evidence. Searching all six Bibles for `organi*` returns 11 hits, and **not one
of them grants standing**:

- IA §02 lists "organisations" as part of the **Public** audience — visitors.
- IA §09 makes `/collaborate/organization` a **form branch**: "an organisation →
  partnership type → scoped brief". Its sibling is `/collaborate/individual`,
  whose "roles: join the team · ambassador · marketing & publicity · …" are
  *interests a visitor selects*, not permissions. Both land in
  `intake_submissions.role` / `.partnership_type` as text someone typed.
- IA §19 defers the institutional experience entirely: "PB §09 names Institutions
  and Businesses as paying customers. Your Next Best Step does not translate — an
  institution has operations, not a future it is becoming. **Requires its own
  Experience**." Listed under *Needs a later phase*.

Treating those form branches as roles would grant standing to anyone who
submitted a form. The Constitution does not establish an Organization role, so
none is implemented. This is recorded because a reasonable reader expects RBAC to
include one.

### There is no tiering inside the Workspace

IA §02's audience is "every authenticated person", unqualified. PB §09's
freemium note governs what is *charged for*, not what a session may *reach*.

### The boundary is architectural on purpose

IA §02: "A hard boundary makes privilege escalation an architectural
impossibility rather than a permissions bug."

IA §18 rejects the cheaper design by name, under *Rejected*:

> **Mission Control as a role toggle in the Workspace** — "Cheaper to build and a
> security liability. The Product Bible says 'completely different application',
> and a toggle makes privilege a runtime condition rather than an [architectural
> one]."

IA §12 fixes the entry behaviour: "Direct URL with an admin claim. Not linked
from the Workspace shell. **A regular user should never see a door they cannot
open.**" That is why a non-operator gets **404, not 403** — 403 confirms the door
exists.

## The matrix

| | Visitor | Person | Operator (founder / admin) |
|---|---|---|---|
| Sees | Public surface only | Public + Workspace | Public + Workspace + Mission Control |
| Cannot see | Everything session-scoped | Mission Control — *and no evidence it exists* | — |
| Routes | `/`, `/ecosystem`, `/vision`, `/founder`, `/collaborate/*`, `/services/*`, `/legal/*`, `/login`, `/signup`, `/forgot-password` | + `/workspace`, `/ledger`, `/profile`, `/account`, `/handshake` | + `/control/*` |
| Owns | nothing | own facts, permissions, commitments, accountings, API keys | same as Person; no ownership of others' data |
| May modify | nothing | only rows where `auth.uid() = user_id` | same — Mission Control reads aggregates, it does not edit people |
| Never accesses | all session data | any other person's rows; `admin_claims`; `control_access_log`; `intake_submissions`; all 7 foreign tables | other people's individual records **without a recorded reason** (IA §12) |
| Navigation | marketing nav | Workspace shell, 4 destinations + identity menu. **No `/control` link** | its own visibly different shell (IA §12: "An operator must never mistake which application they are in") |
| Forbidden action | 307 → `/login?next=…` | `/control` → **404** | individual record without a reason → refused; the access log is append-only |

## Demonstrated, not assumed

Run 2026-08-08 against a local production build wired to the **live** Supabase
project. Two probe identities were created, one granted a temporary founder
claim, and both deleted afterwards — `admin_claims` was left holding exactly the
one real founder row it started with.

**Visitor** — 9 guarded routes, all → `/login?next=<escaped>`:

```
/ledger /profile /profile/sharing /account /account/security
/account/preferences /account/subscription /workspace /handshake
/control  -> 404      /control/ -> 404      /dashboard -> 404
```

**Person** (authenticated, no claim) — reaches the Workspace; `/profile`,
`/profile/sharing` and `/workspace` divert to `/handshake` because this account
has not completed it, which is the Visibility Principle working rather than an
error:

```
/ledger -> /ledger          /account/security -> /account/security
/control -> 404             nav contains a /control link: no
```

**Operator** (founder claim) — the same URL that 404s for a Person renders:

```
/control -> 200
"AEON X · MISSION CONTROL  FOUNDER  Company-wide oversight. Aggregates only.
 Opening an individual record is a se…"
```

**Cross-user isolation** — two people each wrote one fact; querying as one
returned 1 row, 0 belonging to the other.

**Open redirect through the real login form** — now meaningful, because login
actually succeeded. All hostile payloads contained, the legitimate one honoured:

| `?next=` | landed |
|---|---|
| `https://evil.example/` | `/` |
| `//evil.example/` | `/` |
| `/\evil.example` | `/` |
| `https:/\evil.example` | `/` |
| `/ledger` | `/ledger` |

**Data layer, anon key against every table** — 7 foreign tables, `admin_claims`,
`control_access_log` and `intake_submissions` all return `42501 permission
denied`. `profile_facts`, `fact_permissions`, `ledger_commitments` and `api_keys`
return `200 []` — reachable but RLS-empty without a session, which is correct.
All 5 foreign digest functions return `42501` to an anonymous RPC.

## The chain, each link measured

| Link | Mechanism | Evidence |
|---|---|---|
| Database | RLS `auth.uid() = user_id` on every owned table | anon reads return `[]`; cross-user read returns 0 foreign rows |
| Grant | `revoke all` on `admin_claims`, `control_access_log`, `intake_submissions` | `42501` to anon, not an empty set |
| Service | `resolveViewer()` reads `admin_claims` through the service-role client only | claim table unreachable from any browser |
| Route | `(control)/control/layout.tsx` calls `notFound()` for non-operators | `/control` → 404 as Person, 200 as Operator |
| UI | Mission Control has its own shell | renders "MISSION CONTROL · FOUNDER", not the Workspace |
| Navigation | no `/control` href anywhere in the Workspace | measured: 0 matching links |
| Denial | 404, never 403 | IA §12 — a door a regular user cannot see |

## What is not covered here

- **Verified against a local production build, not the deployed origin.** Browser
  egress to `aeon-x-technologies-9kzz.vercel.app` is reset by the sandbox
  (`ERR_CONNECTION_RESET`, re-tested 2026-08-08 with and without the proxy). The
  database is the same live project in both cases; the Vercel edge is not
  exercised.
- **Admin vs founder is untested as a distinction.** Both are operators and the
  `admin_claims.role` check accepts either. Nothing in the Bibles gives them
  different powers, so nothing distinguishes them in code.
