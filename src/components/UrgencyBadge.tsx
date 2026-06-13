import { computeUrgency } from "@/lib/deadline";
import { Clock } from "lucide-react";

export default function UrgencyBadge({ deadline }: { deadline?: string | null }) {
  const u = computeUrgency(deadline);
  if (!u) return null;
  const toneCls =
    u.tone === "passed"
      ? "bg-[oklch(0.4_0.04_25)]/30 text-[oklch(0.7_0.04_25)] border-[oklch(0.5_0.05_25)]/40"
      : u.tone === "urgent"
        ? "bg-[oklch(0.55_0.2_25)]/15 text-[oklch(0.78_0.18_25)] border-[oklch(0.55_0.2_25)]/40 animate-pulse"
        : u.tone === "warn"
          ? "bg-[oklch(0.65_0.18_75)]/15 text-[oklch(0.82_0.15_75)] border-[oklch(0.65_0.18_75)]/30"
          : "bg-[oklch(0.6_0.12_152)]/10 text-[oklch(0.78_0.15_152)] border-[oklch(0.6_0.12_152)]/30";
  const label = u.tone === "urgent" && u.daysLeft <= 3 ? "Closing Soon" : u.label;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${toneCls}`}
    >
      <Clock size={10} /> {label}
    </span>
  );
}
