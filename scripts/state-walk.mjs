/**
 * The state matrix, verified in a real browser.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THIS IS A SCRIPT AND NOT A PARAGRAPH IN A REPORT
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Every phase before this one verified its states by driving a browser once and
 * writing down what happened. That is evidence about the day it was run and
 * nothing else — the next change cannot be checked against it, and the claim
 * quietly ages into an assumption.
 *
 * Several of Phase 17's findings could only have come from here. The unit suite
 * cannot see that a spinner ran for 57 seconds, that a retry control gives no
 * sign of having been pressed, or that a failed refresh took valid content off
 * the page with it. Those are properties of the assembled application, and they
 * need the assembled application to observe.
 *
 * Requires the dev server on :5173 (`bun run dev`) and Chromium. Run it with
 * `bun run verify:states`.
 */
import { chromium } from "playwright-core";

const EXE = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const BASE = process.env.WALK_BASE ?? "http://localhost:5173";

const VIEWPORTS = [
  { name: "375 phone", width: 375, height: 812 },
  { name: "390 phone", width: 390, height: 844 },
  { name: "768 tablet", width: 768, height: 1024 },
  { name: "1280 desktop", width: 1280, height: 900 },
];

const LAB = ["/lab", "/lab/states", "/lab/faults", "/lab/mutations", "/lab/refresh", "/lab/saved"];

/*
  The product surfaces a browser can reach without a session. `/opportunities`
  and `/saved` are behind the gate and resolve to `/auth`, which is why they are
  exercised in the hydration section rather than here — measuring the sign-in
  page four times over would say nothing new.
*/
const PRODUCT = ["/", "/auth"];

let failures = 0;
const say = (ok, label, detail = "") => {
  if (!ok) failures += 1;
  console.log(
    `  ${ok ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"}  ${label}${detail ? ` — ${detail}` : ""}`,
  );
};
const head = (s) => console.log(`\n── ${s}`);

/**
 * Console noise, minus the faults this suite deliberately causes.
 *
 * `/lab/refresh` exists to make a loader throw. React reports every error its
 * boundaries catch, so the induced fault necessarily appears on the console —
 * suppressing the whole check there would blind it to real errors, and failing
 * on the induced one would make the check permanently red. So the armed fault
 * is named, and only it is excused.
 */
const INDUCED = [
  /The laboratory's refresh probe was armed to fail this read/,
  /Error in route match: \/lab\/refresh/,
];

/**
 * Noise from a dependency, which this repository cannot fix and will not hide.
 *
 * `@react-three/fiber` 9.6.1 instantiates `THREE.Clock`, deprecated in `three`
 * 0.185.1. The landing page's globe is built on `useFrame`, which is the correct
 * r3f API — the warning comes from inside the library, on every load of `/`.
 *
 * Excused by its exact text, one entry, so every other warning on that page is
 * still seen. Silencing the whole check on `/` would be the dishonest option:
 * it would also silence the next real one. Recorded as an open item in the
 * Phase 18 report; clearing it means moving a dependency, which is not an
 * integration-audit decision.
 */
const THIRD_PARTY = [
  /THREE\.Clock: This module has been deprecated/,
  /*
    And one artefact of *this* environment rather than of the product: headless
    Chromium here has no GPU, so the globe renders in software and the driver
    reports a stall. It does not occur on hardware, and excusing it keeps the
    check from going amber depending on how long a page happened to be open.
  */
  /GL Driver Message \(OpenGL, Performance/,
];
function watch(page, sink) {
  const keep = (text) => ![...INDUCED, ...THIRD_PARTY].some((r) => r.test(text));
  page.on("console", (m) => {
    if ((m.type() === "error" || m.type() === "warning") && keep(m.text()))
      sink.push(`${m.type()}: ${m.text().slice(0, 200)}`);
  });
  page.on("pageerror", (e) => {
    if (keep(e.message)) sink.push(`pageerror: ${e.message.split("\n")[0].slice(0, 200)}`);
  });
}

const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });

/* ══════════════════════════════════════════════════════════════════════════
   1. A failed refresh may not erase what was already true
   ══════════════════════════════════════════════════════════════════════════ */
