import { LocalSaveRepository } from "./local-save-repository";
import {
  type AchievementService,
  type ChallengeService,
  type CloudConflict,
  type CloudSaveService,
  type ConflictResolution,
  type GlobalDiscoveryService,
  type LeaderboardCategory,
  type LeaderboardService,
  type LocalFirstSave,
  type NetworkStatus,
  type ScoreSubmissionContract
} from "./types";

export interface SyncEngineServices {
  cloudSave: CloudSaveService;
  leaderboard: LeaderboardService;
  achievement: AchievementService;
  challenge: ChallengeService;
  globalDiscovery: GlobalDiscoveryService;
}

export interface SyncResult {
  status: NetworkStatus;
  save: LocalFirstSave;
  conflict?: CloudConflict;
  message?: string;
}

function createScoreContract(save: LocalFirstSave, category: LeaderboardCategory): ScoreSubmissionContract {
  return {
    category,
    saveRevision: save.revision,
    deviceId: save.deviceId,
    contentVersion: save.contentVersion,
    publicStats: save.state.publicStats,
    clientEvidence: {
      eventIds: [`revision:${save.revision}`, `device:${save.deviceId}`],
      localComputedAt: new Date().toISOString()
    }
  };
}

export class SyncEngine {
  constructor(
    private readonly repository: LocalSaveRepository,
    private readonly services: SyncEngineServices,
    private readonly isOnline: () => boolean
  ) {}

  queueSave(save = this.repository.loadOrCreateSave()) {
    this.repository.enqueue("upload_save", save.revision, save);
  }

  queueCommunitySync(save = this.repository.loadOrCreateSave()) {
    this.repository.enqueue("submit_scores", save.revision, {
      categories: this.services.leaderboard.listCategories()
    });
    this.repository.enqueue("sync_discovery", save.revision, {
      discoveryIds: save.state.private.discoveredPlanetIds
    });
    this.repository.enqueue("sync_challenge", save.revision, {
      weeklyChallenges: save.state.weeklyChallenges
    });
  }

  async forceSync(): Promise<SyncResult> {
    const save = this.repository.loadOrCreateSave();

    if (!this.isOnline()) {
      this.queueSave(save);
      return {
        status: "offline",
        save,
        message: "Offline: local save kept as source of truth and sync queued."
      };
    }

    const comparison = await this.services.cloudSave.compareRevisions(save);

    if (comparison.status === "conflict" && comparison.conflict) {
      return {
        status: "conflict",
        save,
        conflict: comparison.conflict,
        message: "Cloud save conflict detected. Choose local, cloud, or keep both."
      };
    }

    try {
      await this.processQueue();

      if (comparison.status === "no_cloud_save" || comparison.status === "local_newer") {
        await this.services.cloudSave.uploadSave(save);
      }

      return {
        status: "synced",
        save: this.repository.loadOrCreateSave(),
        message: "Local save and mock cloud are synchronized."
      };
    } catch (error) {
      return {
        status: "sync_error",
        save,
        message: error instanceof Error ? error.message : "Unknown sync error."
      };
    }
  }

  async processQueue() {
    if (!this.isOnline()) {
      return;
    }

    const queue = this.repository.getQueue();

    for (const operation of queue) {
      this.repository.markOperationAttempt(operation.id);
      const save = this.repository.loadOrCreateSave();

      if (operation.type === "upload_save") {
        await this.services.cloudSave.uploadSave(operation.payload as LocalFirstSave);
      }

      if (operation.type === "submit_scores") {
        for (const category of this.services.leaderboard.listCategories()) {
          await this.services.leaderboard.submitScoreEvidence(createScoreContract(save, category));
        }
      }

      if (operation.type === "sync_discovery") {
        for (const discoveryId of save.state.private.discoveredPlanetIds) {
          await this.services.globalDiscovery.recordDiscovery(discoveryId, save);
        }
      }

      if (operation.type === "sync_challenge") {
        for (const challenge of save.state.weeklyChallenges) {
          await this.services.challenge.submitProgress(challenge, save);
        }
      }

      this.repository.removeOperation(operation.id);
    }
  }

  async resolveConflict(conflict: CloudConflict, resolution: ConflictResolution): Promise<SyncResult> {
    const resolved = await this.services.cloudSave.resolveConflict(conflict, resolution);

    if (resolution === "use_cloud") {
      this.repository.archiveSave(conflict.local, "Local save before cloud conflict resolution");
      const active = this.repository.replaceActiveSave(resolved);
      return { status: "synced", save: active, message: "Cloud save is now the active local save." };
    }

    if (resolution === "keep_both") {
      this.repository.archiveSave(conflict.cloud, "Cloud save kept during conflict resolution");
      return {
        status: "synced",
        save: conflict.local,
        message: "Both saves were kept. Local remains active and cloud copy was archived as an alternate."
      };
    }

    return { status: "synced", save: conflict.local, message: "Local save explicitly uploaded over cloud save." };
  }
}
