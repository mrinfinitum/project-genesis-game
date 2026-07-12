import { createContext, useContext, useMemo, type ReactNode } from "react";
import bundledSnapshot from "@/content/generated/studio-runtime.snapshot.json";
import { mockRuntimeData, validateGameRuntimeData, type AssetDefinition, type EraDefinition, type GameRuntimeData, type ResourceDefinition, type UpgradeCategory, type UpgradeDefinition } from "@/lib/canonical-runtime";

type StorybookGlobals = {
  contentSource?: "full" | "mock";
  eraId?: string;
  upgradeCategoryId?: string;
  artStatus?: "all" | "final" | "draft" | "placeholder" | "missing";
  targetViewport?: string;
  reducedMotion?: boolean;
};

export type GenesisStoryContent = {
  data: GameRuntimeData;
  source: "Full Snapshot" | "Mock";
  validationStatus: "valid" | "invalid";
  validationErrors: string[];
  selectedEra: EraDefinition;
  selectedCategory: UpgradeCategory;
  selectedResources: ResourceDefinition[];
  selectedUpgrades: UpgradeDefinition[];
  selectedAssets: AssetDefinition[];
  globals: StorybookGlobals;
};

const fullSnapshotValidation = validateGameRuntimeData(bundledSnapshot);
const fullSnapshot = fullSnapshotValidation.payload ?? mockRuntimeData;

const GenesisStoryContentContext = createContext<GenesisStoryContent | null>(null);

function artStatusMatches(asset: AssetDefinition, artStatus: StorybookGlobals["artStatus"]) {
  const status = (asset.status ?? "").toLowerCase();
  const hasWebMapping = Boolean(asset.platformMappings?.web?.path);

  if (!artStatus || artStatus === "all") return true;
  if (artStatus === "missing") return !hasWebMapping;
  if (artStatus === "final") return status.includes("final") || status.includes("uploaded") || status.includes("generated");
  if (artStatus === "draft") return status.includes("draft") || status.includes("source");
  if (artStatus === "placeholder") return status.includes("placeholder");
  return true;
}

function normalizeContent(globals: StorybookGlobals) {
  const useMock = globals.contentSource === "mock";
  const data = useMock ? mockRuntimeData : fullSnapshot;
  const selectedEra = data.eras.find((era) => era.id === globals.eraId) ?? data.eras[0];
  const selectedCategory = data.upgradeCategories.find((category) => category.id === globals.upgradeCategoryId) ?? data.upgradeCategories[0];
  const selectedResources = data.resources.filter((resource) => resource.discoveredEraId === selectedEra.id || resource.usableEraId === selectedEra.id);
  const selectedUpgrades = data.upgrades.filter((upgrade) => upgrade.eraId === selectedEra.id && upgrade.categoryId === selectedCategory.id);
  const selectedAssets = data.assets.filter((asset) => artStatusMatches(asset, globals.artStatus));

  return {
    data,
    source: useMock ? "Mock" as const : "Full Snapshot" as const,
    validationStatus: useMock || fullSnapshotValidation.ok ? "valid" as const : "invalid" as const,
    validationErrors: useMock ? [] : fullSnapshotValidation.errors,
    selectedEra,
    selectedCategory,
    selectedResources: selectedResources.length ? selectedResources : data.resources.slice(0, 12),
    selectedUpgrades: selectedUpgrades.length ? selectedUpgrades : data.upgrades.slice(0, 8),
    selectedAssets,
    globals
  };
}

export function GenesisStoryContentProvider({ globals, children }: { globals: StorybookGlobals; children: ReactNode }) {
  const value = useMemo(() => normalizeContent(globals), [globals]);

  return (
    <GenesisStoryContentContext.Provider value={value}>
      <div data-content-source={value.source} data-reduced-motion={globals.reducedMotion ? "true" : "false"} data-target-viewport={globals.targetViewport ?? "1920"}>
        {globals.reducedMotion ? (
          <style>{`
            *, *::before, *::after {
              animation-duration: 0.001ms !important;
              animation-iteration-count: 1 !important;
              scroll-behavior: auto !important;
              transition-duration: 0.001ms !important;
            }
          `}</style>
        ) : null}
        {children}
      </div>
    </GenesisStoryContentContext.Provider>
  );
}

export function useGenesisStoryContent() {
  const value = useContext(GenesisStoryContentContext);
  if (!value) {
    throw new Error("useGenesisStoryContent must be used inside GenesisStoryContentProvider.");
  }
  return value;
}

export function resourceByClass(data: GameRuntimeData, resourceClass: string, fallbackIndex = 0) {
  return data.resources.find((resource) => resource.resourceClass.toLowerCase() === resourceClass.toLowerCase()) ?? data.resources[fallbackIndex];
}

export function resourceByCategory(data: GameRuntimeData, category: string, fallbackIndex = 0) {
  return data.resources.find((resource) => resource.category.toLowerCase() === category.toLowerCase()) ?? data.resources[fallbackIndex];
}

export function upgradeFixture(data: GameRuntimeData, index = 0) {
  return data.upgrades[index % data.upgrades.length];
}

export function missingArtResource(data: GameRuntimeData) {
  const base = data.resources[0];
  return {
    ...base,
    id: `${base.id}-missing-art`,
    artKey: "missing-art-review-key",
    iconKey: "missing-icon-review-key",
    displayName: `${base.displayName} Placeholder`
  };
}
