import Link from "next/link";
import { FreshnessStamp } from "@/components/ui/FreshnessStamp";
import type { Commitment } from "@/lib/core/ledger/types";

/**
 * LedgerItem — one commitment the person made, with its live state.
 *
 * Requirements satisfied: L14 (origin product), L17 (the four states), L18
 * (opens the record), L20 (unknown states the limit, never assumes), L22 (no
 * unread dot, no count), L26 (Tier 3 composes Tier 0).
 *
 * ── What is deliberately absent ─────────────────────────────────────────────
 * No status badge. CS §13 deletes the badge outright, and the state is already
 * carried by the sentence beneath the title — a badge would say the same thing
 * a second time in a shape that invites scanning rather than reading.
 *
 * No unread dot, no count, no archive control. L22 lists all three.
 */
export function LedgerItem({ commitment }: { commitment: Commitment }) {
  const { status } = commitment;

  return (
    <li className="border-b border-border last:border-0">
      {/* L18 — the item opens its record. L12 gives the route. */}
      <Link
        href={`/ledger/${commitment.id}`}
        className="block py-5 transition-colors duration-[120ms] hover:bg-surface/30"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-[17px] leading-snug text-foreground">{commitment.title}</span>
          {/* L14 — cross-product items carry their origin product. */}
          <span className="font-mono text-[11px] uppercase tracking-widest text-text-s">
            {commitment.product}
          </span>
        </div>

        <p className="mt-1.5 max-w-[58ch] text-[14px] leading-relaxed text-text-s">
          {status.state === "open" ? (
            status.deadline ? (
              <>
                Open. Closes{" "}
                {new Date(status.deadline).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                })}
                .
              </>
            ) : (
              "Open. No deadline recorded."
            )
          ) : null}

          {/*
            L20 — the exact posture CS §05 specifies: state the limit, never
            assume either outcome. Flows §08 adds that reporting is one
            interaction from here and nothing is pushed.
          */}
          {status.state === "deadline-passed" ? (
            <>
              This closed on{" "}
              {new Date(status.deadline).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
              })}
              . I don&apos;t know what happened.
            </>
          ) : null}

          {/*
            No celebration on acceptance and no sympathy on rejection — Flows
            §08 and PB §07 both forbid it. The two read identically because the
            record must not bias what the system learns from.
          */}
          {status.state === "outcome-reported" ? (
            <>You reported this as {status.outcome}.</>
          ) : null}

          {status.state === "withdrawn" ? <>You withdrew this.</> : null}
        </p>

        <div className="mt-2">
          <FreshnessStamp
            at={
              status.state === "outcome-reported"
                ? status.reportedAt
                : status.state === "withdrawn"
                  ? status.withdrawnAt
                  : commitment.committedAt
            }
            decay="monotonic"
            verb={status.state === "open" ? "committed" : "last changed"}
          />
        </div>
      </Link>
    </li>
  );
}
