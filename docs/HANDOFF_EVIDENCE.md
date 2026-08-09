# Handoff — New Evidence for Reconciliation

**From:** a session working in `aeonligh/opportunity-x-12b762aa`
**To:** the session working in `aeonligh/Aeon-X-Technologies-` @ `6c16152`
**Date:** 2026-08-08

---

## What this is, and what it is not

This document carries **two bodies of evidence** that do not appear in
`docs/constitutional/` at `6c16152`. Everything else produced in the originating
session either duplicates that corpus at lower resolution or was derived against
a **parallel rule set (CR-01–37) that is not the canonical Constitution.**

**These findings are offered as evidence for reconciliation. They are not merged
into the constitutional corpus, and they carry no authority over it.** Where they
touch a question the Product, Experience, Brand, Information Architecture, UX
Flows or Component System Bibles already settle, **the Bibles govern.**

The originating session could not read those Bibles. Their absence is the reason
this is a handoff rather than a proposal.

**Method and its limits.** Findings rest on web search with domain filtering. All
direct page fetches were blocked by that environment's egress proxy — including
`education.gov.ng`, `myschoolgist.com`, `t.me` and `en.wikipedia.org` — so no
primary page was read end to end. Grades throughout:

| Grade | Meaning |
|---|---|
| **B+** | URL paths and titles directly observed in a search engine's index of the source domain |
| **B** | Multiple independent results agree; no primary source read |
| **C** | Single result, or a source with an interest in the claim |
| **UNKNOWN** | Could not be established |

---

# Part 1 · Source-topology research

## 1.1 The vocabulary distinction — central to everything below

These five are routinely conflated, and the conflation is what produces most of
the failure modes:

| Term | Definition |
|---|---|
| **Publisher** | The party whose domain hosts the artifact. May not exist until the opportunity does. Cannot be enumerated in advance. |
| **Announcer** | A party that tells its own community an opportunity exists. Usually a permanent institution. **Can be enumerated in advance.** |
| **Observation** | A record that a claim was encountered — where, when, by what, saying what. |
| **Claim** | An assertion that a possibility exists. A PDF, a page, a message, a listing. |
| **Entity** | The underlying opportunity itself, which many claims may describe. |

**A publisher is not an announcer. A claim is not an entity. An observation is
not either of them.**

## 1.2 Findings

### F-1 · Official sources retain expired adverts indefinitely · **B+**

Nigeria's Federal Scholarship Board serves adverts spanning **2019 through 2025
simultaneously**, none carrying an expiry marker:

```
/fsb/wp-content/uploads/2019/10/FEDERAL-SCHOLARSHIP-BOARD-ADVERT-2020-2021-BEA-NA.pdf
/wp-content/uploads/2020/12/2021-COMMONWEALTH-...-CSFP-ADVERT.pdf
/wp-content/uploads/2021/12/2022-2023-BEA-ADVERT-FINAL.pdf
/fsb/wp-content/uploads/2023/09/2024-2025-commonwealth-advert.pdf
/fsb/wp-content/uploads/2023/11/2024-2025-BEA-ADVERT.pdf
/wp-content/uploads/2023/09/Mauritius-2024-Advert-corrected.pdf
/wp-content/uploads/2025/08/2025-.2026-commonwealth-advert.pdf
```

**A closed 2020 advert and an open one are indistinguishable at the source.**

Consequence: a crawler ingesting today finds **seven cycles presented
identically**. Recency cannot be inferred from the document.

### F-2 · The same opportunity exists at multiple URLs · **B+**

One BEA advert, three addresses on the official domain:

```
/wp-content/uploads/2021/12/2022-2023-BEA-ADVERT-FINAL.pdf
/fsb/wp-content/uploads/2021/12/2022-2023-BEA-Advert-Final.pdf
/2022-2023-bea-advert-final-2/
```

Two separate WordPress installations plus an HTML wrapper. Capitalisation differs
between the PDF paths. **The `-2` slug suffix is WordPress's automatic
duplicate handling** — that page was published at least twice.

