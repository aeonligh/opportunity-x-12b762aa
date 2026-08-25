# The database is shared with an earlier product

Established 2026-08-07 by reading the live Supabase project directly.

## The finding

Supabase project `fbqufjvkzbifklxtouol` is not AEON X's alone. It carries an
earlier automation whose own first migration names it the **AEON Scholarship
Intelligence Engine v4.0**. That system predates this codebase, is named in no
Bible, and is still running.

| | |
|---|---|
| Applied migrations | 18 — **8 belong to the earlier product** |
| Tables | 18 — **7 belong to the earlier product** |
| SQL functions | 8 — **5 belong to the earlier product** |
| `pg_cron` jobs | **5, all active** |
| Extensions it installed | `pg_cron`, `pg_net` |

## It is live, and it sends real email

```
jobid 2  0 5 */3 * *  aeon-scholastica-radar      select 1;
jobid 3  0 6 * * *    aeon-digest-send            select public.send_daily_digest();
jobid 4  5 6 * * *    aeon-digest-reconcile       select public.reconcile_digest_delivery();
jobid 5  35 6 * * *   aeon-digest-retry           select public.retry_failed_digest();
jobid 6  40 6 * * *   aeon-digest-reconcile2      select public.reconcile_digest_delivery();
```

`digest_config` is `enabled = true`, recipient `anthonyadogbejiodjegba@gmail.com`,
sent via AgentMail through `pg_net`. `digest_log` shows a successful send every
day from 2026-08-01 to 2026-08-07, the most recent at 06:00:00 UTC today. Six of
those seven carried `new_opportunity_count = 0` — the discovery half of that
automation has produced nothing for six days while the mailer has kept sending.

**Nothing here has been changed.** This is the founder's own automation, mailing
the founder's own address. Disabling it is an outward-facing action on a system
the Constitution does not govern, so it is reported rather than performed.

## What was checked, because it borders on AEON X

The earlier product's surface is reachable from the same PostgREST endpoint AEON
X's public anon key addresses. Re-verified today, independently of the migration
that claims to have closed it:

| Check | Result |
|---|---|
| `anon` may EXECUTE `send_daily_digest` | **no** |
| `authenticated` may EXECUTE `send_daily_digest` | **no** |
| Same for `build_`/`stage_`/`retry_`/`reconcile_` digest functions | **no** |
| `anon`/`authenticated` hold any grant on the 7 foreign tables | **no** |
| RLS enabled on all 7 | yes, with no policies — denies by default |
| `profile_facts_for_product` is `anon`-executable | yes, but SECURITY **INVOKER**, so RLS scopes it to `auth.uid()`; an anonymous caller matches no row |

`send_daily_digest()` contains a credential inline in its body. It is not
reachable through the anon key, and the standing instruction is to leave existing
credentials unchanged, so it is recorded here and left alone.

## What this settles about opportunity ownership

`public.opportunities` holds 7 rows, every one with `owner_id` null. This was
previously recorded as *"ownership is presently unknowable"*. That finding now
has a cause rather than only an absence:

- The table was created by the earlier product, for one unnamed person.
- Its original policy was `for all to authenticated using (true) with check
  (true)` — every AEON X user could read and edit another person's eligibility
  verdicts. Migration `20260801152634` removed that.
- **AEON X's application code never reads the table.** Measured: zero
  `.from("opportunities")` calls anywhere in `src/`. The only matches for
  "opportunity" are the `product_scope` enum value `opportunity-x` and marketing
  copy.

So ownership is not a blocker on any AEON X surface. It is a property of data
belonging to a different system. Assigning those rows remains the founder's
decision and is still not inferable.

## Two advisories that are owner-side

From the Supabase security linter, 2026-08-07:

1. **`pg_net` installed in the `public` schema** (WARN). Moving it would break
   the live mailer above. Not actioned.
2. **Leaked-password protection is disabled** (WARN). Supabase Auth can check
   new passwords against HaveIBeenPwned. It is a dashboard toggle, not a code
   change: Authentication → Policies. Recommended.

The linter also reports ten `rls_enabled_no_policy` notices at INFO. Every one is
deliberate — `admin_claims`, `control_access_log` and `intake_submissions` are
service-role-only by design, and the seven foreign tables are denied on purpose.
No action.
