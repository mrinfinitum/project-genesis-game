import type { PlayerRuntimeState } from "@/lib/player-runtime";
import type { CloudSave } from "@/lib/supabase";
import { CREDITS_ECONOMY_ID, LABOR_ECONOMY_ID, POPULATION_ECONOMY_ID, PREMIUM_CRYSTALS_ECONOMY_ID, RESEARCH_ECONOMY_ID } from "@/lib/player-runtime/economy";

export type SaveClassification =
  | "none"
  | "canonical new game"
  | "established"
  | "imported"
  | "recoverable"
  | "corrupt";

export type SaveComparisonClassification =
  | "identical"
  | "local descendant"
  | "cloud descendant"
  | "divergent"
  | "incompatible"
  | "corrupt";

export type SaveSummary = {
  source: "local" | "cloud";
  classification: SaveClassification;
  currentEraId: string;
  labor: number;
  credits: number;
  population: number;
  research: number;
  premiumCrystals: number;
  playtimeActions: number;
  lastSaved: string;
  deviceName?: string;
  revision: number;
  saveVersion: number;
  contentVersion: number;
};

function balance(state: PlayerRuntimeState, id: string) {
  return state.economy.balances[id] ?? 0;
}

function isCanonicalNewGame(state: PlayerRuntimeState) {
  return (
    balance(state, LABOR_ECONOMY_ID) === 0 &&
    balance(state, CREDITS_ECONOMY_ID) === 0 &&
    balance(state, POPULATION_ECONOMY_ID) === 5 &&
    balance(state, RESEARCH_ECONOMY_ID) === 0 &&
    balance(state, PREMIUM_CRYSTALS_ECONOMY_ID) === 0 &&
    state.production.totalManualClicks === 0 &&
    state.production.totalAutoClicks === 0
  );
}

export function classifySave(state: PlayerRuntimeState | null | undefined): SaveClassification {
  if (!state) return "none";
  if (!state.economy || !state.production || !state.civilization) return "corrupt";
  if (isCanonicalNewGame(state)) return "canonical new game";
  if (state.runtimeLoadReport?.loadedFrom === "Imported Save") return "imported";
  return "established";
}

export function summarizePlayerSave(source: "local" | "cloud", state: PlayerRuntimeState, deviceName?: string): SaveSummary {
  return {
    source,
    classification: classifySave(state),
    currentEraId: state.civilization.currentEraId,
    labor: balance(state, LABOR_ECONOMY_ID),
    credits: balance(state, CREDITS_ECONOMY_ID),
    population: balance(state, POPULATION_ECONOMY_ID) || state.civilization.population,
    research: balance(state, RESEARCH_ECONOMY_ID),
    premiumCrystals: balance(state, PREMIUM_CRYSTALS_ECONOMY_ID),
    playtimeActions: state.production.totalManualClicks + state.production.totalAutoClicks,
    lastSaved: state.updatedAt,
    deviceName,
    revision: state.revision,
    saveVersion: state.saveVersion,
    contentVersion: state.contentVersion
  };
}

export function summarizeCloudSave(save: CloudSave): SaveSummary {
  return summarizePlayerSave("cloud", save.playerState, save.deviceName);
}

function comparableState(state: PlayerRuntimeState) {
  return {
    saveVersion: state.saveVersion,
    contentVersion: state.contentVersion,
    currentEraId: state.civilization.currentEraId,
    balances: {
      labor: balance(state, LABOR_ECONOMY_ID),
      credits: balance(state, CREDITS_ECONOMY_ID),
      population: balance(state, POPULATION_ECONOMY_ID),
      research: balance(state, RESEARCH_ECONOMY_ID),
      premium: balance(state, PREMIUM_CRYSTALS_ECONOMY_ID)
    },
    production: {
      manual: state.production.totalManualClicks,
      auto: state.production.totalAutoClicks,
      lifetimeLabor: state.production.lifetimeLaborGenerated
    },
    upgrades: state.upgrades.levels
  };
}

export function compareSaves(local: PlayerRuntimeState | null, cloud: CloudSave | null): SaveComparisonClassification {
  if (!local || !cloud) return "identical";
  if (classifySave(local) === "corrupt" || classifySave(cloud.playerState) === "corrupt") return "corrupt";
  if (local.contentVersion !== cloud.contentVersion || local.saveVersion !== cloud.saveVersion) return "incompatible";

  const localComparable = JSON.stringify(comparableState(local));
  const cloudComparable = JSON.stringify(comparableState(cloud.playerState));
  if (localComparable === cloudComparable) return "identical";
  if (local.revision > cloud.revision) return "local descendant";
  if (cloud.revision > local.revision) return "cloud descendant";
  return "divergent";
}

export function shouldShowConflict(classification: SaveComparisonClassification) {
  return classification === "divergent" || classification === "incompatible" || classification === "corrupt";
}
