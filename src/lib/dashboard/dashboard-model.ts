import type { GameRuntimeData, RuntimeContentState, UpgradeDefinition } from "@/lib/canonical-runtime";
import { dashboardDemoPlayerState } from "@/content/mock/dashboard-demo-state";
import { getEconomyWarnings, getPrimaryHudResources } from "@/lib/player-runtime/economy";

export type DashboardPlayerStateSource = "player-runtime" | "default-player-state" | "demo-fixture";
export type DashboardMode = "canonical" | "demo";
export type AlignmentAxis = "Industry" | "Technology" | "Cyber" | "Nature" | "Corporate";

export type DashboardPlayerState = {
  source: DashboardPlayerStateSource;
  sourceLabel: string;
  civilizationName?: string;
  currentEraId?: string;
  economyBalances?: Record<string, number>;
  economyRates?: Record<string, number>;
  resourceInventory: Record<string, number>;
  resourceRates: Record<string, number>;
  resourceStorageLimits?: Record<string, number>;
  upgradeLevels: Record<string, number>;
  clickOutput?: {
    resourceId?: string;
    label?: string;
    amount: number;
    lastGain?: number;
    wasCritical?: boolean;
    perClickLabel: string;
  };
  automation?: {
    label: string;
    amountPerSecond: number;
    enabled: boolean;
  };
  criticalStats?: {
    chancePercent: number;
    multiplier: number;
  };
  objective?: {
    title: string;
    description?: string;
    progressCurrent?: number;
    progressTarget?: number;
    focusResourceId?: string;
    discoveryPercent?: number;
    automationTier?: string;
  };
  leaderboard?: Array<{ name: string; score: number }>;
  activeEvent?: {
    title: string;
    description?: string;
    timerLabel?: string;
  };
  alignment?: Record<AlignmentAxis, number>;
  civilizationPrediction?: string;
  boosts?: Array<{ name: string; value: string; remainingSeconds?: number }>;
  colonyProgressLabel?: string;
};

export type DashboardHudResource = {
  resourceId: string;
  label: string;
  iconKey?: string;
  artKey?: string;
  category: string;
  color?: string;
  amount: number;
  rate?: number;
  provenance: "canonical-definition+player-state" | "canonical-definition+default-zero";
};

export type DashboardJourney = {
  previous?: GameRuntimeData["eras"][number];
  current: GameRuntimeData["eras"][number];
  next?: GameRuntimeData["eras"][number];
};

export type DashboardUpgradeRow = {
  upgrade: UpgradeDefinition;
  level: number;
  cost: number;
  effect: number;
  unlocked: boolean;
  visible: boolean;
  affordable: boolean;
};

export type DashboardModel = {
  mode: DashboardMode;
  dataSourceLabel: string;
  runtimeState?: RuntimeContentState;
  playerState: DashboardPlayerState;
  currentEra: GameRuntimeData["eras"][number];
  journey: DashboardJourney;
  hudResources: DashboardHudResource[];
  upgradeRows: DashboardUpgradeRow[];
  alignment: Record<AlignmentAxis, number>;
  alignmentLabel: string;
  civilizationPrediction: string;
  economyWarnings: string[];
  missingSystems: {
    civilizationName: boolean;
    playerResources: boolean;
    objective: boolean;
    leaderboard: boolean;
    activeEvent: boolean;
    boosts: boolean;
  };
};

export const CANONICAL_ALIGNMENT_AXES: AlignmentAxis[] = ["Industry", "Technology", "Cyber", "Nature", "Corporate"];

function canUseDemoState(runtimeState?: RuntimeContentState) {
  return !runtimeState || runtimeState.configuredMode === "mock" || runtimeState.activeSource === "mock";
}

export function createDefaultPlayerState(content: GameRuntimeData): DashboardPlayerState {
  const startEra = content.eras.find((era) => era.unlockRequirements?.start) ?? content.eras[0];

  return {
    source: "default-player-state",
    sourceLabel: "Default Player State",
    currentEraId: startEra?.id,
    resourceInventory: {},
    resourceRates: {},
    upgradeLevels: {},
    alignment: {
      Industry: 0,
      Technology: 0,
      Cyber: 0,
      Nature: 0,
      Corporate: 0
    }
  };
}

export function getCurrentJourney(eras: GameRuntimeData["eras"], currentEraId: string): DashboardJourney {
  const ordered = [...eras].sort((a, b) => a.index - b.index);
  const currentIndex = Math.max(0, ordered.findIndex((era) => era.id === currentEraId));
  const current = ordered[currentIndex] ?? ordered[0];

  return {
    previous: currentIndex > 0 ? ordered[currentIndex - 1] : undefined,
    current,
    next: currentIndex < ordered.length - 1 ? ordered[currentIndex + 1] : undefined
  };
}

export function resolveUpgradeCost(upgrade: UpgradeDefinition, level: number) {
  return Math.round(upgrade.baseCost * upgrade.costGrowthRate ** Math.max(0, level));
}

export function resolveUpgradeEffect(upgrade: UpgradeDefinition, level: number) {
  return Number((upgrade.baseEffectValue * upgrade.effectGrowthRate ** Math.max(0, level)).toFixed(2));
}

export function evaluateUnlockRequirements(upgrade: UpgradeDefinition, player: DashboardPlayerState, currentEraId: string) {
  const requirements = upgrade.unlockRequirements ?? upgrade.visibilityRules?.availableRequirements;

  if (!requirements) return true;
  if (requirements.eraId && requirements.eraId !== currentEraId) return false;
  if (requirements.upgradeId && (player.upgradeLevels[requirements.upgradeId] ?? 0) < (requirements.upgradeLevel ?? 1)) return false;
  if (requirements.resourceId && (player.resourceInventory[requirements.resourceId] ?? 0) < (requirements.resourceAmount ?? 0)) return false;

  return true;
}

