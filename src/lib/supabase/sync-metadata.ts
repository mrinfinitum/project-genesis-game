import { readJson, writeJson, type KeyValueStore, BrowserKeyValueStore } from "@/lib/connected-single-player/storage";
import type { CloudSyncStatus } from "./types";

export const NOVERIS_CLOUD_SYNC_KEY = "noveris-game:cloud-sync-metadata";

export type ActiveSaveSource =
  | "new_game"
  | "local"
  | "cloud"
  | "local_selected_after_conflict"
  | "cloud_selected_after_conflict"
  | "guest_converted"
  | "offline_local";

export type CloudSyncMetadata = {
  activeSaveSource: ActiveSaveSource;
  status: CloudSyncStatus;
  lastSyncedRevision?: number;
  lastSuccessfulSyncAt?: string;
  dirty: boolean;
  pendingRetry: boolean;
  pendingRetryReason?: string;
  lastCloudError?: string;
  offlineProgressionApplyCount: number;
  deviceId?: string;
  deviceName?: string;
  cloudRevision?: number;
};

export const defaultCloudSyncMetadata: CloudSyncMetadata = {
  activeSaveSource: "new_game",
  status: "Local Only",
  dirty: false,
  pendingRetry: false,
  offlineProgressionApplyCount: 0
};

export function loadCloudSyncMetadata(store: KeyValueStore = new BrowserKeyValueStore()) {
  return readJson<CloudSyncMetadata>(store, NOVERIS_CLOUD_SYNC_KEY, defaultCloudSyncMetadata);
}

export function saveCloudSyncMetadata(metadata: CloudSyncMetadata, store: KeyValueStore = new BrowserKeyValueStore()) {
  writeJson(store, NOVERIS_CLOUD_SYNC_KEY, metadata);
  return metadata;
}
