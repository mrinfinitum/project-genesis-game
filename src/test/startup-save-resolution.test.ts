import { describe, expect, it } from "vitest";
import { readNoverisSupabaseConfig } from "@/lib/supabase/env";
import { compareSaves, shouldShowConflict, summarizePlayerSave } from "@/lib/startup";
import { createNewPlayerRuntimeState, type PlayerRuntimeState } from "@/lib/player-runtime";
import { CREDITS_ECONOMY_ID, LABOR_ECONOMY_ID, POPULATION_ECONOMY_ID } from "@/lib/player-runtime/economy";
import { getBundledStudioRuntimeSnapshot, type GameRuntimeData } from "@/lib/canonical-runtime";
import type { CloudSave } from "@/lib/supabase";

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
});
