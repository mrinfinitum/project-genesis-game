import type { GameRuntimeData, UpgradeDefinition } from "@/lib/canonical-runtime";
import { isAutomationUpgrade, resolveAiAgentLaborAssistance } from "./automation";
import { getEconomyResourceIds, getStartingEconomyRates, resolvePrimaryEconomyIdForCurrentEra } from "./economy";
import { getPrimaryHudResourceIds } from "./initializer";
import type { PlayerRuntimeState } from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function nowIso(now = new Date()) {
  return now.toISOString();
}

function secondsBetween(a: string, b: Date) {
  const start = Date.parse(a);
  const end = b.getTime();
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, (end - start) / 1000);
}

function balanceNumber(content: GameRuntimeData, key: string, fallback: number) {
  const value = (content.balance as unknown as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function resolveEraMultiplier(content: GameRuntimeData, state: PlayerRuntimeState) {
  const explicitMultipliers = [1, 2, 5, 12, 30, 75, 150];
  const ordered = [...content.eras].sort((a, b) => a.index - b.index);
  const eraIndex = Math.max(0, ordered.findIndex((era) => era.id === state.civilization.currentEraId));
  return explicitMultipliers[Math.min(eraIndex, explicitMultipliers.length - 1)] ?? 1;
}

function normalizeCriticalChance(value: number) {
  const asProbability = value > 1 ? value / 100 : value;
  return Math.min(0.5, Math.max(0, asProbability));
}

export function resolveUpgradeCost(upgrade: UpgradeDefinition, level: number) {
  return Math.round(upgrade.baseCost * upgrade.costGrowthRate ** Math.max(0, level));
}

export function resolveUpgradeEffect(upgrade: UpgradeDefinition, level: number) {
  return Number((upgrade.baseEffectValue * upgrade.effectGrowthRate ** Math.max(0, level)).toFixed(2));
}

export function recomputeProduction(content: GameRuntimeData, state: PlayerRuntimeState): PlayerRuntimeState {
  const next = clone(state);
  let clickPower = balanceNumber(content, "baseClickPower", 1);
  let autoClickPower = balanceNumber(content, "baseAutoClickPower", 0);
  const autoClickRate = balanceNumber(content, "baseAutoClickRate", 1);
  let criticalChance = balanceNumber(content, "baseCriticalChance", 0);
  let criticalMultiplier = balanceNumber(content, "baseCriticalMultiplier", 2);

  for (const upgrade of content.upgrades) {
    const level = next.upgrades.levels[upgrade.id] ?? upgrade.defaultLevel ?? 0;
    if (level <= 0) continue;
    const effect = resolveUpgradeEffect(upgrade, level - 1) * level;
    const type = upgrade.effectType.toLowerCase();
    if (type.includes("labor per click")) clickPower += effect;
    if (isAutomationUpgrade(upgrade)) autoClickPower += effect;
    if (type.includes("critical chance")) criticalChance += effect;
    if (type.includes("critical multiplier")) criticalMultiplier += effect;
  }

  next.production.clickPower = Number(clickPower.toFixed(2));
  next.production.autoClickPower = Number(autoClickPower.toFixed(2));
  next.production.autoClickRate = Number(Math.max(0, autoClickRate).toFixed(2));
  next.production.criticalChance = Number(Math.max(0, criticalChance).toFixed(2));
  next.production.criticalMultiplier = Number(Math.max(1, criticalMultiplier).toFixed(2));
  return next;
}

function addResource(state: PlayerRuntimeState, resourceId: string, amount: number) {
  const current = state.resources.inventory[resourceId] ?? 0;
  const limit = state.resources.storageLimits[resourceId] ?? Number.POSITIVE_INFINITY;
  state.resources.inventory[resourceId] = Math.min(limit, Number((current + amount).toFixed(3)));
}

function addEconomy(state: PlayerRuntimeState, economyId: string, amount: number) {
  const current = state.economy.balances[economyId] ?? 0;
  state.economy.balances[economyId] = Number((current + amount).toFixed(3));
}

export function performManualLaborClick(content: GameRuntimeData, state: PlayerRuntimeState, options: { now?: Date; forceCritical?: boolean } = {}) {
  const next = recomputeProduction(content, state);
  const primaryEconomyId = resolvePrimaryEconomyIdForCurrentEra(content, next.civilization.currentEraId);
  if (!primaryEconomyId) return next;

  const critical = options.forceCritical || Math.random() < normalizeCriticalChance(next.production.criticalChance);
  const criticalMultiplier = critical ? next.production.criticalMultiplier : 1;
  const rawAmount = next.production.clickPower * resolveEraMultiplier(content, next) * next.production.comboMultiplier * criticalMultiplier;
  const amount = Math.max(1, Math.floor(rawAmount));
  addEconomy(next, primaryEconomyId, amount);
  next.production.lastClickGain = amount;
  next.production.lastClickWasCritical = critical;
  next.production.totalManualClicks += 1;
  next.production.lifetimeLaborGenerated = Number((next.production.lifetimeLaborGenerated + amount).toFixed(3));
  next.civilization.discoveryPoints += Math.max(1, Math.floor(amount / 10));
  next.updatedAt = nowIso(options.now);
  next.revision += 1;
  return next;
}

export const applyClickReward = performManualLaborClick;

export function advanceSimulation(content: GameRuntimeData, state: PlayerRuntimeState, options: { now?: Date; seconds?: number } = {}) {
  const now = options.now ?? new Date();
  const elapsedSeconds = options.seconds ?? secondsBetween(state.lastSimulationAt, now);
  const next = recomputeProduction(content, state);
  const economyIds = getEconomyResourceIds(content);
  const primaryEconomyId = resolvePrimaryEconomyIdForCurrentEra(content, next.civilization.currentEraId);
  const canonicalRates = getStartingEconomyRates(content);

  for (const economyId of economyIds) {
    const rate = economyId === primaryEconomyId ? 0 : canonicalRates[economyId] ?? 0;
    next.economy.rates[economyId] = rate;
    if (rate > 0 && elapsedSeconds > 0) addEconomy(next, economyId, rate * elapsedSeconds);
  }

  if (primaryEconomyId) {
    const passivePerSecond = Math.max(0, canonicalRates[primaryEconomyId] ?? 0);
    const autoPerSecond = resolveAiAgentLaborAssistance(content, next).totalRate;
    const totalPrimaryPerSecond = passivePerSecond + autoPerSecond;

    if (elapsedSeconds > 0 && passivePerSecond > 0) {
      addEconomy(next, primaryEconomyId, passivePerSecond * elapsedSeconds);
      next.production.lifetimeLaborGenerated = Number((next.production.lifetimeLaborGenerated + passivePerSecond * elapsedSeconds).toFixed(3));
    }

    if (elapsedSeconds > 0 && autoPerSecond > 0) {
      const amount = autoPerSecond * elapsedSeconds;
      addEconomy(next, primaryEconomyId, amount);
      next.production.totalAutoClicks += Math.floor(elapsedSeconds);
      next.production.totalAutoLaborGenerated = Number((next.production.totalAutoLaborGenerated + amount).toFixed(3));
      next.production.lifetimeLaborGenerated = Number((next.production.lifetimeLaborGenerated + amount).toFixed(3));
    }
    next.economy.rates[primaryEconomyId] = totalPrimaryPerSecond;
  }

  next.civilization.eraProgress = Math.min(100, Number((next.civilization.eraProgress + elapsedSeconds * 0.005).toFixed(3)));
  next.civilization.eraMastery = Math.max(next.civilization.eraMastery, next.civilization.eraProgress);
  next.lastSimulationAt = nowIso(now);
  next.updatedAt = nowIso(now);
  if (elapsedSeconds > 0) next.revision += 1;
  return next;
}

export function grantTestResources(content: GameRuntimeData, state: PlayerRuntimeState, amount = 1000) {
  const next = clone(state);
  for (const economyId of getPrimaryHudResourceIds(content)) {
    addEconomy(next, economyId, amount);
  }
  for (const resource of content.resources) {
    addResource(next, resource.id, amount);
  }
  next.updatedAt = nowIso();
  next.revision += 1;
  return next;
}

export function grantTestEconomy(content: GameRuntimeData, state: PlayerRuntimeState, economyIds: string[], amount = 1000) {
  const next = clone(state);
  const knownEconomyIds = new Set(getEconomyResourceIds(content));
  for (const economyId of economyIds) {
    if (knownEconomyIds.has(economyId)) addEconomy(next, economyId, amount);
  }
  next.updatedAt = nowIso();
  next.revision += 1;
  return next;
}
