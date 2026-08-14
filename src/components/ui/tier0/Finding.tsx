"use client";

import { useState } from "react";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";
import { FreshnessStamp } from "@/components/ui/FreshnessStamp";
import { BaseRateLine } from "./BaseRateLine";
import { EvidenceLine } from "./EvidenceLine";
import { SourceTag } from "./SourceTag";
import { InspectionPath } from "./InspectionPath";
import { ReasoningPanel } from "./ReasoningPanel";
import type { Claim } from "@/lib/core/tier0/types";
import type { FactPermission } from "@/lib/core/profile/types";

/**
 * Finding — the composition every claim in AEON X is rendered through.
 *
 * Constitutional authority:
 *   Component System §01, the composition law — "no component may state a claim
 *     without composing the Tier 0 primitives that make it checkable. A
 *     statement without provenance is not a component in this system — it is a
 *     violation."
 *   Brand Bible §03 — ranking without reasoning is an opinion; with reasoning it
 *     is a finding. That distinction is why this component is named what it is.
 *   Experience Bible §6 — "Every claim reaches its evidence in one interaction."
 *
 * The law is enforced by the type, not by review. `Claim` requires `evidence`
 * and `baseRate`, so a recommendation, readiness score, opportunity or profile
 * insight that cannot supply them cannot be constructed and therefore cannot be
 * rendered. There is no `<Finding statement="..." />` overload, and no props
 * that let a caller opt out of the proof.
 *
 * Everything Tier 0 appears at full strength, permanently. CS §12: "Nothing
 * load-bearing ever quiets. Provenance, freshness, base rates and absence states
 * are permanent at full strength."
 */
export function Finding({
  claim,
  permissions = [],
  /** Rendered as the page's h1 on the Step surface; a heading elsewhere. */
  as: Heading = "h2",
  action,
  className = "",
}: {
  claim: Claim;
  permissions?: FactPermission[];
  as?: "h1" | "h2";
  /** The thing that advances it. May leave AEON X entirely (XB §2). */
  action?: { label: string; href: string };
  className?: string;
}) {
  const [inspecting, setInspecting] = useState(false);
  const [dissenting, setDissenting] = useState(false);

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      {/*
        Source first, then statement, then evidence — the reading order CS §04
        specifies, staggered once on entrance and never re-animated on return.
      */}
      <SourceTag origin={claim.origin} unchangedSince={claim.unchangedSince} />

      <Heading className="max-w-[24ch] text-3xl font-black leading-[1.1] tracking-tighter text-foreground sm:text-4xl">
        {claim.statement}
      </Heading>

      {/* Inline, never behind a disclosure. The reasoning arrives with the claim. */}
      <EvidenceLine summary={claim.evidence.summary} />

      {/*
        The contest, always. Not conditional on the figures being flattering, and
        not omitted when unknown — BaseRateLine states the unknown case aloud so
        silence cannot imply an uncontested field.
      */}
      <BaseRateLine baseRate={claim.baseRate} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ProvenanceChip tier={claim.evidence.provenance} />
        <FreshnessStamp at={claim.evidence.lastConfirmedAt} decay={claim.evidence.decay} />
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-3">
        {action ? (
          <a
            href={action.href}
            className="rounded-full bg-accent px-6 py-3 text-xs font-bold uppercase tracking-widest text-background transition-opacity duration-[120ms] active:opacity-90"
          >
            {action.label}
          </a>
        ) : null}

        {/*
          One interaction to the reasoning. XB §6: verification must never cost
          more than acceptance — so this sits beside the action at the same
          reach, not tucked into an overflow menu.
        */}
        {/*
          The DissentAffordance. CS §04: "one interaction that opens reasoning
          and the runner-up together." It sits beside the action at the same
          reach, because XB §6 and §10 both forbid dissent costing more than
          acceptance.
        */}
        <button
          type="button"
          onClick={() => setDissenting(true)}
          className="rounded-full border border-border px-6 py-3 text-xs font-bold uppercase tracking-widest text-text-s transition-colors duration-[120ms] hover:border-accent hover:text-accent"
        >
          Why this, and what else
        </button>

        <button
          type="button"
          onClick={() => setInspecting(true)}
          className="rounded-full px-2 py-3 text-xs font-bold uppercase tracking-widest text-text-s transition-colors duration-[120ms] hover:text-accent"
        >
          Check the evidence
        </button>
      </div>

      {/*
        Mounted only while open, so each inspection begins at Depth 1 by
        construction rather than by an effect resetting it.
      */}
      {dissenting ? (
        <ReasoningPanel claim={claim} onClose={() => setDissenting(false)} />
      ) : null}

      {inspecting ? (
        <InspectionPath
          claim={claim}
          permissions={permissions}
          open
          onClose={() => setInspecting(false)}
        />
      ) : null}
    </div>
  );
}
