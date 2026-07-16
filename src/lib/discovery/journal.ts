import type {
  DiscoveryJournalState,
  DiscoveryPendingClaim,
  DiscoveryPersonalState,
  ExplorationDiscoveryState,
  ExplorationEncyclopediaTier,
  ExplorationExpeditionRecord,
  ExplorationJournalEntry,
  ExplorationProbeMission,
  ExplorationScanJob,
  ExplorationScoreRecord,
  ExplorationSurveyRecord
} from "./types";

export const DISCOVERY_JOURNAL_VERSION = 1;

export const DISCOVERY_STATE_ORDER: DiscoveryPersonalState[] = ["unknown", "detected", "partially_scanned", "identified", "analyzed", "collected", "decoded", "researched"];

export function createEmptyDiscoveryJournal(): DiscoveryJournalState {
  return {
    discoveryJournalVersion: DISCOVERY_JOURNAL_VERSION,
    discoveredObjectIds: [],
    detectedObjectIds: [],
    identifiedObjectIds: [],
    analyzedObjectIds: [],
    collectedObjectIds: [],
    decodedObjectIds: [],
    visitedSiteIds: [],
    pendingDiscoveryClaims: [],
    discoveryEntryProgress: {},
    discoveryLocationHistory: {},
    discoverySpecimenInventory: {},
    bookmarks: [],
    explorationStates: {},
    scanJobs: {},
    probeMissions: {},
    surveyRecords: {},
    explorationScores: {},
    recentDiscoveries: [],
    encyclopediaProgress: {},
    expeditionRecords: [],
    privateNotes: {}
  };
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function numberRecord(value: unknown) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1])));
}

function historyRecord(value: unknown) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, stringArray(entry)]));
}

const EXPLORATION_STATES: ExplorationDiscoveryState[] = ["unknown", "detected", "probed", "scanned", "surveyed", "explored", "catalogued", "colonized"];
const ENCYCLOPEDIA_TIERS: ExplorationEncyclopediaTier[] = ["unknown", "known", "analyzed", "complete"];

function explorationStateRecord(value: unknown): Record<string, ExplorationDiscoveryState> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter((entry): entry is [string, ExplorationDiscoveryState] => typeof entry[1] === "string" && EXPLORATION_STATES.includes(entry[1] as ExplorationDiscoveryState))
  );
}

function encyclopediaTierRecord(value: unknown): Record<string, ExplorationEncyclopediaTier> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter((entry): entry is [string, ExplorationEncyclopediaTier] => typeof entry[1] === "string" && ENCYCLOPEDIA_TIERS.includes(entry[1] as ExplorationEncyclopediaTier))
  );
}

function scanJobRecord(value: unknown): Record<string, ExplorationScanJob> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, ExplorationScanJob] => {
    const job = entry[1] as Partial<ExplorationScanJob>;
    return Boolean(job && typeof job.id === "string" && typeof job.targetId === "string" && typeof job.startedAt === "string" && typeof job.completesAt === "string");
  }));
}

function probeMissionRecord(value: unknown): Record<string, ExplorationProbeMission> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, ExplorationProbeMission] => {
    const mission = entry[1] as Partial<ExplorationProbeMission>;
    return Boolean(mission && typeof mission.id === "string" && typeof mission.targetId === "string" && typeof mission.launchedAt === "string" && typeof mission.completesAt === "string");
  }));
}

function surveyRecord(value: unknown): Record<string, ExplorationSurveyRecord> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, ExplorationSurveyRecord] => {
    const survey = entry[1] as Partial<ExplorationSurveyRecord>;
    return Boolean(survey && typeof survey.targetId === "string" && typeof survey.updatedAt === "string");
  }));
}

function scoreRecord(value: unknown): Record<string, ExplorationScoreRecord> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, ExplorationScoreRecord] => {
    const score = entry[1] as Partial<ExplorationScoreRecord>;
    return Boolean(score && typeof score.targetId === "string" && typeof score.updatedAt === "string");
  }));
}

function recentEntries(value: unknown): ExplorationJournalEntry[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is ExplorationJournalEntry => Boolean(entry && typeof entry.id === "string" && typeof entry.targetId === "string" && typeof entry.occurredAt === "string")).slice(0, 30)
    : [];
}

function expeditionRecords(value: unknown): ExplorationExpeditionRecord[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is ExplorationExpeditionRecord => Boolean(entry && typeof entry.id === "string" && typeof entry.targetId === "string" && typeof entry.createdAt === "string")).slice(0, 30)
    : [];
}

