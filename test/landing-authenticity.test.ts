import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * The landing page, held to the same standard as the product behind it.
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 *
 * Every fabrication Phase 21 removed from the public surface had already been
 * removed once. A "94% Match" ring was deleted from `OpportunityGlobe` in an
 * earlier phase, with a careful comment explaining that CR-21 forbids
 * collapsing the mechanisms into a single opaque score. The same number was
 * still on the page in three other shapes: `92%`/`88%`/`84%` in a ranked list
 * three sections down, a second "94% Match" beside a named real programme, and
 * a `verified: true` field on all 33 globe nodes driving a "33 of 33" figure in
 * gradient text.
 *
 * The pattern is the point. A fabricated signal deleted one instance at a time
 * grows back, because the next person to read the file sees a comment saying
 * the problem was handled. A comment cannot fail. These can.
 *
 * ── What is deliberately NOT asserted here ──────────────────────────────────
 *
 * Nothing about tone, length, styling or which words are used to describe the
 * product. This is not a copy linter. Each rule below corresponds to a specific
 * defect that was actually found on this page, and to a claim the system cannot
 * currently support.
 */

const LANDING = "src/routes/index.tsx";
const GLOBE = "src/components/landing/OpportunityGlobe.tsx";

/**
 * Comments stripped, because every rule here is about what a reader sees.
 *
 * This matters more than usual for these files: the removals above were each
 * replaced by a long note quoting the thing that was removed. Without stripping,
 * the notes would trip every rule and the only way to keep the suite green would
 * be to stop writing down why the code is the way it is.
 */
function rendered(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

test("the public surface renders no percentage figure", () => {
  /*
    CR-21: the mechanisms do not collapse into a single opaque score. The
    engine is built so that no such number can exist — eligibility, fit, risk
    and recommendation are separate verdicts with their own evidence. A
    percentage on this page is therefore always invented, whatever it is
    attached to.
  */
  for (const path of [LANDING, GLOBE]) {
    const figures = rendered(path).match(/\d\s*%/g) ?? [];
    assert.deepEqual(
      figures,
      [],
      `${path} renders a percentage: ${figures.join(", ")}. This product computes no such number.`,
    );
  }
});

test("the globe claims no verification it has not performed", () => {
  /*
    `verified: boolean` was hardcoded `true` on all 33 nodes and rendered as a
    green shield per node and a "Verified — 33 of 33" summary. Nothing verified
    anything: `opportunity_observations` holds zero rows and discovery has never
    run against the live web.

    CR-11 makes verification a continuous process with evidence behind it, not
    an attribute a hand-written node is born with. The field is asserted absent
    rather than `false`, because `false` is also a claim — this atlas sits
    outside the verification pipeline entirely.
  */
  const code = rendered(GLOBE);

  assert.doesNotMatch(
    code,
    /\bverified\s*:/,
    "a node in the globe atlas carries a verification field; nothing in this atlas has been verified",
  );

  assert.doesNotMatch(code, />\s*Verified\b/, "the globe renders a Verified badge");
});

test("no control on the public surface is drawn without being wired", () => {
  /*
    "Apply now", "Save" and "Share on WhatsApp" sat under the example card as
    bare `<button>` elements with no handler, no href and no form. Clicking any
    of them did nothing, silently — and "Apply now" is the action the entire
    product exists for.

    A count rather than a per-element parse, deliberately: it is the crude
    version of the rule, but it fails on exactly the change that matters
    (someone adding a button and not wiring it) and it cannot be satisfied by
    wiring one button and leaving three dead.
  */
  for (const path of [LANDING, GLOBE]) {
    const code = rendered(path);
    const buttons = (code.match(/<button[\s>]/g) ?? []).length;
    const handled = (code.match(/onClick=|type="submit"|onSubmit=/g) ?? []).length;
    assert.ok(
      handled >= buttons,
      `${path} draws ${buttons} button(s) but wires ${handled}. A control that cannot act must not look like one.`,
    );
  }
});

test("the public surface does not describe anything as live", () => {
  /*
    Three separate defects on this page were the word "Live" doing work no
    system state supported:

      · "Live Search" in the nav, pointing at `/search` — a route belonging to
        the legacy system, so the landing page's own navigation led out of the
        product.
      · "Live results", over DAAD, Chevening, MEXT and Fulbright presented as
        findings. Discovery has never run; the organisations are real, so a
        reader had no way to tell this from a genuine result.
      · "Live discovery pipeline", over a static list scrubbed by scroll
        position, with a spinner on whichever row the scroll happened to reach.

    Each was introduced separately and each survived a phase that removed one of
    the others. Until discovery actually runs against the live web, nothing on
    this page is live, and the word has no honest use here.
  */
  for (const path of [LANDING, GLOBE]) {
    assert.doesNotMatch(
      rendered(path),
      /\bLive\b/,
      `${path} describes something as live; discovery has never run against the web`,
    );
  }
});
