# Phase 19 — Authenticated Shell & Session Lifecycle

## A. Authority

`docs/CONSTITUTION.md` is **silent on navigation, shells and session
lifecycle**. No CR addresses them, and none was invented. The shape of this
shell is therefore a product decision, recorded here, and constrained by four
ratified requirements that bear on it:

| | |
|---|---|
| **CR-13** — attention is the scarce resource | Opportunity is not scarce; attention is. Every pixel of persistent chrome is attention not spent on evidence. A shell is the easiest place in a product for chrome to accumulate without anyone deciding that it should. |
| **CR-16** — the friction test | Every feature must answer *what friction does this remove?* If none, it should not exist. |
| **CR-17** — beauty must never reduce access | Accessibility beside beauty, not after it. Degrade gracefully across device and capability. |
| **CR-04** — success is never engagement | Not application volume, not time spent. So the shell must not be built to keep anyone in the product. |

Phases 15, 17 and 18 supplied the session-state vocabulary this phase reuses
rather than re-invents: `signed-in / signed-out / unverifiable`, the bounded
session check, and the read-back discipline for writes.

---

## B. Shell design decision

### The friction it removes — exactly two things

1. **Peer navigation was incoherent.** `/opportunities` carried a link reading
   "What you've saved"; `/saved` carried "← Opportunities". The same two peer
   surfaces looked like a parent and a child depending on which one you were
   standing on, and each page hand-rolled its own wording and position.
2. **There was no way to sign out.** `grep -rni "sign out|logout" src/` returned
   nothing before this phase. The *mechanism* was correct and wired — `__root`
   honoured a `SIGNED_OUT` transition and re-ran the gate — but the affordance
   did not exist.

It removes nothing else, so it does nothing else.

### What it is

A single slim bar: the brand mark, two destinations, the account address, and
the way out. Then `<main>`.

### What it is not, and why

| Rejected | Reason |
|---|---|
| **Sidebar** | Spends horizontal space permanently, and horizontal space is where an opportunity's evidence lives. Two destinations do not need a column. |
| **Sticky/fixed header** | Costs its height on every screen for the whole session — about a seventh of a 375px viewport — to hold two links and a control used once. It scrolls away, which is what "the shell recedes behind the evidence" has to mean in layout rather than in tone. |
| **Hamburger** | An answer to having more destinations than fit. There are two. Hiding two links behind a press *adds* the friction this exists to remove. |
| **Bottom navigation** | Same objection, plus permanent vertical space on the smallest screens. |
| **Counts or badges beside Saved** | A number invites checking it. CR-04 is explicit that success is never engagement. |
| **A dropdown for the account** | One action. A menu around a single item costs a press, a focus trap, Escape handling and an `aria-expanded` state, and returns nothing a button does not. |

### One decision reversed during the phase

The brand mark started as a link home, by convention. It is now inert.

`Link` sets `aria-current="page"` itself whenever the location matches, so on
`/opportunities` **both** the mark and the Opportunities link claimed to be the
current page — and `activeProps` cannot take it back. "Current page" stops
meaning anything when two elements are it. The test caught it before the browser
did.

The second reason is the one that settles it: CR-16 asks what friction a thing
removes, and a link to `/opportunities` sitting immediately beside a link to
`/opportunities` removes none.

---

## C. Navigation decision

Two destinations, both always visible, at every width. No disclosure of any
kind.

- `/opportunities` — matches its **whole section**: a detail page and the
  examples page are still Opportunities.
- `/saved` — matches **only itself**.

The current destination is carried by `aria-current="page"` *and* an underline —
never by colour alone, which disappears under forced colours and for anyone who
cannot separate the two hues (CR-17).

**Leaves keep their own way back.** `$id` and `examples` still carry
"← Opportunities". That is hierarchical return — reached *from* the list,
returning *to* it, positioned beside the content — and it is a different thing
from peer navigation, which now lives in exactly one place.

Verified against a **real router** over the real generated route tree
(`test/render-shell.ts`), not by reading `activeProps` out of the source:

| Location | Marked current | Count |
|---|---|---|
| `/opportunities` | `/opportunities` | 1 |
| `/opportunities/abc-123` | `/opportunities` | 1 |
| `/opportunities/examples` | `/opportunities` | 1 |
| `/saved` | `/saved` | 1 |

