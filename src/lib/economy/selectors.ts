import type { GameRuntimeData } from "@/lib/canonical-runtime";
import type { PlayerRuntimeState } from "@/lib/player-runtime/types";
import { calculateAllResourceRates, calculateResourceRate } from "./rate-calculator";

export function selectResourceRateResult(content: GameRuntimeData, state: PlayerRuntimeState, economyId: string) {
  return calculateResourceRate(content, state, economyId);
}

export function selectAllResourceRateResults(content: GameRuntimeData, state: PlayerRuntimeState) {
  return calculateAllResourceRates(content, state);
}

export function selectPopulationRuntime(state: PlayerRuntimeState) {
  return {
    currentPopulation: state.civilization.currentPopulation,
    populationCapacity: state.civilization.populationCapacity,
    availableWorkforce: state.civilization.availableWorkforce,
    assignedWorkforce: state.civilization.assignedWorkforce,
    populationGrowthRate: state.civilization.populationGrowthRate
  };
}
