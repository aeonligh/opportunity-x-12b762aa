#!/usr/bin/env bash
#
# Apply the three Opportunity X migrations to a throwaway local PostgreSQL and
# prove their guarantees by making the forbidden operations actually fail.
#
#   bash scripts/verify-migrations.sh
#
# ── Why this exists as a script ───────────────────────────────────────────
#
# These guarantees were first checked by hand in a shell, which proves them
# once, for whoever was watching. The migrations are the foundation every other
# layer rests on and they are still unapplied to the canonical project, so the
# check has to be repeatable by anyone, on demand, and has to fail loudly rather
# than be re-derived from a report.
#
# ── What it does and does not establish ───────────────────────────────────
#
# It establishes that the SQL is correct: that the tables, row-level security,
# triggers and check constraints do what they claim when run against a real
# PostgreSQL. It establishes nothing about any hosted project — in particular it
# is not evidence that the canonical Opportunity X database has these tables.
#
# Supabase's platform objects are shimmed only as far as the migrations actually
# reference them (`anon`, `authenticated`, `service_role`, `auth.users`,
# `auth.uid()`). Nothing in the shim can make a migration pass that would fail on
# a real project; a shim that added behaviour would turn this from a check into a
# rehearsal.

set -euo pipefail

PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PGDATA_DIR=${PGDATA_DIR:-/tmp/oxpg-verify}
PORT=${PORT:-55433}
DB=opportunity_x_verify

pass=0
fail=0

ok()   { printf '  \033[32mPASS\033[0m  %s\n' "$1"; pass=$((pass+1)); }
bad()  { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; fail=$((fail+1)); }

psql_q() { psql -h /tmp -p "$PORT" -U postgres -d "$DB" -tAq -c "$1" 2>&1; }

# Assert a statement is REFUSED. A guarantee that reports "UPDATE 0" instead of
# raising is not a guarantee — an empty table returns zero rows either way, so
# only an error distinguishes an enforced rule from a missing one.
refused() {
  local what="$1" sql="$2"
  local out
  if out=$(psql -h /tmp -p "$PORT" -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q -c "$sql" 2>&1); then
    bad "$what — was ALLOWED (${out:-no error})"
  else
    ok "$what — refused"
  fi
}

allowed() {
  local what="$1" sql="$2"
  if psql -h /tmp -p "$PORT" -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q -c "$sql" >/dev/null 2>&1; then
    ok "$what — allowed"
  else
    bad "$what — was REFUSED and should not be"
  fi
}

cleanup() {
  su postgres -c "$PGBIN/pg_ctl -D $PGDATA_DIR stop" >/dev/null 2>&1 || true
  rm -rf "$PGDATA_DIR"
}
trap cleanup EXIT

echo "── Starting a throwaway PostgreSQL"
rm -rf "$PGDATA_DIR"; mkdir -p "$PGDATA_DIR"; chown postgres:postgres "$PGDATA_DIR"
su postgres -c "$PGBIN/initdb -D $PGDATA_DIR -U postgres --auth=trust" >/dev/null
su postgres -c "$PGBIN/pg_ctl -D $PGDATA_DIR -o '-p $PORT -k /tmp' -l $PGDATA_DIR/log start" >/dev/null
sleep 2

psql -h /tmp -p "$PORT" -U postgres -q -c "create database $DB;" >/dev/null

echo "── Shimming only what the migrations reference"
psql -h /tmp -p "$PORT" -U postgres -d "$DB" -q <<'SQL' >/dev/null
create extension if not exists pgcrypto;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text unique);
create or replace function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
SQL

echo "── Applying the three migrations in filename order"
for m in supabase/migrations/20260810121500_opportunity_observations.sql \
         supabase/migrations/20260810122000_opportunity_verification_events.sql \
         supabase/migrations/20260810160000_opportunity_pursuit_and_delivery.sql; do
  if psql -h /tmp -p "$PORT" -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q -f "$m" >/dev/null 2>&1; then
    ok "$(basename "$m") applied"
  else
    bad "$(basename "$m") FAILED TO APPLY"
    psql -h /tmp -p "$PORT" -U postgres -d "$DB" -v ON_ERROR_STOP=1 -f "$m" 2>&1 | tail -5
    exit 1
  fi
done

echo
echo "── Structure"
for t in opportunity_observations opportunity_verification_events opportunity_pursuits opportunity_deliveries; do
  [ "$(psql_q "select count(*) from pg_class where relname='$t' and relnamespace='public'::regnamespace")" = "1" ] \
    && ok "$t exists" || bad "$t missing"
  [ "$(psql_q "select relrowsecurity from pg_class where relname='$t' and relnamespace='public'::regnamespace")" = "t" ] \
    && ok "$t has row-level security enabled" || bad "$t has RLS DISABLED"
done

