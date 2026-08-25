# Phase 17 — State System Ratification

**Governing rule:** *A UI state must never claim more knowledge than the
underlying system currently possesses.*

Status vocabulary is fixed to five values: **IMPLEMENTED**, **VERIFIED**,
**UNVERIFIED**, **BLOCKED**, **NOT APPLICABLE**. "Verified" means a command was
run and its output read; nothing here is marked verified on inspection alone.

---

## A. Scope

Phase 17 audited every state the product can be in, closed the collapses it
found, and made the verification repeatable. It did not add product features,
did not redesign Opportunity X, did not begin Phase 18, and did not reopen any
completed architectural decision.

Two defects dominated the phase, and neither could have been found by reading
source:

1. **A failed refresh destroyed valid content.** Measured on `/lab/refresh`.
2. **An unverifiable session spun for 57.3 seconds** before saying so. Measured
   with an expired token against an unreachable auth host.

Both are the governing rule inverted — the first presented a limit on the system
as a fact about the world, the second let a spinner assert "progressing" long
after the check was dead.

**Status: IMPLEMENTED + VERIFIED.**

---

## B. Audit findings — the state of things entering Phase 17

Conducted before any code was written.

| # | Finding | Where | Disposition |
|---|---|---|---|
| 1 | A loader throwing during `invalidate()` reaches `errorComponent` with the previous data already discarded — content vanishes and an error page takes the surface | `/opportunities`, `/saved`, `/lab/refresh` | **Fixed** (§E) |
| 2 | `SurfaceError` accepted a `retrying` prop from the day it was written and **no call site ever passed it** | 4 routes | **Fixed** (§K) |
| 3 | Three further retry controls had no pending state, two of them in production | `__root.tsx`, `_authenticated/route.tsx`, `lab.refresh.tsx` | **Fixed** (§K) |
| 4 | The session check was unbounded; a dead auth host cost 57.3s of spinner | `_authenticated/route.tsx` | **Fixed** (§L) |
| 5 | Hydration mismatch on every protected route when the gate redirects to `/auth` | `_authenticated/*` | **Pre-existing, reported, not fixed** (§R) |
| 6 | Degraded-partition surface remains unreachable — failed retrievals never join an entity | `entity/group.ts:145` | **Pre-existing, carried forward** (§I) |

Findings 1–4 were found by driving a browser. None of them is visible in the
type system, and none would have failed a build.

**Status: IMPLEMENTED + VERIFIED.**

---

## C. The canonical state matrix

Every surface resolves to exactly one of these. The column that matters is the
last one: what the state is *entitled to claim*.

| State | Component | Entitled to claim |
|---|---|---|
| Loading (first read) | `OpportunityListSkeleton`, `InspectionSkeleton`, `Skeleton` | "I am reading. I do not yet know." |
| Refreshing (re-read, content on screen) | `Refreshing` | "What you see was true; I am checking for newer." |
| Refresh failed (content preserved) | `RefreshFailed` | "What you see was true at *T*; I could not check since." |
| Surface error (nothing to preserve) | `SurfaceError` | "I could not read. This is not a finding about the world." |
| Unknown | `UnknownState` | "I cannot see. Nothing follows about what exists." |
| Absent | `AbsentState` | "I looked at *T* and found nothing. This is a finding." |
| Empty | `EmptyState` | "Nothing yet, and that is expected." |
| Session unverifiable | `SessionBoundary` | "I could not check your session. You are not necessarily signed out." |
| Signed out | redirect to `/auth` | "I asked and there is no session." |
| Write pending / refused / failed / stale | `performWrite` outcomes | see §F |

The eight collapses Phase 17 forbids, and where each is prevented:

| Collapse | Prevented by |
|---|---|
| loading → empty | separate skeletons; `EmptyState` never renders during a read |
| error → empty | `SurfaceError.stillTrue`, asserted in tests |
| unavailable → signed out | `SessionCheck.unverifiable`, §L |
| pending → success | `performWrite` read-back, §F |
| refreshing → stale/new certainty | `Refreshing` + `RefreshFailed` carry an age, §E |
| partial → complete | `evidenceCompleteness()`, §I |
| unknown → absent | three distinct components, §J |
| write requested → write confirmed | read-back before the control changes, §F |

