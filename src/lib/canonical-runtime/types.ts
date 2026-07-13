export type RuntimeContentMode = "mock" | "snapshot" | "live";
export type RuntimeContentSource = "mock" | "bundled-snapshot" | "cache" | "live";
export type RuntimeContentStatus = "loading" | "ready" | "refreshing" | "fallback" | "error";

export interface RuntimeMetadata {
  schemaVersion: "game-runtime-v1";
  contentVersion: number;
  releaseName?: string;
  checksum: string;
  accessLevel: "public-published";
  importedAt?: string;
  importedFrom?: string;
  sourceProject?: string;
  sourceFormat?: string;
  environment?: string;
  validationStatus: "Ready" | "ready" | "READY";
}

export interface UnlockRequirement {
  start?: boolean;
  previousEraId?: string;
  eraId?: string;
  civilizationLevel?: number;
  resourceId?: string;
  resourceAmount?: number;
  upgradeId?: string;
  upgradeLevel?: number;
  [key: string]: unknown;
}

export interface VisibilityRules {
  defaultState?: string;
  revealRequirements?: UnlockRequirement;
  availableRequirements?: UnlockRequirement;
  hideUntilEraId?: string | null;
  showTeaser?: boolean;
  teaserOrder?: number;
}

export interface EraDefinition {
  id: string;
  index: number;
  name: string;
  displayName: string;
  description: string;
  unlockRequirements?: UnlockRequirement;
  iconKey?: string;
  artKey?: string;
  themeKey?: string;
  masteryRequirements?: Record<string, unknown>;
  tags?: string[];
}

export interface ResourceDefinition {
  id: string;
  name: string;
  displayName: string;
  resourceClass: string;
  category: string;
  rarity: string;
  iconKey: string;
  artKey: string;
  color?: string;
  description: string;
  discoveredEraId: string;
  usableEraId: string;
  tradable: boolean;
  tags?: string[];
}

export interface UpgradeCategory {
  id: string;
  name?: string;
  displayName: string;
  description?: string;
  iconKey?: string;
  themeKey?: string;
  unlockedAtGameStart?: boolean;
  unlockRequirements?: UnlockRequirement;
  order: number;
  tags?: string[];
}

export interface UpgradeDefinition {
  id: string;
  categoryId: string;
  eraId: string;
  chainId?: string;
  order: number;
  name: string;
  displayName: string;
  description: string;
  iconKey?: string;
  defaultLevel: number;
  maxLevel: number;
  baseCost: number;
  costResourceId: string | null;
  costGrowthRate: number;
  effectType: string;
  baseEffectValue: number;
  effectGrowthRate: number;
  unlockRequirements?: UnlockRequirement;
  nextUpgradeIds: string[];
  visibilityRules?: VisibilityRules;
  tags?: string[];
}

export interface PlatformAssetMappings {
  web?: {
    path?: string;
    [key: string]: unknown;
  };
  roblox?: unknown;
  unity?: unknown;
  unreal?: unknown;
  godot?: unknown;
  [platform: string]: unknown;
}

export interface AssetDefinition {
  id: string;
  name: string;
  type: string;
  category: string;
  artKey: string;
  width?: number | null;
  height?: number | null;
  aspectRatio?: number | null;
  status?: string;
  notes?: string;
  platformMappings?: PlatformAssetMappings;
}

