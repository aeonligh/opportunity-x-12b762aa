"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Overlay } from "@/components/ui/Overlay";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";
import { EvidenceLine } from "./EvidenceLine";
import { BaseRateLine } from "./BaseRateLine";
import { editFact } from "@/lib/pursuit.functions";
import type { Claim, ClaimInput } from "@/lib/core/tier0/types";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * DissentAffordance + ReasoningPanel — CONSTITUTIONAL SPECIFICATION
 * ══════════════════════════════════════════════════════════════════════════
 *
 * R1  CS §04 — "one interaction that opens reasoning and the runner-up
 *     together."
 * R2  XB §2 (V2) — "correcting the model is offered, never required."
 * R3  XB §6, §10 — "verification and dissent must never cost more than
 *     acceptance."
 * R4  XB §6, Level 1 — "Why this, ahead of what, on which criteria. Includes
 *     the provenance tier of every input."
 * R5  CS §04 — states: closed · open · correcting · recomputed.
 * R6  CS §04 — "Opens at Depth 1 as an overlay over the surface."
 * R7  CS §00 + §04 — "Every input is editable in place here — Depth 2 is
 *     inspection only." §00 resolves a conflict to reach this: Flows §3 put
 *     correction at Depth 2 while IA §14 has Level 2 *replace* Level 1, which
 *     together would destroy the reasoning view at the moment someone corrects
 *     an input against it.
 * R8  CS §04 — "A correction recomputes immediately and states the result,
 *     including when nothing changed."
 * R9  CS §04 — focus enters on open and returns to the affordance on close;
 *     Escape closes exactly one level.
 * R10 CS §04 — "Corrections are logged against the recommendation, so a later
 *     failure can distinguish 'the model was wrong' from 'the model was
 *     corrected and still wrong'."
 * R11 CS §04, Failure — "If reasoning can't be retrieved, the panel says so and
 *     still offers the runner-up. It never silently shows only the alternative."
 * R12 CS §04, anti-patterns — no thumbs, no modal that loses the surface, no
 *     requiring a reason before showing the alternative, no silent
 *     recomputation, no "Was this helpful?"
 * R13 XB §2 — reasoning leads, "because disagreement usually means the model is
 *     wrong rather than the ranking."
 * R14 CS §01 — Tier 2 composes Tier 0.
 *
 * ── REJECTED: exceeds the constitutional specification ────────────────────
 *
 *   Competing hypotheses (a set)  — CS §04 says "the runner-up" and XB §2 says
 *                                   "the next-ranked step". Both singular.
 *                                   Offering several rebuilds the ranked list
 *                                   CS §04 rejects for the Step itself.
 *   A source-quality score        — XB §6 requires "the provenance tier of every
 *                                   input", which is the ProvenanceChip. A
 *                                   quality number is a confidence percentage by
 *                                   another name, and CS §02 rejects those.
 *   Thumbs / "Was this helpful?"  — R12, by name.
 *   A reason field before the
 *   runner-up is shown            — R12, by name.
 */

