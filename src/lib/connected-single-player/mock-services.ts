import {
  LEADERBOARD_CATEGORIES,
  type AchievementService,
  type AuthService,
  type AuthSession,
  type ChallengeService,
  type CivilizationSummary,
  type CloudConflict,
  type CloudSaveComparison,
  type CloudSaveService,
  type ConflictResolution,
  type GlobalDiscoveryRecord,
  type GlobalDiscoveryService,
  type LeaderboardCategory,
  type LeaderboardEntry,
  type LeaderboardService,
  type LocalFirstSave,
  type ScoreSubmissionContract,
  type WeeklyChallengeProgress
} from "./types";
import { type KeyValueStore, readJson, writeJson } from "./storage";

const SESSION_KEY = "project-genesis-game:mock-auth-session";
const CLOUD_SAVE_KEY = "project-genesis-game:mock-cloud-save";
const CLOUD_ALTERNATES_KEY = "project-genesis-game:mock-cloud-alternate-saves";
const LEADERBOARD_KEY = "project-genesis-game:mock-leaderboards";
const ACHIEVEMENT_KEY = "project-genesis-game:mock-achievements";
const CHALLENGE_KEY = "project-genesis-game:mock-weekly-challenge";
const GLOBAL_DISCOVERY_KEY = "project-genesis-game:mock-global-discoveries";
const CIVILIZATION_SUMMARY_KEY = "project-genesis-game:mock-civilization-summaries";

function now() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function savesDiverged(a: LocalFirstSave, b: LocalFirstSave) {
  return JSON.stringify(a.state) !== JSON.stringify(b.state) || a.deviceId !== b.deviceId;
}

function cloneSave(save: LocalFirstSave): LocalFirstSave {
  return structuredClone(save);
}

function computeVerifiedScore(category: LeaderboardCategory, stats: ScoreSubmissionContract["publicStats"]) {
  switch (category) {
    case "discovery_points":
      return stats.discoveryPoints;
    case "era_mastery":
      return stats.eraMastery;
    case "planets_discovered":
      return stats.planetsDiscovered;
    case "systems_discovered":
      return stats.systemsDiscovered;
    case "colonies_founded":
      return stats.coloniesFounded;
    case "research_completed":
      return stats.researchCompleted;
    case "trade_network_value":
      return stats.tradeNetworkValue;
    case "civilization_power":
      return stats.civilizationPower;
    case "weekly_progress":
      return stats.weeklyProgress;
  }
}

function createEmptyLeaderboards(): Record<LeaderboardCategory, LeaderboardEntry[]> {
  return LEADERBOARD_CATEGORIES.reduce(
    (boards, category) => ({
      ...boards,
      [category]: []
    }),
    {} as Record<LeaderboardCategory, LeaderboardEntry[]>
  );
}

export class MockAuthService implements AuthService {
  constructor(private readonly store: KeyValueStore) {}

  async getSession() {
    return readJson<AuthSession | null>(this.store, SESSION_KEY, null);
  }

  async signInMock(displayName: string) {
    const session: AuthSession = {
      accountId: createId("account"),
      displayName: displayName.trim() || "Local Commander",
      signedInAt: now()
    };

    writeJson(this.store, SESSION_KEY, session);
    return session;
  }

  async signOut() {
    this.store.removeItem(SESSION_KEY);
  }
}

export class MockCloudSaveService implements CloudSaveService {
  constructor(private readonly store: KeyValueStore) {}

  async uploadSave(save: LocalFirstSave) {
    const cloud = await this.downloadSave();

    if (cloud && cloud.revision > save.revision) {
      throw new Error("Refusing to overwrite a newer cloud save without explicit conflict resolution.");
    }

    writeJson(this.store, CLOUD_SAVE_KEY, cloneSave(save));
  }

  async downloadSave() {
    return readJson<LocalFirstSave | null>(this.store, CLOUD_SAVE_KEY, null);
  }

  async compareRevisions(local: LocalFirstSave): Promise<CloudSaveComparison> {
    const cloud = await this.downloadSave();

    if (!cloud) {
      return { status: "no_cloud_save" };
    }

    if (local.revision > cloud.revision) {
      return { status: "local_newer" };
    }

    if (cloud.revision > local.revision) {
      return {
        status: "conflict",
        conflict: { local, cloud, reason: "cloud_newer" }
      };
    }

    if (savesDiverged(local, cloud)) {
      return {
        status: "conflict",
        conflict: { local, cloud, reason: "same_revision_diverged" }
      };
    }

    return { status: "same_revision" };
  }

  async resolveConflict(conflict: CloudConflict, resolution: ConflictResolution) {
    if (resolution === "use_local") {
      writeJson(this.store, CLOUD_SAVE_KEY, cloneSave(conflict.local));
      return conflict.local;
    }

    if (resolution === "use_cloud") {
      return conflict.cloud;
    }

    const alternates = readJson<Array<{ id: string; save: LocalFirstSave; createdAt: string }>>(
      this.store,
      CLOUD_ALTERNATES_KEY,
      []
    );
    alternates.push({ id: createId("cloud-save"), save: cloneSave(conflict.local), createdAt: now() });
    writeJson(this.store, CLOUD_ALTERNATES_KEY, alternates);
    return conflict.local;
  }

  async inspectCloudPayload() {
    return {
      activeSave: await this.downloadSave(),
      alternateSaves: readJson<Array<{ id: string; save: LocalFirstSave; createdAt: string }>>(
        this.store,
        CLOUD_ALTERNATES_KEY,
        []
      )
    };
  }

