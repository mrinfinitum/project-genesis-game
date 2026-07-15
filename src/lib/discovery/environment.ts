import type { PlanetDiscoveryEnvironment } from "./types";

type RawEnvironment = Partial<PlanetDiscoveryEnvironment> & Record<string, unknown>;

function stringArray(...values: unknown[]) {
  return values.flatMap((value) => Array.isArray(value) ? value : value ? [value] : []).filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function normalizePlanetDiscoveryEnvironment(raw: RawEnvironment): PlanetDiscoveryEnvironment {
  const universeId = typeof raw.universeId === "string" ? raw.universeId : "local-universe";
  const galaxyId = typeof raw.galaxyId === "string" ? raw.galaxyId : "local-galaxy";
  const sectorId = typeof raw.sectorId === "string" ? raw.sectorId : "local-sector";
  const systemId = typeof raw.systemId === "string" ? raw.systemId : "local-system";
  const planetId = typeof raw.planetId === "string" ? raw.planetId : "local-planet";
  const regionId = typeof raw.regionId === "string" ? raw.regionId : undefined;
  return {
    environmentId: typeof raw.environmentId === "string" ? raw.environmentId : [universeId, galaxyId, sectorId, systemId, planetId, regionId].filter(Boolean).join(":"),
    universeId,
    universeSeedVersion: typeof raw.universeSeedVersion === "string" ? raw.universeSeedVersion : "seed-v1",
    generationVersion: typeof raw.generationVersion === "string" ? raw.generationVersion : "gen-v1",
    galaxyId,
    sectorId,
    systemId,
    starId: typeof raw.starId === "string" ? raw.starId : undefined,
    planetId,
    regionId,
    planetClassIds: stringArray(raw.planetClassIds, raw.planetClassId, raw.planetClass),
    planetSubclassIds: stringArray(raw.planetSubclassIds, raw.planetSubclassId, raw.planetSubclass),
    biomeIds: stringArray(raw.biomeIds, raw.biomeId, raw.biome),
    atmosphereIds: stringArray(raw.atmosphereIds, raw.atmosphereId, raw.atmosphere),
    terrainIds: stringArray(raw.terrainIds, raw.terrainId, raw.terrain),
    temperature: finiteNumber(raw.temperature),
    gravity: finiteNumber(raw.gravity),
    waterCoverage: finiteNumber(raw.waterCoverage),
    humidity: finiteNumber(raw.humidity),
    radiation: finiteNumber(raw.radiation),
    volcanism: finiteNumber(raw.volcanism),
    biosphereMaturity: finiteNumber(raw.biosphereMaturity),
    biologicalDiversity: finiteNumber(raw.biologicalDiversity),
    civilizationPresence: finiteNumber(raw.civilizationPresence),
    ruinPresence: finiteNumber(raw.ruinPresence),
    anomalyInfluence: finiteNumber(raw.anomalyInfluence),
    locationType: typeof raw.locationType === "string" ? raw.locationType : undefined
  };
}

export const DEFAULT_DISCOVERY_ENVIRONMENT = normalizePlanetDiscoveryEnvironment({
  universeId: "local-universe",
  galaxyId: "milky-way",
  sectorId: "sol-sector",
  systemId: "sol",
  planetId: "earth",
  regionId: "temperate-cave-01",
  planetClassIds: ["terrestrial"],
  biomeIds: ["temperate", "cave"],
  atmosphereIds: ["breathable"],
  terrainIds: ["cave", "mineral"],
  temperature: 0.42,
  gravity: 1,
  waterCoverage: 0.64,
  humidity: 0.58,
  radiation: 0.1,
  biosphereMaturity: 0.45,
  biologicalDiversity: 0.5,
  civilizationPresence: 0.2,
  ruinPresence: 0,
  anomalyInfluence: 0,
  locationType: "cave"
});
