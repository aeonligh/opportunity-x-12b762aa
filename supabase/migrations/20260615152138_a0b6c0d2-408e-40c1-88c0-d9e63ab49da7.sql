
-- Security hardening: lock down SECURITY DEFINER fns + tighten analytics insert policy

-- Revoke public execute on SECURITY DEFINER functions (still usable inside RLS policies, triggers, and as service_role)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Ensure search_path is set on all SECURITY DEFINER / trigger fns (defensive — already set, re-applied for guarantee)
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- Tighten opportunity_analytics insert: scope to authenticated user inserting own row
DROP POLICY IF EXISTS analytics_insert_any ON public.opportunity_analytics;
CREATE POLICY analytics_insert_own ON public.opportunity_analytics
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
