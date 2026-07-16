import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { GalaxySemanticMap } from "@/components/galaxy/GalaxySemanticMap";
import { mockRuntimeData } from "@/lib/canonical-runtime";
import {
  composeVisibleNodes,
  createKnownSearchIndex,
  createPersistentUniverseModel,
  createRoutePreview,
  createStreamingSnapshot,
  resolveSemanticZoomLevel,
  resolveStarSystemPresentation,
  resolveTechnologyVisibility
} from "@/lib/galaxy-map";
import { createNewPlayerRuntimeState } from "@/lib/player-runtime";

function runtimeInEra(eraId: string) {
  const state = createNewPlayerRuntimeState(mockRuntimeData, { now: new Date("2026-01-01T00:00:00.000Z") });
  return {
    ...state,
    civilization: {
      ...state.civilization,
      currentEraId: eraId
    }
  };
}

describe("persistent 3D semantic galaxy map", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("generates stable shared hierarchy IDs from the same seed for different players", () => {
    const first = createPersistentUniverseModel(mockRuntimeData);
    const second = createPersistentUniverseModel(mockRuntimeData);

    expect(first.audit.seed).toBe(second.audit.seed);
    expect(first.sectors.map((sector) => sector.id)).toEqual(second.sectors.map((sector) => sector.id));
    expect(first.systemsBySectorId[first.currentSectorId].map((system) => system.id)).toEqual(second.systemsBySectorId[second.currentSectorId].map((system) => system.id));
    expect(first.bodiesBySystemId[first.currentSystemId].map((body) => body.id)).toEqual(second.bodiesBySystemId[second.currentSystemId].map((body) => body.id));
  });

  it("models one persistent universe at large procedural scale without materializing every system", () => {
    const model = createPersistentUniverseModel(mockRuntimeData);

    expect(model.universe.id).toBe("UNI-NOVERIS-PRIME");
    expect(model.virtualCounts.sectors).toBeGreaterThanOrEqual(10_000);
    expect(model.virtualCounts.systems).toBeGreaterThanOrEqual(100_000);
    expect(model.galaxyChunks.length).toBeGreaterThan(1);
    expect(model.sectors.length).toBeLessThan(model.virtualCounts.sectors);
    expect(model.systemsBySectorId[model.currentSectorId].length).toBeLessThan(model.virtualCounts.systems);
  });

  it("keeps deterministic orbital-like body placement stable across reloads", () => {
    const first = createPersistentUniverseModel(mockRuntimeData);
    const second = createPersistentUniverseModel(mockRuntimeData);
    const firstLayout = resolveStarSystemPresentation(first, first.currentSystemId, resolveTechnologyVisibility(mockRuntimeData, runtimeInEra("space-age")));
    const secondLayout = resolveStarSystemPresentation(second, second.currentSystemId, resolveTechnologyVisibility(mockRuntimeData, runtimeInEra("space-age")));

    expect(firstLayout.bodies.map((body) => [body.id, body.orbitalRadius, body.orbitalAngle, body.inclination])).toEqual(
      secondLayout.bodies.map((body) => [body.id, body.orbitalRadius, body.orbitalAngle, body.inclination])
    );
  });

  it("gates semantic depth by era technology instead of raw wheel distance", () => {
    const survivalVisibility = resolveTechnologyVisibility(mockRuntimeData, runtimeInEra("survival"));
    const interstellarVisibility = resolveTechnologyVisibility(mockRuntimeData, runtimeInEra("interstellar"));
    const galacticVisibility = resolveTechnologyVisibility(mockRuntimeData, runtimeInEra("galactic"));

    expect(survivalVisibility.canAccessGalaxy).toBe(false);
    expect(resolveSemanticZoomLevel({ requestedLevel: "galaxy", cameraDistance: 999, technologyVisibility: survivalVisibility, loadedContext: {} })).toMatchObject({ level: "system", blocked: true });
    expect(resolveSemanticZoomLevel({ requestedLevel: "galaxy", cameraDistance: 999, technologyVisibility: interstellarVisibility, loadedContext: {} })).toMatchObject({ level: "sector", blocked: true });
    expect(resolveSemanticZoomLevel({ requestedLevel: "galaxy", cameraDistance: 999, technologyVisibility: galacticVisibility, loadedContext: {} })).toMatchObject({ level: "galaxy", blocked: false });
  });

  it("filters unknown sector and system information before building visible view models", () => {
    const model = createPersistentUniverseModel(mockRuntimeData);
    const visibility = resolveTechnologyVisibility(mockRuntimeData, runtimeInEra("galactic"));
    const sectors = composeVisibleNodes(model, "galaxy", { visibility });
    const unknownSector = sectors.find((sector) => sector.id !== model.currentSectorId);

    expect(unknownSector).toBeDefined();
    expect(unknownSector?.label).toBe("???");
    expect(unknownSector?.classification).toBeUndefined();
    expect(unknownSector?.bodyCount).toBeUndefined();
  });

  it("streams loaded chunks and keeps galaxy/sector/system LOD bounded", () => {
    const model = createPersistentUniverseModel(mockRuntimeData);
    const visibility = resolveTechnologyVisibility(mockRuntimeData, runtimeInEra("galactic"));
    const galaxyStreaming = createStreamingSnapshot(model, "galaxy", { visibility });
    const sectorStreaming = createStreamingSnapshot(model, "sector", { sectorId: model.currentSectorId, visibility });
    const systemStreaming = createStreamingSnapshot(model, "system", { sectorId: model.currentSectorId, systemId: model.currentSystemId, visibility });

    expect(galaxyStreaming.loadedChunks.length).toBeLessThan(model.galaxyChunks.length);
    expect(galaxyStreaming.lod).toBe("density");
    expect(galaxyStreaming.visibleSystems).toBe(0);
    expect(sectorStreaming.lod).toBe("point");
    expect(sectorStreaming.visibleSystems).toBeGreaterThan(0);
    expect(systemStreaming.lod).toBe("mesh");
    expect(systemStreaming.visibleBodies).toBeGreaterThan(0);
  });

  it("only indexes known objects for search and previews routes without immediate travel", () => {
    const model = createPersistentUniverseModel(mockRuntimeData);
    const visibility = resolveTechnologyVisibility(mockRuntimeData, runtimeInEra("galactic"));
    const sectors = composeVisibleNodes(model, "galaxy", { visibility });
    const known = createKnownSearchIndex(sectors);
    const current = sectors.find((sector) => sector.id === model.currentSectorId);
    const target = sectors.find((sector) => sector.id !== model.currentSectorId && sector.canProbe);

    expect(known.every((result) => result.label !== "???")).toBe(true);
    expect(known.some((result) => result.id === model.currentSectorId)).toBe(true);
    expect(target).toBeDefined();
    expect(current).toBeDefined();
    const route = createRoutePreview(current!, target!);
    expect(route.toId).toBe(target!.id);
    expect(route.travelAllowed).toBe(false);
    expect(route.requiresProbeFirst).toBe(true);
  });

  it("enters sector and system levels in one mounted map without changing routes", async () => {
    const user = userEvent.setup();
    render(<GalaxySemanticMap data={mockRuntimeData} playerRuntime={runtimeInEra("galactic")} />);
    const map = screen.getByTestId("galaxy-semantic-map");
    expect(map).toHaveAttribute("data-semantic-level", "galaxy");
    expect(map).toHaveAttribute("data-virtual-sectors", "12000");

    const fallback = screen.getByTestId("galaxy-map-fallback");
    const sectorButton = await within(fallback).findByRole("button", { name: /orion sector/i });
    await user.dblClick(sectorButton);
    expect(screen.getByTestId("galaxy-semantic-map")).toBe(map);
    expect(map).toHaveAttribute("data-semantic-level", "sector");

    const systemButton = await within(fallback).findByRole("button", { name: /sol system/i });
    await user.dblClick(systemButton);
    expect(screen.getByTestId("galaxy-semantic-map")).toBe(map);
    expect(map).toHaveAttribute("data-semantic-level", "system");
    expect(map).toHaveAttribute("data-preloaded-context", "SEC-000:SYS-000-00");
  });
});
