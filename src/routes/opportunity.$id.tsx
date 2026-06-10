import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getOpportunity } from "@/lib/opportunities.functions";
import ShareToWhatsApp from "@/components/ShareToWhatsApp";
import {
  ArrowLeft,
  Building2,
  MapPin,
  CalendarDays,
  ExternalLink,
  Sparkles,
} from "lucide-react";

const opportunityQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["opportunity", id],
    queryFn: () => getOpportunity({ data: { id } }),
  });

export const Route = createFileRoute("/opportunity/$id")({
  loader: async ({ params, context }) => {
    const row = await context.queryClient.ensureQueryData(opportunityQueryOptions(params.id));
    if (!row) throw notFound();
    return row;
  },
  head: ({ loaderData }) => {
    const o = loaderData;
    if (!o) return { meta: [{ title: "Opportunity not found — Opportunity X" }] };
    const title = `${o.title} — ${o.organization}`;
    const desc = (o.description ?? `${o.category} opportunity from ${o.organization}.`).slice(0, 160);
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        ...(o.image_url ? [{ property: "og:image", content: o.image_url }] : []),
        { name: "twitter:card", content: o.image_url ? "summary_large_image" : "summary" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Opportunity not found</h1>
        <Link to="/" className="text-accent text-sm underline">
          Back to home
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="text-center">
        <h1 className="text-xl font-bold mb-2">Couldn't load this opportunity</h1>
        <p className="text-sm text-text-s mb-4">{error.message}</p>
        <Link to="/" className="text-accent text-sm underline">
          Back to home
        </Link>
      </div>
    </div>
  ),
  component: OpportunityDetail,
});

function OpportunityDetail() {
  const { id } = Route.useParams();
  const { data: op } = useSuspenseQuery(opportunityQueryOptions(id));
  if (!op) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-text-s hover:text-foreground">
          <ArrowLeft size={14} /> Opportunity X
        </Link>
        <Link
          to="/auth"
          className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-bold"
        >
          Sign in
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[10px] font-mono uppercase tracking-wider mb-3">
          {op.category}
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">{op.title}</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-text-s mb-6">
          <span className="inline-flex items-center gap-1.5">
            <Building2 size={14} /> {op.organization}
          </span>
          {op.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} /> {op.location}
            </span>
          )}
          {op.deadline && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={14} /> {op.deadline}
            </span>
          )}
        </div>

        {op.description && (
          <p className="text-base leading-relaxed text-foreground/90 mb-6">{op.description}</p>
        )}

        {op.ai_insight && (
          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5 mb-8">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-accent mb-2">
              <Sparkles size={10} /> AI Insight
            </div>
            <p className="text-sm leading-relaxed">{op.ai_insight}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-center">
          <a
            href={op.apply_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-foreground font-bold hover:opacity-90 transition"
          >
            Apply Now <ExternalLink size={14} />
          </a>
          <ShareToWhatsApp opportunity={op} />
        </div>

        <div className="mt-12 pt-6 border-t border-border text-xs text-text-s">
          🚀 Discovered via{" "}
          <Link to="/" className="text-accent">
            Opportunity X
          </Link>
        </div>
      </main>
    </div>
  );
}
