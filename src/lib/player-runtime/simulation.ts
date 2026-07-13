import type { GameRuntimeData, UpgradeDefinition } from "@/lib/canonical-runtime";
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

export function resolveUpgradeCost(upgrade: UpgradeDefinition, level: number) {
  return Math.round(upgrade.baseCost * upgrade.costGrowthRate ** Math.max(0, level));
}

export function resolveUpgradeEffect(upgrade: UpgradeDefinition, level: number) {
  return Number((upgrade.baseEffectValue * upgrade.effectGrowthRate ** Math.max(0, level)).toFixed(2));
}

export function recomputeProduction(content: GameRuntimeData, state: PlayerRuntimeState): PlayerRuntimeState {
  const next = clone(state);
  let clickPower = content.balance.baseClickPower;
  let autoClickPower = content.balance.baseAutoClickPower;
  let criticalChance = 0;
  let criticalMultiplier = 1;

  for (const upgrade of content.upgrades) {
    const level = next.upgrades.levels[upgrade.id] ?? upgrade.defaultLevel ?? 0;
    if (level <= 0) continue;
    const effect = resolveUpgradeEffect(upgrade, level - 1) * level;
    const type = upgrade.effectType.toLowerCase();
    if (type.includes("labor per click")) clickPower += effect;
    if (type.includes("auto")) autoClickPower += effect;
    if (type.includes("critical chance")) criticalChance += effect;
    if (type.includes("critical multiplier")) criticalMultiplier += effect;
  }

  next.production.clickPower = Number(clickPower.toFixed(2));
  next.production.autoClickPower = Number(autoClickPower.toFixed(2));
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

export function applyClickReward(content: GameRuntimeData, state: PlayerRuntimeState, options: { now?: Date; forceCritical?: boolean } = {}) {
  const next = recomputeProduction(content, state);
  const [primaryEconomyId] = getPrimaryHudResourceIds(content);
  if (!primaryEconomyId) return next;

  const critical = options.forceCritical || (next.production.criticalChance >= 100);
  const criticalMultiplier = critical ? next.production.criticalMultiplier : 1;
  const amount = next.production.clickPower * next.production.comboMultiplier * criticalMultiplier;
  addEconomy(next, primaryEconomyId, amount);
  next.civilization.discoveryPoints += Math.max(1, Math.floor(amount / 10));
  next.updatedAt = nowIso(options.now);
  next.revision += 1;
  return next;
}

export function advanceSimulation(content: GameRuntimeData, state: PlayerRuntimeState, options: { now?: Date; seconds?: number } = {}) {
  const now = options.now ?? new Date();
  const elapsedSeconds = options.seconds ?? secondsBetween(state.lastSimulationAt, now);
  const next = recomputeProduction(content, state);
  const primaryHudIds = getPrimaryHudResourceIds(content);
  const [primaryEconomyId] = primaryHudIds;

  for (const economyId of primaryHudIds) {
    next.economy.rates[economyId] = 0;
  }

  if (primaryEconomyId && next.production.automationEnabled && next.production.autoClickPower > 0) {
    const amount = next.production.autoClickPower * elapsedSeconds;
    addEconomy(next, primaryEconomyId, amount);
    next.economy.rates[primaryEconomyId] = next.production.autoClickPower;
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
