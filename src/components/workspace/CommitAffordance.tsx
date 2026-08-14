"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { recordCommitment } from "@/app/actions/step";
import type { ProductScope } from "@/lib/core/profile/types";

/**
 * "I've applied to this" — the person telling the system what they did.
 *
 * ── CONSTITUTIONAL SPECIFICATION ──────────────────────────────────────────
 *
 * C1  XB §2 / L4 — the Ledger's "length is determined by what the user actually
 *     committed to, never by what the system found." The person is therefore the
 *     only writer, and this is the only affordance that writes.
 * C2  Ownership Principle — "the person owns the truth of their life, and the
 *     system never chases it." Stated once, beside the step. Never repeated,
 *     never escalated, never re-asked on the next visit.
 * C3  Visibility Principle — "forbids concluding anything from absence of
 *     signal", and by the same logic forbids concluding a commitment from a
 *     click. Not clicking this records nothing; it does not record a "no".
 * C4  IA §03 — "The user's own commitments are information they are entitled to;
 *     the system's discoveries are not owed attention." Committing is offered,
 *     never demanded.
 * C5  CS §05 — what lands is "one commitment the person made", so the title
 *     written is the one the Step could name. If it could not name one, this
 *     component is not rendered at all (see NextStep.commitment).
 *
 * ── REJECTED: capabilities no constitutional statement requires ────────────
 *
 *   A confirmation dialog     — committing is one interaction, as reporting an
 *                               outcome is. A second step would make recording
 *                               the truth costlier than leaving it unrecorded.
 *   A "not interested" option — C3. Declining to commit is already expressible
 *                               by doing nothing, and a button would convert
 *                               silence into a recorded negative.
 *   A reminder or nudge       — C2, and CS §05's "Nagging" anti-pattern.
 *   A count of commitments    — CS §05 and IA §05: "a number invites clearing,
 *                               and clearing is the engagement loop."
 */
export function CommitAffordance({
  title,
  product,
  deadline,
  recommendationId,
}: {
  title: string;
  product: ProductScope;
  deadline: string | null;
  recommendationId?: string;
}) {
  const [result, setResult] = useState<
    null | { recorded: true; id: string } | { recorded: false; limit: string }
  >(null);
  const [pending, start] = useTransition();

  if (result?.recorded) {
    return (
      <p
        role="status"
        className="max-w-[58ch] text-[15px] leading-relaxed text-text-s"
      >
        Recorded.{" "}
        {/* The record is a destination, not a toast. The person can go and see
            the thing that was written rather than being told it exists. */}
        <Link
          href={`/ledger/${result.id}`}
          className="text-foreground underline decoration-border underline-offset-4 transition-colors duration-[120ms] hover:decoration-accent"
        >
          It&apos;s in your ledger.
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setResult(
              await recordCommitment({ title, product, deadline, recommendationId })
            );
          })
        }
        className="w-fit text-xs font-bold uppercase tracking-widest text-text-s transition-colors duration-[120ms] hover:text-accent disabled:opacity-45"
      >
        I&apos;ve applied to this
      </button>

      {result && !result.recorded ? (
        /* Never silent. Flows §08: "An action whose effect isn't stated is
           indistinguishable from one that failed." */
        <p role="status" className="max-w-[58ch] text-[15px] leading-relaxed text-foreground">
          {result.limit}
        </p>
      ) : null}
    </div>
  );
}
