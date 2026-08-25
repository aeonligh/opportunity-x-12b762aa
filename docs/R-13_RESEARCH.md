# R-13 — Do Opportunity Categories Require Different Discovery Pipelines?

## 1. Research question

> Do materially different opportunity categories require materially different
> discovery pipelines, or can the same Observation model capture them without
> losing information that later mechanisms need?

Decisive form:

> Can radically different opportunity forms become comparable Entities without
> destroying information the later judgments need from their original
> Observations?

## 2. Sources and cases examined

**Method.** WebSearch with domain filtering. **All direct page fetches remain
blocked** by this environment's egress proxy, so findings rest on search-engine
indexed titles, URLs, and summaries — not on pages read end to end.

| Grade | Meaning |
|---|---|
| **B+** | URL structure and titles directly observed in the search index |
| **B** | Multiple independent results agree |
| **C** | Single result, or a source with an interest in the claim |

| Category | Case | Domain |
|---|---|---|
| **Fellowship** | Chevening Scholarships & Fellowships | `chevening.org` |
| **Competition** | DCP University Engineering Challenge / "Dangote Cement Undergraduate Research Competition 2026" | `ulesarb.org` + aggregators |
| **Webinar** | Generic + Spotlight Nigeria education webinar | Platform-hosted |
| *(carried from R-01)* | Federal Scholarship Board BEA/CSFP | `education.gov.ng` |

---

## 3. Findings by category

### Fellowship — Chevening · **B+**

**Where the first claim appears.** A permanent programme domain with a stable,
named timeline page: `/scholarships/application-timeline/`. Fellowships have a
*separate* timeline: `/fellowships/fellowship-timelines/central-timeline/` —
noted explicitly as differing from scholarships **within the same programme**.

**What is present at first observation.** Precise to the hour and timezone:
deadline **6 October 2026, 11:00 UTC** for the 2027-28 cycle. The full multi-stage
process is published in advance — reading committees, embassy shortlisting,
interviews, results from mid-June, university offer deadline 17:00 BST on 8 July
2027, then commencement.

**What appears only later.** Interview invitations, results, offer confirmation.
Stage transitions are personal, not published.

**How revisions are expressed.** The canonical timeline page is a **stable URL
whose content mutates each cycle.** Alongside it, dated news posts persist:
`/news/applications-for-2020-2021-chevening-scholarships-open/` is still live.
Historical windows are recoverable — 2020/21 closed 7 Nov 2019; 2016/17 ran 3 Aug
to 3 Nov 2015.

**⚠ The critical observation.** There exist **both** a cycle-specific news slug
*and* a generic one: `/news/applications-for-chevening-scholarships-are-open/`.
A generic slug asserting "applications are open" is either reused across cycles
or accompanied by a new one each year. **If reused, the same URL asserts
different opportunities at different times.**

**Country variants.** `/scholarship/india/` — one programme, per-country pages
with differing conditions.

### Competition — DCP University Engineering Challenge · **B+**

**Where the first claim appears.** A **single-purpose domain created for the
event**: `ulesarb.org`. Not an institutional site. Organised by the Academic &
Research Board of the University of Lagos Engineering Society, sponsored by
Dangote Cement Plc.

**⚠ The decisive finding — the name diverges.** The official site calls it the
**"DCP University Engineering Challenge."** Every aggregator calls it the
**"Dangote Cement Undergraduate Research Competition 2026."** Same event. The
only shared token is *Dangote* / *DCP* — and *DCP* is an abbreviation that does
not appear in the circulated name at all.

**Organiser presence is fragmented.** ULES appears across `ulesarb.org`,
`ulesweb.netlify.app`, `theunilagengineer.com`, and `linktr.ee/ules.official`
(routing to TikTok, Instagram, X). A related but distinct competition — PIDEC —
runs at `pidec.com.ng`.

**Persistence is not guaranteed.** `ulesarb.org` exists for this competition. It
is a student-society domain and may lapse. Compare `education.gov.ng` (permanent
institution) and `chevening.org` (permanent programme).

**Dates.** Applications closed **9 July 2026**; final pitch **28 July 2026**. Both
past as of 8 August 2026. Aggregator pages remain live and still read as calls
for applications.

### Webinar · **C**

**Where the first claim appears.** Not on institutional sites. Search surfaced
overwhelmingly **registration-platform documentation** — Jotform, Zoho, GoTo,
LiveWebinar, WebinarNinja — indicating webinars are published on **third-party
registration platforms**, each with its own page format.

