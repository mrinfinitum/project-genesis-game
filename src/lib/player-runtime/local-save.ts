import type { GameRuntimeData } from "@/lib/canonical-runtime";
import { BrowserKeyValueStore, type KeyValueStore, readJson, writeJson } from "@/lib/connected-single-player/storage";
import { createNewPlayerRuntimeState } from "./initializer";
import { migratePlayerRuntimeState } from "./migrations";
import type { PlayerRuntimeImportResult, PlayerRuntimeState } from "./types";

export const PLAYER_RUNTIME_SAVE_KEY = "project-genesis-game:player-runtime-save";
const PLAYER_RUNTIME_ARCHIVE_KEY = "project-genesis-game:player-runtime-archives";

function timestamp() {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class PlayerRuntimeLocalSaveService {
  constructor(
    private readonly content: GameRuntimeData,
    private readonly store: KeyValueStore = new BrowserKeyValueStore()
  ) {}

  loadOrCreate() {
    const raw = readJson<unknown | null>(this.store, PLAYER_RUNTIME_SAVE_KEY, null);
    const state = raw ? migratePlayerRuntimeState(raw, this.content) : createNewPlayerRuntimeState(this.content);
    this.save(state, false);
    return state;
  }

  save(state: PlayerRuntimeState, bumpRevision = true) {
    const next = {
      ...clone(state),
      revision: bumpRevision ? state.revision + 1 : state.revision,
      contentVersion: this.content.metadata.contentVersion,
      updatedAt: timestamp()
    };
    writeJson(this.store, PLAYER_RUNTIME_SAVE_KEY, next);
    return next;
  }

  autosave(state: PlayerRuntimeState) {
    return this.save(state);
  }

  reset() {
    const current = readJson<PlayerRuntimeState | null>(this.store, PLAYER_RUNTIME_SAVE_KEY, null);
    if (current) {
      const archives = readJson<Array<{ archivedAt: string; state: PlayerRuntimeState }>>(this.store, PLAYER_RUNTIME_ARCHIVE_KEY, []);
      archives.push({ archivedAt: timestamp(), state: current });
      writeJson(this.store, PLAYER_RUNTIME_ARCHIVE_KEY, archives);
    }
    const next = createNewPlayerRuntimeState(this.content);
    writeJson(this.store, PLAYER_RUNTIME_SAVE_KEY, next);
    return next;
  }

  exportSave(state: PlayerRuntimeState) {
    return JSON.stringify(state, null, 2);
  }

  importSave(serialized: string): PlayerRuntimeImportResult {
    try {
      const parsed = JSON.parse(serialized) as unknown;
      const migrated = migratePlayerRuntimeState(parsed, this.content);
      const saved = this.save(migrated);
      return { ok: true, state: saved };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Invalid save payload." };
    }
  }
}
