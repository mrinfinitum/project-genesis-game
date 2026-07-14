import { z } from "zod";
import type { GameRuntimeData, RuntimeValidationResult } from "./types";

const id = z.string().trim().min(1);
const finiteNumber = z.coerce.number().finite();
const optionalFiniteNumber = z
  .preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const ratioParts = trimmed.split(":").map((part) => Number(part));
    if (ratioParts.length === 2 && ratioParts.every((part) => Number.isFinite(part)) && ratioParts[1] !== 0) {
      return ratioParts[0] / ratioParts[1];
    }
    return Number(trimmed);
  }, z.number().finite().nullable())
  .optional();
const stringArray = z.array(z.string());
const unknownRecord = z.record(z.string(), z.unknown());

export const unlockRequirementSchema: z.ZodType<Record<string, unknown>> = unknownRecord;

export const visibilityRulesSchema = z.object({
  defaultState: z.string().optional(),
  revealRequirements: unlockRequirementSchema.optional(),
  availableRequirements: unlockRequirementSchema.optional(),
  hideUntilEraId: z.string().nullable().optional(),
  showTeaser: z.boolean().optional(),
  teaserOrder: finiteNumber.optional()
});

export const runtimeMetadataSchema = z.object({
  schemaVersion: z.literal("game-runtime-v1"),
  runtimeVersion: z.string().optional(),
  architectureVersion: z.string().optional(),
  contentVersion: z.number().int().positive(),
  releaseName: z.string().optional(),
  checksum: id,
  accessLevel: z.literal("public-published"),
  importedAt: z.string().optional(),
  importedFrom: z.string().optional(),
  sourceProject: z.string().optional(),
  sourceFormat: z.string().optional(),
  environment: z.string().optional(),
  validationStatus: z.enum(["Ready", "ready", "READY"])
});

export const eraDefinitionSchema = z.object({
  id,
  index: z.number().int().positive(),
  name: id,
  displayName: id,
  description: z.string(),
  unlockRequirements: unlockRequirementSchema.optional(),
  iconKey: z.string().optional(),
  artKey: z.string().optional(),
  themeKey: z.string().optional(),
  masteryRequirements: unknownRecord.optional(),
  tags: stringArray.optional()
});

export const resourceDefinitionSchema = z.object({
  id,
  name: id,
  displayName: id,
  resourceClass: id,
  category: id,
  rarity: id,
  iconKey: id,
  artKey: id,
  color: z.string().optional(),
  description: z.string(),
  discoveredEraId: id,
  usableEraId: id,
  tradable: z.boolean(),
  tags: stringArray.optional()
});

export const upgradeCategorySchema = z.object({
  id,
  name: id.optional(),
  displayName: id,
  description: z.string().optional(),
  iconKey: z.string().optional(),
  themeKey: z.string().optional(),
  unlockedAtGameStart: z.boolean().optional(),
  unlockRequirements: unlockRequirementSchema.optional(),
  order: finiteNumber,
  tags: stringArray.optional()
});

export const upgradeDefinitionSchema = z.object({
  id,
  categoryId: id,
  eraId: id,
  chainId: z.string().optional(),
  order: finiteNumber,
  name: id,
  displayName: id,
  description: z.string(),
  iconKey: z.string().optional(),
  defaultLevel: finiteNumber,
  maxLevel: finiteNumber,
  baseCost: finiteNumber,
  costResourceId: z.string().nullable(),
  costGrowthRate: finiteNumber,
  effectType: z.string(),
  baseEffectValue: finiteNumber,
  effectGrowthRate: finiteNumber,
  unlockRequirements: unlockRequirementSchema.optional(),
  nextUpgradeIds: stringArray,
  visibilityRules: visibilityRulesSchema.optional(),
  tags: stringArray.optional()
});

export const platformAssetMappingsSchema = z
  .object({
    web: z
      .object({
        path: z.string().optional()
      })
      .catchall(z.unknown())
      .optional()
  })
  .catchall(z.unknown());