echo
echo "── An observation can be appended"
allowed "insert a retrieved observation" "
insert into public.opportunity_observations
  (retrieved_at,url,source_id,source_label,source_class,parser_version,outcome,
   content_body,content_type,content_sha256,content_bytes,content_encoding,items,page_identity)
values (now(),'https://education.gov.ng/bea','ng-fmoe','Federal Ministry of Education','announcer',
   '1.0.0','retrieved','<html></html>','text/html',repeat('a',64),13,'utf-8',
   '[{\"claims\":[]}]'::jsonb,'[\"https://education.gov.ng/bea\"]'::jsonb);"

# A row-level BEFORE trigger only fires when there is a row to act on, so an
# UPDATE against an empty table reports "UPDATE 0" and proves nothing. Every
# table gets a real row before its guarantee is tested — the distinction this
# whole record exists to keep is precisely the one between "refused" and
# "matched nothing".
echo
echo "── Seeding one row in each remaining table, so the triggers have something to refuse"
psql -h /tmp -p "$PORT" -U postgres -d "$DB" -q <<'SQL' >/dev/null
insert into auth.users (id,email) values ('99999999-9999-4999-8999-999999999999','seed@example.com');

insert into public.opportunity_verification_events
  (entity_id, entity_key, entity_method, from_verdict, to_verdict, at, reason,
   expires_at, stakes, basis)
values ('bbbbbbbb-0000-4000-8000-000000000001',
        'https://education.gov.ng/bea', 'canonical-url', null, 'verified', now(),
        'Three institutional announcers agreed.', now() + interval '7 days',
        'life-changing',
        '{"distinctSources":3,"institutionalSources":3,"observationIds":[]}'::jsonb);

insert into public.opportunity_deliveries
  (person_id, entity_id, delivered_at, shown, logic_version, surface)
values ('99999999-9999-4999-8999-999999999999',
        'bbbbbbbb-0000-4000-8000-000000000001', now(),
        '{"statement":"A sentence, kept verbatim.",
          "verification":"Verified against 3 independent sources.",
          "timing":"Closes 30 September 2026.",
          "whySurfaced":"Verified, open, and nothing I know about you rules it out."}'::jsonb,
        '1.0.0', 'card');
SQL
[ "$(psql_q "select count(*) from public.opportunity_verification_events")" = "1" ] \
  && ok "a verification event exists to protect" || bad "could not seed a verification event"
[ "$(psql_q "select count(*) from public.opportunity_deliveries")" = "1" ] \
  && ok "a delivery exists to protect" || bad "could not seed a delivery"

echo
echo "── Append-only: observations, verification events, deliveries"
refused "observation UPDATE"          "update public.opportunity_observations set url='https://evil.example';"
refused "observation DELETE"          "delete from public.opportunity_observations;"
refused "observation TRUNCATE"        "truncate public.opportunity_observations cascade;"
refused "verification event UPDATE"   "update public.opportunity_verification_events set reason='rewritten';"
refused "verification event DELETE"   "delete from public.opportunity_verification_events;"
refused "verification event TRUNCATE" "truncate public.opportunity_verification_events;"
refused "delivery UPDATE"             "update public.opportunity_deliveries set logic_version='9.9.9';"
refused "delivery DELETE"             "delete from public.opportunity_deliveries;"
refused "delivery TRUNCATE"           "truncate public.opportunity_deliveries;"

echo
echo "── Check constraints"
refused "a delivery whose shown object omits a sentence" "
insert into public.opportunity_deliveries
  (person_id, entity_id, delivered_at, shown, logic_version, surface)
values ('99999999-9999-4999-8999-999999999999','bbbbbbbb-0000-4000-8000-000000000002', now(),
        '{\"statement\":\"Only one of the four.\"}'::jsonb, '1.0.0', 'card');"
refused "a delivery on a surface that does not exist" "
insert into public.opportunity_deliveries
  (person_id, entity_id, delivered_at, shown, logic_version, surface)
values ('99999999-9999-4999-8999-999999999999','bbbbbbbb-0000-4000-8000-000000000003', now(),
        '{\"statement\":\"s\",\"verification\":\"v\",\"timing\":\"t\",\"whySurfaced\":\"w\"}'::jsonb,
        '1.0.0', 'billboard');"
refused "a verification whose expiry precedes its establishment" "
insert into public.opportunity_verification_events
  (entity_id, entity_key, entity_method, to_verdict, at, reason, expires_at, stakes, basis)
values ('bbbbbbbb-0000-4000-8000-000000000004','k','canonical-url','verified', now(),
        'r', now() - interval '1 day', 'low',
        '{\"distinctSources\":1,\"institutionalSources\":1,\"observationIds\":[]}'::jsonb);"
refused "a retrieval dated in the future" "
insert into public.opportunity_observations
  (retrieved_at,url,source_id,source_label,source_class,parser_version,outcome,reason)
