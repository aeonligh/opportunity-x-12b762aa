-- ══════════════════════════════════════════════════════════════════════════
-- Phase 16A — record how discovery reached a page, not only where it landed.
-- ══════════════════════════════════════════════════════════════════════════
--
-- `opportunity_observations.url` holds the address that actually served the
-- bytes, after redirects. That is deliberate and stays: recording the requested
-- URL there instead would attribute content to a page that did not serve it.
--
-- What was missing is the other half. When discovery asks for `/bea` and is
-- redirected to `/bea-2026-FINAL`, the record kept the destination and nothing
-- at all about the request — so the edge between them was destroyed at the one
-- moment it existed.
--
-- R-01 observed exactly this in the wild: one Federal Scholarship Board advert
-- served at three addresses on the official domain, with `-FINAL` and
-- `-corrected` revisions and *"nothing linking them to what they supersede."*
-- A request → destination edge is precisely the evidence R-11's entity
-- resolution needs, and CR-35 makes entity resolution first-class.
--
-- It also makes an otherwise baffling record legible. A page reached both
-- directly and through a redirect produces two observations with the same `url`,
-- the same content and the same sweep. Without `requested_url` there is no way
-- to tell why there are two; with it, the second says plainly how it was reached.
--
-- ── Why nullable, and why no backfill ─────────────────────────────────────
--
-- Null means "no redirect occurred", which is the common case. Storing
-- `requested_url = url` on every row would be noise, and would force every
-- reader to compare two columns to learn that nothing happened.
--
-- No backfill is possible or attempted: **the table is empty.** Production holds
-- zero observations, which is exactly why this is the cheap moment to make the
-- correction. Inventing a `requested_url` for a historical row would be
-- fabricating provenance, and CR-37 forbids rewriting an observation in any case.
--
-- ── Why this does not disturb the append-only guarantee ───────────────────
--
-- `ADD COLUMN` is DDL, not DML. It writes no row, rewrites no row, and deletes
-- no row; the `before update or delete` triggers are untouched and still refuse
-- every mutation. `npm run verify:migrations` is re-run after this and must
-- still report its full set of refusals passing.

alter table public.opportunity_observations
  add column if not exists requested_url text;

comment on column public.opportunity_observations.requested_url is
  'The URL discovery asked for, when a redirect meant a different URL answered. Null when none did. Provenance about how the system arrived — never a claim that this address published the content. The url column remains the source of the bytes.';

-- Finding the observations that arrived by redirect, which is the question this
-- column exists to answer. Partial, because the overwhelming majority of rows
-- will be null and indexing those would cost storage to answer nothing.
create index if not exists opportunity_observations_requested_url
  on public.opportunity_observations (requested_url)
  where requested_url is not null;
