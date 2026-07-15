import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { getBundledStudioRuntimeSnapshot, type GameRuntimeData } from "@/lib/canonical-runtime";
import { grantPremiumCrystals, resolveLaborRateBreakdown, resolveResearchRateBreakdown, verifyResourceEconomyContracts } from "@/lib/economy";
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
  resolveAiAgentAvailability,
  resolveAiAgentAnimationProfile,
  resolveAvailableAiAgents,
  resolveAvailableAiAgentVariants,
  resolveAiAgentLaborAssistance,
  resolveSelectedAiAgent,
  resolveSelectedAiAgentVariant,
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
import { serializePlayerRuntimeForCloud } from "@/lib/supabase/save-adapter";

async function bundledRuntime() {
  const runtime = await getBundledStudioRuntimeSnapshot();
  expect(runtime).not.toBeNull();
  return runtime as GameRuntimeData;
}

function fixedDate() {
  return new Date("2026-01-02T03:04:05.000Z");
}

const CANONICAL_AI_AGENT_ID = "AI-AGENT-DEFAULT";
const CANONICAL_AI_AGENT_VARIANT_ID = "AI-VARIANT-DEFAULT-T1";

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
        population: 5,
        currentPopulation: 5,
        populationCapacity: 5,
        availableWorkforce: 5,
        assignedWorkforce: 0,
        populationGrowthRate: 0
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
    expect(state.economy.recentTransactions).toEqual([]);
    expect(state.economy.premiumCrystalAudit).toEqual([]);
    expect(state.aiAgent.selectedAiAgentId).toBe(CANONICAL_AI_AGENT_ID);
    expect(state.aiAgent.selectedAiAgentVariantId).toBe(CANONICAL_AI_AGENT_VARIANT_ID);
    expect(state.aiAgent.unlockedAiAgentIds).toContain(CANONICAL_AI_AGENT_ID);
    expect(state.aiAgent.unlockedAiAgentVariantIds).toContain(CANONICAL_AI_AGENT_VARIANT_ID);
    expect(state.aiAgent.blinkEnabled).toBe(true);
    expect(Object.keys(state.resources.inventory)).toEqual(getInventoryResources(runtime).map((resource) => resource.id));
    expect(Object.keys(state.resources.inventory)).not.toContain(LABOR_ECONOMY_ID);
    expect(Object.values(state.resources.storageLimits)).toEqual(getInventoryResources(runtime).map(() => Number.MAX_SAFE_INTEGER));
  });

  it("verifies the Studio resource economy and AI Agent contract", async () => {
    const runtime = await bundledRuntime();
    const verification = verifyResourceEconomyContracts(runtime);
    const laborContract = runtime.economyBehaviorContracts?.find((contract) => contract.economyId === LABOR_ECONOMY_ID);
    const creditsContract = runtime.economyBehaviorContracts?.find((contract) => contract.economyId === CREDITS_ECONOMY_ID);
    const populationContract = runtime.economyBehaviorContracts?.find((contract) => contract.economyId === POPULATION_ECONOMY_ID);
    const survivalHudIds = getPrimaryHudResourceIds(runtime, "survival");
    const survivalIconKeys = selectHudEconomySlots(runtime, "survival").map((slot) => slot.iconKey);

    expect(verification.ok).toBe(true);
    expect(runtime.metadata.contentVersion).toBeGreaterThanOrEqual(20);
    expect(runtime.metadata.checksum).toBe("d3dddd7cb51e0a77a22a106a9a1e32f995362adb83499ca96600e3dc46f47844");
    expect(verification.counts).toMatchObject({
      behaviorContracts: 5,
      producers: 569,
      buildingEffects: 566,
      scopeRules: 4,
      transactionReasons: 11,
      rateBreakdowns: 5,
      offlinePolicies: 5
    });
    expect(runtime.defaultAiAgentId).toBe(CANONICAL_AI_AGENT_ID);
    expect(runtime.aiAgents).toHaveLength(1);
    expect(runtime.aiAgentVariants).toHaveLength(1);
    expect(runtime.aiAgents?.[0]?.id).toBe(CANONICAL_AI_AGENT_ID);
    expect(runtime.aiAgentVariants?.[0]?.id).toBe(CANONICAL_AI_AGENT_VARIANT_ID);
    expect(JSON.stringify(runtime)).not.toMatch(/Orion/i);
    expect(resolvePrimaryEconomyIdForCurrentEra(runtime, "survival")).toBe(LABOR_ECONOMY_ID);
    expect(survivalHudIds).toEqual([LABOR_ECONOMY_ID, CREDITS_ECONOMY_ID, POPULATION_ECONOMY_ID, RESEARCH_ECONOMY_ID, PREMIUM_CRYSTALS_ECONOMY_ID]);
    expect(survivalIconKeys).toEqual(["economy_labor", "economy_credits", "economy_population", "economy_research", "economy_premium_crystals"]);
    expect(laborContract?.startingAmount).toBe(0);
    expect(laborContract?.basePassiveRate).toBe(1);
    expect(laborContract?.manualProduction?.target).toBe(true);
    expect(creditsContract?.startingAmount).toBe(0);
    expect(creditsContract?.basePassiveRate).toBe(0);
    expect(populationContract?.startingAmount).toBe(5);
    expect(populationContract?.capacityResource).toBe(true);
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
    expect(imported.state?.aiAgent.selectedAiAgentId).toBe(CANONICAL_AI_AGENT_ID);
    expect(imported.state?.aiAgent.selectedAiAgentVariantId).toBe(CANONICAL_AI_AGENT_VARIANT_ID);
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

  it("migrates missing, valid, and unknown selected AI Agent IDs safely", async () => {
    const runtime = await bundledRuntime();
    const oldSave = {
      ...createNewPlayerRuntimeState(runtime, { now: fixedDate() }),
      saveVersion: 9
    };
    delete (oldSave as Partial<PlayerRuntimeState>).aiAgent;

    const migratedDefault = migratePlayerRuntimeState(oldSave, runtime);
    expect(migratedDefault.aiAgent.selectedAiAgentId).toBe(CANONICAL_AI_AGENT_ID);
    expect(migratedDefault.aiAgent.selectedAiAgentVariantId).toBe(CANONICAL_AI_AGENT_VARIANT_ID);
    expect(migratedDefault.aiAgent.unlockedAiAgentIds).toContain(CANONICAL_AI_AGENT_ID);
    expect(migratedDefault.aiAgent.unlockedAiAgentVariantIds).toContain(CANONICAL_AI_AGENT_VARIANT_ID);
    expect(migratedDefault.unresolved.migrationNotes.some((note) => note.includes("default AI Agent"))).toBe(true);

    const selected = migratePlayerRuntimeState({
      ...oldSave,
      aiAgent: {
        selectedAiAgentId: CANONICAL_AI_AGENT_ID,
        selectedAiAgentVariantId: CANONICAL_AI_AGENT_VARIANT_ID,
        unlockedAiAgentIds: [CANONICAL_AI_AGENT_ID],
        unlockedAiAgentVariantIds: [CANONICAL_AI_AGENT_VARIANT_ID],
        blinkEnabled: false,
        reducedAnimation: true
      }
    }, runtime);
    expect(selected.aiAgent.selectedAiAgentId).toBe(CANONICAL_AI_AGENT_ID);
    expect(selected.aiAgent.selectedAiAgentVariantId).toBe(CANONICAL_AI_AGENT_VARIANT_ID);
    expect(selected.aiAgent.blinkEnabled).toBe(false);
    expect(selected.aiAgent.reducedAnimation).toBe(true);

    const unknown = migratePlayerRuntimeState({
      ...oldSave,
      aiAgent: {
        selectedAiAgentId: "studio-agent-not-yet-in-web",
        blinkEnabled: true,
        reducedAnimation: false
      }
    }, runtime);
    expect(unknown.aiAgent.selectedAiAgentId).toBe(CANONICAL_AI_AGENT_ID);
    expect(unknown.aiAgent.selectedAiAgentVariantId).toBe(CANONICAL_AI_AGENT_VARIANT_ID);
    expect(unknown.unresolved.selectedAiAgentId).toBe("studio-agent-not-yet-in-web");
    expect(unknown.unresolved.selectedAiAgentVariantId).toBeUndefined();
  });

  it("persists selected AI Agent metadata through local and cloud serialization", async () => {
    const runtime = await bundledRuntime();
    const store = new MemoryKeyValueStore();
    const service = new PlayerRuntimeLocalSaveService(runtime, store);
    const state = {
      ...createNewPlayerRuntimeState(runtime, { now: fixedDate() }),
      aiAgent: {
        selectedAiAgentId: CANONICAL_AI_AGENT_ID,
        selectedAiAgentVariantId: CANONICAL_AI_AGENT_VARIANT_ID,
        unlockedAiAgentIds: [CANONICAL_AI_AGENT_ID],
        unlockedAiAgentVariantIds: [CANONICAL_AI_AGENT_VARIANT_ID],
        blinkEnabled: false,
        reducedAnimation: true
      }
    };

    const saved = service.save(state);
    const cloud = serializePlayerRuntimeForCloud(saved);
    const reloaded = new PlayerRuntimeLocalSaveService(runtime, store).loadOrCreate();

    expect(reloaded.aiAgent).toEqual(saved.aiAgent);
    expect(cloud.player_state.aiAgent).toEqual(saved.aiAgent);
  });

  it("keeps published AI Agent variants cosmetic for Labor Assistance", async () => {
    const runtime = await bundledRuntime();
    const baseState = createNewPlayerRuntimeState(runtime, { now: fixedDate() });
    const variantState = {
      ...baseState,
      aiAgent: {
        ...baseState.aiAgent,
        selectedAiAgentVariantId: CANONICAL_AI_AGENT_VARIANT_ID,
        unlockedAiAgentVariantIds: [CANONICAL_AI_AGENT_VARIANT_ID]
      }
    };

    const baseAssistance = resolveAiAgentLaborAssistance(runtime, baseState);
    const variantAssistance = resolveAiAgentLaborAssistance(runtime, variantState);
    const playerState = playerRuntimeToDashboardPlayerState(runtime, variantState);

    expect(baseAssistance.totalRate).toBe(variantAssistance.totalRate);
    expect(playerState.aiAgent?.selectedAiAgentVariantId).toBe(CANONICAL_AI_AGENT_VARIANT_ID);
    expect(playerState.aiAgent?.variantName).toBe("Genesis I");
    expect(playerState.aiAgent?.customization?.availableVariants).toHaveLength(1);
    expect(playerState.aiAgent?.customization?.lockedVariants).toEqual([]);
  });

  it("hides draft Agents and prevents locked Variants from becoming active", async () => {
    const runtime = await bundledRuntime();
    const lockedVariantId = "AI-VARIANT-LOCKED-T2";
    const draftAgentId = "AI-AGENT-ORION-DRAFT";
    const runtimeWithPrivateRecords: GameRuntimeData = {
      ...runtime,
      aiAgents: [
        ...(runtime.aiAgents ?? []),
        {
          id: draftAgentId,
          displayName: "Orion",
          status: "draft",
          publishState: "draft",
          approvalState: "draft",
          assetKeys: {
            open: "auto_robot_icon"
          }
        }
      ],
      aiAgentVariants: [
        ...(runtime.aiAgentVariants ?? []),
        {
          id: lockedVariantId,
          agentId: CANONICAL_AI_AGENT_ID,
          displayName: "Locked Test Variant",
          shortDisplayName: "Locked",
          tier: 2,
          status: "available",
          publishState: "published",
          approvalState: "approved",
          assetKeys: {
            open: "auto_robot_icon"
          }
        }
      ]
    };
    const selectedLocked = {
      ...createNewPlayerRuntimeState(runtimeWithPrivateRecords, { now: fixedDate() }),
      aiAgent: {
        selectedAiAgentId: CANONICAL_AI_AGENT_ID,
        selectedAiAgentVariantId: lockedVariantId,
        unlockedAiAgentIds: [CANONICAL_AI_AGENT_ID],
        unlockedAiAgentVariantIds: [CANONICAL_AI_AGENT_VARIANT_ID],
        blinkEnabled: true,
        reducedAnimation: false
      }
    };
    const selectedDraft = {
      ...selectedLocked,
      aiAgent: {
        ...selectedLocked.aiAgent,
        selectedAiAgentId: draftAgentId
      }
    };

    expect(resolveAvailableAiAgents(runtimeWithPrivateRecords, selectedDraft).map((agent) => agent.id)).not.toContain(draftAgentId);
    expect(resolveSelectedAiAgent(runtimeWithPrivateRecords, selectedDraft).agent.id).toBe(CANONICAL_AI_AGENT_ID);
    expect(resolveAvailableAiAgentVariants(runtimeWithPrivateRecords, CANONICAL_AI_AGENT_ID, selectedLocked).map((variant) => variant.id)).not.toContain(lockedVariantId);
    const resolvedVariant = resolveSelectedAiAgentVariant(runtimeWithPrivateRecords, selectedLocked);
    expect(resolvedVariant.variant?.id).toBe(CANONICAL_AI_AGENT_VARIANT_ID);
    expect(resolvedVariant.unresolvedSelectedAiAgentVariantId).toBe(lockedVariantId);
  });

  it("resolves AI Agent selectors with fallback art and canonical animation defaults", async () => {
    const runtime = await bundledRuntime();
    const state = createNewPlayerRuntimeState(runtime, { now: fixedDate() });
    const selected = resolveSelectedAiAgent(runtime, state);
    const animation = resolveAiAgentAnimationProfile(runtime, state);
    const locked = resolveAiAgentAvailability(runtime, "locked-agent", state);

    expect(selected.agent.id).toBe(CANONICAL_AI_AGENT_ID);
    expect(selected.source).toBe("canonical");
    expect(animation.minIntervalMs).toBe(3000);
    expect(locked.available).toBe(false);
    expect(locked.locked).toBe(true);
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
    const displayedState = playerRuntimeToDashboardPlayerState(runtime, autoState);
    const assistance = resolveAiAgentLaborAssistance(runtime, autoState);

    expect(clicked.economy.balances[LABOR_ECONOMY_ID]).toBeGreaterThan(state.economy.balances[LABOR_ECONOMY_ID] ?? 0);
    expect(clicked.economy.balances[CREDITS_ECONOMY_ID]).toBe(state.economy.balances[CREDITS_ECONOMY_ID]);
    expect(clicked.production.lastClickGain).toBe(1);
    expect(clicked.production.totalManualClicks).toBe(1);
    expect(clicked.civilization.discoveryPoints).toBeGreaterThanOrEqual(1);
    expect(advanced.production.autoClickPower).toBeGreaterThan(0);
    expect(assistance.totalRate).toBe(advanced.production.autoClickPower);
    expect(displayedState.automation?.amountPerSecond).toBe(assistance.totalRate);
    expect(displayedState.aiAgent?.progression?.level).toBe(1);
    expect(advanced.economy.rates[LABOR_ECONOMY_ID]).toBeGreaterThanOrEqual(1);
    expect(advanced.economy.balances[LABOR_ECONOMY_ID]).toBeGreaterThan(clicked.economy.balances[LABOR_ECONOMY_ID]);
    expect(advanced.economy.rates[CREDITS_ECONOMY_ID]).toBe(0);
    expect(advanced.economy.balances[CREDITS_ECONOMY_ID]).toBe(clicked.economy.balances[CREDITS_ECONOMY_ID]);
    expect(advanced.economy.rates[PREMIUM_CRYSTALS_ECONOMY_ID]).toBe(0);
    expect(advanced.civilization.eraProgress).toBeGreaterThan(state.civilization.eraProgress);
  });

  it("uses canonical rate breakdowns for Labor and keeps Research at zero without active producers", async () => {
    const runtime = await bundledRuntime();
    const base = createNewPlayerRuntimeState(runtime, { now: fixedDate() });
    const offline = {
      ...base,
      production: {
        ...base.production,
        automationEnabled: false
      }
    };
    const online = {
      ...base,
      production: {
        ...base.production,
        automationEnabled: true
      },
      upgrades: {
        ...base.upgrades,
        levels: {
          ...base.upgrades.levels,
          [runtime.upgrades.find((upgrade) => upgrade.effectType.toLowerCase().includes("auto"))!.id]: 1
        }
      }
    };

    const offlineLabor = resolveLaborRateBreakdown(runtime, offline);
    const onlineLabor = resolveLaborRateBreakdown(runtime, online);
    const research = resolveResearchRateBreakdown(runtime, online);

    expect(offlineLabor.flatBaseRate).toBe(1);
    expect(offlineLabor.producerContributions.find((contribution) => contribution.sourceType === "ai_agent")).toBeUndefined();
    expect(offlineLabor.displayedRate).toBe(1);
    expect(onlineLabor.producerContributions.find((contribution) => contribution.sourceType === "ai_agent")?.amountPerSecond).toBeGreaterThan(0);
    expect(onlineLabor.displayedRate).toBeGreaterThan(offlineLabor.displayedRate);
    expect(onlineLabor.sourceBreakdown.calculationOrderSteps).toBe(7);
    expect(research.displayedRate).toBe(0);
    expect(research.pausedReasons).toContain("no_active_econ_research_producer");
  });

  it("records manual Labor transactions and protects Premium Crystal grants", async () => {
    const runtime = await bundledRuntime();
    const state = createNewPlayerRuntimeState(runtime, { now: fixedDate() });
    const clicked = performManualLaborClick(runtime, state, { now: fixedDate(), forceCritical: false });
    const genericGrant = grantTestResources(runtime, state, 1000);
    const unsafePremium = grantPremiumCrystals(runtime, state, {
      amount: 10,
      reasonCode: "premium_purchase",
      sourceType: "verified_purchase",
      sourceId: "local-callback",
      verified: false
    });
    const safePremium = grantPremiumCrystals(runtime, state, {
      amount: 10,
      reasonCode: "premium_purchase",
      sourceType: "verified_purchase",
      sourceId: "entitlement-1",
      entitlementId: "entitlement-1",
      verified: true
    });

    expect(clicked.economy.recentTransactions[0]).toMatchObject({
      economyId: LABOR_ECONOMY_ID,
      amount: 1,
      operation: "produce",
      sourceType: "manual_click",
      reasonCode: "labor_produce"
    });
    expect(genericGrant.economy.balances[PREMIUM_CRYSTALS_ECONOMY_ID]).toBe(0);
    expect(unsafePremium.ok).toBe(false);
    expect(unsafePremium.reason).toBe("verified_premium_source_required");
    expect(safePremium.ok).toBe(true);
    expect(safePremium.state?.economy.balances[PREMIUM_CRYSTALS_ECONOMY_ID]).toBe(10);
    expect(safePremium.state?.economy.premiumCrystalAudit[0]).toMatchObject({
      economyId: PREMIUM_CRYSTALS_ECONOMY_ID,
      operation: "purchase",
      verified: true
    });
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
    const displayedState = playerRuntimeToDashboardPlayerState(runtime, state);
    const assistance = resolveAiAgentLaborAssistance(runtime, state);

    expect(advanced.economy.balances[LABOR_ECONOMY_ID]).toBe(10);
    expect(advanced.economy.rates[LABOR_ECONOMY_ID]).toBe(1);
    expect(assistance.totalRate).toBe(0);
    expect(displayedState.automation?.amountPerSecond).toBe(0);
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
    expect(playerState.automation?.label).toBe("AI Agent");
    expect(playerState.automation?.assistanceLabel).toBe("Labor Assistance");
    expect(playerState.automation?.onlineLabel).toBe("Agent Online");
    expect(playerState.aiAgent?.selectedAiAgentId).toBe(CANONICAL_AI_AGENT_ID);
    expect(playerState.aiAgent?.selectedAiAgentVariantId).toBe(CANONICAL_AI_AGENT_VARIANT_ID);
    expect(playerState.aiAgent?.variantName).toBe("Genesis I");
    expect(playerState.aiAgent?.asset.openArtKey).toBe("auto_robot_icon");
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
