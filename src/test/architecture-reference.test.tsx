import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GameShell } from "@/components/game-ui/genesis-ui";
import { getBundledStudioRuntimeSnapshot, type GameRuntimeData, type RuntimeContentState } from "@/lib/canonical-runtime";
import { resolveArchitectureCompatibility } from "@/lib/architecture/compatibility";
import { ARCHITECTURE_REFERENCE } from "@/config/architecture-reference";
import RuntimeDiagnostics from "@/routes/runtime-diagnostics";

async function bundledRuntime() {
  const runtime = await getBundledStudioRuntimeSnapshot();
  expect(runtime).not.toBeNull();
  return runtime as GameRuntimeData;
}

function runtime(overrides: Partial<GameRuntimeData["metadata"]> = {}): GameRuntimeData {
  return {
    metadata: {
      schemaVersion: "game-runtime-v1",
      architectureVersion: "1.0.0",
      contentVersion: 12,
      checksum: "test-checksum",
      accessLevel: "public-published",
      validationStatus: "Ready",
      ...overrides
    },
    eras: [],
    resources: [],
    upgradeCategories: [],
    upgrades: [],
    assets: [],
    balance: {
      startingCivilizationEnergy: 0,
      startingCoins: 0,
      startingResearch: 0,
      startingPopulation: 5,
      baseClickPower: 1,
      baseAutoClickPower: 0,
      autosaveSeconds: 30
    },
    clientProfiles: { default: {} }
  };
}

function state(overrides: Partial<RuntimeContentState> = {}): RuntimeContentState {
  return {
    configuredMode: "snapshot",
    activeSource: "bundled-snapshot",
    status: "ready",
    schemaVersion: "game-runtime-v1",
    architectureVersion: "1.0.0",
    contentVersion: 12,
    checksum: "test-checksum",
    accessLevel: "public-published",
    validationStatus: "Ready",
    eras: [],
    resources: [],
    upgradeCategories: [],
    upgrades: [],
    assets: [],
    balance: runtime().balance,
    clientProfiles: { default: {} },
    validationErrors: [],
    validationWarnings: [],
    isUsingFallback: false,
    studioEndpoint: "https://studio.example/runtime",
    cacheStatus: "valid",
    ...overrides
  };
}

afterEach(() => cleanup());

describe("architecture compatibility reference", () => {
  it("resolves exact version matches as compatible", () => {
    const report = resolveArchitectureCompatibility(runtime());

    expect(report.status).toBe("compatible");
    expect(report.expectedArchitectureVersion).toBe(ARCHITECTURE_REFERENCE.architectureVersion);
    expect(report.loadedRuntimeVersion).toBe("game-runtime-v1");
  });

  it("flags newer Studio architecture as architecture_outdated", () => {
    expect(resolveArchitectureCompatibility(runtime({ architectureVersion: "1.1.0" })).status).toBe("architecture_outdated");
  });

  it("flags unsupported runtime contracts as runtime_incompatible", () => {
    expect(resolveArchitectureCompatibility(runtime({ schemaVersion: "game-runtime-v2" as "game-runtime-v1" })).status).toBe("runtime_incompatible");
  });

  it("flags old content as content_outdated", () => {
    expect(resolveArchitectureCompatibility(runtime({ contentVersion: 11 })).status).toBe("content_outdated");
  });

  it("marks missing architecture metadata as unknown without rejecting runtime/content compatibility", () => {
    const report = resolveArchitectureCompatibility(runtime({ architectureVersion: undefined }));

    expect(report.status).toBe("unknown");
    expect(report.architectureStatus).toBe("unknown");
    expect(report.runtimeStatus).toBe("compatible");
    expect(report.contentStatus).toBe("compatible");
  });

  it("shows architecture compatibility in development runtime diagnostics", () => {
    render(<RuntimeDiagnostics state={state()} onRefresh={async () => undefined} onClearCache={async () => undefined} />);

    expect(screen.getByTestId("architecture-compatibility-diagnostics")).toHaveTextContent("Architecture");
    expect(screen.getByTestId("architecture-compatibility-diagnostics")).toHaveTextContent("Runtime game-runtime-v1");
    expect(screen.getByTestId("architecture-compatibility-diagnostics")).toHaveTextContent("Content 12");
  });

  it("does not expose internal Architecture Workspace content in production player UI", async () => {
    render(<GameShell data={await bundledRuntime()} />);

    expect(screen.queryByText(/Architecture Workspace/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Studio Architecture wins/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Permanent Decision Log/i)).not.toBeInTheDocument();
  });
});
