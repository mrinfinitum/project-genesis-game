import type { GameRuntimeData } from "@/lib/canonical-runtime";
import { getEconomyResourceIds, LABOR_ECONOMY_ID, LEGACY_CIVILIZATION_ENERGY_ECONOMY_ID, POPULATION_ECONOMY_ID } from "./economy";
import { createNewPlayerRuntimeState } from "./initializer";
import { PLAYER_RUNTIME_SAVE_VERSION, type PlayerRuntimeState } from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function normalizeNumberMap(input: unknown): Record<string, number> {
  if (!input || typeof input !== "object") return {};
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>)
      .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
      .map(([key, value]) => [key, value as number])
  );
}

function normalizeStringArray(input: unknown) {
  return Array.isArray(input) ? input.filter((item): item is string => typeof item === "string") : [];
}

export function preserveUnresolvedPlayerRuntimeIds(state: PlayerRuntimeState, content: GameRuntimeData): PlayerRuntimeState {
  const next = clone(state);
  const economyIds = new Set(getEconomyResourceIds(content));
  const resourceIds = new Set(content.resources.map((resource) => resource.id));
  const upgradeIds = new Set(content.upgrades.map((upgrade) => upgrade.id));
  const eraIds = new Set(content.eras.map((era) => era.id));

  if (economyIds.size) {
    for (const [economyId, amount] of Object.entries(next.economy.balances)) {
      if (!economyIds.has(economyId)) {
        next.unresolved.economy[economyId] = amount;
        delete next.economy.balances[economyId];
      }
    }

    for (const [economyId, rate] of Object.entries(next.economy.rates)) {
      if (!economyIds.has(economyId)) {
        next.unresolved.economyRates[economyId] = rate;
        delete next.economy.rates[economyId];
      }
    }
  }

  for (const [resourceId, amount] of Object.entries(next.resources.inventory)) {
    if (!resourceIds.has(resourceId)) {
      next.unresolved.resources[resourceId] = amount;
      delete next.resources.inventory[resourceId];
    }
  }

  for (const [resourceId, rate] of Object.entries(next.resources.productionRates)) {
    if (!resourceIds.has(resourceId)) {
      next.unresolved.resourceRates[resourceId] = rate;
      delete next.resources.productionRates[resourceId];
    }
  }

  for (const [resourceId, limit] of Object.entries(next.resources.storageLimits)) {
    if (!resourceIds.has(resourceId)) {
      next.unresolved.storageLimits[resourceId] = limit;
      delete next.resources.storageLimits[resourceId];
    }
  }

  for (const [upgradeId, level] of Object.entries(next.upgrades.levels)) {
    if (!upgradeIds.has(upgradeId)) {
      next.unresolved.upgradeLevels[upgradeId] = level;
      delete next.upgrades.levels[upgradeId];
    }
  }

  next.upgrades.unlockedIds = next.upgrades.unlockedIds.filter((upgradeId) => {
    if (upgradeIds.has(upgradeId)) return true;
    if (!next.unresolved.unlockedUpgradeIds.includes(upgradeId)) next.unresolved.unlockedUpgradeIds.push(upgradeId);
    return false;
  });

  next.upgrades.discoveredIds = next.upgrades.discoveredIds.filter((upgradeId) => {
    if (upgradeIds.has(upgradeId)) return true;
    if (!next.unresolved.discoveredUpgradeIds.includes(upgradeId)) next.unresolved.discoveredUpgradeIds.push(upgradeId);
    return false;
  });

  if (!eraIds.has(next.civilization.currentEraId)) {
    next.unresolved.currentEraId = next.civilization.currentEraId;
    next.civilization.currentEraId = content.eras.find((era) => era.unlockRequirements?.start)?.id ?? content.eras[0]?.id ?? next.civilization.currentEraId;
  }

  return next;
}

