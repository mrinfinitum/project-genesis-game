import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { getBundledStudioRuntimeSnapshot, type GameRuntimeData } from "@/lib/canonical-runtime";
import {
  advanceSimulation,
  createNewPlayerRuntimeState,
  getInventoryResources,
  getEconomyResourceIds,
  getPrimaryHudResourceIds,
  getStartingEraId,
  getUpgradeViewState,
  grantTestResources,
  migratePlayerRuntimeState,
  performManualLaborClick,
  PlayerRuntimeLocalSaveService,
  playerRuntimeToDashboardPlayerState,
  PLAYER_RUNTIME_SAVE_VERSION,
  resolvePrimaryEconomyIdForCurrentEra,
  resolveAlignmentIdentity,
  selectClickPower,
  selectEconomyBalance,
  selectEconomyRate,
  selectHudEconomySlots,
  selectLastClickGain,
  selectPopulation,
  type PlayerRuntimeState
} from "@/lib/player-runtime";
import { CREDITS_ECONOMY_ID, LABOR_ECONOMY_ID, LEGACY_CIVILIZATION_ENERGY_ECONOMY_ID, POPULATION_ECONOMY_ID, PREMIUM_CRYSTALS_ECONOMY_ID, RESEARCH_ECONOMY_ID } from "@/lib/player-runtime/economy";
import { PLAYER_RUNTIME_SAVE_KEY } from "@/lib/player-runtime/local-save";
import { BrowserKeyValueStore, MemoryKeyValueStore, readJson } from "@/lib/connected-single-player/storage";

async function bundledRuntime() {
  const runtime = await getBundledStudioRuntimeSnapshot();
  expect(runtime).not.toBeNull();
  return runtime as GameRuntimeData;
}

function fixedDate() {
  return new Date("2026-01-02T03:04:05.000Z");
}

