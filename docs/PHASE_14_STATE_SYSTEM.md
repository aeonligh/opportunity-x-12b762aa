# Phase 14 — The State System

**From the Phase 13 checkpoint.**

> A visual state must never claim more certainty than the underlying system
> possesses.

Phase 11 established that the states must be *distinguishable*. Phase 14
establishes **what each one is allowed to say** — and found three places where a
surface was still claiming more than the system knew.

---

## A · Audit: what states each operation can actually produce

The canonical product after Phase 13 is small enough to enumerate completely.

| Operation | Entry | States the contract genuinely produces |
|---|---|---|
| Opportunity list | `listOpportunities` → `resolveCards` | loading · **cards** · **absent** *(new)* · unknown · error |
| Opportunity detail | `getOpportunity` → `resolveInspection` | loading · inspection · not-found · unknown · error |
| Saved | `listSaved` → `resolveDeclarations` | loading · declarations · empty · unknown · error |
| Declaration read | `pursuitsFor` / `pursuitFor` | declared · undeclared · **unreadable** *(new)* |
| Declaration write | `declarePursuit` → `performWrite` | idle · saving · refused · failed · stale |
| Withdrawal | `withdrawPursuit` → `performWrite` | same five |
| Session | `_authenticated` gate | resolving · signed-in · signed-out · unverifiable |
| Examples | `fixtureOpportunities` | loading · success · error |
| Evidence completeness | `projectInspection` | complete · **degraded** *(new contract, unreachable — §D)* |

**Not implemented, because the operation cannot produce them:** optimistic UI
(nothing here is optimistic by design), polling or refresh (nothing polls),
read-after-write uncertainty beyond the existing `stale` phase, and a degraded
state for the *list* (§D).

---

## B · The three defects

### B.1 · A failed declaration read rendered as the person's silence

```ts
// src/lib/opportunity/surface/service.ts — before
catch { return UNDECLARED; }
```

`pursuitFor` swallowed every failure into `{ state: "undeclared" }`, so a read
that **did not happen** rendered as *"You haven't said either way."* — a claim
about what the person did, produced by a system that could not look.

This is the declaration layer's version of showing an empty list when the corpus
is unreadable, and it is the exact sentence §6 names as forbidden. The engine
refuses that collapse everywhere else; this was the one layer with only two
states where it needed three.

**Fixed.** `PursuitResolution` gains `{ state: "unreadable"; because }`, carried
through `deriveStance` (where a total ternary would otherwise have folded it
straight back into `"undeclared"` while compiling cleanly) and rendered by
`InterestedControl` as its own sentence.

The control also **disables the buttons** in that state and says why. A
declaration is append-only: offering a position over one nobody can see would let
someone record a second declaration on top of one they had already made, without
being able to tell that they had.

### B.2 · "Nothing is open" was rendered as a blank page

`resolveCards` had two states — `cards` and `unknown` — so a corpus that had been
consulted and yielded nothing returned `{ state: "cards", cards: [] }`, and the
route rendered two empty sections.

Three unlike facts arrived at the same blank screen: *I could not look*, *I have
never looked*, and *I looked and there is nothing right now*. Only the third is a
claim about the world, and it is CR-20's first-class output.

**Fixed.** `CardsResolution` gains `{ state: "absent"; searchedAt }`, rendered
with `AbsentState`. Nothing new had to be known — `searchedAt` was already on the
success case and the surface was discarding it.

### B.3 · A dead link survived a route deletion

`DeclarationRow.href` was built as `` `/opportunity/${entityId}` `` — a route
Phase 13 retired. Nothing read it, which is why TypeScript did not catch it: a
hand-assembled URL string is invisible to the router's types. Removed.

---

## C · The canonical state vocabulary

| State | Means | May never render as |
|---|---|---|
| **LOADING** | Actively obtaining | an answer |
| **SUCCESS** | Obtained; render it | — |
| **EMPTY** | Succeeded; genuinely nothing | a failure |
| **ABSENT** | Searched; found nothing. A finding, with a time | not having looked |
| **UNKNOWN** | Cannot establish | a finding about the world |
| **ERROR** | Failed; the result cannot be trusted | an empty result |
| **DEGRADED** | Some succeeded, some failed | complete |
| **PENDING MUTATION** | Dispatched; persistence unestablished | committed |
| **MUTATION SUCCESS** | Persisted **and read back** | — |
| **MUTATION FAILURE** | The requested state was not established | a cleared control |
| **READ-AFTER-WRITE UNCERTAINTY** | Written; the result cannot be read | either neighbour |

