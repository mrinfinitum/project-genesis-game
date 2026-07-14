export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryKeyValueStore implements KeyValueStore {
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

export class BrowserKeyValueStore implements KeyValueStore {
  getItem(key: string) {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string) {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Storage can be unavailable in private browsing, quota pressure, or locked-down embeds.
      }
    }
  }

  removeItem(key: string) {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Best-effort cleanup; gameplay startup must not depend on storage availability.
      }
    }
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
