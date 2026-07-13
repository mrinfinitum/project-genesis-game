import { describe, expect, it } from "vitest";
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
import { MemoryKeyValueStore, readJson } from "@/lib/connected-single-player/storage";

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
        population: runtime.balance.startingPopulation
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
    expect(getPrimaryHudResourceIds(runtime, "survival")).toEqual([LABOR_ECONOMY_ID, POPULATION_ECONOMY_ID, RESEARCH_ECONOMY_ID, PREMIUM_CRYSTALS_ECONOMY_ID]);
    expect(getPrimaryHudResourceIds(runtime, "survival")).not.toContain(CREDITS_ECONOMY_ID);
    expect(Object.keys(state.economy.balances).sort()).toEqual(getEconomyResourceIds(runtime).sort());
    expect(state.economy.balances[LABOR_ECONOMY_ID]).toBe(0);
    expect(state.economy.rates[LABOR_ECONOMY_ID]).toBe(1);
    expect(state.economy.balances[POPULATION_ECONOMY_ID]).toBe(125);
    expect(state.economy.balances[PREMIUM_CRYSTALS_ECONOMY_ID]).toBe(0);
    expect(Object.keys(state.resources.inventory)).toEqual(getInventoryResources(runtime).map((resource) => resource.id));
    expect(Object.keys(state.resources.inventory)).not.toContain(LABOR_ECONOMY_ID);
    expect(Object.values(state.resources.storageLimits)).toEqual(getInventoryResources(runtime).map(() => Number.MAX_SAFE_INTEGER));
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

    expect(saved.revision).toBeGreaterThan(state.revision);
    expect(reloaded.economy.balances[LABOR_ECONOMY_ID]).toBe(321);
    expect(autosaved.revision).toBeGreaterThan(reloaded.revision);
    expect(imported.ok).toBe(true);
    expect(imported.state?.economy.balances[LABOR_ECONOMY_ID]).toBe(321);
    expect(reset.economy.balances[LABOR_ECONOMY_ID]).toBe(0);
    expect(readJson<PlayerRuntimeState | null>(store, PLAYER_RUNTIME_SAVE_KEY, null)?.saveVersion).toBe(PLAYER_RUNTIME_SAVE_VERSION);
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
    expect(migrated.economy.balances[POPULATION_ECONOMY_ID]).toBe(runtime.balance.startingPopulation);
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

  it("routes manual and auto labor to Civilization Energy instead of the first HUD slot", async () => {
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

  it("exposes canonical runtime selectors for HUD economy and labor stats", async () => {
    const runtime = await bundledRuntime();
    const clicked = performManualLaborClick(runtime, createNewPlayerRuntimeState(runtime, { now: fixedDate() }), { now: fixedDate() });

    expect(selectHudEconomySlots(runtime, "survival").map((slot) => slot.id)).toEqual(getPrimaryHudResourceIds(runtime, "survival"));
    expect(selectHudEconomySlots(runtime, "survival").map((slot) => slot.id)).not.toContain(CREDITS_ECONOMY_ID);
    expect(selectEconomyBalance(clicked, LABOR_ECONOMY_ID)).toBe(1);
    expect(selectEconomyRate(clicked, CREDITS_ECONOMY_ID)).toBe(0);
    expect(selectClickPower(clicked)).toBe(1);
    expect(selectLastClickGain(clicked)).toBe(1);
    expect(selectPopulation(clicked)).toBe(125);
  });

  it("derives dashboard selectors without live objective, event, or fabricated boost fallbacks", async () => {
    const runtime = await bundledRuntime();
    const state = createNewPlayerRuntimeState(runtime, { now: fixedDate() });
    const playerState = playerRuntimeToDashboardPlayerState(runtime, state);

    expect(playerState.source).toBe("player-runtime");
    expect(playerState.currentEraId).toBe("survival");
    expect(playerState.clickOutput?.resourceId).toBe(LABOR_ECONOMY_ID);
    expect(playerState.economyBalances?.[POPULATION_ECONOMY_ID]).toBe(125);
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
