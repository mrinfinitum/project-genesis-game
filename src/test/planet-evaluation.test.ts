import { describe, expect, it } from "vitest";
import { getBundledStudioRuntimeSnapshot, mockRuntimeData, type GameRuntimeData } from "@/lib/canonical-runtime";
import { readStudioOpportunityProfiles, resolvePlanetEvaluation, type ExplorationTarget } from "@/lib/discovery";

function target(overrides: Partial<ExplorationTarget>): ExplorationTarget {
  return {
    id: "BODY-TEST-01",
    type: "planet",
    label: "Test World",
    distance: 12,
    knowledgeState: "charted",
    rangeState: "travel_reachable",
    canProbe: true,
    canTravel: true,
    classification: "Terrestrial",
    ...overrides
  };
}

function actionIds(content: GameRuntimeData, world: ExplorationTarget) {
  return resolvePlanetEvaluation(content, world)?.validActions.map((action) => action.id) ?? [];
}

describe("planet evaluation gameplay", () => {
  it("reports that contentVersion 21 is waiting on published Studio opportunity profiles", async () => {
    const runtime = (await getBundledStudioRuntimeSnapshot()) ?? mockRuntimeData;
    const evaluation = resolvePlanetEvaluation(runtime, target({ id: "BODY-TEST-TERRESTRIAL", classification: "Terrestrial" }));

    expect(runtime.metadata.contentVersion).toBeGreaterThanOrEqual(21);
    expect(readStudioOpportunityProfiles(runtime)).toHaveLength(0);
    expect(evaluation?.opportunityProfile.source).toBe("derived-fallback");
    expect(evaluation?.opportunityProfile.missingStudioOpportunityProfiles).toBe(true);
  });

  it("consumes Studio opportunity profiles when the runtime publishes them", () => {
    const runtime: GameRuntimeData = {
      ...mockRuntimeData,
      planetOpportunityProfiles: [
        {
          id: "OPP-GARDEN",
          displayName: "Garden World",
          planetClass: "Terrestrial",
          supportsColonization: true,
          colonization: 95,
          mining: 41,
          research: 88,
          tourism: 74,
          danger: 12
        }
      ]
    } as GameRuntimeData & Record<string, unknown>;
    const evaluation = resolvePlanetEvaluation(runtime, target({ id: "BODY-TEST-GARDEN", classification: "Terrestrial" }));

    expect(evaluation?.opportunityProfile.source).toBe("studio");
    expect(evaluation?.opportunityProfile.displayName).toBe("Garden World");
    expect(evaluation?.scores.colonization).toBe(95);
    expect(evaluation?.recommendedActions.map((action) => action.id)).toContain("colonize");
  });

  it("hides colonization and offers harvesting infrastructure for gas giants", () => {
    const actions = actionIds(mockRuntimeData, target({ id: "BODY-GAS-01", classification: "Gas Giant" }));

    expect(actions).not.toContain("colonize");
    expect(actions).toContain("gas_harvest_platform");
    expect(actions).toContain("orbital_refinery");
    expect(actions).toContain("deep_probe");
  });

  it("hides colonization and offers archaeology, mining, and research for dead worlds", () => {
    const actions = actionIds(mockRuntimeData, target({ id: "BODY-DEAD-01", classification: "Barren Dead World" }));

    expect(actions).not.toContain("colonize");
    expect(actions).toContain("archaeological_camp");
    expect(actions).toContain("mining_outpost");
    expect(actions).toContain("research_outpost");
  });

  it("routes unique worlds toward preservation instead of colonization", () => {
    const evaluation = resolvePlanetEvaluation(mockRuntimeData, target({ id: "BODY-UNIQUE-01", classification: "Ancient Unique World" }));

    expect(evaluation?.opportunityProfile.supportsColonization).toBe(false);
    expect(evaluation?.validActions.map((action) => action.id)).not.toContain("colonize");
    expect(evaluation?.validActions.map((action) => action.id)).toContain("preserve");
    expect(evaluation?.recommendedActions.map((action) => action.id)).toContain("preserve");
  });

  it("allows colonization for high-value normal worlds and includes reusable non-colony choices", () => {
    const evaluation = resolvePlanetEvaluation(mockRuntimeData, target({ id: "BODY-OCEAN-01", classification: "Oceanic" }));
    const actions = evaluation?.validActions.map((action) => action.id) ?? [];

    expect(evaluation?.opportunityProfile.supportsColonization).toBe(true);
    expect(actions).toContain("colonize");
    expect(actions).toContain("catalog");
    expect(actions).toContain("bookmark");
    expect(actions).toContain("ignore");
  });

  it("does not expose planet evaluation for stars or systems", () => {
    expect(resolvePlanetEvaluation(mockRuntimeData, target({ type: "star", classification: "G-Type" }))).toBeUndefined();
    expect(resolvePlanetEvaluation(mockRuntimeData, target({ type: "system", classification: "G-Type" }))).toBeUndefined();
  });
});
