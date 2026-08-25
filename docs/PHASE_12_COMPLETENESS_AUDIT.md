# Phase 12 — Product Completeness Audit

**Question:** does the implementation actually contain the product we specified?

**Answer, in one line:** it contains **two** products. One of them implements the
Constitution. The other one is what most of the navigation points at, and it
violates CR-21 on its front page.

---

## 0 · The authority problem, first

Phase 12 was directed to audit against a precedence order of _Product Bible ·
Experience Bible · Brand Bible · IA · Flow specifications · Component System ·
constitutional/legal requirements · amendments and ratifications._

**Five of those eight do not exist in this repository, and never have.**

```
$ git log --all --pretty=format: --name-only --diff-filter=A | sort -u | grep -i bible
(no output — no file with "bible" in its name has ever been added)

$ git log --all --pretty=format: --name-only --diff-filter=A -- 'docs/'
docs/APPLYING_THE_MIGRATIONS.md      docs/PHASE13_ENGINE_RECONCILIATION.md
docs/CARD_SURFACE_RECONCILIATION.md  docs/PHASE15_CORPUS_RECOVERY.md
docs/COMPLIANCE_AUDIT.md             docs/PHASE_10_EXTERNAL_VERIFICATION.md
docs/CONSTITUTION.md                 docs/PHASE_11_RATIFICATION.md
docs/DECISION_LOG.md                 docs/R-01_RESEARCH.md
docs/ENGINEERING_GATE_REPORT.md      docs/R-12_RETENTION.md
docs/ENGINE_REQUIREMENTS.md          docs/R-13_RESEARCH.md
docs/HANDOFF_EVIDENCE.md             docs/R-14_RESEARCH.md
docs/ROADMAP.md                      docs/R-15_RESEARCH.md
```

They are nonetheless **cited by section number in 20 source files** — 30 distinct
citations: `Experience Bible §7` (6×), `Product Bible §07` (4×), `IA Bible §18`
(4×), `Brand Bible §07` (3×), and eleven more. Components were built against
sections of documents that are not here.

**What this audit therefore used as authority:** `docs/CONSTITUTION.md` — Phase 1
ratified, 37 constitutional rules, two founder product requirements, one
amendment (A-01), and the ontology and layer model. It is law by its own terms
and by `CLAUDE.md`. Everything below is measured against it.

**Three consequences, recorded rather than worked around:**

1. Where the Constitution is silent, this audit records a **gap**, per the
   directive's own instruction not to invent policy. It does not fill silence
   with product convention.
2. Requirements that live only in the missing Bibles cannot be audited at all.
   Section §B.5 lists what Phase 12 asked for that has no authority here.
3. The citations should either be resolved — the Bibles supplied — or the
   comments corrected. Right now the codebase cites law that cannot be read.

---

## A · Requirements matrix

Status vocabulary is the directive's. **Evidence** is a command that was run or a
file that was read; nothing here is inferred from a component's name.

### A.1 · The three-layer epistemic model

| ID   | Requirement                                 | Authority           | Status                       | Evidence                                                                                                                    |
| ---- | ------------------------------------------- | ------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| L-01 | Observation / Entity / Judgment kept apart  | CR-36               | **IMPLEMENTED + VERIFIED**   | `src/lib/opportunity/{observation,entity,judgment}/` are separate modules; 4 tables; `npm run verify:migrations` 40/40      |
| L-02 | Observations immutable, monotonic           | CR-37               | **IMPLEMENTED + VERIFIED**   | 8 append-only triggers; UPDATE/DELETE/TRUNCATE each refused under test                                                      |
| L-03 | Discovery finds _claims_, not opportunities | CR-35               | **IMPLEMENTED + UNVERIFIED** | `observation/types.ts`, `entity/resolve.ts`; never exercised against live sources (0 observations)                          |
| L-04 | Duplicate observations retained             | CR-36               | **IMPLEMENTED + UNVERIFIED** | `entity/group.ts`; no live corpus                                                                                           |
| L-05 | What was displayed is retained as evidence  | Retention principle | **PARTIAL**                  | `opportunity_deliveries` exists; nothing writes to it — `grep -rn "opportunity_deliveries" src/` returns the migration only |

### A.2 · Judgment and explanation

