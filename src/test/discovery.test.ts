import { describe, expect, it } from "vitest";
import type { GameRuntimeData } from "@/lib/canonical-runtime";
import {
  auditDiscoveryRuntime,
  canApplyDiscoveryRewardLocally,
  createDiscoverySeed,
  createUniversalObjectId,
  DEFAULT_DISCOVERY_ENVIRONMENT,
  evaluateDiscoveryEligibility,
  generateDiscoveryPlacements,
  resolveEligibleDiscoveryPool,
  resolvePublishedDiscoveries,
  type DiscoveryRecord
} from "@/lib/discovery";

function record(id: string, overrides: Partial<DiscoveryRecord> = {}): DiscoveryRecord {
  return {
    id,
    displayName: id,
    categoryId: "flora",
    rarityId: "common",
    publishState: "published",
    ...overrides
  };
}

function runtime(discoveries: DiscoveryRecord[]): GameRuntimeData {
  return {
    metadata: { schemaVersion: "game-runtime-v1", architectureVersion: "1.0.0", runtimeVersion: "game-runtime-v1", universalDiscoveryRegistryVersion: "1.0.0", contentVersion: 20, checksum: "test", accessLevel: "public-published", validationStatus: "Ready" },
    eras: [],
    resources: [],
    upgradeCategories: [],
    upgrades: [],
    assets: [],
    balance: { startingCivilizationEnergy: 0, startingCoins: 0, startingResearch: 0, startingPopulation: 0, baseClickPower: 1, baseAutoClickPower: 0, autosaveSeconds: 30 },
    clientProfiles: { default: {} },
    discoveryCategories: [{ id: "flora", displayName: "Flora" }, { id: "ruins", displayName: "Ruins" }],
    discoverySubcategories: [{ id: "moss", categoryId: "flora" }],
    discoveryRarities: [{ id: "common", displayName: "Common", baseSpawnWeight: 10 }, { id: "unique", displayName: "Unique", baseSpawnWeight: 1 }],
    discoveryRecords: discoveries,
    discoveryCollections: [{ id: "samples", discoveryIds: discoveries.map((discovery) => discovery.id) }],
    discoveryChains: [{ id: "chain", discoveryIds: discoveries.map((discovery) => discovery.id) }],
    universalDiscoveryRegistry: { version: "1.0.0", entityTypes: [{ id: "flora" }], milestones: [{ id: "first_scan" }] }
  };
}

describe("Discovery runtime boundary", () => {
  it("reports v20 contract gaps without inventing missing Studio records", () => {
    const emptyRuntime = runtime([]);
    const audit = auditDiscoveryRuntime(emptyRuntime);
    expect(audit.ok).toBe(false);
    expect(audit.failures).toContain("Discovery records are missing.");
    expect(resolvePublishedDiscoveries(emptyRuntime)).toEqual([]);
  });

  it("evaluates environmental eligibility deterministically", () => {
    const lumenMoss = record("DISC-FLORA-LUMEN-MOSS", { eligibility: { biomeIds: ["cave"], humidity: { min: 0.4 }, locationTypes: ["cave"] } });
    const skimmer = record("DISC-FAUNA-AEROVALE-SKIMMER", { eligibility: { atmosphereIds: ["breathable"], gravity: { max: 0.45 } } });
    const progress = { currentEraId: "survival", completedResearchIds: [], equipmentIds: [] };

    expect(evaluateDiscoveryEligibility(lumenMoss, DEFAULT_DISCOVERY_ENVIRONMENT, progress).eligible).toBe(true);
    expect(evaluateDiscoveryEligibility(skimmer, DEFAULT_DISCOVERY_ENVIRONMENT, progress).eligible).toBe(false);
  });

  it("generates stable placements and universal object IDs from seed inputs", () => {
    const discoveryRuntime = runtime([
      record("DISC-FLORA-LUMEN-MOSS", { eligibility: { biomeIds: ["cave"] } }),
      record("DISC-RUINS-ECHO-VAULT", { categoryId: "ruins", eligibility: { locationTypes: ["cave"] } })
    ]);
    const progress = { currentEraId: "survival", completedResearchIds: [], equipmentIds: [] };
    const first = generateDiscoveryPlacements(discoveryRuntime, DEFAULT_DISCOVERY_ENVIRONMENT, progress, "seed-a");
    const second = generateDiscoveryPlacements(discoveryRuntime, DEFAULT_DISCOVERY_ENVIRONMENT, progress, "seed-a");
    const seed = createDiscoverySeed({ universeSeed: "seed-a", environment: DEFAULT_DISCOVERY_ENVIRONMENT, discoveryTableId: "default", spawnSlot: 0 });

    expect(resolveEligibleDiscoveryPool(discoveryRuntime, DEFAULT_DISCOVERY_ENVIRONMENT, progress)).toHaveLength(2);
    expect(first).toEqual(second);
    expect(seed).toContain(DEFAULT_DISCOVERY_ENVIRONMENT.planetId);
    expect(createUniversalObjectId({ ...DEFAULT_DISCOVERY_ENVIRONMENT, entityType: "flora", localSpawnSlot: 0 })).toBe(createUniversalObjectId({ ...DEFAULT_DISCOVERY_ENVIRONMENT, entityType: "flora", localSpawnSlot: 0 }));
  });

  it("prevents ordinary local Discovery rewards from granting Premium Crystals", () => {
    expect(canApplyDiscoveryRewardLocally({ id: "unsafe", rewards: [{ economyId: "ECON-PREMIUM-CRYSTALS", amount: 1 }] }).ok).toBe(false);
    expect(canApplyDiscoveryRewardLocally({ id: "research", rewards: [{ economyId: "ECON-RESEARCH", amount: 10 }] }).ok).toBe(true);
  });
});
