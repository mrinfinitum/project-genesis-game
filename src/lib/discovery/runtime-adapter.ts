import type { GameRuntimeData, RuntimeContentState } from "@/lib/canonical-runtime";
import type { DiscoveryRuntimeContract } from "./types";

export const REQUIRED_DISCOVERY_RECORD_IDS = [
  "DISC-FLORA-LUMEN-MOSS",
  "DISC-FAUNA-AEROVALE-SKIMMER",
  "DISC-LIVING-MYCELIAL-WORLDNET",
  "DISC-ELEMENT-HELIUM3-ICEVEIN",
  "DISC-MINERAL-VESPER-CRYSTAL",
  "DISC-EXOTIC-UMBRAL-CONDENSATE",
  "DISC-ARTIFACT-SILENT-SUN-ORRERY",
  "DISC-ALIENTECH-PRECURSOR-MEMORY-LATTICE",
  "DISC-RUINS-ECHO-VAULT",
  "DISC-ANOMALY-PALE-CHORUS"
] as const;

export function asDiscoveryRuntime(runtime: GameRuntimeData | RuntimeContentState | DiscoveryRuntimeContract): DiscoveryRuntimeContract {
  return runtime as DiscoveryRuntimeContract;
}

function count(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

export function auditDiscoveryRuntime(runtime: GameRuntimeData | RuntimeContentState) {
  const discovery = asDiscoveryRuntime(runtime);
  const records = discovery.discoveryRecords ?? [];
  const recordIds = new Set(records.map((record) => record.id));
  const missingRecordIds = REQUIRED_DISCOVERY_RECORD_IDS.filter((id) => !recordIds.has(id));
  const universalRegistry = discovery.universalDiscoveryRegistry;
  const version = discovery.metadata.universalDiscoveryRegistryVersion ?? universalRegistry?.version;
  const failures: string[] = [];

  if (discovery.metadata.architectureVersion !== "1.0.0") failures.push(`Expected architectureVersion 1.0.0, got ${discovery.metadata.architectureVersion ?? "missing"}.`);
  if ((discovery.metadata.runtimeVersion ?? discovery.metadata.schemaVersion) !== "game-runtime-v1") failures.push(`Expected runtimeVersion game-runtime-v1, got ${discovery.metadata.runtimeVersion ?? discovery.metadata.schemaVersion ?? "missing"}.`);
  if (discovery.metadata.contentVersion < 20) failures.push(`Expected contentVersion 20 or newer, got ${discovery.metadata.contentVersion}.`);
  if (version !== "1.0.0") failures.push(`Expected universalDiscoveryRegistryVersion 1.0.0, got ${version ?? "missing"}.`);
  if (!count(discovery.discoveryCategories)) failures.push("Discovery categories are missing.");
  if (!count(discovery.discoverySubcategories)) failures.push("Discovery subcategories are missing.");
  if (!count(discovery.discoveryRarities)) failures.push("Discovery rarities are missing.");
  if (!count(records)) failures.push("Discovery records are missing.");
  if (!count(discovery.discoveryCollections)) failures.push("Discovery collections are missing.");
  if (!count(discovery.discoveryChains)) failures.push("Discovery chains are missing.");
  if (!count(universalRegistry?.entityTypes)) failures.push("Universal Registry entity types are missing.");
  if (!count(universalRegistry?.milestones)) failures.push("Universal Registry milestones are missing.");
  if (missingRecordIds.length) failures.push(`Missing required Discovery records: ${missingRecordIds.join(", ")}.`);

  return {
    ok: failures.length === 0,
    metadata: {
      architectureVersion: discovery.metadata.architectureVersion,
      runtimeVersion: discovery.metadata.runtimeVersion ?? discovery.metadata.schemaVersion,
      contentVersion: discovery.metadata.contentVersion,
      universalDiscoveryRegistryVersion: version,
      checksum: discovery.metadata.checksum
    },
    counts: {
      categories: count(discovery.discoveryCategories),
      subcategories: count(discovery.discoverySubcategories),
      rarities: count(discovery.discoveryRarities),
      records: count(records),
      collections: count(discovery.discoveryCollections),
      chains: count(discovery.discoveryChains),
      registryEntityTypes: count(universalRegistry?.entityTypes),
      registryMilestones: count(universalRegistry?.milestones)
    },
    missingRecordIds,
    failures
  };
}
