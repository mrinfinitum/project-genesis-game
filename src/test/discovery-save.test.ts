import { describe, expect, it } from "vitest";
import { getBundledStudioRuntimeSnapshot, type GameRuntimeData } from "@/lib/canonical-runtime";
import { applyDiscoveryStateTransition, createEmptyDiscoveryJournal, normalizeDiscoveryJournal, queueOfflineDiscoveryClaim } from "@/lib/discovery";
import { createNewPlayerRuntimeState, migratePlayerRuntimeState, PLAYER_RUNTIME_SAVE_VERSION } from "@/lib/player-runtime";

async function bundledRuntime() {
  const runtime = await getBundledStudioRuntimeSnapshot();
  expect(runtime).not.toBeNull();
  return runtime as GameRuntimeData;
}

describe("Discovery save state", () => {
  it("initializes and migrates compact Discovery Journal state", async () => {
    const runtime = await bundledRuntime();
    const state = createNewPlayerRuntimeState(runtime);
    expect(state.saveVersion).toBe(PLAYER_RUNTIME_SAVE_VERSION);
    expect(state.discovery.discoveryJournalVersion).toBe(1);
    expect(state.discovery.pendingDiscoveryClaims).toEqual([]);

    const migrated = migratePlayerRuntimeState({ ...state, saveVersion: 12, discovery: undefined }, runtime);
    expect(migrated.discovery.discoveryJournalVersion).toBe(1);
    expect(migrated.unresolved.migrationNotes).toContain("Initialized Discovery Journal save fields.");
  });

  it("allows valid state transitions and rejects arbitrary final-state assignment", () => {
    const journal = createEmptyDiscoveryJournal();
    const detected = applyDiscoveryStateTransition(journal, "uobj-1", "unknown", "detected");
    expect(detected.ok).toBe(true);
    expect(detected.journal.detectedObjectIds).toContain("uobj-1");

    const invalid = applyDiscoveryStateTransition(detected.journal, "uobj-1", "detected", "collected");
    expect(invalid.ok).toBe(false);
  });

  it("queues offline claims idempotently and normalizes corrupted arrays", () => {
    const claim = { requestId: "request-1", universalObjectId: "uobj-1", discoveryId: "DISC-1", entityType: "flora", milestoneType: "first_scan", universeId: "u1", generationVersion: "g1", evidence: {}, queuedAt: "2026-07-15T00:00:00.000Z", status: "pending" as const };
    const first = queueOfflineDiscoveryClaim(createEmptyDiscoveryJournal(), claim);
    const second = queueOfflineDiscoveryClaim(first, claim);
    expect(second.pendingDiscoveryClaims).toHaveLength(1);
    expect(normalizeDiscoveryJournal({ detectedObjectIds: ["a", 2], discoveryEntryProgress: { a: 0.5, b: "bad" } }).detectedObjectIds).toEqual(["a"]);
  });
});