---

## D. Sign-out lifecycle

### The rule

**A sign-out is a write, and this product does not call a write confirmed until
a read confirms it.** The declaration control has worked that way since Phase 15.
The session had no way to be ended at all, so it had no such rule; it does now.

`signOut()` returning cleanly is not the answer. It is the *request*. The answer
is what a subsequent read of the session says.

```
                   ┌── read back says: no session ──→ SIGNED OUT   (may navigate)
signOut() ─────────┼── read back says: still there ─→ FAILED       (stays put)
  (error or not)   └── read cannot be made ─────────→ UNVERIFIABLE (stays put)
```

The request's own error is used only to *explain* an outcome the read
established — never to decide one.

### The two cases nobody would hand-write

- **A request that rejected while the session is gone is a success.** `signOut()`
  can reject with the server having already ended the session — a response lost
  coming back, a socket closed after the row was deleted. Reporting failure
  there leaves someone believing they are still signed in when they are not.
- **A request that resolved while the session is still readable is a failure.**
  The write-succeeded-read-disagrees case, and the honest report is that the
  person is still signed in.

Both are in the laboratory, and both are in the browser matrix.

### On confirmed sign-out, in this order

1. `forgetEverythingLastGood()` — `last-good` holds whatever each surface last
   successfully showed, so a failed refresh cannot erase it. Across a sign-out
   that stops being a safeguard and becomes a leak: the next person to sign in
   on this tab would see the previous person's list the first time a read
   failed. **Phase 17 wrote this function for this moment and recorded that
   nothing called it yet.** This is the caller.
2. `router.invalidate()` — the gate re-evaluates, so nothing authenticated
   survives the transition.
3. `navigate({ to: "/auth", replace: true })` — last.

A test asserts all three run *after* the outcome is known to be a sign-out, and
in that order.

### On failure

The person stays exactly where they are, is told the session did not end and
that they are still signed in, and is offered a retry — because a retry can help
here. The sentence **"you have been signed out"** must never appear on this
branch; said on a shared machine, that is how somebody else reads your saved
opportunities.

### On unverifiable

Neither claim is available, so neither is made. The person is told it cannot be
determined, and told the one thing that is actually safe on a shared machine:
close the browser. The read-back is bounded by `SESSION_CHECK_DEADLINE_MS`
(8s, Phase 17), so a dead auth host produces this in seconds rather than leaving
a control spinning.

### Duplicate submission

One press must not start a second sign-out against a session the first may
already have ended. Guarded in the handler (`if (pending) return;`) rather than
by the `disabled` attribute — see §H for why that changed.

### A defect the browser caught

`startTransition(() => void run())` returns the instant `run()` is *started*, so
`pending` flipped true and false again within a frame and the control never
showed anything. The three-second specimen exposed it. React 19 keeps a
transition pending for as long as the async function it was given has not
settled, which is the whole duration a sign-out is actually in flight.

---

## E. Session-state model

Nothing new was added. The shell reuses the Phase 15/17/18 classification, and
the states stay distinct:

| Situation | Resolves to | Shell renders |
|---|---|---|
| initial check in flight | pending | **no shell** — the gate's `BrandLoader` |
| signed in | `signed-in` | the shell |
| session expired | `signed-out` | **no shell** — pre-hydration document redirect to `/auth` (Phase 18 §A) |
| session ended in another tab | `signed-out` via `onAuthStateChange` → `router.invalidate()` → gate re-runs | **no shell** |
| Supabase unreachable while authenticated | `unverifiable`, bounded at 8s | **no shell** — the session boundary, which does *not* say signed out |
| protected deep link while signed out | `signed-out`, destination carried | **no shell** |
| signing out | pending | shell, control busy |
| sign-out confirmed | `signed-out` | shell unmounts, `/auth` |
| sign-out failed | still `signed-in` | shell stays, inline alert |

**No authenticated chrome renders before authentication is known** — by
construction, not by a flag. The shell is the gate's `component`, which the
router reaches only when `beforeLoad` returned a signed-in context. The pending
branch and both failing branches render other things.

