# Applying the Opportunity X migrations

> **Current state, verified 2026-08-21. Everything below the horizontal rule is
> superseded history, kept because it records how the access problem was
> diagnosed — but its premises are no longer true.**

## Migration state on `anfiojmbgonrtympzjch`

Read directly from `supabase_migrations.schema_migrations` and from
`information_schema`, not from this repository's filenames.

**Applied — verified present in the ledger:**

| Ledger version | Ledger name | Repository file |
|---|---|---|
| `20260815163249` | `opportunity_observations` | `20260810121500_opportunity_observations.sql` |
| `20260815163311` | `opportunity_verification_events` | `20260810122000_opportunity_verification_events.sql` |
| `20260815163332` | `opportunity_pursuit_and_delivery` | `20260810160000_opportunity_pursuit_and_delivery.sql` |
| `20260815163551` | `refusal_functions_are_not_endpoints` | `20260815170000_refusal_functions_are_not_endpoints.sql` |
| `20260821211057` | `observation_requested_url` | `20260818090000_observation_requested_url.sql` |

**Not applied:**

| Repository file | Status |
|---|---|
| `20260817190000_mark_legacy_tables_retired.sql` | **UNAPPLIED — deliberately.** Metadata-only (`COMMENT ON TABLE` and nothing else), non-destructive, idempotent. Held as a separate decision from the schema repair; see the Phase 21A entry in `DECISION_LOG.md`. |
| `20260610*`, `20260613*`, `20260614*`, `20260615*`, `20260618*`, `20260730_api_keys` | **UNAPPLIED, and not to be applied.** Lovable-era migrations for the legacy product. The tables they create already exist in this project by other means and are marked retired. |

### The version numbers do not match the filenames

The five applied migrations are stamped with the timestamp of *application*, not
the repository filename, because they were applied through the dashboard and the
MCP connector rather than by `supabase db push`. **The ledger therefore cannot
be matched to the repository by version.** It matches by name, and any claim
about whether a migration is applied must be checked against
`information_schema` — which is how the `requested_url` gap was found, since the
ledger alone would not have shown it.

## The `requested_url` repair, 2026-08-21

Applied as `20260821211057 observation_requested_url`. Verified immediately
after, in one query:

- `opportunity_observations.requested_url` exists, `text`, nullable
- partial index `opportunity_observations_requested_url` exists
- the column comment is present
- **both append-only triggers are still attached**
- the table still holds **0 rows** — nothing was written

Read path proved by issuing the exact 20-column `SELECT` that
`src/lib/opportunity/observation/supabase-store.ts` uses; it returns an empty
result instead of erroring. Write path proved with `EXPLAIN (verbose)` on the
full `INSERT`, which resolves and type-checks every column **without executing
it**. No observation was fabricated.

## Environment inspected

| | |
|---|---|
| Supabase project | `anfiojmbgonrtympzjch` — "opportunity-x-12b762aa", `eu-north-1`, `ACTIVE_HEALTHY` |
| Postgres | 17.6.1.147 |
| Inspected via | Supabase MCP connector (`list_migrations`, `execute_sql`, `apply_migration`) |
| Verified at | 2026-08-21 |

## Why the section below is wrong now

It states that the connected Supabase account cannot reach
`anfiojmbgonrtympzjch` and that every call returns a permission error. **That is
no longer the case** — the connector now reaches the project directly, which is
how the migration above was applied. The document was never corrected when
access changed, so it went on describing a blocker that had been resolved. It is
kept for the record and for the reasoning about not reusing the AEON X database,
which still stands.

---

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
