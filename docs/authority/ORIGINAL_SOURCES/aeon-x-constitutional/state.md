# Constitutional state

Every requirement the six documents impose, in one of three terminal states:

- **Demonstrated** — built, and verified by measurement against a running build.
- **Blocked** — the work is done or impossible here; something outside the
  repository has to move. See `blocked-procedures.md`.
- **Impossible until specified** — the Constitution does not establish it, so
  building it would mean inventing.

Nothing sits in a fourth state. "In progress" is not a finding.

**This file exists because the Reconstruction Audit goes stale.** The audit was
a snapshot, and several of its open items have since been closed — the Hero
statement it lists under *Rebuild* was reconstructed passes ago, and a queue
built from the audit alone will send the next session to redo finished work.
Check a claim here against the code before acting on it; if they disagree, the
code is right and this file is wrong.

Last reconciled against the repository and the live database: **2026-08-03**.

**A claim in the previous version of this file was false.** It recorded that a
new account "is sent to `/handshake` from every protected path". Measured, the
gate covers `/`, `/workspace`, `/dashboard`, `/profile` and `/profile/sharing`;
`/ledger` and `/account` resolve normally without a completed handshake. The
implementation is right and this file was wrong — the Constitution gates the
Step and the Profile, not the whole Workspace, and an Account someone cannot
reach without answering four questions would trap anyone trying to delete it.
The row below now states what was measured.

**Measurement capability changed this pass.** The Supabase MCP server
disconnected, so arbitrary SQL — `pg_policy`, `pg_constraint`, DDL — is no
longer reachable from a session. PostgREST reads with the service-role and anon
keys still work. Where a claim below was previously established by reading the
catalogue, it has been re-established behaviourally instead, which is stronger
evidence: rather than reading what the policies say, the anon key that ships in
the browser bundle was pointed at every table.

---

## Demonstrated

