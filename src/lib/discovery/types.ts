import type { GameRuntimeData } from "@/lib/canonical-runtime";

export type DiscoveryPublishState = "published" | "ready" | "draft" | "deprecated" | string;
export type DiscoveryPersonalState = "unknown" | "detected" | "partially_scanned" | "identified" | "analyzed" | "collected" | "decoded" | "researched";
export type ExplorationDiscoveryState = "unknown" | "detected" | "probed" | "scanned" | "surveyed" | "explored" | "catalogued" | "colonized";
export type DiscoveryRegistryState = "unknown" | "available" | "pending_verification" | "first_discovered_by_player" | "globally_discovered";
export type DiscoveryCollectionType = "observation" | "biological_sample" | "mineral_extraction" | "artifact_recovery" | "data_decoding" | "protected" | "special_containment" | "site_excavation" | string;

export type DiscoveryNumberRange = {
  min?: number | null;
  max?: number | null;
  [key: string]: unknown;
};

export type DiscoveryEligibilityRules = {
  planetClassIds?: string[];
  planetSubclassIds?: string[];
  biomeIds?: string[];
  atmosphereIds?: string[];
  terrainIds?: string[];
  locationTypes?: string[];
  requiredResearchIds?: string[];
  requiredEquipmentIds?: string[];
  requiredEraIds?: string[];
  temperature?: DiscoveryNumberRange;
  gravity?: DiscoveryNumberRange;
  humidity?: DiscoveryNumberRange;
  waterCoverage?: DiscoveryNumberRange;
  radiation?: DiscoveryNumberRange;
  volcanism?: DiscoveryNumberRange;
  biosphereMaturity?: DiscoveryNumberRange;
  biologicalDiversity?: DiscoveryNumberRange;
  civilizationPresence?: DiscoveryNumberRange;
  ruinPresence?: DiscoveryNumberRange;
  anomalyInfluence?: DiscoveryNumberRange;
  [key: string]: unknown;
};

export type DiscoveryCategory = {
  id: string;
  name?: string;
  displayName?: string;
  description?: string;
  order?: number;
  iconKey?: string;
  [key: string]: unknown;
};

export type DiscoverySubcategory = DiscoveryCategory & {
  categoryId?: string;
};

export type DiscoveryRarity = {
  id: string;
  name?: string;
  displayName?: string;
  order?: number;
  baseSpawnWeight?: number;
  relativeWeight?: number;
  color?: string;
  maxPerLocation?: number;
  universeLimitPolicy?: Record<string, unknown>;
  environmentalModifiers?: Record<string, unknown>;
  [key: string]: unknown;
};

export type DiscoverySpawnProfile = {
  id: string;
  discoveryId?: string;
  spawnTableId?: string;
  spawnWeight?: number;
  maxPerLocation?: number;
  maxPerPlanet?: number;
  maxPerSystem?: number;
  maxPerUniverse?: number;
  clusterBehavior?: string;
  locationTypes?: string[];
  eligibility?: DiscoveryEligibilityRules;
  [key: string]: unknown;
};

export type DiscoverySpawnTableEntry = {
  discoveryId: string;
  weight?: number;
  rarityId?: string;
  spawnProfileId?: string;
  [key: string]: unknown;
};

export type DiscoverySpawnTable = {
  id: string;
  displayName?: string;
  entries?: DiscoverySpawnTableEntry[];
  seedPolicy?: Record<string, unknown>;
  [key: string]: unknown;
};

export type DiscoveryScanProfile = {
  id: string;
  scanType?: string;
  durationSeconds?: number;
  requiredEquipmentIds?: string[];
  requiredResearchIds?: string[];
  discoveryPoints?: number;
  encyclopediaVisibilityTier?: string;
  partialProgressBehavior?: string;
  [key: string]: unknown;
};

export type DiscoveryCollectionProfile = {
  id: string;
  collectionType?: DiscoveryCollectionType;
  requiredEquipmentIds?: string[];
  requiredResearchIds?: string[];
  protectedStatus?: string;
  duplicateBehavior?: string;
  quantity?: number;
  capacityCost?: number;
  preservationRequirements?: string[];
  [key: string]: unknown;
};

export type DiscoveryReward = {
  economyId?: string;
  resourceId?: string;
  amount?: number;
  rewardType?: string;
  serverAuthoritative?: boolean;
  transactionReason?: string;
  [key: string]: unknown;
};

export type DiscoveryRewardProfile = {
  id: string;
  rewards?: DiscoveryReward[];
  protectedPremiumReward?: boolean;
  serverAuthoritative?: boolean;
  transactionReason?: string;
  [key: string]: unknown;
};

export type DiscoveryStateDefinition = {
  id: DiscoveryPersonalState | string;
  displayName?: string;
  allowedTransitionIds?: string[];
  order?: number;
  [key: string]: unknown;
};

