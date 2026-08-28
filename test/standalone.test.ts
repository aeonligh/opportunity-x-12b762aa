import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * OPPORTUNITY X SPEAKS AS ITSELF
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Opportunity X and AEON X are sibling products. This repository is the whole
 * of Opportunity X: it has to be runnable, readable and deployable by someone
 * who has never heard of the other one.
 *
 * The engine was written inside AEON X and carried its voice across. That was
 * invisible in every test — the sentences were well-formed, the judgments were
 * correct, and nothing type-checks differently because a string names the wrong
 * product. It surfaced only when a page was actually rendered and read, which
 * is the worst possible detection mechanism: it means the copy is wrong for
 * exactly as long as nobody looks.
 *
 * So it is asserted here instead. The engine speaks in the first person when it
 * is talking about its own reasoning — "I have not established whether this is
 * real" — and names itself only when a sentence genuinely needs a subject.
 * Neither of those is "AEON X".
 *
 * ── Why comments are exempt ───────────────────────────────────────────────
 *
 * Because only strings reach a person. A comment recording *why* a namespace
 * changed is a note to the next engineer and is worth keeping — the history is
 * the reason the decision is legible. What must never ship is a sentence in the
 * product that credits another product.
 */

const FOREIGN = [/AEON\s?X/i, /\baeonx/i, /Next Best Step/i, /\bTier\s?0\b/i] as const;

/**
 * The one place the parent company may be named, and the only shape it may
 * take there.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * A CORRECTED PREMISE, NOT A SUPPRESSED RULE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The rule above was written on the understanding that Opportunity X and AEON
 * X are *sibling* products, in which case naming the other one anywhere in
 * this product is always wrong. The owner has since stated the actual
 * relationship: AEON X is the **parent company**, and the official LinkedIn
 * and Facebook profiles belong to it rather than to the product.
 *
 * That makes exactly one use correct — attributing those two accounts to their
 * real owner in the footer — and leaves every other use exactly as wrong as it
 * was. The landing page previously shipped `linkedin.com/company/opportunity-x`
 * and `facebook.com/opportunityx`, two accounts that do not exist, precisely
 * because the blanket rule left no way to say who the real ones belonged to.
 *
 * So the ban is narrowed rather than lifted, and narrowed twice over:
 *
 *   · only in `src/routes/index.tsx`, the file that carries the footer, and
 *   · only through the `AEON_X` constant — a bare "AEON X" string literal
 *     anywhere in that file, including in the footer, still fails.
 *
 * The second half is what keeps this honest. An exception phrased as "this
 * file may say AEON X" would let the engine's voice back in through the
 * landing page's own copy; an exception phrased as "this file may reference
 * one declared constant" cannot, because the constant has one declaration and
 * `no shipped string names another product beyond one attributed constant`
 * below pins it to that.
 */
const PARENT_COMPANY_FILE = "src/routes/index.tsx";
const PARENT_COMPANY_DECLARATION = 'const AEON_X = "AEON X";';

