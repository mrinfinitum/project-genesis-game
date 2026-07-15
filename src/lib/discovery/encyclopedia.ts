import type { GameRuntimeData } from "@/lib/canonical-runtime";
import { resolveDiscoveryAsset, resolveDiscoveryCategories, resolvePublishedDiscoveries, resolveRarity } from "./selectors";
import type { DiscoveryCatalogViewModel, DiscoveryJournalState, RegistryRecord } from "./types";

function stateForObject(journal: DiscoveryJournalState, objectId: string) {
  if (journal.collectedObjectIds.includes(objectId)) return "collected";
  if (journal.decodedObjectIds.includes(objectId)) return "decoded";
  if (journal.analyzedObjectIds.includes(objectId)) return "analyzed";
  if (journal.identifiedObjectIds.includes(objectId)) return "identified";
  if (journal.detectedObjectIds.includes(objectId)) return "detected";
  return "unknown";
}

export function composeDiscoveryCatalogView(runtime: GameRuntimeData, journal: DiscoveryJournalState, registryRecords: Map<string, RegistryRecord | null> = new Map()): DiscoveryCatalogViewModel[] {
  const categories = new Map(resolveDiscoveryCategories(runtime).map((category) => [category.id, category]));
  return resolvePublishedDiscoveries(runtime).map((discovery) => {
    const objectId = discovery.id;
    const registry = registryRecords.get(objectId) ?? undefined;
    const asset = resolveDiscoveryAsset(runtime, discovery);
    return {
      discovery,
      rarity: resolveRarity(runtime, discovery.rarityId ?? discovery.rarity),
      category: discovery.categoryId ? categories.get(discovery.categoryId) : undefined,
      personalState: stateForObject(journal, objectId),
      registryState: journal.pendingDiscoveryClaims.some((claim) => claim.discoveryId === discovery.id) ? "pending_verification" : registry?.firstDiscoveredAt ? "globally_discovered" : "unknown",
      registry,
      displayName: registry?.approvedName ?? discovery.displayName ?? discovery.name ?? discovery.id,
      imagePath: asset.path
    };
  });
}

export function resolveEncyclopediaSummary(discovery: { encyclopedia?: Record<string, unknown>; description?: string }) {
  const summary = discovery.encyclopedia?.summary ?? discovery.encyclopedia?.teaser ?? discovery.description;
  return typeof summary === "string" ? summary : "Encyclopedia content will appear when Studio publishes this entry.";
}