export type DiscoveryRecord = {
  id: string;
  name?: string;
  displayName?: string;
  shortDisplayName?: string;
  description?: string;
  categoryId?: string;
  subcategoryId?: string;
  rarityId?: string;
  rarity?: string;
  publishState?: DiscoveryPublishState;
  status?: DiscoveryPublishState;
  artKey?: string;
  iconKey?: string;
  assetSemanticKey?: string;
  encyclopedia?: Record<string, unknown>;
  eligibility?: DiscoveryEligibilityRules;
  spawnProfile?: DiscoverySpawnProfile;
  spawnProfileId?: string;
  scanProfileId?: string;
  collectionProfileId?: string;
  rewardProfileId?: string;
  registryEligible?: boolean;
  tags?: string[];
  [key: string]: unknown;
};

export type DiscoveryCollection = {
  id: string;
  name?: string;
  displayName?: string;
  discoveryIds?: string[];
  rewardProfileId?: string;
  order?: number;
  [key: string]: unknown;
};

export type DiscoveryChain = DiscoveryCollection & {
  milestoneIds?: string[];
};

export type UniversalRegistryEntityType = {
  id: string;
  displayName?: string;
  eligibleForFirstDiscovery?: boolean;
  eligibleForNaming?: boolean;
  [key: string]: unknown;
};

export type UniversalDiscoveryMilestone = {
  id: string;
  displayName?: string;
  entityTypeIds?: string[];
  firstDiscoveryEligible?: boolean;
  rewardProfileId?: string;
  [key: string]: unknown;
};

export type UniversalDiscoveryRegistryContract = {
  id?: string;
  version?: string;
  entityTypes?: UniversalRegistryEntityType[];
  milestones?: UniversalDiscoveryMilestone[];
  namingPolicyId?: string;
  attributionPolicyId?: string;
  [key: string]: unknown;
};

export type UniversalObjectIdentityContract = {
  id?: string;
  version?: string;
  algorithm?: string;
  requiredFields?: string[];
  namespace?: string;
  [key: string]: unknown;
};

export type NamingPolicy = {
  id?: string;
  eligibleEntityTypes?: string[];
  moderationRequired?: boolean;
  fallbackNamePolicy?: string;
  [key: string]: unknown;
};

export type AttributionPolicy = {
  id?: string;
  anonymousLabel?: string;
  exposeAuthUserId?: boolean;
  exposeEmail?: boolean;
  publicDisplayFields?: string[];
  [key: string]: unknown;
};

export type DiscoveryRuntimeContract = Pick<
  GameRuntimeData,
  | "metadata"
  | "assets"
  | "discoveryCategories"
  | "discoverySubcategories"
  | "discoveryRarities"
  | "discoveryRecords"
  | "discoveryCollections"
  | "discoveryChains"
  | "discoverySpawnProfiles"
  | "discoverySpawnTables"
  | "discoveryScanProfiles"
  | "discoveryCollectionProfiles"
  | "discoveryRewardProfiles"
  | "discoveryStateDefinitions"
  | "universalDiscoveryRegistry"
  | "universalObjectIdentityContract"
  | "namingPolicy"
  | "attributionPolicy"
>;

export type PlanetDiscoveryEnvironment = {
  environmentId: string;
  universeId: string;
  universeSeedVersion: string;
  generationVersion: string;
  galaxyId: string;
  sectorId: string;
  systemId: string;
  starId?: string;
  planetId: string;
  regionId?: string;
  planetClassIds: string[];
  planetSubclassIds: string[];
  biomeIds: string[];
  atmosphereIds: string[];
  terrainIds: string[];
  temperature?: number;
  gravity?: number;
  waterCoverage?: number;
  humidity?: number;
  radiation?: number;
  volcanism?: number;
  biosphereMaturity?: number;
  biologicalDiversity?: number;
  civilizationPresence?: number;
  ruinPresence?: number;
  anomalyInfluence?: number;
  locationType?: string;
};

export type DiscoveryPlayerProgress = {
  currentEraId?: string;
  completedResearchIds: string[];
  equipmentIds: string[];
};

export type DiscoveryEligibilityResult = {
  eligible: boolean;
  matchedRules: string[];
  failedRules: string[];
  requiredProgressMissing: string[];
  requiredEquipmentMissing: string[];
  resolvedModifiers: Record<string, number>;
};

export type DiscoveryPlacementInstance = {
  placementId: string;
  universalObjectId: string;
  discoveryId: string;
  environmentId: string;
  regionId?: string;
  locationType?: string;
  positionSeed: string;
  spawnSlot: number;
  generationVersion: string;
  rarityId: string;
  state: DiscoveryPersonalState;
  registryEligibility: "eligible" | "ineligible";
  createdFromRuntimeContentVersion: number;
};

