"use client";

import { useCallback, useState } from "react";
import { ChevronLeft, ExternalLink, X } from "lucide-react";
import { Overlay } from "@/components/ui/Overlay";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";
import { FreshnessStamp } from "@/components/ui/FreshnessStamp";
import { BaseRateLine } from "./BaseRateLine";
import { EvidenceLine } from "./EvidenceLine";
import {
  CONFIDENCE_LABEL,
  confidenceBand,
  type Claim,
  type SourceRef,
} from "@/lib/core/tier0/types";
import type { FactPermission, Observation } from "@/lib/core/profile/types";

/**
 * The inspection path: Finding → Evidence → Source → Observation → Permission.
 *
 * Constitutional authority:
 *   Experience Bible §6 — "Every claim reaches its evidence in one interaction
 *     and its underlying facts in two." Verification must never cost more than
 *     acceptance.
 *   IA Bible §14 — depth is overlaid, one level at a time, Escape returns
 *     exactly one level.
 *   IA Bible §11 — the provenance affordance on any recommendation "lands
 *     directly on the fact that produced it".
 *
 * Four levels inside ONE overlay, not four stacked overlays. CS §07: "Opening
 * while one is open replaces, never stacks." Going deeper replaces the panel's
 * contents; Escape and the back control each retreat exactly one level, and
 * Escape at level 1 closes.
 *
 * The path has no gaps by construction. Every level's data is a required field
 * of the level above it — a Claim requires Evidence, Evidence requires a Source
 * and its Observations, and an Observation requires either a reference or a
 * stated reason it has none. A missing link is a type error, not a dead end a
 * person discovers.
 */

type Level = 1 | 2 | 3 | 4;

const LEVEL_TITLE: Record<Level, string> = {
  1: "The reasoning",
  2: "The source",
  3: "What was observed",
  4: "Who may use this",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-text-s">
      {children}
    </span>
  );
}

function SourceBlock({ source }: { source: SourceRef }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-base font-semibold text-foreground">{source.label}</p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-widest text-text-s">
          {source.kind}
        </span>
        {/*
          XB §6: "Level 3 always shows its own freshness. A source verified two
          years ago is labelled as such."
        */}
        <FreshnessStamp at={source.lastVerifiedAt} decay={source.decay} verb="verified" />
      </div>
      {source.href ? (
        <a
          href={source.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-accent underline decoration-accent/40 underline-offset-4 transition-colors duration-[120ms] hover:decoration-accent"
        >
          Open the original
          <ExternalLink size={14} />
        </a>
      ) : (
        // Stated, not omitted — the same rule the whole system applies to absence.
        <p className="text-sm text-text-s">
          No public link. This was read from a record rather than a page.
        </p>
      )}
    </div>
  );
}

function ObservationBlock({ observation }: { observation: Observation }) {
  return (
    <li className="flex flex-col gap-2 border-l-2 border-border pl-5">
      <p className="text-[15px] leading-relaxed text-foreground">{observation.summary}</p>
      <div className="flex flex-wrap items-center gap-3">
        <FreshnessStamp at={observation.observedAt} decay="slow" verb="observed" />
        <span className="font-mono text-[11px] uppercase tracking-widest text-text-s">
          {observation.product}
        </span>
      </div>
      {/*
        Lineage is a declared choice, never a silent gap. Either the record can
        be reached, or the reason it cannot is stated in the person's view — not
        left for them to wonder about.
      */}
      {"ref" in observation && observation.ref ? (
        <p className="font-mono text-[11px] text-text-s">record {observation.ref}</p>
      ) : (
        <p className="text-[13px] italic text-text-s">
          No stored record to open — {(observation as { unaddressable: string }).unaddressable}
        </p>
      )}
    </li>
  );
}