function isAttributedParentCompany(file: string, text: string): boolean {
  if (file !== PARENT_COMPANY_FILE) return false;
  if (text.trim() === PARENT_COMPANY_DECLARATION) return true;
  /* A reference to the constant, never a literal spelling of the name. */
  return /\{AEON_X\}|\$\{AEON_X\}/.test(text) && !/["'`][^"'`]*AEON\s?X/i.test(text);
}

/** Every `.ts`/`.tsx` under `src/`, generated route tree excluded. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!/\.tsx?$/.test(entry.name)) return [];
    if (entry.name === "routeTree.gen.ts") return [];
    return [path];
  });
}

/**
 * The file with its comments removed.
 *
 * Deliberately a scanner rather than a regex: stripping `/* ... *\/` with a
 * single pattern across a whole file mishandles a `//` inside a string and a
 * `/*` inside a line comment, and a comment stripper that silently eats real
 * code would make this test pass by blinding it.
 */
function withoutComments(source: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  let inBlock = false;

  source.split("\n").forEach((line, index) => {
    let text = "";
    let i = 0;

    while (i < line.length) {
      if (inBlock) {
        const end = line.indexOf("*/", i);
        if (end === -1) i = line.length;
        else {
          inBlock = false;
          i = end + 2;
        }
        continue;
      }

      const block = line.indexOf("/*", i);
      const lineComment = line.indexOf("//", i);

      if (block !== -1 && (lineComment === -1 || block < lineComment)) {
        text += line.slice(i, block);
        inBlock = true;
        i = block + 2;
      } else if (lineComment !== -1) {
        text += line.slice(i, lineComment);
        i = line.length;
      } else {
        text += line.slice(i);
        i = line.length;
      }
    }

    if (text.trim()) out.push({ line: index + 1, text });
  });

  return out;
}

test("no shipped string names another product", () => {
  const offences: string[] = [];

  for (const file of sourceFiles("src")) {
    for (const { line, text } of withoutComments(readFileSync(file, "utf8"))) {
      if (isAttributedParentCompany(file, text)) continue;
      for (const term of FOREIGN) {
        if (term.test(text)) {
          offences.push(`${file}:${line}  ${text.trim().slice(0, 100)}`);
          break;
        }
      }
    }
  }

  assert.deepEqual(
    offences,
    [],
    `Opportunity X shipping another product's vocabulary:\n${offences.join("\n")}`,
  );
});

test("the parent company is named once, as a constant, in one file", () => {
  /*
    The exception above is only as narrow as this makes it. Without this, the
    scanner would happily accept a second `const AEON_X` in another module, or
    the constant being widened into a general-purpose brand string that the
    engine's own sentences start reaching for.

    Counted over the whole of `src/`, comments included — a comment recording
    why the namespace changed is still exempt from the *shipping* rule above,
    but a second literal spelling of the name in code is the thing worth
    catching early, wherever it appears.
  */
  const declarations: string[] = [];
  for (const file of sourceFiles("src")) {
    for (const { line, text } of withoutComments(readFileSync(file, "utf8"))) {
      if (/["'`][^"'`]*AEON\s?X/i.test(text)) declarations.push(`${file}:${line}  ${text.trim()}`);
    }
  }

  assert.deepEqual(
    declarations,
    [`${PARENT_COMPANY_FILE}:${declarationLine()}  ${PARENT_COMPANY_DECLARATION}`],
    `the parent company name is spelled out somewhere new:\n${declarations.join("\n")}`,
  );
});

function declarationLine(): number {
  const found = withoutComments(readFileSync(PARENT_COMPANY_FILE, "utf8")).find(
    ({ text }) => text.trim() === PARENT_COMPANY_DECLARATION,
  );
  assert.ok(found, `${PARENT_COMPANY_FILE} no longer declares the parent company name`);
  return found.line;
}

test("the crawler identifies as Opportunity X to the sites it reads", async () => {
  /*
    A crawler's user agent is the one thing a site operator sees, and it is what
    a robots.txt group is written against. Identifying as another product would
    ask publishers to allowlist a name that does not describe who is asking —
    and the robots token has to match it, or a rule written for this crawler
    would silently never apply to it.
  */
  const { USER_AGENT } = await import("@/lib/opportunity/discovery/fetcher");

  assert.match(USER_AGENT, /^OpportunityXBot\//);
  assert.doesNotMatch(USER_AGENT, /aeon/i);

  const robots = readFileSync("src/lib/opportunity/discovery/robots.ts", "utf8");
  assert.match(robots, /const BOT_TOKEN = "opportunityxbot"/);
  assert.match(
    USER_AGENT.toLowerCase(),
    /opportunityxbot/,
    "the robots token must be a token the user agent actually presents",
  );
});

test("sign-in lands somewhere that exists", async () => {
  /*
    `AUTH_LANDING_PATH` pointed at `/workspace` after those routes were deleted,
    which is a 404 at the one moment a person has just proved who they are. The
    landing path and every capturable destination are checked against the routes
    the router was actually generated with, so deleting a route cannot leave
    this pointing into space again.
  */
  const { AUTH_LANDING_PATH, safeRedirectPath } = await import("@/lib/safe-redirect");
  const routeTree = readFileSync("src/routeTree.gen.ts", "utf8");

  assert.ok(
    routeTree.includes(`'${AUTH_LANDING_PATH}'`) || routeTree.includes(`"${AUTH_LANDING_PATH}"`),
    `${AUTH_LANDING_PATH} is not a route in the generated tree`,
  );

  /* And it is still closed to anything off-origin. */
  for (const hostile of [
    "https://evil.example/opportunities",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
  ]) {
    assert.equal(safeRedirectPath(hostile), AUTH_LANDING_PATH, `let through: ${hostile}`);
  }

  /* A real in-product destination survives, which is the point of capturing it. */
  assert.equal(safeRedirectPath("/opportunities/abc"), "/opportunities/abc");
  assert.equal(safeRedirectPath("/saved"), "/saved");
});
