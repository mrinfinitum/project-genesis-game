import { describe, expect, it } from "vitest";
import {
  createDashboardModel,
  getCurrentJourney,
  TEMPORARY_WEB_HUD_RESOURCE_IDS,
  type DashboardPlayerState
} from "@/lib/dashboard/dashboard-model";
import { getBundledStudioRuntimeSnapshot, type GameRuntimeData, type RuntimeContentState } from "@/lib/canonical-runtime";

async function bundledRuntime() {
  const runtime = await getBundledStudioRuntimeSnapshot();
  expect(runtime).not.toBeNull();
  return runtime as GameRuntimeData;
}

function runtimeState(runtime: GameRuntimeData, configuredMode: RuntimeContentState["configuredMode"] = "live"): RuntimeContentState {
  return {
    configuredMode,
    activeSource: configuredMode === "mock" ? "mock" : "bundled-snapshot",
    status: "ready",
    schemaVersion: runtime.metadata.schemaVersion,
    contentVersion: runtime.metadata.contentVersion,
    releaseName: runtime.metadata.releaseName,
    checksum: runtime.metadata.checksum,
    accessLevel: runtime.metadata.accessLevel,
    validationStatus: runtime.metadata.validationStatus,
    eras: runtime.eras,
    resources: runtime.resources,
    upgradeCategories: runtime.upgradeCategories,
    upgrades: runtime.upgrades,
    assets: runtime.assets,
    balance: runtime.balance,
    clientProfiles: runtime.clientProfiles,
    validationErrors: [],
    validationWarnings: [],
    isUsingFallback: configuredMode !== "mock",
    studioEndpoint: "https://project-genesis-livid.vercel.app/api/export/game-runtime-data.json",
    cacheStatus: "empty"
  };
}

describe("dashboard canonical model", () => {
  it("loads contentVersion 3 and resolves the canonical nine-era journey", async () => {
    const runtime = await bundledRuntime();

    expect(runtime.metadata.contentVersion).toBe(3);
    expect(runtime.eras).toHaveLength(9);

    expect(getCurrentJourney(runtime.eras, "survival")).toMatchObject({
      previous: undefined,
      current: { id: "survival" },
      next: { id: "ancient" }
    });
    expect(getCurrentJourney(runtime.eras, "renaissance")).toMatchObject({
      previous: { id: "medieval" },
      current: { id: "renaissance" },
      next: { id: "industrial" }
    });
    expect(getCurrentJourney(runtime.eras, "galactic")).toMatchObject({
      previous: { id: "interstellar" },
      current: { id: "galactic" },
      next: undefined
    });
  });

  it("uses configured canonical HUD resource ids instead of catalog ordering", async () => {
    const runtime = await bundledRuntime();
    const model = createDashboardModel(runtime, { runtimeState: runtimeState(runtime) });

    expect(model.hudResources.map((resource) => resource.resourceId)).toEqual(TEMPORARY_WEB_HUD_RESOURCE_IDS);
    expect(model.hudResources[0]).toMatchObject({
      resourceId: "RES-0001",
      label: "Stone",
      amount: 0,
      provenance: "canonical-definition+default-zero"
    });
  });

  it("keeps player resource amounts separate from canonical definitions", async () => {
    const runtime = await bundledRuntime();
    const playerState: DashboardPlayerState = {
      source: "player-runtime",
      sourceLabel: "Test Player State",
      currentEraId: "survival",
      civilizationName: "Canonical Test Save",
      resourceInventory: { "RES-0001": 7 },
      resourceRates: { "RES-0001": 2 },
      upgradeLevels: {},
      alignment: {
        Industry: 0,
        Technology: 0,
        Cyber: 0,
        Nature: 0,
        Corporate: 0
      }
    };

    const model = createDashboardModel(runtime, { runtimeState: runtimeState(runtime), playerState });

    expect(runtime.resources.find((resource) => resource.id === "RES-0001")?.displayName).toBe("Stone");
    expect(model.hudResources.find((resource) => resource.resourceId === "RES-0001")).toMatchObject({
      amount: 7,
      rate: 2,
      provenance: "canonical-definition+player-state"
    });
  });

  it("populates upgrade rows from canonical upgrade records and player levels", async () => {
    const runtime = await bundledRuntime();
    const model = createDashboardModel(runtime, {
      runtimeState: runtimeState(runtime),
      playerState: {
        source: "player-runtime",
        sourceLabel: "Test Player State",
        currentEraId: "survival",
        resourceInventory: {},
        resourceRates: {},
        upgradeLevels: { U0002: 3 }
      },
      activeCategoryId: "workforce"
    });

    expect(model.upgradeRows[0].upgrade.id).toBe("U0002");
    expect(model.upgradeRows[0].upgrade.displayName).toBe("Stone Tools");
    expect(model.upgradeRows[0].level).toBe(3);
    expect(model.upgradeRows[0].cost).toBeGreaterThanOrEqual(model.upgradeRows[0].upgrade.baseCost);
  });

  it("does not expose prototype event or leaderboard data in live mode", async () => {
    const runtime = await bundledRuntime();
    const model = createDashboardModel(runtime, { runtimeState: runtimeState(runtime) });

    expect(model.mode).toBe("canonical");
    expect(model.missingSystems.activeEvent).toBe(true);
    expect(model.missingSystems.leaderboard).toBe(true);
    expect(model.playerState.activeEvent).toBeUndefined();
    expect(model.playerState.leaderboard).toBeUndefined();
  });

  it("loads mock fixtures only in mock mode or Storybook-style rendering", async () => {
    const runtime = await bundledRuntime();
    const storybookModel = createDashboardModel(runtime);
    const mockModeModel = createDashboardModel(runtime, { runtimeState: runtimeState(runtime, "mock") });
    const liveModel = createDashboardModel(runtime, { runtimeState: runtimeState(runtime, "live") });

    expect(storybookModel.mode).toBe("demo");
    expect(mockModeModel.mode).toBe("demo");
    expect(storybookModel.playerState.leaderboard?.some((entry) => entry.name === "StarBuild3r")).toBe(true);
    expect(liveModel.mode).toBe("canonical");
    expect(liveModel.playerState.leaderboard).toBeUndefined();
  });

  it("shows missing event and hidden leaderboard states for systems without Studio support", async () => {
    const runtime = await bundledRuntime();
    const model = createDashboardModel(runtime, { runtimeState: runtimeState(runtime, "snapshot") });

    expect(model.missingSystems.objective).toBe(true);
    expect(model.missingSystems.activeEvent).toBe(true);
    expect(model.missingSystems.leaderboard).toBe(true);
    expect(model.civilizationPrediction).toBe("Unaligned");
  });
});
