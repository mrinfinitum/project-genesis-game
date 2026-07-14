import { describe, expect, it } from "vitest";
import {
  createDashboardModel,
  getDashboardHudResourceConfig,
  getCurrentJourney,
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
  it("loads contentVersion 11 and resolves the canonical nine-era journey", async () => {
    const runtime = await bundledRuntime();

    expect(runtime.metadata.contentVersion).toBe(11);
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

    const expectedHudIds = [
      "ECON-LABOR",
      "ECON-CREDITS",
      "ECON-POPULATION",
      "ECON-RESEARCH",
      "ECON-PREMIUM-CRYSTALS"
    ];

    expect(getDashboardHudResourceConfig(runtime, "survival").map((resource) => resource.id)).toEqual(expectedHudIds);
    expect(model.hudResources.map((resource) => resource.resourceId)).toEqual(expectedHudIds);
    expect(model.hudResources.map((resource) => resource.iconKey)).toEqual([
      "economy_labor",
      "economy_credits",
      "economy_population",
      "economy_research",
      "economy_premium_crystals"
    ]);
    expect(model.hudResources[0]).toMatchObject({
      resourceId: "ECON-LABOR",
      label: "Labor",
      amount: 0,
      provenance: "canonical-definition+default-zero"
    });
    expect(model.hudResources[1]).toMatchObject({
      resourceId: "ECON-CREDITS",
      label: "Credits",
      amount: 0,
      provenance: "canonical-definition+default-zero"
    });
    expect(runtime.resources.some((resource) => expectedHudIds.includes(resource.id))).toBe(false);
    expect(model.economyWarnings).toEqual([]);
  });

  it("keeps player economy amounts separate from inventory resource definitions", async () => {
    const runtime = await bundledRuntime();
    const playerState: DashboardPlayerState = {
      source: "player-runtime",
      sourceLabel: "Test Player State",
      currentEraId: "survival",
      civilizationName: "Canonical Test Save",
      economyBalances: { "ECON-LABOR": 7 },
      economyRates: { "ECON-LABOR": 2 },
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
    expect(model.hudResources.find((resource) => resource.resourceId === "ECON-LABOR")).toMatchObject({
      amount: 7,
      rate: 2,
      provenance: "canonical-definition+player-state"
    });
    expect(model.hudResources.some((resource) => resource.resourceId === "RES-0001")).toBe(false);
  });

  it("reports a development warning when canonical economy definitions are missing", async () => {
    const sourceRuntime = await bundledRuntime();
    const runtime: GameRuntimeData = {
      ...sourceRuntime,
      clientProfiles: {
        ...sourceRuntime.clientProfiles,
        default: {
          ...sourceRuntime.clientProfiles.default,
          primaryHudResources: [],
          primaryHudSlots: []
        },
        web: {
          ...sourceRuntime.clientProfiles.web,
          primaryHudResources: [],
          primaryHudSlots: []
        }
      },
      economy: {
        ...sourceRuntime.economy,
        primaryHudResources: [],
        definitions: [],
        resources: []
      },
      economyDefinitions: []
    };
    const model = createDashboardModel(runtime, { runtimeState: runtimeState(runtime) });

    expect(model.hudResources).toEqual([]);
    expect(model.economyWarnings).toContain("Canonical HUD economy configuration is missing.");
    expect(model.economyWarnings).toContain("Canonical economy definitions are missing.");
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