values (now()+interval '1 day','https://x.example','s','S','announcer','1.0.0','unreachable','timeout');"

refused "a retrieval that read nothing and says why not" "
insert into public.opportunity_observations
  (retrieved_at,url,source_id,source_label,source_class,parser_version,outcome,
   content_body,content_type,content_sha256,content_bytes,content_encoding,items,page_identity)
values (now(),'https://y.example','s','S','announcer','1.0.0','retrieved','<html></html>','text/html',
   repeat('b',64),13,'utf-8','[]'::jsonb,'[\"https://y.example\"]'::jsonb);"

refused "an unreachable row carrying content" "
insert into public.opportunity_observations
  (retrieved_at,url,source_id,source_label,source_class,parser_version,outcome,reason,content_body)
values (now(),'https://z.example','s','S','announcer','1.0.0','unreachable','timeout','<html></html>');"

refused "a malformed content digest" "
insert into public.opportunity_observations
  (retrieved_at,url,source_id,source_label,source_class,parser_version,outcome,
   content_body,content_type,content_sha256,content_bytes,content_encoding,items,page_identity)
values (now(),'https://w.example','s','S','announcer','1.0.0','retrieved','<html></html>','text/html',
   'not-a-sha',13,'utf-8','[{}]'::jsonb,'[\"https://w.example\"]'::jsonb);"

echo
echo "── Declarations: revisable by withdrawal, never by rewriting"
psql -h /tmp -p "$PORT" -U postgres -d "$DB" -q -c "
insert into auth.users (id,email) values
  ('11111111-1111-4111-8111-111111111111','a@example.com'),
  ('22222222-2222-4222-8222-222222222222','b@example.com');
insert into public.opportunity_pursuits (person_id,entity_id,state,declared_at) values
  ('11111111-1111-4111-8111-111111111111','aaaaaaaa-0000-4000-8000-000000000001','interested',now()),
  ('11111111-1111-4111-8111-111111111111','aaaaaaaa-0000-4000-8000-000000000009','not-interested',now()),
  ('22222222-2222-4222-8222-222222222222','aaaaaaaa-0000-4000-8000-000000000002','interested',now());" >/dev/null

refused "changing a declaration in place (UPDATE)" \
  "update public.opportunity_pursuits set state='not-interested';"
refused "TRUNCATE on declarations" "truncate public.opportunity_pursuits;"
allowed "withdrawing a declaration (DELETE)" \
  "delete from public.opportunity_pursuits where entity_id='aaaaaaaa-0000-4000-8000-000000000009';"

echo
echo "── Row-level security: one person cannot reach another's declarations"
# Inside a transaction, because SET LOCAL outside one silently does nothing —
# which made an earlier hand-run of this check measure the superuser instead.
visible=$(psql -h /tmp -p "$PORT" -U postgres -d "$DB" -tAq <<'SQL'
begin;
  select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111', true);
  set local role authenticated;
  select count(*) from public.opportunity_pursuits;
commit;
SQL
)
visible=$(echo "$visible" | tail -1)
[ "$visible" = "1" ] && ok "person A sees exactly their own 1 row (of 2 in the table)" \
                     || bad "person A saw $visible rows, expected 1"

leaked=$(psql -h /tmp -p "$PORT" -U postgres -d "$DB" -tAq <<'SQL'
begin;
  select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111', true);
  set local role authenticated;
  select count(*) from public.opportunity_pursuits
   where person_id='22222222-2222-4222-8222-222222222222';
commit;
SQL
)
leaked=$(echo "$leaked" | tail -1)
[ "$leaked" = "0" ] && ok "and none of them belong to person B" || bad "person B's rows leaked: $leaked"

wrote=$(psql -h /tmp -p "$PORT" -U postgres -d "$DB" -tAq <<'SQL' 2>&1 || true
begin;
  select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111', true);
  set local role authenticated;
  insert into public.opportunity_pursuits (person_id,entity_id,state,declared_at)
  values ('22222222-2222-4222-8222-222222222222','aaaaaaaa-0000-4000-8000-000000000003','interested',now());
commit;
SQL
)
echo "$wrote" | grep -q "row-level security" \
  && ok "person A cannot write a declaration owned by person B" \
  || bad "person A wrote a declaration owned by person B"

deleted=$(psql -h /tmp -p "$PORT" -U postgres -d "$DB" -tAq <<'SQL'
begin;
  select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111', true);
  set local role authenticated;
  with gone as (
    delete from public.opportunity_pursuits
     where person_id='22222222-2222-4222-8222-222222222222' returning 1)
  select count(*) from gone;
commit;
SQL
)
deleted=$(echo "$deleted" | tail -1)
[ "$deleted" = "0" ] && ok "person A cannot delete person B's declaration" \
                     || bad "person A deleted $deleted of person B's declarations"

echo
echo "══ $pass passed, $fail failed"
[ "$fail" -eq 0 ] || exit 1
