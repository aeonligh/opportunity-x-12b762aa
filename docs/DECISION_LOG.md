# Opportunity X — Engineering Decision Log

Append-only journal of significant engineering decisions. Newest first.
One entry per milestone task: feature, purpose, files, dependencies, risks,
testing, future work. See `CLAUDE.md` for when an entry is required.

---

## 2026-08-18 — Phase 16A–16E: redirect provenance, and a correction to my own report

**Correction first.** `PHASE_16_FIRST_CONTACT.md` §C.2 claimed a redirect
duplicate "inflates exactly the number the inspection surface asks people to
trust." **Wrong about corroboration.** Measured: `establishVerification` counts
distinct `source.sourceId` — announcers, resolved from the domain — so three
observations of one page reached three ways give `distinctSources = 1`. I had
reasoned it from the observation count instead of measuring it.

The defect was real but in a different place: `projectInspection` built one row
per observation and `evidence.consulted` from their length, so one page appeared
three times in "What I looked at". That is the surface a person reads, so it
mattered — just not where the report said.

**16A.** `requestedUrl` added to `CompletedExchange`, `witness()`,
`SourceObservation` and `opportunity_observations.requested_url`. `url` remains
the address that served the bytes; `requestedUrl` records how discovery arrived,
and only when it differed — presence is the signal, so a reader never compares
two fields to learn nothing happened. R-01 observed one advert at three addresses
with `-FINAL` and `-corrected` revisions and "nothing linking them to what they
supersede"; the pipeline was destroying that edge at the moment it existed.

**16B/16E.** Fixed at the projection layer. `sourceRows()` groups by the URL that
served the bytes, carrying `retrievals` and `reachedVia`. `evidence.consulted`
counts pages and uses each page's latest outcome — a page that failed Monday and
answered Tuesday is available. Repeated retrievals over time deliberately do not
collapse: one page read three times is one source observed three times, not one
observation. No observation is suppressed; the projection explains them.

**16C, and what it exposed.** One nullable column, one partial index, no backfill
— the table is empty, which is why this was the cheap moment. While wiring the
assertions I found `verify-migrations.sh` applied a **hardcoded list of four
files** under a comment reading "the three migrations"; it had already drifted,
and my new migration was silently unverified. It now discovers every engine-era
migration in filename order, which immediately picked up two nobody had been
verifying. 40 → 44 assertions.

**16D.** All six redirect cases driven over a real socket. Six mutations, each
observed to fail. A harness defect is recorded too: the rewriting transport made
every page look redirected, which would have made "present only on redirect"
untestable; it now maps the final URL back into the announcer's namespace.

**Files.** New: `supabase/migrations/20260818090000_observation_requested_url.sql`,
`docs/PHASE_16A_REDIRECT_PROVENANCE.md`. Modified: `observation/types.ts`,
`observation/record.ts`, `observation/supabase-store.ts`, `discovery/fetcher.ts`,
`surface/inspection.ts`, `OpportunityInspection.tsx`,
`scripts/verify-migrations.sh`, `test/discovery-over-http.test.ts`.

**Testing.** 285 total, 0 failing. 44/44 migration assertions.

**Phase 16 is still not complete.** The real sweep has not run. Nothing else was
built: no card work against real content, no freshness semantics, no preparation.

---

## 2026-08-17 — Phase 16: first contact with HTTP

**Feature.** The discovery pipeline run against a real HTTP server over a real
socket — every layer the fixture corpus has never touched.

**Why.** `retrieve()`, `readRobots()`, the link walk, the page budget and the
politeness delay had never executed against an HTTP server in fifteen phases.
Every opportunity this product has rendered came from `demoCorpus`, which calls
`witness()` directly with a hand-built exchange. Those five are the first things
`npm run sweep -- ng-fme` touches, and the external checkpoint asks a person to
run it on a laptop with an hour of their attention riding on it.

**What held.** Robots fetched, parsed and obeyed — a disallowed path was not
retrieved. The link walk stayed on-domain. A 500 was recorded as `unreachable`
rather than skipped. A page with no JSON-LD at all produced an observation and
invented nothing. Two URLs with one declared identifier resolved to one entity.
A page stating no deadline yielded no deadline.

**Three findings.**

1. A redirect discards the requested URL. `retrieve()` records `response.url`
   deliberately and correctly; what is lost is the other half. R-01 observed one
   advert at three addresses with `-FINAL` and `-corrected` revisions and
   "nothing linking them to what they supersede" — the request→destination edge
   is exactly what R-11 wants, and it is discarded at the moment it exists.
2. A redirect produces a silent duplicate observation. `visited` is keyed on the
   requested URL, so `/moved` and `/scholarship` look distinct, both are fetched,
   and both are filed under the same final URL — two observations, same URL, same
   content, same sweep, no way to tell why there are two. **Corroboration is
   counted from observations**, so a page reached twice by two routes inflates the
   "read from N sources" figure the inspection surface asks people to trust.
3. The sweep needs `SUPABASE_SERVICE_ROLE_KEY` as well as a network. Someone told
   "run this from a machine with ordinary internet" gets an immediate refusal.

**Not fixed, deliberately.** The better fix for 1 and 2 is one schema change —
record the requested URL alongside the final one and dedupe on the final — and
taking it now would mean designing against a synthetic redirect instead of a real
one. Recorded in the report; the real evidence is one sweep away.

**Files.** New: `test/discovery-over-http.test.ts`,
`docs/PHASE_16_FIRST_CONTACT.md`.

**Testing.** 8 new, 278 total, 0 failing. All assert behaviour over a live socket.
One pins finding 2 as current behaviour with a pointer to the report, so a future
fix fails loudly rather than silently. **One of my assertions was wrong about the
product rather than the reverse** — it expected `https://fixture.test/…` and the
observations carry the rewritten host, which is correct, because that is genuinely
where the bytes came from.

**Not done, and why.** Phase 16's definition of done requires a real sweep, which
has not happened; the phase is not complete on its own terms and the report does
not claim it is. No card work against real content (there is none — optimising
against my own synthetic long title would repeat the mistake that item exists to
end), no freshness semantics, no verification-history work, no preparation.

---

## 2026-08-17 — Phase 15: external verification attempted; the sign-in door fixed

**Outcome.** External verification is **blocked at the network layer** — recorded
once and not waited on. Two defects it surfaced were fixed.

**The blocker, measured.** Outbound CONNECT is denied by policy for every host:
Supabase, the announcers, the deployment, and `www.google.com` alike. The proxy
reports `"gateway answered 403 to CONNECT (policy denial or upstream failure)"`.

