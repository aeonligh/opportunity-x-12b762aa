import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import OpportunityCard, { type Opportunity } from "@/components/OpportunityCard";
import { Bookmark, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({
    meta: [{ title: "Saved vault — Opportunity X" }],
  }),
  component: Vault,
});

function Vault() {
  const { data: saved = [], isLoading } = useQuery({
    queryKey: ["vault"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];
      const { data, error } = await supabase
        .from("saved_opportunities")
        .select(
          "opportunity:opportunities(id, title, organization, category, location, deadline, description, ai_insight, apply_url, image_url)",
        )
        .eq("user_id", user.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .map((r) => r.opportunity as unknown as Opportunity)
        .filter(Boolean);
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-text-s hover:text-foreground">
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <span className="font-mono text-lg font-bold tracking-tighter">
          OPPORTUNITY <span className="text-accent">X</span>
        </span>
        <div className="w-24" />
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10 text-accent">
            <Bookmark size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Your vault</h1>
            <p className="text-xs text-text-s">Saved opportunities — share or apply anytime.</p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-text-s text-sm">Loading…</p>
        ) : saved.length === 0 ? (
          <p className="text-text-s text-sm">
            Your vault is empty. Save opportunities from the{" "}
            <Link to="/dashboard" className="text-accent underline">
              dashboard
            </Link>
            .
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {saved.map((o) => (
              <OpportunityCard key={o.id} opportunity={o} initiallySaved />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