**Duplication is present in the source, not introduced downstream.**

### F-3 · Revisions appear as new files with no supersession link · **B+**

`...-BEA-ADVERT-FINAL.pdf` · `Mauritius-2024-Advert-corrected.pdf`

`FINAL` and `corrected` indicate revision-and-reupload under a new filename. **The
superseded version is not necessarily removed, and nothing links the two.** A
wrong version and its correction can be live simultaneously, unconnected.

Filename conventions are inconsistent across years — casing, ordering,
separators, and a stray period in `2025-.2026-`. **Filename pattern-matching is
not a viable strategy.**

### F-4 · One stable URL can represent different cycles over time · **B+**

Chevening publishes a **stable timeline page whose content mutates each cycle**
(`/scholarships/application-timeline/`), alongside dated news posts that persist
(`/news/applications-for-2020-2021-chevening-scholarships-open/` is still live).

A generic slug also exists — `/news/applications-for-chevening-scholarships-are-open/`
— which, if reused, means **the same URL asserts different opportunities at
different times.**

Recoverable historical windows: 2020/21 closed 7 Nov 2019; 2016/17 ran 3 Aug –
3 Nov 2015; 2027-28 closes **6 Oct 2026 at 11:00 UTC**.

### F-5 · URL identity is neither necessary nor sufficient for entity identity

**This follows directly from F-2 and F-4, which fail in opposite directions:**

| Failure | Source | Shape |
|---|---|---|
| Many addresses → one opportunity | FSB | URL identity **over-counts** |
| One address → many opportunities | Chevening | URL identity **under-counts** |

Add name divergence (§1.3 below) and title matching fails too. **What remains is
content-level correspondence** — organiser, sponsor, dates, prize, eligibility.

### F-6 · Expiry must be derived, never trusted from presentation · **B+**

**Closure is expressed by none of the four topologies examined.** FSB never
retires adverts. Chevening's timeline mutates without marking the prior cycle
closed. Aggregator pages for a competition that closed 9 July 2026 still read as
calls for applications a month later. Webinar registration pages simply pass.

### F-7 · Misinformation attaches to genuine programmes · **B**

The Federal Government publicly **disowned a viral notice** claiming scholarship
programmes had been suspended. This is a failure mode distinct from fake
opportunities: **a real programme surrounded by false claims about its status.**

Consequence: an entity must be able to hold **claims that contradict each other**,
and that state must be expressible rather than resolved away.

### F-8 · Announcers are more enumerable than publishers · **B+**

**NELFUND is the decisive case.** A brand-new federal agency on a brand-new
domain, created by an Act signed 3 April 2024, portal opened 24 May 2024 —
**comprehensively discoverable from day one** through the Presidency, government
service infrastructure (`gsp.galaxybackbone.com.ng`), and universities
republishing to their own students (`uniport.edu.ng/latest-info/...`).

Maximum domain novelty, **zero discovery problem.**

Nigerian universities operate structured, actively maintained opportunity
channels carrying **three distinct kinds**:

1. **Their own** — `unilag.edu.ng/cb4ee-engagement-series-call-for-expression-of-interest/`, UNN volunteering and workshops
2. **External opportunities affecting their students** — `unilag.edu.ng/ptdf-opens-2025-2026-in-country-scholarship-applications-for-unilag-students-apply-now/`, UniPort/TAGDev
3. **Third-party opportunities routed to them** — `unn.edu.ng/2025-2026-zeani-national-scholarship-award-nsa/`

University of Ibadan maintains a dedicated section: `ui.edu.ng/news/scholarship-opportunities`.

**Kind 3 is the important one** — it is the observed path by which small
organisers enter the institutional record.

### F-9 · Institutional-channel monitoring is therefore viable

> **You cannot enumerate publishers. You can enumerate announcers.**

