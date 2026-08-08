# R-01 — Interim Research Findings

**Question:** Do important opportunities routinely originate or circulate in
closed channels that an open-web discovery system cannot observe?

**Status:** PARTIALLY ANSWERED. **R-01 cannot be retired.** Findings lean against
the strong form of the concern and support a weaker one.

**Method and its limits.** Web search succeeded; **direct page fetches were
blocked by this environment's egress proxy** for `education.gov.ng`,
`myschoolgist.com`, and `t.me`. Every finding below rests on search-result
summaries — secondary sources — not on primary pages read end to end. No finding
here is strong enough to become an architectural assumption. Graded accordingly.

| Grade | Meaning |
|---|---|
| **B** | Multiple independent search results agree; no primary source read |
| **C** | Single search result, or a source with an interest in the claim |
| **UNKNOWN** | Could not be established |

---

## Findings

### F-1 — Federal opportunities do have open-web sources · **B**

Nigeria's Federal Scholarship Board publishes through the Federal Ministry of
Education (`education.gov.ng`) and operates an application portal at
`scholarship.education.gov.ng`. Bilateral Education Agreement awards,
Commonwealth-linked awards, and PRESSID categories all appear to be announced
publicly.

**This weakens the strong form of R-01** at federal level. The founding
scholarship — international travel via a government-linked award — is the type
that *does* get published openly.

### F-2 — The canonical announcement is a PDF in a WordPress uploads directory · **B**

An official advert observed in results:

```
education.gov.ng/wp-content/uploads/2025/08/2025-.2026-commonwealth-advert.pdf
```

**Consequences for discovery, if this pattern holds:**

- No structured feed, no API, no schema markup
- Content lives in a **PDF**, not HTML — extraction is document parsing, not scraping
- Path is date-directory based (`/uploads/YYYY/MM/`), so new adverts appear at
  unpredictable URLs
- Filenames are irregular (note the stray period in `2025-.2026-`), so
  pattern-matching on filenames is unreliable

An open-web discovery system can reach this. It cannot reach it *conveniently*,
and a crawler built for structured listing pages would miss it entirely.

### F-3 — Some state scholarship boards have no functioning online presence · **B**

Results indicate some Nigerian states either lack an online scholarship portal or
lack a functioning board, with announcements distributed via **newspapers and
physical notice boards**.

**This is the strongest support for R-01's concern**, and it relocates the
problem: not that opportunities hide in *closed digital* channels, but that some
never enter the *digital* record at all. A perfect web crawler would not find
them because there is nothing to find.

### F-4 — Federal announcements also run through national newspapers · **B**

Confirms F-3's pattern at federal level too: the open web is one channel among
several, not the sole channel of record.

### F-5 — Social channels appear to be downstream of aggregators, not upstream · **B**

This is the most consequential finding, and it partly reframes the founding
episode.

The major WhatsApp and Telegram channels serving Nigerian students are **operated
by the aggregators themselves** — Scholarship Region runs a website, WhatsApp
groups, and a Telegram channel as one operation. Aggregators state they monitor
official government, foundation, and corporate announcements.

If that chain holds, circulation runs:

> official source → aggregator → social channel → person

rather than person-to-person origination. **The information was on the open web
first; the latency and the reach failure happened downstream.**

*Caveat, and it matters:* this describes the *organised* channels. It says
nothing about informal peer-to-peer sharing, which is what the founding episode
involved. A friend forwarding a message is not an aggregator.

### F-6 — Misinformation attaches to real programmes · **B**

The Federal Government publicly denied a viral notice claiming scholarship
programmes had been suspended.

Direct support for CR-11 and FPR-01, and it identifies a failure mode not
previously catalogued: **false information about genuine opportunities**, distinct
from wholly fake opportunities. Verification must handle a real programme
surrounded by inaccurate claims about its status.

### F-7 — Deadline-miss is a recognised general phenomenon · **C**

Results describe applicants routinely missing deadlines they did not know
existed. **Graded C**: the sources making this claim are newsletters and channels
that sell deadline alerts, so they have an interest in asserting the problem.
Directionally consistent with the founding episode; not independent corroboration
of it.

---

## Not established

| Question | Status |
|---|---|
| Latency between public posting and social circulation | **UNKNOWN** — could not fetch channel timelines |
| How long an opportunity remains publicly discoverable | **UNKNOWN** |
| Whether aggregators source from official sites or from each other | **UNKNOWN** — they claim official monitoring; unverified |
| Whether opportunities exist that *never* acquire any open-web source | **UNKNOWN** — F-3 is suggestive, not conclusive |
| Whether the founding scholarship was publicly posted | **UNKNOWN and unknowable** — the programme was never identified |

---

## Interim assessment

**The strong form of R-01 is not supported.** Federal-level opportunities of the
kind the founder missed do appear to have public sources. An open-web discovery
system is not aimed at the wrong place.

**A weaker form is supported and matters.** Coverage is uneven — state-level and
informal opportunities may be thinly represented or absent — and the public
sources that do exist are **hostile to conventional crawling**: PDFs at
unpredictable paths, no feeds, no schemas, parallel offline channels.

**The reframe worth carrying forward.** If F-5 holds, the founding failure was
not that the information was hidden. It was that the information was public and
**the founder was not on the path it travelled**. That is a *distribution and
latency* failure rather than a *discovery* failure — and it is precisely what
CR-19 and CR-08 were written to address.

That reading is consistent with the Constitution as ratified. It is not yet
established.

---

## What would settle it

1. Read `education.gov.ng` directly and characterise the publication pattern
   across a year of adverts — requires egress this environment does not have.
2. Sample a Telegram channel's archive against official posting dates for the
   same awards. Directly measures F-5's latency claim.
3. Sample state boards for online presence — how many of thirty-six publish at
   all, and where.
4. Take ten opportunities known to have reached students and trace each back to
   its earliest public source, if any. **This is the decisive test** and the only
   one that can answer whether opportunities exist with no open-web origin.

---

## Sources

- [Federal Ministry of Education](https://education.gov.ng/) · [Federal Scholarship Board](https://education.gov.ng/fsb/) · [Scholarship Portal](https://scholarship.education.gov.ng/)
- [Commonwealth advert PDF (observed path)](https://education.gov.ng/wp-content/uploads/2025/08/2025-.2026-commonwealth-advert.pdf)
- [Nigerian Federal Government Scholarship Award — AfterSchoolAfrica](https://www.afterschoolafrica.com/91942/nigerian-federal-government-scholarship-award-2025-2026-for-undergraduate-masters-phd-study-abroad-bilateral-educational-agreement/)
- [Federal Scholarship Board Award — Scholarship Region](https://www.scholarshipregion.com/federal-government-scholarship/) · [Scholarship Region WhatsApp Groups](https://www.scholarshipregion.com/scholarship-region-whatsapp-groups/)
- [MySchoolGist Scholarships](https://myschoolgist.com/scholarships/) · [Myschool Scholarships](https://myschool.ng/news/category/scholarships)
- [Scholarship Region Telegram](https://t.me/s/scholarshipregion) · [Nigeria Scholarship Updates Telegram](https://telegram.me/NigeriaScholarships)
- [FG Denies Suspending Scholarship Programmes, Disowns Viral Notice](https://www.nigerianeye.com/2026/05/fg-denies-suspending-scholarship.html)
- [Scholarship Boards in Nigeria](https://www.studyandscholarships.com/2009/07/scholarship-boards-in-nigeria.html?m=1) · [Niger State Scholarship Board](https://nssb.org.ng/) · [Lagos State Scholarship Board](https://en.wikipedia.org/wiki/Lagos_State_Scholarship_Board)
