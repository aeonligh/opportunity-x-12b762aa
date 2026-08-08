# The Opportunity X Constitution

**Status:** Phase 1 ratified by the founder. Law.
**Ratified:** 2026-08-08
**Scope:** AEON X and Opportunity X, its first product.

---

## Principle Zero

Software is not the product. The product is the idea. Architecture exists to
preserve the idea; the repository merely implements it.

Repositories may change. Frameworks may change. Databases may change. The
implementation may be rewritten ten times. **This document survives all of it.**

It is therefore written to be portable: it names no framework, no vendor, and no
file path. Any repository claiming to implement Opportunity X is subject to it.

---

## The Immutable Sentence

> **Human potential should never be determined by information inequality.**

Everything else in this document may evolve. This may not.

---

## Purpose

> The purpose of Opportunity X is not to help people search for opportunities.
> It is to ensure that the right opportunity reaches the right person **in time**,
> with enough **understanding** and **confidence to act**.

---

## Product Essence (ratified, Phase 4)

> **Opportunity X bridges the information gap between where a person is and
> where they want to be — making relevant possibilities, and the information
> needed to pursue them, accessible without that access depending on another
> person's timely intervention.**

### The human transformation

> The person can now know what is possible for them and access the information
> needed to pursue it, **without having to already know that possibility
> exists**, and without depending on another person to reveal it in time.

### The two gaps

The essence addresses two distinct failures, established by two distinct
first-hand episodes. Both must be bridged; solving either alone leaves the
person where they started.

| Gap | Failure | Established by |
|---|---|---|
| **Awareness** | Never knew the possibility existed | The founding scholarship — learned of it after the window closed |
| **Attention** | Knew of many, could not tell which mattered | Hours of searching across categories, ending in noise or nothing |

Together these falsify *"search harder"* as a remedy. The founder searched
extensively, used filters, and still failed. **User effort is not a viable
substitute for the product.**

The question Opportunity X ultimately answers:

> *"Given everything available and everything I know about you, what is worth
> your attention right now — and why?"*

The **"and why"** is not decoration. An answer without its reasoning fails
CR-12 and fails the product's own test.

### The required judgment

A filtered list asks: *"Which opportunities match the information you gave us?"*

Opportunity X answers: *"Given what I know about you and what I know about the
opportunities available, what deserves your attention right now — and why?"*

That is a different job, not a better version of the same one. Both operate on
identical inputs; the difference is that one returns matches and the other
returns **judgment**.

**Opportunity X must make judgments the person would otherwise have to make
themselves.** The system must be capable of saying, and distinguishing between:

- *"This is worth your attention."*
- *"This one is real, but don't spend your time on it."*
- *"This one looks promising, but you don't have enough runway."*
- *"You qualify for this, but the effort required doesn't make it a good
  opportunity for you right now."*
- *"You didn't search for this, but here's why I think it belongs in your
  consideration."*
- *"I don't currently know of anything worth your attention."* (CR-20)

Required properties of that judgment — it must be **explainable**,
**evidence-based**, **time-aware**, and **honest about uncertainty**.

Two consequences follow that are not otherwise obvious:

- **Runway affects presentation, not only inclusion.** Something closing soon
  without realistic time to prepare a good application must be presented
  differently from something with room. Something excellent but better suited to
  a later stage must say so. (Operationalises CP-C.)
- **Effort is modelled.** *"The effort required doesn't make it a good
  opportunity for you right now"* requires estimating what pursuit costs this
  person and weighing it against value. Attention scarcity (CR-13) makes that
  weighing necessary; C-15 governs its danger.

### The clarification that must stay attached

The essence is **not** built on an assumption that people are malicious or that
peers deliberately hide opportunities. Whether the friend in the founding
episode withheld anything remains **UNKNOWN and must stay UNKNOWN**.

The problem is the **dependency itself**:

> A person's access to an opportunity must not depend on whether another person
> happens to know about it, chooses to share it, remembers to share it, or
> reaches them in time.

Eliminating that dependency — not defeating bad actors — is what Opportunity X
exists to do.

### Mechanisms, not definitions

These are expressions of the transformation. None of them *is* the essence, and
none competes with it as a definition of the product:

| Mechanism | What it does | Property of |
|---|---|---|
| **Discovery** | Establishes that the opportunity exists | — |
| **Verification** | Establishes how well-supported it is | The opportunity |
| **Risk** | Establishes what this person stands to lose if the judgment is wrong | The pairing |
| **Ranking** | Determines what deserves this person's attention first | The pairing |
| **Recommendation** | Decides how strongly Opportunity X is willing to suggest pursuing it | The pairing |
| **Action / Preparation** | Establishes what this person can realistically do next | The pairing |

*Risk ratified as a distinct sixth judgment, Phase 10.*

Ranking and Recommendation are distinct acts. Ranking orders attention;
recommendation extends endorsement. CR-18 governs the boundary between them.

### What Opportunity X is NOT

- **Not a listing site or job board** — those supply listings to people who
  already know to look.
- **Not a search engine** — search requires knowing what to search for; the
  essence explicitly covers not knowing.
- **Not a referral or social network** — any mechanism making access contingent
  on social-graph participation reintroduces the exact dependency the essence
  exists to remove.
- **Not an endorsement engine** — per CR-18, recommending is a narrower act than
  making known.

### Unique Mechanism

