import type { GameRuntimeData, UpgradeDefinition } from "@/lib/canonical-runtime";
import type { PlayerRuntimeState } from "./types";

export type AiAgentLaborAssistance = {
  enabled: boolean;
  baseAutomationRate: number;
  upgradeBonusRate: number;
  multiplier: number;
  totalRate: number;
  rawRate: number;
  automationLevel: number;
  nextLevelRate?: number;
  sourceBreakdown: {
    baseAutoClickPower: number;
    autoUpgradeBonus: number;
    autoClickRate: number;
    appliedWhileOffline: 0;
  };
};

export type AiAgentProgression = {
  level: number;
  displayLevel?: string;
  currentRate: number;
  nextLevelRate?: number;
  progress: number;
  maxLevel: number;
  unlockedAgentIds: string[];
  availableVariants: string[];
  source: "automation-upgrades";
};

function balanceNumber(content: GameRuntimeData, key: string, fallback: number) {
  const value = (content.balance as unknown as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function effectAtLevel(upgrade: UpgradeDefinition, level: number) {
  return Number((upgrade.baseEffectValue * upgrade.effectGrowthRate ** Math.max(0, level)).toFixed(2));
}

function autoUpgradeEffect(upgrade: UpgradeDefinition, level: number) {
  if (level <= 0) return 0;
  return effectAtLevel(upgrade, level - 1) * level;
}

export function isAutomationUpgrade(upgrade: UpgradeDefinition) {
  return upgrade.effectType.toLowerCase().includes("auto");
}

function automationUpgrades(content: GameRuntimeData) {
  return content.upgrades.filter(isAutomationUpgrade);
}

export function resolveAiAgentLaborAssistance(content: GameRuntimeData, state: PlayerRuntimeState): AiAgentLaborAssistance {
  const baseAutomationRate = balanceNumber(content, "baseAutoClickPower", 0);
  const multiplier = Math.max(0, balanceNumber(content, "baseAutoClickRate", 1));
  const upgradeBonusRate = automationUpgrades(content).reduce((sum, upgrade) => {
    const level = state.upgrades.levels[upgrade.id] ?? upgrade.defaultLevel ?? 0;
    return sum + autoUpgradeEffect(upgrade, level);
  }, 0);
  const rawRate = Number(((baseAutomationRate + upgradeBonusRate) * multiplier).toFixed(3));
  const enabled = state.production.automationEnabled === true;
  const totalRate = enabled ? Math.max(0, Math.floor(rawRate)) : 0;
  const automationLevel = automationUpgrades(content).reduce((sum, upgrade) => sum + Math.max(0, state.upgrades.levels[upgrade.id] ?? upgrade.defaultLevel ?? 0), 0);
  const nextLevelRate = automationUpgrades(content).reduce<number | undefined>((best, upgrade) => {
    const currentLevel = Math.max(0, state.upgrades.levels[upgrade.id] ?? upgrade.defaultLevel ?? 0);
    if (currentLevel >= upgrade.maxLevel) return best;
    const currentEffect = autoUpgradeEffect(upgrade, currentLevel);
    const nextEffect = autoUpgradeEffect(upgrade, currentLevel + 1);
    const candidate = Math.max(0, Math.floor((baseAutomationRate + upgradeBonusRate - currentEffect + nextEffect) * multiplier));
    return best === undefined ? candidate : Math.min(best, candidate);
  }, undefined);

  return {
    enabled,
    baseAutomationRate,
    upgradeBonusRate: Number(upgradeBonusRate.toFixed(3)),
    multiplier,
    totalRate,
    rawRate,
    automationLevel,
    nextLevelRate,
    sourceBreakdown: {
      baseAutoClickPower: baseAutomationRate,
      autoUpgradeBonus: Number(upgradeBonusRate.toFixed(3)),
      autoClickRate: multiplier,
      appliedWhileOffline: 0
    }
  };
}

export function resolveAiAgentProgression(content: GameRuntimeData, state: PlayerRuntimeState, selectedAiAgentId: string): AiAgentProgression {
  const assistance = resolveAiAgentLaborAssistance(content, state);
  const autoUpgrades = automationUpgrades(content);
  const maxLevel = autoUpgrades.reduce((sum, upgrade) => sum + Math.max(0, upgrade.maxLevel), 0);

  return {
    level: assistance.automationLevel,
    displayLevel: maxLevel > 0 ? `Automation Lv. ${assistance.automationLevel}` : undefined,
    currentRate: assistance.totalRate,
    nextLevelRate: assistance.nextLevelRate,
    progress: maxLevel > 0 ? Math.min(1, assistance.automationLevel / maxLevel) : 0,
    maxLevel,
    unlockedAgentIds: [selectedAiAgentId],
    availableVariants: [],
    source: "automation-upgrades"
  };
}
