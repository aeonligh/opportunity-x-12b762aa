import { createHash } from "node:crypto";
import type { EntityResolution } from "./types";

/**
 * An entity's id is a digest of the identity it was resolved on.
 *
 * ── Why deterministic, and not a random uuid ──────────────────────────────
 *
 * Entities are **derived**, not stored. Layer 2 must be reconstructible from
 * Layer 1 and may never be the sole record of anything, so the honest
 * implementation reads the append-only observations and folds them into
 * entities on demand.
 *
 * A derivation that minted a fresh uuid each time would produce a different id
 * for the same opportunity on every read, and nothing durable could be keyed
 * against it — verification transitions least of all. So the id is a function
 * of what the entity *is claimed to be*: its resolution method and the key that
 * method matched on.
 *
 * The pleasing consequence is that the id stops being an opaque handle. Two
 * entities share an id exactly when they were resolved on the same identity, and
 * a changed id means the identity claim changed — which is information rather
 * than noise.
 *
 * ── Why the key already carries the cycle ─────────────────────────────────
 *
 * `group.ts` builds the key as `signal#cycle` where a cycle was declared. Two
 * rounds of one programme therefore get different ids from the same identifier,
 * which is correct: they are two opportunities a person applies to separately,
 * and an engine that gave them one id would let next year's deadline overwrite
 * this year's.
 *
 * ── Why the method is part of the digest ──────────────────────────────────
 *
 * The same key can be matched on by different methods, and they are not the
 * same claim. "These observations share a URL" and "an operator decided these
 * describe one programme" happen to agree here and may not next time. Folding
 * the method in keeps an operator's decision distinguishable from a rule that
 * fired, which is the whole reason `EntityResolution.method` is a closed union.
 *
 * ── Runtime ───────────────────────────────────────────────────────────────
 *
 * `node:crypto` rather than Web Crypto, because `crypto.subtle.digest` is
 * async and entity resolution is a pure synchronous fold. The engine runs
 * server-side — a crawler process or a server component — so this is the
 * correct constraint to accept rather than work around.
 */

/** Format 32 hex characters as a UUID, so the value fits a `uuid` column. */
function asUuid(hex: string): string {
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    /* Version 8: a name-based UUID from a scheme this application defines. */
    `8${hex.slice(13, 16)}`,
    /* Variant bits, per RFC 4122. */
    ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join("-");
}

export interface EntityIdentity {
  method: EntityResolution["method"];
  /** What the method matched on. A URL, a canonical URL, an operator's label. */
  key: string;
}

/**
 * The namespace every entity id is derived under.
 *
 * Changing this string changes the id of every opportunity that would ever be
 * resolved, which is why it is written out here rather than inlined: it is a
 * one-time decision. It was `aeon-x:` — a namespace belonging to a different
 * product — and it was changed at the only moment that was free, while nothing
 * had ever been discovered and no id had ever been stored. Once a single
 * observation exists, editing this line silently orphans every entity derived
 * before it, and the append-only record cannot be migrated back.
 */
const ID_NAMESPACE = "opportunity-x:opportunity-entity";

export function entityIdFor(identity: EntityIdentity): string {
  const digest = createHash("sha256")
    .update(`${ID_NAMESPACE}:${identity.method}:${identity.key}`)
    .digest("hex");
  return asUuid(digest);
}
