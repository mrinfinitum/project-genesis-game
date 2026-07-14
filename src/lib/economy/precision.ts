import type { GameRuntimeData } from "@/lib/canonical-runtime";
import { getBehaviorContract, getCalculationRules } from "./contracts";

export function precisionFor(content: GameRuntimeData, economyId: string) {
  const rounding = getCalculationRules(content).rounding;
  const integerIds = new Set(rounding?.integerEconomyIds ?? []);
  const contract = getBehaviorContract(content, economyId);
  return {
    internalPrecision: rounding?.internalPrecision ?? 4,
    displayPrecision: rounding?.displayPrecision ?? 2,
    integerOnly: integerIds.has(economyId) || contract?.integerOnly === true,
    canGoNegative: contract?.canGoNegative === true
  };
}

export function applyEconomyPrecision(content: GameRuntimeData, economyId: string, value: number, mode: "internal" | "display" = "internal") {
  const precision = precisionFor(content, economyId);
  const nonNegative = precision.canGoNegative ? value : Math.max(0, value);
  if (precision.integerOnly) return Math.floor(nonNegative);
  const decimals = mode === "display" ? precision.displayPrecision : precision.internalPrecision;
  return Number(nonNegative.toFixed(decimals));
}
