# Phase 13 — Consolidation Report

**From `3dace52`. One product now exists.**

Phase 12 found two incompatible systems sharing a build. This phase retired one
of them: **5,403 lines across 30 files**, plus the score surfaces on the landing
page and the globe.

The objective was never a cleaner repository. It was to make it impossible for
Opportunity X to mean two different things depending on which route someone
happens to enter.

---

## A · Canonical product decision

**System A is Opportunity X.** There is no second product.

|                  |                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| **Model**        | Observation → Entity → Judgment (CR-36), four append-only tables                                        |
| **Journey**      | ARRIVE `/` → `/auth` → `/opportunities` → `/opportunities/$id` → declare → `/saved` → reopen → withdraw |
| **Declarations** | `opportunity_pursuits`, written in exactly one module                                                   |
| **Judgment**     | Evidence, corroboration and stated uncertainty. **No score, anywhere**                                  |
| **Development**  | `/lab` — fixtures, dev-only, server-refused in production                                               |

Every surface a person can reach now belongs to it.

---

## B · System B retirement map

Nothing was removed on appearance. Every file below was traced to its consumers
first, and the trace is why the cut was clean: **the canonical engine imported
nothing from System B** —

```
$ grep -rn "intelligence.functions\|execution.functions\|admin.functions\|analytics.functions\|deadline-intelligence" \
    src/lib/opportunity/ src/lib/opportunities.server.ts src/lib/lab.server.ts
<none — clean>
```

### Removed — routes (13)

| Route                                                           | Why                                                                                       |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/search`                                                       | Legacy discovery surface; `liveWebSearch` — unauthenticated, service-role writes, paid AI |
| `/opportunity/$id`                                              | Duplicate opportunity detail, unauthenticated, carrying the match ring                    |
| `/vault`                                                        | Duplicate saved list, reading `saved_opportunities`                                       |
| `/onboarding`                                                   | Legacy profile capture against `profiles`                                                 |
| `/dashboard`, `/dashboard/applications`, `/dashboard/documents` | Legacy product shell                                                                      |
| `/admin`, `/admin/queue`, `/admin/featured`, `/admin/analytics` | Moderation of the legacy `opportunities` table                                            |
| `/api/public/hooks/crawl-opportunities`                         | Legacy crawl pipeline                                                                     |
| `/api/public/hooks/deadline-reminders`                          | Legacy reminder job over `saved_opportunities`                                            |

### Removed — components (8)

`MatchScoreBadge` · `OpportunityCard` (legacy) · `OpportunitySection` ·
`UrgencyBadge` · `EligibilityPanel` · `CopilotPanel` · `ShareToWhatsApp` ·
`Header` (legacy navigation).

Each was consumed **only** by the routes above; none is referenced by any
surviving surface.

### Removed — services (7)

`intelligence.functions.ts` (591) · `execution.functions.ts` (569) ·
`admin.functions.ts` · `analytics.functions.ts` ·
`deadline-intelligence.server.ts` · `email.server.ts` · `firecrawl.server.ts`.

The last two were already dead — no importer at all. The canonical engine has its
own Firecrawl transport at `src/lib/opportunity/discovery/transports/firecrawl.ts`.

### Removed — the third door onto the reminder job

`src/server.ts` called `runDeadlineIntelligenceCheck()` **at module scope on
startup, then every hour on a `setInterval`.** It read every user's saved
opportunities and emailed them.

Phase 12 gave the two HTTP hooks a shared secret and did not find this one,
because it needs no request. On a serverless target every cold start is a server
start, so the schedule was neither hourly nor bounded. It is gone, and
`test/consolidation.test.ts` asserts the entry point schedules nothing.

### Removed — score surfaces on the landing page

`/` was never part of System B, and it carried its claims:

| Surface               | Was                                                                                         | Now                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Personalisation panel | **"94%" / "Match"** beside _Mastercard Foundation Scholars Program_, a real named programme | "Why", above the reasons that were already listed                                                                         |
| `OpportunityGlobe`    | `matchScore` on 33 nodes, `"{n}% Match"` on hover, `"Avg match {n}%"` per country           | Field deleted; hover shows the opportunity's kind; the country panel shows **"Verified: n of m"** — a count with a source |
| Engine ticker         | "Searching, Discovering, Reading, Verifying, **Ranking, Matching**"                         | "…, **Corroborating, Explaining**"                                                                                        |
| Section nav           | "Match"                                                                                     | "Fit"                                                                                                                     |

The 94% and the 33 node scores were **invented**. The comment on the type read
`// 0-100 illustrative`, which on screen was a fabricated claim about DAAD,
Chevening and Mastercard Foundation by name, on the most public page the product
has. That is CR-21 and a fabrication in the same element.

