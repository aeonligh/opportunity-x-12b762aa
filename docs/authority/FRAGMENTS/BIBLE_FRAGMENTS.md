# Bible fragments

**STATUS: FRAGMENT — authentic source material, incomplete document.**

No Bible was recovered. What follows is Bible text quoted *inside* a recovered
original (`../ORIGINAL_SOURCES/aeon-x-constitutional/`), which makes the quoted
words authentic and the surrounding document unavailable.

Only quotations whose attribution is unambiguous in the source are listed. A
citation sitting near some quoted text is **not** evidence that the text belongs
to it, and the first pass at this file produced several such false pairings
before they were checked by reading. They were discarded rather than published.
25 distinct Bible sections are cited by Opportunity X; **2** have recovered text.

---

## Product Bible §12 — the precedence rule

Source: `aeon-x-constitutional/state.md`, lines 159–163.

> "This is the senior document … The Brand Bible, Experience Bible, and
> Information Architecture Bible are all subordinate to it. Where any of them
> conflicts with this document, this document governs."

**Elided.** The `…` is in the source. The full §12 is not recovered.

This single fragment settles the precedence question, which is why it matters
more than its length suggests. See `../AUTHORITY_PRECEDENCE.md`.

---

## Brand Bible A-04 — Unverified self-reports

Source: `aeon-x-constitutional/opportunity-ownership.md`, lines 138–146. The
source names its location inside the Brand Bible: *"the assumption register,
under the heading Unverified self-reports"*.

> "Ownership says the user owns the truth of their life. Visibility says the
> system speaks with certainty only about what it observed. Eligibility claims
> rest on unverified testimony.
>
> Working answer: self-reported facts are ✓ Confirmed by You, and **any claim
> derived from them inherits and displays that provenance. Confidence is never
> laundered into something the system appears to have verified itself.**"

This appears to be a complete assumption-register entry rather than an excerpt,
but the Brand Bible itself is not in hand, so it is recorded as a fragment.

### Verified against the implementation

`src/lib/opportunity/foundation/evidence.ts:9` quotes A-04 and labels the
quotation **"verbatim"**. That claim was tested, not assumed: both sentences
were normalised for whitespace and markup and matched against the recovered
source. **Both are present verbatim.** The implementation's citation is accurate.

This is the only place in Opportunity X where a Bible claim could be checked
against recovered text at all, and it survived the check.
