import type { GameRuntimeData } from "@/lib/canonical-runtime";
import type { PlayerRuntimeState } from "@/lib/player-runtime";

export type SemanticZoomLevel = "universe" | "galaxy" | "sector" | "system";
export type SemanticTransitionState = "stable" | "universe_to_galaxy" | "galaxy_to_sector" | "sector_to_system" | "system_to_sector" | "sector_to_galaxy" | "galaxy_to_universe";
export type CelestialObjectType = "universe" | "galaxy" | "sector" | "system" | "star" | "planet" | "moon" | "belt" | "station" | "discovery";
export type KnowledgeState = "unknown" | "detected" | "probed" | "scanned" | "charted" | "visited";
export type RangeState = "outside_view" | "visible_unresolved" | "view_only" | "probe_reachable" | "travel_reachable" | "blocked_by_technology";

export type Vector3Tuple = readonly [number, number, number];

export type UniverseGenerationAudit = {
  seed: string;
  generationVersion: string;
  usesCanonicalHierarchy: boolean;
  missingStudioContracts: string[];
  followUpPrompt: string;
};

export type UniverseMapContext = {
  content: GameRuntimeData;
  playerRuntime: PlayerRuntimeState;
};

export type UniverseMapNode = {
  id: string;
  parentId?: string;
  type: CelestialObjectType;
  chunkId?: string;
  seed: string;
  canonicalName: string;
  displayName: string;
  coordinates: Vector3Tuple;
  radius: number;
  classification?: string;
  bodyCount?: number;
  children?: UniverseMapNode[];
};

export type SpatialChunkLevel = "universe" | "galaxy" | "sector" | "system";

export type SpatialChunk = {
  id: string;
  level: SpatialChunkLevel;
  parentId: string;
  origin: Vector3Tuple;
  boundsRadius: number;
  nodeCount: number;
  loaded: boolean;
  lod: "density" | "proxy" | "point" | "mesh";
};

export type UniverseMapModel = {
  audit: UniverseGenerationAudit;
  universe: UniverseMapNode;
  galaxy: UniverseMapNode;
  virtualCounts: {
    galaxies: number;
    sectors: number;
    systems: number;
    bodies: number;
  };
  galaxyChunks: SpatialChunk[];
  sectorChunksBySectorId: Record<string, SpatialChunk[]>;
  sectors: UniverseMapNode[];
  systemsBySectorId: Record<string, UniverseMapNode[]>;
  bodiesBySystemId: Record<string, UniverseMapNode[]>;
  currentSectorId: string;
  currentSystemId: string;
};

export type TechnologyVisibility = {
  maxLevel: SemanticZoomLevel;
  canAccessUniverse: boolean;
  canAccessGalaxy: boolean;
  canAccessSector: boolean;
  canAccessSystem: boolean;
  reason: string;
};

export type MapRangeProfile = {
  view: number;
  probe: number;
  travel: number;
};

export type StreamingSnapshot = {
  level: SemanticZoomLevel;
  lod: "density" | "proxy" | "point" | "mesh";
  loadedChunks: SpatialChunk[];
  visibleSectors: number;
  visibleSystems: number;
  visibleBodies: number;
  gpuInstances: number;
  virtualSectors: number;
  virtualSystems: number;
};

export type SemanticZoomInput = {
  requestedLevel: SemanticZoomLevel;
  focusedEntity?: UniverseMapNode | null;
  transitionState?: SemanticTransitionState;
  cameraDistance: number;
  technologyVisibility: TechnologyVisibility;
  loadedContext: {
    sectorId?: string;
    systemId?: string;
  };
};

export type SemanticZoomResolution = {
  level: SemanticZoomLevel;
  transitionState: SemanticTransitionState;
  blocked: boolean;
  reason?: string;
};

export type VisibleMapNode = {
  id: string;
  type: CelestialObjectType;
  parentId?: string;
  displayName: string;
  label: string;
  coordinates: Vector3Tuple;
  radius: number;
  knowledgeState: KnowledgeState;
  rangeState: RangeState;
  classification?: string;
  bodyCount?: number;
  canProbe: boolean;
  canTravel: boolean;
};

export type SearchableMapResult = {
  id: string;
  type: CelestialObjectType;
  label: string;
  parentId?: string;
};

export type BookmarkTarget = {
  id: string;
  type: Extract<CelestialObjectType, "galaxy" | "sector" | "system" | "planet" | "discovery">;
  label: string;
};

export type RoutePreview = {
  fromId: string;
  toId: string;
  distance: number;
  stops: number;
  fuel: number;
  hazards: string[];
  requiresProbeFirst: boolean;
  travelAllowed: boolean;
};

export type StarSystemPresentation = {
  systemId: string;
  stars: VisibleMapNode[];
  bodies: Array<VisibleMapNode & {
    orbitalRadius: number;
    orbitalAngle: number;
    inclination: number;
    renderScale: number;
    presentationSpeed: number;
  }>;
  beltRanges: Array<{ id: string; innerRadius: number; outerRadius: number }>;
};