export interface BalanceDefinition {
  version?: string;
  startingCivilizationEnergy: number;
  startingCoins: number;
  startingResearch: number;
  startingPopulation: number;
  baseClickPower: number;
  baseAutoClickPower: number;
  autosaveSeconds: number;
  notes?: string;
  environmentOverrides?: Record<string, unknown>;
  difficultyProfileOverrides?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PrimaryHudResourceDefinition {
  id: string;
  label?: string;
  displayName?: string;
  name?: string;
  iconKey?: string;
  artKey?: string;
  color?: string;
  balanceKey?: keyof BalanceDefinition | string;
  startingValue?: number;
  startingAmount?: number;
  defaultValue?: number;
  startingRate?: number;
  rate?: number;
  missingDefinition?: boolean;
}

export interface ClientProfile {
  primaryHudResources?: Array<string | PrimaryHudResourceDefinition>;
  eraNavigation?: {
    dashboardMode?: string;
    visibleEraCount?: number;
    fullTimelineEnabled?: boolean;
    allowPrimaryHorizontalScroll?: boolean;
  };
  defaultUpgradeRowsVisible?: number;
  futureUpgradeTeaserCount?: number;
  showUnknownUpgradeSlots?: boolean;
  lockedOpacity?: number;
  availableGlowEnabled?: boolean;
  [key: string]: unknown;
}

export interface ClientProfiles {
  default: ClientProfile;
  web?: ClientProfile;
  roblox?: ClientProfile;
  unity?: ClientProfile;
  unreal?: ClientProfile;
  godot?: ClientProfile;
  [profile: string]: ClientProfile | undefined;
}

export interface GameRuntimeData {
  metadata: RuntimeMetadata;
  eras: EraDefinition[];
  resources: ResourceDefinition[];
  upgradeCategories: UpgradeCategory[];
  upgrades: UpgradeDefinition[];
  assets: AssetDefinition[];
  balance: BalanceDefinition;
  clientProfiles: ClientProfiles;
  economy?: {
    definitions?: PrimaryHudResourceDefinition[];
    resources?: PrimaryHudResourceDefinition[];
    primaryHudResources?: Array<string | PrimaryHudResourceDefinition>;
    [key: string]: unknown;
  };
  economyDefinitions?: PrimaryHudResourceDefinition[];
}

export interface RuntimeValidationResult {
  ok: boolean;
  payload?: GameRuntimeData;
  errors: string[];
  warnings: string[];
}

export interface RuntimeCacheRecord {
  schemaVersion: string;
  contentVersion: number;
  checksum: string;
  downloadedAt: string;
  payload: GameRuntimeData;
}

export interface RuntimeContentConfig {
  configuredMode: RuntimeContentMode;
  studioUrl: string;
  runtimePath: string;
  developerPanelEnabled: boolean;
}

export interface RuntimeContentState {
  configuredMode: RuntimeContentMode;
  activeSource: RuntimeContentSource;
  status: RuntimeContentStatus;
  schemaVersion: string;
  contentVersion: number;
  releaseName?: string;
  checksum: string;
  accessLevel: string;
  validationStatus: string;
  eras: EraDefinition[];
  resources: ResourceDefinition[];
  upgradeCategories: UpgradeCategory[];
  upgrades: UpgradeDefinition[];
  assets: AssetDefinition[];
  balance: BalanceDefinition;
  clientProfiles: ClientProfiles;
  economy?: GameRuntimeData["economy"];
  economyDefinitions?: PrimaryHudResourceDefinition[];
  validationErrors: string[];
  validationWarnings: string[];
  lastCheckedAt?: string;
  lastDownloadedAt?: string;
  isUsingFallback: boolean;
  fallbackReason?: string;
  studioEndpoint: string;
  cacheStatus: "unknown" | "empty" | "valid" | "invalid" | "cleared";
}

export interface RuntimeContentSelectors {
  getEraById(id: string): EraDefinition | undefined;
  getResourceById(id: string): ResourceDefinition | undefined;
  getUpgradeCategoryById(id: string): UpgradeCategory | undefined;
  getUpgradeById(id: string): UpgradeDefinition | undefined;
  getUpgradesByCategory(categoryId: string): UpgradeDefinition[];
  getUpgradesByEra(eraId: string): UpgradeDefinition[];
  getUpgradeChain(upgradeId: string): UpgradeDefinition[];
  getAssetByKey(key: string): AssetDefinition | undefined;
  getBalanceValue<T = unknown>(key: string): T | undefined;
  getClientProfile(profile?: string): ClientProfile;
}

export interface PlayerProgressReferences {
  inventory: Record<string, number>;
  upgradeLevels: Record<string, number>;
  currentEraId?: string;
}

export interface ResolvedPlayerProgress {
  inventory: Record<string, number>;
  upgradeLevels: Record<string, number>;
  currentEraId?: string;
  unresolved: {
    resources: Record<string, number>;
    upgrades: Record<string, number>;
    eraId?: string;
  };
}
