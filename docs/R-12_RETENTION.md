# R-12 — The Retention Boundary of the Engine of Discovery

**Question, epistemic rather than operational:**

> What evidence must remain available for Opportunity X to later prove what it
> knew, when it knew it, what it believed, why that belief changed, and whether
> it failed the person?

---

## The principle

Two facts about the system's own outputs divide the boundary cleanly.

**Observations are irreducible. Judgments are reproducible.**

An observation records what a source claimed at a moment. It cannot be
regenerated — the moment is gone. A judgment is a function of evidence and logic;
given both, it can be recomputed.

**But reproducibility has a precondition that is easy to lose.** Recomputing a
judgment with *today's* logic does not recover *what was believed then* — it
recovers what would be believed now given then's evidence. Those differ, and the
difference is exactly what an accountability question turns on.

> **A judgment is Class C only if the logic version that produced it is retained.
> Without versioning, every judgment becomes Class A.**

This is why extraction/parser version is constitutional evidence despite being a
few bytes: without it, nothing downstream is reconstructible.

### The second principle — evidence must be held, not borrowed

Relying on the source to still be there is relying on a third party's retention
policy. R-13 established that `ulesarb.org` exists only for one competition and
may lapse; R-01 established that sources reorganise. **If Opportunity X can only
prove what it knew by re-fetching, its accountability depends on a party outside
its control** — structurally the same dependency CR-19 forbids and C-18 flags,
relocated to the system's own auditability.

> **Evidence sufficient to reconstruct a claim must be held by Opportunity X, not
> by the world.**

### The third principle — retention depth scales with irrecoverability

R-13's four topologies do not impose equal burdens:

| Topology | Recoverable later? | Retention depth |
|---|---|---|
| **Mutable page** (Chevening) | **No** — re-fetching returns the new state | Full content. The observation is the *only* record. |
| **Ephemeral domain** (DCP) | **No** — may vanish entirely | Full content |
| **Accumulating artifact** (FSB PDFs) | Nominally, until reorganised | Full content of first observation; subsequent identical fetches need only timestamps |
| **Platform-hosted** (webinars) | **No** — inert after the event | Full content |

Three of four are unrecoverable. **"We can fetch it again" is not a retention
strategy.**

---

## The nine cases

### 1 · 2020/21 FSB advert still served after closure

The observation is valid — a live claim, correctly recorded. What must persist is
that **we saw it, when, and that the source was still serving it.** That is
evidence about *source behaviour*, feeding source credibility under FPR-01.

**A:** retrieval timestamp · source identity · URL · content.
**C:** the conclusion "expired" — recomputable from stated dates and the calendar.

### 2 · One BEA opportunity at three URLs

**All three observations are Class A.** Collapsing to a canonical URL destroys the
evidence entity resolution acted on — and if the resolution was wrong, the
originals are the only way to discover it.

**A:** three observations · the resolution decision · its rationale · any later
correction.
**B:** the current entity graph — a mutable view, never a substitute.

### 3 · `-FINAL` / `-corrected` with no supersession link

**The absence of a link is itself a fact about the source.** Both documents are
Class A; the inferred supersession is Class C, but only while the evidence for it
survives.

### 4 · Chevening's mutable timeline — one URL, many cycles

**The case that settles the raw-content question.** Store "current state of URL"
and every prior cycle's claim is gone. A hash proves change occurred but cannot
reconstruct what was claimed.

**A: content as observed, per observation.** For mutable sources the observation
is the sole surviving record of the claim.

### 5 · DCP on an ephemeral domain

Once `ulesarb.org` lapses, the only record of the official claim is what was
retained. Reinforces principle two.

### 6 · Aggregator as first evidence

**A**, with particular force. Retaining *that the first claim came from an
aggregator rather than the official source* is precisely the evidence C-18 needs
to be measurable. **Discard first-observation provenance and aggregator
dependency becomes unmeasurable** — which, under the compliance-shaped failure
class, is how the founder's ratification (*aggregators may be sources but never
required intermediaries*) would quietly become unenforceable.

Observable metric: the distribution of first-observation provenance, official
versus aggregator, over time.

### 7 · Conflicting claims about open/closed

All conflicting observations are **A**. The conflict *is* the evidence, and the
card requires a state to express it. The reconciliation is **C**, versioned.

### 8 · Verified, later unverified

**The state transition is Class A, not merely the current state.** CR-11's audit
test — *has anything ever gone verified → unverified?* — is impossible against
current-state-only storage. Transition history is what makes the rule auditable.

### 9 · An observation that turns out to have been wrong

A precision point: **an observation cannot be wrong about what was claimed.** It
recorded what the source said. What can be wrong is the *extraction* or the
*judgment*.

CR-37 therefore resolves this cleanly: the original stands; a correction is a
**new record referencing it.** Corrections are additive, never destructive.

---

## Classification

### Class A — Constitutional evidence · permanent

