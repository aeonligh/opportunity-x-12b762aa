# Compliance-Shaped Failure Audit — CR-01 to CR-33

**Commissioned:** Phase 13, following the founder's identification of CR-12 as
the rule most likely to fail by hollowing rather than by abandonment.

**The test applied to every rule:**

> Could the team honestly say *"we comply with this rule"* while a user
> experiences the exact opposite of what the rule was created to protect?

**Guard standard.** A guard is only counted as structural if the **running
system** makes the protected property observable. A guard that requires the team
to self-report compliance is not a guard — it is the same trust that failed.

**Constraint observed.** C-11, C-14, C-16 and R-01–R-10 are **not resolved here**.
Where they create vulnerability, that is recorded and left open.

---

## Five guards cover most of the thirty-three

The audit converged. Rather than thirty-three separate mechanisms, five
structural guards carry most of the enforcement burden:

| # | Guard | Covers |
|---|---|---|
| **G1** | **Reference profile fixture** — a test user with zero network, low bandwidth, a low-end device, and no stated goals. Every core journey must complete for them, in CI. | CR-10, CR-17, CR-19, CR-23 |
| **G2** | **Declared ranking inputs + prohibited feature classes** — the complete list of ranking inputs is inspectable, and named classes (behavioural, popularity, commercial, cohort-outcome) are absent by construction. | CR-04, CR-06, CR-13, CR-27, CR-32 |
| **G3** | **Reasoning as primary artifact** — stored reasoning is what the system runs on; every summary is a projection of it. No render path bypasses it. | CR-12, CR-15, CR-24, CR-33 |
| **G4** | **Rate monitors with alerts on decline** — protected behaviours that should fire sometimes are measured, and a *falling* rate raises an incident rather than passing silently. | CR-11, CR-18, CR-20, CR-31 |
| **G5** | **Divergence monitoring between judgments** — the six judgments are independently addressable, and their disagreement rate is tracked. Judgments that never diverge are one computation wearing several names. | CR-21, CR-26, CR-29, CR-30 |

**G4 deserves emphasis.** Several rules protect behaviours that are *supposed to
happen sometimes* — de-verification, empty results, unfamiliar opportunities,
sub-threshold surfacing. Each dies the same way: the rate drifts toward zero and
nobody notices, because nothing alerts on the absence of an event. **A declining
protected-behaviour rate must be treated as an incident.**

---

## Per-rule audit

### Framing rules — low exposure but not zero

| Rule | Literal compliance | How it becomes hollow | Observable test | Structural guard |
|---|---|---|---|---|
| **CR-01** Access before scarcity | "We aggregate opportunities" | Inventory growth becomes the proxy for access. Sources multiply; nothing more reaches anyone. | Ratio of opportunities **reaching an eligible person** to opportunities **held**. Falling ratio = accumulation replacing access. | Report reach-per-held as a standing metric. Inventory size alone may never be reported as progress. |
| **CR-02** Concealment ≠ rejection | "We never guarantee outcomes" | Copy and AI output imply success — *"the scholarship you deserve"*, *"strong chance"*. | Scan of generated text and UI copy for success-predictive language. Count > 0 is a failure. | **No stored field for predicted probability of winning.** Unrepresentable, therefore unshowable. |
| **CR-03** Pillars derived, none dropped | All pillars "present" | A pillar survives as a stub — verification is an HTTP HEAD; explanation is a label. | Per-pillar non-triviality check on every surfaced item: does each emit a populated structured artifact? | Each pillar emits a required structured artifact. Empty artifact = judgment cannot render. |
| **CR-07** Many interfaces, one intelligence | "All surfaces available" | One surface gets investment; others become vestigial shells that cannot reach the reasoning. | For each surface: can it answer *"why this?"* If not, it is disconnected from the intelligence. | Single shared judgment layer; surfaces are views over it, never independent pipelines. |
| **CR-09** Accountable for access, not outcomes | "We own five domains" | **Preparation** is quietly dropped as expensive — the only one requiring sustained work per person. | Coverage: fraction of surfaced high-consequence opportunities with preparation support attached. | Preparation is one of the six required judgments. Absent = incomplete record, not a degraded one. |
| **CR-16** The friction test | Every feature has a friction story | Stories written post-hoc and never tested. Unfalsifiable by construction. | Count of shipped features with no recorded friction claim, and no measured before/after. | Friction claim recorded **at proposal time** with a measurable delta. Unfalsifiable claims rejected. *(Governance, not runtime.)* |

