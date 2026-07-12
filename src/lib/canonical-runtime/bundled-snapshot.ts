import generatedSnapshot from "@/content/generated/studio-runtime.snapshot.json";
import { mockRuntimeData } from "./mock-fixture";
import { validateGameRuntimeData } from "./schema";
import type { GameRuntimeData } from "./types";

export function getBundledStudioRuntimeSnapshot(): GameRuntimeData | null {
  const validation = validateGameRuntimeData(generatedSnapshot);

  return validation.ok && validation.payload ? validation.payload : null;
}

export function getBundledOrMockRuntimeSnapshot(): GameRuntimeData {
  return getBundledStudioRuntimeSnapshot() ?? mockRuntimeData;
}
