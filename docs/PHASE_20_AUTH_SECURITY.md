# Phase 20 — Authentication Security Audit & Hardening

Supabase owns authentication. Nothing here re-implements password storage,
hashing, comparison, JWT issuance, or session refresh, and no second
authentication system was introduced. What was audited is the set of things
Opportunity X can still get wrong with an authentication system it did not
write.

Every claim below names how it was established. Where something could not be
established from this repository it is marked **NOT VERIFIED — EXTERNAL**
rather than assumed.

---

## A. Baseline

Measured at `6b8957f` before any change, not carried over from Phase 19:

| Gate | Before | After |
|---|---|---|
| `bunx tsc --noEmit -p .` | 0 errors | 0 errors |
| `bunx eslint .` | 0 errors, 8 warnings | 0 errors, 8 warnings |
| `bun run test` | 336 pass / 0 fail | **349 pass / 0 fail** |
| `bun run build` | 3 bundles, clean | 3 bundles, clean |
| `bash scripts/verify-migrations.sh` | 44 passed | 44 passed |
| `bun run verify:artifact` | 22 passed | **36 passed** |
| `bun run verify:states` | 210 checks | **241 checks** |

---

## B. Five-category audit

| Category | Found | Owner | Severity | Action |
|---|---|---|---|---|
| **Input validation** | No validation at Opportunity X's boundary; only browser attributes, which a scripted submit bypasses. No size ceiling on either field. `minLength={6}` applied to *sign-in*. | Opportunity X | Medium | **Fixed** — `lib/auth-input.ts`, enforced in the handler |
| **Password security** | Nothing wrong. Never stored, hashed, compared, logged, persisted, or placed in a URL. | Supabase (storage/hashing) · Opportunity X (transport) | — | **Proven, not changed** |
| | Typed password rendered as an HTML `value` attribute, so it appeared in `document.documentElement.outerHTML` | Opportunity X | Medium | **Fixed** — uncontrolled inputs |
| **Session/token security** | OAuth ran on the **implicit** flow: access *and refresh* tokens returned in the URL fragment | Opportunity X (config) | **High** | **Fixed** — `flowType: "pkce"` |
| | Build-time protection for `.server.` modules had been disabled; a client import of the service-role client compiled, and the credential name reached the bundle | Opportunity X | **High** | **Fixed** — `importProtection` restored, modules disambiguated |
| | Session held in `localStorage`, readable by any script on the origin | Opportunity X (config) | Medium | **Reported, not changed** — see §I |
| **Abuse protection** | `waitForSession` could make ~60 `getUser()` calls in 8s against a service already failing | Opportunity X | Medium | **Fixed** — bounded to 3 confirmations |
| | Duplicate submission | Opportunity X | — | Already prevented; now proven in a browser |
| | Rate limiting, lockout, CAPTCHA | Supabase / infrastructure | — | **NOT VERIFIED — EXTERNAL** |
| **Information disclosure** | No raw error, stack, SQL, project id, path or token in any message | Opportunity X | — | **Proven, not changed** |
| | `"Session did not become available"` written twice with nothing binding the two — a reword would route a successful password check to the branch that blames the password | Opportunity X | Medium | **Fixed** — shared constant + test |
| | Sign-up announced "Account created. Welcome!" before any session existed | Opportunity X | Medium | **Fixed** — removed |

---

## C. The Supabase boundary

**Supabase owns** — password storage and hashing; credential comparison; JWT
issuance, signing and expiry; refresh-token rotation; the wording of auth API
responses; rate limiting; whether an unconfirmed account can sign in; email
confirmation; provider configuration.

**Opportunity X owns** — which flow the OAuth request uses; where the session is
stored; what is sent to the auth service and what is checked first; how a
failure is classified and worded; whether a control can be pressed twice; how
often a failing service is re-asked; whether a credential reaches the DOM, a
log, a URL or the client bundle; the server-side verification of a bearer token
before a protected read; and the redirect allowlist.

