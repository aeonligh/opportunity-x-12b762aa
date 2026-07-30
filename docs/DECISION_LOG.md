# Opportunity X — Engineering Decision Log

Append-only journal of significant engineering decisions. Newest first.
One entry per milestone task: feature, purpose, files, dependencies, risks,
testing, future work. See `CLAUDE.md` for when an entry is required.

---

## 2026-07-29 — ARB: deployment target — Vercel

**Decision.** Deploy to **Vercel**. Nitro `defaultPreset` changed
`cloudflare-module` → `vercel` in `vite.config.ts`.

**Purpose.** The app had no deployment target after leaving Lovable's hosting.
A stable public URL is a prerequisite for three blocked items: the Google OAuth
redirect URL (Phase 2), the discovery cron endpoint (Phase 8, deliberately
unscheduled during the migration), and any live testing of Phases 4/5.

**ARB review.**
- *Consistent with vision?* Yes — deployment target is orthogonal to the
  Opportunity Intelligence architecture.
- *Duplicates existing?* No.
- *Scales?* Yes, serverless with automatic scaling.
- *Secure?* Equivalent to the alternative; secrets move to Vercel's encrypted
  env store rather than living in the repo.
- *Lock-in (per CLAUDE.md vendor rule)?* **Low, and deliberately kept low.** The
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
