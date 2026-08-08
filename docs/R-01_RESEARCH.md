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

---

# Second pass — domain-filtered search

**Why a second pass.** The founder asked for a specialised research connector.
**Tavily and Nimble are unavailable** — both MCP servers disconnected earlier in
the session and `select:` on their tool names returns nothing. However,
`WebSearch` supports domain filtering, which interrogates a site's *indexed*
content without fetching it. Egress remains blocked for every direct fetch
tried, including `en.wikipedia.org`, so search is the only web channel.

**New grade — B+:** URL paths and titles directly observed in the search
engine's index of the official domain. Stronger than a summary, weaker than a
fetched page.

## F-8 — Duplication originates at the official source · **B+**

The same advert is served simultaneously at multiple addresses on
`education.gov.ng`:

```
/wp-content/uploads/2021/12/2022-2023-BEA-ADVERT-FINAL.pdf
/fsb/wp-content/uploads/2021/12/2022-2023-BEA-Advert-Final.pdf
/2022-2023-bea-advert-final-2/
```

Three URLs, one document. Two separate WordPress installations — the ministry
site and an `/fsb/` sub-install — plus an HTML wrapper page. Capitalisation
differs between the two PDF paths.

**The `-2` suffix on the HTML slug is WordPress's automatic duplicate-slug
handling**, which means that page was published at least twice.

This matters because duplication has been treated as something aggregators do to
clean source data. **It is present in the source.** Any dedup strategy keyed on
URL will treat these as three opportunities.

## F-9 — The source never retires expired adverts · **B+**

Adverts spanning **2019 through 2025** are all still served and indexed:

| Path | Cycle |
|---|---|
| `/fsb/wp-content/uploads/2019/10/FEDERAL-SCHOLARSHIP-BOARD-ADVERT-2020-2021-BEA-NA.pdf` | 2020/21 |
| `/wp-content/uploads/2020/12/2021-COMMONWEALTH-...-CSFP-ADVERT.pdf` | 2021 |
| `/wp-content/uploads/2021/12/2022-2023-BEA-ADVERT-FINAL.pdf` | 2022/23 |
| `/fsb/wp-content/uploads/2023/09/2024-2025-commonwealth-advert.pdf` | 2024/25 |
| `/fsb/wp-content/uploads/2023/11/2024-2025-BEA-ADVERT.pdf` | 2024/25 |
| `/wp-content/uploads/2025/08/2025-.2026-commonwealth-advert.pdf` | 2025/26 |

**None carries an expiry marker.** A closed 2020 advert and an open one are
served identically.

**This is the most consequential finding in the research**, because it locates
the founder's own experience — *"some opportunities were already closed but were
still being shared as if they were open"* — at its origin. Aggregators and
WhatsApp groups are not corrupting the data. They are faithfully propagating a
source that **never marks anything closed.**

Consequences:

- A crawler ingesting today finds **seven cycles presented identically**. Recency
  cannot be inferred from the document.
- **CR-05 gains a concrete mechanism.** Deadline state cannot be read from the
  advert. It must be derived from the calendar and cross-checked against the live
  portal.
- **CR-11's decay requirement is not optional.** Verified-once would mean a 2020
  advert stays verified forever, because nothing about it ever changes.

## F-10 — Filenames carry revision markers · **B+**

`...-BEA-ADVERT-FINAL.pdf` · `Mauritius-2024-Advert-corrected.pdf` ·
`2025-.2026-commonwealth-advert.pdf` (stray period) ·
`FEDERAL-SCHOLARSHIP-BOARD-ADVERT-2020-2021-BEA-NA.pdf`

`FINAL` and `corrected` indicate adverts are **revised and re-uploaded under new
filenames**. The superseded version is not necessarily removed — so a wrong
version and a corrected version can be live at once, with nothing linking them.

Casing, ordering, and separators are inconsistent across years. Filename
pattern-matching is not a viable discovery strategy.

## F-11 — A concrete deadline window · **B**

2026/2027 CSFP: applications **opened 2 September 2025, closed 14 October 2025.**

A **six-week window**, opening roughly thirteen months before the award year.
First real datum for CP-C's runway question — though it describes the
application window, not the preparation runway, which is what CP-C actually
concerns.

## F-12 — The application route is a navigation path, not a URL · **B**

Guidance directs candidates to *"visit www.education.gov.ng, click the Federal
Scholarship Board icon on the home page, read the guidelines, and complete the
application form online."*

FPR-01 requires verifying that *the application route leads to the legitimate
provider*. Where the route is a described navigation sequence rather than a
stable link, that check requires following the path, not resolving a URL.

## Revised assessment after the second pass

**R-01's strong form is further weakened.** Federal opportunities are
comprehensively published on the open web — seven years of adverts are sitting
there right now.

**The real problem is not access. It is that the public record is
undifferentiated.** Everything is present, nothing is marked current, the same
document appears at several addresses, revisions are untracked, and the format
resists parsing.

That reframes the discovery engine's central difficulty. It is not *finding*
opportunities. It is **establishing which of the things it found are real right
now** — which is verification, not discovery, and is exactly what CR-05, CR-11
and CR-29 were written for.

**Still UNKNOWN:** state-level coverage · whether any opportunity never acquires
an open-web source · social-circulation latency · whether aggregators source
officially or from each other.