export const assetDefinitionSchema = z.object({
  id,
  name: id,
  type: z.string(),
  category: z.string(),
  artKey: id,
  width: optionalFiniteNumber,
  height: optionalFiniteNumber,
  aspectRatio: optionalFiniteNumber,
  status: z.string().optional(),
  notes: z.string().optional(),
  platformMappings: platformAssetMappingsSchema.optional()
});

export const balanceDefinitionSchema = z
  .object({
    version: z.string().optional(),
    startingCivilizationEnergy: finiteNumber,
    startingCoins: finiteNumber,
    startingResearch: finiteNumber,
    startingPopulation: finiteNumber,
    baseClickPower: finiteNumber,
    baseAutoClickPower: finiteNumber,
    autosaveSeconds: finiteNumber,
    notes: z.string().optional(),
    environmentOverrides: unknownRecord.optional(),
    difficultyProfileOverrides: unknownRecord.optional()
  })
  .catchall(z.unknown());

export const clientProfileSchema = z
  .object({
    eraNavigation: z
      .object({
        dashboardMode: z.string().optional(),
        visibleEraCount: finiteNumber.optional(),
        fullTimelineEnabled: z.boolean().optional(),
        allowPrimaryHorizontalScroll: z.boolean().optional()
      })
      .optional(),
    defaultUpgradeRowsVisible: finiteNumber.optional(),
    futureUpgradeTeaserCount: finiteNumber.optional(),
    showUnknownUpgradeSlots: z.boolean().optional(),
    lockedOpacity: finiteNumber.optional(),
    availableGlowEnabled: z.boolean().optional()
  })
  .catchall(z.unknown());

export const clientProfilesSchema = z
  .object({
    default: clientProfileSchema,
    web: clientProfileSchema.optional(),
    roblox: clientProfileSchema.optional(),
    unity: clientProfileSchema.optional(),
    unreal: clientProfileSchema.optional(),
    godot: clientProfileSchema.optional()
  })
  .catchall(clientProfileSchema.optional());

export const economyDefinitionSchema = z
  .object({
    id,
    name: z.string().optional(),
    label: z.string().optional(),
    displayName: z.string().optional(),
    iconKey: z.string().optional(),
    artKey: z.string().optional(),
    color: z.string().optional(),
    balanceKey: z.string().optional(),
    startingValue: finiteNumber.optional(),
    startingAmount: finiteNumber.optional(),
    defaultValue: finiteNumber.optional(),
    startingRate: finiteNumber.optional(),
    rate: finiteNumber.optional()
  })
  .catchall(z.unknown());

export const economyRuntimeSchema = z
  .object({
    definitions: z.array(economyDefinitionSchema).optional(),
    resources: z.array(economyDefinitionSchema).optional(),
    primaryHudResources: z.array(z.union([z.string(), economyDefinitionSchema])).optional()
  })
  .catchall(z.unknown());

export const aiAgentAssetKeysSchema = z
  .object({
    head: z.string().optional(),
    ring: z.string().optional(),
    open: z.string().optional(),
    blink: z.string().optional(),
    offline: z.string().optional(),
    working: z.string().optional(),
    thinking: z.string().optional(),
    warning: z.string().optional(),
    celebration: z.string().optional(),
    portraitOpen: z.string().optional(),
    portraitBlink: z.string().optional(),
    portraitClosed: z.string().optional(),
    portraitOffline: z.string().optional(),
    portraitWorking: z.string().optional()
  })
  .catchall(z.unknown());

