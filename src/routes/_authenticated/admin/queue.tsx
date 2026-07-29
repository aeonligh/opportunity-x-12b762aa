import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminListPending,
  approveOpportunity,
  deleteOpportunity,
  setFeatured,
} from "@/lib/admin.functions";
import { toast } from "sonner";
import { CheckCircle2, Trash2, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/queue")({
  head: () => ({ meta: [{ title: "Admin Queue — Opportunity X" }] }),
  component: Queue,
});

function Queue() {
  const listFn = useServerFn(adminListPending);
  const approveFn = useServerFn(approveOpportunity);
  const deleteFn = useServerFn(deleteOpportunity);
  const featureFn = useServerFn(setFeatured);
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin", "queue"],
    queryFn: () => listFn(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "queue"] });

  const approve = useMutation({
    mutationFn: (id: string) => approveFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Approved");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const feature = useMutation({
    mutationFn: (v: { id: string; featured: boolean }) => featureFn({ data: v }),
    onSuccess: () => {
      toast.success("Updated");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (isLoading) return <p className="text-sm text-text-s">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-black mb-6">Opportunity Queue</h1>
      <div className="space-y-2">
        {items.map((o) => (
          <div
            key={o.id}
            className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface/60"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm truncate">{o.title}</h3>
                {o.verified ? (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[oklch(0.6_0.12_152)]/10 text-[oklch(0.78_0.15_152)]">
                    Verified
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[oklch(0.6_0.18_75)]/10 text-[oklch(0.82_0.15_75)]">
                    Pending
                  </span>
                )}
                {o.featured && (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                    Featured
                  </span>
                )}
              </div>
              <p className="text-xs text-text-s truncate">
                {o.organization} · score {o.verification_score ?? 0}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {!o.verified && (
                <button
                  onClick={() => approve.mutate(o.id)}
                  className="p-2 rounded-lg hover:bg-accent/10 text-accent"
                  title="Approve"
                >
                  <CheckCircle2 size={16} />
                </button>
              )}
              <button
                onClick={() => feature.mutate({ id: o.id, featured: !o.featured })}
                className="p-2 rounded-lg hover:bg-accent/10 text-text-s"
                title="Toggle featured"
              >
                <Star size={16} />
              </button>
              <button
                onClick={() => del.mutate(o.id)}
                className="p-2 rounded-lg hover:bg-[oklch(0.55_0.2_25)]/10 text-[oklch(0.78_0.18_25)]"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