**UNDETERMINED.** Nothing established in discovery yet explains why Opportunity X
can deliver this when ordinary search, existing platforms, or self-directed
searching cannot. Not to be invented.

---

## Opportunity Ontology (ratified, Phase 14)

### Definition

> **An opportunity is a real, actionable possibility available to a person that
> can expand, change, or advance what becomes possible for them, subject to
> conditions they can potentially meet or pursue.**

### The boundary

> **Opportunity X is concerned with opportunities people can act on, not merely
> things that might be interesting or beneficial.**

The nearest thing that is *not* an opportunity: **information about a possibility
that cannot presently be acted upon.** A stale scholarship advert is the clearest
case — it still contains information *about* an opportunity, but it is no longer
itself an actionable one.

### One kind, many forms

Scholarship · internship · job · fellowship · grant · competition · programme ·
webinar · workshop · conference · training · volunteering · accelerator are
**forms** of opportunity, not definitions of it. They share one underlying
property: they create an actionable possibility that did not previously exist for
the person.

**Categories are manifestations of the underlying thing, never separate
definitions of it.**

### Not definitional

Scarcity, competition, an application process, and a deadline are **properties
some opportunities have** — not part of what makes something an opportunity. A
webinar or a volunteering placement qualifies if it creates a genuine, actionable
possibility.

### Open

Whether all forms can share identical verification and ranking logic is **not
settled**. They share the ontology; they may differ substantially in properties,
stakes, conditions, and verification requirements. See CR-29.

---

## CR-35 — Discovery finds claims, not opportunities *(ratified Phase 14)*

The engine may not reason *"I found a listing."* It must reason:

> **"I found a claim that this possibility exists."**

**A claim is not an opportunity.** A PDF, a web page, a duplicate URL, a revised
filename, a Telegram message, and an aggregator listing may all be **claims about
a single underlying opportunity.**

Verification then determines whether the claimed possibility is **real, current,
and actionable**.

**Grounded in observed evidence, not theory.** R-01 found the same Federal
Scholarship Board advert served at three addresses on the official domain — two
WordPress installations and an HTML wrapper — and found adverts from 2019 through
2025 all still live with no expiry marking. Under a listing model those are nine
opportunities, several of them false. Under a claim model they are a handful of
opportunities described by many claims, most of which verification will retire.

**This is why CR-21 forbids collapsing discovery into verification.** Discovery
can legitimately find the 2020 BEA advert — it is a real claim, correctly
observed. Verification is what establishes that the possibility it describes is
no longer actionable. Both operations succeeded; only together do they produce
the truth.

**Consequence — entity resolution becomes first-class.** If claims map to
opportunities many-to-one, the engine must decide when two claims describe the
same opportunity. That is a hard problem, it cannot be solved by URL identity, and
it now sits on the critical path. See R-11.

---

## CR-36 — Observation, Entity, Judgment are three layers *(ratified Phase 14)*

CR-35 is only real if these are kept apart:

| Layer | States | Nature |
|---|---|---|
| **Observation** | *This claim was encountered here, at this time, saying these things.* | Append-only. Immutable (CR-37). |
| **Entity** | *These claims appear to describe the same underlying possibility.* | Revisable as resolution improves. |
| **Judgment** | *Given the evidence now, this possibility is real / current / actionable to this degree.* | Recomputed; time-varying (CR-11). |

**The six mechanisms map onto the layers:**

- **Discovery** produces Observations
- **Entity resolution** produces Entities *(see R-11)*
- **Verification** is a judgment about the **Entity** — never person-relative (CR-30)
- **Risk, Ranking, Recommendation, Action** are judgments about the **pairing**

**What was observed and what Opportunity X concluded are different things.** If a
source says a scholarship is open until a given date, that statement *is the
claim*. If the system later determines it is closed, that is a **later judgment**,
not a correction to the observation.

**Duplicate observations are not discarded.** Where three URLs resolve to one
opportunity, all three observations are retained. The fact that three
representations existed is itself evidence — for entity resolution, and for
provenance.

## CR-37 — Observations are immutable *(ratified Phase 14)*

An observation is never rewritten to reflect what was later learned. Re-encounter
produces a **new** observation, never an update to the old one.

If the engine saw the 2020 BEA advert while it was publicly available, the record
that **the claim existed and was observable at that time** survives — even after
verification establishes the underlying opportunity is long dead.

## The preservation principle

> **Preserve enough of every observation that Opportunity X can later reconstruct
> what it knew, why it believed it, what changed, and why its judgment changed.
> Discard what cannot contribute to that chain.**

**Preserved at first observation, at minimum:**

- What was observed — the claim itself
- Where — source and location
- When — **discovery time**, distinct from any date stated inside the opportunity
- What the source actually said — enough of the original representation to compare against later
- The source's identity and context — *who* is making the claim, not merely a URL
- The apparent details at that moment — dates, eligibility, requirements, access route, costs, location, conditions
- The representation's identity — URL, document, page, filename
- Relationships to other observations — revision, duplicate, correction, alternate publication

**Discardable:** anything that cannot contribute to verification, entity
resolution, provenance, re-checking, explanation, or correction.

**Raw evidence is not discardable merely because structured fields were extracted
from it.** An extraction can be wrong, and later verification may need what was
actually observed.

**"Preserve everything forever" is rejected.** That makes the engine an archive
rather than an intelligence system. The rule is future epistemic usefulness, not
completeness for its own sake. The exact retention boundary is **R-12**, to be
established against real sources and real verification cases — not invented in
advance.

