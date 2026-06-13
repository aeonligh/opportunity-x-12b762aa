import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  MapPin,
  CalendarDays,
  Building2,
  Sparkles,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ShareToWhatsApp from "./ShareToWhatsApp";
import MatchScoreBadge from "./MatchScoreBadge";
import UrgencyBadge from "./UrgencyBadge";
import { trackEvent } from "@/lib/analytics.functions";

export interface Opportunity {
  id: string;
  title: string;
  organization: string;
  category: string;
  categories?: string[] | null;
  opportunity_type?: string | null;
  location: string | null;
  deadline: string | null;
  description: string | null;
  ai_insight: string | null;
  apply_url: string | null;
  image_url: string | null;
  tags?: string[] | null;
  verification_score?: number | null;
  match_score_default?: number | null;
  match_score?: number | null;
}

interface Props {
  opportunity: Opportunity;
  initiallySaved?: boolean;
  onUnsave?: (id: string) => void;
}

export default function OpportunityCard({ opportunity, initiallySaved, onUnsave }: Props) {
  const [isSaved, setIsSaved] = useState(!!initiallySaved);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const tracked = useRef(false);
  const track = useServerFn(trackEvent);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUserId(data.user?.id ?? null);
      if (data.user && initiallySaved === undefined) {
        supabase
          .from("saved_opportunities")
          .select("id")
          .eq("user_id", data.user.id)
          .eq("opportunity_id", opportunity.id)
          .maybeSingle()
          .then(({ data: row }) => {
            if (active) setIsSaved(!!row);
          });
      }
    });
    return () => {
      active = false;
    };
  }, [opportunity.id, initiallySaved]);

  // View tracking — fire once when 50% visible
  useEffect(() => {
    if (!cardRef.current || tracked.current) return;
    const el = cardRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !tracked.current) {
            tracked.current = true;
            void track({
              data: { opportunity_id: opportunity.id, event_type: "view" },
            }).catch(() => {});
            obs.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [opportunity.id, track]);

  const toggleSave = async () => {
    if (!userId) {
      toast.error("Sign in to save opportunities");
      return;
    }
    setLoading(true);
    try {
      if (isSaved) {
        const { error } = await supabase
          .from("saved_opportunities")
          .delete()
          .eq("user_id", userId)
          .eq("opportunity_id", opportunity.id);
        if (error) throw error;
        setIsSaved(false);
        onUnsave?.(opportunity.id);
      } else {
        const { error } = await supabase
          .from("saved_opportunities")
          .insert({ user_id: userId, opportunity_id: opportunity.id });
        if (error) throw error;
        setIsSaved(true);
        toast.success("Saved to your vault");
        void track({
          data: { opportunity_id: opportunity.id, event_type: "save" },
        }).catch(() => {});
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const matchScore = opportunity.match_score ?? opportunity.match_score_default ?? null;
  const cats = (opportunity.categories?.length ? opportunity.categories : [opportunity.category]).filter(
    Boolean,
  ) as string[];

  return (
    <motion.article
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group relative rounded-2xl border border-border bg-surface/60 backdrop-blur-md overflow-hidden flex flex-col hover:border-accent/40 transition w-full"
    >
      <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-accent/30 via-accent/10 to-background">
        {opportunity.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={opportunity.image_url}
            alt={opportunity.title}
            className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-accent/30 font-mono text-5xl font-black">
            X
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {cats.slice(0, 2).map((c) => (
            <span
              key={c}
              className="inline-flex px-2 py-0.5 rounded-md bg-background/70 backdrop-blur-sm text-accent text-[10px] font-mono uppercase tracking-wider"
            >
              {c}
            </span>
          ))}
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-2">
          <UrgencyBadge deadline={opportunity.deadline} />
        </div>
        {matchScore != null && (
          <div className="absolute bottom-2 right-2">
            <MatchScoreBadge score={matchScore} />
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="text-base font-bold leading-snug">
            <Link
              to="/opportunity/$id"
              params={{ id: opportunity.id }}
              className="hover:text-accent transition"
            >
              {opportunity.title}
            </Link>
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-text-s mt-1">
            <Building2 size={12} />
            <span className="truncate">{opportunity.organization}</span>
            {opportunity.verification_score && opportunity.verification_score >= 0.8 && (
              <span className="inline-flex items-center gap-0.5 text-[oklch(0.78_0.15_152)] ml-1" title="Verified">
                <ShieldCheck size={11} />
              </span>
            )}
          </div>
        </div>

        {opportunity.opportunity_type && (
          <span className="inline-flex w-fit px-2 py-0.5 rounded-md bg-accent/5 border border-accent/20 text-accent text-[10px] font-semibold">
            {opportunity.opportunity_type}
          </span>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-text-s">
          {opportunity.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} /> {opportunity.location}
            </span>
          )}
          {opportunity.deadline && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={12} /> {opportunity.deadline}
            </span>
          )}
        </div>

        {opportunity.ai_insight && (
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-accent mb-1">
              <Sparkles size={10} /> AI Insight
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed line-clamp-3">
              {opportunity.ai_insight}
            </p>
          </div>
        )}

        <footer className="flex items-center gap-2 pt-1 mt-auto">
          <button
            type="button"
            onClick={toggleSave}
            disabled={loading}
            aria-label={isSaved ? "Remove from vault" : "Save to vault"}
            title={isSaved ? "Saved" : "Save"}
            className={`inline-flex items-center justify-center gap-2 p-2 rounded-xl border transition text-xs font-semibold ${
              isSaved
                ? "bg-[oklch(0.6_0.12_152)]/10 border-[oklch(0.6_0.12_152)]/40 text-[oklch(0.78_0.15_152)]"
                : "bg-background border-border text-text-s hover:text-foreground"
            }`}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : isSaved ? (
              <BookmarkCheck size={14} />
            ) : (
              <Bookmark size={14} />
            )}
          </button>

          <ShareToWhatsApp opportunity={opportunity} iconOnly />

          <a
            href={opportunity.apply_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              void track({
                data: { opportunity_id: opportunity.id, event_type: "apply_click" },
              }).catch(() => {})
            }
            className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold hover:opacity-90 transition"
          >
            Apply Now <ExternalLink size={12} />
          </a>
        </footer>
      </div>
    </motion.article>
  );
}
