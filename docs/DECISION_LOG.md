# Opportunity X — Engineering Decision Log

Append-only journal of significant engineering decisions. Newest first.
One entry per milestone task: feature, purpose, files, dependencies, risks,
testing, future work. See `CLAUDE.md` for when an entry is required.

---

## 2026-08-17 — Phase 14: the state system

**Feature.** What each visual state is allowed to claim. Three new states, one
new contract, a failure-injection laboratory, and the removal of a duplicate.

**The three defects, each a surface claiming more than the system knew.**

1. `pursuitFor` caught every declaration read failure and returned
   `{ state: "undeclared" }`, so a read that did not happen rendered as *"You
   haven't said either way"* — a claim about what the person did, made by a
   system that could not look. `PursuitResolution` gains `unreadable`, carried
   through `deriveStance` (where a total ternary would have folded it silently
   back) and rendered as its own sentence. The buttons are also disabled in that
   state: a declaration is append-only, so offering a position over one nobody
   can see would let someone record a second on top of one they already made.
2. `resolveCards` had two states, so a corpus consulted with no qualifying result
   returned `{ cards: [] }` and rendered a blank page — indistinguishable from
   "could not look" and "never looked". `CardsResolution` gains `absent`, which
   carries the `searchedAt` the success case already had and the surface was
   discarding.
3. `DeclarationRow.href` pointed at `/opportunity/$id`, retired in Phase 13.
   Nothing read it, which is why TypeScript missed it — a hand-assembled URL is
   invisible to the router's types.

**The degraded state: a contract that is honestly unreachable.**
`projectInspection` now projects `evidence: { consulted, answered, unreadable,
unreachable, degraded }` from the observations themselves, and the inspection
renders "Built from 2 of 3 sources" when something failed. Nothing can reach it:
`entity/group.ts:145` skips any observation that is not `isRetrieved`, so a
failed retrieval never joins an entity. A fixture written to demonstrate it was
**removed** because it could not — it rendered two sources with no way to say a
third was attempted. Recorded as an engine gap rather than faked at the
projection layer, with a test that fails when the gap closes.

**A correction.** This phase added a global `prefers-reduced-motion` block and
then removed it: one already existed at the foot of `styles.css`. The gap did not
exist. The test now asserts the universal rule is present *and not duplicated*.

**Files.** New: `src/lib/opportunity/surface/faults.ts`, `src/routes/lab.faults.tsx`,
`test/state-system.test.ts`, `docs/PHASE_14_STATE_SYSTEM.md`. Modified:
`pursuit/types.ts`, `pursuit/stance.ts`, `surface/service.ts`,
`surface/inspection.ts`, `surface/demo.ts`, `InterestedControl.tsx`,
`OpportunityInspection.tsx`, `opportunities.tsx`, `lab.server.ts`,
`lab.index.tsx`, `test/surface.test.ts`.

**Risks.** `unreadable` disables the declaration buttons, so a deployment whose
declaration store is unreachable offers no way to declare — deliberate, and
stated on screen. The `evidence` projection is inert until the engine change.

**Testing.** 13 new, 264 total, 0 failing. Seven mutations, each observed to fail.
**Four of my own assertions were vacuous on the first pass** and are recorded in
the report: a regex matching `disabled:opacity-50` inside a Tailwind class list; a
union parser capturing one state per union; a CSS slice satisfied by a later
block; and a partition assertion holding trivially at zero. An existing test in
`surface.test.ts` asserted a literal source substring and broke when the
expression was reworded, having never checked its behaviour — replaced with a
rendered assertion.

**Future work.** Attributing failed retrievals to entities closes the degraded
gap and is the same work that would let `opportunity_deliveries` record what was
shown. Nothing here has met real data.

---

## 2026-08-17 — Phase 13: retire the legacy product, keep one

**Decision.** System A — the constitutional engine of Phases 4-11 — is
Opportunity X. The pre-migration system is retired, not kept as a second product.

**Purpose.** Phase 12 found two incompatible systems sharing a build, a router
and a Supabase project. A person's experience of Opportunity X depended on which
route they entered through, and the route most navigation pointed at rendered a
composite match score that CR-21 forbids in those words.

**What was removed.** 5,403 lines across 30 files: 13 routes, 8 components, 7
services, plus the score surfaces on the landing page and the globe. Nothing was
removed on appearance — the trace came first, and it is why the cut was clean:
the canonical engine imported nothing from System B.

**Three findings the retirement produced.**

1. `src/server.ts` called the deadline-reminder job at module scope on startup
   and then hourly on a `setInterval`, reading every user's saved opportunities
   and emailing them. It was the third door onto that job and the one Phase 12
   missed, because it needs no request — and on a serverless target every cold
   start is a server start.
2. The landing page and the globe carried **invented** match percentages: "94%"
   beside Mastercard Foundation Scholars Program by name, and `matchScore` on 33
   globe nodes rendered as "% Match" on hover with an "Avg match" per country.
   The type comment read `// 0-100 illustrative`; on screen it was a fabricated
   claim about real organisations, on the most public page the product has.
3. `judgeAll` held a local named `scored`. No number was computed — the sort
   applies three separate criteria in sequence, which is exactly the structure
   CR-21 requires — but a variable named for a judgment this engine does not make
   is how that judgment eventually gets written. Renamed `ordered`.

**Declarations.** `opportunity_pursuits` is authoritative and
`src/lib/pursuit.functions.ts` is the sole writer. There were three writers
before: the legacy `saved_opportunities` writes, and a dead duplicate pair in
`opportunities.server.ts` that nothing called.

`saved_opportunities` was **not** migrated. Its `opportunity_id` references the
legacy opportunity table; `opportunity_pursuits.entity_id` references an entity
resolved from observations. There is no correspondence between those identifiers,
so a migration would have to invent one — producing declarations nobody made, in
an append-only store. It is archived instead, and the honest consequence is
recorded: interest expressed in the legacy product is not visible in the
canonical one.

**Preparation (CR-09).** `generateSOP`, `optimizeCV` and `checkEligibility` were
traced, their authority identified, and **none was rebuilt**. Each takes a legacy
opportunity row as its subject; rebuilding on the canonical model means operating
on an entity resolved from observations, and there are zero observations. A
preparation surface built now would have nothing to prepare against. What a
rebuild requires is recorded rather than half-built.

**Database.** Nothing dropped. One metadata-only migration
(`20260817190000_mark_legacy_tables_retired.sql`) annotates each legacy table as
retired and flags the four that may hold real user content for export before any
destructive migration. Row counts are unknown from this environment, which is
exactly why nothing was dropped.

**Files.** New: `docs/PHASE_13_CONSOLIDATION.md`, `test/consolidation.test.ts`,
the annotation migration. Removed: 30 files (listed in the report B). Modified:
`src/server.ts`, `src/lib/opportunities.server.ts`,
`src/lib/opportunity/judgment/service.ts`, `src/routes/index.tsx`,
`src/components/landing/OpportunityGlobe.tsx`.

**Risks.** Phase 12's `cron-authorization.ts` was removed with the endpoints it
guarded — strictly stronger, since an endpoint that does not exist cannot be
authorized incorrectly, but the pattern must be reused when a canonical scheduled
job appears. The Constitution's `user_roles`/`has_role` machinery survives in the
database with no application caller.

**Testing.** 11 new tests, 251 total, 0 failing. Nine mutations introduced one at
a time and each observed to fail. Two assertions were vacuous on the first pass:
`\b(score|scoring)\b` caught neither `fitScore` (camelCase places no word
boundary before "score") nor `scored` (needs one after) — widening it to
`\w*scor\w*` is what surfaced the misleading name in `judgeAll`. The built
artifact was inspected, not only the source.

