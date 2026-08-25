# Phase 16 — First contact with HTTP

**From `ae778d0`.**

The external checkpoint is still blocked. Rather than report that again, this
phase ran the discovery pipeline against a **real HTTP server over a real
socket** — every layer the fixture corpus has never touched — and found three
things the person running `npm run sweep -- ng-fme` would otherwise have found
alone, on a laptop, mid-sweep.

---

## A · The external checkpoint — still blocked, re-measured once

```
education.gov.ng                        → 000
anfiojmbgonrtympzjch.supabase.co        → 000
www.google.com                          → 000
```

Unchanged from Phase 15: outbound CONNECT denied by policy for every host. Not
re-litigated, not waited on. **`npm run sweep -- ng-fme` has still never run
against the real network, and nothing in this phase claims otherwise.**

One additional friction worth flagging before someone attempts it: the sweep
refuses to start without **both** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`,
because it writes observations and will not run with nowhere durable to put them.
A laptop with ordinary internet is necessary and not sufficient — the service-role
key has to be in hand too.

---

## B · What had never run

Every opportunity this product has ever rendered came from `demoCorpus`, which
calls `witness()` directly with a hand-built exchange object. That exercises
extraction, entity resolution, verification and projection — and nothing beneath
them.

**`retrieve()`, `readRobots()`, the link walk, the page budget and the politeness
delay had never executed against an HTTP server. Not once, in fifteen phases.**
They are the first five things `npm run sweep` touches.

`test/discovery-over-http.test.ts` stands up a server on a real socket and runs
the real `institutionalChannels` mechanism against it. The only substitution is a
transport that rewrites the hostname — `institutionalChannels` builds
`https://<domain>`, and a self-signed certificate would be a second thing under
test. Everything above the socket is production code taking production paths.

**What it is not:** a claim that any opportunity exists. The store is in-memory
and dies with the process, nothing is written anywhere durable, and every page
served is obviously synthetic.

### What held

| Behaviour                                                                      | Result |
| ------------------------------------------------------------------------------ | ------ |
| Pages retrieved, recorded with real timestamps                                 | ✅     |
| `robots.txt` fetched, parsed, and a disallowed path **not** retrieved          | ✅     |
| Link walk stayed on the announcer's domain                                     | ✅     |
| A `500` recorded as `unreachable` rather than skipped (O7)                     | ✅     |
| A page with **no JSON-LD at all** produced an observation and invented nothing | ✅     |
| Two URLs with one declared identifier resolved to **one entity** (CR-35)       | ✅     |
| A page stating **no deadline** yielded no deadline                             | ✅     |

The robots result is the one worth dwelling on: it had unit coverage for
`parseRobots` and none for the fetch, the cache, or the decision not to visit. A
sweep that ignored robots is how a project's user agent gets permanently banned
from a ministry's website.

---

## C · Three findings

### C.1 · A redirect discards the URL that was requested

`retrieve()` records `response.url` — the address after redirects — deliberately,
with a comment explaining why: _"recording the requested URL instead would produce
an observation attributing content to a page that did not serve it."_ That is
right.

What is lost is the other half. When `/moved` 302s to `/scholarship`, the record
holds the destination and **nothing at all about the request**.

R-01 observed exactly this in the wild: one advert at three addresses, with
`-FINAL` and `-corrected` revisions and _"nothing linking them to what they
supersede."_ A recorded request → destination edge is precisely the evidence
R-11's entity resolution wants, and the pipeline is currently throwing it away at
the moment it exists.

### C.2 · A redirect produces a silent duplicate observation

This is the one that would have caused confusion on a laptop.

The crawler's `visited` set is keyed on the **requested** URL. `/moved` and
`/scholarship` therefore look like different pages, both are fetched, and the
fetcher files both under the same final URL.

The result: **two observations, same URL, same content, same sweep, and no way to
tell why there are two.** Each half is individually defensible; together they lose
the information that would explain the pair — because §C.1 discarded it.

**Why this is more than tidiness.** Corroboration is counted from observations,
and this product's entire trust argument is that _"read from N sources"_ can be
checked by the reader. A page reached twice by two routes is **one source, not
two**. On the real corpus — where R-01 found the same advert served at three
addresses on one domain — this inflates exactly the number the inspection surface
asks people to trust.

**Two candidate fixes**, neither applied here:

1. Dedupe `visited` on the **final** URL after retrieval, not the requested one.
   Smallest change; loses the fact that two routes existed.
2. Record the requested URL alongside the final one, and dedupe on the final.
   Fixes §C.1 and §C.2 together, and gives R-11 the edge it wants. Costs an
   observation field, which is a schema change.

**(2) is the better answer** and is a schema decision, not a bug fix. Recorded
rather than taken, per this phase's own rule against rewriting the engine ahead of
real evidence — and the real evidence is one sweep away.

### C.3 · The sweep needs a service-role key, not just a network

Stated in §A; repeated here because it belongs in the findings. Someone told "run
this from a machine with ordinary outbound HTTPS" will get an immediate refusal
without the second credential.

---

## D · What was deliberately not done

Phase 16's definition of done requires a real sweep. It has not happened, so the
phase is **not** complete on its own terms, and this report does not claim it is.

Not done, and why:

- **No engine fix for §C.1/§C.2.** The better fix is a schema change; taking it
  now would be designing against a synthetic redirect instead of a real one.
- **No card work against real content.** Item G asks for the card to be revisited
  using real opportunity content. There is none. Optimising against my own
  synthetic long title would repeat the fixture-dimension mistake item G exists to
  end.
- **No freshness semantics.** Item H depends on a second retrieval of a page that
  has actually changed.
- **No verification-history work.** Item I depends on real repeat retrievals.
- **No preparation.** Item M, untouched.
- **No new audit.** Item N.

---

## E · Gates

| Gate       | Result                          |
| ---------- | ------------------------------- |
| TypeScript | **0 errors**                    |
| ESLint     | **0 errors**                    |
| Tests      | **278 / 0** (270 before; 8 new) |
| Build      | passes                          |

No AEON X contamination; `test/consolidation.test.ts` and
`test/standalone.test.ts` still hold that line.

The eight new tests assert behaviour over a live socket. One of them pins §C.2
as _current behaviour_ with a note pointing here — so when someone fixes it, the
test fails loudly and the reason is one link away rather than lost.

**One of my assertions was wrong about the product, not the other way round.** It
expected observations to carry `https://fixture.test/…`, and they carry the
rewritten host — which is correct, because that is genuinely where the bytes came
from. Corrected, with the reasoning kept in the test.

---

## F · Next

Unchanged and now sharper: **run the sweep.** One hour, ordinary internet, and the
service-role key.

`npm run sweep -- ng-fme`

Three specific things to look at afterwards, which this phase can predict but not
answer:

1. **Count the observations per URL.** If `education.gov.ng` redirects at all,
   §C.2 says you will see duplicates that look like a bug and are not. Knowing
   that in advance is most of this phase's value.
2. **Check whether anything carries JSON-LD.** The fixture corpus assumes it; the
   `/bare` case suggests the real corpus mostly will not, and how much is
   extractable without it decides how useful the first real opportunity is.
3. **Note what `robots.txt` actually allows.** It is now known to be obeyed. What
   it permits on a real ministry domain is unknown.

Then decide §C's schema question against a real redirect, and only then revisit
the card against real content.

---

_No live data was manufactured. No observation was written to any durable store.
No opportunity is claimed to exist. The external checkpoint remains open._