| ID   | Requirement                                                                             | Authority | Status                       | Evidence                                                                                                                                                                                                                                                                   |
| ---- | --------------------------------------------------------------------------------------- | --------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J-01 | Mechanisms never collapsed into one score                                               | CR-21     | **CONTRADICTORY**            | Held in `src/lib/opportunity/` (no score anywhere). Violated by `match_scores` + `MatchScoreBadge`, which renders a 0–100 % ring. See §C.1                                                                                                                                 |
| J-02 | Verification is a property of the opportunity, not the pairing                          | CR-30     | **IMPLEMENTED + VERIFIED**   | `verification/service.ts` takes no person argument                                                                                                                                                                                                                         |
| J-03 | Verification is continuous; verified can become unverified                              | CR-11     | **IMPLEMENTED + UNVERIFIED** | `opportunity_verification_events` + `verification/log.ts`; no live decay has occurred                                                                                                                                                                                      |
| J-04 | Sub-threshold opportunities still surface                                               | CR-18     | **IMPLEMENTED + UNVERIFIED** | `surface/card.ts` renders every verdict; `VerificationSeal` states it in words                                                                                                                                                                                             |
| J-05 | The system can return nothing                                                           | CR-20     | **IMPLEMENTED + VERIFIED**   | `UnknownState` / `AbsentState` / `EmptyState`, three distinct components; `/lab/states`                                                                                                                                                                                    |
| J-06 | Explanation exposes known / inferred / evidence / uncertain / why surfaced / why ranked | CR-33     | **PARTIAL**                  | Inspection has 7 sections incl. _What I looked at_, _Not settled_, _Sources disagree_. **Why it was ranked where it was is not shown.**                                                                                                                                    |
| J-07 | Explanation covers 11 named elements                                                    | CR-12     | **PARTIAL — 4 of 11 absent** | Present or partial: why it exists, who for, why you match/don't, effort, probability, alternatives. **Absent: required documents · selection process · hidden expectations · common mistakes** (`grep -rli` across `components/opportunity/` and `surface/` finds nothing) |
| J-08 | Reasoning is the primary artifact, summaries derived                                    | CR-33     | **IMPLEMENTED + VERIFIED**   | `surface/inspection.ts` projects from stored observation records; card is derived from the same                                                                                                                                                                            |

### A.3 · The person

| ID   | Requirement                                         | Authority      | Status                       | Evidence                                                                                                                                                                                                                                                                                                 |
| ---- | --------------------------------------------------- | -------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-01 | Person-model inspectable; inference labelled        | **CR-24**      | **MISSING at the surface**   | The model exists — `foundation/person.ts` has `ConfirmedFact` / `InferredFact` / `LearnedFact` tiers. It is **not persisted** (no person table among the 4 constitutional tables) and **there is no route on which a person can see it.** CR-24 is a requirement about what the _person_ can distinguish |
| P-02 | "Show me anyway" override, prominent and unpunished | **CR-25**      | **MISSING**                  | `Override` type exists in `judgment/types.ts` and is **never constructed** — `grep -rn "Override" src/ --include=*.ts` outside that file returns only an unrelated `DeclarationOverrides` in the fixture module. No UI                                                                                   |
| P-03 | Cold-start field cap                                | CR-22 / FPR-02 | **IMPLEMENTED + UNVERIFIED** | `/onboarding` exists (System B); its field set has not been audited against FPR-02's list                                                                                                                                                                                                                |
| P-04 | Personalisation expands the possibility space       | CR-31          | **PARTIAL**                  | `whySurfaced` exists on the card. No mechanism deliberately reasons beyond known interests                                                                                                                                                                                                               |
| P-05 | Infer context, never destiny                        | CR-32          | **IMPLEMENTED + UNVERIFIED** | `foundation/person.ts` tiers separate circumstance from capability; no live inference has run                                                                                                                                                                                                            |

### A.4 · Declarations

