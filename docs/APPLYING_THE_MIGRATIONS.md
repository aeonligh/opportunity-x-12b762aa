# Applying the three Opportunity X migrations

Status: **AUTHORED / UNAPPLIED** on project `anfiojmbgonrtympzjch`.

They have been applied and exercised against a real PostgreSQL 16.13 instance —
see "What was already verified" below — so what follows is a procedure for
getting them onto your project, not a debugging exercise.

## Why this is a manual procedure

**The connected Supabase account does not contain this project.** That is the
whole blocker, and it is not a permissions toggle.

With the Supabase connector enabled, `list_organizations` returns exactly one
organisation — *Aeon X Technnology* (`jgdiwxdbmpoqyuxwvwih`) — containing exactly
one project:

| | |
|---|---|
| Reachable | `fbqufjvkzbifklxtouol` — "aeonxtechnnologies@gmail.com's Project" |
| Wanted | `anfiojmbgonrtympzjch` — what `.env` points at |

Every call against `anfiojmbgonrtympzjch` returns *"You do not have permission to
perform this action"*, because it belongs to a **different Supabase account**.

Outbound HTTPS to `anfiojmbgonrtympzjch.supabase.co` and `api.supabase.com` is
also refused by egress policy (`403` to `CONNECT`), so neither path reaches it.

### What is already on the reachable project, and why it was left alone

`fbqufjvkzbifklxtouol` is the **AEON X** database — it carries
`ledger_commitments`, `ledger_accountings`, `profile_facts`, the digest engine
and the radar watchlist. It also already has all three Opportunity X migrations
applied, as `20260810185329`, `20260810185407` and `20260810185431`.

Nothing was applied to it and nothing was repointed at it. Confirmed with the
founder: `anfiojmbgonrtympzjch` is Opportunity X's database. Using the AEON X
project would put the two products back on one database at exactly the layer the
standalone reset separated them.

Its structure *was* read, non-destructively, and it matches this repository's
migrations exactly — see "Verified against the live AEON X project" below. No
rows were written: `opportunity_observations` is append-only, so a test
observation could never have been deleted again.

### To unblock

Connect the Supabase account that owns `anfiojmbgonrtympzjch`. Then the three
migrations can be applied through the connector directly and this manual
procedure is unnecessary.

## The three files, in order

Apply them in filename order. The order matters: the verification table carries
a foreign key into observations, and pursuits reference `auth.users`.

1. `supabase/migrations/20260810121500_opportunity_observations.sql`
2. `supabase/migrations/20260810122000_opportunity_verification_events.sql`
3. `supabase/migrations/20260810160000_opportunity_pursuit_and_delivery.sql`

## Procedure

1. Open the project's **SQL Editor** in the Supabase dashboard.
2. Open a new query. Paste the **entire contents** of file 1. Do not split it —
   the enum types, table, constraints, triggers and grants are one unit, and a
   partial apply leaves a table whose append-only rule is not yet enforced.
3. Run it. Expect `Success. No rows returned`.
4. Repeat for file 2, then file 3, in that order.
5. Run the verification block below.

If any file errors, stop and send me the error. Do not re-run a file that
partially applied; `create type` and `create table` are not idempotent here, and
the second run will fail on the first object rather than continue.

## Verifying it worked

Paste this into the SQL Editor after all three have run:

```sql
-- 1. Four tables, all with row-level security on.
select relname,
       relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace
  and relkind = 'r'
  and relname like 'opportunity_%'
order by relname;
-- expect exactly: opportunity_deliveries, opportunity_observations,
--                 opportunity_pursuits, opportunity_verification_events
--                 with rls_enabled = true on all four.

-- 2. Eight append-only triggers.
select tgrelid::regclass as table_name, tgname
from pg_trigger
where not tgisinternal
  and tgrelid::regclass::text like 'opportunity_%'
order by 1, 2;
-- expect 8 rows: *_are_never_revised and *_are_never_truncated on each table.

-- 3. The rule actually refuses. This must ERROR.
update public.opportunity_observations set url = url;
-- expect: ERROR ... is append-only: a re-encounter is a new observation ...
-- If it says "UPDATE 0" instead, the trigger did not install — stop and tell me.
```

Point 3 is the one that matters. An empty table returns `UPDATE 0` from a
missing trigger and `ERROR` from a working one, and only the error proves the
guarantee is real.

## After they are applied

Set these in the deployment environment (they are secrets — never commit them):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PUBLISHABLE_KEY`

Until `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are both present,
`opportunityRecord()` returns null and every surface correctly resolves to
Unknown — "I have no record of anything I have observed" — rather than to an
empty list.

## Verified against the live AEON X project (structure only, read-only)

Read from `fbqufjvkzbifklxtouol` with catalog queries. This does not verify
Opportunity X's own database — it verifies that these exact migrations, applied
to a real Supabase project, produce the intended structure.

| Table | RLS | Triggers | Policies | Check constraints |
|---|---|---|---|---|
| `opportunity_observations` | on | 2 | 1 | 10 |
| `opportunity_verification_events` | on | 2 | 1 | 5 |
| `opportunity_pursuits` | on | 2 | 3 | 2 |
| `opportunity_deliveries` | on | 2 | 1 | 3 |

Trigger coverage, which is the part that matters:

- `observations`, `verification_events`, `deliveries` — refuse `UPDATE`,
  `DELETE` and `TRUNCATE`.
- `pursuits` — refuse `UPDATE` and `TRUNCATE`, and **allow `DELETE`**, which is
  the designed asymmetry: changing your mind is a new declaration, withdrawing
  is the person's own right.

## What was already verified, and what that does and does not prove

All three were applied to a local PostgreSQL 16.13 with Supabase's `anon`,
`authenticated` and `service_role` roles and a minimal `auth.users` /
`auth.uid()` shimmed in — shimmed only as far as the migrations actually
reference them, so nothing in the shim could make a migration pass that would
fail on the real project.

Verified by execution, not by reading:

| Guarantee | Result |
|---|---|
| All three apply in filename order | clean, no errors |
| Four tables created, RLS enabled on each | yes |
| Observation `UPDATE` | refused by trigger |
| Observation `DELETE` | refused by trigger |
| `TRUNCATE`, including `CASCADE` | refused by trigger |
| Retrieval timestamped in the future | refused by check constraint |
| Retrieved row with no items and no reason | refused by check constraint |
| Unreachable row carrying content | refused by check constraint |
| Pursuit `UPDATE` (changing your mind in place) | refused |
| Pursuit `DELETE` (withdrawing) | allowed — it is the person's own fact |
| Person A reading person B's declarations | 0 rows visible |
| Person A writing a declaration owned by B | refused by RLS |
| Person A deleting B's declaration | 0 rows affected |

**What this proves:** the SQL is correct and the guarantees are real.

**What it does not prove:** that the schema exists on `anfiojmbgonrtympzjch`.
Nothing short of running it there establishes that, and this environment cannot
reach it.