  async createCloudConflictFrom(local: LocalFirstSave) {
    const cloud = cloneSave(local);
    const timestamp = now();
    cloud.revision = local.revision + 2;
    cloud.updatedAt = timestamp;
    cloud.lastSimulationAt = timestamp;
    cloud.deviceId = `${local.deviceId}-other-device`;
    cloud.state.publicStats.discoveryPoints += 75;
    cloud.state.publicStats.planetsDiscovered += 1;
    cloud.state.publicStats.updatedAt = timestamp;
    cloud.state.private.discoveredPlanetIds.push(`cloud-only-${Date.now()}`);
    writeJson(this.store, CLOUD_SAVE_KEY, cloud);
    return cloud;
  }
}

export class MockLeaderboardService implements LeaderboardService {
  constructor(private readonly store: KeyValueStore) {}

  listCategories() {
    return LEADERBOARD_CATEGORIES;
  }

  async submitScoreEvidence(contract: ScoreSubmissionContract) {
    const unsafe = contract as ScoreSubmissionContract & { score?: number; trustedScore?: number; verifiedScore?: number };

    if (typeof unsafe.score === "number" || typeof unsafe.trustedScore === "number" || typeof unsafe.verifiedScore === "number") {
      throw new Error("Client score fields are not accepted. Submit evidence and public stats for server verification.");
    }

    const boards = readJson<Record<LeaderboardCategory, LeaderboardEntry[]>>(
      this.store,
      LEADERBOARD_KEY,
      createEmptyLeaderboards()
    );
    const entry: LeaderboardEntry = {
      category: contract.category,
      rank: 0,
      displayName: "Mock Verified Player",
      civilizationName: contract.publicStats.civilizationName,
      verifiedScore: computeVerifiedScore(contract.category, contract.publicStats),
      revision: contract.saveRevision,
      submittedAt: now()
    };
    const board = [...(boards[contract.category] ?? []), entry]
      .sort((a, b) => b.verifiedScore - a.verifiedScore)
      .slice(0, 25)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    boards[contract.category] = board;
    writeJson(this.store, LEADERBOARD_KEY, boards);
    return board.find((item) => item.submittedAt === entry.submittedAt && item.revision === entry.revision) ?? board[0];
  }

  async getLeaderboard(category: LeaderboardCategory) {
    const boards = readJson<Record<LeaderboardCategory, LeaderboardEntry[]>>(
      this.store,
      LEADERBOARD_KEY,
      createEmptyLeaderboards()
    );

    return boards[category] ?? [];
  }
}

export class MockAchievementService implements AchievementService {
  constructor(private readonly store: KeyValueStore) {}

  async unlock(achievementId: string) {
    const unlocked = await this.listUnlocked();

    if (!unlocked.includes(achievementId)) {
      writeJson(this.store, ACHIEVEMENT_KEY, [...unlocked, achievementId]);
    }
  }

  async listUnlocked() {
    return readJson<string[]>(this.store, ACHIEVEMENT_KEY, []);
  }
}

export class MockChallengeService implements ChallengeService {
  constructor(private readonly store: KeyValueStore) {}

  async getActiveChallenge() {
    return readJson<WeeklyChallengeProgress>(this.store, CHALLENGE_KEY, {
      challengeId: "frontier-surge",
      progress: 0,
      goal: 100,
      completed: false
    });
  }

  async submitProgress(progress: WeeklyChallengeProgress) {
    const next = {
      ...progress,
      completed: progress.progress >= progress.goal
    };
    writeJson(this.store, CHALLENGE_KEY, next);
    return next;
  }
}

export class MockGlobalDiscoveryService implements GlobalDiscoveryService {
  constructor(private readonly store: KeyValueStore) {}

  async recordDiscovery(discoveryId: string, save: LocalFirstSave) {
    const records = readJson<Record<string, GlobalDiscoveryRecord>>(this.store, GLOBAL_DISCOVERY_KEY, {});
    const existing = records[discoveryId];
    const next: GlobalDiscoveryRecord = existing
      ? {
          ...existing,
          totalDiscoveries: existing.totalDiscoveries + 1
        }
      : {
          discoveryId,
          totalDiscoveries: 1,
          firstDiscoveredBy: save.state.publicStats.civilizationName,
          firstDiscoveredAt: now()
        };

    records[discoveryId] = next;
    writeJson(this.store, GLOBAL_DISCOVERY_KEY, records);
    return next;
  }

  async getGlobalTotals() {
    return Object.values(readJson<Record<string, GlobalDiscoveryRecord>>(this.store, GLOBAL_DISCOVERY_KEY, {}));
  }

  async getCivilizationSummary(civilizationId: string) {
    const summaries = readJson<Record<string, CivilizationSummary>>(this.store, CIVILIZATION_SUMMARY_KEY, {});
    return summaries[civilizationId] ?? null;
  }

  async publishCivilizationSummary(summary: CivilizationSummary) {
    const summaries = readJson<Record<string, CivilizationSummary>>(this.store, CIVILIZATION_SUMMARY_KEY, {});
    summaries[summary.civilizationId] = summary;
    writeJson(this.store, CIVILIZATION_SUMMARY_KEY, summaries);
  }
}

export function createMockServices(store: KeyValueStore) {
  return {
    auth: new MockAuthService(store),
    cloudSave: new MockCloudSaveService(store),
    leaderboard: new MockLeaderboardService(store),
    achievement: new MockAchievementService(store),
    challenge: new MockChallengeService(store),
    globalDiscovery: new MockGlobalDiscoveryService(store)
  };
}
