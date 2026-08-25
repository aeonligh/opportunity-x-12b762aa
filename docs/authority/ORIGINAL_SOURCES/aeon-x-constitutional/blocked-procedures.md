# Blocked procedures — what only the founder can do

> **Tooling note, 2026-08-03.** The Supabase MCP server is not connected in every
> session. When it is absent, arbitrary SQL — `pg_policy`, `pg_constraint`, and
> all DDL — cannot be run from here; PostgREST reads and writes with the keys in
> `.env.local` still work. Any procedure below written as SQL needs the Supabase
> SQL editor, or a session where that connector is authorised.

Every item here was attempted from the development environment and failed, or is
a decision the Constitution records as undecided. Each one states what was tried,
what the failure actually was, and the exact steps to resolve it.

Nothing in this file is a guess about whether it will work. Where I could not
establish something, it says so.

---

## 1. Deleting three source files — blocked by the environment, not by the code

**Status:** the constitutional fix has shipped; the dead files remain on disk.

**What happened.** The API-key surface and the retired `/dashboard` route are both
constitutional violations (see §2 and §3 below for the reasoning, and the doc
comment at the top of `src/app/(workspace)/account/security/page.tsx`). The fix
was applied by editing the surfaces, so the violations are gone from the running
product. The files themselves could not be removed: `git rm` was refused by this
sandbox's permission classifier, twice, and I did not attempt to route around a
refusal.

**Consequence of leaving them.** None at runtime. All three are unreferenced —
confirmed by `npx tsc --noEmit`, `eslint`, and a clean production build — so
nothing imports them and Next.js does not compile them into any route. They are
dead weight in the tree, not live behaviour.

**Procedure.** On any machine with a checkout of
`claude/aeon-x-digital-identity-hhhmmj`:

```bash
git rm src/components/account/ApiKeysSection.tsx \
       src/app/actions/api-keys.ts \
       "src/app/(workspace)/dashboard/page.tsx"
```

Then remove the two now-unused constants from `src/lib/routes.ts` —
`RETIRED_DASHBOARD_PATH` and its entry in `PROTECTED_ROUTES` — and the `api_keys`
block from `src/lib/supabase/database.types.ts` if you also drop the table (§2).

```bash
npx tsc --noEmit && npm run lint && npm run build
git commit -am "Remove the dead API-key surface and the retired /dashboard route"
```

**Do the routes.ts edit and the file deletion in the same commit.** Removing
`RETIRED_DASHBOARD_PATH` from `PROTECTED_ROUTES` while `dashboard/page.tsx` still
exists would leave the route reachable without a session check.

---

## 2. The `api_keys` table — a founder decision about data, not a code change

**Status:** the surface is gone. The table and one row still exist.

**Why the surface was removed.** The six constitutional documents contain no
occurrence of "API key", "developer", or an API as a product surface — searched
across all six, not recalled. More decisively, the feature made a claim that was
false: "Generate keys for programmatic access to the AEON X platform." This
application has exactly one route handler (`/auth/callback`), and `key_hash` was
written in one place and compared in none. No request could ever be authenticated
by one of these keys, and the "Last used" column could never read anything but
"Never".

**What is left.** `public.api_keys` holds **1 row**, belonging to **1 user**,
never used (`last_used_at is null`, which was structurally guaranteed). The
probe key created during verification was deleted with its user and is not
included in that count.

**Why I did not drop it.** Dropping a table destroys a row belonging to a real
account. That is irreversible and it is your call, not mine.

**Procedure — if you want it gone:**

```sql
-- Look first.
select id, user_id, name, key_prefix, created_at, revoked_at
from public.api_keys;

-- Then, if you are content to lose it:
drop table public.api_keys;
```

Afterwards remove the `api_keys` block from
`src/lib/supabase/database.types.ts`.

**Procedure — if you want to keep it:** leave the table. It is inert: RLS is on,
nothing in the application reads or writes it, and it costs nothing. Revisit it
only if a Bible is ever amended to specify a developer surface, at which point
the feature would need deriving from that text rather than restoring from git.

---

## 3. `/dashboard` — already retired, pending only the file deletion

