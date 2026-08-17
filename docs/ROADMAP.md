# Opportunity X — Roadmap & Phase Status

Canonical roadmap and honest current status. Update this file whenever a phase
materially changes. Governance rules live in `CLAUDE.md`.

**Assessed:** 2026-08-17, against branch `claude/project-analysis-review-9h7hly`.
Status claims below were verified by running commands and reading code, not by
assuming the roadmap was followed. Phase headings below §9 date from 2026-07-29
and have not been re-measured since.

---

## Quality Gate Status — PASSING in this environment

Re-measured 2026-08-17. The July assessment (4 TypeScript errors, ~28,540 lint
errors, no tests) is superseded.

| Gate            | Status                   | Detail                                                                                             |
| --------------- | ------------------------ | -------------------------------------------------------------------------------------------------- |
| TypeScript      | ✅ **0 errors**          | `bunx tsc --noEmit -p .`                                                                           |
| ESLint          | ✅ **0 errors**          | 9 warnings remain, all pre-existing `react-refresh/only-export-components` in `src/components/ui/` |
| Build           | ✅ passes                | `bun run build` → Vercel Build Output v3 via Nitro                                                 |
| Dev server      | ✅ passes                | serves on :5173                                                                                    |
| Tests           | ✅ **240 pass / 0 fail** | `npm test` — Node test runner, no framework dependency                                             |
| Console errors  | ✅ none                  | Chromium walk of `/lab/*` and the signed-out gate                                                  |
| Light/dark mode | ✅ both verified         | driven through the real `ThemeProvider`, not `prefers-color-scheme`                                |
| Responsive      | ✅ 375 / 768 / 1280      | no horizontal overflow at any width                                                                |
| Accessibility   | ⚠️ partial               | keyboard reachability and live-region roles verified on the state surfaces; no full audit          |
| Performance     | ⚠️ unverified            | no measurement taken                                                                               |

**The gates are no longer what blocks phase closure.** What blocks it is live
verification — see Phase 10 below.

---

## Phase 0 — Foundation ⚠️ substantially built, gates unmet

Repo structure, Tailwind v4 design system, `ThemeProvider`/`ThemeToggle`,
shadcn/Radix primitives, branding (`BrandMark`, `BrandLoader`, favicon,
`public/brand/`), global layout via `__root.tsx`, navigation (`Header.tsx`).

Gaps: no formatting/lint baseline; "ARES" responsive framework is a named
concept with no identifiable implementation — either it is the Tailwind
breakpoint usage under a different name, or it was never built. Needs a decision.

## Phase 1 — Landing Experience ⚠️ built, unverified

Hero, `OpportunityGlobe` (react-three-fiber), AI search bar with prompt chips,
verification/personalization/transformation sections, footer, CTAs.
Verified rendering at desktop width.

Gaps: globe did not render in headless capture (likely a WebGL/headless
artifact, not confirmed either way); mobile/tablet unverified; no performance
budget measured on a 3D-heavy landing page.

## Phase 2 — Authentication ❌ BLOCKED — cannot close

Email/password signup + sign-in, session persistence with a race-condition
guard (`waitForSession`), protected routes (`_authenticated/route.tsx`),
auto profile creation (`handle_new_user` trigger), sign-out, error handling.
Google OAuth migrated off the Lovable proxy to native `supabase.auth.signInWithOAuth`.

**Blockers:**

1. **Google OAuth is non-functional** — needs a Google OAuth client configured
   in Supabase Dashboard → Authentication → Providers, plus redirect URLs
   allowlisted. Code is ready; the provider is not. **Never tested end-to-end.**
2. **LinkedIn OAuth does not exist** — roadmap deliverable, zero implementation.
3. **"Remember Me" does not exist** — roadmap deliverable, no UI or logic.

Exit criterion is "production-ready / users never lose valid sessions" — not
demonstrable without an end-to-end auth test.

## Phase 3 — User Profile ✅ likely complete

Multi-step onboarding (`onboarding.tsx`); `profiles` carries country,
university, course, degree type, level, graduation year, career interests,
skill tags, preferred categories, bio, email notification preference.
Sufficient signal for AI matching.

Gap: no AI profile-completeness scoring (roadmap deliverable).

## Phase 4 — Discovery Engine ✅ built, untested live

