import { forwardRef } from "react";

interface BrandMarkProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  animated?: boolean;
}

/**
 * Opportunity X — The Convergence.
 * Two mirrored cubic Béziers pinching at the exact center.
 *
 * When `animated` is true, the two strokes draw themselves inward
 * from opposite corners and meet at the middle — the Opportunity
 * Intelligence Engine initializing. Respects prefers-reduced-motion.
 */
export const BrandMark = forwardRef<SVGSVGElement, BrandMarkProps>(
  ({ size = 96, animated = false, className, ...rest }, ref) => {
    return (
      <svg
        ref={ref}
        viewBox="0 0 256 256"
        width={size}
        height={size}
        role="img"
        aria-label="Opportunity X"
        className={className}
        {...rest}
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth={16}
          strokeLinecap="round"
          data-animated={animated ? "true" : undefined}
        >
          <path d="M 56 56 C 128 96, 128 160, 200 200" />
          <path d="M 200 56 C 128 96, 128 160, 56 200" />
        </g>
      </svg>
    );
  }
);
BrandMark.displayName = "BrandMark";
