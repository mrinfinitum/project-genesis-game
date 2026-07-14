import type {
  BuildingResourceEffect,
  GameRuntimeData,
  ResourceBehaviorContract,
  ResourceCalculationRules,
  ResourceOfflinePolicy,
  ResourceProducerDefinition,
  ResourceRateBreakdownDefinition,
  ResourceScopeRule,
  ResourceTransactionReason
} from "@/lib/canonical-runtime";

export const V14_ECONOMY_IDS = [
  "ECON-LABOR",
  "ECON-CREDITS",
  "ECON-POPULATION",
  "ECON-RESEARCH",
  "ECON-PREMIUM-CRYSTALS"
] as const;

export type V14EconomyId = typeof V14_ECONOMY_IDS[number];

export type ResourceContractVerification = {
  ok: boolean;
  contentVersion: number;
  checksum: string;
  counts: {
    behaviorContracts: number;
    producers: number;
    buildingEffects: number;
    scopeRules: number;
    transactionReasons: number;
    rateBreakdowns: number;
    offlinePolicies: number;
  };
  failures: string[];
};

export function getBehaviorContracts(content: GameRuntimeData): ResourceBehaviorContract[] {
  return content.economyBehaviorContracts ?? [];
}

export function getBehaviorContract(content: GameRuntimeData, economyId: string) {
  return getBehaviorContracts(content).find((contract) => contract.economyId === economyId);
}

export function getProducerDefinitions(content: GameRuntimeData): ResourceProducerDefinition[] {
  return content.resourceProducerDefinitions ?? [];
}

export function getProducersForEconomy(content: GameRuntimeData, economyId: string) {
  return getProducerDefinitions(content).filter((producer) => producer.economyId === economyId);
}

export function getBuildingResourceEffects(content: GameRuntimeData): BuildingResourceEffect[] {
  return content.buildingResourceEffects ?? [];
}

export function getScopeRules(content: GameRuntimeData): ResourceScopeRule[] {
  return content.economyScopeRules ?? [];
}

export function getTransactionReasons(content: GameRuntimeData): ResourceTransactionReason[] {
  return content.economyTransactionReasons ?? [];
}

export function getRateBreakdownDefinition(content: GameRuntimeData, economyId: string): ResourceRateBreakdownDefinition | undefined {
  return content.economyRateBreakdownDefinitions?.find((definition) => definition.economyId === economyId);
}

export function getOfflinePolicy(content: GameRuntimeData, economyId: string): ResourceOfflinePolicy | undefined {
  return content.offlineProgressionPolicies?.find((policy) => policy.economyId === economyId);
}

export function getCalculationRules(content: GameRuntimeData): ResourceCalculationRules {
  return content.economyCalculationRules ?? {};
}

export function getStartingAmountFromContract(content: GameRuntimeData, economyId: string) {
  return getBehaviorContract(content, economyId)?.startingAmount;
}

export function getBasePassiveRateFromContract(content: GameRuntimeData, economyId: string) {
  return getBehaviorContract(content, economyId)?.basePassiveRate;
}

export function verifyResourceEconomyContracts(content: GameRuntimeData): ResourceContractVerification {
  const failures: string[] = [];
  const behaviorContracts = getBehaviorContracts(content);
  const contractIds = new Set(behaviorContracts.map((contract) => contract.economyId));

  if ((content.metadata.runtimeVersion ?? content.metadata.schemaVersion) !== "game-runtime-v1") failures.push(`Expected runtimeVersion game-runtime-v1, got ${content.metadata.runtimeVersion ?? content.metadata.schemaVersion}.`);
  if (content.metadata.architectureVersion !== "1.0.0") failures.push(`Expected architectureVersion 1.0.0, got ${content.metadata.architectureVersion ?? "missing"}.`);
  if (content.metadata.contentVersion < 14) failures.push(`Expected Studio contentVersion 14 or newer, got ${content.metadata.contentVersion}.`);
  for (const economyId of V14_ECONOMY_IDS) {
    if (!contractIds.has(economyId)) failures.push(`Missing resource behavior contract for ${economyId}.`);
  }
  if (behaviorContracts.length !== 5) failures.push(`Expected exactly five resource behavior contracts, got ${behaviorContracts.length}.`);
  if (!content.resourceProducerDefinitions?.length) failures.push("Missing resource producer definitions.");
  if (!content.buildingResourceEffects?.length) failures.push("Missing building resource effects.");
  if (!content.economyScopeRules?.length) failures.push("Missing economy scope rules.");
  if (!content.economyTransactionReasons?.length) failures.push("Missing economy transaction reason codes.");
  if (!content.economyRateBreakdownDefinitions?.length) failures.push("Missing economy rate breakdown definitions.");
  if (!content.offlineProgressionPolicies?.length) failures.push("Missing offline progression policies.");
  if (!content.economyCalculationRules?.multiplierOrder?.length) failures.push("Missing deterministic calculation order.");
  if (!content.economyCalculationRules?.rounding) failures.push("Missing economy rounding/precision rules.");

  return {
    ok: failures.length === 0,
    contentVersion: content.metadata.contentVersion,
    checksum: content.metadata.checksum,
    counts: {
      behaviorContracts: behaviorContracts.length,
      producers: content.resourceProducerDefinitions?.length ?? 0,
      buildingEffects: content.buildingResourceEffects?.length ?? 0,
      scopeRules: content.economyScopeRules?.length ?? 0,
      transactionReasons: content.economyTransactionReasons?.length ?? 0,
      rateBreakdowns: content.economyRateBreakdownDefinitions?.length ?? 0,
      offlinePolicies: content.offlineProgressionPolicies?.length ?? 0
    },
    failures
  };
}
