# Constitutional Proof — Ownership of the Seven Orphan `opportunities` Rows

**Question.** Seven rows in `public.opportunities` have `owner_id IS NULL`. Who, under the
Constitution, owns them?

**Finding.** Ownership is uniquely determined, and the determination is **that no user owns
them and `owner_id` must remain NULL.** No ownership migration may be written. This is not a
failure to decide; it is the decision the Constitution compels, for reasons it states.

**Method.** Derived only from the Product Bible, Experience Bible, Brand Bible (V1 · Frozen —
no V2 artifact exists in the published set), Information
Architecture Bible, UX Flows Bible, Component System Bible and Reconstruction Audit, in their
established precedence. Implementation history, commit history, the identity of the
development account, and the founder's stated preference were excluded as evidence — the
first two by the Constitution's own rule that provenance must be recorded rather than
reconstructed, the last two because a preference is not a principle.

---

## 1. The facts, verified against the live database

Measured, not assumed (`public.opportunities`, all seven rows):

| Fact | Value |
|---|---|
| Rows with `owner_id IS NULL` | 7 of 7 |
| `eligibility_verdict` populated | 7 of 7 |
| `strengths` populated | 7 of 7 |
| `weaknesses` populated | 7 of 7 |
| `score_rationale` populated | 7 of 7 |
| `confidence_score` populated | 7 of 7 |
| `selection_probability` populated | 7 of 7 |
| `application_status` populated | 7 of 7 |
| Any column linking a row to a person | **none exists** |
| `anon` role read | denied at the grant (`42501`) |
| Code paths reading the table | none |

The decisive fact is the one in bold: the table has exactly one column capable of naming a
person, `owner_id`, and it is null on every row. There is no second path — no profile
reference, no derivation record, no observation lineage — by which the subject of these
assessments could be recovered.

## 2. What kind of thing these rows are

The table conflates three constitutionally distinct categories in one row:

| Category | Columns | Governed by |
|---|---|---|
| Facts about the world | `title`, `organization`, `deadline`, `funding_value`, `official_url` | Not personal. No owner. |
| Personal assessments | `eligibility_verdict`, `strengths`, `weaknesses`, `score_rationale`, `confidence_score`, `selection_probability` | PB §07 — the Personal Intelligence Profile |
| A commitment | `application_status` (`Discovered → Submitted → Accepted/Rejected`) | PB §04 — "a unified tracker of applications, requests, and submissions", i.e. the Ledger |

Only the second and third categories can have an owner at all. The ownership question is
therefore a question about personal intelligence, and PB §07 governs it.

## 3. Candidate owners, each accepted or rejected

### Candidate A — the primary development identity (the founder's account). **Rejected.**

Five independent grounds, any one of which is sufficient:

1. **PB §05 and IA §10 forbid attributing company artifacts to the founder personally, in
   the architecture.** PB §05: AEON X presents as "a company — polished, institutional, as if
   a team built it — where I personally am invisible or backgrounded." IA §10 states the
   enforcement standard directly: revenue "belongs to AEON X, not to the founder personally.
   The architecture has to make that institutional framing structural rather than cosmetic."
   Writing the founder's `user_id` into machine-generated intelligence is that attribution,
   performed in the data layer — the precise place IA §10 says the separation must be
   structural.

2. **PB §04 gives the founder oversight, not subject-hood.** The founder's constitutional
   surface is Founder Mission Control: "analytics, operations, product management, user
   insights, system health, and company-wide oversight across every product." Oversight of
   user insights is a permission to *view*. Nothing in the Constitution converts a viewing
   permission into being the person the insight is *about*, and the two are opposites: one is
   the auditor, the other is the audited.

3. **The Visibility Principle forbids the inference.** It "forbids concluding anything from
   absence of signal", and requires that "the system must not assert a comparison it cannot
   actually make." A null `owner_id` is absence of signal. Concluding "null, therefore the
   founder" is reasoning from absence to a positive claim — the exact move the principle
   names. That the founder's is the only account currently in existence does not rescue the
   inference; it is still absence of signal, merely with fewer alternatives visible.

4. **PB §03 and §07 forbid the disclosure the write would cause.** "Intelligence is personal,
   and personal things are shared only with informed consent," and cross-product sharing is
   "off by default." Writing an owner grants that identity read access to seven eligibility
   verdicts, seven sets of stated weaknesses, and seven selection probabilities. If those
   assessments were not derived from that person, the write discloses one person's personal
   intelligence to another without consent. The system cannot establish that it isn't such a
   disclosure — see §1 — and the Constitution nowhere permits a disclosure whose safety is
   unestablished.

5. **PB §07's record obligation is inverted by the assignment.** The record must be "visible
   to the person it concerns." Assigning it to a person it may not concern makes it visible
   to a person it does not concern. The clause is not silent here; it is violated.

### Candidate B — some other existing user. **Rejected.**

Every ground in A applies, with strictly less supporting evidence.

### Candidate C — a synthetic company-owned identity. **Rejected.**

`owner_id` references `auth.users(id)`, and AEON X is not a user. Minting a company account
would contradict PB §04's Identity Layer — "One AEON X account. One identity, one profile,
one authentication system, one user database, one permissions system" — by creating an
identity that is not a person and has no profile. It would also make the assessments readable
by whoever holds that account, reintroducing the §03 consent violation with an extra step in
front of it.

### Candidate D — no user; `owner_id` remains NULL. **Accepted.**

This is the only candidate that violates nothing, and it is positively required rather than
merely tolerated:

- **The Revelation Principle and CS §01.** The atom of a finding is the evidence behind it;
  "a statement without provenance is not a component in this system — it is a violation."
  These seven rows carry assessments with no recorded subject and no recorded derivation.
  They are therefore not findings. They are assertions, and the Constitution does not permit
  the product to render them.
