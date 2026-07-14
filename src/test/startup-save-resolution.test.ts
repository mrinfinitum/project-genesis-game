import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { readNoverisSupabaseConfig } from "@/lib/supabase/env";
import { compareSaves, shouldShowConflict, summarizePlayerSave, useGameStartup } from "@/lib/startup";
import { createNewPlayerRuntimeState, type PlayerRuntimeState } from "@/lib/player-runtime";
import { CREDITS_ECONOMY_ID, LABOR_ECONOMY_ID, POPULATION_ECONOMY_ID } from "@/lib/player-runtime/economy";
import { getBundledStudioRuntimeSnapshot, type GameRuntimeData, type RuntimeContentState } from "@/lib/canonical-runtime";
import { cloudRowToSave, type CloudSave, type NoverisAuthState, type PlayerSaveRow } from "@/lib/supabase";

async function runtime() {
  return await getBundledStudioRuntimeSnapshot() as GameRuntimeData;
}

function cloudFrom(state: PlayerRuntimeState, revision = state.revision): CloudSave {
  return {
    id: "cloud-save",
    userId: "user-1",
    slotId: "primary",
    saveVersion: state.saveVersion,
    contentVersion: state.contentVersion,
    playerState: { ...state, revision },
    unresolvedState: state.unresolved,
    revision,
    deviceName: "Cloud Device",
    createdAt: state.createdAt,
    updatedAt: state.updatedAt
  };
}

function rowFrom(state: PlayerRuntimeState): PlayerSaveRow {
  return {
    id: "row-1",
    user_id: "user-1",
    slot_id: "primary",
    save_version: state.saveVersion,
    content_version: state.contentVersion,
    player_state: state,
    unresolved_state: state.unresolved,
    revision: 12,
    device_id: "device-1",
    device_name: "Test Browser",
    last_simulation_at: state.lastSimulationAt,
    created_at: state.createdAt,
    updated_at: state.updatedAt
  };
}

function runtimeState(data: GameRuntimeData): RuntimeContentState {
  return {
    configuredMode: "live",
    activeSource: "bundled-snapshot",
    status: "fallback",
    schemaVersion: data.metadata.schemaVersion,
    runtimeVersion: data.metadata.runtimeVersion,
    architectureVersion: data.metadata.architectureVersion,
    contentVersion: data.metadata.contentVersion,
    releaseName: data.metadata.releaseName,
    checksum: data.metadata.checksum,
    accessLevel: data.metadata.accessLevel,
    validationStatus: data.metadata.validationStatus,
    eras: data.eras,
    resources: data.resources,
    upgradeCategories: data.upgradeCategories,
    upgrades: data.upgrades,
    assets: data.assets,
    balance: data.balance,
    clientProfiles: data.clientProfiles,
    economy: data.economy,
    economyDefinitions: data.economyDefinitions,
    validationErrors: [],
    validationWarnings: [],
    isUsingFallback: true,
    fallbackReason: "Test fallback runtime",
    studioEndpoint: "test",
    cacheStatus: "empty"
  };
}

describe("Noveris startup save resolution", () => {
  it("keeps Supabase configuration optional for guest play", () => {
    const config = readNoverisSupabaseConfig({});
    expect(config.isConfigured).toBe(false);
    expect(config.publishableKey).toBe("");
    expect(config.unavailableReason).toMatch(/unavailable/i);
  });

  it("summarizes player saves without exposing raw JSON", async () => {
    const data = await runtime();
    const state = createNewPlayerRuntimeState(data);
    const summary = summarizePlayerSave("local", state, "This Device");

    expect(summary.classification).toBe("canonical new game");
    expect(summary.labor).toBe(0);
    expect(summary.credits).toBe(0);
    expect(summary.population).toBe(5);
    expect(summary.deviceName).toBe("This Device");
  });

  it("detects local, cloud, and divergent save relationships", async () => {
    const data = await runtime();
    const local = createNewPlayerRuntimeState(data);
    const localAdvanced = {
      ...local,
      revision: 4,
      economy: { ...local.economy, balances: { ...local.economy.balances, [LABOR_ECONOMY_ID]: 10 } }
    };
    const cloudAdvanced = cloudFrom({
      ...local,
      revision: 7,
      economy: { ...local.economy, balances: { ...local.economy.balances, [CREDITS_ECONOMY_ID]: 5 } }
    }, 7);
    const divergentCloud = cloudFrom({ ...localAdvanced, revision: 4, economy: { ...localAdvanced.economy, balances: { ...localAdvanced.economy.balances, [POPULATION_ECONOMY_ID]: 9 } } }, 4);

    expect(compareSaves(local, cloudFrom(local))).toBe("identical");
    expect(compareSaves(localAdvanced, cloudFrom(local))).toBe("local descendant");
    expect(compareSaves(local, cloudAdvanced)).toBe("cloud descendant");
    expect(compareSaves(localAdvanced, divergentCloud)).toBe("divergent");
    expect(shouldShowConflict("divergent")).toBe(true);
  });

  it("hydrates cloud rows through the adapter before gameplay uses them", async () => {
    const data = await runtime();
    const state = createNewPlayerRuntimeState(data);
    const result = cloudRowToSave(rowFrom(state), data);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.save.revision).toBe(12);
      expect(result.save.playerState.revision).toBe(12);
      expect(result.save.deviceName).toBe("Test Browser");
      expect(result.save.playerState.economy.balances[POPULATION_ECONOMY_ID]).toBe(5);
    }
  });

  it("rejects malformed cloud rows safely", async () => {
    const data = await runtime();
    const state = createNewPlayerRuntimeState(data);
    const malformed = { ...rowFrom(state), player_state: { nope: true } as unknown as PlayerRuntimeState };

    expect(cloudRowToSave(malformed, data)).toEqual({ ok: false, reason: "malformed" });
  });

  it("lets local gameplay continue when account startup is recoverable", async () => {
    const data = await runtime();
    const playerRuntime = createNewPlayerRuntimeState(data);
    const authState: NoverisAuthState = {
      status: "error",
      session: null,
      user: null,
      error: "Account startup timed out. Continuing offline.",
      cloudAvailable: true
    };

    const { result } = renderHook(() => useGameStartup({ runtimeState: runtimeState(data), authState, playerRuntime }));

    expect(result.current.phase).toBe("recoverable_error");
    expect(result.current.isReady).toBe(true);
    expect(result.current.selectedSaveSource).toBe("local");
  });

  it("flags incompatible saves as conflict-worthy", async () => {
    const data = await runtime();
    const local = createNewPlayerRuntimeState(data);
    const incompatible = cloudFrom({ ...local, contentVersion: 999 });

    expect(compareSaves(local, incompatible)).toBe("incompatible");
    expect(shouldShowConflict("incompatible")).toBe(true);
  });
});
