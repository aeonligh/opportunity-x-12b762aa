# Phase 10 — External live verification

**Implementation checkpoint: `0754bab`.**

Everything that can be proved without a browser that reaches Supabase has been
proved. What remains needs a person with two things this build environment does
not have: **a browser with ordinary internet access**, and **the Supabase
dashboard for the project below**.

You do not need to understand the architecture to run this. Each step says what
to do, what you should see, and what counts as a failure.

Work top to bottom. If a step fails, stop and record it — later steps assume the
earlier ones passed.

---

## 0 · What you are verifying against

| | |
|---|---|
| **Supabase project** | `anfiojmbgonrtympzjch` |
| **Project name** (confirm this matches before touching anything) | `opportunity-x-12b762aa` |
| **Organisation** | `uhazlkmcbpctpjdcryql` — *aeonligh's Org* |
| **Region** | `eu-north-1` |
| **Vercel project** | `opportunity-x-12b762aa` (`prj_FZEGLp6uU9d7iFDfiWLgDcSivDmC`, team *aeonlighs-projects*) |
| **Production URL** | `https://opportunity-x-12b762aa.vercel.app` |

> **Do not use project `fbqufjvkzbifklxtouol`.** That is AEON X's database. It
> happens to contain tables with the same names, which is exactly why it is easy
> to verify the wrong thing by accident. Check the project name reads
> `opportunity-x-12b762aa` before you run anything.

**Database state at checkpoint** (confirmed on the live project):

- 4 engine tables, 8 append-only triggers
- 0 observations, 0 declarations
- `last_retrieval_at` = **null**
- `auth.users` = **0** — no account exists yet

---

## 1 · Environment variables

Set these wherever the app runs — Vercel project settings for production, or a
local `.env.local` for `localhost`. **Never commit the secret ones.**

| Variable | Secret? | Where to get it |
|---|---|---|
| `SUPABASE_URL` | no | Supabase → Project Settings → API → Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | no | same page → anon / publishable key |
| `VITE_SUPABASE_URL` | no | same value as `SUPABASE_URL` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | no | same value as the publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | **YES** | same page → service_role. Server only. Never in a `VITE_` variable. |

All five must point at `anfiojmbgonrtympzjch`. If `SUPABASE_URL` or
`SUPABASE_SERVICE_ROLE_KEY` is missing, the app is *designed* to say
**"I have no record of anything I have observed"** rather than show an empty
list — so that message may mean a missing variable, not an empty database.

---

## 2 · Create the one account

Supabase → **Authentication → Users → Add user**

- email + password of your choosing
- **tick "Auto Confirm User"**

An unconfirmed account cannot sign in, and the failure looks like an
authentication bug rather than a missing tick.

**PASS:** the user appears in the Users list.

---

## 3 · Authentication walk

Run against `https://opportunity-x-12b762aa.vercel.app` if production has been
updated past `8a2090d`, otherwise `npm run dev` and `http://localhost:5173`.
Note which one you used — it matters for the report.

| # | Do this | Expect | Fails if |
|---|---|---|---|
| 3.1 | Open `/opportunities` **signed out** (use a private window) | Redirected to `/auth?next=%2Fopportunities` | The page renders any opportunity content |
| 3.2 | Same for `/saved` and `/opportunities/anything` | Redirected, each carrying its own `next=` | Either renders, or `next` is missing |
| 3.3 | Open `/opportunities/abc-123?ref=email` signed out | URL shows `next=%2Fopportunities%2Fabc-123%3Fref%3Demail` — **the query string survives** | `?ref=email` is dropped |
| 3.4 | From 3.3, sign in | You land on `/opportunities/abc-123?ref=email`, not a generic home | You land anywhere else |
| 3.5 | Open `/auth?next=https://example.com/steal`, sign in | You land inside the app. **Never** on example.com | You leave the site |
| 3.6 | Sign in from `/auth` with no `next` | You land on `/opportunities` | Anywhere else |
| 3.7 | Sign out, then press Back | You cannot see a protected page; you are bounced to `/auth` | Protected content is visible |

