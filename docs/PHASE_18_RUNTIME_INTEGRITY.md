# Phase 18 — Integration & Runtime Integrity Ratification

**Governing question:** *After all the consolidation and state work, does
Opportunity X remain truthful, coherent, stable and recoverable at runtime?*

Status vocabulary is fixed to five values: **VERIFIED**, **IMPLEMENTED**,
**UNVERIFIED**, **BLOCKED**, **NOT APPLICABLE**. Nothing is marked verified on
inspection alone — every such claim names a command that was run.

Totals: **323 tests**, **133 browser checks**, **44 migration assertions**,
**22 build-artifact assertions**, **24 mutations, all caught**.

---

## A. Hydration — **VERIFIED**

The Phase 17 defect, traced rather than suppressed.

### The sequence, measured

```
server   renders /opportunities. That route is ssr:false, so it emits the
         gate's pending shell (BrandLoader) inside a Suspense boundary —
         it cannot see a session that lives in localStorage.
client   DOMContentLoaded at 85ms. beforeLoad resolves at 449ms and throws
         a redirect; the *router* swaps the entire match set to /auth.
React    still hydrating. Finds <AuthPage>'s div where the server wrote
         <Suspense>, and regenerates the tree.
```

React's own diff, captured from the console:

```
+ <div className="min-h-screen flex items-center justify-center …">
- <Suspense>
```

**Why the unverifiable branch never did this** — and the finding that decided
the fix. It is structural, not timing. For an `ssr: false` match the framework
wraps the match in `<ClientOnly fallback={pendingComponent}>`, whose first
client render is *always* the fallback. So the hydration render equals the
server's, and anything the match decides afterwards is an ordinary
post-hydration update. `SessionUnverifiable` is caught by the route's own error
boundary and stays inside that guarantee. A router-level redirect leaves it
entirely: there is no longer a match to be client-only about.

Confirmed by measurement — the unverifiable branch produces **zero** hydration
errors, one document request, and stays on `/opportunities`.

### The fix, and the one rejected

The server rendered a page it had no basis for. The repair is to ask it for the
page it should have rendered, rather than patch one it rendered on a guess:
`reloadDocument: !isHydrated()` on the gate's redirect. Before hydration it is a
document navigation; after, the identical redirect is an ordinary client
navigation — measured clean.

