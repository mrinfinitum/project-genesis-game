import type { GameRuntimeData } from "@/lib/canonical-runtime";
import type { DashboardPlayerState } from "@/lib/dashboard/dashboard-model";
import { aiAgentName, aiAgentPersonality, aiAgentVariantName, resolveAiAgentAnimationProfile, resolveAiAgentAsset, resolveAiAgentAvailability, resolveAutomationPresentation, resolveSelectedAiAgentVariant, selectAiAgentCustomization } from "./ai-agent";
import { resolveAiAgentLaborAssistance, resolveAiAgentProgression } from "./automation";
import { POPULATION_ECONOMY_ID, resolvePrimaryEconomyIdForCurrentEra } from "./economy";
import { getPrimaryHudResources } from "./initializer";
import { resolveUpgradeCost, resolveUpgradeEffect } from "./simulation";
import type { PlayerRuntimeState } from "./types";

export function selectHudEconomySlots(content: GameRuntimeData, currentEraId?: string) {
  return getPrimaryHudResources(content, currentEraId);
}

export function selectEconomyBalance(state: PlayerRuntimeState, economyId: string) {
  return state.economy.balances[economyId] ?? 0;
}

export function selectEconomyRate(state: PlayerRuntimeState, economyId: string) {
  return state.economy.rates[economyId] ?? 0;
}

export function selectClickPower(state: PlayerRuntimeState) {
  return state.production.clickPower;
}

export function selectAutoClickPower(state: PlayerRuntimeState) {
  return state.production.autoClickPower;
}

export function selectLastClickGain(state: PlayerRuntimeState) {
  return state.production.lastClickGain;
}

export function selectPopulation(state: PlayerRuntimeState) {
  return state.economy.balances[POPULATION_ECONOMY_ID] ?? state.civilization.population;
}

export function selectCriticalChance(state: PlayerRuntimeState) {
  return state.production.criticalChance;
}

export function selectCriticalMultiplier(state: PlayerRuntimeState) {
  return state.production.criticalMultiplier;
}

export function selectComboMultiplier(state: PlayerRuntimeState) {
  return state.production.comboMultiplier;
}

export function resolveAlignmentIdentity(content: GameRuntimeData, state: PlayerRuntimeState) {
  const values = state.alignment;
  const sorted = Object.entries(values).sort(([, a], [, b]) => b - a);
  const [dominant = ["industry", 0]] = sorted;

  if (dominant[1] <= 0) return "Unaligned";

  const canonicalIdentities = content.clientProfiles.web?.civilizationIdentities;
  if (canonicalIdentities && typeof canonicalIdentities === "object") {
    const match = (canonicalIdentities as Record<string, unknown>)[dominant[0]];
    if (typeof match === "string") return match;
    if (match && typeof match === "object" && "label" in match && typeof match.label === "string") return match.label;
  }

  return "Identity Pending Canonical Definition";
}

export function getUpgradeViewState(content: GameRuntimeData, state: PlayerRuntimeState, upgradeId: string) {
  const upgrade = content.upgrades.find((item) => item.id === upgradeId);
  if (!upgrade) return undefined;

  const level = state.upgrades.levels[upgrade.id] ?? upgrade.defaultLevel;
  const nextCost = resolveUpgradeCost(upgrade, level);
  const effect = resolveUpgradeEffect(upgrade, level);
  const availableAmount = upgrade.costResourceId ? (state.resources.inventory[upgrade.costResourceId] ?? 0) : Number.POSITIVE_INFINITY;
  const discovered = state.upgrades.discoveredIds.includes(upgrade.id);
  const unlocked = state.upgrades.unlockedIds.includes(upgrade.id);
  const maxed = level >= upgrade.maxLevel;

  return {
    upgrade,
    level,
    nextCost,
    effect,
    affordable: unlocked && !maxed && availableAmount >= nextCost,
    locked: !unlocked,
    discovered,
    maxed
  };
}

