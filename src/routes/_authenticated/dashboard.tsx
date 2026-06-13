import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  discoverOpportunities,
  recommendedForUser,
  trendingOpportunities,
  newThisWeek,
  endingSoon,
  listByCategory,
  searchOpportunities,
} from "@/lib/intelligence.functions";
import { isAdmin } from "@/lib/admin.functions";
import OpportunityCard, { type Opportunity } from "@/components/OpportunityCard";
import OpportunitySection from "@/components/OpportunitySection";
import {
  Sparkles,
  TrendingUp,
  Clock,
  Flame,
  GraduationCap,
  Briefcase,
  FileBadge,
  Search,
  LogOut,
  Loader2,
  RefreshCw,
  Bookmark,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Opportunity X" },
      { name: "description", content: "Your personalized opportunity feed, powered by AEON X." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const discoverFn = useServerFn(discoverOpportunities);
  const recommendedFn = useServerFn(recommendedForUser);
  const trendingFn = useServerFn(trendingOpportunities);
  const newWeekFn = useServerFn(newThisWeek);
  const endingFn = useServerFn(endingSoon);
  const categoryFn = useServerFn(listByCategory);
  const searchFn = useServerFn(searchOpportunities);
  const adminFn = useServerFn(isAdmin);

  const { data: admin } = useQuery({ queryKey: ["isAdmin"], queryFn: () => adminFn() });

  const sections = [
    {
      key: "recommended",
      title: "Recommended For You",
      icon: <Sparkles size={16} className="text-accent" />,
      subtitle: "Hand-picked by AEON X intelligence",
      fn: () => recommendedFn(),
    },
    {
      key: "trending",
      title: "Trending Opportunities",
      icon: <Flame size={16} className="text-accent" />,
      subtitle: "Most viewed this week",
      fn: () => trendingFn(),
    },
    {
      key: "new",
      title: "New This Week",
      icon: <TrendingUp size={16} className="text-accent" />,
      fn: () => newWeekFn(),
    },
    {
      key: "ending",
      title: "Ending Soon",
      icon: <Clock size={16} className="text-accent" />,
      subtitle: "Closing within the next 30 days",
      fn: () => endingFn(),
    },
    {
      key: "scholarships",
      title: "Scholarships",
      icon: <GraduationCap size={16} className="text-accent" />,
      fn: () => categoryFn({ data: { category: "Scholarships" } }),
    },
    {
      key: "internships",
      title: "Internships",
      icon: <Briefcase size={16} className="text-accent" />,
      fn: () => categoryFn({ data: { category: "Internships" } }),
    },
    {
      key: "certifications",
      title: "Certifications",
      icon: <FileBadge size={16} className="text-accent" />,
      fn: () => categoryFn({ data: { category: "Certifications" } }),
    },
    {
      key: "fellowships",
      title: "Fellowships",
      icon: <Sparkles size={16} className="text-accent" />,
      fn: () => categoryFn({ data: { category: "Fellowships" } }),
    },
  ] as const;

  const sectionQueries = sections.map((s) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({ queryKey: ["section", s.key], queryFn: s.fn as () => Promise<Opportunity[]> }),
  );

  const { data: savedSnap = [] } = useQuery({
    queryKey: ["section", "saved-snap"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("saved_opportunities")
        .select(
          "opportunity:opportunities(id, title, organization, category, categories, opportunity_type, location, deadline, description, ai_insight, apply_url, image_url, tags, verification_score, match_score_default)",
        )
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(6);
      return (data ?? []).map((r) => r.opportunity as unknown as Opportunity).filter(Boolean);
    },
  });

  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ["search", search],
    queryFn: () => searchFn({ data: { query: search, category: "All" } }),
    enabled: search.length > 0,
  });

  const discover = useMutation({
    mutationFn: () => discoverFn({ data: { query: search, category: "All" } }),
    onSuccess: (res) => {
      toast.success(
        res?.inserted
          ? `Discovered ${res.inserted} new opportunities`
          : "No new verified opportunities yet — try again",
      );
      queryClient.invalidateQueries({ queryKey: ["section"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Discovery failed"),
  });

  // First-load: trigger discovery if recommended is empty
  useEffect(() => {
    const rec = sectionQueries[0];
    if (!rec.isLoading && (rec.data ?? []).length === 0 && !discover.isPending) {
      discover.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionQueries[0].isLoading]);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/70 backdrop-blur-xl flex items-center justify-between px-6">
        <Link to="/" className="flex flex-col leading-tight">
          <span className="font-mono text-lg font-bold tracking-tighter">
            OPPORTUNITY <span className="text-accent">X</span>
          </span>
          <span className="text-[9px] uppercase tracking-widest text-text-s">
            Powered by AEON X
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/dashboard" className="px-3 py-1.5 text-xs font-semibold rounded-lg text-accent">
            Discover
          </Link>
          <Link to="/vault" className="px-3 py-1.5 text-xs font-semibold rounded-lg text-text-s hover:text-foreground">
            Vault
          </Link>
          <Link to="/onboarding" className="px-3 py-1.5 text-xs font-semibold rounded-lg text-text-s hover:text-foreground">
            Profile
          </Link>
          {admin?.admin && (
            <Link
              to="/admin/queue"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-text-s hover:text-foreground inline-flex items-center gap-1"
            >
              <Shield size={12} /> Admin
            </Link>
          )}
          <button onClick={signOut} title="Sign out" className="p-2 rounded-lg text-text-s hover:text-foreground transition">
            <LogOut size={16} />
          </button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
            Welcome to the Intelligence Engine
          </h1>
          <p className="text-sm text-text-s">
            Verified, AI-scored opportunities — built for your profile. Save what matters. Share to WhatsApp in one tap.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput.trim());
          }}
          className="relative mb-8 max-w-2xl"
        >
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-s" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search verified opportunities…"
            className="w-full pl-10 pr-32 py-2.5 rounded-xl bg-surface/60 backdrop-blur-md border border-border focus:border-accent outline-none text-sm"
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

        {search ? (
          <section className="mb-10">
            <h2 className="text-lg font-black mb-3">Search results for "{search}"</h2>
            {searching ? (
              <p className="text-sm text-text-s">Searching…</p>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-text-s">No matches. Try a different keyword or click Discover.</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((o) => (
                  <OpportunityCard key={o.id} opportunity={o as Opportunity} />
                ))}
              </div>
            )}
            <button
              onClick={() => {
                setSearch("");
                setSearchInput("");
              }}
              className="mt-4 text-xs text-accent underline"
            >
              ← Back to feed
            </button>
          </section>
        ) : (
          <>
            {sections.map((s, i) => (
              <OpportunitySection
                key={s.key}
                title={s.title}
                subtitle={s.subtitle}
                icon={s.icon}
                items={(sectionQueries[i].data ?? []) as Opportunity[]}
                isLoading={sectionQueries[i].isLoading}
                emptyHint="Run Discover to populate."
              />
            ))}
            <OpportunitySection
              title="Saved Opportunities"
              icon={<Bookmark size={16} className="text-accent" />}
              subtitle="Recent saves from your vault"
              items={savedSnap}
              emptyHint="Save opportunities to find them here."
            />
          </>
        )}
      </main>
    </div>
  );
}
