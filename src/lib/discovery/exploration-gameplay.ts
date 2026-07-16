import type { GameRuntimeData } from "@/lib/canonical-runtime";
import { applyResourceTransaction, createResourceTransaction } from "@/lib/economy/transaction-ledger";
import { CREDITS_ECONOMY_ID, RESEARCH_ECONOMY_ID } from "@/lib/player-runtime/economy";
import type { PlayerRuntimeState } from "@/lib/player-runtime/types";
import { normalizeDiscoveryJournal } from "./journal";
import type {
  ExplorationDiscoveryState,
  ExplorationEncyclopediaTier,
  ExplorationExpeditionRecord,
  ExplorationJournalEntry,
  ExplorationProbeMission,
  ExplorationScanJob,
  ExplorationScoreRecord,
  ExplorationSurveyRecord,
  ExplorationTarget
} from "./types";

const STATE_ORDER: ExplorationDiscoveryState[] = ["unknown", "detected", "probed", "scanned", "surveyed", "explored", "catalogued", "colonized"];
const SCAN_REVEALS: ExplorationScanJob["revealed"] = ["name", "class", "resources", "discoveries", "threats", "biome", "life", "registry"];

function clone<T>(value: T): T {
  return structuredClone(value);
}

function nowIso(now = new Date()) {
  return now.toISOString();
}

function addSeconds(now: Date, seconds: number) {
  return new Date(now.getTime() + seconds * 1000).toISOString();
}

function stableId(parts: Array<string | number | undefined>) {
  return parts.filter((part) => part !== undefined).join(":").replace(/[^a-zA-Z0-9:_-]/g, "_");
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Number(value.toFixed(2))));
}

function stateAtLeast(current: ExplorationDiscoveryState | undefined, next: ExplorationDiscoveryState) {
  const currentIndex = STATE_ORDER.indexOf(current ?? "unknown");
  const nextIndex = STATE_ORDER.indexOf(next);
  return STATE_ORDER[Math.max(currentIndex, nextIndex)] ?? next;
}

function encyclopediaFor(state: ExplorationDiscoveryState): ExplorationEncyclopediaTier {
  if (state === "catalogued" || state === "colonized") return "complete";
  if (state === "surveyed" || state === "explored") return "analyzed";
  if (state === "probed" || state === "scanned") return "known";
  return "unknown";
}

function pushJournalEntry(state: PlayerRuntimeState, target: ExplorationTarget, event: ExplorationJournalEntry["event"], timestamp: string) {
  const entry: ExplorationJournalEntry = {
    id: stableId(["exploration", event, target.id, timestamp]),
    targetId: target.id,
    targetType: target.type,
    label: target.label,
    event,
    occurredAt: timestamp
  };
  const existing = state.discovery.recentDiscoveries ?? [];
  state.discovery.recentDiscoveries = [entry, ...existing.filter((item) => item.id !== entry.id)].slice(0, 30);
}

function setExplorationState(state: PlayerRuntimeState, target: ExplorationTarget, nextState: ExplorationDiscoveryState, timestamp: string) {
  state.discovery = normalizeDiscoveryJournal(state.discovery);
  const current = state.discovery.explorationStates?.[target.id] ?? "unknown";
  const resolved = stateAtLeast(current, nextState);
  state.discovery.explorationStates = { ...(state.discovery.explorationStates ?? {}), [target.id]: resolved };
  state.discovery.encyclopediaProgress = { ...(state.discovery.encyclopediaProgress ?? {}), [target.id]: encyclopediaFor(resolved) };
  if (resolved !== "unknown" && !state.discovery.discoveredObjectIds.includes(target.id)) state.discovery.discoveredObjectIds.push(target.id);
  if (["detected", "probed", "scanned", "surveyed", "explored", "catalogued", "colonized"].includes(resolved) && !state.discovery.detectedObjectIds.includes(target.id)) state.discovery.detectedObjectIds.push(target.id);
  if (["scanned", "surveyed", "explored", "catalogued", "colonized"].includes(resolved) && !state.discovery.identifiedObjectIds.includes(target.id)) state.discovery.identifiedObjectIds.push(target.id);
  if (["explored", "catalogued", "colonized"].includes(resolved) && !state.discovery.analyzedObjectIds.includes(target.id)) state.discovery.analyzedObjectIds.push(target.id);
  pushJournalEntry(state, target, resolved === "scanned" ? "scanned" : resolved === "surveyed" ? "surveyed" : resolved === "catalogued" ? "catalogued" : resolved === "colonized" ? "colonized" : resolved === "probed" ? "probed" : "detected", timestamp);
}

function scoreFromSurvey(survey: ExplorationSurveyRecord | undefined, state: ExplorationDiscoveryState | undefined): Omit<ExplorationScoreRecord, "targetId" | "updatedAt"> {
  const surveyScore = survey
    ? (survey.surface + survey.resources + survey.life + survey.ruins + survey.hazards) / 5
    : 0;
  const stateIndex = Math.max(0, STATE_ORDER.indexOf(state ?? "unknown"));
  const exploration = clampPercent((stateIndex / (STATE_ORDER.length - 1)) * 100);
  const discovery = clampPercent((exploration + surveyScore) / 2);
  return {
    exploration,
    survey: clampPercent(surveyScore),
    discovery,
    completion: clampPercent(exploration * 0.45 + surveyScore * 0.45 + (state === "catalogued" || state === "colonized" ? 10 : 0))
  };
}

