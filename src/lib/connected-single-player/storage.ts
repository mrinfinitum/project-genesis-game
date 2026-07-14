import { defaultStorageService, MemoryStorageService as PlatformMemoryStorageService, type StorageService } from "@/platform/storage";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryKeyValueStore extends PlatformMemoryStorageService implements KeyValueStore {}

export class BrowserKeyValueStore implements KeyValueStore {
  constructor(private readonly storage: StorageService = defaultStorageService) {}

  getItem(key: string) {
    return this.storage.getItem(key);
  }

  setItem(key: string, value: string) {
    this.storage.setItem(key, value);
  }

  removeItem(key: string) {
    this.storage.removeItem(key);
  }
}

export function readJson<T>(store: KeyValueStore, key: string, fallback: T): T {
  const raw = store.getItem(key);

  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(store: KeyValueStore, key: string, value: unknown) {
  store.setItem(key, JSON.stringify(value));
}
