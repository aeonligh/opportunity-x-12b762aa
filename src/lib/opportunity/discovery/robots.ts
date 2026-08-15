import { retrieve, USER_AGENT, type Transport } from "./fetcher";

/**
 * robots.txt, honoured.
 *
 * ── Why this is not optional ──────────────────────────────────────────────
 *
 * The announcers this engine monitors are universities, ministries and agencies
 * — public institutions with small operations teams and, frequently, modest
 * hosting. A crawler that ignores their stated preferences is not a technical
 * shortcut; it is a product taking from people it claims to serve, and the
 * first thing it costs is the access the whole discovery model depends on.
 *
 * ── Fail closed, with one deliberate exception ────────────────────────────
 *
 * A robots.txt that says nothing, or that does not exist, means no restriction —
 * that is the standard's own reading and treating a 404 as a prohibition would
 * exclude most of the web. But a robots.txt that **could not be read** is
 * different: the site's preferences are unknown, and proceeding would be acting
 * on an assumption in the site owner's own domain. Unreadable is treated as
 * disallowed.
 *
 * ── Scope ─────────────────────────────────────────────────────────────────
 *
 * Path prefix matching with `*` and `$`, longest-match-wins, `Crawl-delay`, and
 * a specific `OpportunityXBot` group taking precedence over `*`. Not implemented:
 * `Sitemap` discovery and `Allow`/`Disallow` on non-path fields. Both are
 * additions rather than corrections — nothing here becomes wrong when they
 * arrive.
 */

const BOT_TOKEN = "opportunityxbot";

export interface RobotsPolicy {
  /** Whether any rules were successfully read. */
  known: boolean;
  /** Seconds the site asked crawlers to wait between requests, if stated. */
  crawlDelaySeconds: number | null;
  allows(pathname: string): boolean;
}

interface Rule {
  pattern: string;
  allow: boolean;
}

/** Unreadable means unknown, and unknown means do not crawl. */
const REFUSE_ALL: RobotsPolicy = {
  known: false,
  crawlDelaySeconds: null,
  allows: () => false,
};

/** No rules is no restriction — the standard's own reading of an absent file. */
const ALLOW_ALL: RobotsPolicy = {
  known: true,
  crawlDelaySeconds: null,
  allows: () => true,
};

export function parseRobots(body: string): RobotsPolicy {
  const lines = body.split(/\r?\n/);

  /*
    Two groups are collected in one pass: the one addressed to this bot by name
    and the wildcard one. A named group replaces the wildcard entirely rather
    than merging with it — that is what the standard means by the most specific
    group applying.
  */
  const groups = new Map<string, Rule[]>();
  const delays = new Map<string, number>();
  let current: string[] = [];
  let lastLineWasAgent = false;

  for (const raw of lines) {
    const line = raw.split("#")[0].trim();
    if (line === "") continue;

    const separator = line.indexOf(":");
    if (separator === -1) continue;

    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === "user-agent") {
      if (!lastLineWasAgent) current = [];
      current.push(value.toLowerCase());
      lastLineWasAgent = true;
      continue;
    }

    lastLineWasAgent = false;
    if (current.length === 0) continue;

    if (field === "disallow" || field === "allow") {
      for (const agent of current) {
        const rules = groups.get(agent) ?? [];
        /* An empty Disallow means "nothing is disallowed" — it is a permission,
           not a rule with an empty pattern that would match everything. */
        if (field === "disallow" && value === "") {
          rules.push({ pattern: "/", allow: true });
        } else {
          rules.push({ pattern: value, allow: field === "allow" });
        }
        groups.set(agent, rules);
      }
      continue;
    }

    if (field === "crawl-delay") {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds >= 0) {
        for (const agent of current) delays.set(agent, seconds);
      }
    }
  }

  const agent = groups.has(BOT_TOKEN) ? BOT_TOKEN : "*";
  const rules = groups.get(agent) ?? [];
  const crawlDelaySeconds = delays.get(agent) ?? delays.get("*") ?? null;

  if (rules.length === 0) {
    return { ...ALLOW_ALL, crawlDelaySeconds };
  }

  return {
    known: true,
    crawlDelaySeconds,
    allows(pathname: string) {
      /* Longest matching pattern wins; Allow beats Disallow at equal length,
         which is the standard's tie-break and the site-owner-friendly one. */
      let best: Rule | null = null;
      for (const rule of rules) {
        if (!matches(rule.pattern, pathname)) continue;
        if (
          best === null ||
          rule.pattern.length > best.pattern.length ||
          (rule.pattern.length === best.pattern.length && rule.allow)
        ) {
          best = rule;
        }
      }
      return best === null ? true : best.allow;
    },
  };
}

function matches(pattern: string, pathname: string): boolean {
  if (pattern === "") return false;

  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const segments = body.split("*");

  let cursor = 0;
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    if (segment === "") continue;

    if (i === 0) {
      if (!pathname.startsWith(segment)) return false;
      cursor = segment.length;
      continue;
    }

    const found = pathname.indexOf(segment, cursor);
    if (found === -1) return false;
    cursor = found + segment.length;
  }

  if (anchored) {
    const tail = segments[segments.length - 1];
    return tail === "" ? true : pathname.endsWith(tail);
  }
  return true;
}

/**
 * Read a host's robots.txt.
 *
 * Cached per origin for the life of a sweep. Re-fetching it before every page
 * would multiply the load on exactly the hosts this is meant to be considerate
 * of.
 */
export async function readRobots(
  origin: string,
  options: { transport?: Transport; cache?: Map<string, RobotsPolicy> } = {},
): Promise<RobotsPolicy> {
  const cached = options.cache?.get(origin);
  if (cached) return cached;

  const exchange = await retrieve(`${origin}/robots.txt`, { transport: options.transport });

  let policy: RobotsPolicy;
  if (exchange.status === 404 || exchange.status === 410) {
    /* Explicitly absent. The site has no preferences to honour. */
    policy = ALLOW_ALL;
  } else if (exchange.body === null) {
    /* Timed out, refused, 500ed. Preferences unknown, so nothing is crawled. */
    policy = REFUSE_ALL;
  } else {
    policy = parseRobots(exchange.body);
  }

  options.cache?.set(origin, policy);
  return policy;
}

export { BOT_TOKEN, USER_AGENT };