export const aiAgentDefinitionSchema = z
  .object({
    id,
    name: z.string().optional(),
    displayName: z.string().optional(),
    shortDisplayName: z.string().optional(),
    personalityId: z.string().optional(),
    animationProfileId: z.string().optional(),
    rarity: z.string().optional(),
    description: z.string().optional(),
    unlockRequirements: unlockRequirementSchema.optional(),
    baseVariantId: z.string().optional(),
    availableVariantIds: stringArray.optional(),
    defaultForNewPlayers: z.boolean().optional(),
    publishState: z.string().optional(),
    approvalState: z.string().optional(),
    status: z.string().optional(),
    headAssetKey: z.string().optional(),
    eyesOpenAssetKey: z.string().optional(),
    eyesBlinkAssetKey: z.string().optional(),
    eyesClosedAssetKey: z.string().optional(),
    expressionAssets: z.record(z.string(), z.string()).optional(),
    assetKeys: aiAgentAssetKeysSchema.optional(),
    capabilities: unknownRecord.optional()
  })
  .catchall(z.unknown());

export const aiAgentVariantDefinitionSchema = z
  .object({
    id,
    agentId: id,
    displayName: z.string().optional(),
    shortDisplayName: z.string().optional(),
    description: z.string().optional(),
    tier: finiteNumber.optional(),
    variantType: z.string().optional(),
    unlockRequirements: unlockRequirementSchema.optional(),
    unlockText: z.string().optional(),
    assetKeys: aiAgentAssetKeysSchema.optional(),
    safeFallbacks: z.record(z.string(), z.string()).optional(),
    status: z.string().optional(),
    approvalState: z.string().optional(),
    publishState: z.string().optional(),
    progressionMapping: unknownRecord.optional()
  })
  .catchall(z.unknown());

export const aiAgentPersonalitySchema = z
  .object({
    id,
    name: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional()
  })
  .catchall(z.unknown());

export const aiAgentAnimationProfileSchema = z
  .object({
    id,
    displayName: z.string().optional(),
    blinkMinSeconds: finiteNumber.optional(),
    blinkMaxSeconds: finiteNumber.optional(),
    minIntervalMs: finiteNumber.optional(),
    maxIntervalMs: finiteNumber.optional(),
    blinkDurationMs: finiteNumber.optional(),
    doubleBlinkChance: finiteNumber.optional(),
    blinkWhenOffline: z.boolean().optional(),
    reducedMotion: z.boolean().optional(),
    reducedMotionBehavior: z.string().optional(),
    visibleOnlyBehavior: z.string().optional(),
    allowedStates: stringArray.optional()
  })
  .catchall(z.unknown());

export const automationPresentationSchema = z
  .object({
    id: z.string().optional(),
    displayName: z.string().optional(),
    powerLabel: z.string().optional(),
    enabledLabel: z.string().optional(),
    disabledLabel: z.string().optional(),
    title: z.string().optional(),
    assistanceLabel: z.string().optional(),
    onlineLabel: z.string().optional(),
    offlineLabel: z.string().optional(),
    statusOnlineLabel: z.string().optional(),
    statusOfflineLabel: z.string().optional(),
    profileTitle: z.string().optional(),
    defaultAiAgentId: z.string().optional()
  })
  .catchall(z.unknown());

export const resourceBehaviorContractSchema = z
  .object({
    id,
    economyId: id,
    behaviorType: z.string().optional(),
    startingAmount: finiteNumber,
    basePassiveRate: finiteNumber,
    manualProduction: unknownRecord.optional(),
    automatedProduction: unknownRecord.optional(),
    buildingProduction: unknownRecord.optional(),
    eventProduction: unknownRecord.optional(),
    discoveryProduction: unknownRecord.optional(),
    purchaseProduction: unknownRecord.optional(),
    spendable: z.boolean().optional(),
    capacityResource: z.boolean().optional(),
    premiumResource: z.boolean().optional(),
    canGoNegative: z.boolean().optional(),
    integerOnly: z.boolean().optional(),
    capPolicy: unknownRecord.optional(),
    offlineProgressEligible: z.boolean().optional(),
    displayProfile: unknownRecord.optional(),
    validationRules: stringArray.optional(),
    saveBehavior: unknownRecord.optional(),
    notes: z.string().optional()
  })
  .catchall(z.unknown());

