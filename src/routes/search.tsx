import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search, Sparkles, Loader2, ArrowLeft, Globe2 } from "lucide-react";
import { liveWebSearch } from "@/lib/intelligence.functions";
import OpportunityCard, { type Opportunity } from "@/components/OpportunityCard";
import { toast } from "sonner";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Live Search — Opportunity X" },
      {
        name: "description",
        content:
          "Ask Opportunity X to discover real scholarships, fellowships, internships and grants from the live web — verified and ranked in seconds.",
      },
      { property: "og:title", content: "Live Opportunity Search — Opportunity X" },
      {
        property: "og:description",
        content:
          "Perplexity-style AI search across the live web for verified scholarships, fellowships, and grants.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LiveSearch,
});

function LiveSearch() {
  const [q, setQ] = useState("");
  const searchFn = useServerFn(liveWebSearch);

  const run = useMutation({
    mutationFn: (query: string) => searchFn({ data: { query } }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Search failed"),
  });

  const results = (run.data?.results ?? []) as Opportunity[];
  const stats = run.data?.stats;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/70 backdrop-blur-xl flex items-center justify-between px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-text-s hover:text-foreground"
        >
          <ArrowLeft size={14} /> Opportunity X
        </Link>
        <Link
          to="/auth"
          className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-bold"
        >
          Sign in
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface text-xs text-text-s mb-4">
            <Globe2 size={12} className="text-accent" /> Live web · Opportunity Intelligence
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">
            Ask anything. <span className="text-accent">Find anything.</span>
          </h1>
          <p className="text-sm text-text-s max-w-xl mx-auto">
            Opportunity X reads the live web — universities, foundations, governments — and returns
            verified opportunities matching your query.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = q.trim();
            if (v.length < 2) return;
            run.mutate(v);
          }}
          className="relative mb-6"
        >
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-s" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. fully funded PhD scholarships in renewable energy in Europe"
            className="w-full pl-11 pr-32 py-3.5 rounded-2xl bg-surface/60 backdrop-blur-md border border-border focus:border-accent outline-none text-sm"
          />
          <button
            type="submit"
            disabled={run.isPending || q.trim().length < 2}
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold disabled:opacity-60"
          >
            {run.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            Search the web
          </button>
        </form>

        <div className="flex flex-wrap gap-2 mb-10 justify-center">
          {[
            "Mastercard Foundation Scholars",
            "Google Research internships",
            "AI fellowships Africa",
            "Climate change grants undergrad",
          ].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setQ(s);
                run.mutate(s);
              }}
              className="px-3 py-1 rounded-full border border-border bg-surface text-[11px] text-text-s hover:text-accent hover:border-accent/40 transition"
            >
              {s}
            </button>
          ))}
        </div>

        {run.isPending && (
          <div className="text-center py-12">
            <Loader2 size={28} className="animate-spin text-accent mx-auto mb-3" />
            <p className="text-xs text-text-s">
              Discovering, verifying, and ranking opportunities from the live web…
            </p>
          </div>
        )}

        {run.isError && (
          <div className="text-center text-sm text-destructive py-6">
            {run.error instanceof Error ? run.error.message : "Search failed"}
          </div>
        )}

        {!run.isPending && run.isSuccess && (
          <section>
            {stats && (
              <div className="text-[11px] text-text-s mb-4 font-mono">
                Discovered {stats.candidates} · Verified {stats.verified} · Showing {results.length}
              </div>
            )}
            {results.length === 0 ? (
              <p className="text-sm text-text-s text-center py-8">
                No verified matches yet. Try a more specific query.
              </p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {results.map((o) => (
                  <OpportunityCard key={o.id} opportunity={o} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