**Neither, from here** — the project's password policy, rate limits, redirect
allowlist, and provider secrets are dashboard configuration. See §E.

---

## D. Findings

### D1 — OAuth used the implicit flow · **High** · fixed

**Location** `src/integrations/supabase/client.ts`.

**How discovered** Not by reading. `@supabase/auth-js` defaults to
`flowType: "implicit"` and nothing overrode it, so the client was asked what URL
it would actually send a person to:

```
before: …/authorize?provider=google&redirect_to=…            ← no code_challenge
after : …/authorize?provider=google&redirect_to=…
        &code_challenge=_R4p4…&code_challenge_method=s256
```

**Why it matters** Under implicit flow the provider returns the access **and
refresh** tokens in the URL fragment. A fragment is not sent to servers — the
usual reassurance — but it is written into browser history, readable by any
extension with host access, present in a screenshot of the moment after
sign-in, and available to anything that can read `location.hash`. A refresh
token is a long-lived credential to leave somewhere nobody treats as sensitive.
The OAuth 2.0 Security BCP is explicit that implicit should not be used.

**Fix** `flowType: "pkce"`. One option, same provider, same redirect target,
same `detectSessionInUrl` handling on return. A single-use code replaces the
tokens, and it is worthless without the verifier this client keeps locally.

**Test** `test/auth-security.test.ts` pins the configuration; the browser walk
asserts the real authorization request carries `code_challenge` and
`code_challenge_method`. Mutation `oauth-back-to-implicit`: caught.

### D2 — A client component could import the service-role client · **High** · fixed

**Location** `vite.config.ts`, `importProtection`.

**How discovered** By trying it. A client component was given
`import { supabaseAdmin } from "@/integrations/supabase/client.server"`:

```
before: build exit 0 — SUPABASE_SERVICE_ROLE_KEY present in 1 client file
after : build exit 1 — Import denied in client environment
                       Denied by file pattern: **/*.server.*
```

**Why it matters** `CLAUDE.md` states that Vite will not bundle `.server.ts`
into the client, and Phase 18 recorded the trust boundary as verified. Both were
true of the artifact and neither was enforced: the config **replaces** the
framework default rather than adding to it, and had narrowed
`files: ["**/*.server.*"]` to `["**/server/**"]` — a directory pattern nothing
in this repository matches. The runtime guard did not cover it either, because
`client.server.ts` is the module that guard protects rather than one of its
users. The artifact gate would have caught the leak, but only after a build, and
only if someone ran it.

**Fix, in two parts.** Restoring the pattern alone broke the build, because the
`.server.` suffix meant two different things here: `opportunities.server.ts`
exported `createServerFn`s and was *meant* to be imported by routes. Those
modules are now `*.functions.ts` — the convention `pursuit.functions.ts` already
used — so the suffix means one thing again: raw server-only code holding
credentials, never importable from the client. `client.server.ts` and
`ai.server.ts` additionally import `@/lib/server-only` as a second line.

An earlier attempt protected that marker file instead and was abandoned when it
proved not to fire: a side-effect-only module is tree-shaken before the plugin's
`generateBundle` hook runs. Recorded because the failed approach is the useful
part.

**Test** Behavioural, at the build: three credential-reading modules denied, the
legitimate route import still allowed.

| probe | result |
|---|---|
| client → `client.server` | **DENIED** — `**/*.server.*` |
| client → `ai.server` | **DENIED** |
| client → `config.server` | **DENIED** |
| route → its server functions | **ALLOWED**, as required |

### D3 — A typed password was in the serialised DOM · **Medium** · fixed

**Location** `src/routes/auth.tsx`.

**How discovered** A marker string typed into the password field in a browser,
then `page.content()`:

```
before: <input type="password" … value="hunter2-marker">   attribute: "hunter2-marker"
after : <input type="password" …>                          attribute: null
```

