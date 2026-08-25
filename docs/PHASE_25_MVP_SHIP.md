# Phase 25 — MVP ship

## 1. SHIP STATUS

**SHIPPABLE — HUMAN DEPLOY ACTION REQUIRED**

Production now serves the current product. Three Supabase environment variables
remain, and only you can set them: no tool available here reads or writes Vercel
environment variables. Until they are set, the landing page, `/auth` and the
shell are fully working in production, and `/opportunities` and `/saved` render
the honest "I couldn't read the record" state instead of their data.

**System B is gone from production.** That was the P0 and it is done.

## 2. LIVE URL

| | |
|---|---|
| URL tested | `https://opportunity-x-12b762aa.vercel.app` |
| Deployment ID | `dpl_8o8Q7XJziBxmHG7RASJVxYFnGzZT` |
| Commit SHA | `6af25b17f43f644c29552368084130a5ae8b70b2` |
| Branch | `main` (production branch) |
| Target | `production`, aliased to the apex domain |
| Ready at | 2026-08-25T17:44:32Z |
| Previously | `dpl_9Ufd…` / `8a2090d` / 2026-07-29 — System B, 84 commits behind |

**Verified by fetching production, not by deployment status:**

- `/auth` → 200, and carries *"Sign in to see what has been found for you."* — the
  Phase 21A copy. The old build said "your opportunities feed". `maxLength="254"`
  and `maxLength="1024"` are the Phase 20 hardening. Inputs are uncontrolled: no
  `value=` in the serialised DOM.
- `/opportunities` → **200, exists**. Route tree resolves `/_authenticated` and
  `/_authenticated/opportunities`, preloading `AppShell`, `OpportunityCard`,
  `UnknownState`, `AbsentState`, `InterestedControl`, `FreshnessStamp`,
  `SurfaceError`, `RefreshFailed`. SSR shell renders "Verifying your session",
  which is the `ssr:false` gate behaving correctly.
- Built artifact, client bundle: `/search` 0 · `/dashboard` 0 · `/vault` 0 ·
  `/onboarding` 0 · `crawl-opportunities` 0 · `deadline-reminders` 0 ·
  `Powered by AEON X` 0 · `% Match` 0.

## 3. User journey

| Journey | Fixture | Real deployed environment | Result |
|---|---|---|---|
| Arrive → landing | ✓ 375/768/1280 | ✓ HTML fetched | **pass** |
| Landing → `/auth` | ✓ | ✓ HTML fetched | **pass** |
| Deep link to protected route preserves target | ✓ `/auth?next=%2Fopportunities` at all three widths | not run — no browser reach | **pass (fixture)** |
| Real sign-in | — | **not run** | **blocked** — see below |
| `/opportunities` ⇄ `/saved` | ✓ | not run | **pass (fixture)** |
| Refresh each | ✓ | not run | **pass (fixture)** |
| Sign out → session read → protected route | ✓ five rigs | not run | **pass (fixture)** |
| Last-good forgotten on sign-out | ✓ | not run | **pass (fixture)** |
| Error → honest message → retry | ✓ driven live locally: content survived, "Check again" appeared, no error page | not run | **pass (fixture)** |
| Discovery → observation → card | — | **not run** | **blocked** |

**Why the real sign-in was not run, classified as §D requires:**

- **Code defect** — no. Auth is proven by 13 code assertions and 51 artifact assertions.
- **Missing environment configuration** — **yes.** `SUPABASE_URL` and
  `SUPABASE_PUBLISHABLE_KEY` are absent from the Vercel server environment, so
  authenticated server functions throw before the auth header is read.
- **Missing human test account / provider setup** — **unknown.** One `auth.users`
  row exists; whether Google OAuth is configured in Supabase cannot be checked
  from here.
- **External network restriction** — **yes.** This sandbox's egress proxy returns
  403 to CONNECT for `*.vercel.app` and `*.supabase.co`, so no browser here can
  reach the deployment. Production HTML was fetched through the Vercel MCP tool,
  which executes no JavaScript.

## 4. Real data

| | Count |
|---|--:|
| Observations | **0** |
| Entities | **0** |
| Opportunities projected | **0** |
| Saved declarations | **0** |
| Verification events | 0 |
| Deliveries | 0 |
| Profiles / auth users | 1 / 1 |

Discovery has never run. With server variables set, `/opportunities` resolves
**unknown** — "I have not looked at any source yet" — not absent. `/saved`
resolves **empty**. Both correct; proved by execution in
`test/never-looked.test.ts`.

## 5. Fixes made