### The truth rules — high exposure

| Rule | Literal compliance | How it becomes hollow | Observable test | Structural guard |
|---|---|---|---|---|
| **CR-05** Deadline state truth-critical | Deadlines stored and displayed | Staleness unbounded. The deadline is accurate as of an unknown past date. | Age distribution of deadline verification for **currently displayed** items. Count exceeding any bound. | Deadline carries a verification timestamp. Display path refuses to state a deadline as fact once freshness expires — it must weaken its claim instead. |
| **CR-11** Verification continuous | "We re-verify" | Interval stretched until continuous is nominal. Nothing ever loses verified status. | **Count of items that have ever transitioned verified → unverified.** If that number is zero, decay does not work. | Verification state carries an expiry and **fails closed**: expired means not verified, never "still verified". De-verification rate monitored (G4). |
| **CR-15** Trust asymmetrical; burden of proof | Every recommendation has evidence | Evidence becomes a boilerplate blob, identical across thousands of items. | Distinct-evidence ratio. Count of recommendations whose evidence is empty or byte-identical to others. | Evidence is per-claim and traceable to a source. Identical evidence across many items is a detectable smell, alerted on. |
| **CR-29** Verification proportionate to consequence | "We scale verification by risk" | Everything gets classified low-consequence, because that is cheaper. | Distribution of consequence classifications over time. Drift toward "low" is the signal. | Consequence class **derived from declared opportunity attributes** — documents requested, fees, time demanded — not from a discretionary call. |
| **CR-30** Truth not person-relative | "Verification is global" | Per-user verification creeps in via caching, overrides, or personalised confidence. | For any opportunity: is verification state byte-identical across all users? Directly checkable. | Verification stored once per opportunity. **No per-user verification field exists.** |

### The explanation rules — highest exposure

| Rule | Literal compliance | How it becomes hollow | Observable test | Structural guard |
|---|---|---|---|---|
| **CR-12** Understanding reduces uncertainty | "We explain every opportunity" | Explanation degrades to labels: *you qualify · deadline soon · high confidence*. Presents as improvement. | Mean count of populated reasoning components per judgment, tracked over releases. Declining = hollowing. | **G3.** Reasoning is the primary artifact; summaries are projections. No render path can display a judgment whose reasoning was never produced. |
| **CR-33** Not replaced by summary | Six components "supported" | Components exist but are auto-filled with generic text. | Can an independent reader answer all six questions from what is displayed? Sample-audited, scored. | Same as G3, plus: components must derive from the specific item's evidence, and identical-text rates are monitored. |
| **CR-24** Person-model inspectable; inference labelled | "We label inference" | One blanket disclaimer — *"some information is inferred"* — covering everything, distinguishing nothing. | Ratio of person-attributes carrying **specific** provenance to those covered by a blanket notice. | Every attribute carries known/inferred/unknown plus source. UI renders provenance **per attribute**; no blanket banner satisfies the rule. |
| **CR-32** Infer context, never destiny | "We do not predict success" | Capability inference smuggled in as a "fit score" fed by cohort-outcome features. | Audit inference inputs for cohort-outcome-derived variables. Check whether any inference feeds a negative judgment. | **G2.** Cohort success rates in the prohibited class. Inference outputs typed *circumstance* vs *capability*, with capability structurally unrepresentable. |

### The attention rules — high exposure

