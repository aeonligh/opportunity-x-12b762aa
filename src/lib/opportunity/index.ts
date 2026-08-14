/**
 * The Opportunity engine.
 *
 * Three layers, kept apart on purpose:
 *
 *   observation/   what was seen, when, where. Append-only. Immutable.
 *   entity/        what Opportunity X believes the opportunity is. Revisable.
 *   judgment/      what it means for one person. Recomputed; time-varying.
 *
 * With verification between layers 2 and 3 — a property of the entity, never of
 * the pairing — and recommendation on top, which turns judgments into the one
 * thing to do next or honestly declines to.
 *
 * `announcers/` is the enumerable set the discovery layer monitors. `monitors.ts`
 * holds the rates that detect the degradations which present as improvements.
 *
 * Read `docs/constitutional/opportunity-engine.md` for the derivation of the
 * layer model and the classification of every open question against it.
 */

export * from "./observation/types";
export { witness, type CompletedExchange, type ClaimExtractor } from "./observation/record";
export { InMemoryObservationStore } from "./observation/store";
export { jsonLdExtractor } from "./observation/extractors/json-ld";

export * from "./announcers/registry";

export * from "./entity/types";
export { entityIdFor, type EntityIdentity } from "./entity/identity";
export { resolveEntity, reviseEntity, type ResolveInput, type ResolveResult } from "./entity/resolve";

export * from "./verification/types";
export {
  establishVerification,
  resolveVerification,
  deriveOpenState,
  hasEverDeverified,
} from "./verification/service";
export { InMemoryVerificationLog, foldEvents, type VerificationLog } from "./verification/log";

export { deriveCorpus, deriveStakes, type Corpus } from "./corpus";

export { retrieve, USER_AGENT, DEFAULT_LIMITS, type Transport } from "./discovery/fetcher";
export { parseRobots, readRobots, type RobotsPolicy } from "./discovery/robots";
export {
  MECHANISMS,
  IMPLEMENTED_MECHANISMS,
  coverage,
  type DiscoveryMechanism,
  type MechanismId,
  type MechanismCoverage,
} from "./discovery/mechanism";
export { runDiscovery, defaultMechanisms, type DiscoveryOptions, type DiscoveryReport } from "./discovery/run";
export { institutionalChannels, sameDomainLinks } from "./discovery/mechanisms/institutional-channels";
export { changeDetection } from "./discovery/mechanisms/change-detection";

export * from "./judgment/types";
export {
  judge,
  judgeAll,
  JUDGMENT_LOGIC_VERSION,
  NO_ASSESSOR,
  type PairingAssessor,
  type JudgeInput,
} from "./judgment/service";

export {
  recommendNextStep,
  type RecommendInput,
  type RecommendationResult,
} from "./recommendation/service";

export * from "./monitors";

export * from "./pursuit/types";
export { InMemoryPursuitLog } from "./pursuit/log";

export * from "./surface/card";
export * from "./surface/inspection";
export {
  InMemoryDeliveryLog,
  type DeliveredExplanation,
  type DeliveryLog,
} from "./surface/delivery";