## Compliance-shaped failure — CR-36 and CR-37

Audited at ratification, per the governance requirement.

| Rule | Nominal compliance | Substantive death | Observable test |
|---|---|---|---|
| **CR-36** | Three layers exist in the model | The pipeline overwrites observations with extracted fields, or writes judgment back onto the entity | **For any live judgment, can the specific observations it rests on be retrieved?** And: **do any stored observations contradict the current judgment?** If none ever do, observations are being rewritten. |
| **CR-37** | "Observations are immutable" | Re-crawling updates in place instead of appending | **Count observations whose modification time exceeds their creation time. Must be zero.** Also: an opportunity seen across three cycles should hold three observations, not one. |

The CR-36 test has the same shape as CR-11's: **a store where nothing ever
contradicts the present is a store that has been quietly rewritten.**

---

## Origin (ratified finding — Phase 1 CLOSED)

The origin is **structural in pattern, instantiated in one specific loss**. The
condition is general — opportunity information is fragmented, unverifiable,
unexplained, and time-gated, and it fails hardest for those with the least access
to reliable channels. It became real through one scholarship, missed.

**Final established state:**

- **Founding failure mechanism:** timing of information arrival. The founder
  learned of a scholarship offering travel outside the country only after its
  application window had closed. The information arrived through a friend.
- **Emotional reality:** helplessness, then anger — anchored in the distinction
  between rejection and never receiving the chance to compete.
- **Verification motive:** first-hand and real. The founder personally
  encountered an opportunity presented as a Nigerian government student
  programme. **The specific verification failure is UNKNOWN.**
- **Permanently UNKNOWN, not to be inferred:** dates, names, latency, channel
  rankings, investments, aftermath, recurrence, eligibility.

No product requirement may be derived from these unknowns.

The founding distinction, which governs the product's moral scope:

> Rejection means someone considered you and decided you were not the right fit.
> That is acceptable.
> Never being given the chance to compete is not.

---

## Constitutional Rules

### CR-01 — Access before scarcity
Opportunity is an information-access problem before it is a scarcity problem.
The world produces opportunities continuously; human access to them is what fails.

### CR-02 — Concealment ≠ rejection
Concealment is morally distinct from rejection. The product's duty is to
guarantee *the chance to compete*. It never promises winning.

### CR-03 — The pillars are derived, not designed
Discovery, verification, explanation, and action each correspond to a distinct
lived failure. None may be dropped; dropping one restores a failure the founder
personally experienced.

### CR-04 — Success is reduced missed potential
Success is measured as reduced missed potential — never as application volume,
engagement, or time spent in the product.

### CR-05 — Deadline state is truth-critical
A closed opportunity circulated as open is a first-class harm. Deadline state is
not metadata.

### CR-06 — Popularity encodes privilege
If those who win are those who already knew where to look, then ranking by
popularity re-implements the injustice. Default ranking is fit-based, not
crowd-based.

### CR-07 — Many interfaces, one intelligence *(founder-amended)*
> **Opportunity X is an Opportunity Intelligence Platform. Search, proactive
> delivery, monitoring, recommendations, prediction, and conversation are all
> equal expressions of the same intelligence. No single interaction model
> defines the platform.**

Users are never forced into one interaction style. Some search. Some receive.
Some ask. Some simply open the app. All are first-class.

*Supersedes the earlier draft that made search a fallback.*

### CR-08 — Lateness is a product failure *(founder-scoped)*
If Opportunity X **knew early enough** and failed to inform the user early
enough, the system failed — not the user.

The liability is conditional on knowledge. The system is not accountable for
what it could not have discovered in time. It *is* fully accountable for
anything it knew and did not deliver in time to act on.

### CR-09 — Accountable for access, never for outcomes
Opportunity X owns:

- discovery
- verification
- explanation
- **preparation**
- timing

It never owns admissions decisions. Winning depends on institutions.

*Preparation is constitutionally owned. Application assistance is core, not
auxiliary.*

### CR-10 — Inverse-access priority
The least connected user is the primary design target. Every feature is
evaluated against:

> **"Would someone with zero network still benefit?"**

Any mechanism that advantages the already-connected re-implements the injustice.

### CR-11 — Verification is continuous *(founder-expanded)*
Verification is not a one-time existence check. It covers:

- authenticity
- deadline accuracy
- eligibility correctness
- source credibility
- duplicate detection
- update monitoring
- expiration monitoring

**An opportunity may begin verified and later become unverified.** Verified
status is a live claim with an expiry, not a stored flag.

Unverified opportunities cost users irrecoverable effort — people spend weeks
preparing for things that were never real. Verification is a duty of care.

### CR-12 — Understanding means reducing uncertainty *(founder-expanded)*
Explanation is not simplification. Opportunity X must explain:

- why the opportunity exists
- who it is for
- why the user matches
- why they do not
- required documents
- the selection process
- hidden expectations
- common mistakes
- estimated effort
- probability bands
- alternative opportunities

Incomprehension is exclusion: people who do not understand the requirements
remove themselves before an institution ever sees them.

### CR-13 — Attention is the scarce resource
Opportunity is not scarce. Attention is. Intelligence exists to allocate
attention toward the opportunities with the highest expected value **for that
individual**. This is the philosophical justification for ranking.