| Rule | Literal compliance | How it becomes hollow | Observable test | Structural guard |
|---|---|---|---|---|
| **CR-04** Success is reduced missed potential | "We don't optimise engagement" | Engagement collected "for diagnostics", then quietly becomes a goal, then a ranking input. | **Inspect the ranking model's input list.** Session length, click count, or return frequency present = CR-04 is dead. | **G2.** Behavioural signals in the prohibited class. Ranking inputs declared and reviewable. |
| **CR-06** Popularity encodes privilege | "Ranking is fit-based" | Popularity enters indirectly — *trending*, collaborative filtering, engagement-derived features. | Audit for any feature derived from aggregate user behaviour, however transformed. | **G2.** Popularity-derived features prohibited by class, not by name. |
| **CR-13** Attention is scarce | "We rank by relevance" | Ranking optimises throughput. Volume per person grows quarter over quarter, unremarked. | Items surfaced per person per week, tracked. Growth without a stated reason = attention being spent, not allocated. | An explicit per-person attention budget that ranking must fit inside. Raising it requires a recorded decision. |
| **CR-14** Quality dominates quantity | "We prioritise quality" | "Quality" redefined as engagement-weighted, closing the loop CR-04 opened. | Recommendation count distribution; fraction of person-weeks with zero recommendations. | Paired with CR-20's monitor. Quality may not be defined by any behavioural signal (G2). |
| **CR-20** Must be able to return nothing | Empty state implemented | Bar lowered continuously until the empty result never appears. Nobody amends anything. | **Frequency of the empty result over time.** Trending toward zero = the bar moved. | **G4.** Empty-result rate is a monitored metric; **a decline raises an incident.** |
| **CR-31** Expand the possibility space | "We surface unfamiliar opportunities" | The slot is filled with near-matches wearing an unfamiliar label. | Computed distance between each "outside your interests" item and the person-model. Small distance = near-matches. | Novelty measure attached to each such item; distribution monitored (G4). |
| **CR-18** Awareness ≠ endorsement | Sub-threshold items "are shown" | Shown in the DOM, buried where nobody reaches them. | **Measured reach:** of users with a sub-threshold match, what fraction ever saw it? Not presence — visibility. | **G4.** Impression logging for sub-threshold items with a discoverability floor. |

### The autonomy rules — high exposure

| Rule | Literal compliance | How it becomes hollow | Observable test | Structural guard |
|---|---|---|---|---|
| **CR-25** Curation without ownership | "The override exists" | Three taps deep, unstyled, undiscoverable. Or: using it becomes a negative signal. | Override depth measured in taps. Override usage rate. **Whether override events appear in any learning input.** | Override is a first-class action at the same depth as the primary action. Override events **excluded from all learning inputs**, verifiable by inspecting G2's list. |
| **CR-26** Higher bar for discouragement | "Negative judgments are careful" | Same bar as positive, different wording. | **Compare evidence-set size and quality for positive vs negative judgments. Equal = CR-26 is not implemented.** | **G5.** Asymmetric thresholds declared and enforced at the judgment layer; the ratio is monitored, not assumed. |
| **CR-21** Mechanisms separable | Six judgments in the schema | Separate in the data model, collapsed in practice — one score drives all six. | **Do the six judgments ever disagree?** If verification and ranking never diverge, they are one computation with six names. | **G5.** Six independently addressable judgments, each with its own evidence. Divergence rate tracked. |
| **CR-19** No dependence on another person | "No referral required" | A feature quietly requires an invite, a share, or a social step to reach value. | Dependency audit: does any path to value require another human? | **G1.** The zero-network reference profile must complete every core journey in CI. |
| **CR-22** Earn personalisation | "Onboarding is short" | Grows one justified field at a time. Each addition is defensible; the sum is not. | Count of fields required before first useful output, tracked per release. | Hard cap at FPR-02's set. Adding a pre-value field requires an explicit constitutional amendment, not a product decision. |
| **CR-23** No required self-knowledge | "Goals are optional" | *"What are you looking for?"* returns as an optional-but-default step, or as required onboarding framed as helpful. | Is there any path where output is withheld because the person stated no goals? | **G1.** The reference profile states no goals and must still receive judgment. |

### The economic rules — high exposure, currently unguarded

| Rule | Literal compliance | How it becomes hollow | Observable test | Structural guard |
|---|---|---|---|---|
| **CR-27** Revenue may never purchase judgment | "No paid placement" | A "partnership" that does not technically pay for placement but correlates with it. | **Correlation between commercial relationship and surfaced rate / ranking position.** Directly computable. If partners outperform non-partners, investigate. | **G2** — no commercial field among ranking inputs — plus a standing correlation test between partner status and outcomes. |
| **CR-28** Economically capable of silence | "We don't sell ads" | A revenue model is adopted that punishes silence, without anyone noticing it does. | Correlation between revenue and items-surfaced or sessions. | **Simulate a month of empty results and measure revenue impact.** If revenue falls materially, CR-28 is violated by the business model regardless of intent. |
| **CR-17** Beauty must never reduce access | "It degrades gracefully" | "Degrades" means it technically loads. The judgment is unusable; the page is not blank. | Core **task completion** on the reference profile — not page load. Weight and time-to-first-useful-content budgets. | **G1.** The reference profile must be able to *act on a judgment*, not merely render a page. |
| **CR-10** Inverse-access priority | "We asked the question" | The test is asked rhetorically and always answered yes. | Reference-profile pass rate per feature. Any feature requiring external social input fails. | **G1**, applied per feature rather than per release. |
| **CR-08** Lateness is failure where the system knew | "We deliver promptly" | "Knew" defined narrowly to shrink liability — knowledge dated from processing rather than ingestion. | **Per (opportunity, eligible person): time from first ingestion to first delivery.** Distribution published. This is the founding failure, made measurable. | Log ingestion→delivery latency per eligible person and publish the distribution. **If nobody measures it, CR-08 is unenforced by definition.** |

