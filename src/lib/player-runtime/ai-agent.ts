import type { AiAgentAnimationProfile, AiAgentDefinition, AiAgentPersonalityDefinition, AiAgentVariantDefinition, AutomationPresentation, GameRuntimeData } from "@/lib/canonical-runtime";
import type { PlayerRuntimeState } from "./types";

export const FALLBACK_AI_AGENT_ID = "ai-agent-default-companion";

export type AiAgentAvailability = {
  available: boolean;
  locked: boolean;
  reason?: string;
};

export type AiAgentCustomization = {
  selectedAiAgentId: string;
  selectedAiAgentVariantId: string;
  availableAgents: AiAgentDefinition[];
  lockedAgents: Array<AiAgentDefinition & { lockReason?: string }>;
  availableVariants: AiAgentVariantDefinition[];
  lockedVariants: Array<AiAgentVariantDefinition & { lockReason?: string }>;
};

export type ResolvedAiAgentAsset = {
  openArtKey: string;
  blinkArtKey: string;
  offlineArtKey: string;
  workingArtKey: string;
  ringArtKey: string;
  variantId?: string;
  source: "canonical" | "fallback";
};

export const FALLBACK_AI_AGENT: AiAgentDefinition = {
  id: FALLBACK_AI_AGENT_ID,
  displayName: "Noveris Assistant",
  personalityId: "fallback-support",
  animationProfileId: "fallback-subtle-blink",
  rarity: "Common",
  description: "A compact AI companion that preserves the current automation loop until canonical agents are published.",
  assetKeys: {
    portraitOpen: "auto_robot_icon",
    portraitBlink: "auto_robot_blink_icon",
    portraitClosed: "auto_robot_blink_icon",
    portraitOffline: "auto_robot_blink_icon",
    portraitWorking: "auto_robot_icon",
    ring: "auto_robot_circle"
  }
};

export const FALLBACK_AI_AGENT_PERSONALITY: AiAgentPersonalityDefinition = {
  id: "fallback-support",
  displayName: "Supportive",
  description: "Focused on steady Labor assistance."
};

export const FALLBACK_AI_AGENT_ANIMATION_PROFILE: AiAgentAnimationProfile = {
  id: "fallback-subtle-blink",
  blinkMinSeconds: 4.8,
  blinkMaxSeconds: 8.4,
  blinkDurationMs: 120,
  doubleBlinkChance: 0.18,
  blinkWhenOffline: false
};

export const FALLBACK_AUTOMATION_PRESENTATION: Required<Pick<AutomationPresentation, "title" | "assistanceLabel" | "onlineLabel" | "offlineLabel" | "statusOnlineLabel" | "statusOfflineLabel" | "profileTitle" | "defaultAiAgentId">> = {
  title: "AI Agent",
  assistanceLabel: "Labor Assistance",
  onlineLabel: "Agent: Online",
  offlineLabel: "Agent: Offline",
  statusOnlineLabel: "Online",
  statusOfflineLabel: "Offline",
  profileTitle: "AI Agent Profile",
  defaultAiAgentId: FALLBACK_AI_AGENT_ID
};

function isPublishedAiRecord(record: { status?: string; approvalState?: string; publishState?: string }) {
  const status = record.status?.toLowerCase();
  const approvalState = record.approvalState?.toLowerCase();
  const publishState = record.publishState?.toLowerCase();
  if (publishState && publishState !== "published") return false;
  if (approvalState && approvalState !== "approved") return false;
  return !status || ["available", "published", "ready"].includes(status);
}

function canonicalAgents(content: GameRuntimeData) {
  return Array.isArray(content.aiAgents) ? content.aiAgents.filter((agent) => typeof agent.id === "string" && agent.id.trim() && isPublishedAiRecord(agent)) : [];
}

function canonicalVariants(content: GameRuntimeData) {
  return Array.isArray(content.aiAgentVariants) ? content.aiAgentVariants.filter((variant) => typeof variant.id === "string" && variant.id.trim() && isPublishedAiRecord(variant)) : [];
}

function agentDisplayName(agent: AiAgentDefinition) {
  return agent.displayName ?? agent.name ?? agent.id;
}