`src/lib/intelligence.functions.ts` — discovery → verification → dedup →
scoring → persistence → recommendation. Firecrawl scraping with HTTP-HEAD
fallback, `url_hash` dedup with a DB unique index, confidence scoring, priority
TLD weighting, `discovery_runs` audit table, cron entry point.

**Caveat:** now runs on Claude (`callClaude`) rather than the Gemini the roadmap
names. Never executed against the live web — requires `ANTHROPIC_API_KEY` plus
network access neither of which the dev sandbox had.

## Phase 5 — Opportunity Intelligence ✅ built, untested live

`match_scores` cache, verification/confidence scores, `ai_insight` +
`ai_reasoning` per opportunity, eligibility analysis (`checkEligibility` →
score + met/missing requirements), recommendation feeds (recommended, trending,
new this week, ending soon, by category).

## Phase 6 — Execution ⚠️ mostly built

Save/vault, apply tracking (`applications` with 6-state status), deadline
reminders (`deadline-intelligence.server.ts` + Resend email), WhatsApp share,
analytics event tracking, notifications table + UI.

Gap: **no calendar integration** — the only `Calendar` in the codebase is a
lucide icon and an unused shadcn primitive. Roadmap deliverable, not built.

## Phase 7 — Application Copilot ⚠️ partial

CV optimizer (`optimizeCV` → score + categorized suggestions), SOP generator
(`generateSOP`), document vault (`user_documents` + private storage bucket),
document checklist in deadline reminders.

Gaps: **cover letter generation not implemented** — supported types are
Scholarship Essay / Motivation Letter / Personal Statement / Study Plan.
**Interview preparation not implemented** — `Interview` in this codebase is an
application status value, not a feature. Timeline view not built.

## Phase 8 — Opportunity Agent ⚠️ foundation only

`deadline-intelligence.server.ts` runs deadline checks and sends reminders;
`sent_reminders` prevents duplicates; cron hook route exists.

Gaps: no persistent agent, no continuous monitoring, no deadline _prediction_
(current logic is threshold-based, not predictive), no proactive
recommendations. The cron schedule was deliberately removed during the Lovable
migration (pointed at a dead preview URL) and must be re-created against the
real deployment URL.

## Phase 9 — Global Scale ❌ not started

Admin analytics dashboard exists (`_admin/analytics.tsx`) and an append-only
`opportunity_analytics` table.

Missing: localization/i18n (zero), caching strategy, monitoring/observability,
multi-region, performance budgets, cost controls, error tracking (the previous
error reporting piped to Lovable's telemetry and was removed with no
replacement), enterprise readiness.

---

## Phase 10 — Production Ratification + Foundation Lock ⚠️ frozen, externally blocked

Migrations applied and behaviourally verified against the canonical Supabase
project (`anfiojmbgonrtympzjch`): 4 engine tables, 8 append-only triggers, RLS on
every table, 40/40 assertions in `scripts/verify-migrations.sh`. Standalone
separation from AEON X proved. Client bundle audited for secrets and fixtures.
Deep links 14/14, fixture journey 26/26.

**Frozen, not closed.** Three things cannot be verified from this environment and
are handed off in `docs/PHASE_10_EXTERNAL_VERIFICATION.md`:

- `auth.users = 0` — no account exists, so no authenticated walk has been run
- announcer egress is `403` here, so **no observation has ever been acquired**
- production still serves a pre-Phase-10 build; promotion is deliberately unmade

Nothing was weakened, mocked or substituted to make these appear verified.

---

## Phase 11 — State, Loading, Error & Graceful Degradation ✅ complete for everything reachable without live data

Nine states made distinguishable on every canonical surface: unknown, absent,
empty, loading, pending, confirmed, refused, failed, degraded. Loading
placeholders that stand for shapes and never for values; route-local error
boundaries where `stillTrue` is a required prop; a mutation sequence where a
pressed button is a claim about the record rather than about a request having
been sent; a session gate that distinguishes "I could not check" from "you are
signed out" without becoming more permissive.

The laboratory (`/lab/states`, `/lab/mutations`) makes all fourteen specimens
reachable on demand. 25 new tests, every assertion mutation-tested.

Full report: `docs/PHASE_11_RATIFICATION.md`. Known gaps are in its §K — chiefly
that partial degradation has a shape and a specimen but no production call site,
and that **none of this has been seen against live data.**

---

