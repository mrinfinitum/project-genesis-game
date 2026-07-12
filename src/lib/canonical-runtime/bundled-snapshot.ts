import { mockRuntimeData } from "./mock-fixture";
import { validateGameRuntimeData } from "./schema";
import type { GameRuntimeData } from "./types";

async function loadGeneratedSnapshot() {
  return import("@/content/generated/studio-runtime.snapshot.json");
}

export async function getBundledStudioRuntimeSnapshot(): Promise<GameRuntimeData | null> {
  const { default: generatedSnapshot } = await loadGeneratedSnapshot();
  const validation = validateGameRuntimeData(generatedSnapshot);

  return validation.ok && validation.payload ? validation.payload : null;
}

export async function getBundledOrMockRuntimeSnapshot(): Promise<GameRuntimeData> {
  return (await getBundledStudioRuntimeSnapshot()) ?? mockRuntimeData;
}
