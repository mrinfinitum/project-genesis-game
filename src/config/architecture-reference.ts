export const ARCHITECTURE_REFERENCE = {
  owner: "Project Genesis Studio",
  architectureVersion: "1.0.0",
  runtimeVersion: "game-runtime-v1",
  minimumContentVersion: 12,
  policy: "studio-wins"
} as const;

export type ArchitectureReference = typeof ARCHITECTURE_REFERENCE;
