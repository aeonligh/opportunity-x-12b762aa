import {
  IDENTITY_STRENGTH,
  isRetrieved,
  type IdentitySignal,
  type ObservedItem,
  type SourceObservation,
} from "../observation/types";
import type { EntityIdentity } from "./identity";

/**
 * Deciding which observed items describe the same opportunity.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * URL IDENTITY FAILS IN BOTH DIRECTIONS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * **Many URLs, one opportunity.** A federal scholarship is announced on the
 * ministry's site, on three university sites, and on the application portal.
 * Grouping by URL produces five entities, none of which is corroborated by the
 * others — so a well-announced opportunity looks like five unverified ones, and
 * the corroboration that should have verified it is exactly what was thrown
 * away.
 *
 * **One URL, many opportunities.** A programme page serves successive cycles at
 * a stable address, and a news page carries two calls at once. Grouping by URL
 * merges them, so next year's deadline overwrites this year's and a person is
 * told to apply by a date that belongs to a different round.
 *
 * A resolver with only a URL cannot avoid both. It has to be given something
 * better where the publisher declared something better — and told plainly when
 * it has nothing.
 *
 * ── The line: declarations decide, resemblances propose ───────────────────
 *
 * Every signal this module acts on is **declared by the publisher**: a
 * schema.org `identifier`, a `<link rel="canonical">`, an `og:url`, a declared
 * cycle. None is inferred from similarity of title, filename, or wording.
 *
 * Resemblances are not ignored — they are emitted as **merge candidates**, with
 * the evidence for and against, and no decision. That is what makes the
 * unresolved case visible instead of invisible, and it is why
 * `operator-decision` exists in the resolution method union. A resolver that
 * merged on a matching title would eventually merge two cycles of one
 * programme, and a resolver that ignored the resemblance entirely would leave
 * nobody able to find it.
 *
 * ── Where cycles come from ────────────────────────────────────────────────
 *
 * Only from a declaration. "2026/2027" appearing in a title is a string in a
 * name, not a statement that this is the 2026/2027 round. Where a cycle is
 * declared, two items at one URL separate into two entities. Where it is not,
 * they stay one entity holding readings that disagree — which is the honest
 * reading, because "the deadline moved" and "this is next year's round" are
 * indistinguishable without a declaration, and guessing rewrites the record
 * either way.
 */

export interface GroupedItem {
  observation: SourceObservation;
  item: ObservedItem;
}

export interface ResolutionGroup {
  identity: EntityIdentity;
  /** Every item folded into this group, with the observation it came from. */
  members: GroupedItem[];
  /** Why these are one opportunity, in a sentence someone could disagree with. */
  rationale: string;
}

/**
 * Two groups that may be one opportunity, with no decision made.
 *
 * `because` is the evidence for; `against` is what stops it being acted on.
 * Both are required — a candidate without a stated objection is really a
 * proposal to merge, and this module does not make those.
 */
export interface MergeCandidate {
  keys: [string, string];
  because: string[];
  against: string[];
  readonly status: "unresolved";
}

/** The strongest signal available for an item, page identity included. */
export function strongestSignal(
  item: ObservedItem,
  pageIdentity: readonly IdentitySignal[],
): IdentitySignal {
  const all = [...item.identity, ...pageIdentity];

  for (const kind of IDENTITY_STRENGTH) {
    const found = all.find((s) => s.kind === kind);
    if (found) return found;
  }

  /*
    Unreachable in practice: `witness` always appends the page URL. Kept as a
    real branch rather than a non-null assertion, because "an item with no
    identity at all" should fail loudly if it ever becomes possible, not resolve
    into some other opportunity's group.
  */
  throw new Error("An observed item carried no identity signal, not even a page URL.");
}

const METHOD_FOR: Record<IdentitySignal["kind"], EntityIdentity["method"]> = {
  "declared-identifier": "declared-identifier",
  "canonical-url": "canonical-url",
  "page-url": "same-url",
};

const STRENGTH_LABEL: Record<IdentitySignal["kind"], string> = {
  "declared-identifier": "the publisher’s own identifier",
  "canonical-url": "a declared canonical URL",
  "page-url": "the page URL alone, which is the weakest identity there is",
};

export function identityFor(
  item: ObservedItem,
  pageIdentity: readonly IdentitySignal[],
): EntityIdentity {
  const signal = strongestSignal(item, pageIdentity);
  return {
    method: METHOD_FOR[signal.kind],
    /* The cycle is part of the identity, not a property of it. Two cycles of
       one programme are two opportunities a person applies to separately. */
    key: item.cycle ? `${signal.value}#${item.cycle}` : signal.value,
  };
}

/**
 * Fold every observed item into groups.
 *
 * Deliberately not keyed by observation or by URL. An observation contributes
 * as many members as it carried items, and one item can join a group first
 * reached through a different URL entirely.
 */