function variantDisplayName(variant: AiAgentVariantDefinition) {
  return variant.shortDisplayName ?? variant.displayName ?? variant.id;
}

export function resolveAutomationPresentation(content: GameRuntimeData) {
  const presentation = content.automationPresentation ?? {};
  return {
    ...FALLBACK_AUTOMATION_PRESENTATION,
    ...presentation,
    title: presentation.title ?? presentation.displayName ?? FALLBACK_AUTOMATION_PRESENTATION.title,
    assistanceLabel: presentation.assistanceLabel ?? presentation.powerLabel ?? FALLBACK_AUTOMATION_PRESENTATION.assistanceLabel,
    onlineLabel: presentation.onlineLabel ?? presentation.enabledLabel ?? FALLBACK_AUTOMATION_PRESENTATION.onlineLabel,
    offlineLabel: presentation.offlineLabel ?? presentation.disabledLabel ?? FALLBACK_AUTOMATION_PRESENTATION.offlineLabel,
    statusOnlineLabel: presentation.statusOnlineLabel ?? presentation.enabledLabel ?? FALLBACK_AUTOMATION_PRESENTATION.statusOnlineLabel,
    statusOfflineLabel: presentation.statusOfflineLabel ?? presentation.disabledLabel ?? FALLBACK_AUTOMATION_PRESENTATION.statusOfflineLabel
  };
}

export function resolveDefaultAiAgentId(content: GameRuntimeData) {
  const presentation = resolveAutomationPresentation(content);
  const rootDefault = typeof content.defaultAiAgentId === "string" ? content.defaultAiAgentId : undefined;
  const profileDefault = typeof content.clientProfiles.default?.defaultAiAgentId === "string"
    ? content.clientProfiles.default.defaultAiAgentId
    : undefined;
  const agentDefault = canonicalAgents(content).find((agent) => agent.defaultForNewPlayers)?.id;
  const firstCanonical = canonicalAgents(content)[0]?.id;
  return rootDefault ?? profileDefault ?? presentation.defaultAiAgentId ?? agentDefault ?? firstCanonical ?? FALLBACK_AI_AGENT_ID;
}

export function resolveDefaultAiAgentVariantId(content: GameRuntimeData, agentId = resolveDefaultAiAgentId(content)) {
  const agent = canonicalAgents(content).find((item) => item.id === agentId);
  const variants = canonicalVariants(content).filter((variant) => variant.agentId === agentId);
  return agent?.baseVariantId ?? variants.find((variant) => variant.unlockRequirements?.default === true)?.id ?? variants[0]?.id ?? "AI-VARIANT-FALLBACK";
}

export function resolveSelectedAiAgent(content: GameRuntimeData, state?: Pick<PlayerRuntimeState, "aiAgent">) {
  const agents = canonicalAgents(content);
  const selectedId = state?.aiAgent?.selectedAiAgentId ?? resolveDefaultAiAgentId(content);
  const selected = agents.find((agent) => agent.id === selectedId && isAiAgentUnlocked(content, agent.id, state));
  if (selected) return { agent: selected, source: "canonical" as const, unresolvedSelectedAiAgentId: undefined };

  const canonicalDefault = agents.find((agent) => agent.id === resolveDefaultAiAgentId(content)) ?? agents[0];
  if (canonicalDefault) {
    return {
      agent: canonicalDefault,
      source: "canonical" as const,
      unresolvedSelectedAiAgentId: selectedId !== canonicalDefault.id ? selectedId : undefined
    };
  }

  return {
    agent: FALLBACK_AI_AGENT,
    source: "fallback" as const,
    unresolvedSelectedAiAgentId: selectedId !== FALLBACK_AI_AGENT_ID ? selectedId : undefined
  };
}

