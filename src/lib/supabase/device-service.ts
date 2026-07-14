import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { PlayerDeviceRow } from "./types";
import { defaultStorageService, type StorageService } from "@/platform/storage";

const DEVICE_ID_KEY = "noveris-game:device-id";

function randomDeviceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getOrCreateLocalDeviceId(storage: StorageService = defaultStorageService) {
  const existing = storage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const next = randomDeviceId();
  storage.setItem(DEVICE_ID_KEY, next);
  return next;
}

export function getDefaultDeviceName() {
  if (typeof navigator === "undefined") return "Unknown Device";
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? "Web";
  return `${platform} Browser`;
}

export class NoverisDeviceService {
  constructor(private readonly client: SupabaseClient | null) {}

  async ensureDevice(user: User, appVersion: string, storage?: StorageService): Promise<PlayerDeviceRow | null> {
    if (!this.client) return null;
    const now = new Date().toISOString();
    const device: PlayerDeviceRow = {
      user_id: user.id,
      device_id: getOrCreateLocalDeviceId(storage),
      device_name: getDefaultDeviceName(),
      platform: typeof navigator === "undefined" ? "web" : navigator.userAgent,
      app_version: appVersion,
      last_seen: now,
      created_at: now,
      updated_at: now
    };

    const { data, error } = await this.client
      .from("player_devices")
      .upsert(device, { onConflict: "user_id,device_id" })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
