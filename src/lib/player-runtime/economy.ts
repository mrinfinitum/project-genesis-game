import type { GameRuntimeData, PrimaryHudResourceDefinition } from "@/lib/canonical-runtime";

export const CREDITS_ECONOMY_ID = "ECON-CREDITS";
export const POPULATION_ECONOMY_ID = "ECON-POPULATION";
export const LABOR_ECONOMY_ID = "ECON-CIVILIZATION-ENERGY";
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

export function getCanonicalStartingEconomyRate(content: GameRuntimeData, economyId: string) {
  switch (economyId) {
    case CREDITS_ECONOMY_ID:
      return balanceNumber(content, "creditsPerSecond") ?? balanceNumber(content, "incomePerSecond") ?? 1;
    case POPULATION_ECONOMY_ID:
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
  const id = typeof record.id === "string" ? record.id : typeof record.resourceId === "string" ? record.resourceId : undefined;
  if (!id) return undefined;

  return {
    id,
    name: typeof record.name === "string" ? record.name : undefined,
    displayName: typeof record.displayName === "string" ? record.displayName : undefined,
    label: typeof record.label === "string" ? record.label : typeof record.displayName === "string" ? record.displayName : typeof record.name === "string" ? record.name : undefined,
    iconKey: typeof record.iconKey === "string" ? record.iconKey : undefined,
    artKey: typeof record.artKey === "string" ? record.artKey : undefined,
    color: typeof record.color === "string" ? record.color : undefined,
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

export function getEconomyDefinitions(content: GameRuntimeData): PrimaryHudResourceDefinition[] {
  return [
    ...(content.economyDefinitions ?? []),
    ...(content.economy?.definitions ?? []),
    ...(content.economy?.resources ?? []),
    ...(content.economy?.primaryHudResources ?? []).map(normalizeEconomyDefinition).filter((definition): definition is PrimaryHudResourceDefinition => Boolean(definition))
  ];
}

export function getPrimaryHudResources(content: GameRuntimeData): PrimaryHudResourceDefinition[] {
  const definitions = new Map(getEconomyDefinitions(content).map((definition) => [definition.id, definition]));
  const configuredSlots = [
    ...(content.clientProfiles.default.primaryHudResources ?? []),
    ...(content.economy?.primaryHudResources ?? [])
  ];

  return configuredSlots
    .map(normalizeHudSlot)
    .filter((slot): slot is PrimaryHudResourceDefinition => Boolean(slot))
    .map((slot) => {
      const canonical = definitions.get(slot.id);
      if (canonical) return { ...slot, ...canonical };
      return { ...slot, missingDefinition: true };
    });
}

export function getPrimaryHudResourceIds(content: GameRuntimeData) {
  return getPrimaryHudResources(content).map((resource) => resource.id);
}

export function getInventoryResources(content: GameRuntimeData) {
  const hudIds = new Set(getPrimaryHudResourceIds(content));
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
    getPrimaryHudResources(content).map((resource) => {
      const canonicalValue = numericField(resource, STARTING_VALUE_KEYS);
      const balanceValue = resource.balanceKey ? content.balance[resource.balanceKey] : undefined;
      const amount = canonicalValue ?? (typeof balanceValue === "number" && Number.isFinite(balanceValue) ? balanceValue : getCanonicalStartingEconomyBalance(content, resource.id) ?? 0);
      return [resource.id, amount];
    })
  );
}

export function getStartingEconomyRates(content: GameRuntimeData) {
  return Object.fromEntries(
    getPrimaryHudResources(content).map((resource) => [resource.id, numericField(resource, STARTING_RATE_KEYS) ?? getCanonicalStartingEconomyRate(content, resource.id) ?? 0])
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