**A correction to the record.** Phases 10–14 described this as "announcer egress
403", which reads as though Nigerian government sites were refusing automated
requests. They are not — the sandbox denies everything. The first would be a
product finding; this is an environment fact.

**Confirmed without network:** `.env` names `anfiojmbgonrtympzjch` (Opportunity
X); AEON X's project appears nowhere; only public values are committed; migration
guarantees still 40/40 including the refusal probes that must error rather than
report `UPDATE 0`. No account created, no write attempted, nothing promoted.

**Defect 1 — the sign-in form blamed the password for the network.**
`catch (err) { toast.error(err.message) }` put every failure in one branch. Phase
11 taught the authenticated _gate_ to tell a rejected token from an unreachable
service; the _form_ never learned it. A person on a bad connection is told their
password is wrong, retypes a correct one, and is told it is wrong again — a
confident claim about something never established, on the surface where being
wrong locks someone out of their own account.

`src/lib/auth-outcome.ts` now classifies into five outcomes, each with what
happened, what is still true and what to do, and offers retry only where retrying
can help. It renders inline and persistently rather than as a toast, which
vanishes while the person is still reading the form it refers to.

**Verified live, by accident.** Because Supabase genuinely is unreachable here,
the browser walk drove a real failed sign-in and got _"I couldn't reach the
service that signs you in. This says nothing about your password."_ The
environment that blocks the verification produced the proof that the fix is
right.

**Defect 2 — a refresh in flight was presented as current.** Nothing modelled a
loader re-running underneath content already on screen, which is what every
declaration does: write, then `router.invalidate()` to read back. `Refreshing`
states it beside the content — a line, not a skeleton, because replacing valid
content with grey to report that fresher content is coming destroys what is known.

**Performance, measured** (Phase 14 had recorded it as unmeasured): routes 21–144
ms; **0 server-function calls on initial load** (loader is server-rendered);
**exactly 2 during a declaration** — one write, one read-back, no duplicate fetch
and no N+1; 201 ms click-to-confirmed. No caching introduced.

**Files.** New: `src/lib/auth-outcome.ts`, `src/components/ui/state/Refreshing.tsx`,
`test/auth-outcome.test.ts`, `docs/PHASE_15_REAL_CONDITIONS.md`. Modified:
`src/routes/auth.tsx`, `opportunities.tsx`, `saved.tsx`, `lab.faults.tsx`
(`?state=` deep links).

**Testing.** 6 new, 270 total, 0 failing. Five mutations, each observed to fail.
Browser: 56 combinations (7 fault states × 4 widths × light/dark), 0 console
errors, no overflow, themes verified on the root element; Phase 11 and Phase 14
walks both still pass.

**Future work.** The external walk needs one hour on an ordinary connection.
Attributing failed retrievals to entities closes the degraded gap and is the same
work that lets `opportunity_deliveries` record what was shown. Preparation
untouched, per the directive.

---

## 2026-08-17 — Phase 14: the state system

**Feature.** What each visual state is allowed to claim. Three new states, one
new contract, a failure-injection laboratory, and the removal of a duplicate.

**The three defects, each a surface claiming more than the system knew.**

1. `pursuitFor` caught every declaration read failure and returned
   `{ state: "undeclared" }`, so a read that did not happen rendered as _"You
   haven't said either way"_ — a claim about what the person did, made by a
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
exist. The test now asserts the universal rule is present _and not duplicated_.

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

---

## Phase 17 — The state system

**Feature.** Audit every state the product can be in, close the collapses, and
make the verification repeatable.

**Purpose.** One rule: _a UI state must never claim more knowledge than the
underlying system currently possesses._ Eight specific collapses were forbidden;
this phase found three of them live.

**Files changed.**

- New: `src/lib/last-good.ts`, `src/components/ui/state/RefreshFailed.tsx`,
  `src/routes/lab.refresh.tsx`, `test/refresh-preservation.test.ts`,
  `scripts/state-walk.mjs`, `docs/PHASE_17_STATE_SYSTEM.md`
- Changed: `src/lib/session-verification.ts`, `src/routes/__root.tsx`,
  `src/routes/_authenticated/{route,opportunities,saved,opportunities.$id,opportunities.examples}.tsx`,
  `src/routes/lab.index.tsx`, `src/lib/lab.server.ts`, `test/state.test.ts`,
  `package.json`

**Dependencies.** `playwright-core` added as a devDependency. ARB: the
vendor lock-in rule does not fire — it owns none of the build, auth, data or AI
layers, the build does not depend on it, and it exists solely to make browser
verification repeatable rather than anecdotal.

### The two findings

**A failed refresh destroyed valid content.** The router has no notion of "the
last answer that worked". A loader either resolves or throws, and a throw during
`invalidate()` reaches `errorComponent` with the previous data already
discarded — the component holding it unmounts as the boundary mounts, so state,
refs and context beneath it are gone precisely when wanted. Measured on
`/lab/refresh`: `AFTER-FAIL reading present : GONE`.

`lib/last-good.ts` is the answer, and it is **not a cache**. Nothing reads from
it to satisfy a request; it is consulted only after a read has already failed,
and only to answer "what were we showing?". A cache without an explicit freshness
model makes evidence go stale while looking current, which this product forbids —
so it carries `at`, and renderers are obliged to show it. A test asserts it has
grown no `ttl`/`maxAge`/`expires`/`revalidate` and that no route consults it
outside a failure branch.

**An unverifiable session took 57.3 seconds to say so.** The classification was
already correct: `signed-out` and `unverifiable` are held apart, and the gate
refuses entry on the second rather than redirecting, because a redirect to
`/auth` _is_ the claim "you are signed out". What was wrong was the clock.

The bound is not a performance tweak. A spinner asserts _this is progressing_,
and after a few seconds against a dead host nothing supports that — the loading
state becomes the lie. `SESSION_CHECK_DEADLINE_MS` (8s) is the point past which
that assertion is no longer honest, and it resolves to the **existing**
`unverifiable` outcome with its own `because`. No new state, no new component:
the deadline only makes an already-correct answer reachable in human time.
Re-measured: 8.7s, URL unchanged, worded as "not a sign that you've been signed
out".

### The retry model, closed as a class

`SurfaceError` accepted a `retrying` prop from the day it was written and **no
call site ever passed it**. Seven controls were brought to standard; three had
no pending state at all, two of those in production (`__root` "Try again",
`SessionBoundary` "Check again").

The test sweeps `src/**/*.tsx` rather than naming routes. The first version
named four and a browser walk immediately found three more — naming call sites
closes instances, scanning closes the class. A deliberately added new route
reintroducing the pattern is caught.

