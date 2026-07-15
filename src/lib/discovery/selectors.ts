import { resolveRuntimeAsset, type GameRuntimeData } from "@/lib/canonical-runtime";
import { asDiscoveryRuntime } from "./runtime-adapter";
import type {
  DiscoveryCategory,
  DiscoveryChain,
  DiscoveryCollection,
  DiscoveryRarity,
  DiscoveryRecord,
  DiscoveryRuntimeContract
} from "./types";

function sortByOrderThenName<T extends { order?: number; displayName?: string; name?: string; id: string }>(items: T[]) {
  return [...items].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999) || (a.displayName ?? a.name ?? a.id).localeCompare(b.displayName ?? b.name ?? b.id));
}

export function isPublishedDiscovery(record: DiscoveryRecord) {
  const state = String(record.publishState ?? record.status ?? "published").toLowerCase();
  return Boolean(record.id) && !["draft", "deprecated", "hidden", "disabled"].includes(state);
}

export function resolveDiscoveryCategories(runtime: DiscoveryRuntimeContract | GameRuntimeData): DiscoveryCategory[] {
  return sortByOrderThenName(asDiscoveryRuntime(runtime).discoveryCategories ?? []);
}

export function resolveDiscoveryRarities(runtime: DiscoveryRuntimeContract | GameRuntimeData): DiscoveryRarity[] {
  return sortByOrderThenName(asDiscoveryRuntime(runtime).discoveryRarities ?? []);
}

export function resolvePublishedDiscoveries(runtime: DiscoveryRuntimeContract | GameRuntimeData): DiscoveryRecord[] {
  return sortByOrderThenName((asDiscoveryRuntime(runtime).discoveryRecords ?? []).filter(isPublishedDiscovery));
}

export function resolveDiscoveryById(runtime: DiscoveryRuntimeContract | GameRuntimeData, discoveryId: string) {
  return resolvePublishedDiscoveries(runtime).find((record) => record.id === discoveryId);
}

export function resolveDiscoveriesByCategory(runtime: DiscoveryRuntimeContract | GameRuntimeData, categoryId: string) {
  return resolvePublishedDiscoveries(runtime).filter((record) => record.categoryId === categoryId);
}

export function resolveDiscoveryCollection(runtime: DiscoveryRuntimeContract | GameRuntimeData, collectionId: string): DiscoveryCollection | undefined {
  return (asDiscoveryRuntime(runtime).discoveryCollections ?? []).find((collection) => collection.id === collectionId);
}

export function resolveDiscoveryChain(runtime: DiscoveryRuntimeContract | GameRuntimeData, chainId: string): DiscoveryChain | undefined {
  return (asDiscoveryRuntime(runtime).discoveryChains ?? []).find((chain) => chain.id === chainId);
}

export function resolveRarity(runtime: DiscoveryRuntimeContract | GameRuntimeData, rarityId?: string) {
  if (!rarityId) return undefined;
  const lower = rarityId.toLowerCase();
  return resolveDiscoveryRarities(runtime).find((rarity) => rarity.id.toLowerCase() === lower || rarity.displayName?.toLowerCase() === lower || rarity.name?.toLowerCase() === lower);
}

export function resolveDiscoveryAsset(runtime: GameRuntimeData, discovery: DiscoveryRecord) {
  const key = discovery.artKey ?? discovery.iconKey ?? discovery.assetSemanticKey;
  const asset = key ? runtime.assets.find((candidate) => candidate.artKey === key || candidate.id === key) : undefined;
  return resolveRuntimeAsset({ artKey: discovery.artKey, iconKey: discovery.iconKey, name: discovery.name ?? discovery.id, displayName: discovery.displayName }, asset);
}

export function resolveDiscoveryRegistryPolicy(runtime: DiscoveryRuntimeContract | GameRuntimeData) {
  const discovery = asDiscoveryRuntime(runtime);
  return {
    registry: discovery.universalDiscoveryRegistry,
    identity: discovery.universalObjectIdentityContract,
    naming: discovery.namingPolicy,
    attribution: discovery.attributionPolicy
  };
}

export function resolveDiscoveryDiagnostics(runtime: DiscoveryRuntimeContract | GameRuntimeData) {
  const discovery = asDiscoveryRuntime(runtime);
  const records = discovery.discoveryRecords ?? [];
  const published = records.filter(isPublishedDiscovery);
  const malformed = records.filter((record) => !record.id || !record.categoryId || !(record.rarityId ?? record.rarity));
  return {
    records: records.length,
    published: published.length,
    malformed: malformed.map((record) => record.id || "missing-id")
  };
}