function PermissionBlock({ permissions }: { permissions: FactPermission[] }) {
  if (permissions.length === 0) {
    return (
      <p className="text-[15px] leading-relaxed text-text-s">
        This has not been shared with any other product. Nothing outside{" "}
        <span className="text-foreground">the product that learned it</span> can use
        it, and that is the default — sharing is off until you turn it on.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {permissions.map((permission) => (
        <li
          key={permission.product}
          className="flex items-baseline justify-between gap-4 border-b border-border pb-3 last:border-0"
        >
          <span className="text-[15px] text-foreground">{permission.product}</span>
          <span className="flex items-baseline gap-3">
            {/*
              XB §10: grant and revoke at equal weight. Both states render in the
              same treatment — a revocation shown more quietly than a grant would
              be the asymmetry the section exists to prevent.
            */}
            <span className="font-mono text-[11px] uppercase tracking-widest text-text-s">
              {permission.state}
            </span>
            <FreshnessStamp at={permission.decidedAt} decay="monotonic" verb="decided" />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function InspectionPath({
  claim,
  permissions,
  open,
  onClose,
}: {
  claim: Claim;
  /** The per-product decisions on the fact this claim rests on. */
  permissions: FactPermission[];
  open: boolean;
  onClose: () => void;
}) {
  /*
    Every inspection starts at the reasoning. That is achieved by the caller
    mounting this component only while it is open, so the initial state *is* the
    reset — rather than an effect watching `open` and writing state back, which
    is a cascading render and a second source of truth for the same fact.
  */
  const [level, setLevel] = useState<Level>(1);

  /**
   * Escape returns exactly one level; at the top it closes. IA §14.
   *
   * `onClose` is called outside the state updater deliberately. React runs an
   * updater during render, so closing the parent from inside one is a setState
   * on another component mid-render — which React reports as "Cannot update a
   * component while rendering a different component". It worked, and it was
   * still wrong; the browser console caught it, review did not.
   */
  const back = useCallback(() => {
    if (level === 1) {
      onClose();
      return;
    }
    setLevel((level - 1) as Level);
  }, [level, onClose]);

  const { evidence } = claim;

  return (
    <Overlay open={open} onClose={back} label={`${LEVEL_TITLE[level]} — ${claim.statement}`}>
      <div className="flex flex-col gap-8 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <SectionLabel>
              Depth {level} of 4 · {LEVEL_TITLE[level]}
            </SectionLabel>
            <p className="max-w-[42ch] text-sm leading-snug text-text-s">
              {claim.statement}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-s transition-colors duration-[120ms] hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {level === 1 ? (
          <div className="flex flex-col gap-6">
            <EvidenceLine summary={evidence.summary} className="text-foreground" />
            <div className="flex flex-wrap items-center gap-3">
              <ProvenanceChip tier={evidence.provenance} />
              <FreshnessStamp at={evidence.lastConfirmedAt} decay={evidence.decay} />
            </div>

            <div className="flex flex-col gap-2">
              <SectionLabel>The contest</SectionLabel>
              <BaseRateLine baseRate={claim.baseRate} />
              {claim.baseRate.state === "known" ? (
                /*
                  CS §02: "Base rates need their own provenance and freshness;
                  last year's applicant count is a decaying fact like any other."
                  So the figure carries its own stamp rather than borrowing the
                  claim's.
                */
                <FreshnessStamp
                  at={claim.baseRate.lastConfirmedAt}
                  decay={claim.baseRate.decay}
                  verb="counted"
                />
              ) : null}
            </div>

            {evidence.provenance === "confirmed" ? null : (
              <div className="flex flex-col gap-2">
                <SectionLabel>How firmly this is held</SectionLabel>
                {/*
                  A band, never a percentage. PB §07 requires confidence be shown;
                  CS §02 rejects a number, which "implies precision the model
                  doesn't have, and invites optimising the number."

                  `evidence` is narrowed by the check above, so `confidence` is
                  present without a default. There is deliberately no `?? 0.5`
                  here: inventing a confidence is inventing evidence.
                */}
                <p className="text-[15px] text-foreground">
                  {CONFIDENCE_LABEL[confidenceBand(evidence.confidence)]}
                </p>
              </div>
            )}
          </div>
        ) : null}

        {level === 2 ? <SourceBlock source={evidence.source} /> : null}

        {level === 3 ? (
          evidence.observations.length > 0 ? (
            <ul className="flex flex-col gap-6">
              {evidence.observations.map((observation) => (
                <ObservationBlock key={observation.observedAt + observation.summary} observation={observation} />
              ))}
            </ul>
          ) : (
            <p className="text-[15px] leading-relaxed text-text-s">
              Nothing was observed. You stated this yourself, so there is no
              behaviour behind it to inspect — which is why it is held as a fact
              rather than an inference.
            </p>
          )
        ) : null}

        {level === 4 ? (
          <div className="flex flex-col gap-6">
            <PermissionBlock permissions={permissions} />

            {/*
              IA §11, the second path: "reachable from every claim — the
              provenance affordance on any recommendation lands directly on the
              fact that produced it, at /profile/[factId]. Both paths, always."

              This is the reason `Evidence.factId` is carried at all. Until now
              it was carried and never used, which left the constitutional
              sentence half-implemented: the Profile was reachable as a
              destination but not from the claim that rested on it.

              It sits at Depth 4 because that is where the fact's own permissions
              are being read — the person is already looking at the fact, and
              this is the door to everything else about it. `href` rather than a
              handler: the fact has an address, and IA §14 requires every level
              be linkable.
            */}
            {evidence.factId ? (
              <a
                href={`/profile/${evidence.factId}`}
                className="w-fit text-xs font-bold uppercase tracking-widest text-text-s transition-colors duration-[120ms] hover:text-accent"
              >
                Open this fact in your profile
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
          <button
            type="button"
            onClick={back}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-text-s transition-colors duration-[120ms] hover:text-foreground"
          >
            <ChevronLeft size={14} />
            {level === 1 ? "Close" : LEVEL_TITLE[(level - 1) as Level]}
          </button>

          {level < 4 ? (
            <button
              type="button"
              onClick={() => setLevel((current) => (current + 1) as Level)}
              className="text-xs font-bold uppercase tracking-widest text-accent transition-opacity duration-[120ms] active:opacity-90"
            >
              {LEVEL_TITLE[(level + 1) as Level]} →
            </button>
          ) : (
            <span className="text-xs font-medium text-text-s">
              End of the path — nothing is held back.
            </span>
          )}
        </div>
      </div>
    </Overlay>
  );
}