**Status: IMPLEMENTED + VERIFIED** (each row exercised by `test/state.test.ts`,
`test/refresh-preservation.test.ts`, and `scripts/state-walk.mjs`).

---

## D. Loading patterns per surface

Card-shaped skeletons rather than spinners: the shape of what is coming, so a
read in progress is not mistaken for a page that finished and found nothing.
The pattern is *inspired by* feed-style card skeletons; the geometry is derived
from this product's own card, not copied.

| Surface | Pending component |
|---|---|
| `/opportunities` | `OpportunityListSkeleton` |
| `/saved` | `OpportunityListSkeleton` |
| `/opportunities/$id` | `InspectionSkeleton` |
| `_authenticated` gate | `BrandLoader`, bounded at 8s (§L) |

Every pending branch keeps the surface's masthead and its way out. A failure
that also removes the navigation turns one broken read into a dead end.

**Status: IMPLEMENTED + VERIFIED.**

---

## E. Refresh, and the preservation rule

**The rule:** valid content plus a failed refresh must remain *valid content
plus a refresh failure* — never an error page, an empty list, or a skeleton.

**The measurement that forced this.** On `/lab/refresh`, before the fix:

```
AFTER-FAIL reading present : GONE
```

The router has no notion of "the last answer that worked". A loader either
resolves or throws, and a throw during `invalidate()` puts the route into its
error state with the previous data already discarded. The component holding the
data unmounts as the error boundary mounts, so state, refs and context beneath
it are all gone precisely when wanted.

**The mechanism.** `src/lib/last-good.ts` — a module-level map, per-tab, not
persisted. It is **not a cache**: nothing reads from it to satisfy a request,
nothing is served from it in place of a read, and its presence never shortens or
skips a fetch. It is consulted only *after* a read has failed, and only to
answer "what were we showing?". A test asserts it has grown no `ttl`, `maxAge`,
`expires` or `revalidate`, and that no route reads it outside its failure branch.

It carries `at`, and renderers are obliged to show it. Preserved content without
an age is the one way this pattern becomes a lie.

**`RefreshFailed`** is `role="status"`, deliberately not `role="alert"` — the
content beneath it is fine, and interrupting a screen reader to announce that
something *newer* could not be fetched would rank the caveat above the evidence.

After the fix, in Chromium:

```
reading #1 → (fail) → reading #1  content preserved
                                   caveat present, role=status, no role=alert
                                   time[datetime] rendered
          → (retry) → reading #2  caveat cleared
```

**Status: IMPLEMENTED + VERIFIED.**

---

## F. Pending mutations

Unchanged from Phase 14/15 and re-verified. `performWrite` resolves to `idle |
refused | failed | stale`, and `InterestedControl` performs its own read-back
rather than updating local state — the point being to prove the declaration was
stored and can be read back. A local optimistic update would show the button
change colour whether or not anything was recorded.

A write whose *refresh* failed is no longer reported as a failed write; the
read-back moved into the control in Phase 15 for exactly that reason.

**Status: IMPLEMENTED + VERIFIED** (`/lab/mutations`, `test/state.test.ts`).

---

## G. Success semantics

Success is "the system did what was asked and can show you the result", never
"the request was dispatched". Concretely: the interested control changes only
after a read-back confirms the row; the refresh caveat clears only when a newer
read actually lands; `SESSION_CHECK_DEADLINE_MS` expiring is *not* success and
is not signed-out.

Per CR-04, success is never measured as engagement. Nothing added in this phase
counts a click as an outcome.

**Status: IMPLEMENTED + VERIFIED.**

---

## H. Error taxonomy

| Class | Rendered as | Distinguishing claim |
|---|---|---|
| First read failed, nothing to preserve | `SurfaceError` | "I could not look" — explicitly not "there is nothing" |
| Re-read failed, content preserved | `RefreshFailed` | "What you have is still true; I could not get newer" |
| Reference resolves to nothing | inline absence on `$id` | "Nothing matches that reference" |
| Session could not be checked | `SessionBoundary` | "Not a sign you've been signed out" |
| Session refused | redirect to `/auth` | a real answer |
| Anything else | `__root` boundary | last resort, now with a pending retry |

Every error class carries a `stillTrue`-equivalent sentence. Without it a reader
concludes the search came back empty and stops looking — which is the failure
mode the taxonomy exists to prevent, not a stylistic preference.

