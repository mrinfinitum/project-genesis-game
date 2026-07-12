import type { GameRuntimeData, PlayerProgressReferences, ResolvedPlayerProgress } from "./types";

export function resolvePlayerProgressReferences(progress: PlayerProgressReferences, content: GameRuntimeData): ResolvedPlayerProgress {
  const eraIds = new Set(content.eras.map((era) => era.id));
  const resourceIds = new Set(content.resources.map((resource) => resource.id));
  const upgradeIds = new Set(content.upgrades.map((upgrade) => upgrade.id));
  const resolved: ResolvedPlayerProgress = {
    inventory: {},
    upgradeLevels: {},
    unresolved: {
      resources: {},
      upgrades: {}
    }
  };

  if (progress.currentEraId) {
    if (eraIds.has(progress.currentEraId)) {
      resolved.currentEraId = progress.currentEraId;
    } else {
      resolved.unresolved.eraId = progress.currentEraId;
    }
  }

  for (const [resourceId, amount] of Object.entries(progress.inventory)) {
    if (resourceIds.has(resourceId)) {
      resolved.inventory[resourceId] = amount;
    } else {
      resolved.unresolved.resources[resourceId] = amount;
    }
  }

  for (const [upgradeId, level] of Object.entries(progress.upgradeLevels)) {
    if (upgradeIds.has(upgradeId)) {
      resolved.upgradeLevels[upgradeId] = level;
    } else {
      resolved.unresolved.upgrades[upgradeId] = level;
    }
  }

  return resolved;
}