**Risks.** One devDependency. `SESSION_CHECK_DEADLINE_MS` is a judgement call: at
8s a genuinely slow but working auth round trip would be reported as
unverifiable. That is the safe direction to be wrong in — the person is told the
truth ("I couldn't confirm in time") and offered a retry, rather than being told
something false about their account.

**Testing.** 299 pass / 0 fail. Ten new behavioural tests; thirteen mutations,
all caught.

Two corrections recorded in the report and worth repeating here. One of my own
assertions was **vacuous** — `age-dropped-from-preserved` escaped, because the
test checked the label "Last read" rather than the timestamp, and a
preserved-content notice reading "Last read" and nothing else is exactly the
silent staleness the component exists to prevent. And my mutation harness was
wrong too: it counted `# fail` only, and reported a hang that cancelled three
tests as an escape.

I also introduced three defects during the phase and fixed them: `useTransition`
used without an import in `__root.tsx` (invisible to the build, which does not
typecheck, and to the tests, which read source text — it would have been a
runtime `ReferenceError` in the root error boundary); a dangling `user`
reference in the gate, fixed properly by making `SessionCheck`'s `signed-in`
carry the user; and an existing test that named `classifySessionCheck` directly,
reconciled to its original intent and re-verified by mutation.

**Future work.** A hydration mismatch fires on `/opportunities` and `/saved`
when the gate redirects to `/auth`: the client-side redirect during hydration
replaces a subtree the server rendered under `ssr: false`. It does not occur on
the `unverifiable` branch, which stays in the same subtree — that isolation is
what confirms the diagnosis. React recovers and the page is correct, but it is
the only known console error in the product. Not fixed here: changing how the
gate redirects is architectural, and Phase 17 was told not to redesign.
Recommended as the first item of Phase 18.

The degraded partition remains unreachable (`entity/group.ts:145`) and CR-24 /
CR-25 remain unimplemented — both unchanged by this phase, both still recorded
rather than manufactured.

---

## Phase 18 — Integration, runtime integrity & pre-production readiness

**Feature.** Audit the whole application as one running product: does the truth
survive when the states interact, and when the browser hydrates.

**Purpose.** Phase 17 proved each state says only what it knows. This phase asks
whether that holds across hydration, navigation, overlapping async work, and the
boundary between what the source says and what the artifact contains.

**Files changed.**

- New: `src/lib/hydrated.ts`, `scripts/verify-artifact.sh`,
  `test/runtime-integrity.test.ts`, `docs/PHASE_18_RUNTIME_INTEGRITY.md`
- Removed: `src/lib/api/example.functions.ts`
- Changed: `src/routes/_authenticated/route.tsx`, `src/routes/__root.tsx`,
  `src/lib/session-verification.ts`, `src/lib/ai.server.ts`,
  `scripts/state-walk.mjs`, `test/lab.test.ts`,
  `test/discovery-over-http.test.ts`, `package.json`

**Dependencies.** None added.

### The hydration defect, traced

A protected route is `ssr: false`, so the server emits the gate's pending shell
on no evidence — the session lives in `localStorage` and the server cannot see
it. `beforeLoad` resolved at 449ms (DOMContentLoaded was at 85ms), threw a
redirect, and the _router_ replaced the entire match set with `/auth`. React,
still hydrating, found `<AuthPage>`'s div where the server had written
`<Suspense>`.

The finding that decided the fix is why the `unverifiable` branch never did this,
and it is structural rather than a matter of timing: for an `ssr: false` match
the framework wraps the match in `<ClientOnly fallback={pendingComponent}>`,
whose first client render is always the fallback. Anything decided _inside_ the
match is therefore hydration-safe by construction. A router-level redirect leaves
that guarantee entirely — there is no longer a match to be client-only about.

`reloadDocument: !isHydrated()`: before hydration, ask the server for the page it
should have rendered; after, the identical redirect is an ordinary client
navigation. Measured at 873ms before (with the mismatch) against 880ms after —
**+7ms**, because the round trip replaces React's own tree regeneration.

**An alternative was built, measured and discarded.** Keeping the decision inside
the match — a `SessionAbsent` marker caught by the route's boundary — removed the
mismatch completely and cost no round trip, but React reports every error an
error boundary catches, so an ordinary signed-out visit logged a console error.
Trading a hydration warning for an error on the most common unauthenticated path
is not a fix.

### Two collapses closed

`getGreeting` — template scaffold, `POST`, no middleware, no guard, echoing its
input plus `config.nodeEnv`. Traced before removal: zero importers, tree-shaken
out of the build. Never a live endpoint; a live possibility one import away, with
nothing in the repository that would have said so.

`ai.server.ts` returned `{}` for a safety refusal, an unparseable response, and a
response with no text block — three unlike facts indistinguishable from "the
model answered, and found nothing". Nothing calls `callClaude`, which is the
reason to fix it rather than a reason not to: the first caller would inherit the
collapse silently. Now `answered | refused | unreadable`; a failure to _ask_
still throws.

### Verification moved from source to artifact

Every prior claim about a trust boundary in this repository was a claim about
imports. Whether it survived bundling, tree-shaking and an `import.meta.env`
define is a different question, and only the artifact answers it.
`verify:artifact` greps the built output — 22 assertions, seven planted leaks all
caught. The browser walk grew from 47 checks to 133.

### My own tests, audited

Two tests written in this phase **escaped their mutations** and were only caught
because the mutations were run:

- The safe-redirect set had a vacuous branch — deleting the embedded-scheme guard
  broke nothing, because every scheme-bearing input already failed the
  leading-slash check first. The inputs that reach that guard are schemes carried
  _inside_ an allowed prefix.
- The fact-immutability test declared one entity, and a mutation forcing `timing`
  to "open" for declared entities walked straight through it — that specimen's
  deadline was already open. One sample cannot tell "the projection ignores the
  declaration" from "this specimen happens to be immune". It now declares the
  whole corpus.

Four checks in the new browser walk were also defective — an always-true
`say(true, …)`, a hardcoded counter value against server-side state shared
between runs, a selector matching a nav link instead of a specimen, and a check
assuming an empty saved list when the laboratory ships fixture declarations. Two
silently-skippable assertions from an earlier phase were closed, and one
assertion pinned to a single line of formatting was rewritten.

**Risks.** The signed-out deep link now costs a document round trip. Measured at
+7ms against the defect it replaces, and it gives `/auth` a genuine
server-rendered first paint, but it is a real extra request and worth
re-measuring on production hardware.

**Testing.** 323 pass / 0 fail. 133 browser checks. 44 migration assertions. 22
artifact assertions. 24 mutations, all caught.