The last one is Phase 11's `stale`, kept because the architecture genuinely
produces it: the write and the read that reveals it are separate operations that
fail separately.

---

## D · The degraded state — implemented as a contract, unreachable in practice

This is the phase's honest finding, and §8 anticipated it exactly.

**The contract is real.** Every observation records its own outcome: `answered`
is false when the retrieval failed, and `unreadable` carries the reason when a
page replied with nothing legible. `projectInspection` now projects
`evidence: { consulted, answered, unreadable, unreachable, degraded }` from
those, and `OpportunityInspection` renders *"Built from 2 of 3 sources. 1 didn't
answer."* above the source list — absent entirely when nothing failed.

**Nothing can currently reach it.**

```
src/lib/opportunity/entity/group.ts:145
    if (!isRetrieved(observation)) continue;
```

A failed retrieval is skipped during grouping, so it never joins an entity, never
appears in `entity.resolution.observationIds`, and never reaches the inspection.
The observation exists in the store; the entity does not carry it.

**A fixture was written to demonstrate the state, and removed**, because it could
not: it rendered two sources and had no way to say a third was attempted.
Manufacturing partiality at the projection layer is precisely what §8 forbids, so
the branch stays unreachable and `test/state-system.test.ts` asserts that it is —
with a note saying that when the test starts failing, the gap has closed.

**What closing it requires**, per §8's checklist:

1. **Contract:** already built (`evidence`, above).
2. **Engine change:** entity resolution must attribute failed retrievals to
   entities. Content cannot do it — there is no content — so it needs URL
   ancestry or the existing `relatedTo` edge.
3. **Constitutionally compatible?** Yes, and arguably required: CR-36 retains
   duplicate observations as evidence, and `observation/types.ts` already states
   *"a fetch failure against a known entity is itself an observation."*
4. **Surface:** built, and inert until 2 lands.
5. Recorded here as an explicit architectural gap.

---

## E · Loading primitives, chosen per operation

| Operation | Primitive | Why |
|---|---|---|
| Opportunity list | Content-shaped skeleton, 3 cards | Structure known; minimises layout shift |
| Opportunity detail | `InspectionSkeleton` | Only the always-present sections — a placeholder for *Sources disagree* would imply a contradiction before one is read |
| Saved list | Row-shaped skeleton | The page renders lines, not cards; a card-shaped placeholder is a layout shift dressed as a courtesy |
| Declaration write | **A sentence, not a spinner** | *"I'm recording 'Interested'. Nothing is kept until I've confirmed it."* — the second clause is what distinguishes pending from success, which no spinner conveys |
| Session verification | Full-page `BrandLoader` | Nothing below the gate may render |
| Examples | Skeleton | Same shape as the live list |

**No spinner was added anywhere.** §4 asks for the correct primitive rather than a
mechanical one, and every waiting surface here either has a known shape or has
something specific to say.

**Motion.** A correction: this phase added a global `prefers-reduced-motion` block
and then **removed it**, because one already existed at the foot of `styles.css`
covering `*`, `*::before`, `*::after`. The gap I set out to close was not there.
The test now asserts the universal rule exists **and that it is not duplicated**,
and was verified in a browser with `reducedMotion: "reduce"` — the skeleton's
computed `animation-duration` is `0.01ms`.

---

## F · The declaration control as a state machine

```
UNDECLARED ──press──► SAVING ──write ok──► READ-BACK ──ok──► DECLARED
                        │                      │
                        │                      └──fails──► STALE (written, unshown)
                        ├──refused──► REFUSED (a limit, not a fault)
                        └──throws───► FAILED (nothing written; prior truth restated)

UNREADABLE ──► buttons inert, reason stated, no position claimed        (new)
```

`aria-pressed` reads `pursuit` and nothing else. There is no code path on which
it can mean "a request was sent" — verified by rendering the control in each
state and by seven mutations, one of which broke exactly that and was caught.

---

## G · Testing

**264 tests, 0 failing** (251 before). `test/state-system.test.ts` adds 13, all
behavioural: real functions run, real components rendered.

**Seven mutations, each observed to fail, each reverted:**

| Mutation | Caught |
|---|---|
| `unreadable` folded back into `undeclared` in the stance | ✅ |
| Control treats `unreadable` as silence | ✅ |
| Buttons live over an unknown position | ✅ |
| `absent` collapsed into `unknown` | ✅ |
| `degraded` hard-coded `false` | ✅ |
| A fault removed, leaving a branch unreachable | ✅ |
| The universal reduced-motion rule deleted | ✅ |

