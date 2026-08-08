# Engine of Discovery — Requirements

**Authority.** This document states what must exist, derived from CR-01–37 and
the Phase 14 findings. **It is the standard. The Architecture Specification is
the thing being judged against it.**

**Written before the specification was seen — deliberately.** Requirements
authored after reading an artifact are anchored by it. Fixing them first is what
prevents the existing architecture from softening the engine, which is Principle
Zero applied to this phase.

**Not architecture.** Nothing here specifies a technology, a schema, a service
boundary, or a storage engine. Each requirement states a property that must hold
and the test that decides whether it does.

---

## Carried forward from Phase 14 — as requirements, not assumptions

- CR-01–37 are law
- Product Essence, Opportunity Ontology, and the three-layer model are ratified
- Discovery operates on **claims/observations**, never listings
- Observations are **immutable and undeletable**
- Entities resolve multiple observations into opportunities
- **Verification attaches to the entity**
- Risk, ranking, recommendation, action operate on the **person–opportunity pairing**
- Five discovery mechanisms, with **institutional channel monitoring as primary**
- R-01, R-13, R-14, R-15 answered · R-16 is fieldwork
- **C-18 open, narrowly scoped.** The variable is **routing, not organiser size**.
  The blind spot: an opportunity whose organiser neither *is* an institution nor
  *routes* to one, published on an independent domain.
  **One-in-twenty is evidence the residue exists, not a population rate.**
- C-11, C-14, C-16 open
- **R-15's denominator problem is itself the finding.** Desk research cannot
  measure what proportion of opportunities reach students, because the required
  population is student-observed and web search introduces both circularity and
  survivorship bias.

---

## A · Layer separation

| # | Requirement | Source | Test |
|---|---|---|---|
| **ER-01** | Three distinct layers: Observation, Entity, Judgment. None may be collapsed into another. | CR-36 | For any live judgment, retrieve the specific observations it rests on |
| **ER-02** | Observations are append-only, immutable, **undeletable** | CR-37 | Observation count per entity never decreases; no deletion path exists |
| **ER-03** | Re-encounter **appends**; it never updates | CR-37 | No observation has a modification time later than its creation time |
| **ER-04** | Entity-resolution decisions are recorded with rationale; corrections are additive | CR-36 | A superseded resolution remains retrievable |
| **ER-05** | Verification attaches to the **entity**. **No per-user verification field may exist.** | CR-30 | Verification state is byte-identical across all users for a given entity |
| **ER-06** | Risk, ranking, recommendation, action attach to the **pairing** | CR-30 | — |
| **ER-07** | The six judgments are independently addressable, each with its own evidence, and **must be capable of disagreeing** | CR-21 | Do verification and ranking ever diverge? If never, they are one computation |

## B · Observation content

| # | Requirement | Source |
|---|---|---|
| **ER-08** | Each observation carries: what was claimed · where · when observed · source content · source identity · apparent details at that moment · representation identity · relationships to other observations | CR-36 |
| **ER-09** | **Retrieval timestamp is distinct** from any date stated inside the opportunity | CR-36, CR-08 |
| **ER-10** | Extraction/parser version recorded per observation | R-12 |
| **ER-11** | Content retained sufficient to reconstruct the claim — **not a hash alone.** A hash proves change; it cannot reconstruct what was claimed | R-13 (Chevening mutable page) |

## C · Retention

| # | Requirement | Source |
|---|---|---|
| **ER-12** | Class A retained permanently: retrieval timestamp · source identity and URL · content as observed · parser version · resolution decisions · **verification state transitions** · delivery events · eligibility at delivery · first-observation provenance · **explanations actually shown** · fetch failures against known entities | R-12 |
| **ER-13** | Class B (current verification state, entity graph, status, person-model) must be **reconstructible from Class A** and may never be the sole record of anything | R-12 |
| **ER-14** | Class C is recomputable **only if the logic version that produced it is retained.** Without versioning, every judgment becomes Class A | R-12 |
| **ER-15** | **Evidence is held, not borrowed.** Reconstruction may not depend on re-fetching from the source — three of four topologies are unrecoverable, and dependence on a third party's retention reintroduces CR-19's failure at the level of auditability | R-12, R-13 |
| **ER-16** | *What we told someone* is retained as evidence, separately from recomputable projections | R-12 |

## D · Delivery and CR-08

| # | Requirement | Source | Test |
|---|---|---|---|
| **ER-17** | For each (opportunity, eligible person): **first-ingestion time · eligibility determination at that time · first-delivery time.** All three stored. | CR-08 | Can *"we didn't know in time"* be adjudicated? Discard any one and it cannot |
| **ER-18** | Ingestion→delivery latency distribution is measurable and published | CR-08 | If nobody measures it, CR-08 is unenforced by definition |

## E · Verification

| # | Requirement | Source | Test |
|---|---|---|---|
| **ER-19** | Verification state carries an expiry and **fails closed** — expired means not verified, never "still verified" | CR-11 | — |
| **ER-20** | **Transitions retained**, not merely current state | CR-11 | Has anything ever gone verified → unverified? If never, decay does not work |
| **ER-21** | Verification depth scales with the opportunity's **inherent stakes**; the recommendation threshold scales with the **person's cost of being wrong**. These are different scalings on different objects. | CR-29, CR-30 | — |
| **ER-22** | Expiry is **derived, never read.** No source in four topologies expresses closure. | R-01 F-9, R-13 | — |
| **ER-23** | An entity can hold **claims that disagree**, and that state is expressible | R-01 F-6, R-13 | — |

