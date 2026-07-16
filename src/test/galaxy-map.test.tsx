import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GalaxySemanticMap } from "@/components/galaxy/GalaxySemanticMap";
import { getBundledStudioRuntimeSnapshot, mockRuntimeData, type GameRuntimeData } from "@/lib/canonical-runtime";
import {
  composeVisibleNodes,
  createKnownSearchIndex,
  createPersistentUniverseModel,
  createRoutePreview,
  createStreamingSnapshot,
  resolveGalaxyEngineContract,
  resolveSemanticZoomLevel,
  resolveStarSystemPresentation,
  resolveTechnologyVisibility
} from "@/lib/galaxy-map";
import { createNewPlayerRuntimeState } from "@/lib/player-runtime";

let runtime: GameRuntimeData;

function runtimeInEra(content: GameRuntimeData, eraId: string) {
  const state = createNewPlayerRuntimeState(content, { now: new Date("2026-01-01T00:00:00.000Z") });
  return {
    ...state,
    civilization: {
      ...state.civilization,
      currentEraId: eraId
    }
  };
}

describe("persistent 3D semantic galaxy map", () => {
  beforeAll(async () => {
    runtime = (await getBundledStudioRuntimeSnapshot()) ?? mockRuntimeData;
  });

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("consumes the Studio Galaxy Engine semantic zoom contract from contentVersion 21", () => {
    const contract = resolveGalaxyEngineContract(runtime);

    expect(runtime.metadata.contentVersion).toBeGreaterThanOrEqual(21);
    expect(contract.id).toBe("galaxy_engine_presentation_contract");
    expect(contract.semanticZoom.map((level) => level.id)).toEqual(["galaxy", "sector", "system"]);
    expect(contract.technologyGates.find((gate) => gate.id === "survival")?.unlockedZoom).toEqual(["system"]);
    expect(contract.technologyGates.find((gate) => gate.id === "interstellar")?.unlockedZoom).toEqual(["sector", "system"]);
    expect(contract.technologyGates.find((gate) => gate.id === "galactic")?.unlockedZoom).toEqual(["galaxy", "sector", "system"]);
    expect(contract.knowledgeVisibility.find((rule) => rule.id === "unknown")?.unknownDisplayName).toBe("???");
  });

  it("generates stable shared hierarchy IDs from the same seed for different players", () => {
    const first = createPersistentUniverseModel(runtime);
    const second = createPersistentUniverseModel(runtime);

    expect(first.audit.seed).toBe(second.audit.seed);
    expect(first.audit.usesStudioGalaxyContract).toBe(true);
    expect(first.sectors.map((sector) => sector.id)).toEqual(second.sectors.map((sector) => sector.id));
    expect(first.systemsBySectorId[first.currentSectorId].map((system) => system.id)).toEqual(second.systemsBySectorId[second.currentSectorId].map((system) => system.id));
    expect(first.bodiesBySystemId[first.currentSystemId].map((body) => body.id)).toEqual(second.bodiesBySystemId[second.currentSystemId].map((body) => body.id));
  });

  it("models one persistent universe at large procedural scale without materializing every system", () => {
    const model = createPersistentUniverseModel(runtime);

    expect(model.universe.id).toBe("UNI-NOVERIS-PRIME");
    expect(model.virtualCounts.sectors).toBeGreaterThanOrEqual(10_000);
    expect(model.virtualCounts.systems).toBeGreaterThanOrEqual(100_000);
    expect(model.galaxyChunks.length).toBeGreaterThan(1);
    expect(model.sectors.length).toBeLessThan(model.virtualCounts.sectors);
    expect(model.systemsBySectorId[model.currentSectorId].length).toBeLessThan(model.virtualCounts.systems);
  });

  it("keeps deterministic orbital-like body placement stable across reloads", () => {
    const first = createPersistentUniverseModel(runtime);
    const second = createPersistentUniverseModel(runtime);
    const firstLayout = resolveStarSystemPresentation(first, first.currentSystemId, resolveTechnologyVisibility(runtime, runtimeInEra(runtime, "space-age")));
    const secondLayout = resolveStarSystemPresentation(second, second.currentSystemId, resolveTechnologyVisibility(runtime, runtimeInEra(runtime, "space-age")));

    expect(firstLayout.bodies.map((body) => [body.id, body.orbitalRadius, body.orbitalAngle, body.inclination])).toEqual(
      secondLayout.bodies.map((body) => [body.id, body.orbitalRadius, body.orbitalAngle, body.inclination])
    );
  });

  it("gates semantic depth by Studio technology contracts instead of raw wheel distance", () => {
    const survivalVisibility = resolveTechnologyVisibility(runtime, runtimeInEra(runtime, "survival"));
    const interstellarVisibility = resolveTechnologyVisibility(runtime, runtimeInEra(runtime, "interstellar"));
    const galacticVisibility = resolveTechnologyVisibility(runtime, runtimeInEra(runtime, "galactic"));

    expect(survivalVisibility.gateId).toBe("survival");
    expect(survivalVisibility.maxLevel).toBe("system");
    expect(survivalVisibility.canAccessGalaxy).toBe(false);
    expect(survivalVisibility.canAccessSector).toBe(false);
    expect(interstellarVisibility.gateId).toBe("interstellar");
    expect(interstellarVisibility.maxLevel).toBe("sector");
    expect(galacticVisibility.gateId).toBe("galactic");
    expect(galacticVisibility.maxLevel).toBe("galaxy");
    expect(resolveSemanticZoomLevel({ requestedLevel: "galaxy", cameraDistance: 999, technologyVisibility: survivalVisibility, loadedContext: {} })).toMatchObject({ level: "system", blocked: true });
    expect(resolveSemanticZoomLevel({ requestedLevel: "galaxy", cameraDistance: 999, technologyVisibility: interstellarVisibility, loadedContext: {} })).toMatchObject({ level: "sector", blocked: true });
    expect(resolveSemanticZoomLevel({ requestedLevel: "galaxy", cameraDistance: 999, technologyVisibility: galacticVisibility, loadedContext: {} })).toMatchObject({ level: "galaxy", blocked: false });
  });

  it("filters unknown system information before building visible view models", () => {
    const model = createPersistentUniverseModel(runtime);
    const visibility = resolveTechnologyVisibility(runtime, runtimeInEra(runtime, "galactic"));
    const systems = composeVisibleNodes(model, "sector", { sectorId: model.currentSectorId, visibility });
    const unknownSystem = systems.find((system) => system.id !== model.currentSystemId && system.canProbe);

    expect(unknownSystem).toBeDefined();
    expect(unknownSystem?.label).toBe("???");
    expect(unknownSystem?.classification).toBeUndefined();
    expect(unknownSystem?.bodyCount).toBeUndefined();
    expect(unknownSystem?.canShowRegistry).toBe(false);
    expect(unknownSystem?.canShowResources).toBe(false);
  });

  it("reveals only probe-allowed metadata after a probe without leaking resources", () => {
    const model = createPersistentUniverseModel(runtime);
    const visibility = resolveTechnologyVisibility(runtime, runtimeInEra(runtime, "galactic"));
    const systems = composeVisibleNodes(model, "sector", { sectorId: model.currentSectorId, visibility });
    const target = systems.find((system) => system.id !== model.currentSystemId && system.canProbe);

    expect(target).toBeDefined();
    const probed = composeVisibleNodes(model, "sector", { sectorId: model.currentSectorId, visibility, probedIds: [target!.id] }).find((system) => system.id === target!.id);
    expect(probed?.knowledgeState).toBe("probed");
    expect(probed?.label).not.toBe("???");
    expect(probed?.canShowRegistry).toBe(true);
    expect(probed?.canShowResources).toBe(false);
    expect(probed?.bodyCount).toBeGreaterThan(0);
  });

  it("streams loaded chunks and keeps galaxy/sector/system LOD bounded", () => {
    const model = createPersistentUniverseModel(runtime);
    const visibility = resolveTechnologyVisibility(runtime, runtimeInEra(runtime, "galactic"));
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
    const model = createPersistentUniverseModel(runtime);
    const visibility = resolveTechnologyVisibility(runtime, runtimeInEra(runtime, "galactic"));
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
    render(<GalaxySemanticMap data={runtime} playerRuntime={runtimeInEra(runtime, "galactic")} />);
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

  it("tracks hover, selection, focus, probe, and travel intent without remounting", async () => {
    const user = userEvent.setup();
    render(<GalaxySemanticMap data={runtime} playerRuntime={runtimeInEra(runtime, "galactic")} />);
    const map = screen.getByTestId("galaxy-semantic-map");
    const fallback = screen.getByTestId("galaxy-map-fallback");
    const sectorButton = await within(fallback).findByRole("button", { name: /orion sector/i });

    await user.hover(sectorButton);
    expect(map).toHaveAttribute("data-hovered-object-id", "SEC-000");
    await user.click(sectorButton);
    expect(map).toHaveAttribute("data-selected-object-id", "SEC-000");

    await user.click(within(screen.getByTestId("galaxy-map-detail-panel")).getByRole("button", { name: /^focus$/i }));
    expect(map).toHaveAttribute("data-focused-object-id", "SEC-000");

    expect(within(screen.getByTestId("galaxy-map-detail-panel")).getByRole("button", { name: /^travel$/i })).toBeDisabled();
  });
});