| ID   | Requirement                                      | Authority       | Status                     | Evidence                                                                                                                                                                                                 |
| ---- | ------------------------------------------------ | --------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-01 | Declare interested / not-interested / undeclared | CR-25 hierarchy | **IMPLEMENTED + VERIFIED** | `InterestedControl`; three states, undeclared is its own                                                                                                                                                 |
| D-02 | Withdrawal is a real delete                      | Ownership       | **IMPLEMENTED + VERIFIED** | `withdrawPursuit`; migration test "withdrawing a declaration (DELETE) — allowed"                                                                                                                         |
| D-03 | A declaration never mutates opportunity facts    | CR-36           | **IMPLEMENTED + VERIFIED** | `judgeAll` never reads pursuits; separate tables; separate RLS                                                                                                                                           |
| D-04 | Read-after-write; pending ≠ committed            | Phase 11        | **IMPLEMENTED + VERIFIED** | `performWrite`, four outcomes, all tested; browser walk                                                                                                                                                  |
| D-05 | Ownership enforced server-side                   | —               | **IMPLEMENTED + VERIFIED** | RLS: "person A cannot write a declaration owned by person B" — refused under test                                                                                                                        |
| D-06 | **One declaration store**                        | CR-21 spirit    | **CONTRADICTORY**          | Two exist. `opportunity_pursuits` (constitutional) and `saved_opportunities` (System B, written by `src/components/OpportunityCard.tsx`, read by `/vault`, `/dashboard`, and the reminder job). See §C.2 |

### A.5 · Authentication and authorization

| ID   | Requirement                                 | Status                     | Evidence                                                                                                                                                                                                                                                               |
| ---- | ------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Z-01 | Protected routes gated                      | **IMPLEMENTED + VERIFIED** | Browser sweep: 10/10 protected routes redirect to `/auth?next=…` signed out                                                                                                                                                                                            |
| Z-02 | Deep-link destination preserved incl. query | **PARTIAL**                | `/opportunities/abc-123?ref=email` → `next=%2Fopportunities%2Fabc-123%3Fref%3Demail`. But `CAPTURABLE = ["/opportunities","/saved"]`, so a captured `/dashboard` or `/vault` destination is **silently discarded** at sign-in and the person lands on `/opportunities` |
| Z-03 | Off-origin redirect refused                 | **IMPLEMENTED + VERIFIED** | `safe-redirect.ts` positive enumeration; scheme / `//` / embedded-scheme cases                                                                                                                                                                                         |
| Z-04 | Unreachable auth ≠ signed out               | **IMPLEMENTED + VERIFIED** | Phase 11; `classifySessionCheck` branches tested                                                                                                                                                                                                                       |
| Z-05 | Admin capability enforced server-side       | **IMPLEMENTED + VERIFIED** | `requireAdmin` inside every mutating handler, **before** `supabaseAdmin`; asked through the user-scoped client; `has_role` is `SECURITY DEFINER` with `SET search_path = public`. Six mutation tests                                                                   |
| Z-06 | Scheduled jobs are not public               | **FIXED THIS PHASE**       | Was: unauthenticated POST. Now: 401 without the header, 503 unconfigured. See §G                                                                                                                                                                                       |
| Z-07 | `liveWebSearch`                             | **MISSING**                | Unauthenticated, drives the paid AI pipeline and writes with the **service role**. Not changed — see §J.1                                                                                                                                                              |

### A.6 · Constitutional surfaces the directive named

