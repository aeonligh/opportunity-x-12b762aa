/** Deadline urgency helpers — pure, no deps. */

export type UrgencyTone = "passed" | "urgent" | "warn" | "ok";
export type Urgency = { label: string; tone: UrgencyTone; daysLeft: number } | null;

/**
 * Best-effort parse of free-form deadline strings ("Jan 15, 2026",
 * "2026-01-15", "March 2026", "Rolling"). Returns null if unparseable.
 */
export function parseDeadline(input?: string | null): Date | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed || /rolling|ongoing|tbd|n\/?a/i.test(trimmed)) return null;
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d;
  // Try first day of "Month YYYY"
  const m = trimmed.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (m) {
    const d2 = new Date(`${m[1]} 1, ${m[2]}`);
    if (!isNaN(d2.getTime())) return d2;
  }
  return null;
}

export function computeUrgency(deadline?: string | null, now = new Date()): Urgency {
  const d = parseDeadline(deadline);
  if (!d) return null;
  const ms = d.getTime() - now.getTime();
  const days = Math.ceil(ms / 86400000);
  if (days < 0) return { label: "Deadline Passed", tone: "passed", daysLeft: days };
  if (days <= 7) return { label: `${days} Days Left`, tone: "urgent", daysLeft: days };
  if (days <= 30) return { label: `${days} Days Left`, tone: "warn", daysLeft: days };
  return { label: `${days} Days Left`, tone: "ok", daysLeft: days };
}