**Why it matters** React renders a controlled input's value as an HTML
*attribute*. The browser must hold what was typed — that is the element's
property and is unavoidable — but nothing requires it in the serialised markup,
which is one snapshot away from leaving the page: session-replay tools and error
reporters attach DOM snapshots, HTML export writes attributes, and any
third-party script with DOM access can read it without touching the input.

**Fix** Both credential inputs are uncontrolled, read from refs at submit.
Nothing else in the component ever read them.

**Test** Browser walk asserts the marker is absent from `page.content()`; a unit
test pins the mechanism, because restoring `value`/`onChange` "for symmetry"
would silently reintroduce it. Mutation `password-input-controlled-again`:
caught.

### D4 — No credential contract at this application's boundary · **Medium** · fixed

**Location** `src/routes/auth.tsx` → new `src/lib/auth-input.ts`.

The form had `required`, `type="email"` and `minLength={6}`, and the submit
handler looked at none of it. Browser attributes are gone the moment a submit is
scripted or an attribute edited. A multi-megabyte password was accepted, held in
state, and posted.

**Deliberately not a password policy.** Supabase decides what a valid credential
is. This checks only what this application can honestly check: presence, type, a
plausible address, and that neither field is pathologically large.

**The password is never altered** — not trimmed, normalised, case-folded or
truncated. A credential the application quietly rewrites is a different
credential, and the failure looks like the person's mistake. The address *is*
trimmed, because a trailing space from a paste is not part of it. Case is left
alone: Supabase already treats addresses case-insensitively.

`minLength={6}` was removed from sign-in — it is a guess at a project setting,
applied to the wrong side of the transaction, and it stops someone with a
shorter existing password from even attempting one.

**Test** Nine refusal cases and the accepted case; the browser walk proves a
malformed address is refused with **zero requests to the auth service**.
Mutations `validation-bypassed-at-the-boundary`, `password-silently-trimmed`,
`pathological-password-accepted`: all caught.

### D5 — A failing service was answered by asking it more often · **Medium** · fixed

`waitForSession` polled every 120ms and made a network `getUser()` call each
time a session was present — up to ~60 requests in eight seconds, from a client
that had just been told the service was struggling. Waiting for the session to
*appear* is a local read and keeps its loop; confirming it with the server is
now bounded to three attempts.

Mutation `retry-bound-removed`: caught.

### D6 — A magic string stood between a lost session and an accusation · **Medium** · fixed

`classifyAuthFailure` reaches its `no-session` branch by matching the text
`"session did not become available"`. That sentence was thrown in `auth.tsx` and
matched in `auth-outcome.ts`, with nothing binding them.

Rewording either — the kind of change that reads like copy editing — would have
dropped the outcome into the classifier's residual branch, which is `rejected`:
the one branch allowed to blame the password. A **successful** password check
would have been reported as a wrong password, and retrying would reproduce it.

Now `SESSION_NEVER_ARRIVED`, with a test that fails if the thrown sentence stops
matching what the classifier looks for. Mutations `shared-sentence-reworded` and
`lost-session-becomes-wrong-password`: both caught.

### D7 — Sign-up announced success before it had any · **Medium** · fixed

`signUp` was followed immediately by "Account created. Welcome!". Where a
project requires email confirmation, `signUp` returns cleanly with **no
session**, so the sequence a person saw was a congratulation followed by a
failure. A write is not announced until it has been read back; that rule does
not stop applying because the write is an account.

Mutation `premature-success-announcement`: caught.

### D8 — Stale environment documentation · Info · reported

`.env.example` names `OPPORTUNITY_X_CRON_SECRET`, `RESEND_API_KEY` and
`SITE_URL`. None is read anywhere in `src/` or `scripts/`. Not a security defect
— nothing can fail open on a variable nothing reads — but it invites someone to
set a secret believing it does something.

---

## E. External / unverified controls

**NOT VERIFIED — EXTERNAL.** None of the following can be established from this
repository, and none is claimed:

