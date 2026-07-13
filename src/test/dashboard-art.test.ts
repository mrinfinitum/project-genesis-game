import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DASHBOARD_ART_REGISTRY,
  getDashboardArtAudit,
  resolveDashboardArt,
  type AssetDefinition
} from "@/lib/canonical-runtime";
import { ROBLOX_DASHBOARD_LAYOUT } from "@/lib/dashboard/dashboard-layout";

function asset(overrides: Partial<AssetDefinition>): AssetDefinition {
  return {
    id: "asset-test",
    name: "Test Asset",
    type: "Image",
    category: "Dashboard",
    artKey: "dashboard_city_hero",
    ...overrides
  };
}

describe("dashboard art registry", () => {
  it("keeps local Roblox fallback paths centralized outside dashboard JSX", () => {
    const source = readFileSync("src/components/game-ui/genesis-ui.tsx", "utf8");

    expect(source).not.toContain("/roblox-assets/");
    expect(DASHBOARD_ART_REGISTRY.dashboard_city_hero.localPath).toBe("/roblox-assets/UI/cityimage-1.png");
  });

  it("prefers canonical web mappings over local fallbacks", () => {
    const resolved = resolveDashboardArt(
      [
        asset({
          id: "asset-dashboard-city-hero",
          artKey: "city_preview",
          platformMappings: { web: { path: "/studio/dashboard/city-hero.webp" } }
        })
      ],
      "dashboard_city_hero"
    );

    expect(resolved.kind).toBe("web-path");
    expect(resolved.path).toBe("/studio/dashboard/city-hero.webp");
    expect(resolved.canonicalAssetId).toBe("asset-dashboard-city-hero");
    expect(resolved.mappingStatus).toBe("canonical-web");
  });

  it("uses local fallbacks for exported Roblox art placeholder paths", () => {
    const resolved = resolveDashboardArt(
      [
        asset({
          id: "asset-dashboard-city-hero",
          artKey: "city_preview",
          platformMappings: { web: { path: "/assets/roblox-art/asset_city_preview/asset_city_preview.png" } }
        })
      ],
      "dashboard_city_hero"
    );

    expect(resolved.kind).toBe("local-registry");
    expect(resolved.path).toBe("/roblox-assets/UI/cityimage-1.png");
    expect(resolved.platformWebPath).toBe("/assets/roblox-art/asset_city_preview/asset_city_preview.png");
    expect(resolved.canonicalAssetId).toBe("asset-dashboard-city-hero");
    expect(resolved.mappingStatus).toBe("local-fallback");
  });

  it("uses local fallbacks when canonical web paths are absent", () => {
    const resolved = resolveDashboardArt([], "dashboard_city_hero");

    expect(resolved.kind).toBe("local-registry");
    expect(resolved.path).toBe("/roblox-assets/UI/cityimage-1.png");
    expect(resolved.mappingStatus).toBe("local-fallback");
  });

  it("reports missing and replacement-required dashboard art", () => {
    const clickInterface = resolveDashboardArt([], "dashboard_click_interface");
    const planetPrime = resolveDashboardArt([], "civilization_crest");

    expect(clickInterface.kind).toBe("placeholder");
    expect(clickInterface.mappingStatus).toBe("missing");
    expect(clickInterface.warnings).toContain("Source Missing");
    expect(planetPrime.warnings).toContain("Replacement Required");
  });

  it("audits every registered visible dashboard image", () => {
    const audit = getDashboardArtAudit([]);

    expect(audit.length).toBe(Object.keys(DASHBOARD_ART_REGISTRY).length);
    expect(audit.some((item) => item.viteUsage === "Hero city preview")).toBe(true);
    expect(audit.every((item) => item.key && item.viteUsage && item.mappingStatus)).toBe(true);
  });

  it("preserves the Rojo source dashboard coordinates", () => {
    expect(ROBLOX_DASHBOARD_LAYOUT).toMatchObject({
      topHud: { x: 0, y: 8, width: 1920, height: 104 },
      sidebar: { x: 12, y: 126, width: 160, height: 944 },
      leftColumn: { x: 184, y: 126, width: 350, height: 823 },
      hero: { x: 550, y: 126, width: 910, height: 517 },
      upgrades: { x: 550, y: 650, width: 910, height: 420 },
      rightColumn: { x: 1485, y: 126, width: 430, height: 939 },
      boostToggle: { x: 854, y: 1011, width: 230, height: 58 }
    });
  });
});