The mechanism **inverts the problem.** It does not attempt to discover unknown
publishers — unbounded. It monitors known announcers — universities, ministries,
agencies, funds, corporate newsrooms — a **finite, stable, enumerable set** — and
catches new publishers as a side effect, **because the announcer is old even when
the publisher is new.**

**Refinement:** monitoring must cover the **subdomain space** of enumerated
announcers, not only known page paths. Well-resourced organisers place new
programmes on subdomains they already own — `hackaholics.wemabank.com`,
`3mtt.nitda.gov.ng` — which are reachable by watching the parent.

## 1.3 The residue — narrowly scoped

**The blind spot is not domain novelty**, which NELFUND falsifies. **Nor is it
organiser size**, which ZEANI falsifies — a small NGO whose scholarship was
announced by University of Nigeria Nsukka.

**The variable is routing:**

> An opportunity acquires an institutional announcer when it is **routed** to an
> institution whose community it affects.

Large organisers route by default, being institutions. Small ones route when they
ask. **The residue is:**

> An opportunity whose organiser **neither is an institution nor routes to one**,
> published on an **independent registrable domain**.

### The demonstrating case · **B+ / C on the negatives**

**DCP University Engineering Challenge** — ₦1.5m in prizes, teams of 2–4,
organised by the Academic & Research Board of the University of Lagos Engineering
Society, sponsored by Dangote Cement. Applications closed 9 July 2026; final
pitch 28 July 2026 at UNILAG; FUTA took first and third.

- Published on **`ulesarb.org`** — an independent domain, not a subdomain
- **The sponsor's own newsroom** (`cement.dangote.com`) publishes student
  opportunities — it carried the Dangote industrial internship scheme — but a
  domain-filtered search surfaced **nothing there for this competition**
- **The host university** publishes calls for applications and faculty news — but
  a domain-filtered search surfaced **nothing there for this competition**
- Discoverable in practice only via aggregators: Edugist, MSME Africa, Legit.ng,
  Scholarship Region, CrispNG

**Name divergence, which defeats title matching:** the official site calls it
**"DCP University Engineering Challenge."** Every aggregator calls it **"Dangote
Cement Undergraduate Research Competition 2026."** The only shared token is an
abbreviation.

**It originated inside a university that still appears not to have announced it**,
which suggests the class may be partly idiosyncratic rather than purely
structural.

### ⚠ The 1-in-20 figure is not a population rate

A 20-opportunity corpus produced one aggregator-only case. **That number must not
be treated as coverage.**

The corpus was assembled by web search, which biases it fatally in two directions:

1. **Circularity** — several entries were found *by domain-filtering searches to
   university sites*, making them institutionally-announced **by construction**
2. **Survivorship** — opportunities that never entered a search index are absent
   entirely, and that is precisely the population most likely to be
   aggregator-only

**The denominator is unresolved and cannot be resolved by desk research.** It
requires a sample of what actually reached students, obtainable only from
students. **One-in-twenty is evidence the residue exists. It is not evidence that
it is small.**

## 1.4 What remains UNKNOWN

- Whether `ulesarb.org` predates the competition
- Whether DCP was announced anywhere unindexed — social, newsletter, noticeboard
- Latency between public posting and social circulation
- Whether aggregators source from official sites or from each other
- Whether opportunities exist that **never** acquire any open-web source
- Webinar publication practice in this market (one weak instance only)
- Volunteering, training, accelerators, grants, internships — **not examined**
- **What proportion of opportunities reaching students have an enumerable announcer**

---

# Part 2 · Compliance-shaped failure audit

## 2.1 The core finding

> **A rule can remain technically present while becoming substantively dead, with
> every degradation appearing as product improvement.**

This is distinct from violation. **Nobody decides anything.** An explanation
requirement is satisfied by text that has quietly become labels; the screens get
faster, the copy gets shorter, engagement improves, and a reasonable team
concludes users do not want explanations — when what they do not want is *bad*
explanations.

**The test:**

