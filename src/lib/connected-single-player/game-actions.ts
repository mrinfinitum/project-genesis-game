import { LocalSaveRepository } from "./local-save-repository";
import { canonicalContent } from "./content";
import type { LocalFirstSave, PlayerState } from "./types";

function updatePublicStats(state: PlayerState) {
  const tradeNetworkValue = state.private.tradeRoutes.reduce((sum, route) => sum + route.value, 0);
  const researchCompleted = state.private.unlockedResearchIds.length;
  const planetsDiscovered = state.private.discoveredPlanetIds.length;
  const systemsDiscovered = state.private.discoveredSystemIds.length;
  const coloniesFounded = state.private.colonyIds.length;

  state.publicStats = {
    ...state.publicStats,
    era: state.private.currentEra,
    discoveryPoints: planetsDiscovered * 40 + systemsDiscovered * 100 + researchCompleted * 25,
    eraMastery: canonicalContent.eras.indexOf(state.private.currentEra) * 100 + researchCompleted * 15,
    planetsDiscovered,
    systemsDiscovered,
    coloniesFounded,
    researchCompleted,
    tradeNetworkValue,
    civilizationPower: 10 + coloniesFounded * 35 + researchCompleted * 20 + tradeNetworkValue,
    weeklyProgress: state.weeklyChallenges[0]?.progress ?? 0,
    updatedAt: new Date().toISOString()
  };

  return state;
}

export function discoverPlanet(repository: LocalSaveRepository) {
  return repository.updateState((state) => {
    const nextIndex = state.private.discoveredPlanetIds.length + 1;
    const planetId = `frontier-${nextIndex}`;

    if (!state.private.discoveredPlanetIds.includes(planetId)) {
      state.private.discoveredPlanetIds.push(planetId);
    }

    state.weeklyChallenges = state.weeklyChallenges.map((challenge) =>
      challenge.challengeId === "frontier-surge"
        ? {
            ...challenge,
            progress: Math.min(challenge.goal, challenge.progress + 15),
            completed: challenge.progress + 15 >= challenge.goal
          }
        : challenge
    );

    return updatePublicStats(state);
  });
}

export function completeResearch(repository: LocalSaveRepository) {
  return repository.updateState((state) => {
    const nextResearch = canonicalContent.researchIds.find((researchId) => !state.private.unlockedResearchIds.includes(researchId));

    if (nextResearch) {
      state.private.unlockedResearchIds.push(nextResearch);
    }

    if (state.private.unlockedResearchIds.length >= 2 && state.private.currentEra === "Dawnflight") {
      state.private.currentEra = "Orbital";
    }

    return updatePublicStats(state);
  });
}

export function foundColony(repository: LocalSaveRepository) {
  return repository.updateState((state) => {
    const colonyId = `colony-${state.private.colonyIds.length + 1}`;
    state.private.colonyIds.push(colonyId);

    if (state.private.colonyIds.length > 1) {
      state.private.tradeRoutes.push({
        id: `route-${state.private.tradeRoutes.length + 1}`,
        fromColonyId: state.private.colonyIds[0],
        toColonyId: colonyId,
        value: 12 + state.private.colonyIds.length * 4
      });
    }

    return updatePublicStats(state);
  });
}

export function setOfflineSimulation(repository: LocalSaveRepository, simulateOffline: boolean): LocalFirstSave {
  return repository.updateState((state) => {
    state.localFlags.simulateOffline = simulateOffline;
    return state;
  });
}