export type DiscoveryJournalState = {
  discoveryJournalVersion: number;
  discoveredObjectIds: string[];
  detectedObjectIds: string[];
  identifiedObjectIds: string[];
  analyzedObjectIds: string[];
  collectedObjectIds: string[];
  decodedObjectIds: string[];
  visitedSiteIds: string[];
  pendingDiscoveryClaims: DiscoveryPendingClaim[];
  discoveryEntryProgress: Record<string, number>;
  discoveryLocationHistory: Record<string, string[]>;
  discoverySpecimenInventory: Record<string, number>;
  bookmarks?: string[];
  explorationStates?: Record<string, ExplorationDiscoveryState>;
  scanJobs?: Record<string, ExplorationScanJob>;
  probeMissions?: Record<string, ExplorationProbeMission>;
  surveyRecords?: Record<string, ExplorationSurveyRecord>;
  explorationScores?: Record<string, ExplorationScoreRecord>;
  recentDiscoveries?: ExplorationJournalEntry[];
  encyclopediaProgress?: Record<string, ExplorationEncyclopediaTier>;
  expeditionRecords?: ExplorationExpeditionRecord[];
  privateNotes?: Record<string, string>;
};

export type ExplorationTargetType = "galaxy" | "sector" | "system" | "star" | "planet" | "moon" | "anomaly" | "lifeform" | "artifact" | "resource" | "discovery";

export type ExplorationTarget = {
  id: string;
  type: ExplorationTargetType;
  label: string;
  distance: number;
  knowledgeState?: string;
  rangeState?: string;
  canProbe?: boolean;
  canTravel?: boolean;
  classification?: string;
};

export type ExplorationScanJob = {
  id: string;
  targetId: string;
  targetType: ExplorationTargetType;
  status: "queued" | "scanning" | "completed" | "failed";
  startedAt: string;
  completesAt: string;
  completedAt?: string;
  durationSeconds: number;
  revealed: Array<"name" | "class" | "resources" | "discoveries" | "threats" | "biome" | "life" | "registry">;
};

export type ExplorationProbeMission = {
  id: string;
  targetId: string;
  targetType: ExplorationTargetType;
  status: "preparing" | "traveling" | "scanning" | "returning" | "failed" | "destroyed" | "lost" | "completed";
  launchedAt: string;
  completesAt: string;
  completedAt?: string;
  risk: number;
  range: number;
};

export type ExplorationSurveyRecord = {
  targetId: string;
  updatedAt: string;
  surface: number;
  resources: number;
  life: number;
  ruins: number;
  hazards: number;
  weather?: string;
  temperature?: string;
  gravity?: string;
  atmosphere?: string;
};

export type ExplorationScoreRecord = {
  targetId: string;
  exploration: number;
  survey: number;
  discovery: number;
  completion: number;
  updatedAt: string;
};

export type ExplorationJournalEntry = {
  id: string;
  targetId: string;
  targetType: ExplorationTargetType;
  label: string;
  event: "detected" | "probed" | "scanned" | "surveyed" | "explored" | "catalogued" | "colonized" | "rewarded";
  occurredAt: string;
};

export type ExplorationEncyclopediaTier = "unknown" | "known" | "analyzed" | "complete";

export type ExplorationExpeditionRecord = {
  id: string;
  targetId: string;
  targetType: ExplorationTargetType;
  routeId: string;
  status: "planned" | "traveling" | "surveying" | "returning" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
};

export type DiscoveryPendingClaim = {
  requestId: string;
  universalObjectId: string;
  discoveryId: string;
  entityType: string;
  milestoneType: string;
  universeId: string;
  generationVersion: string;
  evidence: Record<string, unknown>;
  queuedAt: string;
  status: "pending" | "submitted" | "confirmed" | "lost" | "failed";
};

export type PublicDiscoveryAttribution = {
  displayName: string;
  civilizationName?: string;
  anonymous: boolean;
};

export type RegistryRecord = {
  universalObjectId: string;
  discoveryId?: string;
  entityType?: string;
  canonicalFallbackName?: string;
  approvedName?: string;
  registryVersion?: string;
  firstDiscoveredAt?: string;
  firstDiscoveredBy?: PublicDiscoveryAttribution;
  milestones?: UniversalDiscoveryMilestone[];
  namingStatus?: "none" | "pending" | "approved" | "rejected" | "auto_blocked" | "reverted";
  [key: string]: unknown;
};

export type DiscoveryCatalogViewModel = {
  discovery: DiscoveryRecord;
  rarity?: DiscoveryRarity;
  category?: DiscoveryCategory;
  personalState: DiscoveryPersonalState;
  registryState: DiscoveryRegistryState;
  registry?: RegistryRecord;
  locationLabel?: string;
  displayName: string;
  imagePath?: string;
};
