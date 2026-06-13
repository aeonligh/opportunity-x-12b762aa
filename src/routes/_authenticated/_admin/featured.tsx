import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListPending, setFeatured } from "@/lib/admin.functions";
import { Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/featured")({
  head: () => ({ meta: [{ title: "Featured — Admin" }] }),
  component: Featured,
});

function Featured() {
  const listFn = useServerFn(adminListPending);
  const featureFn = useServerFn(setFeatured);
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["admin", "queue"], queryFn: () => listFn() });
  const feature = useMutation({
    mutationFn: (v: { id: string; featured: boolean }) => featureFn({ data: v }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin", "queue"] }); },
  });
  const verified = items.filter((i) => i.verified);
  return (
    <div>
      <h1 className="text-2xl font-black mb-6">Featured Opportunities</h1>
      <div className="grid md:grid-cols-2 gap-2">
        {verified.map((o) => (
          <button
            key={o.id}
            onClick={() => feature.mutate({ id: o.id, featured: !o.featured })}
            className={`text-left p-3 rounded-xl border transition ${
              o.featured ? "border-accent/50 bg-accent/10" : "border-border bg-surface/60 hover:border-accent/30"
            }`}
          >
            <div className="flex items-center gap-2">
              <Star size={14} className={o.featured ? "text-accent fill-accent" : "text-text-s"} />
              <span className="font-bold text-sm truncate">{o.title}</span>
            </div>
            <p className="text-xs text-text-s truncate mt-1">{o.organization}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