## F · Discovery

| # | Requirement | Source |
|---|---|---|
| **ER-24** | Five acquisition mechanisms: institutional artifact crawl · change detection on stable URLs · unknown-domain discovery · platform integration · **institutional channel monitoring (primary)** | R-13, R-14 |
| **ER-25** | An enumerable **announcer registry** — universities, ministries, agencies, funds, corporate newsrooms | R-14, R-15 |
| **ER-26** | Monitoring covers the **subdomain space** of enumerated announcers, not only known page paths. New programmes commonly appear at `programme.institution.tld` | R-15 F-4 |
| **ER-27** | **First-observation provenance recorded** (official vs aggregator). This is the C-18 metric; discard it and aggregator dependency becomes unmeasurable | R-12, C-18 |
| **ER-28** | An institutional announcement is an ordinary claim. No separate discovery ontology | CR-35 |

## G · Enforcement guards — must be structurally possible

| Guard | Requirement |
|---|---|
| **G1** | A reference profile fixture — zero network, low bandwidth, low-end device, **no stated goals** — completing every core journey in CI |
| **G2** | Ranking inputs **enumerable and inspectable**, with prohibited feature classes absent by construction: behavioural · popularity · commercial · cohort-outcome |
| **G3** | Reasoning stored as the primary artifact; **no render path may bypass it** |
| **G4** | Rate monitors that **alert on decline**: de-verification · empty results · novelty · sub-threshold reach |
| **G5** | Six independently addressable judgments with divergence monitoring |

## H · The five decisive tests — must remain binary and auditable

| Test | Question | Binary answer |
|---|---|---|
| **CR-11** | Has any opportunity ever gone verified → unverified? | Yes / No |
| **CR-26** | Do negative judgments require more evidence than positive ones? | Compare evidence-set size; equal = not implemented |
| **CR-21** | Can verification and ranking structurally disagree? | Yes / No |
| **CR-08** | Is ingestion time retained per opportunity and delivery time per eligible person? | Both / not both |
| **CR-28** | Does revenue survive a month of honest silence? | **Cannot run — R-05 unresolved.** Deferred, not passed |

## I · Presentation and prohibition

| # | Requirement | Source |
|---|---|---|
| **ER-29** | No composite score may stand for multiple judgments | CR-21, CR-33 |
| **ER-30** | Entity-level fact distinguishable from pairing-level inference in output | CR-24, CR-30 |
| **ER-31** | Person-model typed **known / inferred / unknown**, per attribute, inspectable | CR-24, CR-32 |
| **ER-32** | Sub-threshold opportunities surface with uncertainty exposed; **reach measurable**, not merely presence | CR-18 |
| **ER-33** | Override is a first-class action, and override events are **excluded from all learning inputs** | CR-25 |
| **ER-34** | The empty recommendation is first-class; its rate is monitored and a decline is an incident | CR-20, CR-34 |
| **ER-35** | **No stored field for predicted probability of winning** — unrepresentable, therefore unshowable | CR-02, CR-09 |
| **ER-36** | No capability inference from cohort. Circumstance and capability are distinct types; capability inference is structurally unrepresentable | CR-32 |

---

## Reconciliation procedure

When the specification arrives, each component is judged against the above and
classified:

| Class | Meaning |
|---|---|
| **Supports** | Satisfies the requirement structurally |
| **Superficial** | Satisfies the wording, fails the test — compliance-shaped |
| **Cannot support** | Structurally precludes it; requires change |
| **Missing** | Layer or information absent entirely |
| **Wrong layer** | Present, but collapsed into the wrong one of the three |
| **Contradicts** | Conflicts with a constitutional rule |

The founder's eleven questions map onto these requirement groups:

| Question | Requirements |
|---|---|
| 1–3 · supports / superficial / cannot support | All |
| 4 · missing layers | A, B |
| 5 · wrong-layer collapse | ER-01, 05, 06, 07 |
| 6 · guards possible | G1–G5 |
| 7 · decisive tests binary | Section H |
| 8 · immutability incl. deletion | ER-02, 03 |
| 9 · evidence held not borrowed | ER-15 |
| 10 · logic versioning | ER-10, ER-14 |
| 11 · told vs recomputable | ER-16 |

**No architecture will be proposed before the specification is read.** Where it
contradicts the Constitution, the contradiction is recorded — the engine is not
adapted to fit existing software.

---

## Open items that constrain reconciliation

| Item | Effect |
|---|---|
| **R-05** — who pays | **CR-28 cannot be tested.** Largest unguarded surface |
| **R-02** — 88% uncalibrated | ER-21's threshold has no defined meaning yet |
| **R-11** — entity resolution | ER-04 required; the method is unsolved. URL identity fails in both directions |
| **R-12** — retention boundary | Class A justified epistemically; **cost unmeasured**, and CR-28 makes cost constitutional |
| **R-16** — fieldwork | C-18's residue unquantified |
| **C-11, C-14, C-16, C-18** | Open |

A specification cannot be marked compliant on any requirement whose governing
research question is unresolved. It can be marked **compatible** — capable of
supporting the requirement once the question is answered.
