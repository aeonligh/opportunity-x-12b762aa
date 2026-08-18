# Phase 16A–16E — Redirect provenance, and a correction

**From `c408ec8`. Phase 16 remains open: the real sweep has still not run.**

The redirect work is done. One of the two defects that motivated it turned out
to be **misdiagnosed in my own Phase 16 report**, and the correction is the most
useful thing in this document.

---

## A · The correction

`docs/PHASE_16_FIRST_CONTACT.md` §C.2 said the redirect duplicate _"inflates
exactly the number the inspection surface asks people to trust."_

**That was wrong about corroboration.** Measured:

```
establishVerification → basis.distinctSources = 1
```

…for three observations of one page reached three ways.

`establishVerification` counts `new Set(retrieved.map(o => o.source.sourceId))` —
distinct **announcers**, resolved by `classify()` from the domain. Two paths on
one domain are one source; a page reached twice by a redirect is one source.
Corroboration was never exposed to this, and the model is right: one publisher
saying a thing twice is not independent corroboration, however it was reached.

I reasoned that claim from the observation count instead of measuring it. The
lesson is the one this project keeps relearning — a plausible chain of inference
about your own code is not a measurement.

**What was real, and where.** The _projection_ did have the defect.
`projectInspection` built one `sources` row per observation and
`evidence.consulted` from their length, so a page reached three ways appeared
three times in _"What I looked at"_ and the Phase 14 degraded line would have
read "3 of 3" for one page. That is the surface a person actually reads, so it
mattered — just not where the report put it.

---

## B · 16A — the requested URL is now kept

`url` still holds the address that served the bytes, after redirects. Recording
the request there would attribute content to a page that did not serve it.

`requestedUrl` now holds how discovery arrived, **and only when that differed**:

| Field          | Means                                                             |
| -------------- | ----------------------------------------------------------------- |
| `url`          | This page served these bytes. The source.                         |
| `requestedUrl` | And we got here by asking for this. Provenance, never authorship. |

Optional rather than always-populated: equality carries no information, and a
reader forced to compare two fields on every observation to learn that nothing
happened is worse off than one for whom the field's _presence_ is the redirect.

Threaded through `CompletedExchange` → `witness()` → `SourceObservation` →
`opportunity_observations.requested_url`.

**Why it matters beyond tidiness.** R-01 observed one Federal Scholarship Board
advert served at three addresses with `-FINAL` and `-corrected` revisions and
_"nothing linking them to what they supersede."_ The request → destination edge
is exactly the evidence R-11's entity resolution needs, and the pipeline was
destroying it at the one moment it existed.

---

## C · 16B/16E — two routes to one source are not two sources

Fixed at the projection layer, where the count is displayed, rather than by
suppressing observations.

`sourceRows()` groups by the URL that served the bytes. Each row is one **page**,
carrying:

- `retrievals` — how many times this page was read
- `reachedVia` — the routes that redirected here, if any
- the most recent retrieval's content

`evidence.consulted` counts pages, and takes each page's **latest** outcome — a
page that failed on Monday and answered on Tuesday is available, and letting a
historical failure degrade it forever would make the record's completeness decay
as it grows.

**What deliberately does not collapse.** Repeated retrievals over time. A page
read on three sweeps is one source observed three times — not three sources, and
emphatically not one observation. CR-37 keeps all three, and _"verified in March,
still verified in June"_ is only checkable because it does.

**No observation is suppressed.** Each redirected arrival was a real request that
really returned bytes. They are all kept; the projection now explains them
instead of double-counting them.

The inspection surface says so in words: _"read 3 times"_, and _"also reached
from …/moved — redirected here"_.

---

## D · 16C — the migration, and what it exposed

`20260818090000_observation_requested_url.sql`: one nullable column, one partial
index. No backfill — the table is empty, which is why this was the cheap moment.
`ADD COLUMN` is DDL: no row written, rewritten or deleted, and the append-only
triggers are untouched.

**A finding while wiring the verification suite.** `scripts/verify-migrations.sh`
applied a **hardcoded list of four files**, under a comment reading _"the three
migrations"_ — it had already drifted once. My new migration was therefore
silently unverified, which is how the new assertions failed against a column the
script had never created.

Now it discovers every engine-era migration in filename order. That immediately
picked up two migrations nobody had been verifying, including Phase 13's legacy
table annotations.

**40 → 44 assertions**, all passing.

---

## E · 16D — the six cases, over a real socket

| Case                              | Result                                                                    |
| --------------------------------- | ------------------------------------------------------------------------- |
| 1 · `A → B`                       | one source, `url = B`, `requestedUrl = A`                                 |
| 2 · `A → B`, `B → B`              | one source; no artificial corroboration                                   |
| 3 · `B` changes later             | second observation added, first not overwritten, row shows `read 2 times` |
| 4 · `A → B`, `C → B`              | one page, both routes named, not three sources                            |
| 5 · two genuinely different pages | two sources                                                               |
| 6 · redirect loop                 | nothing fabricated; no `retrieved` observation                            |

**Six mutations, each observed to fail, each reverted:**

| Mutation                                | Failures caught |
| --------------------------------------- | --------------- |
| Dedup removed (one row per observation) | 4               |
| Tally counts observations again         | 2               |
| Retrieval history collapsed to 1        | 2               |
| `requestedUrl` discarded                | 3               |
| `requestedUrl` set unconditionally      | 2               |
| `witness()` drops the provenance        | 3               |

**A harness defect worth recording.** My rewriting transport made
`response.url` the localhost address, so `finalUrl !== requestedUrl` for _every_
page and each one looked like a redirect — which would have made the "present
only on redirect" property untestable. The transport now maps the final URL back
into the announcer's namespace, restoring the host rather than faking the path.

---

## F · Gates

| Gate                 | Result                   |
| -------------------- | ------------------------ |
| TypeScript           | **0 errors**             |
| ESLint               | **0 errors**             |
| Tests                | **285 / 0** (278 before) |
| Build                | passes                   |
| Migration guarantees | **44 / 0** (40 before)   |
| Phase 11 walk        | passed                   |
| Phase 14 walk        | passed                   |

---

## G · Phase 16 is still not complete

The definition of done requires a real sweep. It has not run, and nothing here
changes that.

Still outstanding, unchanged: **16F–16J** — run
`npm run sweep -- ng-fme` from a machine with outbound HTTPS, the Opportunity X
Supabase project, and the service-role credential. Then inspect the database
records rather than the exit code, against the 16G checklist.

The redirect work makes that run more legible than it would have been. Two
specific things to look at that now have somewhere to be recorded:

1. **`select url, requested_url from opportunity_observations where requested_url is not null`**
   — every redirect the ministry served. If `education.gov.ng` republishes under
   revised filenames the way R-01 found, this is the column that shows it.
2. **Whether any page is reached twice.** It will now say so as _"read N times"_
   and _"also reached from …"_ rather than appearing as several sources.

Nothing else was built: no card work against real content (there is none), no
freshness semantics, no preparation, no new features.

---

_No live data was manufactured. No observation was written to any durable store.
No opportunity is claimed to exist. The external checkpoint remains open._
