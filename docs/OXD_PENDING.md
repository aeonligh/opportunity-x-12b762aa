# Pending Opportunity X decisions

**Nothing in this file is authority.** Every entry is a draft awaiting product-owner
ratification. A pending decision may not be cited as though it governs, and
`test/authority-self-containment.test.ts` fails if a `PENDING` entry appears in
`docs/OPPORTUNITY_X_DECISIONS.md` or loses its status line.

Four proposals. Each covers a requirement that **governs code a user can reach
today** and that no ratified CR or OXD states. The 45 unresolved citations in
`src/lib/opportunity/foundation/` are deliberately **not** proposed here — see
§4 of `PHASE_24_AUTHORITY_COMPLETION.md`. Drafting rules for capability that no
route can reach would be manufacturing decisions to lower a count.

---

## OXD-PENDING-001

**Requirement:** Opportunity X speaks with certainty only about what it has
observed, and every fact it shows explains in plain language how it was learned.

**Why it is needed:** This is the rule the three absence components exist to
honour, and the one `ProvenanceChip` renders on every card. `UnknownState`
currently says the system "has had no visibility" rather than that nothing
exists — that wording is load-bearing and nothing ratified requires it.

**Historical lineage:** Product Bible §07, cited as "the Visibility Principle".
Also invoked at `person.ts:112/114` and `IA §11`.

**Closest existing CR/OXD:** CR-24 — the person-model must be inspectable and
inference must be labelled.

**Why that authority is insufficient:** CR-24 is scoped to the *person* model —
distinguishing what the system knows about *them* from what it infers about
*them*. The Visibility Principle governs the system's claims about the *world*,
which is a different subject. Searched: no clause of `docs/CONSTITUTION.md`
contains "visibility principle", "certainty only", or an equivalent.

**Affected implementation:** `components/ui/absence/UnknownState.tsx`,
`components/ui/ProvenanceChip.tsx`, and the `unknown` branches of
`lib/opportunity/surface/service.ts`.

**Proposed decision:** Opportunity X may state as fact only what it has
observed and recorded. Where it has not observed something it says so in those
terms, and never as a statement about the world. Every fact it displays carries,
in plain language, how it came to be known.

**Status:** PENDING USER RATIFICATION

---

## OXD-PENDING-002

**Requirement:** The system speaks in the first person about its own limits, and
the user is never the subject of a failure sentence.

**Why it is needed:** Every state message in the product follows this — "I
couldn't read the record", not "your request failed". It is the difference
between a system reporting its own limitation and one implying the person did
something wrong, and it is currently held only by convention.

**Historical lineage:** Brand Bible §03.

**Closest existing CR/OXD:** CR-15 (trust is asymmetrical) and CR-16 (the
friction test).

**Why that authority is insufficient:** Neither addresses grammatical subject or
voice. CR-15 concerns how trust is lost and regained; CR-16 concerns whether a
step is worth its friction. Applying either here would be a thematic
association, not authority.

**Affected implementation:** `components/ui/absence/UnknownState.tsx`,
`AbsentState.tsx`, `EmptyState.tsx`, `components/ui/state/SurfaceError.tsx`,
`RefreshFailed.tsx`, and `lib/sign-out.ts`.

**Proposed decision:** When Opportunity X reports a limitation, a failure or an
absence, it is the grammatical subject of the sentence. The person is never
described as having caused, failed or triggered it.

**Status:** PENDING USER RATIFICATION

---

## OXD-PENDING-003

**Requirement:** An absence reported as a finding carries the time the search was
made.

**Why it is needed:** "Nothing is open" is only actionable if the reader can see
how recent the "now" is. `AbsentState` takes `searchedAt` as a required prop
today, and nothing ratified requires it to.

**Historical lineage:** Brand Bible §03 — "confidence without provenance is just
tone, so the search timestamp is mandatory, not decorative."

**Closest existing CR/OXD:** OXD-001 — the three absences are distinct states.

**Why that authority is insufficient:** OXD-001 requires the three states be
distinguishable and separately worded. It says nothing about timestamping, and
an absence could satisfy OXD-001 completely while being undated.

**Affected implementation:** `components/ui/absence/AbsentState.tsx`,
`lib/opportunity/surface/service.ts` (`{ state: "absent"; searchedAt }`).

**Proposed decision:** A verdict of absence is displayed with the time the
search that produced it was made. An absence that cannot be dated is reported as
unknown instead.

**Status:** PENDING USER RATIFICATION

---

## OXD-PENDING-004

**Requirement:** Declining is offered at the same reach and weight as accepting,
and a withdrawal leaves a trace rather than deleting the record.

**Why it is needed:** `InterestedControl` places decline beside interest at equal
prominence, and `opportunity_pursuits` is append-only between declarations
precisely so that "I was interested in March and not in June" stays legible.
Both are deliberate and neither is required by ratified authority.

**Historical lineage:** Experience Bible §10, cited three times.

**Closest existing CR/OXD:** CR-26 — discouragement requires a higher evidence
bar than recommendation.

**Why that authority is insufficient:** CR-26 governs the evidence the *system*
needs before discouraging someone. This requirement governs the affordance
offered to the *person* for their own decision. Opposite direction, different
actor.

**Affected implementation:** `components/opportunity/InterestedControl.tsx`,
`lib/opportunity/pursuit/{types,log,stance}.ts`, and the append-only guarantee in
`supabase/migrations/`.

**Proposed decision:** Where Opportunity X offers a person a positive
declaration, the corresponding negative declaration is offered at the same reach,
weight and cost. A withdrawn or reversed declaration is retained as history, not
deleted.

**Status:** PENDING USER RATIFICATION
