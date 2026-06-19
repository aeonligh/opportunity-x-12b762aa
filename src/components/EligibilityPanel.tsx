import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle, Loader2, Target, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { checkEligibility, getEligibilityResult } from "@/lib/execution.functions";
import MatchScoreBadge from "./MatchScoreBadge";
import { toast } from "sonner";

interface Props {
  opportunityId: string;
  aiReasoning?: string | null;
}

export default function EligibilityPanel({ opportunityId, aiReasoning }: Props) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const checkFn = useServerFn(checkEligibility);
  const getFn = useServerFn(getEligibilityResult);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: cached, isLoading } = useQuery({
    queryKey: ["eligibility", opportunityId, userId],
    queryFn: () => getFn({ data: { opportunityId } }),
    enabled: !!userId,
    staleTime: 1000 * 60 * 60, // 1h
  });

  const check = useMutation({
    mutationFn: () => checkFn({ data: { opportunityId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eligibility", opportunityId, userId] });
      toast.success("Eligibility checked");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Check failed"),
  });

  if (!userId) {
    return (
      <div className="rounded-2xl border border-border bg-surface/60 backdrop-blur-md p-5">
        <div className="flex items-center gap-2 mb-2">
          <Target size={16} className="text-accent" />
          <h3 className="text-sm font-bold">Am I eligible?</h3>
        </div>
        <p className="text-xs text-text-s mb-3">
          Sign in to get an AI eligibility check, a personalized match score, and a
          requirements checklist.
        </p>
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold"
        >
          Sign in to check eligibility
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface/60 backdrop-blur-md p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-accent" />
          <h3 className="text-sm font-bold">Eligibility & Match</h3>
        </div>
        {cached?.score != null && <MatchScoreBadge score={cached.score / 100} size={48} />}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-text-s">
          <Loader2 size={12} className="animate-spin" /> Loading…
        </div>
      ) : !cached ? (
        <>
          <p className="text-xs text-text-s mb-3">
            Run our AI to compare your profile to this opportunity's requirements.
          </p>
          <button
            type="button"
            onClick={() => check.mutate()}
            disabled={check.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold disabled:opacity-60"
          >
            {check.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            Check my eligibility
          </button>
        </>
      ) : (
        <div className="space-y-4">
          {aiReasoning && (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-accent mb-1">
                Why this matches you
              </div>
              <p className="text-xs leading-relaxed">{aiReasoning}</p>
            </div>
          )}
          {cached.requirements_met?.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-text-s mb-1.5">
                Requirements you meet
              </div>
              <ul className="space-y-1.5">
                {cached.requirements_met.map((r: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <CheckCircle2
                      size={14}
                      className="text-[oklch(0.78_0.17_152)] mt-0.5 shrink-0"
                    />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cached.requirements_missing?.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-text-s mb-1.5">
                Gaps to close
              </div>
              <ul className="space-y-1.5">
                {cached.requirements_missing.map((r: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <XCircle size={14} className="text-destructive mt-0.5 shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            type="button"
            onClick={() => check.mutate()}
            disabled={check.isPending}
            className="text-[11px] text-accent hover:underline inline-flex items-center gap-1"
          >
            {check.isPending && <Loader2 size={10} className="animate-spin" />}
            Re-check eligibility
          </button>
        </div>
      )}
    </div>
  );
}