**Future work.**

**There is no sign-out anywhere in the product.** `grep -rni "sign out|logout"`
over `src/` returns nothing: no control, no account menu, no authenticated app
shell. The mechanism is correct — `__root` listens for `SIGNED_OUT`, invalidates
the router, and the gate re-evaluates, so a session ending in another tab is
honoured — but the affordance does not exist. Not added here: it requires
designing an app shell, and this phase was told not to add product features.

**No AI call ships.** `callClaude` is the sanctioned path per `CLAUDE.md` and has
no callers; the built server artifact contains no request to `api.anthropic.com`.
The engine is deterministic and evidence-based by design, so this may be correct
for the current phase — but it should be a decision rather than an accident.

Also unchanged and still recorded rather than manufactured: the degraded
partition is unreachable (`entity/group.ts:145`), `opportunity_deliveries` has a
table and triggers and an in-memory log but no writer, and CR-24 / CR-25 remain
unimplemented. The laboratory's UI shell ships as 29.6 KB of code-split chunks
that refuse server-side in production — recommended as a build-configuration item
rather than changed here, because making route generation differ between dev and
prod would put the checked-in `routeTree.gen.ts` in conflict with itself.

---

## Phase 19 — Authenticated shell & session lifecycle

**Feature.** An authenticated shell for Opportunity X, and the session
lifecycle it was missing — beginning with the ability to sign out.

**Purpose.** Phase 18 found that `grep -rni "sign out|logout" src/` returned
nothing: the mechanism to _handle_ a session ending was correct and wired, and
the affordance to _cause_ one did not exist. The same audit found peer
navigation hand-rolled differently on every page.

**Files changed.**

- New: `src/lib/sign-out.ts`, `src/components/shell/AppShell.tsx`,
  `src/components/shell/AccountControl.tsx`, `src/routes/lab.session.tsx`,
  `test/authenticated-shell.test.ts`, `test/render-shell.ts`,
  `docs/PHASE_19_AUTHENTICATED_SHELL.md`
- Changed: `src/routes/_authenticated/route.tsx`,
  `src/routes/_authenticated/{opportunities,saved}.tsx`,
  `src/routes/lab.index.tsx`, `scripts/alias-hook.mjs`,
  `scripts/state-walk.mjs`

**Dependencies.** None added.

### Why the shell is this small

The Constitution is silent on navigation and shells, so its shape is a product
decision rather than a derived requirement — recorded rather than invented. Two
ratified constraints decide it. CR-13 makes attention the scarce resource, and a
shell is the easiest place in a product for chrome to accumulate without anyone
deciding that it should. CR-16 asks what friction a feature removes; this one
removes two, so it does two things.

Rejected, each for a stated reason: a sidebar (spends horizontal space, which is
where evidence lives), a sticky header (a seventh of a 375px viewport, for the
whole session, to hold two links), a hamburger and a bottom bar (both are
answers to having more destinations than fit — there are two), and counts beside
Saved (a number invites checking it, and CR-04 is explicit that success is never
engagement).

**One decision reversed mid-phase.** The brand mark began as a link home. `Link`
sets `aria-current="page"` itself when the location matches, so on
`/opportunities` both the mark and the Opportunities link claimed to be the
current page, and `activeProps` cannot take it back. It is now inert — and the
second reason settles it anyway: a link to `/opportunities` sitting immediately
beside a link to `/opportunities` removes no friction.

### Sign-out is a write, so it is read back

`signOut()` returning cleanly is the request, not the answer. The answer is what
a subsequent read of the session says, and that is what decides the two cases
nobody would hand-write: a request that **rejected** while the server had
already ended the session is a success (a response lost coming back), and a
request that **resolved** while the session is still readable is a failure. The
request's own error is used only to explain an outcome the read established.

Only a confirmed sign-out may navigate — and before it does,
`forgetEverythingLastGood()` runs. `last-good` holds whatever each surface last
successfully showed so a failed refresh cannot erase it; across a sign-out that
stops being a safeguard and becomes a leak, because the next person to sign in
on that tab would see the previous person's list the first time a read failed.
Phase 17 wrote that function for this moment and recorded that nothing called
it yet. This is the caller.

Failure and unverifiable stay distinct, and neither says "you have been signed
out". On a shared machine that sentence is how somebody else reads your saved
opportunities.

### Three defects found by verification, not review

- **Two elements claimed to be the current page.** Caught by rendering the shell
  against a real router over the real route tree, rather than asserting
  `activeProps` from source.
- **The pending state collapsed within a frame.**
  `startTransition(() => void run())` returns the instant `run()` is _started_.
  Caught by the three-second specimen in the browser; React 19 keeps a
  transition pending for as long as the async function it was given has not
  settled.
- **A keyboard sign-out that failed dropped focus to `<body>`.** A focused
  button that becomes `disabled` is blurred by the browser and never restored,
  so the person pressed a control, an alert appeared below it, and their place
  was gone. Switched to `aria-disabled`, which keeps it focusable, with the
  double-press guard moved into the handler — and a test asserts both halves,
  because removing the attribute without adding the guard would leave nothing.

**Risks.** `aria-disabled` does not prevent activation at the platform level;
the guard in `run()` is now the only thing stopping a second sign-out against a
session the first may already have ended. It is asserted by test and exercised
in the browser, but it is code where it used to be a browser behaviour.

**Testing.** 336 pass / 0 fail. 210 browser checks. 13 new tests, 14 mutations
caught. One mutation escaped and was found to be semantically inert rather than a
gap — `exact` on `/saved` changes nothing while `/saved` has no sub-routes — and
was replaced with one that does change behaviour.

**Future work.** Unchanged and untouched: the `callClaude` decision, degraded
partition reachability, the `opportunity_deliveries` writer, and Phase 16's
external blocker. New and small: the account control's touch target is above
24px but below the 44px ideal, which is the CR-13 trade-off in miniature and is
recorded rather than silently chosen.

**Explicitly unverified.** No session can be created in this sandbox, so the
shell on the real `/opportunities` and `/saved`, a real Supabase `signOut()`
round trip, natural session expiry, a genuine second tab, deep-link return after
a real sign-in, real mobile hardware, and actual screen-reader announcement are
all **unverified**. The shell was exercised through `/lab/session` with the real
component and the real state machine.

---

## Phase 20 — Authentication security audit & hardening

**Feature.** Audit the existing authentication against five security classes and
implement the controls that genuinely belong to Opportunity X.

**Purpose.** Supabase owns password storage, hashing, comparison and token
issuance. The question was what this application can still get wrong with an
authentication system it did not write.

