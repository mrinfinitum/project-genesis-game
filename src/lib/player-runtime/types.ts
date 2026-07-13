export const PLAYER_RUNTIME_SAVE_VERSION = 3;

export type AlignmentKey = "industry" | "technology" | "cyber" | "nature" | "corporate";

export type PlayerRuntimeBoost = {
  id: string;
  definitionId?: string;
  targetSystem: "click" | "auto" | "resource" | "research" | "colony";
  startedAt: string;
  endsAt: string;
  multiplier: number;
};

export type UnresolvedPlayerRuntimeIds = {
  economy: Record<string, number>;
  economyRates: Record<string, number>;
  resources: Record<string, number>;
  resourceRates: Record<string, number>;
  storageLimits: Record<string, number>;
  upgradeLevels: Record<string, number>;
  unlockedUpgradeIds: string[];
  discoveredUpgradeIds: string[];
  currentEraId?: string;
  activeObjectiveId?: string;
  activeEventId?: string;
  boostDefinitionIds: string[];
  migrationNotes: string[];
};

export type PlayerRuntimeState = {
  playerId: string;
  saveVersion: number;
  contentVersion: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
  lastSimulationAt: string;
  civilization: {
    civilizationName: string;
    currentEraId: string;
    eraProgress: number;
    eraMastery: number;
    population: number;
    discoveryPoints: number;
  };
  economy: {
    balances: Record<string, number>;
    rates: Record<string, number>;
  };
  resources: {
    inventory: Record<string, number>;
    productionRates: Record<string, number>;
    storageLimits: Record<string, number>;
  };
  production: {
    clickPower: number;
    autoClickPower: number;
    autoClickRate: number;
    lastClickGain: number;
    lastClickWasCritical: boolean;
    criticalChance: number;
    criticalMultiplier: number;
    comboMultiplier: number;
    automationEnabled: boolean;
    totalManualClicks: number;
    totalAutoClicks: number;
    lifetimeLaborGenerated: number;
    totalAutoLaborGenerated: number;
  };
  upgrades: {
    levels: Record<string, number>;
    unlockedIds: string[];
    discoveredIds: string[];
  };
  alignment: Record<AlignmentKey, number>;
  objectives: {
    activeObjectiveId?: string;
    objectiveProgress: Record<string, number>;
  };
  events: {
    activeEventId?: string;
    activeEventEndsAt?: string;
  };
  boosts: {
    active: PlayerRuntimeBoost[];
  };
  colonies: {
    colonyCount: number;
    nextColonyProgress: number;
  };
  unresolved: UnresolvedPlayerRuntimeIds;
};

export type PlayerRuntimeImportResult = {
  ok: boolean;
  state?: PlayerRuntimeState;
  error?: string;
};
