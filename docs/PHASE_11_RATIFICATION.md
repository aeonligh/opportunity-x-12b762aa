# Phase 11 — State, Loading, Error & Graceful Degradation

**Ratification report. Implementation checkpoint: this commit.**

The governing sentence for the phase:

> Opportunity X must never visually or verbally claim that something happened
> when it has not been confirmed.

This is the existing `UNKNOWN ≠ ABSENT ≠ EMPTY` discipline extended to time and
system state. The engine already refuses to let those three collapse into each
other. Until this phase, every one of them collapsed the moment a request was in
flight — because a page that is loading, a page that has failed, and a page that
found nothing all rendered as a page with nothing on it.

---

## A · The state model

Nine states, and the claim each one makes. The right-hand column is what the
state must **never** be allowed to look like, because that is the direction the
lie always runs.

| State         | The claim it makes                                        | Must not look like                           |
| ------------- | --------------------------------------------------------- | -------------------------------------------- |
| **Unknown**   | I cannot see. A limit on me.                              | A finding about the world                    |
| **Absent**    | I looked and found nothing. A finding, with a time on it. | Not having looked                            |
| **Empty**     | Nothing yet, and that is expected.                        | A failure                                    |
| **Loading**   | I am looking. The shape is known; the content is not.     | An answer                                    |
| **Pending**   | Sent, unconfirmed. The old truth still holds.             | Committed                                    |
| **Confirmed** | Written _and read back_.                                  | — (this is the only state allowed to assert) |
| **Refused**   | The system declined before acting, and said why.          | A fault                                      |
| **Failed**    | The attempt broke. Nothing changed.                       | An empty result                              |
| **Degraded**  | Part of this worked, and a named part did not.            | The whole picture                            |

Two rules fall out of the table and govern everything below:

1. **Only the record may assert.** A control's visible position, a button's
   pressed state, a count of sources — each is a claim about what is stored, and
   may move only after a read of the store. Intent, hover, and "a request was
   sent" are not evidence.
2. **A failure must always state what is still true.** This is the half that is
   normally omitted, and it is the half that decides what the reader does next.
   "I could not read this" is not "this does not exist", and a person who cannot
   tell them apart concludes the second, because it is the one that ends the
   search.

---

## B · Surface audit — what was actually wrong

Every finding below was confirmed by a command or a browser, not inferred.

### B.1 · No canonical route had a loading or an error state

| Route                                   | `loader` | `pendingComponent` | `errorComponent` |
| --------------------------------------- | -------- | ------------------ | ---------------- |
| `_authenticated/opportunities`          | ✅       | ❌                 | ❌               |
| `_authenticated/opportunities.$id`      | ✅       | ❌                 | ❌               |
| `_authenticated/saved`                  | ✅       | ❌                 | ❌               |
| `_authenticated/opportunities.examples` | ✅       | ❌                 | ❌               |

Consequences, both real:

- A slow read left the **previous page** on screen and then swapped it. Nothing
  said a read was in progress.
- Any failure fell through to `__root.tsx`, which renders a full-page _"This
  page didn't load — something went wrong on our end."_ That takes the whole
  screen for a partial failure, and its wording is indistinguishable from
  "there is nothing here" — the single confusion this product is least able to
  afford.

### B.2 · A successful declaration did not appear

`InterestedControl` awaited the write and did nothing with a success. The
read-back was supposed to come from the route:

```
$ grep -n "pursuitActions" src/routes/_authenticated/*.tsx
(no output)
```

No product route passed one, so the default `declarePursuit` ran with no
refresh. **A person pressed Interested, the row was written to the database, and
the control still read "You haven't said either way."** The one thing the
component's own documentation describes itself as existing to prevent.

### B.3 · The gate reported a network failure as being signed out

```tsx
const { data, error } = await supabase.auth.getUser();
if (error || !data.user) throw redirect({ to: "/auth", ... });
```

`error` and `!data.user` are not the same fact. A rejected token is an answer; an
unreachable auth service is not. Collapsed, someone with a perfectly valid
session on a bad connection was told they were signed out — then signed in
again, which failed the same way. The product manufactured a loop out of a
network blip while asserting something false about their account at every turn.

### B.4 · A declared button and a hovered button were identical

Found in a browser, not in a diff. `Not for me` styled its declared state as
`border-accent text-accent`, and its hover state as exactly the same two
properties. An **undeclared** button under the cursor was pixel-identical to a
declared one — and the cursor rests there most naturally right after pressing it,
which on a _failed_ write is precisely where the surface must not suggest a
position was taken.

---

## C · The loading system

Three components, one rule: **a skeleton stands for a shape, never for a value.**

