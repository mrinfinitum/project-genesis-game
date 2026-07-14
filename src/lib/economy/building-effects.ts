import type { GameRuntimeData } from "@/lib/canonical-runtime";
import { getBuildingResourceEffects, getProducerDefinitions } from "./contracts";

export function indexBuildingResourceEffects(content: GameRuntimeData) {
  const byBuildingId = new Map<string, ReturnType<typeof getBuildingResourceEffects>>();
  for (const effect of getBuildingResourceEffects(content)) {
    const current = byBuildingId.get(effect.buildingId) ?? [];
    current.push(effect);
    byBuildingId.set(effect.buildingId, current);
  }
  return byBuildingId;
}

export function indexResourceProducersBySource(content: GameRuntimeData) {
  const bySource = new Map<string, ReturnType<typeof getProducerDefinitions>>();
  for (const producer of getProducerDefinitions(content)) {
    const key = `${producer.sourceType}:${producer.sourceId}`;
    const current = bySource.get(key) ?? [];
    current.push(producer);
    bySource.set(key, current);
  }
  return bySource;
}