### CR-14 — Quality dominates quantity
The product never optimizes for application count. One excellent opportunity
beats fifty mediocre ones.

### CR-15 — Trust is asymmetrical
One fake opportunity destroys more trust than ten verified ones create.
Therefore **every recommendation carries the burden of proof.**

### CR-16 — The friction test
Opportunity X exists to reduce friction between human potential and human
opportunity. Every feature must answer:

> **"What friction does this remove?"**

If none, it should not exist.

### CR-17 — Beauty must never reduce access *(from the C-08 resolution)*
> **Premium experience must degrade gracefully across device capability,
> bandwidth, and hardware performance.**

Accessibility is non-negotiable. Beauty is non-negotiable. The task is not to
choose between them but to engineer beauty that scales.

### CR-18 — Awareness is not endorsement *(ratified Phase 13)*
The credibility threshold governs whether Opportunity X may **recommend** an
opportunity. It never governs whether the user may **know it exists**.

- At or above threshold: may be treated as sufficiently credible for
  recommendation and action, on the evidence supporting that assessment.
- Below threshold: **still surfaces**, and must clearly communicate what is
  known, what has been verified, what remains unverified, and why confidence
  falls short — rather than presenting uncertainty as fact.

> **Unknown does not mean false. Unverified does not mean nonexistent.**

Opportunity X may never silently withhold a known opportunity solely because
its verification confidence is below threshold. Doing so would reproduce the
founding failure — a real opportunity existed, the system knew, the person
never found out, the window closed — with the system occupying the position
that caused the original loss.

### CR-19 — Access must not depend on another person's timely intervention
*(promoted from candidate principle CP-A, ratified Phase 4)*

A person's access to opportunity information may not be contingent on whether
another person happens to know about it, chooses to share it, remembers to share
it, or reaches them in time.

This is constitutive, not behavioural — it is part of what Opportunity X **is**,
per the Product Essence. Any mechanism that reintroduces that dependency
contradicts the essence itself, regardless of how well it performs.

Note the standard is **dependency**, not malice. The rule holds even where every
participant is acting in perfect good faith, because ordinary human timing is
sufficient to cause the failure.

### CR-20 — The system must be able to return nothing
*(promoted from candidate CP-D, ratified Phase 5)*

**"There is nothing worth your attention right now"** is a legitimate,
first-class output — not an empty state to be avoided or filled.

Grounded in observed experience: hours of searching that ended with nothing
worth acting on. That is an *expected-value* failure, not an
information-quality one, and no amount of better filtering fixes it.

> If Opportunity X becomes successful by showing more opportunities rather than
> helping a person make better decisions about fewer, it has reproduced the
> exact problem it exists to escape.

A product that always has something to show has reproduced the noise.

### CR-21 — Mechanisms remain separable
The five mechanisms — discovery, verification, ranking, recommendation,
action/preparation — are distinct operations and may not be collapsed into a
single opaque score.

Curating a person's attention does not license merging judgments that answer
different questions. "Is this real?" and "does this deserve your attention?"
and "are we willing to suggest it?" have different evidence, different failure
modes, and different remedies. A composite number hides all three.

Reinforces CR-12 (the reasoning must be inspectable) and CR-18 (recommendation
is a narrower act than awareness).

### CR-22 — Earn personalisation, never demand it
*(founder-stated, Phase 6)*

The person starts by giving very little, receives genuinely useful intelligence,
and becomes willing to give more as the system demonstrates it understands them.
Depth of personalisation is a **reward the product earns**, not a toll it
collects at the entrance.

Two conditions attach:

- **Value precedes extraction.** Nothing that feels like work may be required
  before the product has demonstrated it reduces the work the person is already
  doing.
- **Every request is justified at the point of asking.** The person is told why
  a field is needed, when it is asked for — not in a policy document.
- **The pre-value field cap may not be expanded by ordinary product iteration**
  *(ratified Phase 13)*. FPR-02 defines the set. If the product needs more
  information before demonstrating value, that is a **constitutional change** and
  must pass through amendment. Otherwise C-14 wins by attrition — one defensible
  field, then another, until the product has rebuilt the onboarding burden it
  explicitly rejected.

Observed basis: the founder, in the period concerned, would have abandoned a
high-friction onboarding before demonstrated value, while being willing to give
substantially more after curation proved useful.

### CR-23 — The system may not require self-knowledge it exists to provide
*(founder-stated, Phase 6)*

Opportunity X may not condition its usefulness on the person already
understanding themselves, their ambitions, or the space of what is available.

> Asking someone to define precisely what they want, before showing them what is
> possible, reproduces the information gap in another form.

A person who knew exactly what to ask for would have less need of this product.
Designing for that person excludes the one the Constitution is written for.

### CR-24 — The person-model must be inspectable, and inference must be labelled
*(founder-stated, Phase 6)*

The person must be able to distinguish **what Opportunity X knows about them**
from **what it is inferring about them**.

If the system barely knows someone, it may not present itself as though it does.
Confidence about a person is subject to the same honesty requirement as
confidence about an opportunity — a fluent recommendation built on three fields
and six inferences must not read like one built on established fact.

Follows from CR-12 (reducing uncertainty) and CR-15 (trust is asymmetrical),
applied to the *user model* rather than to opportunities.

### CR-25 — Curation without ownership *(resolves C-15)*

> **Opportunity X can rank a person's attention. It cannot own their
> possibility.**