**PASS:** all seven. **FAIL:** any one — record which.

---

## 4 · What `/opportunities` should say right now

Discovery has genuinely never run. The **correct** result is an honest Unknown:

> **"I have not looked at any source yet, so I have nothing to show you."**

**PASS:** that message, or the closely related *"I have no record of anything I
have observed"* if the service-role key is unset.

**FAIL:** an empty list with no explanation, "no opportunities found", a spinner
that never resolves, or any opportunity appearing at all — nothing has been
acquired, so anything shown would be fabricated.

This is the single most important check in the document. Absence of data must
not read as a statement about the world.

---

## 5 · The journey — only possible once real opportunities exist

**Skip this section entirely if section 7 (discovery) has not been run
successfully.** With zero observations there is nothing to open, and that is
correct behaviour, not a defect.

Once at least one real opportunity exists:

**ARRIVE → SIGN IN → OPPORTUNITIES → OPEN → INSPECT → DECLARE → SAVED → RETURN → REOPEN → WITHDRAW**

### 5.1 Before declaring — capture the evidence

On the opportunity's page, copy the text of these sections. They have stable
headings:

- *What this involves*
- *How the timing was worked out*
- *Whether this is real*
- *What I looked at*
- *Not settled*
- *Sources disagree* (only present when they do)

Paste them somewhere. This is your "before".

### 5.2 Declare, and check the database

Press **Interested**.

```sql
-- Run in Supabase → SQL Editor. Expect exactly 1 row.
select person_id, entity_id, state, declared_at
from public.opportunity_pursuits;
```

**PASS:** one row, `state = 'interested'`, `declared_at` within the last minute.
**FAIL:** zero rows while the page claims success — that is the one thing this
product must never do.

### 5.3 The invariant that matters most

Reload the opportunity page and compare the six sections against your "before".

**PASS:** every one is **identical**. A declaration changes your relationship to
an opportunity, never the opportunity's facts.

**FAIL:** any wording, date, source, verification state or contested field
differs. Record exactly which — this would be a serious defect.

```sql
-- The opportunity's own record must be untouched by your declaration.
select count(*) as observations, max(retrieved_at) as last_retrieval
from public.opportunity_observations;
-- Expect the same numbers as before you declared.
```

### 5.4 Persistence — prove it is the database, not the browser

Do all four, in order:

1. Hard-refresh the page (Cmd/Ctrl-Shift-R)
2. Navigate to `/saved` — the opportunity is listed
3. Navigate away to `/`, then back to `/saved`
4. **Sign out, close the browser, reopen, sign back in** — go to `/saved`

**PASS:** still there after all four, especially the fourth. Steps 1–3 could
theoretically pass on client state; step 4 cannot.

### 5.5 Withdraw

Press **Forget that I said this**.

```sql
select count(*) as remaining_declarations from public.opportunity_pursuits;
-- Expect 0.

select count(*) as observations from public.opportunity_observations;
-- Expect UNCHANGED — withdrawing a declaration must not touch the evidence.
```

**PASS:** the declaration is gone, `/saved` no longer lists it, and the
opportunity itself is still fully intact when reopened.
**FAIL:** the opportunity disappeared or lost any evidence.

---

## 6 · The guarantees, checked directly

Paste each into Supabase → SQL Editor. **These are supposed to fail.** An error
is the pass.

```sql
-- 6.1 Observations cannot be rewritten.
update public.opportunity_observations set url = url;
-- PASS: ERROR ... is append-only ...
-- FAIL: "UPDATE 0". That means the rule is missing, not that it worked.
--       (Only meaningful once at least one observation exists.)

-- 6.2 Observations cannot be deleted.
delete from public.opportunity_observations;
-- PASS: the same append-only ERROR.

-- 6.3 A declaration cannot be edited in place.
update public.opportunity_pursuits set state = 'not-interested';
-- PASS: ERROR ... append-only. Changing a position is a new declaration ...

-- 6.4 Everything has row-level security on. Expect 4 rows, all true.
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'
  and relname like 'opportunity\_%' escape '\'
order by relname;
```