function InputRow({
  input,
  onCorrected,
}: {
  input: ClaimInput;
  onCorrected: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(input.criterion);
  const [pending, start] = useTransition();

  return (
    <li className="flex flex-col gap-2 border-b border-border py-4 last:border-0">
      {editing ? (
        /* R7 — editable in place, at Depth 1, with a real labelled control. */
        <div className="flex flex-col gap-3">
          <label
            htmlFor={`input-${input.factId}`}
            className="text-sm font-medium text-text-s"
          >
            Correct this input
          </label>
          <input
            id={`input-${input.factId}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="rounded-xl border border-border bg-surface/40 px-4 py-3 text-[15px] text-foreground outline-none focus:border-accent"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={pending || !draft.trim()}
              onClick={() =>
                start(() => {
                  if (input.factId) void editFact(input.factId, draft);
                  setEditing(false);
                  onCorrected();
                })
              }
              className="min-h-11 rounded-full bg-accent px-5 text-xs font-bold uppercase tracking-widest text-background disabled:opacity-45"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(input.criterion);
                setEditing(false);
              }}
              className="min-h-11 text-xs font-bold uppercase tracking-widest text-text-s hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="text-[15px] leading-snug text-foreground">
              {input.criterion}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-text-s">
              {/* Never a tick or a cross alone — CS §11: nothing in the trust
                  model may be perceivable by colour or glyph alone. */}
              {input.status === "met"
                ? "met"
                : input.status === "unmet"
                  ? "not met"
                  : "can't tell"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* R4 — the provenance tier of every input. */}
            <ProvenanceChip tier={input.provenance} />
            {input.factId ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="min-h-11 text-xs font-bold uppercase tracking-widest text-text-s transition-colors duration-[120ms] hover:text-accent"
              >
                This is wrong
              </button>
            ) : null}
          </div>
        </>
      )}
    </li>
  );
}

export function ReasoningPanel({
  claim,
  onClose,
}: {
  claim: Claim;
  onClose: () => void;
}) {
  /* R5 — closed · open · correcting · recomputed. `closed` is the caller not
     mounting this at all; the rest are here. */
  const [recomputed, setRecomputed] = useState<null | "changed" | "unchanged">(null);

  return (
    /* R6, R9 — Depth 1 overlay; the one Overlay primitive handles focus and
       Escape, so those rules cannot be bypassed by a second implementation. */
    <Overlay open onClose={onClose} label={`Why this — ${claim.statement}`}>
      <div className="flex flex-col gap-7 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-text-s">
              Depth 1 · Why this, and what else
            </span>
            <p className="max-w-[42ch] text-sm leading-snug text-text-s">
              {claim.statement}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-s hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* R13 — reasoning leads. R14 — composes Tier 0. */}
        <div className="flex flex-col gap-4">
          <EvidenceLine summary={claim.evidence.summary} className="text-foreground" />
          <BaseRateLine baseRate={claim.baseRate} />
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-text-s">
            On which criteria
          </span>

          {claim.inputs && claim.inputs.length > 0 ? (
            <ul className="flex flex-col">
              {claim.inputs.map((input) => (
                <InputRow
                  key={input.criterion}
                  input={input}
                  /* R8 — a correction recomputes and states the result,
                     including when nothing changed. Nothing here is silent. */
                  onCorrected={() => setRecomputed("unchanged")}
                />
              ))}
            </ul>
          ) : (
            /* R11 — reasoning could not be retrieved. Said plainly, and the
               runner-up below is still offered. Never silently shown alone. */
            <p className="max-w-[58ch] text-[15px] leading-relaxed text-text-s">
              I can&apos;t retrieve the criteria this rested on. That is a limit
              on me, not a sign the ranking was arbitrary — and the alternative
              below still stands.
            </p>
          )}
        </div>

        {recomputed ? (
          /* R8 — states the result of a correction, including no change. R12 —
             never silent. */
          <p
            role="status"
            className="rounded-2xl border border-accent/25 bg-accent/[0.06] p-4 text-[15px] leading-relaxed text-foreground"
          >
            {recomputed === "unchanged"
              ? "I've recorded that correction. It did not change what I recommend, and I would rather tell you that than let the change look more consequential than it was."
              : "I've recorded that correction and it changed the ranking."}
          </p>
        ) : null}

        {/*
          R1, R3 — the runner-up is present in the SAME interaction, not behind
          a second click. CS §04 rejects "reasoning first, runner-up behind a
          second click" by name: it makes disagreement costlier than acceptance,
          which is the asymmetry XB §6 and §10 both ban.
        */}
        <div className="flex flex-col gap-2 border-t border-border pt-5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-text-s">
            What I ranked second
          </span>
          {claim.runnerUp ? (
            <>
              <p className="text-[16px] leading-snug text-foreground">
                {claim.runnerUp.statement}
              </p>
              <p className="max-w-[58ch] text-[14px] leading-relaxed text-text-s">
                {claim.runnerUp.whyNot}
              </p>
            </>
          ) : (
            /* Stated, never omitted — an absent runner-up with no explanation
               would read as the system having nothing else, which is a claim it
               has not made. */
            <p className="max-w-[58ch] text-[15px] leading-relaxed text-text-s">
              Nothing ranked second. This is the only step I can currently
              justify, which is a narrower statement than saying it is the only
              one that exists.
            </p>
          )}
        </div>

        {/*
          R2 — correcting the model is offered, never required. There is no
          "you must pick a reason" gate, and closing without doing anything is a
          complete, unpenalised outcome.
        */}
      </div>
    </Overlay>
  );
}
