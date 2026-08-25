import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function createSupabaseClient() {
  // Use import.meta.env for client-side (Vite build-time replacement)
  // Fall back to process.env for SSR (server-side rendering)
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Set them in your environment.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      /*
        ══════════════════════════════════════════════════════════════════════
        PKCE, BECAUSE THE DEFAULT PUTS TOKENS IN THE URL
        ══════════════════════════════════════════════════════════════════════

        `@supabase/auth-js` defaults to `flowType: "implicit"`, and nothing here
        overrode it. Measured rather than read: the authorize URL this client
        produced for Google carried **no `code_challenge`**, which is what an
        implicit request looks like.

        Under implicit flow the provider hands back the access *and refresh*
        tokens in the URL fragment — `#access_token=…&refresh_token=…`. A
        fragment is not sent to servers, which is the usual reassurance, but it
        is still written into browser history, visible to every extension with
        host access, present in any screenshot or screen share of the moment
        after sign-in, and readable by anything that can call
        `location.hash`. A refresh token in that position is a long-lived
        credential in a place nobody treats as sensitive.

        PKCE returns a single-use `?code=` instead, exchanged for tokens by this
        client using a verifier it generated and kept locally. The code in the
        URL is worthless without that verifier. This is what the OAuth 2.0
        Security Best Current Practice requires, and it is one option here
        rather than a change of architecture: the same provider, the same
        redirect target, the same `detectSessionInUrl` handling on return.

        Not verifiable end to end from this repository — completing a real
        Google round trip needs network and credentials neither of which exist
        here. What *is* verified is that this client now issues a PKCE
        authorization request; see `test/auth-security.test.ts`.
      */
      flowType: "pkce",
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
