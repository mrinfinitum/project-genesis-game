import type { GameRuntimeData } from "@/lib/canonical-runtime";
import { getScopeRules } from "./contracts";

export function resolveScopeRule(content: GameRuntimeData, economyId: string, scope: string) {
  return getScopeRules(content).find((rule) => rule.scope === scope && rule.appliesToEconomyIds.includes(economyId));
}

export function rollsToCivilization(content: GameRuntimeData, economyId: string, scope: string) {
  const rule = resolveScopeRule(content, economyId, scope);
  return !rule || rule.rollupBehavior === "rolls_to_civilization";
}
