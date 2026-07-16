import { beforeAll, describe, expect, it } from "vitest";
import { getBundledStudioRuntimeSnapshot, mockRuntimeData, type GameRuntimeData } from "@/lib/canonical-runtime";
import {
  bookmarkExplorationTarget,
  completeExplorationProbe,
  completeExplorationScan,
  completeExplorationSurvey,
  createExplorationExpedition,
  launchExplorationProbe,
  normalizeDiscoveryJournal,
  startExplorationScan,
  type ExplorationTarget
} from "@/lib/discovery";
import { CREDITS_ECONOMY_ID, PREMIUM_CRYSTALS_ECONOMY_ID, RESEARCH_ECONOMY_ID } from "@/lib/player-runtime/economy";
import { createNewPlayerRuntimeState } from "@/lib/player-runtime";

let runtime: GameRuntimeData;

const planetTarget: ExplorationTarget = {
  id: "BODY-TEST-PLANET-01",
  type: "planet",
  label: "???",
  distance: 24,
  knowledgeState: "unknown",
  rangeState: "probe_reachable",
  canProbe: true,
  canTravel: false
};

describe("exploration gameplay alpha", () => {
  beforeAll(async () => {
    runtime = (await getBundledStudioRuntimeSnapshot()) ?? mockRuntimeData;
  });

  it("normalizes new exploration journal fields for old saves", () => {
    const journal = normalizeDiscoveryJournal({ detectedObjectIds: ["legacy-object"] });

    expect(journal.detectedObjectIds).toEqual(["legacy-object"]);
    expect(journal.explorationStates).toEqual({});
    expect(journal.scanJobs).toEqual({});
    expect(journal.probeMissions).toEqual({});
    expect(journal.surveyRecords).toEqual({});
    expect(journal.explorationScores).toEqual({});
    expect(journal.recentDiscoveries).toEqual([]);
  });

  it("runs scan and analyze from detected to scanned with journal and rewards", () => {
    const state = createNewPlayerRuntimeState(runtime, { now: new Date("2026-01-01T00:00:00.000Z") });
    const started = startExplorationScan(state, planetTarget, { now: new Date("2026-01-01T00:00:00.000Z") });

    expect(started.job.status).toBe("scanning");
    expect(started.state.discovery.explorationStates?.[planetTarget.id]).toBe("detected");
    expect(started.state.discovery.detectedObjectIds).toContain(planetTarget.id);

    const completed = completeExplorationScan(runtime, started.state, started.job.id, planetTarget, { now: new Date("2026-01-01T00:01:00.000Z") });
    expect(completed.ok).toBe(true);
    if (!completed.ok) return;

    expect(completed.state.discovery.scanJobs?.[started.job.id].status).toBe("completed");
    expect(completed.state.discovery.explorationStates?.[planetTarget.id]).toBe("scanned");
    expect(completed.state.discovery.encyclopediaProgress?.[planetTarget.id]).toBe("known");
    expect(completed.state.economy.balances[RESEARCH_ECONOMY_ID]).toBeGreaterThan(state.economy.balances[RESEARCH_ECONOMY_ID]);
    expect(completed.state.economy.balances[PREMIUM_CRYSTALS_ECONOMY_ID]).toBe(state.economy.balances[PREMIUM_CRYSTALS_ECONOMY_ID]);
    expect(completed.state.discovery.recentDiscoveries?.some((entry) => entry.event === "rewarded")).toBe(true);
  });

  it("launches and completes probes without immediately allowing travel", () => {
    const state = createNewPlayerRuntimeState(runtime);
    const launched = launchExplorationProbe(state, planetTarget);
    expect(launched.mission.status).toBe("traveling");

    const completed = completeExplorationProbe(runtime, launched.state, launched.mission.id, planetTarget);
    expect(completed.ok).toBe(true);
    if (!completed.ok) return;

    expect(completed.state.discovery.probeMissions?.[launched.mission.id].status).toBe("completed");
    expect(completed.state.discovery.explorationStates?.[planetTarget.id]).toBe("probed");
    expect(planetTarget.canTravel).toBe(false);
    expect(completed.state.economy.balances[PREMIUM_CRYSTALS_ECONOMY_ID]).toBe(0);
  });

  it("surveys planets, calculates completion scores, bookmarks, and creates expeditions", () => {
    const state = createNewPlayerRuntimeState(runtime);
    const surveyed = completeExplorationSurvey(runtime, state, planetTarget);
    const bookmarked = bookmarkExplorationTarget(surveyed, planetTarget);
    const expedition = createExplorationExpedition(bookmarked, planetTarget);

    expect(surveyed.discovery.surveyRecords?.[planetTarget.id].resources).toBeGreaterThanOrEqual(0);
    expect(surveyed.discovery.explorationScores?.[planetTarget.id].survey).toBeGreaterThan(0);
    expect(surveyed.discovery.explorationStates?.[planetTarget.id]).toBe("surveyed");
    expect(bookmarked.discovery.bookmarks).toContain(planetTarget.id);
    expect(expedition.expedition.status).toBe("planned");
    expect(expedition.state.discovery.expeditionRecords?.[0].targetId).toBe(planetTarget.id);
    expect(expedition.state.economy.balances[CREDITS_ECONOMY_ID]).toBe(0);
  });
});
