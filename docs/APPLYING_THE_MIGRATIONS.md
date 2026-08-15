# Applying the three Opportunity X migrations

Status: **AUTHORED / UNAPPLIED** on project `anfiojmbgonrtympzjch`.

They have been applied and exercised against a real PostgreSQL 16.13 instance —
see "What was already verified" below — so what follows is a procedure for
getting them onto your project, not a debugging exercise.

## Why this is a manual procedure

Two independent paths are blocked from the environment this was written in:

- **The Supabase MCP connector is not enabled for this session.** It is
  connected at the organisation level and authenticated, but `enabledInChat` is
  false, so its tools are not loaded and no migration can be applied through it.
  You can turn it on in this chat's connector settings; that would remove the
  need for the manual steps entirely.
- **Outbound HTTPS to `anfiojmbgonrtympzjch.supabase.co` and `api.supabase.com`
  is refused by egress policy** (`403` to `CONNECT`). That is an organisation
  network rule, not a credential problem, and it cannot be worked around from
  inside the session.

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
