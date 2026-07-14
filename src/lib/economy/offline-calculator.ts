import type { GameRuntimeData } from "@/lib/canonical-runtime";
import { getOfflinePolicy } from "./contracts";
import type { ResourceRateResult } from "./rate-calculator";

export function clampOfflineSeconds(content: GameRuntimeData, economyId: string, elapsedSeconds: number) {
  const policy = getOfflinePolicy(content, economyId);
  if (!policy?.eligible) return 0;
  return Math.max(0, Math.min(elapsedSeconds, policy.maximumOfflineSeconds));
}

export function calculateOfflineGain(content: GameRuntimeData, result: ResourceRateResult, elapsedSeconds: number) {
  const eligibleSeconds = clampOfflineSeconds(content, result.economyId, elapsedSeconds);
  return result.offlineEligibleRate * eligibleSeconds;
}
