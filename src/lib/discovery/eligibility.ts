import type { DiscoveryEligibilityResult, DiscoveryEligibilityRules, DiscoveryPlayerProgress, DiscoveryRecord, PlanetDiscoveryEnvironment } from "./types";

const NUMERIC_RULES = [
  "temperature",
  "gravity",
  "humidity",
  "waterCoverage",
  "radiation",
  "volcanism",
  "biosphereMaturity",
  "biologicalDiversity",
  "civilizationPresence",
  "ruinPresence",
  "anomalyInfluence"
] as const;

function intersection(a: string[] = [], b: string[] = []) {
  const bSet = new Set(b.map((value) => value.toLowerCase()));
  return a.some((value) => bSet.has(value.toLowerCase()));
}

function readRules(discovery: DiscoveryRecord): DiscoveryEligibilityRules {
  return {
    ...(discovery.spawnProfile?.eligibility ?? {}),
    ...(discovery.eligibility ?? {})
  };
}

function testArrayRule(label: string, required: string[] | undefined, actual: string[] | undefined, result: DiscoveryEligibilityResult) {
  if (!required?.length) return;
  if (intersection(required, actual)) {
    result.matchedRules.push(label);
  } else {
    result.failedRules.push(label);
  }
}

function testNumberRule(label: typeof NUMERIC_RULES[number], rules: DiscoveryEligibilityRules, environment: PlanetDiscoveryEnvironment, result: DiscoveryEligibilityResult) {
  const range = rules[label];
  if (!range) return;
  const value = environment[label];
  if (typeof value !== "number") {
    result.failedRules.push(label);
    return;
  }
  const min = typeof range.min === "number" ? range.min : Number.NEGATIVE_INFINITY;
  const max = typeof range.max === "number" ? range.max : Number.POSITIVE_INFINITY;
  if (value >= min && value <= max) {
    result.matchedRules.push(label);
  } else {
    result.failedRules.push(label);
  }
}

export function evaluateDiscoveryEligibility(discovery: DiscoveryRecord, environment: PlanetDiscoveryEnvironment, playerProgress: DiscoveryPlayerProgress): DiscoveryEligibilityResult {
  const rules = readRules(discovery);
  const result: DiscoveryEligibilityResult = {
    eligible: true,
    matchedRules: [],
    failedRules: [],
    requiredProgressMissing: [],
    requiredEquipmentMissing: [],
    resolvedModifiers: {}
  };

  testArrayRule("planetClassIds", rules.planetClassIds, environment.planetClassIds, result);
  testArrayRule("planetSubclassIds", rules.planetSubclassIds, environment.planetSubclassIds, result);
  testArrayRule("biomeIds", rules.biomeIds, environment.biomeIds, result);
  testArrayRule("atmosphereIds", rules.atmosphereIds, environment.atmosphereIds, result);
  testArrayRule("terrainIds", rules.terrainIds, environment.terrainIds, result);
  testArrayRule("locationTypes", rules.locationTypes, environment.locationType ? [environment.locationType] : [], result);

  for (const rule of NUMERIC_RULES) testNumberRule(rule, rules, environment, result);

  for (const researchId of rules.requiredResearchIds ?? []) {
    if (playerProgress.completedResearchIds.includes(researchId)) result.matchedRules.push(`research:${researchId}`);
    else result.requiredProgressMissing.push(researchId);
  }

  for (const equipmentId of rules.requiredEquipmentIds ?? []) {
    if (playerProgress.equipmentIds.includes(equipmentId)) result.matchedRules.push(`equipment:${equipmentId}`);
    else result.requiredEquipmentMissing.push(equipmentId);
  }

  if (rules.requiredEraIds?.length) {
    if (playerProgress.currentEraId && rules.requiredEraIds.includes(playerProgress.currentEraId)) result.matchedRules.push("requiredEraIds");
    else result.requiredProgressMissing.push(...rules.requiredEraIds);
  }

  result.eligible = result.failedRules.length === 0 && result.requiredProgressMissing.length === 0 && result.requiredEquipmentMissing.length === 0;
  return result;
}
