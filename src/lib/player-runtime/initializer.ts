import type { GameRuntimeData } from "@/lib/canonical-runtime";
import { PLAYER_RUNTIME_SAVE_VERSION, type AlignmentKey, type PlayerRuntimeState } from "./types";
import { getInventoryResources, getPrimaryHudResourceIds, getStartingEconomyBalances, getStartingEconomyRates } from "./economy";

export { getEconomyDefinitions, getEconomyWarnings, getInventoryResources, getPrimaryHudResourceIds, getPrimaryHudResources } from "./economy";

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
  const economyIds = getPrimaryHudResourceIds(content);
  const inventoryResourceIds = getInventoryResources(content).map((resource) => resource.id);
  const economyBalances = getStartingEconomyBalances(content);
  const economyRates = { ...Object.fromEntries(economyIds.map((id) => [id, 0])), ...getStartingEconomyRates(content) };
  const inventory = Object.fromEntries(inventoryResourceIds.map((id) => [id, 0]));
  const productionRates = Object.fromEntries(inventoryResourceIds.map((id) => [id, 0]));
  const storageLimits = Object.fromEntries(inventoryResourceIds.map((id) => [id, Number.MAX_SAFE_INTEGER]));
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
    economy: {
      balances: economyBalances,
      rates: economyRates
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
      economy: {},
      economyRates: {},
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