The system's job is to ensure the person does not miss the chance to compete.
It is not to decide which competitions they are allowed to enter.

**The hierarchy:**

> Awareness → Ranking → Explanation → Recommendation → **Decision by the person**

Ranking may say *"pay attention to this first."* Recommendation may say *"we
think this is worth pursuing."* Neither may silently become *"you should not
pursue this."*

**Forbidden outputs** — too strong a judgment for a system that cannot know the
person's eventual outcome:

- *"Don't apply."*
- *"This isn't worth your effort."*

**Permitted outputs** — expose the reasoning without claiming to know the future:

- *"This is likely to require significant effort."*
- *"You appear eligible, but you have limited runway."*
- *"Your fit appears weaker than these other opportunities."*
- *"The evidence supporting this opportunity is incomplete."*
- *"Based on what I currently know about you, this appears lower priority."*

**Language weakens with knowledge.** Where the system knows little about a
person, it may not make strong personalised negative judgments about them
(CR-24).

**The override is a right, not a feature.** *"Show me anyway"* must be prominent
rather than buried, immediate, and **never punished**: choosing it may not hide
the opportunity, may not be treated as a negative signal, and may not be used to
further restrict what the person subsequently sees.

Ranking is not weakened by this. It is legitimised — opinionated, transparent,
reversible, and proportionate to what is actually known.

### CR-26 — Discouragement requires a higher evidence bar than recommendation

The harms are asymmetric, so the standards must be:

| | If wrong | Discoverable? |
|---|---|---|
| **Recommendation** | The person loses some time | Yes — they see the outcome |
| **Discouragement** | The person loses a possibility | **Never.** They do not apply, so they never learn the system was wrong |

A wrong discouragement is invisible and unrecoverable, and it sits dangerously
close to the founding injustice. Negative judgments therefore carry a strictly
higher burden of evidence than positive ones.

### CR-27 — Revenue may never purchase judgment

> **The entity paying Opportunity X must never be able to purchase, directly or
> indirectly, a change in the judgment Opportunity X makes about what deserves
> an individual's attention.**

No party who benefits from being selected, ranked, recommended, or surfaced may
pay for influence over that selection.

**Refused, regardless of what it is called** — advertising, sponsorship,
promotion, partnership, placement, boosting, commission, or any future name:

- paid placement · sponsored ranking · pay-to-be-recommended
- institutions paying to appear more relevant to a person
- advertising that can influence opportunity ordering
- commissions tied to applications, clicks, or conversions where those
  incentives can affect what is recommended
- any purchase of preferential access to a person's attention

**Labelling is not a remedy.** The objection is not deception. The *existence*
of the financial incentive corrupts the intelligence, whether or not the user
is told. Opportunity X answers *"what deserves this person's attention?"* It
cannot simultaneously answer *"who paid us to deserve it?"* Those are
incompatible questions.

**Precedence:** if a revenue model cannot survive this constraint, the revenue
model is incompatible with Opportunity X. The product does not compromise to
accommodate it.

*Honest consequence:* this also closes outcome-based revenue — earning a
commission when the person wins. That model appears aligned, but it biases
toward opportunities that carry commissions and toward application volume,
which CR-04 and CR-14 forbid. The alignment is superficial; the refusal stands.

### CR-28 — The product must be economically capable of silence

Survival may never depend on keeping the person engaged, showing more
opportunities, increasing application volume, or causing unnecessary return
visits.

> **"There is nothing worth your attention right now"** must be sayable without
> being a business failure.

CR-04, CR-14, and CR-20 are only durable if the economics support them. A
revenue model that punishes silence will eventually bend the intelligence that
produces it — not through a bad decision, but through a reasonable-sounding one
made under financial pressure.

### CR-29 — Verification proportionate to consequence *(addresses C-13)*

> **The higher the cost of being wrong, the stronger the evidence Opportunity X
> must require before treating an opportunity as sufficiently credible for
> recommendation or action.**

One identical standard across all categories is wrong at both ends. An hour lost
to a cancelled webinar is an annoyance. Weeks of preparation, sensitive
documents, or money given to something illegitimate is a different kind of harm.

Same principle as CR-26, pointed at opportunities rather than at people: the
evidence burden is proportionate to the harm an incorrect judgment could cause.

**Cost is not only money.** It includes time to prepare · sensitive documents or
personal information requested · financial outlay · effort · opportunity cost ·
how irreversible the preparation is · how much trust must be placed in the
provider · the emotional cost of investing heavily in something false.

**Cost is person-specific.** What is trivial for one person may be a major
burden for another.

**Low risk is not a licence for weak truthfulness.** The rule is *not* "low-risk
opportunities don't need verification." A webinar need not face a scholarship's
depth, but Opportunity X must still represent accurately what it knows and what
it does not. Proportionate depth, constant honesty.

### Three questions that must not be collapsed *(extends CR-21)*

| Question | Asks | Property of |
|---|---|---|
| **Verification** | How well-supported is this opportunity? | The opportunity |
| **Risk** | What happens to *this person* if that assessment is wrong? | The person-opportunity pair |
| **Ranking** | Does this deserve *this person's* attention? | The person-opportunity pair |

They interact. They are not the same judgment, and no single score may stand in
for all three.

*Proposed amendment, pending ratification:* **Risk** joins the mechanism table
as a distinct judgment alongside discovery, verification, ranking,
recommendation, and action/preparation.

