import {
  CONTENT_VERSION,
  SAVE_VERSION,
  SCHEMA_VERSION,
  type LocalFirstSave,
  type PlayerState,
  type PublicPlayerStatistics,
  type QueuedSyncOperation
} from "./types";
import { type KeyValueStore, readJson, writeJson } from "./storage";

const SAVE_KEY = "project-genesis-game:local-save";
const DEVICE_KEY = "project-genesis-game:device-id";
const QUEUE_KEY = "project-genesis-game:sync-queue";
const ARCHIVE_KEY = "project-genesis-game:save-archives";

function now() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function getOrCreateDeviceId(store: KeyValueStore) {
  const existing = store.getItem(DEVICE_KEY);

  if (existing) {
    return existing;
  }

  const created = createId("device");
  store.setItem(DEVICE_KEY, created);
  return created;
}

export function createInitialPublicStats(civilizationId: string, civilizationName: string): PublicPlayerStatistics {
  const timestamp = now();

  return {
    civilizationId,
    civilizationName,
    era: "Dawnflight",
    discoveryPoints: 0,
    eraMastery: 0,
    planetsDiscovered: 0,
    systemsDiscovered: 1,
    coloniesFounded: 1,
    researchCompleted: 0,
    tradeNetworkValue: 0,
    civilizationPower: 10,
    weeklyProgress: 0,
    updatedAt: timestamp
  };
}

export function createInitialPlayerState(): PlayerState {
  const civilizationId = createId("civ");
  const civilizationName = "Local Genesis Initiative";

  return {
    private: {
      civilizationId,
      civilizationName,
      homeSystemId: "sol",
      currentEra: "Dawnflight",
      unlockedResearchIds: [],
      discoveredPlanetIds: [],
      discoveredSystemIds: ["sol"],
      colonyIds: ["earth-prime"],
      tradeRoutes: []
    },
    publicStats: createInitialPublicStats(civilizationId, civilizationName),
    achievements: [],
    weeklyChallenges: [
      {
        challengeId: "frontier-surge",
        progress: 0,
        goal: 100,
        completed: false
      }
    ],
    localFlags: {
      tutorialSeen: false,
      simulateOffline: false
    }
  };
}

export class LocalSaveRepository {
  constructor(private readonly store: KeyValueStore) {}

  loadOrCreateSave(): LocalFirstSave {
    const existing = readJson<LocalFirstSave | null>(this.store, SAVE_KEY, null);

    if (existing) {
      return existing;
    }

    const timestamp = now();
    const save: LocalFirstSave = {
      saveVersion: SAVE_VERSION,
      schemaVersion: SCHEMA_VERSION,
      contentVersion: CONTENT_VERSION,
      revision: 1,
      deviceId: getOrCreateDeviceId(this.store),
      updatedAt: timestamp,
      lastSimulationAt: timestamp,
      state: createInitialPlayerState()
    };

    this.persistSave(save);
    return save;
  }

  persistSave(save: LocalFirstSave) {
    writeJson(this.store, SAVE_KEY, save);
  }

  updateState(mutator: (state: PlayerState) => PlayerState): LocalFirstSave {
    const current = this.loadOrCreateSave();
    const timestamp = now();
    const nextState = mutator(structuredClone(current.state));
    const next: LocalFirstSave = {
      ...current,
      revision: current.revision + 1,
      updatedAt: timestamp,
      lastSimulationAt: timestamp,
      state: nextState
    };

    this.persistSave(next);
    return next;
  }

  replaceActiveSave(save: LocalFirstSave) {
    const timestamp = now();
    const next = {
      ...save,
      deviceId: getOrCreateDeviceId(this.store),
      updatedAt: timestamp,
      lastSimulationAt: timestamp
    };
    this.persistSave(next);
    return next;
  }

  archiveSave(save: LocalFirstSave, label: string) {
    const archives = readJson<Array<{ label: string; archivedAt: string; save: LocalFirstSave }>>(this.store, ARCHIVE_KEY, []);
    archives.push({ label, archivedAt: now(), save });
    writeJson(this.store, ARCHIVE_KEY, archives);
    return archives;
  }

  getArchives() {
    return readJson<Array<{ label: string; archivedAt: string; save: LocalFirstSave }>>(this.store, ARCHIVE_KEY, []);
  }

  resetLocalSave() {
    this.store.removeItem(SAVE_KEY);
    this.store.removeItem(QUEUE_KEY);
    return this.loadOrCreateSave();
  }

  inspectLocalSave() {
    return this.loadOrCreateSave();
  }

  getQueue() {
    return readJson<QueuedSyncOperation[]>(this.store, QUEUE_KEY, []);
  }

  setQueue(queue: QueuedSyncOperation[]) {
    writeJson(this.store, QUEUE_KEY, queue);
  }

  enqueue(type: QueuedSyncOperation["type"], revision: number, payload: unknown) {
    const queue = this.getQueue();
    const operation: QueuedSyncOperation = {
      id: createId("sync"),
      type,
      revision,
      createdAt: now(),
      attempts: 0,
      payload
    };

    queue.push(operation);
    this.setQueue(queue);
    return operation;
  }

  markOperationAttempt(operationId: string) {
    this.setQueue(
      this.getQueue().map((operation) =>
        operation.id === operationId ? { ...operation, attempts: operation.attempts + 1 } : operation
      )
    );
  }

  removeOperation(operationId: string) {
    this.setQueue(this.getQueue().filter((operation) => operation.id !== operationId));
  }
}
