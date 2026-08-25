# Phase 21B — Deployment Truth

Verified 2026-08-21. Every claim below names the environment it is about.

The finding that organises this report: **Opportunity X has been built for
twenty-one phases and deployed for none of them.** The production domain has
been serving commit `8a2090d` since 2026-07-29 — 79 commits behind — and that
build is System B in its entirety. Every removal reported as done in Phases 13
through 21 was in fact done. None of it was ever promoted.

---

## A. Environment matrix

| | Repository | Preview | Production |
|---|---|---|---|
| **Commit** | `d4c97d1` | `d4c97d1` | `8a2090d` |
| **Deployment** | — | `dpl_6xTaRHTc9JMW3eKSWWKZtCgAHdZv` | `dpl_9Ufdj7PX2XF5Uvw8D2hPBTfZ9yhX` |
| **Vercel target** | — | `null` (preview) | `production` |
| **Built** | local | 2026-08-21T21:26:55Z | **2026-07-29T09:01:54Z** |
| **Branch** | `claude/project-analysis-review-9h7hly` | same | `main` |
| **URL** | `localhost:5173` | `opportunity-x-12b762aa-git-claude-pro-29e7d4-aeonlighs-projects.vercel.app` | `opportunity-x-12b762aa.vercel.app` |
| **Auth config** | `.env` has the two public vars; **no** service-role key | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` **MISSING** | same two **MISSING**, plus Lovable-era code still calling for `SUPABASE_SERVICE_ROLE_KEY` |
| **DB schema** | expects `requested_url` | expects `requested_url` | expects the legacy schema |
| **DB pointed at** | `anfiojmbgonrtympzjch` | `anfiojmbgonrtympzjch` | `anfiojmbgonrtympzjch` |
| **Actual state** | builds, 359 tests pass | server functions throw on config | System B, throwing Lovable-era errors |

Both deployed environments point at the same live database. Only one schema
matches it.

`8a2090d` is `origin/main` HEAD and is present in local git — the identification
is exact, not inferred: `git cat-file` resolves it, and `git rev-list --count
origin/main..HEAD` = **79**.

---

## B. Vercel configuration finding

**Required by `src/integrations/supabase/auth-middleware.ts`, read from
`process.env` and checked *before* the auth header:**

| Variable | Preview | Production | Evidence |
|---|---|---|---|
| `SUPABASE_URL` | MISSING | MISSING | runtime error, below |
| `SUPABASE_PUBLISHABLE_KEY` | MISSING | MISSING | runtime error, below |
| `SUPABASE_SERVICE_ROLE_KEY` | UNVERIFIABLE | UNVERIFIABLE | no tool reads it; required by `opportunityRecord()` |

**I cannot read or write Vercel environment variables.** The Vercel MCP surface
exposes projects, deployments, runtime logs, runtime errors, deployment
protection, purchases, deploy and fetch. There is no environment-variable tool,
no `vercel` CLI in this environment, and no Vercel token. Searched explicitly;
this is a capability boundary, not an oversight. **Status: BLOCKED.**

No code was changed to compensate. Making the server read `VITE_`-prefixed
variables would erase the public/server boundary that `CLAUDE.md` requires.

---

## C. Deployment identity

`opportunity-x-12b762aa.vercel.app` → `dpl_9Ufd…` → `8a2090d` → branch `main`,
commit *"Merge pull request #2 from aeonligh/claude/project-analysis-review-9h7hly"*,
2026-07-29.

Confirmed two ways. The deployment record lists the apex domain in its `alias`
array with `target: "production"`. And the apex fetch I performed at
2026-08-21T21:13:37Z appears in the error aggregation table one second later,
attributed to `dpl_9Ufd…` — the request I made is in the record.

**No production deployment newer than 2026-07-29 exists.** All 20 recent
deployments carry `target: null`; the project reports `live: false`.

---

## D. Authenticated server-function result

**Before — and still current**, from the deployment's own error table:

```
[Supabase] Missing Supabase environment variable(s): SUPABASE_URL,
SUPABASE_PUBLISHABLE_KEY. Set them in your environment.
count=23  users=1  routes=/__server
first=2026-08-19T08:34:53Z  last=2026-08-19T08:37:25Z
lastDeployment=dpl_3ASZV8UmG8MkBx3kjVGD3jzNu4uf   (975ff47, Phase 20)
```

Production additionally throws a Lovable-era error that does not exist in
current code at all:

```
[Deadline Intelligence] Error during deadline scan: Missing Supabase
environment variable(s): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
Connect Supabase in Lovable Cloud.
  at createSupabaseAdminClient (_ssr/client.server-D5ro3rAQ.mjs:20:11)
  at runDeadlineIntelligenceCheck (_ssr/deadline-intelligence.server-f3Wid85c.mjs:114:65)