export function playerRuntimeToDashboardPlayerState(content: GameRuntimeData, state: PlayerRuntimeState): DashboardPlayerState {
  const primaryHudResources = selectHudEconomySlots(content, state.civilization.currentEraId);
  const primaryEconomyId = resolvePrimaryEconomyIdForCurrentEra(content, state.civilization.currentEraId);
  const clickResource = primaryHudResources.find((resource) => resource.id === primaryEconomyId);
  const now = Date.now();
  const activeBoosts = state.boosts.active.filter((boost) => Date.parse(boost.endsAt) > now);
  const economyBalances = { ...state.economy.balances, [POPULATION_ECONOMY_ID]: selectPopulation(state) };
  const resolvedAiAgent = resolveSelectedAiAgentVariant(content, state);
  const aiAgent = resolvedAiAgent.agent;
  const aiAgentVariant = resolvedAiAgent.variant;
  const aiAgentPersonalityDefinition = aiAgentPersonality(content, aiAgent);
  const automationPresentation = resolveAutomationPresentation(content);
  const aiAgentAnimation = resolveAiAgentAnimationProfile(content, state);
  const aiAgentAssistance = resolveAiAgentLaborAssistance(content, state);
  const aiAgentProgression = resolveAiAgentProgression(content, state, aiAgent.id);
  const aiAgentCustomization = selectAiAgentCustomization(content, state);

  return {
    source: "player-runtime",
    sourceLabel: "Local Player Runtime",
    civilizationName: state.civilization.civilizationName,
    currentEraId: state.civilization.currentEraId,
    economyBalances,
    economyRates: state.economy.rates,
    resourceInventory: state.resources.inventory,
    resourceRates: state.resources.productionRates,
    resourceStorageLimits: state.resources.storageLimits,
    upgradeLevels: state.upgrades.levels,
    clickOutput: clickResource
      ? {
          resourceId: clickResource.id,
          label: clickResource.label ?? clickResource.displayName ?? "Civilization Energy",
          amount: selectClickPower(state),
          lastGain: selectLastClickGain(state),
          wasCritical: state.production.lastClickWasCritical,
          perClickLabel: "per click"
        }
      : undefined,
    automation: {
      label: automationPresentation.title,
      amountPerSecond: aiAgentAssistance.totalRate,
      enabled: state.production.automationEnabled,
      assistanceLabel: automationPresentation.assistanceLabel,
      onlineLabel: automationPresentation.onlineLabel,
      offlineLabel: automationPresentation.offlineLabel,
      baseAutomationRate: aiAgentAssistance.baseAutomationRate,
      upgradeBonusRate: aiAgentAssistance.upgradeBonusRate,
      multiplier: aiAgentAssistance.multiplier,
      rawRate: aiAgentAssistance.rawRate,
      nextLevelRate: aiAgentAssistance.nextLevelRate,
      sourceBreakdown: aiAgentAssistance.sourceBreakdown
    },
    aiAgent: {
      selectedAiAgentId: aiAgent.id,
      selectedAiAgentVariantId: aiAgentVariant?.id,
      name: aiAgentName(aiAgent),
      variantName: aiAgentVariantName(aiAgentVariant),
      variantTier: aiAgentVariant?.tier,
      personality: aiAgentPersonalityDefinition.displayName ?? aiAgentPersonalityDefinition.name,
      rarity: aiAgent.rarity,
      description: aiAgent.description,
      presentation: {
        title: automationPresentation.title,
        assistanceLabel: automationPresentation.assistanceLabel,
        onlineLabel: automationPresentation.onlineLabel,
        offlineLabel: automationPresentation.offlineLabel,
        statusOnlineLabel: automationPresentation.statusOnlineLabel,
        statusOfflineLabel: automationPresentation.statusOfflineLabel,
        profileTitle: automationPresentation.profileTitle
      },
      asset: resolveAiAgentAsset(content, state),
      animation: {
        blinkMinSeconds: aiAgentAnimation.blinkMinSeconds ?? (typeof aiAgentAnimation.minIntervalMs === "number" ? aiAgentAnimation.minIntervalMs / 1000 : 4.8),
        blinkMaxSeconds: aiAgentAnimation.blinkMaxSeconds ?? (typeof aiAgentAnimation.maxIntervalMs === "number" ? aiAgentAnimation.maxIntervalMs / 1000 : 8.4),
        blinkDurationMs: aiAgentAnimation.blinkDurationMs ?? 120,
        doubleBlinkChance: aiAgentAnimation.doubleBlinkChance ?? 0.18,
        blinkWhenOffline: aiAgentAnimation.blinkWhenOffline === true,
        blinkEnabled: state.aiAgent.blinkEnabled,
        reducedAnimation: state.aiAgent.reducedAnimation || aiAgentAnimation.reducedMotion === true
      },
      availability: resolveAiAgentAvailability(content, aiAgent.id, state),
      progression: aiAgentProgression,
      customization: aiAgentCustomization
    },
    criticalStats: {
      chancePercent: selectCriticalChance(state),
      multiplier: selectCriticalMultiplier(state)
    },
    objective: undefined,
    leaderboard: undefined,
    activeEvent: state.events.activeEventId
      ? {
          title: state.events.activeEventId,
          timerLabel: state.events.activeEventEndsAt ? state.events.activeEventEndsAt : undefined
        }
      : undefined,
    alignment: {
      Industry: state.alignment.industry,
      Technology: state.alignment.technology,
      Cyber: state.alignment.cyber,
      Nature: state.alignment.nature,
      Corporate: state.alignment.corporate
    },
    civilizationPrediction: resolveAlignmentIdentity(content, state),
    boosts: activeBoosts.map((boost) => ({
      name: boost.id,
      value: `${boost.multiplier}x`,
      remainingSeconds: Math.max(0, Math.ceil((Date.parse(boost.endsAt) - now) / 1000))
    })),
    colonyProgressLabel: `${Math.round(state.colonies.nextColonyProgress)}%`
  };
}
