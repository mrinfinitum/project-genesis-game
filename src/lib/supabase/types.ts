import type { Session, User } from "@supabase/supabase-js";
import type { PlayerRuntimeState } from "@/lib/player-runtime";

export type NoverisAuthStatus =
  | "initializing"
  | "signed_out"
  | "guest"
  | "signing_in"
  | "authenticated"
  | "error";

export type NoverisAuthState = {
  status: NoverisAuthStatus;
  session: Session | null;
  user: User | null;
  email?: string;
  error?: string;
  cloudAvailable: boolean;
  unavailableReason?: string;
};

export type PlayerSaveRow = {
  id: string;
  user_id: string;
  slot_id: string;
  save_version: number;
  content_version: number;
  player_state: PlayerRuntimeState;
  unresolved_state: PlayerRuntimeState["unresolved"];
  revision: number;
  device_id: string | null;
  device_name: string | null;
  last_simulation_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PlayerSaveBackupRow = {
  id: string;
  user_id: string;
  slot_id: string;
  backup_reason: string;
  player_state: PlayerRuntimeState;
  revision: number;
  device_id: string | null;
  device_name: string | null;
  created_at: string;
};

export type PlayerDeviceRow = {
  user_id: string;
  device_id: string;
  device_name: string;
  platform: string;
  app_version: string;
  last_seen: string;
  created_at: string;
  updated_at: string;
};

export type NoverisDatabase = {
  public: {
    Tables: {
      player_profiles: {
        Row: {
          user_id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          updated_at?: string;
        };
      };
      player_saves: {
        Row: PlayerSaveRow;
        Insert: Partial<PlayerSaveRow> & Pick<PlayerSaveRow, "user_id" | "slot_id" | "player_state" | "revision">;
        Update: Partial<PlayerSaveRow>;
      };
      player_save_backups: {
        Row: PlayerSaveBackupRow;
        Insert: Partial<PlayerSaveBackupRow> & Pick<PlayerSaveBackupRow, "user_id" | "slot_id" | "player_state" | "revision">;
        Update: never;
      };
      player_devices: {
        Row: PlayerDeviceRow;
        Insert: PlayerDeviceRow;
        Update: Partial<PlayerDeviceRow>;
      };
    };
  };
};

export type CloudSave = {
  id: string;
  userId: string;
  slotId: "primary" | string;
  saveVersion: number;
  contentVersion: number;
  playerState: PlayerRuntimeState;
  unresolvedState: PlayerRuntimeState["unresolved"];
  revision: number;
  deviceId?: string;
  deviceName?: string;
  lastSimulationAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CloudSaveResult =
  | { status: "saved"; save: CloudSave }
  | { status: "conflict"; expectedRevision: number }
  | { status: "offline_queued"; reason: string }
  | { status: "unauthorized"; reason: string }
  | { status: "failed"; reason: string };

export type CloudSyncStatus = "Local Only" | "Saving" | "Synced" | "Pending Sync" | "Offline" | "Conflict" | "Error";
