-- The append-only observation record.
--
-- Layer 1 of the Opportunity engine, given a home in Postgres. Everything the
-- engine believes is derived from this table; nothing here is derived from
-- anything else. That is what makes it Class A — the record that must survive,
-- because every other layer is reconstructible from it and it is reconstructible
-- from nothing.
--
-- ── Why the append-only rule is enforced three times ───────────────────────
--
-- TypeScript protects this codebase. It does not protect the data from a future
-- service, a migration, a psql session, or the SQL editor in the dashboard. So
-- the rule is stated at three levels, each of which fails independently:
--
--   1. The port. `ObservationStore` has `append` and reads. There is no
--      `update` and no `delete` to call.
--   2. The grant. UPDATE, DELETE and TRUNCATE are revoked from every role the
--      application uses, including service_role. A denied write fails loudly
--      rather than silently affecting zero rows — the same reasoning
--      `deny_opportunity_writes_at_the_grant` records for the earlier product.
--   3. The trigger. Even a role that reacquires the grant is refused, with a
--      message that says why. A grant can be handed back by accident; a trigger
--      has to be dropped on purpose.
--
-- ── Why the content body is stored, and not only its digest ────────────────
--
-- A hash proves that something changed. It cannot reconstruct what was claimed.
-- Programme pages are routinely rewritten in place, so a system holding only a
-- digest can tell you a deadline moved and never tell you what it moved from.
-- The digest is stored as well, because change detection should not require a
-- byte comparison — but it is never the sole record of anything.
--
-- Evidence is held, not borrowed. Nothing in reconstruction may depend on
-- re-fetching a source: three of the four source topologies are unrecoverable
-- once the page turns over, and depending on a third party's retention would
-- reintroduce, at the level of auditability, exactly the dependency this product
-- exists to remove.

create type public.observation_source_class as enum (
  'official',
  'announcer',
  'aggregator',
  'unknown-domain'
);

create type public.observation_outcome as enum (
  'retrieved',
  'unreachable'
);

