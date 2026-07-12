import type { GameRuntimeData, RuntimeCacheRecord } from "./types";

export interface RuntimeContentCache {
  read(): Promise<RuntimeCacheRecord | null>;
  write(record: RuntimeCacheRecord): Promise<void>;
  clear(): Promise<void>;
}

const DB_NAME = "project-genesis-game-canonical-runtime";
const DB_VERSION = 1;
const STORE_NAME = "runtime-cache";
const CACHE_KEY = "active-runtime";

function openRuntimeDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onerror = () => reject(request.error ?? new Error("Unable to open runtime cache."));
    request.onsuccess = () => resolve(request.result);
  });
}

function transaction<T>(mode: IDBTransactionMode, handler: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | void> {
  return openRuntimeDb().then(
    (db) =>
      new Promise<T | void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = handler(store);

        tx.oncomplete = () => {
          db.close();
          resolve(request ? request.result : undefined);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error("Runtime cache transaction failed."));
        };
      })
  );
}

export class BrowserRuntimeContentCache implements RuntimeContentCache {
  async read() {
    if (typeof indexedDB === "undefined") {
      return null;
    }

    return ((await transaction<RuntimeCacheRecord | undefined>("readonly", (store) => store.get(CACHE_KEY))) ?? null) as RuntimeCacheRecord | null;
  }

  async write(record: RuntimeCacheRecord) {
    if (typeof indexedDB === "undefined") {
      return;
    }

    await transaction("readwrite", (store) => {
      store.put(record, CACHE_KEY);
    });
  }

  async clear() {
    if (typeof indexedDB === "undefined") {
      return;
    }

    await transaction("readwrite", (store) => {
      store.delete(CACHE_KEY);
    });
  }
}

export class MemoryRuntimeContentCache implements RuntimeContentCache {
  private record: RuntimeCacheRecord | null = null;

  async read() {
    return this.record ? structuredClone(this.record) : null;
  }

  async write(record: RuntimeCacheRecord) {
    this.record = structuredClone(record);
  }

  async clear() {
    this.record = null;
  }
}

export function createCacheRecord(payload: GameRuntimeData, downloadedAt = new Date().toISOString()): RuntimeCacheRecord {
  return {
    schemaVersion: payload.metadata.schemaVersion,
    contentVersion: payload.metadata.contentVersion,
    checksum: payload.metadata.checksum,
    downloadedAt,
    payload
  };
}
