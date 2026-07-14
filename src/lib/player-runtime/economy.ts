import type { GameRuntimeData, PrimaryHudResourceDefinition } from "@/lib/canonical-runtime";
import { getBasePassiveRateFromContract, getBehaviorContract, getStartingAmountFromContract } from "@/lib/economy/contracts";

export const CREDITS_ECONOMY_ID = "ECON-CREDITS";
export const POPULATION_ECONOMY_ID = "ECON-POPULATION";
export const LABOR_ECONOMY_ID = "ECON-LABOR";
export const LEGACY_CIVILIZATION_ENERGY_ECONOMY_ID = "ECON-CIVILIZATION-ENERGY";
export const RESEARCH_ECONOMY_ID = "ECON-RESEARCH";
export const CIVILIZATION_POINTS_ECONOMY_ID = "ECON-CIVILIZATION-POINTS";
export const PREMIUM_CRYSTALS_ECONOMY_ID = "ECON-PREMIUM-CRYSTALS";

const STARTING_VALUE_KEYS = ["startingValue", "startingAmount", "defaultValue"] as const;
const STARTING_RATE_KEYS = ["startingRate", "rate"] as const;

function balanceNumber(content: GameRuntimeData, key: string) {
  const value = (content.balance as unknown as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function getCanonicalStartingEconomyBalance(content: GameRuntimeData, economyId: string) {
  switch (economyId) {
    case CREDITS_ECONOMY_ID:
      return balanceNumber(content, "startingCredits") ?? balanceNumber(content, "startingCoins") ?? 0;
    case POPULATION_ECONOMY_ID:
      return balanceNumber(content, "startingPopulation") ?? 0;
    case LABOR_ECONOMY_ID:
      return balanceNumber(content, "startingCivilizationEnergy") ?? 0;
    case RESEARCH_ECONOMY_ID:
      return balanceNumber(content, "startingResearch") ?? 0;
    case CIVILIZATION_POINTS_ECONOMY_ID:
    case PREMIUM_CRYSTALS_ECONOMY_ID:
      return 0;
    default:
      return undefined;
  }
}

export function getCanonicalStartingEconomyRate(_content: GameRuntimeData, economyId: string) {
  switch (economyId) {
    case POPULATION_ECONOMY_ID:
    case CREDITS_ECONOMY_ID:
    case LABOR_ECONOMY_ID:
    case RESEARCH_ECONOMY_ID:
    case CIVILIZATION_POINTS_ECONOMY_ID:
    case PREMIUM_CRYSTALS_ECONOMY_ID:
      return 0;
    default:
      return undefined;
  }
}

function normalizeEconomyDefinition(input: unknown): PrimaryHudResourceDefinition | undefined {
  if (!input || typeof input !== "object") return undefined;
  const record = input as Record<string, unknown>;
  const id = typeof record.economyId === "string" ? record.economyId : typeof record.resourceId === "string" ? record.resourceId : typeof record.id === "string" ? record.id : undefined;
  if (!id) return undefined;

  return {
    id,
    economyId: typeof record.economyId === "string" ? record.economyId : undefined,
    compactLabel: typeof record.compactLabel === "string" ? record.compactLabel : undefined,
    name: typeof record.name === "string" ? record.name : undefined,
    displayName: typeof record.displayName === "string" ? record.displayName : undefined,
    label: typeof record.label === "string" ? record.label : typeof record.compactLabel === "string" ? record.compactLabel : typeof record.displayName === "string" ? record.displayName : typeof record.name === "string" ? record.name : undefined,
    iconKey: typeof record.iconKey === "string" ? record.iconKey : undefined,
    artKey: typeof record.artKey === "string" ? record.artKey : undefined,
    color: typeof record.color === "string" ? record.color : undefined,
    order: typeof record.order === "number" ? record.order : undefined,
    showRate: typeof record.showRate === "boolean" ? record.showRate : undefined,
    formatting: record.formatting && typeof record.formatting === "object" ? record.formatting as Record<string, unknown> : undefined,
    playerFacingHelpText: typeof record.playerFacingHelpText === "string" ? record.playerFacingHelpText : undefined,
    spendable: typeof record.spendable === "boolean" ? record.spendable : undefined,
    valueType: typeof record.valueType === "string" ? record.valueType : undefined,
    semantics: Array.isArray(record.semantics) ? record.semantics.filter((item): item is string => typeof item === "string") : undefined,
    supportsCaps: typeof record.supportsCaps === "boolean" ? record.supportsCaps : undefined,
    balanceKey: typeof record.balanceKey === "string" ? record.balanceKey : undefined,
    startingValue: typeof record.startingValue === "number" ? record.startingValue : undefined,
    startingAmount: typeof record.startingAmount === "number" ? record.startingAmount : undefined,
    defaultValue: typeof record.defaultValue === "number" ? record.defaultValue : undefined,
    startingRate: typeof record.startingRate === "number" ? record.startingRate : undefined,
    rate: typeof record.rate === "number" ? record.rate : undefined
  };
}

function normalizeHudSlot(input: unknown): PrimaryHudResourceDefinition | undefined {
  if (typeof input === "string" && input.trim()) {
    return { id: input };
  }
  return normalizeEconomyDefinition(input);
}

function stringRecord(input: unknown): Record<string, string> | undefined {
  if (!input || typeof input !== "object") return undefined;
  const entries = Object.entries(input as Record<string, unknown>).filter(([, value]) => typeof value === "string") as Array<[string, string]>;
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function nestedStringRecord(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = stringRecord(record[key]);
    if (value) return value;
  }
  return undefined;
}

const LABOR_ERA_LABEL_FALLBACKS: Record<string, string> = {
  survival: "Labor",
  ancient: "Labor",
  medieval: "Workforce",
  renaissance: "Workforce",
  industrial: "Industrial Workforce",
  modern: "Human Capital",
  "space-age": "Workforce",
  interstellar: "Civilization Output",
  galactic: "Galactic Output"
};

export function resolveEconomyDisplayLabel(content: GameRuntimeData, economyId: string, currentEraId?: string) {
  const definition = getEconomyDefinitions(content).find((item) => item.id === economyId);
  if (!definition) return economyId;
  const record = definition as unknown as Record<string, unknown>;
  const eraLabels = nestedStringRecord(record, ["eraDisplayLabels", "eraDisplayNames", "eraLabels", "displayNamesByEra", "labelByEra", "eraDisplayOverrides", "displayOverrides"]);
  const canonicalEraLabel = currentEraId ? eraLabels?.[currentEraId] : undefined;
  const fallbackEraLabel = economyId === LABOR_ECONOMY_ID && currentEraId ? LABOR_ERA_LABEL_FALLBACKS[currentEraId] : undefined;
  return canonicalEraLabel ?? fallbackEraLabel ?? definition.label ?? definition.compactLabel ?? definition.displayName ?? definition.name ?? economyId;
}

export function getEconomyDefinitions(content: GameRuntimeData): PrimaryHudResourceDefinition[] {
  return [
    ...(content.economyDefinitions ?? []),
    ...(content.economy?.definitions ?? []),
    ...(content.economy?.resources ?? []),
    ...(content.economy?.primaryHudResources ?? []).map(normalizeEconomyDefinition).filter((definition): definition is PrimaryHudResourceDefinition => Boolean(definition))
  ];
}

function profileRecord(input: unknown): Record<string, unknown> | undefined {
  return input && typeof input === "object" ? input as Record<string, unknown> : undefined;
}

function profileMatchesEra(profile: Record<string, unknown>, currentEraId: string) {
  return [profile.eraId, profile.id, profile.name].some((value) => value === currentEraId);
}

function profileFromCollection(collection: unknown, currentEraId?: string) {
  if (!collection || !currentEraId) return undefined;
  if (Array.isArray(collection)) {
    return collection.map(profileRecord).find((profile) => profile && profileMatchesEra(profile, currentEraId));
  }
  const record = profileRecord(collection);
  if (!record) return undefined;
  return profileRecord(record[currentEraId]);
}

export function resolveEraEconomyProfile(content: GameRuntimeData, currentEraId?: string): Record<string, unknown> {
  const contentRecord = content as unknown as Record<string, unknown>;
  const economyRecord = profileRecord(content.economy);
  const webProfile = profileRecord(content.clientProfiles.web);
  const defaultProfile = profileRecord(content.clientProfiles.default);
  const candidates = [
    profileFromCollection(contentRecord.eraEconomyProfiles, currentEraId),
    profileFromCollection(economyRecord?.eraEconomyProfiles, currentEraId),
    profileFromCollection(economyRecord?.profiles, currentEraId),
    profileFromCollection(webProfile?.eraEconomyProfiles, currentEraId),
    profileFromCollection(defaultProfile?.eraEconomyProfiles, currentEraId),
    webProfile,
    defaultProfile,
    economyRecord
  ];

  return candidates.find((candidate): candidate is Record<string, unknown> => Boolean(candidate)) ?? {};
}

function getConfiguredHudSlots(content: GameRuntimeData, currentEraId?: string) {
  const profile = resolveEraEconomyProfile(content, currentEraId);
  const hudSlots = Array.isArray(profile.hudSlots) ? profile.hudSlots : [];
  const profileSlots = Array.isArray(profile.primaryHudSlots) ? profile.primaryHudSlots : [];
  const profileResources = Array.isArray(profile.primaryHudResources) ? profile.primaryHudResources : [];
  const fixedHudSlots = Array.isArray(profile.fixedHudSlots) ? profile.fixedHudSlots : [];
  const visibleHudEconomyIds = Array.isArray(profile.visibleHudEconomyIds) ? profile.visibleHudEconomyIds : [];
  const economySlots = Array.isArray(content.economy?.primaryHudResources) ? content.economy.primaryHudResources : [];
  if (hudSlots.length) return hudSlots;
  if (profileSlots.length) return profileSlots;
  if (profileResources.length) return profileResources;
  if (fixedHudSlots.length) return fixedHudSlots;
  if (visibleHudEconomyIds.length) return visibleHudEconomyIds;
  return economySlots;
}

export function getPrimaryHudResources(content: GameRuntimeData, currentEraId?: string): PrimaryHudResourceDefinition[] {
  const definitions = new Map(getEconomyDefinitions(content).map((definition) => [definition.id, definition]));
  const configuredSlots = getConfiguredHudSlots(content, currentEraId);

  return configuredSlots
    .map(normalizeHudSlot)
    .filter((slot): slot is PrimaryHudResourceDefinition => Boolean(slot))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((slot) => {
      const canonical = definitions.get(slot.id);
      if (canonical) return { ...canonical, ...slot, label: resolveEconomyDisplayLabel(content, slot.id, currentEraId) };
      return { ...slot, missingDefinition: true };
    });
}

export function getPrimaryHudResourceIds(content: GameRuntimeData, currentEraId?: string) {
  return getPrimaryHudResources(content, currentEraId).map((resource) => resource.id);
}

function stringField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

export function resolvePrimaryEconomyIdForCurrentEra(content: GameRuntimeData, currentEraId?: string) {
  const profile = resolveEraEconomyProfile(content, currentEraId);
  const explicitPrimary = stringField(profile, ["primaryEconomyId", "primaryEconomyResourceId", "manualClickEconomyId", "primaryResourceId"]);
  const ids = new Set(getEconomyResourceIds(content));
  if (explicitPrimary && ids.has(explicitPrimary)) return explicitPrimary;

  const configuredIds = new Set(getPrimaryHudResources(content, currentEraId).map((resource) => resource.id));
  const manualClickDefinition = getEconomyDefinitions(content).find((definition) => {
    const manualClickTarget = (definition as unknown as Record<string, unknown>).manualClickTarget;
    return manualClickTarget === true && (!configuredIds.size || configuredIds.has(definition.id));
  });
  if (manualClickDefinition) return manualClickDefinition.id;

  if (ids.has(LABOR_ECONOMY_ID)) return LABOR_ECONOMY_ID;
  if (ids.has(LEGACY_CIVILIZATION_ENERGY_ECONOMY_ID)) return LEGACY_CIVILIZATION_ENERGY_ECONOMY_ID;
  return undefined;
}

export function getEconomyResourceIds(content: GameRuntimeData) {
  return getEconomyDefinitions(content).map((definition) => definition.id);
}

export function getInventoryResources(content: GameRuntimeData) {
  const hudIds = new Set(getEconomyResourceIds(content));
  return content.resources.filter((resource) => !hudIds.has(resource.id));
}

function numericField(resource: PrimaryHudResourceDefinition, keys: readonly string[]) {
  const record = resource as unknown as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

export function getStartingEconomyBalances(content: GameRuntimeData) {
  return Object.fromEntries(
    getEconomyDefinitions(content).map((resource) => {
      const canonicalValue = numericField(resource, STARTING_VALUE_KEYS);
      const balanceValue = resource.balanceKey ? content.balance[resource.balanceKey] : undefined;
      const amount = getStartingAmountFromContract(content, resource.id) ?? canonicalValue ?? (typeof balanceValue === "number" && Number.isFinite(balanceValue) ? balanceValue : getCanonicalStartingEconomyBalance(content, resource.id) ?? 0);
      return [resource.id, amount];
    })
  );
}

export function getStartingEconomyRates(content: GameRuntimeData) {
  return Object.fromEntries(
    getEconomyDefinitions(content).map((resource) => [resource.id, getBasePassiveRateFromContract(content, resource.id) ?? numericField(resource, STARTING_RATE_KEYS) ?? getCanonicalStartingEconomyRate(content, resource.id) ?? 0])
  );
}

export function getEconomyWarnings(content: GameRuntimeData) {
  const warnings: string[] = [];
  const definitions = getEconomyDefinitions(content);
  const slots = getPrimaryHudResources(content);

  if (!slots.length) {
    warnings.push("Canonical HUD economy configuration is missing.");
  }

  if (!definitions.length) {
    warnings.push("Canonical economy definitions are missing.");
  }

  for (const slot of slots) {
    if (slot.missingDefinition) {
      warnings.push(`Canonical economy definition missing for ${slot.id}.`);
    }
  }

  return warnings;
}

export function getResourceBehaviorContract(content: GameRuntimeData, economyId: string) {
  return getBehaviorContract(content, economyId);
}