function updateScore(state: PlayerRuntimeState, target: ExplorationTarget, timestamp: string) {
  const survey = state.discovery.surveyRecords?.[target.id];
  const explorationState = state.discovery.explorationStates?.[target.id] ?? "unknown";
  state.discovery.explorationScores = {
    ...(state.discovery.explorationScores ?? {}),
    [target.id]: {
      targetId: target.id,
      ...scoreFromSurvey(survey, explorationState),
      updatedAt: timestamp
    }
  };
}

function scanDurationSeconds(target: ExplorationTarget) {
  const distancePenalty = Math.min(90, Math.round(target.distance / 2));
  const typePenalty = target.type === "planet" || target.type === "moon" ? 24 : target.type === "anomaly" ? 38 : 16;
  return Math.max(10, typePenalty + distancePenalty);
}

export function detectExplorationTarget(state: PlayerRuntimeState, target: ExplorationTarget, options: { now?: Date } = {}) {
  const next = clone(state);
  const timestamp = nowIso(options.now);
  next.discovery = normalizeDiscoveryJournal(next.discovery);
  setExplorationState(next, target, "detected", timestamp);
  updateScore(next, target, timestamp);
  next.updatedAt = timestamp;
  next.revision += 1;
  return next;
}

export function startExplorationScan(state: PlayerRuntimeState, target: ExplorationTarget, options: { now?: Date } = {}) {
  const next = detectExplorationTarget(state, target, options);
  const now = options.now ?? new Date();
  const timestamp = nowIso(now);
  const durationSeconds = scanDurationSeconds(target);
  const job: ExplorationScanJob = {
    id: stableId(["scan", target.id, timestamp]),
    targetId: target.id,
    targetType: target.type,
    status: "scanning",
    startedAt: timestamp,
    completesAt: addSeconds(now, durationSeconds),
    durationSeconds,
    revealed: SCAN_REVEALS
  };
  next.discovery.scanJobs = { ...(next.discovery.scanJobs ?? {}), [job.id]: job };
  next.updatedAt = timestamp;
  next.revision += 1;
  return { state: next, job };
}

export function completeExplorationScan(content: GameRuntimeData, state: PlayerRuntimeState, jobId: string, target: ExplorationTarget, options: { now?: Date } = {}) {
  const next = clone(state);
  const timestamp = nowIso(options.now);
  next.discovery = normalizeDiscoveryJournal(next.discovery);
  const job = next.discovery.scanJobs?.[jobId];
  if (!job) return { ok: false as const, state, reason: "scan_job_missing" };
  next.discovery.scanJobs = {
    ...(next.discovery.scanJobs ?? {}),
    [jobId]: { ...job, status: "completed", completedAt: timestamp }
  };
  setExplorationState(next, target, "scanned", timestamp);
  updateScore(next, target, timestamp);
  return { ok: true as const, state: applyExplorationRewards(content, next, target, "scan", { now: options.now }).state };
}

function probeDurationSeconds(target: ExplorationTarget) {
  return Math.max(18, Math.min(180, 18 + Math.round(target.distance * 1.4)));
}

export function launchExplorationProbe(state: PlayerRuntimeState, target: ExplorationTarget, options: { now?: Date } = {}) {
  const next = detectExplorationTarget(state, target, options);
  const now = options.now ?? new Date();
  const timestamp = nowIso(now);
  const mission: ExplorationProbeMission = {
    id: stableId(["probe", target.id, timestamp]),
    targetId: target.id,
    targetType: target.type,
    status: "traveling",
    launchedAt: timestamp,
    completesAt: addSeconds(now, probeDurationSeconds(target)),
    risk: target.rangeState === "visible_unresolved" ? 0.22 : 0.08,
    range: target.distance
  } as ExplorationProbeMission & { rangeState?: string };
  next.discovery.probeMissions = { ...(next.discovery.probeMissions ?? {}), [mission.id]: mission };
  next.updatedAt = timestamp;
  next.revision += 1;
  return { state: next, mission };
}

export function completeExplorationProbe(content: GameRuntimeData, state: PlayerRuntimeState, missionId: string, target: ExplorationTarget, options: { now?: Date; outcome?: ExplorationProbeMission["status"] } = {}) {
  const next = clone(state);
  const timestamp = nowIso(options.now);
  next.discovery = normalizeDiscoveryJournal(next.discovery);
  const mission = next.discovery.probeMissions?.[missionId];
  if (!mission) return { ok: false as const, state, reason: "probe_mission_missing" };
  const status = options.outcome ?? "completed";
  next.discovery.probeMissions = {
    ...(next.discovery.probeMissions ?? {}),
    [missionId]: { ...mission, status, completedAt: timestamp }
  };
  if (status === "completed") {
    setExplorationState(next, target, "probed", timestamp);
    updateScore(next, target, timestamp);
    return { ok: true as const, state: applyExplorationRewards(content, next, target, "probe", { now: options.now }).state };
  }
  pushJournalEntry(next, target, "detected", timestamp);
  next.updatedAt = timestamp;
  next.revision += 1;
  return { ok: true as const, state: next };
}

