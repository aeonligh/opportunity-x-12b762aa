import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { discoverOpportunities } from "@/lib/opportunities.functions";
import OpportunityCard, { type Opportunity } from "@/components/OpportunityCard";
import {
  LayoutGrid,
  GraduationCap,
  Briefcase,
  FileBadge,
  Globe2,
  Bookmark,
  Search,
  Sparkles,
  LogOut,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";

const categories = [
  { id: "All", label: "All", icon: LayoutGrid },
  { id: "Scholarship", label: "Scholarships", icon: GraduationCap },
  { id: "Internship", label: "Internships", icon: Briefcase },
  { id: "Fellowship", label: "Fellowships", icon: Sparkles },
  { id: "Certification", label: "Certificates", icon: FileBadge },
  { id: "Webinar", label: "Webinars", icon: Globe2 },
] as const;

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Opportunity X" },
      { name: "description", content: "Your personalized opportunity feed." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<(typeof categories)[number]["id"]>("All");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const discoverFn = useServerFn(discoverOpportunities);

  const { data: opps = [], isLoading } = useQuery({
    queryKey: ["opportunities", category, search],
    queryFn: async () => {
      let q = supabase
        .from("opportunities")
        .select(
          "id, title, organization, category, location, deadline, description, ai_insight, apply_url, image_url",
        )
        .order("created_at", { ascending: false })
        .limit(40);
      if (category !== "All") q = q.eq("category", category);
      if (search) q = q.ilike("title", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Opportunity[];
    },
  });

  const discover = useMutation({
    mutationFn: () => discoverFn({ data: { query: search, category } }),
    onSuccess: () => {
      toast.success("New opportunities discovered");
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Discovery failed");
    },
  });

  // First-load: if no opportunities exist at all, kick off a discovery
  useEffect(() => {
    if (!isLoading && opps.length === 0 && !discover.isPending) {
      discover.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-6">
        <Link to="/" className="font-mono text-lg font-bold tracking-tighter">
          OPPORTUNITY <span className="text-accent">X</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-accent"
          >
            Discover
          </Link>
          <Link
            to="/vault"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-text-s hover:text-foreground"
          >
            Vault
          </Link>
          <Link
            to="/onboarding"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-text-s hover:text-foreground"
          >
            Profile
          </Link>
          <button
            onClick={signOut}
            title="Sign out"
            className="p-2 rounded-lg text-text-s hover:text-foreground transition"
          >
            <LogOut size={16} />
          </button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-2">Your opportunities</h1>
          <p className="text-sm text-text-s">
            AI-curated for you. Save what matters. Share to WhatsApp in one tap.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput);
          }}
          className="relative mb-6 max-w-2xl"
        >
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-s"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search opportunities..."
            className="w-full pl-10 pr-32 py-2.5 rounded-xl bg-surface border border-border focus:border-accent outline-none text-sm"
          />
          <button
            type="button"
            onClick={() => discover.mutate()}
            disabled={discover.isPending}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-[11px] font-bold hover:opacity-90 transition"
          >
            {discover.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            Discover
          </button>
        </form>

        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((c) => {
            const Icon = c.icon;
            const active = category === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                  active
                    ? "bg-accent/10 border-accent/40 text-accent"
                    : "bg-surface border-border text-text-s hover:text-foreground"
                }`}
              >
                <Icon size={12} /> {c.label}
              </button>
            );
          })}
        </div>

        {isLoading || (opps.length === 0 && discover.isPending) ? (
          <div className="text-center py-20 text-text-s">
            <Loader2 className="mx-auto mb-3 animate-spin" />
            <p className="text-sm">Discovering opportunities…</p>
          </div>
        ) : opps.length === 0 ? (
          <div className="text-center py-20 text-text-s">
            <p className="text-sm mb-3">No opportunities yet.</p>
            <button
              onClick={() => discover.mutate()}
              className="px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-semibold"
            >
              Discover for me
            </button>
          </div>
        ) : (
          <motion.div layout className="grid md:grid-cols-2 gap-4">
            {opps.map((o) => (
              <OpportunityCard key={o.id} opportunity={o} />
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