| Requirement | Authority | How it was verified |
|---|---|---|
| Front door is the same door signed in or out | IA §04 | Browser: `/` signed in serves the Workspace tree, zero marketing nav links; `/workspace` bounces to `/` |
| Four Workspace destinations, no fifth | IA §03 | `WORKSPACE_DESTINATIONS` is the single source; the developer surface that made a fifth was removed |
| The handshake gates the Step and the Profile | Flows §01, IA §08 | Browser, 9 paths, account with no `profile_state` row: `/`, `/workspace`, `/dashboard`, `/profile`, `/profile/sharing` → `/handshake`. `/ledger` and `/account` resolve. Nothing in the Constitution gates those two, and gating Account would trap a person who wants to delete it |
| `/handshake` is single-use | Flows §01 — "once complete, it stops resolving" | Browser: an account with `handshake_completed_at` set is redirected off `/handshake` to `/` |
| Post-sign-in redirect validated against an allowlist | IA §08 | Browser, 11 payloads through the real login form: zero off-origin navigations attempted; `?next=/ledger` still lands on `/ledger`. Four bypasses that previously reached `http://evil.example/` are closed |
| Auth surfaces carry minimal chrome | IA §08 | Browser, 6 surfaces: zero marketing nav links, zero footers, zero CTAs, zero `<nav>` elements |
| Every surface has a `main` landmark | XB §12 | Browser, 8 surfaces: exactly one `<main>` each, containing the form, with the decorative field outside it. The six auth surfaces previously had no landmark at all |
| No greeting anywhere | Flows §00, XB §05, BB prohibitions | Browser sweep of **24 surfaces that actually rendered** (redirects counted separately, none occurred): zero hits for "welcome back", "welcome", time-of-day greetings, noticed-absence phrasing, session summaries, or streak/reward language |
| Contrast verified against the single dark ground | XB §12 | Browser, 12 surfaces at 390×844, every leaf text node measured against its computed background: **0 failures** at WCAG AA thresholds (4.5:1, or 3:1 for large text) |
| No bottom tab bar | IA §16 | Browser at mobile width, 12 surfaces: zero fixed/sticky navs in the lower 40% of the viewport |
| Decorative visuals hidden from assistive tech | XB §12 | Repository: all four canvas/field components carry `aria-hidden` |
| Identity routes to Profile, Sharing, Account, sign-out | IA §05 | Browser: menu opened, all four present, `/profile/sharing` clicked through to "Which product can see which fact." Previously rendered only Profile, Account, sign-out |
| Four destinations, and no more | IA §03 | Repository: `WORKSPACE_DESTINATIONS` holds exactly 4; Sharing lives in `IDENTITY_ROUTES`, a separate list, because it is a second view of the Profile (IA §11) rather than a fifth place |
| Identity shows no notification badge | IA §05 | Browser: the only digits in the shell are the probe account's email address |
| The Step is served under exactly one URL | IA §01, §04 | Browser, signed in, status chains: `/` 200 serves; `/workspace` 307 → `/`; `/dashboard` 404; `/handshake` 404. Before this pass all four returned the Step |
| `/dashboard` is removed, not redirected forever | IA §04 | Browser: 404. Route absent from the build's route table; `RETIRED_DASHBOARD_PATH` deleted from `routes.ts` and `PROTECTED_ROUTES` |
| `/handshake` stops resolving once complete | IA §04, Flows §01 | Browser, account with `handshake_completed_at` set: 404, not a redirect |
| Product facts appear once, in the surface they belong to | IA §03 "Facts appear once…", IA §07, IA §17 | Browser, sentence-level diff of `/`, `/ecosystem`, `/vision`: the four product descriptions appeared **verbatim on both `/` and `/ecosystem`** before; after the split, zero shared product sentences. Remaining overlap is the Footer, which repeats by design |
| `/ecosystem` states the barrier each product removes | IA §07, PB §04 | Browser: each card renders "Barrier removed — …", taken verbatim from PB §04's table. The field did not exist before, so the surface did not deliver its constitutional content |
| Every action reachable without a pointer | XB §12 | Browser, full tab cycle on `/`: **29 tab stops for 29 focusable elements**. Auth, forms, ecosystem and all workspace surfaces reach every control |
| Focus always visible, never removed | XB §12 | Browser: every visible control on 4 form surfaces changes computed style on focus (outline, border, shadow or background) — zero unchanged |
| One universal keystroke summons intelligence | XB §12, IA §05 | Browser: Ctrl+K opens the layer on `/`, `/ledger`, `/profile`, `/account` — same gesture everywhere |
| Escape dismisses the topmost layer | XB §12 | Browser: dismisses on all four surfaces |
| Summoned layer states its limit, never fabricates | PB §07, Flows §08 | Browser: "The intelligence layer isn't connected on this deployment yet" |
| Mobile is the primary platform | IA §16 | Browser at 390x844: shell top-anchored at 57px with exactly the four IA §05 elements; summon is a persistent affordance in the bar (no keystroke on a phone); the Step is full-bleed at viewport width; every tap target >= 44px; zero bottom tab bars |
| One layer open at a time; Escape returns exactly one level | CS §07, IA §14, IA §18 | Browser: opening the switcher then firing the summon keystroke left **2 dialogs open** and one Escape closed **both**. After: opening replaces (1 dialog), one Escape closes one level, and each of switcher / identity / summon still opens alone and dismisses |
| Reject is equal weight to confirm | CS §06, XB §02 V2 | Browser, inferred fact rendered: confirm and reject now share font size, weight, height, opacity **and colour** (both accent). Before, confirm was `text-accent` and reject `text-text-s`. Adjacent in DOM, one interaction each, zero confirmation dialogs, and the page states that rejection teaches |
| Grant and revoke identical in count and language | CS §06 | Browser: one toggle, one click each way, no confirmation dialog. Colour tracks granted *state*, which is also carried in text |
| Marketing code never enters the signed-in bundle | IA §18 Architecture | Browser, network-level: every `/_next/static/chunks/*.js` the page pulled was fetched and searched for five strings each unique to one marketing component. Signed-out `/` carries 4 of them; signed-in `/`, `/ledger` and `/profile` carry **0**. The Proxy branch is a real bundle boundary, not a component conditional |
| No badge or count primitive | IA §18 Forbidden | Repository: every occurrence of "badge" in `src/components` is a comment forbidding one. No primitive exists |
| No full-page error component outside auth | IA §18 Forbidden | Repository: no `error.tsx`, `global-error.tsx` or `not-found.tsx` anywhere in `src/app` |
| No skeleton where a stale labelled value could show | IA §18 Forbidden, CS §00 Override 2 | Repository: exactly one skeleton exists, in the marketing Navbar's auth slot, where no prior value exists to be stale. The Step, Ledger and Profile each carry an explicit comment that they have none |
| Mission Control reachable only by an operator | IA §02, §12 | Browser, three roles: visitor 404, authenticated person 404 (indistinguishable), operator 200. Shell links to `/control` zero times |
| Observations enforced identically in both layers | CS §02, IA §11, IA §18 | Postgres: the shape the app refuses to render now raises `check_violation`; row count unchanged |
| Three absence components, used as three | CS §03, IA §18 | Repository + browser: the Ledger's empty branch renders `EmptyState` (previously an inline `<p>`); page shows the exact CS §05 copy, no "nothing found", no "nothing changed", no `role="status"` |
| The Step resolves to exactly one of four states | CS §04 | Browser: with understanding on record and no opportunity corpus, it resolves `unknown` and says "I've had no visibility into this since August 2026" — BB §03's sanctioned sentence, verbatim |
| Intake returns a true receipt | Flows §09 | Three flows submitted in a browser; exact copy returned; rows confirmed in Postgres |
| A failed write never claims receipt | Flows §08 | A temporary CHECK forced the insert to fail: UI said "That didn't save", input preserved, zero rows written |
| Scope/timeline/budget asked directly, none optional | Flows §10 | Server action rejects a missing field; DB `fields_match_kind` enforces the same shape |
| Budget is never a tier list | IA §10 | Free text, no select |
| One intake implementation | CS §14 | One `IntakeForm`, three callers |
| One session check, three states | CS §02, §05; BB A-04 | Browser: a network blip leaves the person in place; a 401 still ejects to `/login?expired=1` |
| No surface asserts an effect it lacks | Flows §08 | API-key surface removed after proving `key_hash` is written in one place and compared in none |
| Account deletion removes everything in the account | — | Seeded all six user-scoped tables, deleted via the real UI: all six → 0 |
| …and says what it does not remove | CS §04 | The enquiry survives, which is now exactly what the copy states |
| No table leaks a row to the public | IA §18 | The anon key that ships in the browser bundle, pointed at all 16 tables: **0 rows returned from any of them, 0 accepted a write.** 9 denied by RLS returning nothing, 7 denied at the grant level with `permission denied` |
| Enquiries unreachable from the internet | — | `intake_submissions` with the anon key: `401 permission denied`, read and write |
| `/legal/*` exists and is findable | IA §04, §09 | Three routes build and serve; reached by clicking the footer link as a visitor |
| No light mode, stated as a commitment | BB §04 | Preferences copy replaced; "on the way" absent from the rendered page |
| Voice: no exclamations, emoji, hedging, encouragement, celebration, coming-soon | BB §03 | Mechanical sweep of 22 rendered surfaces, signed out and signed in: zero violations |
| No analytics, trackers, or third-party scripts | — | Dependency list and served HTML; only external hosts are w3.org, github.com, aeonx.ai |
| One cookie, only after sign-in | — | Browser: signed-out cookie jar and localStorage both empty |

