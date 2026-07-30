# Engineering Gate Report — Phase 3 & Phase 4

**Date:** 2026-07-30
**Branch:** `claude/project-analysis-review-9h7hly` @ `76ce752`
**Base:** `origin/main` @ `8a2090d`
**Verdict:** ❌ **NEITHER PHASE MAY BE CLOSED**

Phase 3 and Phase 4 are both blocked on the same root cause, and it is not a
code defect. Every measurement below was produced by a command actually run in
this session; commands that could not run are marked as such rather than
estimated.

---

## 1. Executive finding

The code for Phases 3 and 4 builds clean and type-checks clean. It cannot be
*verified*, because the environment this session runs in has no network route to
Supabase, to the production origin, or to Firecrawl. Phase 4's exit criterion is
"discovery executed against the live web" — that is unreachable from here by
construction, not by omission.

Separately, and more urgently: **`main` still ships the Lovable auth proxy.**
The fix exists and is already on GitHub, but it was never merged.

---

## 2. Quality gates — measured

| Gate | Command | Result |
|---|---|---|
| TypeScript | `bunx tsc --noEmit -p .` | ✅ **0 errors** |
| ESLint | `bun run lint` | ❌ **26 problems** (17 errors, 9 warnings) |
| Build | `bun run build` | ✅ **PASS** — built in 29.50s, emits `.vercel/output` |
| Dev server | `bun run dev` | ⏸️ not run this session |
| Runtime/console errors | manual, browser | ⏸️ **cannot verify** — no route to prod |
| Light + dark mode | manual | ⚠️ screenshots from a prior session only |
| Responsive (3 breakpoints) | manual | ⏸️ not verified this session |
| Accessibility | manual | ⏸️ not verified |
| Tests | — | ❌ **no test script, no test files — zero coverage** |
| Performance | — | ⚠️ `three.js` chunk is 1,675 kB; `react-dom` 1,027 kB |

### ESLint detail

All 17 errors are the same rule, `@typescript-eslint/no-explicit-any`, in three
files:

- `src/lib/deadline-intelligence.server.ts` — 1
- `src/routes/_authenticated/dashboard.applications.tsx` — 7
- `src/routes/_authenticated/dashboard.documents.tsx` — 7
- (remaining 2 errors + 9 warnings distributed across the same set)

Trend: **28,540 → 26**. The bulk of the original count came from vendored skill
scripts under `.agents/` and `agent/`, now excluded. The 17 remaining errors are
real and live in files this branch modified, so they are owned, not inherited.

---

## 3. Repository Health Gate

1. **Does the project build?** Yes — `bun run build` exits 0.
2. **TypeScript errors?** Zero.
3. **ESLint errors, and how many introduced?** 17 errors remain. Net change
   across the branch is a decrease of ~28,514. No net increase was introduced.
4. **Technical debt: up or down?** Down sharply — the Lovable AI gateway, proxied
   auth, and vendored-lint noise were all removed. One debt item was *added*: the
   `_admin` → `admin` route rename is unverified at runtime.
5. **Tests covering modified functionality?** **No. None exist anywhere in the
   repo.** This is the single largest gap in the report.
6. **Still architecturally aligned?** Yes. Direct `callClaude`, no intermediary
   gateway, native Supabase auth, Vercel build target. No vendor lock-in
   reintroduced.

---

## 4. Phase 3 — User Profile

**Status: ❌ cannot close.**

Built and type-clean: multi-step onboarding (`src/routes/_authenticated/onboarding.tsx`),
`profiles` carrying country, university, course, degree type, level, graduation
year, career interests, skill tags, preferred categories, bio, notification
preference.

Blocking:
- **AI profile-completeness scoring does not exist** — a named roadmap
  deliverable with zero implementation.
- Onboarding was never exercised against a live database from this session.
- Phase 3 sits downstream of Phase 2, which is itself blocked (below).

---

## 5. Phase 4 — Discovery Engine

**Status: ❌ cannot close.**

Built and type-clean: `src/lib/intelligence.functions.ts` implements
discovery → verification → dedup → scoring → persistence → recommendation, with
Firecrawl scraping plus HTTP-HEAD fallback, `url_hash` dedup against a DB unique
index, confidence scoring, priority TLD weighting, a `discovery_runs` audit
table, and a cron entry point.

Blocking:
- **Never executed once.** Requires `ANTHROPIC_API_KEY`, `FIRECRAWL_API_KEY`, and
  outbound network. `api.firecrawl.dev` is unreachable from this sandbox.
- Roadmap names Gemini; implementation uses Claude. Deliberate and correct per
  ARB, but the roadmap text is now stale and should be amended.
- Verification correctness is unproven — the entire trust guarantee of the
  product ("never surface unverified opportunities as fact") rests on a code path
  that has never processed a real URL.

---

## 6. The blocker upstream of both phases

`origin/main` @ `8a2090d` still contains
`src/integrations/supabase/lovable/index.ts` importing
`createLovableAuth` from `@lovable.dev/cloud-auth-js`. Verified by reading the
file from `refs/heads/main` this session.

PR #2 merged only 2 commits (`0508eae`, `f0ee62a` — the AI-gateway swap). **Nine
commits remain unmerged**, including the ones that matter:

- `11cbbd7` Repoint Supabase project config to user-owned project
- `02a9c10` Remove hardcoded Lovable URL + stale key from crawl cron migration
- `89bd37a` Replace Lovable cloud-auth with native Supabase OAuth
- `275b01b` Remove all remaining Lovable traces from the codebase

**Six of those nine are already on GitHub** at branch tip `48d501f`. `main`
contributes no file content beyond `f0ee62a`, so the branch is a strict superset
and the merge is conflict-free by construction.

**Consequence:** production can be fixed by merging what is already on GitHub.
That does not require the 3 commits still stranded locally.

---

## 7. Not done, and why

| Item | Status | Reason |
|---|---|---|
| Supabase Site URL | ❌ not done | `api.supabase.com` → HTTP 403 at egress proxy |
| Auth redirect URLs | ❌ not done | same |
| `api_keys` table + RLS | ⛔ **stopped deliberately** | see below |
| Email confirmation E2E | ❌ not done | no route to project or prod origin |
| Password reset E2E | ⛔ **not applicable** | **feature does not exist** — see below |
| API Keys functionality | ⛔ not applicable | feature does not exist |
| Remove placeholders | ✅ nothing to remove | only match is a real landing-page feature |

Blocked hosts, measured: `api.supabase.com` 403; `anfiojmbgonrtympzjch.supabase.co`,
`aeon-x-technologies-9kzz.vercel.app`, `api.firecrawl.dev` all unreachable. No
IPv6 in sandbox, so the IPv6-only direct Postgres host is unreachable too — and a
personal access token is not a database password regardless. `git push` → 403.
Only `api.anthropic.com` and the GitHub MCP read path are reachable.

### Why password reset could not be verified

**It is not implemented.** Measured: zero matches across `src/` for
`resetPasswordForEmail`, `updateUser`, `forgot`, `reset password`, or `recovery`.

`src/routes/auth.tsx` implements sign-up (`emailRedirectTo`) and OAuth
(`redirectTo`) only. There is no forgot-password entry point, no recovery
handler, and no password-update form. This is a **missing Phase 2 deliverable**,
not a configuration gap — no amount of dashboard setup will make it testable.

### Why `api_keys` was not created

There is **no API Keys feature in this codebase.** Measured: zero matches for
`api_keys` in `supabase/migrations/` or `src/`, and zero matches for `api.?key`
across `src/routes/` and `src/components/`.

Creating the table would mean shipping a schema change with no consumer — an ARB
violation on two counts (adds surface area without strengthening the platform;
a schema change is an explicit stop condition). Per CLAUDE.md this thread stops
and asks rather than guessing at a shape.

### Placeholders

The only `PLACEHOLDER` in `src/` is `src/routes/index.tsx:48` — the rotating
search-hint array driving the landing page's animated input. That is a shipped
feature, not dev scaffolding. `VITE_FOO` and `env.X` appear only inside
explanatory comments in `src/lib/config.server.ts`. **Nothing to remove.**

---

## 8. Environment variables — corrected against the code

Three names in the requested list do not match what the code reads.

| Requested | Correct | Note |
|---|---|---|
| `VITE_SUPABASE_ANON_KEY` | `VITE_SUPABASE_PUBLISHABLE_KEY` | code reads publishable; project uses new-style `sb_publishable_…`, not a legacy JWT |
| `GOOGLE_API_KEY` | — | **not read anywhere.** Google OAuth is configured in the Supabase dashboard, not via an app env var |
| *(absent)* | `RESEND_API_KEY` | **required** for deadline reminder emails, missing from the list |

Complete set the code actually consumes: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
`ANTHROPIC_API_KEY`, `FIRECRAWL_API_KEY`, `RESEND_API_KEY`, `SITE_URL`,
`VITE_SITE_URL`, `DATABASE_URL`, `STRIPE_SECRET_KEY`.

---

## 9. Recommended order

1. **Rotate the Supabase personal access token.** It was pasted in plaintext into
   a chat transcript and into this sandbox's shell history. Treat as compromised:
   Supabase Dashboard → Account → Access Tokens → revoke and reissue.
2. **Merge the branch** — `48d501f` into `main`. This is what unblocks production
   auth. Conflict-free.
3. Retrieve the 3 stranded commits from the git bundle (governance docs + the
   ESLint remediation). Not required for step 2.
4. Configure Supabase Site URL and redirect URLs. The code redirects to
   `window.location.origin` (sign-up confirmation) and `${origin}/auth` (OAuth),
   so the allowlist needs exactly:
   `https://aeon-x-technologies-9kzz.vercel.app`,
   `https://aeon-x-technologies-9kzz.vercel.app/auth`,
   `http://localhost:5173`, `http://localhost:5173/auth`.
5. Configure the Google OAuth provider — redirect URI is the **Supabase callback**,
   `https://anfiojmbgonrtympzjch.supabase.co/auth/v1/callback`, not the app URL.
6. Then, and only then, run the Phase 2 → 3 → 4 end-to-end verifications.
7. Decide the `api_keys` question before any schema work.

---

## 10. Gate decision

**Phase 3: not closed. Phase 4: not closed.**

Both are code-complete-ish and both are verification-incomplete. Closing either
would require reporting an unmeasured gate as passing, which CLAUDE.md forbids
and which would be worse than the honest red state recorded here.

**Phase 5 is not started, per explicit instruction, and will not begin until this
report is approved.**
