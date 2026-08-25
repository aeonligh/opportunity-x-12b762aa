import type { EntityReading } from "../entity/types";
import type { SourceClass } from "../observation/types";
import type { StoredVerdict } from "../verification/types";

/**
 * The words, in one place.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY FORMATTING LIVES IN THE PROJECTION AND NOWHERE ELSE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Below this layer, a date is an instant: that is what a comparison needs, what
 * the Ledger row is written from, and what makes two readings of one deadline
 * equal or unequal. Above it, a date is a sentence somebody reads.
 *
 * Every leak found so far went the same way — an instant reaching a sentence.
 * The card said `Closes 2026-09-30T00:00:00.000Z.`; the inspection said
 * `One deadline, 2026-10-09T00:00:00.000Z, stated by 3 retrieval(s)`. Both were
 * projections handing the raw value straight through, and no test was reading
 * the string a person sees.
 *
 * So the conversion happens here, once, and the surfaces call it. Nothing below
 * this file formats, and nothing above it parses.
 *
 * ── Why these are written out rather than delegated ───────────────────────
 *
 * `toLocaleDateString` consults the host's locale and time zone. The same card
 * renders on a server and in a browser, and `shown` is retained as the
 * *delivered* explanation — so a formatter that produced two different
 * sentences for one projection would make the retained record a reconstruction
 * rather than a copy. UTC throughout, for the same reason a published date must
 * not move across midnight for a reader west of Greenwich.
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** `2026-09-30T00:00:00.000Z` → `30 September 2026`. Null if unparseable. */
export function humanDate(iso: string): string | null {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  return `${at.getUTCDate()} ${MONTHS[at.getUTCMonth()]} ${at.getUTCFullYear()}`;
}

/** `…T17:00:00.000Z` → `30 September 2026 at 17:00 UTC`. Null if unparseable. */
export function humanMoment(iso: string): string | null {
  const day = humanDate(iso);
  if (day === null) return null;
  const at = new Date(iso);
  const hh = String(at.getUTCHours()).padStart(2, "0");
  const mm = String(at.getUTCMinutes()).padStart(2, "0");
  return `${day} at ${hh}:${mm} UTC`;
}

/**
 * A date as precisely as the source gave it, and no more.
 *
 * A publisher who wrote "30 September" gets a day; one who wrote 17:00 gets the
 * hour. Rounding the second down to a day would drop something the publisher
 * actually published, and telling someone "closes 4 September" when it closes
 * at nine that morning is the same failure as the midnight bug, pointed the
 * other way.
 */
export function readingDate(reading: Pick<EntityReading, "value" | "precision">): string {
  const formatted =
    reading.precision === "day" ? humanDate(reading.value) : humanMoment(reading.value);
  return formatted ?? reading.value;
}

/**
 * `1 source` / `3 sources`.
 *
 * Exists because the inspection surface said "stated by 3 retrieval(s)", which
 * is a developer writing a plural they did not want to think about, printed to
 * somebody deciding whether to trust the number.
 */
export function count(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/**
 * What kind of page this was, said to a person rather than to a developer.
 *
 * `official` and `announcer` are the distinction the whole verification model
 * turns on — the organisation offering a thing, versus an institution passing it
 * on — and rendering the raw enum put the two most load-bearing words in the
 * product in front of people as jargon.
 */
export function sourceKind(sourceClass: SourceClass): string {
  switch (sourceClass) {
    case "official":
      return "the organisation offering it";
    case "announcer":
      return "an institution announcing it";
    case "aggregator":
      return "a site that collects opportunities";
    case "unknown-domain":
      return "a site I do not recognise";
  }
}

/**
 * A verification change, in a sentence.
 *
 * The inspection surface rendered `unverified → contradicted`, which is the
 * stored enum with an arrow between it. A person reading their own
 * opportunity's history should not have to learn four verdict words and infer
 * what an arrow means between them.
 */
export function transitionWords(from: StoredVerdict | null, to: StoredVerdict): string {
  if (from === null) return firstTime(to);
  if (from === to) return sameAgain(to);

  switch (to) {
    case "verified":
      return "Enough independent sources lined up, so I started calling this real.";
    case "contradicted":
      return "Sources started disagreeing about something decisive, so I stopped calling this real.";
    case "withdrawn":
      return "The sources I was watching stopped answering.";
    case "unverified":
      return "I no longer hold enough corroboration to call this real.";
  }
}

function firstTime(to: StoredVerdict): string {
  switch (to) {
    case "verified":
      return "First established as real, on enough independent sources.";
    case "contradicted":
      return "Seen for the first time, with sources already disagreeing.";
    case "withdrawn":
      return "Seen for the first time, and already gone.";
    case "unverified":
      return "Seen for the first time, and not yet corroborated.";
  }
}

function sameAgain(to: StoredVerdict): string {
  switch (to) {
    case "verified":
      return "Checked again, and still real.";
    case "contradicted":
      return "Checked again, and the sources still disagree.";
    case "withdrawn":
      return "Checked again, and still gone.";
    case "unverified":
      return "Checked again, and still not corroborated.";
  }
}
