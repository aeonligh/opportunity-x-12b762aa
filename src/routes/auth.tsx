import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { BrandLoader } from "@/components/BrandLoader";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Opportunity X" },
      { name: "description", content: "Sign in to Opportunity X to discover and share opportunities." },
    ],
  }),
  component: AuthPage,
});

/**
 * Wait until the browser client has actually persisted a session before
 * navigating to a protected route. Prevents the classic race where
 * onAuthStateChange fires SIGNED_IN but the _authenticated gate's
 * getUser() call runs before the session is readable.
 */
async function waitForSession(timeoutMs = 8000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      // Re-validate with auth server to be certain.
      const { data: userData, error } = await supabase.auth.getUser();
      if (!error && userData.user) return true;
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  return false;
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // True while an OAuth handshake is in-flight and we've confirmed a session
  // but are about to navigate. Renders the full-screen BrandLoader so no
  // stale content flashes and no protected surface is exposed.
  const [handingOff, setHandingOff] = useState(false);
  const initialCheckDone = useRef(false);

  useEffect(() => {
    let cancelled = false;

    // Initial check — if the visitor is already signed in, hand off.
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled && data.user) {
        setHandingOff(true);
        await navigate({ to: "/dashboard" });
      }
      initialCheckDone.current = true;
    })();

    // Listen for identity transitions triggered elsewhere (popup OAuth).
    // Filter to SIGNED_IN and ignore INITIAL_SESSION / TOKEN_REFRESHED.
    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      if (event !== "SIGNED_IN") return;
      if (!initialCheckDone.current) return;
      // Confirm the session is really readable before we navigate.
      const ok = await waitForSession(4000);
      if (cancelled || !ok) return;
      setHandingOff(true);
      await navigate({ to: "/dashboard" });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. Welcome!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      // Wait for a real session, then hand off. The onAuthStateChange
      // listener above will also fire — waitForSession is idempotent.
      const ok = await waitForSession(6000);
      if (!ok) throw new Error("Session did not become available");
      setHandingOff(true);
      await navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in failed");
        setLoading(false);
        return;
      }
      // Full-page redirect: browser is leaving; keep the loader up.
      if (result.redirected) {
        setHandingOff(true);
        return;
      }
      // Popup path: session should now be set. Confirm, then hand off.
      const ok = await waitForSession(8000);
      if (!ok) {
        toast.error("Sign-in did not complete. Please try again.");
        setLoading(false);
        return;
      }
      setHandingOff(true);
      await navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading(false);
    }
  };

  if (handingOff) {
    return <BrandLoader label="Signing you in" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <Link to="/" className="font-mono text-lg font-bold tracking-tighter block text-center mb-8">
          OPPORTUNITY <span className="text-accent">X</span>
        </Link>
        <div className="bg-surface border border-border rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-1">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-text-s mb-6">
            {mode === "signin"
              ? "Sign in to your opportunities feed."
              : "Start discovering opportunities in seconds."}
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full mb-4 py-2.5 rounded-xl border border-border bg-background hover:bg-surface transition flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] font-mono text-text-s uppercase">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border focus:border-accent outline-none text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="block mx-auto mt-4 text-xs text-text-s hover:text-foreground transition"
          >
            {mode === "signin"
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