**Files changed.**

- New: `src/lib/auth-input.ts`, `test/auth-security.test.ts`,
  `docs/PHASE_20_AUTH_SECURITY.md`
- Renamed: `lib/opportunities.server.ts` → `.functions.ts`,
  `lib/lab.server.ts` → `.functions.ts` (and 12 importers)
- Changed: `vite.config.ts`, `src/integrations/supabase/client.ts`,
  `client.server.ts`, `src/lib/ai.server.ts`, `src/lib/auth-outcome.ts`,
  `src/routes/auth.tsx`, `scripts/verify-artifact.sh`, `scripts/state-walk.mjs`

**Dependencies.** None added. No custom hashing, JWT, refresh system, lockout or
CAPTCHA — Supabase owns each, and duplicating any would build the weaker of two
authentication systems.

### The two that mattered

**OAuth was on the implicit flow.** Established by asking the client what URL it
would send a person to, not by reading the docs: no `code_challenge`. Implicit
returns the access _and refresh_ tokens in the URL fragment — history,
extensions, screenshots, `location.hash`. `flowType: "pkce"` replaces them with
a single-use code that is worthless without the locally-held verifier.

**A client component could import the service-role client and the build said
nothing.** `importProtection` replaces the framework default rather than adding
to it, and this project had narrowed `files: ["**/*.server.*"]` to
`["**/server/**"]`, which matches nothing here. So the guarantee CLAUDE.md states
was documentation only. Measured: build exit 0, `SUPABASE_SERVICE_ROLE_KEY` in
the client bundle.

Restoring the pattern broke the build, because `.server.` meant two things:
`opportunities.server.ts` exported `createServerFn`s and was _meant_ to be
imported by routes. Renaming those to `*.functions.ts` — the convention
`pursuit.functions.ts` already used — made the suffix unambiguous again.

An intermediate attempt protected the `@/lib/server-only` marker file instead
and was abandoned when it proved never to fire: a side-effect-only module is
tree-shaken before the plugin's `generateBundle` hook runs. Worth recording,
because the marker looks like the obvious answer.

### Three more, and one thing that was already right

A typed password was rendered as an HTML `value` attribute and therefore sat in
`document.documentElement.outerHTML` — one DOM snapshot from leaving the page.
The credential inputs are uncontrolled now.

`waitForSession` answered a struggling auth service with up to sixty `getUser()`
calls in eight seconds. Bounded to three.

`"Session did not become available"` was thrown in one file and matched in
another with nothing binding them. Rewording either would have sent a
**successful** password check to the classifier's residual branch — the one
allowed to blame the password.

Already right, and proven rather than assumed: no password is stored, hashed,
compared, logged, persisted or placed in a URL by this application; exactly two
modules mention one, and one of those only validates its size; no authentication
message contains a stack, a URL, a status code, a project reference or a
Supabase string; and a wrong password is indistinguishable from a missing
account.

**Risks.** The session remains in `localStorage`, readable by any script on the
origin. Not changed here: moving it to cookies rewrites the authenticated gate
(which is `ssr: false` precisely because the session is invisible server-side),
the Phase 18 hydration repair that depends on that, and the middleware attaching
the bearer token. That is a redesign of authentication, which this phase
forbade. Recommended as its own phase. No CSP exists, which is the control that
would most reduce the exposure meanwhile.

**Testing.** 349 pass / 0 fail. 241 browser checks. 36 artifact assertions. 13
security mutations, all caught — plus two build-level proofs that a client
import of a credential-reading module now fails.

Two of my own tests were wrong and were corrected rather than accommodated: one
pinned the exact call shape of the validator and broke when the inputs became
uncontrolled — a change that made the page _more_ secure; another counted the
word "password" in user-facing copy as password handling.

**Future work.** Rate limiting, lockout, CAPTCHA, the configured password
policy, the project's redirect allowlist, provider configuration, JWT rotation
and TLS headers are all **NOT VERIFIED — EXTERNAL**: they belong to the Supabase
project or the deployment platform and cannot be established from this
repository. A successful sign-in has never been executed here, so every positive
path in the report is a proof about what happens _around_ one.

---

## Phase 21 — The public surface, held to the product's own standard

**Feature.** A whole-codebase authenticity audit, and the removal of what it
found. The finding that shaped the phase: fabrication in this repository is not
distributed. The product surfaces — `/opportunities`, `/saved`,
`/opportunities/$id`, the state components, the observation, verification and
judgment layers — are austere and say what they can support. Essentially every
untrue claim in Opportunity X was on `src/routes/index.tsx` and the component it
lazy-loads, and the landing page was the one file twenty phases of governance had
never audited against the system behind it.

**Purpose.** A product whose entire thesis is that it will not surface an
unverified opportunity as fact was, on its front door, presenting invented
statistics, invented match percentages, invented verification, four real
scholarship programmes as "Live results", and six capabilities of which five had
been deliberately deleted in Phase 13. Nothing in the epistemic machinery reaches
the marketing layer, which is exactly why it drifted.

**Files changed.** `src/routes/index.tsx`, `src/components/landing/OpportunityGlobe.tsx`,
`src/routes/auth.tsx`, `test/lab.test.ts`, `test/landing-authenticity.test.ts` (new).

**What was removed, and why each was disqualifying.**

- _A simulated AI pipeline._ An "Ask AI" button beside the hero input called
  `simulate()`: a `setInterval` advancing an index every 550ms through
  "Searching / Discovering / Reading / Verifying / Corroborating / Explaining",
  then stopping. It never read the query, called nothing, and produced no
  result. The other fabrications invented data; this one performed the act of
  working on somebody's real question.
- _`verified: true`, hardcoded on all 33 globe nodes._ It drove a green shield
  per node, "N verified opportunities" on the country panel, and a
  "Verified — 33 of 33" figure in gradient text, beside a comment asserting it
  was "a count, not a score… a fact with a source behind it". Every clause was
  false: nothing counted, nothing was verified, no source existed. CR-11.
- _A ranked list of match percentages_ (`92%` Chevening, `88%` DAAD EPOS, `84%`
  MEXT) and a second `94% Match` ring beside a named real programme. CR-21, and
  fabricated claims about real institutions.
- _Fabricated statistics_ — `$2.4B+`, `12,000+`, `190+`, `Daily` — and a
  "Live results" block over DAAD, Chevening, MEXT and Fulbright.
- _Three dead controls_ — "Apply now", "Save", "Share on WhatsApp" — bare
  `<button>` elements with no handler, href or form. Clicking did nothing,
  silently. "Apply now" is the action the whole product exists for.