---

## F. Deep links

Unchanged and unweakened. The gate carries `location.href` — path *and* query —
and `/auth` re-validates it through `safeRedirectPath` before honouring it.
Phase 18 hardened that allowlist to 24 hostile inputs, including schemes carried
inside an allowed prefix; nothing here relaxes it.

A test asserts the shell cannot be bypassed: every protected surface remains
under `/_authenticated/`, and both list routes have had their hand-rolled peer
links removed rather than merely hidden.

---

## G. Mobile

Designed at 375 first, not shrunk from desktop.

At 375 the address is **hidden** and the way out is **not**: orientation can
yield, the exit cannot. Both destinations stay visible — hiding two links behind
a press would add friction, not remove it. The bar wraps rather than scrolls,
and the header is not fixed, so nothing covers content.

Verified at 375 / 390 / 768 / 1280 × light/dark: navigation landmark present,
both destinations and only those, the way out visible, no horizontal overflow,
header not fixed or sticky, console clean — 48 checks.

---

## H. Accessibility

| | |
|---|---|
| semantic navigation | one `<nav aria-label="Opportunity X">`, one `<main>`, one `<header>` — no nested or duplicate landmarks |
| current page | `aria-current="page"`, exactly one, verified against a real router |
| not colour alone | underline plus the attribute |
| keyboard traversal | Opportunities, Saved and the account control all reachable; each shows a focus indicator |
| keyboard operation | sign-out completes by keyboard alone |
| pending semantics | `aria-busy`, and the label changes to "Signing out…" |
| **`aria-disabled` vs `disabled`** | see below |
| error association | `role="alert"` on both non-success outcomes — the one case where interrupting is proportionate, because the person may be about to walk away from the machine believing something untrue |
| `aria-live` restraint | no live region for anything else in the shell |
| reduced motion | nothing in the header animates |
| touch targets | the account control is `px-4 py-2` on an 11px font — comfortably above 24px, below the 44px ideal (§N) |

### The focus defect, measured and fixed

Pressing Sign out by keyboard and having it fail **dropped focus to `<body>`**.
A focused button that becomes `disabled` is blurred by the browser, and nothing
puts focus back when it is re-enabled — so the person pressed a control, an
alert appeared below it, and their place was gone.

`aria-disabled` keeps the element focusable and still announces it as
unavailable. Focus now stays on the control that was pressed and the retry is
one Tab away. The double-press the platform no longer refuses is refused in the
handler instead, and a test asserts both halves — because removing the
attribute without adding the guard would leave nothing.

---

## I. Failure induction

`/lab/session`, development-only, linked from `/lab`.

Each specimen is the **real** `AccountControl` calling the **real**
`performSignOut`. What is substituted is only the two calls that machine makes
on the network. Nothing returns a pre-baked outcome: a laboratory that hands the
control a finished answer proves the control can render an answer, not that the
product can arrive at one.

| Specimen | `signOut()` | read-back | outcome |
|---|---|---|---|
| Signed out, and confirmed | resolves | no session | **signed-out** → navigates |
| The request failed | errors | session present | **failed** |
| Failed, and the session is gone anyway | errors | no session | **signed-out** |
| Succeeded, and the session did not end | resolves | session present | **failed** |
| I can't tell whether it worked | errors | unreachable | **unverifiable** |
| Slow, and honest about it | resolves after 3s | no session | **signed-out**, pending observable |

There is no server function to guard because there is no server: every rig is a
local closure, and no credential, session or database is involved. No production
path can reach the seam — `signOutWith` is undefined there, and the control
falls through to the real Supabase client.

**Not reproduced here, deliberately:** session expiry and a session ending in
another tab both arrive as an ordinary signed-out answer *from the gate*, and an
unverifiable session is the gate's third branch with its own bounded wait.
Rigging them here would demonstrate this page's opinion of the gate instead of
the gate; they are covered where they live.

---

## J. Browser verification

`bun run verify:states` — **210 checks**, up from 133 at the close of Phase 18.

New in this phase: the shell at 4 widths × 2 themes (48), the six sign-out
outcomes with their exact wording, the pending state, focus preservation across
a failure, keyboard reach and keyboard operation, and reduced motion in the
header.

