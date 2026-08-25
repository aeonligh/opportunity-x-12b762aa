import { createFileRoute } from "@tanstack/react-router";
import { LabFrame } from "@/components/lab/LabFrame";
import { AppShell } from "@/components/shell/AppShell";
import { AccountControl } from "@/components/shell/AccountControl";
import { performSignOut, type SignOutOutcome } from "@/lib/sign-out";

/**
 * `/lab/session` — the session lifecycle, induced.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THE RIG SITS UNDER THE STATE MACHINE, NOT OVER IT
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Each specimen below is the **real** `AccountControl` calling the **real**
 * `performSignOut`. What is substituted is only the pair of calls that machine
 * makes on the network: `signOut` and `readSession`. Nothing here returns a
 * pre-baked outcome, because a laboratory that hands the control a finished
 * answer proves the control can render an answer — not that the product can
 * arrive at one.
 *
 * That matters most for the two outcomes nobody would think to hand-write. A
 * sign-out that *rejects* while the server has already ended the session is a
 * success, and a sign-out that *resolves* while the session is still readable
 * is a failure. Both are decided by the read-back, and both are below.
 *
 * ── Development only ──────────────────────────────────────────────────────
 *
 * There is no server function here to guard, because there is no server: every
 * rig is a local closure and no credential, session or database is involved.
 * The route lives outside `_authenticated` for the same reason the rest of the
 * laboratory does — it must be reachable without a session, since a session is
 * the thing under test. Production ships the chunk and can render nothing from
 * it but these fixtures, which claim to be nothing else.
 *
 * Nothing in production imports this file, and no production path can reach
 * `signOutWith`: it is undefined there, and `AccountControl` falls through to
 * the real Supabase client.
 */