| Component                             | Stands for                        |
| ------------------------------------- | --------------------------------- |
| `ui/state/Skeleton`                   | One line or block. The primitive. |
| `opportunity/OpportunityCardSkeleton` | One card, and a list of three     |
| `opportunity/InspectionSkeleton`      | The inspection page               |

Decisions worth recording:

- **Skeleton, not spinner.** A spinner says "wait". A skeleton says "an
  opportunity is arriving and this is the shape it will take" — information the
  product already has, since the card's layout is fixed before any data exists.
  Withholding it costs a layout shift and gives the reader nothing to orient
  against.
- **Pulse, not shimmer.** Opportunity X's motion principle is that atmosphere may
  move and information does not. A shimmer sweeping a card reads as the interface
  being pleased with itself. `prefers-reduced-motion` removes the animation
  entirely and the placeholder still reads as a placeholder — the test for
  whether motion was carrying meaning on its own.
- **Three cards, not one and not ten.** One reads as "there is one opportunity"
  for the instant before the real list lands. Ten reads as a promise about how
  many were found. Three is visibly a rhythm rather than a count.
- **The inspection skeleton is deliberately shorter than the page.** Five of that
  page's nine sections are conditional — _Sources disagree_ appears only when
  they do. A placeholder for a contradiction is the product implying one before
  it has read one, so only the always-present sections are drawn and the page
  grows into the rest. Growing is the honest direction; a skeleton that collapses
  has told the reader there was more here than there is.
- **The left rule survives.** The inference block and the "what the page said"
  block keep `border-l-2` while empty. Position is the only thing separating this
  product's reading from a source's claim, and losing it for the length of a load
  loses it exactly when the reader is least able to notice.

Nothing rendered by any skeleton is readable text. `test/state.test.ts` renders
all three and asserts the visible text is empty, screen-reader status lines
excepted.

---

## D · Mutation integrity

The sequence, now visible at every step:

```
current state → action → PENDING → write confirmed → read back → new state
```

The write and the read that reveals it are **two operations that fail
separately**, and separating them is what produced the fourth outcome:

| Outcome   | Meaning                                              | What collapsing it would say                                                                                |
| --------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `idle`    | Written and read back                                | —                                                                                                           |
| `refused` | Declined before writing, with the action's own words | Reported as a fault, a limit becomes a bug and the person retries something that can never work             |
| `failed`  | Nothing written; previous truth intact               | —                                                                                                           |
| `stale`   | **Written, and the read-back failed**                | As `failed`: a durable declaration announced as lost. As `idle`: a position the surface has no evidence for |

`src/lib/opportunity/pursuit/write.ts` holds `performWrite`, a plain async
function over two injected calls. It lives outside the component because the
interesting behaviour of a mutation is entirely in its failure branches, and
reaching those from React needs a DOM this suite does not have — the alternative
was asserting on component source text, which keeps passing after the behaviour
it describes has gone.

Three guarantees in the control:

1. `aria-pressed` and the position sentence read `pursuit` — the server's
   confirmed answer — and nothing else. There is no code path on which a pressed
   button can mean "a request was sent".
2. The pending line says outright: _"Nothing is kept until I've confirmed it."_
   "Saving…" alone invites the reader to treat the outcome as settled and look
   away.
3. A failure **restates what is still recorded** and retries the intent the
   person already chose, rather than clearing the control or asking them to
   decide again.

The read-back is `router.invalidate()` by default. `/lab` previously performed it
_inside_ its actions, which made the two steps indivisible; that has been undone
in `lab.index.tsx` and `lab.$id.tsx` so the laboratory exercises the same path
production does.

---

## E · The error system

`ui/state/SurfaceError` — surface-local, three-part, and `stillTrue` is a
**required** prop. That is the enforcement: an error cannot be rendered without
the half that keeps it from reading as an absence.

| Part                   | Why                                                                               |
| ---------------------- | --------------------------------------------------------------------------------- |
| **What failed**        | Named, specific, first person — the failure belongs to the system, not the reader |
| **What is still true** | The honest half, almost always omitted                                            |
| **What you can do**    | A real action, or `null` where waiting is the truthful answer                     |

Retry is optional on purpose. A button that cannot succeed teaches people that
this product's buttons are decoration, so an environmental failure says so
instead of offering one.

Each route's error branch keeps the page's own masthead and its way out. A
failure that also removes the navigation turns one broken read into a dead end —
and on `/opportunities/$id`, someone arriving from a shared link has no history
to fall back through.

The root boundary is unchanged and still catches what nothing else claims. It is
no longer the first thing a product surface reaches.