| Control | Owner |
|---|---|
| Rate limiting on sign-in attempts | Supabase project configuration |
| Account lockout policy | Supabase |
| CAPTCHA / bot protection | Supabase project configuration |
| Configured password minimum and strength rules | Supabase project configuration |
| The redirect-URL allowlist on the Supabase project | Supabase dashboard |
| Google OAuth client configuration | Google Cloud console |
| Whether email confirmation is required | Supabase project configuration |
| JWT signing key rotation and expiry | Supabase |
| TLS termination and security headers | Deployment platform |
| A real OAuth round trip completing under PKCE | Needs network + credentials |
| A real `signInWithPassword` succeeding | Needs credentials |

**Not added, deliberately** (§13 of the directive): custom password hashing, a
custom JWT or refresh system, application-level lockout, CAPTCHA, password
rewriting, or a second auth provider. Supabase owns each, and duplicating any of
them would build the weaker of two authentication systems.

---

## F. Browser verification

`bun run verify:states` — **241 checks**, up from 210. New section: *the
sign-in form, against real failures* — 31 checks driving the real `/auth` page
with failures induced at the network layer, so what runs is what runs in
production.

| Verified | |
|---|---|
| malformed address | refused in words, **0 requests sent**, claims nothing about the account |
| oversized password | refused, **0 requests sent** |
| service unreachable | "couldn't reach the service", never "don't match an account", says the password was not checked |
| service refuses | "don't match an account", no account-existence oracle, no `supabase` / `invalid_grant` / URL / status code in the message |
| in flight | control disabled; a forced second press starts **no second request** |
| keyboard | the form submits by keyboard alone |
| rendered page | no service-role credential, bearer token, access token, refresh token, Anthropic key, or build path; a typed password is not in the markup |
| off-origin `?next=` | the browser does not move |
| OAuth request | carries `code_challenge` and its method; no request URL carries a token |

The rest of the matrix — 375 / 390 / 768 / 1280 × light/dark, hydration, state
composition, the shell, sign-out, the full journey — re-ran green.

---

## G. Artifact verification

`bun run verify:artifact` — **36 assertions**, up from 22. Searched in the built
output:

**Secret-by-design, must be absent from the client** — `SUPABASE_SERVICE_ROLE`,
`service_role`, a JWT carrying the service-role claim, `ANTHROPIC_API_KEY`,
`sk-ant-`, `FIRECRAWL_API_KEY`, `RESEND_API_KEY`,
`OPPORTUNITY_X_CRON_SECRET`, `Bearer ey`, a `refresh_token` literal,
`postgres://`, `postgresql://`, `DATABASE_URL`, `[?&]password=`,
`[?&]access_token=`, `/home/user/opportunity-x`, `supabaseAdmin`,
`createSupabaseAdminClient`. **All absent.**

**Public-by-design, asserted present** — the Supabase project URL and the
`sb_publishable_` key. Asserted *present* on purpose: the anon key is meant to
be in the browser, protected by row-level security rather than by secrecy, and
checking for its presence stops "no key in the bundle" from being satisfied by a
build that simply forgot the one the application needs.

One check was wrong on first run and was narrowed rather than removed:
`password=` matched supabase-js's own `typeof r.weak_password=="object"`. A gate
that fires on its dependency is a gate nobody keeps; it is now `[?&]password=`.

---

## H. Mutation testing

Every control was removed and the suite re-run. **13 of 13 caught.**

| Mutation | Caught by |
|---|---|
| `oauth-back-to-implicit` | PKCE configuration test |
| `validation-bypassed-at-the-boundary` | handler-ordering test |
| `password-silently-trimmed` | credential contract test |
| `pathological-password-accepted` | credential contract test |
| `lost-session-becomes-wrong-password` | shared-sentence test |
| `shared-sentence-reworded` | shared-sentence test |
| `rejection-reveals-account-existence` | enumeration test |
| `error-leaks-the-backend` | disclosure test |
| `retry-bound-removed` | retry-bound test |
| `premature-success-announcement` | sign-up test |
| `password-input-controlled-again` | serialisation test |
| `client-imports-service-role-client` | the build itself |
| `client-imports-model-client` | the build itself |