`src/app/(workspace)/dashboard/page.tsx` is a `permanentRedirect` to `/`. Its own
comment states the condition for removal: "It should be deleted once the Proxy
serves the Workspace from `/`."

**That condition is met, and was verified rather than assumed.** Signed in, `/`
serves the Workspace tree — measured in a browser: zero marketing navigation
links present on the page at `/`, and `/workspace` bounces back to `/`.

The Reconstruction Audit §05 is explicit about why the redirect cannot simply
stay: "A permanent redirect to a retired model preserves its URL indefinitely."
Removal is in §1's `git rm` above.

---

> **Superseded 2026-08-07 by `deployment.md`.** The repository was already
> connected to Vercel and already deploying the AEON X branch to production.
> The branch warning below did not materialise — measured, `githubCommitRef` is
> the AEON X branch and the deployed SHA matched the repository head. Read
> `deployment.md` first; it records the canonical project, the eight duplicate
> projects, and what remains unverified.

## 4a. Deployment — verified ready, 2026-08-07

The application is deploy-ready and was checked rather than assumed:

- `npx tsc --noEmit`, `npm run lint`, and a clean `npm run build` all exit 0.
- `next.config.ts` carries no custom configuration, so Vercel's defaults apply.
- **No sandbox-specific code exists in `src/`.** Searched for
  `NODE_USE_ENV_PROXY`, `HTTPS_PROXY` and hardcoded `localhost:3000` — zero
  matches. That flag is only needed for *this container's* outbound proxy; its
  absence on Vercel is the normal case, not a gap.

**The three environment variables the code actually reads** (found by scanning
`src/` for `process.env.*`, not from memory):

| Name | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is accepted as an alias |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | `src/lib/supabase/admin.ts` is `server-only`, so a client import fails the build rather than leaking it |

**One step that is easy to miss and will break sign-in:** after the first deploy,
add the Vercel domain to Supabase → Authentication → URL Configuration, both as
the **Site URL** and in **Redirect URLs**. Email confirmation and password reset
links are generated from those values; if they still point at localhost, every
link in every email lands nowhere. `/auth/callback` must be reachable at the
deployed origin.

---

## 4b. Deployment — connecting the repository to Vercel (the chosen route)

This is a dashboard action. It cannot be done from a session: connecting a
repository needs Vercel account access, and no session here has the connector,
the CLI, or a token.

**Check the default branch first. This is the step that goes wrong.**

As of 2026-08-07 the repository has **no `main` branch**. It has two, neither
conventional:

| Branch | Head | Contents |
|---|---|---|
| `claude/aeon-x-digital-identity-hhhmmj` | `52adbc3` | all of AEON X |
| `claude/playwright-mcp-add-7fn6ps` | `5a948b6` | unrelated, stale |

Vercel assigns **Production** to GitHub's default branch. If that default is the
playwright branch, the production URL will serve unrelated code and the app will
appear broken for a reason that has nothing to do with the app. Either:

- set GitHub's default branch to `claude/aeon-x-digital-identity-hhhmmj`
  (Settings → General → Default branch), **or**
- set Vercel's Production Branch to it (Project → Settings → Git →
  Production Branch).

Doing neither is the failure mode. Doing both is fine.

**Then:**

1. Vercel → Add New → Project → import `aeonligh/Aeon-X-Technologies-`.
2. Framework preset: Next.js. Leave build and output settings at their defaults —
   `next.config.ts` carries no custom configuration, so the defaults are correct.
3. Add the three environment variables from §4a. Set all three for Production,
   Preview and Development; `SUPABASE_SERVICE_ROLE_KEY` must **not** be marked
   as exposed to the browser.
4. Deploy.
5. **Then do the Supabase URL step in §4a** — add the deployed origin as Site URL
   and as a Redirect URL. Until that is done, every confirmation and reset email
   contains a link to localhost.

Once connected, pushes to the production branch deploy automatically and every
other branch gets a preview URL. No connector authorisation is involved, which
is why this route survives session boundaries where the connector does not.

---

## 4c. Deployment — Vercel connector authorisation (the alternative)

**Status:** unresolvable from here. Not a code problem.

The Vercel MCP connector is unauthenticated **in the session that is running**,
and this session is non-interactive, so the OAuth flow cannot be completed from
inside it.