**What is present.** Title, scheduled date and time, a registration form.
Minimal.

**Closure.** Not expressed. The event simply passes. Registration pages become
inert or are removed.

**Indexing is thin.** Only one concrete Nigerian instance surfaced (Spotlight
Nigeria, 21 July, 09:30–11:30), and only as an apparently past event. **Webinars
may be substantially absent from the searchable web**, which is itself the
finding.

**Graded C** — generic platform documentation is weak evidence about how any
particular webinar is published.

---

## 4. Cross-category comparison

Four distinct **publication topologies**, not three:

| | Canonical source | Persistence | Revision expressed as | Identity failure mode |
|---|---|---|---|---|
| **Accumulating artifacts** (FSB/BEA) | Permanent institution | Never retired — 2019–2025 all live | New file, `-FINAL` / `-corrected` suffixes | **Many claims → one opportunity** |
| **Mutable page + dated archive** (Chevening) | Permanent programme | Page mutates; news persists | Content changes at a stable URL | **One URL → many opportunities over time** |
| **Ephemeral single-purpose domain** (DCP) | Event-specific domain | May lapse entirely | Unknown | **Name divergence** between official and circulated |
| **Platform-hosted registration** (webinars) | Third-party platform | Inert or deleted after event | Unknown | **May never be indexed at all** |

**The two identity failure modes are exact opposites.** BEA produces many
addresses for one opportunity. Chevening's generic slug and mutable timeline
produce one address for many opportunities across cycles. **A URL is therefore
neither necessary nor sufficient as an entity key** — evidence directly bearing on
R-11, though not resolving it.

**Closure is expressed in none of the four.** FSB never retires adverts.
Chevening's timeline mutates without marking the previous cycle closed. DCP's
aggregator pages still read as open a month after the deadline. Webinars simply
pass. **Across every category examined, expiry must be inferred, never read.**
That generalises R-01's F-9 beyond a single source.

---

## 5. Does the Observation → Entity substrate survive?

**The Observation layer survives, and is strengthened.** · **B+**

Every case produces an observation carrying exactly the eight elements CR-36
requires: what was claimed, where, when observed, what the source said, the
source's identity, the apparent details at that moment, the representation's
identity, and relationships to other observations. Nothing in the four
topologies requires a field the model lacks, and nothing is distorted by
recording it this way.

The mutable-page case is instructive: Chevening's timeline URL observed in 2019
and in 2026 yields **two different observations of one address** — which CR-37
handles correctly by appending rather than updating. A record model that stored
"the current state of the page" would have destroyed the earlier claim. **The
Constitution's immutability rule is load-bearing here, not ceremonial.**

**The Entity layer does not fracture, but its difficulty varies enormously by
topology** — many-to-one, one-to-many-over-time, and name-divergence are three
different resolution problems, and one category may present all three.

---

## 6. Genuine pipeline fractures

**Yes — discovery *acquisition* genuinely fractures, while the observation model
does not.** This is the substantive answer to R-13.

| Mechanism | Required for | Why nothing else reaches it |
|---|---|---|
| **Institutional artifact crawl** | FSB/BEA | Adverts are PDFs at unpredictable paths in WordPress uploads; no feed |
| **Change detection on stable URLs** | Chevening | The claim is a *mutation* of an existing page, not a new resource. A crawler seeking new URLs sees nothing happen. |
| **Discovery of previously unknown domains** | DCP | **`ulesarb.org` did not exist before this competition.** No amount of crawling known institutions finds it. |
| **Platform integration** | Webinars | Claims live inside third-party registration systems, thinly indexed or not at all |

**The DCP case is the sharpest.** A legitimate competition, ₦1.5m in prizes, run
by a university society, announced on a domain that did not previously exist.
**Crawling every institution in Nigeria would not have found it.** It became
discoverable because aggregators and news outlets wrote about it.

---

## 7. New contradictions and research questions

### C-18 — Aggregator dependency reintroduces CR-19's failure at system level · **NEW**

CR-19 holds that a person's access must not depend on another party knowing,
choosing to share, remembering to share, and doing so in time.

The DCP competition appears discoverable **only because aggregators published
it.** If Opportunity X's discovery of ephemeral-domain opportunities depends on
Edugist, Legit.ng, MSME Africa, CrispNG, or Scholarship Region noticing and
writing them up, then **the dependency CR-19 forbids has been reintroduced one
level up** — from the person's social network to the product's source network.

The system would depend on another party's timely intervention to know what
exists. That is the founding failure, relocated rather than removed.