**Four of my own assertions were vacuous on the first pass.** Recorded because
each miss is a different mechanism, and §16 is right that this is where tests
usually fail:

1. `/<button[^>]*\bdisabled\b/` matched **`disabled:opacity-50` inside the
   Tailwind class list**, so it counted two disabled buttons on a control whose
   buttons were fully live. Now `\sdisabled=""`.
2. The union parser sliced to the first `;` after the first member, capturing
   exactly one state per union — always the success one, which the test then
   skips. It checked nothing and kept passing when a fault was deleted. Now
   brace-depth tracked, and it asserts it parsed more than one state.
3. The reduced-motion check sliced from the first `@media` to end-of-file, so a
   later block satisfied it after the rule under test was deleted.
4. The degraded partition (`answered + unreadable + unreachable === consulted`)
   holds trivially at `0 + 0 + 0`. Now driven with observations that genuinely
   failed, built by the real `witness`.

An existing test in `test/surface.test.ts` also asserted the literal substring
`"!canPersist ?"` and broke the moment that expression gained a clause — having
never checked the behaviour it described. Replaced with a rendered assertion.

---

## H · The laboratory

**`/lab/faults` — new.** Failure injection that produces *operations*, not props.

`src/lib/opportunity/surface/faults.ts` returns the genuine
`CardsResolution` / `InspectionResolution` / `DeclarationsResolution` a failing
read produces; three server functions in `lab.server.ts` hand them out by name
behind the existing `assertDevelopment()`. The page then branches exactly as the
authenticated routes do — so a route that mapped `unknown` to an empty list would
be visibly wrong there and **could not be fixed by editing the lab page.**

No flag exists, nothing branches inside production code, and a fault must be
asked for by name by a caller production does not have.

`/lab/states` (presentational comparison) and `/lab/mutations` (write states) are
unchanged and still pass their walks. A test asserts the fault list covers every
non-success state of every resolution union, so a state added without a fault
leaves a surface nobody can look at — and fails the suite.

---

## I · Gates

| Gate | Result |
|---|---|
| TypeScript | **0 errors** |
| ESLint | **0 errors**, 9 warnings (pre-existing, `src/components/ui/`) |
| Tests | **264 / 0** |
| Build | **passes** |
| Migrations | **40 / 0** |
| Phase 11 mutation walk | **ALL CHECKS PASSED** |
| Phase 14 browser walk | **ALL CHECKS PASSED** |

**Browser** (Chromium): `/lab/faults` at 1280 and 375, `/lab/states` at 390,
`/lab` at 768 with `reducedMotion: reduce`. No console errors, no page errors, no
horizontal overflow at any width. The three absences verified to render three
different sentences; no unknown state claims a finding; reduced motion confirmed
applied by computed style.

**Not verified in a browser:** light mode at every new state, 1280 for
`/lab/states`, and the degraded banner — which has no reachable specimen (§D).
Called unverified rather than assumed.

---

## J · Remaining gaps

- **Degraded is unreachable** until failed retrievals are attributed to entities
  (§D). The contract, the surface and the test are in place; the engine change is
  not.
- **`opportunity_deliveries` still has no writer** — unchanged since Phase 12.
- **CR-24, CR-25, CR-09 preparation, CR-08 reminders** remain unimplemented, as
  Phase 13 left them. Not touched, per §13.
- **`types.ts` is stale**; regeneration needs database access.
- **Nothing has met real data.** `auth.users` = 0, zero observations, announcer
  egress `403`. Every state above was exercised against fixtures and injected
  faults. The `absent` state in particular has never been produced by a real
  search, because no search has ever run.

---

## K · Next

The single highest-value thing remains what it was after Phase 10: **run the
external verification.** One confirmed account and one bounded sweep would turn
most of the "fixture-verified" claims in this report into measured ones — and
would produce the first real `absent` or `cards` state the product has ever seen.

The natural engineering follow-on is the §D engine change: attributing failed
retrievals to entities would make the degraded state reachable, and it is the
same work that would let `opportunity_deliveries` record what was shown.

---

*Phase 15 was not started. Phases 10–13 were not reopened. No live data was
manufactured, no authentication was weakened, no retired functionality was
rebuilt, and no state was implemented that the architecture cannot honestly
produce.*
