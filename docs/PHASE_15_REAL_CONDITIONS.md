# Phase 15 — External verification, and the states it exposed

**From `0153f86`.**

Two parts, in the order the directive set them. The external verification was
attempted first and is **blocked at the network layer** — recorded once, below,
and not waited on. What follows is the state work that could be verified locally,
including two defects the blocked verification itself revealed.

---

## A · External verification — BLOCKED (network/egress)

Every one of the thirteen steps in `docs/PHASE_10_EXTERNAL_VERIFICATION.md`
requires reaching Supabase, an announcer, or the deployment. None is reachable
from this environment.

**Measured, not assumed:**

```
$ curl https://anfiojmbgonrtympzjch.supabase.co/auth/v1/health   →  000
$ curl https://education.gov.ng/                                  →  000  CONNECT tunnel failed, 403
$ curl https://opportunity-x-12b762aa.vercel.app/                 →  000  CONNECT tunnel failed, 403
$ curl https://www.google.com/                                    →  000  CONNECT tunnel failed, 403
```

The proxy's own status endpoint reports the cause:

```
recentRelayFailures: [{ kind: "connect_rejected",
  detail: "gateway answered 403 to CONNECT (policy denial or upstream failure)",
  host: "www.google.com:443" }, …]
```

**Classification, using the directive's taxonomy:**

| Class                               | Verdict                                                              |
| ----------------------------------- | -------------------------------------------------------------------- |
| Code defect                         | **No**                                                               |
| Deployment defect                   | **Undetermined** — the deployment cannot be reached to inspect       |
| Authentication defect               | **Undetermined** — Supabase auth cannot be reached                   |
| Database defect                     | **Undetermined** — the project cannot be reached                     |
| **Network / egress limitation**     | **YES. Single root cause.** All outbound CONNECT is denied by policy |
| Source refusing automated retrieval | **Undetermined** — no source can be reached to ask                   |
| Genuinely empty discovery           | **Undetermined** — discovery cannot run                              |

**A correction to the earlier record.** Phases 10–14 described the blocker as
"announcer egress `403`", which reads as though the announcers were refusing
automated requests. They are not: the sandbox proxy denies **every** host,
including `google.com`. That is an environment fact, not a fact about Nigerian
government websites, and the distinction matters because the second would be a
product finding and the first is not.

**What is confirmed without network access:**

- The project identity in `.env` is `anfiojmbgonrtympzjch` — the Opportunity X
  project. `fbqufjvkzbifklxtouol` (AEON X) appears nowhere in the repository.
- Only public/anon values are committed. `SUPABASE_SERVICE_ROLE_KEY`,
  `ANTHROPIC_API_KEY` and `FIRECRAWL_API_KEY` are all unset here.
- Migration guarantees still hold against a local PostgreSQL: **40/40**,
  including the refusal probes that must error rather than report `UPDATE 0`.

**No account was created, no write was attempted, and nothing was promoted.**
Steps 2–12 remain exactly where Phase 10 left them.

---

## B · What the blocked verification revealed

Attempting the sign-in walk against an unreachable Supabase surfaced a defect
that only appears under exactly these conditions.

### B.1 · The sign-in door blamed the password for the network

```tsx
// src/routes/auth.tsx — before
catch (err) {
  toast.error(err instanceof Error ? err.message : "Authentication failed");
}
```

Every failure landed in one branch. Phase 11 taught the authenticated **gate** to
tell "your token was rejected" from "I could not reach the service"; the sign-in
**form** never learned it.

The consequence is specific and cruel: a person on a bad connection is told their
password is wrong. They retype a correct password, repeatedly, and are told it is
wrong every time — a confident claim about something the system never
established, on the one surface where being wrong locks someone out of their own
account.

**Fixed.** `src/lib/auth-outcome.ts` classifies a failed attempt into five
outcomes, each with what happened, what is still true, and what to do:

| Outcome        | Retryable | The half that was missing                                                       |
| -------------- | --------- | ------------------------------------------------------------------------------- |
| `unreachable`  | yes       | _"This says nothing about your password — I never got far enough to check it."_ |
| `rejected`     | **no**    | _"I did reach the service, so this is an answer rather than a guess."_          |
| `unconfirmed`  | no        | _"Your password may well be correct — confirmation is a separate step."_        |
| `rate-limited` | yes       | _"Your account is fine, and nothing has been locked."_                          |
| `no-session`   | yes       | _"Your details were accepted, and the session didn't arrive."_                  |