### CR-30 — Opportunity truth is not person-relative; risk is *(resolves C-17)*

> **An opportunity is verified. It is not verified *for someone*.**

If Opportunity X has established that an opportunity is legitimate, open, that
its requirements are real, that its route reaches the legitimate provider, and
that its important claims are supported — that truth does not change because a
different person is looking at it. Verification establishes what is *actually
true about the opportunity*. Making it subjective would defeat its purpose.

**Two scalings, attached to different things:**

| What scales | With | Property of |
|---|---|---|
| **Verification depth** | The opportunity's inherent stakes | The opportunity |
| **Recommendation threshold, ranking, presentation, warnings** | This person's cost of being wrong | The pairing |

**Risk may raise the bar. It may never lower it.** A high-risk opportunity does
not become "verified enough" because the system judges the person can afford the
consequences. The truth standard remains the truth standard.

**Different recommendations do not mean different truths.** When two people see
the same opportunity treated differently, Opportunity X does not hold two
versions of the truth. It holds one, and understands that consequences and
circumstances differ between the two people.

A strongly verified opportunity requiring six weeks of preparation is not *less
verified* for someone with three weeks of runway. It is **less actionable for
them right now.** Those are different statements and must remain so.

### CR-31 — Personalisation must expand the possibility space *(resolves C-12)*

> **Opportunity X must deliberately reason beyond what it already knows the
> person wants.**

Personalisation that only narrows produces a sealed room: a system that learns
existing interests well enough to exclude everything the person has not already
encountered. That defeats the essence, which requires the person to learn of
possibilities **without having to already know they exist**.

**No quota.** There is no fixed share of unfamiliar results. A percentage would
be an arbitrary scoring rule dressed as a principle, and it would force output
where none is warranted.

**A structural obligation instead.** The system must remain continually capable
of discovering and considering possibilities outside the person's expressed
interests, history, and existing knowledge — and must not let personalisation
close that door.

**The unknown still needs a reason.** This is not randomness. When something
unfamiliar genuinely deserves consideration it is surfaced with its reasoning:

> *"You didn't search for this, and you haven't expressed an interest in it, but
> I think it belongs in your consideration because of what I know about you and
> what I know about this opportunity."*

**Nothing is a valid week.** If nothing outside the person's known interests
clears the bar, the system shows nothing (CR-20). The obligation is to *look*,
not to *produce*.

### Unknown is not irrelevant

Something can be absent from a person's history **precisely because they never
had the information required to form an interest in it.** Absence of signal is
not evidence of disinterest.

This is the third rule guarding the same failure, and they should be read
together:

| Rule | Forbids |
|---|---|
| **CR-24** | Presenting inference as knowledge |
| **CR-25** | Treating an override as a negative signal |
| **CR-31** | Treating absence as disinterest |

> **Silence about something is not evidence against it.**

Any system that learns from behaviour will violate this by default. It must be
designed against.

### CR-32 — Infer context, never destiny *(addresses C-14)*

> **Context may inform what Opportunity X considers. It must not determine what
> Opportunity X believes a person can become.**

At cold start the system knows very little, so it must reason from what a
person's circumstances imply. That is legitimate and necessary. The purpose of
cohort inference is **to overcome knowing little — not to pretend to know the
person.**

**Permitted — inference about circumstance, factually related to an opportunity:**
country or location · education level · field of study · graduation stage and
timing · institutional or programme requirements · publicly stated eligibility
conditions · timing relationships between the person's situation and the
opportunity.

**Forbidden — inference about capability.** Cohort membership may never become a
prediction of what this individual can achieve. Specifically forbidden as
proxies for potential: historical participation · institutional prestige ·
geography · demographics · engagement patterns · cohort success rates.

The reasoning that must never occur:

> *"People like you usually don't get this, therefore you probably shouldn't
> pursue it."*

**The distinction:**

| Statement | Object | Status |
|---|---|---|
| *"This opportunity has historically received few applicants from your type of institution."* | The landscape | Potentially legitimate information |
| *"You are unlikely to succeed because you come from that institution."* | The person | **Forbidden** |

*Caution: the distinction is sound in logic and leaky in delivery. A true
statement about the landscape is read by a person as a verdict about themselves.
CR-26's higher bar for discouragement governs the presentation, not only the
content.*

> **Inference may expand discovery. It must not become a hidden eligibility rule
> or a hidden ceiling on possibility.**

Where an opportunity states explicit eligibility requirements, the system may
verify them and determine whether the person appears eligible. That is checkable
fact, not prophecy.

### Three states of knowledge *(extends CR-24)*

| State | Meaning |
|---|---|
| **Known** | What the evidence establishes |
| **Inferred** | What the system reasonably derives from that evidence |
| **Unknown** | What it cannot establish |

An inference may never be silently converted into a fact about the person. This
joins CR-31: a person's lack of history with a category, institution,
opportunity type, or subject is not by itself evidence that they are
uninterested, unsuitable, or unlikely to succeed.

### CR-33 — Understanding may not be replaced by summary

> **An explanation is not present merely because explanatory text exists.**

Identified by the founder as the rule most likely to fail first — not by
deletion, but by hollowing out while claiming compliance. *"You qualify."*
*"Deadline soon."* *"Matches your profile."* *"High confidence."* Explanations
would still exist; the reasoning would be gone.

The failure is dangerous because **it presents as improvement**: faster screens,
less text, more opportunities consumed, better engagement. A reasonable team
concludes users don't want explanations, when what they don't want is *bad*
explanations.