**Future work.** CR-24, CR-25, CR-09 preparation and CR-08 reminders remain
unimplemented with their authority recorded. `opportunity_deliveries` still has no
writer. `types.ts` is stale and needs database access to regenerate. Legacy data
is unexported.

---

## 2026-08-17 — Phase 12: the completeness audit, and the scheduled jobs

**Feature.** An audit, and one fix: a shared-secret boundary on the two
`/api/public/hooks/` endpoints, which accepted an unauthenticated POST from
anyone on the internet.

**Purpose.** Establish whether the implementation contains the product the
Constitution specifies. Full findings in `docs/PHASE_12_COMPLETENESS_AUDIT.md`.

**The finding that matters.** The repository contains **two products**. System A
— the constitutional engine of Phases 4–11 — reads four append-only tables, holds
no composite score anywhere, and states absence honestly. System B — the
pre-migration app — reads fifteen tables and renders `match_scores` as a 0–100 %
ring on `/opportunity/$id`, which is unauthenticated and carries OG tags for
sharing. CR-21 forbids collapsing the mechanisms into a single opaque score, in
those words.

They share a build, a router and a Supabase project, and no data. `/` links to
`/auth` and `/search`; `Header.tsx` links to seven System B routes. **Neither
links to `/opportunities` or `/saved`.** Sign-in lands on `/opportunities`, so
the constitutional product is reachable only by signing in and by nothing else.

Two further contradictions follow from it: two declaration stores
(`opportunity_pursuits` and `saved_opportunities`, mutually unaware — a person who
declares interest on `/opportunities/$id` is not reminded about it), and two
opportunity-detail routes with different authentication and different guarantees.

**The authority problem.** The phase was directed to audit against five "Bibles".
`git log --all --diff-filter=A` shows no file with "bible" in its name has ever
been added to this repository, while 20 source files cite those documents by
section number 30 times. The audit therefore used `docs/CONSTITUTION.md`, and
records gaps where the Constitution is silent rather than inventing policy —
including for roles, which it never mentions.

**What was implemented.** `src/lib/cron-authorization.ts`. Both hook routes ran
unauthenticated: one drives the discovery pipeline with the service role, the
other reads every user's saved opportunities and sends them email. Now a
constant-time shared secret in `x-opportunity-x-cron-secret`, failing **closed** —
503 unconfigured, 401 wrong — and checked inside `runScheduledCrawl` as well as on
the route, because a server function is its own HTTP endpoint.

**Files.** New: `src/lib/cron-authorization.ts`, `test/authorization.test.ts`,
`docs/PHASE_12_COMPLETENESS_AUDIT.md`. Modified: both hook routes,
`src/lib/intelligence.functions.ts`, `.env.example`, and the comment block in
migration `20260618065158_…` documenting the `cron.schedule` snippet (comments
only, no DDL; re-verified 40/40).

**Risks.** The fix fails closed, so a deployment that later schedules the cron
without setting `OPPORTUNITY_X_CRON_SECRET` gets a job that refuses and says so.
That is the intended trade: a visible outage over an endpoint that mails a user
base on request. No live caller exists — the cron was deliberately unscheduled
during the migration.

**Testing.** 9 new tests, 249 total, 0 failing. All nine mutation-tested. Two of
the new assertions were vacuous on the first pass — both matched an import rather
than a call site, so one reported correct ordering against a handler that ran the
job before authorizing it. Both now assert the call and its acted-on result.
Behaviour confirmed against a running server: 503 / 401 / 200.

**Future work.** Six missing capabilities with real constitutional authority,
chiefly the inspectable person-model (CR-24) and the "show me anyway" override
(CR-25), neither of which exists in any form a person can reach. None were built:
each needs a schema, and every one of them would have to be built twice until the
founder decides which of the two products is the product.

---

## 2026-08-17 — Phase 11: state, loading, error and graceful degradation

**Feature.** A state system for every surface: loading placeholders, route-local
error boundaries, a truthful mutation sequence, and a session gate that can say
"I could not check" without claiming "you are signed out".

**Purpose.** Apply the engine's `UNKNOWN ≠ ABSENT ≠ EMPTY` discipline to time and
system state. Until now all three collapsed the moment a request was in flight,
because a page that is loading, a page that has failed and a page that found
nothing all rendered as a page with nothing on it.

**The three defects that motivated it**, each confirmed by command:

1. All four canonical routes had a `loader` and neither a `pendingComponent` nor
   an `errorComponent`. Failures fell through to the root's _"something went
   wrong on our end"_ — wording a reader cannot tell apart from "there is nothing
   here".
2. `grep -n "pursuitActions" src/routes/_authenticated/*.tsx` returned nothing, so
   no product route ever refreshed after a declaration. **A successful write left
   the control reading "You haven't said either way."**
3. `if (error || !data.user) throw redirect({ to: "/auth" })` reported an
   unreachable auth service as being signed out — a false claim about someone's
   account, followed by a sign-in that fails identically.

**Architectural decisions.**

- _The write and the read that reveals it are two operations._ Separating them
  produced a fourth outcome — `stale`, written-but-unshown — that both its
  neighbours misreport. `performWrite` lives in `src/lib/opportunity/pursuit/write.ts`
  rather than inside the component, because the interesting behaviour of a
  mutation is entirely in its failure branches and reaching those from React
  needs a DOM this suite does not have.
- _Only the record may assert._ `aria-pressed` and the position sentence read
  `pursuit` and nothing else. There is no code path on which a pressed button can
  mean "a request was sent".
- _`stillTrue` is a required prop on `SurfaceError`._ Structural enforcement that
  an error cannot be rendered without the half that stops it reading as an
  absence.
- _The session gate throws rather than redirecting when it cannot verify._
  Nothing was relaxed — the protected surface still does not render. Only what
  the person is told changed.

**Files.** New: `src/components/ui/state/{Skeleton,SurfaceError}.tsx`,
`src/components/opportunity/{OpportunityCardSkeleton,InspectionSkeleton}.tsx`,
`src/lib/opportunity/pursuit/write.ts`, `src/lib/session-verification.ts`,
`src/routes/lab.mutations.tsx`, `test/state.test.ts`, `test/render-component.ts`,
`docs/PHASE_11_RATIFICATION.md`. Modified: the four canonical routes,
`_authenticated/route.tsx`, `InterestedControl.tsx`, `OpportunityCard.tsx`,
`OpportunityInspection.tsx`, `lab.{index,$id,states}.tsx`, `test/hook.mjs`.

