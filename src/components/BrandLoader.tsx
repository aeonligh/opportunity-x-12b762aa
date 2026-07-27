import { BrandMark } from "./BrandMark";

interface BrandLoaderProps {
  /** Optional caption shown under the mark. */
  label?: string;
  /** Fullscreen (fixed) or inline. */
  fullscreen?: boolean;
  size?: number;
}

/**
 * The Opportunity X loading experience.
 *
 * Sequence:
 *  1. A single glowing point appears at the center.
 *  2. The two curves of the symbol draw themselves inward.
 *  3. Soft energy travels through the strokes (shimmer).
 *  4. A subtle pulse breathes on the completed mark.
 *
 * Respects `prefers-reduced-motion` — the mark simply appears,
 * with a gentle opacity pulse and no stroke animation.
 */
export function BrandLoader({
  label = "Preparing your intelligence",
  fullscreen = true,
  size = 112,
}: BrandLoaderProps) {
  const container = fullscreen
    ? "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
    : "flex flex-col items-center justify-center py-16";

  return (
    <div className={container} role="status" aria-live="polite">
      <div className="brand-loader-stage" style={{ width: size, height: size }}>
        {/* the seed point that ignites first */}
        <span className="brand-loader-seed" aria-hidden />
        {/* the assembling symbol */}
        <BrandMark
          size={size}
          className="brand-loader-mark text-foreground"
        />
        {/* soft convergence halo */}
        <span className="brand-loader-halo" aria-hidden />
      </div>
      {label ? (
        <p className="mt-6 text-[11px] font-mono uppercase tracking-[0.22em] text-text-s brand-loader-caption">
          {label}
        </p>
      ) : null}
      <span className="sr-only">Loading Opportunity X</span>
    </div>
  );
}
