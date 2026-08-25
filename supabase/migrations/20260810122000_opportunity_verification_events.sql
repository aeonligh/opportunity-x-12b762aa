-- The verification transition log.
--
-- ── Why this is an event log and not a state table ─────────────────────────
--
-- A table holding the *current* verification state can claim decay works and
-- never be contradicted, because there is nothing to check it against. The
-- decisive question — has any opportunity ever gone verified to not-verified? —
-- is answerable only from a history.
--
-- So verification is stored as the transitions themselves, append-only, and the
-- current state is folded from them on read. Two consequences follow, both
-- wanted:
--
--   * There is no UPDATE path, so the same three-level append-only enforcement
--     the observations table uses applies here unchanged.
--   * "Verified" is never a stored fact that outlives its own expiry. The fold
--     applies the clock, so a stale row cannot present itself as fresh merely
--     because no job ran to demote it.
--
-- ── Why re-affirmation is recorded, not skipped ────────────────────────────
--
-- An event whose `from_verdict` equals its `to_verdict` is not a no-op: it is
-- the record that verification was re-established, and it is what moves
-- `expires_at` forward. Skipping it to save rows would mean freshness had no
-- evidence behind it, which is the thing this table exists to prevent.
--
-- ── Why the entity id is deterministic ─────────────────────────────────────
--
-- Entities are derived from observations rather than stored: Layer 2 must be
-- reconstructible from Layer 1 and may never be the sole record of anything. A
-- derivation that minted a random id each time would have nothing stable to key
-- these events against, so an entity's id is a digest of the identity it was
-- resolved on — the method plus its key. `entity_key` is stored alongside so the
-- id can be checked rather than trusted.

create type public.verification_verdict as enum (
  'unverified',
  'verified',
  'contradicted',
  'withdrawn'
);

-- Deliberately no 'expired' member. Expiry is a function of the clock, and a
-- stored `expired` would be correct only until the next tick. It is applied on
-- every read instead, which cannot be missed.

create table public.opportunity_verification_events (
  id uuid primary key default gen_random_uuid(),

  -- Digest of `method:key`. Stable across derivations of the same entity.
  entity_id uuid not null,
  -- The identity the entity was resolved on, in the clear, so `entity_id` is
  -- verifiable rather than opaque.
  entity_key text not null,
  -- How that identity was decided. An operator decision must never be
  -- indistinguishable from a rule that fired.
  entity_method text not null,

  from_verdict public.verification_verdict,
  to_verdict public.verification_verdict not null,

  -- When the verification was established. Distinct from `recorded_at`.
  at timestamptz not null,

  -- Why, in a sentence a person could disagree with. Never a code.
  reason text not null,

  -- Derived from the entity's own stakes at establishment. Never read from a
  -- source: no source expresses its own trustworthiness, and a page that did
  -- would be the last one to believe.
  expires_at timestamptz not null,

  -- How much is at stake in the opportunity itself, which is what sets the
  -- corroboration depth and the freshness window. A property of the
  -- opportunity, never of a person — the person-side scaling is risk, and it
  -- lives in the judgment layer.
  stakes text not null,

  -- What corroborated it: distinct sources, how many were institutional, the
  -- classes seen, and the observations it rests on. Kept whole so the verdict
  -- can be inspected rather than merely counted.
  basis jsonb not null,

  -- The observation that caused the transition, where one did.
  observation_id uuid references public.opportunity_observations (id),

  recorded_at timestamptz not null default now(),

  constraint stakes_is_known check (stakes in ('low', 'material', 'life-changing')),
  constraint basis_is_an_object check (jsonb_typeof(basis) = 'object'),
  constraint basis_names_its_sources check (
    basis ? 'distinctSources'
    and basis ? 'institutionalSources'
    and basis ? 'observationIds'
  ),
  constraint expiry_follows_establishment check (expires_at > at),
  constraint establishment_is_not_in_the_future check (
    at <= now() + interval '5 minutes'
  )
);

comment on table public.opportunity_verification_events is
  'Append-only verification transitions. Current state is folded from these on read, with the clock applied, so an expired verification can never present as fresh.';

comment on column public.opportunity_verification_events.expires_at is
  'Derived from the entity''s stakes at establishment. Never supplied by a caller and never read from a source.';

create index opportunity_verification_events_entity
  on public.opportunity_verification_events (entity_id, at desc);
create index opportunity_verification_events_at
  on public.opportunity_verification_events (at desc);

create trigger verification_events_are_never_revised
  before update or delete on public.opportunity_verification_events
  for each row execute function public.refuse_observation_mutation();

create trigger verification_events_are_never_truncated
  before truncate on public.opportunity_verification_events
  for each statement execute function public.refuse_observation_mutation();

alter table public.opportunity_verification_events enable row level security;

revoke all on public.opportunity_verification_events from anon, authenticated;

-- Verification is a property of the entity, so it is byte-identical for every
-- person and there is nothing person-scoped to protect. Readable by anyone
-- signed in, for the same reason observations are: the inspection path has to
-- reach it.
grant select on public.opportunity_verification_events to authenticated;

create policy "signed-in people can read how something was verified"
  on public.opportunity_verification_events
  for select
  to authenticated
  using (true);

revoke insert, update, delete, truncate, references, trigger
  on public.opportunity_verification_events from anon, authenticated;
revoke update, delete, truncate
  on public.opportunity_verification_events from service_role;