**Status: IMPLEMENTED + VERIFIED.**

---

## I. Graceful degradation

`evidenceCompleteness()` reports how much of a corpus was readable, so a partial
read is never projected as a complete one. The partition is driven in tests by
genuinely failed observations rather than by fabricated counts.

**Known gap, carried forward unchanged:** the degraded partition is currently
unreachable in production. `src/lib/opportunity/entity/group.ts:145` skips
observations that were not retrieved, so a failed retrieval never joins an
entity and the degraded surface never renders. The contract and the surface are
built and correct; they are inert. This predates Phase 17 and was not opened by
it — fixing it changes the entity-grouping model, which is a Phase 18 decision.

**Status: IMPLEMENTED (contract + surface) / UNVERIFIED (unreachable in
production).**

---

## J. Empty, absent and unknown

Three components, three sentences, and they are held apart at the type level,
not by wording alone:

- `PursuitResolution` = `declared | undeclared | { state: "unreadable"; because }`
- `CardsResolution` = `cards | { state: "absent"; searchedAt } | unknown`

`AbsentState` carries `searchedAt` because "nothing right now" is only
actionable if the reader can see how recent the "now" is. `UnknownState` carries
a `gap` — what could not be seen — and never a time, because no search happened.

Verified in a browser at both themes: each of the three renders a sentence the
other two do not.

**Status: IMPLEMENTED + VERIFIED.**

---

## K. The retry model

Every retry control must (a) enter a transition, (b) disable itself, and (c)
announce `aria-busy`. A retry with no pending state is the infinite-spinner
problem inverted: no spinner, and no evidence anything happened.

Seven controls were brought to that standard; three had no pending state at all,
two of them in production:

| Control | Before | After |
|---|---|---|
| `SurfaceError` on 4 routes | `onRetry={() => void router.invalidate()}` | `useTransition`, `retrying` passed |
| `__root` "Try again" | bare `invalidate(); reset()` | transition + disabled + aria-busy |
| `SessionBoundary` "Check again" | bare `invalidate()` | transition + disabled + aria-busy |
| `/lab/refresh` "Refresh, and succeed" | bare `invalidate()` | transition + disabled + aria-busy |

**The test is a sweep, not a list.** The first version named four routes; a
browser walk then found three more it had never looked at. Naming the call sites
closes the instances; scanning `src/**/*.tsx` for any event handler reaching
`router.invalidate()` without a transition closes the class. A deliberately
added new route reintroducing the pattern is caught (§O).

**Status: IMPLEMENTED + VERIFIED.**

---

## L. The session gate, and its deadline

The classification was already right. `classifySessionCheck` separates
`signed-in`, `signed-out` and `unverifiable`, and the gate refuses entry on the
third rather than redirecting — because a redirect to `/auth` *is* the claim
"you are signed out", however gently worded on arrival.

**What was wrong was the clock.** Measured with an expired token and the auth
host unreachable:

```
before:  resolved after 57.3s   "Verifying your session" throughout
after:   resolved after  8.7s   "…didn't answer in time"
```

A spinner is not neutral while it waits. It asserts *this is progressing*, and
after a few seconds against a dead host nothing supports that assertion — which
makes the loading state itself the lie. So `SESSION_CHECK_DEADLINE_MS` (8s) is
not a performance tweak; it is the point past which continuing to show a pending
state would claim more than the system knows.

The timeout resolves to the **existing** `unverifiable` outcome with its own
`because` — a different fact from a refused connection, and the person is
entitled to the one that actually happened. No new state and no new component
were added; the deadline only makes an existing correct answer reachable in
human time. It is emphatically not `signed-out`: nothing was learned about the
session.

Verified in a browser: URL stays on `/opportunities`, no redirect, and the page
reads *"This is not a sign that you've been signed out."*

**Status: IMPLEMENTED + VERIFIED.**

---

## M. Motion audit

The global `prefers-reduced-motion` block at the foot of `styles.css` is
asserted to exist **and not to be duplicated** — an earlier phase added a second
copy of it, which the test now prevents.

Verified in Chromium under `reducedMotion: "reduce"`: zero elements on
`/lab/states` report a computed `animation-duration` or `transition-duration`
above 20ms.

**Status: IMPLEMENTED + VERIFIED.**

---

## N. The state laboratory