## Phase 12 — Product Completeness Audit ✅ audit complete, one decision blocking

The implementation contains **two products**. System A — the constitutional
engine of Phases 4–11 — holds no composite score and states absence honestly.
System B — the pre-migration app — renders `match_scores` as a percentage ring on
an unauthenticated, shareable route, which CR-21 forbids in those words. They
share a build and no data, and every piece of navigation points at System B.

Fixed this phase: both `/api/public/hooks/` endpoints accepted an unauthenticated
POST — one drives the service-role discovery pipeline, the other emails every
user. Both now require a shared secret and fail closed.

Six capabilities are genuinely missing with real constitutional authority,
chiefly the inspectable person-model (CR-24) and the "show me anyway" override
(CR-25). None were built: each would have to be built twice until the founder
decides which product is the product.

Also established: the five "Bibles" cited 30 times across the source have never
existed in this repository, and the Constitution contains no role model.

Full report: `docs/PHASE_12_COMPLETENESS_AUDIT.md`.

---

## Phase 13 — Unify / retire the legacy judgment system ✅ complete

One product now exists. 5,403 lines across 30 files retired: the legacy routes,
components and services, plus the invented match percentages on the landing page
and the globe.

`opportunity_pursuits` is the sole declaration store with a single writer.
`saved_opportunities` is archived rather than migrated — its identifiers have no
correspondence to the canonical entity model, and inventing one would produce
declarations nobody made.

Ten legacy paths now 404; the built artifact carries no legacy route, table or
component. CR-21 holds. CR-09, CR-24 and CR-25 remain unimplemented with their
authority recorded rather than manufactured.

Nothing was dropped from the database. One metadata-only migration annotates the
legacy tables as retired and flags those that may hold real user content.

Full report: `docs/PHASE_13_CONSOLIDATION.md`.

---

## Phase 15 — Real conditions ✅ complete; external verification still blocked

External verification was attempted and is blocked at the network layer:
outbound CONNECT is denied by policy for every host, including `google.com`.
Recorded once, not waited on. **Correction to the earlier record:** this is not
the announcers refusing automated requests — the sandbox denies everything.

Two defects the attempt surfaced were fixed. The sign-in form collapsed every
failure into one branch, so an unreachable auth service told people their
password was wrong; it now classifies five outcomes and renders them inline
rather than as a toast. And a loader re-running underneath rendered content was
presented as current; `Refreshing` now says so beside it.

Performance measured for the first time: 0 server-function calls on initial
load, exactly 2 per declaration (write + read-back), 201 ms round trip.

Full report: `docs/PHASE_15_REAL_CONDITIONS.md`.

---

## Phase 16 — First contact with HTTP ⚠️ pipeline proven, real sweep still blocked

The discovery pipeline was run against a real HTTP server over a real socket.
`retrieve()`, `readRobots()`, the link walk, the page budget and the politeness
delay had never executed against an HTTP server in fifteen phases — and they are
the first five things `npm run sweep` touches.

Robots is obeyed, the walk stays on-domain, a 500 is recorded as unreachable, a
page with no JSON-LD invents nothing, and two URLs with one identifier resolve to
one entity.

Three findings, none fixed: a redirect discards the requested URL; a redirect
produces a silent duplicate observation that inflates the corroboration count;
and the sweep needs the service-role key as well as a network. The fix for the
first two is one schema change, deferred until a real redirect exists to design
against.

**Not complete on its own terms** — the definition of done requires a real sweep,
which remains blocked by egress.

Full report: `docs/PHASE_16_FIRST_CONTACT.md`.

---

## Recommended sequence

The July sequence is superseded: the quality gates it led with now pass. What
remains is external.

1. **Create one confirmed account and run the Phase 10 walk.** Sections 2–6 of
   `docs/PHASE_10_EXTERNAL_VERIFICATION.md`. Everything downstream is guesswork
   until an authenticated surface has been seen.
2. **Run one bounded sweep from a machine with ordinary internet.** Section 7.
   A sweep that retrieves nothing is a valid result; a fabricated one is not.
3. **Promote a build to production**, then repeat sections 3 and 4 against it.
   READY build ≠ deployed ≠ authenticated and working ≠ real discovery.
4. **Then** close the Phase 6/7 gaps (calendar, cover letter, interview prep).
5. **Phase 8/9** last — they assume the platform below them is solid.