---

## Where open questions create vulnerability

Identified, **not resolved**.

| Open item | Vulnerability it leaves |
|---|---|
| **R-02** — 88% uncalibrated | CR-29 and CR-30's guards assume a meaningful threshold. An uncalibrated number can be moved without any observable violation, because nothing defines what it should be. |
| **R-04** — negative-judgment bar unspecified | CR-26's guard can detect *whether* the bars differ but not whether the gap is adequate. Detects absence, not sufficiency. |
| **R-05** — who pays undecided | **CR-28 has no enforceable guard until a payer exists.** The simulation test cannot run against a model that does not exist. This is the largest unguarded surface. |
| **R-06** — consequence model absent | CR-29's guard depends on deriving consequence from declared attributes. Without a model, classification stays discretionary and drift-prone. |
| **R-07** — risk-to-judgment relationship undefined | CR-30's separation is stated but not testable. Cannot verify that risk moved the threshold rather than the verification. |
| **R-08** — exploration breadth undefined | CR-31's novelty monitor has no floor to alert against. Detects a trend, not a violation. |
| **R-09** — inference boundary undefined | CR-32's prohibited-feature class needs an actual list. Currently a principle without an enumeration. |
| **C-14** — cold start unsolved | CR-22's field cap and CR-32's inference permissions are in tension. The cap may starve the mechanism; nothing yet establishes it doesn't. |
| **C-16** — clean revenue still pressures silence | Compounds R-05. Even the best payer choice leaves residual CR-20/CR-28 pressure. |
| **C-11** — peer distribution | Largely constrained by CR-19 and G1, but not formally closed. |

---

## Disposition — where each guard belongs

The founder asked that constitutional changes be separated from everything else.

### Requires CONSTITUTION.md amendment

1. **Ratify CR-33's structural guard** — *the reasoning is the primary artifact; any summary is a projection of it.* Currently recorded as a candidate. It is the load-bearing guard for four rules and should be law, not a proposal.
2. **Add the protected-behaviour principle** — a rule protecting a behaviour that should occur *sometimes* is violated by that behaviour's disappearance. A declining protected-behaviour rate is an incident, not an absence of news. Governs CR-11, CR-18, CR-20, CR-31.
3. **Amend CR-22** — raising the pre-value field cap requires a constitutional amendment rather than a product decision. Otherwise the cap erodes one defensible field at a time.
4. **Resolve CR-18's pending wording** — still marked *"wording pending ratification"* from Phase 4.

### Architecture

- G2's declared ranking inputs with prohibited feature classes
- G3's reasoning-primary information model
- G5's six independently addressable judgments
- CR-02's absent success-probability field; CR-30's absent per-user verification field
- Verification expiry that fails closed

### Testing

- G1's reference profile fixture, in CI, per feature
- CR-28's empty-month revenue simulation
- CR-33's independent-reader audit of the six components

### Observability

- G4's rate monitors with alerts on decline: de-verification, empty results, novelty, sub-threshold reach
- CR-08's ingestion→delivery latency distribution
- CR-27's commercial-correlation test
- CR-13's attention budget; CR-22's field count; CR-29's consequence distribution

### Governance

- CR-16's friction claims recorded at proposal time with measurable deltas
- Periodic re-run of this audit; new rules audited against this threat class at ratification

---

## The finding underneath the audit

Thirty-three rules, five guards. The enforcement surface is far smaller than the
rule set — which is good news, and also the warning: **five mechanisms carry
almost the entire Constitution.** If G1 through G5 are not built, the document is
declarative regardless of how carefully each rule is worded.

And one asymmetry worth stating plainly. Most of these guards detect
**disappearance** — a rate falling to zero, a divergence that never occurs, a
component that stopped being populated. Disappearance is silent by nature. No
error is raised when something stops happening.

That is precisely why compliance-shaped failure works.