export const resourceProducerDefinitionSchema = z
  .object({
    id,
    sourceType: id,
    sourceId: id,
    economyId: id,
    scope: id,
    productionMode: id,
    baseAmount: finiteNumber,
    intervalSeconds: finiteNumber.nullable().optional(),
    requirements: unknownRecord.optional(),
    staffing: unknownRecord.optional(),
    powerCost: finiteNumber.optional(),
    inputCosts: z.array(unknownRecord).optional(),
    multipliers: z.array(unknownRecord).optional(),
    offlineEligible: z.boolean().optional(),
    activeConditions: stringArray.optional(),
    notes: z.string().optional()
  })
  .catchall(z.unknown());

export const buildingResourceEffectSchema = z
  .object({
    id,
    buildingId: id,
    buildingName: z.string().optional(),
    economyId: id,
    scope: id,
    effectKind: id,
    productionMode: id,
    amount: finiteNumber,
    intervalSeconds: finiteNumber.nullable().optional(),
    displayText: z.string().optional(),
    staffingRequirement: finiteNumber.optional(),
    eraId: z.string().optional(),
    sourceField: z.string().optional(),
    notes: z.string().optional()
  })
  .catchall(z.unknown());

export const resourceScopeRuleSchema = z
  .object({
    id,
    scope: id,
    rollupBehavior: z.string(),
    appliesToEconomyIds: stringArray,
    doubleCountingRule: z.string().optional(),
    notes: z.string().optional()
  })
  .catchall(z.unknown());

export const resourceOfflinePolicySchema = z
  .object({
    id,
    economyId: id,
    eligible: z.boolean(),
    maximumOfflineSeconds: finiteNumber,
    producerEligibility: z.string().optional(),
    capBehavior: z.string().optional(),
    suspendedConditions: stringArray.optional(),
    deterministicOrder: stringArray.optional()
  })
  .catchall(z.unknown());

export const resourceRateBreakdownDefinitionSchema = z
  .object({
    id,
    economyId: id,
    labels: z.array(unknownRecord).optional(),
    formula: z.string().optional(),
    displayRule: z.string().optional()
  })
  .catchall(z.unknown());

export const resourceTransactionReasonSchema = z
  .object({
    id,
    economyId: id,
    operation: id,
    sourceTypes: stringArray,
    serverAuthoritativeRequired: z.boolean().optional(),
    playerHistoryOwnedBy: z.string().optional(),
    notes: z.string().optional()
  })
  .catchall(z.unknown());

export const inventoryResourceMetadataSchema = z
  .object({
    id,
    resourceId: id,
    displayName: z.string().optional(),
    classification: z.string().optional(),
    productionSources: stringArray.optional(),
    consumptionUses: stringArray.optional(),
    storageRules: unknownRecord.optional(),
    buildingRelationships: stringArray.optional(),
    researchRelationships: stringArray.optional(),
    planetAvailability: stringArray.optional(),
    eraAvailability: stringArray.optional(),
    relationshipStatus: z.string().optional()
  })
  .catchall(z.unknown());

export const resourceCalculationRulesSchema = z
  .object({
    id: z.string().optional(),
    multiplierOrder: stringArray.optional(),
    multiplierStacking: unknownRecord.optional(),
    rounding: unknownRecord.optional(),
    laborFormula: unknownRecord.optional()
  })
  .catchall(z.unknown());