export function normalizeDiscoveryJournal(value: unknown): DiscoveryJournalState {
  const base = createEmptyDiscoveryJournal();
  if (!value || typeof value !== "object") return base;
  const record = value as Partial<DiscoveryJournalState>;
  return {
    ...base,
    discoveryJournalVersion: typeof record.discoveryJournalVersion === "number" ? record.discoveryJournalVersion : base.discoveryJournalVersion,
    discoveredObjectIds: stringArray(record.discoveredObjectIds),
    detectedObjectIds: stringArray(record.detectedObjectIds),
    identifiedObjectIds: stringArray(record.identifiedObjectIds),
    analyzedObjectIds: stringArray(record.analyzedObjectIds),
    collectedObjectIds: stringArray(record.collectedObjectIds),
    decodedObjectIds: stringArray(record.decodedObjectIds),
    visitedSiteIds: stringArray(record.visitedSiteIds),
    pendingDiscoveryClaims: Array.isArray(record.pendingDiscoveryClaims) ? record.pendingDiscoveryClaims.filter((claim): claim is DiscoveryPendingClaim => Boolean(claim && typeof claim.requestId === "string" && typeof claim.universalObjectId === "string")) : [],
    discoveryEntryProgress: numberRecord(record.discoveryEntryProgress),
    discoveryLocationHistory: historyRecord(record.discoveryLocationHistory),
    discoverySpecimenInventory: numberRecord(record.discoverySpecimenInventory),
    bookmarks: stringArray(record.bookmarks),
    explorationStates: explorationStateRecord(record.explorationStates),
    scanJobs: scanJobRecord(record.scanJobs),
    probeMissions: probeMissionRecord(record.probeMissions),
    surveyRecords: surveyRecord(record.surveyRecords),
    explorationScores: scoreRecord(record.explorationScores),
    recentDiscoveries: recentEntries(record.recentDiscoveries),
    encyclopediaProgress: encyclopediaTierRecord(record.encyclopediaProgress),
    expeditionRecords: expeditionRecords(record.expeditionRecords),
    privateNotes: record.privateNotes && typeof record.privateNotes === "object" ? Object.fromEntries(Object.entries(record.privateNotes).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {}
  };
}

export function resolveAllowedDiscoveryTransitions(current: DiscoveryPersonalState) {
  const index = DISCOVERY_STATE_ORDER.indexOf(current);
  if (index < 0) return [];
  return DISCOVERY_STATE_ORDER.slice(index + 1, index + 3);
}

function addUnique(values: string[], value: string) {
  return values.includes(value) ? values : [...values, value];
}

export function applyDiscoveryStateTransition(journal: DiscoveryJournalState, objectId: string, current: DiscoveryPersonalState, next: DiscoveryPersonalState) {
  if (!resolveAllowedDiscoveryTransitions(current).includes(next)) {
    return { ok: false as const, journal, reason: `Invalid Discovery transition ${current} -> ${next}.` };
  }
  const updated = normalizeDiscoveryJournal(journal);
  if (next !== "unknown") updated.discoveredObjectIds = addUnique(updated.discoveredObjectIds, objectId);
  if (next === "detected" || next === "partially_scanned" || next === "identified" || next === "analyzed" || next === "collected" || next === "decoded" || next === "researched") updated.detectedObjectIds = addUnique(updated.detectedObjectIds, objectId);
  if (next === "identified" || next === "analyzed" || next === "collected" || next === "decoded" || next === "researched") updated.identifiedObjectIds = addUnique(updated.identifiedObjectIds, objectId);
  if (next === "analyzed" || next === "collected" || next === "decoded" || next === "researched") updated.analyzedObjectIds = addUnique(updated.analyzedObjectIds, objectId);
  if (next === "collected") updated.collectedObjectIds = addUnique(updated.collectedObjectIds, objectId);
  if (next === "decoded" || next === "researched") updated.decodedObjectIds = addUnique(updated.decodedObjectIds, objectId);
  return { ok: true as const, journal: updated };
}

export function queueOfflineDiscoveryClaim(journal: DiscoveryJournalState, claim: DiscoveryPendingClaim) {
  const normalized = normalizeDiscoveryJournal(journal);
  if (!normalized.pendingDiscoveryClaims.some((existing) => existing.requestId === claim.requestId)) {
    normalized.pendingDiscoveryClaims.push(claim);
  }
  return normalized;
}