export function evaluateVisibilityRules(upgrade: UpgradeDefinition, currentEraId: string) {
  const rules = upgrade.visibilityRules;

  if (!rules) return true;
  if (rules.hideUntilEraId && rules.hideUntilEraId !== currentEraId) return false;

  return rules.defaultState !== "hidden";
}

export function getDashboardHudResourceConfig(content: GameRuntimeData) {
  return getPrimaryHudResources(content);
}

function buildHudResources(content: GameRuntimeData, player: DashboardPlayerState): DashboardHudResource[] {
  return getDashboardHudResourceConfig(content)
    .map((resource) => {
      const hasPlayerAmount = Object.prototype.hasOwnProperty.call(player.economyBalances ?? {}, resource.id);
      const hasPlayerRate = Object.prototype.hasOwnProperty.call(player.economyRates ?? {}, resource.id);

      return {
        resourceId: resource.id,
        label: resource.label ?? resource.displayName ?? resource.id,
        iconKey: resource.iconKey,
        artKey: resource.artKey,
        category: "Economy",
        color: resource.color,
        amount: hasPlayerAmount ? player.economyBalances?.[resource.id] ?? 0 : 0,
        rate: hasPlayerRate ? player.economyRates?.[resource.id] : undefined,
        provenance: hasPlayerAmount ? "canonical-definition+player-state" : "canonical-definition+default-zero"
      };
    });
}

function buildUpgradeRows(content: GameRuntimeData, player: DashboardPlayerState, currentEraId: string, activeCategoryId: string): DashboardUpgradeRow[] {
  const profile = content.clientProfiles.web ?? content.clientProfiles.default;
  const rowsVisible = profile.defaultUpgradeRowsVisible ?? 4;

  return content.upgrades
    .filter((upgrade) => upgrade.categoryId === activeCategoryId)
    .filter((upgrade) => upgrade.eraId === currentEraId || upgrade.visibilityRules?.showTeaser)
    .filter((upgrade) => evaluateVisibilityRules(upgrade, currentEraId))
    .sort((a, b) => {
      const teaserA = a.visibilityRules?.teaserOrder ?? a.order;
      const teaserB = b.visibilityRules?.teaserOrder ?? b.order;
      return teaserA - teaserB;
    })
    .slice(0, rowsVisible)
    .map((upgrade) => {
      const level = player.upgradeLevels[upgrade.id] ?? upgrade.defaultLevel;
      const cost = resolveUpgradeCost(upgrade, level);
      const unlocked = evaluateUnlockRequirements(upgrade, player, currentEraId);
      const costResourceId = upgrade.costResourceId;
      const availableAmount = costResourceId ? (player.resourceInventory[costResourceId] ?? 0) : Number.POSITIVE_INFINITY;

      return {
        upgrade,
        level,
        cost,
        effect: resolveUpgradeEffect(upgrade, level),
        unlocked,
        visible: true,
        affordable: unlocked && availableAmount >= cost
      };
    });
}

function resolveAlignment(player: DashboardPlayerState) {
  const alignment = player.alignment ?? {
    Industry: 0,
    Technology: 0,
    Cyber: 0,
    Nature: 0,
    Corporate: 0
  };
  const top = CANONICAL_ALIGNMENT_AXES.reduce((best, axis) => (alignment[axis] > alignment[best] ? axis : best), "Industry" as AlignmentAxis);
  const topValue = alignment[top];

  return {
    alignment,
    label: player.alignment ? "Player Alignment" : "Default Alignment",
    prediction: player.civilizationPrediction ?? (topValue > 0 ? "Identity Pending Canonical Definition" : "Unaligned")
  };
}

export function createDashboardModel(
  content: GameRuntimeData,
  options: {
    runtimeState?: RuntimeContentState;
    playerState?: DashboardPlayerState;
    activeEraId?: string;
    activeCategoryId?: string;
  } = {}
): DashboardModel {
  const mode: DashboardMode = canUseDemoState(options.runtimeState) && !options.playerState ? "demo" : "canonical";
  const playerState =
    options.playerState ??
    (mode === "demo"
      ? {
          ...dashboardDemoPlayerState,
          currentEraId: options.activeEraId ?? dashboardDemoPlayerState.currentEraId
        }
      : createDefaultPlayerState(content));
  const fallbackEraId = playerState.currentEraId ?? options.activeEraId ?? content.eras[0]?.id;
  const currentEra = content.eras.find((era) => era.id === fallbackEraId) ?? content.eras[0];
  const activeCategoryId = options.activeCategoryId ?? content.upgradeCategories[0]?.id ?? "";
  const alignment = resolveAlignment(playerState);
  const economyWarnings = getEconomyWarnings(content);

  return {
    mode,
    dataSourceLabel: options.runtimeState ? `${options.runtimeState.configuredMode} / ${options.runtimeState.activeSource}` : "storybook / demo",
    runtimeState: options.runtimeState,
    playerState,
    currentEra,
    journey: getCurrentJourney(content.eras, currentEra.id),
    hudResources: buildHudResources(content, playerState),
    upgradeRows: buildUpgradeRows(content, playerState, currentEra.id, activeCategoryId),
    alignment: alignment.alignment,
    alignmentLabel: alignment.label,
    civilizationPrediction: alignment.prediction,
    economyWarnings,
    missingSystems: {
      civilizationName: !playerState.civilizationName,
      playerResources: Object.keys(playerState.resourceInventory).length === 0,
      objective: !playerState.objective,
      leaderboard: !playerState.leaderboard?.length,
      activeEvent: !playerState.activeEvent,
      boosts: !playerState.boosts?.length
    }
  };
}