**This is the fixture environment.** No session exists in this sandbox, so the
shell is exercised through `/lab/session` — the real component, the real state
machine — rather than on `/opportunities`. What that leaves unverified is
recorded in §N.

---

## K. Security verification

`bun run verify:artifact` — **22 assertions on the built output**, all passing.
No service-role credential, no Anthropic key, no fixture corpus, no AEON X or
Lovable residue, no `~oauth` path, server-only modules absent from the client.

The consolidation sweep found six textual hits and every one is inside a comment
describing history, not live code: `/workspace` in the safe-redirect docstring
as an example of a hostile URL; "System B" as part of "Component System
Bible §01", a *document* name; `matchScore` in a comment describing what was
removed from the globe; `next/` likewise; and `saved_opportunities` in two
comments plus the **generated** `types.ts`. That table still exists in the
database — Phase 13 deliberately did not drop it — and no code reads or writes
it: the application touches exactly three tables, pinned by test.

**The shell is presentation and is not an authorization boundary.** It renders
inside the gate; it does not decide anything. Every protected read remains
behind `requireSupabaseAuth` on the server, scoped by the person's own token.

---

## L. Performance

| | Phase 18 | Phase 19 |
|---|---|---|
| client bundle (JS + CSS) | 1,965,519 B | 1,977,018 B (**+11,499 B, +0.59%**) |
| documents on a signed-out deep link | 2 | 2 (unchanged) |
| shell hydration (`/lab/session`) | — | **77ms** — the cheapest route measured |
| shell navigation | — | **0 documents, 0 auth calls** |
| duplicate session reads | 0 | 0 |

No client-side session fetching was added. The shell reads the user from the
route context the gate already produced — `beforeLoad` runs one `getUser()` and
the shell reuses its result, so rendering an address costs nothing.

The +11.5 KB is the shell, the account control, the sign-out machine and the
session laboratory.

---

## M. Remaining gaps

Carried forward from Phase 18, deliberately untouched (§P of the directive):

1. **Anthropic / `callClaude`** — the sanctioned AI entry point has no callers
   and no request ships. Needs a founder decision.
2. **Degraded partition reachability** — `entity/group.ts:145` still drops
   non-retrieved observations, so the degraded surface is inert in production.
3. **`opportunity_deliveries` writer** — table, triggers and an in-memory log
   exist; nothing writes.
4. **Phase 16 external verification** — unchanged, see below.

New and small:

5. **Touch target size.** The account control is comfortably above 24px but
   below the 44px commonly recommended. Enlarging it means giving more of a
   375px bar to a control used once, which is the CR-13 trade-off in miniature.
   Recorded rather than silently chosen.

```
PHASE 16:
NOT COMPLETE
BLOCKED — EXTERNAL ENVIRONMENT

Required:
- education.gov.ng egress
- anfiojmbgonrtympzjch.supabase.co egress
- SUPABASE_SERVICE_ROLE_KEY
```

Frozen at `a149899`, not reopened, not simulated.

---

## N. Explicitly unverified

Honest limits of what this sandbox can establish. **None of the following is
claimed as verified.**

| Item | Why not | Status |
|---|---|---|
| The shell on the real `/opportunities` and `/saved` | No session can be created here — Supabase is not reachable and no credential exists. The shell was exercised through `/lab/session` with the real component and machine. | **UNVERIFIED** |
| A real Supabase `signOut()` round trip | Same. Every specimen substitutes the two network calls. | **UNVERIFIED** |
| Natural session expiry | Requires a real session that ages out. | **UNVERIFIED** |
| A session ending in a genuine second tab | The listener and the invalidation path are covered by test; the two-tab behaviour is not. | **UNVERIFIED** |
| Deep-link return *after a real sign-in* | The allowlist and the carry are verified; the round trip through a real Google/password sign-in is not. | **UNVERIFIED** |
| Behaviour on real mobile hardware | Emulated viewports only; no touch, no real device. | **UNVERIFIED** |
| Screen-reader announcement in an actual screen reader | Roles, labels and live regions are asserted in rendered output; no AT was driven. | **UNVERIFIED** |