**A judgment must expose:**

- what is **known**
- what is **inferred**
- what **evidence** supports the assessment
- what remains **uncertain**
- **why** the opportunity was surfaced
- **why** it was ranked where it was

**The structural guard, ratified Phase 13.** A written rule against hollowing out
a written rule is still only writing. This is law, not aspiration:

> **Reasoning is the primary artifact. Summaries are projections of it, never
> substitutes for it.**

This is stronger than *"the interface should explain things."* It means the
underlying judgment **remains inspectable even when the presentation becomes
shorter, faster, or more beautiful.** Presentation may compress. The judgment
beneath it may not.

If a summary can exist without the reasoning behind it, the reasoning is
optional and will atrophy. If the summary is *derived* from stored reasoning,
then a judgment cannot be displayed without the reasoning having been done and
retained — and completeness becomes measurable rather than a matter of taste.

### CR-34 — Protected behaviours must actually occur *(ratified Phase 13)*

> **A behaviour protected by the Constitution is not compliant merely because the
> code can perform it.**

Where the Constitution protects a behaviour that should occur *sometimes* —
de-verification (CR-11), the empty result (CR-20), sub-threshold surfacing
(CR-18), unfamiliar opportunities (CR-31) — capability is not compliance.

**If a protected behaviour disappears, its declining rate is an incident
requiring investigation.**

This exists because of the audit's central finding: constitutional drift
presents as **absence, not error**. Nothing throws an exception when something
stops happening. A rate falling silently to zero is the ordinary way these rules
die, and it is indistinguishable from correct operation unless absence is
monitored deliberately.

---

## Compliance-shaped failure — a threat class

CR-33 revealed a failure mode distinct from abandonment: a rule **nominally
satisfied while substantively void.** It is more dangerous than violation
because no one has to decide anything, and every step looks like progress.

Other rules exposed to the same drift, and how each would die while passing
inspection:

| Rule | Nominal compliance | Substantive death |
|---|---|---|
| **CR-12 / CR-33** | Explanatory text present | Reduced to labels |
| **CR-18** | Sub-threshold opportunities technically shown | Visually buried where nobody finds them |
| **CR-24** | Inference "labelled" | One generic disclaimer covering everything |
| **CR-25** | Override exists | Three taps deep, unstyled, undiscoverable |
| **CR-31** | System "explores beyond known interests" | A token slot filled with near-matches |
| **CR-20** | Empty result supported | Bar quietly lowered so it never triggers |

Each of these needs a guard that makes violation **visible when it happens**,
not merely forbidden in advance. Auditing all thirty-three rules against this
threat class is outstanding work.

---

## Founder Product Requirements

**FPR-02 — Cold-start minimum.** The information the founder would have given
before seeing any value: country/location · current educational level or course ·
university or school · graduation stage/year · broad areas of interest · basic
constraints that obviously affect eligibility.

Explicitly refused before demonstrated value: long questionnaires · CV upload ·
financial or family questions · precise ambition definition · extensive account
verification.

This is a founder-reported willingness threshold, not a measured abandonment
rate. No abandonment time is claimed — the founder declined to invent one.

**FPR-01 — Credibility threshold: 88%.** An opportunity must reach ≥88%
evidence-based credibility before Opportunity X may treat it as sufficiently
credible for recommendation or action. Validation addresses at minimum:
existence · source legitimacy · currently open · deadline and requirements
real · application route leads to the legitimate provider · important claims
corroborated where appropriate.

**Interaction with CR-29 is undetermined.** 88% remains the founder-set
credibility threshold, but how it varies with opportunity risk and category is
not yet decided. It must not be read as a single universal number until R-06 is
answered.

*Founder-set product threshold. Not a claim that 88% of opportunities are real,
and not a statistically validated probability. The system must earn the score
from evidence.* Interacts with CR-18: this is a **recommendation/action**
threshold, never an **existence** threshold.

---

## Boundaries and clarifications

**Probability is disclosed, not promised.** CR-12 requires probability bands and
CR-13 requires expected-value reasoning, while CR-02 and CR-09 forbid promising
outcomes. These coexist: the system estimates and discloses likelihood; it is
never accountable for the result. A future engineer must not read CR-09 as
forbidding probability display.

**An empty recommendation is never an empty world.** CR-20 permits *"I don't
currently know of anything worth your attention."* CR-25 forbids that from
meaning *"there is nothing."* The recommendation surface may be empty; the path
to what exists may not be closed. Both rules hold only if those are kept
distinct in the interface as well as in the reasoning.

**Measurement follows CR-04 and CR-09.** Metrics attach to reach, timeliness,
comprehension, and trust. Any metric rewarding time-on-site, application count,
or conversion is constitutionally void.

---

## Resolved contradictions

