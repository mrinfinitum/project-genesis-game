import type { GameRuntimeData } from "@/lib/canonical-runtime";
import { evaluateDiscoveryEligibility } from "./eligibility";
import { resolvePublishedDiscoveries, resolveRarity } from "./selectors";
import { createUniversalObjectId, stableHash } from "./universal-object-id";
import type { DiscoveryPlacementInstance, DiscoveryPlayerProgress, DiscoveryRecord, PlanetDiscoveryEnvironment } from "./types";

export type DiscoverySeedInput = {
  universeSeed: string;
  environment: PlanetDiscoveryEnvironment;
  discoveryTableId: string;
  spawnSlot: number;
};

function seedToUint(seed: string) {
  return Number.parseInt(stableHash(seed).slice(0, 6), 36) >>> 0;
}

export function createSeededRandom(seed: string) {
  let state = seedToUint(seed) || 0x9e3779b9;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createDiscoverySeed(input: DiscoverySeedInput) {
  const { environment } = input;
  return [
    input.universeSeed,
    environment.universeSeedVersion,
    environment.generationVersion,
    environment.galaxyId,
    environment.sectorId,
    environment.systemId,
    environment.planetId,
    environment.regionId ?? "global",
    input.discoveryTableId,
    input.spawnSlot
  ].join("|");
}

export function resolveEligibleDiscoveryPool(runtime: GameRuntimeData, environment: PlanetDiscoveryEnvironment, playerProgress: DiscoveryPlayerProgress) {
  return resolvePublishedDiscoveries(runtime)
    .map((discovery) => ({ discovery, eligibility: evaluateDiscoveryEligibility(discovery, environment, playerProgress) }))
    .filter((entry) => entry.eligibility.eligible);
}

function discoveryWeight(runtime: GameRuntimeData, discovery: DiscoveryRecord) {
  const rarity = resolveRarity(runtime, discovery.rarityId ?? discovery.rarity);
  return Math.max(0, discovery.spawnProfile?.spawnWeight ?? rarity?.baseSpawnWeight ?? rarity?.relativeWeight ?? 1);
}

export function selectDiscoveryEntry(runtime: GameRuntimeData, eligible: Array<{ discovery: DiscoveryRecord }>, seed: string) {
  const total = eligible.reduce((sum, entry) => sum + discoveryWeight(runtime, entry.discovery), 0);
  if (!eligible.length || total <= 0) return undefined;
  const random = createSeededRandom(seed)() * total;
  let cursor = 0;
  for (const entry of eligible) {
    cursor += discoveryWeight(runtime, entry.discovery);
    if (random <= cursor) return entry.discovery;
  }
  return eligible[eligible.length - 1]?.discovery;
}

export function resolveDiscoveryCount(runtime: GameRuntimeData, environment: PlanetDiscoveryEnvironment, seed: string) {
  const random = createSeededRandom(`${seed}|count`)();
  const base = runtime.discoveryRecords?.length ? 2 : 0;
  const diversityBonus = Math.min(2, Math.floor((environment.biologicalDiversity ?? 0) * 2));
  return Math.max(0, base + diversityBonus + (random > 0.72 ? 1 : 0));
}

export function generateDiscoveryPlacements(runtime: GameRuntimeData, environment: PlanetDiscoveryEnvironment, playerProgress: DiscoveryPlayerProgress, universeSeed = "local-universe-seed") {
  const eligible = resolveEligibleDiscoveryPool(runtime, environment, playerProgress);
  const count = Math.min(resolveDiscoveryCount(runtime, environment, universeSeed), eligible.length);
  const placements: DiscoveryPlacementInstance[] = [];
  const used = new Set<string>();

  for (let slot = 0; slot < count; slot += 1) {
    const seed = createDiscoverySeed({ universeSeed, environment, discoveryTableId: "default", spawnSlot: slot });
    const discovery = selectDiscoveryEntry(runtime, eligible.filter((entry) => !used.has(entry.discovery.id)), seed);
    if (!discovery) continue;
    used.add(discovery.id);
    const rarityId = discovery.rarityId ?? discovery.rarity ?? "unknown";
    const universalObjectId = createUniversalObjectId({
      environmentId: environment.environmentId,
      universeId: environment.universeId,
      universeSeedVersion: environment.universeSeedVersion,
      generationVersion: environment.generationVersion,
      galaxyId: environment.galaxyId,
      sectorId: environment.sectorId,
      systemId: environment.systemId,
      planetId: environment.planetId,
      regionId: environment.regionId,
      entityType: discovery.categoryId ?? "discovery",
      localSpawnSlot: slot
    });
    placements.push({
      placementId: `placement_${stableHash(`${universalObjectId}|${discovery.id}`)}`,
      universalObjectId,
      discoveryId: discovery.id,
      environmentId: environment.environmentId,
      regionId: environment.regionId,
      locationType: environment.locationType,
      positionSeed: seed,
      spawnSlot: slot,
      generationVersion: environment.generationVersion,
      rarityId,
      state: "unknown",
      registryEligibility: discovery.registryEligible === false ? "ineligible" : "eligible",
      createdFromRuntimeContentVersion: runtime.metadata.contentVersion
    });
  }

  return placements;
}