head("A failed refresh does not destroy what was already true");
{
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await c.newPage();
  const noise = [];
  watch(page, noise);

  await page.goto(`${BASE}/lab/refresh`, { waitUntil: "networkidle" });
  const before = (await page.locator("body").innerText()).match(/reading #(\d+)/i);
  say(before !== null, "a reading is on screen before the failure", before?.[0]);

  await page.getByRole("button", { name: /refresh, and fail/i }).click();
  await page.waitForTimeout(1500);

  const body = await page.locator("body").innerText();
  const after = body.match(/reading #(\d+)/i);
  say(
    after !== null,
    "the reading survives the failed refresh",
    after?.[0] ?? "GONE — content destroyed",
  );
  say(
    after?.[0] === before?.[0],
    "and it is the same reading, not a new one",
    `${before?.[0]} → ${after?.[0]}`,
  );
  say(
    (await page
      .locator('[role="status"]')
      .filter({ hasText: /couldn/i })
      .count()) > 0,
    "the failure is reported as a caveat",
  );
  say((await page.locator('[role="alert"]').count()) === 0, "and not escalated to an alert");
  say(!/something went wrong/i.test(body), "the root error boundary did not take the page");

  const dt = await page
    .locator("time[datetime]")
    .first()
    .getAttribute("datetime")
    .catch(() => null);
  say(
    dt !== null && !Number.isNaN(Date.parse(dt)),
    "the preserved content says how old it is",
    String(dt),
  );

  await page
    .getByRole("button", { name: /check again/i })
    .first()
    .click();
  await page.waitForTimeout(1500);
  const back = (await page.locator("body").innerText()).match(/reading #(\d+)/i);
  say(
    back !== null && Number(back[1]) > Number(before[1]),
    "retrying produces a newer reading",
    back?.[0],
  );
  say(
    (await page
      .locator('[role="status"]')
      .filter({ hasText: /couldn/i })
      .count()) === 0,
    "and the caveat clears",
  );
  say(
    noise.length === 0,
    "no console noise beyond the induced fault",
    noise.slice(0, 2).join(" | "),
  );
  await c.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   1b. Hydration integrity on the protected routes
   ══════════════════════════════════════════════════════════════════════════ */
head("A signed-out arrival at a protected route hydrates cleanly");
{
  const PROTECTED = [
    "/opportunities",
    "/saved",
    "/opportunities/examples",
    "/opportunities/abc123",
  ];

  for (const route of PROTECTED) {
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await c.newPage();
    const errs = [];
    const noise = [];
    const docs = [];
    page.on("pageerror", (e) => errs.push(e.message.split("\n")[0]));
    watch(page, noise);
    page.on("request", (r) => {
      if (r.resourceType() === "document") docs.push(r.url());
    });

    await page.goto(BASE + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    /*
      The defect this replaced: the server renders a protected route's pending
      shell on no evidence — it cannot see a session that lives in localStorage —
      and if the client then changed the route while React was still hydrating,
      React found /auth's markup where the server wrote the gate's. Measured
      then: DOMContentLoaded 85ms, redirect 449ms, mismatch every time.
    */
    say(
      errs.filter((e) => /Hydration failed|didn't match/i.test(e)).length === 0,
      `${route}: no hydration mismatch`,
      errs.slice(0, 1).join(" | "),
    );
    say(errs.length === 0, `${route}: no page errors`, errs.slice(0, 1).join(" | "));
    say(noise.length === 0, `${route}: console clean`, noise.slice(0, 1).join(" | "));

    const url = new URL(page.url());
    say(url.pathname === "/auth", `${route}: refused and sent to sign-in`, page.url());
    say(
      url.searchParams.get("next") === route,
      `${route}: deep link carried`,
      String(url.searchParams.get("next")),
    );
    /* Exactly two: the speculative one, and the one the server should have served. */
    say(docs.length === 2, `${route}: settles in two documents, no loop`, `${docs.length}`);
    await c.close();
  }

  /* A query string is part of the destination; dropping it lands them shallower. */
  {
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await c.newPage();
    await page.goto(`${BASE}/opportunities?q=maths&page=2`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    say(
      new URL(page.url()).searchParams.get("next") === "/opportunities?q=maths&page=2",
      "a query-string deep link survives the gate",
      String(new URL(page.url()).searchParams.get("next")),
    );
    await c.close();
  }

  /*
    And after hydration the same redirect must stay an ordinary navigation. If
    the document reload were unconditional, every in-app click into a protected
    route would throw away the running application.
  */
  {
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await c.newPage();
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    let docs = 0;
    page.on("request", (r) => {
      if (r.resourceType() === "document") docs += 1;
    });
    const link = page.locator('a[href^="/opportunities"]').first();
    if ((await link.count()) > 0) {
      await link.click();
      await page.waitForTimeout(2000);
      say(
        docs === 0,
        "a client-side click into a protected route does not reload the document",
        `${docs} document request(s)`,
      );
      say(new URL(page.url()).pathname === "/auth", "and still lands on sign-in", page.url());
    }
    await c.close();
  }

  /* Back from the gate must return to where they came from, not bounce. */
  {
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await c.newPage();
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.goto(`${BASE}/opportunities`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await page.goBack();
    await page.waitForTimeout(1200);
    say(
      new URL(page.url()).pathname === "/",
      "Back from the gate does not bounce off it again",
      page.url(),
    );
    await c.close();
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   2. A session that cannot be checked is not a session that is signed out
   ══════════════════════════════════════════════════════════════════════════ */
head("An unverifiable session, bounded and correctly worded");
{
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await c.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });

  /* An expired token forces a network refresh; if the auth host is unreachable
     that call is the one that used to hang for 57 seconds. */
  await page.evaluate(() => {
    const key =
      Object.keys(localStorage).find((k) => k.startsWith("sb-")) ??
      "sb-anfiojmbgonrtympzjch-auth-token";
    localStorage.setItem(
      key,
      JSON.stringify({
        access_token: "expired.token.value",
        refresh_token: "expired-refresh",
        expires_at: 1,
        expires_in: 0,
        token_type: "bearer",
        user: { id: "00000000-0000-0000-0000-000000000000", aud: "authenticated" },
      }),
    );
  });

  const t0 = Date.now();
  await page.goto(`${BASE}/opportunities`, { waitUntil: "commit" });
  let took = null;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(500);
    if (!/verifying your session/i.test(await page.locator("body").innerText())) {
      took = Date.now() - t0;
      break;
    }
  }

  const reachable = took !== null;
  say(
    reachable,
    "the pending state ends",
    reachable ? `${(took / 1000).toFixed(1)}s` : "NEVER (>20s)",
  );

  if (reachable) {
    const t = await page.locator("body").innerText();
    /* Reachable only when the host really is unreachable. With a live auth
       service the token is simply rejected, which is a genuine signed-out. */
    const unverifiable = /couldn’t check whether you’re signed in/i.test(t);
    if (unverifiable) {
      say(
        took < 15_000,
        "and ends inside a human wait, not a minute",
        `${(took / 1000).toFixed(1)}s`,
      );
      say(
        !/\/auth/.test(page.url()),
        "an unverifiable session is not redirected to sign-in",
        page.url(),
      );
      say(/not a sign that you’ve been signed out/i.test(t), "and is not worded as a sign-out");
    } else {
      say(
        /auth/.test(page.url()),
        "the auth host answered: a real sign-out, correctly redirected",
        page.url(),
      );
    }
  }
  await c.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   2b. Two simultaneous truths must stay two
   ══════════════════════════════════════════════════════════════════════════ */
head("State composition — combinations, not states");
{
  /*
    Phase 17 verified each state alone. These are the pairs, because a pair is
    where a collapse hides: a write that failed over a position that was already
    declared, a preserved page that fails to refresh a second time, an absence
    asked to refresh. Each one has two true things to say at once, and saying
    only one of them is the defect.
  */

  /* ── a failed write over a position that was already declared ─────────── */
  {
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await c.newPage();
    await page.goto(`${BASE}/lab/mutations`, { waitUntil: "networkidle" });

    const rig = page.locator("section").filter({ hasText: /The write fails/ });
    const before = await rig.innerText();
    say(/you said you are|interested/i.test(before), "begins from a declared position", "declared");

    /* Withdraw, against a store rigged to throw. */
    const withdraw = rig.getByRole("button", { name: /forget that i said this/i }).first();
    if ((await withdraw.count()) > 0) {
      await withdraw.click();
      await page.waitForTimeout(2500);
      const after = await rig.innerText();
      say(
        /couldn.t reach|couldn.t keep|failed/i.test(after),
        "the failure is named",
        after.replace(/\s+/g, " ").slice(0, 70),
      );
      /*
        And the other truth, which is the one a lie would drop: the position the
        person had before is still recorded. Reporting only the failure leaves
        them unable to tell whether they are still declared.
      */
      say(
        /you said you are|still|interested/i.test(after),
        "and the previous position is still stated",
      );
      say(
        !/haven.t said either way/i.test(after),
        "a failed write did not become 'never said anything'",
      );
    } else {
      say(false, "the declared specimen offers no control to press");
    }
    await c.close();
  }

  /* ── a write that landed, over a read that did not ────────────────────── */
  {
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await c.newPage();
    await page.goto(`${BASE}/lab/mutations`, { waitUntil: "networkidle" });

    const rig = page.locator("section").filter({ hasText: /Written, and not shown/ });
    const btn = rig.getByRole("button", { name: /interested/i }).first();
    await btn.click();
    await page.waitForTimeout(3000);
    const after = (await rig.innerText()).replace(/\s+/g, " ");

    /*
      Both neighbours are lies here. Called a failure, a real declaration is
      announced as lost; called a success, the control shows a position the page
      has no evidence for.
    */
    say(/recorded/i.test(after), "the write is reported as having landed", after.slice(0, 70));
    say(
      /couldn.t refresh|couldn.t read|may be out of date|what you see above/i.test(after),
      "and the read-back failure is reported too",
    );
    await c.close();
  }

  /* ── a pending write, interrupted by a refresh ────────────────────────── */
  {
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await c.newPage();
    await page.goto(`${BASE}/lab/mutations`, { waitUntil: "networkidle" });

    const rig = page.locator("section").filter({ hasText: /Slow, and honest/ });
    await rig
      .getByRole("button", { name: /interested/i })
      .first()
      .click();
    await page.waitForTimeout(600);
    const mid = (await rig.innerText()).replace(/\s+/g, " ");
    say(/saving|keeping|recording/i.test(mid), "a slow write says it is saving", mid.slice(0, 60));
    /*
      The claim a pending write may not make. Six seconds of "saved" before
      anything was written is the optimistic update this product refuses.
    */
    say(
      !/^.*\bsaved\b(?!.*saving)/i.test(mid) || /saving/i.test(mid),
      "and does not claim it is saved while it is still saving",
    );
    await c.close();
  }

  /* ── a second consecutive refresh failure must not refresh the age ────── */
  {
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await c.newPage();
    await page.goto(`${BASE}/lab/refresh`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /refresh, and fail/i }).click();
    await page.waitForTimeout(1500);
    const firstAge = await page.locator("time[datetime]").first().getAttribute("datetime");
    say(firstAge !== null, "the first failure states an age", String(firstAge));

    /*
      The age must be when the content was last *successfully* read, never
      "now". If a failed re-read bumped it, preserved content would look fresher
      every time the system failed to check it — staleness hidden by the very
      failure that caused it. Watching it sit still across a failure proves
      nothing on its own, because "now" and "the last read" are seconds apart.
      So the age is made to move, by a read that actually succeeds, and then
      checked against a second failure.
    */
    const readingNow = async () =>
      Number(((await page.locator("body").innerText()).match(/reading #(\d+)/i) ?? [])[1] ?? NaN);
    const preserved = await readingNow();

    await page
      .getByRole("button", { name: /check again/i })
      .first()
      .click();
    await page.waitForTimeout(2000);
    const recovered = await readingNow();
    /* The probe's counter is server-side and shared, so the value is compared
       against what this page was actually showing, never against a constant. */
    say(recovered > preserved, "the retry lands a newer reading", `#${preserved} → #${recovered}`);

    await page.getByRole("button", { name: /refresh, and fail/i }).click();
    await page.waitForTimeout(2000);
    say((await readingNow()) === recovered, "which survives the next failure", `#${recovered}`);

    const secondAge = await page.locator("time[datetime]").first().getAttribute("datetime");
    say(
      secondAge !== null && secondAge !== firstAge,
      "and the age tracks the last successful read, not the last attempt",
      `${firstAge} → ${secondAge}`,
    );
    say(
      secondAge !== null && Date.parse(secondAge) > Date.parse(String(firstAge)),
      "moving forward only when a read succeeded",
    );
    await c.close();
  }

  /* ── the refresh caveat must not depend on colour or motion ───────────── */
  for (const [label, opts] of [
    ["reduced motion", { reducedMotion: "reduce" }],
    ["dark", { colorScheme: "dark" }],
    ["light", { colorScheme: "light" }],
  ]) {
    const c = await browser.newContext({ viewport: { width: 375, height: 812 }, ...opts });
    const page = await c.newPage();
    await page.goto(`${BASE}/lab/refresh`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /refresh, and fail/i }).click();
    await page.waitForTimeout(1800);
    const caveat = page
      .locator('[role="status"]')
      .filter({ hasText: /couldn/i })
      .first();
    say((await caveat.count()) > 0, `[${label}] the refresh caveat is stated in words`);
    say(
      /reading #\d+/i.test(await page.locator("body").innerText()),
      `[${label}] over preserved content`,
    );
    /* And it is legible: the text is not the same colour as what is behind it. */
    const contrasty = await caveat.evaluate((el) => {
      const s = getComputedStyle(el);
      return s.color !== s.backgroundColor;
    });
    say(contrasty, `[${label}] and not rendered in its own background colour`);
    await c.close();
  }

  /*
    Loading under reduced motion and dark is verified against the skeleton
    itself, in `test/runtime-integrity.test.ts`, not here. The laboratory's
    routes have no pending component to observe — the skeletons belong to the
    authenticated surfaces — and a browser check written against a page that
    cannot show the state is a check that passes by finding nothing.
  */

  /* ── an absence asked to refresh stays an absence ─────────────────────── */
  {
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await c.newPage();
    await page.goto(`${BASE}/lab/states`, { waitUntil: "networkidle" });
    const before = await page.locator("body").innerText();
    await page.reload({ waitUntil: "networkidle" });
    const after = await page.locator("body").innerText();
    /*
      A refresh must not turn "I looked and found nothing" into "there is
      nothing here yet". The two carry different obligations: one has a time on
      it, the other does not.
    */
    const absentBefore = /searched|nothing .*(currently|right now|qualif)/i.test(before);
    const absentAfter = /searched|nothing .*(currently|right now|qualif)/i.test(after);
    say(absentBefore === absentAfter && absentAfter, "an absence survives a refresh as an absence");
    await c.close();
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   3. The three absences stay three
   ══════════════════════════════════════════════════════════════════════════ */
head("Unknown, absent and empty never collapse into one another");
for (const scheme of ["light", "dark"]) {
  const c = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: scheme,
  });
  const page = await c.newPage();
  const noise = [];
  watch(page, noise);
  await page.goto(`${BASE}/lab/states`, { waitUntil: "networkidle" });
  const t = await page.locator("body").innerText();
  say(
    /can’t|cannot|couldn’t|don’t know/i.test(t),
    `[${scheme}] unknown reads as a limit on the system`,
  );
  say(
    /nothing .*(currently|right now|qualif)|found nothing|searched/i.test(t),
    `[${scheme}] absent reads as a finding about the world`,
  );
  say(
    /haven’t saved|nothing here yet|nothing saved/i.test(t),
    `[${scheme}] empty reads as "nothing yet"`,
  );
  say(noise.length === 0, `[${scheme}] console clean`, noise.slice(0, 2).join(" | "));
  await c.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   4. Every surface, every width, both themes
   ══════════════════════════════════════════════════════════════════════════ */
head("Responsive and quiet across the matrix");
for (const vp of VIEWPORTS) {
  for (const scheme of ["light", "dark"]) {
    const c = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      colorScheme: scheme,
    });
    const page = await c.newPage();
    const noise = [];
    watch(page, noise);
    const overflowed = [],
      blank = [];
    for (const route of [...LAB, ...PRODUCT]) {
      await page.goto(BASE + route, { waitUntil: "networkidle" });
      const m = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
        text: (document.body.innerText || "").trim().length,
      }));
      if (m.scroll > m.client + 1) overflowed.push(`${route} ${m.scroll}>${m.client}`);
      if (m.text < 40) blank.push(route);
    }
    say(
      overflowed.length === 0,
      `[${vp.name} ${scheme}] no horizontal overflow`,
      overflowed.join(", "),
    );
    say(blank.length === 0, `[${vp.name} ${scheme}] every surface rendered`, blank.join(", "));
    say(noise.length === 0, `[${vp.name} ${scheme}] console clean`, noise.slice(0, 2).join(" | "));
    await c.close();
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   4b. No state is conveyed by colour, motion, hover or an icon alone
   ══════════════════════════════════════════════════════════════════════════ */
head("Screen-reader semantics for the states themselves");
{
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await c.newPage();
  await page.goto(`${BASE}/lab/mutations`, { waitUntil: "networkidle" });

  /*
    A declaration is a *position*, and a position rendered only as a filled
    button is invisible to anyone not looking at the fill. `aria-pressed` is what
    carries it, and it must follow what was actually recorded rather than what
    was pressed.
  */
  const pressed = page.locator("button[aria-pressed]");
  say(
    (await pressed.count()) > 0,
    "the declaration control exposes a pressed state",
    `${await pressed.count()} control(s)`,
  );

  const declaredRig = page.locator("section").filter({ hasText: /The write fails/ });
  const on = declaredRig.locator('button[aria-pressed="true"]');
  say(
    (await on.count()) === 1,
    "a declared position reads as pressed to a screen reader",
    `${await on.count()}`,
  );
  /* And the same fact is in the text, not only in the attribute. */
  say(
    /you said you are|this person.s position|interested/i.test(await declaredRig.innerText()),
    "and is also stated in words",
  );

  /* A control that cannot be used says so in the accessibility tree, not by opacity. */
  const slow = page.locator("section").filter({ hasText: /Slow, and honest/ });
  await slow
    .getByRole("button", { name: /interested/i })
    .first()
    .click();
  await page.waitForTimeout(500);
  const busy = await slow.locator("[aria-busy='true'], button[disabled]").count();
  say(
    busy > 0,
    "a write in flight is announced as busy or disabled, not merely dimmed",
    `${busy} element(s)`,
  );

  /* Saving is named in a live region, so the change reaches a screen reader. */
  const live = slow.locator('[aria-live], [role="status"], [role="alert"]');
  say(
    (await live.count()) > 0,
    "the in-flight state sits in a live region",
    `${await live.count()}`,
  );
  const liveText = (
    await live
      .first()
      .innerText()
      .catch(() => "")
  ).replace(/\s+/g, " ");
  say(
    /saving|keeping|recording|second/i.test(liveText),
    "and says what is happening",
    liveText.slice(0, 60),
  );

  await page.waitForTimeout(6500);
  const settledText = (await slow.innerText()).replace(/\s+/g, " ");
  say(
    !/saving/i.test(settledText),
    "and stops saying it once the write has settled",
    settledText.slice(0, 60),
  );
  await c.close();
}

head("Every state distinction survives without colour");
for (const scheme of ["light", "dark"]) {
  const c = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: scheme,
    forcedColors: "active",
  });
  const page = await c.newPage();
  await page.goto(`${BASE}/lab/states`, { waitUntil: "networkidle" });
  const t = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  /*
    Forced colours strips the palette the way a high-contrast mode does. What is
    left has to be the words — if the three absences were told apart by tint,
    they become one state here.
  */
  say(
    /can’t|cannot|couldn’t|don’t know/i.test(t),
    `[${scheme} forced-colors] unknown is still distinguishable`,
  );
  say(
    /nothing .*(currently|right now|qualif)|found nothing|searched/i.test(t),
    `[${scheme} forced-colors] absent is still distinguishable`,
  );
  say(
    /haven’t saved|nothing here yet|nothing saved/i.test(t),
    `[${scheme} forced-colors] empty is still distinguishable`,
  );
  await c.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   5. Keyboard reach and focus visibility
   ══════════════════════════════════════════════════════════════════════════ */
head("Keyboard");
{
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await c.newPage();
  await page.goto(`${BASE}/lab/refresh`, { waitUntil: "networkidle" });

  const controls = await page.locator("a[href], button:not([disabled])").count();
  const seen = new Set();
  const invisible = [];
  for (let i = 0; i < controls + 4; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const ring =
        s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0
          ? "outline"
          : s.boxShadow !== "none"
            ? "box-shadow"
            : null;
      return { tag: el.tagName, label: (el.textContent || "").trim().slice(0, 32), ring };
    });
    if (!info) continue;
    const key = `${info.tag}:${info.label}`;
    if (seen.has(key)) break;
    seen.add(key);
    if (!info.ring) invisible.push(key);
  }
  say(seen.size >= controls, `all ${controls} controls are tab-reachable`, `reached ${seen.size}`);
  say(invisible.length === 0, "every focused control shows an indicator", invisible.join(", "));

  await page.goto(`${BASE}/lab/refresh`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /refresh, and fail/i }).focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
  say(
    /reading #\d+/i.test(await page.locator("body").innerText()),
    "the refresh failure is operable by keyboard, content intact",
  );
  await c.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   6. Reduced motion
   ══════════════════════════════════════════════════════════════════════════ */
head("Reduced motion");
{
  const c = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await c.newPage();
  await page.goto(`${BASE}/lab/states`, { waitUntil: "networkidle" });
  const moving = await page.evaluate(() =>
    [...document.querySelectorAll("*")]
      .filter((el) => {
        const s = getComputedStyle(el);
        return (
          (parseFloat(s.animationDuration) || 0) > 0.02 ||
          (parseFloat(s.transitionDuration) || 0) > 0.02
        );
      })
      .map((el) => `${el.tagName}.${String(el.className).slice(0, 30)}`)
      .slice(0, 5),
  );
  say(moving.length === 0, "nothing animates under prefers-reduced-motion", moving.join(" | "));
  await c.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   7. The whole journey, in one session
   ══════════════════════════════════════════════════════════════════════════ */
head("Arrive → open → inspect → declare → saved → return → reopen → refresh → withdraw");
{
  /*
    Every check above holds one state still and looks at it. This one moves
    through nine of them in a single session, because the failures that matter
    most in an integration phase only appear on the way *between* states: a
    declaration that does not survive a navigation, a withdrawal that leaves the
    saved list stale, an opportunity whose facts change because someone said
    they were interested in it.

    Against the laboratory, deliberately. Nothing here is live-data
    verification: the opportunities are fixtures and say so on every page. What
    is real is the engine underneath them and every state transition above them.

    ── Why it works from whatever state it finds ─────────────────────────────

    The laboratory's declarations live in the development server's memory and
    persist between runs, and some specimens ship already declared. A journey
    that assumed an empty saved list would pass or fail on what a previous run
    happened to leave behind. So it picks a specimen that is *not* currently
    saved, and tracks that one specimen by id the whole way through.
  */
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await c.newPage();
  const noise = [];
  watch(page, noise);

  const specimenIds = async () => [
    ...new Set(
      await page
        .locator('a[href^="/lab/"]')
        .evaluateAll((els) =>
          els
            .map((e) => e.getAttribute("href"))
            .filter((h) => /^\/lab\/[0-9a-f-]{20,}$/.test(h ?? "")),
        ),
    ),
  ];

  /* ── ARRIVE ────────────────────────────────────────────────────────────── */
  await page.goto(`${BASE}/lab`, { waitUntil: "networkidle" });
  say(
    /fixture laboratory/i.test(await page.locator("body").innerText()),
    "ARRIVE: the surface says outright that it is a fixture",
  );
  const listed = await specimenIds();
  say(listed.length > 0, "ARRIVE: opportunities are listed", `${listed.length} specimen(s)`);

  await page.goto(`${BASE}/lab/saved`, { waitUntil: "networkidle" });
  const alreadySaved = new Set(await specimenIds());
  const target = listed.find((href) => !alreadySaved.has(href));
  say(target !== undefined, "ARRIVE: an undeclared specimen is available to walk", String(target));

  /* ── OPEN and INSPECT ──────────────────────────────────────────────────── */
  await page.goto(BASE + target, { waitUntil: "networkidle" });
  say(page.url().endsWith(target), "OPEN: the specimen opens at its own address", target);
  const detail = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  say(
    /source|looked at|observed|retrieved/i.test(detail),
    "INSPECT: the evidence is shown, not just the claim",
  );
  say(
    /what I looked at|said|source/i.test(detail),
    "INSPECT: including what each page actually said",
  );
  say(/fixture/i.test(detail), "INSPECT: and it is still labelled a fixture");

  /*
    The opportunity's own facts: everything on the page except the position
    control, which is the one region a declaration is entitled to change.

    Removing that region rather than filtering its sentences out of the page
    text, because the first attempt did the latter and failed — not on a fact,
    but on the control's own undeclared explainer, its declaration date and its
    withdraw button. Subtracting a state's *words* one regex at a time only ever
    keeps up with the wording; subtracting the element keeps up with the state.

    The exhaustive proof of immutability is the unit test, which compares every
    projected field across the whole corpus. This is the same claim checked
    where a reader would actually see it break.
  */
  const factsOnPage = () =>
    page.evaluate(() => {
      const clone = document.body.cloneNode(true);
      /* The position control itself. */
      for (const span of [...clone.querySelectorAll("span")]) {
        if (/^(your|this person’s) position$/i.test((span.textContent ?? "").trim())) {
          span.parentElement?.remove();
        }
      }
      /*
        And "What happens next", which is advice to this person rather than a
        fact about the opportunity. It gains one line while undeclared —
        explaining what marking Interested would do — and loses it once a
        position exists. That is the declaration correctly changing what the
        product says to *them*; counting it as a fact change would have this
        check report the product working as a defect.
      */
      clone.querySelector("#next")?.closest("section")?.remove();
      clone.querySelector("#next")?.parentElement?.remove();
      return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
    });
  const factsBefore = await factsOnPage();

  /* ── DECLARE ───────────────────────────────────────────────────────────── */
  await page.goto(`${BASE}/lab`, { waitUntil: "networkidle" });
  /* The innermost element holding both the specimen's link and its controls. */
  const cardFor = (id) => page.locator(`div:has(a[href="${id}"]):has(button)`).last();
  const card = cardFor(target);
  const declare = card.locator("button", { hasText: /^INTERESTED$/i }).first();
  say((await declare.count()) > 0, "DECLARE: a position can be taken on that specimen");
  await declare.click();
  await page.waitForTimeout(2500);
  say(
    /you said you are interested/i.test(await card.innerText()),
    "DECLARE: and it is read back from the store, not assumed",
  );

  /* ── SAVED ─────────────────────────────────────────────────────────────── */
  await page.goto(`${BASE}/lab/saved`, { waitUntil: "networkidle" });
  say(
    (await specimenIds()).includes(target),
    "SAVED: that specimen now appears on the saved surface",
    target,
  );

  /* ── RETURN and REOPEN ─────────────────────────────────────────────────── */
  await page.goto(`${BASE}/lab`, { waitUntil: "networkidle" });
  const returned = cardFor(target);
  say(
    /you said you are interested/i.test(await returned.innerText()),
    "RETURN: the position survived leaving the page",
  );

  await page.goto(BASE + target, { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" });
  const reopened = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  say(/you said you are interested/i.test(reopened), "REOPEN: and survived a full document reload");

  /* ── REFRESH: the opportunity's own facts are untouched ────────────────── */
  say(
    (await factsOnPage()) === factsBefore,
    "REFRESH: the facts and evidence are unchanged by the declaration",
  );

  /* ── WITHDRAW ──────────────────────────────────────────────────────────── */
  await page.goto(`${BASE}/lab`, { waitUntil: "networkidle" });
  const toWithdraw = cardFor(target);
  const forget = toWithdraw.locator("button", { hasText: /forget that i said this/i }).first();
  say((await forget.count()) > 0, "WITHDRAW: the position can be taken back");
  await forget.click();
  await page.waitForTimeout(2500);
  say(
    /haven.t said either way|nothing has been said/i.test(await toWithdraw.innerText()),
    "WITHDRAW: the surface returns to having been told nothing",
  );

  await page.goto(`${BASE}/lab/saved`, { waitUntil: "networkidle" });
  say(
    !(await specimenIds()).includes(target),
    "WITHDRAW: and the saved surface is not left holding it",
    target,
  );

  /* And the opportunity is still exactly what it was before any of this. */
  await page.goto(BASE + target, { waitUntil: "networkidle" });
  say(
    (await factsOnPage()) === factsBefore,
    "WITHDRAW: the opportunity survived the whole round trip unchanged",
  );

  say(noise.length === 0, "the whole journey is console-clean", noise.slice(0, 2).join(" | "));
  await c.close();
}

await browser.close();
console.log(`\n══ ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