create table public.opportunity_observations (
  id uuid primary key default gen_random_uuid(),

  -- When Opportunity X looked. NOT a date read off the page: a deadline written in the
  -- content is a claim like any other and lives in `claims`. Conflating the two
  -- is how a system starts believing a page was checked because it mentions a
  -- date.
  retrieved_at timestamptz not null,

  url text not null,
  source_id text not null,
  source_label text not null,
  source_class public.observation_source_class not null,

  -- Which extraction logic produced `claims`. Without it, a parser later found
  -- to be wrong cannot be identified and every judgment resting on it becomes
  -- unauditable.
  parser_version text not null,

  -- Prior observations this one continues from — the previous retrieval of the
  -- same URL, the announcement that linked here. Known to the crawl at the
  -- moment it runs and unrecoverable afterwards.
  related_to uuid[] not null default '{}',

  outcome public.observation_outcome not null,

  -- Present only when `outcome = 'retrieved'`.
  content_body text,
  content_type text,
  content_sha256 text,
  content_bytes integer,
  -- utf-8 for text; base64 for binary media nothing can read yet. A ministry
  -- circular is routinely a PDF, and decoding one as UTF-8 stores mojibake that
  -- can never be read back. A hold that loses the evidence is not a hold.
  content_encoding text,

  -- One entry per opportunity the document described. A page routinely
  -- describes several — a listing, a news post with two calls, a programme page
  -- covering successive cycles — and a shape with one set of claims per page
  -- has to choose one of them. The ones it does not choose are not merged
  -- wrongly; they are destroyed.
  items jsonb,
  -- Identity the page declared about itself: canonical URL, og:url, and always
  -- the page URL last. This is what lets three announcements of one scholarship
  -- resolve to one entity instead of three.
  page_identity jsonb,
  -- Required exactly when `items` is empty. "We could not read this" and "we
  -- read it and it described nothing" are different facts about coverage, and a
  -- record that writes both as an empty list can never tell which it has.
  unreadable jsonb,

  -- Present only when `outcome = 'unreachable'`. A source that stops answering
  -- is a fact about the world — very often the earliest available signal that an
  -- opportunity closed — so a failed fetch is recorded, not swallowed.
  status integer,
  reason text,

  -- When the row was written, as distinct from when the retrieval happened. A
  -- backfill and a live crawl are different events and the difference has to
  -- stay visible.
  recorded_at timestamptz not null default now(),

  -- The union from `observation/types.ts`, restated where the data lives. A
  -- failed retrieval has nowhere to put content or claims, so a failure cannot
  -- be dressed up as a thin success.
  constraint retrieved_carries_its_content check (
    outcome <> 'retrieved' or (
      content_body is not null
      and content_type is not null
      and content_sha256 is not null
      and content_bytes is not null
      and content_encoding is not null
      and items is not null
      and page_identity is not null
      and status is null
      and reason is null
    )
  ),

  -- The coverage distinction, enforced rather than trusted. An empty item list
  -- with no reason is a page whose emptiness nobody can account for.
  constraint empty_items_say_why check (
    outcome <> 'retrieved'
    or jsonb_array_length(items) > 0
    or (unreadable is not null and unreadable ? 'reason' and unreadable ? 'mediaType')
  ),
  constraint unreachable_carries_its_reason check (
    outcome <> 'unreachable' or (
      reason is not null
      and content_body is null
      and content_type is null
      and content_sha256 is null
      and content_bytes is null
      and content_encoding is null
      and items is null
      and page_identity is null
      and unreadable is null
    )
  ),

  constraint sha256_is_a_sha256 check (
    content_sha256 is null or content_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint parser_version_is_comparable check (
    parser_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  ),
  constraint items_are_a_list check (
    items is null or jsonb_typeof(items) = 'array'
  ),
  constraint page_identity_is_a_list check (
    page_identity is null or jsonb_typeof(page_identity) = 'array'
  ),
  constraint encoding_is_known check (
    content_encoding is null or content_encoding in ('utf-8', 'base64')
  ),

  -- A retrieval cannot have happened in the future. The five-minute allowance is
  -- for clock skew between a crawler host and the database, not for scheduling.
  -- This is the last line against a job stamping a check it did not perform.
  constraint retrieval_is_not_in_the_future check (
    retrieved_at <= now() + interval '5 minutes'
  ),
  constraint recorded_after_retrieved check (
    recorded_at >= retrieved_at - interval '5 minutes'
  )
);

comment on table public.opportunity_observations is
  'Layer 1 of the Opportunity engine. Append-only, immutable, undeletable. Every other layer is derived from this one.';

comment on column public.opportunity_observations.retrieved_at is
  'When Opportunity X retrieved the source. Never a date stated inside the content.';

comment on column public.opportunity_observations.content_body is
  'The bytes as received, decoded for text and base64 for everything else. Retained because a hash proves change but cannot reconstruct what was claimed.';

comment on column public.opportunity_observations.items is
  'One entry per opportunity the document described. Never one set of fields per page: a listing page describes several, and a per-page shape destroys all but one.';

-- Reads: by URL (grouping observations into an entity), by recency (the
-- retrieval watermark), and by entity relationship.
create index opportunity_observations_url_retrieved_at
  on public.opportunity_observations (url, retrieved_at);
create index opportunity_observations_retrieved_at
  on public.opportunity_observations (retrieved_at desc);
create index opportunity_observations_source
  on public.opportunity_observations (source_id, retrieved_at desc);

-- ── Level 3: refuse the mutation itself ────────────────────────────────────

create or replace function public.refuse_observation_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception
    'public.opportunity_observations is append-only: a re-encounter is a new observation, and nothing is ever revised or removed.'
    using errcode = '42501';
end;
$$;

comment on function public.refuse_observation_mutation() is
  'Third of three enforcements of the append-only rule. The port has no mutator, the grant is revoked, and this refuses anyway.';

create trigger observations_are_never_revised
  before update or delete on public.opportunity_observations
  for each row execute function public.refuse_observation_mutation();

create trigger observations_are_never_truncated
  before truncate on public.opportunity_observations
  for each statement execute function public.refuse_observation_mutation();

-- ── Level 2: the grant ─────────────────────────────────────────────────────

alter table public.opportunity_observations enable row level security;

revoke all on public.opportunity_observations from anon, authenticated;

-- Observations are facts about public web pages, not facts about people. There
-- is no owner column and no per-person scoping, deliberately: the inspection
-- path a person follows from a recommendation — Finding, Evidence, Source,
-- Observation — dead-ends unless the observation behind a claim is reachable.
grant select on public.opportunity_observations to authenticated;

create policy "signed-in people can read what was observed"
  on public.opportunity_observations
  for select
  to authenticated
  using (true);

-- Writes belong to the crawler, which runs with the service role. Stating it at
-- the grant means a denied write fails loudly instead of matching zero rows.
revoke insert, update, delete, truncate, references, trigger
  on public.opportunity_observations from anon, authenticated;
revoke update, delete, truncate on public.opportunity_observations from service_role;
