import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ShareToWhatsApp from "./ShareToWhatsApp";

export interface Opportunity {
  id: string;
  title: string;
  organization: string;
  category: string;
  location: string | null;
  deadline: string | null;
  description: string | null;
  ai_insight: string | null;
  apply_url: string | null;
  image_url: string | null;
}

interface Props {
  opportunity: Opportunity;
  /** When the parent already knows it's saved (vault view), pass true to skip the lookup. */
  initiallySaved?: boolean;
  onUnsave?: (id: string) => void;
}

export default function OpportunityCard({ opportunity, initiallySaved, onUnsave }: Props) {
  const [isSaved, setIsSaved] = useState(!!initiallySaved);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

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
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group relative rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4 hover:border-accent/40 transition"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[10px] font-mono uppercase tracking-wider mb-2">
            {opportunity.category}
          </div>
          <h3 className="text-lg font-bold leading-snug">
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
          </div>
        </div>
      </header>

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

      {opportunity.description && (
        <p className="text-sm text-text-s line-clamp-3">{opportunity.description}</p>
      )}

      {opportunity.ai_insight && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-accent mb-1">
            <Sparkles size={10} /> AI Insight
          </div>
          <p className="text-xs text-foreground/90 leading-relaxed">{opportunity.ai_insight}</p>
        </div>
      )}

      {/* Action row: Save / Share to WhatsApp / Apply Now */}
      <footer className="flex items-center gap-2 pt-1 mt-auto">
        <button
          type="button"
          onClick={toggleSave}
          disabled={loading}
          aria-label={isSaved ? "Remove from vault" : "Save to vault"}
          title={isSaved ? "Saved" : "Save"}
          className={`inline-flex items-center justify-center gap-2 p-2 rounded-xl border transition text-xs font-semibold ${
            isSaved
              ? "bg-success/10 border-success/40 text-success"
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
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold hover:opacity-90 transition"
        >
          Apply Now <ExternalLink size={12} />
        </a>
      </footer>
    </motion.article>
  );
}