export function resolveSelectedAiAgentVariant(content: GameRuntimeData, state?: Pick<PlayerRuntimeState, "aiAgent">) {
  const { agent, source, unresolvedSelectedAiAgentId } = resolveSelectedAiAgent(content, state);
  const variants = canonicalVariants(content).filter((variant) => variant.agentId === agent.id);
  const defaultVariantId = resolveDefaultAiAgentVariantId(content, agent.id);
  const selectedId = state?.aiAgent?.selectedAiAgentVariantId ?? defaultVariantId;
  const selected = variants.find((variant) => variant.id === selectedId && isAiAgentVariantUnlocked(content, variant.id, state));
  if (selected) return { agent, variant: selected, source, unresolvedSelectedAiAgentId, unresolvedSelectedAiAgentVariantId: undefined };

  const fallbackVariant = variants.find((variant) => variant.id === defaultVariantId) ?? variants[0];
  if (fallbackVariant) {
    return {
      agent,
      variant: fallbackVariant,
      source,
      unresolvedSelectedAiAgentId,
      unresolvedSelectedAiAgentVariantId: selectedId !== fallbackVariant.id ? selectedId : undefined
    };
  }

  return {
    agent,
    variant: undefined,
    source,
    unresolvedSelectedAiAgentId,
    unresolvedSelectedAiAgentVariantId: selectedId !== "AI-VARIANT-FALLBACK" ? selectedId : undefined
  };
}

export function resolveAiAgentAsset(content: GameRuntimeData, state?: Pick<PlayerRuntimeState, "aiAgent">): ResolvedAiAgentAsset {
  const resolved = resolveSelectedAiAgentVariant(content, state);
  const agentKeys = resolved.agent.assetKeys ?? {};
  const variantKeys = resolved.variant?.assetKeys ?? {};
  return {
    openArtKey: variantKeys.open ?? agentKeys.open ?? agentKeys.portraitOpen ?? resolved.agent.eyesOpenAssetKey ?? FALLBACK_AI_AGENT.assetKeys?.portraitOpen ?? "auto_robot_icon",
    blinkArtKey: variantKeys.blink ?? agentKeys.blink ?? agentKeys.portraitBlink ?? agentKeys.portraitClosed ?? resolved.agent.eyesBlinkAssetKey ?? resolved.agent.eyesClosedAssetKey ?? FALLBACK_AI_AGENT.assetKeys?.portraitBlink ?? "auto_robot_blink_icon",
    offlineArtKey: variantKeys.offline ?? agentKeys.offline ?? agentKeys.portraitOffline ?? agentKeys.portraitClosed ?? resolved.agent.expressionAssets?.offline ?? resolved.agent.eyesClosedAssetKey ?? FALLBACK_AI_AGENT.assetKeys?.portraitOffline ?? "auto_robot_blink_icon",
    workingArtKey: variantKeys.working ?? agentKeys.working ?? agentKeys.portraitWorking ?? resolved.agent.expressionAssets?.working ?? FALLBACK_AI_AGENT.assetKeys?.portraitWorking ?? "auto_robot_icon",
    ringArtKey: variantKeys.head ?? agentKeys.head ?? agentKeys.ring ?? resolved.agent.headAssetKey ?? FALLBACK_AI_AGENT.assetKeys?.ring ?? "auto_robot_circle",
    variantId: resolved.variant?.id,
    source: resolved.source
  };
}

export function resolveAiAgentAnimationProfile(content: GameRuntimeData, state?: Pick<PlayerRuntimeState, "aiAgent">): AiAgentAnimationProfile {
  const { agent } = resolveSelectedAiAgent(content, state);
  const canonical = content.aiAgentAnimationProfiles?.find((profile) => profile.id === agent.animationProfileId);
  return canonical ?? FALLBACK_AI_AGENT_ANIMATION_PROFILE;
}

export function resolveAiAgentAvailability(content: GameRuntimeData, agentId: string, state?: PlayerRuntimeState): AiAgentAvailability {
  const agent = canonicalAgents(content).find((item) => item.id === agentId) ?? (agentId === FALLBACK_AI_AGENT_ID ? FALLBACK_AI_AGENT : undefined);
  if (!agent) return { available: false, locked: true, reason: "Agent is not published in this runtime." };
  const requirements = agent.unlockRequirements;
  if (!requirements) return { available: true, locked: false };
  if (requirements.start) return { available: true, locked: false };
  if (requirements.eraId && state?.civilization.currentEraId !== requirements.eraId) {
    return { available: false, locked: true, reason: `Unlocks in ${requirements.eraId}.` };
  }
  return { available: true, locked: false };
}