**An alternative was built, measured and discarded.** Keeping the decision inside
the match (a `SessionAbsent` marker caught by the route's boundary) removed the
mismatch completely and cost no round trip — but React reports every error an
error boundary catches, so an ordinary signed-out visit logged a console error.
Trading a hydration warning for an error on the most common unauthenticated path
is not a fix. Recorded here because the reasoning is the useful part.

### Cost

| | before | after |
|---|---|---|
| signed-out deep link → usable sign-in form (median of 5) | 873ms | 880ms |
| document requests | 1 | 2 |
| hydration mismatch | every time | none |

**+7ms.** The extra round trip replaces React's own full tree regeneration,
which cost about the same — and `/auth` is now genuinely server-rendered.

### Verified

No hydration mismatch, no page errors, no console errors, correct redirect,
deep link preserved, query string preserved, client-side navigation still an
in-app navigation, Back does not bounce — on `/opportunities`, `/saved`,
`/opportunities/examples` and `/opportunities/$id`, all in `bun run
verify:states`.

### The pattern elsewhere — **VERIFIED**

One route opts out of SSR (`_authenticated`), one `throw redirect` exists in the
codebase (the gate's), and the three navigations in `/auth` are all inside
effects or handlers — post-hydration by construction. Pinned by a test, so a
second `ssr: false` route cannot reopen the class unnoticed.

### Mutation-tested

| Mutation | Detected by |
|---|---|
| `reloadDocument: false` (redirect lands mid-hydration) | 17 browser checks |
| root never calls `markHydrated` (every redirect reloads) | "a client-side click does not reload the document" |
| `next` dropped from the redirect | 6 deep-link checks |

---

## B. Runtime state boundaries — **VERIFIED**

### The map

Sixteen server functions, no `useQuery`/`useMutation` anywhere (react-query is
used only for cache invalidation on identity change), nine route loaders.

| Boundary | Count | Protection | States it can produce |
|---|---|---|---|
| product reads (`listOpportunities`, `getOpportunity`, `listSaved`, `fixtureOpportunities`) | 4 | `requireSupabaseAuth` | SUCCESS · PENDING · EMPTY · ABSENT · UNKNOWN · ERROR · PARTIAL · REFRESHING · REFRESH FAILED |
| pursuit writes (`declarePursuit`, `withdrawPursuit`) | 2 | `requireSupabaseAuth` | MUTATION CONFIRMED · MUTATION FAILED · MUTATION UNREADABLE · refused |
| laboratory probes | 10 | `assertDevelopment()` | all of the above, on demand |
| auth check | 1 | n/a | signed-in · signed-out · UNAVAILABLE (bounded at 8s) |
| discovery / entity / verification | server-only | service-role | retrieved · unreachable · unreadable · contested |

### Defects found

**1. An unprotected server function.** `getGreeting` — template scaffold, `POST`,
no middleware, no guard, echoing its input plus `config.nodeEnv`. Traced: zero
importers, tree-shaken out of the build, so never a live endpoint — a live
*possibility*, one import away, with nothing to say so. **Removed.**

**2. Three `failure → empty` collapses in the AI entry point.** In
`ai.server.ts`, a safety refusal, an unparseable response, and a response with
no text block all returned `{}` — indistinguishable from "the model answered,
and found nothing". The exact collapse this product refuses everywhere else,
sitting in the one module the whole AI layer is meant to go through.

It has never fired, because **nothing calls `callClaude`** — the shipped artifact
contains no Anthropic call at all. That is the reason to fix it now rather than
later: the first caller would inherit the collapse silently, and
`Object.keys(result).length === 0` would become the product's way of asking "did
the model find anything?". Replaced with an explicit
`answered | refused | unreadable` result. A failure to *ask* still throws — that
is not an answer of any kind.

### Verified clean

Every `(data ?? [])` on a Supabase read is preceded by `if (error) throw` in the
same function — PostgREST returns `{ data: null, error }` on failure, and a bare
`?? []` downstream would report "the record is empty" for "the record could not
be read". Pinned by a test that walks every module touching the database.

The `return null` sites in `crawl.ts`, `registry.ts` and `page-metadata.ts` are
URL-parse failures — "this string is not a URL" is a finding, not a swallowed
error.

### Mutation-tested

`unprotected-server-fn-reappears` · `refusal-becomes-empty-answer` ·
`unparseable-becomes-empty-answer` · `supabase-read-swallows-error` — all caught.

---

## C. State composition — **VERIFIED**

Phase 17 verified each state alone. These are the pairs, because a pair is where
a collapse hides.

| Combination | Result |
|---|---|
| failed write **+** previously declared | failure named **and** previous position restated; never "never said anything" |
| write landed **+** read-back failed | both reported; neither neighbour's lie told |
| slow write **+** in flight | says "saving", never "saved" |
| preserved content **+** further refresh failure | age tracks the last *successful* read, unchanged by the failure |
| refresh caveat **+** reduced motion / dark / light | stated in words at 375px in all three |
| loading **+** reduced motion **+** screen reader | announced in text — see below |
| absence **+** refresh | stays an absence, keeps its `searchedAt` |
| unverifiable session **+** deep link | URL preserved, no redirect, no loop |

**The age invariant is the sharp one.** It is checked by *moving* the age with a
read that succeeds and then failing again — watching it sit still across a single
failure proves nothing, because "now" and "the last read" are seconds apart.

**Loading is verified against the component, not the browser** — deliberately. The
laboratory routes have no pending component to observe; the skeletons belong to
the authenticated surfaces. A browser check written against a page that cannot
show the state is one that passes by finding nothing. The first version of that
check was exactly that (`say(true, …)` reporting "0 pending elements") and was
removed.

---

## D. Authentication — **VERIFIED**, with one gap

| Contract | Status |
|---|---|
| signed out ≠ auth service unavailable | **VERIFIED** — separate outcomes, separate wording, measured in a browser |
| invalid credentials ≠ network failure | **VERIFIED** — 5 outcomes, distinct `what`, distinct `retryable` |
| auth service unavailable ≠ redirect loop | **VERIFIED** — URL unchanged, one document request, resolves in 8.7s |
| valid deep links survive | **VERIFIED** — path and query both carried |
| malicious destinations rejected | **VERIFIED** — 24 hostile inputs |
| query strings survive | **VERIFIED** |
| authenticated users do not bounce | **VERIFIED** — the gate returns context; only signed-out and unverifiable divert |
| **logout returns to a truthful state** | **NOT IMPLEMENTED — see below** |

### The safe-redirect hardening, and a vacuous branch in my own test

The existing suite tried four hostile inputs. The set is now 24, including
encoded slashes, whitespace smuggling, embedded credentials, backslash hosts, and
prefixes that merely resemble an allowed route (`/opportunitiesevil`,
`/saved.evil`).

Mutation testing then found that **my own new test had a vacuous branch**:
deleting the embedded-scheme guard from `safeRedirectPath` broke nothing, because
every scheme-bearing input I had written already failed the leading-slash check
before reaching it. The inputs that actually reach that guard are schemes carried
*inside* an allowed prefix — `/opportunities/javascript:alert(1)` — which the
allowlist would otherwise pass. Added; the mutation is now caught.

### The gap: there is no sign-out

`grep -rni "sign out|signout|log out|logout" src/` returns **nothing**. There is
no sign-out control, no account menu, and no authenticated app shell — the
protected routes render their own mastheads.

The *mechanism* is present and correct: `__root` listens for `SIGNED_OUT`,
invalidates the router, and the gate re-evaluates. A session ending in another
tab is honoured. What is missing is the affordance.

**Not fixed here.** Adding one means designing an authenticated app shell —
where the control lives, what the signed-in chrome looks like — and Phase 18 was
told not to add product features. Recorded as the first product gap for Phase 19.

---

## E. Pursuit / declaration — **VERIFIED**

The lifecycle (`undeclared → submitting → confirmed → refreshing → confirmed →
withdrawing → withdrawn`) and all three failure branches are exercised in
`/lab/mutations` and in the journey walk (§M).

### Opportunity facts are immutable from the declaration layer

Proven behaviourally, not by schema alone: the real projection runs twice over
the real corpus — once undeclared, once with **every entity declared** — and each
entity's `title`, `organiser`, `deadline`, `funding`, `location`, `timing`,
`verification`, `action`, `shown` and `pairing` is compared field by field, plus
the inspection's `sources`, `unsettled`, `verificationHistory`, `requirements`,
`evidence` and `entity`.

Two supporting measurements made the comparison mean something:

- **Observation ids are nondeterministic**, minted fresh per fixture build, while
  entity ids are stable and content-derived. Measured, not assumed — two
  identical `demoCorpus` calls differ in every observation id. They are
  normalised out; left in, every field containing one differs and the test proves
  nothing.
- **The corpus spans timing states.** Asserted, so the sweep cannot pass over
  specimens that happen to be identical.

**Mutation testing caught my own test being too weak.** The first version declared
`scenarios[0]` only, and a mutation making `timing` silently report "open" for any
declared entity walked straight through it — that specimen's deadline was already
open. One sample cannot distinguish "the projection ignores the declaration" from
"this specimen happens to be immune". Declaring the whole corpus fixed it, and the
mutation is now caught.

### Schema half

The pursuit path reaches exactly one table, `opportunity_pursuits`. No
`.update()`, `.upsert()` or `.delete()` touches `opportunity_observations`
anywhere — CR-37 holds. Withdrawal is the only delete in the engine, and it
deletes a person's own declaration.

---

## F. Discovery / evidence — **VERIFIED** (internal contract only)

No real discovery was run; Phase 16's blocker stands (§Q).

The pipeline contract — announcer → robots → retrieval → redirect provenance →
extraction → witness → observation → entity resolution → verification → judgment
→ projection → card → inspection — is covered by 15 tests in
`discovery-over-http`, 21 in `discovery`, 19 in `topologies`, 15 in
`observation`, 9 in `entity`, 14 in `verification`, and 12 in
`no-conclusion-without-acquisition`.

### One gap closed

**`evidenceCompleteness` had no test at all** — the four numbers a reader is
shown when a page is built from incomplete evidence. Two properties, both real
defects at some point in this engine's history, are now pinned:

- **Counted per page, not per observation.** A page reached twice — which a
  redirect produces routinely — used to make "2 of 2 sources" out of one page,
  inflating the corroboration count a reader uses to decide whether to believe
  an unverified claim.
- **The latest retrieval decides.** A page that failed on Monday and answered on
  Tuesday is available. Counting it as degraded forever would make the record's
  own completeness decay as it grows.

Plus the partition itself: `answered + unreadable + unreachable === consulted`,
and `degraded` agrees with the counts, in all four scenarios.

Mutations `evidence-counted-per-observation` and `earliest-retrieval-decides`:
both caught.

---

## G. Database contract — **VERIFIED** locally; live verification **BLOCKED**

Live database verification remains blocked (§Q). What the *application* does with
the schema is verified.

| Item | Status |
|---|---|
| append-only guarantees | **VERIFIED** — `verify:migrations`, 44 assertions, incl. refused UPDATE/DELETE/TRUNCATE on observations, verification events and deliveries |
| withdrawal semantics | **VERIFIED** — the only delete, scoped to `opportunity_pursuits` |
| RLS assumptions | **VERIFIED** — person A sees 1 of 2 rows, cannot write or delete person B's |
| **no service-role in user-scoped reads** | **VERIFIED** — see below |
| no cross-user access | **VERIFIED** — every product read passes `context.supabase` |
| no direct writes to opportunity facts | **VERIFIED** — §E |
| refusal functions remain non-endpoint RPCs | **NOT APPLICABLE** — the application makes no `.rpc()` call at all |
| no legacy declaration writer | **VERIFIED** — three tables referenced, all current |
| no legacy table treated as canonical | **VERIFIED** — the set is pinned by test |

**The service-role boundary.** Two clients exist and the distinction is the whole
of this product's multi-tenancy. `supabaseAdmin` bypasses RLS and is reached by
exactly one module — `opportunity/store.ts`, which builds the observation store
and verification log: the world's facts, identical for everyone, protected by
append-only triggers rather than by RLS. Every user-scoped read takes the
middleware's client, which carries the person's own token so the database does
the scoping. Reading someone's saved opportunities with the admin client would
make every read unscoped, and it would not fail, or warn, or look wrong in a
diff. Pinned by test; the mutation is caught.

**No migration was created in this phase.** No schema issue was found that
required one.

---

## H. Security / trust boundary — **VERIFIED in the built artifact**

New gate: `bun run verify:artifact`, **22 assertions**, greps the built output
rather than the source. Every previous claim about a trust boundary in this
repository was a claim about *imports*; whether it survived bundling,
tree-shaking, inlining and an `import.meta.env` define is a different question,
and only the artifact can answer it.

| Item | Status |
|---|---|
| service-role credential never reaches client | **VERIFIED** — by name, by `service_role`, and by the base64 of the role claim |
| Anthropic key never reaches client | **VERIFIED** — by name and by `sk-ant-` shape |
| publishable key only where appropriate | **VERIFIED** |
| fixture corpus excluded from production | **VERIFIED** — no `demoCorpus`, no fixture title, organiser or source host in the client bundle |
| `/lab` unavailable as a production data source | **VERIFIED** — `assertDevelopment` is in the server artifact and absent from the client, so every laboratory probe refuses |
| no AEON X endpoints or credentials | **VERIFIED** |
| no legacy API routes | **VERIFIED** — no `~oauth`, no Lovable string, in client or server |
| no unauthenticated mutation endpoints | **VERIFIED** — §B; the one that existed is removed |
| cron/webhook secrets fail closed | **NOT APPLICABLE** — no cron or webhook endpoint exists in this build |
| admin operations require authorization | **NOT APPLICABLE** — no admin surface exists |
| server-only modules stay server-only | **VERIFIED** — no `api.anthropic.com`, no `getServerConfig` in the client |

Seven mutations — a planted key name, a planted `sk-ant-`, a planted corpus
builder, planted fixture data, a planted dev guard, a planted `~oauth` path, a
planted AEON reference — all caught.

**Noted, not a defect:** the laboratory's *UI shell* is code-split into the
production client build — 29,642 bytes across ten chunks, downloaded only if
someone navigates to `/lab`, where every server call then refuses. No corpus and
no secret ships. Recommended as a build-configuration item for Phase 19, not
changed here: making route generation differ between dev and prod would put the
checked-in `routeTree.gen.ts` in conflict with itself and would cost the dev/prod
parity that makes the laboratory evidence about the product.

---

## I. Routes / IA — **VERIFIED**

Generated tree, compared against the canonical product:

```
product   /   /auth   /opportunities   /opportunities/$id
          /opportunities/examples   /saved
guarded   every one of the four under /_authenticated/
lab       /lab  /lab/$id  /lab/faults  /lab/mutations
          /lab/refresh  /lab/saved  /lab/states
```

- **No dead links** — every `to=` and `href=` in `src/**/*.tsx` resolves to a path
  in the generated tree, checked against the tree rather than a hand-kept list.
- **No retired route** — `/workspace`, `/dashboard`, `/step`, `/onboarding`,
  `/applications`, `/profile`, `/settings`, `/interview`, `/calendar`: zero
  references anywhere in `src`.
- **No navigation returns to System B** — no AEON X string in source or artifact.
- **Deep links work structurally** — `/opportunities/$id` and `/lab/$id` both
  resolve; the gate carries the full path and query through sign-in.

Mutations `link-to-a-retired-route` and `a-legacy-table-is-reintroduced`: caught.

---

## J. Accessibility / responsive — **VERIFIED**

`bun run verify:states` — **133 checks**, extended from Phase 17's 47.

- **375 / 390 / 768 / 1280 × light + dark**, across six laboratory surfaces *and*
  the two reachable product surfaces (`/`, `/auth`): no horizontal overflow, no
  blank surface, console clean at every combination.
- **Keyboard**: every control tab-reachable, every focused control shows an
  indicator, the refresh-failure path fully operable without a mouse.
- **`aria-pressed`** follows what was recorded, not what was pressed — and the
  same fact is in the text, not only the attribute.
- **Disabled / busy**: a write in flight is `aria-busy` or `disabled`, not merely
  dimmed.
- **Live regions**: the in-flight state sits in one and says what is happening
  ("I'm recording 'Interested'. Nothing is kept until I've confirmed…"), and
  stops saying it once settled.
- **Reduced motion**: zero elements report an animation or transition above 20ms.
- **Forced colours** (`forcedColors: "active"`, both themes): the three absences
  remain distinguishable with the palette stripped — they are told apart by
  words, not by tint.
- Loading announces itself with `role="status"` and screen-reader text, so
  removing motion subtracts reassurance and never information.

**One console warning, third-party, named and not hidden.** The landing page's
globe triggers `THREE.Clock: This module has been deprecated` — emitted by
`@react-three/fiber` 9.6.1 against `three` 0.185.1. Our code uses `useFrame`,
the correct r3f API. Excused by its exact text, one entry, so every other
warning on that page is still seen; silencing the check on `/` would also
silence the next real one. Clearing it means moving a dependency, which is not an
integration-audit decision. Found only because this phase extended the walk to
the product surfaces — Phase 17 never looked at `/`.

A second excused string is an artefact of *this environment*: headless Chromium
has no GPU, so the globe renders in software and the driver reports a stall. It
does not occur on hardware.

---

## K. Performance — **VERIFIED**, no regression

| Measure | Phase 17 | Phase 18 |
|---|---|---|
| client bundle (JS + CSS) | 1,965,401 B | 1,965,519 B (**+118 B, +0.01%**) |
| documents per route | 1 | 1 |
| duplicate client server-fn calls | 0 | 0 |
| N+1 | none | none |
| one refresh → server calls | 1 | 1 |
| route transition (`/lab` → `/lab/states`) | — | 0 documents, 0 extra calls |

Hydration cost, by route: `/auth` 90ms · `/lab/refresh` 90ms · `/lab/saved` 85ms
· `/lab/states` 100ms · `/lab/mutations` 101ms · `/lab` 187ms · `/` 295ms (the
globe).

The one deliberate change is §A's extra document on a signed-out deep link:
**+7ms**, because it replaces React's full tree regeneration.

**No cache was introduced.** `last-good` is not one — nothing reads from it to
satisfy a request, and a test asserts it has grown no `ttl`, `maxAge`, `expires`
or `revalidate`.

---

## L. Test quality — **VERIFIED**, four defects fixed

323 tests, 968 assertions. The suite was audited against its own vices, and the
audit found some in tests written *during this phase*.

| Defect | Where | Fixed |
|---|---|---|
| assertion inside `if (workshop) { … }` — passes having checked nothing the day grouping stops producing that entity | `discovery-over-http.test.ts` | asserted the entity exists first |
| assertion inside `if (bare.outcome === "retrieved")` — everything below silently stops running | `discovery-over-http.test.ts` | asserted the outer condition |
| `assert.match(gate, /throw redirect\(\{ to: "\/auth"/)` — pinned to one line, broke on a Prettier reformat while the invariant was untouched | `lab.test.ts` | matched across whitespace |
| `say(true, …)` reporting "0 pending elements" — an always-true check on a page that cannot show the state | `state-walk.mjs` | removed; moved to a component test |
| a hardcoded `reading #2` against a server-side counter shared between runs | `state-walk.mjs` | compares against what the page was showing |
| a journey selector matching a nav link instead of a specimen | `state-walk.mjs` | tracks one specimen by id |
| a journey check assuming an empty saved list when the lab ships fixture declarations | `state-walk.mjs` | asserts that specimen's presence and absence |

**Zero always-true assertions** and **zero silently-skippable conditionals**
remain in the suite.

On source-text assertions: they are used where the invariant *is* about the
source — "no route reads `last-good` outside its failure branch", "no server
function lacks a protection posture". Where rendered behaviour is available it is
preferred, which is why components render in a child process and why 133 checks
run in a browser.

### Mutations — 24, all caught

`redirect-lands-mid-hydration` · `hydration-never-marked` · `deep-link-dropped` ·
`unprotected-server-fn-reappears` · `refusal-becomes-empty-answer` ·
`unparseable-becomes-empty-answer` · `supabase-read-swallows-error` ·
`scheme-in-path-allowed` · `prefix-match-instead-of-boundary` ·
`auth-bypasses-the-allowlist` · `network-failure-becomes-rejection` ·
`declaration-leaks-into-timing` · `declaration-leaks-into-explanation` ·
`declaration-alters-evidence-counts` · `evidence-counted-per-observation` ·
`earliest-retrieval-decides` · `user-read-uses-service-role-key` ·
`link-to-a-retired-route` · `a-legacy-table-is-reintroduced` ·
`withdrawal-does-nothing` · and seven planted artifact leaks.

Two of them — `scheme-in-path-allowed` and `declaration-leaks-into-timing` —
**escaped on the first attempt** and were only caught after the test that should
have caught them was strengthened. Both are recorded above.

---

## M. Browser verification — **VERIFIED** (fixture environment)

**This is not live-data verification.** Every opportunity is a fixture and every
page says so.

The full journey, in one session, tracking one specimen by id from a state the
walk did not create:

```
ARRIVE   the surface says outright that it is a fixture; 9 specimens listed
OPEN     the specimen opens at its own address
INSPECT  the evidence is shown, not just the claim; what each page said;
         still labelled a fixture
DECLARE  a position is taken, and read back from the store — not assumed
SAVED    that specimen appears on the saved surface
RETURN   the position survived leaving the page
REOPEN   and survived a full document reload
REFRESH  the opportunity's facts and evidence are unchanged by the declaration
WITHDRAW the position is taken back; the surface returns to having been told
         nothing; the saved surface is not left holding it; the opportunity
         survived the whole round trip unchanged
```

Console-clean throughout.

The states deliberately exercised alongside it: loading, error, retry, refresh
failure, mutation pending, mutation failure, mutation unreadable, empty, absent,
unavailable, unknown, and reduced motion.

**The journey works from whatever state it finds.** Laboratory declarations live
in the dev server's memory and persist between runs, and some specimens ship
declared. A journey that assumed an empty saved list would pass or fail on what a
previous run left behind — so it picks a specimen that is not currently saved and
follows that one.

---

## N. Defects found

| # | Defect | Severity | Disposition |
|---|---|---|---|
| 1 | Hydration mismatch on every signed-out arrival at a protected route | high | **Fixed** (§A) |
| 2 | `getGreeting` — unprotected `POST` server function, tree-shaken but one import from live | medium | **Removed** (§B) |
| 3 | Three `failure → empty` collapses in the AI entry point | medium (latent) | **Fixed** (§B) |
| 4 | `evidenceCompleteness` — the counts a reader is shown — had no test | medium | **Closed** (§F) |
| 5 | Two silently-skippable assertions | medium | **Fixed** (§L) |
| 6 | A formatting-coupled assertion | low | **Fixed** (§L) |
| 7 | Four defective checks in my own new browser walk | medium | **Fixed** (§L) |
| 8 | Two of my own new tests escaped their mutations | medium | **Fixed** (§D, §E) |
| 9 | **No sign-out exists anywhere in the product** | high (product) | **Reported, not fixed** (§D) |
| 10 | `THREE.Clock` deprecation warning on the landing page | low | **Reported** — dependency (§J) |
| 11 | Laboratory UI shell ships to the production client bundle (29.6 KB, inert) | low | **Reported** (§H) |
| 12 | `opportunity_deliveries` — table, triggers and `InMemoryDeliveryLog` exist; nothing reads or writes it | low | **Reported** (§P) |

---

## O. Defects fixed

Eight of the twelve, listed above. The two that matter most:

**The hydration mismatch** — traced through SSR, hydration and the router's match
lifecycle, fixed at the smallest layer that could be correct, mutation-tested
three ways, and measured to cost 7ms.

**The AI entry point's collapses** — closed before the first caller could inherit
them, in a module that currently has none.

---

## P. Remaining gaps

| Gap | Status |
|---|---|
| **No sign-out control.** The mechanism is correct and wired; the affordance does not exist, and neither does an authenticated app shell to put it in. | **NOT IMPLEMENTED** — first product item for Phase 19 |
| **No AI call ships.** `callClaude` is the sanctioned path per `CLAUDE.md` and has no callers; the built artifact contains no Anthropic request. The engine is deterministic and evidence-based by design, so this may be correct for the current phase — but it should be a decision, not an accident. | **UNVERIFIED** — needs a founder decision |
| **Degraded partition unreachable.** `entity/group.ts:145` skips observations that were not retrieved, so a failed retrieval never joins an entity and the degraded surface never renders in production. Contract and surface built and correct; inert. | **IMPLEMENTED / UNVERIFIED** — unchanged since Phase 17 |
| **Delivery record unwired.** `opportunity_deliveries` has a table, append-only triggers and migration coverage; `InMemoryDeliveryLog` exists and is exported. Nothing writes to it. | **IMPLEMENTED / UNVERIFIED** |
| **CR-24 / CR-25** — inspectable person-model, "show me anyway" override | **NOT IMPLEMENTED** — recorded, not manufactured |
| Laboratory chunks in the production build | **Reported** (§H) |
| `THREE.Clock` deprecation | **Reported** (§J) |

---

## Q. Phase 16 external blocker

```
PHASE 16:
NOT COMPLETE
BLOCKED — EXTERNAL ENVIRONMENT

Required:
- education.gov.ng egress
- anfiojmbgonrtympzjch.supabase.co egress
- SUPABASE_SERVICE_ROLE_KEY
```

Frozen at `a149899` and **untouched by this phase**. No real discovery was run,
none was simulated, and nothing in this report claims live-data verification.
When the prerequisites exist, the existing Phase 16 verification prompt is the
only procedure to use.

---

## R. Gates

| Gate | Command | Result |
|---|---|---|
| TypeScript | `bunx tsc --noEmit -p .` | **0 errors** |
| ESLint | `bun run lint` | **0 errors**, 8 warnings (unchanged from Phase 17) |
| Tests | `bun run test` | **323 pass / 0 fail** (was 299) |
| Build | `bun run build` | **clean**, 3 bundles |
| Migrations | `bun run verify:migrations` | **44 passed, 0 failed** |
| Build artifact | `bun run verify:artifact` | **22 passed, 0 failed** *(new)* |
| Browser | `bun run verify:states` | **133 checks passed** (was 47) |
| Dev server | `bun run dev` | serves on :5173 |
| Light + dark | walk | both, at four widths |
| Responsive | walk | 375 / 390 / 768 / 1280, no overflow |
| Accessible | walk | keyboard, focus, `aria-pressed`, `aria-busy`, live regions, forced colours, reduced motion |
| Console | walk | clean, minus one named third-party deprecation |
| Performance | measured | +118 B bundle; no regression |

### Repository Health Gate

1. **Builds?** Yes.
2. **TypeScript errors?** 0.
3. **ESLint, and how many did this change introduce?** 0 errors before, 0 after;
   8 warnings before, 8 after. **Net zero.** Mid-phase this stood at 88 errors at
   one point — all Prettier violations in files I had edited — fixed before this
   gate.
4. **Technical debt: up or down?** **Down.** One high-severity runtime defect
   fixed, one unprotected endpoint removed, three latent collapses closed, four
   defective tests repaired, and two new gates (`verify:artifact`,
   `verify:states` extended from 47 to 133 checks) that convert claims about
   source into claims about what runs. Against that: nothing added.
5. **Tests covering the modified functionality?** Yes — 24 new tests, 86 new
   browser checks, 24 mutations all caught.
6. **Still aligned with the architecture?** Yes. No new product surface, no
   scoring, no gateway, no cache, no change to the observation → entity →
   judgment model, and no migration.

### Status block

- **Phase:** 18 — Integration, Runtime Integrity & Pre-Production Readiness
- **Completed:** hydration fixed and mutation-tested; async boundaries mapped;
  state composition verified; auth contracts verified; pursuit lifecycle and
  fact-immutability proven; discovery contracts audited and one gap closed;
  database contract verified locally; trust boundary verified **in the build**;
  route tree clean; accessibility and responsive verified; performance measured;
  test suite audited for vacuity; full journey walk passing
- **In progress:** none
- **Blocked:** Phase 16 external verification (unchanged, frozen)
- **Next recommended:** the sign-out gap (§D) — it is the only *product*
  contract this phase found missing, and it needs an authenticated app shell
- **Open questions:** whether the AI path should be wired or removed; whether the
  degraded partition should be made reachable or the surface withdrawn until it
  can be

**Phase 18 status: VERIFIED**, with four gaps reported rather than closed, and
Phase 16 explicitly still blocked.
