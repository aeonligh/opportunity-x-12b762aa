/** Circular match-score ring badge. score = 0..1 */
export default function MatchScoreBadge({
  score,
  size = 44,
}: {
  score: number | null | undefined;
  size?: number;
}) {
  if (score == null || isNaN(score)) return null;
  const pct = Math.max(0, Math.min(1, score));
  const display = Math.round(pct * 100);
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  const tone =
    pct >= 0.8
      ? "text-[oklch(0.78_0.17_152)]"
      : pct >= 0.6
        ? "text-[oklch(0.82_0.15_85)]"
        : "text-[oklch(0.7_0.05_240)]";
  return (
    <div
      className={`relative inline-flex items-center justify-center ${tone}`}
      style={{ width: size, height: size }}
      title={`${display}% Match`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeOpacity={0.18}
          strokeWidth={3}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums">{display}%</span>
    </div>
  );
}