lastDeployment=dpl_9Ufd…   last=2026-08-21T21:13:37Z
```

`deadline-intelligence.server` was deleted in Phase 13. It is running in
production right now. The two error texts are a reliable fingerprint of which
build answered.

**After: no change.** The variables are not set, so the error stands. This is
**BLOCKED**, not fixed, and I will not claim otherwise.

---

## E. Database truth — `anfiojmbgonrtympzjch`

| | |
|---|---|
| `opportunity_observations` | **0** rows, **21** columns |
| `lastRetrievalAt()` watermark | **NULL** |
| `opportunity_verification_events` | 0 |
| `opportunity_pursuits` (declarations) | 0 |
| `opportunity_deliveries` | 0 |
| `profiles` / `auth.users` | 1 / 1 — a real account exists |

Migrations applied: the four canonical, plus `20260821211057
observation_requested_url` (Phase 21A). Unapplied and deliberately untouched:
`20260817190000_mark_legacy_tables_retired.sql`.

---

## F. `/opportunities` actual state

Traced through the code and proved by execution, not read off row counts.

```
listOpportunities (authed)
  → resolveCards(personId, supabase)
      → opportunityRecord()                    needs SUPABASE_URL + SERVICE_ROLE_KEY
      → deriveCorpus(store, log)
          → store.lastRetrievalAt()            .maybeSingle() → null on zero rows
      → if (corpus.searchedAt === null) → unknown
      → if (cards.length === 0)         → absent
```

Which yields three distinct outcomes depending on configuration:

| Configuration | Middleware | resolveCards | Rendered |
|---|---|---|---|
| Neither var set | **throws** | never runs | `SurfaceError` — "SOMETHING HERE DIDN'T LOAD" ← **current** |
| URL + publishable set, service-role missing | passes | `record === null` | `UnknownState` — "I have no record of anything I have observed…" |
| All three set | passes | `searchedAt === null` | `UnknownState` — "I have not looked at any source yet…" |

**All three are epistemically correct. None claims there are no opportunities.**

**This is the answer to the question the phase brief raised, and it is a clean
result: the code does not map zero observations to an absence claim.** The guard
at `surface/service.ts:226` returns `unknown` before the `absent` branch can be
reached, and `lastRetrievalAt()` *throws* on a failed read rather than returning
null — so a database outage cannot be laundered into "I have not looked yet".
Both properties are now executed in `test/never-looked.test.ts`, and both
mutations that would break them were confirmed caught.

No defect found here. No change made.

---

## G. `/saved` actual state

```
listSaved → resolveDeclarations
  → pursuitLogFor(client) === null  → unknown ("nowhere durable is configured")
  → log.readAll() throws            → unknown ("I could not read what you have told me")
  → declarations.length === 0       → empty