export function groupObservations(observations: readonly SourceObservation[]): {
  groups: ResolutionGroup[];
  candidates: MergeCandidate[];
} {
  const byKey = new Map<string, ResolutionGroup>();

  for (const observation of observations) {
    if (!isRetrieved(observation)) continue;

    for (const item of observation.items) {
      const identity = identityFor(item, observation.pageIdentity);
      const signal = strongestSignal(item, observation.pageIdentity);
      const existing = byKey.get(identity.key);

      if (existing) {
        existing.members.push({ observation, item });
        continue;
      }

      byKey.set(identity.key, {
        identity,
        members: [{ observation, item }],
        rationale: item.cycle
          ? `Resolved on ${STRENGTH_LABEL[signal.kind]}, for the declared cycle "${item.cycle}".`
          : `Resolved on ${STRENGTH_LABEL[signal.kind]}.`,
      });
    }
  }

  const groups = [...byKey.values()].map((group) => ({
    ...group,
    rationale:
      group.members.length > 1
        ? `${group.rationale} ${group.members.length} observed item(s) across ${
            new Set(group.members.map((m) => m.observation.url)).size
          } URL(s).`
        : group.rationale,
  }));

  return { groups, candidates: proposeMerges(groups) };
}

/**
 * Groups that resemble each other, offered and not acted on.
 *
 * Two signals are used, and neither is allowed to decide:
 *
 *   * **The same declared application URL.** Strong — the publisher pointing
 *     two announcements at one place to apply. Not decisive, because successive
 *     cycles of a programme routinely share an application portal, and merging
 *     on it would fuse two rounds a person applies to separately.
 *
 *   * **The same title and organiser.** Weak. It is the FINAL-versus-corrected
 *     case: two documents of one advert with no declared identifier between
 *     them. Merging on wording would also merge two genuinely different
 *     opportunities that happen to be called "Postgraduate Scholarship".
 *
 * A candidate is a request for a decision, not a decision deferred. If nobody
 * ever acts on one, the corpus is over-split — and over-splitting is the safe
 * failure: a duplicate is visible and correctable, a wrong merge silently pools
 * claims from two different opportunities and reports agreement that never
 * existed.
 */
function proposeMerges(groups: readonly ResolutionGroup[]): MergeCandidate[] {
  const candidates: MergeCandidate[] = [];

  for (let i = 0; i < groups.length; i += 1) {
    for (let j = i + 1; j < groups.length; j += 1) {
      const a = groups[i];
      const b = groups[j];

      const because: string[] = [];

      const applyA = valuesOf(a, "how-to-apply");
      const applyB = valuesOf(b, "how-to-apply");
      const sharedApply = [...applyA].filter((v) => applyB.has(v));
      if (sharedApply.length > 0) {
        because.push(`Both declare the same place to apply: ${sharedApply[0]}`);
      }

      const titleA = valuesOf(a, "title");
      const titleB = valuesOf(b, "title");
      const sharedTitle = [...titleA].filter((v) => titleB.has(v));
      const organiserA = valuesOf(a, "organiser");
      const organiserB = valuesOf(b, "organiser");
      const sharedOrganiser = [...organiserA].filter((v) => organiserB.has(v));
      if (sharedTitle.length > 0 && sharedOrganiser.length > 0) {
        because.push(`Identical title and organiser: "${sharedTitle[0]}" by ${sharedOrganiser[0]}`);
      }

      if (because.length === 0) continue;

      const against: string[] = [];

      const cycleA = cycleOf(a);
      const cycleB = cycleOf(b);
      if (cycleA && cycleB && cycleA !== cycleB) {
        against.push(
          `Different declared cycles (${cycleA} and ${cycleB}). These are separate rounds a person applies to separately.`,
        );
      }

      const idA = declaredIdentifier(a);
      const idB = declaredIdentifier(b);
      if (idA && idB && idA !== idB) {
        against.push(
          `The publisher gave them different identifiers (${idA} and ${idB}), which is a statement that they are not the same thing.`,
        );
      }

      if (against.length === 0) {
        against.push(
          "No declaration links them. Merging on resemblance alone would eventually fuse two opportunities that merely read alike.",
        );
      }

      candidates.push({
        keys: [a.identity.key, b.identity.key],
        because,
        against,
        status: "unresolved",
      });
    }
  }

  return candidates;
}

function valuesOf(group: ResolutionGroup, field: string): Set<string> {
  const values = new Set<string>();
  for (const { item } of group.members) {
    for (const claim of item.claims) {
      if (claim.field === field) values.add(claim.normalised ?? claim.asStated);
    }
  }
  return values;
}

function cycleOf(group: ResolutionGroup): string | null {
  return group.members.find((m) => m.item.cycle)?.item.cycle ?? null;
}

function declaredIdentifier(group: ResolutionGroup): string | null {
  for (const { item } of group.members) {
    const declared = item.identity.find((s) => s.kind === "declared-identifier");
    if (declared) return declared.value;
  }
  return null;
}