> **6.1 and 6.2 only prove anything when a row exists.** On an empty table an
> `UPDATE` reports "0 rows" whether the protection is present or absent. If the
> database is still empty, skip them and rely on section 7 first.

---

## 7 · Real discovery — from a machine with ordinary internet

This build environment cannot reach the announcer websites (`403` at the network
proxy), which is why no opportunity exists yet. Run this from an ordinary
laptop.

```bash
git clone https://github.com/aeonligh/opportunity-x-12b762aa
cd opportunity-x-12b762aa
git checkout 0754bab
npm install

export SUPABASE_URL="...your project URL..."
export SUPABASE_SERVICE_ROLE_KEY="...service role key..."

# One bounded sweep against a single announcer. Do not schedule anything yet.
npm run sweep -- ng-fme
```

Valid announcer ids (pass one; omitting them sweeps all nine, which is not
"bounded"):

`ng-unn` · `ng-unilag` · `ng-ui` · `ng-uniport` · `ng-fme` · `ng-fmcide` ·
`ng-nitda` · `ng-nelfund` · `ng-ptdf`

The command prints a summary. **Read it, do not trust it** — then check the
database:

```sql
-- The decisive evidence. A function returning successfully is not acquisition.
select count(*) as total,
       count(*) filter (where outcome = 'retrieved')   as retrieved,
       count(*) filter (where outcome = 'unreachable') as unreachable,
       max(retrieved_at) as last_retrieval_at
from public.opportunity_observations;

-- What was actually stored, and from where.
select url, source_label, outcome, retrieved_at,
       jsonb_array_length(coalesce(items, '[]'::jsonb)) as opportunities_found,
       unreadable ->> 'reason' as why_nothing_was_read
from public.opportunity_observations
order by retrieved_at desc
limit 20;
```

| Check | PASS | FAIL |
|---|---|---|
| `last_retrieval_at` | non-null **only** if `retrieved > 0` | non-null with zero retrievals |
| Unreachable sources | recorded as `unreachable`, carrying a reason | recorded as `retrieved` |
| Pages with no machine-readable data | `opportunities_found = 0` **and** `why_nothing_was_read` populated | silently dropped, or invented fields |
| `retrieved_at` | a real timestamp from the moment of the fetch | in the future, or before the run |
| Content | the publisher's own page | any search-engine summary or snippet |

**A sweep that retrieves nothing is a valid result**, not a failure — several
government sites block automated requests. Record what happened. The wrong
outcome is a fabricated one.

**Do not** substitute Tavily, Nimble, a cached copy, or hand-written rows. An
observation is a claim that this system read a page at a moment in time; a
fabricated one cannot be deleted afterwards, because the table refuses deletion
by design.

---

## 8 · Production deployment

Only promote once sections 3–6 pass. Before promoting, record:

- the commit being deployed
- the Vercel deployment id
- that its environment variables point at `anfiojmbgonrtympzjch`

Production currently serves `8a2090d`, which predates all of this work. A newer
build exists but has never been promoted.

After promoting, repeat **section 3** and **section 4** against the production
URL. A green build is not a working product:

> **READY build ≠ deployed to production ≠ authenticated and working ≠ real
> discovery.** Report each separately.

---

## 9 · Reporting back

For each section: **PASS**, **FAIL** (with what you saw), or **BLOCKED** (with
what stopped you).

```
2  Account created ...............
3  Authentication walk (3.1-3.7) .
4  Honest Unknown on /opportunities
5  Journey + invariant ...........
6  Guarantees ....................
7  Real discovery ................
8  Production ....................

Ran against:  production URL  /  localhost
Anything surprising:
```

**BLOCKED is a legitimate outcome and is more useful than a guess.** If
discovery cannot reach any announcer, say so — that is an environmental fact
about the network, not a defect in the product, and it should be recorded as
such rather than worked around.