---

## F · Graceful degradation

`_authenticated/route.tsx` now asks two questions instead of one.
`src/lib/session-verification.ts` decides **what happened**; the route decides
what to do about it.

| Result of `getUser()`                    | Outcome        | Action                      |
| ---------------------------------------- | -------------- | --------------------------- |
| `AuthRetryableFetchError` (offline, 5xx) | `unverifiable` | Throw `SessionUnverifiable` |
| `TypeError` from `fetch`                 | `unverifiable` | Throw `SessionUnverifiable` |
| Any other auth error                     | `signed-out`   | Redirect to `/auth?next=…`  |
| No error, no user                        | `signed-out`   | Redirect to `/auth?next=…`  |
| No error, user                           | `signed-in`    | Proceed                     |

**Nothing is relaxed.** The protected surface still does not render when the
session cannot be verified — the branch throws rather than returning a context.
What changed is only what the person is told: a boundary that says _"This is not
a sign that you've been signed out. Your session may be perfectly valid — I just
can't confirm it right now, and I won't show you a page that might not be yours
on a guess."_

The boundary re-throws anything that is not a session failure, so a page failing
underneath a good session still reports its own reason rather than being replaced
by a generic one.

Partial degradation has a specimen and a shape (`SurfaceError` with a named
missing part) but **no production call site yet** — see §K.

---

## G · Language

Every new sentence is first-person, matches `pursuit/stance.ts`, and states a
limit rather than a fault of the reader. The vocabulary excluded, and why:

| Excluded                                    | Because                                                        |
| ------------------------------------------- | -------------------------------------------------------------- |
| "Almost there", "nearly done"               | A claim about a request in flight that nothing has established |
| A progress bar                              | Draws a fraction out of nothing — a fabricated fact            |
| "Saved!", "Success" during a write          | The outcome is not known yet                                   |
| "No opportunities found" on a failure       | A finding the system has not made                              |
| "Something went wrong" as a product surface | Describes a fault where the truth may be a limit               |

`test/state.test.ts` holds the exclusion list against the loading components, and
asserts that a `SurfaceError` never renders the vocabulary of a finding.

---

## H · The state laboratory

Extended from three specimens to fourteen, across two pages, both
development-only behind the existing `assertDevelopment` guard.

**`/lab/states`** — eight static specimens, each with what it means and what it
would be lying about if rendered as one of the others: Unknown, Absent, Empty,
Loading, Failed, Failed-with-nothing-to-do, Partly available, Session
unverifiable. Plus the declaration that outlived its opportunity.

**`/lab/mutations`** — five interactive specimens: pending-then-confirmed, write
fails, system refuses, written-and-not-shown, and a six-second wait. Each renders
the **real** `InterestedControl` with only the store behind it substituted, and
each store is rigged to fail in exactly one way. Latency is deliberately ~1.4s: a
pending state that lasts eighty milliseconds cannot be looked at, and a pending
state nobody has looked at is one nobody has checked.

The rig holds the "server" value in a ref and the visible value in state that
**only `onWritten` may move** — the same shape as production. A specimen
therefore cannot accidentally demonstrate optimism; there is no code path in the
laboratory that can move a position without going through a read.

---

## I · Tests

`test/state.test.ts` — 25 tests, behavioural wherever behaviour exists.

Two pieces of infrastructure were added to avoid asserting on source text:

- `test/hook.mjs` gained an esbuild `load` hook for `.tsx`. Node 22 strips types
  from `.ts` natively but does not transform JSX, so components were previously
  unimportable.
- `test/render-component.ts` renders one component in a child process, because
  the suite's own `--conditions=react-server` makes `react-dom/server` refuse to
  load.

Coverage:

| Claim                                                                 | How                                                             |
| --------------------------------------------------------------------- | --------------------------------------------------------------- |
| Skeletons render no readable content                                  | Rendered; visible text asserted empty                           |
| Loading is announced once, not per card                               | Rendered; `role="status"` counted                               |
| Every write branch behaves                                            | `performWrite` run directly, all four outcomes                  |
| The read-back follows the write, and is skipped when the write fails  | Call order recorded                                             |
| Pressed state comes from the record                                   | `InterestedControl` rendered declared and undeclared            |
| A network failure is not a signed-out answer                          | `classifySessionCheck` run against real supabase-js error types |
| Declared ≠ hovered                                                    | Class lists compared                                            |
| Every route declares both states, and keeps its navigation on failure | Route definitions                                               |

**Every assertion was mutation-tested.** Each of the following was introduced,
the suite was run, and the failure was observed before reverting:

