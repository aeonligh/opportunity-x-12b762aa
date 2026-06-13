/**
 * WhatsApp share button for opportunity cards.
 * Uses wa.me deep link — routes to native WhatsApp on mobile, Web on desktop.
 */
import { useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { trackEvent } from "@/lib/analytics.functions";

export interface ShareableOpportunity {
  id: string;
  title: string;
  category?: string | null;
  categories?: string[] | null;
  location?: string | null;
  deadline?: string | null;
  ai_insight?: string | null;
  apply_url?: string | null;
}

const COMMUNITY_INVITE = "https://chat.whatsapp.com/JGZehs9fzCfEsLmXZYCXej";

export function buildWhatsAppShareMessage(
  op: ShareableOpportunity,
  detailUrl: string,
): string {
  const category =
    op.categories?.[0] ?? op.category ?? "Opportunity";
  const lines = [
    "🎓 OPPORTUNITY ALERT",
    "",
    `🎯 ${op.title}`,
    `📌 Category: ${category}`,
    op.location ? `🌍 Location: ${op.location}` : null,
    op.deadline ? `⏳ Deadline: ${op.deadline}` : null,
    "",
    op.ai_insight ? "💡 AI Insight:" : null,
    op.ai_insight ?? null,
    op.ai_insight ? "" : null,
    op.apply_url ? "🔗 Apply Here:" : null,
    op.apply_url ?? null,
    op.apply_url ? "" : null,
    "📖 Read Full Details:",
    detailUrl,
    "",
    "📣 Shared via Opportunity X",
    "",
    "🚀 Join AEON X Early Access Hub",
    COMMUNITY_INVITE,
  ].filter((l): l is string => l !== null);
  return lines.join("\n");
}

interface ShareToWhatsAppProps {
  opportunity: ShareableOpportunity;
  detailUrl?: string;
  iconOnly?: boolean;
  className?: string;
}

export default function ShareToWhatsApp({
  opportunity,
  detailUrl,
  iconOnly = false,
  className = "",
}: ShareToWhatsAppProps) {
  const track = useServerFn(trackEvent);

  const handleShare = useCallback(() => {
    const url =
      detailUrl ??
      (typeof window !== "undefined"
        ? `${window.location.origin}/opportunity/${opportunity.id}`
        : `/opportunity/${opportunity.id}`);
    const message = buildWhatsAppShareMessage(opportunity, url);
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    if (typeof window !== "undefined") {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }
    void track({ data: { opportunity_id: opportunity.id, event_type: "share" } }).catch(
      () => {},
    );
  }, [opportunity, detailUrl, track]);

  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl border transition-all font-semibold";
  const style =
    "bg-[oklch(0.72_0.17_152)]/10 border-[oklch(0.72_0.17_152)]/40 text-[oklch(0.85_0.18_152)] hover:bg-[oklch(0.72_0.17_152)]/20";

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Share to WhatsApp"
      title="Share to WhatsApp"
      className={`${base} ${style} ${iconOnly ? "p-2" : "px-3 py-2 text-xs"} ${className}`}
    >
      <WhatsAppIcon size={iconOnly ? 16 : 14} />
      {!iconOnly && <span>Share</span>}
    </button>
  );
}

export function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.04 21.785c-1.74 0-3.4-.451-4.881-1.336l-.34-.203-3.529.923.943-3.43-.222-.353C2.93 15.59 2.48 13.84 2.48 12.04c0-5.28 4.3-9.58 9.58-9.58 5.28 0 9.58 4.3 9.58 9.58 0 5.28-4.3 9.58-9.58 9.58z" />
    </svg>
  );
}
