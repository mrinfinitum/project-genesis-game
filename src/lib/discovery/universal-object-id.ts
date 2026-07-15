export type UniversalObjectIdInput = {
  environmentId: string;
  universeId: string;
  universeSeedVersion: string;
  generationVersion: string;
  galaxyId: string;
  sectorId: string;
  systemId: string;
  planetId: string;
  regionId?: string;
  entityType: string;
  localSpawnSlot: string | number;
};

function fnv1a32(input: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function stableHash(input: string) {
  return fnv1a32(input).toString(36).padStart(7, "0");
}

export function createUniversalObjectId(input: UniversalObjectIdInput) {
  const stablePayload = [
    input.environmentId,
    input.universeId,
    input.universeSeedVersion,
    input.generationVersion,
    input.galaxyId,
    input.sectorId,
    input.systemId,
    input.planetId,
    input.regionId ?? "global",
    input.entityType,
    String(input.localSpawnSlot)
  ].map((part) => part.trim().toLowerCase()).join("|");

  return `uobj_${stableHash(stablePayload)}_${stablePayload.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 96)}`;
}
