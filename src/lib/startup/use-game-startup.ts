import { useMemo } from "react";
import type { RuntimeContentState } from "@/lib/canonical-runtime";
import type { PlayerRuntimeState } from "@/lib/player-runtime";
import type { CloudSave, NoverisAuthState } from "@/lib/supabase";
import { compareSaves, shouldShowConflict, summarizeCloudSave, summarizePlayerSave, type SaveComparisonClassification, type SaveSummary } from "./save-comparison";

export type StartupPhase =
  | "booting"
  | "validating_configuration"
  | "loading_canonical_runtime"
  | "restoring_auth_session"
  | "awaiting_player_choice"
  | "loading_local_save"
  | "migrating_local_save"
  | "loading_cloud_save"
  | "comparing_saves"
  | "resolving_conflict"
  | "applying_offline_progress"
  | "initializing_profile"
  | "initializing_device"
  | "ready"
  | "offline_ready"
  | "recoverable_error"
  | "fatal_error";

export type StartupResult = {
  phase: StartupPhase;
  progress: number;
  message: string;
  recoverableError?: string;
  selectedSaveSource: "new_game" | "local" | "cloud" | "guest_local" | "none";
  localSummary?: SaveSummary;
  cloudSummary?: SaveSummary;
  comparison: SaveComparisonClassification;
  offlineProgressionApplyCount: number;
  isReady: boolean;
};

export function useGameStartup({
  runtimeState,
  authState,
  playerRuntime,
  cloudSave,
  cloudError,
  offlineProgressionApplyCount = 0
}: {
  runtimeState: RuntimeContentState;
  authState: NoverisAuthState;
  playerRuntime?: PlayerRuntimeState;
  cloudSave?: CloudSave | null;
  cloudError?: string;
  offlineProgressionApplyCount?: number;
}): StartupResult {
  return useMemo(() => {
    const localSummary = playerRuntime ? summarizePlayerSave("local", playerRuntime) : undefined;
    const cloudSummary = cloudSave ? summarizeCloudSave(cloudSave) : undefined;
    const comparison = compareSaves(playerRuntime ?? null, cloudSave ?? null);

    if (runtimeState.status === "loading") {
      return { phase: "loading_canonical_runtime", progress: 18, message: "Loading civilization data", selectedSaveSource: "none", comparison, offlineProgressionApplyCount, isReady: false };
    }
    if (authState.status === "initializing") {
      return { phase: "restoring_auth_session", progress: 34, message: "Restoring session", selectedSaveSource: "none", localSummary, cloudSummary, comparison, offlineProgressionApplyCount, isReady: false };
    }
    if (authState.status === "signed_out") {
      return { phase: "awaiting_player_choice", progress: 42, message: "Choose how to begin", selectedSaveSource: "none", localSummary, cloudSummary, comparison, offlineProgressionApplyCount, isReady: false };
    }
    if (authState.status === "error") {
      return { phase: "recoverable_error", progress: 48, message: "Account services are unavailable", recoverableError: authState.error, selectedSaveSource: playerRuntime ? "local" : "none", localSummary, cloudSummary, comparison, offlineProgressionApplyCount, isReady: Boolean(playerRuntime) };
    }
    if (authState.status === "authenticated" && cloudError) {
      return { phase: "offline_ready", progress: 92, message: "Cloud sync pending", recoverableError: cloudError, selectedSaveSource: playerRuntime ? "local" : "none", localSummary, cloudSummary, comparison, offlineProgressionApplyCount, isReady: Boolean(playerRuntime) };
    }
    if (shouldShowConflict(comparison)) {
      return { phase: "resolving_conflict", progress: 72, message: "Resolving player progress", selectedSaveSource: "none", localSummary, cloudSummary, comparison, offlineProgressionApplyCount, isReady: false };
    }

    const selectedSaveSource = authState.status === "guest" ? "guest_local" : cloudSave ? "cloud" : playerRuntime ? "local" : "new_game";
    return { phase: "ready", progress: 100, message: "Preparing civilization", selectedSaveSource, localSummary, cloudSummary, comparison, offlineProgressionApplyCount, isReady: true };
  }, [authState, cloudError, cloudSave, offlineProgressionApplyCount, playerRuntime, runtimeState.status]);
}

export * from "./save-comparison";
