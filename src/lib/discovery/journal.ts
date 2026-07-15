import type { DiscoveryJournalState, DiscoveryPendingClaim, DiscoveryPersonalState } from "./types";

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
