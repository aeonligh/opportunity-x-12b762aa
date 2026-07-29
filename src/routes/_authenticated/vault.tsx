import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import OpportunityCard, { type Opportunity } from "@/components/OpportunityCard";
import { Bookmark, ArrowLeft, Search } from "lucide-react";
import { OPPORTUNITY_CATEGORIES } from "@/lib/intelligence.functions";

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({ meta: [{ title: "Saved vault — Opportunity X" }] }),
  component: Vault,
});

function Vault() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");

  const { data: saved = [], isLoading } = useQuery({
    queryKey: ["vault"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];
      const { data, error } = await supabase
        .from("saved_opportunities")
        .select(
          "opportunity:opportunities(id, title, organization, category, categories, opportunity_type, location, deadline, description, ai_insight, apply_url, image_url, tags, verification_score, match_score_default)",
        )
        .eq("user_id", user.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => r.opportunity as unknown as Opportunity).filter(Boolean);
    },
  });

  const filtered = useMemo(() => {
    return saved.filter((o) => {
      if (search && !o.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (category !== "All") {
        const cats = o.categories?.length ? o.categories : [o.category];
        if (!cats.includes(category)) return false;
      }
      return true;
    });
  }, [saved, search, category]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/70 backdrop-blur-xl flex items-center justify-between px-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-text-s hover:text-foreground"
        >
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
            <p className="text-xs text-text-s">
              Saved opportunities — search, filter, share, or apply anytime.
            </p>
          </div>
        </div>

        <div className="relative mb-4 max-w-xl">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-s" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your saved opportunities…"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-surface/60 border border-border focus:border-accent outline-none text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {["All", ...OPPORTUNITY_CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                category === c
                  ? "bg-accent/10 border-accent/40 text-accent"
                  : "bg-surface border-border text-text-s hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-text-s text-sm">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-text-s text-sm">
            {saved.length === 0 ? (
              <>
                Your vault is empty. Save opportunities from the{" "}
                <Link to="/dashboard" className="text-accent underline">
                  dashboard
                </Link>
                .
              </>
            ) : (
              "No matches for your filters."
            )}
          </p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((o) => (
              <OpportunityCard key={o.id} opportunity={o} initiallySaved />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