- _Two claims that inverted the code._ "Duplicates removed — URL hashing and
  semantic dedup" against `surface/demo.ts` ("the disagreement survives to the
  surface instead of being deduplicated away"); and "confidence scoring…
  anything below 0.6 never gets published" against `observation/types.ts`
  ("there is deliberately no `confidence`"), with `0.6` appearing nowhere in the
  codebase.
- _Six advertised features, five deleted in Phase 13._ Verified against the
  `COMMENT ON TABLE` statements the migration writes into the database itself:
  `sop_drafts`, `cv_suggestions`, `documents`, `applications` and
  `sent_reminders` are all marked RETIRED. The sixth, "Application Tracker —
  Kanban-style pipeline from Interested to Submitted to Outcome", named four
  things that exist in neither `PursuitState` (two values: `interested`,
  `not-interested`) nor the schema.
- _Engagement vocabulary_ — "your opportunities feed" on the auth page, "keep
  your feed clean and signal-rich" on the landing page. CR-04 makes engagement
  void as a measure of this product working; CR-13 makes attention the scarce
  resource.

**Dependencies.** None added. No new package, component library, design system
or route. The globe, the sections and the visual identity are unchanged in form.

**The finding worth carrying forward.** Every fabrication removed here had
already been removed once, somewhere else in the same file. A `94% Match` ring
was deleted from `OpportunityGlobe` in an earlier phase, with a careful comment
citing CR-21 — while a `verified` field one line below it went untouched, and
the same percentage stood in three other shapes elsewhere on the page. An
earlier phase edited `AI_STEPS` for constitutional correctness without noticing
the array was driving an animation of work that never happened. Auditing the
contents of a fiction is not the same as noticing it is one. A comment saying a
problem was handled cannot fail; that is why this phase ends in tests rather
than in prose.

**Risks.** `SectionExecution` now carries a "Not built yet" block naming four
roadmap capabilities. That is honest today and becomes stale the moment one
ships, with no test binding it to `docs/ROADMAP.md`. The globe atlas is still 33
hand-written nodes — true facts about real organisations, now labelled as a
reference map rather than as discovery output, but it will need replacing with
real observations rather than relabelling again.

**Testing.** 353 pass / 0 fail (4 new). Build clean, `tsc` 0 errors, ESLint 0
errors and 8 warnings — measured against a stashed baseline, so a net change of
zero. 36 artifact assertions, 44 migration assertions. Browser walk across both
themes and three viewports: no console errors, no horizontal overflow, no
percentage or "Live" in the rendered text, and the one surviving interactive
control confirmed to work.

Five mutations, each reintroducing the exact defect its assertion was written
for, all confirmed caught and reverted.

One existing test had to be corrected rather than worked around: the fixture
corpus reachability rule in `test/lab.test.ts` matched raw file text, so a note
_citing_ `surface/demo.ts` as the authority for why the product refuses to
deduplicate read as a new importer. It now strips comments — mutation-tested to
confirm a genuine new import is still caught. Matching prose did not make the
invariant stricter; it punished writing down why the code is the way it is.

**Future work.** Whether `/opportunities/examples` should be public is a real
question and larger than this phase — the landing page link is currently
labelled "sign-in required" rather than moved. 37 unused shadcn primitives
remain (reported, not removed). And the honest version of the globe, the
statistics and the results block is the same in all three cases: run discovery.

---

## Phase 21A — Production truth correction

**Trigger.** Two screenshots of the deployed product, both showing the large
`SurfaceError` card — "SOMETHING HERE DIDN'T LOAD" — on `/opportunities` and
`/saved`. That closed the question left open by the Phase 21 audit: the visible
failure was not an honest empty corpus, it was a production read failing.

### A. The cause, established rather than theorised

`mcp__Vercel__get_runtime_errors` on `prj_FZEGLp6uU9d7iFDfiWLgDcSivDmC`,
7-day window:

```
[Supabase] Missing Supabase environment variable(s): SUPABASE_URL,
SUPABASE_PUBLISHABLE_KEY. Set them in your environment.
count=23  users=1  routes=/__server
first=2026-08-19T08:34:53Z  last=2026-08-19T08:37:25Z
lastDeployment=dpl_3ASZV8UmG8MkBx3kjVGD3jzNu4uf
```

That is the throw, verbatim, from the deployment the screenshots were taken
against. `src/integrations/supabase/auth-middleware.ts` reads `SUPABASE_URL` and
`SUPABASE_PUBLISHABLE_KEY` from `process.env` and throws before it looks at the
auth header. Every authenticated server function therefore throws, both route
loaders reach their `errorComponent`, and both render `SurfaceError`.

The state model behaved correctly throughout. "I couldn't read the record of
what I've observed" was **true** — the read genuinely failed. This was never a
case of the UI overclaiming; it was the UI accurately reporting a
misconfiguration, which is the fourth of the four states the product is required
to distinguish.

**CONFIGURATION FIX — NOT APPLIED. Blocked: no tooling.** The Vercel MCP surface
exposes projects, deployments, logs, errors and protection settings. It exposes
no environment-variable read or write, there is no `vercel` CLI in this
environment, and no Vercel token. The values are handed over in the report; the
write is the owner's.

### B. A second, separate production defect found while confirming the first

Every one of the last 20 deployments has `target: null`, and the project reports
`live: false`. **No production deployment exists.** Fetching
`https://opportunity-x-12b762aa.vercel.app/` returns a build that predates Phase
17: "Live Search" pointing at `/search`, `Ranking` and `Matching` still in the
pipeline list, `$2.4B+`, `94%`, `Apply now`, all six retired features, and
`Powered by AEON X` in the footer — a string `scripts/verify-artifact.sh` has
been asserting against for several phases, on an artifact that was never the one
being served.

The screenshots show the Phase 19 shell, which that build does not contain, so
the user was testing a **preview** deployment of the feature branch. That
matters for the fix: preview deployments read Preview-scoped variables, so
setting the variables for Production alone will not clear the error on the URL
actually being used.

**CONFIGURATION FIX — NOT APPLIED. Blocked: same tooling gap.**

### C. Schema drift — repaired

**DATABASE FIX — APPLIED.**

Before: `supabase_migrations.schema_migrations` held four rows
(`opportunity_observations`, `opportunity_verification_events`,
`opportunity_pursuit_and_delivery`, `refusal_functions_are_not_endpoints`).
`observation_requested_url` and `mark_legacy_tables_retired` were absent. The
ledger versions do not match the repository filenames — the four were applied
through the dashboard and re-stamped — so the ledger alone could not settle it,
and the column list was read directly: 20 columns, no `requested_url`.

