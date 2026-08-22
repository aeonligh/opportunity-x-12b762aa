# Deployment — the production source of truth

Established 2026-08-07 by reading the Vercel account directly, not from recall.

## The canonical project

| | |
|---|---|
| **Project** | `aeon-x-technologies-9kzz` (`prj_un0rP8WdD8DUDuQ0nxXQVt2gsTBp`) |
| **Team** | `aeonlighs-projects` (`team_Qi5Opjr6mXDRbYIL4Vo30Ua0`) |
| **Production URL** | https://aeon-x-technologies-9kzz.vercel.app |
| **Branch** | `claude/aeon-x-digital-identity-hhhmmj` |
| **Framework** | Next.js, Node 24.x, Turbopack |

**The branch configuration was already correct.** Earlier notes in
`blocked-procedures.md` warned that Vercel might assign Production to the wrong
default branch. Measured, it did not: the production deployment's
`githubCommitRef` is the AEON X branch and `githubCommitSha` matched the
repository head exactly. No dashboard change was needed. That warning is
superseded by this file.

## Nine AEON X projects exist; one works

The account holds ten projects, nine of them AEON X. This is the duplication
that was reported from outside and was invisible from a session until the Vercel
connector was authorised.

| Project | Created | State |
|---|---|---|
| `aeon-x-technologies-9kzz` | 2026-07-27 | **Canonical. Production READY.** |
| `aeon-x-technologies` | 2026-07-27 | Same repo, same branch, **build ERROR on every push** |
| `aeon-x`, `aeon-x-a4x9`, `aeon-x-eq8i`, `aeon-x-kgcp`, `aeon-x-9hka`, `aeon-x-vuym`, `aeon-x-main` | 2026-02-16 | Stale, predate this codebase |
| `opportunity-x-12b762aa` | 2026-07-27 | A different product. Leave alone. |

**Two projects are wired to the same repository and branch and build on every
push, 25 milliseconds apart.** `aeon-x-technologies` fails, every time, with:

```
Error: Missing NEXT_PUBLIC_SUPABASE_URL, or neither
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY is set.
```

That project has no environment variables. The failure is the application's own
guard in `src/lib/supabase/env.ts` refusing to build a deployment that could not
reach Supabase — the guard working, not a defect. But it means every push
produces one green deployment and one red one, which is why the account looks
broken from outside.

**Owner action:** delete or disconnect `aeon-x-technologies` and the seven stale
`aeon-x-*` projects. Keep `aeon-x-technologies-9kzz` and `opportunity-x-12b762aa`.

## Environment variables

Exact inventory, from a scan of every `process.env` reference in the repository.
There are no other integrations — no analytics, no mail, no OAuth provider.

| Name | Client/Server | Required | Used by | Production configured |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | yes | every Supabase client | yes — proven by the Proxy running in production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` *or* `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client + server | yes, either | browser session, RLS-scoped reads | yes — present in the client bundle |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | yes | account deletion, intake writes, `resolveViewer()`, Mission Control | yes — guarded by `server-only`; string `service_role` absent from every client chunk |
| `NODE_ENV` | server | — | set by Vercel | yes |

Re-derived 2026-08-08 by grepping every `process.env.*` reference in `src/` and
`next.config.ts`. The complete set is **four names and no more** — the grep
returns nothing else. Specifically absent, and correctly so:

- **no site-URL variable** — the origin is derived per-request, so there is no
  `NEXT_PUBLIC_SITE_URL` to drift out of date
- **no `VERCEL_URL` use** — nothing reads it
- **no Google/OAuth variables** — no OAuth call exists
- **no mail variables** — AEON X has no mail provider (see below)
- **no discovery or external-API variables** — that engine is not in this repo

No server secret is exposed through a `NEXT_PUBLIC_` name: the only
`NEXT_PUBLIC_` values are the Supabase URL and the anon/publishable key, both of
which are designed to be public and are governed by RLS.

## Mail

AEON X has **no mail provider of its own**. Supabase Auth sends confirmation and
reset mail on its built-in service; nothing else in AEON X sends mail. The
earlier product's AgentMail path is **not** reused and must not be — it belongs
to a different system (see `shared-database.md`).

Consequence: the signup → confirmation → `/auth/callback` cycle is
**BLOCKED — external delivery dependency**, and has never been exercised
anywhere, because no mailbox in this environment can receive the message.

