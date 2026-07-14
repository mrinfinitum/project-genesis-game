import type { AiAgentAnimationProfile, AiAgentDefinition, AiAgentPersonalityDefinition, AutomationPresentation, GameRuntimeData } from "@/lib/canonical-runtime";
import type { PlayerRuntimeState } from "./types";

export const FALLBACK_AI_AGENT_ID = "ai-agent-default-companion";

export type AiAgentAvailability = {
  available: boolean;
  locked: boolean;
  reason?: string;
};

export type AiAgentCustomization = {
  selectedAiAgentId: string;
  availableAgents: AiAgentDefinition[];
  lockedAgents: Array<AiAgentDefinition & { lockReason?: string }>;
};

export type ResolvedAiAgentAsset = {
  openArtKey: string;
  blinkArtKey: string;
  offlineArtKey: string;
  workingArtKey: string;
  ringArtKey: string;
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
    portraitOffline: "auto_robot_icon",
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

function canonicalAgents(content: GameRuntimeData) {
  return Array.isArray(content.aiAgents) ? content.aiAgents.filter((agent) => typeof agent.id === "string" && agent.id.trim()) : [];
}

function agentDisplayName(agent: AiAgentDefinition) {
  return agent.displayName ?? agent.name ?? agent.id;
}

export function resolveAutomationPresentation(content: GameRuntimeData) {
  return {
    ...FALLBACK_AUTOMATION_PRESENTATION,
    ...(content.automationPresentation ?? {})
  };
}

export function resolveDefaultAiAgentId(content: GameRuntimeData) {
  const presentation = resolveAutomationPresentation(content);
  const profileDefault = typeof content.clientProfiles.default?.defaultAiAgentId === "string"
    ? content.clientProfiles.default.defaultAiAgentId
    : undefined;
  const firstCanonical = canonicalAgents(content)[0]?.id;
  return profileDefault ?? presentation.defaultAiAgentId ?? firstCanonical ?? FALLBACK_AI_AGENT_ID;
}

export function resolveSelectedAiAgent(content: GameRuntimeData, state?: Pick<PlayerRuntimeState, "aiAgent">) {
  const agents = canonicalAgents(content);
  const selectedId = state?.aiAgent?.selectedAiAgentId ?? resolveDefaultAiAgentId(content);
  const selected = agents.find((agent) => agent.id === selectedId);
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

export function resolveAiAgentAsset(content: GameRuntimeData, state?: Pick<PlayerRuntimeState, "aiAgent">): ResolvedAiAgentAsset {
  const resolved = resolveSelectedAiAgent(content, state);
  const keys = resolved.agent.assetKeys ?? {};
  return {
    openArtKey: typeof keys.portraitOpen === "string" ? keys.portraitOpen : FALLBACK_AI_AGENT.assetKeys?.portraitOpen ?? "auto_robot_icon",
    blinkArtKey: typeof keys.portraitBlink === "string" ? keys.portraitBlink : typeof keys.portraitClosed === "string" ? keys.portraitClosed : FALLBACK_AI_AGENT.assetKeys?.portraitBlink ?? "auto_robot_blink_icon",
    offlineArtKey: typeof keys.portraitOffline === "string" ? keys.portraitOffline : FALLBACK_AI_AGENT.assetKeys?.portraitOffline ?? "auto_robot_icon",
    workingArtKey: typeof keys.portraitWorking === "string" ? keys.portraitWorking : FALLBACK_AI_AGENT.assetKeys?.portraitWorking ?? "auto_robot_icon",
    ringArtKey: typeof keys.ring === "string" ? keys.ring : FALLBACK_AI_AGENT.assetKeys?.ring ?? "auto_robot_circle",
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

export function selectAiAgentCustomization(content: GameRuntimeData, state?: PlayerRuntimeState): AiAgentCustomization {
  const selected = resolveSelectedAiAgent(content, state).agent.id;
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

  return { selectedAiAgentId: selected, availableAgents, lockedAgents };
}

export function aiAgentName(agent: AiAgentDefinition) {
  return agentDisplayName(agent);
}

export function aiAgentPersonality(content: GameRuntimeData, agent: AiAgentDefinition) {
  return content.aiAgentPersonalities?.find((personality) => personality.id === agent.personalityId) ?? FALLBACK_AI_AGENT_PERSONALITY;
}
