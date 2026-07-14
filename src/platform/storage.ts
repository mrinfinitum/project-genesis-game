export interface StorageService {
  readonly kind: "web-local-storage" | "memory" | "native-stub";
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStorageService implements StorageService {
  readonly kind = "memory" as const;

  constructor(private readonly values = new Map<string, string>()) {}

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

export class WebStorageService implements StorageService {
  readonly kind = "web-local-storage" as const;

  getItem(key: string) {
    const storage = browserLocalStorage();
    if (!storage) return null;

    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string) {
    const storage = browserLocalStorage();
    if (!storage) return;

    try {
      storage.setItem(key, value);
    } catch {
      // Private browsing, quota pressure, and embedded contexts can all block writes.
    }
  }

  removeItem(key: string) {
    const storage = browserLocalStorage();
    if (!storage) return;

    try {
      storage.removeItem(key);
    } catch {
      // Best-effort cleanup only; gameplay startup must remain resilient.
    }
  }
}

function browserLocalStorage() {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}

export const webStorageService = new WebStorageService();
export const defaultStorageService: StorageService = webStorageService;

export function readStorageJson<T>(store: StorageService, key: string, fallback: T): T {
  const raw = store.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorageJson(store: StorageService, key: string, value: unknown) {
  store.setItem(key, JSON.stringify(value));
}