```

With 0 declarations and a working read, `/saved` resolves **`empty`** →
"Opportunities you save will appear here." Correct: unlike observations, a zero
declaration count is a complete fact about the person's own record. Currently
unreachable for the same configuration reason as above.

---

## H. Discovery

**BLOCKED.** Three of five prerequisites fail, each checked independently rather
than assumed:

| # | Prerequisite | Status | Evidence |
|---|---|---|---|
| 1 | outbound to `www.education.gov.ng` | **BLOCKED** | `403 to CONNECT`, logged by the egress proxy |
| 2 | outbound to `anfiojmbgonrtympzjch.supabase.co` | **BLOCKED** | `403 to CONNECT` (the MCP connector reaches SQL; the sweep uses supabase-js over HTTPS, which does not) |
| 3 | `SUPABASE_SERVICE_ROLE_KEY` in this environment | **MISSING** | absent from the shell and from `.env`, which holds only public values |
| 4 | correct project | **OK** | `anfiojmbgonrtympzjch`, `ACTIVE_HEALTHY` |
| 5 | announcer `ng-fme` | **OK** | `announcers/registry.ts:121` |

`bun run sweep -- ng-fme` was **not run**. Nothing was inserted, and no
observation, entity or declaration was fabricated. The proxy README states that
policy denials must be reported rather than retried.

---

## I. Real user journey

**Not performed. BLOCKED.** It requires a real authenticated session against the
deployment, and this sandbox cannot reach either the deployment or Supabase.
Every step — deep link return, opening an opportunity, declaring interest,
read-back, withdrawal, cross-user last-good isolation — is **unverified live**.
The deep-link mechanism alone was observed in Phase 21A (`/auth?next=%2Fopportunities%2Fexamples`).

---

## J. Sign-out lifecycle

**VERIFIED BY FIXTURE.** All five rigs driven in a real browser, each on a fresh
page load:

| Rig | Result |
|---|---|
| confirmed | → `/auth` |
| ambiguous (request errored, session gone) | → `/auth` — the read decides |
| failed | stays, "I couldn't end your session. You are still signed in." |
| unverifiable | stays, "…couldn't reach the service to check whether it did." |
| still-there | stays, "…but you are still signed in." |

**VERIFIED LIVE: no.** No real Supabase session has ever been ended by this
application under observation. Cross-tab and second-user isolation are
untested.

---

## K. Visible product audit

Built artifact of `d4c97d1`, client and server bundles. Every retired
fabrication: **absent**. Two apparent hits were run down and are false
positives — `94%` is `hsl(359, 100%, 94%)` in a stylesheet, `/dashboard` is
supabase-js JSDoc pointing at supabase.com.

Browser: 40 page loads, light and dark, 375 / 390 / 768 / 1280, across `/`,
`/auth`, `/lab/states`, `/lab`, `/lab/saved`. Zero console errors, zero
hydration warnings, zero horizontal overflow at every combination. Keyboard
focus never fell to `<body>` and never landed on an invisible element across a
10-stop tab chain. One `nav[aria-label="Opportunity X"]` with one
`aria-current="page"` — no duplicated navigation. Refresh failure driven live:
content survived (`reading #3 → #3`), the "Check again" control appeared, and
the failure did not become an error page.

---

## L. Retired product audit — can a user still reach System B?

**On production: yes, all of it.** `git ls-tree` of `8a2090d`:

```
_authenticated/_admin/{analytics,featured,queue,route}.tsx
_authenticated/dashboard.{applications,documents}.tsx
_authenticated/{dashboard,onboarding,vault}.tsx
api/public/hooks/{crawl-opportunities,deadline-reminders}.ts
opportunity.$id.tsx   search.tsx
```

and every fabrication: `94%`, `% Match`, `Live Search`, `/search`, `Powered by
AEON X`, `Apply now`, `Share on WhatsApp`, `Ranking`, `Matching`, `$2.4B`,
`Duplicates removed`, `below 0.6`, `Document Vault`.

**`/opportunities` and `/saved` do not exist in the production build at all** —
which independently confirms the screenshots came from Preview, since the
production build cannot render those pages.

**On preview: none of it.** 17 routes, all current.

`scripts/verify-artifact.sh` gained a section for this, since the old checks
asked only "did a secret leak". 15 new assertions, each mutation-tested by
injecting the exact retired string into the built bundle: **15/15 caught**.
Total 51 artifact assertions.

---

## M. Security regression check

`test/auth-security.test.ts` 13/13 pass. PKCE active; no service-role
credential, Anthropic key, Firecrawl key, Resend key or cron secret in the
client bundle; no `service_role` JWT claim; no password in a query string;
credential inputs uncontrolled so nothing is typed into the markup; wrong
password and missing account indistinguishable; no auth failure exposes a URL,
stack, status or provider string. No custom hashing, JWT, CAPTCHA or lockout
was introduced.

One thing worth naming: production exposes `api/public/hooks/crawl-opportunities`
and `api/public/hooks/deadline-reminders`. Those are public endpoints from the
retired system, live right now. Promoting the current build removes them.

---

## N. Tests and mutation evidence

