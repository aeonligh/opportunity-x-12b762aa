import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LabFrame } from "@/components/lab/LabFrame";
import { InterestedControl } from "@/components/opportunity/InterestedControl";
import { declaration, type PursuitResolution } from "@/lib/opportunity/pursuit/types";

/**
 * `/lab/mutations` — what a write looks like at every step, including the ones
 * that fail.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THIS IS THE HARDEST PAGE IN THE PRODUCT TO GET HONEST
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Every other state is a fact about the world that the product either has or
 * has not established. A mutation is different: for a second or two the person
 * has *already acted*, and the system does not yet know whether their act took
 * effect. That gap is where interfaces lie, almost always in the same direction
 * — the button changes colour on press, and if the write fails it either changes
 * back (and the person, having looked away, never knows) or does not (and the
 * screen now disagrees with the database).
 *
 * The rule this page exists to make checkable:
 *
 *   **A pressed button means the record says so. It never means a request was
 *   sent.**
 *
 * So there are four outcomes and none of them is optimistic:
 *
 *   pending   — sent, unconfirmed. The old position is still the true one and is
 *               still what the control shows.
 *   confirmed — written *and read back*. Only now does the button move.
 *   refused   — the system declined before writing, and said why.
 *   failed    — nothing was written. The previous position is restated, not
 *               cleared, because a person who has just seen an error is exactly
 *               the person about to guess.
 *
 * And a fifth that only exists because the first four are separated: **written,
 * not shown** — the write landed and the read-back failed. Its neighbours would
 * both misreport it. Collapsed into `failed`, a real declaration is announced as
 * lost. Collapsed into `confirmed`, the control shows a position the page has no
 * evidence for.
 *
 * ── How this is wired, and why it is not a mock ───────────────────────────
 *
 * Each specimen renders the *real* `InterestedControl` — the same component the
 * authenticated routes render — with its two injection points supplied:
 * `actions` (the write) and `onWritten` (the read-back). Nothing about the
 * control's behaviour is reimplemented here; only the store behind it is
 * substituted, and each store is rigged to fail in exactly one way.
 *
 * The store is a ref holding what the "server" believes, and the rendered
 * position is React state that only ever changes in `onWritten`. That is the
 * same shape as production, where the server holds the row and the read-back is
 * `router.invalidate()`. A specimen therefore cannot accidentally demonstrate
 * optimism: there is no code path here that can move the visible position
 * without going through a read.
 */
export const Route = createFileRoute("/lab/mutations")({
  component: Mutations,
});

const PERSON = "lab-visitor";

/**
 * When a pre-declared specimen says it was declared.
 *
 * A literal, not `Date.now() - four days`. The first version computed it, and
 * the server and the client computed it milliseconds apart — which React caught
 * as a hydration mismatch, and which is the same class of thing this page is
 * about: a rendered value that two parts of the system disagreed on. A fixed
 * date is not a fact about the world here (nothing on this page is), so nothing
 * is lost by pinning it.
 */
const ALREADY_DECLARED_AT = "2026-08-13T10:00:00.000Z";

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * One rigged store, and the real control in front of it.
 *
 * `latency` is deliberate and generous. A pending state that lasts 80ms cannot
 * be inspected, and "it looked fine locally" is how every pending state in every
 * product came to be untested.
 */
function Rig({
  entityId,
  /** What the write does. */
  write,
  /** What the read-back does. */
  read = "succeeds",
  latency = 1400,
  begins = "undeclared",
}: {
  entityId: string;
  write: "succeeds" | "refuses" | "throws";
  read?: "succeeds" | "throws";
  latency?: number;
  begins?: "undeclared" | "interested";
}) {
  /* What the "server" holds. Written by the actions, read by the read-back. */
  const stored = useRef<PursuitResolution>(
    begins === "interested"
      ? {
          state: "declared",
          declaration: declaration({
            personId: PERSON,
            entityId,
            state: "interested",
            declaredAt: ALREADY_DECLARED_AT,
          }),
          history: [],
        }
      : { state: "undeclared" },
  );

  /* What the page is showing. Only `onWritten` may move this. */
  const [shown, setShown] = useState<PursuitResolution>(stored.current);

  async function attempt(next: PursuitResolution) {
    await sleep(latency);
    if (write === "throws") throw new Error("the laboratory's store is rigged to fail");
    if (write === "refuses") {
      return {
        recorded: false as const,
        limit: "I can’t keep that: this specimen has no store to write it into.",
      };
    }
    stored.current = next;
    return { recorded: true as const };
  }

  const actions = {
    declare: (args: { data: { entityId: string; state: "interested" | "not-interested" } }) =>
      attempt({
        state: "declared",
        declaration: declaration({
          personId: PERSON,
          entityId: args.data.entityId,
          state: args.data.state,
          declaredAt: new Date().toISOString(),
        }),
        history: [],
      }),
    withdraw: () => attempt({ state: "undeclared" }),
  };

  async function onWritten() {
    await sleep(300);
    if (read === "throws") throw new Error("the laboratory's read-back is rigged to fail");
    setShown(stored.current);
  }

  return (
    <InterestedControl
      entityId={entityId}
      pursuit={shown}
      canPersist
      evidence="fixture"
      voice="you"
      actions={actions}
      onWritten={onWritten}
    />
  );
}