## Blocked

| Requirement | What has to move | Where |
|---|---|---|
| Delete three dead files | `git rm` — this sandbox's classifier refuses it | `blocked-procedures.md` §1 |
| `api_keys` table and its one row | A founder decision about real user data | §2 |
| Retire `/dashboard` entirely | Same `git rm`; the precondition is met and verified | §3 |
| Anything deployed | Vercel authorisation, or a repo-connected project | §4 |
| Anyone told an enquiry arrived | A mail provider | §5 |
| Enquiry deleted on request | A person runs the delete; the promise is live | §6 |

## Impossible until specified

| Thing | Why it cannot be derived |
|---|---|
| Terms of service | Liability, governing law, what happens to data if the company stops — none established by any document. Founder decision. |
| A step that resolves to `step` | Needs a discovery engine and an opportunity corpus. Nothing scans sources on this deployment. Seeding one would be the fabricated movement PB §07 forbids. |
| `/?why=step` exercised | Built, but Level 1 explains a step, and there is no step to explain. Unexercisable for a constitutional reason, not an engineering one. |
| Owning the seven `opportunities` rows | **Ownership is presently unknowable.** All seven have `owner_id IS NULL`; the RLS policy requires a non-null owner, so they are invisible to every account. Nothing in the Constitution assigns them, and the standing rule forbids guessing, using implementation or commit history, assuming the development identity owns them, or inventing ownership to unblock work. |
| `/control/*` | IA §12 defers Mission Control's own primary signal "until there is a business with signals to rank". Building its home now would be inventing. |
| An API or developer surface | Zero occurrences of "API key", "API" as a product surface, or "developer" across all six documents — searched, not recalled. |

