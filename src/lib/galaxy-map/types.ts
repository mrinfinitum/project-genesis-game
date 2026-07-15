import type { GameRuntimeData } from "@/lib/canonical-runtime";
import type { PlayerRuntimeState } from "@/lib/player-runtime";

export type SemanticZoomLevel = "galaxy" | "sector" | "system";
export type SemanticTransitionState = "stable" | "galaxy_to_sector" | "sector_to_system" | "system_to_sector" | "sector_to_galaxy";
export type CelestialObjectType = "galaxy" | "sector" | "system" | "star" | "planet" | "moon" | "belt";
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
  seed: string;
  canonicalName: string;
  displayName: string;
  coordinates: Vector3Tuple;
  radius: number;
  classification?: string;
  bodyCount?: number;
  children?: UniverseMapNode[];
};

export type UniverseMapModel = {
  audit: UniverseGenerationAudit;
  galaxy: UniverseMapNode;
  sectors: UniverseMapNode[];
  systemsBySectorId: Record<string, UniverseMapNode[]>;
  bodiesBySystemId: Record<string, UniverseMapNode[]>;
  currentSectorId: string;
  currentSystemId: string;
};

export type TechnologyVisibility = {
  maxLevel: SemanticZoomLevel;
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
