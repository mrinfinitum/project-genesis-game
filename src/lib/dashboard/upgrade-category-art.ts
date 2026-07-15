import type { DashboardArtKey, DashboardArtResolution, GameRuntimeData, UpgradeDefinition } from "@/lib/canonical-runtime";
import { resolveSelectedUpgradeCategory, resolveUpgradesForCategory } from "@/lib/dashboard/upgrade-categories";
import { UPGRADE_TAB_ASSET, UPGRADE_TAB_PANEL_RECT } from "@/lib/dashboard/upgrade-tabs-layout";

export type UpgradeCategoryArtId = "workforce" | "industry" | "science" | "technology";

export const UPGRADE_CATEGORY_ART_KEYS = {
  workforce: {
    background: "dashboard_upgrades_workforce_background",
    selectedTab: "dashboard_upgrades_workforce_tab_selected",
    emptyState: "dashboard_upgrades_workforce_empty"
  },
  industry: {
    background: "dashboard_upgrades_industry_background",
    selectedTab: "dashboard_upgrades_industry_tab_selected",
    emptyState: "dashboard_upgrades_industry_empty"
  },
  science: {
    background: "dashboard_upgrades_science_background",
    selectedTab: "dashboard_upgrades_science_tab_selected",
    emptyState: "dashboard_upgrades_science_empty"
  },
  technology: {
    background: "dashboard_upgrades_technology_background",
    selectedTab: "dashboard_upgrades_technology_tab_selected",
    emptyState: "dashboard_upgrades_technology_empty"
  }
} as const satisfies Record<UpgradeCategoryArtId, { background: DashboardArtKey; selectedTab: DashboardArtKey; emptyState: DashboardArtKey }>;

export const UPGRADE_CATEGORY_BACKGROUND_SPEC = {
  canonicalWidth: UPGRADE_TAB_ASSET.nativeWidth,
  canonicalHeight: UPGRADE_TAB_ASSET.nativeHeight,
  sourceFilename: UPGRADE_TAB_ASSET.path.split("/").at(-1) ?? "folder-tabs-base-920.png",
  sharedFallbackPath: UPGRADE_TAB_ASSET.path,
  renderedBounds: UPGRADE_TAB_PANEL_RECT,
  cropMode: "object-fill",
  scalingMode: "stretch-to-fixed-roblox-panel-bounds",
  alphaBehavior: "complete panel image with baked tabs, frame, interior, and row surface",
  tabOrigin: { x: 0, y: 0 },
  rowOrigin: { x: 0, y: Math.round(UPGRADE_TAB_ASSET.nativeHeight * 0.215) },
  contentSafeArea: { x: 0, y: Math.round(UPGRADE_TAB_ASSET.nativeHeight * 0.215), width: UPGRADE_TAB_ASSET.nativeWidth, height: Math.round(UPGRADE_TAB_ASSET.nativeHeight * 0.75) }
} as const;

export type UpgradeCategoryAssetStatus = {
  background: "ready" | "fallback";
  backgroundArtKey: DashboardArtKey;
  resolvedBackgroundArtKey: DashboardArtKey;
  selectedTabArtKey: DashboardArtKey;
  emptyStateArtKey: DashboardArtKey;
  requiredNativeWidth: number;
  requiredNativeHeight: number;
  resolvedUrl?: string;
  fallbackUrl?: string;
  warning?: string;
};

export type UpgradeCategoryView = {
  categoryId: string;
  displayName: string;
  heading: string;
  upgrades: UpgradeDefinition[];
  backgroundArtKey: DashboardArtKey;
  selectedTabArtKey: DashboardArtKey;
  emptyStateArtKey: DashboardArtKey;
  backgroundArt: DashboardArtResolution;
  targetBackgroundArt: DashboardArtResolution;
  assetStatus: UpgradeCategoryAssetStatus;
};

type DashboardArtMap = Record<DashboardArtKey, DashboardArtResolution>;

function categoryArtId(categoryId: string): UpgradeCategoryArtId | undefined {
  if (categoryId === "workforce" || categoryId === "industry" || categoryId === "science" || categoryId === "technology") return categoryId;
  return undefined;
}

function headingFor(displayName: string) {
  return `${displayName} Age`;
}

export function resolveUpgradeCategoryView(selectedUpgradeCategoryId: string | undefined, runtime: GameRuntimeData, art: DashboardArtMap): UpgradeCategoryView {
  const category = resolveSelectedUpgradeCategory(runtime, selectedUpgradeCategoryId) ?? runtime.upgradeCategories[0];
  const categoryId = category?.id ?? "workforce";
  const artId = categoryArtId(categoryId) ?? "workforce";
  const keys = UPGRADE_CATEGORY_ART_KEYS[artId];
  const targetBackgroundArt = art[keys.background];
  const sharedFallbackArt = art.dashboard_upgrade_background;
  const targetReady = Boolean(targetBackgroundArt?.path) && targetBackgroundArt.mappingStatus !== "missing";
  const backgroundArt = targetReady ? targetBackgroundArt : sharedFallbackArt;
  const categoryLabel = category?.displayName ?? artId;
  const warning = targetReady ? undefined : `${categoryLabel} category background is using fallback (${keys.background})`;

  return {
    categoryId,
    displayName: categoryLabel,
    heading: headingFor(categoryLabel),
    upgrades: resolveUpgradesForCategory(runtime, categoryId),
    backgroundArtKey: keys.background,
    selectedTabArtKey: keys.selectedTab,
    emptyStateArtKey: keys.emptyState,
    backgroundArt,
    targetBackgroundArt,
    assetStatus: {
      background: targetReady ? "ready" : "fallback",
      backgroundArtKey: keys.background,
      resolvedBackgroundArtKey: targetReady ? keys.background : "dashboard_upgrade_background",
      selectedTabArtKey: keys.selectedTab,
      emptyStateArtKey: keys.emptyState,
      requiredNativeWidth: UPGRADE_CATEGORY_BACKGROUND_SPEC.canonicalWidth,
      requiredNativeHeight: UPGRADE_CATEGORY_BACKGROUND_SPEC.canonicalHeight,
      resolvedUrl: backgroundArt.path,
      fallbackUrl: targetReady ? undefined : sharedFallbackArt.path,
      warning
    }
  };
}
