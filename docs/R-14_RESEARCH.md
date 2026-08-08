# R-14 — Is There a Non-Aggregator Discovery Path?

**Question:**

> For opportunities known to have reached Nigerian students, can Opportunity X
> discover them through any non-aggregator path when the publisher/domain was
> unknown until the opportunity itself appeared?

**Method.** WebSearch with domain filtering; all direct fetches remain
egress-blocked. Grades as in R-01/R-13. Negative findings from domain-filtered
search are graded **C** — absence from an index is weak evidence.

---

## The finding, stated first

**A non-aggregator path exists, is well-evidenced, and is generalisable — but it
is keyed to the wrong variable in my earlier framing.**

> **You cannot enumerate publishers. You can enumerate announcers.**

New domains are not the problem. **NELFUND falsifies that directly:** a brand-new
federal agency on a brand-new domain, created by an Act signed 3 April 2024, and
comprehensively discoverable through pre-existing institutions from day one.

The discriminator is not the novelty of the domain. It is **the institutional
weight of the organiser.**

---

## Case 1 — NELFUND · **B**

| | |
|---|---|
| **What** | Nigerian Education Loan Fund — national student loan scheme |
| **Publisher existed before?** | **No.** Agency created by the Student Loans (Repeal and Re-enactment) Act 2024, signed 3 April 2024 |
| **Earliest non-aggregator signal** | Presidential/legislative announcement; portal opening announced 24 May 2024 |
| **Institutional republication** | Universities carried it directly — `uniport.edu.ng/latest-info/nelfund-announces-opening-of-student-loan-application-portal-for-2025-2026-academic-session/`. Also official LinkedIn, official Facebook, and government service infrastructure (`gsp.galaxybackbone.com.ng`) |
| **Viable non-aggregator path?** | **Yes, several, all independent of aggregators** |

**This is the case that breaks R-13's framing.** Maximum domain novelty, and no
discovery problem whatsoever — because the announcing entities were the
Presidency, the ministry, and every university with students affected.

## Case 2 — Institutional scholarships · **B+**

Nigerian universities operate **structured, actively maintained opportunity
channels**, and they carry external opportunities, not only their own:

| Institution | Surface | Carried |
|---|---|---|
| University of Ibadan | `ui.edu.ng/news/scholarship-opportunities` — **a dedicated section** | Fully-funded postgraduate scholarships |
| UNILAG | `unilag.edu.ng/ptdf-opens-2025-2026-in-country-scholarship-applications-for-unilag-students-apply-now/` | PTDF scholarship, with dates: opens 20 Apr 2026, closes 29 May 2026 |
| UNILAG | `unilag.edu.ng/inclusive-education-innovation-challenge-2026-call-for-applications/` | A call for applications for a challenge |
| UniPort | `uniport.edu.ng/latest-info/…tagdev-2-0…` | TAGDev 2.0 scholarship |
| UNILAG | `unilag.edu.ng/category/faculty-of-engineering-news/` | Faculty-level news category |

These are **permanent, enumerable, and finite** — roughly 170 Nigerian
universities, plus polytechnics, ministries, and agencies. Unlike publishers,
announcers can be listed in advance.

## Case 3 — DCP University Engineering Challenge · **C for the negatives**

| | |
|---|---|
| **What** | Industry-based engineering research competition, ₦1.5m, teams of 2–4 |
| **Publisher existed before?** | **Unknown** — `ulesarb.org` unfetchable; registration history unavailable |
| **Sponsor's own channel** | `cement.dangote.com` exists and **does publish student opportunities** — it carried the Dangote Cement industrial internship scheme. **Domain-filtered search surfaced nothing there for this competition.** |
| **Host university's channel** | UNILAG publishes calls for applications and faculty-of-engineering news. **Domain-filtered search surfaced nothing there for this competition** — it returned inter-faculty debates, the AI4Telco hackathon, convocation, and a different innovation challenge |
| **Earliest aggregator signal** | Edugist, MSME Africa, Legit.ng, Scholarship Region, CrispNG |
| **Viable non-aggregator path?** | **None identified.** Two institutional channels that plausibly could have carried it apparently did not |

**Outcome now visible:** the grand finale ran 28 July 2026 at UNILAG; FUTA took
first and third. Reported today by news outlets — again, not by the sponsor or
the host university in anything the index surfaced.

---

## Cross-case comparison

| Organiser weight | Example | Institutional announcement | Non-aggregator path |
|---|---|---|---|
| **Federal government** | NELFUND | Presidency, ministry, every university | **Strong — multiple independent** |
| **Agency / parastatal** | PTDF | Universities republish with dates | **Strong** |
| **International programme** | TAGDev, Chevening | Host universities + own permanent domain | **Strong** |
| **Corporate flagship** | Dangote internship scheme | Sponsor's own newsroom | **Present** |
| **Student society** | DCP / ULES ARB | **None found** | **None identified** |
| **Webinars** | — | Untested | **Unknown** |

**The variable is organiser weight, not opportunity category and not domain
novelty.** A competition organised by a ministry would be discoverable; the same
competition organised by a student society is not. The category is identical.

The mechanism behind it is mundane: **institutions announce what they are
responsible for.** A university announces what affects its students. A government
announces its own programmes. A corporate announces its flagship CSR. A student
society has no such obligation, reaches a small audience, and no larger body
takes responsibility on its behalf — so the opportunity enters the public record
only when a news outlet or aggregator picks it up.

---

## Consequence for C-18