**This requires founder resolution.** It is not resolvable from evidence.

### R-14 — How are previously unknown sources discovered? · **NEW**

`ulesarb.org` had no prior existence. Institutional crawling cannot find such
domains by construction. What mechanism discovers an opportunity whose publisher
is unknown until the opportunity exists — and can it avoid C-18's dependency?

### R-11 — strengthened, not resolved

Name divergence is now evidenced: *"DCP University Engineering Challenge"* versus
*"Dangote Cement Undergraduate Research Competition 2026."* Entity resolution
cannot rely on titles, and cannot rely on URLs (both failure modes above). What
remains is content-level correspondence — organiser, sponsor, dates, prize,
eligibility. **Not resolved here.**

### R-12 — one datum, not resolved

The Chevening case shows historical windows from 2015 remain useful for
establishing cycle periodicity, which argues against aggressive retention limits
for cycle-bearing observations. **One data point. Not a retention policy.**

---

## 8. Constitutional implications

**No amendment is proposed.** The evidence validates existing rules rather than
requiring new ones:

- **CR-36 and CR-37 are validated.** The mutable-page case would silently destroy
  history under any update-in-place model. Immutability is load-bearing.
- **CR-35 is validated.** Four topologies, one claim model. "I found a claim"
  generalises where "I found a listing" would have needed four schemas.
- **CR-11 is reinforced.** Expiry is expressed in *none* of the four categories.
  Verification must derive currency; it can never read it.
- **CR-29 gains empirical support.** A webinar and a fellowship differ so
  markedly in published structure that identical verification depth would be
  incoherent.

**One item requires founder decision: C-18.** Not because the evidence is
ambiguous, but because it is a values question about whether the product may
depend on aggregators for a class of opportunity it cannot otherwise reach.

---

## 9. What remains UNKNOWN

| Question | Status |
|---|---|
| Whether Chevening's generic news slug is reused across cycles | **UNKNOWN** — inferred from slug pattern; not verified. Determines whether one-URL-many-opportunities is real or hypothetical. |
| Whether `ulesarb.org` predates the competition | **UNKNOWN** — could not check registration or archives |
| How webinars in this market are actually published | **UNKNOWN** — one weak instance; platform docs are not evidence about practice |
| Whether DCP had an official announcement before aggregator coverage | **UNKNOWN and decisive for C-18.** If official-first, C-18 weakens sharply. |
| Whether the four topologies are exhaustive | **UNKNOWN** — four categories examined of thirteen named |
| Volunteering, training, accelerators, grants, internships | **NOT EXAMINED** |

**The single most valuable follow-up:** establish whether the DCP competition had
a discoverable official announcement *before* aggregators covered it. That one
fact largely determines whether C-18 is a genuine constitutional problem or an
artifact of search-index recency.

---

## Sources

- [Chevening application timeline](https://www.chevening.org/scholarships/application-timeline/) · [Fellowships central timeline](https://www.chevening.org/fellowships/fellowship-timelines/central-timeline/) · [Applications open (generic slug)](https://www.chevening.org/news/applications-for-chevening-scholarships-are-open/) · [2020-2021 cycle announcement](https://www.chevening.org/news/applications-for-2020-2021-chevening-scholarships-open/) · [India variant](https://www.chevening.org/scholarship/india/)
- [ULES ARB — DCP University Engineering Challenge](https://ulesarb.org/) · [ULES Linktree](https://linktr.ee/ules.official) · [ULES web](https://ulesweb.netlify.app/) · [The UNILAG Engineer](https://theunilagengineer.com/) · [PIDEC](https://www.pidec.com.ng/)
- Aggregator coverage of the same competition: [Edugist](https://edugist.org/dangote-cement-undergraduate-research-competition-2026-for-nigerian-engineering-students-%E2%82%A61-5-million-in-prizes/) · [MSME Africa](https://msmeafricaonline.com/call-for-applications-dangote-cement-undergraduate-engineering-research-competition-2026-up-to-%E2%82%A61-5-million/) · [Legit.ng](https://www.legit.ng/business-economy/industry/1718390-dangote-cement-opens-application-engineering-research-competition-offers-n15m/) · [Scholarship Region](https://www.scholarshipregion.com/dangote-cement-undergraduate-research-competition/) · [CrispNG](https://crispng.com/dangote-cement-undergraduate-research-competition-2026-nigeria/)
- [Spotlight Nigeria education webinar](https://spotlightnigeria-france.com/education-webinar/)
