
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS url_hash text,
  ADD COLUMN IF NOT EXISTS source_domain text,
  ADD COLUMN IF NOT EXISTS confidence_score numeric(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_method text,
  ADD COLUMN IF NOT EXISTS discovery_query text;

UPDATE public.opportunities
SET url_hash = md5(lower(coalesce(source_url, apply_url, title || organization)))
WHERE url_hash IS NULL;

-- Drop duplicate rows, keep earliest created
DELETE FROM public.opportunities a
USING public.opportunities b
WHERE a.url_hash = b.url_hash
  AND a.created_at > b.created_at;

-- Edge case: same created_at — keep lowest id
DELETE FROM public.opportunities a
USING public.opportunities b
WHERE a.url_hash = b.url_hash
  AND a.created_at = b.created_at
  AND a.id > b.id;

ALTER TABLE public.opportunities
  ALTER COLUMN url_hash SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS opportunities_url_hash_unique
  ON public.opportunities(url_hash);

CREATE INDEX IF NOT EXISTS opportunities_source_domain_idx
  ON public.opportunities(source_domain);
CREATE INDEX IF NOT EXISTS opportunities_last_verified_idx
  ON public.opportunities(last_verified_at);

CREATE TABLE IF NOT EXISTS public.discovery_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  query text,
  category text,
  source text NOT NULL DEFAULT 'user',
  candidates_found int DEFAULT 0,
  verified_count int DEFAULT 0,
  inserted_count int DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.discovery_runs TO authenticated;
GRANT ALL ON public.discovery_runs TO service_role;
ALTER TABLE public.discovery_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discovery_runs_select_own" ON public.discovery_runs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "discovery_runs_insert_own" ON public.discovery_runs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$ BEGIN
  PERFORM cron.unschedule('opportunity-x-daily-crawl');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'opportunity-x-daily-crawl',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--e297105a-a0e0-48de-9e7d-d7e7101e7e27.lovable.app/api/public/hooks/crawl-opportunities',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_5sR_3DAfIqPPPlEGkXEZWA_Q3S9g_DI"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
