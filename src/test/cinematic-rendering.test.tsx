import { render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GalaxySemanticMap } from "@/components/galaxy/GalaxySemanticMap";
import { getBundledStudioRuntimeSnapshot, mockRuntimeData, type GameRuntimeData } from "@/lib/canonical-runtime";
import {
  CINEMATIC_RENDERING_LAYERS,
  CINEMATIC_RENDERING_VERSION,
  cinematicHudClasses,
  cinematicMaterialSpecs,
  resolveCinematicQualityProfile
} from "@/lib/rendering";
import { createNewPlayerRuntimeState } from "@/lib/player-runtime";

let runtime: GameRuntimeData;

describe("cinematic rendering framework", () => {
  beforeAll(async () => {
    runtime = (await getBundledStudioRuntimeSnapshot()) ?? mockRuntimeData;
  });

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defines the five layered rendering architecture", () => {
    expect(CINEMATIC_RENDERING_LAYERS.map((layer) => layer.id)).toEqual(["skybox", "world", "atmosphere", "navigation", "hud"]);
    expect(CINEMATIC_RENDERING_LAYERS.map((layer) => layer.order)).toEqual([0, 1, 2, 3, 4]);
  });

  it("keeps HUD material opacity in the projected glass target range", () => {
    Object.values(cinematicMaterialSpecs).forEach((material) => {
      expect(material.opacity).toBeGreaterThanOrEqual(0.08);
      expect(material.opacity).toBeLessThanOrEqual(0.18);
      expect(material.cssClass).toContain("cinematic-hud");
    });
  });

  it("scales post-processing quality down for mobile and high density displays", () => {
    expect(resolveCinematicQualityProfile({ mobile: true }).particleLod).toBeLessThan(0.5);
    expect(resolveCinematicQualityProfile({ devicePixelRatio: 3 }).bloomStrength).toBeLessThan(0.25);
    expect(resolveCinematicQualityProfile({ devicePixelRatio: 1 }).filmGrain).toBeGreaterThan(0);
  });

  it("applies cinematic world, atmosphere, navigation, and HUD classes to the galaxy map", () => {
    render(<GalaxySemanticMap data={runtime} playerRuntime={createNewPlayerRuntimeState(runtime)} entry="solar-system" />);
    const map = screen.getByTestId("galaxy-semantic-map");
    const detailPanel = screen.getByTestId("galaxy-map-detail-panel");
    const devHud = screen.getByTestId("galaxy-map-dev-hud");

    expect(map).toHaveAttribute("data-rendering-framework", CINEMATIC_RENDERING_VERSION);
    expect(map).toHaveClass(cinematicHudClasses.worldRoot);
    expect(screen.getByTestId("exploration-gameplay-panel")).toHaveClass(cinematicHudClasses.compact);
    expect(detailPanel).toHaveClass(cinematicHudClasses.glass);
    expect(devHud).toHaveClass(cinematicHudClasses.compact);
    expect(map.querySelector('[data-render-layer="atmosphere"]')).toHaveClass(cinematicHudClasses.atmosphere);
    expect(map.querySelector('[data-render-layer="navigation"]')).toHaveClass(cinematicHudClasses.vectorGrid);
  });
});