`SUPABASE_SERVICE_ROLE_KEY` is guarded by `server-only` in
`src/lib/supabase/admin.ts`, so a client import fails the build rather than
leaking. Verified on the live deployment: the string `service_role` does not
appear in any client chunk.

## Google OAuth

**Not implemented, and not required by any Bible.** Traced: there are zero
`signInWithOAuth` calls in the repository. The only match for "google" is
`next/font/google`, a font import. Authentication is entirely email and password
through Supabase Auth — `signInWithPassword`, `signUp`,
`resetPasswordForEmail`, `updateUser`, and `exchangeCodeForSession` for
confirmation and reset links.

IA §08 lists the auth paths — sign up, email confirmation, sign in, password
reset — and names no social provider. Adding Google would be new functionality
requiring a constitutional basis, not a deployment configuration. **No Google
environment variables are needed and none should be created.**

## Verified on the live deployment

By HTTP, 2026-08-07, against `ea26686`:

- 15 public routes → 200.
- 9 guarded routes → 307 to `/login?next=<path>`, correctly escaped. The Proxy is
  running in production, which is itself proof the environment variables are set.
- `/dashboard` → 404 (retired, IA §04).
- `/control` → 404 for a visitor (IA §12 — a door a regular user cannot see).
- Client bundle carries the Supabase URL and anon key; `service_role` absent.
- Constitutional copy live: the hero finding, no "welcome back" anywhere,
  `/legal` stating there are no terms, `/ecosystem` stating each barrier.

## Not yet verified in production

Browser-level testing of the live deployment is **blocked from this environment**:
Chromium's proxy CONNECT is reset by the sandbox egress policy, though `fetch`
succeeds. So the following are verified against a local production build only:

- signing in, and the three roles against `/control`
- open-redirect payloads through the real login form
- the signup → confirmation email → `/auth/callback` cycle, which has **never**
  been exercised anywhere, because no mail provider is configured

## The Supabase project is shared

It also hosts an earlier product, with five live `pg_cron` jobs that send a real
email daily. That is documented separately in `shared-database.md`, including
what was checked to confirm it is not reachable through AEON X's public anon key.
Nothing there was changed.

## The exact redirect URLs, traced from the code

Not guessed, and not a wildcard. There are exactly two outbound auth redirects in
the repository, both built from the request origin:

| Flow | Call site | Value sent to Supabase |
|---|---|---|
| Sign-up confirmation | `src/app/actions/auth.ts:64` — `signUp({ options: { emailRedirectTo } })` | `<origin>/auth/callback` |
| Password reset | `src/app/actions/auth.ts:97` — `resetPasswordForEmail(email, { redirectTo })` | `<origin>/auth/callback?next=/reset-password` |

`<origin>` comes from `getOrigin()`, which reads the `Origin` request header.
Both call sites are Server Actions, and Next.js compares a Server Action's
`Origin` against its `Host` and rejects a mismatch, so in production this
resolves to the deployment's own origin rather than to anything a caller chooses.

Both land on `src/app/auth/callback/route.ts`, which exchanges the code and then
splits: `next=/reset-password` goes straight there, everything else goes to
`/auth/verified` with the destination passed through `safeRedirectPath`.

**So Supabase needs exactly this:**

- **Site URL** — `https://aeon-x-technologies-9kzz.vercel.app`
- **Redirect URLs** — `https://aeon-x-technologies-9kzz.vercel.app/auth/callback`
  (add the `**` wildcard suffix form only if Supabase rejects the reset link's
  `?next=` query string; try the bare path first)

Do not add a broad `https://aeon-x-technologies-9kzz.vercel.app/**`. Nothing in
the repository redirects anywhere else, and a wildcard would license paths that
`safeRedirectPath` exists to refuse.

## Google OAuth — still not implemented, re-checked

Re-verified 2026-08-08: **zero** `signInWithOAuth` and zero `signInWithIdToken`
calls in `src/`. The only "provider" strings in the codebase are
`primary_provider` / `fallback_provider` columns belonging to the *earlier
product's* digest config. IA §08 names no social provider. There is no Google
callback to configure and no Google environment variable to set.

## Supabase URL configuration — still required

Supabase → Authentication → URL Configuration must list
`https://aeon-x-technologies-9kzz.vercel.app` as **Site URL** and as a
**Redirect URL**. Until then, confirmation and reset emails contain links
pointing at localhost. This has not been verified as done.