Applied via `mcp__Supabase__apply_migration` to `anfiojmbgonrtympzjch`, stamped
`20260821211057 observation_requested_url`. Verified afterwards in one query:
column present (`text`, nullable), partial index
`opportunity_observations_requested_url` present, column comment present, **both
append-only triggers still attached**, row count still 0.

Read path: the exact 20-column `select` that
`observation/supabase-store.ts` issues now returns `[]` instead of erroring.
Write path: proved with `EXPLAIN (verbose)` on the full insert, which resolves
and type-checks every column including `requested_url` **without executing**. No
observation was fabricated to prove anything; the table still holds zero rows.

### D. Legacy retirement migration — deliberately untouched

`20260817190000_mark_legacy_tables_retired.sql` remains unapplied, as instructed.
Inspected: 97 lines, and the only statements it can execute are `COMMENT ON
TABLE` — four literal ones and a `DO` block whose loop body is a single
`format('COMMENT ON TABLE public.%I IS %L', …)` guarded by a `pg_class`
existence check. No `DROP`, `DELETE`, `TRUNCATE`, `ALTER`, `UPDATE`, `INSERT`,
`GRANT` or `REVOKE`. It is metadata-only, non-destructive and idempotent.

One fact that bears on the decision and was not previously recorded: in this
project every legacy table holds **0 rows**. The only table in the database with
data is `profiles`, at 1 row, which is not in the retired set. The migration's
own "MAY CONTAIN REAL USER STATEMENTS — export before dropping" warnings are
about a future `DROP`, which this migration does not perform, and there is
nothing to export here in any case. Safe to apply; still the owner's call, and
still a different decision from the one above.

### E. Correction to the Phase 18 verification record

Phase 18 reported the fixture corpus was not shipped as product data. **The test
behind that claim was narrower than the claim.** `scripts/verify-artifact.sh`
greps the _client bundle_ for `demoCorpus`, `Bilateral Education Agreement`,
`Federal Ministry of Education`, `education.gov.ng` and `unn.edu.ng`. Those five
assertions were true and are still true — nothing about the browser build has
changed.

What they do not cover is the server. `fixtureOpportunities()` is a
`createServerFn` in `src/lib/opportunities.functions.ts`, and
`/opportunities/examples` is a real authenticated route. Any signed-in
production user can reach the fixture corpus; it arrives over the wire from the
server, which is precisely the path a client-bundle grep cannot see. The Phase
18 statement should have read "the fixture corpus is not compiled into the
browser build", which is a claim about a build artifact, not about
reachability.

The old entry is left as written. This is the amendment, not a rewrite.

**Is the fixture route still intentional?** Yes, and it survives this
correction. The corpus exists so a person can see how a well-corroborated
opportunity, a single-source one and a contested one actually read, before
discovery has run. Every card carries `evidence="fixture"` and renders the
marker "Fixture — nothing here was retrieved from a real source" on the card
itself rather than on the page, so the label cannot be separated from the data,
and `test/lab.test.ts` enforces that every route rendering the corpus passes
that prop. Deliberate, labelled exposure is not the defect. What was wrong was
its _priority_, corrected below.

### F. Information architecture

**CONTENT/IA FIX — APPLIED.**

- `/opportunities` and `/saved`: the product lede is now rendered only when
  there is content to caption. On `unknown`, `absent`, `empty` and error
  branches the heading stands alone and the state gets the screen. No state's
  wording changed, and `unknown` / `absent` / `empty` / unreadable remain four
  distinct things.
- The fixture link was the only forward motion on a failed or empty
  `/opportunities`, reading "See example opportunities →". It is now a single
  `ExamplesLink` component reading "Sample cards, not real openings →", at
  reduced weight and without the underline. The route is unchanged and still
  reachable.
- `/saved`'s empty state is untouched: "Opportunities you save will appear
  here." No prose was added anywhere to fill space.

### G. What this phase did not do

No new feature, no new state, no new auth, no new copy beyond the two label
changes above, and no weakening of any absence distinction.

---

## Auth flow, form UX and credential-boundary audit

**Feature.** Repair the sign-up path, replace the collapsed authentication
error model with one that distinguishes every state a person can land in, add
a password visibility control and real form UX, and audit the credential and
SQL boundaries.

**Purpose.** Two screenshots. A sign-up produced _"Your details were accepted,
and the session didn't arrive. Nothing is wrong with your account, and nothing
was changed."_ A sign-in immediately afterwards produced _"That email and
password don't match an account."_ Both messages were wrong in different ways,
and one of them was wrong about a sign-up that had worked.

### The root cause, measured rather than inferred

`src/routes/auth.tsx` called `supabase.auth.signUp()` and destructured only
`{ error }`. That is safe if and only if a sign-up which does not throw always
returns a session.

It never does on this project. `auth.users` holds exactly one row —
`created_at` 2026-08-18 10:24:22, `confirmation_sent_at` 10:24:22,
`email_confirmed_at` 10:27:36 — a three-minute gap that only exists when email
confirmation is enabled. With confirmation on, `signUp` succeeds and returns
`session: null` by design.

The code then waited six seconds for a session that was never coming, gave up,
threw `SESSION_NEVER_ARRIVED`, and rendered the `no-session` outcome. **Every
successful sign-up on this deployment reported a failure.**

The second screenshot follows from the first: the person, told sign-up had
failed, tried to sign in — with a new password, against an address that already
had an account — and Supabase correctly answered `invalid_credentials`.

**Both a code defect and a project setting are causes.** Email confirmation
being enabled in Supabase is not a bug and is not being changed; the defect was
that the code did not handle the response that setting produces.

### The response that must not be read too closely

For an address that already belongs to a confirmed account, Supabase returns
the _same shape_ — a user object, no session, no email sent. Their
documentation calls it an obfuscated response that "prevents user enumeration
attacks". The tell is an empty `identities` array.

`classifySignUp` does not look. Reading that field would hand back on demand
the exact answer Supabase withholds by design, on a form anyone can type any
address into. Both cases therefore share one outcome, whose copy is true of
either: it says a link is on its way _if the address still needs confirming_,
says plainly that it will not reveal whether the address already has an
account, and tells the person to sign in with their existing password if they
do. That last sentence is what the person in the screenshots needed.

**This deliberately does not use the wording the brief suggested** — "Your
account was created. Check your email to confirm it." For an address that
already exists, nothing was created and no email was sent, so that sentence
would be false half the time and would leak which half. Specificity was
required "when specificity is safe and actually known"; here it is neither.