export function isAiAgentUnlocked(content: GameRuntimeData, agentId: string, state?: Pick<PlayerRuntimeState, "aiAgent">) {
  const agent = canonicalAgents(content).find((item) => item.id === agentId);
  if (!agent) return false;
  if (agent.unlockRequirements?.default === true || agent.defaultForNewPlayers === true) return true;
  return state?.aiAgent?.unlockedAiAgentIds?.includes(agentId) === true;
}

export function isAiAgentVariantUnlocked(content: GameRuntimeData, variantId: string, state?: Pick<PlayerRuntimeState, "aiAgent">) {
  const variant = canonicalVariants(content).find((item) => item.id === variantId);
  if (!variant) return false;
  if (variant.unlockRequirements?.default === true) return true;
  return state?.aiAgent?.unlockedAiAgentVariantIds?.includes(variantId) === true;
}

export function resolveAvailableAiAgents(content: GameRuntimeData, state?: Pick<PlayerRuntimeState, "aiAgent">) {
  return canonicalAgents(content).filter((agent) => isAiAgentUnlocked(content, agent.id, state));
}

export function resolveAvailableAiAgentVariants(content: GameRuntimeData, agentId: string, state?: Pick<PlayerRuntimeState, "aiAgent">) {
  return canonicalVariants(content).filter((variant) => variant.agentId === agentId && isAiAgentVariantUnlocked(content, variant.id, state));
}

export function resolveAiAgentVisualState(enabled: boolean, preferred: "idle" | "blink" | "working" | "offline" = "idle") {
  if (!enabled) return "offline" as const;
  return preferred;
}

export function resolveAiAgentPortraitAsset(content: GameRuntimeData, state: Pick<PlayerRuntimeState, "aiAgent"> | undefined, visualState: "idle" | "blink" | "working" | "offline") {
  const asset = resolveAiAgentAsset(content, state);
  if (visualState === "offline") return asset.offlineArtKey;
  if (visualState === "blink") return asset.blinkArtKey;
  if (visualState === "working") return asset.workingArtKey;
  return asset.openArtKey;
}

export function selectAiAgentCustomization(content: GameRuntimeData, state?: PlayerRuntimeState): AiAgentCustomization {
  const selected = resolveSelectedAiAgentVariant(content, state);
  const agents = canonicalAgents(content);
  const list = agents.length ? agents : [FALLBACK_AI_AGENT];
  const availableAgents: AiAgentDefinition[] = [];
  const lockedAgents: Array<AiAgentDefinition & { lockReason?: string }> = [];

  for (const agent of list) {
    const availability = resolveAiAgentAvailability(content, agent.id, state);
    if (availability.available) {
      availableAgents.push(agent);
    } else {
      lockedAgents.push({ ...agent, lockReason: availability.reason });
    }
  }

  const variants = canonicalVariants(content).filter((variant) => variant.agentId === selected.agent.id);
  const availableVariants = variants.filter((variant) => isAiAgentVariantUnlocked(content, variant.id, state));
  const lockedVariants = variants.filter((variant) => !isAiAgentVariantUnlocked(content, variant.id, state)).map((variant) => ({ ...variant, lockReason: variant.unlockText ?? "Locked" }));

  return { selectedAiAgentId: selected.agent.id, selectedAiAgentVariantId: selected.variant?.id ?? resolveDefaultAiAgentVariantId(content, selected.agent.id), availableAgents, lockedAgents, availableVariants, lockedVariants };
}

export function aiAgentName(agent: AiAgentDefinition) {
  return agentDisplayName(agent);
}

export function aiAgentPersonality(content: GameRuntimeData, agent: AiAgentDefinition) {
  return content.aiAgentPersonalities?.find((personality) => personality.id === agent.personalityId) ?? FALLBACK_AI_AGENT_PERSONALITY;
}

export function aiAgentVariantName(variant?: AiAgentVariantDefinition) {
  return variant ? variantDisplayName(variant) : undefined;
}
