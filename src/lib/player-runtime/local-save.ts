import type { GameRuntimeData } from "@/lib/canonical-runtime";
import { BrowserKeyValueStore, type KeyValueStore, readJson, writeJson } from "@/lib/connected-single-player/storage";
import { createNewPlayerRuntimeState } from "./initializer";
import { migratePlayerRuntimeState } from "./migrations";
import { PLAYER_RUNTIME_SAVE_VERSION, type PlayerRuntimeImportResult, type PlayerRuntimeLoadReport, type PlayerRuntimeState } from "./types";

export const PLAYER_RUNTIME_SAVE_KEY = "project-genesis-game:player-runtime-save";
const PLAYER_RUNTIME_ARCHIVE_KEY = "project-genesis-game:player-runtime-archives";

function timestamp() {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function parseStoredSave(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function saveMetadata(raw: unknown) {
  const record = raw && typeof raw === "object" ? raw as Partial<PlayerRuntimeState> : {};
  return {
    rawSaveVersion: typeof record.saveVersion === "number" ? record.saveVersion : undefined,
    rawContentVersion: typeof record.contentVersion === "number" ? record.contentVersion : undefined,
    saveTimestamp: typeof record.updatedAt === "string" ? record.updatedAt : undefined
  };
}

function migrationNeeded(raw: unknown, content: GameRuntimeData) {
  const metadata = saveMetadata(raw);
  return metadata.rawSaveVersion !== PLAYER_RUNTIME_SAVE_VERSION || metadata.rawContentVersion !== content.metadata.contentVersion;
}

function withLoadReport(state: PlayerRuntimeState, report: Omit<PlayerRuntimeLoadReport, "loadedAt" | "contentVersion" | "currentSaveVersion">): PlayerRuntimeState {
  return {
    ...state,
    runtimeLoadReport: {
      ...report,
      loadedAt: timestamp(),
      contentVersion: state.contentVersion,
      currentSaveVersion: PLAYER_RUNTIME_SAVE_VERSION
    }
  };
}

export class PlayerRuntimeLocalSaveService {
  constructor(
    private readonly content: GameRuntimeData,
    private readonly store: KeyValueStore = new BrowserKeyValueStore()
  ) {}

  loadOrCreate() {
    const raw = parseStoredSave(this.store.getItem(PLAYER_RUNTIME_SAVE_KEY));
    const state = raw
      ? withLoadReport(migratePlayerRuntimeState(raw, this.content), {
        loadedFrom: "Browser Save",
        saveSource: "localStorage",
        saveLoaded: true,
        newGamePathExecuted: false,
        migrationExecuted: migrationNeeded(raw, this.content),
        ...saveMetadata(raw)
      })
      : withLoadReport(createNewPlayerRuntimeState(this.content), {
        loadedFrom: "New Game",
        saveSource: "canonical-runtime",
        saveLoaded: false,
        newGamePathExecuted: true,
        migrationExecuted: false
      });
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
    this.store.removeItem(PLAYER_RUNTIME_SAVE_KEY);
    const next = withLoadReport(createNewPlayerRuntimeState(this.content), {
      loadedFrom: "Reset to Canonical New Game",
      saveSource: "canonical-runtime",
      saveLoaded: false,
      newGamePathExecuted: true,
      migrationExecuted: false
    });
    writeJson(this.store, PLAYER_RUNTIME_SAVE_KEY, next);
    return next;
  }

  deleteLocalSave() {
    this.store.removeItem(PLAYER_RUNTIME_SAVE_KEY);
    return withLoadReport(createNewPlayerRuntimeState(this.content), {
      loadedFrom: "Deleted Local Save",
      saveSource: "canonical-runtime",
      saveLoaded: false,
      newGamePathExecuted: true,
      migrationExecuted: false
    });
  }

  exportSave(state: PlayerRuntimeState) {
    return JSON.stringify(state, null, 2);
  }

  importSave(serialized: string): PlayerRuntimeImportResult {
    try {
      const parsed = JSON.parse(serialized) as unknown;
      const migrated = withLoadReport(migratePlayerRuntimeState(parsed, this.content), {
        loadedFrom: "Imported Save",
        saveSource: "import",
        saveLoaded: true,
        newGamePathExecuted: false,
        migrationExecuted: migrationNeeded(parsed, this.content),
        ...saveMetadata(parsed)
      });
      const saved = this.save(migrated);
      return { ok: true, state: saved };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Invalid save payload." };
    }
  }
}
