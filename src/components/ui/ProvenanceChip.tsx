/**
 * Provenance chip — the visible origin of anything AEON X believes.
 *
 * Constitutional authority:
 *   Product Bible §07  — the three tiers, and "it always tells me why".
 *   Brand Bible §06    — the tier palette; mono for the machine voice.
 *   Brand Bible §12    — every encoded meaning carries a non-visual carrier.
 *   IA Bible §18       — required as a primitive available in every product.
 *
 * The glyph is not decoration. Tier is conveyed by glyph *and* label, never by
 * colour alone, so the trust model survives greyscale, colour-blindness, and
 * forced-colours mode.
 */

export type ProvenanceTier = "confirmed" | "inferred" | "learned";

const TIERS: Record<ProvenanceTier, { glyph: string; label: string; className: string }> = {
  confirmed: {
    glyph: "✓",
    label: "Confirmed by you",
    // aurora-green — a fact the person stated themselves
    className: "text-[oklch(0.75_0.18_152)] border-[oklch(0.75_0.18_152/0.45)] bg-[oklch(0.75_0.18_152/0.10)]",
  },
  inferred: {
    glyph: "◐",
    label: "Inferred by AI",
    // amber — may be incorrect, always correctable
    className: "text-[oklch(0.78_0.13_78)] border-[oklch(0.78_0.13_78/0.45)] bg-[oklch(0.78_0.13_78/0.10)]",
  },
  learned: {
    glyph: "◎",
    label: "Learned preference",
    // accent — behavioural, the softest tier
    className: "text-accent border-[oklch(0.82_0.16_210/0.40)] bg-[oklch(0.82_0.16_210/0.09)]",
  },
};

export function ProvenanceChip({
  tier,
  className = "",
}: {
  tier: ProvenanceTier;
  className?: string;
}) {
  const meta = TIERS[tier];
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border py-1 pl-2 pr-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${meta.className} ${className}`}
    >
      <span aria-hidden="true" className="text-[12px] tracking-normal">
        {meta.glyph}
      </span>
      {meta.label}
    </span>
  );
}