| ID | Contradiction | Resolution |
|---|---|---|
| **C-08** | Premium visual identity vs. inverse-access priority | **Dissolved by founder.** Not a conflict but a design constraint → **CR-17**. |
| **C-09** | Search-centric surface vs. delivery-centric constitution | **Dissolved by founder.** Rests on a false premise that one interaction must be primary → **CR-07**. |
| **C-17** | Is "verified" a property of the opportunity or of the person-opportunity pairing? | **Resolved by founder → CR-30.** Verification belongs to the opportunity; risk belongs to the pairing. Verification depth scales with the opportunity's inherent stakes; the recommendation threshold scales with the person's cost of being wrong. |
| **C-12** | **Breadth vs. personalisation.** Does a well-tuned matching engine structurally exclude what the essence exists to reveal? | **Resolved by founder → CR-31.** A structural obligation to reason beyond known wants, with no quota. Personalisation must expand the possibility space, not merely narrow it. |
| **C-15** | **Discouragement as soft suppression.** Would a "not worth your effort" verdict reproduce the founding injustice with better manners? | **Resolved by founder → CR-25, CR-26.** Curation without ownership: the system ranks attention and never owns possibility. Negative judgments carry a higher evidence bar because their harm is invisible and unrecoverable. |
| **C-10** | **The suppression boundary.** Does low verification confidence justify withholding a known opportunity? | **Resolved by founder → CR-18.** In favour of transparent uncertainty over silent withholding. The threshold separates recommendation from awareness; it never gates existence. |

## Open constitutional questions

| ID | Question |
|---|---|
| **C-11** | **Peer distribution inherits the founding failure.** The founding opportunity arrived through a person, too late. Any mechanism depending on humans telling each other in time inherits that latency — malice not required. Governs how far the product may rely on user-to-user sharing. Now largely constrained by CR-19. |
| **C-16** | **Even clean revenue pressures silence.** CR-28 requires that "nothing right now" be economically survivable. But a user-paid subscription — the model with the cleanest incentives — still creates pressure to *appear* valuable, and therefore to show something rather than nothing, or churn. The conflict is weaker than advertising but not absent. Any candidate model must be tested against a month in which the honest answer is repeatedly "nothing." |
| **C-14** | **Cold start.** Constructed relevance needs a rich model of the person, but the person will give little before seeing value, and may not know what they want at all. **Reframed by founder, not solved:** this is not a choice between short onboarding and rich profile. The question is how the system becomes increasingly personal *without making the person do the work of becoming understood first*. CR-22 and CR-23 constrain the answer; they do not supply it. |
| **C-13** | **Verification standards do not survive category breadth.** FPR-01's six checks are built for formal, competitive, high-stakes programmes. Several do not apply to a webinar, workshop, or volunteering slot — no application route, no eligibility, no meaningful deadline. One uniform 88% threshold is a category error in both directions. |

## Open research requirements

| ID | Question |
|---|---|
| **R-01** | Do important opportunities routinely originate or circulate in closed channels an open-web discovery system cannot observe? If yes, discovery must expand beyond public-web crawling. If no, retire. |
| **R-02** | What is the credibility score a probability *of*, and how is it calibrated? Until answered, FPR-01's 88% is an ordinal expressed as a cardinal. |
| **R-10** | For each rule exposed to compliance-shaped failure, what guard makes the violation visible when it occurs? Written prohibition is insufficient by construction — the rule is being obeyed on its face while being emptied. |
| **R-12** | **The retention boundary.** How much of each observation must be preserved, and for how long, to support verification, entity resolution, provenance, re-checking, explanation and correction — without becoming an archive? To be established against real sources and real verification cases, not invented. |
| **R-11** | **Entity resolution.** How does the engine determine that two claims describe the same underlying opportunity? URL identity fails — R-01 observed one advert at three addresses with differing capitalisation, plus `-FINAL` and `-corrected` revisions with nothing linking them to what they supersede. Required by CR-35. |
| **R-09** | Where exactly does legitimate contextual inference end and prohibited predictive judgment begin? CR-32 sets the principle; the founder declined to fix a list of permitted and prohibited attributes without evidence. Includes how to present true landscape statements without their functioning as personal verdicts. |
| **R-08** | How broadly must the system explore beyond known interests; what evidence establishes that an unfamiliar opportunity deserves consideration; how often should this occur; and does it belong in ranking, in awareness, or on a separate surface? CR-31 sets the obligation without specifying its execution. |
| **R-07** | What is the **exact relationship** between risk and the downstream judgments? Does person-specific risk move the recommendation threshold, the ranking position, the presentation and warnings, or all three — and by how much? Founder deliberately left this undecided. |
| **R-06** | **How is the consequence of being wrong determined**, before deciding what verification depth is appropriate? Requires assessing cost across time, documents, money, effort, irreversibility, trust, and emotional investment — per person. No model exists and none may be invented. Blocks operationalising CR-29 and fixing FPR-01's tiers. |
| **R-05** | **Who pays?** OPEN, deliberately undecided. User-pays aligns incentives but conflicts with CR-10, since the priority user is least able to pay. Institutional, governmental, or foundation subsidy solves affordability but raises the question of whose interest prevails when payer and person diverge. No evidence yet supports choosing. |
| **R-04** | For negative judgments: what evidence threshold is required, how much uncertainty must be exposed, and how should the override behave? CR-26 establishes that the bar is *higher*; it does not say how much higher. OPEN. |
| **R-03** | Do existing opportunity platforms fail to personalise because they *cannot* (technical), because they *will not* (incentive/business model), or both? Founder has used them and observed the result, but has not investigated their systems or economics. Determines whether the moat is engineering or constitution — and therefore how defensible the product is. |

---

## Amendment procedure

These rules are law until the founder amends them. Lower-order artifacts —
product, architecture, brand, UX, database — may not override this document.
Where an implementation conflicts with it, the implementation is wrong.

Resolved contradictions move to the table above. Nothing is deleted silently.