1. **Production promoted.** PR #3, 84 commits, `claude/project-analysis-review-9h7hly` → `main`,
   merged as `6af25b1`. Vercel built `dpl_8o8Q7XJ…` to `target: production`.
   This is the only change this phase; **no source file was modified.**

## 6. Remaining blockers

1. **Supabase server variables absent** — `/opportunities` and `/saved` cannot load
   data in production until set. Human action §8.
2. **Discovery cannot run here** — egress 403 to `www.education.gov.ng` and to
   `*.supabase.co`; `SUPABASE_SERVICE_ROLE_KEY` not in this environment. Re-checked
   this phase, not inherited. No sweep was attempted and nothing was fabricated.
3. **Real sign-in unverified** — depends on 1, and on Google provider configuration
   in Supabase that cannot be read from here.

## 7. Deferred, deliberately

- **`ProvenanceChip` not wired in.** Its tiers are
  `"confirmed" | "inferred" | "learned"` — **person-model** tiers. The reachable
  opportunity surfaces render *entity* facts, and their provenance is already
  visible: verified in a browser this phase, the card shows the fixture marker,
  the source count per fact, a freshness stamp, contested readings named in
  words, and a verification verdict. Attaching the chip would label an observed
  source as "Confirmed by you", which is false, and would require inventing a
  tier mapping — the new provenance architecture §F forbids. Scope item 2 was
  conditional; the condition is not met.
- `/profile`, `ProfileStore`, the unreachable recommendation architecture — per scope item 3.
- The 45 deferred authority citations — per scope item 4.
- The unapplied `mark_legacy_tables_retired.sql` migration — metadata-only, not a ship blocker.

## 8. Human actions

**One block, click by click.**

### Set the Supabase variables

1. Open `https://vercel.com/aeonlighs-projects/opportunity-x-12b762aa/settings/environment-variables`
2. **Add New** three times. For each, tick **both Production and Preview**:

   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | `https://anfiojmbgonrtympzjch.supabase.co` |
   | `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable__YRm70UPY1mHDzKvtZpTUw_tN5ABUfN` |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → **service_role**. Copy it straight into Vercel. Do not paste it into chat, a commit, or an issue. |

3. **Deployments** tab → the top deployment → **⋯** → **Redeploy** → untick
   "Use existing Build Cache" → **Redeploy**. Vercel bakes variables at build
   time, so the running deployment will not pick them up without this.

### Then confirm

4. Open `https://opportunity-x-12b762aa.vercel.app/opportunities` while signed in.
   Expect the heading **Opportunities** and one quiet line: *"I have not looked at
   any source yet, so I have nothing to show you."*
   - If you still see **"SOMETHING HERE DIDN'T LOAD"**, a variable is missing or
     misspelled, or step 3 was skipped.
   - If you see *"I have no record of anything I have observed"*, `SUPABASE_URL`
     and `SUPABASE_PUBLISHABLE_KEY` are set but `SUPABASE_SERVICE_ROLE_KEY` is not.

Tell me which of those three you see and I can act on it directly.

### Environment matrix — derived from `process.env` and `import.meta.env`, not `.env.example`

| Variable | Browser | Server | Required for |
|---|:--:|:--:|---|
| `VITE_SUPABASE_URL` | ✓ | — | browser Supabase client |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✓ | — | browser Supabase client |
| `SUPABASE_URL` | — | ✓ | auth middleware, server client, observation store, pursuit provider, sweep |
| `SUPABASE_PUBLISHABLE_KEY` | — | ✓ | auth middleware, server client, pursuit provider |
| `SUPABASE_SERVICE_ROLE_KEY` | — | ✓ | `opportunityRecord()`, admin client, sweep. **Secret.** |
| `ANTHROPIC_API_KEY` | — | ✓ | `ai.server.ts`. Not needed for the MVP surfaces. |
| `FIRECRAWL_API_KEY` | — | ✓ | discovery transport. Not needed until discovery runs. |

Presence in Vercel is **UNVERIFIABLE** from here — no tool reads it.

## 9. Gates — re-run this phase

TypeScript 0 errors · ESLint 0 errors, 8 warnings · **376 tests pass** · build
clean · 51 artifact assertions · 44 migration assertions.

Browser acceptance, local, 375/768/1280: 13 checks, all pass. Zero console
errors, zero hydration warnings, zero horizontal overflow. One `nav`, one
`aria-current`. Keyboard focus never fell to `<body>` or an invisible element.
Product-surface sweep: no dead controls, no simulated activity, no System B
residue on any reachable surface.
