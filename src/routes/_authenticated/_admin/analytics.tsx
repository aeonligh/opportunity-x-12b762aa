import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminAnalytics } from "@/lib/admin.functions";
import { Eye, Bookmark, Share2, MousePointerClick } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin" }] }),
  component: Analytics,
});

function Analytics() {
  const fn = useServerFn(adminAnalytics);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "analytics"], queryFn: () => fn() });

  if (isLoading || !data) return <p className="text-sm text-text-s">Loading…</p>;

  const cards = [
    { label: "Views", value: data.totals.view ?? 0, icon: <Eye size={16} /> },
    { label: "Saves", value: data.totals.save ?? 0, icon: <Bookmark size={16} /> },
    { label: "Shares", value: data.totals.share ?? 0, icon: <Share2 size={16} /> },
    { label: "Apply Clicks", value: data.totals.apply_click ?? 0, icon: <MousePointerClick size={16} /> },
  ];

  return (
    <div>
      <h1 className="text-2xl font-black mb-6">Analytics</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="p-4 rounded-2xl border border-border bg-surface/60 backdrop-blur-md">
            <div className="text-accent mb-2">{c.icon}</div>
            <div className="text-2xl font-black">{c.value.toLocaleString()}</div>
            <div className="text-xs text-text-s">{c.label}</div>
          </div>
        ))}
      </div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-text-s mb-3">Top opportunities</h2>
      <div className="space-y-1 text-xs">
        {Object.entries(data.perOpp)
          .map(([id, totals]) => {
            const t = totals as Record<string, number>;
            return {
              id,
              view: t.view ?? 0,
              save: t.save ?? 0,
              share: t.share ?? 0,
              apply_click: t.apply_click ?? 0,
              total: (t.view ?? 0) + (t.save ?? 0) * 2 + (t.share ?? 0) * 3 + (t.apply_click ?? 0) * 5,
            };
          })
          .sort((a, b) => b.total - a.total)
          .slice(0, 20)
          .map((row) => (
            <div key={row.id} className="flex items-center gap-3 py-2 border-b border-border/50 font-mono">
              <span className="truncate flex-1 text-text-s">{row.id}</span>
              <span>👁 {row.view}</span>
              <span>🔖 {row.save}</span>
              <span>↗ {row.share}</span>
              <span>🚀 {row.apply_click}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