`/lab` is outside `_authenticated` and every probe is refused server-side by
`assertDevelopment()`. Nothing in production branches on a lab flag, and no such
flag exists there.

| Route | What it settles |
|---|---|
| `/lab` | the card surface, declared vs undeclared |
| `/lab/states` | unknown / absent / empty, side by side |
| `/lab/faults` | reads that fail, induced by name |
| `/lab/mutations` | what a write looks like |
| `/lab/refresh` | **new** — a re-read that fails over valid content |
| `/lab/saved` | the saved surface |

`/lab/refresh` could not be staged with props. The defect was that the router
discards the previous data before the error boundary mounts, so the failure had
to be provoked by arming a real loader to throw. It is now linked from the lab
index.

**Status: IMPLEMENTED + VERIFIED.**

---

## O. Behavioural tests and mutation results

299 tests, 299 passing. Ten are new in this phase.

Every assertion added was observed to fail when the behaviour it describes was
deliberately broken. Twelve mutations, all caught:

| Mutation | Detected |
|---|---|
| `age-dropped-from-preserved` | yes |
| `caveat-escalated-to-alert` | yes |
| `preservation-removed` | yes |
| `store-stops-remembering` | yes |
| `last-good-read-before-failure` | yes |
| `root-retry-loses-transition` | yes |
| `session-retry-pending-invisible` | yes |
| `new-route-reintroduces-pattern` | yes |
| `timeout-becomes-signed-out` | yes |
| `deadline-removed-entirely` | yes (as cancellation + non-zero exit) |
| `deadline-swallows-real-answers` | yes |
| `gate-bypasses-the-bound` | yes |
| `gate-collapses-to-truthiness` | yes |

**Two corrections worth recording.**

*One of my own assertions was vacuous and mutation testing found it.*
`age-dropped-from-preserved` initially **escaped**: the test asserted
`/Last read/i`, which survives deleting the timestamp entirely. A
preserved-content notice reading "Last read" and nothing else is precisely the
silent staleness the component exists to prevent, and the assertion would have
passed straight through it. It now asserts the rendered `<time>` element
carrying the actual instant.

*My mutation harness was also wrong.* It counted `# fail` only, and reported
`deadline-removed-entirely` as an escape when the suite had in fact hung and
cancelled three tests. The detector now treats any non-zero exit as caught,
which is the honest signal.

**Status: IMPLEMENTED + VERIFIED.**

---

## P. Browser verification

`bun run verify:states` — 47 checks, all passing. Chromium, dev server on :5173.

Covered: 375 / 390 / 768 / 1280 × light and dark, across all six lab surfaces —
no horizontal overflow, no blank surface, no console error or warning at any
combination. Keyboard: all controls tab-reachable, every focused control shows
an indicator, and the refresh-failure path is fully operable without a mouse.
Reduced motion as in §M.

Console cleanliness excuses exactly two patterns, both named in the script: the
deliberately armed fault on `/lab/refresh` and TanStack's route-match warning
for it. Suppressing the check on that route would blind it to real errors;
failing on the induced fault would make it permanently red.

**This is the phase's process change.** Every previous phase drove a browser
once and wrote down what happened — evidence about the day it was run, which
quietly ages into an assumption. The walk is now a committed script with a
`package.json` entry, so the next change can be checked against it.

**ARB note:** `playwright-core` was added as a devDependency. The vendor lock-in
rule does not fire — it owns none of the build, auth, data or AI layers, and is
a verification tool only. The build does not depend on it.

**Status: IMPLEMENTED + VERIFIED.**

---

## Q. Performance

Measured in Chromium against the dev server, per route:

| Route | server fns | duplicate fns | TTFB | load |
|---|---|---|---|---|
| `/lab` | 1 | 0 | 85ms | 200ms |
| `/lab/states` | 1 | 0 | 32ms | 103ms |
| `/lab/faults` | 1 | 0 | 24ms | 96ms |
| `/lab/mutations` | 1 | 0 | 22ms | 108ms |
| `/lab/refresh` | 1 | 0 | 17ms | 86ms |
| `/lab/saved` | 1 | 0 | 22ms | 86ms |

One server-function call per surface. No duplicate reads and no N+1. (Asset
counts are dev-mode unbundled modules and are not meaningful; the production
figures are below.)

Client bundle, production build, A/B across the phase:

```
before:  1,952,051 bytes
after:   1,965,401 bytes   +13,350 (+0.68%)
```

The increase is `last-good.ts`, `RefreshFailed.tsx`, `lab.refresh.tsx` and the
transitions. No regression.

The one substantive performance change in the phase is §L: a worst-case gate
wait of 57.3s became 8.7s.

**Status: IMPLEMENTED + VERIFIED.**

---

## R. Repository Health Gate, residual risk, and what remains

### The six questions, with the commands actually run

1. **Does the project build?** Yes — `bun run build`, `✓ built in 37.24s`.
2. **TypeScript errors?** `bunx tsc --noEmit -p .` → **0**.
3. **ESLint, and how many did this change introduce?** Baseline before the
   change: **0 errors, 9 warnings**. After: **0 errors, 8 warnings**. Net **−1
   warning** (an unused `eslint-disable` directive in `demo.ts` was removed by
   `--fix`). Mid-phase this stood at 4 errors and 37 errors at two points; both
   were prettier violations in files I had edited, and both were fixed before
   this gate.
4. **Technical debt: up or down?** **Down.** Seven retry controls fixed, one
   unbounded wait bounded, one class of defect closed by a sweep rather than a
   list, and browser verification converted from a one-time claim into a
   committed script. Against that: one devDependency added, and §I's known gap
   is unchanged.
5. **Tests covering the modified functionality?** Yes — 10 new behavioural
   tests, all mutation-verified (§O). 299 total, 299 passing.
6. **Still aligned with the architecture?** Yes. No new product surface, no
   scoring, no gateway, no change to the observation → entity → judgment model.
   The phase strengthened explainability by making three states say what they
   actually know.

Migrations: `scripts/verify-migrations.sh` → **44 passed, 0 failed**.

### Defects I introduced during the phase and then fixed

Recorded because the RHG is worth nothing if it only reports other people's
mistakes:

- `__root.tsx` used `useTransition` without importing it. The build did not
  catch it (Vite does not typecheck) and neither did the tests (they read source
  text) — it would have been a runtime `ReferenceError` in the root error
  boundary, the one place least able to absorb another error. `tsc` caught it.
- The session gate returned a `user` variable that no longer existed after I
  replaced the block above it. Fixed properly by making `SessionCheck`'s
  `signed-in` carry the user, rather than having the caller keep a parallel copy
  of the thing being classified.
- An existing test asserted the gate calls `classifySessionCheck`, which is now
  behind `verifySession`. Reconciled to express the original intent — the gate
  must not inspect `error`/`user` itself — and re-verified by mutation.

### Residual risk

| Risk | Status |
|---|---|
| Hydration mismatch on protected routes | **Pre-existing, diagnosed, not fixed.** React re-renders the tree client-side and the page is correct, but the mismatch fires on `/opportunities` and `/saved`. Cause, measured: the gate's client-side redirect to `/auth` during hydration replaces a subtree the server rendered under `ssr: false`. It does **not** occur on the `unverifiable` branch, which stays in the same subtree — that isolation confirms the diagnosis. Fixing it means changing how the gate redirects, which is an architectural decision, and Phase 17 was told not to redesign. **Recommended as the first item of Phase 18.** |
| Degraded partition unreachable | Unchanged (§I). |
| Phase 16 external verification | **BLOCKED** and frozen at `a149899`, untouched by this phase. Still needs the egress allowlist (`education.gov.ng`, `anfiojmbgonrtympzjch.supabase.co`) and `SUPABASE_SERVICE_ROLE_KEY`. |
| CR-24 / CR-25 | Still unimplemented, still recorded as constitutional capabilities rather than manufactured completion. |

### Status block

- **Phase:** 17 — The State System
- **Completed:** state matrix; refresh preservation; retry model closed as a
  class; session deadline; motion audit; `/lab/refresh`; 10 mutation-verified
  tests; committed browser walk; performance measured
- **In progress:** none
- **Blocked:** Phase 16 external verification (unchanged, frozen)
- **Next recommended:** the hydration mismatch in §R, before any Phase 18 feature
- **Open questions:** whether the degraded partition should be made reachable by
  changing `entity/group.ts`, or whether the surface should be removed until it
  can be

**Phase 17 status: IMPLEMENTED + VERIFIED**, with the hydration mismatch
reported rather than fixed and named as the first Phase 18 item.