## Known divergence — the repository is not the schema's source of truth

`supabase/migrations/` holds **two** files. The live database has **sixteen**
tables. The migrations directory therefore describes a small fraction of the
deployed schema, and anyone reading it would form a false picture.

This is not repaired here, and repairing it by writing migrations from memory
would be worse than leaving it: the files would claim to be the history that
produced the database without having produced it. Regenerating them needs the
SQL access this session does not have (see `blocked-procedures.md`).

`20260729000000_api_keys.sql` is retained deliberately even though the API-key
surface was deleted. The table still exists in the live database with one real
row, so removing the migration would make the repository *less* accurate about
what is deployed, not more.

## Not re-verified this pass

Recorded so the next pass does not mistake inherited evidence for fresh
evidence. Each of these was measured in an earlier pass and has not been
re-measured since; nothing suggests they have changed, and that is not the same
as knowing.

| Claim | Last measured | Why not re-measured |
|---|---|---|
| Account deletion cascades all six user-scoped tables | 2026-08-02 | Needs seeded rows in six tables, which needed `execute_sql`; PostgREST writes could substitute but the cascade itself is a schema property no longer readable |
| Every FK to `auth.users` is `ON DELETE CASCADE` | 2026-08-02 | `pg_constraint` unreachable this pass |
| `profile_facts` CHECK constraints enforce tier shape | 2026-08-02 | `pg_constraint` unreachable this pass |
| BB §03 voice sweep, 22 surfaces | 2026-08-03 | Re-run each pass as a 24-surface sweep |

## Open conflict

**Preferences as FactRows — the previous framing of this conflict was wrong.**

An earlier version of this file resolved it by citing CS §06's definition of a
FactRow as "one thing AEON X *believes* about a person" against the
Reconstruction Audit, and concluded "the audit is not a Bible and CS §06 is, so
the current implementation stands."

That reasoning does not survive reading the Product Bible. PB §12 states the
authority order outright: "This is the senior document … The Brand Bible,
Experience Bible, and Information Architecture Bible are all subordinate to it.
Where any of them conflicts with this document, this document governs." So a
CS §06 argument cannot settle a question the Product Bible speaks to.

And it does speak to it, on both sides:

- **PB §07** places "◎ Learned Preferences | Behavioral, not factual —
  interface density, **notification frequency, accessibility**, working hours"
  inside the Personal Intelligence Profile, where IA §11 requires every entry to
  carry tier, provenance, confidence, decay class and per-product permissions.
  Reduce-motion is accessibility; email digests are notification frequency. Both
  domains are named.
- **PB §04** lists "profile, **preferences**, and subscription management" among
  the User Workspace's capabilities and "settings" among Shared Services, and
  IA §03 cites PB §04 when it gives Account "identity, security, subscription,
  preferences. Infrastructure, not intelligence." IA §04's sitemap lists
  `/account/preferences` explicitly.

The distinguishing property in PB §07's own definition is "**Evolves
automatically**". The two current toggles do not evolve; they are set once by
hand and stay. On that reading they are PB §04 settings, not PB §07 learned
preferences — but the ◎ tier's named examples are exactly their subject matter.

**The Constitution is genuinely ambiguous here and this is not mine to settle.**
The implementation is unchanged, on the narrow ground that PB §07's definition
turns on automatic evolution and nothing in this deployment observes behaviour
yet. If a behavioural signal is ever added for either setting, PB §07 governs and
the setting moves into the Profile with the full FactRow apparatus.

**Allowlist scope.** IA §08 requires the post-sign-in redirect be "validated
against an allowlist" and does not enumerate it. The implementation allows
`PROTECTED_ROUTES` plus `/`, on the reasoning that only paths a person can be
bounced off are worth capturing. Allowlisting every route is defensible.
Consequence: `?next=/legal/privacy` falls back to `/`.