| Asked for                                                   | Status                                       | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/profile` and `/profile/sharing`, "one permission truth"   | **NO AUTHORITY, NOT PRESENT**                | No such route. `grep -c "/profile" docs/CONSTITUTION.md` → 0; `permission` → 0. The nearest _real_ requirement is CR-24 (P-01), which is a different thing                                                                                                                                                                                                                                                                     |
| Preparation domain "added by the constitutional amendments" | **AUTHORITY EXISTS, MISATTRIBUTED; PARTIAL** | There is one amendment (A-01) and it concerns product separation. Preparation is required by **CR-09** — original, not amended: _"Preparation is constitutionally owned. Application assistance is core, not auxiliary."_ System B implements `generateSOP`, `optimizeCV`, `checkEligibility`. **None of it is connected to the constitutional entity model** — all three read `opportunities`, not `opportunity_observations` |
| `/legal/*` "ratified constitutional requirement"            | **NO AUTHORITY, NOT PRESENT**                | No route; `grep -c "legal" docs/CONSTITUTION.md` → 0                                                                                                                                                                                                                                                                                                                                                                           |
| Role/persona requirements "in the Bibles"                   | **NO AUTHORITY**                             | `grep -ci "role" docs/CONSTITUTION.md` → **0**. See §D                                                                                                                                                                                                                                                                                                                                                                         |

---

## B · Missing capabilities

Genuinely missing product behaviour, with real authority behind it, ordered by
constitutional weight.

1. **The person cannot see what the system believes about them (CR-24).** The
   three-tier fact model is built and typed. It is not persisted, and no surface
   renders it. CR-24 is not satisfied by a type that distinguishes confirmed from
   inferred; it requires that _the person_ can.
2. **There is no override (CR-25).** _"Show me anyway"_ is required to be
   prominent, immediate, and never punished. It does not exist in any form a
   person can reach. The `Override` type is dead code.
3. **Ranking is never explained (CR-33).** _Why it was ranked where it was_ is
   one of the six things a judgment must expose. The inspection surface explains
   what was observed and what is uncertain; it does not explain position.
4. **Four of CR-12's eleven explanation elements are absent**: required
   documents, selection process, hidden expectations, common mistakes.
5. **Preparation is not connected to the constitutional model (CR-09).** The
   capability exists in System B against the wrong data model.
6. **Nothing records what was delivered.** `opportunity_deliveries` has a table,
   triggers and RLS, and no writer — so the retention principle's _"what we told
   someone is evidence"_ has nowhere to live.

**None of these were implemented in this phase.** Each needs a data model, a
persisted store, and in two cases a founder decision about which product they
attach to. Implementing them against System B would deepen the contradiction in
§C; implementing them against System A requires knowing that System A is the
product. That is the decision §K asks for.

---

## C · Contradictions

### C.1 · Two products in one build

This is the finding of the phase.

|          | System A — the constitutional engine                                                                                | System B — the pre-migration app                                                                                                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Built in | Phases 4–11                                                                                                         | Before the extraction                                                                                                                                                                                                                                         |
| Data     | `opportunity_observations`, `opportunity_verification_events`, `opportunity_pursuits`, `opportunity_deliveries`     | `opportunities`, `match_scores`, `profiles`, `saved_opportunities`, `applications`, `user_documents`, `generated_sops`, `cv_optimizations`, `eligibility_results`, `notifications`, `discovery_runs`, `sent_reminders`, `opportunity_analytics`, `user_roles` |
| Routes   | `/opportunities`, `/opportunities/$id`, `/saved`, `/opportunities/examples`, `/lab/*`                               | `/`, `/search`, `/opportunity/$id`, `/dashboard*`, `/vault`, `/onboarding`, `/admin/*`                                                                                                                                                                        |
| Scoring  | **None.** `grep -niE "\bscore\b" src/lib/opportunity/` returns four comments, each explaining why there is no score | `MatchScoreBadge` renders `score × 100` as a percentage ring                                                                                                                                                                                                  |
| Voice    | First person, absence stated                                                                                        | Badges, chips, confidence percentages                                                                                                                                                                                                                         |

They share a build, a router, and a Supabase project. They share no data.

**The specific constitutional breach:** CR-21 — _"the five mechanisms … may not
be collapsed into a single opaque score"_ — and CR-33's structural guard. A 0–100 %
"Match" ring is the composite number CR-21 names. It is on `/opportunity/$id`,
which is **unauthenticated** and carries OG tags for sharing, so it is the most
publicly visible surface the product has.

**Reachability, measured:**

- `/` links to `/auth` and `/search` only — never to `/opportunities`.
- `Header.tsx` (rendered only on the three `/dashboard*` routes) links to
  `/dashboard`, `/dashboard/applications`, `/dashboard/documents`, `/vault`,
  `/onboarding`, `/admin/queue`, `/search`, `/` — **never to `/opportunities` or
  `/saved`.**
- Sign-in with no destination lands on `/opportunities` (`AUTH_LANDING_PATH`).

So a signed-in person reaches System A, and every piece of navigation in the
product points away from it.

### C.2 · Two declaration stores

`opportunity_pursuits` and `saved_opportunities` both record "this person cares
about this opportunity", against different opportunity identifiers, with
different write paths, and neither knows about the other. The deadline-reminder
job reads `saved_opportunities`; the constitutional `/saved` page reads
`opportunity_pursuits`. **A person who declares interest on `/opportunities/$id`
will not be reminded about it.**

This is the same class of defect the directive anticipated for `/profile/sharing`
— parallel stores of one truth — occurring for declarations instead.

### C.3 · Two opportunity-detail routes

`/opportunities/$id` (authenticated, constitutional) and `/opportunity/$id`
(unauthenticated, System B, match score, OG tags). Same noun, different
guarantees. `/opportunity/abc-123` also returns **HTTP 500** for an unknown id
rather than the `notFound()` it intends.

### C.4 · Generated types are stale

`src/integrations/supabase/types.ts` contains none of the four constitutional
tables, so the entire Phase 4–11 engine talks to Supabase through `as never`
casts. Regenerating needs live database access (blocked — see §J).

---

## D · Role and authorization audit

**Roles that exist:** two. `app_role` is `'admin' | 'user'`.

| Capability                                     | Enforced where                                                 | Client-only?                                                    |
| ---------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
| Read unverified `opportunities`                | RLS: `USING (verified = true OR has_role(auth.uid(),'admin'))` | No                                                              |
| Update / delete `opportunities`                | RLS + `requireAdmin` in the handler                            | No                                                              |
| Approve, feature, list pending, view analytics | `requireAdmin(context)` **before** `supabaseAdmin`             | No                                                              |
| See the `/admin` UI                            | `beforeLoad` redirect                                          | **Yes — and correctly so**, it sits on top of the server checks |
| Own declarations                               | RLS on `opportunity_pursuits`, `auth.uid()`                    | No                                                              |
| Run a scheduled job                            | `authorizeCronRun` — **added this phase**                      | No                                                              |

**Can a UI restriction be bypassed by invoking the action directly?** For admin,
no — verified by test and by reading every handler: the role is checked inside
the handler, against the **user-scoped** client (so the caller cannot answer its
own question), and `has_role` is `SECURITY DEFINER` with a pinned `search_path`
(so a caller who can create a schema cannot shadow `user_roles`). Six mutations
confirm each of those properties fails the suite when removed.

**The gap, recorded rather than filled:** the Constitution contains **no role
model** — the word "role" does not appear in it. The two roles in the database
are an artifact of the pre-migration app. What an admin may legitimately do to a
constitutional opportunity is therefore undefined: an admin can today `DELETE`
from `opportunities`, and CR-37 makes deletion of an _observation_ unthinkable.
Whether that asymmetry is intended cannot be determined from any document here.
**No role policy was invented.**

---

## E · Core journey audit

| Stage        | Status                                                            | Evidence                                                                                                                         |
| ------------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **ARRIVE**   | **CONTRADICTORY**                                                 | `/` renders and its CTAs lead to `/auth` and `/search`. Nothing points at the constitutional product                             |
| **SIGN IN**  | **IMPLEMENTED + VERIFIED**                                        | 10/10 protected routes redirect with `next` preserved; off-origin refused; unreachable auth distinguished                        |
| **SEE**      | **IMPLEMENTED + VERIFIED** (behaviour) / **UNVERIFIED** (content) | `/opportunities` has loader, pending and error states. With 0 observations it correctly says it has not looked at any source yet |
| **OPEN**     | **IMPLEMENTED + VERIFIED**                                        | `/opportunities/$id`; not-found and unreadable are distinct branches                                                             |
| **INSPECT**  | **PARTIAL**                                                       | 7 sections present; ranking rationale and 4 of CR-12's elements absent (J-06, J-07)                                              |
| **DECLARE**  | **IMPLEMENTED + VERIFIED**                                        | Phase 11: pending ≠ confirmed, failure preserves truth, read-after-write                                                         |
| **RETURN**   | **CONTRADICTORY**                                                 | `/saved` reads `opportunity_pursuits`; `/vault` reads `saved_opportunities`; both are "what you saved"                           |
| **REOPEN**   | **IMPLEMENTED + VERIFIED**                                        | Deep link → `/auth?next=…` → the same opportunity                                                                                |
| **WITHDRAW** | **IMPLEMENTED + VERIFIED**                                        | Real delete; observations unchanged (migration assertions)                                                                       |

Every stage has been exercised against **fixtures**. None has been exercised
against a real opportunity, because none exists.

---

## F · Data and evidence audit

| Boundary                            | Held?            | Evidence                                                                              |
| ----------------------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| Retrieval → Observation             | Yes              | `observation/record.ts` writes what was read, with a reason when nothing was readable |
| Observation immutability            | Yes              | 8 triggers; UPDATE, DELETE and TRUNCATE each refused; re-verified this phase, 40/40   |
| Observation → Entity                | Yes, unexercised | `entity/resolve.ts`, `entity/group.ts`; no live corpus                                |
| Entity → Verification               | Yes              | Verification takes no person; `opportunity_verification_events` append-only           |
| Verification → Delivery             | **No**           | `opportunity_deliveries` has no writer                                                |
| Delivery → Projection               | Yes              | `surface/inspection.ts` and `surface/card.ts` project; neither writes                 |
| Declarations never touch evidence   | Yes              | Separate tables, separate RLS, `judgeAll` never reads pursuits                        |
| Refusal functions are not endpoints | Yes              | anon and authenticated both refused, under test                                       |

**No live discovery was attempted or fabricated.** The corpus is still 0
observations, `last_retrieval_at` is still null, and this phase did not change
that.

---

## G · Implementation

Exactly one thing was built, because exactly one gap had unambiguous authority,
no schema dependency, and no product decision behind it.

### The scheduled jobs were public

Both routes under `/api/public/hooks/` accepted an unauthenticated `POST` from
anyone on the internet:

| Endpoint              | What it does                                                                         |
| --------------------- | ------------------------------------------------------------------------------------ |
| `crawl-opportunities` | Runs the discovery pipeline with the **service role** (bypasses RLS) and writes rows |
| `deadline-reminders`  | Reads **every** user's saved opportunities and **sends them email**                  |

Neither checked a secret, a signature, or a header. The `apikey` header in the
documented `cron.schedule` snippet did nothing — these are application handlers,
not PostgREST, and never read it. `sent_reminders` de-duplicates repeat sends,
which bounds the blast radius at one message per user per tier; it is not a
control on who may fire the job.

The word `public` in the path is the routing convention for "outside the
authenticated layout". Both handlers' own comments say what they are for:
_"invoked by pg_cron"_.

**What was added** — `src/lib/cron-authorization.ts`:

- a shared secret presented as `x-opportunity-x-cron-secret`, compared in
  constant time;
- **fails closed**: `503` while `OPPORTUNITY_X_CRON_SECRET` is unset, `401` when
  the header is missing or wrong. An endpoint that mails a user base is the wrong
  place to default to permissive;
- checked **inside `runScheduledCrawl`** as well as on the route, because a
  server function is its own HTTP endpoint and the door nobody remembers is the
  one that stays open;
- the refusal body never contains the secret.

**Nothing was broken by this.** The cron job is deliberately unscheduled — the
migration `20260618065158_…` unschedules it and documents the replacement — so
there is no live caller. That documented snippet now carries the header, and
`.env.example` documents the variable.

**Verified end to end**, against a running dev server:

| Configuration | Header sent | Response |
| ------------- | ----------- | -------- |
| secret unset  | none        | `503`    |
| secret unset  | anything    | `503`    |
| secret set    | none        | `401`    |
| secret set    | wrong       | `401`    |
| secret set    | correct     | `200`    |

Nothing else was implemented. Everything in §B either needs a schema, or needs
the §K decision first.

---

## H · Testing

**`test/authorization.test.ts` — 9 tests**, and every one was mutation-tested.

| Mutation introduced                            | Caught |
| ---------------------------------------------- | ------ |
| Fail open when no secret is configured         | ✅     |
| Replace the constant-time loop with `===`      | ✅     |
| Leak the expected secret into the refusal body | ✅     |
| Run the reminder job _before_ authorizing      | ✅     |
| `deleteOpportunity` without `requireAdmin`     | ✅     |
| Check the role with the service-role client    | ✅     |
| Delete the guard from `runScheduledCrawl`      | ✅     |
| Call the guard but ignore its answer           | ✅     |
| Remove `SET search_path` from `has_role`       | ✅     |

**Two of my own assertions were vacuous on the first pass and are recorded
because the fix is the interesting part.** Both matched an _import_ rather than a
_call site_:

- the hook-ordering check searched the whole file, so it found
  `authorizeCronRun` in the import line — which is above everything — and
  reported correct ordering against a handler that ran the job first;
- the server-function check asserted the identifier `authorizeCronRun` appeared
  in the body, which survived deleting the guard, because
  `const { authorizeCronRun } = await import(…)` remained.

Both now assert the call and the acted-on result. Importing a check is not
performing one, and a test that cannot tell the difference is decoration.

---

## I · Gates

Measured this phase. Nothing inherited.

| Gate                   | Command                      | Result                                                                                                     |
| ---------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| TypeScript             | `bunx tsc --noEmit -p .`     | **0 errors**                                                                                               |
| ESLint                 | `bun run lint`               | **0 errors**, 9 warnings (all pre-existing `react-refresh/only-export-components` in `src/components/ui/`) |
| Tests                  | `npm test`                   | **249 pass / 0 fail** (240 before)                                                                         |
| Build                  | `bun run build`              | **passes** — Vercel Build Output v3                                                                        |
| Migrations             | `npm run verify:migrations`  | **40 passed, 0 failed**                                                                                    |
| Route verification     | browser, signed out          | **10/10** protected routes redirect to `/auth?next=…`                                                      |
| Deep-link verification | browser                      | query string preserved: `next=%2Fopportunities%2Fabc-123%3Fref%3Demail`                                    |
| Authorization          | `test/authorization.test.ts` | **9/9**, all mutation-tested                                                                               |
| State system           | `test/state.test.ts`         | **25/25** — Phase 11 intact                                                                                |
| Hook behaviour         | live dev server              | 503 / 401 / 200 as tabled in §G                                                                            |

---

## J · Remaining gaps

### J.1 · Not fixed, and why — `liveWebSearch`

Unauthenticated, drives the paid Anthropic pipeline, and writes with the service
role. Anyone can invoke it repeatedly at the project's expense.

It was **not changed**, because it is reachable from `/search`, which is linked
from the landing page to signed-out visitors. Requiring authentication changes
what the product does for the public, and that is a product decision, not a
defect fix. **Recommended: require authentication and rate-limit it.** Same for
`getOpportunity`, `trendingOpportunities`, `newThisWeek`, `endingSoon`,
`listByCategory`, `searchOpportunities`, and `trackEvent`, all unauthenticated —
though for the read-only ones, public access may well be intended.

### J.2 · Blocked, unchanged from Phase 10

- `auth.users` = 0. No authenticated walk against real data has ever run.
- 0 observations; announcer egress is `403` from this environment.
- Production serves a pre-Phase-10 build.
- `types.ts` cannot be regenerated without database access.

### J.3 · Deferred deliberately

- Everything in §B. Each needs a schema, a store, or the §K decision.
- The visual and interaction audit (directive item 11). It is explicitly gated on
  functional completeness being understood, and §C says it is not.
- `/dashboard`, `/vault`, `/onboarding`, `/admin` destinations are captured at
  sign-in and then discarded by `safeRedirectPath`. Correct to fix only once §K
  decides whether those routes survive.

---

## K · Next

**The next phase is not a feature phase. It is a decision.**

Phase 12 set out to find the distance between the product we say Opportunity X is
and the product the code is. The distance is not a list of missing features. It
is that the repository contains two products, the constitutional one is
unreachable from every piece of navigation, and the one a visitor actually meets
renders a composite match score that CR-21 forbids in the same sentence it
forbids opaque scoring.

Nothing in §B can be built honestly until this is settled, because every item
would have to be built twice or built against the wrong model.

**The question for the founder, stated plainly:**

> Is System B — `/search`, `/dashboard`, `/vault`, `/onboarding`, `/opportunity/$id`,
> `match_scores` — the product, a transitional shell to be retired, or a set of
> capabilities to be rebuilt on the constitutional model?

**Recommended answer, with reasoning:** retire System B's _judgment_ surfaces and
keep its _preparation_ capabilities, rebuilt on the entity model. `generateSOP`,
`optimizeCV` and `checkEligibility` implement CR-09, which is constitutionally
owned and currently has no other implementation. `MatchScoreBadge` and
`match_scores` implement a thing CR-21 forbids. They are not the same decision
and should not share a fate.

**Then, in order:**

1. One declaration store (§C.2), so a person's saved opportunity is reminded about.
2. The person-model surface (CR-24) and the override (CR-25) — the two missing
   capabilities with the clearest authority and the smallest schemas.
3. Ranking rationale and CR-12's four absent elements.
4. Only then, the visual audit.

**Before any of that**, and independent of the decision: the external verification
in `docs/PHASE_10_EXTERNAL_VERIFICATION.md` still has not been run. Every
"IMPLEMENTED + UNVERIFIED" above becomes answerable the day one account exists and
one sweep succeeds.

---

_Phase 13 was not started. Phase 10 and Phase 11 were not reopened. No live data
was manufactured. No authentication was weakened. No product rule was invented to
fill a gap in the authority._
