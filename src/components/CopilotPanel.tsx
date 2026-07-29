import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Sparkles, Loader2, FileText, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateSOP, getUserSOPs } from "@/lib/execution.functions";

const SOP_TYPES = [
  "Scholarship Essay",
  "Motivation Letter",
  "Personal Statement",
  "Study Plan",
] as const;

type SopType = (typeof SOP_TYPES)[number];

interface Props {
  opportunityId: string;
  opportunityTitle: string;
}

export default function CopilotPanel({ opportunityId, opportunityTitle }: Props) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [type, setType] = useState<SopType>("Motivation Letter");
  const [goals, setGoals] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const generateFn = useServerFn(generateSOP);
  const listFn = useServerFn(getUserSOPs);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: allSops = [] } = useQuery({
    queryKey: ["sops", userId],
    queryFn: () => listFn(),
    enabled: !!userId,
  });

  const sopsForThis = allSops.filter((s) => s.opportunity_id === opportunityId);

  const generate = useMutation({
    mutationFn: () => generateFn({ data: { opportunityId, type, careerGoals: goals.trim() } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sops", userId] });
      toast.success(`${type} generated`);
      setGoals("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Generation failed"),
  });

  const copy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 1500);
  };

  if (!userId) {
    return (
      <div className="rounded-2xl border border-border bg-surface/60 backdrop-blur-md p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-accent" />
          <h3 className="text-sm font-bold">Application Copilot</h3>
        </div>
        <p className="text-xs text-text-s mb-3">
          Sign in to generate a tailored essay, motivation letter, or study plan for{" "}
          <span className="font-semibold">{opportunityTitle}</span>.
        </p>
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold"
        >
          Sign in to use Copilot
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface/60 backdrop-blur-md p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-accent" />
        <h3 className="text-sm font-bold">Application Copilot</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-3">
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-widest text-text-s mb-1.5">
            Document type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as SopType)}
            className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs"
          >
            {SOP_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-widest text-text-s mb-1.5">
            Your goals (short paragraph)
          </label>
          <textarea
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            rows={3}
            placeholder="e.g. I want to study climate-resilient agriculture and lead policy reform in West Africa…"
            className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs resize-none"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => generate.mutate()}
        disabled={generate.isPending || goals.trim().length < 10}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold disabled:opacity-60"
      >
        {generate.isPending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Sparkles size={12} />
        )}
        Generate {type}
      </button>

      {sopsForThis.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-s">
            Drafts for this opportunity
          </div>
          {sopsForThis.map(
            (s: { id: string; type: string; content: string; created_at: string }) => (
              <details
                key={s.id}
                className="group rounded-xl border border-border bg-background/40 overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-2 p-3 cursor-pointer hover:bg-background/60 transition">
                  <div className="flex items-center gap-2 text-xs">
                    <FileText size={12} className="text-accent" />
                    <span className="font-semibold">{s.type}</span>
                    <span className="text-text-s text-[10px]">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      copy(s.id, s.content);
                    }}
                    className="inline-flex items-center gap-1 text-[10px] text-text-s hover:text-accent"
                  >
                    {copied === s.id ? <Check size={11} /> : <Copy size={11} />}
                    {copied === s.id ? "Copied" : "Copy"}
                  </button>
                </summary>
                <div className="px-4 pb-4 text-xs whitespace-pre-wrap leading-relaxed text-foreground/90">
                  {s.content}
                </div>
              </details>
            ),
          )}
        </div>
      )}
    </div>
  );
}
