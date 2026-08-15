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

---

## Opportunity X speaks as itself, not as AEON X

**Feature.** Removal of the sibling product's identity from the entire
Opportunity X surface: user-facing copy, the crawler's identity, the entity-id
namespace, and the post-sign-in landing route.

**Purpose.** Opportunity X and AEON X are sibling products, and this repository
is the whole of Opportunity X. The engine was written inside AEON X and carried
its voice across the transfer. A rendered `/opportunities` page read *"AEON X
has not read this opportunity's requirements against what it knows about you"* —
correct reasoning, wrong product, in the sentence a person actually reads.

**How it was found, and why that matters.** Not by grep. An earlier vocabulary
sweep covering routes, the server boundary and components reported clean,
because the strings live in the *engine's* projection layer. It surfaced only
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
   instant the publisher denoted — the *start* of a day-precision deadline —
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

Tavily and Nimble *are* connected. They were deliberately not used: substituting
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
   catch and said *"I could not read what I have observed"*, which asserts a
   record exists and could not be read. The truth was that none is configured.
   Both are Unknown; this product's argument is that it says *which* Unknown,
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

**Amendment A-01, recorded in `CONSTITUTION.md`.** The Scope line read *"AEON X
and Opportunity X, its first product."* — the parent/child framing the founder
overturned twice in writing. Amended to *"Opportunity X."*, with the ratifying
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
already performs, so it is accurate about *reachability* and still cannot prove
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
`list_organizations` returns one organisation, *Aeon X Technnology*, containing
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
*"What AEON X actually told someone"*, i.e. it was applied from the pre-rename
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
`opportunity_deliveries` were reported as *allowed*. Both tables were empty, and
a row-level `BEFORE` trigger never fires when a statement matches no rows — so
the script was measuring nothing and correctly said so rather than passing
vacuously. This is the exact failure the phase brief names: *"Do not report
'UPDATE 0 rows' as equivalent to a denied UPDATE."* Every table is now seeded
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
