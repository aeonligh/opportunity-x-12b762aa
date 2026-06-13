
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============ PROFILES EXTENSIONS ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS university text,
  ADD COLUMN IF NOT EXISTS course_of_study text,
  ADD COLUMN IF NOT EXISTS degree_type text,
  ADD COLUMN IF NOT EXISTS level_of_study text,
  ADD COLUMN IF NOT EXISTS graduation_year int,
  ADD COLUMN IF NOT EXISTS career_interests text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skill_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_categories text[] DEFAULT '{}';

-- ============ OPPORTUNITIES EXTENSIONS ============
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS verification_score numeric(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS match_score_default numeric(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_reasoning text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS opportunity_type text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS categories text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS views_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trending_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS module text DEFAULT 'opportunity_x';

-- Replace public read policy: only verified rows visible to public.
DROP POLICY IF EXISTS opportunities_public_read ON public.opportunities;
CREATE POLICY "opportunities_public_read_verified" ON public.opportunities
  FOR SELECT TO anon, authenticated
  USING (verified = true OR public.has_role(auth.uid(), 'admin'));

-- Admins can update/delete any
DROP POLICY IF EXISTS opportunities_update_own ON public.opportunities;
DROP POLICY IF EXISTS opportunities_delete_own ON public.opportunities;
CREATE POLICY "opportunities_admin_update" ON public.opportunities
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = discovered_by)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = discovered_by);
CREATE POLICY "opportunities_admin_delete" ON public.opportunities
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = discovered_by);

CREATE INDEX IF NOT EXISTS opportunities_verified_idx ON public.opportunities(verified);
CREATE INDEX IF NOT EXISTS opportunities_categories_idx ON public.opportunities USING GIN(categories);
CREATE INDEX IF NOT EXISTS opportunities_created_idx ON public.opportunities(created_at DESC);

-- ============ ANALYTICS ============
CREATE TABLE public.opportunity_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view','save','share','apply_click')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.opportunity_analytics TO authenticated;
GRANT INSERT ON public.opportunity_analytics TO anon;
GRANT ALL ON public.opportunity_analytics TO service_role;
ALTER TABLE public.opportunity_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_insert_any" ON public.opportunity_analytics
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "analytics_admin_read" ON public.opportunity_analytics
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS analytics_opp_idx ON public.opportunity_analytics(opportunity_id, event_type);

-- ============ MATCH SCORES ============
CREATE TABLE public.match_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  score numeric(3,2) NOT NULL DEFAULT 0,
  reasoning text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, opportunity_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_scores TO authenticated;
GRANT ALL ON public.match_scores TO service_role;
ALTER TABLE public.match_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_scores_own" ON public.match_scores
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS match_scores_user_idx ON public.match_scores(user_id, score DESC);
