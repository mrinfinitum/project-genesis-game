import type { GameRuntimeData, ResourceProducerDefinition } from "@/lib/canonical-runtime";
import { resolveAiAgentLaborAssistance } from "@/lib/player-runtime/automation";
import type { PlayerRuntimeState } from "@/lib/player-runtime/types";
import { getBehaviorContract, getCalculationRules, getOfflinePolicy, getProducersForEconomy } from "./contracts";
import { applyEconomyPrecision } from "./precision";
import { rollsToCivilization } from "./scope-rollup";

export type ResourceContribution = {
  sourceType: string;
  sourceId: string;
  amountPerSecond: number;
  scope: string;
  producerId?: string;
  label?: string;
};

export type ResourceRateResult = {
  economyId: string;
  flatBaseRate: number;
  producerContributions: ResourceContribution[];
  sourceSpecificMultipliers: number;
  civilizationMultipliers: number;
  eventMultipliers: number;
  preCapTotal: number;
  cappedTotal: number;
  displayedRate: number;
  offlineEligibleRate: number;
  pausedReasons: string[];
  sourceBreakdown: Record<string, number>;
};

function intervalRate(producer: ResourceProducerDefinition) {
  const interval = typeof producer.intervalSeconds === "number" && producer.intervalSeconds > 0 ? producer.intervalSeconds : 1;
  return producer.baseAmount / interval;
}

function eraRequirementMet(producer: ResourceProducerDefinition, state: PlayerRuntimeState) {
  const eraId = producer.requirements?.eraId;
  return typeof eraId !== "string" || eraId === state.civilization.currentEraId;
}

function boostMultiplier(state: PlayerRuntimeState, economyId: string, now = Date.now()) {
  return state.boosts.active
    .filter((boost) => Date.parse(boost.endsAt) > now)
    .filter((boost) => boost.targetSystem === "resource" || (boost.targetSystem === "auto" && economyId === "ECON-LABOR"))
    .reduce((product, boost) => product * Math.max(0, boost.multiplier), 1);
}

function sumBySource(contributions: ResourceContribution[]) {
  return contributions.reduce<Record<string, number>>((result, contribution) => {
    result[contribution.sourceType] = Number(((result[contribution.sourceType] ?? 0) + contribution.amountPerSecond).toFixed(4));
    return result;
  }, {});
}

export function calculateResourceRate(content: GameRuntimeData, state: PlayerRuntimeState, economyId: string): ResourceRateResult {
  const contract = getBehaviorContract(content, economyId);
  const producers = getProducersForEconomy(content, economyId);
  const pausedReasons: string[] = [];
  const contributions: ResourceContribution[] = [];
  const baseProducer = producers.find((producer) => producer.sourceType === "base_system" && producer.productionMode === "per_second" && eraRequirementMet(producer, state));
  const flatBaseRate = baseProducer ? intervalRate(baseProducer) : contract?.basePassiveRate ?? 0;

  if (!contract) pausedReasons.push(`missing_behavior_contract:${economyId}`);
  if (!baseProducer && (contract?.basePassiveRate ?? 0) > 0) pausedReasons.push(`missing_base_producer:${economyId}`);

  for (const producer of producers) {
    if (producer.sourceType === "base_system") continue;
    if (!eraRequirementMet(producer, state)) {
      pausedReasons.push(`${producer.id}:era_requirement_not_met`);
      continue;
    }
    if (!rollsToCivilization(content, economyId, producer.scope)) {
      pausedReasons.push(`${producer.id}:scope_not_in_civilization_rollup`);
      continue;
    }
    if (producer.productionMode !== "per_second") {
      if (producer.productionMode === "capacity") pausedReasons.push(`${producer.id}:capacity_not_current_population`);
      continue;
    }
    if (producer.sourceType === "ai_agent") {
      const assistance = resolveAiAgentLaborAssistance(content, state);
      if (!state.production.automationEnabled || assistance.totalRate <= 0) {
        pausedReasons.push(`${producer.id}:agent_offline_or_zero`);
        continue;
      }
      contributions.push({
        sourceType: "ai_agent",
        sourceId: producer.sourceId,
        amountPerSecond: assistance.totalRate,
        scope: producer.scope,
        producerId: producer.id,
        label: "AI Agent"
      });
      continue;
    }
    if (producer.sourceType === "building") {
      pausedReasons.push(`${producer.id}:building_not_owned`);
      continue;
    }
    pausedReasons.push(`${producer.id}:unsupported_or_inactive_source`);
  }

  const flatProducerTotal = contributions.reduce((sum, contribution) => sum + contribution.amountPerSecond, 0);
  const sourceSpecificMultipliers = 1;
  const civilizationMultipliers = 1;
  const eventMultipliers = boostMultiplier(state, economyId);
  const preCapTotal = (flatBaseRate + flatProducerTotal) * sourceSpecificMultipliers * civilizationMultipliers * eventMultipliers;
  const cappedTotal = applyEconomyPrecision(content, economyId, preCapTotal);
  const displayedRate = applyEconomyPrecision(content, economyId, cappedTotal, "display");
  const offlinePolicy = getOfflinePolicy(content, economyId);
  const offlineEligibleRate = offlinePolicy?.eligible ? cappedTotal : 0;

  if (contract?.basePassiveRate === 0 && contributions.length === 0 && economyId !== "ECON-LABOR") {
    pausedReasons.push(`no_active_${economyId.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_producer`);
  }

  return {
    economyId,
    flatBaseRate: applyEconomyPrecision(content, economyId, flatBaseRate),
    producerContributions: contributions,
    sourceSpecificMultipliers,
    civilizationMultipliers,
    eventMultipliers,
    preCapTotal: applyEconomyPrecision(content, economyId, preCapTotal),
    cappedTotal,
    displayedRate,
    offlineEligibleRate,
    pausedReasons,
    sourceBreakdown: {
      base_system: applyEconomyPrecision(content, economyId, flatBaseRate),
      ...sumBySource(contributions),
      calculationOrderSteps: getCalculationRules(content).multiplierOrder?.length ?? 0
    }
  };
}

export function calculateAllResourceRates(content: GameRuntimeData, state: PlayerRuntimeState) {
  return Object.fromEntries((content.economyBehaviorContracts ?? []).map((contract) => [contract.economyId, calculateResourceRate(content, state, contract.economyId)]));
}

export function resolveLaborRateBreakdown(content: GameRuntimeData, state: PlayerRuntimeState) {
  return calculateResourceRate(content, state, "ECON-LABOR");
}

export function resolveResearchRateBreakdown(content: GameRuntimeData, state: PlayerRuntimeState) {
  return calculateResourceRate(content, state, "ECON-RESEARCH");
}