function deterministicPercent(targetId: string, salt: string, min: number, max: number) {
  let hash = 2166136261;
  for (const char of `${targetId}:${salt}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const ratio = (hash >>> 0) / 4294967295;
  return clampPercent(min + ratio * (max - min));
}

export function completeExplorationSurvey(content: GameRuntimeData, state: PlayerRuntimeState, target: ExplorationTarget, options: { now?: Date } = {}) {
  const next = clone(state);
  const timestamp = nowIso(options.now);
  next.discovery = normalizeDiscoveryJournal(next.discovery);
  const survey: ExplorationSurveyRecord = {
    targetId: target.id,
    updatedAt: timestamp,
    surface: deterministicPercent(target.id, "surface", 35, 100),
    resources: deterministicPercent(target.id, "resources", 20, 95),
    life: deterministicPercent(target.id, "life", 0, 90),
    ruins: deterministicPercent(target.id, "ruins", 0, 85),
    hazards: deterministicPercent(target.id, "hazards", 10, 88),
    weather: deterministicPercent(target.id, "weather", 0, 100) > 50 ? "Active" : "Stable",
    temperature: deterministicPercent(target.id, "temperature", 0, 100) > 60 ? "Extreme" : "Temperate",
    gravity: deterministicPercent(target.id, "gravity", 0, 100) > 55 ? "Heavy" : "Standard",
    atmosphere: deterministicPercent(target.id, "atmosphere", 0, 100) > 45 ? "Traceable" : "Thin"
  };
  next.discovery.surveyRecords = { ...(next.discovery.surveyRecords ?? {}), [target.id]: survey };
  setExplorationState(next, target, "surveyed", timestamp);
  updateScore(next, target, timestamp);
  return applyExplorationRewards(content, next, target, "survey", { now: options.now }).state;
}

export function bookmarkExplorationTarget(state: PlayerRuntimeState, target: ExplorationTarget, options: { now?: Date } = {}) {
  const next = clone(state);
  const timestamp = nowIso(options.now);
  next.discovery = normalizeDiscoveryJournal(next.discovery);
  next.discovery.bookmarks = next.discovery.bookmarks?.includes(target.id) ? next.discovery.bookmarks : [...(next.discovery.bookmarks ?? []), target.id];
  pushJournalEntry(next, target, "detected", timestamp);
  next.updatedAt = timestamp;
  next.revision += 1;
  return next;
}

export function createExplorationExpedition(state: PlayerRuntimeState, target: ExplorationTarget, options: { now?: Date; routeId?: string } = {}) {
  const next = clone(state);
  const timestamp = nowIso(options.now);
  next.discovery = normalizeDiscoveryJournal(next.discovery);
  const expedition: ExplorationExpeditionRecord = {
    id: stableId(["expedition", target.id, timestamp]),
    targetId: target.id,
    targetType: target.type,
    routeId: options.routeId ?? stableId(["route", target.id]),
    status: "planned",
    createdAt: timestamp,
    updatedAt: timestamp
  };
  next.discovery.expeditionRecords = [expedition, ...(next.discovery.expeditionRecords ?? [])].slice(0, 30);
  next.updatedAt = timestamp;
  next.revision += 1;
  return { state: next, expedition };
}

export function applyExplorationRewards(content: GameRuntimeData, state: PlayerRuntimeState, target: ExplorationTarget, source: "scan" | "probe" | "survey" | "catalogue", options: { now?: Date } = {}) {
  let next = clone(state);
  const timestamp = nowIso(options.now);
  const base = source === "survey" ? 18 : source === "scan" ? 12 : source === "catalogue" ? 28 : 8;
  next.civilization.discoveryPoints += base;
  const researchReward = source === "survey" ? 5 : source === "scan" ? 3 : 1;
  const creditsReward = source === "catalogue" ? 25 : 0;
  if (researchReward > 0) {
    next = applyResourceTransaction(content, next, createResourceTransaction(content, {
      economyId: RESEARCH_ECONOMY_ID,
      amount: researchReward,
      operation: "discover",
      sourceType: "discovery",
      sourceId: target.id,
      timestamp,
      reasonCode: "discovery_research"
    }));
  }
  if (creditsReward > 0) {
    next = applyResourceTransaction(content, next, createResourceTransaction(content, {
      economyId: CREDITS_ECONOMY_ID,
      amount: creditsReward,
      operation: "discover",
      sourceType: "discovery",
      sourceId: target.id,
      timestamp,
      reasonCode: "discovery_credits"
    }));
  }
  pushJournalEntry(next, target, "rewarded", timestamp);
  next.updatedAt = timestamp;
  return { state: next, rewards: { discoveryPoints: base, research: researchReward, credits: creditsReward, premiumCrystals: 0 } };
}
