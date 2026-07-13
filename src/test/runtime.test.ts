import { describe, expect, it, vi } from "vitest";
import {
  CanonicalRuntimeContentManager,
  MemoryRuntimeContentCache,
  compareRuntimeVersions,
  createCacheRecord,
  createRuntimeContentConfig,
  getBundledStudioRuntimeSnapshot,
  mockRuntimeData,
  resolvePlayerProgressReferences,
  resolveRuntimeAsset,
  validateGameRuntimeData,
  type GameRuntimeData
} from "@/lib/canonical-runtime";

async function bundledRuntime() {
  const runtime = await getBundledStudioRuntimeSnapshot();
  expect(runtime).not.toBeNull();
  return runtime as GameRuntimeData;
}

function cloneRuntime(payload: GameRuntimeData): GameRuntimeData {
  return structuredClone(payload);
}

describe("canonical runtime", () => {
  it("parses the current nine-era Studio snapshot", async () => {
    const runtime = await bundledRuntime();
    const validation = validateGameRuntimeData(runtime);

    expect(validation.ok).toBe(true);
    expect(runtime.metadata.schemaVersion).toBe("game-runtime-v1");
    expect(runtime.metadata.contentVersion).toBe(10);
    expect(runtime.eras).toHaveLength(9);
    expect(runtime.eras.map((era) => era.id)).toEqual([
      "survival",
      "ancient",
      "medieval",
      "renaissance",
      "industrial",
      "modern",
      "space-age",
      "interstellar",
      "galactic"
    ]);
    expect(runtime.resources).toHaveLength(282);
    expect(runtime.upgradeCategories).toHaveLength(4);
    expect(runtime.upgrades).toHaveLength(556);
    expect(runtime.assets).toHaveLength(136);
  });

  it("rejects invalid runtime shape and references", async () => {
    const invalidShape = cloneRuntime(await bundledRuntime());
    invalidShape.metadata.schemaVersion = "unsupported" as never;
    const shapeValidation = validateGameRuntimeData(invalidShape);
    expect(shapeValidation.ok).toBe(false);
    expect(shapeValidation.errors.some((error) => error.includes("schemaVersion"))).toBe(true);

    const invalidReference = cloneRuntime(await bundledRuntime());
    invalidReference.upgrades[0].categoryId = "missing-category";
    const referenceValidation = validateGameRuntimeData(invalidReference);
    expect(referenceValidation.ok).toBe(false);
    expect(referenceValidation.errors.some((error) => error.includes("categoryId"))).toBe(true);
  });

  it("rejects old eight-era runtime content", async () => {
    const invalid = cloneRuntime(await bundledRuntime());
    invalid.eras = invalid.eras.filter((era) => era.id !== "renaissance");

    const validation = validateGameRuntimeData(invalid);

    expect(validation.ok).toBe(false);
    expect(validation.errors.some((error) => error.includes("Expected exactly 9 canonical eras"))).toBe(true);
  });

  it("uses a valid cache when it is newer than the bundled snapshot", async () => {
    const cache = new MemoryRuntimeContentCache();
    const runtime = cloneRuntime(await bundledRuntime());
    runtime.metadata.contentVersion += 1;
    await cache.write(createCacheRecord(runtime, "2026-07-12T00:00:00.000Z"));

    const manager = new CanonicalRuntimeContentManager(cache, createRuntimeContentConfig({ configuredMode: "live" }));
    const state = await manager.loadStartup();

    expect(state.activeSource).toBe("cache");
    expect(state.contentVersion).toBe(11);
    expect(state.cacheStatus).toBe("valid");
  });

  it("clears a stale v4 cache instead of overriding bundled v10", async () => {
    const cache = new MemoryRuntimeContentCache();
    const stale = cloneRuntime(await bundledRuntime());
    stale.metadata.contentVersion = 4;
    await cache.write(createCacheRecord(stale));

    const manager = new CanonicalRuntimeContentManager(cache, createRuntimeContentConfig({ configuredMode: "live" }));
    const state = await manager.loadStartup();

    expect(state.activeSource).toBe("bundled-snapshot");
    expect(state.contentVersion).toBe(10);
    expect(state.cacheStatus).toBe("cleared");
    expect(await cache.read()).toBeNull();
  });

  it("falls back to the bundled snapshot when cache is empty or stale", async () => {
    const cache = new MemoryRuntimeContentCache();
    const stale = cloneRuntime(await bundledRuntime());
    stale.metadata.contentVersion = 2;
    await cache.write(createCacheRecord(stale));

    const manager = new CanonicalRuntimeContentManager(cache, createRuntimeContentConfig({ configuredMode: "snapshot" }));
    const state = await manager.loadStartup();

    expect(state.activeSource).toBe("bundled-snapshot");
    expect(state.contentVersion).toBe(10);
    expect(state.eras[3].id).toBe("renaissance");
    expect(await cache.read()).toBeNull();
  });

  it("can refresh valid live runtime and reject invalid live runtime", async () => {
    const runtime = await bundledRuntime();
    const manager = new CanonicalRuntimeContentManager(new MemoryRuntimeContentCache(), createRuntimeContentConfig({ configuredMode: "live" }));
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(runtime), { status: 200 }));

    const live = await manager.refreshLiveContent();
    expect(live.activated).toBe(true);
    expect(live.state.activeSource).toBe("live");

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ metadata: {} }), { status: 200 }));
    const rejected = await manager.refreshLiveContent(runtime, "live");
    expect(rejected.activated).toBe(false);
    expect(rejected.state.status).toBe("fallback");

    fetchMock.mockRestore();
  });

  it("keeps active content during offline startup refresh", async () => {
    const manager = new CanonicalRuntimeContentManager(new MemoryRuntimeContentCache(), createRuntimeContentConfig({ configuredMode: "live" }));
    const startup = await manager.loadStartup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Studio offline"));

    const refreshed = await manager.refreshLiveContent(await bundledRuntime(), startup.activeSource);

    expect(refreshed.activated).toBe(false);
    expect(refreshed.state.status).toBe("fallback");
    expect(refreshed.state.eras).toHaveLength(9);
    fetchMock.mockRestore();
  });

  it("resolves assets and client profile fallback", async () => {
    const runtime = await bundledRuntime();
    const webAsset = { ...runtime.assets[0], platformMappings: { web: { path: "/assets/test.webp" } } };
    const web = resolveRuntimeAsset(runtime.resources[0], webAsset);
    const placeholder = resolveRuntimeAsset({ ...runtime.resources[0], artKey: "missing", iconKey: "missing" });
    const webProfile = runtime.clientProfiles.web ?? runtime.clientProfiles.default;

    expect(web.kind).toBe("web-path");
    expect(web.path).toBe("/assets/test.webp");
    expect(placeholder.kind).toBe("placeholder");
    expect(placeholder.artworkNeeded).toBe(true);
    expect(webProfile).toBeDefined();
  });

  it("preserves player-state references that still resolve and reports legacy ids", async () => {
    const runtime = await bundledRuntime();
    const knownResourceId = runtime.resources[0].id;
    const knownUpgradeId = runtime.upgrades[0].id;
    const resolved = resolvePlayerProgressReferences(
      {
        currentEraId: "renaissance",
        inventory: { [knownResourceId]: 125, "legacy-resource": 9 },
        upgradeLevels: { [knownUpgradeId]: 4, "legacy-upgrade": 2 }
      },
      runtime
    );

    expect(resolved.currentEraId).toBe("renaissance");
    expect(resolved.inventory[knownResourceId]).toBe(125);
    expect(resolved.unresolved.resources["legacy-resource"]).toBe(9);
    expect(resolved.upgradeLevels[knownUpgradeId]).toBe(4);
    expect(resolved.unresolved.upgrades["legacy-upgrade"]).toBe(2);
  });

  it("keeps mock mode available as the final fallback fixture", async () => {
    const manager = new CanonicalRuntimeContentManager(new MemoryRuntimeContentCache(), createRuntimeContentConfig({ configuredMode: "mock" }));
    const state = await manager.loadStartup();

    expect(state.activeSource).toBe("mock");
    expect(state.contentVersion).toBe(mockRuntimeData.metadata.contentVersion);
    expect(compareRuntimeVersions(await bundledRuntime(), mockRuntimeData)).toBe("remote_newer");
  });
});
