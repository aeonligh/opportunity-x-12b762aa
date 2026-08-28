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

/* ══════════════════════════════════════════════════════════════════════════
   Social identity
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The two official AEON X profiles, exactly as supplied by the owner.
 *
 * Held as literals here rather than imported from the page, deliberately. A
 * test that reads its expected value out of the file it is checking cannot
 * fail — that mistake was made once already in Phase 22, where a quotation
 * assertion compared the corpus against itself and a mutation walked straight
 * through it. These are the destinations somebody with the authority to say so
 * gave, written down independently, so editing the page cannot edit the
 * standard the page is held to.
 */
const AEON_X_LINKEDIN =
  "https://www.linkedin.com/in/aeon-x-technologies-aa8311426?utm_content=profile&utm_medium=member_android&utm_source=chatgpt.com";
const AEON_X_FACEBOOK =
  "https://www.facebook.com/profile.php?id=61591914496671&utm_source=chatgpt.com";

test("the only social accounts on the public surface are the official AEON X ones", () => {
  /*
    This page shipped `linkedin.com/company/opportunity-x` and
    `facebook.com/opportunityx`, labelled as Opportunity X's own accounts.
    Neither exists. They were plausible strings assembled from the product
    name, which is the same fabrication as a "94% Match" — a confident,
    checkable-looking claim with nothing behind it — except that this one was
    clickable and sat in the footer of every page.

    Asserted as a closed set, not as "the real ones are present". A rule that
    only checks for the presence of the correct URLs is satisfied by a page
    that lists them alongside three invented ones.
  */
  const code = rendered(LANDING);
  const external = [...code.matchAll(/https?:\/\/[^"'`\s)]+/g)].map((m) => m[0]);

  assert.deepEqual(
    external.sort(),
    [AEON_X_LINKEDIN, AEON_X_FACEBOOK].sort(),
    `the landing page links out to something other than the official AEON X profiles: ${external.join(", ")}`,
  );
});

test("no invented handle survives anywhere on the public surface", () => {
  /*
    The specific strings, by name. Removing a link from the footer while
    leaving the handle in a constant, a comment-free helper, or a second
    component is how half a correction ships.
  */
  for (const path of [LANDING, GLOBE]) {
    const code = rendered(path);
    for (const invented of [
      /linkedin\.com\/company\/opportunity-x/i,
      /facebook\.com\/opportunityx/i,
      /twitter\.com\/\w/i,
      /(?<!\/)x\.com\/\w/i,
      /instagram\.com\/\w/i,
      /tiktok\.com\/@/i,
      /youtube\.com\/@/i,
    ]) {
      assert.equal(
        invented.test(code),
        false,
        `${path} carries a social destination that was never supplied: ${invented}`,
      );
    }
    /* And no dead placeholder dressed as an account. */
    assert.equal(
      /aria-label=\{?[`"'][^`"']*on (LinkedIn|Facebook|X|Instagram)[^`"']*[`"']\}?[\s\S]{0,200}href="#"/.test(
        code,
      ),
      false,
      `${path} draws a social link that goes nowhere`,
    );
  }
});

test("the official accounts are attributed to AEON X, not to the product", () => {
  /*
    Opportunity X is the product; AEON X is the parent company that owns these
    profiles. The accessible name said "Opportunity X on LinkedIn", which
    attributed a real company's account to a product that does not have one —
    and gave a screen-reader user the false attribution with none of the visual
    context that might have corrected it.

    The product is deliberately NOT renamed: the wordmark and the metadata
    still say Opportunity X, and this asserts that too, so a later over-correction
    cannot rebrand the whole surface to the parent company.
  */
  const code = rendered(LANDING);

  assert.match(
    code,
    /aria-label=\{`\$\{AEON_X\} on \$\{s\.label\}`\}/,
    "the social links no longer name their owner in their accessible name",
  );
  assert.match(code, /const AEON_X = "AEON X"/, "the parent company name is not declared");
  assert.equal(
    /aria-label=\{`Opportunity X on /.test(code),
    false,
    "a social account is attributed to the product again",
  );

  /* The product keeps its own name where the product is what is being named. */
  assert.match(code, /OPPORTUNITY <span className="text-accent">X<\/span>/);
});

test("every outbound account link opens safely and can be reached by keyboard", () => {
  /*
    `target="_blank"` without `rel="noopener"` hands the opened tab a live
    `window.opener` handle back into this page. `noreferrer` keeps the
    destination from being told which page sent the visitor.

    The focus ring matters here more than usual: the lift and glow on these
    cards are driven by `onMouseEnter`/`onMouseLeave`, which a keyboard never
    fires. Before this, tabbing through the footer moved through two links with
    no visible indication of which was selected.
  */
  const code = rendered(LANDING);
  const start = code.indexOf("{socials.map(");
  assert.ok(start > 0, "the social links are no longer rendered from one list");
  const anchor = code.slice(start, code.indexOf("</a>", start));

  assert.match(anchor, /target="_blank"/);
  assert.match(anchor, /rel="noopener noreferrer"/, "an outbound link opens without noopener");
  /*
    The focus ring is asserted as an `onFocus` handler setting `outline`, not
    as a Tailwind class, because two Tailwind spellings of this ring were
    measured producing nothing on screen: `focus-visible:ring-2` is a
    box-shadow and is overwritten by this element's inline hover glow, and
    both `focus-visible:outline-2` and the arbitrary
    `focus-visible:[outline:2px_solid_var(--accent)]` computed to
    `outline: solid 0px` — right colour, no width.

    Both looked correct in the source. A test asserting the class name would
    have passed on a footer with no visible focus indicator at all, which is
    why this pins the mechanism a browser was observed honouring.
  */
  assert.match(anchor, /onFocus=\{/, "the outbound links have no keyboard focus handler");
  assert.match(
    anchor,
    /style\.outline = "2px solid var\(--accent\)"/,
    "the focus handler does not draw an outline",
  );
  assert.match(anchor, /onBlur=\{/, "the focus outline is never cleared");
  /*
    And the ring is immediate. The class list carries `transition-all
    duration-300`, which animates every animatable property including
    `outline-width` — measured, the computed outline read `solid 0px`, then
    `solid 1px`, and only reached 2px a third of a second after the focus. A
    focus indicator that fades in is one a person moving down a keyboard path
    out-runs, so the transition is narrowed to the properties the hover state
    actually needs.
  */
  assert.match(
    anchor,
    /transitionProperty: "transform, box-shadow, border-color, background-color"/,
    "the focus outline is being animated again, so it arrives after the focus does",
  );
  assert.equal(
    /focus-visible:ring/.test(anchor),
    false,
    "the focus ring is a box-shadow again, which the inline hover glow overrides",
  );
  /* A real anchor with a real destination — not a div with a click handler. */
  assert.match(anchor, /href=\{s\.href\}/);
});
