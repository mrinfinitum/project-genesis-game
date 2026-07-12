import type { GameRuntimeData, RuntimeContentSelectors } from "./types";

export function createRuntimeSelectors(payload: GameRuntimeData): RuntimeContentSelectors {
  const eras = new Map(payload.eras.map((era) => [era.id, era]));
  const resources = new Map(payload.resources.map((resource) => [resource.id, resource]));
  const categories = new Map(payload.upgradeCategories.map((category) => [category.id, category]));
  const upgrades = new Map(payload.upgrades.map((upgrade) => [upgrade.id, upgrade]));
  const assets = new Map<string, GameRuntimeData["assets"][number]>();

  for (const asset of payload.assets) {
    assets.set(asset.id, asset);
    assets.set(asset.artKey, asset);
  }

  return {
    getEraById: (id) => eras.get(id),
    getResourceById: (id) => resources.get(id),
    getUpgradeCategoryById: (id) => categories.get(id),
    getUpgradeById: (id) => upgrades.get(id),
    getUpgradesByCategory: (categoryId) => payload.upgrades.filter((upgrade) => upgrade.categoryId === categoryId),
    getUpgradesByEra: (eraId) => payload.upgrades.filter((upgrade) => upgrade.eraId === eraId),
    getUpgradeChain: (upgradeId) => {
      const start = upgrades.get(upgradeId);

      if (!start?.chainId) {
        return start ? [start] : [];
      }

      return payload.upgrades
        .filter((upgrade) => upgrade.chainId === start.chainId && upgrade.categoryId === start.categoryId)
        .sort((a, b) => a.order - b.order);
    },
    getAssetByKey: (key) => assets.get(key),
    getBalanceValue: (key) => payload.balance[key] as never,
    getClientProfile: (profile = "web") => payload.clientProfiles[profile] ?? payload.clientProfiles.default
  };
}