- **PB §07.** A Profile entry must show "how it was learned, its confidence, when it was last
  updated, and which products are allowed to use it." These rows carry a confidence number
  and nothing else on that list. They cannot be Profile entries.
- **Therefore no person may read them**, which is exactly what `owner_id IS NULL` under
  owner-scoped reads produces.

**The constitutionally required state is the state the database is already in.** The correct
action is to write no migration. Any migration that assigns an owner would introduce a
violation that does not presently exist.

## 4. AMENDMENT WITHDRAWN — the Constitution already governs this

An earlier revision of this proof concluded that the Constitution did not settle **recovery**
— whether these seven assessments can ever become owned — and proposed an amendment to PB §07
requiring a derived assessment to record its subject.

**That was wrong, and the amendment is withdrawn.** It was proposed before the Brand Bible had
been read. Brand Bible **A-04** already states the requirement, in the assumption register,
under the heading *Unverified self-reports*:

> "Ownership says the user owns the truth of their life. Visibility says the system speaks
> with certainty only about what it observed. Eligibility claims rest on unverified testimony.
>
> Working answer: self-reported facts are ✓ Confirmed by You, and **any claim derived from
> them inherits and displays that provenance. Confidence is never laundered into something the
> system appears to have verified itself.**"

A-04 does three things the proposed amendment tried to do, and does them already:

1. **It makes provenance inheritable rather than declarable.** A derived claim "inherits" the
   provenance of the fact behind it. It does not get to state its own.
2. **It requires that provenance be displayed**, not merely stored.
3. **It names the failure mode** — laundering — so a claim that presents a derived assessment
   as something the system verified is a violation, not a judgement call.

Applied to the seven rows, A-04 is decisive and sharper than the ownership argument in §3. An
eligibility verdict is exactly the "claim derived from" a self-reported fact that A-04
governs. These seven inherit nothing, because no fact is referenced. They therefore were never
validly constructed as claims at all — which is why they have no owner. **The absence of an
owner is a symptom; the absence of inherited provenance is the defect.**

Nothing needs to be added to the Constitution. What was missing was enforcement, and that gap
was in the code rather than in the law: `ProfileFact.tier` and `Evidence.provenance` were two
independent unions with nothing connecting them, so a claim could declare `confirmed` while
resting on a `learned` fact. Closed in `src/lib/core/tier0/evidence.ts` — provenance is now
computed from the fact and `Evidence` is branded so no other module can mint one.

Disposition of the seven rows is unchanged: leave `owner_id` NULL, leave the grant closed,
treat the assessment columns as unprovenanced system output. They may be re-derived once a
subject exists; they may not be adopted.

## 5. Audit — three attempts to falsify this proof, and what they found

The finding was challenged rather than re-asserted. All three attempts failed, and two
surfaced clauses that make the conclusion stronger than it was.

### Attempt 1 — "`owner_id` means custody, not subjecthood"

The strongest available challenge. The table comment reads "Single-tenant prototype pending an
owner backfill; reads are owner-scoped", which suggests `owner_id` is a *tenancy* column — the
person a row was discovered *for* — rather than a claim about whom the assessments are
*about*. If so, filling it is a scoping decision and not an assertion about anyone.

**Fails.** The conclusion survives under either reading, because the grounds that carry it do
not depend on which one is correct. The Visibility Principle bars concluding a positive value
from a null column whatever that column means. And PB §03's consent rule bites harder under
the tenancy reading, not softer: writing an owner grants that identity read access to seven
eligibility verdicts and seven sets of stated weaknesses, and the system cannot establish they
concern that person. A scoping decision that discloses another person's intelligence is still
a disclosure.

### Attempt 2 — "Founder Mission Control needs these rows, so the founder must own them"

PB §04 gives Mission Control "user insights, system health, and company-wide oversight", and
IA §12 makes it a separate application behind an admin claim.

**Fails, and the failure is instructive.** An admin claim is a *role*, and IA §04 routes it
separately at `/control/*`. A person who must be able to *see* a row does not thereby become
the person the row is *about* — and the access can be granted the way the Constitution already
grants it, by an admin policy on the role, never by writing that identity into `owner_id`.

This is the useful part: **the need to view is satisfiable without the claim of ownership.**
Any future requirement for founder visibility into these rows has a constitutional path that
does not require the false assignment. The two were never actually coupled.

### Attempt 3 — "Some clause establishes a default owner for unowned data"

Searched all seven artifacts for a default-ownership rule.

**Fails — no such clause exists.** But the search returned one that settles the matter from
the other direction, in Flows §01, on the first session:

> "Every answer becomes ✓ Confirmed by You — the Profile's seed, **owned by the person from
> the first minute**."

Ownership originates in the person's own act, at the moment the fact is given. It is not a
field filled in afterwards; it is a consequence of something that either happened or did not.
For these seven rows it did not happen — no answer, no session, no stated fact. **They have no
owner because there was never an act that could have created one**, which is a stronger and
simpler statement than anything in §3.

### Verdict

The claim "ownership settled" is **upheld**. The proof exists, is cited, and survives
falsification. `owner_id` remains NULL.

## 6. Moves this proof did not make

Explicitly confirmed, because the derivation was constrained to forbid them:

- No guess.
- No use of implementation history or commit history.
- No assumption that the development account owns the data.
- No use of the founder's stated preference as evidence. The preference was given, and is
  recorded here as excluded rather than as persuasive; a product decision cannot supply a
  constitutional premise, and the instruction establishing that came from the same authority
  as the preference.
- No ownership invented to unblock development. Nothing was blocked: no code path reads this
  table.
