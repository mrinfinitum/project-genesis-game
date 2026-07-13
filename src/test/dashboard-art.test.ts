import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DASHBOARD_ART_REGISTRY,
  getDashboardArtAudit,
  resolveDashboardArt,
  type EraDefinition,
  type AssetDefinition
} from "@/lib/canonical-runtime";
import { getFocusedDashboardEras } from "@/lib/dashboard/era-navigation";
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

function era(id: string, index: number, displayName: string): EraDefinition {
  return {
    id,
    index,
    name: id,
    displayName,
    description: `${displayName} era`
  };
}

const canonicalEras = [
  era("survival", 1, "Survival"),
  era("ancient", 2, "Ancient"),
  era("medieval", 3, "Medieval"),
  era("renaissance", 4, "Renaissance"),
  era("industrial", 5, "Industrial"),
  era("modern", 6, "Modern"),
  era("space-age", 7, "Space Age"),
  era("interstellar", 8, "Interstellar"),
  era("galactic", 9, "Galactic")
];

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
      topHud: { x: 0, y: 12, width: 1920, height: 108 },
      sidebar: { x: 12, y: 126, width: 160, height: 944 },
      leftColumn: { x: 184, y: 126, width: 350, height: 823 },
      hero: { x: 572, y: 139, width: 910, height: 510 },
      upgrades: { x: 572, y: 658, width: 910, height: 407 },
      rightColumn: { x: 1514, y: 139, width: 425, height: 927 },
      boostToggle: { x: 866, y: 1010, width: 230, height: 58 }
    });
  });

  it("shows only previous, current, and next eras on the dashboard rail", () => {
    const focused = getFocusedDashboardEras(canonicalEras, "medieval", 3);

    expect(focused.map((item) => item.era.id)).toEqual(["ancient", "medieval", "renaissance"]);
    expect(focused.map((item) => item.state)).toEqual(["completed", "current", "locked"]);
    expect(focused).toHaveLength(3);
  });

  it("does not repeat Survival at the first-era boundary", () => {
    const focused = getFocusedDashboardEras(canonicalEras, "survival", 3);

    expect(focused.map((item) => item.era.id)).toEqual(["survival", "ancient"]);
    expect(focused.map((item) => item.state)).toEqual(["current", "locked"]);
  });

  it("does not invent a next era at the Galactic boundary", () => {
    const focused = getFocusedDashboardEras(canonicalEras, "galactic", 3);

    expect(focused.map((item) => item.era.id)).toEqual(["interstellar", "galactic"]);
    expect(focused.map((item) => item.state)).toEqual(["completed", "current"]);
  });

  it("derives the focused era window from canonical order instead of fixed indexes", () => {
    const reorderedWithInsertedEra = [
      canonicalEras[0],
      canonicalEras[1],
      era("classical", 10, "Classical"),
      canonicalEras[2],
      canonicalEras[3]
    ];

    const focused = getFocusedDashboardEras(reorderedWithInsertedEra, "medieval", 3);

    expect(focused.map((item) => item.era.id)).toEqual(["classical", "medieval", "renaissance"]);
  });
});
