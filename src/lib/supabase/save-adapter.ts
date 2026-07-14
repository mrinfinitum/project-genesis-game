import type { GameRuntimeData } from "@/lib/canonical-runtime";
import { migratePlayerRuntimeState, type PlayerRuntimeState } from "@/lib/player-runtime";
import type { CloudSave, PlayerSaveRow } from "./types";

export type CloudSaveHydrationResult =
  | { ok: true; save: CloudSave }
  | { ok: false; reason: "malformed" | "incompatible" };

function hasRuntimeShape(value: unknown): value is PlayerRuntimeState {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<PlayerRuntimeState>;
  return Boolean(record.civilization && record.economy && record.production && record.resources && record.upgrades);
}

export function serializePlayerRuntimeForCloud(state: PlayerRuntimeState) {
  return {
    save_version: state.saveVersion,
    content_version: state.contentVersion,
    player_state: state,
    unresolved_state: state.unresolved,
    revision: state.revision,
    last_simulation_at: state.lastSimulationAt
  };
}

export function cloudRowToSave(row: PlayerSaveRow, content: GameRuntimeData): CloudSaveHydrationResult {
  if (!hasRuntimeShape(row.player_state)) return { ok: false, reason: "malformed" };
  const migrated = migratePlayerRuntimeState(row.player_state, content);
  if (migrated.contentVersion !== content.metadata.contentVersion) return { ok: false, reason: "incompatible" };

  return {
    ok: true,
    save: {
      id: row.id,
      userId: row.user_id,
      slotId: row.slot_id,
      saveVersion: migrated.saveVersion,
      contentVersion: migrated.contentVersion,
      playerState: {
        ...migrated,
        revision: row.revision,
        updatedAt: row.updated_at,
        lastSimulationAt: row.last_simulation_at ?? migrated.lastSimulationAt
      },
      unresolvedState: migrated.unresolved,
      revision: row.revision,
      deviceId: row.device_id ?? undefined,
      deviceName: row.device_name ?? undefined,
      lastSimulationAt: row.last_simulation_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  };
}

export function hydrateCloudPlayerRuntime(row: PlayerSaveRow, content: GameRuntimeData) {
  const result = cloudRowToSave(row, content);
  return result.ok ? result.save : null;
}