**Files changed.** `src/lib/auth-outcome.ts` (rewritten),
`src/routes/auth.tsx`, `src/lib/auth-input.ts`, `test/auth-flow.test.ts`
(new), `test/auth-outcome.test.ts`, `test/auth-security.test.ts`.

### The error-state model

Five outcomes became thirteen, each reached only by evidence that it is the
right one:

| State                                  | Kind                  | Retryable   |
| -------------------------------------- | --------------------- | ----------- |
| Invalid form input                     | `invalid-input`       | no          |
| Network failure                        | `unreachable`         | yes         |
| Service unavailable                    | `service-unavailable` | yes         |
| Rate limited                           | `rate-limited`        | yes         |
| Invalid credentials                    | `rejected`            | no          |
| Password refused by policy             | `weak-password`       | no          |
| Email never confirmed                  | `unconfirmed`         | no          |
| Account created, confirmation required | `confirm-email`       | no (notice) |
| Account creation uncertain             | `signup-uncertain`    | yes         |
| Session establishment failure          | `no-session`          | yes         |
| Redirect/callback failure              | `callback-failed`     | yes         |
| Configuration failure                  | `misconfigured`       | no          |
| Unexpected provider response           | `unexpected`          | yes         |

The fourteenth state — account created _and_ session established — is
deliberately not a message; there is nothing to say to somebody already being
taken to the product.

Four specific corrections inside that:

- **The residual branch was `rejected`.** Any unrecognised failure accused the
  password. It is now `unexpected`, and `rejected` is reached only by an error
  that says a credential was refused.
- **`no-session` claimed "Nothing is wrong with your account, and nothing was
  changed."** A client that has just failed to establish a session knows
  neither, and on a sign-up the second half is false. Removed.
- **A network fault and a failing service shared a branch.** "Check your
  connection" is wrong advice for a 5xx. Separated by status.
- **A misconfiguration was reported as a wrong password.** A disabled provider,
  a missing environment variable or a wrong publishable key now says so, and
  says the person cannot fix it.

### The password policy is not stated, because it cannot be read

The minimum length and character rules are configured in the Supabase project.
This repository cannot read them: the `auth` schema has 23 tables and none is a
config table, the project metadata does not carry it, and the auth service is
not reachable from this environment (measured — `curl` to
`…supabase.co/auth/v1/settings` returns a 403 CONNECT from the egress proxy).

So no requirement is printed under the field. When Supabase refuses a password,
its own stated reason is surfaced — capped at 160 characters and rejected
outright if it carries a URL, a template placeholder or a raw identifier.

### Form and accessibility

- Both fields carry real `<label>` elements. A placeholder is not a label.
- A show/hide password control: a real `type="button"`, in the tab order, with
  `aria-label` and `aria-pressed` following its state and a visible focus ring.
  Implemented as a `type` swap on the same element, so the value and caret
  survive — **and so the plaintext never reaches the markup.** The obvious
  alternative, a controlled text input, would have written the password into
  `outerHTML` as a `value` attribute, reintroducing the exact defect Phase 20
  removed.
- The address is checked on blur and the complaint withdrawn on correction,
  through the same predicate (`emailFault`) the submit refusal uses, so the two
  cannot disagree. An empty field is never scolded on blur.
- A synchronous `inFlight` ref guards double submission; `disabled={loading}`
  is a render away from the click.
- The submit is disabled only while a request is running and says which
  ("Signing you in…" / "Creating your account…"). No mysterious disabled state.
- What was typed survives a failed attempt structurally — the inputs are
  uncontrolled and nothing in the failure path touches them.

### Security

- A failed OAuth return (`?error=`, `?error_description=`, and the fragment
  equivalents) was never read: the person came back to a clean empty form with
  no sign anything had been attempted. It is now read, classified, and stripped
  from the address bar. The provider's description is used only to tell a
  refusal from a fault and is **never rendered** — `/auth?error_description=…`
  is a text field anyone can fill by sending a link.
- `emailRedirectTo` moved from the origin to `/auth`, so a confirmation link
  lands on the route that hands off to the product rather than on the marketing
  page. If `/auth` is not in the project's Redirect URLs allow list Supabase
  falls back to the Site URL, which is where it went before — the change cannot
  be worse than what it replaces.
- Unchanged and re-verified: PKCE flow, `safeRedirectPath` positive
  enumeration on `?next=`, no password persisted/logged/hashed/URL-borne, the
  password reaching only `supabase.auth.*`, no server function accepting one,
  and the service-role key confined to `client.server.ts` and `store.ts`.

### SQL and input safety

Every database read and write in `src/` goes through the typed PostgREST query
builder (`.from().select()/.insert()/.eq()`), which parameterises. There is no
raw SQL, no `.rpc()`, no `.or()`, no `.filter()` with a filter string, and no
`textSearch()` anywhere in the application — the three PostgREST APIs that take
raw filter expressions are unused. No character blocklist was added; blocking
quotes or keywords is not an injection defence and would corrupt legitimate
input.

### Testing

`test/auth-flow.test.ts` — 18 tests. Fifteen mutations were applied to the
behaviour this phase changed; **all fifteen are caught.** One escaped on the
first pass: the assertion for the OAuth-return reader matched
`/takeCallbackFailure\(\)/`, which the function's own _declaration_ satisfies,
so deleting the call site left the suite green. It is now pinned to the
assignment and the `setFailure` that follows it.

Two pre-existing assertions were **strengthened**, not relaxed, to accommodate
the bound `type` and the tone-dependent `role`.

Suite: 397 tests, 396 pass, 0 fail, 1 skipped (a pre-existing build-artifact
check).

### Risks and what was not done

- **Production is unverified from here.** Egress to both
  `opportunity-x-12b762aa.vercel.app` and the Supabase auth host returns a 403
  CONNECT from the agent proxy, and the Vercel and Supabase MCP connectors
  disconnected mid-session. Nothing in this entry claims the deployed
  behaviour; it claims the code, the tests and the build artifact.
- **`redirectTo` for Google still drops `?next=`.** Preserving it would mean
  appending a query string to the redirect target, and whether Supabase's
  allow-list matching tolerates that is not verifiable from here. Left as-is
  deliberately rather than risking a live sign-in path before a deadline.
- No password reset flow. It does not exist in this product yet and was not in
  scope.
- No rate limiting or lockout was added. Supabase already rate-limits and
  answers 429, which is now a distinct outcome; a second limiter in the client
  would be a second authentication system.

### Authority

CR-20 (a state that cannot be told from another state is not a state), CR-24
(inference must be labelled — the sign-up notice labels what it does not know),
OXD-004 (no claim without provenance — the password requirement is quoted from
the party that holds it, or not stated).