Retry is offered only where retrying can help; `rejected` does not offer it,
because the same password will fail again.

It is also **no longer a toast**. A transient message is the wrong surface for
something a person needs to read while retyping the form it refers to. It renders
inline, persistently, with `role="alert"`.

**Verified live, unplanned.** Because Supabase genuinely is unreachable here, the
browser walk drove a real failed sign-in and got:

> _"I couldn't reach the service that signs you in. This says nothing about your
> password — I never got far enough to check it. Your account is untouched."_

The old code would have blamed the credentials. The environment that blocks the
verification produced the proof that the fix is right.

### B.2 · A refresh in flight was presented as current

Nothing modelled a loader re-running **underneath content already on screen** —
which is the most ordinary path in the product. Pressing _Interested_ writes, then
calls `router.invalidate()` to read the declaration back, and for the length of
that read the page showed the previous answer with no indication it was previous.

Smaller than the lies Phase 14 fixed, and the same kind: a surface claiming more
currency than the system possesses.

**Fixed.** `Refreshing` reads the router's own `isLoading` and states it beside
the content:

> _"Checking for new opportunities again — what you see below is the last answer
> I had."_

**A line, not a skeleton.** The content is still true; replacing it with grey
would destroy valid information to report that fresher information is coming, and
would flash the whole page on every declaration. The row is fixed-height so its
arrival shifts nothing.

---

## C · State inventory — what changed since Phase 14

Phase 14's matrix stands. Three rows were missing from it:

| State                                  | Operation                 | Status                                                          |
| -------------------------------------- | ------------------------- | --------------------------------------------------------------- |
| **Authentication failure, classified** | sign-in / sign-up / OAuth | **New** (§B.1)                                                  |
| **Stale while refreshing**             | any loader re-run         | **New** (§B.2)                                                  |
| **Successful refresh**                 | loader re-run completes   | Implicit — the notice clears and the content is the new content |
| Degraded / partial                     | inspection evidence       | Unchanged: contract exists, no reachable specimen (Phase 14 §D) |

No state was invented where the operation cannot produce it. There is still no
polling, no optimistic UI, and no background revalidation, so none of those is
modelled.

---

## D · The laboratory

`/lab/faults` now accepts `?state=<fault>` and renders one state alone, full
page. The list view compares states against each other; it is wrong for
inspecting one, because at 375px the neighbouring rows are always in frame and
every judgement about wrapping and hierarchy is made against rows the person will
never see together.

An unrecognised name falls back to the full list with a note rather than
erroring — a typo in a development URL should not look like a product failure.

Still development-only: every entry point runs `assertDevelopment()` on the
server before doing anything, and no flag exists in production code.

---

## E · Performance — measured

Phase 14 recorded performance as _"unmeasured, and recorded as unmeasured rather
than as passing."_ Measured now.

**Route response** (dev server, cold then warm, median of three):

| Route            | first  | warm   | bytes   |
| ---------------- | ------ | ------ | ------- |
| `/`              | 118 ms | 109 ms | 42.8 KB |
| `/auth`          | 85 ms  | 25 ms  | 5.6 KB  |
| `/opportunities` | 22 ms  | 22 ms  | 4.1 KB  |
| `/saved`         | 21 ms  | 21 ms  | 4.0 KB  |
| `/lab`           | 144 ms | 125 ms | 97.6 KB |
| `/lab/faults`    | 86 ms  | 34 ms  | 12.3 KB |

`/opportunities` and `/saved` are small and fast because they are `ssr: false` —
the shell only; the gate and the read run client-side after it.

**Requests, counted in the browser:**

- **Initial page load: 0 server-function calls.** The loader is server-rendered,
  so there is no client round trip for the first paint.
- **One declaration: exactly 2** — `labDeclare` (the write) then `labSurface`
  (the read-back). That is the Phase 11 contract exactly: no duplicate fetch, no
  N+1, and no read that skips the write.
- **Write plus read-back round trip: 201 ms** end to end, measured from click to
  the confirmed position appearing.