export const gameRuntimeDataSchema = z.object({
  metadata: runtimeMetadataSchema,
  eras: z.array(eraDefinitionSchema),
  resources: z.array(resourceDefinitionSchema),
  upgradeCategories: z.array(upgradeCategorySchema),
  upgrades: z.array(upgradeDefinitionSchema),
  assets: z.array(assetDefinitionSchema),
  balance: balanceDefinitionSchema,
  clientProfiles: clientProfilesSchema,
  economy: economyRuntimeSchema.optional(),
  economyDefinitions: z.array(economyDefinitionSchema).optional(),
  economyBehaviorContracts: z.array(resourceBehaviorContractSchema).optional(),
  eraEconomyProfiles: z.array(unknownRecord).optional(),
  economyUsageRelationships: unknownRecord.optional(),
  inventoryResourceMetadata: z.array(inventoryResourceMetadataSchema).optional(),
  resourceProducerDefinitions: z.array(resourceProducerDefinitionSchema).optional(),
  buildingResourceEffects: z.array(buildingResourceEffectSchema).optional(),
  economyScopeRules: z.array(resourceScopeRuleSchema).optional(),
  economyTransactionReasons: z.array(resourceTransactionReasonSchema).optional(),
  economyRateBreakdownDefinitions: z.array(resourceRateBreakdownDefinitionSchema).optional(),
  offlineProgressionPolicies: z.array(resourceOfflinePolicySchema).optional(),
  economyCalculationRules: resourceCalculationRulesSchema.optional(),
  defaultAiAgentId: z.string().optional(),
  aiAgents: z.array(aiAgentDefinitionSchema).optional(),
  aiAgentVariants: z.array(aiAgentVariantDefinitionSchema).optional(),
  aiAgentPersonalities: z.array(aiAgentPersonalitySchema).optional(),
  aiAgentAnimationProfiles: z.array(aiAgentAnimationProfileSchema).optional(),
  automationPresentation: automationPresentationSchema.optional(),
  aiAgentSaveSchema: unknownRecord.optional()
});

function requireUnique(values: string[], label: string, errors: string[]) {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      errors.push(`${label} contains duplicate id "${value}".`);
    }

    seen.add(value);
  }
}

function validateRequirementReferences(
  owner: string,
  requirement: Record<string, unknown> | undefined,
  ids: { eras: Set<string>; resources: Set<string>; upgrades: Set<string> },
  errors: string[]
) {
  if (!requirement) {
    return;
  }

  const eraId = requirement.eraId ?? requirement.previousEraId ?? requirement.hideUntilEraId;
  if (typeof eraId === "string" && !ids.eras.has(eraId)) {
    errors.push(`${owner} references unknown era "${eraId}".`);
  }

  const resourceId = requirement.resourceId ?? requirement.costResourceId;
  if (typeof resourceId === "string" && !ids.resources.has(resourceId)) {
    errors.push(`${owner} references unknown resource "${resourceId}".`);
  }

  const upgradeId = requirement.upgradeId ?? requirement.requiredUpgradeId;
  if (typeof upgradeId === "string" && !ids.upgrades.has(upgradeId)) {
    errors.push(`${owner} references unknown upgrade "${upgradeId}".`);
  }
}