export const Route = createFileRoute("/lab/session")({
  component: SessionLab,
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A session read that answers, one way or the other. */
const present = async () => ({
  user: { id: "lab-person", email: "you@example.test" },
  error: null,
});
const gone = async () => ({ user: null, error: null });
/** A session read that cannot be made at all — the browser never reached the host. */
const unreachable = async () => {
  throw new TypeError("Failed to fetch");
};

function rig(
  signOut: () => Promise<{ error: unknown }>,
  readSession: () => Promise<{ user: unknown; error: unknown }>,
): () => Promise<SignOutOutcome> {
  /* A short deadline so the unverifiable specimen is watchable rather than an
     eight-second wait. Production uses SESSION_CHECK_DEADLINE_MS. */
  return () => performSignOut({ signOut, readSession }, { deadlineMs: 1500 });
}

const RIGS = [
  {
    id: "confirmed",
    name: "Signed out, and confirmed",
    press: "Press Sign out. The request succeeds and the read-back finds no session.",
    truthful:
      "The only outcome that may navigate. Everything this tab remembered is forgotten first, then the gate re-runs and the person lands on /auth.",
    wrong:
      "navigating because the request returned without an error. That is the request, not the answer.",
    rig: rig(async () => ({ error: null }), gone),
  },
  {
    id: "failed",
    name: "The request failed",
    press: "Press Sign out. The request errors and the session is still readable.",
    truthful:
      "Nothing ended. The person stays where they are, is told so plainly, and is offered a retry — because a retry can help here.",
    wrong:
      "“You have been signed out.” Said on a shared machine, that sentence is how somebody else reads your saved opportunities.",
    rig: rig(async () => ({ error: new Error("network") }), present),
  },
  {
    id: "ambiguous",
    name: "The request failed, and the session is gone anyway",
    press: "Press Sign out. The request errors — but the read-back finds no session.",
    truthful:
      "Signed out. The server ended it and the response was lost coming back. The read decides, so this is reported as the success it is.",
    wrong:
      "reporting failure because the call rejected, leaving someone believing they are still signed in when they are not.",
    rig: rig(async () => ({ error: new Error("connection closed") }), gone),
  },
  {
    id: "still-there",
    name: "The request succeeded, and the session did not end",
    press: "Press Sign out. The request returns cleanly and the session is still readable.",
    truthful:
      "Still signed in. A write that reports success while the read disagrees is not a success, and this is the same rule the declaration control has always followed.",
    wrong:
      "believing the request. It is the mirror of the specimen above and it fails the same way.",
    rig: rig(async () => ({ error: null }), present),
  },
  {
    id: "unverifiable",
    name: "I can’t tell whether it worked",
    press: "Press Sign out. The request errors and the session cannot be read at all.",
    truthful:
      "Neither claim is available. The person is told that, and told the one thing that is actually safe to do on a shared machine.",
    wrong:
      "either neighbour. “Still signed in” and “signed out” are both assertions this system has no evidence for.",
    rig: rig(async () => ({ error: new Error("offline") }), unreachable),
  },
  {
    id: "slow",
    name: "Slow, and honest about it",
    press: "Press Sign out and leave it. The request takes three seconds.",
    truthful:
      "The control says it is signing out and cannot be pressed again — one press must not start a second sign-out against a session the first may already have ended.",
    wrong: "a control that looks idle while a session is being ended.",
    rig: rig(async () => {
      await sleep(3000);
      return { error: null };
    }, gone),
  },
] as const;

function SessionLab() {
  return (
    <LabFrame
      title="The session, ending"
      lede="Each control below is the real one, calling the real sign-out machine, with only its two network calls substituted. Press one and watch what the surface is willing to claim before the session has been read back."
      back={{ label: "Laboratory", to: "/lab" }}
    >
      {/*
        The shell itself, rendered once so its layout, navigation and current-page
        marking can be looked at without a session. Its sign-out is rigged to the
        slow success, which is the one worth watching.
      */}
      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
          The authenticated shell
        </h2>
        <p className="max-w-[62ch] text-[13px] leading-relaxed text-text-s">
          Exactly what wraps <code>/opportunities</code>, <code>/saved</code> and every opportunity
          page. Two destinations, an address, and the way out. Nothing else earns a place: see the
          note on CR-13 in <code>AppShell</code>.
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          <AppShell email="you@example.test" signOutWith={RIGS[5].rig}>
            <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
              <p className="max-w-[62ch] text-[14px] leading-relaxed text-text-s">
                Whatever surface you were on renders here. The shell holds the two destinations and
                recedes — it does not stick to the top of the screen, because on a 375px phone that
                would spend a seventh of the viewport permanently on two links.
              </p>
            </div>
          </AppShell>
        </div>
      </section>

      {RIGS.map((r) => (
        <section
          key={r.id}
          data-specimen={r.id}
          className="flex flex-col gap-3 border-b border-border pb-8 last:border-b-0"
        >
          <div className="flex flex-col gap-1">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
              {r.name}
            </h2>
            <p className="max-w-[62ch] text-[13px] leading-relaxed text-text-s">{r.press}</p>
            <p className="max-w-[62ch] text-[14px] leading-relaxed text-foreground">{r.truthful}</p>
            <p className="max-w-[62ch] text-[13px] leading-relaxed text-text-s">
              The version of this that lies: {r.wrong}
            </p>
          </div>
          <div className="rounded-lg border border-border p-5">
            <AccountControl email="you@example.test" signOutWith={r.rig} />
          </div>
        </section>
      ))}

      <section className="flex flex-col gap-2">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
          The states that are not here
        </h2>
        <p className="max-w-[62ch] text-[13px] leading-relaxed text-text-s">
          A session that <span className="text-foreground">expired</span> and a session that
          disappeared <span className="text-foreground">in another tab</span> both arrive as an
          ordinary signed-out answer from the gate, and are demonstrated by the gate rather than
          here. A session that cannot be <span className="text-foreground">verified</span> is the
          gate&rsquo;s third branch and has its own bounded wait. Reproducing them with a rig would
          be showing you this page&rsquo;s opinion of the gate instead of the gate.
        </p>
      </section>
    </LabFrame>
  );
}
