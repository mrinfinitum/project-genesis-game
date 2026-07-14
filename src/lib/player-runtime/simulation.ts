import type { GameRuntimeData, UpgradeDefinition } from "@/lib/canonical-runtime";
import { calculateOfflineGain } from "@/lib/economy/offline-calculator";
import { applyEconomyPrecision } from "@/lib/economy/precision";
import { calculateAllResourceRates } from "@/lib/economy/rate-calculator";
import { applyResourceTransaction, createResourceTransaction } from "@/lib/economy/transaction-ledger";
import { isAutomationUpgrade } from "./automation";
import { getEconomyResourceIds, getResourceBehaviorContract, PREMIUM_CRYSTALS_ECONOMY_ID, resolvePrimaryEconomyIdForCurrentEra } from "./economy";
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
  let clickPower = getResourceBehaviorContract(content, resolvePrimaryEconomyIdForCurrentEra(content, next.civilization.currentEraId) ?? "")?.manualProduction?.baseClick ?? balanceNumber(content, "baseClickPower", 1);
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

export function resolveLaborPerClick(content: GameRuntimeData, state: PlayerRuntimeState) {
  return recomputeProduction(content, state).production.clickPower;
}

function addResource(state: PlayerRuntimeState, resourceId: string, amount: number) {
  const current = state.resources.inventory[resourceId] ?? 0;
  const limit = state.resources.storageLimits[resourceId] ?? Number.POSITIVE_INFINITY;
  state.resources.inventory[resourceId] = Math.min(limit, Number((current + amount).toFixed(3)));
}

function addEconomy(content: GameRuntimeData, state: PlayerRuntimeState, economyId: string, amount: number) {
  const current = state.economy.balances[economyId] ?? 0;
  state.economy.balances[economyId] = applyEconomyPrecision(content, economyId, current + amount);
}

export function performManualLaborClick(content: GameRuntimeData, state: PlayerRuntimeState, options: { now?: Date; forceCritical?: boolean } = {}) {
  const next = recomputeProduction(content, state);
  const primaryEconomyId = resolvePrimaryEconomyIdForCurrentEra(content, next.civilization.currentEraId);
  if (!primaryEconomyId) return next;

  const critical = options.forceCritical || Math.random() < normalizeCriticalChance(next.production.criticalChance);
  const criticalMultiplier = critical ? next.production.criticalMultiplier : 1;
  const rawAmount = next.production.clickPower * next.production.comboMultiplier * criticalMultiplier;
  const amount = Math.max(1, Math.floor(rawAmount));
  const transaction = createResourceTransaction(content, {
    economyId: primaryEconomyId,
    amount,
    operation: "produce",
    sourceType: "manual_click",
    sourceId: "click_power",
    reasonCode: primaryEconomyId === "ECON-LABOR" ? "labor_produce" : undefined,
    timestamp: nowIso(options.now)
  });
  const applied = applyResourceTransaction(content, next, transaction);
  applied.production.lastClickGain = amount;
  applied.production.lastClickWasCritical = critical;
  applied.production.totalManualClicks += 1;
  applied.production.lifetimeLaborGenerated = Number((applied.production.lifetimeLaborGenerated + amount).toFixed(3));
  applied.civilization.discoveryPoints += Math.max(1, Math.floor(amount / 10));
  return applied;
}

export const applyClickReward = performManualLaborClick;

export function advanceSimulation(content: GameRuntimeData, state: PlayerRuntimeState, options: { now?: Date; seconds?: number } = {}) {
  const now = options.now ?? new Date();
  const elapsedSeconds = options.seconds ?? secondsBetween(state.lastSimulationAt, now);
  const next = recomputeProduction(content, state);
  const economyIds = getEconomyResourceIds(content);
  const rateResults = calculateAllResourceRates(content, next);

  for (const economyId of economyIds) {
    const result = rateResults[economyId];
    const rate = result?.displayedRate ?? 0;
    next.economy.rates[economyId] = rate;
    const amount = result ? calculateOfflineGain(content, result, elapsedSeconds) : 0;
    if (amount > 0 && elapsedSeconds > 0) {
      addEconomy(content, next, economyId, amount);
      if (economyId === "ECON-LABOR") {
        const aiContribution = result.producerContributions.find((contribution) => contribution.sourceType === "ai_agent")?.amountPerSecond ?? 0;
        const autoAmount = aiContribution * elapsedSeconds;
        const passiveAmount = Math.max(0, amount - autoAmount);
        next.production.lifetimeLaborGenerated = Number((next.production.lifetimeLaborGenerated + amount).toFixed(3));
        if (autoAmount > 0) next.production.totalAutoLaborGenerated = Number((next.production.totalAutoLaborGenerated + autoAmount).toFixed(3));
        if (passiveAmount > 0) next.production.lifetimeLaborGenerated = Number(next.production.lifetimeLaborGenerated.toFixed(3));
      }
    }
    if (economyId === "ECON-LABOR" && result) {
      const aiPerSecond = result.producerContributions.find((contribution) => contribution.sourceType === "ai_agent")?.amountPerSecond ?? 0;
      if (elapsedSeconds > 0 && aiPerSecond > 0) {
      next.production.totalAutoClicks += Math.floor(elapsedSeconds);
      }
    }
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
    if (economyId === PREMIUM_CRYSTALS_ECONOMY_ID) continue;
    addEconomy(content, next, economyId, amount);
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
    if (economyId === PREMIUM_CRYSTALS_ECONOMY_ID) continue;
    if (knownEconomyIds.has(economyId)) addEconomy(content, next, economyId, amount);
  }
  next.updatedAt = nowIso();
  next.revision += 1;
  return next;
}