function Specimen({
  name,
  press,
  truthful,
  wrong,
  children,
}: {
  name: string;
  /** What to do to see it. A specimen nobody knows how to trigger is not one. */
  press: string;
  truthful: string;
  wrong: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-b border-border pb-8 last:border-b-0">
      <div className="flex flex-col gap-1">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
          {name}
        </h2>
        <p className="max-w-[62ch] text-[13px] leading-relaxed text-text-s">{press}</p>
        <p className="max-w-[62ch] text-[14px] leading-relaxed text-foreground">{truthful}</p>
        <p className="max-w-[62ch] text-[13px] leading-relaxed text-text-s">
          The version of this that lies: {wrong}
        </p>
      </div>
      <div className="rounded-lg border border-border p-5">{children}</div>
    </section>
  );
}

function Mutations() {
  return (
    <LabFrame
      title="What a write looks like"
      lede="Each control below is the real one, in front of a store rigged to behave in exactly one way. Press a button and watch what the surface is willing to claim before the store has answered."
      back={{ label: "Laboratory", to: "/lab" }}
    >
      <p className="max-w-[62ch] text-[14px] leading-relaxed text-text-s">
        Every specimen takes about a second and a half to answer, on purpose. A pending state that
        lasts eighty milliseconds cannot be looked at, and a pending state nobody has looked at is
        one nobody has checked. See also{" "}
        <Link to="/lab/states" className="underline decoration-border underline-offset-4">
          the states of a surface
        </Link>
        .
      </p>

      <Specimen
        name="Pending, then confirmed"
        press="Press Interested and watch the button, not the sentence."
        truthful="The button does not move while the write is in flight. It moves when the store has been read back — so a pressed button is a claim about the record, never about a request having been sent."
        wrong="a button that fills in on press. It is showing you the intent and calling it the outcome, and if the write fails it will either revert while you are looking away or stay filled while the database disagrees."
      >
        <Rig entityId="lab-mutation-ok" write="succeeds" />
      </Specimen>

      <Specimen
        name="The write fails"
        press="Press either button. The store throws."
        truthful="Nothing was recorded, and the control says so and then repeats what is still recorded. The retry repeats the position you already chose rather than asking you to choose again."
        wrong="a control that clears, or one that quietly reverts. Both leave a person who looked away believing the opposite of what the record holds."
      >
        <Rig entityId="lab-mutation-throws" write="throws" begins="interested" />
      </Specimen>

      <Specimen
        name="The system refuses"
        press="Press either button. The store declines before writing."
        truthful="A refusal, in the words the action itself gave, followed by what is still true. This is different from a failure: nothing broke, and the system is telling you what it will not do."
        wrong="a generic error. “Something went wrong” describes a fault; this is a limit, and a person who cannot tell them apart will retry something that can never succeed."
      >
        <Rig entityId="lab-mutation-refuses" write="refuses" />
      </Specimen>

      <Specimen
        name="Written, and not shown"
        press="Press Interested. The write succeeds; the read-back throws."
        truthful="The one state that exists only because writing and reading were separated. Your declaration is in the store. This page could not re-read it, so it says the position above may be out of date rather than showing you one it cannot evidence."
        wrong="either neighbour. Reported as a failure, a real declaration is announced as lost. Reported as a success, the control shows a position the page has no evidence for."
      >
        <Rig entityId="lab-mutation-stale" write="succeeds" read="throws" />
      </Specimen>

      <Specimen
        name="Slow, and honest about it"
        press="Press Interested and leave it. Six seconds."
        truthful="Nothing changes tone as the wait lengthens. There is no reassurance, no “almost there”, and no progress bar inventing a proportion of a thing whose duration is unknown. It says the same true sentence for as long as it is true."
        wrong="a progress bar. It would be drawing a fraction out of nothing, which is a fabricated fact about a request in flight."
      >
        <Rig entityId="lab-mutation-slow" write="succeeds" latency={6000} />
      </Specimen>
    </LabFrame>
  );
}