Two of my own tests were wrong and were corrected rather than accommodated: one
pinned the exact call shape `validateCredentials({ email, password })` and broke
when the inputs became uncontrolled — a change that made the page *more* secure;
another counted the word "password" in user-facing copy as password *handling*.

---

## I. Remaining risks

**The session lives in `localStorage`.** Explicitly configured in
`client.ts`, so it is Opportunity X's choice, not a Supabase default that cannot
be reached. Any script executing on the origin can read the access and refresh
tokens — the exposure XSS turns into account takeover. Cookie-based sessions
(`@supabase/ssr`, `httpOnly`, `SameSite`) would remove it.

**Not changed here, and the reason is not that it is unimportant.** It changes
what the *server* can see: the authenticated gate is `ssr: false` precisely
because the session is invisible server-side, and the Phase 18 hydration fix
depends on that. Moving session transport rewrites the gate, the hydration
repair, and the middleware that attaches the bearer token. That is a redesign of
authentication, which this phase was told not to do. **Recommended as the first
item of a dedicated phase.**

**No CSP.** Nothing in the repository sets a Content-Security-Policy, which is
the control that most reduces the localStorage exposure above. Deployment-layer
concern; recorded, not implemented.

**The `unconfirmed` branch discloses that an account exists.** It says "This
account exists, but its email address was never confirmed." That is derived from
Supabase's own `email_not_confirmed` response — Opportunity X did not create the
distinction, and collapsing it would remove genuinely useful information from
the person who needs it while barely inconveniencing an attacker who has the
same signal from the API directly. §5 of the directive is explicit that security
hardening must not collapse meaningful state. **Recorded as a deliberate
boundary, not a defect.**

**Bearer tokens are attached to every server-function call** by a global client
middleware and verified server-side with `getClaims`. Correct, and unchanged.
The token's lifetime and rotation are Supabase's.

**A successful sign-in has never been executed here.** Every positive path in
this report is a negative proof — what the application does *around* a sign-in.
The sign-in itself needs credentials and network that this sandbox does not
have.

---

## Definition of done

| | |
|---|---|
| authentication boundary audited | ✅ §C |
| input handling audited | ✅ §D4 |
| password handling proven safe or delegated | ✅ §B, §D3 |
| session/token handling audited | ✅ §D1, §I |
| cookie/storage/token exposure audited | ✅ §D1, §D3, §G, §I |
| brute-force/abuse ownership established | ✅ §B, §E |
| account enumeration checked | ✅ §D, §F, §I |
| error disclosure audited | ✅ §F |
| auth state matrix implemented where applicable | ✅ §B — `invalid-input` added; the rest already existed |
| duplicate submission prevented | ✅ proven in a browser |
| pending states truthful | ✅ |
| unavailable ≠ bad credentials | ✅ proven in a browser |
| sign-out lifecycle truthful | ✅ Phase 19, re-verified |
| `last-good` cleared at confirmed sign-out | ✅ Phase 19, re-verified |
| off-origin redirects rejected | ✅ 24 hostile inputs + browser |
| no server-only credential in the artifact | ✅ 36 assertions |
| no password/token in rendered output | ✅ §D3, §F |
| security controls have behavioural tests | ✅ |
| security tests mutation-tested | ✅ 13/13 |
| browser security walk passes | ✅ 241 checks |
| Phase 11/14/17/18/19 verification still green | ✅ |
| no unrelated product redesign | ✅ |
| no custom authentication system | ✅ |
| external assumptions recorded | ✅ §E |

**Phase 16 remains `BLOCKED — EXTERNAL ENVIRONMENT`**, untouched.
