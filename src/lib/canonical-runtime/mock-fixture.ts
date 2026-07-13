import type { GameRuntimeData } from "./types";

export const mockRuntimeData: GameRuntimeData = {
  metadata: {
    schemaVersion: "game-runtime-v1",
    contentVersion: 0,
    releaseName: "Small Mock Fixture",
    checksum: "mock-runtime-fixture",
    accessLevel: "public-published",
    validationStatus: "Ready"
  },
  eras: [
    { id: "survival", index: 1, name: "Survival", displayName: "Survival", description: "Basic survival and first tools.", unlockRequirements: { start: true }, iconKey: "era-survival", artKey: "era-survival", tags: ["mock"] },
    { id: "ancient", index: 2, name: "Ancient", displayName: "Ancient", description: "Settlements, agriculture, and trade.", unlockRequirements: { previousEraId: "survival" }, iconKey: "era-ancient", artKey: "era-ancient", tags: ["mock"] },
    { id: "medieval", index: 3, name: "Medieval", displayName: "Medieval", description: "Guilds, roads, and regional systems.", unlockRequirements: { previousEraId: "ancient" }, iconKey: "era-medieval", artKey: "era-medieval", tags: ["mock"] },
    { id: "industrial", index: 4, name: "Industrial", displayName: "Industrial", description: "Factories and machines.", unlockRequirements: { previousEraId: "medieval" }, iconKey: "era-industrial", artKey: "era-industrial", tags: ["mock"] },
    { id: "modern", index: 5, name: "Modern", displayName: "Modern", description: "Computing and global systems.", unlockRequirements: { previousEraId: "industrial" }, iconKey: "era-modern", artKey: "era-modern", tags: ["mock"] },
    { id: "space-age", index: 6, name: "Space", displayName: "Space Age", description: "Orbital industry and home-system expansion.", unlockRequirements: { previousEraId: "modern" }, iconKey: "era-space-age", artKey: "era-space-age", tags: ["mock"] },
    { id: "interstellar", index: 7, name: "Interstellar", displayName: "Interstellar", description: "Nearby stars and deep-space logistics.", unlockRequirements: { previousEraId: "space-age" }, iconKey: "era-interstellar", artKey: "era-interstellar", tags: ["mock"] },
    { id: "galactic", index: 8, name: "Galactic", displayName: "Galactic", description: "Galaxy-scale infrastructure.", unlockRequirements: { previousEraId: "interstellar" }, iconKey: "era-galactic", artKey: "era-galactic", tags: ["mock"] }
  ],
  resources: [
    { id: "RES-0010", name: "Iron", displayName: "Iron", resourceClass: "Material", category: "Metal", rarity: "Common", iconKey: "resource-iron", artKey: "resource-iron", color: "#ffffff", description: "Core metal for tools, buildings, factories, machines, and infrastructure.", discoveredEraId: "survival", usableEraId: "survival", tradable: true, tags: ["mock"] },
    { id: "RES-0006", name: "Fresh Water", displayName: "Fresh Water", resourceClass: "Material", category: "Liquid", rarity: "Common", iconKey: "resource-fresh-water", artKey: "resource-fresh-water", color: "#ffffff", description: "Essential for population growth, agriculture, sanitation, and colonization.", discoveredEraId: "survival", usableEraId: "survival", tradable: true, tags: ["mock"] },
    { id: "RES-0260", name: "Xenocrystal", displayName: "Xenocrystal", resourceClass: "Speculative", category: "Exotic", rarity: "Legendary", iconKey: "resource-xenocrystal", artKey: "resource-xenocrystal", color: "#f1c40f", description: "Rare late-era anomalous lattice material.", discoveredEraId: "interstellar", usableEraId: "interstellar", tradable: true, tags: ["mock", "missing-art"] }
  ],
  upgradeCategories: [
    { id: "science", name: "Science", displayName: "Science", order: 1, description: "Knowledge and discovery upgrades." },
    { id: "technology", name: "Technology", displayName: "Technology", order: 2, description: "Tools, systems, and automation." },
    { id: "society", name: "Society", displayName: "Society", order: 3, description: "Culture and civilization organization." },
    { id: "infrastructure", name: "Infrastructure", displayName: "Infrastructure", order: 4, description: "Buildings and production networks." }
  ],
  upgrades: [
    { id: "U0001", categoryId: "science", eraId: "survival", chainId: "mock", order: 1, name: "Stone Tools", displayName: "Stone Tools", description: "Improve early gathering.", iconKey: "icon-stone-tools", defaultLevel: 0, maxLevel: 10, baseCost: 10, costResourceId: "RES-0010", costGrowthRate: 1.2, effectType: "Gathering", baseEffectValue: 1, effectGrowthRate: 1, unlockRequirements: { eraId: "survival" }, nextUpgradeIds: ["U0002"], visibilityRules: { defaultState: "available", availableRequirements: { eraId: "survival" } }, tags: ["mock"] },
    { id: "U0002", categoryId: "technology", eraId: "ancient", chainId: "mock", order: 2, name: "Water Systems", displayName: "Water Systems", description: "Improve settlement growth.", iconKey: "icon-water-systems", defaultLevel: 0, maxLevel: 10, baseCost: 20, costResourceId: "RES-0006", costGrowthRate: 1.25, effectType: "Population", baseEffectValue: 2, effectGrowthRate: 1, unlockRequirements: { eraId: "ancient", upgradeId: "U0001" }, nextUpgradeIds: [], visibilityRules: { defaultState: "locked_discovered", availableRequirements: { eraId: "ancient" } }, tags: ["mock"] }
  ],
  assets: [
    { id: "asset-resource-iron", name: "Iron Placeholder", type: "Image", category: "Resource", artKey: "resource-iron", status: "Mock", platformMappings: { web: { path: "/assets/resources/iron.webp" } } }
  ],
  balance: {
    version: "mock-balance-v1",
    startingCivilizationEnergy: 0,
    startingCoins: 0,
    startingResearch: 0,
    startingPopulation: 125,
    baseClickPower: 1,
    baseAutoClickPower: 0,
    autosaveSeconds: 30
  },
  clientProfiles: {
    default: {
      defaultUpgradeRowsVisible: 4,
      futureUpgradeTeaserCount: 2,
      showUnknownUpgradeSlots: true,
      lockedOpacity: 0.45,
      availableGlowEnabled: true
    },
    web: {
      defaultUpgradeRowsVisible: 6,
      futureUpgradeTeaserCount: 3,
      showUnknownUpgradeSlots: true,
      lockedOpacity: 0.55,
      availableGlowEnabled: true
    }
  }
};
