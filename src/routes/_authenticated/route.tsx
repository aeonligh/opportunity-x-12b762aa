import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BrandLoader } from "@/components/BrandLoader";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // Branded loader is the ONLY thing visible while the session is being
  // verified. No protected surface renders until beforeLoad resolves.
  pendingMs: 0,
  pendingComponent: () => <BrandLoader label="Verifying your session" />,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      /*
        Carry where they were going.

        Without this, someone following a shared link to an opportunity signs in
        and lands on the workspace instead of the thing they were sent to — the
        destination is simply dropped. `location.href` is the path plus its
        query, because a depth link without its query points somewhere shallower
        than it did.

        Only the path is carried, never an absolute URL: `/auth` re-checks it
        against its own allowlist before honouring it, and an open redirect on a
        sign-in page is how one account becomes somebody else's.
      */
      throw redirect({ to: "/auth", search: { next: location.href } });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
