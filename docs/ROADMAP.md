# Opportunity X — Roadmap & Phase Status

Canonical roadmap and honest current status. Update this file whenever a phase
materially changes. Governance rules live in `CLAUDE.md`.

**Assessed:** 2026-07-29, against branch `claude/project-analysis-review-9h7hly`.
Status claims below were verified by running commands and reading code, not by
assuming the roadmap was followed.

---

## Quality Gate Status — FAILING repo-wide

These block closing *any* phase, regardless of feature completeness:

| Gate | Status | Detail |
|---|---|---|
| TypeScript | ❌ **4 errors** | `/admin/*` route paths not in generated route tree — `Header.tsx:125`, `_admin/route.tsx:28,31,34` |
| ESLint | ❌ **~28,540 errors** | 28,514 auto-fixable (Prettier formatting). Never had a formatting pass. |
| Build | ✅ passes | `bun run build` → Cloudflare Workers output |
| Dev server | ✅ passes | serves on :5173, verified via screenshots |
| Tests | ❌ **none exist** | no test script, no test directory, no framework installed |
| Light/dark mode | ⚠️ unverified | `ThemeProvider` + `ThemeToggle` exist; light mode never visually checked |
| Responsive | ⚠️ unverified | only desktop (1440px) has been rendered |
| Accessibility | ⚠️ unverified | no audit performed |
| Performance | ⚠️ unverified | no measurement taken |

**Recommended first action:** run `bunx eslint . --fix` (clears ~28,514
mechanically), fix the 4 TS errors, then introduce a test framework. Until then
every phase below is provisional.

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

Gaps: no persistent agent, no continuous monitoring, no deadline *prediction*
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

## Recommended sequence

1. **Quality gate remediation** — lint autofix, 4 TS errors, test framework.
   Cheap, unblocks honest phase closure.
2. **Close Phase 2** — configure Google OAuth in Supabase, decide on LinkedIn
   and Remember Me, test auth end-to-end. Everything user-facing depends on it.
3. **Deploy** — a real URL unblocks live testing of Phases 4/5, re-enables the
   discovery cron, and gives OAuth a stable redirect target.
4. **Then** close Phase 6/7 gaps (calendar, cover letter, interview prep).
5. **Phase 8/9** last — they assume the platform below them is solid.
