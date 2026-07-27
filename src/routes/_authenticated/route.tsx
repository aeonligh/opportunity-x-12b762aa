import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BrandLoader } from "@/components/BrandLoader";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // Branded loader is the ONLY thing visible while the session is being
  // verified. No protected surface renders until beforeLoad resolves.
  pendingMs: 0,
  pendingComponent: () => <BrandLoader label="Verifying your session" />,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
