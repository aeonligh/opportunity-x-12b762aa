-- ============================================================================
-- api_keys — user-scoped API credentials for the Opportunity X public API
-- ============================================================================
--
-- ⚠️  NOT YET APPLIED, AND NOT YET CONSUMED BY ANY CODE.
--
-- At the time this migration was authored there was no API Keys feature in the
-- codebase: zero references to `api_keys` in src/, and no UI or server function
-- that issues, lists, or validates a key. It was requested as infrastructure
-- ahead of the feature.
--
-- Assumptions baked into this schema (change them before applying if wrong):
--   1. Keys are issued to and owned by end users, for authenticating their own
--      calls to *our* API. This is NOT storage for third-party provider keys
--      (Anthropic/Firecrawl/Resend) — those are server env vars and must never
--      live in a user-readable table.
--   2. Plaintext keys are shown once at creation and never persisted. Only a
--      SHA-256 hash is stored, so a database disclosure does not yield usable
--      credentials.
--   3. Server-side verification looks a key up by hash using the service role,
--      which bypasses RLS. The policies below therefore only govern a user
--      managing their own keys from the browser.
--
-- If the API Keys feature is not going ahead, delete this file rather than
-- leaving an unused table in the schema.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Human-readable name the user assigns ("CI pipeline", "my script").
  label text NOT NULL CHECK (char_length(trim(label)) BETWEEN 1 AND 100),

  -- SHA-256 hex digest of the plaintext key. Never store the key itself.
  key_hash text NOT NULL CHECK (key_hash ~ '^[a-f0-9]{64}$'),

  -- Short non-secret leading fragment (e.g. "oppx_live_a1b2c3") so the user can
  -- tell keys apart in a list without the secret being recoverable.
  key_prefix text NOT NULL CHECK (char_length(key_prefix) BETWEEN 4 AND 32),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz
);

-- One key per hash, globally. Partial-unique is wrong here: a collision must
-- fail even against a revoked row.
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_key_hash_uniq
  ON public.api_keys (key_hash);

-- Dashboard listing: a user's active keys, newest first.
CREATE INDEX IF NOT EXISTS api_keys_user_id_created_at_idx
  ON public.api_keys (user_id, created_at DESC);

COMMENT ON TABLE public.api_keys IS
  'User-owned API credentials for the Opportunity X public API. Stores only a SHA-256 hash of each key; plaintext is shown once at creation and never persisted.';

-- ── Row Level Security ──────────────────────────────────────────────────────
-- Owner-only, matching the applications/user_documents pattern. `anon` is
-- granted nothing: an unauthenticated caller must never enumerate keys.

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_keys_select_own ON public.api_keys;
CREATE POLICY api_keys_select_own ON public.api_keys
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS api_keys_insert_own ON public.api_keys;
CREATE POLICY api_keys_insert_own ON public.api_keys
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Update is intentionally narrow: a user may rename or revoke a key, but
-- rotating the secret means issuing a new row, not mutating key_hash in place.
DROP POLICY IF EXISTS api_keys_update_own ON public.api_keys;
CREATE POLICY api_keys_update_own ON public.api_keys
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS api_keys_delete_own ON public.api_keys;
CREATE POLICY api_keys_delete_own ON public.api_keys
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Block client-side tampering with the secret material and the ownership row.
-- The service role bypasses column grants, so server verification is unaffected.
REVOKE UPDATE (key_hash, key_prefix, user_id, created_at, last_used_at)
  ON public.api_keys FROM authenticated;

-- ── updated_at maintenance ──────────────────────────────────────────────────
-- Reuses the existing public.set_updated_at() trigger function.

DROP TRIGGER IF EXISTS api_keys_set_updated_at ON public.api_keys;
CREATE TRIGGER api_keys_set_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