**No caching was introduced.** Speculative caching without an explicit freshness
model is how evidence goes stale while looking current, and nothing measured here
asks for it.

---

## F · Browser verification

Chromium, against the dev server. **56 combinations** for the fault states alone:
7 states × 4 widths (375 / 390 / 768 / 1280) × 2 themes (light / dark), each
driven through the real `ThemeProvider` rather than `prefers-color-scheme`.

| Check                        | Result                                                   |
| ---------------------------- | -------------------------------------------------------- |
| Console errors / page errors | **0** across all 56                                      |
| Horizontal overflow          | **none** at any width                                    |
| Theme actually applied       | verified on `documentElement.className` in all 56        |
| Keyboard                     | focusable elements reached by Tab; focus outline present |
| Auth failure at 375px        | renders all three parts, no overflow                     |
| Reduced motion               | skeleton `animation-duration` computed as `0.01ms`       |
| Phase 11 mutation walk       | **ALL CHECKS PASSED**                                    |
| Phase 14 state walk          | **ALL CHECKS PASSED**                                    |

Light mode at every state is now verified — Phase 14 had recorded it as not
verified.

---

## G · Testing

**270 tests, 0 failing** (264 before). Six new, all in `test/auth-outcome.test.ts`.

**Five mutations, each observed to fail, each reverted:**

| Mutation                                            | Caught |
| --------------------------------------------------- | ------ |
| A network failure classified as a rejected password | ✅     |
| `unconfirmed` merged into `rejected`                | ✅     |
| An implementation detail leaked into the copy       | ✅     |
| Back to `toast.error(err.message)`                  | ✅     |
| The refresh signal hard-wired to `false`            | ✅     |

The classifier is a pure function precisely so the branch a person lands in can
be proved without a browser and without a network — which matters here, since
the network is exactly what is unavailable.

---

## H · Gates

| Gate                            | Result       |
| ------------------------------- | ------------ |
| TypeScript                      | **0 errors** |
| ESLint                          | **0 errors** |
| Tests                           | **270 / 0**  |
| Build                           | **passes**   |
| Migration guarantees            | **40 / 0**   |
| Phase 11 walk                   | **passed**   |
| Phase 14 walk                   | **passed**   |
| Phase 15 walk (56 combinations) | **passed**   |

No AEON X contamination: `fbqufjvkzbifklxtouol`, match scores, Ledger, founder
concepts and legacy judgment surfaces are all absent — `test/consolidation.test.ts`
and `test/standalone.test.ts` still hold that line.

---

## I · Remaining gaps

- **External verification, all thirteen steps.** Single blocker: outbound CONNECT
  denied by policy. Needs an environment with ordinary internet, or the walk run
  by a person. Nothing in the product prevents it.
- **Degraded has no reachable specimen** — `entity/group.ts:145` skips failed
  retrievals so they never join an entity. Unchanged from Phase 14 §D; the
  contract and the surface are built and inert.
- **Preparation (CR-09)** — untouched, per the directive. The dependency is
  recorded in Phase 13 §D and no preparation model was invented.
- **CR-24, CR-25** — still unimplemented, still reported as such.
- **`opportunity_deliveries` has no writer.**
- **`types.ts` is stale**; regeneration needs database access.
- **Nothing has met real data.** Every state above was exercised against fixtures
  and injected faults. The one exception is §B.1, which was verified against a
  genuinely unreachable service — real conditions, by accident.

---

## J · Next

The blocker is environmental and one person-hour of ordinary internet closes it.
Until then, further state work has diminishing returns: the states that remain
unbuilt are the ones whose _data_ does not exist yet.

**Recommended, in order:**

1. **Run the Phase 10 walk from a laptop.** Sections 2–8 need a browser and the
   Supabase dashboard; section 7 needs one bounded `npm run sweep -- ng-fme`.
   That single run would produce the first real observation this product has ever
   held, and turn `absent` from a state that has been rendered into one that has
   been _found_.
2. **Attribute failed retrievals to entities** (`entity/group.ts`). It closes the
   degraded gap and is the same work that lets `opportunity_deliveries` record
   what was shown.
3. Only then, preparation — which needs a schema decision, not more state work.

---

_No live data was manufactured. No account was created. No authentication was
weakened. No deployment was promoted. No retired functionality was rebuilt, and
no preparation model was invented._