**Dependencies.** None added. esbuild (already Vite's transformer) is used by the
test resolve hook to transform `.tsx`, which Node 22's native type stripper does
not do.

**Risks.**

- `useRouter({ warn: false })` inside `InterestedControl` returns `undefined`
  outside a `RouterProvider`. Handled: `performWrite` treats a null read-back as
  `stale`, not as success, so a control rendered without a router cannot claim a
  write landed.
- The route-level retry re-runs the whole loader. Coarse but correct; finer
  recovery needs the reads to return partial results, which is engine work.

**Testing.** 25 new tests, 240 total, 0 failing. Behavioural wherever behaviour
exists: `performWrite` and `classifySessionCheck` are run directly, and the
components are genuinely rendered. **Every assertion was mutation-tested** — six
regressions were introduced one at a time and each was observed to fail the suite
before being reverted. A Chromium walk verified the pending, failed, refused and
stale states end to end, at three viewport widths in both themes.

**Two defects found in the browser that no test would have caught:** a hydration
mismatch from `Date.now()`-derived timestamps on both laboratory pages, and a
declared-vs-hovered styling collision on the _Not for me_ button, where an
undeclared button under the cursor was pixel-identical to a declared one.

**Future work.** Partial degradation has a shape and a specimen but no production
call site; reporting "three of four sources answered" requires the reads
themselves to return partial results. `__root.tsx`'s generic error page is
unchanged and is now a genuine last resort. No performance measurement was taken.
Nothing in this phase has been seen against live data — Phase 10's external
blockers are unchanged.

---

## 2026-07-29 — ARB: deployment target — Vercel

**Decision.** Deploy to **Vercel**. Nitro `defaultPreset` changed
`cloudflare-module` → `vercel` in `vite.config.ts`.

**Purpose.** The app had no deployment target after leaving Lovable's hosting.
A stable public URL is a prerequisite for three blocked items: the Google OAuth
redirect URL (Phase 2), the discovery cron endpoint (Phase 8, deliberately
unscheduled during the migration), and any live testing of Phases 4/5.

**ARB review.**

- _Consistent with vision?_ Yes — deployment target is orthogonal to the
  Opportunity Intelligence architecture.
- _Duplicates existing?_ No.
- _Scales?_ Yes, serverless with automatic scaling.
- _Secure?_ Equivalent to the alternative; secrets move to Vercel's encrypted
  env store rather than living in the repo.
- _Lock-in (per CLAUDE.md vendor rule)?_ **Low, and deliberately kept low.** The
  only coupling is one Nitro preset string. Nothing in application code is
  Vercel-specific. `defaultPreset` (not `preset`) was used specifically so
  `NITRO_PRESET=cloudflare-module bun run build` still works — reversing this
  decision is an env var, not a migration. This was the explicit condition for
  accepting the change given the cost of unwinding the previous vendor.

**Alternative considered.** Cloudflare Workers — already building and verified.
Rejected in favor of the user's preference; the low reversal cost above makes
this a cheap decision to revisit.

**Files.** `vite.config.ts` (preset), `.gitignore` (ignore `.vercel/`).

**Risks.**

- Runtime changes from V8 isolates to Node.js serverless. `node:crypto` in
  `intelligence.functions.ts` previously relied on Cloudflare `nodeCompat`; it
  is native on Node, so this direction is strictly safer.
- The Vercel deployment has never actually run — this sandbox cannot reach
  `api.vercel.com` (403 egress policy). Build output was verified locally;
  runtime behavior on Vercel is unverified.
- Cold starts on a 3D-heavy landing page are unmeasured.

**Testing.** Repository Health Gate passed: build exit 0, TypeScript 0 errors,
ESLint 26 (delta 0 — no new debt), `.vercel/` gitignored. Build emits a valid
Build Output API v3 tree (`config.json` v3, `functions/__server.func`, `static/`)
with correct SSR catch-all routing and immutable asset caching.

**Future work.** Deploy from a machine with network access; set env vars in the
Vercel dashboard; add the deployed URL as `SITE_URL`/`VITE_SITE_URL`; register
the OAuth redirect; recreate the discovery cron against the live URL.

---

## 2026-07-29 — Adopt program governance system (PMGS + ARB, QAG, FVG)

**Purpose.** Prevent architectural drift by replacing continuous ad-hoc coding
with phase gates, quality gates, and explicit stop conditions.

**Files.** `CLAUDE.md` (operating contract, auto-loaded each session),
`docs/ROADMAP.md` (phases + verified status), `docs/DECISION_LOG.md` (this file).

**Decisions.**

- Governance written to `CLAUDE.md` rather than kept as a chat prompt, so it
  survives session boundaries. A pasted prompt governs one session; this governs
  the repository.
- ARB, QAG, and FVG folded into `CLAUDE.md` as sections rather than separate
  documents — three more files that must each be remembered is a weaker control
  than one file that loads automatically.
- Progress-tracker output scoped to milestone work only. Printing a status
  dashboard after trivial exchanges produces noise that trains readers to skip
  it, defeating its purpose.

**Findings from the first governed assessment.** Two roadmap features believed
present were false positives: `Interview` is an application status enum, not
interview preparation; `Calendar` is a lucide icon, not calendar integration.
Both would have been reported complete without verification. Quality gates fail
repo-wide (4 TS errors, ~28,540 lint errors, zero tests), so no phase can
currently be closed honestly.

**Risks.** Governance overhead on small tasks; mitigated by the explicit
calibration note in `CLAUDE.md`. Roadmap accuracy decays unless updated —
`docs/ROADMAP.md` must be revised whenever a phase materially changes.

**Future work.** Quality gate remediation, then close Phase 2 (auth).

---

## 2026-07-28 — Migrate off Lovable platform

**Purpose.** The app depended on Lovable's proprietary platform for its build
config, OAuth, AI gateway, and database. Continuing required a Lovable
subscription; the goal was full independence.

**Files.** `vite.config.ts` (rewritten without `@lovable.dev/vite-tanstack-config`),
`src/lib/ai.server.ts` (new), `src/lib/intelligence.functions.ts`,
`src/lib/execution.functions.ts`, `src/routes/auth.tsx`, `src/routes/__root.tsx`,
`.env`, `supabase/config.toml`, `bun.lock`, `bunfig.toml`, `package.json`.
Deleted: `src/integrations/lovable/`, `src/lib/lovable-error-reporting.ts`,
`.lovable/`, `package-lock.json`.

**Decisions.**

- **AI:** replaced the metered Lovable AI Gateway (`ai.gateway.lovable.dev`,
  Gemini 2.5 Flash) with direct Anthropic Claude calls via a shared
  `callClaude()` helper. `claude-haiku-4-5` chosen to match the previous model's
  role as the cheap/fast workhorse across frequent calls.
- **Auth:** replaced `@lovable.dev/cloud-auth-js` OAuth proxy with native
  `supabase.auth.signInWithOAuth`. Simplified the handler — the native flow is
  always a full-page redirect, so the popup branch was removed.
- **Build:** read the Lovable Vite wrapper's source and reconstructed only its
  functional pieces (Tailwind, tsconfig paths, TanStack Start, Nitro/Cloudflare,
  React). Dropped sandbox-only behavior: asset proxy, HMR gate, dev-server
  bridge, forced port 8080. Dev server consequently moved 8080 → 5173.
- **Database:** repointed from the Lovable-managed Supabase project to a
  user-owned one. Schema recreated from `supabase/migrations/` via the SQL editor.
- **Lockfile:** regenerated `bun.lock` — it pinned tarball URLs to Lovable's
  private registry mirror, which 403s anywhere else, so `bun install` was
  impossible outside their sandbox.

**Risks.**

- Migration `20260614054040_*.sql` duplicates tables created by the migration
  before it; running the set in order fails on "relation already exists". The
  duplicate section must be skipped on a fresh database. **Not yet fixed in the
  file** — a fresh environment will hit this.
- Google OAuth code is migrated but the provider is unconfigured in the new
  Supabase project, so sign-in via Google is currently broken.
- Discovery cron was pointing at a dead Lovable preview URL with a stale anon
  key; the schedule was removed and must be recreated post-deployment.
- The AI pipeline has never run against the live web on Claude.

**Testing.** `bun install`, `bun run build` (Cloudflare output unchanged), and
`bun run dev` verified. Landing, auth, and search pages screenshot-verified.
Auth gate confirmed: `/dashboard` redirects to `/auth` when unauthenticated.
Not tested: anything requiring live Supabase or Anthropic network access — the
dev sandbox blocked both.

---

## 2026-07-30 — Phase 3/4 Engineering Gate Report + `api_keys` migration

**Feature.** Measured Engineering Gate Report for Phases 3 and 4
(`docs/ENGINEERING_GATE_REPORT.md`), plus an unapplied `api_keys` migration.

**Purpose.** Close out the infrastructure request with honestly measured gate
results rather than assumed ones, and record why the remaining items could not
be executed.

**Files changed.** `docs/ENGINEERING_GATE_REPORT.md` (new),
`supabase/migrations/20260730120000_api_keys.sql` (new), this log.

**Measured gates.** TypeScript 0 errors. `bun run build` passes in 29.5s and
emits `.vercel/output`. ESLint 26 problems / 17 errors, all
`@typescript-eslint/no-explicit-any`, down from 28,540. Zero automated tests
exist anywhere in the repo.

**Decisions.**

- **Both phases held open.** Code is complete and type-clean; verification is
  impossible from this environment. Phase 4's discovery pipeline has still never
  executed once. Closing on unmeasured gates was rejected.
- **Password reset reclassified.** Verified absent, not merely unverified — zero
  matches for `resetPasswordForEmail`, `updateUser`, `forgot`, or `recovery` in
  `src/`. It is a missing Phase 2 deliverable, not a config gap.
- **`api_keys` authored but not applied.** No consumer exists in the codebase, so
  this was raised as an ARB stop condition first. Proceeding under stated
  assumptions: user-owned keys for our own API, SHA-256 hash only with plaintext
  shown once, owner-only RLS matching the `applications` pattern, and column-level
  REVOKE on `key_hash`/`user_id` so a browser client cannot tamper with secret
  material. Documented in-file as deletable if the feature is not going ahead.

**Dependencies.** Reuses `public.set_updated_at()`. Assumes `auth.users` and the
existing RLS conventions.

**Risks.**

- The `api_keys` table would be created with nothing reading it. If the feature
  changes shape, it needs a second migration.
- Pre-existing and still unfixed: `20260614054040_*.sql` duplicates tables from
  the migration before it, so applying the directory in filename order fails on a
  fresh database. Any new migration inherits that broken ordering.
- Egress policy blocked every verification target this session:
  `api.supabase.com` 403, the Supabase project origin, the Vercel production
  origin, and `api.firecrawl.dev` all unreachable; `git push` 403.
- The Supabase personal access token was transmitted in plaintext and must be
  treated as compromised.

**Testing.** `bunx tsc --noEmit -p .`, `bun run lint`, and `bun run build` all
run. The migration is **unexecuted** — no database was reachable, so it is
syntactically reviewed only, not validated against Postgres.

**Future work.** Merge `48d501f` to fix production auth. Rotate the access token.
Implement password reset. Build or drop the API Keys feature. Fix the duplicate
migration. Add a test harness — the zero-coverage finding is the largest gap.

---

## Opportunity X speaks as itself, not as AEON X

**Feature.** Removal of the sibling product's identity from the entire
Opportunity X surface: user-facing copy, the crawler's identity, the entity-id
namespace, and the post-sign-in landing route.

**Purpose.** Opportunity X and AEON X are sibling products, and this repository
is the whole of Opportunity X. The engine was written inside AEON X and carried
its voice across the transfer. A rendered `/opportunities` page read _"AEON X
has not read this opportunity's requirements against what it knows about you"_ —
correct reasoning, wrong product, in the sentence a person actually reads.

**How it was found, and why that matters.** Not by grep. An earlier vocabulary
sweep covering routes, the server boundary and components reported clean,
because the strings live in the _engine's_ projection layer. It surfaced only
when a page was rendered and read. That is the worst available detection
mechanism — the copy is wrong for exactly as long as nobody looks — which is
why the check is now an assertion rather than a habit.

**Files changed.** 57 user-facing strings across `judgment/service.ts`,
`surface/{card,inspection,wording,demo}.ts`, `verification/service.ts`,
`observation/record.ts`, `discovery/crawl.ts`,
`components/opportunity/{PairingInference,VerificationSeal}.tsx`,
`components/Header.tsx`, `ShareToWhatsApp.tsx`, and four legacy routes. Plus
`discovery/{robots,fetcher}.ts`, `discovery/transports/firecrawl.ts`,
`entity/identity.ts`, `lib/safe-redirect.ts`, `routes/auth.tsx`, and
`test/standalone.test.ts` (new). ~80 further occurrences in code comments were
renamed for readability, which is cosmetic and carries no behavioural risk.

**Decisions.**

- **First person, not a renamed third person.** The strings became "I have not
  established whether this is real", not "Opportunity X has not…". This was not
  a style choice: `pursuit/stance.ts` already shipped that exact sentence in the
  first person, so the codebase held two voices for one system. The product
  names itself only where a sentence genuinely needs a subject — "That leaves
  Opportunity X entirely."
- **The crawler was renamed, and this was the last free moment.** `AeonXBot`
  fetching on Opportunity X's behalf asks publishers to allowlist a name that
  does not describe who is asking. Renaming a user agent normally breaks
  existing robots.txt allowlists; it is safe here only because discovery has
  never successfully run — `lastRetrievalAt` is null, so no site has ever seen
  the old token. The `+https://aeonx.ai/` contact URL pointed at a domain this
  product does not control.
- **The entity-id namespace was changed, on the same reasoning.**
  `aeon-x:opportunity-entity:` seeds the hash behind every entity UUID.
  Changing it re-derives every id, which is free at zero entities and
  permanently destructive afterwards, since the observation record is
  append-only and cannot be migrated back. Done now, with the rationale written
  into the file so the next reader knows it is a one-time decision.
- **A real bug fell out of the sweep.** `AUTH_LANDING_PATH` was `/workspace`,
  whose routes were deleted earlier in this phase — a 404 at the moment a person
  has just proved who they are. `safeRedirectPath` was also imported into
  `auth.tsx` and never called, so the open-redirect guard was dead code while
  all three sign-in paths hardcoded `/dashboard`. The landing path is now
  `/opportunities`, the capturable tree is the canonical one, and `?next=` is
  honoured through the guard.
- **"Ledger" removed from a promise, not just from the vocabulary.** The
  inspection surface told people that if they applied it would "go in your
  Ledger". Opportunity X has no Ledger and no application tracking, so that
  sentence promised a feature that does not exist here.
- **`dashboard.applications.tsx` left alone.** It says "Application Workspace",
  but that is generic English on a legacy route, not a transferred AEON X
  dependency. Deleting the route is out of scope for this change.

**Dependencies.** None added.

**Measured gates.** `bunx tsc --noEmit -p .` → 0 errors. `npm test` → 200/200
passing (197 before, +3 new). `bun run build` → clean, `.vercel/output` emitted.
`bun run lint` → 274 errors, **down 20 from 294 at HEAD** — measured by stashing
and re-running, not assumed. The remaining errors are almost entirely
pre-existing `prettier/prettier` formatting; the gate still fails repo-wide and
is not claimed as passing.

**Risks.**

- The renamed crawler token and entity-id namespace are only safe while nothing
  has been discovered. If any sweep has written observations against a database
  this session could not see, entity ids will not match. Both were verified
  against the established fact `entities=0, observationIds=[]`.
- Three authored migrations remain **unapplied** — `apply_migration` on project
  `anfiojmbgonrtympzjch` returns "You do not have permission to perform this
  action". Unchanged by this work, and still the blocker on real persistence.

**Testing.** `test/standalone.test.ts` asserts three things: that no shipped
string in `src/` names another product (comments exempt — only strings reach a
person); that the crawler's user agent and robots token agree and identify as
Opportunity X; and that `AUTH_LANDING_PATH` is a route that actually exists in
`routeTree.gen.ts`, so deleting a route cannot leave sign-in pointing into space
again. Separately, all 1,776 strings the demo corpus projects were walked at
runtime and none contains "AEON X".

**Future work.** The `prefers-reduced-motion` and palette work is in; the
outstanding gate is ESLint, which wants a repo-wide `--fix` as its own commit
rather than mixed into a copy change. Real discovery remains blocked on egress
and on the unapplied migrations.

---

## Product testability: a door into the product that is not a hole in the auth

**Feature.** The ESLint gate closed; a development-only fixture laboratory at
`/lab`, `/lab/$id`, `/lab/saved` and `/lab/states`; the full product journey
walked in a real browser; and four defects found by walking it.

**Purpose.** Opportunity X could not be looked at. Its three surfaces read one
person's declarations under row-level security, so seeing the product required
a reachable Supabase and a real account, and neither has been available.

**Measured gates.** ESLint **0 errors**, from 274. TypeScript 0. Tests
**210/210**, from 200. `bun run build` clean. Browser: 26/26 journey steps,
14/14 deep-link cases.

**Decisions.**

- **The lint gate closed in two commits, deliberately separate.** 250 of the 267
  errors were `prettier/prettier` and all were autofixable; that pass ran with
  `no-explicit-any` suppressed so it could not smuggle a type change in beside
  the whitespace, and is reviewable as pure formatting. The remaining 17 were
  real type debt and went in on their own.
- **Most of the `any`s were discarded types, not missing ones.** The Supabase
  client is generic over the generated `Database`, so `user_documents` rows were
  correctly typed at the query and annotated back to `any` on the way in. Two
  were load-bearing: `callClaude` returned `Promise<any>`, letting `result.score`
  typecheck as a number into a database write for a value a generative model is
  under no obligation to return; and typing the deadline map surfaced a
  `string | null` reaching an email that requires a string.
- **The laboratory got its own door rather than an exemption.** Dropping
  `_authenticated` from a route would be a production auth change made for a
  development convenience — the kind that survives into a deployment because it
  reads as a routing tidy-up. The guard is `process.env.NODE_ENV`, read on the
  server as the first statement of every handler, **not** `import.meta.env.DEV`:
  that is a bundler fact protecting the client bundle, and a route hidden only in
  the browser still leaves its endpoint postable. The laboratory also constructs
  no Supabase client and takes no user id, so there is nothing to reach even if
  the guard were defeated.
- **Its declarations are real, not simulated.** `demoCorpus` takes overrides, so
  pressing Interested writes through the same `InMemoryPursuitLog` and returns
  through the same projection the live surface uses. They live in the dev
  server's memory and die with it, which the page says out loud.

**Four defects, all found by rendering rather than by testing.**

1. **A fixture card told the reader they had taken a position they had not.**
   The card's heading was already voice-aware — "Since they said that" — while
   the sentence beneath it was hardcoded to "You said you were interested". Two
   voices in one paragraph, the wrong one asserting a position on the reader's
   behalf. Both halves were individually well-formed, which is why no test
   caught it. `deriveStance` now takes a voice.
2. **"There are -1 days until the deadline."** `deriveOpenState` reports the
   instant the publisher denoted — the _start_ of a day-precision deadline —
   while deciding open-or-closed against the end of that day, so on the final
   day the state is legitimately open and the raw subtraction is negative.
   `deriveUrgency` clamped at zero; the ranking criterion did not. The card read
   "today is the last day" directly above a ranking reading -1, about the same
   deadline.
3. **Unexplained ranking language.** The card rendered "Ranked 3 of 9
   considered" and the judgment's own sentence said "on the inputs listed" —
   which the card never listed. A position with no stated basis asks the reader
   to assume the system knows something it has not said. The criteria are now
   read off the actual inputs, so the sentence cannot drift from what decided
   the order.
4. **The laboratory's saved list dropped unresolvable declarations.** Built from
   the scenarios alone, a declaration whose opportunity is no longer in the
   corpus silently vanished — precisely the failure the live
   `resolveDeclarations` exists to avoid.

**A methodology note worth keeping.** The first version of the browser walk
asserted the declaration-invariant with three regexes, one of which matched
nothing and compared `""` to `""`. It passed, and reported that verification was
unchanged without ever having read it. It now compares the rendered text of
every evidence section — requirements, timing, verification, sources, unsettled
— before and after declaring; each is byte-identical, and a silent extraction
failure can no longer masquerade as a passing invariant. The same lesson applied
to the `-1 days` fix, which was re-verified by reverting the clamp and watching
the new test fail.

**Risks.**

- The laboratory's store is process-global and unkeyed, so every visitor to a
  dev server shares one set of declarations. Correct for one developer, wrong
  for anything else, and another reason it refuses to run in production.
- 9 `react-refresh` warnings remain, 6 of them shadcn/ui primitives exporting
  cva variants beside their component — the upstream convention. Splitting
  vendor files to quiet a hot-reload warning would diverge them from
  `shadcn add`.

**Testing.** `test/lab.test.ts` asserts the laboratory refuses in production,
that every endpoint opens with that refusal, that it reaches for no client, that
the three product surfaces are still inside `_authenticated`, and that it has
invented no Ledger, commitment, preparation or score. `test/stance.test.ts`
pins the voice fix; `test/judgment.test.ts` pins the negative-day fix.

**Future work.** Straight apostrophes remain in user-facing strings elsewhere in
the engine (`can't`, `won't`, `didn't` in `surface/service.ts`,
`surface/delivery.ts`, `discovery/crawl.ts`) while the components and
`stance.ts` use typographic ones. A typography pass, on its own, not mixed into
behavioural work. Database and real discovery remain externally blocked.

---

## Real environment: what could be verified, and the exact boundary

**Feature.** Verification of the deployment, database and discovery paths
against the real world — plus three defects found while doing it, and the
typography pass.

**Purpose.** Move from lab-verified to product-verified. Most of that turned out
to be externally blocked, so the deliverable is an exact boundary rather than a
claim.

**The boundary, measured rather than assumed.** Every host this phase needs is
refused by organisation egress policy — `403` to `CONNECT`, recorded by the
proxy's own status endpoint:

`anfiojmbgonrtympzjch.supabase.co`, `api.supabase.com`, `vercel.com`,
`api.vercel.com`, `opportunity-x-12b762aa.vercel.app`, `education.gov.ng`,
`www.unn.edu.ng`, `unilag.edu.ng`, `ptdf.gov.ng`, `api.firecrawl.dev`.

Separately, and more usefully: **the Supabase and Vercel MCP connectors are
connected and authenticated at the organisation level but `enabledInChat` is
false**, so their tools are not loaded in this session. That is a per-chat
toggle, not a permissions wall — the single highest-value thing the operator can
change.

Tavily and Nimble _are_ connected. They were deliberately not used: substituting
a search index for real acquisition is the one thing this engine's design
forbids, and a cached third-party summary entering an append-only record with a
publisher's authority attached could never be taken back.

**What was verified anyway.** PostgreSQL 16.13 is present locally, so all three
migrations were applied to a real database with Supabase's roles and a minimal
`auth` schema shimmed — shimmed only as far as the migrations reference it, so
the shim cannot make a migration pass that would fail on the real project.

Verified by execution: clean apply in filename order; four tables with RLS
enabled; `UPDATE`, `DELETE` and `TRUNCATE CASCADE` all refused by trigger on
observations; the three check constraints refusing a future retrieval, a
retrieved row with no items and no reason, and an unreachable row carrying
content; pursuit `UPDATE` refused while `DELETE` is allowed; and RLS isolating
two people's declarations in all three directions.

That proves the SQL. It does not prove the schema exists on
`anfiojmbgonrtympzjch`, and the log does not claim it does. `docs/APPLYING_THE_MIGRATIONS.md`
carries the manual procedure.

**A near-miss worth recording.** The first RLS run reported person A seeing both
people's rows, which read as a serious read-isolation defect. It was dirty state
from a re-run — the table held four rows, two of them A's duplicates. Re-running
from a clean state showed A seeing exactly their own. The finding was withdrawn
before it was reported. `SET LOCAL` outside a transaction had also silently not
applied the role in the first attempt, so that run was measuring nothing at all.

**Three defects found.**

1. **The store's null check was dead code, and a reader saw the wrong sentence.**
   `supabaseAdmin` is a lazy `Proxy` that constructs its client on first property
   access and throws when credentials are missing — it is never `null`. So
   `const db = supabaseAdmin; if (db === null) return null;` touched no property
   and never fired. With nothing configured, the surface fell through to its
   catch and said _"I could not read what I have observed"_, which asserts a
   record exists and could not be read. The truth was that none is configured.
   Both are Unknown; this product's argument is that it says _which_ Unknown,
   and `resolveDeclarations` was already distinguishing them while this path was
   not. Now decided from the environment, read per request.
2. **The migrations shipped "AEON X" into the database.** Two of the four
   occurrences were `comment on` statements, which become column and table
   metadata in Postgres. Fixed at the only free moment: after application,
   changing a comment needs a second migration.
3. **The extractor's honesty was confirmed, not assumed.** A page with no
   JSON-LD records `unreadable: {reason: "json-ld: No JSON-LD on the page."}`
   and extracts nothing — no guessed dates, eligibility or funding. This is what
   item 7 of the phase asked for and it holds.

**Typography.** Straight apostrophes in shipped strings were normalised to
typographic ones across 12 files, 19 string literals; comments were left alone.
The mechanical pass over-reached twice and both were caught by the suite: it
rewrote a regex inside a test that strips SQL string literals, breaking a schema
assertion, and it double-applied to an already-fixed pattern. It also leaked
into four test comments, which read as `Firecrawl[’']s` until restored.

**Measured gates.** ESLint 0 errors, TypeScript 0, tests **211/211**, build
clean. Browser: 26/26 journey, 14/14 deep-link.

**Risks.** The local database verification is of the SQL, not of the project.
Anyone reading "database verified" without the qualifier would be misled, which
is why the report separates DATABASE-SQL from DATABASE-PRODUCTION.

**Future work.** Enable the Supabase and Vercel connectors in this chat, or
apply the migrations by hand. Everything downstream — real auth, real
`/opportunities`, real pursuit, one real sweep, the first real opportunity, the
user journey — is blocked behind that and the egress policy, in that order.

---

## Phase 10 — Foundation lock: what could be ratified, and four defects closed

**Feature.** Baseline re-verification, constitutional Amendment A-01, and the
removal of real foundation debt. No new product feature.

**Purpose.** Establish the strongest truthful final state before moving on.
Sections 2–9 of the phase (Supabase, Vercel, real auth, real surface, real
opportunity, real pursuit, real journey, real discovery) are all externally
blocked and are reported as BLOCKED rather than attempted by proxy.

**The boundary, re-measured rather than carried forward.** Both connectors were
re-checked: Supabase and Vercel are still `connected: true`, `enabledInChat:
false`, and `ToolSearch` finds no tools for either. Every host was re-probed and
still returns `403` to `CONNECT`. Nothing was assumed from the previous phase's
report.

**Amendment A-01, recorded in `CONSTITUTION.md`.** The Scope line read _"AEON X
and Opportunity X, its first product."_ — the parent/child framing the founder
overturned twice in writing. Amended to _"Opportunity X."_, with the ratifying
quotations and the reason it is an amendment rather than a correction: the old
line described a real arrangement that has since changed, and erasing it would
make the rest of the document unreadable to someone asking why the engine's
history looks the way it does. It was the only occurrence in the document; no
principle, CR or open question depended on it.

**Four defects, each with a test.**

1. **The Interested control was offered without checking anything.** Every route
   passed `canPersistPursuit` as a literal `true`. `InterestedControl`'s own
   contract says the opposite — "Read before the control is offered, not
   discovered when it fails" — so the product was violating a standard it states
   in its own source.
2. **`canKeepDeclarations()` read `NEXT_PUBLIC_*` variables.** Next.js names,
   carried across with the engine, which Vite never sets. It returned `false` on
   every deployment including a correct one. It was also never called, so the
   dead default was harmless only by accident. Now reads the two variables
   `requireSupabaseAuth` actually requires.
3. **A failed declarations read was indistinguishable from having none.**
   `pursuitsFor` swallowed every failure into an empty map, so an unapplied
   migration looked exactly like a person who has declared nothing. It now
   returns `{ pursuits, readable, because }`, and the surface renders the
   specific reason instead of the generic one — "nothing is configured" and "I
   could not reach it" are different facts.
4. **`/opportunities` fetched and discarded a second full corpus derivation.**
   The loader awaited `listSaved()` serially and the component never referenced
   it. `resolveDeclarations` runs its own `deriveCorpus` over the whole
   observation record; the page paid for it on every load and threw it away.

**Two stale documents corrected without rewriting history.**
`demo.ts` stated its central safety invariant — "nothing here may ever reach a
live surface" — against `/opportunity/preview` and `/opportunity/preview/[entityId]`,
both deleted long ago. A safety claim naming routes that do not exist is worse
than none, because it reads as though someone checked; it now names the four
real surfaces and is enforced by a test that fails if a fifth importer appears.
`ENGINEERING_GATE_REPORT.md` told the operator to allowlist
`aeon-x-technologies-9kzz.vercel.app` — a different product's deployment. The
body is a dated snapshot and was left unedited; a superseding header now marks
the action items stale and says which one would misconfigure authentication.

**`.env.example` omitted two variables the app cannot boot without.**
`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are read by the auth middleware on
every server function. Locally they come from the committed `.env`; a deployment
does not read `.env`, so anyone configuring production from the example file
would have had every authenticated request fail.

**Measured gates.** ESLint 0 errors (9 warnings, all `react-refresh`, 6 of them
shadcn vendor files). TypeScript 0. Tests **215/215**, from 211. Build clean.
Browser: 7/7 routes serve, 26/26 journey, 14/14 deep-link.

**A new invariant worth keeping.** `test/lab.test.ts` now asserts that no
literal router destination in `src/` points at a route absent from
`routeTree.gen.ts`. It passes today, which means there are no dead deep links —
and `AUTH_LANDING_PATH` pointing at the deleted `/workspace` is the kind of
thing it exists to catch.

**Risks.** The persistence-capability signal is derived from a read the page
already performs, so it is accurate about _reachability_ and still cannot prove
the migration is applied — only a write does. That is stated in the code rather
than implied.

**Future work.** Everything in sections 2–9. In order of leverage: enable the
two connectors in this chat; failing that, apply the migrations by hand from
`docs/APPLYING_THE_MIGRATIONS.md`; the egress policy blocks real discovery
regardless.

---

## The Supabase project mismatch, and the production deployment's real state

**Feature.** With both connectors enabled, sections 2 and 3 of Phase 10 were
executed as far as they can go. Neither completed, but both now have an exact
cause rather than an unknown.

**Finding 1 — the connected Supabase account does not own this project.**
`list_organizations` returns one organisation, _Aeon X Technnology_, containing
one project: `fbqufjvkzbifklxtouol`. The repository points at
`anfiojmbgonrtympzjch`, which returns "You do not have permission to perform
this action" on every call because it belongs to a **different Supabase
account**. The connector toggle was never the blocker; it only made the real one
legible.

**Finding 2 — the reachable project is AEON X's, and already has these
migrations.** `fbqufjvkzbifklxtouol` carries `ledger_commitments`,
`ledger_accountings`, `profile_facts`, the digest engine and the radar
watchlist — and all three Opportunity X migrations, applied as `20260810185329`,
`20260810185407`, `20260810185431`. One of its column comments still reads
_"What AEON X actually told someone"_, i.e. it was applied from the pre-rename
text.

**Decision, put to the founder rather than assumed.** Three paths existed and
each had a consequence the other two did not: apply to the AEON X project
(already applied, and the wrong product's database), repoint `.env` at it
(re-couples the two products at the data layer the standalone reset separated),
or treat `anfiojmbgonrtympzjch` as canonical and wait for access to the account
that owns it. **The founder chose the third.** Nothing was applied to
`fbqufjvkzbifklxtouol` and nothing was repointed.

**What was verified on it anyway, and what was deliberately not.** Its structure
was read with catalog queries and matches this repository's migrations exactly:
RLS on all four tables; `observations`, `verification_events` and `deliveries`
refusing `UPDATE`, `DELETE` and `TRUNCATE`; `pursuits` refusing `UPDATE` and
`TRUNCATE` while allowing `DELETE`, which is the designed asymmetry.

No rows were written. Verifying append-only behaviourally requires inserting a
row and then attempting to mutate it — and `opportunity_observations` is
append-only, so a fabricated observation could never have been removed from
another product's production record. The structural read was taken instead, and
the difference is stated rather than blurred.

**Finding 3 — production is stale, and by more than a version.** The production
deployment is `dpl_9Ufdj7PX2XF5Uvw8D2hPBTfZ9yhX`, commit `8a2090d` on `main`,
created 2026-07-28. That is fifteen commits and roughly three weeks behind, and
it predates the standalone reset, the AEON X removal, the palette, `/lab` and
every defect fix since. The branch's own build (`a620fa9`) is READY but carries
`target: null` — a preview, never promoted.

**Decision.** Not promoted. Promoting now would ship an application pointing at a
database this session cannot verify, producing a deployment that is current and
still unverifiable — the precise condition this phase exists to end. Deferred
until the database question is settled.

**Finding 4 — the Vercel project still declares a Lovable framework preset.**
`framework: "tanstack-start-lovable"`. Builds succeed, so it is not urgent and
was not changed unilaterally; but the repository was unwound from Lovable at
real cost and the deployment configuration still names it.

**Production facts, for the record.** Project `prj_FZEGLp6uU9d7iFDfiWLgDcSivDmC`,
team `aeonlighs-projects`, URL `opportunity-x-12b762aa.vercel.app`, Node 24.x,
`live: false`.

**Gates.** Unchanged and re-run: ESLint 0 errors, TypeScript 0, tests 215/215,
build clean.

**What this leaves.** Sections 4–9 (real auth, real surface, real opportunity,
real pursuit, real journey, real discovery) remain BLOCKED, now on one specific
thing: access to the Supabase account owning `anfiojmbgonrtympzjch`. Real
discovery additionally needs the egress policy lifted.

---

## Phase 10 closure: everything reachable, and the boundary named

**Feature.** `scripts/verify-migrations.sh`, the Vercel framework-preset
investigation, and a full re-audit against the constitutional facts. No product
feature, no architectural change.

**Audit against the seven constitutional facts.** Re-derived from the repository
rather than from the previous report. `.env` references `anfiojmbgonrtympzjch`
four times and `fbqufjvkzbifklxtouol` zero times. No tracked file mentions the
AEON X project except the two documents that deliberately explain why it is not
used. Zero imports of `@/lib/core`, `components/workspace` or `ui/tier0`. The
project identifier is nowhere hardcoded in `src/` — it arrives from the
environment. The three migrations are present in filename order. The laboratory
guard is intact. The only vocabulary hits are two occurrences of "Workspace" as
ordinary English on a legacy dashboard route, already assessed as not an AEON X
dependency.

**`scripts/verify-migrations.sh` — the guarantees, made repeatable.** These were
previously proved once, by hand, in a shell. They are the foundation every other
layer rests on and they remain unapplied to the canonical project, so the check
now runs on demand: `npm run verify:migrations`. It stands up a throwaway
PostgreSQL, shims only the Supabase objects the migrations actually reference,
applies all three in filename order, and asserts **37** guarantees — with the
forbidden operations required to raise, not to affect zero rows.

**It caught its own first version.** Four assertions failed on the opening run:
`UPDATE` and `DELETE` against `opportunity_verification_events` and
`opportunity_deliveries` were reported as _allowed_. Both tables were empty, and
a row-level `BEFORE` trigger never fires when a statement matches no rows — so
the script was measuring nothing and correctly said so rather than passing
vacuously. This is the exact failure the phase brief names: _"Do not report
'UPDATE 0 rows' as equivalent to a denied UPDATE."_ Every table is now seeded
before its guarantee is tested.

Seeding then failed twice more, both times because the schema refused a
malformed row: a delivery whose `shown` object omitted three of its four
sentences, and a delivery on a surface that does not exist. Those refusals are
the constraints working, and they are now assertions in their own right.

**Vercel framework preset — investigated, and deliberately not changed.** The
project declares `framework: "tanstack-start-lovable"`. The question was whether
that is stale metadata or something that affects the build.

Evidence gathered: `vite.config.ts` builds through `nitro({ defaultPreset:
"vercel" })`, which emits Build Output API v3 — `.vercel/output/config.json`
declares `framework: nitro` and carries the routing table directly, so Vercel
consumes a finished contract rather than inferring one. The repository contains
no Lovable anything: not in `package.json`, `bun.lock`, `vite.config.ts`,
`node_modules`, or `src/`. Seven consecutive deployments are READY, each
reporting `lambdaRuntimeStats: {"nodejs":1}`, so the server function deploys.

**Conclusion: stale metadata, no functional effect, no correction made.** A
framework preset governs defaults for a build that has not already produced the
Build Output contract; this one has. Changing it on a working pipeline with no
demonstrated problem would be risk without benefit, and the brief's instruction
was not to change it blindly. Recorded as a cosmetic inaccuracy on the Vercel
project record.

**Measured gates.** ESLint 0 errors (9 warnings). TypeScript 0. Tests 215/215.
Build clean. Migrations 37/37. Routes 8/8 serving. Browser 26/26 journey,
14/14 deep-link.

**The boundary, unchanged and now precise.** Nothing was applied to any database
other than a throwaway local one. Production was not promoted. The canonical
project `anfiojmbgonrtympzjch` remains unreachable because it belongs to a
Supabase account this session is not connected to — not a scope toggle, and not
something a different project can substitute for.

---

## The canonical database, applied and verified against itself

**Feature.** The three Opportunity X migrations applied to `anfiojmbgonrtympzjch`,
plus a fourth hardening one, and every guarantee proved against the live
database rather than read from the SQL.

**Identity confirmed before anything was written.** The newly connected account
holds one organisation, _aeonligh's Org_, with two projects. The canonical one
identifies itself as **`opportunity-x-12b762aa`** — the same name as the GitHub
repository and the Vercel project. The other, `ammxjzievfwcwmecacma`
("aeonligh's Project", February, different region), was left alone. Nothing was
written until the name matched.

**The project was paused, and that nearly produced a false result.** It was
`INACTIVE`; the first connection attempt started a restore. During `COMING_UP`,
`list_tables` returned `[]`, `list_migrations` returned `[]`, and **all three
`apply_migration` calls returned `{"success": true}`** — after which a catalog
query appeared to confirm the tables existed.

None of it survived. Once the project reached `ACTIVE_HEALTHY` the database
showed its real contents: fourteen base tables, no migration records, and **zero
Opportunity X tables** — no engine enums, no refusal functions. The three
"successes" had landed on a transient instance and were discarded by the
restore.

This is the phase's own instruction earning its keep. Had the success flags been
taken at face value, the report would have said the migrations were applied and
the database would have been empty. Every subsequent claim is therefore made
from a catalog query or a behavioural probe, never from a tool's return value.

**Applied, for real, in filename order.** Re-applied against the healthy
database and verified after each. `list_migrations` had shown `[]` while
fourteen base tables existed, so the earlier schema was created outside the
migration system; the four Opportunity X migrations are the first tracked ones.

**Every guarantee proved by making the forbidden operation fail.** Run against
the live canonical database inside a transaction that ends in `raise`, so the
probe rows never commit:

| Guarantee                                  | Result                |
| ------------------------------------------ | --------------------- |
| observation UPDATE / DELETE / TRUNCATE     | refused               |
| verification event UPDATE / DELETE         | refused               |
| delivery UPDATE / DELETE                   | refused               |
| delivery missing one of its four sentences | refused               |
| delivery on an unknown surface             | refused               |
| retrieval dated in the future              | refused               |
| retrieved row with no items and no reason  | refused               |
| unreachable row carrying content           | refused               |
| malformed content digest                   | refused               |
| pursuit UPDATE / TRUNCATE                  | refused               |
| pursuit DELETE (withdrawal)                | allowed               |
| person A reading B's declarations          | 0 of B's rows visible |
| person A writing a declaration owned by B  | refused               |
| person A deleting B's declaration          | 0 rows affected       |

**Nothing was fabricated, and the Unknown signal is intact.** Behavioural proof
required rows, and `opportunity_observations` is append-only — a probe row could
never have been deleted. So every probe ran inside a transaction terminated by
`raise exception`, which aborts it. Confirmed afterwards: all four tables at 0
rows, `auth.users` at 0, and `last_retrieval_at` **null**. That null is the
product's only evidence that real discovery has never happened, and committing a
fake observation would have destroyed it permanently.

**A fourth migration, from Supabase's own linter.** Both refusal functions were
`SECURITY DEFINER` and reachable at `/rest/v1/rpc/...` by `anon` and
`authenticated` — PostgreSQL's default `EXECUTE` grant to `public`, never
revoked. They only `raise`, so nothing was exposed, but a trigger function
should not be an endpoint.
`20260815170000_refusal_functions_are_not_endpoints.sql` revokes it.
PostgreSQL checks `EXECUTE` when a trigger is created rather than on each row,
so the enforcement is unaffected — asserted, not assumed: the probes were re-run
afterwards and every forbidden operation is still refused. `has_role` and
`rls_auto_enable` carry the same warning and were deliberately left alone; they
belong to the earlier product surface.

**What blocks the rest, precisely.** `auth.users` contains **zero rows**. There
is no account to sign in with, so the real journey cannot start — not a code
problem and not something this session should fix by minting credentials in a
production auth system.

**Gates.** ESLint 0 errors, TypeScript 0, tests 215/215, build clean, local
migration verifier **40/40**, routes 8/8, browser 26/26 and 14/14.

---

## Phase 10 integrity audit, and the boundary that did not move

**Feature.** Section 7's repository audit and section 8's gates. Sections 1–6
could not be attempted; the reason is environmental and is recorded rather than
worked around.

**Why the authenticated walk could not run, even with an account.** Two
independent blockers, both re-measured rather than carried forward:

- The Supabase MCP connector **disconnected** from this session. `ToolSearch`
  finds no Supabase tools, so the live database cannot be read or written.
- Outbound HTTPS is **still `403` at the proxy** for
  `anfiojmbgonrtympzjch.supabase.co`, `api.supabase.com`,
  `opportunity-x-12b762aa.vercel.app` and the announcers.

The second is the decisive one for the browser walk, and it is worth stating
plainly because it is easy to mistake for a missing account: **Playwright runs
inside this sandbox**, so the browser's own request to Supabase is refused by
the same egress policy. An account existing changes nothing about that. Signing
in requires a machine that can reach `*.supabase.co`.

**Audit findings — three real, each traced before being touched.**

1. **A comment pointed at a deleted file.** `foundation/claim.ts` said
   "`src/lib/core/tier0/evidence.ts` performs the single assertion that mints
   one" — a path removed when the AEON X namespace was eliminated. Repointed to
   `foundation/evidence.ts`, where that code actually lives. Same class as the
   `demo.ts` route reference: a claim that reads as though someone checked.
2. **A claim in `lab.server.ts` was not true of the build.** It said the guard
   worked two ways — "the route hides in the client, and this refuses on the
   server". The route does not hide. A production build was grepped: the
   laboratory's _chrome_ is a lazily-loaded chunk and does ship, while
   `demoCorpus`, `assertDevelopment` and every fixture opportunity do **not**.
   Navigating to `/lab` in production renders a frame whose loader immediately
   fails with the refusal. The comment now says exactly that.
3. **`.env.production` and `.env.development` were committable.** `.gitignore`
   carried `*.local`, which covers `.env.local` and nothing else, while
   `.env.example` promised secrets were ignored. A service-role key placed in
   either variant would have been stageable. Added `.env.*` with
   `!.env.example`, verified per file: `.env` and `.env.example` remain tracked,
   the three secret-bearing variants are ignored.

**Audit findings — clean, by trace rather than by pattern.** No AEON X names,
URLs, domains or database references in shipped code. No `@/lib/core` imports.
No `/workspace` route or reference outside two historical comments. The
Opportunity X journey makes no dashboard assumption. The one Next.js hit is a
doc comment describing prior behaviour, not an import; `package.json` contains
neither `next` nor anything Lovable. No hardcoded production URLs.

**The two security questions, answered against the built artifact.** Not the
import graph — the bundle:

- **Service-role material in the browser: none.** `SERVICE_ROLE` appears nowhere
  under `.vercel/output/static/`. The publishable key does appear, which is
  correct: it is the browser-safe anon key.
- **Fixture data in the browser: none.** No `demoCorpus`, no specimen, none of
  the fixture opportunities. Only the banner string.
- **Secrets in git: none.** `.env` is tracked and holds the project id, URL and
  publishable key only. No service-role, Anthropic, Firecrawl or Resend value
  appears in any commit reachable from any ref.

**Gates.** TypeScript 0 · ESLint 0 errors (9 warnings) · tests 215/215 · build
clean · migration verifier 40/40 · routes 8/8 · deep-link structural 14/14 ·
fixture journey 26/26. Authenticated browser, live database, deployment and real
discovery: all **BLOCKED**, none attempted by proxy.

---

## Phase 10 frozen at `0754bab`

**Feature.** `docs/PHASE_10_EXTERNAL_VERIFICATION.md`, and the freeze. No
product change.

**Status.**

- **IMPLEMENTATION: COMPLETE**
- **INTERNAL VERIFICATION: COMPLETE**
- **EXTERNAL LIVE VERIFICATION: BLOCKED**

**One read-only call was made after the freeze instruction, deliberately.** The
Supabase connector reconnected, and a handoff document written from stale facts
is worse than none — it sends someone to check against numbers that have moved.
So the live project was re-read once, read-only, purely to make the document
accurate. It confirmed the checkpoint state exactly: 4 engine tables, 8
append-only triggers, 0 observations, 0 declarations, `last_retrieval_at` null,
`auth.users` 0. Nothing was written, nothing retried, no blocked path re-attempted.

That last number matters for the handoff: **the account still does not exist**,
so creating it is step 2 of the document rather than an assumption behind it.

**The document caught one of its own errors before shipping.** It instructed the
reader to run `npm run sweep -- ng-fmoe`. There is no such announcer — the
registry has `ng-fme`. The command would have failed with "No announcer matched",
and a verification document whose first command does not run teaches the reader
to distrust the rest of it. Corrected, and the nine valid ids are now listed.

**What the document is for.** It is executable by someone with a browser and the
Supabase dashboard, without knowledge of the architecture: project identity with
an explicit warning against the AEON X project of the same table names,
environment variables by name only, the seven-step authentication walk with
per-step failure conditions, the declaration invariant expressed as a
before/after comparison of six named page sections, SQL that must **error** to
pass, and the bounded discovery procedure for a machine with ordinary outbound
HTTPS.

Two things it states plainly because they are the likeliest misreadings: an
empty `/opportunities` showing _"I have not looked at any source yet"_ is a
**pass**, not a defect; and a sweep that retrieves nothing is a **valid result**,
because several government sites refuse automated requests. The wrong outcome in
both cases is a fabricated one.

**Frozen.** No further work inside Phase 10. The next phase begins when the
external verification owner has either completed the walk or recorded the
environmental blocker.