**Authorising mid-session does not help.** Connector grants are read at session
start. Measured on 2026-08-07 immediately after the founder authorised Vercel:
no Vercel MCP tool resolved, `vercel` was not on PATH, `~/.vercel` did not
exist, the repository had no `.vercel` link, and the runtime still listed Vercel
under "requires authentication". The grant is real; this process just never sees
it. **Start a new session and it will be there.** Nothing
has been deployed from this environment; every verification in the reports is
against a local production build (`npm run build` + `npm run start`), which is
stated rather than implied.

**Procedure.**

1. Open <https://claude.ai/settings/connectors>.
2. Authorise the **Vercel** connector, and **Tavily** if you want web search
   available in future sessions.
3. Start a new session — connector grants are read at session start, so an
   existing session will not pick them up.

If you prefer to keep deployment out of the agent's hands entirely, connect the
GitHub repository to a Vercel project instead and let pushes to
`claude/aeon-x-digital-identity-hhhmmj` produce preview deployments. That needs
no connector authorisation at all, and is the option I would pick.

**Environment variables the deployment will need** — the names only, values from
your Supabase project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the code also accepts
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY` — server-side only. The intake write path is the
  only thing that uses it, and `src/lib/supabase/admin.ts` is marked
  `server-only` so a client import fails the build rather than leaking it.

---

## 5. Intake notifications — no mail provider

**Status:** a real gap, correctly described by the product rather than hidden.

A submitted brief is committed to `public.intake_submissions` before the person
is told "Received." That part is true and verified. What does **not** happen is
anyone being told a submission arrived. There is no mail provider configured, so
the row sits in Postgres until someone looks.

The product does not claim otherwise — nothing says an email was sent. But
Flows §09's copy promises "you'll hear back within two weeks, from a person",
and that promise is currently kept by a human remembering to check a table.

**Procedure — the manual version, which works today:**

```sql
select kind, name, email, submitted_at, message
from public.intake_submissions
where responded_at is null
order by submitted_at;
```

The `responded_at` column exists precisely so the two-week promise is checkable.
Set it when you reply:

```sql
update public.intake_submissions set responded_at = now() where id = '<uuid>';
```

**Procedure — the automated version:** a Resend connector is available in this
environment but not yet authorised for a sending domain. To use it you would
need to (1) add and verify a domain in Resend, (2) put the API key in the
deployment's environment, and (3) have the intake action send a notification
*after* the insert succeeds — never before, and never in a way that lets a
failed send turn into a false "Received."

I have not built that, because sending mail from a domain on your behalf is an
outward-facing action I should not take without you asking for it.

---

## 6. Deleting an enquiry on request — a manual step the product now promises

**Status:** the promise is live on `/legal/data-handling`. Keeping it is yours.

Deleting an account removes everything in the account — verified by test, all
six user-scoped tables emptied by cascade. It does **not** remove a message sent
through the public enquiry form, because `intake_submissions` has no foreign key
to `auth.users` and the two are deliberately not linked: an email address typed
into a form is not proof of who holds an account with the same address, and
deleting on that basis would eventually destroy someone else's correspondence.

`/legal/data-handling` therefore tells people: *to have an enquiry deleted, ask —
and a person removes it.* That is now a commitment the company has made.

**Procedure when someone asks:**

```sql
-- Confirm you have the right row before removing anything.
select id, kind, name, email, submitted_at, left(message, 120) as message_start
from public.intake_submissions
where email = '<the address they wrote from>';

-- Then remove it.
delete from public.intake_submissions where id = '<uuid>';
```

Deleting by `id` rather than by `email` is deliberate: two people can share an
address over time, and the request came from one message, not from all of them.

---

## 7. Terms of service — a founder decision the Constitution leaves open

`/legal/privacy` is derivable: the live schema says exactly what is stored, and a
privacy statement that reads the schema is a statement of fact.

`/legal/terms` is not derivable from any Bible. It is a commercial and legal
position — liability, governing law, what happens to a person's data if AEON X
stops operating. Writing one would mean inventing commitments you have not made.

This is recorded as undecided rather than pending. It stays that way until you
decide it.
