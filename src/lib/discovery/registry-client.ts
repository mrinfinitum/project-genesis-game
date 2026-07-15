import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiscoveryPendingClaim, RegistryRecord } from "./types";

export type DiscoveryClaimRequest = Omit<DiscoveryPendingClaim, "queuedAt" | "status">;
export type DiscoveryClaimResult =
  | { ok: true; status: "confirmed" | "already_claimed"; record: RegistryRecord }
  | { ok: false; status: "queued" | "unavailable" | "rejected"; reason: string };

export class DiscoveryRegistryClient {
  private readonly cache = new Map<string, RegistryRecord>();

  constructor(private readonly supabase: SupabaseClient | null) {}

  get cacheStatus() {
    return { records: this.cache.size };
  }

  async getRegistryRecord(universalObjectId: string): Promise<RegistryRecord | null> {
    if (this.cache.has(universalObjectId)) return this.cache.get(universalObjectId) ?? null;
    if (!this.supabase) return null;
    const { data, error } = await this.supabase.from("universal_objects").select("*").eq("universal_object_id", universalObjectId).maybeSingle();
    if (error || !data || typeof data !== "object") return null;
    const record = normalizeRegistryRecord(data as Record<string, unknown>);
    this.cache.set(universalObjectId, record);
    return record;
  }

  async batchGetRegistryRecords(ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    const result = new Map<string, RegistryRecord | null>();
    for (const id of uniqueIds) {
      result.set(id, await this.getRegistryRecord(id));
    }
    return result;
  }

  async submitDiscoveryClaim(request: DiscoveryClaimRequest): Promise<DiscoveryClaimResult> {
    if (!this.supabase) {
      return { ok: false, status: "queued", reason: "Discovery registry unavailable; claim should remain pending locally." };
    }
    const { data, error } = await this.supabase.rpc("claim_universal_discovery", {
      request_id: request.requestId,
      universal_object_id: request.universalObjectId,
      discovery_id: request.discoveryId,
      entity_type: request.entityType,
      milestone_type: request.milestoneType,
      universe_id: request.universeId,
      generation_version: request.generationVersion,
      evidence: request.evidence
    });
    if (error) return { ok: false, status: "unavailable", reason: error.message };
    const record = normalizeRegistryRecord(data && typeof data === "object" ? data as Record<string, unknown> : { universal_object_id: request.universalObjectId, discovery_id: request.discoveryId });
    this.cache.set(record.universalObjectId, record);
    return { ok: true, status: "confirmed", record };
  }

  async getDiscoveryHistory(universalObjectId: string) {
    if (!this.supabase) return [];
    const { data, error } = await this.supabase.from("universal_discovery_history").select("*").eq("universal_object_id", universalObjectId).order("created_at", { ascending: true });
    return error || !Array.isArray(data) ? [] : data;
  }

  async proposeUniversalName() {
    return { ok: false as const, status: "unavailable" as const, reason: "Naming proposals require the trusted registry API." };
  }

  async reportUniversalName() {
    return { ok: false as const, status: "unavailable" as const, reason: "Moderation reports require the trusted registry API." };
  }

  async listPlayerFirstDiscoveries() {
    return [];
  }

  async listCivilizationDiscoveries() {
    return [];
  }

  async listRecentDiscoveries() {
    return [];
  }

  async searchUniversalCatalog() {
    return [];
  }
}

function normalizeRegistryRecord(record: Record<string, unknown>): RegistryRecord {
  const id = record.universalObjectId ?? record.universal_object_id;
  return {
    universalObjectId: typeof id === "string" ? id : "unknown",
    discoveryId: typeof record.discoveryId === "string" ? record.discoveryId : typeof record.discovery_id === "string" ? record.discovery_id : undefined,
    entityType: typeof record.entityType === "string" ? record.entityType : typeof record.entity_type === "string" ? record.entity_type : undefined,
    canonicalFallbackName: typeof record.canonicalFallbackName === "string" ? record.canonicalFallbackName : typeof record.canonical_fallback_name === "string" ? record.canonical_fallback_name : undefined,
    approvedName: typeof record.approvedName === "string" ? record.approvedName : typeof record.approved_name === "string" ? record.approved_name : undefined,
    registryVersion: typeof record.registryVersion === "string" ? record.registryVersion : typeof record.registry_version === "string" ? record.registry_version : undefined,
    firstDiscoveredAt: typeof record.firstDiscoveredAt === "string" ? record.firstDiscoveredAt : typeof record.first_discovered_at === "string" ? record.first_discovered_at : undefined,
    firstDiscoveredBy: { displayName: "Discovered by an Explorer", anonymous: true },
    namingStatus: "none"
  };
}
