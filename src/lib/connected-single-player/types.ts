export const SAVE_VERSION = 1;
export const SCHEMA_VERSION = 1;
export const CONTENT_VERSION = "genesis-canonical-0.1.0";

export type NetworkStatus = "offline" | "local_save" | "syncing" | "synced" | "conflict" | "sync_error";

export type LeaderboardCategory =
  | "discovery_points"
  | "era_mastery"
  | "planets_discovered"
  | "systems_discovered"
  | "colonies_founded"
  | "research_completed"
  | "trade_network_value"
  | "civilization_power"
  | "weekly_progress";

export const LEADERBOARD_CATEGORIES: LeaderboardCategory[] = [
  "discovery_points",
  "era_mastery",
  "planets_discovered",
  "systems_discovered",
  "colonies_founded",
  "research_completed",
  "trade_network_value",
  "civilization_power",
  "weekly_progress"
];

export type ConflictResolution = "use_local" | "use_cloud" | "keep_both";

export interface CanonicalContentManifest {
  contentVersion: string;
  eras: string[];
  researchIds: string[];
  planetArchetypes: string[];
  weeklyChallengeIds: string[];
}

export interface PrivatePlayerState {
  civilizationId: string;
  civilizationName: string;
  homeSystemId: string;
  currentEra: string;
  unlockedResearchIds: string[];
  discoveredPlanetIds: string[];
  discoveredSystemIds: string[];
  colonyIds: string[];
  tradeRoutes: Array<{
    id: string;
    fromColonyId: string;
    toColonyId: string;
    value: number;
  }>;
}

export interface PublicPlayerStatistics {
  civilizationId: string;
  civilizationName: string;
  era: string;
  discoveryPoints: number;
  eraMastery: number;
  planetsDiscovered: number;
  systemsDiscovered: number;
  coloniesFounded: number;
  researchCompleted: number;
  tradeNetworkValue: number;
  civilizationPower: number;
  weeklyProgress: number;
  updatedAt: string;
}

export interface WeeklyChallengeProgress {
  challengeId: string;
  progress: number;
  goal: number;
  completed: boolean;
}

export interface PlayerState {
  private: PrivatePlayerState;
  publicStats: PublicPlayerStatistics;
  achievements: string[];
  weeklyChallenges: WeeklyChallengeProgress[];
  localFlags: {
    tutorialSeen: boolean;
    simulateOffline: boolean;
  };
}

export interface LocalFirstSave {
  saveVersion: number;
  schemaVersion: number;
  contentVersion: string;
  revision: number;
  deviceId: string;
  updatedAt: string;
  lastSimulationAt: string;
  state: PlayerState;
}

export interface QueuedSyncOperation {
  id: string;
  type: "upload_save" | "submit_scores" | "sync_discovery" | "sync_challenge";
  revision: number;
  createdAt: string;
  attempts: number;
  payload: unknown;
}

export interface CloudConflict {
  local: LocalFirstSave;
  cloud: LocalFirstSave;
  reason: "cloud_newer" | "local_newer" | "same_revision_diverged";
}

export interface CloudSaveComparison {
  status: "no_cloud_save" | "local_newer" | "cloud_newer" | "same_revision" | "conflict";
  conflict?: CloudConflict;
}

export interface AuthSession {
  accountId: string;
  displayName: string;
  signedInAt: string;
}

export interface LeaderboardEntry {
  category: LeaderboardCategory;
  rank: number;
  displayName: string;
  civilizationName: string;
  verifiedScore: number;
  revision: number;
  submittedAt: string;
}

export interface ScoreSubmissionContract {
  category: LeaderboardCategory;
  saveRevision: number;
  deviceId: string;
  contentVersion: string;
  publicStats: PublicPlayerStatistics;
  clientEvidence: {
    eventIds: string[];
    localComputedAt: string;
  };
}

export interface GlobalDiscoveryRecord {
  discoveryId: string;
  totalDiscoveries: number;
  firstDiscoveredBy?: string;
  firstDiscoveredAt?: string;
}

export interface CivilizationSummary {
  civilizationId: string;
  civilizationName: string;
  era: string;
  discoveryPoints: number;
  coloniesFounded: number;
  civilizationPower: number;
  updatedAt: string;
}

export interface AuthService {
  getSession(): Promise<AuthSession | null>;
  signInMock(displayName: string): Promise<AuthSession>;
  signOut(): Promise<void>;
}

export interface CloudSaveService {
  uploadSave(save: LocalFirstSave): Promise<void>;
  downloadSave(): Promise<LocalFirstSave | null>;
  compareRevisions(local: LocalFirstSave): Promise<CloudSaveComparison>;
  resolveConflict(conflict: CloudConflict, resolution: ConflictResolution): Promise<LocalFirstSave>;
  inspectCloudPayload(): Promise<unknown>;
}

export interface LeaderboardService {
  listCategories(): LeaderboardCategory[];
  submitScoreEvidence(contract: ScoreSubmissionContract): Promise<LeaderboardEntry>;
  getLeaderboard(category: LeaderboardCategory): Promise<LeaderboardEntry[]>;
}

export interface AchievementService {
  unlock(achievementId: string, save: LocalFirstSave): Promise<void>;
  listUnlocked(): Promise<string[]>;
}

export interface ChallengeService {
  getActiveChallenge(): Promise<WeeklyChallengeProgress>;
  submitProgress(progress: WeeklyChallengeProgress, save: LocalFirstSave): Promise<WeeklyChallengeProgress>;
}

export interface GlobalDiscoveryService {
  recordDiscovery(discoveryId: string, save: LocalFirstSave): Promise<GlobalDiscoveryRecord>;
  getGlobalTotals(): Promise<GlobalDiscoveryRecord[]>;
  getCivilizationSummary(civilizationId: string): Promise<CivilizationSummary | null>;
  publishCivilizationSummary(summary: CivilizationSummary): Promise<void>;
}
