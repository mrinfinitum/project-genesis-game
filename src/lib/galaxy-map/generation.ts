import type { GameRuntimeData } from "@/lib/canonical-runtime";
import type { PlayerRuntimeState } from "@/lib/player-runtime";
import type {
  MapRangeProfile,
  SemanticZoomInput,
  SemanticZoomLevel,
  SemanticZoomResolution,
  StarSystemPresentation,
  TechnologyVisibility,
  UniverseGenerationAudit,
  UniverseMapModel,
  UniverseMapNode,
  VisibleMapNode
} from "./types";

const MISSING_STUDIO_CONTRACTS = [
  "universeSeed",
  "generationVersion",
  "galaxies[]",
  "sectors[]",
  "starSystems[]",
  "celestialBodies[]",
  "sectorCoordinates",
  "starSystemCoordinates",
  "systemLayoutSeed",
  "mapTechnologyGates",
  "viewProbeTravelRanges",
  "playerKnowledgeStateDefinitions",
  "registryVisibilityRules"
];

type Rng = () => number;

function fnv1a(input: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function seededRandom(seed: string): Rng {
  let state = fnv1a(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function spherePoint(random: Rng, radius: number): [number, number, number] {
  const theta = random() * Math.PI * 2;
  const y = random() * 2 - 1;
  const scale = Math.sqrt(Math.max(0, 1 - y * y));
  const density = 0.45 + random() * 0.55;
  return [
    Math.cos(theta) * scale * radius * density,
    y * radius * 0.24 * density,
    Math.sin(theta) * scale * radius * density
  ];
}

function clampLevel(level: SemanticZoomLevel, visibility: TechnologyVisibility): SemanticZoomLevel {
  if (level === "galaxy" && visibility.canAccessGalaxy) return "galaxy";
  if ((level === "galaxy" || level === "sector") && visibility.canAccessSector) return "sector";
  return "system";
}

function runtimeRecord(content: GameRuntimeData) {
  return content as GameRuntimeData & Record<string, unknown>;
}

export function auditPersistentUniverseContract(content: GameRuntimeData): UniverseGenerationAudit {
  const record = runtimeRecord(content);
  const missing = MISSING_STUDIO_CONTRACTS.filter((key) => {
    const rootKey = key.replace(/\[\]$/, "");
    return record[rootKey] == null;
  });
  const seed = typeof record.universeSeed === "string"
    ? record.universeSeed
    : `noveris-shared-universe:${content.metadata.contentVersion}:${content.metadata.checksum}`;
  const generationVersion = typeof record.generationVersion === "string"
    ? record.generationVersion
    : `fallback-v${content.metadata.contentVersion}`;

  return {
    seed,
    generationVersion,
    usesCanonicalHierarchy: missing.length === 0,
    missingStudioContracts: missing,
    followUpPrompt: [
      "Studio follow-up: publish the canonical universe navigation contract for the game runtime.",
      "Required fields: universeSeed, generationVersion, galaxies, sectors, starSystems, celestialBodies, stable hierarchy IDs, coordinates/bounds, systemLayoutSeed, map technology gates, view/probe/travel ranges, player knowledge-state definitions, and registry visibility rules.",
      "Keep object identity immutable and shared across players; the game client will only render, filter, and persist camera/focus state."
    ].join(" ")
  };
}

export function createPersistentUniverseModel(content: GameRuntimeData): UniverseMapModel {
  const audit = auditPersistentUniverseContract(content);
  const galaxy: UniverseMapNode = {
    id: "GAL-MILKY-WAY",
    type: "galaxy",
    seed: `${audit.seed}:galaxy`,
    canonicalName: "Milky Way",
    displayName: "Milky Way",
    coordinates: [0, 0, 0],
    radius: 460
  };

  const sectors: UniverseMapNode[] = Array.from({ length: 18 }, (_, index) => {
    const id = `SEC-${String(index).padStart(3, "0")}`;
    const random = seededRandom(`${audit.seed}:${id}`);
    return {
      id,
      parentId: galaxy.id,
      type: "sector",
      seed: `${audit.seed}:${id}`,
      canonicalName: index === 0 ? "Orion Sector" : `Sector ${String(index + 1).padStart(2, "0")}`,
      displayName: index === 0 ? "Orion Sector" : `Sector ${String(index + 1).padStart(2, "0")}`,
      coordinates: spherePoint(random, 380),
      radius: 22 + random() * 18,
      classification: index === 0 ? "Current Region" : "Unresolved Sector"
    };
  });

  const systemsBySectorId: Record<string, UniverseMapNode[]> = {};
  const bodiesBySystemId: Record<string, UniverseMapNode[]> = {};

  sectors.forEach((sector, sectorIndex) => {
    const systemCount = 9 + (fnv1a(sector.id) % 5);
    systemsBySectorId[sector.id] = Array.from({ length: systemCount }, (_, systemIndex) => {
      const id = `SYS-${String(sectorIndex).padStart(3, "0")}-${String(systemIndex).padStart(2, "0")}`;
      const random = seededRandom(`${audit.seed}:${id}`);
      const [x, y, z] = spherePoint(random, 72);
      const system: UniverseMapNode = {
        id,
        parentId: sector.id,
        type: "system",
        seed: `${audit.seed}:${id}`,
        canonicalName: sectorIndex === 0 && systemIndex === 0 ? "Sol System" : `System ${sectorIndex + 1}-${systemIndex + 1}`,
        displayName: sectorIndex === 0 && systemIndex === 0 ? "Sol System" : `System ${sectorIndex + 1}-${systemIndex + 1}`,
        coordinates: [x, y, z],
        radius: 4 + random() * 4,
        classification: ["G-Type", "K-Type", "M-Type", "Binary", "Blue-White"][Math.floor(random() * 5)],
        bodyCount: 4 + (fnv1a(id) % 6)
      };
      const bodyCount = system.bodyCount ?? 5;
      bodiesBySystemId[id] = Array.from({ length: bodyCount }, (_, bodyIndex) => {
        const bodyId = bodyIndex === 0 ? `${id}-STAR-A` : `BODY-${String(sectorIndex).padStart(3, "0")}-${String(systemIndex).padStart(2, "0")}-${String(bodyIndex).padStart(2, "0")}`;
        const bodyRandom = seededRandom(`${audit.seed}:${bodyId}`);
        return {
          id: bodyId,
          parentId: id,
          type: bodyIndex === 0 ? "star" : bodyIndex % 5 === 0 ? "moon" : "planet",
          seed: `${audit.seed}:${bodyId}`,
          canonicalName: bodyIndex === 0 ? `${system.canonicalName} Primary` : `${system.canonicalName} ${bodyIndex}`,
          displayName: bodyIndex === 0 ? `${system.displayName} Primary` : `${system.displayName} ${bodyIndex}`,
          coordinates: [0, 0, 0],
          radius: bodyIndex === 0 ? 8 : 1.8 + bodyRandom() * 3.6,
          classification: bodyIndex === 0 ? system.classification : ["Terrestrial", "Ice World", "Gas Giant", "Barren", "Oceanic"][Math.floor(bodyRandom() * 5)]
        };
      });
      return system;
    });
  });

  return {
    audit,
    galaxy,
    sectors,
    systemsBySectorId,
    bodiesBySystemId,
    currentSectorId: "SEC-000",
    currentSystemId: "SYS-000-00"
  };
}

export function resolveTechnologyVisibility(content: GameRuntimeData, playerRuntime: PlayerRuntimeState): TechnologyVisibility {
  const currentEraId = playerRuntime.civilization.currentEraId;
  const era = content.eras.find((candidate) => candidate.id === currentEraId);
  const order = typeof era?.index === "number" ? era.index : Math.max(1, content.eras.findIndex((candidate) => candidate.id === currentEraId) + 1);
  const normalized = currentEraId.toLowerCase();
  const canAccessGalaxy = normalized.includes("galactic") || order >= 9;
  const canAccessSector = canAccessGalaxy || normalized.includes("interstellar") || order >= 8;
  const canAccessSystem = canAccessSector || normalized.includes("space") || order >= 7;
  if (canAccessGalaxy) return { maxLevel: "galaxy", canAccessGalaxy, canAccessSector, canAccessSystem, reason: "Galactic navigation technology unlocked." };
  if (canAccessSector) return { maxLevel: "sector", canAccessGalaxy, canAccessSector, canAccessSystem, reason: "Interstellar sector navigation unlocked." };
  if (canAccessSystem) return { maxLevel: "system", canAccessGalaxy, canAccessSector, canAccessSystem, reason: "Star-system navigation unlocked." };
  return { maxLevel: "system", canAccessGalaxy: false, canAccessSector: false, canAccessSystem: true, reason: "Survival era limits the map to local system awareness." };
}

export function resolveSemanticZoomLevel(input: SemanticZoomInput): SemanticZoomResolution {
  const level = clampLevel(input.requestedLevel, input.technologyVisibility);
  const blocked = level !== input.requestedLevel;
  if (input.transitionState && input.transitionState !== "stable") {
    return { level, transitionState: input.transitionState, blocked, reason: blocked ? input.technologyVisibility.reason : undefined };
  }
  if (input.focusedEntity?.type === "sector" && input.loadedContext.sectorId && input.technologyVisibility.canAccessSector) {
    return { level: "sector", transitionState: "stable", blocked: false };
  }
  if ((input.focusedEntity?.type === "system" || input.requestedLevel === "system") && input.loadedContext.systemId && input.technologyVisibility.canAccessSystem) {
    return { level: "system", transitionState: "stable", blocked: false };
  }
  return { level, transitionState: "stable", blocked, reason: blocked ? input.technologyVisibility.reason : undefined };
}

export function resolveRangeProfile(level: SemanticZoomLevel, visibility: TechnologyVisibility): MapRangeProfile {
  if (level === "galaxy") return { view: visibility.canAccessGalaxy ? 480 : 0, probe: 190, travel: 95 };
  if (level === "sector") return { view: visibility.canAccessSector ? 140 : 0, probe: 72, travel: 34 };
  return { view: 96, probe: visibility.canAccessSystem ? 62 : 18, travel: visibility.canAccessSystem ? 36 : 0 };
}

export function filterVisibleNode(node: UniverseMapNode, options: { distance: number; ranges: MapRangeProfile; known: boolean; technologyAllowed: boolean }): VisibleMapNode {
  const { distance, ranges, known, technologyAllowed } = options;
  const rangeState = !technologyAllowed
    ? "blocked_by_technology"
    : distance > ranges.view
      ? "outside_view"
      : distance > ranges.probe
        ? "visible_unresolved"
        : distance > ranges.travel
          ? "probe_reachable"
          : "travel_reachable";
  const knowledgeState = known ? "charted" : rangeState === "outside_view" ? "unknown" : rangeState === "visible_unresolved" ? "detected" : "probed";
  const reveal = known || knowledgeState === "charted";
  return {
    id: node.id,
    parentId: node.parentId,
    type: node.type,
    displayName: reveal ? node.displayName : "???",
    label: reveal ? node.displayName : "???",
    coordinates: node.coordinates,
    radius: node.radius,
    knowledgeState,
    rangeState,
    classification: reveal ? node.classification : undefined,
    bodyCount: reveal ? node.bodyCount : undefined,
    canProbe: rangeState === "probe_reachable" || rangeState === "travel_reachable",
    canTravel: rangeState === "travel_reachable"
  };
}

export function composeVisibleNodes(model: UniverseMapModel, level: SemanticZoomLevel, context: { sectorId?: string; systemId?: string; visibility: TechnologyVisibility }) {
  const ranges = resolveRangeProfile(level, context.visibility);
  if (level === "galaxy") {
    return model.sectors.map((sector) => {
      const distance = Math.hypot(sector.coordinates[0], sector.coordinates[1], sector.coordinates[2]);
      return filterVisibleNode(sector, { distance, ranges, known: sector.id === model.currentSectorId, technologyAllowed: context.visibility.canAccessGalaxy });
    }).filter((node) => node.rangeState !== "outside_view");
  }
  if (level === "sector") {
    const systems = model.systemsBySectorId[context.sectorId ?? model.currentSectorId] ?? [];
    return systems.map((system) => {
      const distance = Math.hypot(system.coordinates[0], system.coordinates[1], system.coordinates[2]);
      return filterVisibleNode(system, { distance, ranges, known: system.id === model.currentSystemId, technologyAllowed: context.visibility.canAccessSector });
    }).filter((node) => node.rangeState !== "outside_view");
  }
  const bodies = model.bodiesBySystemId[context.systemId ?? model.currentSystemId] ?? [];
  return bodies.map((body, index) => filterVisibleNode(body, {
    distance: index * 8,
    ranges,
    known: index <= 2,
    technologyAllowed: context.visibility.canAccessSystem
  }));
}

export function resolveStarSystemPresentation(model: UniverseMapModel, systemId: string, visibility: TechnologyVisibility): StarSystemPresentation {
  const visible = composeVisibleNodes(model, "system", { systemId, visibility });
  const stars = visible.filter((node) => node.type === "star");
  const bodies = visible.filter((node) => node.type !== "star").map((body, index) => {
    const random = seededRandom(`${model.audit.seed}:${body.id}:orbit`);
    return {
      ...body,
      orbitalRadius: 15 + index * 8.2,
      orbitalAngle: random() * Math.PI * 2,
      inclination: (random() - 0.5) * 0.34,
      renderScale: Math.max(0.9, body.radius * 0.48),
      presentationSpeed: 0.02 + random() * 0.025
    };
  });
  return { systemId, stars, bodies, beltRanges: [{ id: `${systemId}-BELT-01`, innerRadius: 48, outerRadius: 52 }] };
}