export function validateGameRuntimeData(input: unknown): RuntimeValidationResult {
  const parsed = gameRuntimeDataSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`),
      warnings: []
    };
  }

  const payload = parsed.data as GameRuntimeData;
  const errors: string[] = [];
  const warnings: string[] = [];
  const eraIds = new Set(payload.eras.map((era) => era.id));
  const resourceIds = new Set(payload.resources.map((resource) => resource.id));
  const categoryIds = new Set(payload.upgradeCategories.map((category) => category.id));
  const upgradeIds = new Set(payload.upgrades.map((upgrade) => upgrade.id));
  const assetIds = new Set(payload.assets.map((asset) => asset.id));
  const assetKeys = new Set(payload.assets.map((asset) => asset.artKey));
  const ids = { eras: eraIds, resources: resourceIds, upgrades: upgradeIds };

  if (payload.metadata.contentVersion < 3) {
    errors.push(`Expected canonical contentVersion 3 or newer, received ${payload.metadata.contentVersion}.`);
  }

  if (payload.eras.length !== 9) {
    errors.push(`Expected exactly 9 canonical eras, received ${payload.eras.length}.`);
  }

  if (payload.upgradeCategories.length !== 4) {
    errors.push(`Expected exactly 4 upgrade categories, received ${payload.upgradeCategories.length}.`);
  }

  requireUnique(payload.eras.map((era) => era.id), "eras", errors);
  requireUnique(payload.resources.map((resource) => resource.id), "resources", errors);
  requireUnique(payload.upgradeCategories.map((category) => category.id), "upgradeCategories", errors);
  requireUnique(payload.upgrades.map((upgrade) => upgrade.id), "upgrades", errors);
  requireUnique(payload.assets.map((asset) => asset.id), "assets", errors);

  for (const era of payload.eras) {
    validateRequirementReferences(`era "${era.id}"`, era.unlockRequirements, ids, errors);
  }

  for (const resource of payload.resources) {
    if (!eraIds.has(resource.discoveredEraId)) {
      errors.push(`resource "${resource.id}" references unknown discoveredEraId "${resource.discoveredEraId}".`);
    }

    if (!eraIds.has(resource.usableEraId)) {
      errors.push(`resource "${resource.id}" references unknown usableEraId "${resource.usableEraId}".`);
    }
  }

  for (const upgrade of payload.upgrades) {
    if (!categoryIds.has(upgrade.categoryId)) {
      errors.push(`upgrade "${upgrade.id}" references unknown categoryId "${upgrade.categoryId}".`);
    }

    if (!eraIds.has(upgrade.eraId)) {
      errors.push(`upgrade "${upgrade.id}" references unknown eraId "${upgrade.eraId}".`);
    }

    if (upgrade.costResourceId && !resourceIds.has(upgrade.costResourceId)) {
      errors.push(`upgrade "${upgrade.id}" references unknown costResourceId "${upgrade.costResourceId}".`);
    }

    for (const nextUpgradeId of upgrade.nextUpgradeIds) {
      if (!upgradeIds.has(nextUpgradeId)) {
        errors.push(`upgrade "${upgrade.id}" references unknown nextUpgradeId "${nextUpgradeId}".`);
      }
    }

    validateRequirementReferences(`upgrade "${upgrade.id}" unlockRequirements`, upgrade.unlockRequirements, ids, errors);
    validateRequirementReferences(`upgrade "${upgrade.id}" revealRequirements`, upgrade.visibilityRules?.revealRequirements, ids, errors);
    validateRequirementReferences(`upgrade "${upgrade.id}" availableRequirements`, upgrade.visibilityRules?.availableRequirements, ids, errors);

    if (upgrade.visibilityRules?.hideUntilEraId && !eraIds.has(upgrade.visibilityRules.hideUntilEraId)) {
      errors.push(`upgrade "${upgrade.id}" references unknown hideUntilEraId "${upgrade.visibilityRules.hideUntilEraId}".`);
    }
  }

  for (const asset of payload.assets) {
    const webPath = asset.platformMappings?.web?.path;

    if (webPath && typeof webPath === "string" && !webPath.startsWith("/") && !webPath.startsWith("https://")) {
      errors.push(`asset "${asset.id}" has invalid web path "${webPath}".`);
    }

    if (!asset.artKey.trim()) {
      errors.push(`asset "${asset.id}" is missing artKey.`);
    }
  }

  const requiredBalanceKeys = [
    "startingCivilizationEnergy",
    "startingCoins",
    "startingResearch",
    "startingPopulation",
    "baseClickPower",
    "baseAutoClickPower",
    "autosaveSeconds"
  ];

  for (const key of requiredBalanceKeys) {
    if (typeof payload.balance[key] !== "number" || !Number.isFinite(payload.balance[key])) {
      errors.push(`balance.${key} must be a finite number.`);
    }
  }

  if (!assetIds.size) {
    warnings.push("No runtime assets were provided.");
  }

  if (!assetKeys.size) {
    warnings.push("No runtime asset keys were provided.");
  }

  return {
    ok: errors.length === 0,
    payload: errors.length === 0 ? payload : undefined,
    errors,
    warnings
  };
}