| Item | Why |
|---|---|
| Retrieval timestamp | CR-08 — "when did we know" |
| Source identity and URL as observed | Provenance; C-18 measurement |
| **Content as observed** | Irrecoverable for 3 of 4 topologies |
| **Extraction / parser version** | Without it nothing is reproducible |
| Entity-resolution decisions, rationale, corrections | Reshapes everything downstream |
| **Verification state transitions** | CR-11's audit test needs history, not state |
| **Delivery events** — what, to whom, when | CR-08 is unadjudicable without them |
| **Eligibility determination at delivery time** | CR-08 says *eligible* person |
| First-observation provenance | The C-18 metric |
| **Explanations actually shown to a person** | We are accountable for what we said |
| Fetch failures against known entities | A 404 is evidence of disappearance |

### Class B — Operational state · mutable, never a substitute for evidence

Current verification state · current entity graph · current open/closed status ·
current person-model. All derived views. **Each must be reconstructible from
Class A; none may be the only record of anything.**

### Class C — Derived projection · recomputable, given versioned logic

Parsed and structured fields · rankings · risk and effort estimates · match
reasoning · **generated summaries not shown to anyone.**

### The line inside explanations

CR-33 makes reasoning the primary artifact and summaries its projections. That
does **not** make all reasoning permanent:

> **What we told someone is evidence. What we merely computed is recomputable.**

An explanation displayed to a person becomes part of the delivery event and is
Class A — a person may have acted on it. An explanation computed and never shown
is Class C.

### Class D — Safe to discard

Byte-identical re-fetches of an immutable artifact beyond the first, keeping only
subsequent observation timestamps · transport detail with no bearing on identity
or freshness · rendering artifacts and non-semantic assets · intermediate
computation states.

**Not discardable:** raw content merely because fields were extracted from it
(CR-36's preservation principle), and fetch failures (case 9 above).

---

## Test 1 — the compliance-shaped failure

> If the system quietly deletes the evidence that makes an old claim
> inconvenient, can it still pass CR-36 and CR-37?

**Yes. This is a genuine hole in ratified law.**

CR-37 says observations are immutable and its audit test is *no observation has a
modification time later than its creation time.* **A deleted record has no
modification time.** Deletion is not mutation, so it passes the test cleanly.

An engine that erased its inconvenient observations would satisfy CR-36 and
CR-37 as written while destroying exactly the epistemic history they exist to
protect.

**Guard required:** observation records must be append-only **and
deletion-resistant**. Observable test:

> **Does the observation count for any entity ever decrease?** And: does a
> deletion path exist at all?

That is a monotonicity check — cheap, and it fails loudly.

### Amendment candidate

This is a **demonstrable gap in CR-37**, not a rule invented because it sounds
useful. CR-37 forbids rewriting; it does not forbid erasing. Whether "immutable"
should be read to cover deletion, or whether the rule needs explicit wording, is
a **founder decision.** I propose no wording.

## Test 2 — CR-08 adjudication

> If someone says *"we didn't know in time"*, can the retained evidence establish
> what the engine observed and when?

Requires three Class A items together:

1. **First-observation timestamp** — when the claim entered the system
2. **Eligibility determination at that time** — CR-08 says *eligible* person
3. **Delivery event timestamp** — when it reached them, if it did

Discard any one and CR-08 becomes unadjudicable. The compliance audit already
found that *if nobody measures ingestion-to-delivery latency, CR-08 is unenforced
by definition.* R-12 sharpens that: **the measurement is impossible unless these
three are Class A.**

This is the strongest argument in the whole analysis for the Class A set. It is
also the founding failure made auditable — the question *"did the system know in
time and fail to tell them?"* is answerable only against this evidence.

---

## Disposition

| Finding | Where it belongs |
|---|---|
| The retention principle itself | **No new rule.** Derivable from CR-08, CR-11, CR-33, CR-36, CR-37. |
| **Deletion gap in CR-37** | **Amendment candidate** — founder decision |
| Retention depth scaling with source irrecoverability | **Architecture requirement** |
| Class A/B/C/D boundary as specified | **Architecture requirement** |
| Logic and parser versioning as a precondition for Class C | **Architecture requirement** |
| Specific durations, tiering, storage economics | **Implementation** — and must be set against a real corpus, not chosen in advance |

**One economic caveat.** CR-28 requires the product survive silence, which makes
cost constitutional rather than merely practical. "Retain all observations
permanently" has an unbounded cost that has not been measured. The Class A set is
justified epistemically; its affordability is unestablished.

---

## Next empirical question — R-14

**Not a founder-philosophy question.** The ratification just made creates an
obligation whose feasibility is unestablished:

> Aggregators may be observation sources, but may not be a required intermediary
> under CR-19.

R-13 found the DCP competition published on a domain that did not exist before
the event, discoverable in practice only because aggregators wrote about it.

> **R-14 — What non-aggregator mechanism discovers an opportunity whose publisher
> is unknown until the opportunity exists?**

Testable by corpus analysis: take opportunities known to have reached Nigerian
students and establish, for each, whether any path existed to discover it without
an aggregator — institutional crawl, search index, registry, social monitoring, or
none.

**If no such mechanism exists for a class of opportunity, the ratification is
unimplementable for that class**, and C-18 returns as a live constitutional
problem rather than a settled one.
