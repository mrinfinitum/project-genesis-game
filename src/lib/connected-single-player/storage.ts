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

    return window.localStorage.getItem(key);
  }

  setItem(key: string, value: string) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, value);
    }
  }

  removeItem(key: string) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(key);
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
