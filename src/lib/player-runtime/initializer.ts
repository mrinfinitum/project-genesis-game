import type { GameRuntimeData } from "@/lib/canonical-runtime";
import { PLAYER_RUNTIME_SAVE_VERSION, type AlignmentKey, type PlayerRuntimeState } from "./types";

export const DEFAULT_PRIMARY_HUD_RESOURCE_IDS = ["RES-0001", "RES-0005", "RES-0006", "RES-0016", "RES-0077"];

export function getPrimaryHudResourceIds(content: GameRuntimeData) {
  const profileIds = content.clientProfiles.web?.primaryHudResourceIds;
  const resourceIds = new Set(content.resources.map((resource) => resource.id));
  const configured = Array.isArray(profileIds) ? profileIds.filter((id): id is string => typeof id === "string" && resourceIds.has(id)) : [];
  const fallback = DEFAULT_PRIMARY_HUD_RESOURCE_IDS.filter((id) => resourceIds.has(id));

  return configured.length ? configured : fallback;
}

export function getStartingEraId(content: GameRuntimeData) {
  return (content.eras.find((era) => era.unlockRequirements?.start) ?? [...content.eras].sort((a, b) => a.index - b.index)[0])?.id ?? "survival";
}

function nowIso(now = new Date()) {
  return now.toISOString();
}

function createPlayerId(now = new Date()) {
  return `local-player-${now.getTime().toString(36)}`;
}

function defaultAlignment(): Record<AlignmentKey, number> {
  return {
    industry: 0,
    technology: 0,
    cyber: 0,
    nature: 0,
    corporate: 0
  };
}

export function createNewPlayerRuntimeState(content: GameRuntimeData, options: { now?: Date; playerId?: string; civilizationName?: string } = {}): PlayerRuntimeState {
  const timestamp = nowIso(options.now);
  const primaryHudIds = getPrimaryHudResourceIds(content);
  const inventory = Object.fromEntries(primaryHudIds.map((id) => [id, 0]));
  const productionRates = Object.fromEntries(primaryHudIds.map((id) => [id, 0]));
  const storageLimits = Object.fromEntries(primaryHudIds.map((id) => [id, 1000]));
  const startEraId = getStartingEraId(content);

  return {
    playerId: options.playerId ?? createPlayerId(options.now),
    saveVersion: PLAYER_RUNTIME_SAVE_VERSION,
    contentVersion: content.metadata.contentVersion,
    revision: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastSimulationAt: timestamp,
    civilization: {
      civilizationName: options.civilizationName ?? "Local Genesis Initiative",
      currentEraId: startEraId,
      eraProgress: 0,
      eraMastery: 0,
      population: content.balance.startingPopulation,
      discoveryPoints: 0
    },
    resources: {
      inventory,
      productionRates,
      storageLimits
    },
    production: {
      clickPower: content.balance.baseClickPower,
      autoClickPower: content.balance.baseAutoClickPower,
      criticalChance: 0,
      criticalMultiplier: 1,
      comboMultiplier: 1,
      automationEnabled: false
    },
    upgrades: {
      levels: Object.fromEntries(content.upgrades.filter((upgrade) => upgrade.defaultLevel > 0).map((upgrade) => [upgrade.id, upgrade.defaultLevel])),
      unlockedIds: content.upgrades.filter((upgrade) => upgrade.defaultLevel > 0 || upgrade.visibilityRules?.defaultState === "available").map((upgrade) => upgrade.id),
      discoveredIds: content.upgrades.filter((upgrade) => upgrade.visibilityRules?.defaultState !== "hidden").map((upgrade) => upgrade.id)
    },
    alignment: defaultAlignment(),
    objectives: {
      objectiveProgress: {}
    },
    events: {},
    boosts: {
      active: []
    },
    colonies: {
      colonyCount: 1,
      nextColonyProgress: 0
    },
    unresolved: {
      resources: {},
      resourceRates: {},
      storageLimits: {},
      upgradeLevels: {},
      unlockedUpgradeIds: [],
      discoveredUpgradeIds: [],
      boostDefinitionIds: []
    }
  };
}

