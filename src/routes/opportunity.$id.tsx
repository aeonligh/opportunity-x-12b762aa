import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { getOpportunity } from "@/lib/intelligence.functions";
import { trackEvent } from "@/lib/analytics.functions";
import ShareToWhatsApp from "@/components/ShareToWhatsApp";
import MatchScoreBadge from "@/components/MatchScoreBadge";
import UrgencyBadge from "@/components/UrgencyBadge";
import EligibilityPanel from "@/components/EligibilityPanel";
import CopilotPanel from "@/components/CopilotPanel";
import {
  ArrowLeft,
  Building2,
  MapPin,
  CalendarDays,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Link2,
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
  head: ({ params, loaderData }) => {
    const o = loaderData;
    if (!o) return { meta: [{ title: "Opportunity not found — Opportunity X" }] };
    const title = `${o.title} — ${o.organization}`;
    const desc = (o.description ?? `${o.category} opportunity from ${o.organization}.`).slice(0, 160);
    const url = `https://opportunity-x.lovable.app/opportunity/${params.id}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(o.image_url ? [{ property: "og:image", content: o.image_url }] : []),
        { name: "twitter:card", content: o.image_url ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        ...(o.image_url ? [{ name: "twitter:image", content: o.image_url }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalOccupationalProgram",
            name: o.title,
            description: desc,
            provider: { "@type": "Organization", name: o.organization },
            url,
            applicationDeadline: o.deadline ?? undefined,
            occupationalCategory: o.opportunity_type ?? o.category,
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Opportunity not found</h1>
        <Link to="/" className="text-accent text-sm underline">Back to home</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="text-center">
        <h1 className="text-xl font-bold mb-2">Couldn't load this opportunity</h1>
        <p className="text-sm text-text-s mb-4">{error.message}</p>
        <Link to="/" className="text-accent text-sm underline">Back to home</Link>
      </div>
    </div>
  ),
  component: OpportunityDetail,
});

function OpportunityDetail() {
  const { id } = Route.useParams();
  const { data: op } = useSuspenseQuery(opportunityQueryOptions(id));
  const track = useServerFn(trackEvent);

  useEffect(() => {
    if (!op) return;
    void track({ data: { opportunity_id: op.id, event_type: "view" } }).catch(() => {});
  }, [op, track]);

  if (!op) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/70 backdrop-blur-xl flex items-center justify-between px-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-text-s hover:text-foreground">
          <ArrowLeft size={14} /> Opportunity X
        </Link>
        <Link
          to="/auth"
          className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-bold"
        >
          Sign in to save
        </Link>
      </header>

      {op.image_url && (
        <div className="relative h-64 md:h-80 w-full overflow-hidden bg-surface">
          <img src={op.image_url} alt={op.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
      )}

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[10px] font-mono uppercase tracking-wider">
            {(op.categories?.[0] ?? op.category)}
          </span>
          {op.opportunity_type && (
            <span className="inline-flex px-2 py-0.5 rounded-md bg-surface border border-border text-[10px] font-semibold text-text-s">
              {op.opportunity_type}
            </span>
          )}
          <UrgencyBadge deadline={op.deadline} />
          {op.verification_score && op.verification_score >= 0.8 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[oklch(0.6_0.12_152)]/10 border border-[oklch(0.6_0.12_152)]/30 text-[oklch(0.78_0.15_152)] text-[10px] font-bold">
              <ShieldCheck size={10} /> Verified
            </span>
          )}
        </div>
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">{op.title}</h1>
          {op.match_score_default != null && <MatchScoreBadge score={op.match_score_default} size={56} />}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-text-s mb-6">
          <span className="inline-flex items-center gap-1.5"><Building2 size={14} /> {op.organization}</span>
          {op.location && <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {op.location}</span>}
          {op.deadline && <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} /> {op.deadline}</span>}
        </div>

        {op.description && <p className="text-base leading-relaxed text-foreground/90 mb-6">{op.description}</p>}

        {op.ai_insight && (
          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5 mb-6">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-accent mb-2">
              <Sparkles size={10} /> AI Insight
            </div>
            <p className="text-sm leading-relaxed">{op.ai_insight}</p>
          </div>
        )}

        {op.tags && op.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {op.tags.map((t) => (
              <span key={t} className="px-2 py-0.5 rounded-md bg-surface border border-border text-[11px] text-text-s">
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-center mb-6">
          <a
            href={op.apply_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => void track({ data: { opportunity_id: op.id, event_type: "apply_click" } }).catch(() => {})}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-foreground font-bold hover:opacity-90 transition"
          >
            Apply Now <ExternalLink size={14} />
          </a>
          <ShareToWhatsApp opportunity={op} />
          {op.source_url && (
            <a
              href={op.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs text-text-s hover:text-foreground"
            >
              <Link2 size={12} /> Source
            </a>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <EligibilityPanel opportunityId={op.id} aiReasoning={op.ai_insight} />
          <CopilotPanel opportunityId={op.id} opportunityTitle={op.title} />
        </div>

        <div className="mt-12 pt-6 border-t border-border text-xs text-text-s">
          🚀 Discovered via <Link to="/" className="text-accent">Opportunity X</Link> · Powered by AEON X
        </div>
      </main>
    </div>
  );
}
