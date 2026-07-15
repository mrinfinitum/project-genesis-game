import runtime from "../src/content/generated/studio-runtime.snapshot.json" with { type: "json" };

const requiredRecordIds = [
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
];

function count(value) {
  return Array.isArray(value) ? value.length : 0;
}

const registry = runtime.universalDiscoveryRegistry;
const records = runtime.discoveryRecords ?? [];
const recordIds = new Set(records.map((record) => record.id));
const missingRecordIds = requiredRecordIds.filter((id) => !recordIds.has(id));
const version = runtime.metadata?.universalDiscoveryRegistryVersion ?? registry?.version;
const failures = [];

if (runtime.metadata?.architectureVersion !== "1.0.0") failures.push(`Expected architectureVersion 1.0.0, got ${runtime.metadata?.architectureVersion ?? "missing"}.`);
if ((runtime.metadata?.runtimeVersion ?? runtime.metadata?.schemaVersion) !== "game-runtime-v1") failures.push(`Expected runtimeVersion game-runtime-v1, got ${runtime.metadata?.runtimeVersion ?? runtime.metadata?.schemaVersion ?? "missing"}.`);
if ((runtime.metadata?.contentVersion ?? 0) < 20) failures.push(`Expected contentVersion 20 or newer, got ${runtime.metadata?.contentVersion ?? "missing"}.`);
if (version !== "1.0.0") failures.push(`Expected universalDiscoveryRegistryVersion 1.0.0, got ${version ?? "missing"}.`);
if (!count(runtime.discoveryCategories)) failures.push("Discovery categories are missing.");
if (!count(runtime.discoverySubcategories)) failures.push("Discovery subcategories are missing.");
if (!count(runtime.discoveryRarities)) failures.push("Discovery rarities are missing.");
if (!count(records)) failures.push("Discovery records are missing.");
if (!count(runtime.discoveryCollections)) failures.push("Discovery collections are missing.");
if (!count(runtime.discoveryChains)) failures.push("Discovery chains are missing.");
if (!count(registry?.entityTypes)) failures.push("Universal Registry entity types are missing.");
if (!count(registry?.milestones)) failures.push("Universal Registry milestones are missing.");
if (missingRecordIds.length) failures.push(`Missing required Discovery records: ${missingRecordIds.join(", ")}.`);

const report = {
  ok: failures.length === 0,
  metadata: {
    architectureVersion: runtime.metadata?.architectureVersion,
    runtimeVersion: runtime.metadata?.runtimeVersion ?? runtime.metadata?.schemaVersion,
    contentVersion: runtime.metadata?.contentVersion,
    universalDiscoveryRegistryVersion: version,
    checksum: runtime.metadata?.checksum
  },
  counts: {
    categories: count(runtime.discoveryCategories),
    subcategories: count(runtime.discoverySubcategories),
    rarities: count(runtime.discoveryRarities),
    records: count(records),
    collections: count(runtime.discoveryCollections),
    chains: count(runtime.discoveryChains),
    registryEntityTypes: count(registry?.entityTypes),
    registryMilestones: count(registry?.milestones)
  },
  missingRecordIds,
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