export function migratePlayerRuntimeState(raw: unknown, content: GameRuntimeData): PlayerRuntimeState {
  if (!raw || typeof raw !== "object") {
    return createNewPlayerRuntimeState(content);
  }

  const record = raw as Partial<PlayerRuntimeState> & Record<string, unknown>;
  const seed = createNewPlayerRuntimeState(content, {
    playerId: typeof record.playerId === "string" ? record.playerId : undefined,
    civilizationName: typeof record.civilization?.civilizationName === "string" ? record.civilization.civilizationName : undefined
  });
  const next: PlayerRuntimeState = {
    ...seed,
    ...record,
    saveVersion: PLAYER_RUNTIME_SAVE_VERSION,
    contentVersion: content.metadata.contentVersion,
    revision: typeof record.revision === "number" ? record.revision : seed.revision,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : seed.createdAt,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : seed.updatedAt,
    lastSimulationAt: typeof record.lastSimulationAt === "string" ? record.lastSimulationAt : seed.lastSimulationAt,
    civilization: {
      ...seed.civilization,
      ...(record.civilization ?? {}),
      currentEraId: typeof record.civilization?.currentEraId === "string" ? record.civilization.currentEraId : seed.civilization.currentEraId,
      population: typeof record.civilization?.population === "number" ? record.civilization.population : seed.civilization.population
    },
    economy: {
      balances: { ...seed.economy.balances, ...normalizeNumberMap(record.economy?.balances) },
      rates: { ...seed.economy.rates, ...normalizeNumberMap(record.economy?.rates) }
    },
    resources: {
      inventory: { ...seed.resources.inventory, ...normalizeNumberMap(record.resources?.inventory) },
      productionRates: { ...seed.resources.productionRates, ...normalizeNumberMap(record.resources?.productionRates) },
      storageLimits: { ...seed.resources.storageLimits, ...normalizeNumberMap(record.resources?.storageLimits) }
    },
    production: {
      ...seed.production,
      ...(record.production ?? {})
    },
    upgrades: {
      levels: { ...seed.upgrades.levels, ...normalizeNumberMap(record.upgrades?.levels) },
      unlockedIds: normalizeStringArray(record.upgrades?.unlockedIds).length ? normalizeStringArray(record.upgrades?.unlockedIds) : seed.upgrades.unlockedIds,
      discoveredIds: normalizeStringArray(record.upgrades?.discoveredIds).length ? normalizeStringArray(record.upgrades?.discoveredIds) : seed.upgrades.discoveredIds
    },
    alignment: {
      ...seed.alignment,
      ...(record.alignment ?? {})
    },
    objectives: {
      activeObjectiveId: typeof record.objectives?.activeObjectiveId === "string" ? record.objectives.activeObjectiveId : undefined,
      objectiveProgress: normalizeNumberMap(record.objectives?.objectiveProgress)
    },
    events: {
      activeEventId: typeof record.events?.activeEventId === "string" ? record.events.activeEventId : undefined,
      activeEventEndsAt: typeof record.events?.activeEventEndsAt === "string" ? record.events.activeEventEndsAt : undefined
    },
    boosts: {
      active: Array.isArray(record.boosts?.active) ? record.boosts.active : []
    },
    colonies: {
      ...seed.colonies,
      ...(record.colonies ?? {})
    },
    unresolved: {
      economy: normalizeNumberMap(record.unresolved?.economy),
      economyRates: normalizeNumberMap(record.unresolved?.economyRates),
      resources: normalizeNumberMap(record.unresolved?.resources),
      resourceRates: normalizeNumberMap(record.unresolved?.resourceRates),
      storageLimits: normalizeNumberMap(record.unresolved?.storageLimits),
      upgradeLevels: normalizeNumberMap(record.unresolved?.upgradeLevels),
      unlockedUpgradeIds: normalizeStringArray(record.unresolved?.unlockedUpgradeIds),
      discoveredUpgradeIds: normalizeStringArray(record.unresolved?.discoveredUpgradeIds),
      currentEraId: typeof record.unresolved?.currentEraId === "string" ? record.unresolved.currentEraId : undefined,
      activeObjectiveId: typeof record.unresolved?.activeObjectiveId === "string" ? record.unresolved.activeObjectiveId : undefined,
      activeEventId: typeof record.unresolved?.activeEventId === "string" ? record.unresolved.activeEventId : undefined,
      boostDefinitionIds: normalizeStringArray(record.unresolved?.boostDefinitionIds),
      migrationNotes: normalizeStringArray(record.unresolved?.migrationNotes)
    }
  };

  const previousSaveVersion = typeof record.saveVersion === "number" ? record.saveVersion : 0;
  if (previousSaveVersion < 2) {
    const legacyPopulation = normalizeNumberMap(record.economy?.balances)[POPULATION_ECONOMY_ID];
    const savedCivilizationPopulation = typeof record.civilization?.population === "number" ? record.civilization.population : seed.civilization.population;
    if ((legacyPopulation === undefined || legacyPopulation === 0) && savedCivilizationPopulation > 0) {
      next.economy.balances[POPULATION_ECONOMY_ID] = savedCivilizationPopulation;
      next.unresolved.migrationNotes.push(`Migrated ${POPULATION_ECONOMY_ID} from civilization.population.`);
    }
    if (next.economy.balances[LABOR_ECONOMY_ID] === undefined) {
      next.economy.balances[LABOR_ECONOMY_ID] = seed.economy.balances[LABOR_ECONOMY_ID] ?? 0;
    }
  }
  if (previousSaveVersion < 3) {
    const legacyBalances = normalizeNumberMap(record.economy?.balances);
    const legacyLabor = legacyBalances[LEGACY_CIVILIZATION_ENERGY_ECONOMY_ID];
    const currentLabor = next.economy.balances[LABOR_ECONOMY_ID] ?? seed.economy.balances[LABOR_ECONOMY_ID] ?? 0;
    const seedLabor = seed.economy.balances[LABOR_ECONOMY_ID] ?? 0;
    if (legacyLabor !== undefined && legacyLabor > seedLabor && currentLabor <= seedLabor) {
      next.economy.balances[LABOR_ECONOMY_ID] = legacyLabor;
      next.unresolved.migrationNotes.push(`Migrated legacy ${LEGACY_CIVILIZATION_ENERGY_ECONOMY_ID} balance into ${LABOR_ECONOMY_ID}.`);
    }
  }

  return preserveUnresolvedPlayerRuntimeIds(next, content);
}