> Could the team honestly say *"we comply with this rule"* while a person
> experiences the exact opposite of what the rule was created to protect?

**The asymmetry that makes it work:** most guards detect **disappearance** — a
rate falling to zero, a divergence that stops occurring, a component that stops
being populated. **Nothing throws an error when something stops happening.**
Monitoring absence has to be deliberate.

**Guard standard.** A guard counts only where the **running system** makes the
protected property observable. A guard requiring the team to self-report
compliance is the same trust that already failed.

## 2.2 The five structural guards

Presented as **mechanisms**, deliberately not tied to the originating session's
rule numbering. Each needs re-anchoring to whatever the Bibles actually require.

### G1 · Reference-profile enforcement

A fixture representing the least-served person — **zero network, low bandwidth,
low-end device, no stated goals** — that must complete every core journey, in CI,
per feature rather than per release.

Guards against: accessibility and access commitments that hold in review and fail
in the field; features that quietly require social input; "degrades gracefully"
meaning only that the page loads. **The test is task completion, not render.**

### G2 · Enumerable ranking inputs, prohibited features excluded

The complete list of ranking inputs is **inspectable**, and named classes are
absent **by construction**: behavioural signals, popularity, commercial
relationships, cohort-outcome variables.

Decisive check: *inspect the ranking model's input list.* If session length,
click count or return frequency appear, the prohibition is already dead.

Corollary: forbidden concepts should have **nowhere to be written**. A field that
cannot be stored cannot be shown.

### G3 · Reasoning as the primary artifact

> **Reasoning is stored and summaries are projections of it — never substitutes.**

If a summary can exist without the reasoning behind it, the reasoning is optional
and will atrophy. If the summary is *derived*, a judgment cannot be displayed
without the reasoning having been produced and retained, and completeness becomes
measurable rather than a matter of taste.

*Note for reconciliation: the canonical `core/tier0` already implements a stronger
form of this at the type level — `Claim` requires evidence and base rate as
non-optional fields, so an unsupportable claim cannot be constructed. **That
implementation exceeds this guard and should be the template, not replaced by
it.***

### G4 · Monitoring disappearance and decline

Behaviours that are *supposed to occur sometimes* must be measured, and a
**falling rate must raise an incident** rather than pass silently.

Applies to: verification decaying, empty results occurring, unfamiliar
opportunities surfacing, low-confidence items actually being reached.

Decisive checks — each binary:
- **Has any opportunity ever moved from verified to unverified?** If never, decay does not work.
- **Does the empty-result rate trend toward zero?** If so, the bar moved.
- **Of people with a low-confidence match, what fraction ever saw it?** Presence in the DOM is not reach.

### G5 · Divergence monitoring across the judgments

Separate judgments must be **independently addressable, each with its own
evidence, and structurally capable of disagreeing.**

Decisive check: **do they ever diverge?** Judgments that never disagree are one
computation wearing several names. A composite score makes the check impossible.

## 2.3 The pattern worth carrying regardless of rule numbering

Three separate prohibitions guard one failure:

| Forbids | |
|---|---|
| Presenting inference as knowledge | |
| Treating an override as a negative signal | |
| Treating absence as disinterest | |

> **Silence about something is not evidence against it.**

**Any system that learns from behaviour violates this by default. It must be
designed against.**

*Note for reconciliation: the canonical corpus states this independently as **the
Visibility Principle — "missing evidence is never negative evidence"** — and
enforces it structurally, since `Observation.observedAt` is required and a
non-event has no timestamp. **Two independent derivations of the same rule.**
Preserve both derivations in the record rather than treating either as the
source of the other.*

---

## Closing note

The originating session held **37 commits that could not be pushed** and produced
seventeen documents. **Only the two bodies of evidence above are offered.**
Everything else either restates `docs/constitutional/` at lower resolution or was
derived against a rule set that is not the canonical Constitution.

**The canonical repository at `6c16152` and the session that authored its 38
most recent commits are the authoritative working context.**