359 pass / 0 fail (6 new). tsc 0 errors. ESLint 0 errors, 8 warnings —
unchanged. Build clean. 51 artifact assertions, 44 migration assertions.

Mutations, all confirmed caught and reverted:

| Assertion | Mutation | Caught |
|---|---|---|
| empty corpus reports no watermark | default `searchedAt` to now | ✓ |
| no-record reports unknown | return `absent` instead | ✓ |
| never-looked guard precedes absent | delete the guard | ✓ |
| failed watermark read is not "not looked" | swallow the throw to null | ✓ |
| 15 retired-product artifact checks | inject each string into the bundle | 15/15 |

Three of my own expectations were wrong during this phase and were corrected
against the code rather than the code against them: `aria-current` lives in
`AppShell` (`/lab/session`), not `LabFrame` (`/lab`); the retry label on
`RefreshFailed` is "Check again", not "Try again"; and the `ambiguous` sign-out
rig is *specified* to navigate.

---

## O. What remains blocked

1. **Vercel environment variables** — no read/write capability exists here.
2. **Promoting a production deployment** — same boundary.
3. **Real discovery** — egress policy denial to the announcer and to Supabase.
4. **Live authenticated journey and live sign-out** — depends on 1 and 3.
5. **`SUPABASE_SERVICE_ROLE_KEY` presence in either Vercel scope** — unverifiable.

---

## P. What you must do, exactly

**1. Set three variables** — Vercel → project `opportunity-x-12b762aa` →
Settings → Environment Variables. Tick **Production *and* Preview** on each;
Preview is the scope your screenshots came from, so Production alone will not
clear the error you have been seeing.

```
SUPABASE_URL              = https://anfiojmbgonrtympzjch.supabase.co
SUPABASE_PUBLISHABLE_KEY  = sb_publishable__YRm70UPY1mHDzKvtZpTUw_tN5ABUfN
SUPABASE_SERVICE_ROLE_KEY = <Supabase → Project Settings → API → service_role>
```

The first two are public. The third is a secret — do not paste it into this
conversation, a commit, or an issue.

**2. Get the current build into production.** Either merge
`claude/project-analysis-review-9h7hly` into `main` (79 commits), or change
Settings → Git → Production Branch to `claude/project-analysis-review-9h7hly`.
The second is reversible and faster; the first is the real fix. Until one
happens, `opportunity-x-12b762aa.vercel.app` keeps serving System B.

**3. Redeploy after step 1** — Vercel bakes environment variables at build time,
so an existing deployment will not pick them up.

**4. Then tell me**, and I will read the runtime error table to confirm the
config error is gone and report which of the three states in §F the product
actually reaches.

Optional, unrelated to the above: `mark_legacy_tables_retired.sql` is still
unapplied. It is metadata-only and every legacy table in this project holds zero
rows, so it is safe whenever you want it.

---

## Q. Final truth table

| Capability | Implemented | Preview deployed | Production deployed | Fixture verified | Live verified | Blocked by |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Landing page without fabrications | ✓ | ✓ | ✗ | ✓ | ✗ | production is 79 commits behind |
| `/opportunities` surface | ✓ | ✓ | ✗ (route absent) | ✓ | ✗ | env vars |
| `/saved` surface | ✓ | ✓ | ✗ (route absent) | ✓ | ✗ | env vars |
| Authenticated shell | ✓ | ✓ | ✗ | ✓ | ✗ | env vars |
| Sign-out lifecycle | ✓ | ✓ | ✗ | ✓ | ✗ | no live session reachable |
| Auth (PKCE, validation) | ✓ | ✓ | ✗ | ✓ | ✗ | env vars |
| Four-state absence model | ✓ | ✓ | ✗ | ✓ | ✗ | env vars |
| `requested_url` schema | ✓ | n/a | n/a | ✓ | **✓ (applied to the live DB)** | — |
| Observation record | ✓ | ✓ | ✗ | ✓ | ✗ | env vars |
| Real discovery | ✓ | ✓ | ✗ | ✓ | ✗ | egress 403 + no service-role key |
| Declaration read-back | ✓ | ✓ | ✗ | ✓ | ✗ | no live session |
| Retired product removed | ✓ | ✓ | ✗ | ✓ | ✗ | production still serves System B |

One row is live-verified. That is the honest count.
