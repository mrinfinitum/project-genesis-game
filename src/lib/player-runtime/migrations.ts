import type { GameRuntimeData } from "@/lib/canonical-runtime";
import { CREDITS_ECONOMY_ID, getEconomyResourceIds, getPrimaryHudResourceIds, LABOR_ECONOMY_ID, LEGACY_CIVILIZATION_ENERGY_ECONOMY_ID, POPULATION_ECONOMY_ID, resolvePrimaryEconomyIdForCurrentEra } from "./economy";
import { createNewPlayerRuntimeState } from "./initializer";
import { resolveDefaultAiAgentId, resolveDefaultAiAgentVariantId, resolveSelectedAiAgent, resolveSelectedAiAgentVariant } from "./ai-agent";
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
  const recordAiAgent = record.aiAgent && typeof record.aiAgent === "object"
    ? record.aiAgent as Partial<PlayerRuntimeState["aiAgent"]>
    : undefined;
  const defaultAiAgentId = resolveDefaultAiAgentId(content);
  const defaultAiAgentVariantId = resolveDefaultAiAgentVariantId(content, defaultAiAgentId);
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
    aiAgent: {
      ...seed.aiAgent,
      ...(recordAiAgent ?? {}),
      selectedAiAgentId: typeof recordAiAgent?.selectedAiAgentId === "string" ? recordAiAgent.selectedAiAgentId : seed.aiAgent.selectedAiAgentId,
      selectedAiAgentVariantId: typeof recordAiAgent?.selectedAiAgentVariantId === "string" ? recordAiAgent.selectedAiAgentVariantId : seed.aiAgent.selectedAiAgentVariantId,
      unlockedAiAgentIds: normalizeStringArray(recordAiAgent?.unlockedAiAgentIds).length ? normalizeStringArray(recordAiAgent?.unlockedAiAgentIds) : seed.aiAgent.unlockedAiAgentIds,
      unlockedAiAgentVariantIds: normalizeStringArray(recordAiAgent?.unlockedAiAgentVariantIds).length ? normalizeStringArray(recordAiAgent?.unlockedAiAgentVariantIds) : seed.aiAgent.unlockedAiAgentVariantIds,
      blinkEnabled: typeof recordAiAgent?.blinkEnabled === "boolean" ? recordAiAgent.blinkEnabled : seed.aiAgent.blinkEnabled,
      reducedAnimation: typeof recordAiAgent?.reducedAnimation === "boolean" ? recordAiAgent.reducedAnimation : seed.aiAgent.reducedAnimation
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
      selectedAiAgentId: typeof record.unresolved?.selectedAiAgentId === "string" ? record.unresolved.selectedAiAgentId : undefined,
      selectedAiAgentVariantId: typeof record.unresolved?.selectedAiAgentVariantId === "string" ? record.unresolved.selectedAiAgentVariantId : undefined,
      unlockedAiAgentIds: normalizeStringArray(record.unresolved?.unlockedAiAgentIds),
      unlockedAiAgentVariantIds: normalizeStringArray(record.unresolved?.unlockedAiAgentVariantIds),
      boostDefinitionIds: normalizeStringArray(record.unresolved?.boostDefinitionIds),
      migrationNotes: normalizeStringArray(record.unresolved?.migrationNotes)
    },
    runtimeLoadReport: seed.runtimeLoadReport
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
  if (previousSaveVersion < 5) {
    const seedPopulation = seed.economy.balances[POPULATION_ECONOMY_ID] ?? seed.civilization.population;
    const legacyPopulation = next.economy.balances[POPULATION_ECONOMY_ID];
    const legacyCivilizationPopulation = next.civilization.population;
    const untouchedStarter =
      legacyPopulation === 125 &&
      (legacyCivilizationPopulation === 125 || legacyCivilizationPopulation === seedPopulation) &&
      (next.production.totalManualClicks ?? 0) === 0;

    if (untouchedStarter && seedPopulation !== 125) {
      next.economy.balances[POPULATION_ECONOMY_ID] = seedPopulation;
      next.civilization.population = seedPopulation;
      next.unresolved.migrationNotes.push(`Migrated untouched starter ${POPULATION_ECONOMY_ID} from 125 to ${seedPopulation}.`);
    }
  }
  if (previousSaveVersion < 6) {
    const primaryEconomyId = resolvePrimaryEconomyIdForCurrentEra(content, next.civilization.currentEraId);
    const seedCredits = seed.economy.balances[CREDITS_ECONOMY_ID] ?? 0;
    const seedLabor = seed.economy.balances[LABOR_ECONOMY_ID] ?? 0;
    const currentCredits = next.economy.balances[CREDITS_ECONOMY_ID] ?? seedCredits;
    const currentLabor = next.economy.balances[LABOR_ECONOMY_ID] ?? seedLabor;
    const generatedLaborHistory = Math.max(0, next.production.lifetimeLaborGenerated ?? 0, next.production.totalAutoLaborGenerated ?? 0);
    const creditDelta = currentCredits - seedCredits;
    const survivalHudIds = new Set(getPrimaryHudResourceIds(content, "survival"));
    const mistakenCreditsClickBucket =
      primaryEconomyId === LABOR_ECONOMY_ID &&
      next.civilization.currentEraId === "survival" &&
      !survivalHudIds.has(CREDITS_ECONOMY_ID) &&
      currentLabor <= seedLabor &&
      creditDelta > 0 &&
      generatedLaborHistory > 0;

    if (mistakenCreditsClickBucket) {
      const migratedAmount = Number(Math.min(creditDelta, generatedLaborHistory).toFixed(3));
      next.economy.balances[LABOR_ECONOMY_ID] = Number((currentLabor + migratedAmount).toFixed(3));
      next.economy.balances[CREDITS_ECONOMY_ID] = Number((currentCredits - migratedAmount).toFixed(3));
      next.unresolved.migrationNotes.push(`Migrated ${migratedAmount} mistaken Survival click ${CREDITS_ECONOMY_ID} into ${LABOR_ECONOMY_ID}.`);
    }
  }
  if (previousSaveVersion < 7) {
    const primaryEconomyId = resolvePrimaryEconomyIdForCurrentEra(content, next.civilization.currentEraId);
    const survivalHudIds = new Set(getPrimaryHudResourceIds(content, "survival"));
    const seedCredits = seed.economy.balances[CREDITS_ECONOMY_ID] ?? 0;
    const seedLabor = seed.economy.balances[LABOR_ECONOMY_ID] ?? 0;
    const currentCredits = next.economy.balances[CREDITS_ECONOMY_ID] ?? seedCredits;
    const currentLabor = next.economy.balances[LABOR_ECONOMY_ID] ?? seedLabor;
    const hiddenCreditsDelta = currentCredits - seedCredits;
    const staleSurvivalCredits =
      next.civilization.currentEraId === "survival" &&
      primaryEconomyId === LABOR_ECONOMY_ID &&
      !survivalHudIds.has(CREDITS_ECONOMY_ID) &&
      currentLabor <= seedLabor &&
      hiddenCreditsDelta > 0;

    if (staleSurvivalCredits) {
      const migratedAmount = Number(hiddenCreditsDelta.toFixed(3));
      next.economy.balances[LABOR_ECONOMY_ID] = Number((currentLabor + migratedAmount).toFixed(3));
      next.economy.balances[CREDITS_ECONOMY_ID] = seedCredits;
      next.unresolved.migrationNotes.push(`Repaired hidden Survival ${CREDITS_ECONOMY_ID} passive balance into ${LABOR_ECONOMY_ID}.`);
    }
  }
  if (previousSaveVersion < 9) {
    const seedPopulation = seed.economy.balances[POPULATION_ECONOMY_ID] ?? seed.civilization.population;
    const legacyPopulation = next.economy.balances[POPULATION_ECONOMY_ID];
    const legacyCivilizationPopulation = next.civilization.population;
    const staleUntouchedPopulation =
      legacyPopulation === 125 &&
      (legacyCivilizationPopulation === 125 || legacyCivilizationPopulation === seedPopulation) &&
      (next.production.totalManualClicks ?? 0) === 0;

    if (staleUntouchedPopulation && seedPopulation !== 125) {
      next.economy.balances[POPULATION_ECONOMY_ID] = seedPopulation;
      next.civilization.population = seedPopulation;
      next.unresolved.migrationNotes.push(`Repaired stale untouched ${POPULATION_ECONOMY_ID} from 125 to ${seedPopulation}.`);
    }
  }
  if (previousSaveVersion < 10) {
    const resolved = resolveSelectedAiAgent(content, next);
    if (resolved.agent.id !== next.aiAgent.selectedAiAgentId) {
      next.unresolved.selectedAiAgentId = resolved.unresolvedSelectedAiAgentId ?? next.aiAgent.selectedAiAgentId;
      next.aiAgent.selectedAiAgentId = resolved.agent.id;
      next.unresolved.migrationNotes.push(`Resolved AI Agent selection to ${resolved.agent.id}.`);
    } else if (!record.aiAgent || typeof record.aiAgent !== "object") {
      next.unresolved.migrationNotes.push(`Added default AI Agent selection ${next.aiAgent.selectedAiAgentId}.`);
    }
  } else {
    const resolved = resolveSelectedAiAgent(content, next);
    if (resolved.agent.id !== next.aiAgent.selectedAiAgentId) {
      next.unresolved.selectedAiAgentId = resolved.unresolvedSelectedAiAgentId ?? next.aiAgent.selectedAiAgentId;
      next.aiAgent.selectedAiAgentId = resolved.agent.id;
      next.unresolved.migrationNotes.push(`Preserved unresolved AI Agent selection ${next.unresolved.selectedAiAgentId}.`);
    }
  }
  if (!next.aiAgent.unlockedAiAgentIds.includes(defaultAiAgentId)) {
    next.aiAgent.unlockedAiAgentIds.push(defaultAiAgentId);
    next.unresolved.migrationNotes.push(`Unlocked default AI Agent ${defaultAiAgentId}.`);
  }
  if (!next.aiAgent.unlockedAiAgentVariantIds.includes(defaultAiAgentVariantId)) {
    next.aiAgent.unlockedAiAgentVariantIds.push(defaultAiAgentVariantId);
    next.unresolved.migrationNotes.push(`Unlocked default AI Agent variant ${defaultAiAgentVariantId}.`);
  }

  const resolvedVariant = resolveSelectedAiAgentVariant(content, next);
  if (resolvedVariant.agent.id !== next.aiAgent.selectedAiAgentId) {
    next.unresolved.selectedAiAgentId = resolvedVariant.unresolvedSelectedAiAgentId ?? next.aiAgent.selectedAiAgentId;
    next.aiAgent.selectedAiAgentId = resolvedVariant.agent.id;
    next.unresolved.migrationNotes.push(`Resolved AI Agent selection to ${resolvedVariant.agent.id}.`);
  }
  if (resolvedVariant.variant && resolvedVariant.variant.id !== next.aiAgent.selectedAiAgentVariantId) {
    next.unresolved.selectedAiAgentVariantId = resolvedVariant.unresolvedSelectedAiAgentVariantId ?? next.aiAgent.selectedAiAgentVariantId;
    next.aiAgent.selectedAiAgentVariantId = resolvedVariant.variant.id;
    next.unresolved.migrationNotes.push(`Resolved AI Agent variant selection to ${resolvedVariant.variant.id}.`);
  } else if (!recordAiAgent || typeof recordAiAgent.selectedAiAgentVariantId !== "string") {
    next.aiAgent.selectedAiAgentVariantId = resolvedVariant.variant?.id ?? defaultAiAgentVariantId;
    next.unresolved.migrationNotes.push(`Added default AI Agent variant selection ${next.aiAgent.selectedAiAgentVariantId}.`);
  }

  return preserveUnresolvedPlayerRuntimeIds(next, content);
}