**Narrow it substantially. Do not close it.**

**Not supported — the strong form.** Aggregators are *not* structurally required.
Institutional channel monitoring is a real, generalisable, enumerable mechanism
that reaches opportunities on brand-new domains.

**Supported — a narrow form, and C-18 should be rescoped to it:**

> For opportunities organised by **sub-institutional actors** — student societies,
> small NGOs, individual academics, informal collectives — no institutional
> channel may take responsibility for announcing, and aggregators may be the only
> practical path.

**My R-13 framing was wrong** and should be corrected in the record. I scoped
C-18 to *"domains that did not exist until the opportunity did."* NELFUND has
exactly that property and no discovery problem. Domain novelty is a red herring;
organiser weight is the real variable.

---

## Consequence for the Engine of Discovery

**A fifth acquisition mechanism, and probably the most important one:**

> **Institutional channel monitoring** — enumerate known announcers (universities,
> ministries, agencies, funds, major sponsors) and monitor their announcement
> surfaces continuously.

It works precisely because it **inverts the problem**. It does not attempt to
discover unknown publishers — an unbounded task. It monitors known announcers,
a **finite, stable, enumerable set**, and catches new publishers as a side effect
because the announcer is old even when the publisher is new.

Adding to R-13's four:

| # | Mechanism | Reaches |
|---|---|---|
| 1 | Institutional artifact crawl | FSB PDFs |
| 2 | Change detection on stable URLs | Chevening's mutable timeline |
| 3 | Discovery of unknown domains | *(remains unsolved — and now looks less necessary)* |
| 4 | Platform integration | Webinars |
| **5** | **Institutional channel monitoring** | **NELFUND, PTDF, TAGDev, university calls** |

Mechanism 5 substantially reduces the need for mechanism 3. It does not eliminate
it — DCP is evidence of the residue.

**Under CR-35 this is unproblematic.** An institutional announcement is a *claim*
about an opportunity, exactly like an aggregator post or an official PDF. The
observation model already accommodates it; no new constitutional machinery is
needed.

**Under the founder's ratification** — aggregators may be observation sources but
never required intermediaries — mechanism 5 is what makes that implementable for
the great majority of opportunities.

---

## What remains UNKNOWN

| Question | Status |
|---|---|
| Whether `ulesarb.org` predates the competition | **UNKNOWN** — unfetchable |
| Whether Dangote or UNILAG announced DCP somewhere unindexed (social, newsletter, noticeboard) | **UNKNOWN** — the negatives are grade C |
| **What fraction of opportunities reaching Nigerian students are announced by at least one enumerable institution** | **UNKNOWN — and this is the number that matters** |
| Webinar coverage under mechanism 5 | **UNTESTED** |
| Whether social channels of institutions carry what their websites do not | **UNTESTED** |

---

## Next empirical question — R-15

Not a founder question. C-18's residue is now scoped but **unquantified**, and its
size determines whether it is a rounding error or a structural hole.

> **R-15 — What proportion of opportunities that reach Nigerian students are
> announced by at least one enumerable institution?**

Method: assemble a corpus of opportunities known to have reached students, and
for each establish whether any enumerable announcer — university, ministry,
agency, fund, or sponsor newsroom — carried it, and how early relative to the
aggregators.

The answer sets the coverage ceiling of mechanism 5 and tells us precisely how
large the aggregator-only class is. If it is small, C-18 is a documented edge
case. If it is large, C-18 is a live constitutional problem for a substantial
share of the product's purpose.

---

## Sources

- [NELFUND on Wikipedia](https://en.wikipedia.org/wiki/Nigerian_Education_Loan_Fund) · [UniPort — NELFUND portal announcement](https://www.uniport.edu.ng/latest-info/nelfund-announces-opening-of-student-loan-application-portal-for-2025-2026-academic-session/) · [NELFUND LinkedIn](https://ng.linkedin.com/company/nigerianeducationloanfund) · [Galaxy Backbone service listing](https://gsp.galaxybackbone.com.ng/service-provider/nigerian-education-loan-fund/nelfund-student-loan-initiative)
- [UNILAG — PTDF scholarship call](https://unilag.edu.ng/ptdf-opens-2025-2026-in-country-scholarship-applications-for-unilag-students-apply-now/) · [UNILAG — Inclusive Education Innovation Challenge](https://unilag.edu.ng/inclusive-education-innovation-challenge-2026-call-for-applications/) · [UNILAG — Faculty of Engineering news](https://unilag.edu.ng/category/faculty-of-engineering-news/)
- [University of Ibadan — Scholarship Opportunities](https://ui.edu.ng/news/scholarship-opportunities) · [UI — fully funded postgraduate scholarship](https://ui.edu.ng/news/fully-funded-scholarship-postgraduate-study)
- [UniPort — TAGDev 2.0 call](https://www.uniport.edu.ng/latest-info/call-for-scholarship-applications-under-the-tagdev-2-0-programme-for-the-2026-2027-academic-year-at-the-university-of-port-harcourt/)
- [Dangote Cement — industrial internship scheme](https://cement.dangote.com/dangote-cement-launches-students-industrial-internship-scheme/)
- [FUTA tops the national engineering contest](https://thenewsnigeria.com.ng/2026/08/08/futa-emerges-top-performer-at-national-undergraduate-engineering-contest/) · [Legit.ng — competition opens](https://www.legit.ng/business-economy/industry/1718390-dangote-cement-opens-application-engineering-research-competition-offers-n15m/)
