/**
 * Tier 0 — the trust primitives.
 *
 * Component System §01: "Tier 0 carries truth about a fact. Everything above it
 * composes Tier 0." CS §14 requires these ship as a published package consumed
 * by every product on every origin — "copied primitives become four different
 * trust models within a year." This barrel is the seam that package will follow.
 */
export { EvidenceLine } from "./EvidenceLine";
export { BaseRateLine } from "./BaseRateLine";
export { SourceTag } from "./SourceTag";
export { Finding } from "./Finding";
export { InspectionPath } from "./InspectionPath";
export { ProvenanceChip, type ProvenanceTier } from "../ProvenanceChip";
export { FreshnessStamp, type DecayClass } from "../FreshnessStamp";