describe("canonical player runtime", () => {
  it("creates a deterministic new-game state from canonical balance and the first canonical era", async () => {
    const runtime = await bundledRuntime();
    const state = createNewPlayerRuntimeState(runtime, {
      now: fixedDate(),
      playerId: "test-player",
      civilizationName: "Test Civilization"
    });

    expect(state).toMatchObject({
      playerId: "test-player",
      saveVersion: PLAYER_RUNTIME_SAVE_VERSION,
      contentVersion: runtime.metadata.contentVersion,
      revision: 1,
      createdAt: "2026-01-02T03:04:05.000Z",
      updatedAt: "2026-01-02T03:04:05.000Z",
      lastSimulationAt: "2026-01-02T03:04:05.000Z",
      civilization: {
        civilizationName: "Test Civilization",
        currentEraId: "survival",
        population: 5
      },
      production: {
        clickPower: runtime.balance.baseClickPower,
        autoClickPower: runtime.balance.baseAutoClickPower,
        autoClickRate: 1,
        criticalMultiplier: 2,
        automationEnabled: true,
        totalManualClicks: 0,
        lifetimeLaborGenerated: 0
      }
    });
    expect(getStartingEraId(runtime)).toBe("survival");
    expect(getPrimaryHudResourceIds(runtime, "survival")).toEqual([LABOR_ECONOMY_ID, CREDITS_ECONOMY_ID, POPULATION_ECONOMY_ID, RESEARCH_ECONOMY_ID, PREMIUM_CRYSTALS_ECONOMY_ID]);
    expect(Object.keys(state.economy.balances).sort()).toEqual(getEconomyResourceIds(runtime).sort());
    expect(state.economy.balances[LABOR_ECONOMY_ID]).toBe(0);
    expect(state.economy.rates[LABOR_ECONOMY_ID]).toBe(1);
    expect(state.economy.balances[CREDITS_ECONOMY_ID]).toBe(0);
    expect(state.economy.rates[CREDITS_ECONOMY_ID]).toBe(0);
    expect(state.economy.balances[POPULATION_ECONOMY_ID]).toBe(5);
    expect(state.economy.balances[RESEARCH_ECONOMY_ID]).toBe(0);
    expect(state.economy.balances[PREMIUM_CRYSTALS_ECONOMY_ID]).toBe(0);
    expect(Object.keys(state.resources.inventory)).toEqual(getInventoryResources(runtime).map((resource) => resource.id));
    expect(Object.keys(state.resources.inventory)).not.toContain(LABOR_ECONOMY_ID);
    expect(Object.values(state.resources.storageLimits)).toEqual(getInventoryResources(runtime).map(() => Number.MAX_SAFE_INTEGER));
  });

  it("verifies the Studio v11 fixed Survival economy contract", async () => {
    const runtime = await bundledRuntime();
    const laborDefinition = (runtime.economyDefinitions ?? []).find((definition) => definition.id === LABOR_ECONOMY_ID) as Record<string, unknown> | undefined;
    const creditsDefinition = (runtime.economyDefinitions ?? []).find((definition) => definition.id === CREDITS_ECONOMY_ID) as Record<string, unknown> | undefined;
    const populationDefinition = (runtime.economyDefinitions ?? []).find((definition) => definition.id === POPULATION_ECONOMY_ID) as Record<string, unknown> | undefined;
    const survivalHudIds = getPrimaryHudResourceIds(runtime, "survival");
    const survivalIconKeys = selectHudEconomySlots(runtime, "survival").map((slot) => slot.iconKey);

    expect(runtime.metadata.contentVersion).toBe(11);
    expect(runtime.metadata.checksum).toBe("9a910ba0e5df5d08c09e028a2db6a7ec609b91998d4589241ac08f69a3a1fedd");
    expect(resolvePrimaryEconomyIdForCurrentEra(runtime, "survival")).toBe(LABOR_ECONOMY_ID);
    expect(survivalHudIds).toEqual([LABOR_ECONOMY_ID, CREDITS_ECONOMY_ID, POPULATION_ECONOMY_ID, RESEARCH_ECONOMY_ID, PREMIUM_CRYSTALS_ECONOMY_ID]);
    expect(survivalIconKeys).toEqual(["economy_labor", "economy_credits", "economy_population", "economy_research", "economy_premium_crystals"]);
    expect(laborDefinition?.startingRate).toBe(1);
    expect(laborDefinition?.manualClickTarget).toBe(true);
    expect(creditsDefinition?.startingAmount).toBe(0);
    expect(creditsDefinition?.startingRate).toBe(0);
    expect(populationDefinition?.startingAmount).toBe(5);
  });

  it("persists explicit saves, autosaves, resets, exports, and imports through the local service", async () => {
    const runtime = await bundledRuntime();
    const store = new MemoryKeyValueStore();
    const service = new PlayerRuntimeLocalSaveService(runtime, store);
    const state = service.loadOrCreate();
    state.economy.balances[LABOR_ECONOMY_ID] = 321;

    const saved = service.save(state);
    const reloaded = new PlayerRuntimeLocalSaveService(runtime, store).loadOrCreate();
    const autosaved = service.autosave(reloaded);
    const exported = service.exportSave(autosaved);
    const imported = service.importSave(exported);
    const reset = service.reset();

    expect(state.runtimeLoadReport.loadedFrom).toBe("New Game");
    expect(state.runtimeLoadReport.newGamePathExecuted).toBe(true);
    expect(state.runtimeLoadReport.saveLoaded).toBe(false);
    expect(saved.revision).toBeGreaterThan(state.revision);
    expect(reloaded.economy.balances[LABOR_ECONOMY_ID]).toBe(321);
    expect(reloaded.runtimeLoadReport.loadedFrom).toBe("Browser Save");
    expect(reloaded.runtimeLoadReport.saveLoaded).toBe(true);
    expect(reloaded.runtimeLoadReport.newGamePathExecuted).toBe(false);
    expect(reloaded.runtimeLoadReport.rawSaveVersion).toBe(PLAYER_RUNTIME_SAVE_VERSION);
    expect(reloaded.runtimeLoadReport.rawContentVersion).toBe(runtime.metadata.contentVersion);
    expect(reloaded.runtimeLoadReport.saveTimestamp).toBeTruthy();
    expect(autosaved.revision).toBeGreaterThan(reloaded.revision);
    expect(imported.ok).toBe(true);
    expect(imported.state?.economy.balances[LABOR_ECONOMY_ID]).toBe(321);
    expect(imported.state?.runtimeLoadReport.loadedFrom).toBe("Imported Save");
    expect(reset.economy.balances[LABOR_ECONOMY_ID]).toBe(0);
    expect(reset.economy.balances[CREDITS_ECONOMY_ID]).toBe(0);
    expect(reset.economy.balances[POPULATION_ECONOMY_ID]).toBe(5);
    expect(reset.runtimeLoadReport.loadedFrom).toBe("Reset to Canonical New Game");
    expect(readJson<PlayerRuntimeState | null>(store, PLAYER_RUNTIME_SAVE_KEY, null)?.saveVersion).toBe(PLAYER_RUNTIME_SAVE_VERSION);
    const deleted = service.deleteLocalSave();
    expect(deleted.economy.balances[LABOR_ECONOMY_ID]).toBe(0);
    expect(deleted.economy.balances[CREDITS_ECONOMY_ID]).toBe(0);
    expect(deleted.economy.balances[POPULATION_ECONOMY_ID]).toBe(5);
    expect(deleted.runtimeLoadReport.loadedFrom).toBe("Deleted Local Save");
    expect(store.getItem(PLAYER_RUNTIME_SAVE_KEY)).toBeNull();
  });

  it("does not throw when browser storage is unavailable", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    const removeItem = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });

    try {
      const store = new BrowserKeyValueStore();
      expect(store.getItem(PLAYER_RUNTIME_SAVE_KEY)).toBeNull();
      expect(() => store.setItem(PLAYER_RUNTIME_SAVE_KEY, "{}")).not.toThrow();
      expect(() => store.removeItem(PLAYER_RUNTIME_SAVE_KEY)).not.toThrow();
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
      removeItem.mockRestore();
    }
  });

  it("migrates content versions and preserves unknown canonical ids in unresolved buckets", async () => {
    const runtime = await bundledRuntime();
    const state = createNewPlayerRuntimeState(runtime, { now: fixedDate(), playerId: "legacy-player" });
    const legacy = {
      ...state,
      saveVersion: 0,
      contentVersion: 1,
      civilization: { ...state.civilization, currentEraId: "lost-era" },
      economy: {
        balances: { ...state.economy.balances, [POPULATION_ECONOMY_ID]: 0, [LEGACY_CIVILIZATION_ENERGY_ECONOMY_ID]: 42, "ECON-LOST": 99 },
        rates: { ...state.economy.rates, "ECON-LOST": 3 }
      },
      resources: {
        inventory: { ...state.resources.inventory, "RES-LOST": 99 },
        productionRates: { ...state.resources.productionRates, "RES-LOST": 2 },
        storageLimits: { ...state.resources.storageLimits, "RES-LOST": 500 }
      },
      upgrades: {
        levels: { ...state.upgrades.levels, "UPG-LOST": 4 },
        unlockedIds: [...state.upgrades.unlockedIds, "UPG-LOST"],
        discoveredIds: [...state.upgrades.discoveredIds, "UPG-LOST"]
      }
    };

    const migrated = migratePlayerRuntimeState(legacy, runtime);

    expect(migrated.saveVersion).toBe(PLAYER_RUNTIME_SAVE_VERSION);
    expect(migrated.contentVersion).toBe(runtime.metadata.contentVersion);
    expect(migrated.unresolved.currentEraId).toBe("lost-era");
    expect(migrated.civilization.currentEraId).toBe("survival");
    expect(migrated.economy.balances[POPULATION_ECONOMY_ID]).toBe(5);
    expect(migrated.economy.balances[LABOR_ECONOMY_ID]).toBe(42);
    expect(migrated.unresolved.migrationNotes).toContain(`Migrated ${POPULATION_ECONOMY_ID} from civilization.population.`);
    expect(migrated.unresolved.migrationNotes).toContain(`Migrated legacy ${LEGACY_CIVILIZATION_ENERGY_ECONOMY_ID} balance into ${LABOR_ECONOMY_ID}.`);
    expect(migrated.unresolved.economy["ECON-LOST"]).toBe(99);
    expect(migrated.unresolved.economyRates["ECON-LOST"]).toBe(3);
    expect(migrated.unresolved.resources["RES-LOST"]).toBe(99);
    expect(migrated.unresolved.resourceRates["RES-LOST"]).toBe(2);
    expect(migrated.unresolved.storageLimits["RES-LOST"]).toBe(500);
    expect(migrated.unresolved.upgradeLevels["UPG-LOST"]).toBe(4);
    expect(migrated.unresolved.unlockedUpgradeIds).toContain("UPG-LOST");
    expect(migrated.unresolved.discoveredUpgradeIds).toContain("UPG-LOST");
    expect(migrated.economy.balances["ECON-LOST"]).toBeUndefined();
    expect(migrated.resources.inventory["RES-LOST"]).toBeUndefined();
    expect(migrated.upgrades.levels["UPG-LOST"]).toBeUndefined();
  });

  it("migrates untouched starter Population 125 to the Studio v8 default", async () => {
    const runtime = await bundledRuntime();
    const untouched = createNewPlayerRuntimeState(runtime, { now: fixedDate(), playerId: "untouched-population" });
    const legacy = {
      ...untouched,
      saveVersion: 3,
      contentVersion: 7,
      civilization: { ...untouched.civilization, population: 125 },
      economy: {
        ...untouched.economy,
        balances: { ...untouched.economy.balances, [POPULATION_ECONOMY_ID]: 125, [LABOR_ECONOMY_ID]: 0 }
      },
      production: {
        ...untouched.production,
        totalManualClicks: 0,
        totalAutoClicks: 0,
        lifetimeLaborGenerated: 0
      }
    };

    const migrated = migratePlayerRuntimeState(legacy, runtime);

    expect(migrated.economy.balances[POPULATION_ECONOMY_ID]).toBe(5);
    expect(migrated.civilization.population).toBe(5);
    expect(migrated.unresolved.migrationNotes).toContain("Migrated untouched starter ECON-POPULATION from 125 to 5.");
  });

  it("repairs v4 auto-idle starter saves that were already stamped before the v8 population fix", async () => {
    const runtime = await bundledRuntime();
    const idle = createNewPlayerRuntimeState(runtime, { now: fixedDate(), playerId: "v4-auto-idle-population" });
    const legacy = {
      ...idle,
      saveVersion: 4,
      contentVersion: 8,
      civilization: { ...idle.civilization, population: 125 },
      economy: {
        ...idle.economy,
        balances: { ...idle.economy.balances, [POPULATION_ECONOMY_ID]: 125, [LABOR_ECONOMY_ID]: 90 }
      },
      production: {
        ...idle.production,
        totalManualClicks: 0,
        totalAutoClicks: 90,
        lifetimeLaborGenerated: 90,
        totalAutoLaborGenerated: 90
      }
    };

    const migrated = migratePlayerRuntimeState(legacy, runtime);

    expect(migrated.saveVersion).toBe(PLAYER_RUNTIME_SAVE_VERSION);
    expect(migrated.economy.balances[POPULATION_ECONOMY_ID]).toBe(5);
    expect(migrated.civilization.population).toBe(5);
    expect(migrated.economy.balances[LABOR_ECONOMY_ID]).toBe(90);
    expect(migrated.unresolved.migrationNotes).toContain("Migrated untouched starter ECON-POPULATION from 125 to 5.");
  });

  it("preserves visible v10 Credits balances when migrating older Survival saves", async () => {
    const runtime = await bundledRuntime();
    const oldCredits = createNewPlayerRuntimeState(runtime, { now: fixedDate(), playerId: "credits-preserved" });
    const legacy = {
      ...oldCredits,
      saveVersion: 5,
      contentVersion: 9,
      economy: {
        ...oldCredits.economy,
        balances: { ...oldCredits.economy.balances, [CREDITS_ECONOMY_ID]: 75, [LABOR_ECONOMY_ID]: 0 }
      },
      production: {
        ...oldCredits.production,
        totalManualClicks: 75,
        lifetimeLaborGenerated: 50
      }
    };

    const migrated = migratePlayerRuntimeState(legacy, runtime);

    expect(migrated.economy.balances[LABOR_ECONOMY_ID]).toBe(0);
    expect(migrated.economy.balances[CREDITS_ECONOMY_ID]).toBe(75);
    expect(migrated.unresolved.migrationNotes).not.toContain(`Migrated 50 mistaken Survival click ${CREDITS_ECONOMY_ID} into ${LABOR_ECONOMY_ID}.`);
  });

  it("preserves v6 Survival Credits now that Credits are a canonical fixed HUD slot", async () => {
    const runtime = await bundledRuntime();
    const visibleCredits = createNewPlayerRuntimeState(runtime, { now: fixedDate(), playerId: "visible-credits" });
    const legacy = {
      ...visibleCredits,
      saveVersion: 6,
      contentVersion: 9,
      economy: {
        ...visibleCredits.economy,
        balances: { ...visibleCredits.economy.balances, [CREDITS_ECONOMY_ID]: 12, [LABOR_ECONOMY_ID]: 0 }
      },
      production: {
        ...visibleCredits.production,
        totalManualClicks: 0,
        totalAutoClicks: 0,
        lifetimeLaborGenerated: 0,
        totalAutoLaborGenerated: 0
      }
    };

    const migrated = migratePlayerRuntimeState(legacy, runtime);

    expect(migrated.saveVersion).toBe(PLAYER_RUNTIME_SAVE_VERSION);
    expect(migrated.economy.balances[LABOR_ECONOMY_ID]).toBe(0);
    expect(migrated.economy.balances[CREDITS_ECONOMY_ID]).toBe(12);
    expect(migrated.unresolved.migrationNotes).not.toContain(`Repaired hidden Survival ${CREDITS_ECONOMY_ID} passive balance into ${LABOR_ECONOMY_ID}.`);
  });

  it("repairs v7 untouched Population 125 saves before the HUD renders", async () => {
    const runtime = await bundledRuntime();
    const stale = createNewPlayerRuntimeState(runtime, { now: fixedDate(), playerId: "v7-stale-population" });
    const legacy = {
      ...stale,
      saveVersion: 7,
      contentVersion: 10,
      civilization: { ...stale.civilization, population: 125 },
      economy: {
        ...stale.economy,
        balances: { ...stale.economy.balances, [POPULATION_ECONOMY_ID]: 125 }
      },
      production: {
        ...stale.production,
        totalManualClicks: 0
      }
    };

    const migrated = migratePlayerRuntimeState(legacy, runtime);

    expect(migrated.saveVersion).toBe(PLAYER_RUNTIME_SAVE_VERSION);
    expect(migrated.economy.balances[POPULATION_ECONOMY_ID]).toBe(5);
    expect(migrated.civilization.population).toBe(5);
    expect(migrated.unresolved.migrationNotes).toContain("Repaired stale untouched ECON-POPULATION from 125 to 5.");
  });

  it("repairs deployed v8 untouched Population 125 saves before the HUD renders", async () => {
    const runtime = await bundledRuntime();
    const stale = createNewPlayerRuntimeState(runtime, { now: fixedDate(), playerId: "v8-stale-population" });
    const legacy = {
      ...stale,
      saveVersion: 8,
      contentVersion: 10,
      civilization: { ...stale.civilization, population: 125 },
      economy: {
        ...stale.economy,
        balances: { ...stale.economy.balances, [POPULATION_ECONOMY_ID]: 125 }
      },
      production: {
        ...stale.production,
        totalManualClicks: 0
      }
    };

    const migrated = migratePlayerRuntimeState(legacy, runtime);

    expect(migrated.saveVersion).toBe(PLAYER_RUNTIME_SAVE_VERSION);
    expect(migrated.economy.balances[POPULATION_ECONOMY_ID]).toBe(5);
    expect(migrated.civilization.population).toBe(5);
    expect(migrated.unresolved.migrationNotes).toContain("Repaired stale untouched ECON-POPULATION from 125 to 5.");
  });

  it("preserves established Population 125 saves", async () => {
    const runtime = await bundledRuntime();
    const established = createNewPlayerRuntimeState(runtime, { now: fixedDate(), playerId: "established-population" });
    const legacy = {
      ...established,
      saveVersion: 3,
      contentVersion: 7,
      civilization: { ...established.civilization, population: 125 },
      economy: {
        ...established.economy,
        balances: { ...established.economy.balances, [POPULATION_ECONOMY_ID]: 125, [LABOR_ECONOMY_ID]: 12 }
      },
      production: {
        ...established.production,
        totalManualClicks: 12,
        lifetimeLaborGenerated: 12
      }
    };

    const migrated = migratePlayerRuntimeState(legacy, runtime);

    expect(migrated.economy.balances[POPULATION_ECONOMY_ID]).toBe(125);
    expect(migrated.civilization.population).toBe(125);
    expect(migrated.economy.balances[LABOR_ECONOMY_ID]).toBe(12);
    expect(migrated.unresolved.migrationNotes).not.toContain("Migrated untouched starter ECON-POPULATION from 125 to 5.");
  });

  it("routes manual and auto labor to the resolved primary economy instead of Credits", async () => {
    const runtime = await bundledRuntime();
    const state = createNewPlayerRuntimeState(runtime, { now: fixedDate() });
    const clicked = performManualLaborClick(runtime, state, { now: fixedDate() });
    const autoUpgrade = runtime.upgrades.find((upgrade) => upgrade.effectType.toLowerCase().includes("auto"));
    expect(autoUpgrade).toBeDefined();

    const autoState = {
      ...clicked,
      production: { ...clicked.production, automationEnabled: true },
      upgrades: {
        ...clicked.upgrades,
        levels: { ...clicked.upgrades.levels, [autoUpgrade!.id]: 1 },
        unlockedIds: [...new Set([...clicked.upgrades.unlockedIds, autoUpgrade!.id])],
        discoveredIds: [...new Set([...clicked.upgrades.discoveredIds, autoUpgrade!.id])]
      }
    };
    const advanced = advanceSimulation(runtime, autoState, { seconds: 10, now: new Date("2026-01-02T03:04:15.000Z") });

    expect(clicked.economy.balances[LABOR_ECONOMY_ID]).toBeGreaterThan(state.economy.balances[LABOR_ECONOMY_ID] ?? 0);
    expect(clicked.economy.balances[CREDITS_ECONOMY_ID]).toBe(state.economy.balances[CREDITS_ECONOMY_ID]);
    expect(clicked.production.lastClickGain).toBe(1);
    expect(clicked.production.totalManualClicks).toBe(1);
    expect(clicked.civilization.discoveryPoints).toBeGreaterThanOrEqual(1);
    expect(advanced.production.autoClickPower).toBeGreaterThan(0);
    expect(advanced.economy.rates[LABOR_ECONOMY_ID]).toBeGreaterThanOrEqual(1);
    expect(advanced.economy.balances[LABOR_ECONOMY_ID]).toBeGreaterThan(clicked.economy.balances[LABOR_ECONOMY_ID]);
    expect(advanced.economy.rates[CREDITS_ECONOMY_ID]).toBe(0);
    expect(advanced.economy.balances[CREDITS_ECONOMY_ID]).toBe(clicked.economy.balances[CREDITS_ECONOMY_ID]);
    expect(advanced.economy.rates[PREMIUM_CRYSTALS_ECONOMY_ID]).toBe(0);
    expect(advanced.civilization.eraProgress).toBeGreaterThan(state.civilization.eraProgress);
  });

  it("routes passive Survival production to Labor while automation is off", async () => {
    const runtime = await bundledRuntime();
    const state = {
      ...createNewPlayerRuntimeState(runtime, { now: fixedDate() }),
      production: {
        ...createNewPlayerRuntimeState(runtime, { now: fixedDate() }).production,
        automationEnabled: false
      }
    };

    const advanced = advanceSimulation(runtime, state, { seconds: 10, now: new Date("2026-01-02T03:04:15.000Z") });

    expect(advanced.economy.balances[LABOR_ECONOMY_ID]).toBe(10);
    expect(advanced.economy.rates[LABOR_ECONOMY_ID]).toBe(1);
    expect(advanced.economy.balances[CREDITS_ECONOMY_ID]).toBe(state.economy.balances[CREDITS_ECONOMY_ID]);
    expect(advanced.economy.rates[CREDITS_ECONOMY_ID]).toBe(0);
    expect(advanced.production.totalAutoLaborGenerated).toBe(0);
  });

  it("lets Studio explicitly change an era primary economy to Credits", async () => {
    const runtime = await bundledRuntime();
    const creditsPrimaryRuntime = {
      ...runtime,
      clientProfiles: {
        ...runtime.clientProfiles,
        default: {
          ...runtime.clientProfiles.default,
          eraEconomyProfiles: {
            modern: {
              primaryEconomyId: CREDITS_ECONOMY_ID,
              primaryHudResources: [CREDITS_ECONOMY_ID, LABOR_ECONOMY_ID]
            }
          }
        }
      }
    };
    const state = {
      ...createNewPlayerRuntimeState(creditsPrimaryRuntime, { now: fixedDate() }),
      civilization: {
        ...createNewPlayerRuntimeState(creditsPrimaryRuntime, { now: fixedDate() }).civilization,
        currentEraId: "modern"
      }
    };

    const clicked = performManualLaborClick(creditsPrimaryRuntime, state, { now: fixedDate() });

    expect(resolvePrimaryEconomyIdForCurrentEra(creditsPrimaryRuntime, "modern")).toBe(CREDITS_ECONOMY_ID);
    expect(clicked.economy.balances[CREDITS_ECONOMY_ID]).toBeGreaterThan(state.economy.balances[CREDITS_ECONOMY_ID]);
    expect(clicked.economy.balances[LABOR_ECONOMY_ID]).toBe(state.economy.balances[LABOR_ECONOMY_ID]);
  });

  it("keeps click simulation free of direct Credits references", () => {
    const simulationSource = readFileSync("src/lib/player-runtime/simulation.ts", "utf8");

    expect(simulationSource).not.toContain("ECON-CREDITS");
    expect(simulationSource).not.toContain("CREDITS_ECONOMY_ID");
  });

  it("exposes canonical runtime selectors for HUD economy and labor stats", async () => {
    const runtime = await bundledRuntime();
    const clicked = performManualLaborClick(runtime, createNewPlayerRuntimeState(runtime, { now: fixedDate() }), { now: fixedDate() });

    expect(selectHudEconomySlots(runtime, "survival").map((slot) => slot.id)).toEqual(getPrimaryHudResourceIds(runtime, "survival"));
    expect(selectHudEconomySlots(runtime, "survival").map((slot) => slot.id)).toEqual([LABOR_ECONOMY_ID, CREDITS_ECONOMY_ID, POPULATION_ECONOMY_ID, RESEARCH_ECONOMY_ID, PREMIUM_CRYSTALS_ECONOMY_ID]);
    expect(selectEconomyBalance(clicked, LABOR_ECONOMY_ID)).toBe(1);
    expect(selectEconomyRate(clicked, CREDITS_ECONOMY_ID)).toBe(0);
    expect(selectClickPower(clicked)).toBe(1);
    expect(selectLastClickGain(clicked)).toBe(1);
    expect(selectPopulation(clicked)).toBe(5);
  });

  it("resolves the era-specific Labor display label from the active economy profile", async () => {
    const runtime = await bundledRuntime();
    const expectedLabels = {
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

    for (const [eraId, label] of Object.entries(expectedLabels)) {
      expect(selectHudEconomySlots(runtime, eraId).find((slot) => slot.id === LABOR_ECONOMY_ID)?.label).toBe(label);
    }
  });

  it("derives dashboard selectors without live objective, event, or fabricated boost fallbacks", async () => {
    const runtime = await bundledRuntime();
    const state = createNewPlayerRuntimeState(runtime, { now: fixedDate() });
    const playerState = playerRuntimeToDashboardPlayerState(runtime, state);

    expect(playerState.source).toBe("player-runtime");
    expect(playerState.currentEraId).toBe("survival");
    expect(playerState.clickOutput?.resourceId).toBe(LABOR_ECONOMY_ID);
    expect(playerState.economyBalances?.[POPULATION_ECONOMY_ID]).toBe(5);
    expect(playerState.objective).toBeUndefined();
    expect(playerState.activeEvent).toBeUndefined();
    expect(playerState.leaderboard).toBeUndefined();
    expect(playerState.boosts).toEqual([]);
    expect(playerState.civilizationPrediction).toBe("Unaligned");
  });

  it("resolves canonical alignment identities only when client profile definitions exist", async () => {
    const runtime = await bundledRuntime();
    const state = createNewPlayerRuntimeState(runtime, { now: fixedDate() });
    const aligned = { ...state, alignment: { ...state.alignment, technology: 5 } };
    const withIdentity = {
      ...runtime,
      clientProfiles: {
        ...runtime.clientProfiles,
        web: {
          ...runtime.clientProfiles.web,
          civilizationIdentities: {
            technology: { label: "Canonical Technocracy" }
          }
        }
      }
    };

    expect(resolveAlignmentIdentity(runtime, aligned)).toBe("Identity Pending Canonical Definition");
    expect(resolveAlignmentIdentity(withIdentity, aligned)).toBe("Canonical Technocracy");
  });

  it("derives upgrade visibility and affordability from canonical definitions plus player inventory", async () => {
    const runtime = await bundledRuntime();
    const state = grantTestResources(runtime, createNewPlayerRuntimeState(runtime, { now: fixedDate() }), 1_000_000);
    const upgrade = runtime.upgrades.find((item) => item.visibilityRules?.defaultState === "available") ?? runtime.upgrades[0];
    const view = getUpgradeViewState(runtime, state, upgrade.id);

    expect(view?.upgrade.id).toBe(upgrade.id);
    expect(view?.level).toBe(state.upgrades.levels[upgrade.id] ?? upgrade.defaultLevel);
    expect(view?.discovered).toBe(true);
    expect(view?.affordable).toBe(true);
  });
});
