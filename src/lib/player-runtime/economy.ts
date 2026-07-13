import type { GameRuntimeData, PrimaryHudResourceDefinition } from "@/lib/canonical-runtime";

export const DEFAULT_PRIMARY_HUD_RESOURCES: PrimaryHudResourceDefinition[] = [
  {
    id: "ECON-CIVILIZATION-ENERGY",
    label: "Energy",
    iconKey: "hud_civilization_energy_icon",
    artKey: "hud_civilization_energy_icon",
    balanceKey: "startingCivilizationEnergy",
    color: "#67e8f9"
  },
  {
    id: "ECON-CREDITS",
    label: "Credits",
    iconKey: "hud_credits_icon",
    artKey: "hud_credits_icon",
    balanceKey: "startingCoins",
    color: "#facc15"
  },
  {
    id: "ECON-RESEARCH",
    label: "Research",
    iconKey: "hud_research_icon",
    artKey: "hud_research_icon",
    balanceKey: "startingResearch",
    color: "#a78bfa"
  },
  {
    id: "ECON-POPULATION",
    label: "Population",
    iconKey: "hud_population_icon",
    artKey: "hud_population_icon",
    balanceKey: "startingPopulation",
    color: "#34d399"
  },
  {
    id: "ECON-CIVILIZATION-POINTS",
    label: "Civ Points",
    iconKey: "hud_civilization_points_icon",
    artKey: "hud_civilization_points_icon",
    color: "#fb7185"
  }
];

function normalizeHudResource(input: unknown): PrimaryHudResourceDefinition | undefined {
  if (typeof input === "string" && input.trim()) {
    return { id: input, label: input };
  }

  if (!input || typeof input !== "object") return undefined;
  const record = input as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : typeof record.resourceId === "string" ? record.resourceId : undefined;
  if (!id) return undefined;

  return {
    id,
    label: typeof record.label === "string" ? record.label : typeof record.displayName === "string" ? record.displayName : id,
    iconKey: typeof record.iconKey === "string" ? record.iconKey : undefined,
    artKey: typeof record.artKey === "string" ? record.artKey : undefined,
    color: typeof record.color === "string" ? record.color : undefined,
    balanceKey: typeof record.balanceKey === "string" ? record.balanceKey : undefined
  };
}

export function getPrimaryHudResources(content: GameRuntimeData): PrimaryHudResourceDefinition[] {
  const configured = content.clientProfiles.default.primaryHudResources
    ?.map(normalizeHudResource)
    .filter((resource): resource is PrimaryHudResourceDefinition => Boolean(resource));

  return configured?.length ? configured : DEFAULT_PRIMARY_HUD_RESOURCES;
}

export function getPrimaryHudResourceIds(content: GameRuntimeData) {
  return getPrimaryHudResources(content).map((resource) => resource.id);
}

export function getInventoryResources(content: GameRuntimeData) {
  const hudIds = new Set(getPrimaryHudResourceIds(content));
  return content.resources.filter((resource) => !hudIds.has(resource.id));
}

export function getStartingEconomyBalances(content: GameRuntimeData) {
  return Object.fromEntries(
    getPrimaryHudResources(content).map((resource) => {
      const raw = resource.balanceKey ? content.balance[resource.balanceKey] : 0;
      return [resource.id, typeof raw === "number" && Number.isFinite(raw) ? raw : 0];
    })
  );
}