| Mutation                                      | Caught |
| --------------------------------------------- | ------ |
| Skeleton renders `Closes soon`                | ✅     |
| A route loses its `pendingComponent`          | ✅     |
| `aria-pressed` follows the pending intent     | ✅     |
| `stale` collapsed into `idle`                 | ✅     |
| A network failure classified as signed-out    | ✅     |
| Declared styling reduced to the hover styling | ✅     |

---

## J · Quality gates

| Gate           | Command                  | Result                                                                                                                      |
| -------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| TypeScript     | `bunx tsc --noEmit -p .` | **0 errors**                                                                                                                |
| ESLint         | `bun run lint`           | **0 errors**, 9 warnings (all pre-existing `react-refresh/only-export-components` in `src/components/ui/`)                  |
| Build          | `bun run build`          | **passes** — Vercel Build Output v3                                                                                         |
| Dev server     | `bun run dev`            | **runs**, :5173                                                                                                             |
| Tests          | `npm test`               | **240 pass / 0 fail** (215 before this phase)                                                                               |
| Console errors | browser walk             | **0**                                                                                                                       |
| Light + dark   | browser walk             | **both verified**, driven through the real `ThemeProvider`                                                                  |
| Responsive     | browser walk             | **375 / 768 / 1280**, no horizontal overflow at any width                                                                   |
| Accessibility  | browser walk             | retry reachable by keyboard; `role="status"` / `role="alert"` on every waiting and failing surface; skeletons `aria-hidden` |

### Browser walk

Chromium, against the local dev server. Everything below was executed and passed:

- `/lab/states` at four viewport/theme combinations — no console errors, no
  horizontal overflow.
- Press _Interested_ → **mid-flight**: `aria-pressed="false"`, position sentence
  unchanged, pending sentence present. **After confirmation**: `aria-pressed="true"`,
  position updated.
- Failing write → _"nothing was recorded"_, previous position restated, retry
  offered, previous position still on screen.
- Stale write → reports written-but-unshown; does **not** show the new position.
- Refusal → carries the action's own words; does **not** show a position.
- `/opportunities` signed out → still redirects to `/auth?next=…`. The gate is
  unchanged in behaviour.

### Two defects the walk found that no test would have

1. A **hydration mismatch** on both laboratory pages: `Date.now()`-derived
   timestamps computed milliseconds apart on server and client. Fixed by pinning
   both to literals. Ironic in the relevant way — a page about not claiming
   unconfirmed things was rendering a value its two halves disagreed about.
2. The **declared-vs-hovered** ambiguity in §B.4.

---

## K · What is not done, and what is still blocked

Stated plainly rather than rounded up.

- **Partial degradation has no production call site.** The shape exists and has a
  specimen; no read in `opportunities.server.ts` currently reports "three of four
  sources answered" separately from a whole-surface failure. Doing it properly
  means the _reads_ must return partial results, which is engine work, not
  surface work. Deliberately not started inside this phase.
- **Retry-after-failure on a route re-runs the whole loader.** Correct, and
  coarse: a page whose declarations read failed and whose opportunities read
  succeeded re-runs both. Same dependency as the item above.
- **No live-data verification.** Phase 10's external blockers are unchanged:
  `auth.users = 0`, no observation has ever been acquired (announcer egress is
  `403` from this environment), and production still serves a pre-Phase-10 build.
  Every state in this phase was exercised against fixtures and rigged stores.
  **None of it has been seen against the live database**, and this report does
  not claim otherwise. See `docs/PHASE_10_EXTERNAL_VERIFICATION.md`.
- **`__root.tsx`'s error page is unchanged.** Still generic, still a full-page
  takeover. It is now a genuine last resort rather than the first thing a product
  surface reaches, and rewriting it was out of scope.
- **No performance measurement was taken.** No regression is expected — the
  additions are static markup — but "expected" is not "measured", and this is
  recorded as unmeasured rather than as passing.

---

## L · Ratification

Phase 11 is **complete for everything reachable without live data**, on these
terms:

- The nine states in §A are distinguishable on every canonical surface, and each
  one is reachable on demand in the laboratory.
- No surface asserts an unconfirmed outcome. The one place that could —
  `InterestedControl` — now derives every claim from the record and has its four
  outcomes tested directly.
- No failure renders as an absence. `stillTrue` is structurally required.
- The authenticated gate no longer makes a claim about someone's account that it
  has no evidence for, and did not become more permissive in the process.
- All gates that can pass in this environment, pass, with the numbers in §J.

**Not ratified, and not claimed:** anything requiring the live database, a real
account, or real acquisition. Those remain exactly where Phase 10 left them.

Phase 12 was not started.