### Removed — a dead duplicate write path

`saveOpportunity` / `unsaveOpportunity` in `opportunities.server.ts`: a complete
second pair of declaration functions writing `opportunity_pursuits` through the
same provider, with **no consumer**. The product had three ways to record a
declaration and used one.

### Retained deliberately

| Kept                                                       | Why                                                                                                                                       |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/ui/*`                                      | Shadcn/Radix primitives; no product semantics                                                                                             |
| `BrandLoader`, `BrandMark`, `ThemeProvider`, `ThemeToggle` | Shared, model-neutral                                                                                                                     |
| `OpportunityGlobe`                                         | Atmosphere on the landing page, **with its scores removed**. It shows where opportunities are announced and by whom — facts with a source |
| `src/integrations/supabase/types.ts`                       | Generated mirror of the database, which still holds the legacy tables. Stale and cannot be regenerated without database access — see §K   |
| All 15 legacy tables                                       | See §I. Nothing was dropped                                                                                                               |

### Removed as collateral — Phase 12's cron guard

`cron-authorization.ts` and `test/authorization.test.ts` guarded the two hooks and
the admin functions. All of those are gone, so the guard had no caller and the
tests covered deleted code.

**This is strictly stronger than the Phase 12 fix**: an endpoint that does not
exist cannot be authorized incorrectly. The pattern — constant-time compare,
fail-closed, guard the capability and not only the route — is recorded in
`docs/PHASE_12_COMPLETENESS_AUDIT.md` §G and in git history at `3dace52`, and
should be reused when a canonical scheduled job appears.

---

## C · Declaration and data consolidation

**Authoritative store: `opportunity_pursuits`. Sole write path:
`src/lib/pursuit.functions.ts`.**

Before this phase there were three writers and two stores. Now:

```
$ grep -rn 'log\.declare(\|log\.withdraw(' src/lib   # excluding the store itself
src/lib/pursuit.functions.ts
```

`test/consolidation.test.ts` asserts that list is exactly one entry, and the
assertion was shown to fail when a second writer is reintroduced.

**`saved_opportunities` was not migrated, and must not be.**
`saved_opportunities.opportunity_id` references the legacy `opportunities` table.
`opportunity_pursuits.entity_id` references an entity resolved from observations.
**There is no correspondence between those identifiers** — the two models never
described the same objects — so a migration would have to invent one, and the
result would be declarations nobody made, in an append-only store, about
opportunities that may not exist.

It is therefore **explicitly archived, not migrated**: annotated in the database
as retired, flagged as possibly containing real user statements, and left
untouched pending an export. See §I.

The consequence, stated plainly: **any interest a person expressed in the legacy
product is not visible in the canonical product, and this phase did not make it
visible.** That is the honest outcome of two models that were never reconcilable,
and it is preferable to a fabricated correspondence.

---

## D · Preparation capabilities

CR-09 is unambiguous: _"Opportunity X owns discovery, verification, explanation,
**preparation**, timing"_ and _"Application assistance is core, not auxiliary."_

Four candidate capabilities existed in `execution.functions.ts`. Traced per §6:

| Capability         | Authority                                         | Operated on                             | Survives?                                                                                                 |
| ------------------ | ------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `checkEligibility` | CR-12 (_"why the user matches, why they do not"_) | Legacy `opportunities` row + `profiles` | **No.** Wrote `eligibility_results`, a per-person verdict derived from a model with no evidence behind it |
| `generateSOP`      | **CR-09**                                         | Legacy `opportunities` row              | **Capability yes, implementation no**                                                                     |
| `optimizeCV`       | **CR-09**                                         | `user_documents` + legacy opportunity   | **Capability yes, implementation no**                                                                     |
| Deadline reminders | **CR-08** (_"lateness is a product failure"_)     | `saved_opportunities`                   | **Capability yes, implementation no**                                                                     |

**None was rebuilt, and none was quarantined.** The reasoning, which is the part
that matters:

Every one of them takes a legacy `opportunities` row as its subject. Rebuilding
them on the canonical model means operating on an **entity resolved from
observations** — and there are currently **zero observations**. A preparation
surface built now would have nothing to prepare against, and shipping one would
be manufacturing completion, which §7 forbids in terms.

Dead unreachable code in `src/` is the debt this phase exists to remove, so the
implementations were not parked in a quarantine module either. They are preserved
where preservation belongs: **git history at `3dace52`**, with their authority,
their subject and their blocking dependency recorded here.

**What a canonical rebuild requires**, so the next phase does not re-derive it:

1. At least one resolved entity — i.e. discovery must have succeeded once.
2. A canonical document store. `user_documents` belongs to the legacy model, and
   the four canonical tables have nowhere to put a CV.
3. A decision on whether generated drafts are observations (they are not — they
   are not claims about the world), declarations (they are not — they are not
   statements of position), or a fifth kind of record. **This is a schema
   decision and a constitutional one, and it has not been made.**

---

## E · Constitutional audit

| Rule                                          | Before                                                                | Now                                                                                                                                                                                                                                                      |
| --------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CR-09** — preparation is owned              | Implemented against the legacy model                                  | **Unimplemented, authority recorded** (§D). Not falsely retained                                                                                                                                                                                         |
| **CR-21** — no collapse into one opaque score | Violated: `match_scores`, `MatchScoreBadge`, "94% Match", "Avg match" | **Held.** No score renders, none is computed, and a variable named `scored` in `judgeAll` was renamed `ordered` — it held three separate sort criteria, but a name for a judgment this engine does not make is how that judgment eventually gets written |
| **CR-24** — inspectable person model          | Missing                                                               | **Still missing. Not implemented** (§7). Recorded as a gap                                                                                                                                                                                               |
| **CR-25** — "show me anyway" override         | Missing                                                               | **Still missing. Not implemented** (§7). Recorded as a gap                                                                                                                                                                                               |
| **CR-36** — three layers                      | Held in System A, contradicted by System B                            | **Held. Only one model remains**                                                                                                                                                                                                                         |
| **CR-37** — observations immutable            | Held                                                                  | **Held.** 40/40 migration assertions re-run after every database change                                                                                                                                                                                  |
| **CR-20** — the system may return nothing     | Held                                                                  | **Held.** Unknown / Absent / Empty remain three components                                                                                                                                                                                               |
| **CR-04** — success is not engagement         | Contradicted by `opportunity_analytics` (view/save/share/apply_click) | **Held.** The analytics writer is gone; the table is annotated retired                                                                                                                                                                                   |
| **CR-18** — awareness is not endorsement      | Held in System A                                                      | **Held**                                                                                                                                                                                                                                                 |

**No requirement was invented to fill a gap, and no gap was closed by
redefinition.** CR-24 and CR-25 remain unimplemented and are reported as such.

---

## F · Security audit

| Finding                                                                                                                                | Status                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Two unauthenticated public POST hooks (service-role writes; email to every user)                                                       | **Routes deleted.** Both return 404                                                                          |
| In-process reminder scheduler in `src/server.ts`, needing no request                                                                   | **Deleted**                                                                                                  |
| `liveWebSearch` — unauthenticated, service-role writes, paid AI                                                                        | **Deleted with `/search`.** Phase 12 recommended authentication; retirement is stronger                      |
| `getOpportunity`, `trending`, `newThisWeek`, `endingSoon`, `listByCategory`, `searchOpportunities`, `trackEvent` — all unauthenticated | **Deleted**                                                                                                  |
| Admin service functions                                                                                                                | **Deleted.** `has_role`, `user_roles` and the RLS policies remain in the database with no application caller |

**Surviving server functions and their guards** — every one now requires
authentication or the development-only laboratory guard:

| Module                              | Guard                              |
| ----------------------------------- | ---------------------------------- |
| `opportunities.server.ts` (4 reads) | `requireSupabaseAuth`              |
| `pursuit.functions.ts` (2 writes)   | `requireSupabaseAuth`              |
| `lab.server.ts` (5)                 | `assertDevelopment()`, server-side |

`test/consolidation.test.ts` asserts no unguarded module reaches the service role.

---

## G · Route and navigation audit

**The compiler found the navigation defects.** Deleting the routes made
`to="/search"` a type error in three places on the landing page — the nav CTA,
the hero secondary CTA and the closing CTA. All three now point at
`/opportunities`, which redirects through `/auth?next=%2Fopportunities` when
signed out and returns the person to it.

Measured against a running server:

| Legacy path                          |         | Canonical path                          |     |
| ------------------------------------ | ------- | --------------------------------------- | --- |
| `/search`                            | **404** | `/`                                     | 200 |
| `/opportunity/abc-123`               | **404** | `/auth`                                 | 200 |
| `/vault`                             | **404** | `/opportunities`                        | 200 |
| `/dashboard`, `/dashboard/documents` | **404** | `/saved`                                | 200 |
| `/onboarding`                        | **404** | `/opportunities/examples`               | 200 |
| `/admin/queue`, `/admin/analytics`   | **404** | `/lab`, `/lab/states`, `/lab/mutations` | 200 |
| both `/api/public/hooks/*`           | **404** |                                         |     |

**The built artifact was inspected, not only the source.** `.vercel/output`
contains no legacy route registration, no `saved_opportunities`, no
`match_scores`, no `MatchScoreBadge` and no `liveWebSearch`.

**Can a real user still enter the old product? No.** There is no route to enter,
no link to follow, and nothing in the bundle to serve.

---

## H · State and regression audit

Phase 11 is intact. The full browser walk re-run after consolidation:
**ALL CHECKS PASSED.**

- Pending write: `aria-pressed="false"`, position unchanged, _"Nothing is kept
  until I've confirmed it."_
- Confirmed only after read-back: `aria-pressed="true"`.
- Failed write: _"nothing was recorded"_, previous position restated, retry offered.
- Written-but-unshown: reported as itself, not as success or failure.
- Refusal: carries the action's own words.
- Unknown / Absent / Empty remain three distinct components.
- No console errors; no horizontal overflow at 375 / 768 / 1280; light and dark.
- Signed out, `/opportunities` still redirects with the destination preserved.

`/lab` was **not extended**. It already exercises every canonical state, and §12
permits extension only where necessary — nothing in this consolidation created a
state it could not already demonstrate.

---

## I · Database migration status

**Nothing was dropped.** One migration was added, and it is metadata only:
`20260817190000_mark_legacy_tables_retired.sql` writes `COMMENT ON TABLE` for
each legacy table and re-states what the canonical four are. It changes no data,
no constraint, no policy, no privilege, and re-running it is a no-op.

| Table                                                                        | Referenced by code? | Contents                           | Disposition                                                                                                                  |
| ---------------------------------------------------------------------------- | ------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `opportunity_observations`                                                   | Yes                 | Evidence                           | **Canonical**                                                                                                                |
| `opportunity_verification_events`                                            | Yes                 | Verdict history                    | **Canonical**                                                                                                                |
| `opportunity_pursuits`                                                       | Yes                 | Declarations                       | **Canonical**                                                                                                                |
| `opportunity_deliveries`                                                     | No writer           | Empty                              | **Canonical, unimplemented**                                                                                                 |
| `saved_opportunities`                                                        | **No**              | **Possibly real user statements**  | **Archive — export first**                                                                                                   |
| `applications`                                                               | **No**              | **Possibly real user records**     | **Archive — export first**                                                                                                   |
| `user_documents`                                                             | **No**              | **Possibly user files**            | **Archive — export first**                                                                                                   |
| `generated_sops`                                                             | **No**              | **Possibly user-authored content** | **Archive — export first**                                                                                                   |
| `cv_optimizations`                                                           | **No**              | Derived suggestions                | Retire after export                                                                                                          |
| `profiles`                                                                   | **No**              | **User-entered profile data**      | **Archive — export first**                                                                                                   |
| `opportunities`                                                              | **No**              | Legacy crawl output                | Retire                                                                                                                       |
| `match_scores`                                                               | **No**              | The forbidden score                | Retire                                                                                                                       |
| `eligibility_results`                                                        | **No**              | Derived verdicts                   | Retire                                                                                                                       |
| `notifications`, `sent_reminders`, `discovery_runs`, `opportunity_analytics` | **No**              | Machinery state                    | Retire                                                                                                                       |
| `user_roles`                                                                 | **No**              | Role grants                        | **Hold.** No application caller, but the Constitution has no role model (Phase 12 §D) and the grants may still be meaningful |

**Row counts are unknown** — this environment cannot reach
`anfiojmbgonrtympzjch`. That is precisely why nothing was dropped. Any
destructive migration must be written separately, after counting, and after
exporting everything marked "export first".

`npm run verify:migrations` re-run after the change: **40 passed, 0 failed.**

---

## J · Verification gates

| Gate            | Command                     | Result                                                            |
| --------------- | --------------------------- | ----------------------------------------------------------------- |
| TypeScript      | `bunx tsc --noEmit -p .`    | **0 errors**                                                      |
| ESLint          | `bun run lint`              | **0 errors**, 8 warnings (all pre-existing, `src/components/ui/`) |
| Tests           | `npm test`                  | **251 pass / 0 fail**                                             |
| Build           | `bun run build`             | **passes**                                                        |
| Migrations      | `npm run verify:migrations` | **40 / 0**                                                        |
| Route audit     | live server                 | 10 legacy paths **404**; 8 canonical paths 200                    |
| Deep links      | browser                     | `next=` preserved with query string                               |
| Fixture journey | `npm test`                  | passing                                                           |
| State walk      | browser                     | **ALL CHECKS PASSED**                                             |
| Artifact        | `.vercel/output`            | no legacy route, table, component or function                     |

### Adversarial verification

Nine mutations introduced one at a time, each observed to fail the suite, each
reverted:

| Mutation                                     | Caught                                       |
| -------------------------------------------- | -------------------------------------------- |
| A legacy module file restored                | ✅                                           |
| A legacy link (`href="/dashboard"`) restored | ✅                                           |
| A match percentage restored (`92% Match`)    | ✅                                           |
| A camelCase score in the engine (`fitScore`) | ✅                                           |
| A `scored` variable in the engine            | ✅                                           |
| A legacy table read                          | ✅                                           |
| A second declaration write path              | ✅                                           |
| A background scheduler in `src/server.ts`    | ✅                                           |
| A legacy route in the built artifact         | ✅ (assertion runs against `.vercel/output`) |

**Two assertions were vacuous on the first pass and are recorded, because the
misses are instructive.** `\b(score|scoring)\b` caught neither `fitScore` —
camelCase places no word boundary before "score" — nor `scored`, which needs a
boundary after it. The pattern is now `\w*scor\w*`, and finding it is what
surfaced the misleading variable name in `judgeAll` that §E describes.

---

## K · Remaining gaps

- **CR-24 and CR-25 are unimplemented.** Deliberately, per §7. Both need schema
  and product decisions.
- **CR-09 preparation is unimplemented.** Blocked on there being an entity to
  prepare against — see §D for what a rebuild requires.
- **CR-08 reminders are unimplemented.** The legacy job is gone; a canonical one
  must read `opportunity_pursuits` and be invoked by something authorizable.
- **`opportunity_deliveries` still has no writer**, so the retention principle
  has nowhere to record what was shown.
- **`src/integrations/supabase/types.ts` is stale** — it contains the 15 legacy
  tables and none of the canonical four, so the engine talks to Supabase through
  `as never`. Regeneration needs database access.
- **Legacy data has not been exported.** Row counts unknown; nothing dropped.
- **Unchanged since Phase 10:** `auth.users` = 0, zero observations, announcer
  egress `403`, production serving a pre-Phase-10 build. **Every canonical
  surface remains fixture-verified only.**

---

## L · Recommendation for Phase 14

Phase 13 leaves one coherent foundation. The next constraint is not
architectural — it is that **nothing in it has ever met real data.**

**Recommended Phase 14: the comprehensive state system**, as you described —
deliberate UX patterns for loading, success, error, degraded, retry, pending
mutation, empty, absent and unknown, rather than one generic treatment.

It is the right next phase for three reasons. It needs no schema decision, so it
is not blocked on §K. It builds directly on Phase 11 rather than replacing it —
Phase 11 established that the states must be distinguishable; Phase 14 would give
each a considered pattern. And the one genuinely unimplementable state, **partial
or degraded**, is unimplementable for a reason worth confronting: it requires the
_reads_ to return partial results, which is engine work, and doing it would close
`opportunity_deliveries` as a side effect.

**Two things should precede it, and neither is a phase:**

1. **Run the Phase 10 external verification.** One confirmed account and one
   bounded sweep would convert every "fixture-verified" claim in this report into
   a measured one.
2. **Decide whether the archived legacy data is wanted.** If it is, export it
   before anything else touches the database. If it is not, say so and a
   destructive migration can be written honestly.

---

_Phase 14 was not started. Phases 10, 11 and 12 were not reopened. No live data
was manufactured. No authentication was weakened. No legacy data was migrated on
a guess, and no constitutional gap was closed by redefinition._
