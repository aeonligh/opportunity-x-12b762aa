-- What the person said, and what they were told.
--
-- Two tables that belong together because they are the person-side half of
-- Layer 3, and both are unlike everything else in this engine in the same way:
-- they are facts about a person rather than facts about the world.
--
-- ── Why one of these can be deleted and nothing else can ───────────────────
--
-- `opportunity_observations` refuses DELETE at the grant and again in a
-- trigger, because a page said something on a date and nobody gets to unsay it.
--
-- A declaration is different. It is the person's statement about their own
-- intentions, and the Ownership Principle gives them the truth of their own
-- life. Someone who wants Opportunity X to forget they ever considered something is
-- entitled to that, and leaving a tombstone reading "declined" would keep the
-- record they asked to be rid of.
--
-- So `opportunity_pursuits` permits DELETE, scoped by RLS to the declaring
-- person and nobody else. That is the only DELETE anywhere in this engine and
-- the asymmetry is the point rather than an inconsistency.
--
-- UPDATE is still refused on both. Changing your mind is a new declaration —
-- appended, so "I was interested in March and not in June" stays legible to the
-- person it belongs to.
--
-- ── Why deliveries are kept at all ─────────────────────────────────────────
--
-- Judgments are recomputed. That means the reasoning shown to someone in March
-- cannot be reconstructed in June by asking the system what it thinks: the
-- corpus moved, verification lapsed and was re-established, an extractor was
-- fixed. Re-running the projection produces today's explanation and presents it
-- as the one that was given — the most flattering possible error, and
-- undetectable from outside.
--
-- The sentences are therefore stored, verbatim, alongside the logic version
-- rather than instead of it. Storing an id and re-deriving later is the same
-- failure in a smaller box: the version identifies which code ran, and does not
-- resurrect the corpus it ran against.
--
-- Not analytics. Never counted into a delivery rate, never read by ranking.

create type public.pursuit_state as enum ('interested', 'not-interested');

-- Deliberately no 'undeclared' member. Undeclared is the absence of a row, and
-- an enum member for it would make silence storable as a decision — the exact
-- confusion the three-state control on the surface exists to prevent.

create table public.opportunity_pursuits (
  id uuid primary key default gen_random_uuid(),

  person_id uuid not null references auth.users (id) on delete cascade,

  -- The entity's derived id. Deliberately not a foreign key: entities are
  -- derived from observations on read, so there is no entity table to reference
  -- — and adding one so this column could point at it would make Layer 2 a
  -- stored record, which it must not be.
  entity_id uuid not null,
  -- The identity the entity was resolved on, in the clear, where the caller
  -- knew it. Nullable rather than defaulted: the id is a digest of the identity
  -- and is sufficient on its own, so a placeholder here would be a value that
  -- looks like a key and is not one.
  entity_key text,

  state public.pursuit_state not null,

  -- When the person said it. Not when the row was written.
  declared_at timestamptz not null,

  -- Their own words, where they gave any. Never generated.
  note text,

  recorded_at timestamptz not null default now(),

  constraint declaration_is_not_in_the_future check (
    declared_at <= now() + interval '5 minutes'
  ),
  constraint note_is_not_empty check (note is null or length(btrim(note)) > 0)
);

comment on table public.opportunity_pursuits is
  'What a person said about an opportunity. Append-only between declarations; deletable by the person, which is the only DELETE in this engine.';

comment on column public.opportunity_pursuits.declared_at is
  'When the person said it. There is no viewed_at, click_count or dwell column, and none may be added: interest is declared, never observed.';

create index opportunity_pursuits_person
  on public.opportunity_pursuits (person_id, entity_id, declared_at desc);

create table public.opportunity_deliveries (
  id uuid primary key default gen_random_uuid(),

  person_id uuid not null references auth.users (id) on delete cascade,
  entity_id uuid not null,

  -- When it was put in front of them. Not when it was computed.
  delivered_at timestamptz not null,

  -- The sentences, verbatim. The object the component rendered, not a summary.
  shown jsonb not null,

  -- The logic that produced them, so a wrong explanation can be traced to the
  -- code that wrote it. Kept alongside the sentences, never instead of them.
  logic_version text not null,

  -- What the entity rested on at that moment.
  observation_ids uuid[] not null default '{}',

  surface text not null,

  recorded_at timestamptz not null default now(),

  constraint surface_is_known check (surface in ('card', 'inspection')),
  constraint shown_carries_its_sentences check (
    jsonb_typeof(shown) = 'object'
    and shown ? 'statement'
    and shown ? 'verification'
    and shown ? 'timing'
    and shown ? 'whySurfaced'
  ),
  constraint delivery_is_not_in_the_future check (
    delivered_at <= now() + interval '5 minutes'
  )
);

comment on table public.opportunity_deliveries is
  'What Opportunity X actually told someone, kept verbatim. Judgments are recomputed; a re-derived explanation is not the explanation that was given.';

create index opportunity_deliveries_person
  on public.opportunity_deliveries (person_id, entity_id, delivered_at desc);

-- ── Refuse revision, on both ───────────────────────────────────────────────

create or replace function public.refuse_person_record_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception
    'This record is append-only. Changing a position is a new declaration, and what was shown to someone cannot be rewritten afterwards.'
    using errcode = '42501';
end;
$$;

create trigger pursuits_are_never_revised
  before update on public.opportunity_pursuits
  for each row execute function public.refuse_person_record_revision();

create trigger deliveries_are_never_revised
  before update or delete on public.opportunity_deliveries
  for each row execute function public.refuse_person_record_revision();

create trigger pursuits_are_never_truncated
  before truncate on public.opportunity_pursuits
  for each statement execute function public.refuse_person_record_revision();

create trigger deliveries_are_never_truncated
  before truncate on public.opportunity_deliveries
  for each statement execute function public.refuse_person_record_revision();

-- ── Grants and RLS ─────────────────────────────────────────────────────────
--
-- Unlike observations, these ARE person-owned, so the policies are scoped to
-- the person rather than open to every signed-in account. An observation is a
-- fact about a public web page; a declaration is a fact about someone's
-- intentions, and nobody else has any business reading it.

alter table public.opportunity_pursuits enable row level security;
alter table public.opportunity_deliveries enable row level security;

revoke all on public.opportunity_pursuits from anon, authenticated;
revoke all on public.opportunity_deliveries from anon, authenticated;

-- The person writes their own declarations, reads them, and may remove them.
grant select, insert, delete on public.opportunity_pursuits to authenticated;

create policy "people read their own declarations"
  on public.opportunity_pursuits
  for select to authenticated
  using ((select auth.uid()) = person_id);

create policy "people declare for themselves"
  on public.opportunity_pursuits
  for insert to authenticated
  with check ((select auth.uid()) = person_id);

create policy "people may remove their own declarations"
  on public.opportunity_pursuits
  for delete to authenticated
  using ((select auth.uid()) = person_id);

-- Deliveries are written by the system and read by the person they were shown
-- to. They cannot delete them: this is the record of what they were told, and
-- it is what makes "you were told and it was wrong" adjudicable at all.
grant select on public.opportunity_deliveries to authenticated;

create policy "people read what they were told"
  on public.opportunity_deliveries
  for select to authenticated
  using ((select auth.uid()) = person_id);

revoke update, truncate on public.opportunity_pursuits from anon, authenticated, service_role;
revoke update, delete, truncate on public.opportunity_deliveries from anon, authenticated, service_role;
