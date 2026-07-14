import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { GameRuntimeData } from "@/lib/canonical-runtime";
import type { PlayerRuntimeState } from "@/lib/player-runtime";
import type { CloudSave, CloudSaveResult, PlayerSaveRow } from "./types";
import { safeSupabaseErrorMessage } from "./errors";
import { cloudRowToSave, serializePlayerRuntimeForCloud } from "./save-adapter";

const PRIMARY_SLOT_ID = "primary";

function rowPayload(user: User, state: PlayerRuntimeState, deviceId?: string, deviceName?: string) {
  return {
    user_id: user.id,
    slot_id: PRIMARY_SLOT_ID,
    ...serializePlayerRuntimeForCloud(state),
    device_id: deviceId ?? null,
    device_name: deviceName ?? null
  };
}

export class NoverisCloudSaveService {
  private pendingState: PlayerRuntimeState | null = null;
  private pendingReason = "";

  constructor(
    private readonly client: SupabaseClient | null,
    private readonly content: GameRuntimeData
  ) {}

  async loadPrimarySave(user: User): Promise<CloudSave | null> {
    if (!this.client) return null;
    const { data, error } = await this.client
      .from("player_saves")
      .select("*")
      .eq("user_id", user.id)
      .eq("slot_id", PRIMARY_SLOT_ID)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const hydrated = cloudRowToSave(data as PlayerSaveRow, this.content);
    if (!hydrated.ok) throw new Error(`Cloud save is ${hydrated.reason}.`);
    return hydrated.save;
  }

  async createPrimarySave(user: User, state: PlayerRuntimeState, deviceId?: string, deviceName?: string): Promise<CloudSaveResult> {
    if (!this.client) return { status: "offline_queued", reason: "Cloud service unavailable." };
    const { data, error } = await this.client
      .from("player_saves")
      .insert(rowPayload(user, state, deviceId, deviceName))
      .select()
      .single();

    if (error) return { status: "failed", reason: safeSupabaseErrorMessage(error) };
    const hydrated = cloudRowToSave(data as PlayerSaveRow, this.content);
    if (!hydrated.ok) return { status: "failed", reason: `Cloud save is ${hydrated.reason}.` };
    return { status: "saved", save: hydrated.save };
  }

  async updatePrimarySave(user: User, state: PlayerRuntimeState, expectedRevision: number, deviceId?: string, deviceName?: string): Promise<CloudSaveResult> {
    if (!this.client) return this.queueRetry(state, "Cloud service unavailable.");
    const payload = {
      ...rowPayload(user, { ...state, revision: expectedRevision + 1 }, deviceId, deviceName),
      revision: expectedRevision + 1,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.client
      .from("player_saves")
      .update(payload)
      .eq("user_id", user.id)
      .eq("slot_id", PRIMARY_SLOT_ID)
      .eq("revision", expectedRevision)
      .select()
      .maybeSingle();

    if (error) return { status: "failed", reason: safeSupabaseErrorMessage(error) };
    if (!data) return { status: "conflict", expectedRevision };
    const hydrated = cloudRowToSave(data as PlayerSaveRow, this.content);
    if (!hydrated.ok) return { status: "failed", reason: `Cloud save is ${hydrated.reason}.` };
    return { status: "saved", save: hydrated.save };
  }

  saveNow(user: User, state: PlayerRuntimeState, expectedRevision: number, deviceId?: string, deviceName?: string) {
    return this.updatePrimarySave(user, state, expectedRevision, deviceId, deviceName);
  }

  async flushPendingSave(user: User, expectedRevision: number, deviceId?: string, deviceName?: string) {
    if (!this.pendingState) return { status: "saved", save: undefined } as const;
    const state = this.pendingState;
    this.pendingState = null;
    this.pendingReason = "";
    return this.updatePrimarySave(user, state, expectedRevision, deviceId, deviceName);
  }

  async createBackup(user: User, state: PlayerRuntimeState, reason: string, deviceId?: string, deviceName?: string) {
    if (!this.client) return null;
    const { data, error } = await this.client
      .from("player_save_backups")
      .insert({
        user_id: user.id,
        slot_id: PRIMARY_SLOT_ID,
        backup_reason: reason,
        player_state: state,
        revision: state.revision,
        device_id: deviceId ?? null,
        device_name: deviceName ?? null
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async listBackups(user: User) {
    if (!this.client) return [];
    const { data, error } = await this.client
      .from("player_save_backups")
      .select("*")
      .eq("user_id", user.id)
      .eq("slot_id", PRIMARY_SLOT_ID)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }

  async restoreBackup(user: User, backupState: PlayerRuntimeState, expectedRevision: number, deviceId?: string, deviceName?: string) {
    await this.createBackup(user, backupState, "before_backup_restore", deviceId, deviceName);
    return this.updatePrimarySave(user, backupState, expectedRevision, deviceId, deviceName);
  }

  async deleteCloudSave(user: User) {
    if (!this.client) return { status: "offline_queued", reason: "Cloud service unavailable." } as const;
    const { error } = await this.client.from("player_saves").delete().eq("user_id", user.id).eq("slot_id", PRIMARY_SLOT_ID);
    if (error) return { status: "failed", reason: safeSupabaseErrorMessage(error) } as const;
    return { status: "saved" } as const;
  }

  queueRetry(state: PlayerRuntimeState, reason: string): CloudSaveResult {
    this.pendingState = state;
    this.pendingReason = reason;
    return { status: "offline_queued", reason };
  }

  getPendingRetry() {
    return this.pendingState ? { state: this.pendingState, reason: this.pendingReason } : null;
  }
}
