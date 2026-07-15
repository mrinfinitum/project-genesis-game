import type { GameRuntimeData } from "@/lib/canonical-runtime";
import { DEFAULT_DISCOVERY_ENVIRONMENT } from "./environment";
import { generateDiscoveryPlacements, resolveEligibleDiscoveryPool } from "./deterministic-spawn";
import { auditDiscoveryRuntime } from "./runtime-adapter";
import type { DiscoveryJournalState } from "./types";

export function createDiscoveryDiagnostics(runtime: GameRuntimeData, journal: DiscoveryJournalState) {
  const playerProgress = { currentEraId: "survival", completedResearchIds: [], equipmentIds: [] };
  const eligiblePool = resolveEligibleDiscoveryPool(runtime, DEFAULT_DISCOVERY_ENVIRONMENT, playerProgress);
  const generatedPlacements = generateDiscoveryPlacements(runtime, DEFAULT_DISCOVERY_ENVIRONMENT, playerProgress);
  return {
    audit: auditDiscoveryRuntime(runtime),
    environment: DEFAULT_DISCOVERY_ENVIRONMENT,
    eligiblePool: eligiblePool.map((entry) => ({ discoveryId: entry.discovery.id, matchedRules: entry.eligibility.matchedRules })),
    rejectedEligibilityRules: (runtime.discoveryRecords ?? []).map((discovery) => ({
      discoveryId: discovery.id,
      failedRules: eligiblePool.some((entry) => entry.discovery.id === discovery.id) ? [] : ["not eligible in default environment or record unavailable"]
    })),
    deterministicSeed: "local-universe-seed",
    generatedPlacements,
    universalObjectIds: generatedPlacements.map((placement) => placement.universalObjectId),
    personalStates: {
      detected: journal.detectedObjectIds.length,
      identified: journal.identifiedObjectIds.length,
      analyzed: journal.analyzedObjectIds.length,
      collected: journal.collectedObjectIds.length
    },
    pendingClaims: journal.pendingDiscoveryClaims.length
  };
}
