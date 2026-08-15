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
