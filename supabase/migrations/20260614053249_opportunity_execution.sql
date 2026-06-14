-- ============ EXTEND PROFILES ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT true;

-- ============ APPLICATIONS ============
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('Interested', 'Preparing', 'Submitted', 'Interview', 'Accepted', 'Rejected')),
  submitted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  UNIQUE (user_id, opportunity_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applications_select_own" ON public.applications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "applications_insert_own" ON public.applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "applications_update_own" ON public.applications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "applications_delete_own" ON public.applications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Set updated_at trigger
CREATE TRIGGER applications_set_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER DOCUMENTS ============
CREATE TABLE public.user_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('CV', 'Resume', 'Transcript', 'Certificate', 'Passport', 'Recommendation Letter', 'Statement of Purpose', 'Motivation Letter')),
  file_url text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_documents TO authenticated;
GRANT ALL ON public.user_documents TO service_role;
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_documents_select_own" ON public.user_documents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_documents_insert_own" ON public.user_documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_documents_update_own" ON public.user_documents
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_documents_delete_own" ON public.user_documents
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ ELIGIBILITY RESULTS ============
CREATE TABLE public.eligibility_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  requirements_met text[] DEFAULT '{}',
  requirements_missing text[] DEFAULT '{}',
  checked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, opportunity_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.eligibility_results TO authenticated;
GRANT ALL ON public.eligibility_results TO service_role;
ALTER TABLE public.eligibility_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eligibility_results_select_own" ON public.eligibility_results
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "eligibility_results_insert_own" ON public.eligibility_results
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "eligibility_results_update_own" ON public.eligibility_results
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "eligibility_results_delete_own" ON public.eligibility_results
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ CV OPTIMIZATIONS ============
CREATE TABLE public.cv_optimizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  suggestions jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_optimizations TO authenticated;
GRANT ALL ON public.cv_optimizations TO service_role;
ALTER TABLE public.cv_optimizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cv_optimizations_select_own" ON public.cv_optimizations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "cv_optimizations_insert_own" ON public.cv_optimizations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cv_optimizations_update_own" ON public.cv_optimizations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cv_optimizations_delete_own" ON public.cv_optimizations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ GENERATED SOPS ============
CREATE TABLE public.generated_sops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('Scholarship Essay', 'Motivation Letter', 'Personal Statement', 'Study Plan')),
  content text NOT NULL,
  career_goals text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_sops TO authenticated;
GRANT ALL ON public.generated_sops TO service_role;
ALTER TABLE public.generated_sops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "generated_sops_select_own" ON public.generated_sops
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "generated_sops_insert_own" ON public.generated_sops
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "generated_sops_update_own" ON public.generated_sops
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "generated_sops_delete_own" ON public.generated_sops
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Set updated_at trigger
CREATE TRIGGER generated_sops_set_updated_at
  BEFORE UPDATE ON public.generated_sops
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_own" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ SENT DEADLINE REMINDERS ============
CREATE TABLE public.sent_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  days_before integer NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, opportunity_id, days_before)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sent_reminders TO authenticated;
GRANT ALL ON public.sent_reminders TO service_role;
ALTER TABLE public.sent_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sent_reminders_select_own" ON public.sent_reminders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "sent_reminders_insert_own" ON public.sent_reminders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sent_reminders_delete_own" ON public.sent_reminders
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ STORAGE BUCKET ============
-- Register private storage bucket for user documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Allow authenticated upload to documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = split_part(name, '/', 1));

CREATE POLICY "Allow authenticated read own documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = split_part(name, '/', 1));

CREATE POLICY "Allow authenticated delete own documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = split_part(name, '/', 1));
