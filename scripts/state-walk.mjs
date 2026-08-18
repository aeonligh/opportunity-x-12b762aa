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
function watch(page, sink) {
  const keep = (text) => !INDUCED.some((r) => r.test(text));
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
    for (const route of LAB) {
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

await browser.close();
console.log(`\n══ ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
